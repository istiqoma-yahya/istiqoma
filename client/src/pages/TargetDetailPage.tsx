import { useState, useMemo } from "react";
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
import { getFadhilahForCategory } from "@/lib/fadhilah";
import { getTargetDisplayTitle, getTargetCategoryLine, getTargetUnitLabel } from "@/lib/targets";
import { formatNumber } from "@/lib/utils";
import { useDeleteTarget } from "@/hooks/use-targets";
import type { TargetWithProgress, TargetHistory } from "@shared/schema";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  X,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  subMonths,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";

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

function ConsistencyCalendar({
  history,
  period,
}: {
  history: TargetHistory[];
  period: string | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { i18n } = useTranslation();

  const dateLocale = i18n.language === "id" ? idLocale : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const getDayStatus = (date: Date): DayStatus => {
    if (date > new Date()) return "future";

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

  const dayLabels = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

  const completedCount = daysInMonth.filter(d => getDayStatus(d) === "completed").length;

  return (
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
          disabled={isSameMonth(currentMonth, new Date())}
          data-testid="button-next-month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Badge variant="secondary" className="text-xs" data-testid="badge-completed-count">
          {formatNumber(completedCount)} hari tercapai
        </Badge>
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
          const today = isToday(date);

          let bgClass = "bg-muted/30";
          if (status === "completed") bgClass = "bg-primary/80";
          else if (status === "partial") bgClass = "bg-primary/30";
          else if (status === "missed") bgClass = "bg-destructive/20";
          else if (status === "future") bgClass = "bg-transparent";

          let textClass = "text-muted-foreground";
          if (status === "completed") textClass = "text-primary-foreground";
          else if (today) textClass = "text-foreground font-bold";

          return (
            <div
              key={date.toISOString()}
              className={`aspect-square rounded-md flex items-center justify-center text-xs ${bgClass} ${textClass} ${today ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
              data-testid={`calendar-day-${format(date, "yyyy-MM-dd")}`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/80" />
          <span className="text-xs text-muted-foreground">Tercapai</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/30" />
          <span className="text-xs text-muted-foreground">Sebagian</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive/20" />
          <span className="text-xs text-muted-foreground">Belum</span>
        </div>
      </div>
    </Card>
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
  const displayTitle = getTargetDisplayTitle(target, t);
  const categoryLine = getTargetCategoryLine(target, t);

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

        <ConsistencyCalendar history={history} period={target.period} />

        <TrendChart history={history} period={target.period} />

        <NotificationTimesCard targetId={target.id} initialTimes={target.notificationTimes || []} />

        <DeleteTargetSection targetId={target.id} targetName={displayTitle} />
      </div>
      <BottomNavigation />
    </div>
  );
}
