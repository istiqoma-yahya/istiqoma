import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  Q3_TO_CATEGORY,
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_SOURCE_KINDS,
  recommendationRateLimitCalls,
  targetRecommendationSchema,
  type RecommendationLanguage,
  type TargetRecommendation,
  type UserOnboarding,
} from "@workspace/db";
import {
  arabicMatchesEntry,
  isReferenceInRange,
  lookupCorpusEntry,
  renderCorpusArabicForCategories,
  renderCorpusForPrompt,
  CORPUS_ENTRIES,
} from "./recommendationsCorpus";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const MODEL = "claude-sonnet-4-6";

// Per-user sliding-window rate limiter backed by Postgres so counters survive
// process restarts and are shared across replicas. Allows up to N calls per
// window. Each request prunes its own user's expired rows, so the table
// stays bounded without a separate sweep job.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// In-memory recommendation cache. Keyed by (userId, language, onboarding
// fingerprint) so repeat opens within the TTL skip the Claude call entirely.
// The fingerprint is derived from the onboarding answers, so any edit to
// onboarding produces a new key and therefore a fresh fetch — no manual
// invalidation step is required when a user updates their answers.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_SWEEP_MS = 30 * 60 * 1000;

interface CacheEntry {
  recommendations: TargetRecommendation[];
  expiresAt: number;
}

const recommendationCache = new Map<string, CacheEntry>();
let lastCacheSweep = Date.now();

function sweepCache(now: number): void {
  if (now - lastCacheSweep < CACHE_SWEEP_MS) return;
  lastCacheSweep = now;
  for (const [key, entry] of recommendationCache) {
    if (entry.expiresAt <= now) recommendationCache.delete(key);
  }
}

export function fingerprintOnboarding(onboarding: UserOnboarding | null): string {
  // Only the fields actually fed into the prompt contribute to the hash.
  // We sort q3 so an answer-order change doesn't bust the cache.
  const payload = onboarding
    ? {
        q1: onboarding.q1 ?? null,
        q2: onboarding.q2 ?? null,
        q3: [...(onboarding.q3 ?? [])].sort(),
        q4: onboarding.q4 ?? null,
        q5: onboarding.q5 ?? null,
      }
    : { empty: true };
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}

function cacheKey(
  userId: string,
  language: RecommendationLanguage,
  fingerprint: string,
): string {
  return `${userId}|${language}|${fingerprint}`;
}

export function getCachedRecommendations(
  userId: string,
  language: RecommendationLanguage,
  onboarding: UserOnboarding | null,
): TargetRecommendation[] | null {
  const now = Date.now();
  sweepCache(now);
  const key = cacheKey(userId, language, fingerprintOnboarding(onboarding));
  const entry = recommendationCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    recommendationCache.delete(key);
    return null;
  }
  return entry.recommendations;
}

