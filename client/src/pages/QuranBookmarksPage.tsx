import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { QuranMiniPlayer } from "@/components/QuranMiniPlayer";
import { useToast } from "@/hooks/use-toast";
import { useBookmarks, useChapters, useRemoveBookmark } from "@/hooks/use-quran";
import { useQueries } from "@tanstack/react-query";
import { fetchVerses, translationIdForLocale, type Verse } from "@/lib/quranApi";
import { useMemo } from "react";

export default function QuranBookmarksPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { data: bookmarks, isLoading } = useBookmarks();
  const { data: chapters } = useChapters();
  const removeBookmark = useRemoveBookmark();
  const { toast } = useToast();

  const chapterById = new Map(chapters?.map((c) => [c.id, c]) ?? []);
  const translationId = translationIdForLocale(i18n.language);

  // Fetch verses for each unique surah referenced by a bookmark so we can
  // render an Arabic + translation snippet. We cache aggressively per
  // (surah, translation) so navigating in/out of this page is instant.
  const uniqueSurahs = useMemo(
    () => Array.from(new Set(bookmarks?.map((b) => b.surahNumber) ?? [])),
    [bookmarks],
  );

  const verseQueries = useQueries({
    queries: uniqueSurahs.map((surahId) => ({
      queryKey: ["quran", "verses", surahId, translationId],
      queryFn: () => fetchVerses(surahId, translationId),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });

  const verseMap = useMemo(() => {
    const m = new Map<string, Verse>();
    verseQueries.forEach((q, idx) => {
      const surahId = uniqueSurahs[idx];
      if (q.data) {
        for (const v of q.data) m.set(`${surahId}:${v.verse_number}`, v);
      }
    });
    return m;
  }, [verseQueries, uniqueSurahs]);

  const handleRemove = (surahNumber: number, verseNumber: number) => {
    removeBookmark.mutate(
      { surahNumber, verseNumber },
      { onSuccess: () => toast({ description: t("quranMenu.bookmarkRemoved") }) },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-5xl mx-auto px-2 h-14 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/quran")}
            data-testid="button-back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">
            {t("quranMenu.bookmarks")}
          </h1>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !bookmarks || bookmarks.length === 0 ? (
          <Card className="p-10 text-center">
            <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <div className="font-medium mb-1" data-testid="text-empty-title">
              {t("quranMenu.noBookmarks")}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("quranMenu.noBookmarksHint")}
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((b) => {
              const chapter = chapterById.get(b.surahNumber);
              const verse = verseMap.get(`${b.surahNumber}:${b.verseNumber}`);
              return (
                <Card
                  key={b.id}
                  className="p-3 cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => navigate(`/quran/${b.surahNumber}?verse=${b.verseNumber}`)}
                  data-testid={`card-bookmark-${b.surahNumber}-${b.verseNumber}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                      {b.surahNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">
                          {chapter?.name_simple ?? `Surah ${b.surahNumber}`}
                          <span className="text-muted-foreground font-normal">
                            {" · "}
                            {t("quranMenu.verseShort")} {b.verseNumber}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(b.surahNumber, b.verseNumber);
                          }}
                          data-testid={`button-remove-bookmark-${b.surahNumber}-${b.verseNumber}`}
                          aria-label="Remove bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {verse ? (
                        <>
                          <p
                            className="font-arabic text-arabic text-right mt-2 line-clamp-2"
                            dir="rtl"
                            data-testid={`text-bookmark-arabic-${b.surahNumber}-${b.verseNumber}`}
                          >
                            {verse.text_uthmani}
                          </p>
                          {verse.translations?.[0] && (
                            <p
                              className="text-xs text-muted-foreground mt-1 line-clamp-2"
                              data-testid={`text-bookmark-translation-${b.surahNumber}-${b.verseNumber}`}
                              dangerouslySetInnerHTML={{
                                __html: verse.translations[0].text,
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <Skeleton className="h-4 w-2/3 mt-2" />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <QuranMiniPlayer />
      <BottomNavigation />
    </div>
  );
}
