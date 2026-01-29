import { type Deed } from "@shared/schema";
import { ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface StatsOverviewProps {
  deeds: Deed[];
}

export function StatsOverview({ deeds }: StatsOverviewProps) {
  const { t } = useTranslation();
  const totalDeeds = deeds.length;
  const totalPoints = deeds.reduce((acc, d) => acc + d.points, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 border border-emerald-500/20 mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ThumbsUp className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg">
          {totalPoints} {t('stats.points')}
        </span>
      </div>
      <div>
        <p className="text-muted-foreground font-medium mb-1">{t('stats.goodDeeds')}</p>
        <h3 className="text-3xl font-bold font-display text-foreground">
          {totalDeeds}
        </h3>
      </div>
    </motion.div>
  );
}
