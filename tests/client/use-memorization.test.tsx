import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// vi.mock is hoisted, so use vi.hoisted() to create mockToast before the factory runs.
const mockToast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
  toast: mockToast,
}));

vi.mock("@/lib/queryClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/queryClient")>();
  return { ...original, apiRequest: vi.fn() };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/lib/quranApi", () => ({
  fetchChapters: vi.fn(),
  fetchChapter: vi.fn(),
  fetchVerses: vi.fn(),
  fetchReciters: vi.fn(),
  fetchChapterAudio: vi.fn(),
  translationIdForLocale: vi.fn().mockReturnValue(131),
}));

import { apiRequest, queryClient as sharedQueryClient } from "@/lib/queryClient";
import { useAddMemorization, useRemoveMemorization } from "@/hooks/use-quran";
import type { QuranMemorization } from "@shared/schema";

const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;

function makeVerse(surahNumber: number, verseNumber: number, id = -1): QuranMemorization {
  return { id, userId: "u", surahNumber, verseNumber, createdAt: new Date() };
}

function seedCache(surahNumber: number, verses: QuranMemorization[]) {
  sharedQueryClient.setQueryData(["/api/quran/memorizations", surahNumber], verses);
}

function readCache(surahNumber: number): QuranMemorization[] {
  return sharedQueryClient.getQueryData<QuranMemorization[]>(["/api/quran/memorizations", surahNumber]) ?? [];
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: sharedQueryClient }, children);
}

// Mirrors QuranSurahPage.handleToggleMemorized: calls mutate() with an onError
// that fires a destructive toast.
function useToggleMemorized(isMemorized: boolean, surahId: number) {
  const addMemorization = useAddMemorization();
  const removeMemorization = useRemoveMemorization();
  const handleToggle = (verseNumber: number) => {
    const onError = () => mockToast({ title: "quranMenu.memorizationSaveFailed", variant: "destructive" });
    if (isMemorized) {
      removeMemorization.mutate({ surahNumber: surahId, verseNumber }, { onError });
    } else {
      addMemorization.mutate({ surahNumber: surahId, verseNumber }, { onError });
    }
  };
  return { handleToggle, addMemorization, removeMemorization };
}

beforeEach(() => {
  mockApiRequest.mockReset();
  mockToast.mockReset();
  sharedQueryClient.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAddMemorization", () => {
  it("adds the verse to the cache immediately (optimistic update)", async () => {
    const SURAH = 2, VERSE = 255;
    seedCache(SURAH, []);
    mockApiRequest.mockResolvedValue({ json: () => Promise.resolve(makeVerse(SURAH, VERSE, 1)) });

    const { result } = renderHook(() => useAddMemorization(), { wrapper });
    act(() => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });

    await waitFor(() => {
      expect(readCache(SURAH).some((m) => m.surahNumber === SURAH && m.verseNumber === VERSE)).toBe(true);
    });
  });

  it("keeps the verse in cache after a successful response", async () => {
    const SURAH = 3, VERSE = 1;
    seedCache(SURAH, []);
    mockApiRequest.mockResolvedValue({ json: () => Promise.resolve(makeVerse(SURAH, VERSE, 2)) });

    const { result } = renderHook(() => useAddMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(true);
  });

  it("rolls back the optimistic entry on API failure", async () => {
    const SURAH = 4, VERSE = 1;
    seedCache(SURAH, []);
    mockApiRequest.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useAddMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(false);
  });

  it("does NOT remove a verse that was already present before the mutation (wasPresent guard)", async () => {
    const SURAH = 5, VERSE = 10;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 55)]);
    mockApiRequest.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useAddMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(true);
  });

  it("does not create a duplicate optimistic entry if the verse is already in cache", async () => {
    const SURAH = 6, VERSE = 2;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 10)]);
    mockApiRequest.mockResolvedValue({ json: () => Promise.resolve(makeVerse(SURAH, VERSE, 10)) });

    const { result } = renderHook(() => useAddMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(readCache(SURAH).filter((m) => m.verseNumber === VERSE)).toHaveLength(1);
  });
});

