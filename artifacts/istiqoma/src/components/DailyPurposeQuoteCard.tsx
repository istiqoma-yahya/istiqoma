import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Quote, X } from "lucide-react";

export const Q5_ICONS: Record<string, string> = {
  "dekat-allah": "🤲",
  bermanfaat: "🌟",
  berilmu: "📚",
  istiqomah: "🏔️",
  keluarga: "🏡",
};

const STORAGE_KEY = "quoteCardDismissed";
const DISMISS_DURATION_MS = 8 * 60 * 60 * 1000;

function isDismissed(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  const dismissedAt = new Date(stored).getTime();
  if (isNaN(dismissedAt)) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
  if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return true;
  localStorage.removeItem(STORAGE_KEY);
  return false;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

interface DailyPurposeQuoteCardProps {
  identityKey: string;
}

export function DailyPurposeQuoteCard({ identityKey }: DailyPurposeQuoteCardProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissed());

  const quotes = t(`purposeQuotes.${identityKey}`, { returnObjects: true }) as string[];

  if (!Array.isArray(quotes) || quotes.length === 0) return null;
  if (dismissed) return null;

  const dayOfYear = getDayOfYear();
  const quote = quotes[dayOfYear % quotes.length];

  const emoji = Q5_ICONS[identityKey] ?? "✨";
  const label = t(`onboarding.q5.options.${identityKey}.label`);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setDismissed(true);
  }

  return (
    <Card
      className="p-4 mb-6 border-emerald-500/30 bg-emerald-500/5"
      data-testid="card-daily-purpose-quote"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Quote className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-foreground/90 mb-3" data-testid="text-purpose-quote">
            {quote}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium" data-testid="text-purpose-label">
              {label}
            </span>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss quote card"
          data-testid="button-dismiss-quote-card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}
