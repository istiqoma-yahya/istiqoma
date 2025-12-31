import { useState } from "react";
import { useLocation } from "wouter";
import { useTargetsWithProgress, useDeleteTarget, useTargetHistory, useUpdateTargetProgress, useCompleteTarget } from "@/hooks/use-targets";
import { useAuth } from "@/hooks/use-auth";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { type TargetWithProgress } from "@shared/schema";
import { type TargetHistoryWithStreak } from "@/hooks/use-targets";
import { Loader2, Plus, Target, Pencil, Trash2, Trophy, TrendingUp, Calendar, ChevronDown, ChevronUp, CheckCircle, XCircle, History, Ban, Clock } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";

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
                  {isLimitTarget ? (
                    <>
                      <Ban className="w-3 h-3 mr-1" />
                      {t("targets.limitBadge")}
                    </>
                  ) : (
                    <>
                      <Target className="w-3 h-3 mr-1" />
                      {t("targets.recurring")}
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getPeriodIcon(target.period || "daily")}
                  <span className="ml-1">{getPeriodLabel(target.period || "daily")}</span>
                </Badge>
                              </>
            )}
          </div>
          <h3 className="font-medium" data-testid={`text-target-category-${target.id}`}>
            {target.unitLabel || target.category}
          </h3>
          <p className="text-sm text-muted-foreground">
            {target.category}
            {target.dzikirType && (
              <span> - {t(`dzikir.types.${target.dzikirType}`)}</span>
            )}
            {target.sholatType && (
              <span> - {t(`sholat.types.${target.sholatType}`)}</span>
            )}
            {target.fastingType && (
              <span> - {t(`fasting.types.${target.fastingType}`)}</span>
            )}
            {target.isJamaah && (
              <span> ({t("sholat.isJamaah")})</span>
            )}
            {target.quranUnit && (
              <span> - {t(`quran.units.${target.quranUnit}`)}</span>
            )}
            {target.sedekahType && (
              <span> - {t(`sedekah.types.${target.sedekahType}`)}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOneTime && deadlineDisplay ? (
              <span className={deadlineDisplay.isOverdue ? "text-red-500 dark:text-red-400" : ""}>
                {deadlineDisplay.text}
              </span>
            ) : (
              isLimitTarget 
                ? `${t("targets.max")}: ${target.targetValue}` 
                : `${t("targets.targetValue")}: ${target.targetValue}`
            )}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={`button-edit-target-${target.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-target-${target.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isOneTime ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("targets.progress")}:</span>
            <span className="font-medium" data-testid={`text-target-progress-${target.id}`}>
              {target.manualProgress || target.currentValue || 0} / {target.targetValue}
            </span>
          </div>
          <Progress 
            value={Math.min(100, ((target.manualProgress || target.currentValue || 0) / target.targetValue) * 100)} 
            className="h-2"
            data-testid={`progress-target-${target.id}`}
          />
          {oneTimeStatus === "active" && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={0}
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                className="w-24"
                data-testid={`input-progress-${target.id}`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const value = parseInt(progressInput, 10);
                  if (!isNaN(value) && value >= 0) {
                    onUpdateProgress(target.id, value);
                  }
                }}
                disabled={isUpdatingProgress}
                data-testid={`button-update-progress-${target.id}`}
              >
                {t("targets.updateProgress")}
              </Button>
              {(target.manualProgress || target.currentValue || 0) >= target.targetValue && (
                <Button
                  size="sm"
                  onClick={() => onComplete(target.id)}
                  disabled={isUpdatingProgress}
                  data-testid={`button-complete-target-${target.id}`}
                >
                  {t("targets.markComplete")}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {isLimitTarget ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("targets.usage")}:</span>
                  <span 
                    className={`font-medium ${isExceeded ? "text-red-500" : "text-green-500"}`}
                    data-testid={`text-target-usage-${target.id}`}
                  >
                    {target.currentValue} / {target.targetValue} {t("targets.used")}
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, (target.currentValue / target.targetValue) * 100)} 
                  className={`h-2 ${isExceeded ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`}
                  data-testid={`progress-target-${target.id}`}
                />
                <div className="flex items-center gap-1 text-sm">
                  {isWithinLimit ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">{t("targets.withinLimit")}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">{t("targets.exceeded")}</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("targets.progress")}:</span>
                  <span className="font-medium" data-testid={`text-target-progress-${target.id}`}>
                    {target.currentValue} / {target.targetValue}
                  </span>
                </div>
                <Progress 
                  value={target.percentComplete} 
                  className="h-2"
                  data-testid={`progress-target-${target.id}`}
                />
                {isAchieved && (
                  <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Trophy className="w-4 h-4" />
                    <span>{t("targets.completed")}</span>
                  </div>
                )}
              </>
            )}
          </div>

      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            data-testid={`button-expand-history-${target.id}`}
          >
            <History className="w-4 h-4 mr-1" />
            {t("targets.history")}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {historyLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : historyData && historyData.history && historyData.history.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("targets.pastPeriods")}</p>
              {historyData.history.map((entry) => (
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
      </>
      )}
    </Card>
  );
}

export default function TargetsPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: targets, isLoading } = useTargetsWithProgress();
  const { user } = useAuth();
  const deleteTarget = useDeleteTarget();
  const updateProgress = useUpdateTargetProgress();
  const completeTarget = useCompleteTarget();

  const [deletingTarget, setDeletingTarget] = useState<TargetWithProgress | null>(null);
  const [expandedTargetId, setExpandedTargetId] = useState<number | null>(null);

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
          <Button onClick={() => navigate("/targets/new")} data-testid="button-add-target">
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
            <Button onClick={() => navigate("/targets/new")} data-testid="button-add-first-target">
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
                onEdit={() => navigate(`/targets/${target.id}/edit`)}
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
