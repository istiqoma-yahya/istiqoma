import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface StreakDialogProps {
  open: boolean;
  streakCount: number;
  weekDays: boolean[];
  onClose: () => void;
}

function AnimatedStreakCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setCurrent(0);
      return;
    }
    const startFrom = Math.max(0, target - 1);
    setCurrent(startFrom);
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(startFrom + eased * (target - startFrom));
      setCurrent(value);
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{current}</span>;
}

export function StreakDialog({ open, streakCount, weekDays, onClose }: StreakDialogProps) {
  const { t } = useTranslation();
  const weekDayLabels = t("streak.weekDays", { returnObjects: true }) as string[];

  const todayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  })();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="max-w-sm border-border bg-card p-0 gap-0 [&>button]:hidden"
        data-testid="dialog-streak"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{t("streak.title")}</DialogTitle>
        <div className="flex flex-col items-center text-center px-8 py-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-orange-500/15 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <Flame className="w-10 h-10 text-orange-500" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-orange-500 mb-1"
            data-testid="text-streak-count"
          >
            <AnimatedStreakCounter target={streakCount} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-6"
          >
            {t("streak.daysInARow")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            {weekDayLabels.map((label: string, index: number) => {
              const isActive = weekDays[index];
              const isToday = index === todayIndex;

              return (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <span className={`text-xs font-medium ${isToday ? "text-orange-500 font-bold" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  <motion.div
                    initial={isActive ? { scale: 0 } : { scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={isActive ? { type: "spring", damping: 10, stiffness: 300, delay: 0.6 + index * 0.08 } : {}}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-orange-500 text-white"
                        : "bg-muted text-muted-foreground"
                    } ${isToday && !isActive ? "ring-2 ring-orange-500/40" : ""}`}
                    data-testid={`streak-day-${index}`}
                  >
                    {isActive && <Check className="w-4 h-4" strokeWidth={3} />}
                  </motion.div>
                </div>
              );
            })}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-muted-foreground mb-8 leading-relaxed"
            data-testid="text-streak-message"
          >
            {t("streak.motivationalMessage")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full"
          >
            <Button
              onClick={onClose}
              className="w-full bg-orange-500 text-white font-semibold"
              data-testid="button-streak-continue"
            >
              {t("streak.continue")}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
