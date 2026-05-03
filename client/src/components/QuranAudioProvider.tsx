import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChapterAudio, useReciters, useReadingState, useUpdateReadingState } from "@/hooks/use-quran";
import { DEFAULT_RECITER_ID } from "@/lib/quranApi";
import { useAuth } from "@/hooks/use-auth";

// One-and-only-one HTMLAudioElement for the whole app. Keeping the
// element + state in a context (rather than per-page) is what lets the
// mini-player keep playing when the user navigates between Qur'an
// pages, the bookmarks list, or even other parts of the app.

type PlayingSurah = {
  surahNumber: number;
  surahName: string;
  surahArabic: string;
};

export type DownloadProgress = {
  loaded: number;
  total: number;
};

type AudioContextValue = {
  current: PlayingSurah | null;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  reciterId: number;
  reciterName: string | null;
  downloadProgress: DownloadProgress | null;
  setReciterId: (id: number) => void;
  playSurah: (s: PlayingSurah) => void;
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
  const [reciterId, setReciterIdState] = useState<number>(DEFAULT_RECITER_ID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // Track in-flight downloads so we can abort them when the user
  // switches reciter/surah mid-download. We also keep the last blob URL
  // around so we can revoke it (browsers leak them otherwise).
  const downloadAbortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  // Sync the saved reciter preference once the server returns it. We do
  // this in an effect (not in useState init) because the query resolves
  // asynchronously after the provider mounts.
  useEffect(() => {
    if (readingState?.preferredReciterId) {
      setReciterIdState(readingState.preferredReciterId);
    }
  }, [readingState?.preferredReciterId]);

  const surahNumber = current?.surahNumber ?? null;
  const { data: audioFile } = useChapterAudio(current ? reciterId : null, surahNumber);

  const reciterName = useMemo(() => {
    const r = reciters?.find((r) => r.id === reciterId);
    return r ? r.reciter_name : null;
  }, [reciters, reciterId]);

  // Stop playback when the user logs out so the audio doesn't keep
  // playing on the login screen for the next user. We watch the auth
  // query result rather than hooking into a logout button so this also
  // covers session expiry.
  const wasAuthedRef = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) wasAuthedRef.current = true;
    else if (wasAuthedRef.current) {
      stopRef.current?.();
      wasAuthedRef.current = false;
    }
  }, [isAuthenticated, authLoading]);

  // Wire DOM events from the single audio element to React state. We
  // intentionally do this once rather than in any consumer component so
  // that timing is consistent regardless of who's rendering the player.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
    };
    const onLoaded = () => {
      setDuration(a.duration || 0);
      setIsLoading(false);
    };
    const onTime = () => setPosition(a.currentTime || 0);
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

  // When the audio URL for the current (surah, reciter) pair finally
  // resolves, download it ourselves with progress tracking, then hand
  // the resulting blob to the audio element. Going through fetch() (vs
  // letting <audio> stream the URL directly) gives us byte-level
  // progress for the UI _and_ lets the service worker cache the full
  // file so re-opens are instant / work offline.
  useEffect(() => {
    const a = audioRef.current;
    const url = audioFile?.audio_url;
    if (!a || !current || !url) return;
    if (loadedUrlRef.current === url) return;

    // Cancel anything we were already downloading – the user changed
    // reciter or surah before this finished.
    downloadAbortRef.current?.abort();
    const ac = new AbortController();
    downloadAbortRef.current = ac;

    // Immediately silence the previously-loaded surah so the user
    // doesn't keep hearing the old audio while the new one downloads.
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
        // Throttle progress state updates to ~10/sec to avoid React
        // re-rendering the player on every network packet.
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

        // Free the previous blob URL only after we've assigned the new
        // one, so we never revoke a URL still attached to the element.
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
        // Clear progress shortly after play starts so the UI returns to
        // the regular "now playing" state.
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
    setCurrent(s);
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
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setDownloadProgress(null);
    setIsLoading(false);
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const setReciterId = (id: number) => {
    setReciterIdState(id);
    // Force-reset the loaded URL so the same playSurah will pick up the
    // new reciter on next render.
    downloadAbortRef.current?.abort();
    loadedUrlRef.current = null;
    const a = audioRef.current;
    if (a) {
      a.removeAttribute("src");
      a.load();
    }
    updateReadingState.mutate({ preferredReciterId: id });
  };

  const value = useMemo<AudioContextValue>(() => ({
    current,
    isPlaying,
    isLoading,
    duration,
    position,
    reciterId,
    reciterName,
    downloadProgress,
    setReciterId,
    playSurah,
    toggle,
    seekBy,
    seekTo,
    stop,
  }), [current, isPlaying, isLoading, duration, position, reciterId, reciterName, downloadProgress]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuranAudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useQuranAudio must be used inside QuranAudioProvider");
  return v;
}
