import { useState, useMemo } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useDeeds } from "@/hooks/use-deeds";
import { useCategoryName } from "@/hooks/use-categories";
import { useDzikirTypeName } from "@/hooks/use-dzikir-types";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Loader2, Filter } from "lucide-react";
import { ProgressSummary } from "@/components/ProgressSummary";
import { format, subDays, subMonths, subYears, eachDayOfInterval } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProgressPage() {
  const { t, i18n } = useTranslation();
  usePageMeta({
    title: t("seo.progress.title"),
    description: t("seo.progress.description"),
    locale: i18n.language?.split("-")[0] ?? "en",
    canonicalPath: "/progress",
  });
  const { data: deeds, isLoading } = useDeeds();
  const { theme } = useTheme();
  const translateCategoryName = useCategoryName();
  const translateDzikirType = useDzikirTypeName();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");
  
  // Calculate date range bounds
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (dateRange) {
      case "week":
        start = subDays(now, 7);
        break;
      case "month":
        start = subDays(now, 30);
        break;
      case "quarter":
        start = subMonths(now, 3);
        break;
      case "year":
        start = subYears(now, 1);
        break;
      default:
        start = subDays(now, 30);
    }
    
    return { start, end: now };
  }, [dateRange]);
  
  // Theme-aware chart colors
  const isDark = theme === "dark";
  const axisColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
  const tooltipLabelColor = isDark ? "#fff" : "#1e293b";
  const tooltipItemColor = isDark ? "#e2e8f0" : "#475569";
  const cursorFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  const deedsArray = deeds || [];

  // Filter categories and subcategories
  const categories = useMemo(() => {
    const set = new Set<string>();
    deedsArray.forEach(d => set.add(d.category));
    return Array.from(set).sort();
  }, [deedsArray]);

  const subCategories = useMemo(() => {
    if (selectedCategory === "all") return [];
    const set = new Set<string>();
    deedsArray
      .filter(d => d.category === selectedCategory)
      .forEach(d => {
        if (d.dzikirType) set.add(`dzikir:${d.dzikirType}`);
        if (d.sholatType) set.add(`sholat:${d.sholatType}`);
        if (d.fastingType) set.add(`fasting:${d.fastingType}`);
        if (d.quranUnit) set.add(`quran:${d.quranUnit}`);
        if (d.sedekahType) set.add(`sedekah:${d.sedekahType}`);
      });
    return Array.from(set).sort();
  }, [deedsArray, selectedCategory]);

  const filteredDeeds = useMemo(() => {
    return deedsArray.filter(deed => {
      const categoryMatch = selectedCategory === "all" || deed.category === selectedCategory;
      if (!categoryMatch) return false;
      
      if (selectedSubCategory === "all") return true;
      
      const [type, value] = selectedSubCategory.split(":");
      if (type === "dzikir") return deed.dzikirType === value;
      if (type === "sholat") return deed.sholatType === value;
      if (type === "fasting") return deed.fastingType === value;
      if (type === "quran") return deed.quranUnit === value;
      if (type === "sedekah") return deed.sedekahType === value;
      
      return true;
    });
  }, [deedsArray, selectedCategory, selectedSubCategory]);

  // Category breakdown - computed inside useMemo after dateFilteredDeeds is available
  // (placeholder - will be recalculated after dateFilteredDeeds)
  const categoryListFromDeeds = useMemo(() => {
    const set = new Set<string>();
    deedsArray.forEach(d => set.add(translateCategoryName(d.category)));
    return Array.from(set).sort();
  }, [deedsArray, translateCategoryName]);

  // Get unique categories for "all" filter breakdown
  const categoryList = categoryListFromDeeds;

  // Filter deeds by date range first
  const dateFilteredDeeds = useMemo(() => {
    return filteredDeeds.filter(deed => {
      const createdAt = typeof deed.createdAt === 'string' ? new Date(deed.createdAt) : (deed.createdAt || new Date());
      return createdAt >= dateRangeBounds.start && createdAt <= dateRangeBounds.end;
    });
  }, [filteredDeeds, dateRangeBounds]);

  // Calculate total stats based on date range
  const totalDeeds = dateFilteredDeeds.length;

  // Category breakdown based on date range
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    dateFilteredDeeds.forEach((deed) => {
      let breakdownKey = deed.category;
      
      if (selectedCategory !== "all") {
        if (deed.dzikirType) breakdownKey = translateDzikirType(deed.dzikirType);
        else if (deed.sholatType) breakdownKey = t(`sholat.types.${deed.sholatType}`);
        else if (deed.fastingType) breakdownKey = t(`fasting.types.${deed.fastingType}`);
        else if (deed.quranUnit) breakdownKey = t(`quran.units.${deed.quranUnit}`);
        else if (deed.sedekahType) breakdownKey = t(`sedekah.types.${deed.sedekahType}`);
        else breakdownKey = translateCategoryName(deed.category);
      } else {
        breakdownKey = translateCategoryName(deed.category);
      }

      const current = categoryMap.get(breakdownKey) || 0;
      categoryMap.set(breakdownKey, current + 1);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [dateFilteredDeeds, selectedCategory, t, translateCategoryName, translateDzikirType]);

  // Deeds count over time (daily) - tracks number of deeds, not points
  const deedsOverTime = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRangeBounds.start, end: dateRangeBounds.end });

    // Determine what to track based on filter
    let trackingSubCategories: string[] = [];
    let trackingCategories: string[] = [];
    
    if (selectedCategory === "all") {
      const set = new Set<string>();
      dateFilteredDeeds.forEach(d => set.add(translateCategoryName(d.category)));
      trackingCategories = Array.from(set).sort();
    } else {
      const set = new Set<string>();
      dateFilteredDeeds.forEach(d => {
        if (d.dzikirType) set.add(translateDzikirType(d.dzikirType));
        else if (d.sholatType) set.add(t(`sholat.types.${d.sholatType}`));
        else if (d.fastingType) set.add(t(`fasting.types.${d.fastingType}`));
        else if (d.quranUnit) set.add(t(`quran.units.${d.quranUnit}`));
        else if (d.sedekahType) set.add(t(`sedekah.types.${d.sedekahType}`));
      });
      trackingSubCategories = Array.from(set).sort();
    }

    const data = days.map((day) => {
      const dayDeeds = dateFilteredDeeds.filter((d) => {
        const createdAt = typeof d.createdAt === 'string' ? new Date(d.createdAt) : (d.createdAt || new Date());
        return (
          createdAt.getDate() === day.getDate() &&
          createdAt.getMonth() === day.getMonth() &&
          createdAt.getFullYear() === day.getFullYear()
        );
      });

      const dayCount = dayDeeds.length;
      
      const res: any = {
        date: format(day, "MMM d"),
        count: dayCount,
      };

      // Add count per category if tracking categories (when "all" is selected)
      if (trackingCategories.length > 0) {
        trackingCategories.forEach(cat => {
          res[cat] = dayDeeds.filter(d => translateCategoryName(d.category) === cat).length;
        });
      }

      // Add count per sub-category if tracking (when specific category is selected)
      if (trackingSubCategories.length > 0) {
        trackingSubCategories.forEach(sub => {
          res[sub] = dayDeeds.filter(d => {
            let label = "";
            if (d.dzikirType) label = translateDzikirType(d.dzikirType);
            else if (d.sholatType) label = t(`sholat.types.${d.sholatType}`);
            else if (d.fastingType) label = t(`fasting.types.${d.fastingType}`);
            else if (d.quranUnit) label = t(`quran.units.${d.quranUnit}`);
            else if (d.sedekahType) label = t(`sedekah.types.${d.sedekahType}`);
            return label === sub;
          }).length;
        });
      }

      return res;
    });

    // Filter out empty days at the end
    return data.filter(
      (_, index, arr) =>
        arr.slice(index).some((d) => d.count !== 0)
    );
  }, [dateFilteredDeeds, dateRangeBounds, selectedCategory, t, translateCategoryName, translateDzikirType]);

  const subCategoryList = useMemo(() => {
    if (selectedCategory === "all") return [];
    const set = new Set<string>();
    dateFilteredDeeds.forEach(d => {
      if (d.dzikirType) set.add(translateDzikirType(d.dzikirType));
      else if (d.sholatType) set.add(t(`sholat.types.${d.sholatType}`));
      else if (d.fastingType) set.add(t(`fasting.types.${d.fastingType}`));
      else if (d.quranUnit) set.add(t(`quran.units.${d.quranUnit}`));
      else if (d.sedekahType) set.add(t(`sedekah.types.${d.sedekahType}`));
    });
    return Array.from(set).sort();
  }, [dateFilteredDeeds, selectedCategory, t, translateDzikirType]);

  const COLORS = [
    "#10b981",
    "#f87171",
    "#fbbf24",
    "#60a5fa",
    "#a78bfa",
    "#34d399",
    "#fb7185",
    "#fdba74",
    "#93c5fd",
    "#ddd6fe",
    "#6ee7b7",
    "#fca5a5",
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground pb-20">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="font-display font-bold text-xl">{t("progress.spiritualProgress")}</h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="container max-w-5xl mx-auto px-4 py-8">
          {deedsArray.length === 0 ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed">
              <h3 className="text-lg font-medium mb-2">{t("progress.noData")}</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("progress.noDataDesc")}
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Filters */}
              <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Filter className="w-4 h-4" />
                    <span>{t("common.filter")}</span>
                  </div>
                  
                  <div className="flex flex-row flex-wrap gap-4 w-full sm:w-auto flex-1">
                    {/* Date Range Filter */}
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-full sm:w-[160px] bg-background" data-testid="select-date-range">
                        <SelectValue placeholder={t("progress.dateRange")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">{t("progress.lastWeek")}</SelectItem>
                        <SelectItem value="month">{t("progress.lastMonth")}</SelectItem>
                        <SelectItem value="quarter">{t("progress.lastQuarter")}</SelectItem>
                        <SelectItem value="year">{t("progress.lastYear")}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Category Filter */}
                    <Select 
                      value={selectedCategory} 
                      onValueChange={(val) => {
                        setSelectedCategory(val);
                        setSelectedSubCategory("all");
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[180px] bg-background" data-testid="select-category">
                        <SelectValue placeholder={t("deed.category")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.allCategories")}</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {translateCategoryName(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedCategory !== "all" && subCategories.length > 0 && (
                      <Select 
                        value={selectedSubCategory} 
                        onValueChange={setSelectedSubCategory}
                      >
                        <SelectTrigger className="w-full sm:w-[180px] bg-background" data-testid="select-subcategory">
                          <SelectValue placeholder={t("deed.type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.allSubCategories")}</SelectItem>
                          {subCategories.map(sub => {
                            const [type, value] = sub.split(":");
                            let label = value;
                            if (type === "dzikir") label = translateDzikirType(value);
                            if (type === "sholat") label = t(`sholat.types.${value}`);
                            if (type === "fasting") label = t(`fasting.types.${value}`);
                            if (type === "quran") label = t(`quran.units.${value}`);
                            if (type === "sedekah") label = t(`sedekah.types.${value}`);
                            
                            return (
                              <SelectItem key={sub} value={sub}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </Card>

              {/* Summary Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display font-bold mb-2">
                      {t("stats.goodDeeds")}
                    </h2>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {totalDeeds} {t("progress.deeds")}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Progress Summary Insights */}
              <ProgressSummary
                totalDeeds={totalDeeds}
                dateRange={dateRange}
                categoryData={categoryData}
                deedsOverTime={deedsOverTime}
                totalDays={deedsOverTime.length > 0 ? deedsOverTime.length : 1}
              />

              {/* Deeds Over Time */}
              {deedsOverTime.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-display font-bold mb-6">
                    {t("progress.deedsOverTime")}
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={deedsOverTime} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" stroke={axisColor} />
                      <YAxis stroke={axisColor} width={50} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${tooltipBorder}`,
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: tooltipLabelColor, fontWeight: "bold" }}
                        itemStyle={{ color: tooltipItemColor }}
                      />
                      <Legend />
                      {selectedCategory === "all" && categoryList.length > 0 ? (
                        categoryList.map((cat, index) => (
                          <Line
                            key={`deeds-${cat}`}
                            type="monotone"
                            dataKey={cat}
                            stroke={COLORS[index % COLORS.length]}
                            name={cat}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))
                      ) : subCategoryList.length > 0 ? (
                        subCategoryList.map((sub, index) => (
                          <Line
                            key={`deeds-${sub}`}
                            type="monotone"
                            dataKey={sub}
                            stroke={COLORS[index % COLORS.length]}
                            name={sub}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))
                      ) : (
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#60a5fa"
                          name={t("progress.count")}
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Category Breakdown */}
              {categoryData.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-display font-bold mb-6">
                    {t("progress.deedsByCategory")}
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value}`
                        }
                        outerRadius={100}
                        fill="#10b981"
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${tooltipBorder}`,
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: tooltipLabelColor, fontWeight: "bold" }}
                        itemStyle={{ color: tooltipItemColor }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
      <BottomNavigation />
    </>
  );
}
