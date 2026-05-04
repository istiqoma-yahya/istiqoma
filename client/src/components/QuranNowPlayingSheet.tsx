import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, RotateCw, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useQuranAudio } from "./QuranAudioProvider";
import { useReciters } from "@/hooks/use-quran";
import { FEATURED_RECITER_IDS } from "@/lib/quranApi";
import { cn } from "@/lib/utils";

function fmt(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function QuranNowPlayingSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const {
    current,
    currentAyah,
    isPlaying,
    isLoading,
    position,
    duration,
    reciterId,
    setReciterId,
    toggle,
    seekBy,
    seekTo,
    downloadProgress,
  } = useQuranAudio();
  const pct = downloadProgress && downloadProgress.total > 0
    ? Math.min(100, Math.round((downloadProgress.loaded / downloadProgress.total) * 100))
    : null;
  const fmtMb = (b: number) => {
    const mb = b / (1024 * 1024);
    return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
  };
  const { data: reciters } = useReciters();

  // Surface a curated subset first (recognizable names) and the rest
  // alphabetized below. The dataset has ~50+ reciters and listing them
  // raw makes the picker overwhelming.
  const featured = reciters?.filter((r) => FEATURED_RECITER_IDS.includes(r.id)) ?? [];
  const others = reciters?.filter((r) => !FEATURED_RECITER_IDS.includes(r.id)) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] flex flex-col" data-testid="sheet-now-playing">
        <SheetHeader>
          <SheetTitle>{t("quranMenu.nowPlaying")}</SheetTitle>
        </SheetHeader>

        {current && (
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 flex items-center justify-center text-5xl font-bold text-emerald-700 dark:text-emerald-300 mb-6">
                {current.surahNumber}
              </div>
              <div className="text-2xl font-semibold" data-testid="text-now-playing-name">
                {current.surahName}
              </div>
              {currentAyah != null && (
                <div
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1"
                  data-testid="text-now-playing-ayah"
                >
                  Ayah {currentAyah}
                </div>
              )}
              <div className="font-arabic text-arabic mt-2 text-muted-foreground">
                {current.surahArabic}
              </div>
            </div>

            <div className="w-full max-w-md mx-auto">
              {downloadProgress ? (
                <div className="space-y-2" data-testid="now-playing-download">
                  <div
                    className="h-2 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct ?? undefined}
                    aria-label="Download progress"
                  >
                    <div
                      className="h-full bg-emerald-500 transition-[width] duration-150"
                      style={{ width: pct != null ? `${pct}%` : "25%" }}
                    />
                  </div>
                  <div
                    className="flex justify-between text-xs text-muted-foreground"
                    data-testid="text-now-playing-download-progress"
                  >
                    <span>
                      {pct != null ? `Downloading… ${pct}%` : "Downloading…"}
                    </span>
                    <span>
                      {fmtMb(downloadProgress.loaded)}
                      {downloadProgress.total ? ` / ${fmtMb(downloadProgress.total)}` : ""}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <Slider
                    value={[position]}
                    max={duration || 1}
                    step={1}
                    onValueChange={(v) => seekTo(v[0])}
                    disabled={!duration}
                    data-testid="slider-seek"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span data-testid="text-position">{fmt(position)}</span>
                    <span data-testid="text-duration">{fmt(duration)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 mb-8">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => seekBy(-10)}
                data-testid="button-rewind"
                aria-label="Rewind 10 seconds"
              >
                <span className="relative inline-flex items-center justify-center">
                  <RotateCcw className="w-7 h-7" />
                  <span className="absolute text-[8px] font-bold leading-none">10</span>
                </span>
              </Button>
              <Button
                size="icon"
                onClick={toggle}
                className="w-16 h-16 rounded-full"
                data-testid="button-toggle"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => seekBy(10)}
                data-testid="button-fast-forward"
                aria-label="Fast forward 10 seconds"
              >
                <span className="relative inline-flex items-center justify-center">
                  <RotateCw className="w-7 h-7" />
                  <span className="absolute text-[8px] font-bold leading-none">10</span>
                </span>
              </Button>
            </div>

            <div className="border-t border-border pt-4 pb-8">
              <div className="text-sm font-medium mb-3">{t("quranMenu.reciter")}</div>
              <div className="space-y-1">
                {[...featured, ...others].map((r) => {
                  const active = r.id === reciterId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setReciterId(r.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm hover-elevate active-elevate-2 flex items-center justify-between",
                        active && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      )}
                      data-testid={`button-reciter-${r.id}`}
                    >
                      <span>{r.reciter_name}{r.style ? ` · ${r.style}` : ""}</span>
                      {active && <span className="text-xs">●</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
