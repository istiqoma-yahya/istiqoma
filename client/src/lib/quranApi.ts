// Thin wrapper around the Quran Foundation Content API.
//
// We route all Qur'an content reads through our own server proxy at
// `/api/qf/content/*`, which forwards the call to the QF Content API
// (`https://apis.quran.foundation/content/api/v4/...`) using a cached
// OAuth2 client_credentials token + the required `x-auth-token` /
// `x-client-id` headers. The QF Content API is the official,
// hackathon-required content source; the path shape is identical to
// the legacy `api.quran.com/api/v4`, so the rest of the client code
// (verse keys, reciter ids, etc.) is unchanged.
//
// If QF credentials are not configured on the server, the proxy
// transparently falls back to `api.quran.com/api/v4` so dev still
// works.
//
// Docs: https://api-docs.quran.foundation
const BASE = "/api/qf/content";

export type Chapter = {
  id: number;
  revelation_place: string;
  name_simple: string;
  name_arabic: string;
  translated_name: { name: string; language_name: string };
  verses_count: number;
};

export type Verse = {
  id: number;
  verse_key: string; // "1:1"
  verse_number: number;
  text_uthmani: string;
  translations?: Array<{ id: number; resource_id: number; text: string }>;
};

export type Reciter = {
  id: number;
  reciter_name: string;
  style?: string | null;
  translated_name?: { name: string; language_name: string };
};

export type VerseTiming = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
};

export type ChapterAudio = {
  id: number;
  chapter_id: number;
  audio_url: string;
  verse_timings?: VerseTiming[];
};

// Translation IDs on quran.com that we expose to the user. We only pick
// curated, well-known translations per app locale instead of letting the
// user choose from the full list — keeps the UI focused. The Indonesian
// one (33 = Indonesian Islamic Affairs Ministry) is the standard
// gov-issued mushaf translation used in Indonesia/Malaysia.
export const TRANSLATION_BY_LOCALE: Record<string, number> = {
  en: 20,  // Saheeh International (English)
  id: 134, // King Fahad Quran Complex (Indonesian)
  ms: 39,  // Abdullah Muhammad Basmeih (Malay)
};

export function translationIdForLocale(locale: string): number {
  const base = locale.split("-")[0];
  return TRANSLATION_BY_LOCALE[base] ?? TRANSLATION_BY_LOCALE.en;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Quran Foundation API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Map our app locale (en/id/ms) to a quran.com `language` query param.
// quran.com accepts ISO codes for en/id/ms directly. Anything else
// falls back to English so the API call never fails on an unknown
// locale.
export function chapterLangForLocale(locale: string): string {
  const base = (locale || "en").split("-")[0];
  if (base === "id" || base === "ms" || base === "en") return base;
  return "en";
}

export async function fetchChapters(locale = "en"): Promise<Chapter[]> {
  const lang = chapterLangForLocale(locale);
  const data = await fetchJson<{ chapters: Chapter[] }>(`/chapters?language=${lang}`);
  return data.chapters;
}

export async function fetchChapter(id: number, locale = "en"): Promise<Chapter> {
  const lang = chapterLangForLocale(locale);
  const data = await fetchJson<{ chapter: Chapter }>(`/chapters/${id}?language=${lang}`);
  return data.chapter;
}

export async function fetchVerses(
  chapterId: number,
  translationId: number,
): Promise<Verse[]> {
  // per_page=300 is above the largest surah (286 verses) so we always get
  // the full chapter in a single request and don't need pagination logic.
  const data = await fetchJson<{ verses: Verse[] }>(
    `/verses/by_chapter/${chapterId}?words=false&translations=${translationId}&fields=text_uthmani&per_page=300`,
  );
  return data.verses;
}

export async function fetchReciters(): Promise<Reciter[]> {
  const data = await fetchJson<{ recitations: Reciter[] }>("/resources/recitations?language=en");
  return data.recitations;
}

type ChapterAudioResponse = {
  id: number;
  chapter_id: number;
  audio_url: string;
  timestamps?: VerseTiming[];
};

export async function fetchChapterAudio(
  reciterId: number,
  chapterId: number,
): Promise<ChapterAudio | null> {
  const data = await fetchJson<{ audio_file: ChapterAudioResponse }>(
    `/chapter_recitations/${reciterId}/${chapterId}?segments=true`,
  );
  const af = data.audio_file;
  if (!af) return null;
  return {
    id: af.id,
    chapter_id: af.chapter_id,
    audio_url: af.audio_url,
    verse_timings: af.timestamps,
  };
}

export type VerseAudioFile = {
  verse_key: string; // "1:1"
  url: string;       // relative path, needs prefix
};

const VERSE_AUDIO_CDN = "https://audio.qurancdn.com/";

type VerseAudioPage = {
  audio_files: VerseAudioFile[];
  meta?: {
    pagination?: {
      per_page: number;
      current_page: number;
      next_page: number | null;
      total_pages: number;
      total_count: number;
    };
  };
};

export async function fetchVerseAudioUrl(
  reciterId: number,
  chapterId: number,
  verseNumber: number,
): Promise<string> {
  const targetKey = `${chapterId}:${verseNumber}`;

  // Request per_page=300 to cover the largest surah in one shot (286 verses).
  // If the API enforces a lower server-side limit it will return a next_page,
  // so we keep paginating until we find the target verse or run out of pages.
  let page = 1;
  while (true) {
    const data = await fetchJson<VerseAudioPage>(
      `/recitations/${reciterId}/by_chapter/${chapterId}?per_page=300&page=${page}`,
    );

    const file = data.audio_files.find((f) => f.verse_key === targetKey);
    if (file) {
      const url = file.url.startsWith("http") ? file.url : `${VERSE_AUDIO_CDN}${file.url}`;
      return url;
    }

    const nextPage = data.meta?.pagination?.next_page;
    if (!nextPage || data.audio_files.length === 0) {
      throw new Error(`No audio found for ${chapterId}:${verseNumber}`);
    }
    page = nextPage;
  }
}

// Curated set of widely-known reciters surfaced first in the picker.
// The full list from the API is also shown below this set, but having
// recognizable names at the top means most users never have to scroll.
export const FEATURED_RECITER_IDS = [7, 1, 4, 2, 3];
export const DEFAULT_RECITER_ID = 7; // Mishary Rashid Alafasy
