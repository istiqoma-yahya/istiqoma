import Anthropic from "@anthropic-ai/sdk";
import {
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_SOURCE_KINDS,
  targetRecommendationSchema,
  type RecommendationLanguage,
  type TargetRecommendation,
  type UserOnboarding,
} from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const MODEL = "claude-sonnet-4-6";

// In-memory per-user rate limiter. Allows up to N calls per hour, evaluated
// on every call (sliding window). Restarts when the process restarts; that's
// acceptable for credit-spend protection. A periodic sweep evicts stale
// entries so the map can't grow unbounded across many users.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_SWEEP_MS = 15 * 60 * 1000;
const callsByUser = new Map<string, number[]>();
let lastSweep = Date.now();

function sweepRateLimitMap(now: number): void {
  if (now - lastSweep < RATE_LIMIT_SWEEP_MS) return;
  lastSweep = now;
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [userId, timestamps] of callsByUser) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) callsByUser.delete(userId);
    else if (fresh.length !== timestamps.length) callsByUser.set(userId, fresh);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  sweepRateLimitMap(now);
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const existing = (callsByUser.get(userId) || []).filter((t) => t > cutoff);
  if (existing.length >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing[0] + RATE_LIMIT_WINDOW_MS - now) / 1000),
    );
    callsByUser.set(userId, existing);
    return { allowed: false, retryAfterSeconds };
  }
  existing.push(now);
  callsByUser.set(userId, existing);
  return { allowed: true };
}

const Q1_LABELS: Record<string, string> = {
  pemula: "beginner — just starting out",
  "naik-turun": "inconsistent — practice goes up and down",
  "cukup-baik": "fairly steady — practice is decent",
  tingkatkan: "wants to take practice to the next level",
};

const Q2_LABELS: Record<string, string> = {
  lupa: "tends to forget",
  males: "struggles with motivation / lazy",
  "tidak-tahu": "doesn't know where to start",
  sibuk: "very busy / hard to find time",
};

const Q3_LABELS: Record<string, string> = {
  "baca-quran": "reading Quran",
  dzikir: "dzikir / remembrance of Allah",
  "sholat-fardhu": "the five obligatory daily prayers (Sholat Fardhu)",
  "sholat-sunnah": "voluntary prayers (Sholat Sunnah, e.g. Tahajjud, Dhuha, Rawatib)",
  puasa: "fasting (Ramadan and voluntary fasts)",
  "hafalan-quran": "memorizing Quran",
  "birrul-walidayn": "kindness and dutifulness to parents",
  shodaqoh: "charity (Shodaqoh / Sadaqah)",
  "tolabul-ilmi": "seeking Islamic knowledge",
};

const Q4_LABELS: Record<string, string> = {
  subuh: "Subuh (dawn)",
  ashar: "Ashar (afternoon)",
  isya: "Isya (night)",
  tidur: "right before sleep",
};

const Q5_LABELS: Record<string, string> = {
  "dekat-allah": "feel closer to Allah",
  bermanfaat: "be useful to others",
  berilmu: "be knowledgeable in the deen",
  istiqomah: "be consistent (istiqomah) in worship",
  keluarga: "build a stronger family in faith",
};

const LANG_NAMES: Record<RecommendationLanguage, string> = {
  id: "Bahasa Indonesia",
  en: "English",
  ms: "Bahasa Melayu",
};

function summarizeOnboarding(onboarding: UserOnboarding | null): string {
  if (!onboarding) {
    return "User has not completed onboarding. Treat them as a beginner Muslim wanting to build a few simple, sustainable daily acts of worship.";
  }
  const parts: string[] = [];
  if (onboarding.q1) parts.push(`Current level: ${Q1_LABELS[onboarding.q1] || onboarding.q1}.`);
  if (onboarding.q2) parts.push(`Main struggle: ${Q2_LABELS[onboarding.q2] || onboarding.q2}.`);
  const focus = (onboarding.q3 || []).map((p) => Q3_LABELS[p] || p).filter(Boolean);
  if (focus.length) parts.push(`Wants to focus on: ${focus.join(", ")}.`);
  if (onboarding.q4) parts.push(`Most-active time of day: ${Q4_LABELS[onboarding.q4] || onboarding.q4}.`);
  if (onboarding.q5) parts.push(`Identity goal: wants to ${Q5_LABELS[onboarding.q5] || onboarding.q5}.`);
  return parts.join(" ");
}

