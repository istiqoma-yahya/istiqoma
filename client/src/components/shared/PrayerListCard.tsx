import { Check, Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_ICONS: Record<PrayerKey, typeof Sun> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

export interface PrayerRow {
  name: PrayerKey;
  time: Date;
  isCurrent?: boolean;
  isNext?: boolean;
  isDone?: boolean;
  locked?: boolean;
  isWiggling?: boolean;
  highlight?: boolean;
}

export interface PrayerListCardProps {
  prayers: PrayerRow[];
  prayerLabel: (key: PrayerKey) => string;
  doneAriaLabel: string;
  nowLabel?: string;
  nextLabel?: string;
  onTogglePrayer: (key: PrayerKey, time: Date) => void;
}

export function PrayerListCard({
  prayers,
  prayerLabel,
  doneAriaLabel,
  nowLabel,
  nextLabel,
  onTogglePrayer,
}: PrayerListCardProps) {
  return (
    <Card className="p-2 sm:p-3">
      <div className="divide-y divide-border">
        {prayers.map((prayer) => {
          const { isCurrent, isNext, isDone, locked, isWiggling, highlight } = prayer;
          const Icon = PRAYER_ICONS[prayer.name];
          return (
            <div
              key={prayer.name}
              {...(highlight ? { "data-tour-highlight": true } : {})}
              className={`flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-opacity ${
                isCurrent ? "bg-emerald-500/10" : ""
              } ${locked && !isDone ? "opacity-50" : ""}`}
              data-testid={`prayer-row-${prayer.name}`}
            >
              <button
                type="button"
                onClick={() => onTogglePrayer(prayer.name, prayer.time)}
                aria-label={`${prayerLabel(prayer.name)} - ${doneAriaLabel}`}
                aria-pressed={isDone}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : locked
                    ? "border-muted-foreground/20 text-transparent"
                    : "border-muted-foreground/40 text-transparent hover:border-emerald-500/60"
                } ${isWiggling ? "animate-wiggle" : ""}`}
                data-testid={`button-toggle-${prayer.name}`}
              >
                <Check className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isCurrent ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`font-medium truncate ${
                    isDone ? "line-through text-muted-foreground" : ""
                  } ${isCurrent ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                  data-testid={`text-prayer-name-${prayer.name}`}
                >
                  {prayerLabel(prayer.name)}
                </span>
                {isCurrent && nowLabel && (
                  <span className="text-[10px] sm:text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                    {nowLabel}
                  </span>
                )}
                {isNext && nextLabel && (
                  <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                    {nextLabel}
                  </span>
                )}
              </div>

              <span
                className={`font-mono text-sm sm:text-base shrink-0 ${
                  isCurrent
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : isDone
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
                data-testid={`text-prayer-time-${prayer.name}`}
              >
                {format(prayer.time, "HH:mm")}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
