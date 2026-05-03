import { useState } from "react";
import { Play, Pause, X, ChevronUp, Loader2, Rewind, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useQuranAudio } from "./QuranAudioProvider";
import { QuranNowPlayingSheet } from "./QuranNowPlayingSheet";

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function QuranMiniPlayer() {
  const { current, isPlaying, isLoading, position, duration, toggle, stop, seekBy, seekTo, reciterName } =
    useQuranAudio();
  const [openFull, setOpenFull] = useState(false);

  if (!current) return null;

  return (
    <>
      <div
        className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 pointer-events-none"
        data-testid="quran-mini-player"
      >
        <div className="container max-w-5xl mx-auto pointer-events-auto">
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 p-2">
              <button
                className="flex-1 flex items-center gap-3 min-w-0 text-left px-2 py-1 rounded-md hover-elevate active-elevate-2"
                onClick={() => setOpenFull(true)}
                data-testid="button-open-now-playing"
              >
                <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                  {current.surahNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" data-testid="text-mini-surah-name">
                    {current.surahName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" data-testid="text-mini-reciter">
                    {reciterName ?? current.surahArabic}
                  </div>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => seekBy(-10)}
                data-testid="button-quran-rewind-10"
                aria-label="Rewind 10 seconds"
              >
                <Rewind className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggle}
                data-testid="button-quran-play"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => seekBy(10)}
                data-testid="button-quran-forward-10"
                aria-label="Forward 10 seconds"
              >
                <FastForward className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={stop}
                data-testid="button-mini-close"
                aria-label="Stop"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="px-3 pb-2">
              <Slider
                value={[position]}
                max={duration || 1}
                step={1}
                onValueChange={(v) => seekTo(v[0])}
                disabled={!duration}
                data-testid="slider-quran-progress"
                aria-label="Audio progress"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span data-testid="text-mini-position">{fmt(position)}</span>
                <span data-testid="text-mini-duration">{fmt(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <QuranNowPlayingSheet open={openFull} onOpenChange={setOpenFull} />
    </>
  );
}