function buildSystemPrompt(language: RecommendationLanguage): string {
  const langName = LANG_NAMES[language];
  return [
    "You are an assistant that recommends Islamic worship targets for a personal habit-tracking app.",
    "",
    "ABSOLUTE RULES — read carefully:",
    "1. Every recommendation MUST be backed by ONE citation. The citation MUST come from exactly one of these three sources only:",
    "   - The Quran (kind: \"quran\")",
    "   - Sahih al-Bukhari (kind: \"bukhari\")",
    "   - Sahih Muslim (kind: \"muslim\")",
    "2. NEVER cite Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah, Musnad Ahmad, Muwatta, or any other collection. NEVER cite a scholar's quote.",
    "3. If you are not 100% certain a hadith is in Sahih al-Bukhari or Sahih Muslim with a verifiable hadith number, OMIT that recommendation entirely. Quality over quantity. It is far better to return 4 trustworthy items than 8 with a fabricated citation.",
    "4. Provide the Arabic text exactly as it appears in the source. Do NOT invent or paraphrase Arabic. If unsure, omit.",
    `5. The "whyItFits" string and the "translation" string MUST be in ${langName} (language code: ${language}). The Arabic field is always literal Arabic.`,
    "6. The reference must be a clear, human-readable citation, e.g.:",
    "   - quran: \"QS Al-Baqarah 2:152\" or \"Quran 2:152\"",
    "   - bukhari: \"HR. Bukhari no. 6407\" or \"Sahih al-Bukhari 6407\"",
    "   - muslim: \"HR. Muslim no. 2675\" or \"Sahih Muslim 2675\"",
    "",
    "TARGET FIELDS — map each recommendation to the app's data model:",
    `- "category" must be exactly one of: ${RECOMMENDATION_CATEGORIES.map((c) => `"${c}"`).join(", ")}.`,
    "- For category \"Dzikir\": set \"dzikirType\" to one of [\"subhanallah\",\"alhamdulillah\",\"allahuakbar\",\"lailahaillallah\",\"istighfar\"] (or omit for \"any\"); set \"customUnit\":\"times\".",
    "- For category \"Sholat Fardhu\": set \"sholatType\" to one of [\"subuh\",\"dzuhur\",\"ashar\",\"maghrib\",\"isya\",\"jumat\"] (or omit for any); set \"customUnit\":\"times\".",
    "- For category \"Sholat Sunnah\": set \"sholatType\" to one of [\"rawatib\",\"dhuha\",\"tahajjud\",\"witir\",\"tarawih\",\"tasbih\",\"eid\",\"istikharah\",\"hajat\",\"taubat\"]; set \"customUnit\":\"times\" or \"rakaat\".",
    "- For category \"Puasa\": set \"fastingType\" to one of [\"ramadhan\",\"qadha\",\"kaffarah\",\"nadzar\",\"seninkamis\",\"ayyamulbidh\",\"arafah\",\"asyura\",\"syawal\",\"daud\"]; set \"customUnit\":\"days\".",
    "- For category \"Baca Quran\": set \"quranUnit\" to one of [\"ayat\",\"halaman\",\"surat\",\"juz\"].",
    "- For category \"Shodaqoh\": set \"sedekahType\" to \"uang\" (money) or \"hitungan\" (count of acts).",
    "- For categories \"Birrul Walidayn\" and \"Tolabul Ilmi\": set \"customUnit\" to a sensible unit such as \"hitungan\" (count).",
    "- \"period\" should be \"daily\", \"weekly\", or \"monthly\". \"recurrence\" should usually be \"recurring\".",
    "- \"targetValue\" must be a small, achievable integer (e.g. 33 for tasbih after sholat, 5 for pages of Quran daily). Be realistic for a beginner.",
    "- \"id\" must be a short opaque slug unique within your response (e.g. \"rec-1\", \"rec-2\").",
    "",
    "Aim for 6 recommendations. The recommendations should clearly fit the user's onboarding profile (their current level, struggle, focus areas, most-active time, and identity goal).",
    "",
    "You MUST emit your answer by calling the provided tool `emit_recommendations` exactly once with a `recommendations` array. Do not produce any text outside the tool call.",
  ].join("\n");
}

