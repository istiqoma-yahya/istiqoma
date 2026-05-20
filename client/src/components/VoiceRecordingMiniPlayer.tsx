import { useTranslation } from "react-i18next";
import { Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

type Props = {
  label: string;
  position: number;
  duration: number;
  isPlaying: boolean;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  /** When true, sit above the Qur'an recitation mini-player so they don't overlap. */
  stacked?: boolean;
};

export function VoiceRecordingMiniPlayer({
  label,
  position,
  duration,
  isPlaying,
  onToggle,
  onSeek,
  onClose,
  stacked = false,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={`fixed left-0 right-0 z-30 px-3 pb-2 pointer-events-none ${
        stacked ? "bottom-44" : "bottom-16"
      }`}
      data-testid="voice-recording-mini-player"
    >
      <div className="container max-w-5xl mx-auto pointer-events-auto">
        <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 p-2">
            <div className="flex-1 flex items-center gap-3 min-w-0 px-2 py-1">
              <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Play className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm font-medium truncate"
                  data-testid="text-voice-player-label"
                >
                  {label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t("quranMenu.voicePlayerSubtitle")}
                </div>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggle}
              data-testid="button-voice-player-toggle"
              aria-label={isPlaying ? t("quranMenu.voicePlayerPause") : t("quranMenu.voicePlayerPlay")}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              data-testid="button-voice-player-close"
              aria-label={t("quranMenu.voicePlayerClose")}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="px-3 pb-2">
            <Slider
              value={[position]}
              max={duration > 0 ? duration : 1}
              step={0.1}
              onValueChange={(v) => onSeek(v[0])}
              disabled={duration <= 0}
              data-testid="slider-voice-player-progress"
              aria-label={t("quranMenu.voicePlayerSeek")}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span data-testid="text-voice-player-position">{fmt(position)}</span>
              <span data-testid="text-voice-player-duration">{fmt(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
