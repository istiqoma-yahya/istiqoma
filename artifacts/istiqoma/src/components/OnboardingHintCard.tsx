import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTargetsWithProgress } from "@/hooks/use-targets";
import { Q3_TO_CATEGORY, type Q3 } from "@/lib/onboardingTypes";
import type { UserOnboarding } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Plus } from "lucide-react";
import { useState } from "react";

const STORAGE_PREFIX = "onboarding-hint-dismissed:";

export function OnboardingHintCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const dismissedKey = user?.id ? `${STORAGE_PREFIX}${user.id}` : null;
  const initialDismissed =
    typeof window !== "undefined" && dismissedKey
      ? window.localStorage.getItem(dismissedKey) === "1"
      : false;
  const [dismissed, setDismissed] = useState(initialDismissed);

  const { data: onboarding } = useQuery<UserOnboarding | null>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  const { data: targets } = useTargetsWithProgress();

  if (!user || !onboarding || dismissed) return null;
  if (!onboarding.q3 || onboarding.q3.length === 0) return null;

  const activeTargetCategoriesLower = new Set(
    (targets || [])
      .filter((t) => t.isActive !== false)
      .map((t) => t.category.toLowerCase()),
  );

  const missingPicks = (onboarding.q3 as Q3[]).filter((pick) => {
    const cat = Q3_TO_CATEGORY[pick];
    return !activeTargetCategoriesLower.has(cat.toLowerCase());
  });

  if (missingPicks.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissedKey) window.localStorage.setItem(dismissedKey, "1");
  };

  const handlePickClick = (pick: Q3) => {
    const cat = Q3_TO_CATEGORY[pick];
    navigate(`/targets/new?category=${encodeURIComponent(cat)}`);
  };

  return (
    <Card
      className="p-4 mb-6 border-emerald-500/30 bg-emerald-500/5"
      data-testid="card-onboarding-hint"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm">
              {t("onboarding.hint.title")}
            </h4>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-dismiss-onboarding-hint"
              aria-label={t("onboarding.hint.dismiss")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {t("onboarding.hint.subtitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {missingPicks.map((pick) => (
              <Button
                key={pick}
                size="sm"
                variant="outline"
                onClick={() => handlePickClick(pick)}
                className="h-8 text-xs gap-1"
                data-testid={`button-onboarding-hint-${pick}`}
              >
                <Plus className="w-3 h-3" />
                {t(`onboarding.q3.options.${pick}`)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
