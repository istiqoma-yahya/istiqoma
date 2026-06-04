import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  voiceParseRateLimitCalls,
  voiceParsedDeedSchema,
  type VoiceParsedDeed,
  type VoiceParseLanguage,
} from "@workspace/db";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const MODEL = "claude-sonnet-4-6";

// 20 voice parses per hour per user. Same Postgres advisory-lock pattern as
// recommendations.ts so concurrent requests can't all observe < MAX and slip
// past the limit.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

function advisoryLockKeysForUser(userId: string): { hi: number; lo: number } {
  const hash = createHash("sha256").update(`voiceParse:${userId}`).digest();
  const hi = hash.readInt32BE(0);
  const lo = hash.readInt32BE(4);
  return { hi, lo };
}

export async function checkVoiceParseRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = new Date(now - RATE_LIMIT_WINDOW_MS);
  const { hi, lo } = advisoryLockKeysForUser(userId);

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${hi}, ${lo})`);

    await tx
      .delete(voiceParseRateLimitCalls)
      .where(
        and(
          eq(voiceParseRateLimitCalls.userId, userId),
          lte(voiceParseRateLimitCalls.calledAt, cutoff),
        ),
      );

    const existing = await tx
      .select({ calledAt: voiceParseRateLimitCalls.calledAt })
      .from(voiceParseRateLimitCalls)
      .where(eq(voiceParseRateLimitCalls.userId, userId))
      .orderBy(asc(voiceParseRateLimitCalls.calledAt));

    if (existing.length >= RATE_LIMIT_MAX) {
      const oldest = existing[0].calledAt.getTime();
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000),
      );
      return { allowed: false, retryAfterSeconds } as RateLimitResult;
    }

    await tx
      .insert(voiceParseRateLimitCalls)
      .values({ userId, calledAt: new Date(now) });
    return { allowed: true } as RateLimitResult;
  });
}

const LANG_NAMES: Record<VoiceParseLanguage, string> = {
  id: "Bahasa Indonesia",
  en: "English",
  ms: "Bahasa Melayu",
  ar: "Arabic",
};

export interface VoiceParseContext {
  transcript: string;
  language?: VoiceParseLanguage;
  clientNowIso?: string;
  timezone?: string;
  // The user's existing categories (translated as stored, e.g. "Sholat
  // Fardhu", "Dzikir", or any custom name). The model must pick one of
  // these by exact-match string in the response.
  categoryNames: string[];
  // The user's custom dzikir labels (besides the built-in Subhanallah etc.).
  customDzikirLabels: string[];
}

const BUILT_IN_DZIKIR = [
  "subhanallah",
  "alhamdulillah",
  "allahuakbar",
  "lailahaillallah",
  "istighfar",
];

const SHOLAT_FARDHU = ["subuh", "dzuhur", "ashar", "maghrib", "isya", "jumat"];
const SHOLAT_SUNNAH = [
  "rawatib",
  "dhuha",
  "tahajjud",
  "witir",
  "tarawih",
  "eid",
  "istikharah",
  "hajat",
  "taubat",
  "tasbih",
];
const FASTING_TYPES = [
  "ramadhan",
  "qadha",
  "kaffarah",
  "nadzar",
  "seninkamis",
  "ayyamulbidh",
  "arafah",
  "asyura",
  "syawal",
  "daud",
];

function buildSystemPrompt(language?: VoiceParseLanguage): string {
  const langName = language ? LANG_NAMES[language] : "the language detected from the transcript";
  return [
    "You are an assistant that turns a user's spoken description of a single Islamic good deed into structured form fields for a habit-tracking app.",
    "",
    "RULES:",
    `1. Detect the spoken language. Write the "description" field in ${langName} — keep it short (the verbatim deed paraphrased, max ~120 chars). Do not translate it to English unless the user spoke English.`,
    "2. The user's available categories are listed in the user prompt. The \"category\" field MUST be exactly one of those strings. Match the spoken phrase by meaning across languages (e.g. \"shalat subuh\", \"fajr prayer\", \"صلاة الفجر\" all map to \"Sholat Fardhu\"). If you can't pick one confidently, omit category.",
    "3. Quantity: extract an integer. If the user said something like \"I prayed dzuhur\" with no count, default to 1. For dzikir like \"subhanallah 33 times\", quantity=33.",
    "4. customUnit must be one of [\"hitungan\",\"ayat\",\"halaman\",\"surat\",\"juz\",\"rakaat\",\"hari\",\"uang\",\"times\",\"days\"]. Defaults: Sholat -> \"times\", Puasa -> \"days\", Dzikir -> \"times\". For custom categories pick a sensible unit if obvious; otherwise omit.",
    "5. Category-specific fields:",
    `   - Dzikir: set "dzikirType" to one of [${BUILT_IN_DZIKIR.map((s) => `"${s}"`).join(", ")}] OR to one of the user's custom dzikir labels (use the exact label string). Omit if unspecified or \"any\".`,
    `   - Sholat Fardhu: set "sholatType" to one of [${SHOLAT_FARDHU.map((s) => `"${s}"`).join(", ")}].`,
    `   - Sholat Sunnah: set "sholatType" to one of [${SHOLAT_SUNNAH.map((s) => `"${s}"`).join(", ")}].`,
    `   - Sholat (either): set "isJamaah": true if the user clearly said they prayed in congregation (\"berjamaah\", \"in jamaah\", \"with the congregation\"). Otherwise omit.`,
    `   - Puasa: set "fastingType" to one of [${FASTING_TYPES.map((s) => `"${s}"`).join(", ")}].`,
    `   - Baca Quran: set "quranUnit" to one of [\"ayat\",\"halaman\",\"surat\",\"juz\"].`,
    `   - Shodaqoh / Sedekah: set "sedekahType" to \"uang\" (money) or \"hitungan\" (count of acts).`,
    "6. createdAtIso: ONLY set this if the user explicitly stated a date/time other than \"now\" (e.g. \"yesterday morning\", \"this morning at 7\", \"last night\"). Resolve relative phrases against the clientNowIso + timezone in the user prompt. Output ISO 8601 with timezone offset. If the user did not mention any time, omit this field.",
    "7. Always emit your answer by calling the tool `emit_deed` exactly once. Never include text outside the tool call.",
    "8. If the transcript is empty, off-topic (not a deed), or you cannot determine a category, set notes explaining why and omit category — the server treats that as low-confidence.",
  ].join("\n");
}

