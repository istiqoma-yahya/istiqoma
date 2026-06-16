// Citation validation: range checks + curated canonical Arabic accept-list.
//
// Fail-closed policy enforced by the validator in server/recommendations.ts:
// a citation is accepted only when (a) its number falls inside the canonical
// range for the source AND (b) it appears in CORPUS_ENTRIES below AND (c)
// the model's submitted Arabic, after normalization, is a contiguous
// substring of that entry's canonical Arabic. Anything else is dropped.
//
// Each CORPUS_ENTRIES entry stores the FULL canonical Arabic (no diacritics
// — the validator strips diacritics on both sides) so that a correct full
// recitation submitted by the model passes substring containment. The model
// is shown the allowed-citation list (reference + topic) in the system
// prompt, and the full canonical Arabic only for entries whose categories
// match the user's onboarding profile, so it can copy the text verbatim.

export const QURAN_SURAH_AYAH_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98,
  20: 135, 21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88,
  29: 69, 30: 60, 31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182,
  38: 88, 39: 75, 40: 85, 41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35,
  47: 38, 48: 29, 49: 18, 50: 45, 51: 60, 52: 49, 53: 62, 54: 55, 55: 78,
  56: 96, 57: 29, 58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18,
  65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28, 72: 28, 73: 20,
  74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42, 81: 29, 82: 19,
  83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20, 91: 15,
  92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6,
  110: 3, 111: 5, 112: 4, 113: 5, 114: 6,
};

// Hadith numbering: sunnah.com "in-book"/"reference" numbering, which is the
// default scheme cited by most Indonesian/English Islamic apps. Sahih
// al-Bukhari tops out at 7563 (Fath al-Bari numbering as used by sunnah.com).
// Sahih Muslim under sunnah.com's reference numbering also reaches 7563. If
// a different edition is ever adopted (e.g. 'Abd al-Baqi for Muslim, max
// 7470), update both constants and the curated CORPUS_ENTRIES below.
export const BUKHARI_MAX_HADITH = 7563;
export const MUSLIM_MAX_HADITH = 7563;

export interface CorpusEntry {
  kind: "quran" | "bukhari" | "muslim";
  refKey: string;
  display: string;
  /** Full canonical Arabic (no diacritics). */
  canonical: string;
  topic: string;
  /**
   * Recommendation categories this entry is most relevant to.
   * Used to filter which entries get their Arabic injected into the prompt
   * based on the user's onboarding profile.
   */
  categories: string[];
}

