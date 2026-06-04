import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Mic } from "lucide-react";

interface RecordDeedChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (mode: "text" | "voice") => void;
}

export function RecordDeedChooserDialog({
  open,
  onOpenChange,
  onChoose,
}: RecordDeedChooserDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-popover border-border text-popover-foreground sm:max-w-md"
        data-testid="dialog-record-deed-chooser"
      >
        <DialogHeader>
          <DialogTitle>{t("recordChooser.title")}</DialogTitle>
          <DialogDescription>{t("recordChooser.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onChoose("text")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-5 hover:border-emerald-500/60 hover:bg-muted/50 active:scale-[0.98] transition-all"
            data-testid="button-record-mode-text"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Keyboard className="w-6 h-6" />
            </div>
            <div className="font-medium">{t("recordChooser.text")}</div>
            <p className="text-xs text-muted-foreground text-center">
              {t("recordChooser.textHint")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChoose("voice")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-5 hover:border-emerald-500/60 hover:bg-muted/50 active:scale-[0.98] transition-all"
            data-testid="button-record-mode-voice"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div className="font-medium">{t("recordChooser.voice")}</div>
            <p className="text-xs text-muted-foreground text-center">
              {t("recordChooser.voiceHint")}
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
