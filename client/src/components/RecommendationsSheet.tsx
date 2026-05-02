import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Sparkles, BookOpen, AlertCircle, RefreshCw, Info } from "lucide-react";
import { useCategoryName } from "@/hooks/use-categories";
import { stashRecommendation } from "@/lib/recommendationStorage";
import type { TargetRecommendation, TargetRecommendationsResponse } from "@shared/schema";

interface RecommendationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecommendationsSheet({ open, onOpenChange }: RecommendationsSheetProps) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const translateCategoryName = useCategoryName();
  const [selected, setSelected] = useState<TargetRecommendation | null>(null);

  const language = (["id", "en", "ms"].includes(i18n.language) ? i18n.language : "id") as "id" | "en" | "ms";

  const mutation = useMutation<TargetRecommendationsResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/targets/recommendations", { language });
      return (await res.json()) as TargetRecommendationsResponse;
    },
  });

  // Fire the recommendation request whenever the sheet opens with no data yet.
  // Using useEffect (instead of relying on Radix's onOpenChange callback)
  // ensures the mutation fires even when the parent opens the sheet
  // programmatically via setOpen(true).
  useEffect(() => {
    if (open && !mutation.data && !mutation.isPending && !mutation.isError) {
      mutation.mutate();
    }
    if (!open) {
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  const handleUseTarget = (rec: TargetRecommendation) => {
    stashRecommendation(rec);
    onOpenChange(false);
    navigate(`/targets/new?recommendation=${encodeURIComponent(rec.id)}`);
  };

  const periodLabel = (rec: TargetRecommendation): string => {
    if (rec.recurrence === "oneTime") return t("targets.oneTime");
    if (rec.period === "daily") return t("targets.daily");
    if (rec.period === "weekly") return t("targets.weekly");
    if (rec.period === "monthly") return t("targets.monthly");
    return "";
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] sm:max-w-2xl sm:mx-auto rounded-t-2xl flex flex-col overflow-hidden"
        data-testid="sheet-recommendations"
      >
        {selected ? (
          <>
            <SheetHeader className="text-left flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1 mb-2 self-start"
                data-testid="button-recommendation-back"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("recommendations.backToList")}
              </button>
              <SheetTitle data-testid="text-recommendation-preview-title">
                {selected.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                {selected.whyItFits}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" data-testid="badge-recommendation-category">
                  {translateCategoryName(selected.category)}
                </Badge>
                <Badge variant="outline" data-testid="badge-recommendation-amount">
                  {selected.targetValue}
                  {periodLabel(selected) ? ` · ${periodLabel(selected)}` : ""}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground" data-testid="text-recommendation-why">
                {selected.whyItFits}
              </p>

              <Card className="p-4 space-y-3 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300" data-testid="text-recommendation-source-kind">
                    {t(`recommendations.sourceKind.${selected.source.kind}`)}
                  </span>
                </div>
                <p
                  className="text-right text-xl leading-loose font-serif"
                  dir="rtl"
                  lang="ar"
                  data-testid="text-recommendation-arabic"
                >
                  {selected.source.arabic}
                </p>
                <p className="text-sm text-foreground/90" data-testid="text-recommendation-translation">
                  &ldquo;{selected.source.translation}&rdquo;
                </p>
                <p className="text-xs font-medium text-muted-foreground" data-testid="text-recommendation-reference">
                  — {selected.source.reference}
                </p>
              </Card>

              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{t("recommendations.disclaimer")}</span>
              </p>
            </div>

            <div className="flex-shrink-0 pt-3 border-t border-border">
              <Button
                className="w-full"
                onClick={() => handleUseTarget(selected)}
                data-testid="button-use-recommendation"
              >
                {t("recommendations.useThisTarget")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="text-left flex-shrink-0">
              <SheetTitle className="flex items-center gap-2" data-testid="text-recommendations-title">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                {t("recommendations.sheetTitle")}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {t("recommendations.disclaimer")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-4 mt-2">
              {mutation.isPending && (
                <div className="space-y-3" data-testid="state-recommendations-loading">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {!mutation.isPending && mutation.isError && (
                <div
                  className="flex flex-col items-center text-center gap-3 py-8"
                  data-testid="state-recommendations-error"
                >
                  <AlertCircle className="w-10 h-10 text-destructive" />
                  <div>
                    <p className="font-medium">{t("recommendations.errorTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("recommendations.errorDesc")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => mutation.mutate()}
                    data-testid="button-recommendations-retry"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {t("recommendations.retry")}
                  </Button>
                </div>
              )}

              {!mutation.isPending && mutation.data && (
                <div className="space-y-3" data-testid="list-recommendations">
                  {mutation.data.recommendations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("recommendations.empty")}
                    </p>
                  ) : (
                    mutation.data.recommendations.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelected(rec)}
                        className="w-full text-left rounded-lg border border-border bg-card p-4 hover-elevate active-elevate-2 transition-colors"
                        data-testid={`card-recommendation-${rec.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm leading-snug" data-testid={`text-recommendation-name-${rec.id}`}>
                                {rec.name}
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="text-xs">
                                {translateCategoryName(rec.category)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {rec.targetValue}
                                {periodLabel(rec) ? ` · ${periodLabel(rec)}` : ""}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {rec.whyItFits}
                            </p>
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {rec.source.reference}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
