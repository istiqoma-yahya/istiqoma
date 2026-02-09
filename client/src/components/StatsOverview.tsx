import { type Deed } from "@shared/schema";
import { ThumbsUp, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";

interface StatsOverviewProps {
  deeds: Deed[];
}

export function StatsOverview({ deeds }: StatsOverviewProps) {
  const { t } = useTranslation();
  const totalDeeds = deeds.length;
  const totalPoints = deeds.reduce((acc, d) => acc + d.points, 0);

  const { data: streakData } = useQuery<{ streakCount: number; weekDays: boolean[]; hasActivityToday: boolean }>({
    queryKey: ["/api/streak"],
  });

  const streakCount = streakData?.streakCount ?? 0;
  const hasActivityToday = streakData?.hasActivityToday ?? true;

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
            {formatNumber(totalPoints)} {t('stats.points')}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground font-medium text-sm mb-0.5">{t('stats.goodDeeds')}</p>
          <h3 className="text-2xl font-bold font-display text-foreground">
            {formatNumber(totalDeeds)}
          </h3>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`glass-card p-5 border ${hasActivityToday ? "border-orange-500/20" : "border-gray-400/20"}`}
        data-testid="card-stats-streak"
      >
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl relative ${hasActivityToday ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "bg-gray-400/10 text-gray-400 dark:text-gray-500"}`}>
            <Flame className="w-5 h-5" />
            {!hasActivityToday && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-[9px] font-bold leading-none">!</span>
              </div>
            )}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${hasActivityToday ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400"}`}>
            {t('streak.title')}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground font-medium text-sm mb-0.5">{t('streak.daysInARow')}</p>
          <h3 className={`text-2xl font-bold font-display ${hasActivityToday ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`} data-testid="text-homepage-streak">
            {formatNumber(streakCount)}
          </h3>
        </div>
      </motion.div>
    </div>
  );
}
