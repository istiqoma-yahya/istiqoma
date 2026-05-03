import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { getLeaderboardDisplayName, getLeaderboardInitials } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import type { QuizLeaderboardEntry } from "@shared/schema";

type Response = {
  entries: QuizLeaderboardEntry[];
  me: { rank: number; level: number; totalCorrect: number } | null;
  total: number;
};

export default function QuizLeaderboardPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data, isLoading, isError, refetch } = useQuery<Response>({
    queryKey: ["/api/quiz/leaderboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/quiz/leaderboard?limit=100");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/quiz")}
            data-testid="button-quiz-leaderboard-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {t("quiz.leaderboardTitle")}
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 pb-32">
        <p className="text-sm text-muted-foreground mb-4">{t("quiz.leaderboardSubtitle")}</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">{t("quiz.error")}</p>
            <Button onClick={() => refetch()}>{t("quiz.retry")}</Button>
          </div>
        ) : !data || data.entries.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground" data-testid="text-quiz-leaderboard-empty">
              {t("quiz.leaderboardEmpty")}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.entries.map((e) => {
              const name = getLeaderboardDisplayName(
                {
                  username: e.username,
                  email: e.email,
                  isCurrentUser: e.isCurrentUser,
                },
                t("leaderboard.anonymous"),
              );
              const initials = getLeaderboardInitials(name);
              return (
                <Card
                  key={e.userId}
                  className={cn(
                    "p-3 flex items-center gap-3",
                    e.isCurrentUser && "border-emerald-500/60 bg-emerald-500/5",
                  )}
                  data-testid={`row-quiz-leaderboard-${e.userId}`}
                >
                  <span className="font-mono text-sm w-8 text-muted-foreground flex-shrink-0 text-center">
                    #{e.rank}
                  </span>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={e.profileImageUrl || undefined} alt={name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-quiz-leaderboard-name-${e.userId}`}>{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("quiz.leaderboardRowSubtitle", { level: e.level, correct: e.totalCorrect })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-display font-bold leading-none" data-testid={`text-quiz-leaderboard-level-${e.userId}`}>
                      {t("quiz.levelShort", { level: e.level })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.totalCorrect} {t("quiz.correctShort")}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {data?.me && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
          <div className="container max-w-3xl mx-auto px-4 py-3">
            <Card
              className="p-3 flex items-center gap-3 border-emerald-500/60 bg-emerald-500/5"
              data-testid="card-quiz-leaderboard-me"
            >
              <span
                className="font-mono text-sm w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 text-center font-semibold"
                data-testid="text-quiz-leaderboard-me-rank"
              >
                #{data.me.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t("quiz.yourRank")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("quiz.leaderboardRowSubtitle", {
                    level: data.me.level,
                    correct: data.me.totalCorrect,
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="text-lg font-display font-bold leading-none"
                  data-testid="text-quiz-leaderboard-me-level"
                >
                  {t("quiz.levelShort", { level: data.me.level })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-quiz-leaderboard-me-correct">
                  {data.me.totalCorrect} {t("quiz.correctShort")}
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