export const CORPUS_ENTRIES: CorpusEntry[] = [
  // ── Dzikir ────────────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "2:152", display: "QS Al-Baqarah 2:152",
    canonical: "فاذكروني اذكركم واشكروا لي ولا تكفرون",
    topic: "remember Me, I will remember you",
    categories: ["Dzikir"],
  },
  {
    kind: "quran", refKey: "2:186", display: "QS Al-Baqarah 2:186",
    canonical: "واذا سالك عبادي عني فاني قريب اجيب دعوة الداع اذا دعان فليستجيبوا لي وليؤمنوا بي لعلهم يرشدون",
    topic: "Allah is near and answers the one who calls",
    categories: ["Dzikir"],
  },
  {
    kind: "quran", refKey: "13:28", display: "QS Ar-Ra'd 13:28",
    canonical: "الذين امنوا وتطمئن قلوبهم بذكر الله الا بذكر الله تطمئن القلوب",
    topic: "hearts find rest in the remembrance of Allah",
    categories: ["Dzikir"],
  },
  {
    kind: "quran", refKey: "33:41", display: "QS Al-Ahzab 33:41",
    canonical: "يا ايها الذين امنوا اذكروا الله ذكرا كثيرا",
    topic: "remember Allah with abundant remembrance",
    categories: ["Dzikir"],
  },
  {
    kind: "bukhari", refKey: "6406", display: "HR. Bukhari no. 6406",
    canonical: "كلمتان حبيبتان الى الرحمن خفيفتان على اللسان ثقيلتان في الميزان سبحان الله وبحمده سبحان الله العظيم",
    topic: "two phrases beloved to Ar-Rahman: SubhanAllahi wa bihamdihi, SubhanAllahil-'Azim",
    categories: ["Dzikir"],
  },
  {
    kind: "muslim", refKey: "223", display: "HR. Muslim no. 223",
    canonical: "الطهور شطر الايمان والحمد لله تملا الميزان وسبحان الله والحمد لله تملان ما بين السماوات والارض",
    topic: "purification is half of faith; SubhanAllah and Alhamdulillah fill the scales",
    categories: ["Dzikir"],
  },
  {
    kind: "muslim", refKey: "2675", display: "HR. Muslim no. 2675",
    canonical: "من قال لا اله الا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير في يوم مئة مرة كانت له عدل عشر رقاب وكتبت له مئة حسنة ومحيت عنه مئة سيئة وكانت له حرزا من الشيطان يومه ذلك حتى يمسي",
    topic: "100x La ilaha illallah: reward of freeing ten slaves and protection from Shaytan",
    categories: ["Dzikir"],
  },

  // ── Sholat Fardhu ─────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "2:238", display: "QS Al-Baqarah 2:238",
    canonical: "حافظوا على الصلوات والصلاة الوسطى وقوموا لله قانتين",
    topic: "guard the obligatory prayers and the middle prayer",
    categories: ["Sholat Fardhu"],
  },
  {
    kind: "quran", refKey: "4:103", display: "QS An-Nisa' 4:103",
    canonical: "ان الصلاة كانت على المؤمنين كتابا موقوتا",
    topic: "prayer is prescribed upon the believers at fixed times",
    categories: ["Sholat Fardhu"],
  },
  {
    kind: "quran", refKey: "17:78", display: "QS Al-Isra' 17:78",
    canonical: "اقم الصلاة لدلوك الشمس الى غسق الليل وقران الفجر ان قران الفجر كان مشهودا",
    topic: "establish prayer from the decline of the sun to darkness of the night",
    categories: ["Sholat Fardhu"],
  },
  {
    kind: "quran", refKey: "20:14", display: "QS Ta-Ha 20:14",
    canonical: "انني انا الله لا اله الا انا فاعبدني واقم الصلاة لذكري",
    topic: "establish prayer for My remembrance",
    categories: ["Sholat Fardhu"],
  },
  {
    kind: "quran", refKey: "29:45", display: "QS Al-'Ankabut 29:45",
    canonical: "اتل ما اوحي اليك من الكتاب واقم الصلاة ان الصلاة تنهى عن الفحشاء والمنكر ولذكر الله اكبر والله يعلم ما تصنعون",
    topic: "prayer restrains from immorality and wrongdoing",
    categories: ["Sholat Fardhu", "Dzikir"],
  },
  {
    kind: "bukhari", refKey: "8", display: "HR. Bukhari no. 8",
    canonical: "بني الاسلام على خمس شهادة ان لا اله الا الله وان محمدا رسول الله واقام الصلاة وايتاء الزكاة والحج وصوم رمضان",
    topic: "Islam is built on five pillars including prayer and fasting",
    categories: ["Sholat Fardhu", "Puasa"],
  },

  // ── Sholat Sunnah ─────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "17:79", display: "QS Al-Isra' 17:79",
    canonical: "ومن الليل فتهجد به نافلة لك عسى ان يبعثك ربك مقاما محمودا",
    topic: "arise at night for Tahajjud — a praised station awaits",
    categories: ["Sholat Sunnah"],
  },
  {
    kind: "quran", refKey: "73:2", display: "QS Al-Muzammil 73:2",
    canonical: "قم الليل الا قليلا نصفه او انقص منه قليلا او زد عليه ورتل القران ترتيلا",
    topic: "stand in prayer most of the night and recite Quran distinctly",
    categories: ["Sholat Sunnah", "Baca Quran"],
  },
  {
    kind: "bukhari", refKey: "1145", display: "HR. Bukhari no. 1145",
    canonical: "ينزل ربنا تبارك وتعالى كل ليلة الى السماء الدنيا حين يبقى ثلث الليل الاخر يقول من يدعوني فاستجيب له من يسالني فاعطيه من يستغفرني فاغفر له",
    topic: "Allah descends to the lowest heaven in the last third of the night",
    categories: ["Sholat Sunnah", "Dzikir"],
  },
  {
    kind: "muslim", refKey: "758", display: "HR. Muslim no. 758",
    canonical: "افضل الصلاة بعد الفريضة صلاة الليل",
    topic: "the best prayer after the obligatory is the night prayer",
    categories: ["Sholat Sunnah"],
  },

  // ── Puasa ─────────────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "2:183", display: "QS Al-Baqarah 2:183",
    canonical: "يا ايها الذين امنوا كتب عليكم الصيام كما كتب على الذين من قبلكم لعلكم تتقون",
    topic: "fasting prescribed for the believers to attain taqwa",
    categories: ["Puasa"],
  },
  {
    kind: "quran", refKey: "2:185", display: "QS Al-Baqarah 2:185",
    canonical: "شهر رمضان الذي انزل فيه القران هدى للناس وبينات من الهدى والفرقان فمن شهد منكم الشهر فليصمه",
    topic: "Ramadan: the month the Quran was revealed; fast it",
    categories: ["Puasa"],
  },
  {
    kind: "bukhari", refKey: "1894", display: "HR. Bukhari no. 1894",
    canonical: "اذا جاء رمضان فتحت ابواب الجنة وغلقت ابواب جهنم وصفدت الشياطين",
    topic: "when Ramadan comes, the gates of Paradise are opened",
    categories: ["Puasa"],
  },
  {
    kind: "bukhari", refKey: "1904", display: "HR. Bukhari no. 1904",
    canonical: "من صام رمضان ايمانا واحتسابا غفر له ما تقدم من ذنبه",
    topic: "whoever fasts Ramadan with faith and hope, their past sins are forgiven",
    categories: ["Puasa"],
  },
  {
    kind: "muslim", refKey: "1151", display: "HR. Muslim no. 1151",
    canonical: "الصيام جنة فلا يرفث ولا يجهل وان امرؤ قاتله او شاتمه فليقل اني صائم اني صائم",
    topic: "fasting is a shield; let the fasting person say 'I am fasting'",
    categories: ["Puasa"],
  },

  // ── Baca Quran ────────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "2:2", display: "QS Al-Baqarah 2:2",
    canonical: "ذلك الكتاب لا ريب فيه هدى للمتقين",
    topic: "this is the Book, no doubt; guidance for the God-fearing",
    categories: ["Baca Quran"],
  },
  {
    kind: "quran", refKey: "17:9", display: "QS Al-Isra' 17:9",
    canonical: "ان هذا القران يهدي للتي هي اقوم ويبشر المؤمنين الذين يعملون الصالحات ان لهم اجرا كبيرا",
    topic: "this Quran guides to what is most right",
    categories: ["Baca Quran"],
  },
  {
    kind: "quran", refKey: "96:1", display: "QS Al-'Alaq 96:1",
    canonical: "اقرا باسم ربك الذي خلق",
    topic: "the first revelation: read in the name of your Lord who created",
    categories: ["Baca Quran", "Tolabul Ilmi"],
  },
  {
    kind: "bukhari", refKey: "5027", display: "HR. Bukhari no. 5027",
    canonical: "خيركم من تعلم القران وعلمه",
    topic: "the best of you is he who learns the Quran and teaches it",
    categories: ["Baca Quran", "Tolabul Ilmi"],
  },
  {
    kind: "muslim", refKey: "804", display: "HR. Muslim no. 804",
    canonical: "اقرؤوا القران فانه ياتي يوم القيامة شفيعا لاصحابه",
    topic: "recite the Quran; it will intercede for its companions on the Day of Judgement",
    categories: ["Baca Quran"],
  },

  // ── Shodaqoh ──────────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "2:261", display: "QS Al-Baqarah 2:261",
    canonical: "مثل الذين ينفقون اموالهم في سبيل الله كمثل حبة انبتت سبع سنابل في كل سنبلة مئة حبة والله يضاعف لمن يشاء والله واسع عليم",
    topic: "charity in Allah's path: like a grain that grows seven ears of a hundred grains each",
    categories: ["Shodaqoh"],
  },
  {
    kind: "quran", refKey: "63:10", display: "QS Al-Munafiqun 63:10",
    canonical: "وانفقوا مما رزقناكم من قبل ان ياتي احدكم الموت فيقول رب لولا اخرتني الى اجل قريب فاصدق واكن من الصالحين",
    topic: "spend from what We have provided you before death comes",
    categories: ["Shodaqoh"],
  },
  {
    kind: "bukhari", refKey: "1", display: "HR. Bukhari no. 1",
    canonical: "انما الاعمال بالنيات وانما لكل امرئ ما نوى فمن كانت هجرته الى الله ورسوله فهجرته الى الله ورسوله ومن كانت هجرته لدنيا يصيبها او امراة ينكحها فهجرته الى ما هاجر اليه",
    topic: "actions are judged by intentions",
    categories: ["Sholat Fardhu", "Puasa", "Shodaqoh", "Dzikir"],
  },
  {
    kind: "muslim", refKey: "1010", display: "HR. Muslim no. 1010",
    canonical: "ما نقصت صدقة من مال وما زاد الله عبدا بعفو الا عزا وما تواضع احد لله الا رفعه الله",
    topic: "charity does not decrease wealth; forgiveness raises honor",
    categories: ["Shodaqoh"],
  },

  // ── Birrul Walidayn ───────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "17:23", display: "QS Al-Isra' 17:23",
    canonical: "وقضى ربك الا تعبدوا الا اياه وبالوالدين احسانا اما يبلغن عندك الكبر احدهما او كلاهما فلا تقل لهما اف ولا تنهرهما وقل لهما قولا كريما",
    topic: "be dutiful to parents; never say 'uff' to them",
    categories: ["Birrul Walidayn"],
  },
  {
    kind: "quran", refKey: "17:24", display: "QS Al-Isra' 17:24",
    canonical: "واخفض لهما جناح الذل من الرحمة وقل رب ارحمهما كما ربياني صغيرا",
    topic: "lower the wing of humility for parents and supplicate for their mercy",
    categories: ["Birrul Walidayn"],
  },
  {
    kind: "quran", refKey: "31:14", display: "QS Luqman 31:14",
    canonical: "ووصينا الانسان بوالديه حملته امه وهنا على وهن وفصاله في عامين ان اشكر لي ولوالديك الي المصير",
    topic: "be grateful to Me and to your parents",
    categories: ["Birrul Walidayn"],
  },
  {
    kind: "bukhari", refKey: "5971", display: "HR. Bukhari no. 5971",
    canonical: "اي العمل احب الى الله قال الصلاة على وقتها قلت ثم اي قال بر الوالدين قلت ثم اي قال الجهاد في سبيل الله",
    topic: "the most beloved deeds to Allah: prayer on time, then dutifulness to parents",
    categories: ["Birrul Walidayn", "Sholat Fardhu"],
  },
  {
    kind: "muslim", refKey: "2548", display: "HR. Muslim no. 2548",
    canonical: "جاء رجل الى رسول الله فقال من احق الناس بحسن صحابتي قال امك قال ثم من قال امك قال ثم من قال امك قال ثم من قال ابوك",
    topic: "mother has the most right to your good companionship (three times), then father",
    categories: ["Birrul Walidayn"],
  },

  // ── Tolabul Ilmi ──────────────────────────────────────────────────────────
  {
    kind: "quran", refKey: "39:9", display: "QS Az-Zumar 39:9",
    canonical: "قل هل يستوي الذين يعلمون والذين لا يعلمون انما يتذكر اولو الالباب",
    topic: "are those who know equal to those who do not know?",
    categories: ["Tolabul Ilmi"],
  },
  {
    kind: "quran", refKey: "58:11", display: "QS Al-Mujadila 58:11",
    canonical: "يرفع الله الذين امنوا منكم والذين اوتوا العلم درجات والله بما تعملون خبير",
    topic: "Allah raises those who believe and those given knowledge by degrees",
    categories: ["Tolabul Ilmi"],
  },
  {
    kind: "bukhari", refKey: "71", display: "HR. Bukhari no. 71",
    canonical: "من يرد الله به خيرا يفقهه في الدين",
    topic: "whomever Allah intends good for, He gives understanding of the religion",
    categories: ["Tolabul Ilmi"],
  },
  {
    kind: "muslim", refKey: "2699", display: "HR. Muslim no. 2699",
    canonical: "من سلك طريقا يلتمس فيه علما سهل الله له به طريقا الى الجنة",
    topic: "whoever travels a path seeking knowledge, Allah eases his path to Paradise",
    categories: ["Tolabul Ilmi"],
  },
];

