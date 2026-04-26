import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getFadhilahForCategory } from "@/lib/fadhilah";
import { getTargetDisplayTitle, getTargetCategoryLine, getTargetUnitLabel } from "@/lib/targets";
import { formatNumber } from "@/lib/utils";
import { useDeleteTarget } from "@/hooks/use-targets";
import { useCustomDzikirTypes } from "@/hooks/use-dzikir-types";
import type { TargetWithProgress, TargetHistory, Deed } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  ArrowLeft,
  Flame,
  Trophy,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trash2,
  Bell,
  Plus,
  Minus,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getDay,
  subMonths,
  addMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
} from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const USER_TIMEZONE = "Asia/Jakarta";
import { api } from "@shared/routes";

interface TargetDetailData {
  target: TargetWithProgress;
  currentStreak: number;
  longestStreak: number;
  totalAccumulated: number;
  totalQuantity: number;
  totalPoints: number;
  averagePercentage: number;
  history: TargetHistory[];
}

function useTargetDetail(targetId: number | null) {
  return useQuery<TargetDetailData>({
    queryKey: [`/api/targets/${targetId}/detail`],
    enabled: !!targetId,
  });
}

function FadhilahCard({ category }: { category: string }) {
  const fadhilah = useMemo(() => getFadhilahForCategory(category), [category]);

  return (
    <Card className="p-4 border-primary/20 bg-primary/5" data-testid="card-fadhilah">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-2 min-w-0">
          <p className="text-xs font-medium text-foreground uppercase tracking-wide">
            Fadhilah Amalan
          </p>
          {fadhilah.arabicText && (
            <p
              className="text-base leading-relaxed text-foreground"
              style={{ fontFamily: "'Alhabsyi', serif" }}
              dir="rtl"
              data-testid="text-fadhilah-arabic"
            >
              {fadhilah.arabicText}
            </p>
          )}
          <p className="text-sm text-muted-foreground italic leading-relaxed" data-testid="text-fadhilah-translation">
            "{fadhilah.translation}"
          </p>
          <p className="text-xs text-muted-foreground font-medium" data-testid="text-fadhilah-source">
            {fadhilah.source}
          </p>
        </div>
      </div>
    </Card>
  );
}

function HighlightCards({
  currentStreak,
  totalQuantity,
  totalPoints,
  averagePercentage,
  unitLabel,
}: {
  currentStreak: number;
  totalQuantity: number;
  totalPoints: number;
  averagePercentage: number;
  unitLabel: string;
}) {
  const cards = [
    {
      icon: Flame,
      value: currentStreak,
      label: "Streak Saat Ini",
      suffix: "",
      color: "text-orange-500",
      testId: "card-streak",
    },
    {
      icon: Trophy,
      value: totalQuantity,
      label: unitLabel ? `Total ${unitLabel}` : "Total Akumulasi",
      suffix: "",
      color: "text-amber-500",
      testId: "card-total-accumulated",
    },
    {
      icon: Star,
      value: totalPoints,
      label: "Total Poin",
      suffix: "",
      color: "text-primary",
      testId: "card-total-points",
    },
    {
      icon: TrendingUp,
      value: averagePercentage,
      label: "Rata-rata Sukses",
      suffix: "%",
      color: "text-blue-500",
      testId: "card-average-percentage",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.testId} className="p-3" data-testid={card.testId}>
          <div className="flex items-center gap-2 mb-1">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-xs text-muted-foreground">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-foreground" data-testid={`text-${card.testId}-value`}>
            {formatNumber(card.value)}{card.suffix}
          </p>
        </Card>
      ))}
    </div>
  );
}

type DayStatus = "completed" | "partial" | "missed" | "future" | "no-data";

