import { useState } from "react";
import { useTargetsWithProgress, useCreateTarget, useUpdateTarget, useDeleteTarget, useTargetHistory, useUpdateTargetProgress, useCompleteTarget } from "@/hooks/use-targets";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/hooks/use-auth";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTargetSchema, type InsertTarget, type TargetWithProgress, type TargetHistory } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Target, Pencil, Trash2, Trophy, TrendingUp, Calendar, ChevronDown, ChevronUp, Flame, CheckCircle, XCircle, History, Ban, Clock, CalendarIcon } from "lucide-react";
import { format, addDays, addWeeks, addMonths, formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface TargetCardProps {
  target: TargetWithProgress;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getPeriodIcon: (period: string) => JSX.Element;
  getPeriodLabel: (period: string) => string;
  t: (key: string, options?: Record<string, string>) => string;
  onUpdateProgress: (id: number, progress: number) => void;
  onComplete: (id: number) => void;
  isUpdatingProgress: boolean;
}

function TargetCard({
  target,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  getPeriodIcon,
  getPeriodLabel,
  t,
  onUpdateProgress,
  onComplete,
  isUpdatingProgress,
}: TargetCardProps) {
  const { data: historyData, isLoading: historyLoading } = useTargetHistory(
    isExpanded ? target.id : null
  );
  const [progressInput, setProgressInput] = useState<string>(String(target.manualProgress || target.currentValue || 0));

  const formatPeriodDate = (date: Date | string, period: string) => {
    const d = new Date(date);
    switch (period) {
      case "daily":
        return format(d, "MMM d, yyyy");
      case "weekly":
        return format(d, "MMM d");
      case "monthly":
        return format(d, "MMM yyyy");
      default:
        return format(d, "MMM d, yyyy");
    }
  };

  const isLimitTarget = target.targetType === "limit";
  const isWithinLimit = isLimitTarget && target.currentValue <= target.targetValue;
  const isExceeded = isLimitTarget && target.currentValue > target.targetValue;
  const isAchieved = !isLimitTarget && target.percentComplete >= 100;
  const isOneTime = target.recurrence === "oneTime";
  
  const getOneTimeStatus = () => {
    if (target.completedAt) return "completed";
    if (target.dueDate && isPast(new Date(target.dueDate))) return "expired";
    return "active";
  };
  
  const getDeadlineDisplay = () => {
    if (!target.dueDate) return null;
    const dueDate = new Date(target.dueDate);
    if (isPast(dueDate)) {
      const distance = formatDistanceToNow(dueDate);
      return { text: t("targets.overdue", { time: distance }), isOverdue: true };
    }
    const distance = formatDistanceToNow(dueDate);
    return { text: t("targets.dueIn", { time: distance }), isOverdue: false };
  };
  
  const oneTimeStatus = isOneTime ? getOneTimeStatus() : null;
  const deadlineDisplay = isOneTime ? getDeadlineDisplay() : null;

  return (
    <Card className="p-4" data-testid={`card-target-${target.id}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1 flex-wrap mb-1">
            {isOneTime ? (
              <>
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                >
                  {t("targets.oneTime")}
                </Badge>
                {oneTimeStatus === "completed" && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                    data-testid={`badge-status-${target.id}`}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t("targets.statusCompleted")}
                  </Badge>
                )}
                {oneTimeStatus === "active" && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    data-testid={`badge-status-${target.id}`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {t("targets.statusActive")}
                  </Badge>
                )}
                {oneTimeStatus === "expired" && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                    data-testid={`badge-status-${target.id}`}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    {t("targets.statusExpired")}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${isLimitTarget ? "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300" : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"}`}
                >
                  {isLimitTarget ? t("targets.limitType") : t("targets.achievementType")}
                </Badge>
                {historyData && historyData.currentStreak > 0 && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300" data-testid={`badge-streak-${target.id}`}>
                    <Flame className="w-3 h-3 mr-1" />
                    {historyData.currentStreak} {t("targets.streak")}
                  </Badge>
                )}
              </>
            )}
          </div>
          <h3 className="font-medium" data-testid={`text-target-category-${target.id}`}>
            {isOneTime && target.unitLabel ? target.unitLabel : target.category}
            {!isOneTime && target.dzikirType && (
              <span className="text-muted-foreground font-normal"> ({t(`dzikir.types.${target.dzikirType}`)})</span>
            )}
            {!isOneTime && target.sholatType && (
              <span className="text-muted-foreground font-normal"> ({t(`sholat.types.${target.sholatType}`)})</span>
            )}
            {!isOneTime && target.fastingType && (
              <span className="text-muted-foreground font-normal"> ({t(`fasting.types.${target.fastingType}`)})</span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isOneTime && deadlineDisplay ? (
              <span className={deadlineDisplay.isOverdue ? "text-red-500 dark:text-red-400" : ""}>
                {deadlineDisplay.text}
              </span>
            ) : (
              target.period ? getPeriodLabel(target.period) : ""
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            data-testid={`button-edit-target-${target.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            data-testid={`button-delete-target-${target.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isLimitTarget ? t("targets.usage") : t("targets.progress")}
          </span>
          <span className="font-medium" data-testid={`text-target-progress-${target.id}`}>
            {target.currentValue} / {target.targetValue} {isOneTime ? "" : (isLimitTarget ? t("targets.max") : t("stats.points"))}
          </span>
        </div>
        <Progress
          value={isLimitTarget ? Math.min(100, target.percentComplete) : target.percentComplete}
          className={`h-2 bg-gray-300 dark:bg-gray-600 ${isLimitTarget ? "[&>div]:bg-rose-500" : (isOneTime ? "[&>div]:bg-blue-500" : "")}`}
          data-testid={`progress-target-${target.id}`}
        />
        <div className="flex items-center justify-between text-xs">
          {isOneTime ? (
            <>
              <span className={oneTimeStatus === "completed" ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                {target.percentComplete}%
              </span>
              {oneTimeStatus === "completed" && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t("targets.statusCompleted")}
                </span>
              )}
            </>
          ) : isLimitTarget ? (
            <>
              {isWithinLimit ? (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t("targets.withinLimit")}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {t("targets.exceeded")}
                </span>
              )}
            </>
          ) : (
            <>
              <span className={isAchieved ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                {target.percentComplete}%
              </span>
              {isAchieved && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {t("targets.completed")}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {isOneTime && oneTimeStatus !== "completed" && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={target.targetValue}
              value={progressInput}
              onChange={(e) => setProgressInput(e.target.value)}
              className="w-24"
              data-testid={`input-progress-${target.id}`}
            />
            <span className="text-sm text-muted-foreground">
              / {target.targetValue}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const parsed = parseInt(progressInput);
                const newProgress = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, target.targetValue));
                setProgressInput(String(newProgress));
                onUpdateProgress(target.id, newProgress);
              }}
              disabled={isUpdatingProgress}
              data-testid={`button-update-progress-${target.id}`}
            >
              {isUpdatingProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : t("targets.updateProgress")}
            </Button>
          </div>
          {target.percentComplete >= 100 && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => onComplete(target.id)}
              data-testid={`button-complete-target-${target.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t("targets.markComplete")}
            </Button>
          )}
        </div>
      )}

      {!isOneTime && (
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-muted-foreground"
            data-testid={`button-toggle-history-${target.id}`}
          >
            <History className="w-4 h-4 mr-1" />
            {t("targets.history")}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          {historyLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : historyData && historyData.history.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                {t("targets.pastPeriods")}
              </div>
              {historyData.history.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  data-testid={`history-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-2">
                    {entry.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">
                      {formatPeriodDate(entry.periodStart, target.period || "daily")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.achievedValue} / {entry.targetValue}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {t("targets.noHistory")}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
      )}
    </Card>
  );
}

export default function TargetsPage() {
  const { t } = useTranslation();
  const { data: targets, isLoading } = useTargetsWithProgress();
  const { data: categories } = useCategories();
  const { user } = useAuth();
  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();
  const updateProgress = useUpdateTargetProgress();
  const completeTarget = useCompleteTarget();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetWithProgress | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<TargetWithProgress | null>(null);
  const [expandedTargetId, setExpandedTargetId] = useState<number | null>(null);

  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  
  const form = useForm<InsertTarget>({
    resolver: zodResolver(insertTargetSchema),
    defaultValues: {
      category: "",
      targetValue: 10,
      period: "daily",
      targetType: "achievement",
      recurrence: "recurring",
      startDate: undefined,
      dueDate: undefined,
      unitLabel: undefined,
      dzikirType: undefined,
    },
  });

  const watchedTargetType = form.watch("targetType");
  const watchedCategory = form.watch("category");
  const watchedRecurrence = form.watch("recurrence");
  
  const isDzikirCategory = watchedCategory?.toLowerCase() === "dzikir" || watchedCategory?.toLowerCase() === "dzikr";
  const isSholatFardhuCategory = watchedCategory?.toLowerCase() === "sholat fardhu";
  const isSholatSunnahCategory = watchedCategory?.toLowerCase() === "sholat sunnah";
  const isSholatCategory = isSholatFardhuCategory || isSholatSunnahCategory;
  const isFastingFardhuCategory = watchedCategory?.toLowerCase() === "fasting fardhu";
  const isFastingSunnahCategory = watchedCategory?.toLowerCase() === "fasting sunnah";
  const isFastingCategory = isFastingFardhuCategory || isFastingSunnahCategory;
  
  const DZIKIR_TYPES = [
    { id: "subhanallah", labelKey: "dzikir.types.subhanallah" },
    { id: "alhamdulillah", labelKey: "dzikir.types.alhamdulillah" },
    { id: "allahuakbar", labelKey: "dzikir.types.allahuakbar" },
    { id: "lailahaillallah", labelKey: "dzikir.types.lailahaillallah" },
  ];

  const SHOLAT_FARDHU_TYPES = [
    { id: "subuh", labelKey: "sholat.types.subuh" },
    { id: "dzuhur", labelKey: "sholat.types.dzuhur" },
    { id: "ashar", labelKey: "sholat.types.ashar" },
    { id: "maghrib", labelKey: "sholat.types.maghrib" },
    { id: "isya", labelKey: "sholat.types.isya" },
  ];

  const SHOLAT_SUNNAH_TYPES = [
    { id: "rawatib", labelKey: "sholat.types.rawatib" },
    { id: "dhuha", labelKey: "sholat.types.dhuha" },
    { id: "tahajjud", labelKey: "sholat.types.tahajjud" },
    { id: "witir", labelKey: "sholat.types.witir" },
    { id: "tarawih", labelKey: "sholat.types.tarawih" },
    { id: "eid", labelKey: "sholat.types.eid" },
    { id: "istikharah", labelKey: "sholat.types.istikharah" },
    { id: "hajat", labelKey: "sholat.types.hajat" },
    { id: "taubat", labelKey: "sholat.types.taubat" },
  ];

  const FASTING_FARDHU_TYPES = [
    { id: "ramadhan", labelKey: "fasting.types.ramadhan" },
    { id: "qadha", labelKey: "fasting.types.qadha" },
    { id: "kaffarah", labelKey: "fasting.types.kaffarah" },
    { id: "nadzar", labelKey: "fasting.types.nadzar" },
  ];

  const FASTING_SUNNAH_TYPES = [
    { id: "seninkamis", labelKey: "fasting.types.seninkamis" },
    { id: "ayyamulbidh", labelKey: "fasting.types.ayyamulbidh" },
    { id: "arafah", labelKey: "fasting.types.arafah" },
    { id: "asyura", labelKey: "fasting.types.asyura" },
    { id: "syawal", labelKey: "fasting.types.syawal" },
    { id: "daud", labelKey: "fasting.types.daud" },
  ];

  const currentSholatTypes = isSholatFardhuCategory ? SHOLAT_FARDHU_TYPES : SHOLAT_SUNNAH_TYPES;
  const currentFastingTypes = isFastingFardhuCategory ? FASTING_FARDHU_TYPES : FASTING_SUNNAH_TYPES;

  const handleDurationSelect = (duration: string) => {
    setSelectedDuration(duration);
    const now = new Date();
    let dueDate: Date;
    
    switch (duration) {
      case "1day":
        dueDate = addDays(now, 1);
        break;
      case "1week":
        dueDate = addWeeks(now, 1);
        break;
      case "1month":
        dueDate = addMonths(now, 1);
        break;
      case "3months":
        dueDate = addMonths(now, 3);
        break;
      default:
        return;
    }
    
    form.setValue("startDate", now);
    form.setValue("dueDate", dueDate);
  };

  const openEditDialog = (target: TargetWithProgress) => {
    setEditingTarget(target);
    const isOneTime = target.recurrence === "oneTime";
    setSelectedDuration(null);
    form.reset({
      category: target.category,
      targetValue: target.targetValue,
      period: target.period as "daily" | "weekly" | "monthly" | undefined,
      targetType: (target.targetType as "achievement" | "limit") || "achievement",
      recurrence: (target.recurrence as "recurring" | "oneTime") || "recurring",
      startDate: target.startDate ? new Date(target.startDate) : undefined,
      dueDate: target.dueDate ? new Date(target.dueDate) : undefined,
      unitLabel: target.unitLabel || undefined,
      dzikirType: target.dzikirType || undefined,
      sholatType: target.sholatType || undefined,
      fastingType: target.fastingType || undefined,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTarget(null);
    setSelectedDuration(null);
    form.reset({
      category: "",
      targetValue: 10,
      period: "daily",
      targetType: "achievement",
      recurrence: "recurring",
      startDate: undefined,
      dueDate: undefined,
      unitLabel: undefined,
      dzikirType: undefined,
      sholatType: undefined,
      fastingType: undefined,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: InsertTarget) => {
    try {
      if (data.recurrence === "oneTime" && !data.unitLabel?.trim()) {
        form.setError("unitLabel", { 
          type: "manual", 
          message: t("targets.targetNameRequired") 
        });
        return;
      }
      if (editingTarget) {
        await updateTarget.mutateAsync({ id: editingTarget.id, data });
      } else {
        await createTarget.mutateAsync(data);
      }
      setIsDialogOpen(false);
      setEditingTarget(null);
    } catch (error) {
      // Error is handled by mutation's onError, keep dialog open
    }
  };

  const handleDelete = async () => {
    if (deletingTarget) {
      await deleteTarget.mutateAsync(deletingTarget.id);
      setDeletingTarget(null);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "daily": return t("targets.daily");
      case "weekly": return t("targets.weekly");
      case "monthly": return t("targets.monthly");
      default: return period;
    }
  };

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case "daily": return <TrendingUp className="w-4 h-4" />;
      case "weekly": return <Calendar className="w-4 h-4" />;
      case "monthly": return <Trophy className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" data-testid="loader-targets" />
      </div>
    );
  }

  const targetsArray = targets || [];
  
  // For achievement targets: exclude Istighfar and Maksiat (good deed categories for positive goals)
  // For limit targets: show all categories except Istighfar (user can limit any behavior)
  const goodCategories = categories?.filter(c => c.name !== "Istighfar" && c.name !== "Maksiat") || [];
  const limitCategories = categories?.filter(c => c.name !== "Istighfar") || [];
  
  const availableCategories = watchedTargetType === "limit" ? limitCategories : goodCategories;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <header className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-targets-title">
            {t("targets.title")}
          </h1>
          <ThemeToggle />
        </header>

        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-sm text-muted-foreground">{t("targets.subtitle")}</p>
          <Button onClick={openCreateDialog} data-testid="button-add-target">
            <Plus className="w-4 h-4 mr-1" />
            {t("targets.addTarget")}
          </Button>
        </div>

        {targetsArray.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2" data-testid="text-no-targets">
              {t("targets.noTargets")}
            </h3>
            <p className="text-muted-foreground mb-4">{t("targets.noTargetsDesc")}</p>
            <Button onClick={openCreateDialog} data-testid="button-add-first-target">
              <Plus className="w-4 h-4 mr-1" />
              {t("targets.addFirstTarget")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {targetsArray.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                isExpanded={expandedTargetId === target.id}
                onToggleExpand={() => setExpandedTargetId(expandedTargetId === target.id ? null : target.id)}
                onEdit={() => openEditDialog(target)}
                onDelete={() => setDeletingTarget(target)}
                getPeriodIcon={getPeriodIcon}
                getPeriodLabel={getPeriodLabel}
                t={t}
                onUpdateProgress={(id, progress) => updateProgress.mutate({ id, progress })}
                onComplete={(id) => completeTarget.mutate(id)}
                isUpdatingProgress={updateProgress.isPending || completeTarget.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-target-dialog-title">
              {editingTarget ? t("targets.editTarget") : t("targets.addTarget")}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.recurrenceType")}</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === "recurring" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          field.onChange("recurring");
                          form.setValue("startDate", undefined);
                          form.setValue("dueDate", undefined);
                          form.setValue("unitLabel", undefined);
                          setSelectedDuration(null);
                        }}
                        data-testid="button-recurrence-recurring"
                      >
                        {t("targets.recurring")}
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "oneTime" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          field.onChange("oneTime");
                          form.setValue("period", undefined);
                          form.setValue("category", t("targets.oneTimeGoal"));
                        }}
                        data-testid="button-recurrence-onetime"
                      >
                        {t("targets.oneTime")}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedRecurrence === "recurring" && (
                <FormField
                  control={form.control}
                  name="targetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("targets.targetType")}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("category", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-target-type">
                            <SelectValue placeholder={t("targets.selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="achievement">{t("targets.achievementType")}</SelectItem>
                          <SelectItem value="limit">{t("targets.limitType")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {field.value === "limit" ? t("targets.limitTypeDesc") : t("targets.achievementTypeDesc")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRecurrence === "recurring" && (
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("deed.category")}</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        const lowerValue = value.toLowerCase();
                        if (lowerValue !== "dzikir" && lowerValue !== "dzikr") {
                          form.setValue("dzikirType", undefined);
                        }
                        if (lowerValue !== "sholat fardhu" && lowerValue !== "sholat sunnah") {
                          form.setValue("sholatType", undefined);
                        }
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-target-category">
                            <SelectValue placeholder={t("targets.selectCategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRecurrence === "recurring" && isDzikirCategory && (
                <FormField
                  control={form.control}
                  name="dzikirType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dzikir.selectType")}</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__any__" ? undefined : value)} 
                        value={field.value || "__any__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-dzikir-type">
                            <SelectValue placeholder={t("dzikir.selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__any__">{t("dzikir.anyType")}</SelectItem>
                          {DZIKIR_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {t(type.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRecurrence === "recurring" && isSholatCategory && (
                <FormField
                  control={form.control}
                  name="sholatType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sholat.selectType")}</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__any__" ? undefined : value)} 
                        value={field.value || "__any__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-sholat-type">
                            <SelectValue placeholder={t("sholat.selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__any__">{t("sholat.anyType")}</SelectItem>
                          {currentSholatTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {t(type.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRecurrence === "recurring" && isFastingCategory && (
                <FormField
                  control={form.control}
                  name="fastingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fasting.selectType")}</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__any__" ? undefined : value)} 
                        value={field.value || "__any__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-fasting-type">
                            <SelectValue placeholder={t("fasting.selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__any__">{t("fasting.anyType")}</SelectItem>
                          {currentFastingTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {t(type.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRecurrence === "oneTime" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">{t("targets.deadline")}</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={selectedDuration === "1day" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDurationSelect("1day")}
                        data-testid="button-duration-1day"
                      >
                        {t("targets.duration.1day")}
                      </Button>
                      <Button
                        type="button"
                        variant={selectedDuration === "1week" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDurationSelect("1week")}
                        data-testid="button-duration-1week"
                      >
                        {t("targets.duration.1week")}
                      </Button>
                      <Button
                        type="button"
                        variant={selectedDuration === "1month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDurationSelect("1month")}
                        data-testid="button-duration-1month"
                      >
                        {t("targets.duration.1month")}
                      </Button>
                      <Button
                        type="button"
                        variant={selectedDuration === "3months" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDurationSelect("3months")}
                        data-testid="button-duration-3months"
                      >
                        {t("targets.duration.3months")}
                      </Button>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t("targets.customDeadline")}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-custom-deadline"
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>{t("targets.customDeadline")}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                  form.setValue("startDate", new Date());
                                  setSelectedDuration(null);
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("targets.targetName")} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("targets.targetNamePlaceholder")}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-target-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedRecurrence === "oneTime" 
                        ? t("targets.oneTimeTargetValue") 
                        : (watchedTargetType === "limit" ? t("targets.maxValue") : t("targets.targetValue"))}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={watchedTargetType === "limit" ? 0 : 1}
                        value={field.value}
                        onChange={(e) => {
                          const value = e.target.valueAsNumber;
                          field.onChange(isNaN(value) ? "" : value);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="input-target-value"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {watchedRecurrence === "oneTime" 
                        ? t("targets.oneTimeTargetValueDesc") 
                        : (watchedTargetType === "limit" ? t("targets.maxValueDesc") : t("targets.targetValueDesc"))}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedRecurrence === "recurring" && (
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("targets.period")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-target-period">
                            <SelectValue placeholder={t("targets.selectPeriod")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">{t("targets.daily")}</SelectItem>
                          <SelectItem value="weekly">{t("targets.weekly")}</SelectItem>
                          <SelectItem value="monthly">{t("targets.monthly")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-target"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createTarget.isPending || updateTarget.isPending}
                  data-testid="button-save-target"
                >
                  {(createTarget.isPending || updateTarget.isPending) && (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  )}
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTarget} onOpenChange={(open) => !open && setDeletingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("targets.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("targets.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-target">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-target"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
}
