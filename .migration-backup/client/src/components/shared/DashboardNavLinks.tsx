import { Target, ChevronRight, BarChart3, BookOpenCheck, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export interface DashboardNavLinksProps {
  doneCount: number;
  pendingCount: number;
  onNavigate: (path: string) => void;
  highlightTargets?: boolean;
}

export function DashboardNavLinks({
  doneCount,
  pendingCount,
  onNavigate,
  highlightTargets,
}: DashboardNavLinksProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onNavigate("/targets")}
        className="w-full text-left touch-manipulation"
        data-testid="link-home-targets"
      >
        <Card
          {...(highlightTargets ? { "data-tour-highlight": true } : {})}
          className="p-4 flex items-center gap-3 hover:border-emerald-500/50 hover:bg-muted/50 transition-colors active:scale-[0.99]"
        >
          <Target className="w-5 h-5 text-emerald-500" />
          <span className="flex-1 font-medium">{t("nav.targets")}</span>
          {(doneCount > 0 || pendingCount > 0) && (
            <div className="flex items-center gap-1.5">
              {doneCount > 0 && (
                <Badge
                  className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs"
                  variant="outline"
                  data-testid="badge-targets-done"
                >
                  {doneCount} {t("target.doneBadge")}
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge
                  className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"
                  variant="outline"
                  data-testid="badge-targets-pending"
                >
                  {pendingCount} {t("target.pendingBadge")}
                </Badge>
              )}
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Card>
      </button>
      <button
        type="button"
        onClick={() => onNavigate("/progress")}
        className="w-full text-left touch-manipulation"
        data-testid="link-home-progress"
      >
        <Card className="p-4 flex items-center gap-3 hover:border-emerald-500/50 hover:bg-muted/50 transition-colors active:scale-[0.99]">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          <span className="flex-1 font-medium">{t("nav.progress")}</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Card>
      </button>
      <button
        type="button"
        onClick={() => onNavigate("/quiz")}
        className="w-full text-left touch-manipulation"
        data-testid="link-home-quiz"
      >
        <Card className="p-4 flex items-center gap-3 hover:border-emerald-500/50 hover:bg-muted/50 transition-colors active:scale-[0.99]">
          <BookOpenCheck className="w-5 h-5 text-emerald-500" />
          <span className="flex-1 font-medium">{t("nav.quiz")}</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Card>
      </button>
      <button
        type="button"
        onClick={() => onNavigate("/leaderboard")}
        className="w-full text-left touch-manipulation"
        data-testid="link-home-leaderboard"
      >
        <Card className="p-4 flex items-center gap-3 hover:border-emerald-500/50 hover:bg-muted/50 transition-colors active:scale-[0.99]">
          <Trophy className="w-5 h-5 text-emerald-500" />
          <span className="flex-1 font-medium">{t("leaderboard.title")}</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Card>
      </button>
    </div>
  );
}
