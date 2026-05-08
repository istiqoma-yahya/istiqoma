import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, Bookmark, BookOpen, Play, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QuranMiniPlayer } from "@/components/QuranMiniPlayer";
import { useChapters, useReadingState, useBookmarks, useMemorizations } from "@/hooks/use-quran";
import { useQuranAudio } from "@/components/QuranAudioProvider";

export default function QuranHomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: chapters, isLoading } = useChapters();
  const { data: readingState } = useReadingState();
  const { data: bookmarks } = useBookmarks();
  const { data: memorizations } = useMemorizations();
  const { playSurah } = useQuranAudio();

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

        <div className="grid grid-cols-3 gap-3">
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
                <Card
                  key={c.id}
                  className="p-3 flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => navigate(`/quran/${c.id}`)}
                  data-testid={`card-surah-${c.id}`}
                >
                  <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                    {c.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" data-testid={`text-surah-name-${c.id}`}>
                      {c.name_simple}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.translated_name.name} · {c.verses_count} {t("quranMenu.verses")}
                    </div>
                  </div>
                  <div className="text-2xl font-arabic shrink-0">{c.name_arabic}</div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSurah({
                        surahNumber: c.id,
                        surahName: c.name_simple,
                        surahArabic: c.name_arabic,
                        versesCount: c.verses_count,
                      });
                    }}
                    data-testid={`button-play-surah-${c.id}`}
                    aria-label={`Play ${c.name_simple}`}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
        </div>
      </main>

      <QuranMiniPlayer />
      <BottomNavigation />
    </div>
  );
}
