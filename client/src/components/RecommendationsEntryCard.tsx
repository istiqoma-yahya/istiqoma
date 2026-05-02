import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { RecommendationsSheet } from "./RecommendationsSheet";

const STORAGE_PREFIX = "recommendations-entry-dismissed:";

interface RecommendationsEntryCardProps {
  /** Per-surface name so dismissal on Targets page doesn't hide it on Create page. */
  surface: "targets-empty" | "create-target";
}

export function RecommendationsEntryCard({ surface }: RecommendationsEntryCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dismissedKey = user?.id ? `${STORAGE_PREFIX}${surface}:${user.id}` : null;
  // Reading from localStorage can throw in private browsing modes or when
  // storage is disabled by site settings. Fall back to "not dismissed"
  // rather than crashing the whole page when that happens.
  const readDismissed = (): boolean => {
    if (typeof window === "undefined" || !dismissedKey) return false;
    try {
      return window.localStorage.getItem(dismissedKey) === "1";
    } catch {
      return false;
    }
  };
  const [dismissed, setDismissed] = useState(readDismissed);
  const [open, setOpen] = useState(false);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    if (!dismissedKey) return;
    try {
      window.localStorage.setItem(dismissedKey, "1");
    } catch {
      // Storage write failed (quota / disabled). The in-memory dismiss
      // still applies for the rest of this session.
    }
  };

  if (dismissed) {
    return (
      <>
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            data-testid={`link-see-suggestions-${surface}`}
          >
            <Sparkles className="w-3 h-3" />
            {t("recommendations.seeSuggestions")}
          </button>
        </div>
        <RecommendationsSheet open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <Card
        className="p-4 mb-4 border-emerald-500/30 bg-emerald-500/5 hover-elevate active-elevate-2 cursor-pointer"
        onClick={() => setOpen(true)}
        data-testid={`card-recommendations-entry-${surface}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm" data-testid="text-recommendations-entry-title">
                {t("recommendations.entryTitle")}
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`button-dismiss-recommendations-${surface}`}
                aria-label={t("recommendations.dismiss")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("recommendations.entryDesc")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className="h-8 text-xs gap-1"
              data-testid={`button-open-recommendations-${surface}`}
            >
              {t("recommendations.entryCta")}
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>
      <RecommendationsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