function buildUserPrompt(
  onboarding: UserOnboarding | null,
  language: RecommendationLanguage,
): string {
  const langName = LANG_NAMES[language];
  return [
    `User profile: ${summarizeOnboarding(onboarding)}`,
    "",
    `Please recommend 6 worship targets that suit this user. Reply by calling the tool \`emit_recommendations\` once. The "whyItFits" and "translation" strings must be in ${langName}. Cite ONLY Quran, Sahih al-Bukhari, or Sahih Muslim — no other source.`,
  ].join("\n");
}

const recommendationToolSchema = {
  type: "object" as const,
  properties: {
    recommendations: {
      type: "array",
      description: "List of recommended targets (aim for 6).",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Short opaque slug, unique within this array." },
          name: { type: "string", description: "Short target name in the user's language, e.g. 'Tasbih 33x setelah sholat'." },
          category: {
            type: "string",
            enum: RECOMMENDATION_CATEGORIES as unknown as string[],
          },
          targetValue: { type: "integer", minimum: 1 },
          period: { type: "string", enum: ["daily", "weekly", "monthly"] },
          recurrence: { type: "string", enum: ["recurring", "oneTime"] },
          dzikirType: { type: "string" },
          sholatType: { type: "string" },
          fastingType: { type: "string" },
          isJamaah: { type: "boolean" },
          quranUnit: { type: "string", enum: ["ayat", "halaman", "surat", "juz"] },
          sedekahType: { type: "string", enum: ["uang", "hitungan"] },
          customUnit: {
            type: "string",
            enum: ["hitungan", "ayat", "halaman", "surat", "juz", "rakaat", "hari", "uang", "times", "days"],
          },
          whyItFits: { type: "string", description: "One sentence in the user's language tying this recommendation to their onboarding answers." },
          source: {
            type: "object",
            properties: {
              kind: { type: "string", enum: RECOMMENDATION_SOURCE_KINDS as unknown as string[] },
              reference: { type: "string", description: "Human-readable citation, e.g. 'QS Al-Baqarah 2:152' or 'HR. Bukhari no. 6407'." },
              arabic: { type: "string", description: "Literal Arabic text of the verse/hadith." },
              translation: { type: "string", description: "Translation in the user's app language." },
            },
            required: ["kind", "reference", "arabic", "translation"],
          },
        },
        required: ["id", "name", "category", "targetValue", "whyItFits", "source"],
      },
    },
  },
  required: ["recommendations"],
};

export async function generateRecommendations(
  onboarding: UserOnboarding | null,
  language: RecommendationLanguage,
): Promise<TargetRecommendation[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(language),
    tools: [
      {
        name: "emit_recommendations",
        description: "Emit the final list of recommended Islamic worship targets, each with one citation from Quran, Sahih al-Bukhari, or Sahih Muslim only.",
        input_schema: recommendationToolSchema,
      },
    ],
    tool_choice: { type: "tool", name: "emit_recommendations" },
    messages: [{ role: "user", content: buildUserPrompt(onboarding, language) }],
  });

  const toolBlock = message.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === "emit_recommendations",
  );

  if (!toolBlock) {
    throw new Error("Model did not return a tool_use block");
  }

  const raw = toolBlock.input as { recommendations?: unknown };
  const items = Array.isArray(raw?.recommendations) ? raw.recommendations : [];

  const valid: TargetRecommendation[] = [];
  for (const item of items) {
    const parsed = targetRecommendationSchema.safeParse(item);
    if (!parsed.success) continue;
    // Defense in depth: drop anything whose source.kind isn't one of the
    // three permitted kinds (the schema already enforces this, but we
    // double-check explicitly per the task spec).
    if (!RECOMMENDATION_SOURCE_KINDS.includes(parsed.data.source.kind)) continue;
    // Reject references whose human-readable string doesn't match the
    // expected citation shape for its kind. This catches model output that
    // labels something as "bukhari" while citing e.g. Tirmidhi or a
    // free-form quote.
    if (!isReferenceFormatValid(parsed.data.source.kind, parsed.data.source.reference)) continue;
    // Require non-empty Arabic text containing at least a few Arabic letters
    // (basic Unicode block U+0600..U+06FF). This blocks empty / Latin-only
    // citations that the schema can't catch.
    if (!hasArabicText(parsed.data.source.arabic)) continue;
    valid.push(parsed.data);
  }

  return valid;
}

