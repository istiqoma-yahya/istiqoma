import { useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { QuranMiniPlayer } from "@/components/QuranMiniPlayer";
import { useChapters, useMemorizations } from "@/hooks/use-quran";

export default function QuranMemorizationProgressPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: chapters, isLoading: chaptersLoading } = useChapters();
  const { data: memorizations, isLoading: memLoading } = useMemorizations();

  const isLoading = chaptersLoading || memLoading;

  const countsBySurah = useMemo(() => {
    const m = new Map<number, number>();
    for (const mem of memorizations ?? []) {
      m.set(mem.surahNumber, (m.get(mem.surahNumber) ?? 0) + 1);
    }
    return m;
  }, [memorizations]);

  const totalVerses = useMemo(
    () => chapters?.reduce((sum, c) => sum + c.verses_count, 0) ?? 0,
    [chapters],
  );
  const totalMemorized = memorizations?.length ?? 0;
  const overallPercent = totalVerses > 0 ? (totalMemorized / totalVerses) * 100 : 0;
  const surahsStarted = useMemo(
    () => Array.from(countsBySurah.values()).filter((n) => n > 0).length,
    [countsBySurah],
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-5xl mx-auto px-2 h-14 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/quran")}
            data-testid="button-back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">
            {t("quranMenu.memorizationProgress")}
          </h1>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-4" data-testid="card-overall-progress">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("quranMenu.totalMemorized")}
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-40 mt-1" />
              ) : (
                <div className="text-lg font-semibold" data-testid="text-total-memorized">
                  {totalMemorized.toLocaleString()} / {totalVerses.toLocaleString()}{" "}
                  {t("quranMenu.verses")}
                </div>
              )}
            </div>
            <div
              className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400"
              data-testid="text-total-percent"
            >
              {overallPercent.toFixed(1)}%
            </div>
          </div>
          <Progress value={overallPercent} className="h-2" />
          {!isLoading && (
            <div className="text-xs text-muted-foreground mt-2" data-testid="text-surahs-started">
              {t("quranMenu.surahsStarted", {
                started: surahsStarted,
                total: chapters?.length ?? 114,
              })}
            </div>
          )}
        </Card>

        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            : chapters?.map((c) => {
                const memorized = countsBySurah.get(c.id) ?? 0;
                const percent =
                  c.verses_count > 0 ? (memorized / c.verses_count) * 100 : 0;
                const isComplete = memorized >= c.verses_count && c.verses_count > 0;
                return (
                  <Card
                    key={c.id}
                    className="p-3 cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => navigate(`/quran/${c.id}`)}
                    data-testid={`card-surah-progress-${c.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                        {c.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className="font-medium truncate"
                            data-testid={`text-surah-name-${c.id}`}
                          >
                            {c.name_simple}
                          </div>
                          <div
                            className={`text-sm font-medium shrink-0 ${
                              isComplete
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                            data-testid={`text-surah-count-${c.id}`}
                          >
                            {memorized} / {c.verses_count}
                          </div>
                        </div>
                        <Progress value={percent} className="h-1.5 mt-2" />
                      </div>
                    </div>
                  </Card>
                );
              })}
        </div>
      </main>

      <QuranMiniPlayer />
      <BottomNavigation />
    </div>
  );
}
