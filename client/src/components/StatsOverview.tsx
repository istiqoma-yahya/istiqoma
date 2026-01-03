import { type Deed } from "@shared/schema";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface StatsOverviewProps {
  deeds: Deed[];
}

export function StatsOverview({ deeds }: StatsOverviewProps) {
  const { t } = useTranslation();
  const goodDeeds = deeds.filter((d) => d.deedType === "good");
  const badDeeds = deeds.filter((d) => d.deedType === "bad");
  const istighfarDeeds = deeds.filter((d) => d.dzikirType === "istighfar");
  
  const goodPoints = goodDeeds.reduce((acc, d) => acc + d.points, 0);
  const rawBadPoints = badDeeds.reduce((acc, d) => acc + d.points, 0);
  const istighfarPoints = istighfarDeeds.reduce((acc, d) => acc + d.points, 0);
  const badPoints = Math.max(0, rawBadPoints - istighfarPoints);

  const stats = [
    {
      label: t('stats.goodDeeds'),
      value: goodDeeds.length,
      points: goodPoints,
      icon: ThumbsUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      pointsBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: t('stats.badDeeds'),
      value: badDeeds.length,
      points: badPoints,
      icon: ThumbsDown,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      pointsBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`glass-card p-6 border ${stat.border}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            {stat.points !== null && (
              <span className={`text-sm font-medium ${stat.pointsBg} px-2 py-1 rounded-lg`}>
                {stat.points} pts
              </span>
            )}
          </div>
          <div>
            <p className="text-muted-foreground font-medium mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold font-display text-foreground">
              {stat.value}
            </h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
