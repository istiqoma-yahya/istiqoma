import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, Bookmark, BookOpen, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QuranMiniPlayer } from "@/components/QuranMiniPlayer";
import { SurahListCard } from "@/components/shared/SurahListCard";
import { useChapters, useReadingState, useBookmarks, useMemorizations } from "@/hooks/use-quran";
import { useQuranAudio } from "@/components/QuranAudioProvider";

// Persist the chapter list scroll position across in-app navigations
// (e.g. user opens a surah, then taps back). Module-level so it survives
// the page component unmounting. Reset on full page reload, which is what
// we want — only in-app back navigation should restore scroll.
let savedScrollY: number | null = null;

export default function QuranHomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: chapters, isLoading } = useChapters();
  const { data: readingState } = useReadingState();
  const { data: bookmarks } = useBookmarks();
  const { data: memorizations } = useMemorizations();
  const { playSurah } = useQuranAudio();
  const didRestoreScrollRef = useRef(false);
  const searchInvalidatedRef = useRef(false);
  const searchRef = useRef(search);
  searchRef.current = search;

  // Save current scroll position on unmount so we can restore it when the
  // user returns to this page. Skip saving if the user is in a search
  // state — the filtered list doesn't correspond to the unfiltered
  // chapter list, so restoring that scrollY later would jump to the
  // wrong place.
  useEffect(() => {
    return () => {
      if (searchRef.current.trim().length > 0 || searchInvalidatedRef.current) {
        savedScrollY = null;
      } else {
        savedScrollY = window.scrollY;
      }
    };
  }, []);

  // Restore the saved scroll position once the chapter list has rendered,
  // then clear it so a later unrelated visit to /quran (e.g. from the
  // bottom nav) doesn't jump to a stale offset. We wait for `chapters`
  // so the document is tall enough for the scroll target to actually
  // exist.
  useEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (!chapters) return;
    if (savedScrollY == null) {
      didRestoreScrollRef.current = true;
      return;
    }
    const y = savedScrollY;
    savedScrollY = null;
    didRestoreScrollRef.current = true;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
  }, [chapters]);

  // If the user starts searching, the saved scroll position no longer
  // points at the same content, so discard it and remember that the
  // context was invalidated (so unmount won't re-save a stale value).
  useEffect(() => {
    if (search.trim().length > 0) {
      savedScrollY = null;
      didRestoreScrollRef.current = true;
      searchInvalidatedRef.current = true;
    }
  }, [search]);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    const q = search.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (c) =>
        c.name_simple.toLowerCase().includes(q) ||
        c.translated_name.name.toLowerCase().includes(q) ||
        String(c.id) === q,
    );
  }, [chapters, search]);

  const lastReadChapter = chapters?.find((c) => c.id === readingState?.lastSurahNumber);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              {t("quranMenu.title")}
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-4 space-y-4">
        {lastReadChapter && (
          <Card
            className="p-4 cursor-pointer hover-elevate active-elevate-2"
            onClick={() =>
              navigate(
                `/quran/${lastReadChapter.id}${
                  readingState?.lastVerseNumber ? `?verse=${readingState.lastVerseNumber}` : ""
                }`,
              )
            }
            data-testid="card-continue-reading"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              {t("quranMenu.continueReading")}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{lastReadChapter.name_simple}</div>
                <div className="text-sm text-muted-foreground">
                  {t("quranMenu.verseShort")} {readingState?.lastVerseNumber ?? 1}
                </div>
              </div>
              <BookOpen className="w-6 h-6 text-emerald-500" />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-1"
            onClick={() => navigate("/quran/bookmarks")}
            data-testid="button-bookmarks"
          >
            <Bookmark className="w-5 h-5 text-emerald-500" />
            <span className="text-sm">{t("quranMenu.bookmarks")}</span>
            <span className="text-xs text-muted-foreground">{bookmarks?.length ?? 0}</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-1"
            onClick={() => navigate("/quran/memorization")}
            data-testid="button-memorization-progress"
          >
            <GraduationCap className="w-5 h-5 text-emerald-500" />
            <span className="text-sm">{t("quranMenu.memorize")}</span>
            <span className="text-xs text-muted-foreground">{memorizations?.length ?? 0}</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("quranMenu.searchSurah")}
            className="pl-9"
            data-testid="input-search-surah"
          />
        </div>

        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            : filtered.map((c) => (
                <SurahListCard
                  key={c.id}
                  id={c.id}
                  nameSimple={c.name_simple}
                  nameArabic={c.name_arabic}
                  translatedName={c.translated_name.name}
                  versesCount={c.verses_count}
                  versesLabel={t("quranMenu.verses")}
                  onClick={() => navigate(`/quran/${c.id}`)}
                  onPlay={() =>
                    playSurah({
                      surahNumber: c.id,
                      surahName: c.name_simple,
                      surahArabic: c.name_arabic,
                      versesCount: c.verses_count,
                    })
                  }
                />
              ))}
        </div>
      </main>

      <QuranMiniPlayer />
      <BottomNavigation />
    </div>
  );
}
