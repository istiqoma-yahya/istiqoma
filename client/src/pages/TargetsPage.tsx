import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTargetsWithProgress, useDeleteTarget, useCompleteTarget, useUpdateTarget } from "@/hooks/use-targets";
import {
  useTargetFolders,
  useCreateTargetFolder,
  useUpdateTargetFolder,
  useDeleteTargetFolder,
  useMoveTargetToFolder,
} from "@/hooks/use-target-folders";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCustomDzikirTypes } from "@/hooks/use-dzikir-types";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { type TargetWithProgress, type TargetFolder, type CustomDzikirType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderInput,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { format, isPast, type Locale } from "date-fns";
import { id as idLocale, ms as msLocale, enUS } from "date-fns/locale";

interface TargetCardProps {
  target: TargetWithProgress;
  onOpenUpdateModal: () => void;
  onDetail: () => void;
  onRename: (target: TargetWithProgress) => void;
  onMoveToFolder: (target: TargetWithProgress) => void;
  t: (key: string, options?: Record<string, string>) => string;
  dateLocale: Locale;
  customDzikirTypes?: CustomDzikirType[];
}

function TargetCard({
  target,
  onOpenUpdateModal,
  onDetail,
  onRename,
  onMoveToFolder,
  t,
  dateLocale,
  customDzikirTypes,
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

  const percentComplete = target.percentComplete || 0;
  const isCompleted = isOneTime ? oneTimeStatus === "completed" : percentComplete >= 100;
  const canUpdate = isOneTime ? oneTimeStatus === "active" : true;

  return (
    <Card className="p-4" data-testid={`card-target-${target.id}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground flex-1 min-w-0 break-words" data-testid={`text-target-title-${target.id}`}>
            {getTargetDisplayTitle(target, t, customDzikirTypes)}
          </h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMoveToFolder(target)}
            title={t("targets.moveToFolder")}
            data-testid={`button-move-target-${target.id}`}
          >
            <FolderInput className="w-4 h-4" />
          </Button>
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
          {t("targets.categoryLabel")} {getTargetCategoryLine(target, t, customDzikirTypes)}
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

function targetCountLabel(count: number, t: (key: string, opts?: Record<string, string>) => string): string {
  if (count === 0) return t("targets.targetCountZero");
  if (count === 1) return t("targets.targetCountOne");
  return t("targets.targetCount", { count: String(count) });
}

export default function TargetsPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: targets, isLoading } = useTargetsWithProgress();
  const { data: folders } = useTargetFolders();
  const deleteTarget = useDeleteTarget();
  const completeTarget = useCompleteTarget();
  const createDeed = useCreateDeed();
  const updateTarget = useUpdateTarget();

  const createFolder = useCreateTargetFolder();
  const updateFolder = useUpdateTargetFolder();
  const deleteFolder = useDeleteTargetFolder();
  const moveTarget = useMoveTargetToFolder();
  const { data: customDzikirTypes = [] } = useCustomDzikirTypes();

  const [deletingTarget, setDeletingTarget] = useState<TargetWithProgress | null>(null);
  const [updateModalTarget, setUpdateModalTarget] = useState<TargetWithProgress | null>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [showStreakDialog, setShowStreakDialog] = useState(false);
  const [renamingTarget, setRenamingTarget] = useState<TargetWithProgress | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Folder UI state
  const { user } = useAuth();
  const collapsedStorageKey = user?.id ? `targets:collapsedFolders:${user.id}` : null;
  const collapsedStorageKeyRef = useRef<string | null>(collapsedStorageKey);
  collapsedStorageKeyRef.current = collapsedStorageKey;

  const readCollapsedFromStorage = (key: string | null): Set<number | string> => {
    if (!key) return new Set();
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed.map((v: unknown) => (typeof v === "number" ? v : String(v)))
      );
    } catch {
      return new Set();
    }
  };

  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<number | string>>(
    () => readCollapsedFromStorage(collapsedStorageKey)
  );

  // Re-hydrate when the storage key becomes available or changes (e.g. user loads).
  useEffect(() => {
    setCollapsedFolderIds(readCollapsedFromStorage(collapsedStorageKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedStorageKey]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderNameValue, setFolderNameValue] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<TargetFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<TargetFolder | null>(null);
  const [movingTarget, setMovingTarget] = useState<TargetWithProgress | null>(null);
  const [pendingFolderId, setPendingFolderId] = useState<number | null>(null);

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

  const folderList = folders ?? [];
  const targetsArray = targets ?? [];

  const groupedTargets = useMemo(() => {
    const byFolder = new Map<number, TargetWithProgress[]>();
    const ungrouped: TargetWithProgress[] = [];
    for (const target of targetsArray) {
      if (target.folderId == null) {
        ungrouped.push(target);
      } else {
        const list = byFolder.get(target.folderId) ?? [];
        list.push(target);
        byFolder.set(target.folderId, list);
      }
    }
    return { byFolder, ungrouped };
  }, [targetsArray]);

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

  const toggleFolderCollapsed = (key: number | string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      const storageKey = collapsedStorageKeyRef.current;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // Ignore storage errors (quota, private mode, etc.)
        }
      }
      return next;
    });
  };

  const handleCreateFolder = () => {
    const trimmed = folderNameValue.trim();
    if (!trimmed) return;
    createFolder.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setCreatingFolder(false);
          setFolderNameValue("");
          toast({ title: t("targets.folderCreated") });
        },
      }
    );
  };

  const handleRenameFolder = () => {
    if (!renamingFolder) return;
    const trimmed = folderNameValue.trim();
    if (!trimmed) return;
    updateFolder.mutate(
      { id: renamingFolder.id, data: { name: trimmed } },
      {
        onSuccess: () => {
          setRenamingFolder(null);
          setFolderNameValue("");
          toast({ title: t("targets.folderRenamed") });
        },
      }
    );
  };

  const handleDeleteFolder = () => {
    if (!deletingFolder) return;
    deleteFolder.mutate(deletingFolder.id, {
      onSuccess: () => {
        setDeletingFolder(null);
        toast({ title: t("targets.folderDeleted") });
      },
    });
  };

  const handleMoveTarget = () => {
    if (!movingTarget) return;
    moveTarget.mutate(
      { targetId: movingTarget.id, folderId: pendingFolderId },
      {
        onSuccess: () => {
          setMovingTarget(null);
          toast({ title: t("targets.targetMoved") });
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
        if (updateModalTarget.customUnit) deedData.customUnit = updateModalTarget.customUnit;
        
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
        if (updateModalTarget.customUnit) deedData.customUnit = updateModalTarget.customUnit;
        
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

  const renderTargetCard = (target: TargetWithProgress) => (
    <TargetCard
      key={target.id}
      target={target}
      onOpenUpdateModal={() => setUpdateModalTarget(target)}
      onDetail={() => navigate(`/targets/${target.id}`)}
      onRename={handleOpenRename}
      onMoveToFolder={(t2) => { setMovingTarget(t2); setPendingFolderId(t2.folderId ?? null); }}
      t={t}
      dateLocale={dateLocale}
      customDzikirTypes={customDzikirTypes}
    />
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <header className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-targets-title">
            {t("targets.title")}
          </h1>
          <ThemeToggle />
        </header>

        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("targets.subtitle")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => { setCreatingFolder(true); setFolderNameValue(""); }}
              data-testid="button-new-folder"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              {t("targets.newFolder")}
            </Button>
            <Button onClick={() => navigate("/targets/new")} data-testid="button-add-target">
              <Plus className="w-4 h-4 mr-1" />
              {t("targets.addTarget")}
            </Button>
          </div>
        </div>

        {targetsArray.length === 0 && folderList.length === 0 ? (
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
            {folderList.map((folder) => {
              const folderTargets = groupedTargets.byFolder.get(folder.id) ?? [];
              const isCollapsed = collapsedFolderIds.has(folder.id);
              return (
                <Collapsible
                  key={folder.id}
                  open={!isCollapsed}
                  onOpenChange={(open) => {
                    if (!open) toggleFolderCollapsed(folder.id);
                    else if (isCollapsed) toggleFolderCollapsed(folder.id);
                  }}
                  className="rounded-lg border bg-card"
                  data-testid={`folder-${folder.id}`}
                >
                  <div className="flex items-center gap-1 p-3">
                    <CollapsibleTrigger
                      className="flex flex-1 items-center gap-2 text-left rounded hover-elevate active-elevate-2 px-2 py-1 -mx-2 -my-1 min-w-0"
                      data-testid={`button-toggle-folder-${folder.id}`}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                      )}
                      {isCollapsed ? (
                        <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-semibold truncate" data-testid={`text-folder-name-${folder.id}`}>
                        {folder.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-folder-count-${folder.id}`}>
                        {targetCountLabel(folderTargets.length, t)}
                      </span>
                    </CollapsibleTrigger>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setRenamingFolder(folder); setFolderNameValue(folder.name); }}
                      title={t("targets.renameFolder")}
                      data-testid={`button-rename-folder-${folder.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingFolder(folder)}
                      title={t("targets.deleteFolder")}
                      data-testid={`button-delete-folder-${folder.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3">
                      {folderTargets.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic px-1">
                          {t("targets.targetCountZero")}
                        </p>
                      ) : (
                        folderTargets.map(renderTargetCard)
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {groupedTargets.ungrouped.length > 0 && (
              folderList.length === 0 ? (
                <div className="space-y-4" data-testid="section-ungrouped-flat">
                  {groupedTargets.ungrouped.map(renderTargetCard)}
                </div>
              ) : (
                <Collapsible
                  key="ungrouped"
                  open={!collapsedFolderIds.has("ungrouped")}
                  onOpenChange={(open) => {
                    if (!open) toggleFolderCollapsed("ungrouped");
                    else if (collapsedFolderIds.has("ungrouped")) toggleFolderCollapsed("ungrouped");
                  }}
                  className="rounded-lg border bg-card"
                  data-testid="folder-ungrouped"
                >
                  <div className="flex items-center gap-1 p-3">
                    <CollapsibleTrigger
                      className="flex flex-1 items-center gap-2 text-left rounded hover-elevate active-elevate-2 px-2 py-1 -mx-2 -my-1 min-w-0"
                      data-testid="button-toggle-folder-ungrouped"
                    >
                      {collapsedFolderIds.has("ungrouped") ? (
                        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                      )}
                      <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="font-semibold truncate">{t("targets.ungrouped")}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {targetCountLabel(groupedTargets.ungrouped.length, t)}
                      </span>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3">
                      {groupedTargets.ungrouped.map(renderTargetCard)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            )}
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

      {/* Create folder dialog */}
      <Dialog
        open={creatingFolder}
        onOpenChange={(open) => { if (!open) { setCreatingFolder(false); setFolderNameValue(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("targets.createFolder")}</DialogTitle>
            <DialogDescription>{t("targets.createFolderDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="create-folder-input">{t("targets.folderName")}</Label>
            <Input
              id="create-folder-input"
              value={folderNameValue}
              onChange={(e) => setFolderNameValue(e.target.value)}
              placeholder={t("targets.folderNamePlaceholder")}
              data-testid="input-create-folder"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setCreatingFolder(false); setFolderNameValue(""); }}
              data-testid="button-cancel-create-folder"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!folderNameValue.trim() || createFolder.isPending}
              data-testid="button-confirm-create-folder"
            >
              {createFolder.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog
        open={!!renamingFolder}
        onOpenChange={(open) => { if (!open) { setRenamingFolder(null); setFolderNameValue(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("targets.renameFolder")}</DialogTitle>
            <DialogDescription>{t("targets.renameFolderDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-folder-input">{t("targets.folderName")}</Label>
            <Input
              id="rename-folder-input"
              value={folderNameValue}
              onChange={(e) => setFolderNameValue(e.target.value)}
              data-testid="input-rename-folder"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameFolder(); }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setRenamingFolder(null); setFolderNameValue(""); }}
              data-testid="button-cancel-rename-folder"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={!folderNameValue.trim() || updateFolder.isPending}
              data-testid="button-confirm-rename-folder"
            >
              {updateFolder.isPending ? t("common.saving") : t("targets.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation */}
      <AlertDialog
        open={!!deletingFolder}
        onOpenChange={(open) => { if (!open) setDeletingFolder(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("targets.deleteFolderConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("targets.deleteFolderWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-folder">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-none bg-rose-500 text-white"
              data-testid="button-confirm-delete-folder"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move target to folder dialog */}
      <Dialog open={!!movingTarget} onOpenChange={(open) => { if (!open) setMovingTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("targets.moveToFolder")}</DialogTitle>
            <DialogDescription>{t("targets.moveToFolderDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1 max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => setPendingFolderId(null)}
              disabled={moveTarget.isPending}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded hover-elevate active-elevate-2 ${
                pendingFolderId == null ? "bg-accent" : ""
              }`}
              data-testid="button-move-to-no-folder"
            >
              <Folder className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">{t("targets.noFolder")}</span>
              {pendingFolderId == null && (
                <span className="text-xs text-muted-foreground">✓</span>
              )}
            </button>
            {folderList.map((folder) => {
              const isSelected = pendingFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setPendingFolderId(folder.id)}
                  disabled={moveTarget.isPending}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded hover-elevate active-elevate-2 ${
                    isSelected ? "bg-accent" : ""
                  }`}
                  data-testid={`button-move-to-folder-${folder.id}`}
                >
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  {isSelected && <span className="text-xs text-muted-foreground">✓</span>}
                </button>
              );
            })}
            {folderList.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">
                {t("targets.createFolderDesc")}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMovingTarget(null)}
              data-testid="button-cancel-move-target"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleMoveTarget}
              disabled={pendingFolderId === (movingTarget?.folderId ?? null) || moveTarget.isPending}
              data-testid="button-confirm-move-target"
            >
              {moveTarget.isPending ? t("common.saving") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
