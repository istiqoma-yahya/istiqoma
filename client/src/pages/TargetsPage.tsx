import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useTargetsWithProgress, useDeleteTarget, useUpdateTargetProgress, useCompleteTarget, useUpdateTarget } from "@/hooks/use-targets";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useAuth } from "@/hooks/use-auth";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UpdateProgressModal } from "@/components/UpdateProgressModal";
import { PointsRewardDialog } from "@/components/PointsRewardDialog";
import { StreakDialog } from "@/components/StreakDialog";
import { getTargetDisplayTitle, getTargetCategoryLine, getTargetUnitLabel } from "@/lib/targets";
import { api } from "@shared/routes";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { type TargetWithProgress } from "@shared/schema";
import { formatNumber } from "@/lib/utils";
import { Loader2, Plus, Target, Pencil } from "lucide-react";
import { format, isPast, type Locale } from "date-fns";
import { id as idLocale, ms as msLocale, enUS } from "date-fns/locale";

interface TargetCardProps {
  target: TargetWithProgress;
  onOpenUpdateModal: () => void;
  onDetail: () => void;
  onRename: (target: TargetWithProgress) => void;
  t: (key: string, options?: Record<string, string>) => string;
  dateLocale: Locale;
}

function TargetCard({
  target,
  onOpenUpdateModal,
  onDetail,
  onRename,
  t,
  dateLocale,
}: TargetCardProps) {
  const isOneTime = target.recurrence === "oneTime";

  const getOneTimeStatus = () => {
    if (target.completedAt) return "completed";
    if (target.dueDate && isPast(new Date(target.dueDate))) return "expired";
    return "active";
  };

  const oneTimeStatus = isOneTime ? getOneTimeStatus() : null;

  const getPeriodWord = (period: string) => {
    switch (period) {
      case "daily": return t("targets.periodDay");
      case "weekly": return t("targets.periodWeek");
      case "monthly": return t("targets.periodMonth");
      default: return period;
    }
  };

  const unitLabel = getTargetUnitLabel(target, t);

  const getTargetLine = () => {
    const amount = formatNumber(target.targetValue);
    const unitPart = unitLabel ? ` ${unitLabel}` : "";

    if (isOneTime) {
      if (target.dueDate) {
        const formattedDate = format(new Date(target.dueDate), "d MMMM yyyy", { locale: dateLocale });
        return `${t("targets.targetLabel")} ${amount}${unitPart} ${t("targets.untilDate", { date: formattedDate })}`;
      }
      return `${t("targets.targetLabel")} ${amount}${unitPart}`;
    } else {
      const periodWord = getPeriodWord(target.period || "daily");
      return `${t("targets.targetLabel")} ${amount}${unitPart} ${t("targets.perPeriod", { period: periodWord })}`;
    }
  };

  const currentProgress = target.currentValue || 0;
  const percentComplete = target.percentComplete || 0;
  const isCompleted = isOneTime ? oneTimeStatus === "completed" : percentComplete >= 100;
  const canUpdate = isOneTime ? oneTimeStatus === "active" : true;

  return (
    <Card className="p-4" data-testid={`card-target-${target.id}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground" data-testid={`text-target-title-${target.id}`}>
            {getTargetDisplayTitle(target, t)}
          </h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRename(target)}
            data-testid={`button-rename-target-${target.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground" data-testid={`text-target-line-${target.id}`}>
          {getTargetLine()}
        </p>

        <p className="text-sm text-muted-foreground" data-testid={`text-target-category-${target.id}`}>
          {t("targets.categoryLabel")} {getTargetCategoryLine(target, t)}
        </p>

        <div className="flex items-center gap-2">
          <Progress
            value={percentComplete}
            className="h-2 flex-1 bg-gray-300 dark:bg-gray-600"
            data-testid={`progress-target-${target.id}`}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-target-percent-${target.id}`}>
            {Math.round(percentComplete)}%
          </span>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDetail}
            data-testid={`button-detail-${target.id}`}
          >
            {t("targets.detail")}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onOpenUpdateModal}
            disabled={!canUpdate || isCompleted}
            data-testid={`button-update-${target.id}`}
          >
            {t("targets.update")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function TargetsPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: targets, isLoading } = useTargetsWithProgress();
  const { user } = useAuth();
  const deleteTarget = useDeleteTarget();
  const updateProgress = useUpdateTargetProgress();
  const completeTarget = useCompleteTarget();
  const createDeed = useCreateDeed();
  const updateTarget = useUpdateTarget();

  const [deletingTarget, setDeletingTarget] = useState<TargetWithProgress | null>(null);
  const [updateModalTarget, setUpdateModalTarget] = useState<TargetWithProgress | null>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [showStreakDialog, setShowStreakDialog] = useState(false);
  const [renamingTarget, setRenamingTarget] = useState<TargetWithProgress | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: streakData } = useQuery<{ streakCount: number; weekDays: boolean[] }>({
    queryKey: ["/api/streak"],
  });

  const getDateLocale = () => {
    switch (i18n.language) {
      case "id": return idLocale;
      case "ms": return msLocale;
      default: return enUS;
    }
  };
  const dateLocale = getDateLocale();

  const handleDelete = async () => {
    if (deletingTarget) {
      await deleteTarget.mutateAsync(deletingTarget.id);
      setDeletingTarget(null);
    }
  };

  const handleOpenRename = (target: TargetWithProgress) => {
    setRenamingTarget(target);
    setRenameValue(getTargetDisplayTitle(target, t));
  };

  const handleRename = () => {
    if (!renamingTarget || !renameValue.trim()) return;
    const rt = renamingTarget;
    const data: Record<string, any> = {
      name: renameValue.trim(),
      category: rt.category,
      targetValue: rt.targetValue,
      period: rt.period,
      targetType: rt.targetType,
      recurrence: rt.recurrence,
    };
    if (rt.startDate) data.startDate = new Date(rt.startDate);
    if (rt.dueDate) data.dueDate = new Date(rt.dueDate);
    if (rt.unitLabel) data.unitLabel = rt.unitLabel;
    if (rt.dzikirType) data.dzikirType = rt.dzikirType;
    if (rt.sholatType) data.sholatType = rt.sholatType;
    if (rt.fastingType) data.fastingType = rt.fastingType;
    if (rt.isJamaah != null) data.isJamaah = rt.isJamaah;
    if (rt.quranUnit) data.quranUnit = rt.quranUnit;
    if (rt.sedekahType) data.sedekahType = rt.sedekahType;
    if (rt.customUnit) data.customUnit = rt.customUnit;

    updateTarget.mutate(
      { id: rt.id, data: data as any },
      {
        onSuccess: () => {
          setRenamingTarget(null);
          setRenameValue("");
        },
      }
    );
  };

  const handleUpdateProgressWithDeed = async (targetId: number, incrementValue: number) => {
    if (!updateModalTarget) return;
    
    setIsSavingProgress(true);
    try {
      const isOneTimeTarget = updateModalTarget.recurrence === "oneTime";
      
      if (isOneTimeTarget) {
        const currentProgress = updateModalTarget.currentValue || 0;
        const newProgress = currentProgress + incrementValue;
        const targetTitle = getTargetDisplayTitle(updateModalTarget, t);
        
        const deedData: Parameters<typeof createDeed.mutate>[0] = {
          description: t("targets.deedCreatedFromTarget", { target: targetTitle }),
          category: updateModalTarget.category,
          points: incrementValue,
          quantity: incrementValue,
          createdAt: new Date(),
        };
        
        if (updateModalTarget.dzikirType) deedData.dzikirType = updateModalTarget.dzikirType;
        if (updateModalTarget.sholatType) deedData.sholatType = updateModalTarget.sholatType;
        if (updateModalTarget.fastingType) deedData.fastingType = updateModalTarget.fastingType;
        if (updateModalTarget.isJamaah) deedData.isJamaah = updateModalTarget.isJamaah;
        if (updateModalTarget.quranUnit) deedData.quranUnit = updateModalTarget.quranUnit as "ayat" | "halaman" | "surat" | "juz";
        if (updateModalTarget.sedekahType) deedData.sedekahType = updateModalTarget.sedekahType as "uang" | "hitungan";
        
        createDeed.mutate(deedData, {
          onSuccess: async (createdDeed) => {
            await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
            await queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
            
            const earnedPoints = createdDeed?.points ?? deedData.points;
            
            if (newProgress >= updateModalTarget.targetValue) {
              completeTarget.mutate(targetId, {
                onSuccess: async () => {
                  await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
                  await queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
                  setUpdateModalTarget(null);
                  setIsSavingProgress(false);
                  setRewardPoints(earnedPoints);
                },
                onError: async () => {
                  await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
                  await queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
                  setUpdateModalTarget(null);
                  setIsSavingProgress(false);
                  setRewardPoints(earnedPoints);
                }
              });
            } else {
              setUpdateModalTarget(null);
              setIsSavingProgress(false);
              setRewardPoints(earnedPoints);
            }
          },
          onError: async () => {
            await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
            setUpdateModalTarget(null);
            setIsSavingProgress(false);
          }
        });
      } else {
        const targetTitle = getTargetDisplayTitle(updateModalTarget, t);
        
        const deedData: Parameters<typeof createDeed.mutate>[0] = {
          description: t("targets.deedCreatedFromTarget", { target: targetTitle }),
          category: updateModalTarget.category,
          points: incrementValue,
          quantity: incrementValue,
          createdAt: new Date(),
        };
        
        if (updateModalTarget.dzikirType) deedData.dzikirType = updateModalTarget.dzikirType;
        if (updateModalTarget.sholatType) deedData.sholatType = updateModalTarget.sholatType;
        if (updateModalTarget.fastingType) deedData.fastingType = updateModalTarget.fastingType;
        if (updateModalTarget.isJamaah) deedData.isJamaah = updateModalTarget.isJamaah;
        if (updateModalTarget.quranUnit) deedData.quranUnit = updateModalTarget.quranUnit as "ayat" | "halaman" | "surat" | "juz";
        if (updateModalTarget.sedekahType) deedData.sedekahType = updateModalTarget.sedekahType as "uang" | "hitungan";
        
        createDeed.mutate(deedData, {
          onSuccess: async (createdDeed) => {
            await queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
            await queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
            setUpdateModalTarget(null);
            setIsSavingProgress(false);
            setRewardPoints(createdDeed?.points ?? deedData.points);
          },
          onError: () => {
            setIsSavingProgress(false);
          }
        });
      }
    } catch (error) {
      setIsSavingProgress(false);
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
                onOpenUpdateModal={() => setUpdateModalTarget(target)}
                onDetail={() => navigate(`/targets/${target.id}`)}
                onRename={handleOpenRename}
                t={t}
                dateLocale={dateLocale}
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
              className="bg-none bg-rose-500 text-white"
              data-testid="button-confirm-delete-target"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpdateProgressModal
        target={updateModalTarget}
        isOpen={!!updateModalTarget}
        onClose={() => setUpdateModalTarget(null)}
        onSave={handleUpdateProgressWithDeed}
        isSaving={isSavingProgress}
      />

      <PointsRewardDialog
        open={rewardPoints !== null && !showStreakDialog}
        points={rewardPoints ?? 0}
        onClose={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/streak"] });
          setShowStreakDialog(true);
        }}
      />

      <StreakDialog
        open={showStreakDialog}
        streakCount={streakData?.streakCount ?? 0}
        weekDays={streakData?.weekDays ?? [false, false, false, false, false, false, false]}
        onClose={() => {
          setShowStreakDialog(false);
          setRewardPoints(null);
        }}
      />

      <Dialog open={!!renamingTarget} onOpenChange={(open) => { if (!open) { setRenamingTarget(null); setRenameValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-rename-dialog-title">{t("targets.renameTarget")}</DialogTitle>
            <DialogDescription>{t("targets.renameTargetDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-target-input">{t("targets.targetName")}</Label>
            <Input
              id="rename-target-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              data-testid="input-rename-target"
              className="mt-2"
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setRenamingTarget(null); setRenameValue(""); }}
              data-testid="button-cancel-rename"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameValue.trim() || updateTarget.isPending}
              data-testid="button-save-rename"
            >
              {updateTarget.isPending ? t("common.saving") : t("targets.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
