import { type Deed } from "@shared/schema";
import { ThumbsUp, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

interface StatsOverviewProps {
  deeds: Deed[];
}

export function StatsOverview({ deeds }: StatsOverviewProps) {
  const { t } = useTranslation();
  const totalDeeds = deeds.length;
  const totalPoints = deeds.reduce((acc, d) => acc + d.points, 0);

  const { data: streakData } = useQuery<{ streakCount: number; weekDays: boolean[] }>({
    queryKey: ["/api/streak"],
  });

  const streakCount = streakData?.streakCount ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-emerald-500/20"
        data-testid="card-stats-deeds"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ThumbsUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg">
            {totalPoints} {t('stats.points')}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground font-medium text-sm mb-0.5">{t('stats.goodDeeds')}</p>
          <h3 className="text-2xl font-bold font-display text-foreground">
            {totalDeeds}
          </h3>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 border border-orange-500/20"
        data-testid="card-stats-streak"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-lg">
            {t('streak.title')}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground font-medium text-sm mb-0.5">{t('streak.daysInARow')}</p>
          <h3 className="text-2xl font-bold font-display text-orange-500" data-testid="text-homepage-streak">
            {streakCount}
          </h3>
        </div>
      </motion.div>
    </div>
  );
}
