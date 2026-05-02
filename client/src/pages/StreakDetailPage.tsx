import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Snowflake,
  Flame,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
} from "date-fns";
import { id as idLocale, ms as msLocale, enUS } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface MonthDay {
  date: string;
  hadDeed: boolean;
  wasFrozen: boolean;
}

interface StreakMonthData {
  days: MonthDay[];
  daysPracticed: number;
  freezersUsed: number;
}

type GridCell =
  | { kind: "blank"; key: string }
  | {
      kind: "day";
      key: string;
      date: Date;
      dateStr: string;
      hadDeed: boolean;
      wasFrozen: boolean;
      isActive: boolean;
      isToday: boolean;
      isFuture: boolean;
    };

export default function StreakDetailPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const dateLocale =
    i18n.language === "id" ? idLocale : i18n.language === "ms" ? msLocale : enUS;

  const [currentMonth, setCurrentMonth] = useState(() =>
    toZonedTime(new Date(), USER_TIMEZONE),
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data, isLoading } = useQuery<StreakMonthData>({
    queryKey: ["/api/streak/month", year, month],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        timezone: USER_TIMEZONE,
      });
      const res = await fetch(`/api/streak/month?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load streak month");
      return (await res.json()) as StreakMonthData;
    },
  });

  const todayInTz = toZonedTime(new Date(), USER_TIMEZONE);
  const todayStr = format(todayInTz, "yyyy-MM-dd");
  const isCurrentMonth = isSameMonth(currentMonth, todayInTz);

  const dayStateMap = useMemo(() => {
    const m = new Map<string, MonthDay>();
    if (data?.days) for (const d of data.days) m.set(d.date, d);
    return m;
  }, [data]);

  const weekDayLabels = t("streak.weekDays", { returnObjects: true }) as string[];

  const cells = useMemo<GridCell[]>(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);
    const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const list: GridCell[] = [];
    for (let i = 0; i < adjustedStart; i++) {
      list.push({ kind: "blank", key: `lead-${i}` });
    }
    for (const date of days) {
      const dateStr = format(date, "yyyy-MM-dd");
      const ds = dayStateMap.get(dateStr);
      const hadDeed = ds?.hadDeed ?? false;
      const wasFrozen = ds?.wasFrozen ?? false;
      list.push({
        kind: "day",
        key: dateStr,
        date,
        dateStr,
        hadDeed,
        wasFrozen,
        isActive: hadDeed || wasFrozen,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }
    while (list.length % 7 !== 0) {
      list.push({ kind: "blank", key: `trail-${list.length}` });
    }
    return list;
  }, [currentMonth, dayStateMap, todayStr]);

  const isEmpty =
    !isLoading &&
    (data?.daysPracticed ?? 0) === 0 &&
    (data?.freezersUsed ?? 0) === 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back-streak"
            aria-label={t("streakDetail.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1
            className="text-lg font-semibold"
            data-testid="text-streak-detail-title"
          >
            {t("streakDetail.title")}
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            data-testid="button-streak-prev-month"
            aria-label={t("streakDetail.prevMonth")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2
            className="text-base font-semibold"
            data-testid="text-streak-month-label"
          >
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </h2>
          <Button
            size="icon"
            variant="ghost"
            disabled={isCurrentMonth}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            data-testid="button-streak-next-month"
            aria-label={t("streakDetail.nextMonth")}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card
            className="p-4 border border-orange-500/20"
            data-testid="chip-days-practiced"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {t("streakDetail.daysPracticed")}
              </p>
            </div>
            <p
              className="text-2xl font-bold font-display text-orange-500"
              data-testid="text-days-practiced"
            >
              {formatNumber(data?.daysPracticed ?? 0)}
            </p>
          </Card>

          <button
            type="button"
            className="text-left"
            onClick={() => navigate("/streak-freezer")}
            data-testid="chip-freezers-used"
            aria-label={t("streakDetail.freezersUsed")}
          >
            <Card className="p-4 border border-sky-500/20 hover:bg-muted/40 transition-colors h-full">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Snowflake className="w-4 h-4" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("streakDetail.freezersUsed")}
                </p>
              </div>
              <p
                className="text-2xl font-bold font-display text-sky-500"
                data-testid="text-freezers-used"
              >
                {formatNumber(data?.freezersUsed ?? 0)}
              </p>
            </Card>
          </button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-7 gap-x-0 gap-y-1 mb-2">
            {weekDayLabels.map((label) => (
              <div
                key={label}
                className="text-center text-xs text-muted-foreground font-medium py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div
              className="h-72 rounded-md bg-muted/40 animate-pulse"
              data-testid="streak-month-skeleton"
            />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-x-0 gap-y-1">
                {cells.map((cell, idx) => {
                  if (cell.kind === "blank") {
                    return (
                      <div
                        key={cell.key}
                        className="aspect-square"
                        aria-hidden="true"
                      />
                    );
                  }

                  const positionInWeek = idx % 7;
                  const prev = positionInWeek > 0 ? cells[idx - 1] : null;
                  const next = positionInWeek < 6 ? cells[idx + 1] : null;
                  const connectsLeft =
                    cell.isActive && prev?.kind === "day" && prev.isActive;
                  const connectsRight =
                    cell.isActive && next?.kind === "day" && next.isActive;

                  // Active runs in the same row share a connected pill: only
                  // the run's first/last cells get rounded sides, middle cells
                  // are flat. Standalone active days are fully rounded.
                  const innerClasses: string[] = [
                    "relative w-full h-full flex items-center justify-center text-sm transition-colors",
                  ];

                  if (cell.isActive) {
                    innerClasses.push(
                      "bg-orange-500 text-white font-semibold shadow-sm",
                    );
                    if (!connectsLeft) innerClasses.push("rounded-l-full");
                    if (!connectsRight) innerClasses.push("rounded-r-full");
                  } else if (cell.isFuture) {
                    innerClasses.push(
                      "rounded-full m-0.5 text-muted-foreground/30",
                    );
                  } else {
                    innerClasses.push(
                      "rounded-full m-0.5 bg-muted/40 text-muted-foreground",
                    );
                  }

                  if (cell.isToday) {
                    innerClasses.push(
                      "ring-2 ring-orange-600 dark:ring-orange-400 ring-offset-1 ring-offset-background",
                    );
                    // When the today cell is active and part of a horizontal
                    // run, force fully-rounded so the today ring reads as a
                    // distinct pill instead of being clipped by the run.
                    if (cell.isActive) {
                      innerClasses.push("rounded-full");
                    }
                  }

                  return (
                    <div
                      key={cell.key}
                      className="aspect-square"
                      data-testid={`cell-streak-day-${cell.dateStr}`}
                    >
                      <div className={innerClasses.join(" ")}>
                        <span className="relative z-10 leading-none">
                          {cell.date.getDate()}
                        </span>
                        {cell.wasFrozen && (
                          <Snowflake
                            className="absolute top-0.5 right-0.5 w-3 h-3 text-white/90"
                            strokeWidth={2.5}
                            data-testid={`icon-frozen-${cell.dateStr}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isEmpty && (
                <p
                  className="text-sm text-muted-foreground text-center mt-4"
                  data-testid="text-streak-month-empty"
                >
                  {t("streakDetail.empty")}
                </p>
              )}
            </>
          )}

          <div className="flex items-center gap-4 mt-4 justify-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-muted-foreground">
                {t("streakDetail.legendDeed")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                <Snowflake className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="text-xs text-muted-foreground">
                {t("streakDetail.legendFrozen")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-muted/60" />
              <span className="text-xs text-muted-foreground">
                {t("streakDetail.legendInactive")}
              </span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
