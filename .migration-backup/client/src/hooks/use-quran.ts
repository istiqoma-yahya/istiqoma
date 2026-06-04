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
      // Route through `apiRequest` so a 401 here triggers the centralized
      // session-expired recovery flow (see queryClient.ts), matching the
      // other authenticated data hooks. The default fetcher can't be used
      // because it would join the surahNumber as a path segment.
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

// Apply an optimistic mutation across every cached memorization list
// (the unfiltered list and any per-surah filtered lists). The mutator
// must be idempotent — it's applied once on optimistic patch, and the
// inverse is applied on rollback. We deliberately do per-verse
// add/remove rather than snapshot-and-restore so that overlapping
// mutations on different (or even the same) verses don't clobber each
// other: a failed earlier mutation only reverses its own effect, never
// a successful later mutation's effect.
function patchMemorizationCaches(
  surahNumber: number,
  mutator: (prev: QuranMemorization[]) => QuranMemorization[],
) {
  const entries = queryClient.getQueriesData<QuranMemorization[]>({
    queryKey: ["/api/quran/memorizations"],
  });
  for (const [key, data] of entries) {
    if (!data) continue;
    // Only touch the unfiltered cache and the cache filtered to this
    // exact surah. Otherwise we'd inject a surah-A verse into a cached
    // surah-B query until the next refetch.
    const filterSurah = Array.isArray(key) && key.length > 1 ? key[1] : undefined;
    if (filterSurah !== undefined && filterSurah !== surahNumber) continue;
    queryClient.setQueryData<QuranMemorization[]>(key, mutator(data));
  }
}

function readMemorizationCache(surahNumber: number): QuranMemorization[] {
  // Prefer the per-surah cache (it's the authoritative view for the
  // current page); fall back to the unfiltered cache if only that one
  // exists. Used to determine wasPresent for deterministic rollback.
  const entries = queryClient.getQueriesData<QuranMemorization[]>({
    queryKey: ["/api/quran/memorizations"],
  });
  let unfiltered: QuranMemorization[] | undefined;
  for (const [key, data] of entries) {
    if (!data) continue;
    const filterSurah = Array.isArray(key) && key.length > 1 ? key[1] : undefined;
    if (filterSurah === surahNumber) return data;
    if (filterSurah === undefined) unfiltered = data;
  }
  return unfiltered ?? [];
}

function addToCache(surahNumber: number, verseNumber: number) {
  patchMemorizationCaches(surahNumber, (prev) => {
    if (
      prev.some(
        (m) => m.surahNumber === surahNumber && m.verseNumber === verseNumber,
      )
    ) {
      return prev;
    }
    const optimistic: QuranMemorization = {
      id: -Date.now(),
      userId: "",
      surahNumber,
      verseNumber,
      createdAt: new Date(),
    };
    return [...prev, optimistic];
  });
}

function removeFromCache(surahNumber: number, verseNumber: number) {
  patchMemorizationCaches(surahNumber, (prev) =>
    prev.filter(
      (m) => !(m.surahNumber === surahNumber && m.verseNumber === verseNumber),
    ),
  );
}

export function useAddMemorization() {
  return useMutation({
    mutationFn: async (input: { surahNumber: number; verseNumber: number }) => {
      const res = await apiRequest("POST", "/api/quran/memorizations", input);
      return res.json();
    },
    onMutate: async ({ surahNumber, verseNumber }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/quran/memorizations"] });
      const wasPresent = readMemorizationCache(surahNumber).some(
        (m) => m.surahNumber === surahNumber && m.verseNumber === verseNumber,
      );
      addToCache(surahNumber, verseNumber);
      return { wasPresent };
    },
    onError: (_err, { surahNumber, verseNumber }, context) => {
      // Only undo what we did. If the verse was already present in cache
      // before this mutation (e.g. another in-flight add already added
      // it), don't remove it — that would clobber the other mutation.
      if (context && !context.wasPresent) {
        removeFromCache(surahNumber, verseNumber);
      }
    },
    // Reconcile with server state once any inflight mutations on this
    // key have settled. React Query coalesces invalidations so this is
    // a cheap eventual-consistency safety net; the optimistic patch
    // already matches the expected server state, so the refetch
    // typically produces no visible change.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quran/memorizations"] });
    },
  });
}

export function useRemoveMemorization() {
  return useMutation({
    mutationFn: async ({ surahNumber, verseNumber }: { surahNumber: number; verseNumber: number }) => {
      await apiRequest("DELETE", `/api/quran/memorizations/${surahNumber}/${verseNumber}`);
    },
    onMutate: async ({ surahNumber, verseNumber }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/quran/memorizations"] });
      const wasPresent = readMemorizationCache(surahNumber).some(
        (m) => m.surahNumber === surahNumber && m.verseNumber === verseNumber,
      );
      removeFromCache(surahNumber, verseNumber);
      return { wasPresent };
    },
    onError: (_err, { surahNumber, verseNumber }, context) => {
      // Only restore if we actually removed something. Avoids re-adding
      // a verse that a concurrent remove had already taken out.
      if (context && context.wasPresent) {
        addToCache(surahNumber, verseNumber);
      }
    },
    onSettled: () => {
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
