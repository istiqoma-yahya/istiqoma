import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { BookOpen, Star, CalendarDays, TrendingUp, Sparkles } from "lucide-react";

interface DeedEntry {
  date: string;
  count: number;
  [key: string]: string | number;
}

interface CategoryEntry {
  name: string;
  value: number;
}

interface ProgressSummaryProps {
  totalDeeds: number;
  dateRange: string;
  categoryData: CategoryEntry[];
  deedsOverTime: DeedEntry[];
  totalDays: number;
}

export function ProgressSummary({
  totalDeeds,
  dateRange,
  categoryData,
  deedsOverTime,
  totalDays,
}: ProgressSummaryProps) {
  const { t } = useTranslation();

  const insights = useMemo(() => {
    const topCategory = categoryData.length > 0
      ? categoryData.reduce((a, b) => (a.value >= b.value ? a : b))
      : null;

    const mostActiveDay = deedsOverTime.length > 0
      ? deedsOverTime.reduce((a, b) => (a.count >= b.count ? a : b))
      : null;

    const activeDays = deedsOverTime.filter(d => d.count > 0).length;
    const consistencyPercent = totalDays > 0
      ? Math.round((activeDays / totalDays) * 100)
      : 0;

    const periodKey = {
      week: "summary.periodWeek",
      month: "summary.periodMonth",
      quarter: "summary.periodQuarter",
      year: "summary.periodYear",
    }[dateRange] ?? "summary.periodMonth";

    return {
      topCategory,
      mostActiveDay,
      activeDays,
      consistencyPercent,
      period: t(`progress.${periodKey}`),
    };
  }, [categoryData, deedsOverTime, totalDays, dateRange, t]);

  const motivationKey = insights.consistencyPercent >= 70
    ? "progress.summary.motivationHigh"
    : insights.consistencyPercent >= 40
    ? "progress.summary.motivationMedium"
    : "progress.summary.motivationLow";

  const items = useMemo(() => {
    if (totalDeeds === 0) return [];

    const list: { icon: React.ReactNode; text: string }[] = [];

    list.push({
      icon: <BookOpen className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
      text: t("progress.summary.totalDeeds", {
        count: totalDeeds,
        period: insights.period,
      }),
    });

    if (insights.topCategory) {
      list.push({
        icon: <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />,
        text: t("progress.summary.topCategory", {
          category: insights.topCategory.name,
          count: insights.topCategory.value,
        }),
      });
    }

    if (insights.mostActiveDay && insights.mostActiveDay.count > 0) {
      list.push({
        icon: <CalendarDays className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />,
        text: t("progress.summary.mostActiveDay", {
          day: insights.mostActiveDay.date,
          count: insights.mostActiveDay.count,
        }),
      });
    }

    list.push({
      icon: <TrendingUp className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />,
      text: t("progress.summary.consistency", {
        activeDays: insights.activeDays,
        totalDays,
        percent: insights.consistencyPercent,
      }),
    });

    return list;
  }, [totalDeeds, insights, totalDays, t]);

  return (
    <Card className="p-6 bg-emerald-500/5 border-emerald-500/15">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h2 className="text-base font-display font-bold">{t("progress.summary.title")}</h2>
      </div>

      {totalDeeds === 0 ? (
        <p className="text-sm text-muted-foreground">{t("progress.summary.noData")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2.5 text-sm text-foreground/90">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}

          <div className="pt-3 mt-1 border-t border-border">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t(motivationKey)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
