import { useDeeds } from "@/hooks/use-deeds";
import { useAuth } from "@/hooks/use-auth";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
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
import { Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export default function ProgressPage() {
  const { data: deeds, isLoading } = useDeeds();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  // Theme-aware chart colors
  const isDark = theme === "dark";
  const axisColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
  const tooltipLabelColor = isDark ? "#fff" : "#1e293b";
  const tooltipItemColor = isDark ? "#e2e8f0" : "#475569";
  const barActiveColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const deedsArray = deeds || [];

  // Calculate stats for good vs bad deeds
  const goodDeeds = deedsArray.filter((d) => d.deedType === "good");
  const badDeeds = deedsArray.filter((d) => d.deedType === "bad");
  const goodPoints = goodDeeds.reduce((sum, d) => sum + d.points, 0);
  const badPoints = badDeeds.reduce((sum, d) => sum + d.points, 0);

  // Data for good vs bad deeds chart
  const deedTypeData = [
    {
      name: "Good Deeds",
      count: goodDeeds.length,
      points: goodPoints,
    },
    {
      name: "Bad Deeds",
      count: badDeeds.length,
      points: badPoints,
    },
  ];

  // Category breakdown
  const categoryMap = new Map<string, number>();
  deedsArray.forEach((deed) => {
    const current = categoryMap.get(deed.category) || 0;
    categoryMap.set(deed.category, current + 1);
  });

  const categoryData = Array.from(categoryMap.entries()).map(
    ([name, count]) => ({
      name,
      value: count,
    })
  );

  // Points over time (daily)
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const pointsOverTime = days.map((day) => {
    const dayDeeds = deedsArray.filter((d) => {
      const createdAt = typeof d.createdAt === 'string' ? new Date(d.createdAt) : (d.createdAt || new Date());
      return (
        createdAt.getDate() === day.getDate() &&
        createdAt.getMonth() === day.getMonth() &&
        createdAt.getFullYear() === day.getFullYear()
      );
    });

    const goodDaysPoints = dayDeeds
      .filter((d) => d.deedType === "good")
      .reduce((sum, d) => sum + d.points, 0);
    const badDaysPoints = dayDeeds
      .filter((d) => d.deedType === "bad")
      .reduce((sum, d) => sum + d.points, 0);

    return {
      date: format(day, "MMM d"),
      good: goodDaysPoints,
      bad: badDaysPoints,
      total: goodDaysPoints - badDaysPoints,
    };
  });

  // Filter out empty days at the end
  const filteredPointsOverTime = pointsOverTime.filter(
    (_, index, arr) =>
      arr.slice(index).some((d) => d.good !== 0 || d.bad !== 0)
  );

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

  const netPoints = goodPoints - badPoints;

  return (
    <>
      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="font-display font-bold text-xl">Spiritual Progress</h1>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="container max-w-5xl mx-auto px-4 py-8">
        {deedsArray.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed">
            <h3 className="text-lg font-medium mb-2">No data yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Record some deeds to see your spiritual progress visualized here.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="text-muted-foreground text-sm mb-2">
                  Total Deeds
                </div>
                <div className="text-3xl font-bold">{deedsArray.length}</div>
              </Card>
              <Card className="p-6">
                <div className="text-muted-foreground text-sm mb-2">
                  Good Deeds
                </div>
                <div className="text-3xl font-bold text-emerald-500">
                  {goodDeeds.length}
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-muted-foreground text-sm mb-2">
                  Bad Deeds
                </div>
                <div className="text-3xl font-bold text-rose-500">
                  {badDeeds.length}
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-muted-foreground text-sm mb-2">
                  Net Points
                </div>
                <div
                  className={`text-3xl font-bold ${
                    netPoints >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {netPoints >= 0 ? "+" : ""}
                  {netPoints}
                </div>
              </Card>
            </div>

            {/* Good vs Bad Deeds Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-display font-bold mb-6">
                Good vs Bad Deeds
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deedTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" stroke={axisColor} />
                  <YAxis stroke={axisColor} />
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
                  <Bar dataKey="count" fill="#10b981" name="Count" activeBar={{ fill: barActiveColor }} />
                  <Bar dataKey="points" fill="#3b82f6" name="Points" activeBar={{ fill: barActiveColor }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Points Over Time */}
            {filteredPointsOverTime.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-display font-bold mb-6">
                  Points Over Time (This Month)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredPointsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" stroke={axisColor} />
                    <YAxis stroke={axisColor} />
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
                    <Line
                      type="monotone"
                      dataKey="good"
                      stroke="#10b981"
                      name="Good Deeds Points"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bad"
                      stroke="#f87171"
                      name="Bad Deeds Points"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#fbbf24"
                      name="Net Points"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Category Breakdown */}
            {categoryData.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-display font-bold mb-6">
                  Deeds by Category
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