export function setCachedRecommendations(
  userId: string,
  language: RecommendationLanguage,
  onboarding: UserOnboarding | null,
  recommendations: TargetRecommendation[],
): void {
  const key = cacheKey(userId, language, fingerprintOnboarding(onboarding));
  recommendationCache.set(key, {
    recommendations,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateUserRecommendationCache(userId: string): void {
  const prefix = `${userId}|`;
  for (const key of recommendationCache.keys()) {
    if (key.startsWith(prefix)) recommendationCache.delete(key);
  }
}

// Stable 64-bit advisory-lock key derived from the user id. We split the
// sha256 of the user id into two 32-bit halves and pass them to
// pg_advisory_xact_lock(int4, int4) so concurrent rate-limit checks for the
// SAME user serialize, while different users do not contend.
function advisoryLockKeysForUser(userId: string): { hi: number; lo: number } {
  const hash = createHash("sha256").update(userId).digest();
  // Read as signed int32 so values fit Postgres' int4 parameters.
  const hi = hash.readInt32BE(0);
  const lo = hash.readInt32BE(4);
  return { hi, lo };
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = new Date(now - RATE_LIMIT_WINDOW_MS);
  const { hi, lo } = advisoryLockKeysForUser(userId);

  // Run prune + count + insert inside a single transaction guarded by a
  // per-user Postgres advisory lock so concurrent requests for the same
  // user (across replicas / event-loop ticks) cannot all observe < MAX
  // rows and each insert. Different users take different locks, so this
  // does not serialize unrelated traffic.
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${hi}, ${lo})`);

    // Match the previous in-memory semantics exactly: a timestamp <= cutoff
    // is expired (the old code kept only `t > cutoff`).
    await tx
      .delete(recommendationRateLimitCalls)
      .where(
        and(
          eq(recommendationRateLimitCalls.userId, userId),
          lte(recommendationRateLimitCalls.calledAt, cutoff),
        ),
      );

    const existing = await tx
      .select({ calledAt: recommendationRateLimitCalls.calledAt })
      .from(recommendationRateLimitCalls)
      .where(eq(recommendationRateLimitCalls.userId, userId))
      .orderBy(asc(recommendationRateLimitCalls.calledAt));

    if (existing.length >= RATE_LIMIT_MAX) {
      const oldest = existing[0].calledAt.getTime();
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000),
      );
      return { allowed: false, retryAfterSeconds } as RateLimitResult;
    }

    await tx
      .insert(recommendationRateLimitCalls)
      .values({ userId, calledAt: new Date(now) });
    return { allowed: true } as RateLimitResult;
  });
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
  // Use the canonical onboarding -> category mapping so the model is told,
  // explicitly, which target categories should appear in its picks. This
  // keeps prompt suggestions in lockstep with what onboarding promises.
  const categories = Array.from(
    new Set(
      (onboarding.q3 || [])
        .map((p) => Q3_TO_CATEGORY[p as keyof typeof Q3_TO_CATEGORY])
        .filter(Boolean),
    ),
  );
  if (categories.length) {
    parts.push(
      `Prefer recommendations in these target categories: ${categories.map((c) => `"${c}"`).join(", ")}.`,
    );
  }
  if (onboarding.q4) parts.push(`Most-active time of day: ${Q4_LABELS[onboarding.q4] || onboarding.q4}.`);
  if (onboarding.q5) parts.push(`Identity goal: wants to ${Q5_LABELS[onboarding.q5] || onboarding.q5}.`);
  return parts.join(" ");
}

// Derive recommendation categories from an onboarding profile for use in
// prompt construction (Arabic injection) and fallback selection.
function categoriesFromOnboarding(onboarding: UserOnboarding | null): string[] {
  if (!onboarding) return [];
  return Array.from(
    new Set(
      (onboarding.q3 ?? [])
        .map((p) => Q3_TO_CATEGORY[p as keyof typeof Q3_TO_CATEGORY])
        .filter(Boolean) as string[],
    ),
  );
}

function buildSystemPrompt(language: RecommendationLanguage, relevantCategories: string[]): string {
  const langName = LANG_NAMES[language];
  const arabicSection = renderCorpusArabicForCategories(relevantCategories);

  return [
    "You are an assistant that recommends Islamic worship targets for a personal habit-tracking app.",
    "",
    "ABSOLUTE RULES — read carefully:",
    "1. You MUST only cite entries from the ALLOWED CITATIONS list below. Any citation outside that list (including correctly-formatted but unlisted hadith numbers) will be rejected and the recommendation discarded.",
    "2. Copy the Arabic verbatim from the CANONICAL ARABIC section below for whichever entry you choose. The server verifies the Arabic against ground truth — fabricated or paraphrased Arabic is rejected.",
    `3. The "whyItFits" string and the "translation" string MUST be in ${langName} (language code: ${language}). The Arabic field is always literal Arabic.`,
    "4. NEVER cite Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah, Musnad Ahmad, Muwatta, or any other collection. NEVER cite a scholar's quote.",
    "5. Use the reference string exactly as written in the ALLOWED CITATIONS list (e.g. \"QS Al-Baqarah 2:152\" or \"HR. Bukhari no. 6406\").",
    "",
    "ALLOWED CITATIONS — pick ONLY from this list. The server rejects any citation not on it, even if the number is real.",
    renderCorpusForPrompt(),
    "",
    "CANONICAL ARABIC — copy the Arabic field verbatim from this section for whichever entry you cite.",
    arabicSection,
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
  const relevantCategories = categoriesFromOnboarding(onboarding);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(language, relevantCategories),
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
  const dropped: Array<{ reason: string; reference?: string; kind?: string }> = [];
  for (const item of items) {
    const parsed = targetRecommendationSchema.safeParse(item);
    if (!parsed.success) {
      dropped.push({ reason: "schema-invalid" });
      continue;
    }
    const { kind, reference, arabic } = parsed.data.source;
    if (!RECOMMENDATION_SOURCE_KINDS.includes(kind)) {
      dropped.push({ reason: "disallowed-kind", kind, reference });
      continue;
    }
    if (!isReferenceFormatValid(kind, reference)) {
      dropped.push({ reason: "format-invalid", kind, reference });
      continue;
    }
    if (!hasArabicText(arabic)) {
      dropped.push({ reason: "missing-arabic", kind, reference });
      continue;
    }
    // Defense-in-depth existence check before corpus lookup.
    if (!isReferenceInRange(kind, reference)) {
      dropped.push({ reason: "out-of-range", kind, reference });
      continue;
    }
    // Fail-closed Arabic verification: a citation is accepted only if it
    // exists in our curated corpus AND its Arabic, normalized, is a
    // contiguous substring of the canonical text. References outside the
    // corpus cannot be Arabic-verified and are therefore dropped — better
    // to return fewer, fully-verified items than to surface a fabricated
    // citation to the user.
    const entry = lookupCorpusEntry(kind, reference);
    if (!entry) {
      dropped.push({ reason: "not-in-corpus", kind, reference });
      continue;
    }
    if (!arabicMatchesEntry(entry, arabic)) {
      dropped.push({ reason: "arabic-mismatch", kind, reference });
      continue;
    }
    // Canonicalize the outgoing reference to the corpus' display string so
    // any malformed surah name in the model output (e.g. wrong transliteration
    // paired with a correct number) is replaced with our vetted form.
    parsed.data.source.reference = entry.display;
    valid.push(parsed.data);
  }

  if (dropped.length > 0) {
    // Structured one-liner per dropped item for easy production grep.
    for (const d of dropped) {
      console.warn(
        `[recommendations] dropped reason=${d.reason} kind=${d.kind ?? "-"} ref="${d.reference ?? "-"}"`,
      );
    }
    console.warn(
      `[recommendations] summary: accepted=${valid.length} dropped=${dropped.length} total=${items.length}`,
    );
  }
  return valid;
}

// ── Fallback recommendations ───────────────────────────────────────────────
//
// When the AI validator drops every generated item (rare but happens when the
// corpus gaps are still being filled), we surface a small hand-picked set of
// pre-validated recommendations drawn entirely from the corpus instead of
// returning a 503. This guarantees users always see something useful.
//
// Each fallback entry is keyed by category and is pre-validated: the
// corpus entry it references is confirmed to exist at build time via the
// assertion in buildFallback().

interface FallbackSpec {
  category: (typeof RECOMMENDATION_CATEGORIES)[number];
  refKind: "quran" | "bukhari" | "muslim";
  refKey: string;
  targetValue: number;
  period: "daily" | "weekly";
  recurrence: "recurring";
  customUnit?: "times" | "days" | "hitungan" | "rakaat";
  dzikirType?: string;
  sholatType?: string;
  fastingType?: string;
  quranUnit?: "ayat" | "halaman" | "surat" | "juz";
  sedekahType?: "uang" | "hitungan";
  name: Record<RecommendationLanguage, string>;
  whyItFits: Record<RecommendationLanguage, string>;
  translation: Record<RecommendationLanguage, string>;
}

const FALLBACK_SPECS: FallbackSpec[] = [
  {
    category: "Dzikir",
    refKind: "quran", refKey: "13:28",
    targetValue: 33, period: "daily", recurrence: "recurring",
    dzikirType: "subhanallah", customUnit: "times",
    name: {
      id: "Dzikir 33x setelah sholat",
      en: "33x Dhikr after prayer",
      ms: "Zikir 33x selepas solat",
    },
    whyItFits: {
      id: "Dzikir membuat hati menjadi tenang sesuai dengan firman Allah.",
      en: "Remembrance of Allah brings peace to the heart as Allah promises.",
      ms: "Zikir menenangkan hati sesuai dengan firman Allah.",
    },
    translation: {
      id: "Orang-orang yang beriman dan hati mereka menjadi tenteram dengan mengingat Allah. Ingatlah, hanya dengan mengingat Allah-lah hati menjadi tenteram.",
      en: "Those who believe and whose hearts find rest in the remembrance of Allah — truly, in the remembrance of Allah do hearts find rest.",
      ms: "Orang-orang yang beriman dan hati mereka menjadi tenteram dengan mengingati Allah. Ketahuilah, hanya dengan mengingati Allah hati menjadi tenteram.",
    },
  },
  {
    category: "Sholat Fardhu",
    refKind: "quran", refKey: "2:238",
    targetValue: 5, period: "daily", recurrence: "recurring",
    sholatType: undefined, customUnit: "times",
    name: {
      id: "Sholat 5 Waktu Tepat Waktu",
      en: "5 Daily Prayers on Time",
      ms: "Solat 5 Waktu Tepat Waktu",
    },
    whyItFits: {
      id: "Allah memerintahkan kita menjaga sholat-sholat wajib, terutama sholat wustho.",
      en: "Allah commands us to guard the obligatory prayers, especially the middle prayer.",
      ms: "Allah memerintahkan kita menjaga solat-solat wajib, terutama solat wustho.",
    },
    translation: {
      id: "Peliharalah semua sholat dan sholat wustho. Dan laksanakanlah (sholat) karena Allah dengan khusyuk.",
      en: "Maintain with care the (obligatory) prayers and the middle prayer, and stand before Allah in devout obedience.",
      ms: "Peliharalah semua solat dan solat wustho dan berdirilah karena Allah dengan taat.",
    },
  },
  {
    category: "Sholat Sunnah",
    refKind: "quran", refKey: "17:79",
    targetValue: 2, period: "daily", recurrence: "recurring",
    sholatType: "tahajjud", customUnit: "rakaat",
    name: {
      id: "Sholat Tahajjud 2 Rakaat",
      en: "Tahajjud Prayer 2 Rak'ah",
      ms: "Solat Tahajjud 2 Rakaat",
    },
    whyItFits: {
      id: "Sholat malam membawa ke maqam yang terpuji seperti yang Allah janjikan.",
      en: "Night prayer leads to the praised station that Allah has promised.",
      ms: "Solat malam membawa kepada maqam yang terpuji seperti yang Allah janjikan.",
    },
    translation: {
      id: "Dan pada sebahagian malam, maka bertahajudlah kamu sebagai suatu ibadah tambahan bagimu; mudah-mudahan Tuhanmu mengangkat kamu ke tempat yang terpuji.",
      en: "And rise from sleep during the night as an additional prayer for you; perhaps your Lord will resurrect you to a praised position.",
      ms: "Dan pada sebahagian malam, hendaklah kamu bertahajjud dengannya sebagai ibadah tambahan bagimu; mudah-mudahan Tuhanmu membangkitkan kamu ke tempat yang terpuji.",
    },
  },
  {
    category: "Puasa",
    refKind: "bukhari", refKey: "1904",
    targetValue: 1, period: "weekly", recurrence: "recurring",
    fastingType: "seninkamis", customUnit: "days",
    name: {
      id: "Puasa Senin Kamis",
      en: "Monday-Thursday Fast",
      ms: "Puasa Isnin Khamis",
    },
    whyItFits: {
      id: "Puasa dengan iman dan mengharap pahala menghapus dosa-dosa yang lalu.",
      en: "Fasting with faith and hope for reward erases past sins.",
      ms: "Berpuasa dengan iman dan harapan pahala menghapuskan dosa-dosa yang lalu.",
    },
    translation: {
      id: "Barangsiapa berpuasa Ramadan karena iman dan mengharap pahala, maka diampuni dosa-dosanya yang telah lalu.",
      en: "Whoever fasts Ramadan out of faith and hope for reward, his past sins will be forgiven.",
      ms: "Sesiapa yang berpuasa Ramadan kerana iman dan mengharap pahala, diampuni dosa-dosanya yang telah lalu.",
    },
  },
  {
    category: "Baca Quran",
    refKind: "bukhari", refKey: "5027",
    targetValue: 1, period: "daily", recurrence: "recurring",
    quranUnit: "halaman",
    name: {
      id: "Baca Al-Quran 1 Halaman",
      en: "Read Quran 1 Page",
      ms: "Baca Al-Quran 1 Halaman",
    },
    whyItFits: {
      id: "Sebaik-baik kalian adalah yang belajar dan mengajarkan Al-Quran.",
      en: "The best among you is one who learns and teaches the Quran.",
      ms: "Sebaik-baik kalian adalah yang belajar dan mengajarkan Al-Quran.",
    },
    translation: {
      id: "Sebaik-baik kalian adalah orang yang mempelajari Al-Quran dan mengajarkannya.",
      en: "The best of you are those who learn the Quran and teach it.",
      ms: "Sebaik-baik kamu adalah orang yang mempelajari Al-Quran dan mengajarkannya.",
    },
  },
  {
    category: "Shodaqoh",
    refKind: "muslim", refKey: "1010",
    targetValue: 1, period: "daily", recurrence: "recurring",
    sedekahType: "hitungan",
    name: {
      id: "Bersedekah 1x Sehari",
      en: "Give Charity Once Daily",
      ms: "Bersedekah 1x Sehari",
    },
    whyItFits: {
      id: "Sedekah tidak mengurangi harta, bahkan menambah kemuliaan.",
      en: "Charity does not decrease wealth; it only adds to one's honor.",
      ms: "Sedekah tidak mengurangi harta, malah menambah kemuliaan.",
    },
    translation: {
      id: "Tidak akan berkurang harta karena sedekah. Dan tidaklah Allah menambahkan kepada seorang hamba yang pemaaf melainkan kemuliaan.",
      en: "Charity does not decrease wealth. Allah increases the honor of one who is forgiving, and no one humbles themselves for Allah except that Allah raises them.",
      ms: "Sedekah tidak akan mengurangi harta. Dan Allah tidak akan menambahkan kepada seorang hamba yang pemaaf kecuali kemuliaan.",
    },
  },
  {
    category: "Birrul Walidayn",
    refKind: "quran", refKey: "17:24",
    targetValue: 1, period: "daily", recurrence: "recurring",
    customUnit: "hitungan",
    name: {
      id: "Berbuat Baik kepada Orang Tua",
      en: "Act of Kindness to Parents",
      ms: "Berbuat Baik kepada Ibu Bapa",
    },
    whyItFits: {
      id: "Merendahkan diri dan mendoakan orang tua adalah perintah langsung dari Allah.",
      en: "Lowering the wing of humility and supplicating for parents is a direct command from Allah.",
      ms: "Merendahkan diri dan mendoakan ibu bapa adalah perintah langsung daripada Allah.",
    },
    translation: {
      id: "Dan rendahkanlah dirimu terhadap keduanya dengan penuh kasih sayang dan ucapkanlah, 'Wahai Tuhanku, sayangilah keduanya sebagaimana mereka berdua mendidik aku pada waktu kecil.'",
      en: "Lower to them the wing of humility out of mercy and say, 'My Lord, have mercy upon them as they raised me when I was small.'",
      ms: "Dan rendahkanlah dirimu terhadap keduanya dengan penuh kasih sayang dan berdoalah, 'Ya Tuhanku, sayangilah keduanya sebagaimana mereka mendidikku sewaktu kecil.'",
    },
  },
  {
    category: "Tolabul Ilmi",
    refKind: "muslim", refKey: "2699",
    targetValue: 1, period: "daily", recurrence: "recurring",
    customUnit: "hitungan",
    name: {
      id: "Belajar Ilmu Agama 1x",
      en: "Study Islamic Knowledge Once",
      ms: "Belajar Ilmu Agama 1x",
    },
    whyItFits: {
      id: "Menempuh jalan ilmu adalah jalan menuju surga.",
      en: "Traveling the path of knowledge is a path to Paradise.",
      ms: "Menempuh jalan ilmu adalah jalan menuju syurga.",
    },
    translation: {
      id: "Barangsiapa menempuh jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju surga.",
      en: "Whoever travels a path in search of knowledge, Allah will make easy for him a path to Paradise.",
      ms: "Sesiapa yang menempuh jalan untuk mencari ilmu, Allah akan memudahkan baginya jalan menuju syurga.",
    },
  },
];

// Pre-built fallback list (validated at module load). Each entry is confirmed
// to exist in the corpus.
const FALLBACK_RECOMMENDATIONS: Record<RecommendationLanguage, TargetRecommendation[]> = (() => {
  const langs: RecommendationLanguage[] = ["id", "en", "ms"];
  const result: Record<RecommendationLanguage, TargetRecommendation[]> = {
    id: [], en: [], ms: [],
  };
  for (const spec of FALLBACK_SPECS) {
    const entry = CORPUS_ENTRIES.find(
      (e) => e.kind === spec.refKind && e.refKey === spec.refKey,
    );
    if (!entry) {
      // Safety check: if a spec references a missing corpus entry, skip it
      // rather than crashing the server at startup.
      console.warn(
        `[recommendations] fallback spec for "${spec.category}" references missing corpus entry ${spec.refKind}:${spec.refKey}`,
      );
      continue;
    }
    for (const lang of langs) {
      const rec: TargetRecommendation = {
        id: `fallback-${spec.refKind}-${spec.refKey.replace(":", "-")}`,
        name: spec.name[lang],
        category: spec.category,
        targetValue: spec.targetValue,
        period: spec.period,
        recurrence: spec.recurrence,
        ...(spec.customUnit ? { customUnit: spec.customUnit } : {}),
        ...(spec.dzikirType ? { dzikirType: spec.dzikirType } : {}),
        ...(spec.sholatType ? { sholatType: spec.sholatType } : {}),
        ...(spec.fastingType ? { fastingType: spec.fastingType } : {}),
        ...(spec.quranUnit ? { quranUnit: spec.quranUnit } : {}),
        ...(spec.sedekahType ? { sedekahType: spec.sedekahType } : {}),
        whyItFits: spec.whyItFits[lang],
        source: {
          kind: spec.refKind,
          reference: entry.display,
          arabic: entry.canonical,
          translation: spec.translation[lang],
        },
      };
      result[lang].push(rec);
    }
  }
  return result;
})();

/**
 * Returns a pre-validated fallback list when the AI validator drops every
 * generated item. Selects the categories most relevant to the user's
 * onboarding profile; falls back to the full list when onboarding is absent.
 */
export function getFallbackRecommendations(
  onboarding: UserOnboarding | null,
  language: RecommendationLanguage,
): TargetRecommendation[] {
  const all = FALLBACK_RECOMMENDATIONS[language];
  if (!onboarding) return all;

  const relevant = categoriesFromOnboarding(onboarding);
  if (relevant.length === 0) return all;

  const catSet = new Set(relevant);
  const filtered = all.filter((r) => catSet.has(r.category));
  // Always return at least 3 items; if the filter leaves too few, pad with
  // entries from the full list that weren't already included.
  if (filtered.length >= 3) return filtered;
  const extra = all.filter((r) => !catSet.has(r.category));
  return [...filtered, ...extra].slice(0, 4);
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
  // Note: name-only forms like "Surah Al-Baqarah ayat 152" are intentionally
  // NOT accepted — corpus validation requires a numeric surah:ayah pair so
  // we can verify against the canonical mushaf.
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
