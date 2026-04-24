import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type TargetWithProgress } from "@shared/schema";
import { formatNumber } from "@/lib/utils";
import { Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { getTargetDisplayTitle } from "@/lib/targets";
import { useAuth } from "@/hooks/use-auth";

interface UpdateProgressModalProps {
  target: TargetWithProgress | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (targetId: number, incrementValue: number) => void;
  isSaving: boolean;
}

type ProgressMode = "quick" | "counter";

const readModeFromStorage = (key: string | null): ProgressMode => {
  if (!key) return "counter";
  try {
    const raw = localStorage.getItem(key);
    if (raw === "quick" || raw === "counter") return raw;
  } catch {
    // ignore
  }
  return "counter";
};

export function UpdateProgressModal({
  target,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const modeStorageKey = user?.id
    ? `targets:updateProgressMode:${user.id}`
    : null;
  const modeStorageKeyRef = useRef<string | null>(modeStorageKey);
  modeStorageKeyRef.current = modeStorageKey;

  const [mode, setModeState] = useState<ProgressMode>(() =>
    readModeFromStorage(modeStorageKey),
  );
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [incrementValue, setIncrementValue] = useState(1);

  useEffect(() => {
    setModeState(readModeFromStorage(modeStorageKey));
  }, [modeStorageKey]);

  useEffect(() => {
    if (isOpen) {
      const useCounterDefault =
        !!target?.dzikirType && modeRef.current === "counter";
      setIncrementValue(useCounterDefault ? 0 : 1);
    }
  }, [isOpen, target?.id, target?.dzikirType]);

  if (!target) return null;

  const isDzikirTarget = !!target.dzikirType;
  const currentProgress = target.currentValue || 0;
  const newProgress = currentProgress + incrementValue;
  const percentComplete = Math.min(
    100,
    (newProgress / target.targetValue) * 100,
  );

  const resetIncrementForCurrentMode = () => {
    const useCounterDefault =
      isDzikirTarget && modeRef.current === "counter";
    setIncrementValue(useCounterDefault ? 0 : 1);
  };

  const handleModeChange = (next: ProgressMode) => {
    setModeState(next);
    const key = modeStorageKeyRef.current;
    if (key) {
      try {
        localStorage.setItem(key, next);
      } catch {
        // ignore
      }
    }
    if (next === "quick" && incrementValue < 1) {
      setIncrementValue(1);
    }
  };

  const handleIncrement = () => setIncrementValue((prev) => prev + 1);
  const handleDecrement = () =>
    setIncrementValue((prev) => Math.max(1, prev - 1));
  const handleTap = () => setIncrementValue((prev) => prev + 1);
  const handleReset = () => setIncrementValue(0);

  const handleSave = () => {
    if (incrementValue >= 1) {
      onSave(target.id, incrementValue);
      resetIncrementForCurrentMode();
    }
  };

  const handleClose = () => {
    resetIncrementForCurrentMode();
    onClose();
  };

  const renderQuickCounter = () => (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={incrementValue <= 1}
        data-testid="button-decrement"
      >
        <Minus className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={Math.max(1, incrementValue)}
          onChange={(e) =>
            setIncrementValue(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="w-20 text-center"
          data-testid="input-increment-value"
        />
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        data-testid="button-increment"
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
        className="w-40 h-40 rounded-full flex items-center justify-center transition-all active:scale-95 bg-emerald-500/20 border-4 border-emerald-500 active:bg-emerald-500/30 hover:bg-emerald-500/25"
        data-testid="button-dzikir-tap-modal"
      >
        <span
          className="text-5xl font-bold text-emerald-500"
          data-testid="text-dzikir-tap-count"
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
        data-testid="button-dzikir-reset-modal"
      >
        <RotateCcw className="w-4 h-4" />
        {t("dzikir.reset")}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-update-progress-title">
            {t("targets.updateProgressTitle")}
          </DialogTitle>
          <DialogDescription data-testid="text-update-progress-target">
            {getTargetDisplayTitle(target, t)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isDzikirTarget ? (
            <Tabs
              value={mode}
              onValueChange={(value) => handleModeChange(value as ProgressMode)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick" data-testid="tab-mode-quick">
                  {t("targets.modeQuick")}
                </TabsTrigger>
                <TabsTrigger value="counter" data-testid="tab-mode-counter">
                  {t("dzikir.counter")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("targets.currentProgress")}:
              </span>
              <span
                className="font-medium"
                data-testid="text-current-progress"
              >
                {formatNumber(currentProgress)} /{" "}
                {formatNumber(target.targetValue)}
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                (currentProgress / target.targetValue) * 100,
              )}
              className="h-2 bg-gray-300 dark:bg-gray-600"
              data-testid="progress-current"
            />
          </div>

          {isDzikirTarget
            ? mode === "counter"
              ? renderTapCounter()
              : renderQuickCounter()
            : renderQuickCounter()}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("targets.newProgress")}:
              </span>
              <span
                className="font-medium text-emerald-600 dark:text-emerald-400"
                data-testid="text-new-progress"
              >
                {formatNumber(newProgress)} /{" "}
                {formatNumber(target.targetValue)}
              </span>
            </div>
            <Progress
              value={percentComplete}
              className="h-2 bg-gray-300 dark:bg-gray-600"
              data-testid="progress-new"
            />
            {newProgress >= target.targetValue && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">
                {t("targets.targetWillBeCompleted")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            data-testid="button-cancel-update"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || incrementValue < 1}
            data-testid="button-save-progress"
          >
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