const ENTRY_INDEX: Map<string, CorpusEntry> = new Map(
  CORPUS_ENTRIES.map((e) => [`${e.kind}:${e.refKey}`, e]),
);

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSurahAyah(reference: string): { surah: number; ayah: number; ayahEnd: number } | null {
  const m = reference.match(/(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/);
  if (!m) return null;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  const ayahEnd = m[3] ? Number(m[3]) : ayah;
  if (!Number.isFinite(surah) || !Number.isFinite(ayah) || !Number.isFinite(ayahEnd)) return null;
  return { surah, ayah, ayahEnd };
}

function parseHadithNumber(reference: string): number | null {
  const all = reference.match(/\d{1,5}/g);
  if (!all || all.length === 0) return null;
  const n = Number(all[all.length - 1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isQuranReferenceInRange(reference: string): boolean {
  const p = parseSurahAyah(reference);
  if (!p) return false;
  if (p.surah < 1 || p.surah > 114) return false;
  const max = QURAN_SURAH_AYAH_COUNTS[p.surah];
  if (!max) return false;
  if (p.ayah < 1 || p.ayah > max) return false;
  if (p.ayahEnd < p.ayah || p.ayahEnd > max) return false;
  return true;
}

export function isBukhariNumberInRange(reference: string): boolean {
  const n = parseHadithNumber(reference);
  return n !== null && n >= 1 && n <= BUKHARI_MAX_HADITH;
}

export function isMuslimNumberInRange(reference: string): boolean {
  const n = parseHadithNumber(reference);
  return n !== null && n >= 1 && n <= MUSLIM_MAX_HADITH;
}

export function isReferenceInRange(
  kind: "quran" | "bukhari" | "muslim",
  reference: string,
): boolean {
  if (kind === "quran") return isQuranReferenceInRange(reference);
  if (kind === "bukhari") return isBukhariNumberInRange(reference);
  if (kind === "muslim") return isMuslimNumberInRange(reference);
  return false;
}

export function lookupCorpusEntry(
  kind: "quran" | "bukhari" | "muslim",
  reference: string,
): CorpusEntry | null {
  let key: string | null;
  if (kind === "quran") {
    const p = parseSurahAyah(reference);
    if (!p) return null;
    // Range references like "2:152-153" only match the corpus when the
    // entire range is the same single ayah. Multi-ayah ranges are rejected
    // because the curated entry only contains the starting ayah's text.
    if (p.ayahEnd !== p.ayah) return null;
    key = `${p.surah}:${p.ayah}`;
  } else {
    const n = parseHadithNumber(reference);
    key = n !== null ? String(n) : null;
  }
  if (!key) return null;
  return ENTRY_INDEX.get(`${kind}:${key}`) ?? null;
}

// Strict Arabic check: the model's normalized Arabic must be a contiguous
// substring of the entry's normalized canonical text. This accepts the full
// verse/hadith or a quoted portion, but rejects any text that contains
// material not present in the canonical source.
// Minimum normalized length for an accepted Arabic submission. Without this,
// trivially short snippets like "الله" — which are substrings of nearly any
// canonical text — would pass. 20 normalized characters is roughly a short
// clause; long enough to be meaningful, short enough to allow a quoted
// portion of even brief verses/hadith.
export const MIN_ARABIC_NORMALIZED_LENGTH = 20;

export function arabicMatchesEntry(entry: CorpusEntry, arabic: string): boolean {
  const c = normalizeArabic(entry.canonical);
  const m = normalizeArabic(arabic);
  if (m.length < MIN_ARABIC_NORMALIZED_LENGTH) return false;
  return c.includes(m);
}

// Renders the compact allowed-citation list for the system prompt.
// Only reference + topic is shown (no Arabic) to keep prompt size bounded.
// The model must pick from this list; Arabic is provided separately for
// categories matching the user's onboarding profile.
export function renderCorpusForPrompt(): string {
  return CORPUS_ENTRIES
    .map((e) => `- ${e.display} [${e.topic}]`)
    .join("\n");
}

// Renders the canonical Arabic for corpus entries whose categories overlap
// with the provided set. Called with the user's onboarding categories so the
// model has the exact Arabic to copy verbatim — only for the citations it is
// most likely to use. Entries shared across multiple categories are included
// if any of the user's categories matches.
export function renderCorpusArabicForCategories(categories: string[]): string {
  if (categories.length === 0) {
    // No onboarding data — include Arabic for all entries so the model is
    // not left without any Arabic text to copy.
    return CORPUS_ENTRIES
      .map((e) => `- ${e.display}\n  Arabic: ${e.canonical}`)
      .join("\n");
  }
  const catSet = new Set(categories);
  const filtered = CORPUS_ENTRIES.filter((e) =>
    e.categories.some((c) => catSet.has(c)),
  );
  if (filtered.length === 0) {
    // Fall back to full list if the category mapping produced nothing.
    return CORPUS_ENTRIES
      .map((e) => `- ${e.display}\n  Arabic: ${e.canonical}`)
      .join("\n");
  }
  return filtered
    .map((e) => `- ${e.display}\n  Arabic: ${e.canonical}`)
    .join("\n");
}
