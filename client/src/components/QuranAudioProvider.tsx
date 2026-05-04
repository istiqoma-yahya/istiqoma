import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChapterAudio, useReciters, useReadingState, useUpdateReadingState } from "@/hooks/use-quran";
import { DEFAULT_RECITER_ID, fetchVerseAudioUrl, fetchChapter, type VerseTiming } from "@/lib/quranApi";
import { useAuth } from "@/hooks/use-auth";

type PlayingSurah = {
  surahNumber: number;
  surahName: string;
  surahArabic: string;
  versesCount: number;
};

export type DownloadProgress = {
  loaded: number;
  total: number;
};

type AudioContextValue = {
  current: PlayingSurah | null;
  currentAyah: number | null;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  reciterId: number;
  reciterName: string | null;
  downloadProgress: DownloadProgress | null;
  autoAdvance: boolean;
  setAutoAdvance: (v: boolean) => void;
  continuousPlay: boolean;
  setContinuousPlay: (v: boolean) => void;
  setReciterId: (id: number) => void;
  playSurah: (s: PlayingSurah) => void;
  playAyah: (s: PlayingSurah, verseNumber: number) => void;
  toggle: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  stop: () => void;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function QuranAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof window !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  const { data: readingState } = useReadingState();
  const updateReadingState = useUpdateReadingState();
  const { data: reciters } = useReciters();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [current, setCurrent] = useState<PlayingSurah | null>(null);
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [reciterId, setReciterIdState] = useState<number>(DEFAULT_RECITER_ID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [autoAdvance, setAutoAdvanceState] = useState<boolean>(() => {
    try { return localStorage.getItem("quran_auto_advance") === "true"; } catch { return false; }
  });
  const [continuousPlay, setContinuousPlayState] = useState<boolean>(() => {
    try { return localStorage.getItem("quran_continuous_play") === "true"; } catch { return false; }
  });

  const [playbackMode, setPlaybackMode] = useState<'surah' | 'ayah' | null>(null);

  const setAutoAdvance = (v: boolean) => {
    setAutoAdvanceState(v);
    try { localStorage.setItem("quran_auto_advance", String(v)); } catch {}
    updateReadingState.mutate({ autoAdvanceAyah: v });
  };

  const setContinuousPlay = (v: boolean) => {
    setContinuousPlayState(v);
    try { localStorage.setItem("quran_continuous_play", String(v)); } catch {}
    updateReadingState.mutate({ continuousPlay: v });
  };

  const currentAyahRef = useRef<number | null>(null);
  currentAyahRef.current = currentAyah;

  const reciterIdRef = useRef<number>(DEFAULT_RECITER_ID);
  reciterIdRef.current = reciterId;

  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;

  const continuousPlayRef = useRef(continuousPlay);
  continuousPlayRef.current = continuousPlay;

  const playbackModeRef = useRef<'surah' | 'ayah' | null>(null);
  playbackModeRef.current = playbackMode;

  const verseTimingsRef = useRef<VerseTiming[]>([]);

  const currentRef = useRef<PlayingSurah | null>(null);
  currentRef.current = current;

  const downloadAbortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (readingState?.preferredReciterId) {
      setReciterIdState(readingState.preferredReciterId);
    }
  }, [readingState?.preferredReciterId]);

  useEffect(() => {
    if (readingState?.autoAdvanceAyah !== undefined) {
      setAutoAdvanceState(readingState.autoAdvanceAyah);
    }
  }, [readingState?.autoAdvanceAyah]);

  useEffect(() => {
    if (readingState?.continuousPlay !== undefined) {
      setContinuousPlayState(readingState.continuousPlay);
    }
  }, [readingState?.continuousPlay]);

  const surahNumber = current?.surahNumber ?? null;
  const { data: audioFile } = useChapterAudio(
    current && playbackMode === 'surah' ? reciterId : null,
    surahNumber,
  );

  const reciterName = useMemo(() => {
    const r = reciters?.find((r) => r.id === reciterId);
    return r ? r.reciter_name : null;
  }, [reciters, reciterId]);

  useEffect(() => {
    verseTimingsRef.current = audioFile?.verse_timings ?? [];
  }, [audioFile?.verse_timings]);

  const wasAuthedRef = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) wasAuthedRef.current = true;
    else if (wasAuthedRef.current) {
      stopRef.current?.();
      wasAuthedRef.current = false;
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
      if (playbackModeRef.current === 'surah') {
        const s = currentRef.current;
        if (continuousPlayRef.current && s && s.surahNumber < 114) {
          (async () => {
            try {
              const chapter = await fetchChapter(s.surahNumber + 1);
              playSurahRef.current?.({
                surahNumber: chapter.id,
                surahName: chapter.name_simple,
                surahArabic: chapter.name_arabic,
                versesCount: chapter.verses_count,
              });
            } catch {
              stopRef.current?.();
            }
          })();
        } else {
          stopRef.current?.();
        }
        return;
      }
      if (currentAyahRef.current !== null) {
        const s = currentRef.current;
        const ayah = currentAyahRef.current;
        if (autoAdvanceRef.current && s && ayah < s.versesCount) {
          playAyahRef.current?.(s, ayah + 1);
        } else if (continuousPlayRef.current && s && ayah >= s.versesCount && s.surahNumber < 114) {
          advanceToNextSurahRef.current?.(s.surahNumber);
        } else {
          stopRef.current?.();
        }
      }
    };
    const onLoaded = () => {
      const dur = a.duration || 0;
      setDuration(dur);
      setIsLoading(false);
      if (playbackModeRef.current === 'surah' && verseTimingsRef.current.length === 0 && dur > 0) {
        const s = currentRef.current;
        if (s && s.versesCount > 0) {
          const durMs = dur * 1000;
          const perVerse = durMs / s.versesCount;
          const fallback: VerseTiming[] = [];
          for (let i = 1; i <= s.versesCount; i++) {
            fallback.push({
              verse_key: `${s.surahNumber}:${i}`,
              timestamp_from: (i - 1) * perVerse,
              timestamp_to: i * perVerse,
            });
          }
          verseTimingsRef.current = fallback;
        }
      }
    };
    const onTime = () => {
      const ct = a.currentTime || 0;
      setPosition(ct);
      if (playbackModeRef.current === 'surah' && verseTimingsRef.current.length > 0) {
        const posMs = ct * 1000;
        let foundVerse: number | null = null;
        for (const t of verseTimingsRef.current) {
          if (posMs >= t.timestamp_from) {
            const parts = t.verse_key.split(':');
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num)) foundVerse = num;
            }
            if (posMs < t.timestamp_to) break;
          } else {
            break;
          }
        }
        if (foundVerse !== null && foundVerse !== currentAyahRef.current) {
          setCurrentAyah(foundVerse);
          currentAyahRef.current = foundVerse;
        }
      }
    };
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("playing", onPlaying);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("playing", onPlaying);
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    const url = audioFile?.audio_url;
    if (!a || !current || !url) return;
    if (loadedUrlRef.current === url) return;

    downloadAbortRef.current?.abort();
    const ac = new AbortController();
    downloadAbortRef.current = ac;

    a.pause();
    a.removeAttribute("src");
    a.load();
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);

    setIsLoading(true);
    setDownloadProgress({ loaded: 0, total: 0 });

    (async () => {
      try {
        const res = await fetch(url, { signal: ac.signal, credentials: "omit" });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const totalHeader = res.headers.get("Content-Length");
        const total = totalHeader ? Number(totalHeader) : 0;

        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        let lastEmit = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.byteLength;
            const now = performance.now();
            if (now - lastEmit > 100) {
              lastEmit = now;
              setDownloadProgress({ loaded, total });
            }
          }
        }
        if (ac.signal.aborted) return;

        const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("Content-Type") || "audio/mpeg" });
        const blobUrl = URL.createObjectURL(blob);

        const prevBlob = blobUrlRef.current;
        blobUrlRef.current = blobUrl;
        loadedUrlRef.current = url;

        a.src = blobUrl;
        a.currentTime = 0;
        setDownloadProgress({ loaded, total: total || loaded });

        try {
          await a.play();
        } catch {
          setIsPlaying(false);
        }
        setIsLoading(false);
        setDownloadProgress(null);

        if (prevBlob) URL.revokeObjectURL(prevBlob);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setIsLoading(false);
        setDownloadProgress(null);
        setIsPlaying(false);
      }
    })();

    return () => {
      ac.abort();
    };
  }, [audioFile?.audio_url, current]);

  const playSurah = (s: PlayingSurah) => {
    const a = audioRef.current;
    const isSameSurah = current?.surahNumber === s.surahNumber && playbackModeRef.current === 'surah';

    if (isSameSurah && a && loadedUrlRef.current) {
      setCurrentAyah(null);
      currentAyahRef.current = null;
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }

    downloadAbortRef.current?.abort();
    setCurrentAyah(null);
    currentAyahRef.current = null;
    setPlaybackMode('surah');
    playbackModeRef.current = 'surah';
    verseTimingsRef.current = [];
    loadedUrlRef.current = null;
    setCurrent(s);
  };

  const playAyah = async (s: PlayingSurah, verseNumber: number) => {
    const a = audioRef.current;
    if (!a) return;

    downloadAbortRef.current?.abort();
    const ac = new AbortController();
    downloadAbortRef.current = ac;

    setCurrent(s);
    setCurrentAyah(verseNumber);
    currentAyahRef.current = verseNumber;
    setPlaybackMode('ayah');
    playbackModeRef.current = 'ayah';
    verseTimingsRef.current = [];

    a.pause();
    a.removeAttribute("src");
    a.load();
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setIsLoading(true);
    setDownloadProgress({ loaded: 0, total: 0 });
    loadedUrlRef.current = null;

    try {
      const url = await fetchVerseAudioUrl(reciterIdRef.current, s.surahNumber, verseNumber);
      if (ac.signal.aborted) return;

      const res = await fetch(url, { signal: ac.signal, credentials: "omit" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const totalHeader = res.headers.get("Content-Length");
      const total = totalHeader ? Number(totalHeader) : 0;

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      let lastEmit = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.byteLength;
          const now = performance.now();
          if (now - lastEmit > 100) {
            lastEmit = now;
            setDownloadProgress({ loaded, total });
          }
        }
      }
      if (ac.signal.aborted) return;

      const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("Content-Type") || "audio/mpeg" });
      const blobUrl = URL.createObjectURL(blob);

      const prevBlob = blobUrlRef.current;
      blobUrlRef.current = blobUrl;
      loadedUrlRef.current = url;

      a.src = blobUrl;
      a.currentTime = 0;
      setDownloadProgress({ loaded, total: total || loaded });

      try {
        await a.play();
      } catch {
        setIsPlaying(false);
      }
      setIsLoading(false);
      setDownloadProgress(null);

      if (prevBlob) URL.revokeObjectURL(prevBlob);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setIsLoading(false);
      setDownloadProgress(null);
      setIsPlaying(false);
    }
  };

  const advanceToNextSurah = async (currentSurahNumber: number) => {
    const nextNum = currentSurahNumber + 1;
    if (nextNum > 114) {
      stopRef.current?.();
      return;
    }
    try {
      setIsLoading(true);
      const chapter = await fetchChapter(nextNum);
      const nextSurah: PlayingSurah = {
        surahNumber: chapter.id,
        surahName: chapter.name_simple,
        surahArabic: chapter.name_arabic,
        versesCount: chapter.verses_count,
      };
      playAyahRef.current?.(nextSurah, 1);
    } catch {
      stopRef.current?.();
    }
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const seekBy = (seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + seconds));
  };

  const seekTo = (seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), seconds));
  };

  const stop = () => {
    downloadAbortRef.current?.abort();
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    loadedUrlRef.current = null;
    setCurrent(null);
    setCurrentAyah(null);
    currentAyahRef.current = null;
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setDownloadProgress(null);
    setIsLoading(false);
    setPlaybackMode(null);
    playbackModeRef.current = null;
    verseTimingsRef.current = [];
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const playAyahRef = useRef(playAyah);
  playAyahRef.current = playAyah;
  const playSurahRef = useRef(playSurah);
  playSurahRef.current = playSurah;
  const advanceToNextSurahRef = useRef(advanceToNextSurah);
  advanceToNextSurahRef.current = advanceToNextSurah;

  const setReciterId = (id: number) => {
    setReciterIdState(id);
    downloadAbortRef.current?.abort();
    loadedUrlRef.current = null;
    setCurrentAyah(null);
    currentAyahRef.current = null;
    verseTimingsRef.current = [];
    const a = audioRef.current;
    if (a) {
      a.removeAttribute("src");
      a.load();
    }
    updateReadingState.mutate({ preferredReciterId: id });
  };

  const value = useMemo<AudioContextValue>(() => ({
    current,
    currentAyah,
    isPlaying,
    isLoading,
    duration,
    position,
    reciterId,
    reciterName,
    downloadProgress,
    autoAdvance,
    setAutoAdvance,
    continuousPlay,
    setContinuousPlay,
    setReciterId,
    playSurah,
    playAyah,
    toggle,
    seekBy,
    seekTo,
    stop,
  }), [current, currentAyah, isPlaying, isLoading, duration, position, reciterId, reciterName, downloadProgress, autoAdvance, continuousPlay]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuranAudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useQuranAudio must be used inside QuranAudioProvider");
  return v;
}
