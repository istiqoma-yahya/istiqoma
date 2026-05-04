import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  fetchChapters,
  fetchChapter,
  fetchVerses,
  fetchReciters,
  fetchChapterAudio,
  translationIdForLocale,
  type Chapter,
  type Verse,
  type Reciter,
  type ChapterAudio,
} from "@/lib/quranApi";
import type { QuranArabicFont, QuranArabicFontSize, QuranArabicLineHeight, QuranBookmark, QuranMemorization, QuranReadingState } from "@shared/schema";

const STALE_24_HR = 24 * 60 * 60 * 1000;

// Static reference data: chapters list never changes and reciters change
// rarely, so we cache them aggressively and avoid re-fetching across page
// transitions. We key by locale so the translated_name follows the user's
// language without losing the cache when they switch.
export function useChapters() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "en";
  return useQuery<Chapter[]>({
    queryKey: ["quran", "chapters", lang],
    queryFn: () => fetchChapters(lang),
    staleTime: STALE_24_HR,
  });
}

export function useChapter(id: number | null) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] || "en";
  return useQuery<Chapter>({
    queryKey: ["quran", "chapters", id, lang],
    queryFn: () => fetchChapter(id as number, lang),
    enabled: id != null,
    staleTime: STALE_24_HR,
  });
}

export function useVerses(chapterId: number | null) {
  const { i18n } = useTranslation();
  const translationId = translationIdForLocale(i18n.language);
  return useQuery<Verse[]>({
    queryKey: ["quran", "verses", chapterId, translationId],
    queryFn: () => fetchVerses(chapterId as number, translationId),
    enabled: chapterId != null,
    staleTime: STALE_24_HR,
  });
}

export function useReciters() {
  return useQuery<Reciter[]>({
    queryKey: ["quran", "reciters"],
    queryFn: fetchReciters,
    staleTime: STALE_24_HR,
  });
}

export function useChapterAudio(reciterId: number | null, chapterId: number | null) {
  return useQuery<ChapterAudio | null>({
    queryKey: ["quran", "audio", reciterId, chapterId],
    queryFn: () => fetchChapterAudio(reciterId as number, chapterId as number),
    enabled: reciterId != null && chapterId != null,
    staleTime: Infinity,
    gcTime: STALE_24_HR,
  });
}

// ─── Personal data (bookmarks + reading state) ────────────────────
export function useBookmarks() {
  return useQuery<QuranBookmark[]>({
    queryKey: ["/api/quran/bookmarks"],
  });
}

export function useAddBookmark() {
  return useMutation({
    mutationFn: async (input: { surahNumber: number; verseNumber: number }) => {
      const res = await apiRequest("POST", "/api/quran/bookmarks", input);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quran/bookmarks"] });
    },
  });
}

export function useRemoveBookmark() {
  return useMutation({
    mutationFn: async ({ surahNumber, verseNumber }: { surahNumber: number; verseNumber: number }) => {
      await apiRequest("DELETE", `/api/quran/bookmarks/${surahNumber}/${verseNumber}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quran/bookmarks"] });
    },
  });
}

export function useReadingState() {
  return useQuery<QuranReadingState | null>({
    queryKey: ["/api/quran/reading-state"],
  });
}

export function useMemorizations(surahNumber?: number) {
  return useQuery<QuranMemorization[]>({
    queryKey:
      surahNumber !== undefined
        ? ["/api/quran/memorizations", surahNumber]
        : ["/api/quran/memorizations"],
    // Custom fetcher because the default one joins keys with "/", which
    // would turn the surah filter into a path segment. The endpoint takes
    // ?surah=N as a query parameter instead.
    queryFn: async () => {
      const url =
        surahNumber !== undefined
          ? `/api/quran/memorizations?surah=${surahNumber}`
          : "/api/quran/memorizations";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });
}

export function useAddMemorization() {
  return useMutation({
    mutationFn: async (input: { surahNumber: number; verseNumber: number }) => {
      const res = await apiRequest("POST", "/api/quran/memorizations", input);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quran/memorizations"] });
    },
  });
}

export function useRemoveMemorization() {
  return useMutation({
    mutationFn: async ({ surahNumber, verseNumber }: { surahNumber: number; verseNumber: number }) => {
      await apiRequest("DELETE", `/api/quran/memorizations/${surahNumber}/${verseNumber}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quran/memorizations"] });
    },
  });
}

export function useUpdateReadingState() {
  return useMutation({
    mutationFn: async (input: {
      lastSurahNumber?: number | null;
      lastVerseNumber?: number | null;
      preferredReciterId?: number | null;
      arabicFont?: QuranArabicFont;
      arabicFontSize?: QuranArabicFontSize;
      arabicLineHeight?: QuranArabicLineHeight;
      autoAdvanceAyah?: boolean;
      continuousPlay?: boolean;
    }) => {
      const res = await apiRequest("PUT", "/api/quran/reading-state", input);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quran/reading-state"] });
    },
  });
}