function CircularProgress({ percentage, size = 32 }: { percentage: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percentage) / 100) * circumference;

  return (
    <svg width={size} height={size} className="absolute inset-0 m-auto">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/40"
      />
      {percentage > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}

type CalendarProgressMode = "quick" | "counter";

const readCalendarModeFromStorage = (
  key: string | null,
): CalendarProgressMode => {
  if (!key) return "counter";
  try {
    const raw = localStorage.getItem(key);
    if (raw === "quick" || raw === "counter") return raw;
  } catch {
    // ignore
  }
  return "counter";
};

function CalendarDateProgressDialog({
  isOpen,
  onClose,
  date,
  target,
  onProgressUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  target: TargetWithProgress;
  onProgressUpdated: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const isDzikirTarget = !!target.dzikirType;
  // Shared with the home Update Progress popup so the user's preference
  // stays consistent across both popups.
  const modeStorageKey = user?.id
    ? `targets:updateProgressMode:${user.id}`
    : null;
  const modeStorageKeyRef = useRef<string | null>(modeStorageKey);
  modeStorageKeyRef.current = modeStorageKey;

  const [mode, setModeState] = useState<CalendarProgressMode>(() =>
    readCalendarModeFromStorage(modeStorageKey),
  );
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [incrementValue, setIncrementValue] = useState(1);

  useEffect(() => {
    setModeState(readCalendarModeFromStorage(modeStorageKey));
  }, [modeStorageKey]);

  useEffect(() => {
    if (isOpen) {
      const useCounterDefault =
        isDzikirTarget && modeRef.current === "counter";
      setIncrementValue(useCounterDefault ? 0 : 1);
    }
  }, [isOpen, target.id, isDzikirTarget]);

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const dateLocale = i18n.language === "id" ? idLocale : enUS;

  const { data: existingDeeds, isLoading: isLoadingDeeds } = useQuery<Deed[]>({
    queryKey: ['/api/targets', target.id, 'deeds-for-date', dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/targets/${target.id}/deeds-for-date?date=${dateStr}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen && !!date,
  });

  const currentDayProgress = useMemo(() => {
    if (!existingDeeds) return 0;
    return existingDeeds.reduce((sum, d) => sum + (d.quantity || 1), 0);
  }, [existingDeeds]);

  const newProgress = currentDayProgress + incrementValue;
  const percentComplete = Math.min(100, (newProgress / target.targetValue) * 100);

  const resetIncrementForCurrentMode = () => {
    const useCounterDefault =
      isDzikirTarget && modeRef.current === "counter";
    setIncrementValue(useCounterDefault ? 0 : 1);
  };

  const handleModeChange = (next: CalendarProgressMode) => {
    setModeState(next);
    const key = modeStorageKeyRef.current;
    if (key) {
      try {
        localStorage.setItem(key, next);
      } catch {
        // ignore
      }
    }
    // Quick mode enforces min=1; if user lands here with 0 from Counter,
    // bump state to 1 so the displayed input value and Save-enabled state
    // stay in sync. Values >= 1 (e.g. 33 taps) are preserved as-is.
    if (next === "quick" && incrementValue < 1) {
      setIncrementValue(1);
    }
  };

  const handleTap = () => setIncrementValue((prev) => prev + 1);
  const handleReset = () => setIncrementValue(0);

  const handleSave = async () => {
    if (!date || incrementValue < 1) return;
    setIsSaving(true);

    try {
      const targetTitle = target.name || target.category;
      const noon = new Date(date);
      noon.setHours(12, 0, 0, 0);

      const deedData: Record<string, unknown> = {
        description: t("targets.deedCreatedFromTarget", { target: targetTitle }),
        category: target.category,
        points: incrementValue,
        quantity: incrementValue,
        createdAt: noon.toISOString(),
      };

      if (target.dzikirType) deedData.dzikirType = target.dzikirType;
      if (target.sholatType) deedData.sholatType = target.sholatType;
      if (target.fastingType) deedData.fastingType = target.fastingType;
      if (target.isJamaah) deedData.isJamaah = target.isJamaah;
      if (target.quranUnit) deedData.quranUnit = target.quranUnit;
      if (target.sedekahType) deedData.sedekahType = target.sedekahType;
      if (target.customUnit) deedData.customUnit = target.customUnit;

      await apiRequest("POST", "/api/deeds", deedData);

      await queryClient.invalidateQueries({ queryKey: [`/api/targets/${target.id}/detail`] });
      await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      await queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      await queryClient.invalidateQueries({ queryKey: ['/api/targets', target.id, 'deeds-for-date'] });

      onProgressUpdated();
      resetIncrementForCurrentMode();
      onClose();
      toast({ title: t("targets.targetUpdated") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetIncrementForCurrentMode();
    onClose();
  };

  if (!date) return null;

  const renderQuickCounter = () => (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIncrementValue((prev) => Math.max(1, prev - 1))}
        disabled={incrementValue <= 1}
        data-testid="button-date-decrement"
      >
        <Minus className="w-4 h-4" />
      </Button>
      <Input
        type="number"
        min={1}
        value={Math.max(1, incrementValue)}
        onChange={(e) => setIncrementValue(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-20 text-center"
        data-testid="input-date-increment-value"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIncrementValue((prev) => prev + 1)}
        data-testid="button-date-increment"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderTapCounter = () => (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleTap}
        className="w-48 h-48 rounded-full flex items-center justify-center transition-all active:scale-95 bg-emerald-500/20 border-4 border-emerald-500 active:bg-emerald-500/30 hover:bg-emerald-500/25"
        data-testid="button-dzikir-tap-date"
      >
        <span
          className="text-6xl font-bold text-emerald-500"
          data-testid="text-dzikir-tap-count-date"
        >
          {incrementValue}
        </span>
      </button>

      <p className="text-sm text-muted-foreground">
        {t("dzikir.tapToCount")}
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={incrementValue === 0}
        className="flex items-center gap-2"
        data-testid="button-dzikir-reset-date"
      >
        <RotateCcw className="w-4 h-4" />
        {t("dzikir.reset")}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={isDzikirTarget ? "sm:max-w-md" : "sm:max-w-sm"}>
        <DialogHeader>
          <DialogTitle data-testid="text-date-progress-title">
            {t("targets.updateProgressTitle")}
          </DialogTitle>
          <DialogDescription data-testid="text-date-progress-date">
            {format(date, "EEEE, d MMMM yyyy", { locale: dateLocale })}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDeeds ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-3">
            {isDzikirTarget ? (
              <Tabs
                value={mode}
                onValueChange={(value) =>
                  handleModeChange(value as CalendarProgressMode)
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quick" data-testid="tab-mode-quick-date">
                    {t("targets.modeQuick")}
                  </TabsTrigger>
                  <TabsTrigger value="counter" data-testid="tab-mode-counter-date">
                    {t("dzikir.counter")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("targets.currentProgress")}:</span>
                <span className="font-medium" data-testid="text-date-current-progress">
                  {formatNumber(currentDayProgress)} / {formatNumber(target.targetValue)}
                </span>
              </div>
              <Progress
                value={Math.min(100, (currentDayProgress / target.targetValue) * 100)}
                className="h-2 bg-gray-300 dark:bg-gray-600"
              />
            </div>

            {isDzikirTarget
              ? mode === "counter"
                ? renderTapCounter()
                : renderQuickCounter()
              : renderQuickCounter()}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("targets.newProgress")}:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-date-new-progress">
                  {formatNumber(newProgress)} / {formatNumber(target.targetValue)}
                </span>
              </div>
              <Progress
                value={percentComplete}
                className="h-2 bg-gray-300 dark:bg-gray-600"
              />
              {newProgress >= target.targetValue && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">
                  {t("targets.targetWillBeCompleted")}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSaving} data-testid="button-date-cancel">
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || incrementValue < 1 || isLoadingDeeds} data-testid="button-date-save">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodProgressBars({
  history,
  period,
  target,
  currentMonth,
}: {
  history: TargetHistory[];
  period: string | null;
  target: TargetWithProgress;
  currentMonth: Date;
}) {
  const { t } = useTranslation();
  const isOneTime = target.recurrence === "oneTime";

  if (period === "daily" && !isOneTime) return null;

  if (isOneTime) {
    const pct = target.percentComplete;
    const achieved = target.currentValue;
    const total = target.targetValue;
    return (
      <div className="mb-4 space-y-1.5" data-testid="period-progress-onetime">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("targets.overallProgress", "Keseluruhan")}</span>
          <span className="font-medium text-foreground">
            {formatNumber(achieved)} / {formatNumber(total)} ({pct}%)
          </span>
        </div>
        <Progress value={pct} className="h-2 bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (period === "monthly") {
    const mStart = startOfMonth(currentMonth);
    const mEnd = endOfMonth(currentMonth);
    let achieved = 0;
    let total = target.targetValue;
    let found = false;

    const nowInTz = toZonedTime(new Date(), USER_TIMEZONE);
    const isCurrentMonth = isSameMonth(currentMonth, nowInTz);
    if (isCurrentMonth) {
      achieved = target.currentValue;
      found = true;
    }

    for (const entry of history) {
      const pStart = new Date(entry.periodStart);
      const pEnd = new Date(entry.periodEnd);
      if (pStart <= mEnd && pEnd >= mStart) {
        if (!isCurrentMonth) {
          achieved = entry.achievedValue;
        }
        total = entry.targetValue;
        found = true;
        break;
      }
    }
    if (!found) return null;

    const pct = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
    return (
      <div className="mb-4 space-y-1.5" data-testid="period-progress-monthly">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("targets.monthlyProgress", "Bulanan")}</span>
          <span className="font-medium text-foreground">
            {formatNumber(achieved)} / {formatNumber(total)} ({pct}%)
          </span>
        </div>
        <Progress value={pct} className="h-2 bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (period === "weekly") {
    const mStart = startOfMonth(currentMonth);
    const mEnd = endOfMonth(currentMonth);
    const weeks: { wStart: Date; wEnd: Date; label: string }[] = [];
    let cursor = startOfWeek(mStart, { weekStartsOn: 1 });

    while (cursor <= mEnd) {
      const wEnd = endOfWeek(cursor, { weekStartsOn: 1 });
      const displayStart = cursor < mStart ? mStart : cursor;
      const displayEnd = wEnd > mEnd ? mEnd : wEnd;
      weeks.push({
        wStart: cursor,
        wEnd,
        label: `${format(displayStart, "d")}–${format(displayEnd, "d")}`,
      });
      cursor = new Date(wEnd);
      cursor.setDate(cursor.getDate() + 1);
    }

    const nowInTz = toZonedTime(new Date(), USER_TIMEZONE);

    return (
      <div className="mb-4 space-y-2" data-testid="period-progress-weekly">
        {weeks.map((week, idx) => {
          let achieved = 0;
          let total = target.targetValue;

          const isCurrentWeek = nowInTz >= week.wStart && nowInTz <= week.wEnd;
          if (isCurrentWeek) {
            achieved = target.currentValue;
          }

          for (const entry of history) {
            const pStart = new Date(entry.periodStart);
            const pEnd = new Date(entry.periodEnd);
            if (pStart <= week.wEnd && pEnd >= week.wStart) {
              if (!isCurrentWeek) {
                achieved = entry.achievedValue;
              }
              total = entry.targetValue;
              break;
            }
          }

          const pct = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
          return (
            <div key={idx} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`text-muted-foreground ${isCurrentWeek ? "font-semibold text-foreground" : ""}`}>
                  {week.label}
                </span>
                <span className="font-medium text-foreground">
                  {formatNumber(achieved)}/{formatNumber(total)} ({pct}%)
                </span>
              </div>
              <Progress value={pct} className="h-1.5 bg-gray-200 dark:bg-gray-700" />
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function ConsistencyCalendar({
  history,
  period,
  target,
  onProgressUpdated,
}: {
  history: TargetHistory[];
  period: string | null;
  target: TargetWithProgress;
  onProgressUpdated: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => toZonedTime(new Date(), USER_TIMEZONE));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const dateLocale = i18n.language === "id" ? idLocale : enUS;
  const isCheckboxMode = target.targetValue === 1;
  const isOneTime = target.recurrence === "oneTime";

  const nowInTzRef = toZonedTime(new Date(), USER_TIMEZONE);
  const todayStr = format(nowInTzRef, "yyyy-MM-dd");
  const isTodayInTz = useCallback((date: Date): boolean => {
    return format(date, "yyyy-MM-dd") === todayStr;
  }, [todayStr]);
  const { data: todayDeeds } = useQuery<Deed[]>({
    queryKey: ['/api/targets', target.id, 'deeds-for-date', todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/targets/${target.id}/deeds-for-date?date=${todayStr}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const todayAchievedValue = useMemo(() => {
    if (!todayDeeds) return 0;
    return todayDeeds.reduce((sum, d) => sum + (d.quantity || 1), 0);
  }, [todayDeeds]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const isDateInTargetRange = useCallback((date: Date): boolean => {
    if (!isOneTime) return true;
    if (target.startDate && isBefore(date, new Date(new Date(target.startDate).toDateString()))) return false;
    if (target.dueDate && isAfter(date, new Date(new Date(target.dueDate).toDateString()))) return false;
    return true;
  }, [isOneTime, target.startDate, target.dueDate]);

  const currentPeriodRange = useMemo(() => {
    if (isOneTime || !period || period === "daily") return null;
    const nowInTz = toZonedTime(new Date(), USER_TIMEZONE);
    if (period === "weekly") {
      return { start: startOfWeek(nowInTz, { weekStartsOn: 1 }), end: endOfWeek(nowInTz, { weekStartsOn: 1 }) };
    }
    if (period === "monthly") {
      return { start: startOfMonth(nowInTz), end: endOfMonth(nowInTz) };
    }
    return null;
  }, [isOneTime, period]);

  const isInCurrentPeriod = useCallback((date: Date): boolean => {
    if (!currentPeriodRange) return false;
    return date >= currentPeriodRange.start && date <= currentPeriodRange.end;
  }, [currentPeriodRange]);

  const isLimitType = target.targetType === "limit";

  const getCompletionStatus = (achieved: number, targetVal: number): DayStatus => {
    if (isLimitType) {
      if (achieved === 0) return "no-data";
      if (achieved <= targetVal) return "completed";
      return "missed";
    }
    if (achieved >= targetVal) return "completed";
    if (achieved > 0) return "partial";
    return "no-data";
  };

  const getDayStatus = (date: Date): DayStatus => {
    const nowInTz = toZonedTime(new Date(), USER_TIMEZONE);
    const isFuture = date > nowInTz;

    if (isOneTime) {
      if (!isDateInTargetRange(date)) return "no-data";
      const status = getCompletionStatus(target.currentValue, target.targetValue);
      return status === "no-data" && isFuture ? "future" : status;
    }

    if ((period === "weekly" || period === "monthly") && isInCurrentPeriod(date)) {
      const status = getCompletionStatus(target.currentValue, target.targetValue);
      return status === "no-data" && isFuture ? "future" : status;
    }

    if (isFuture) return "future";

    if (period === "daily" && isTodayInTz(date)) {
      return getCompletionStatus(todayAchievedValue, target.targetValue);
    }

    for (const entry of history) {
      const pStart = new Date(entry.periodStart);
      const pEnd = new Date(entry.periodEnd);

      if (period === "daily") {
        if (isSameDay(date, pStart) || (date >= pStart && date <= pEnd && isSameDay(pStart, pEnd))) {
          if (entry.completed) return "completed";
          if (entry.achievedValue > 0) return "partial";
          return "missed";
        }
      } else if (period === "weekly" || period === "monthly") {
        if (date >= pStart && date <= pEnd) {
          if (entry.completed) return "completed";
          if (entry.achievedValue > 0) return "partial";
          return "missed";
        }
      }
    }
    return "no-data";
  };

  const getDayProgressPercent = (date: Date): number => {
    if (isOneTime) {
      if (!isDateInTargetRange(date)) return 0;
      return target.percentComplete;
    }

    if (period === "daily" && isTodayInTz(date)) {
      if (target.targetValue > 0) {
        return Math.min(100, (todayAchievedValue / target.targetValue) * 100);
      }
      return 0;
    }

    if ((period === "weekly" || period === "monthly") && isInCurrentPeriod(date)) {
      if (target.targetValue > 0) {
        return Math.min(100, (target.currentValue / target.targetValue) * 100);
      }
      return 0;
    }

    for (const entry of history) {
      const pStart = new Date(entry.periodStart);
      const pEnd = new Date(entry.periodEnd);

      if (period === "daily") {
        if (isSameDay(date, pStart) || (date >= pStart && date <= pEnd && isSameDay(pStart, pEnd))) {
          if (entry.targetValue > 0) {
            return Math.min(100, (entry.achievedValue / entry.targetValue) * 100);
          }
          return 0;
        }
      } else if (period === "weekly" || period === "monthly") {
        if (date >= pStart && date <= pEnd) {
          if (entry.targetValue > 0) {
            return Math.min(100, (entry.achievedValue / entry.targetValue) * 100);
          }
          return 0;
        }
      }
    }
    return 0;
  };

  const isDateInteractive = (date: Date): boolean => {
    const nowInTz = toZonedTime(new Date(), USER_TIMEZONE);
    const todayEnd = new Date(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate(), 23, 59, 59);
    if (date > todayEnd) return false;
    if (isOneTime && !isDateInTargetRange(date)) return false;
    return true;
  };

  const getDayBgClass = (status: DayStatus, interactive: boolean): string => {
    if (status === "completed") {
      return "bg-emerald-500 dark:bg-emerald-600 text-white shadow-sm font-bold";
    }
    if (status === "partial") {
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
    }
    if (status === "missed") {
      return "bg-transparent text-muted-foreground";
    }
    if (status === "future") {
      return "bg-transparent text-muted-foreground/40";
    }
    if (interactive) {
      return "bg-transparent text-muted-foreground hover:bg-muted/50 hover:ring-1 hover:ring-primary/30";
    }
    return "bg-transparent text-muted-foreground/50";
  };

  const handleToggleCheckbox = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setIsToggling(dateStr);

    try {
      const res = await fetch(`/api/targets/${target.id}/deeds-for-date?date=${dateStr}`, {
        credentials: "include",
      });
      const existingDeeds: Deed[] = res.ok ? await res.json() : [];

      if (existingDeeds.length > 0) {
        for (const deed of existingDeeds) {
          await apiRequest("DELETE", `/api/deeds/${deed.id}`);
        }
      } else {
        const targetTitle = target.name || target.category;
        const noon = new Date(date);
        noon.setHours(12, 0, 0, 0);

        const deedData: Record<string, unknown> = {
          description: t("targets.deedCreatedFromTarget", { target: targetTitle }),
          category: target.category,
          points: 1,
          quantity: 1,
          createdAt: noon.toISOString(),
        };

        if (target.dzikirType) deedData.dzikirType = target.dzikirType;
        if (target.sholatType) deedData.sholatType = target.sholatType;
        if (target.fastingType) deedData.fastingType = target.fastingType;
        if (target.isJamaah) deedData.isJamaah = target.isJamaah;
        if (target.quranUnit) deedData.quranUnit = target.quranUnit;
        if (target.sedekahType) deedData.sedekahType = target.sedekahType;
        if (target.customUnit) deedData.customUnit = target.customUnit;

        await apiRequest("POST", "/api/deeds", deedData);
      }

      await queryClient.invalidateQueries({ queryKey: [`/api/targets/${target.id}/detail`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/targets', target.id, 'deeds-for-date'] });
      await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      await queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      onProgressUpdated();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setIsToggling(null);
    }
  }, [target, t, toast, onProgressUpdated]);

  const handleDayClick = useCallback((date: Date) => {
    if (!isDateInteractive(date)) return;

    if (isCheckboxMode) {
      handleToggleCheckbox(date);
    } else {
      setSelectedDate(date);
      setIsDateDialogOpen(true);
    }
  }, [isCheckboxMode, handleToggleCheckbox]);

  const dayLabels = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

  const completedCount = daysInMonth.filter(d => getDayStatus(d) === "completed").length;

  return (
    <>
      <Card className="p-4" data-testid="card-calendar">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold text-foreground" data-testid="text-calendar-month">
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            disabled={isSameMonth(currentMonth, toZonedTime(new Date(), USER_TIMEZONE))}
            data-testid="button-next-month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <PeriodProgressBars
          history={history}
          period={period}
          target={target}
          currentMonth={currentMonth}
        />

        <div className="flex items-center gap-3 mb-4">
          <Badge variant="secondary" className="text-xs" data-testid="badge-completed-count">
            {formatNumber(completedCount)} hari tercapai
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {isCheckboxMode ? "Ketuk tanggal untuk centang" : "Ketuk tanggal untuk update"}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((label) => (
            <div key={label} className="text-center text-xs text-muted-foreground font-medium py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: adjustedStartDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {daysInMonth.map((date) => {
            const status = getDayStatus(date);
            const today = isTodayInTz(date);
            const interactive = isDateInteractive(date);
            const dateStr = format(date, "yyyy-MM-dd");
            const toggling = isToggling === dateStr;
            const bgClass = getDayBgClass(status, interactive);

            if (isCheckboxMode) {
              const isCompleted = status === "completed";
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={!interactive || toggling}
                  onClick={() => handleDayClick(date)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all duration-150 ${
                    interactive ? "cursor-pointer active:scale-90" : "cursor-default"
                  } ${bgClass} ${today ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                  data-testid={`calendar-day-${dateStr}`}
                >
                  {toggling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isCompleted ? (
                    <Check className="w-3.5 h-3.5 mb-0.5" strokeWidth={3} />
                  ) : null}
                  <span className={isCompleted ? "text-[9px] leading-none" : "text-xs"}>
                    {date.getDate()}
                  </span>
                </button>
              );
            }

            const progressPercent = getDayProgressPercent(date);
            const showRing = period === "daily" && status !== "future" && interactive;

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={!interactive}
                onClick={() => handleDayClick(date)}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs relative transition-all duration-150 ${
                  interactive ? "cursor-pointer active:scale-90" : "cursor-default"
                } ${bgClass} ${today ? "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-lg" : ""}`}
                data-testid={`calendar-day-${dateStr}`}
              >
                {showRing && (
                  <CircularProgress percentage={progressPercent} size={34} />
                )}
                <span className="relative z-10 leading-none">
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 justify-center flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
            <span className="text-xs text-muted-foreground">Tercapai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30" />
            <span className="text-xs text-muted-foreground">Sebagian</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">Belum</span>
          </div>
        </div>
      </Card>

      {!isCheckboxMode && (
        <CalendarDateProgressDialog
          isOpen={isDateDialogOpen}
          onClose={() => setIsDateDialogOpen(false)}
          date={selectedDate}
          target={target}
          onProgressUpdated={onProgressUpdated}
        />
      )}
    </>
  );
}

function TrendChart({
  history,
  period,
}: {
  history: TargetHistory[];
  period: string | null;
}) {
  const [viewMode, setViewMode] = useState<"recent" | "all">("recent");

  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
    );
  }, [history]);

  const chartData = useMemo(() => {
    const data = viewMode === "recent" ? sortedHistory.slice(-14) : sortedHistory;
    return data.map((entry) => {
      const percentage =
        entry.targetValue > 0
          ? Math.min(100, Math.round((entry.achievedValue / entry.targetValue) * 100))
          : 0;
      const label =
        period === "daily"
          ? format(new Date(entry.periodStart), "dd/MM")
          : period === "weekly"
          ? format(new Date(entry.periodStart), "dd/MM")
          : format(new Date(entry.periodStart), "MMM");
      return {
        label,
        percentage,
        achieved: entry.achievedValue,
        target: entry.targetValue,
        completed: entry.completed,
      };
    });
  }, [sortedHistory, viewMode, period]);

  const isDowntrend = useMemo(() => {
    if (chartData.length < 3) return false;
    const recent = chartData.slice(-3);
    return recent[2].percentage < recent[0].percentage && recent[2].percentage < 60;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="p-4" data-testid="card-trend-empty">
        <h3 className="text-sm font-semibold text-foreground mb-2">Grafik Tren</h3>
        <p className="text-sm text-muted-foreground">
          Belum ada data yang cukup. Terus kerjakan amalanmu!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid="card-trend">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Grafik Tren</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewMode === "recent" ? "default" : "outline"}
            onClick={() => setViewMode("recent")}
            data-testid="button-trend-recent"
          >
            Terbaru
          </Button>
          <Button
            size="sm"
            variant={viewMode === "all" ? "default" : "outline"}
            onClick={() => setViewMode("all")}
            data-testid="button-trend-all"
          >
            Semua
          </Button>
        </div>
      </div>

      <div className="h-48" data-testid="chart-trend-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              className="text-muted-foreground"
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
              contentStyle={{
                borderRadius: "8px",
                fontSize: "12px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
              }}
              formatter={(value: number) => [`${value}%`, "Pencapaian"]}
            />
            <Bar
              dataKey="percentage"
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
              fillOpacity={0.7}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {isDowntrend && (
        <div className="mt-3 p-3 rounded-md bg-muted/50 border border-border" data-testid="text-motivational-message">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Grafikmu sedang istirahat sebentar, ya? Yuk, <span className="font-semibold text-foreground">bismillah</span>, kita naikkan lagi pelan-pelan hari ini!
          </p>
        </div>
      )}

      {!isDowntrend && chartData.length >= 3 && (
        <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/10" data-testid="text-positive-message">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">MasyaAllah!</span> Konsistensimu luar biasa. Terus pertahankan!
          </p>
        </div>
      )}
    </Card>
  );
}

function NotificationTimesCard({ targetId, initialTimes }: { targetId: number; initialTimes: string[] }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [times, setTimes] = useState<string[]>(initialTimes || []);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
    setHasChanges(true);
  };

  const removeTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const addTime = () => {
    if (times.length < 5) {
      setTimes([...times, "08:00"]);
      setHasChanges(true);
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    const uniqueTimes = [...new Set(times)];
    try {
      await apiRequest("PATCH", `/api/targets/${targetId}`, { notificationTimes: uniqueTimes });
      await queryClient.invalidateQueries({ queryKey: [`/api/targets/${targetId}/detail`] });
      setHasChanges(false);
      toast({ title: t("targets.targetUpdated"), description: t("targets.targetUpdatedDesc") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-4" data-testid="card-notification-times">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{t("targets.notificationTimes")}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{t("targets.notificationTimesDesc")}</p>
      <div className="space-y-2">
        {times.map((time, index) => (
          <div key={index} className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px]">
              {t("targets.reminderTimeLabel", { number: index + 1 })}
            </Label>
            <Input
              type="time"
              value={time}
              className="flex-1"
              onChange={(e) => updateTime(index, e.target.value)}
              data-testid={`input-detail-reminder-time-${index}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeTime(index)}
              data-testid={`button-detail-remove-reminder-${index}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {times.length < 5 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTime}
            className="w-full"
            data-testid="button-detail-add-reminder"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("targets.addReminderTime")}
          </Button>
        )}
        {times.length >= 5 && (
          <p className="text-xs text-muted-foreground text-center">{t("targets.maxReminders")}</p>
        )}
        {hasChanges && (
          <Button
            onClick={saveChanges}
            disabled={isSaving}
            size="sm"
            className="w-full"
            data-testid="button-save-reminders"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t("common.save")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function DeleteTargetSection({ targetId, targetName }: { targetId: number; targetName: string }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const deleteTarget = useDeleteTarget();

  const handleDelete = async () => {
    await deleteTarget.mutateAsync(targetId);
    navigate("/targets");
  };

  return (
    <div className="pt-4 pb-8">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full border-rose-500/30 text-rose-500"
            data-testid="button-delete-target"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("targets.deleteTarget")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-card border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("targets.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("targets.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTarget.isPending}
              className="bg-none bg-rose-500 text-white"
              data-testid="button-confirm-delete-target"
            >
              {deleteTarget.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TargetDetailPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const targetId = params.id ? parseInt(params.id, 10) : null;

  const { data, isLoading, error } = useTargetDetail(targetId);
  const { data: customDzikirTypes = [] } = useCustomDzikirTypes();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" data-testid="loader-detail" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-2xl mx-auto p-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/targets")}
            className="mb-4"
            data-testid="button-back-error"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("targets.backToTargets")}
          </Button>
          <Card className="p-8 text-center">
            <h3 className="font-semibold text-lg mb-2" data-testid="text-not-found">
              {t("targets.notFound")}
            </h3>
            <p className="text-muted-foreground">{t("targets.notFoundDesc")}</p>
          </Card>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const { target, currentStreak, totalQuantity, totalPoints, averagePercentage, history } = data;
  const unitLabel = getTargetUnitLabel(target, t);
  const displayTitle = getTargetDisplayTitle(target, t, customDzikirTypes);
  const categoryLine = getTargetCategoryLine(target, t, customDzikirTypes);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/targets")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate" data-testid="text-detail-title">
              {displayTitle}
            </h1>
            <p className="text-sm text-muted-foreground truncate" data-testid="text-detail-category">
              {categoryLine}
            </p>
          </div>
          <ThemeToggle />
        </header>

        <FadhilahCard category={target.category} />

        <HighlightCards
          currentStreak={currentStreak}
          totalQuantity={totalQuantity}
          totalPoints={totalPoints}
          averagePercentage={averagePercentage}
          unitLabel={unitLabel}
        />

        <ConsistencyCalendar
          history={history}
          period={target.period}
          target={target}
          onProgressUpdated={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/targets/${target.id}/detail`] });
          }}
        />

        <TrendChart history={history} period={target.period} />

        <NotificationTimesCard targetId={target.id} initialTimes={target.notificationTimes || []} />

        <DeleteTargetSection targetId={target.id} targetName={displayTitle} />
      </div>
      <BottomNavigation />
    </div>
  );
}
