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

type AudioContextValue = {
  current: PlayingSurah | null;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  reciterId: number;
  reciterName: string | null;
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
  // resolves, swap it onto the element and start playback. We stash the
  // last loaded URL on the element to avoid a redundant src reset.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current || !audioFile?.audio_url) return;
    if (a.src !== audioFile.audio_url) {
      setIsLoading(true);
      a.src = audioFile.audio_url;
      a.currentTime = 0;
      a.play().catch(() => {
        setIsPlaying(false);
        setIsLoading(false);
      });
    }
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
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setCurrent(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const setReciterId = (id: number) => {
    setReciterIdState(id);
    // Force-reset the loaded URL so the same playSurah will pick up the
    // new reciter on next render.
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
    setReciterId,
    playSurah,
    toggle,
    seekBy,
    seekTo,
    stop,
  }), [current, isPlaying, isLoading, duration, position, reciterId, reciterName]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuranAudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useQuranAudio must be used inside QuranAudioProvider");
  return v;
}
