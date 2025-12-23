import { type Deed } from "@shared/schema";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { motion } from "framer-motion";

interface StatsOverviewProps {
  deeds: Deed[];
}

export function StatsOverview({ deeds }: StatsOverviewProps) {
  const goodDeeds = deeds.filter((d) => d.deedType === "good");
  const badDeeds = deeds.filter((d) => d.deedType === "bad");
  
  const goodPoints = goodDeeds.reduce((acc, d) => acc + d.points, 0);
  const badPoints = badDeeds.reduce((acc, d) => acc + d.points, 0);
  const netPoints = goodPoints - badPoints;

  const stats = [
    {
      label: "Good Deeds",
      value: goodDeeds.length,
      points: goodPoints,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Bad Deeds",
      value: badDeeds.length,
      points: badPoints,
      icon: TrendingDown,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
    {
      label: "Net Balance",
      value: netPoints,
      points: null, // Don't show points subtitle for net
      icon: Scale,
      color: netPoints >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400",
      bg: netPoints >= 0 ? "bg-blue-500/10" : "bg-amber-500/10",
      border: netPoints >= 0 ? "border-blue-500/20" : "border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
              <span className={`text-sm font-medium ${stat.color} bg-muted px-2 py-1 rounded-lg`}>
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