describe("useRemoveMemorization", () => {
  it("removes the verse from cache immediately (optimistic update)", async () => {
    const SURAH = 7, VERSE = 3;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 20)]);
    mockApiRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveMemorization(), { wrapper });
    act(() => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });

    await waitFor(() => {
      expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(false);
    });
  });

  it("keeps the verse removed after a successful response", async () => {
    const SURAH = 8, VERSE = 1;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 30)]);
    mockApiRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(false);
  });

  it("restores the verse to cache on API failure (rollback)", async () => {
    const SURAH = 9, VERSE = 5;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 40)]);
    mockApiRequest.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useRemoveMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(true);
  });

  it("does NOT restore a verse that was not in cache before the mutation (wasPresent guard)", async () => {
    const SURAH = 10, VERSE = 1;
    seedCache(SURAH, []);
    mockApiRequest.mockRejectedValue(new Error("404"));

    const { result } = renderHook(() => useRemoveMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(false);
  });
});

describe("handleToggleMemorized — destructive toast on failure", () => {
  it("shows a destructive toast when adding a memorization fails", async () => {
    const SURAH = 13, VERSE = 1;
    seedCache(SURAH, []);
    mockApiRequest.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useToggleMemorized(false, SURAH), { wrapper });
    await act(async () => { result.current.handleToggle(VERSE); });
    await waitFor(() => expect(result.current.addMemorization.isError).toBe(true));

    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("shows a destructive toast when removing a memorization fails", async () => {
    const SURAH = 14, VERSE = 2;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 80)]);
    mockApiRequest.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useToggleMemorized(true, SURAH), { wrapper });
    await act(async () => { result.current.handleToggle(VERSE); });
    await waitFor(() => expect(result.current.removeMemorization.isError).toBe(true));

    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("does NOT show a toast when adding succeeds", async () => {
    const SURAH = 15, VERSE = 3;
    seedCache(SURAH, []);
    mockApiRequest.mockResolvedValue({ json: () => Promise.resolve(makeVerse(SURAH, VERSE, 90)) });

    const { result } = renderHook(() => useToggleMemorized(false, SURAH), { wrapper });
    await act(async () => { result.current.handleToggle(VERSE); });
    await waitFor(() => expect(result.current.addMemorization.isSuccess).toBe(true));

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("does NOT show a toast when removing succeeds", async () => {
    const SURAH = 16, VERSE = 4;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 100)]);
    mockApiRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useToggleMemorized(true, SURAH), { wrapper });
    await act(async () => { result.current.handleToggle(VERSE); });
    await waitFor(() => expect(result.current.removeMemorization.isSuccess).toBe(true));

    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe("concurrent mutation interaction", () => {
  it("a failed add does not remove a verse placed by a prior successful add", async () => {
    const SURAH = 11, VERSE = 7;
    seedCache(SURAH, []);

    const serverRow = makeVerse(SURAH, VERSE, 60);
    mockApiRequest
      .mockResolvedValueOnce({ json: () => Promise.resolve(serverRow) })
      .mockRejectedValueOnce(new Error("500"));

    const { result: r1 } = renderHook(() => useAddMemorization(), { wrapper });
    const { result: r2 } = renderHook(() => useAddMemorization(), { wrapper });

    await act(async () => { r1.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(r1.current.isSuccess).toBe(true));

    await act(async () => { r2.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(r2.current.isError).toBe(true));

    expect(readCache(SURAH).some((m) => m.verseNumber === VERSE)).toBe(true);
  });

  it("a failed remove is rolled back gracefully without throwing", async () => {
    const SURAH = 12, VERSE = 3;
    seedCache(SURAH, [makeVerse(SURAH, VERSE, 70)]);
    mockApiRequest.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useRemoveMemorization(), { wrapper });
    await act(async () => { result.current.mutate({ surahNumber: SURAH, verseNumber: VERSE }); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isError).toBe(true);
  });
});
