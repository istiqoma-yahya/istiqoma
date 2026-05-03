import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bookmark, BookmarkCheck, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { QuranMiniPlayer } from "@/components/QuranMiniPlayer";
import { QuranFontPicker } from "@/components/QuranFontPicker";
import { useToast } from "@/hooks/use-toast";
import {
  useChapter,
  useVerses,
  useBookmarks,
  useAddBookmark,
  useRemoveBookmark,
  useUpdateReadingState,
} from "@/hooks/use-quran";
import { useQuranAudio } from "@/components/QuranAudioProvider";

export default function QuranSurahPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/quran/:id");
  const surahId = params?.id ? parseInt(params.id, 10) : null;

  const initialVerse = useMemo(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("verse");
    return v ? parseInt(v, 10) : null;
  }, []);

  const { data: chapter, isLoading: chapterLoading } = useChapter(surahId);
  const { data: verses, isLoading: versesLoading } = useVerses(surahId);
  const { data: bookmarks } = useBookmarks();
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const updateReadingState = useUpdateReadingState();
  const { toast } = useToast();
  const { playSurah, current } = useQuranAudio();

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [topVerse, setTopVerse] = useState<number | null>(null);

  // Save reading state on initial load (with deep-linked verse if any).
  useEffect(() => {
    if (surahId) {
      updateReadingState.mutate({
        lastSurahNumber: surahId,
        lastVerseNumber: initialVerse ?? 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahId]);

  // Track which verse is currently centered in the viewport so we can
  // resume there next session. We use IntersectionObserver to find verses
  // in view and pick the topmost one. The actual save is debounced to
  // avoid hammering the API while the user is scrolling.
  useEffect(() => {
    if (!verses) return;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const num = parseInt((e.target as HTMLElement).dataset.verseNum || "0", 10);
          if (e.isIntersecting) visible.add(num);
          else visible.delete(num);
        }
        if (visible.size > 0) {
          const topmost = Math.min(...Array.from(visible));
          setTopVerse(topmost);
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: 0 },
    );
    Array.from(verseRefs.current.values()).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [verses]);

  // Debounced save of last-read verse. Only writes if the topmost verse
  // changed and 600ms passed without further scrolling — keeps the API
  // calm during fast scroll.
  const lastSavedVerseRef = useRef<number | null>(null);
  useEffect(() => {
    if (!surahId || topVerse == null) return;
    const t = setTimeout(() => {
      if (lastSavedVerseRef.current === topVerse) return;
      lastSavedVerseRef.current = topVerse;
      updateReadingState.mutate({
        lastSurahNumber: surahId,
        lastVerseNumber: topVerse,
      });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topVerse, surahId]);

  // Scroll the deep-linked verse into view once verses render.
  useEffect(() => {
    if (!initialVerse || !verses) return;
    const el = verseRefs.current.get(initialVerse);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
  }, [initialVerse, verses]);

  const bookmarkSet = useMemo(() => {
    if (!bookmarks || !surahId) return new Set<number>();
    return new Set(bookmarks.filter((b) => b.surahNumber === surahId).map((b) => b.verseNumber));
  }, [bookmarks, surahId]);

  const handleToggleBookmark = (verseNumber: number) => {
    if (!surahId) return;
    if (bookmarkSet.has(verseNumber)) {
      removeBookmark.mutate(
        { surahNumber: surahId, verseNumber },
        { onSuccess: () => toast({ description: t("quranMenu.bookmarkRemoved") }) },
      );
    } else {
      addBookmark.mutate(
        { surahNumber: surahId, verseNumber },
        { onSuccess: () => toast({ description: t("quranMenu.bookmarkAdded") }) },
      );
    }
  };

  const handlePlay = () => {
    if (!chapter) return;
    playSurah({
      surahNumber: chapter.id,
      surahName: chapter.name_simple,
      surahArabic: chapter.name_arabic,
    });
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
          <div className="flex-1 min-w-0">
            {chapterLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : chapter ? (
              <>
                <div className="font-semibold truncate" data-testid="text-surah-title">
                  {chapter.id}. {chapter.name_simple}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {chapter.translated_name.name} · {chapter.verses_count}{" "}
                  {t("quranMenu.verses")}
                </div>
              </>
            ) : null}
          </div>
          <QuranFontPicker />
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlay}
            disabled={!chapter || current?.surahNumber === chapter?.id}
            data-testid="button-play-surah"
            aria-label="Play surah"
          >
            <Play className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6">
        {chapter && chapter.id !== 1 && chapter.id !== 9 && (
          <div className="text-center mb-6 py-4 border-b border-border">
            <div className="text-2xl font-arabic mb-2">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
            <div className="text-sm text-muted-foreground">{t("quranMenu.bismillah")}</div>
          </div>
        )}

        <div className="space-y-6">
          {versesLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            : verses?.map((v) => {
                const isBookmarked = bookmarkSet.has(v.verse_number);
                return (
                  <div
                    key={v.id}
                    ref={(el) => {
                      if (el) verseRefs.current.set(v.verse_number, el);
                      else verseRefs.current.delete(v.verse_number);
                    }}
                    data-verse-num={v.verse_number}
                    data-testid={`verse-${v.verse_number}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        {v.verse_number}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handlePlay}
                          data-testid={`button-play-from-${v.verse_number}`}
                          aria-label="Play from this verse"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleBookmark(v.verse_number)}
                          data-testid={`button-bookmark-${v.verse_number}`}
                          aria-label="Bookmark"
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Bookmark className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p
                      className="font-arabic text-2xl leading-relaxed text-right mb-3"
                      dir="rtl"
                      data-testid={`text-arabic-${v.verse_number}`}
                    >
                      {v.text_uthmani}
                    </p>
                    {v.translations?.[0] && (
                      <p
                        className="text-sm text-muted-foreground leading-relaxed"
                        data-testid={`text-translation-${v.verse_number}`}
                        dangerouslySetInnerHTML={{ __html: v.translations[0].text }}
                      />
                    )}
                  </div>
                );
              })}
        </div>
      </main>

      <QuranMiniPlayer />
      <BottomNavigation />
    </div>
  );
}