function buildUserPrompt(ctx: VoiceParseContext): string {
  const lines = [
    `Transcript: """${ctx.transcript.trim()}"""`,
    `Available categories: ${ctx.categoryNames.map((n) => `"${n}"`).join(", ")}`,
  ];
  if (ctx.customDzikirLabels.length > 0) {
    lines.push(`User's custom dzikir labels: ${ctx.customDzikirLabels.map((n) => `"${n}"`).join(", ")}`);
  }
  if (ctx.clientNowIso) {
    lines.push(`clientNowIso: ${ctx.clientNowIso}`);
  }
  if (ctx.timezone) {
    lines.push(`timezone: ${ctx.timezone}`);
  }
  lines.push("Call emit_deed with the parsed fields now.");
  return lines.join("\n");
}

const deedToolSchema = {
  type: "object" as const,
  properties: {
    category: { type: "string", description: "Must exactly equal one of the user's available categories. Omit if unsure." },
    description: { type: "string", description: "Short description in the user's spoken language (<= 120 chars)." },
    quantity: { type: "integer", minimum: 1 },
    customUnit: {
      type: "string",
      enum: ["hitungan", "ayat", "halaman", "surat", "juz", "rakaat", "hari", "uang", "times", "days"],
    },
    dzikirType: { type: "string" },
    sholatType: { type: "string", enum: [...SHOLAT_FARDHU, ...SHOLAT_SUNNAH] },
    fastingType: { type: "string", enum: FASTING_TYPES },
    isJamaah: { type: "boolean" },
    quranUnit: { type: "string", enum: ["ayat", "halaman", "surat", "juz"] },
    sedekahType: { type: "string", enum: ["uang", "hitungan"] },
    createdAtIso: { type: "string", description: "ISO 8601 with timezone offset. ONLY when the user stated a non-now time." },
    notes: { type: "string", description: "Short debug note. Set when you couldn't fill category." },
  },
};

export interface VoiceParseResult {
  parsed: VoiceParsedDeed;
  notes?: string;
  lowConfidence: boolean;
}

export async function parseVoiceDeed(ctx: VoiceParseContext): Promise<VoiceParseResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(ctx.language),
    tools: [
      {
        name: "emit_deed",
        description: "Emit the parsed deed fields. Call exactly once.",
        input_schema: deedToolSchema,
      },
    ],
    tool_choice: { type: "tool", name: "emit_deed" },
    messages: [{ role: "user", content: buildUserPrompt(ctx) }],
  });

  const toolBlock = message.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === "emit_deed",
  );
  if (!toolBlock) {
    throw new Error("Model did not return a tool_use block");
  }

  const raw = toolBlock.input as Record<string, unknown>;
  const notes = typeof raw.notes === "string" ? (raw.notes as string) : undefined;

  // Strip notes before zod-validating against the deed shape.
  const { notes: _drop, ...rest } = raw;
  const parsed = voiceParsedDeedSchema.safeParse(rest);
  if (!parsed.success) {
    return {
      parsed: {},
      notes: parsed.error.errors[0]?.message ?? "schema-invalid",
      lowConfidence: true,
    };
  }

  // Ensure the model picked a category from the user's actual list (case-
  // insensitive match, then snap back to the canonical casing).
  let canonicalCategory: string | undefined = parsed.data.category;
  if (canonicalCategory) {
    const match = ctx.categoryNames.find(
      (n) => n.toLowerCase() === canonicalCategory!.toLowerCase(),
    );
    canonicalCategory = match;
  }

  const finalParsed: VoiceParsedDeed = {
    ...parsed.data,
    category: canonicalCategory,
  };

  // Strip undefined keys for a tidier client payload.
  for (const k of Object.keys(finalParsed) as (keyof VoiceParsedDeed)[]) {
    if (finalParsed[k] === undefined) {
      delete finalParsed[k];
    }
  }

  const lowConfidence = !finalParsed.category;
  return { parsed: finalParsed, notes, lowConfidence };
}
