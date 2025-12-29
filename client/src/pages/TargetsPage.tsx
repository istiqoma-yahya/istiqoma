import { useState } from "react";
import { useTargetsWithProgress, useCreateTarget, useUpdateTarget, useDeleteTarget, useTargetHistory } from "@/hooks/use-targets";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTargetSchema, type InsertTarget, type TargetWithProgress, type TargetHistory } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Target, Pencil, Trash2, Trophy, TrendingUp, Calendar, ChevronDown, ChevronUp, Flame, CheckCircle, XCircle, History, Ban } from "lucide-react";
import { format } from "date-fns";

interface TargetCardProps {
  target: TargetWithProgress;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getPeriodIcon: (period: string) => JSX.Element;
  getPeriodLabel: (period: string) => string;
  t: (key: string) => string;
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
}: TargetCardProps) {
  const { data: historyData, isLoading: historyLoading } = useTargetHistory(
    isExpanded ? target.id : null
  );

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

  return (
    <Card className="p-4" data-testid={`card-target-${target.id}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {isLimitTarget ? (
            <Ban className="w-4 h-4 text-rose-500" />
          ) : (
            getPeriodIcon(target.period)
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium" data-testid={`text-target-category-${target.id}`}>
                {target.category}
              </h3>
              <Badge variant="secondary" className="text-xs">
                  {isLimitTarget ? t("targets.limitType") : t("targets.achievementType")}
                </Badge>
              {historyData && historyData.currentStreak > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid={`badge-streak-${target.id}`}>
                  <Flame className="w-3 h-3 mr-1 text-orange-500" />
                  {historyData.currentStreak} {t("targets.streak")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeriodLabel(target.period)}
            </p>
          </div>
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
            {target.currentValue} / {target.targetValue} {isLimitTarget ? t("targets.max") : t("stats.points")}
          </span>
        </div>
        <Progress
          value={isLimitTarget ? Math.min(100, target.percentComplete) : target.percentComplete}
          className={`h-2 bg-gray-300 dark:bg-gray-600 ${isExceeded ? "[&>div]:bg-rose-500" : ""}`}
          data-testid={`progress-target-${target.id}`}
        />
        <div className="flex items-center justify-between text-xs">
          {isLimitTarget ? (
            <>
              <span className={isWithinLimit ? "text-green-600 dark:text-green-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>
                {target.percentComplete}% {t("targets.used")}
              </span>
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
                      {formatPeriodDate(entry.periodStart, target.period)}
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetWithProgress | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<TargetWithProgress | null>(null);
  const [expandedTargetId, setExpandedTargetId] = useState<number | null>(null);

  const form = useForm<InsertTarget>({
    resolver: zodResolver(insertTargetSchema),
    defaultValues: {
      category: "",
      targetValue: 10,
      period: "daily",
      targetType: "achievement",
    },
  });

  const watchedTargetType = form.watch("targetType");

  const openEditDialog = (target: TargetWithProgress) => {
    setEditingTarget(target);
    form.reset({
      category: target.category,
      targetValue: target.targetValue,
      period: target.period as "daily" | "weekly" | "monthly",
      targetType: (target.targetType as "achievement" | "limit") || "achievement",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTarget(null);
    form.reset({
      category: "",
      targetValue: 10,
      period: "daily",
      targetType: "achievement",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: InsertTarget) => {
    try {
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

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("deed.category")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedTargetType === "limit" ? t("targets.maxValue") : t("targets.targetValue")}
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
                      {watchedTargetType === "limit" ? t("targets.maxValueDesc") : t("targets.targetValueDesc")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
