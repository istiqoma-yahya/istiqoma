import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface PointsRewardDialogProps {
  open: boolean;
  points: number;
  onClose: () => void;
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setCurrent(target);
      return;
    }
    setCurrent(0);
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      setCurrent(value);
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>+{current}</span>;
}

export function PointsRewardDialog({ open, points, onClose }: PointsRewardDialogProps) {
  const { t } = useTranslation();

  if (points <= 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="max-w-sm border-border bg-card p-0 gap-0 [&>button]:hidden"
        data-testid="dialog-points-reward"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{t("reward.continue")}</DialogTitle>
        <div className="flex flex-col items-center text-center px-8 py-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Gem className="w-10 h-10 text-emerald-500" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-emerald-500 mb-1"
            data-testid="text-reward-points"
          >
            <AnimatedCounter target={points} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-5"
          >
            {t("stats.points")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-base text-muted-foreground mb-8 leading-relaxed"
            data-testid="text-reward-message"
          >
            {t("reward.congratsMessage")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            <Button
              onClick={onClose}
              className="w-full bg-emerald-500 text-white font-semibold"
              data-testid="button-reward-continue"
            >
              {t("reward.continue")}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
