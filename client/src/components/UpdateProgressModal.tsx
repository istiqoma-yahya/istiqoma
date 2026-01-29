import { useState } from "react";
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
import { type TargetWithProgress } from "@shared/schema";
import { Plus, Minus, Loader2 } from "lucide-react";
import { getTargetDisplayTitle } from "@/lib/targets";

interface UpdateProgressModalProps {
  target: TargetWithProgress | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (targetId: number, incrementValue: number) => void;
  isSaving: boolean;
}

export function UpdateProgressModal({
  target,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const [incrementValue, setIncrementValue] = useState(1);

  if (!target) return null;

  const isOneTime = target.recurrence === "oneTime";
  const currentProgress = isOneTime 
    ? (target.manualProgress || target.currentValue || 0)
    : (target.currentValue || 0);
  const newProgress = currentProgress + incrementValue;
  const percentComplete = Math.min(100, (newProgress / target.targetValue) * 100);

  const handleIncrement = () => {
    setIncrementValue((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setIncrementValue((prev) => Math.max(1, prev - 1));
  };

  const handleSave = () => {
    if (incrementValue > 0) {
      onSave(target.id, incrementValue);
      setIncrementValue(1);
    }
  };

  const handleClose = () => {
    setIncrementValue(1);
    onClose();
  };

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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("targets.currentProgress")}:</span>
              <span className="font-medium" data-testid="text-current-progress">
                {currentProgress} / {target.targetValue}
              </span>
            </div>
            <Progress 
              value={Math.min(100, (currentProgress / target.targetValue) * 100)} 
              className="h-2 bg-gray-300 dark:bg-gray-600"
              data-testid="progress-current"
            />
          </div>

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
                value={incrementValue}
                onChange={(e) => setIncrementValue(Math.max(1, parseInt(e.target.value) || 1))}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("targets.newProgress")}:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-new-progress">
                {newProgress} / {target.targetValue}
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
