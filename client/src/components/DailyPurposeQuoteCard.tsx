import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";

export const Q5_ICONS: Record<string, string> = {
  "dekat-allah": "🤲",
  bermanfaat: "🌟",
  berilmu: "📚",
  istiqomah: "🏔️",
  keluarga: "🏡",
};

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

  const quotes = t(`purposeQuotes.${identityKey}`, { returnObjects: true }) as string[];

  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  const dayOfYear = getDayOfYear();
  const quote = quotes[dayOfYear % quotes.length];

  const emoji = Q5_ICONS[identityKey] ?? "✨";
  const label = t(`onboarding.q5.options.${identityKey}.label`);

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
      </div>
    </Card>
  );
}
