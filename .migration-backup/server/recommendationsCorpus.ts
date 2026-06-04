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
// is shown both the citation and its canonical Arabic in the system prompt
// so it can copy the text verbatim.

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
}

export const CORPUS_ENTRIES: CorpusEntry[] = [
  {
    kind: "quran", refKey: "2:152", display: "QS Al-Baqarah 2:152",
    canonical: "فاذكروني اذكركم واشكروا لي ولا تكفرون",
    topic: "remember Me, I will remember you",
  },
  {
    kind: "quran", refKey: "2:183", display: "QS Al-Baqarah 2:183",
    canonical: "يا ايها الذين امنوا كتب عليكم الصيام كما كتب على الذين من قبلكم لعلكم تتقون",
    topic: "fasting prescribed for the believers",
  },
  {
    kind: "quran", refKey: "2:238", display: "QS Al-Baqarah 2:238",
    canonical: "حافظوا على الصلوات والصلاة الوسطى وقوموا لله قانتين",
    topic: "guarding the obligatory prayers",
  },
  {
    kind: "quran", refKey: "13:28", display: "QS Ar-Ra'd 13:28",
    canonical: "الذين امنوا وتطمئن قلوبهم بذكر الله الا بذكر الله تطمئن القلوب",
    topic: "hearts find rest in the remembrance of Allah",
  },
  {
    kind: "quran", refKey: "17:23", display: "QS Al-Isra' 17:23",
    canonical: "وقضى ربك الا تعبدوا الا اياه وبالوالدين احسانا اما يبلغن عندك الكبر احدهما او كلاهما فلا تقل لهما اف ولا تنهرهما وقل لهما قولا كريما",
    topic: "kindness to parents",
  },
  {
    kind: "quran", refKey: "20:14", display: "QS Ta-Ha 20:14",
    canonical: "انني انا الله لا اله الا انا فاعبدني واقم الصلاة لذكري",
    topic: "establish prayer for My remembrance",
  },
  {
    kind: "quran", refKey: "29:45", display: "QS Al-'Ankabut 29:45",
    canonical: "اتل ما اوحي اليك من الكتاب واقم الصلاة ان الصلاة تنهى عن الفحشاء والمنكر ولذكر الله اكبر والله يعلم ما تصنعون",
    topic: "prayer restrains from indecency and evil",
  },
  {
    kind: "quran", refKey: "33:41", display: "QS Al-Ahzab 33:41",
    canonical: "يا ايها الذين امنوا اذكروا الله ذكرا كثيرا",
    topic: "remember Allah with abundant remembrance",
  },
  {
    kind: "quran", refKey: "96:1", display: "QS Al-'Alaq 96:1",
    canonical: "اقرا باسم ربك الذي خلق",
    topic: "the first revelation: read in the name of your Lord",
  },
  {
    kind: "bukhari", refKey: "1", display: "HR. Bukhari no. 1",
    canonical: "انما الاعمال بالنيات وانما لكل امرئ ما نوى فمن كانت هجرته الى الله ورسوله فهجرته الى الله ورسوله ومن كانت هجرته لدنيا يصيبها او امراة ينكحها فهجرته الى ما هاجر اليه",
    topic: "actions are by intentions",
  },
  {
    kind: "bukhari", refKey: "6406", display: "HR. Bukhari no. 6406",
    canonical: "كلمتان حبيبتان الى الرحمن خفيفتان على اللسان ثقيلتان في الميزان سبحان الله وبحمده سبحان الله العظيم",
    topic: "two phrases beloved to Ar-Rahman: SubhanAllahi wa bihamdihi, SubhanAllahil-'Azim",
  },
  {
    kind: "muslim", refKey: "223", display: "HR. Muslim no. 223",
    canonical: "الطهور شطر الايمان والحمد لله تملا الميزان وسبحان الله والحمد لله تملان ما بين السماوات والارض",
    topic: "purification is half of faith",
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

// Renders the corpus for inclusion in the system prompt. Includes the
// canonical Arabic so the model can copy it verbatim — the server-side
// matcher requires the submitted Arabic to be contained in this text.
export function renderCorpusForPrompt(): string {
  return CORPUS_ENTRIES
    .map((e) => `- ${e.display} (${e.topic})\n  Arabic: ${e.canonical}`)
    .join("\n");
}
