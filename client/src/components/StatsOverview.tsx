import { type Deed } from "@shared/schema";
import { ThumbsUp, Flame, Snowflake } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StatsOverviewProps {
  deeds: Deed[];
}

export function StatsOverview({ deeds }: StatsOverviewProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const totalDeeds = deeds.length;
  // Fallback only — once /api/streak-freezer resolves we use the canonical
  // available balance (earned − spent). This keeps the dashboard consistent
  // with the freezer page so spent points don't appear to "disappear" later.
  const earnedPoints = deeds.reduce((acc, d) => acc + d.points, 0);

  const { data: streakData } = useQuery<{
    streakCount: number;
    weekDays: boolean[];
    hasActivityToday: boolean;
    frozenDays: boolean[];
    newlyFrozenDates?: string[];
  }>({
    queryKey: ["/api/streak"],
  });

  // Surface a one-time toast whenever /api/streak reports freezers it
  // consumed during the current walk. We dedupe per (browser session, date)
  // via sessionStorage so navigating between pages doesn't re-fire it, while
  // still allowing the user to see it again after a hard reload.
  useEffect(() => {
    const dates = streakData?.newlyFrozenDates ?? [];
    if (dates.length === 0) return;
    const STORAGE_KEY = "amalin:notified-frozen-dates";
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      seen = [];
    }
    const fresh = dates.filter((d) => !seen.includes(d));
    if (fresh.length === 0) return;
    toast({
      title: t("streakFreezer.autoConsumedToastTitle", { count: fresh.length }),
      description: t("streakFreezer.autoConsumedToastDescription", {
        count: fresh.length,
        dates: fresh.join(", "),
      }),
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, ...fresh]));
    } catch {
      // sessionStorage is best-effort; ignore quota / privacy-mode failures.
    }
  }, [streakData?.newlyFrozenDates, toast, t]);

  const { data: freezerData } = useQuery<{
    freezer: { owned: number; used: number; available: number };
    points: { earned: number; spent: number; available: number };
  }>({
    queryKey: ["/api/streak-freezer"],
  });

  const streakCount = streakData?.streakCount ?? 0;
  const hasActivityToday = streakData?.hasActivityToday ?? true;
  const availablePoints = freezerData?.points.available ?? earnedPoints;
  const freezerAvailable = freezerData?.freezer.available ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/5 transition-colors"
        data-testid="card-stats-deeds"
        onClick={() => navigate("/deeds")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/deeds"); } }}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ThumbsUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg" data-testid="text-stats-points">
            {formatNumber(availablePoints)} {t('stats.points')}
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
        className={`glass-card p-5 border cursor-pointer hover:bg-muted/30 transition-colors ${hasActivityToday ? "border-orange-500/20" : "border-gray-400/20"}`}
        data-testid="card-stats-streak"
        onClick={() => navigate("/streak")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/streak"); } }}
        role="button"
        tabIndex={0}
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
          <button
            type="button"
            className="text-xs font-medium px-2 py-0.5 rounded-lg flex items-center gap-1 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
            data-testid="chip-stats-freezer"
            title={t('streakFreezer.chipTooltip')}
            onClick={(e) => { e.stopPropagation(); navigate("/streak-freezer"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }}
          >
            <Snowflake className="w-3 h-3" />
            {formatNumber(freezerAvailable)}
          </button>
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
