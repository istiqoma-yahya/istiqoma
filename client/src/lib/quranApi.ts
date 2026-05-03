// Thin wrapper around the public quran.com API. We hit it directly from
// the browser (no server-side proxy): the API is CORS-enabled, fully
// public, and benefits from the user's HTTP cache. Keeping it client-side
// also means our backend never has to be in the read path for verses or
// audio, which would otherwise be a lot of bandwidth for content that
// doesn't change.
//
// API docs: https://api.quran.com/api/v4
const BASE = "https://api.quran.com/api/v4";

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

export type ChapterAudio = {
  id: number;
  chapter_id: number;
  audio_url: string;
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
    throw new Error(`quran.com API ${res.status}: ${res.statusText}`);
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

export async function fetchChapterAudio(
  reciterId: number,
  chapterId: number,
): Promise<ChapterAudio | null> {
  const data = await fetchJson<{ audio_file: ChapterAudio }>(
    `/chapter_recitations/${reciterId}/${chapterId}`,
  );
  return data.audio_file ?? null;
}

// Curated set of widely-known reciters surfaced first in the picker.
// The full list from the API is also shown below this set, but having
// recognizable names at the top means most users never have to scroll.
export const FEATURED_RECITER_IDS = [7, 1, 4, 2, 3];
export const DEFAULT_RECITER_ID = 7; // Mishary Rashid Alafasy
