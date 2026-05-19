import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Play,
  Brain,
  Check,
  Eye,
  EyeOff,
  Mic,
  Pause,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BottomNavigation } from "@/components/BottomNavigation";
import { QuranMiniPlayer } from "@/components/QuranMiniPlayer";
import { VoiceRecordingMiniPlayer } from "@/components/VoiceRecordingMiniPlayer";
import { QuranFontPicker } from "@/components/QuranFontPicker";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecorder } from "../../replit_integrations/audio/useVoiceRecorder";
import {
  useChapter,
  useVerses,
  useBookmarks,
  useAddBookmark,
  useRemoveBookmark,
  useUpdateReadingState,
  useMemorizations,
  useAddMemorization,
  useRemoveMemorization,
} from "@/hooks/use-quran";
import { useQuranAudio } from "@/components/QuranAudioProvider";

type DisplayMode = "full" | "firstLast" | "hidden";

const DEFAULT_MEM_DISPLAY: DisplayMode = "firstLast";

// Renders the Arabic verse with the middle words replaced by uniform
// blocks so the user still sees the verse shape (rough word count) while
// not getting the full text. We split on whitespace which is good enough
// for Uthmani text — the API gives us spaces between words.
function FirstLastWordView({ text }: { text: string }) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return <span>{text}</span>;
  }
  const first = words[0];
  const last = words[words.length - 1];
  const middleCount = words.length - 2;
  return (
    <span>
      <span>{first}</span>{" "}
      <span aria-hidden="true" className="inline-flex flex-wrap gap-1 align-middle mx-1">
        {Array.from({ length: middleCount }).map((_, i) => (
          <span
            key={i}
            className="inline-block w-8 h-3 rounded bg-muted-foreground/30 align-middle"
          />
        ))}
      </span>{" "}
      <span>{last}</span>
    </span>
  );
}

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

  const backDestination = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("from") === "memorization" ? "/quran/memorization" : "/quran";
  }, []);

  const initialMemMode = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("mode") === "memorize";
  }, []);

  const { data: chapter, isLoading: chapterLoading } = useChapter(surahId);
  const { data: verses, isLoading: versesLoading } = useVerses(surahId);
  const { data: bookmarks } = useBookmarks();
  const { data: memorizations } = useMemorizations(surahId ?? undefined);
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const addMemorization = useAddMemorization();
  const removeMemorization = useRemoveMemorization();
  const updateReadingState = useUpdateReadingState();
  const { toast } = useToast();
  const { playSurah, playAyah, current, currentAyah, isPlaying, isLoading } = useQuranAudio();

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [topVerse, setTopVerse] = useState<number | null>(null);

  const autoScrollPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedAtAyahRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const latestAyahRef = useRef(currentAyah);
  latestAyahRef.current = currentAyah;

  // ─── Memorization mode state ─────────────────────────────────
  const [memMode, setMemMode] = useState(initialMemMode);
  // Per-verse display mode. Falls back to DEFAULT_MEM_DISPLAY when absent.
  const [verseDisplay, setVerseDisplay] = useState<Map<number, DisplayMode>>(new Map());
  // Verses the user has temporarily peeked. Cleared when display mode changes.
  const [peeking, setPeeking] = useState<Set<number>>(new Set());
  // In-memory recordings map (verse number -> object URL + blob).
  // Recordings are session-only: we revoke + clear them on unmount or
  // route change so nothing persists. Nothing is uploaded.
  const recordingsRef = useRef<Map<number, { url: string; blob: Blob }>>(new Map());
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [activeRecordVerse, setActiveRecordVerse] = useState<number | null>(null);
  const recorder = useVoiceRecorder();

  // Shared audio element for playing back recorded verses. Only one
  // recording plays at a time, so we keep a single hidden <audio> driven
  // by the floating mini-player below.
  const recordAudioRef = useRef<HTMLAudioElement | null>(null);
  if (!recordAudioRef.current && typeof window !== "undefined") {
    recordAudioRef.current = new Audio();
    recordAudioRef.current.preload = "auto";
  }
  const [playingRecordVerse, setPlayingRecordVerse] = useState<number | null>(null);
  const [recordIsPlaying, setRecordIsPlaying] = useState(false);
  const [recordPosition, setRecordPosition] = useState(0);
  const [recordDuration, setRecordDuration] = useState(0);

  // Reset scroll position on mount when there's no deep-linked verse, so
  // entering a surah from the chapter list always starts at verse 1
  // instead of inheriting the previous window scroll position. We run
  // this synchronously during the first render (before paint) so the
  // user never sees a flash of mid-list content.
  const didInitialScrollResetRef = useRef(false);
  if (!didInitialScrollResetRef.current && typeof window !== "undefined") {
    didInitialScrollResetRef.current = true;
    if (!initialVerse) {
      window.scrollTo(0, 0);
    }
  }

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

  useEffect(() => {
    if (!initialVerse || !verses) return;
    const el = verseRefs.current.get(initialVerse);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
  }, [initialVerse, verses]);

  useEffect(() => {
    const RESUME_DELAY = 3000;
    const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End"]);

    const pauseAutoScroll = () => {
      if (!(isPlaying || isLoading) || current?.surahNumber !== surahId) return;
      autoScrollPausedRef.current = true;
      pausedAtAyahRef.current = latestAyahRef.current;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        autoScrollPausedRef.current = false;
        pausedAtAyahRef.current = null;
      }, RESUME_DELAY);
    };

    const onScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      pauseAutoScroll();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) pauseAutoScroll();
    };

    window.addEventListener("wheel", pauseAutoScroll, { passive: true });
    window.addEventListener("touchmove", pauseAutoScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });

    return () => {
      window.removeEventListener("wheel", pauseAutoScroll);
      window.removeEventListener("touchmove", pauseAutoScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      autoScrollPausedRef.current = false;
      pausedAtAyahRef.current = null;
    };
  }, [isPlaying, isLoading, current?.surahNumber, surahId]);

  useEffect(() => {
    if (
      currentAyah == null ||
      !(isPlaying || isLoading) ||
      current?.surahNumber !== surahId
    )
      return;
    if (autoScrollPausedRef.current) {
      if (pausedAtAyahRef.current !== null && currentAyah !== pausedAtAyahRef.current) {
        autoScrollPausedRef.current = false;
        pausedAtAyahRef.current = null;
        if (resumeTimerRef.current) {
          clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
      } else {
        return;
      }
    }
    const el = verseRefs.current.get(currentAyah);
    if (el) {
      isProgrammaticScrollRef.current = true;
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const headerHeight = 56;
        const usableHeight = window.innerHeight - headerHeight;
        const targetY = headerHeight + usableHeight * 0.2;
        const scrollTop = window.scrollY + rect.top - targetY;
        window.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 1000);
      });
    }
  }, [currentAyah, isPlaying, isLoading, current?.surahNumber, surahId]);

  // Reset memorization-mode session state when navigating to another surah
  // and revoke any in-memory object URLs so recordings don't leak.
  useEffect(() => {
    return () => {
      recordingsRef.current.forEach((rec) => URL.revokeObjectURL(rec.url));
      recordingsRef.current.clear();
    };
  }, [surahId]);

  // Final cleanup on unmount (e.g. user navigates away from the Quran page
  // entirely). Same goal: nothing recorded outlives the session, and the
  // shared playback element must release its source.
  useEffect(() => {
    return () => {
      recordingsRef.current.forEach((rec) => URL.revokeObjectURL(rec.url));
      recordingsRef.current.clear();
      const a = recordAudioRef.current;
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
    };
  }, []);

  // Wire the shared recording-playback <audio> element to our React state
  // so the floating mini-player can show progress and respond to controls.
  useEffect(() => {
    const a = recordAudioRef.current;
    if (!a) return;
    const onPlay = () => setRecordIsPlaying(true);
    const onPause = () => setRecordIsPlaying(false);
    const onTime = () => setRecordPosition(a.currentTime || 0);
    const onLoaded = () => setRecordDuration(a.duration || 0);
    const onEnded = () => {
      setRecordIsPlaying(false);
      setRecordPosition(0);
      // Auto-hide the floating player when playback finishes naturally,
      // matching the "visible while replaying" intent.
      setPlayingRecordVerse(null);
      a.removeAttribute("src");
      a.load();
      setRecordDuration(0);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

  // When the user navigates between surahs, stop any in-flight playback
  // and hide the floating player — the recordings for the previous surah
  // are already revoked above.
  useEffect(() => {
    const a = recordAudioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setPlayingRecordVerse(null);
    setRecordIsPlaying(false);
    setRecordPosition(0);
    setRecordDuration(0);
  }, [surahId]);

  const bookmarkSet = useMemo(() => {
    if (!bookmarks || !surahId) return new Set<number>();
    return new Set(bookmarks.filter((b) => b.surahNumber === surahId).map((b) => b.verseNumber));
  }, [bookmarks, surahId]);

  const memorizedSet = useMemo(() => {
    if (!memorizations || !surahId) return new Set<number>();
    return new Set(
      memorizations.filter((m) => m.surahNumber === surahId).map((m) => m.verseNumber),
    );
  }, [memorizations, surahId]);

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

  const handleToggleMemorized = (verseNumber: number) => {
    if (!surahId) return;
    const onError = () => {
      toast({
        title: t("quranMenu.memorizationSaveFailed"),
        variant: "destructive",
      });
    };
    if (memorizedSet.has(verseNumber)) {
      removeMemorization.mutate(
        { surahNumber: surahId, verseNumber },
        { onError },
      );
    } else {
      addMemorization.mutate(
        { surahNumber: surahId, verseNumber },
        { onError },
      );
    }
  };

  const handlePlay = () => {
    if (!chapter) return;
    playSurah({
      surahNumber: chapter.id,
      surahName: chapter.name_simple,
      surahArabic: chapter.name_arabic,
      versesCount: chapter.verses_count,
    });
  };

  const handlePlayAyah = (verseNumber: number) => {
    if (!chapter) return;
    playAyah(
      {
        surahNumber: chapter.id,
        surahName: chapter.name_simple,
        surahArabic: chapter.name_arabic,
        versesCount: chapter.verses_count,
      },
      verseNumber,
    );
  };

  const getDisplayMode = (verseNumber: number): DisplayMode => {
    if (!memMode) return "full";
    return verseDisplay.get(verseNumber) ?? DEFAULT_MEM_DISPLAY;
  };

  const setSingleDisplay = (verseNumber: number, mode: DisplayMode) => {
    setVerseDisplay((prev) => {
      const next = new Map(prev);
      next.set(verseNumber, mode);
      return next;
    });
    // Changing the display mode should clear any active peek for that
    // verse so we don't leak the revealed text into a newly chosen mode.
    setPeeking((prev) => {
      if (!prev.has(verseNumber)) return prev;
      const next = new Set(prev);
      next.delete(verseNumber);
      return next;
    });
  };

  const applyToAll = (mode: DisplayMode) => {
    if (!verses) return;
    const next = new Map<number, DisplayMode>();
    for (const v of verses) next.set(v.verse_number, mode);
    setVerseDisplay(next);
    setPeeking(new Set());
  };

  const peekVerse = (verseNumber: number) => {
    setPeeking((prev) => {
      const next = new Set(prev);
      if (next.has(verseNumber)) next.delete(verseNumber);
      else next.add(verseNumber);
      return next;
    });
  };

  // ─── Recording handlers ──────────────────────────────────────
  const startRecord = async (verseNumber: number) => {
    try {
      // If something is already recording, stop it first so we replace
      // rather than overlap.
      if (activeRecordVerse !== null) {
        await stopRecord();
      }
      await recorder.startRecording();
      setActiveRecordVerse(verseNumber);
    } catch (err) {
      console.error("voice recorder failed", err);
      toast({
        description: t("quranMenu.micPermissionDenied"),
        variant: "destructive",
      });
    }
  };

  const stopRecord = async () => {
    const verseNumber = activeRecordVerse;
    if (verseNumber === null) return;
    try {
      const blob = await recorder.stopRecording();
      if (blob.size === 0) {
        setActiveRecordVerse(null);
        return;
      }
      // Replace any existing recording for this verse: revoke its URL so
      // the browser releases the blob, then store the new one.
      const prev = recordingsRef.current.get(verseNumber);
      if (prev) URL.revokeObjectURL(prev.url);
      const url = URL.createObjectURL(blob);
      recordingsRef.current.set(verseNumber, { url, blob });
      setRecordingsVersion((n) => n + 1);
    } catch (err) {
      console.error("voice recorder stop failed", err);
    } finally {
      setActiveRecordVerse(null);
    }
  };

  const closeRecordPlayer = () => {
    const a = recordAudioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setPlayingRecordVerse(null);
    setRecordIsPlaying(false);
    setRecordPosition(0);
    setRecordDuration(0);
  };

  const deleteRecord = (verseNumber: number) => {
    const rec = recordingsRef.current.get(verseNumber);
    if (rec) {
      URL.revokeObjectURL(rec.url);
      recordingsRef.current.delete(verseNumber);
      setRecordingsVersion((n) => n + 1);
    }
    if (playingRecordVerse === verseNumber) {
      closeRecordPlayer();
    }
  };

  const playRecord = (verseNumber: number) => {
    const a = recordAudioRef.current;
    if (!a) return;
    const rec = recordingsRef.current.get(verseNumber);
    if (!rec) return;

    // Toggle: if this verse's recording is already loaded into the shared
    // player, just pause/resume instead of restarting from zero.
    if (playingRecordVerse === verseNumber) {
      if (a.paused) {
        void a.play();
      } else {
        a.pause();
      }
      return;
    }

    // Swap source to this verse's recording.
    a.pause();
    a.src = rec.url;
    a.currentTime = 0;
    setRecordPosition(0);
    setRecordDuration(0);
    setPlayingRecordVerse(verseNumber);
    void a.play().catch(() => {
      setRecordIsPlaying(false);
    });
  };

  const seekRecord = (seconds: number) => {
    const a = recordAudioRef.current;
    if (!a) return;
    a.currentTime = seconds;
    setRecordPosition(seconds);
  };

  const toggleRecordPlayback = () => {
    const a = recordAudioRef.current;
    if (!a || playingRecordVerse === null) return;
    if (a.paused) {
      void a.play();
    } else {
      a.pause();
    }
  };

  const playingRecordLabel = useMemo(() => {
    if (playingRecordVerse === null || !chapter) return "";
    return `${chapter.name_simple} · ${t("quranMenu.verseShort")} ${playingRecordVerse}`;
  }, [playingRecordVerse, chapter, t]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-5xl mx-auto px-2 h-14 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(backDestination)}
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
          <Button
            size="icon"
            variant={memMode ? "default" : "ghost"}
            onClick={() => setMemMode((m) => !m)}
            data-testid="button-toggle-memorization"
            aria-label={memMode ? t("quranMenu.exitMemorization") : t("quranMenu.memorizationMode")}
            aria-pressed={memMode}
            title={t("quranMenu.memorizationMode")}
          >
            <Brain className="w-5 h-5" />
          </Button>
          <QuranFontPicker />
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlay}
            disabled={!chapter}
            data-testid="button-play-surah"
            aria-label="Play surah"
          >
            <Play className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6">
        {memMode && (
          <div
            className="mb-6 rounded-lg border border-border bg-card p-3"
            data-testid="panel-memorization-controls"
          >
            <span className="block text-sm font-medium mb-2">{t("quranMenu.applyToAll")}:</span>
            <div className="-mx-3 px-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                onValueChange={(v) => v && applyToAll(v as DisplayMode)}
                className="inline-flex w-max flex-nowrap justify-start gap-2"
              >
                <ToggleGroupItem
                  value="full"
                  aria-label={t("quranMenu.displayFull")}
                  data-testid="button-apply-all-full"
                  className="shrink-0 whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {t("quranMenu.displayFull")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="firstLast"
                  aria-label={t("quranMenu.displayFirstLast")}
                  data-testid="button-apply-all-first-last"
                  className="shrink-0 whitespace-nowrap"
                >
                  {t("quranMenu.displayFirstLast")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="hidden"
                  aria-label={t("quranMenu.displayHidden")}
                  data-testid="button-apply-all-hidden"
                  className="shrink-0 whitespace-nowrap"
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  {t("quranMenu.displayHidden")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}

        {chapter && chapter.id !== 1 && chapter.id !== 9 && (
          <div className="text-center mb-6 py-4 border-b border-border">
            <div className="font-arabic text-arabic mb-2">
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
                const isMemorized = memorizedSet.has(v.verse_number);
                const mode = getDisplayMode(v.verse_number);
                const isPeeking = peeking.has(v.verse_number);
                const recording = recordingsRef.current.get(v.verse_number);
                // recordingsVersion is referenced so React re-renders when
                // the in-memory map changes. ref reads bypass the dep system.
                void recordingsVersion;
                const showFull = mode === "full" || isPeeking;
                const isActiveAyah =
                  (isPlaying || isLoading) &&
                  current?.surahNumber === surahId &&
                  currentAyah === v.verse_number;
                return (
                  <div
                    key={v.id}
                    ref={(el) => {
                      if (el) verseRefs.current.set(v.verse_number, el);
                      else verseRefs.current.delete(v.verse_number);
                    }}
                    data-verse-num={v.verse_number}
                    data-testid={`verse-${v.verse_number}`}
                    data-playing={isActiveAyah ? "true" : "false"}
                    className={
                      isActiveAyah
                        ? "rounded-lg ring-2 ring-emerald-500/40 bg-emerald-500/5 p-3 transition-all duration-300"
                        : "p-3 transition-all duration-300"
                    }
                  >
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                          aria-label={`${t("quranMenu.verseShort")} ${v.verse_number}`}
                        >
                          {v.verse_number}
                        </div>
                        {isMemorized && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            data-testid={`badge-memorized-${v.verse_number}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {t("quranMenu.memorized")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        <Button
                          size="icon"
                          variant={isMemorized ? "default" : "ghost"}
                          onClick={() => handleToggleMemorized(v.verse_number)}
                          data-testid={`button-memorize-${v.verse_number}`}
                          aria-label={
                            isMemorized
                              ? t("quranMenu.unmarkMemorized")
                              : t("quranMenu.markMemorized")
                          }
                          aria-pressed={isMemorized}
                          title={
                            isMemorized
                              ? t("quranMenu.unmarkMemorized")
                              : t("quranMenu.markMemorized")
                          }
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePlayAyah(v.verse_number)}
                          data-testid={`button-play-ayah-${v.verse_number}`}
                          aria-label={`Play ayah ${v.verse_number}`}
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

                    {memMode && (
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="sm"
                          value={mode}
                          onValueChange={(val) =>
                            val && setSingleDisplay(v.verse_number, val as DisplayMode)
                          }
                        >
                          <ToggleGroupItem
                            value="full"
                            aria-label={t("quranMenu.displayFull")}
                            data-testid={`button-mode-full-${v.verse_number}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="firstLast"
                            aria-label={t("quranMenu.displayFirstLast")}
                            data-testid={`button-mode-firstlast-${v.verse_number}`}
                          >
                            <span className="text-xs">A…Z</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="hidden"
                            aria-label={t("quranMenu.displayHidden")}
                            data-testid={`button-mode-hidden-${v.verse_number}`}
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </ToggleGroupItem>
                        </ToggleGroup>

                        {/* Recording controls */}
                        {activeRecordVerse === v.verse_number ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={stopRecord}
                            data-testid={`button-stop-record-${v.verse_number}`}
                            aria-label={t("quranMenu.stopRecording")}
                          >
                            <Square className="w-3.5 h-3.5 mr-1" />
                            {t("quranMenu.stopRecording")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startRecord(v.verse_number)}
                            disabled={activeRecordVerse !== null}
                            data-testid={`button-record-${v.verse_number}`}
                            aria-label={t("quranMenu.record")}
                          >
                            <Mic className="w-3.5 h-3.5 mr-1" />
                            {t("quranMenu.record")}
                          </Button>
                        )}

                        {recording && (() => {
                          const isThisPlaying =
                            playingRecordVerse === v.verse_number && recordIsPlaying;
                          return (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => playRecord(v.verse_number)}
                                data-testid={`button-play-record-${v.verse_number}`}
                                aria-label={
                                  isThisPlaying
                                    ? t("quranMenu.voicePlayerPause")
                                    : t("quranMenu.playRecording")
                                }
                                aria-pressed={isThisPlaying}
                              >
                                {isThisPlaying ? (
                                  <Pause className="w-3.5 h-3.5 mr-1" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 mr-1" />
                                )}
                                {t("quranMenu.playRecording")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteRecord(v.verse_number)}
                                data-testid={`button-delete-record-${v.verse_number}`}
                                aria-label={t("quranMenu.deleteRecording")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Verse text */}
                    {showFull ? (
                      <p
                        className="font-arabic text-arabic text-right mb-3"
                        dir="rtl"
                        data-testid={`text-arabic-${v.verse_number}`}
                      >
                        {v.text_uthmani}
                      </p>
                    ) : mode === "firstLast" ? (
                      <p
                        className="font-arabic text-arabic text-right mb-3"
                        dir="rtl"
                        data-testid={`text-arabic-firstlast-${v.verse_number}`}
                      >
                        <FirstLastWordView text={v.text_uthmani} />
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => peekVerse(v.verse_number)}
                        className="w-full mb-3 py-6 rounded-md border border-dashed border-border bg-muted/40 hover:bg-muted/60 text-sm text-muted-foreground flex items-center justify-center gap-2"
                        data-testid={`button-reveal-${v.verse_number}`}
                        aria-label={`${t("quranMenu.tapToReveal")} ${v.verse_number}`}
                      >
                        <Eye className="w-4 h-4" />
                        {t("quranMenu.tapToReveal")}
                      </button>
                    )}

                    {/* In hidden/firstLast mode, allow re-hide if peeking */}
                    {memMode && isPeeking && mode !== "full" && (
                      <div className="mb-3 -mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => peekVerse(v.verse_number)}
                          data-testid={`button-rehide-${v.verse_number}`}
                          aria-label="Hide verse"
                        >
                          <EyeOff className="w-3.5 h-3.5 mr-1" />
                          {t("quranMenu.displayHidden")}
                        </Button>
                      </div>
                    )}

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
      {playingRecordVerse !== null && (
        <VoiceRecordingMiniPlayer
          label={playingRecordLabel}
          position={recordPosition}
          duration={recordDuration}
          isPlaying={recordIsPlaying}
          onToggle={toggleRecordPlayback}
          onSeek={seekRecord}
          onClose={closeRecordPlayer}
          stacked={current != null}
        />
      )}
      <BottomNavigation />
    </div>
  );
}
