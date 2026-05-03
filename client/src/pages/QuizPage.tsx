import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, CheckCircle2, ChevronDown, ChevronRight, Loader2, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QuizState, QuizActiveAttempt, QuizAnswerResult } from "@shared/schema";
import { cn } from "@/lib/utils";

// The default react-query fetcher throws errors of the form
// `${status}: ${body}`. Strip the status prefix and try to read a `message`
// field out of the JSON body so we can show the user a clean server message.
function extractServerMessage(err: Error): string | null {
  const raw = err.message ?? "";
  const stripped = raw.replace(/^\d{3}:\s*/, "");
  if (!stripped) return null;
  try {
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON — fall through and return the stripped text as-is
  }
  return stripped;
}

export default function QuizPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: state, isLoading, isError, error, refetch } = useQuery<QuizState>({
    queryKey: ["/api/quiz/state"],
  });

  const [attempt, setAttempt] = useState<QuizActiveAttempt | null>(null);
  const [lastResult, setLastResult] = useState<QuizAnswerResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [completionSummary, setCompletionSummary] = useState<{ allCorrect: boolean; newLevel?: number; correctCount: number } | null>(null);

  // Adopt active attempt from state on first load.
  useEffect(() => {
    if (state?.activeAttempt && !attempt) {
      setAttempt(state.activeAttempt);
    }
  }, [state, attempt]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quiz/start");
      return (await res.json()) as QuizActiveAttempt;
    },
    onSuccess: (a) => {
      setAttempt(a);
      setLastResult(null);
      setSelected(null);
      setCompletionSummary(null);
    },
  });

  const answerMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      if (!attempt) throw new Error("No attempt");
      const res = await apiRequest("POST", "/api/quiz/answer", {
        attemptId: attempt.attemptId,
        optionIndex,
      });
      return (await res.json()) as QuizAnswerResult;
    },
    onSuccess: (result) => {
      setLastResult(result);
    },
  });

  const handleNext = () => {
    if (!attempt || !lastResult) return;
    const newAnswers = [...attempt.answers, selected!];
    if (lastResult.attemptComplete) {
      const correctCount = lastResult.allCorrect ? attempt.questions.length : countCorrectFromHistory();
      setCompletionSummary({
        allCorrect: lastResult.allCorrect,
        newLevel: lastResult.newLevel,
        correctCount,
      });
      setAttempt(null);
      setLastResult(null);
      setSelected(null);
      setExplanationOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/leaderboard"] });
    } else {
      setAttempt({ ...attempt, answers: newAnswers });
      setLastResult(null);
      setSelected(null);
      setExplanationOpen(false);
    }
  };

  // We don't keep granular per-question correctness across calls; the
  // server only tells us the most recent answer's correctness. For the
  // "you got X out of 10" message on a non-perfect attempt, we count the
  // correct answers we've seen during this round on the client.
  const [perAnswerCorrect, setPerAnswerCorrect] = useState<boolean[]>([]);
  const [explanationOpen, setExplanationOpen] = useState(false);
  useEffect(() => {
    if (lastResult) {
      setPerAnswerCorrect((prev) => [...prev, lastResult.isCorrect]);
    }
  }, [lastResult]);
  useEffect(() => {
    if (!attempt) setPerAnswerCorrect([]);
  }, [attempt?.attemptId]);
  const countCorrectFromHistory = () => perAnswerCorrect.filter(Boolean).length;

  const handleSelect = (i: number) => {
    if (lastResult) return;
    setSelected(i);
    answerMutation.mutate(i);
  };

  const handleRetryLevel = () => {
    setCompletionSummary(null);
    startMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !state) {
    const serverMessage = error instanceof Error ? extractServerMessage(error) : null;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-muted-foreground">{t("quiz.error")}</p>
        {serverMessage && (
          <p
            className="text-sm text-rose-600 dark:text-rose-400 max-w-md"
            data-testid="text-quiz-load-error"
          >
            {serverMessage}
          </p>
        )}
        <Button onClick={() => refetch()} data-testid="button-quiz-retry">
          {t("quiz.retry")}
        </Button>
      </div>
    );
  }

  const currentLevel = state.currentLevel;
  const totalCorrect = state.totalCorrect;
  const questionIndex = attempt ? attempt.answers.length : 0;
  const currentQuestion = attempt?.questions[questionIndex];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-quiz-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-emerald-500" />
            {t("quiz.title")}
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("quiz.currentLevel")}</p>
            <p className="text-3xl font-display font-bold mt-1" data-testid="text-quiz-level">{currentLevel}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("quiz.totalCorrect")}</p>
            <p className="text-3xl font-display font-bold mt-1" data-testid="text-quiz-total-correct">{totalCorrect}</p>
          </Card>
        </div>

        <button
          type="button"
          onClick={() => navigate("/quiz/leaderboard")}
          className="w-full text-left touch-manipulation mb-6"
          data-testid="link-quiz-leaderboard"
        >
          <Card className="p-4 flex items-center gap-3 hover:border-emerald-500/50 hover:bg-muted/50 transition-colors active:scale-[0.99]">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="flex-1 font-medium">{t("quiz.leaderboard")}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Card>
        </button>

        {/* Completion summary */}
        {completionSummary && (
          <Card className={cn("p-6 mb-6 border-2", completionSummary.allCorrect ? "border-emerald-500/60 bg-emerald-500/5" : "border-amber-500/60 bg-amber-500/5")}>
            {completionSummary.allCorrect ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  <h2 className="text-xl font-display font-bold">{t("quiz.perfectScoreTitle")}</h2>
                </div>
                <p className="text-muted-foreground mb-4" data-testid="text-quiz-level-up">
                  {t("quiz.perfectScoreBody", { level: completionSummary.newLevel })}
                </p>
                <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} data-testid="button-quiz-continue-next">
                  {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t("quiz.startLevel", { level: completionSummary.newLevel })}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-7 h-7 text-amber-500" />
                  <h2 className="text-xl font-display font-bold">{t("quiz.tryAgainTitle")}</h2>
                </div>
                <p className="text-muted-foreground mb-4" data-testid="text-quiz-result-summary">
                  {t("quiz.tryAgainBody", { correct: completionSummary.correctCount, total: 10 })}
                </p>
                <Button onClick={handleRetryLevel} disabled={startMutation.isPending} data-testid="button-quiz-retry-level">
                  {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t("quiz.retryLevel", { level: currentLevel })}
                </Button>
              </>
            )}
          </Card>
        )}

        {/* Idle: start button */}
        {!attempt && !completionSummary && (
          <Card className="p-6">
            <h2 className="text-2xl font-display font-bold mb-2">
              {t("quiz.levelHeading", { level: currentLevel })}
            </h2>
            <p className="text-muted-foreground mb-4">{t("quiz.intro")}</p>
            <Button
              size="lg"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              data-testid="button-quiz-start"
            >
              {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t("quiz.startLevel", { level: currentLevel })}
            </Button>
            {startMutation.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-400 mt-3" data-testid="text-quiz-start-error">
                {(startMutation.error as Error).message}
              </p>
            )}
          </Card>
        )}

        {/* Active question */}
        {attempt && currentQuestion && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground" data-testid="text-quiz-progress">
                {t("quiz.questionProgress", { index: questionIndex + 1, total: attempt.questions.length })}
              </span>
              <span className="text-xs uppercase tracking-wide text-emerald-500 font-semibold">
                {t("quiz.levelHeading", { level: attempt.level })}
              </span>
            </div>
            <h2 className="text-xl font-display font-bold mb-5" data-testid="text-quiz-question">
              {currentQuestion.questionText}
            </h2>

            <div className="space-y-2">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrectOption = lastResult && i === lastResult.correctIndex;
                const isWrongChosen = lastResult && isSelected && !lastResult.isCorrect;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(i)}
                    disabled={Boolean(lastResult) || answerMutation.isPending}
                    className={cn(
                      "w-full text-left p-3 rounded-md border transition-colors flex items-start gap-3",
                      "hover:border-emerald-500/50 hover:bg-muted/40",
                      "disabled:cursor-not-allowed",
                      lastResult && isCorrectOption && "border-emerald-500 bg-emerald-500/10",
                      isWrongChosen && "border-rose-500 bg-rose-500/10",
                      !lastResult && isSelected && "border-emerald-500/50",
                    )}
                    data-testid={`button-quiz-option-${i}`}
                  >
                    <span className="font-mono text-sm w-6 text-muted-foreground flex-shrink-0 mt-0.5">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="flex-1">{opt}</span>
                    {lastResult && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                    {isWrongChosen && <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {lastResult && (
              <div className={cn("mt-5 p-4 rounded-md border", lastResult.isCorrect ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5")}>
                <p className="font-semibold mb-2" data-testid="text-quiz-feedback">
                  {lastResult.isCorrect ? t("quiz.correct") : t("quiz.incorrect")}
                </p>
                <button
                  type="button"
                  onClick={() => setExplanationOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover-elevate active-elevate-2 rounded px-2 py-1 -mx-2"
                  data-testid="button-quiz-learn-more"
                  aria-expanded={explanationOpen}
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform", explanationOpen ? "" : "-rotate-90")} />
                  {t("quiz.learnMore")}
                </button>
                {explanationOpen && (
                  <p className="text-sm text-muted-foreground mt-2" data-testid="text-quiz-explanation">
                    {lastResult.explanation}
                  </p>
                )}
                <div>
                  <Button onClick={handleNext} className="mt-3" size="sm" data-testid="button-quiz-next">
                    {lastResult.attemptComplete ? t("quiz.finish") : t("quiz.next")}
                  </Button>
                </div>
              </div>
            )}

            {answerMutation.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">
                {(answerMutation.error as Error).message}
              </p>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