// Citation-format allowlists. Each kind has at least one regex that the
// model's `reference` string must match. Patterns are intentionally permissive
// about surrounding punctuation/labels but strict about the source name and
// requiring a numeric reference (verse or hadith number). Anything that
// mentions a disallowed source (e.g. Tirmidhi) is rejected even if `kind`
// claims otherwise.
const DISALLOWED_SOURCE_PATTERN =
  /\b(tirmidhi|tirmidzi|abu\s*dawud|abu\s*daud|nasa[i'`]|nasai|ibn\s*majah|ibnu\s*majah|musnad|ahmad|muwatta|darimi|baihaqi|hakim|tabarani)\b/i;

const QURAN_PATTERNS: RegExp[] = [
  // "QS Al-Baqarah 2:152" / "QS Al-Baqarah (2:152)"
  /\bQS\b[^()\d]*\(?\s*\d{1,3}\s*[:.\s]\s*\d{1,3}\s*\)?/i,
  // "Quran 2:152" / "Qur'an 2:152" / "Al-Qur'an 2:152"
  /\b(?:al[-\s]?)?qur'?an\b[^()\d]*\(?\s*\d{1,3}\s*[:.\s]\s*\d{1,3}\s*\)?/i,
  // "Surah Al-Baqarah, ayat 152" / "Surah Al-Baqarah ayat 152"
  /\bsurah?\b[^()\d]*ayat\s*\d{1,3}/i,
];

const BUKHARI_PATTERNS: RegExp[] = [
  // "Sahih al-Bukhari 6407" / "Sahih Bukhari no. 6407" / "HR. Bukhari no. 6407"
  /\b(?:sahih\s+(?:al[-\s]?)?bukhari|HR\.?\s*bukhari|bukhari)\b[^a-z]*?(?:no\.?|#)?\s*\d{1,5}/i,
];

const MUSLIM_PATTERNS: RegExp[] = [
  // "Sahih Muslim 2675" / "HR. Muslim no. 2675"
  /\b(?:sahih\s+muslim|HR\.?\s*muslim|muslim)\b[^a-z]*?(?:no\.?|#)?\s*\d{1,5}/i,
];

function isReferenceFormatValid(kind: TargetRecommendation["source"]["kind"], reference: string): boolean {
  if (typeof reference !== "string" || reference.trim().length === 0) return false;
  if (DISALLOWED_SOURCE_PATTERN.test(reference)) return false;
  const ref = reference.trim();
  switch (kind) {
    case "quran":
      return QURAN_PATTERNS.some((re) => re.test(ref));
    case "bukhari":
      return BUKHARI_PATTERNS.some((re) => re.test(ref));
    case "muslim":
      return MUSLIM_PATTERNS.some((re) => re.test(ref));
    default:
      return false;
  }
}

function hasArabicText(text: unknown): boolean {
  if (typeof text !== "string") return false;
  // At least 3 Arabic letters (block U+0600..U+06FF).
  const matches = text.match(/[\u0600-\u06FF]/g);
  return !!matches && matches.length >= 3;
}
