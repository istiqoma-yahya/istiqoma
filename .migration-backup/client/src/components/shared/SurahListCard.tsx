import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface SurahListCardProps {
  id: number;
  nameSimple: string;
  nameArabic: string;
  translatedName: string;
  versesCount: number;
  versesLabel: string;
  onClick?: () => void;
  onPlay?: () => void;
  highlight?: boolean;
}

export function SurahListCard({
  id,
  nameSimple,
  nameArabic,
  translatedName,
  versesCount,
  versesLabel,
  onClick,
  onPlay,
  highlight,
}: SurahListCardProps) {
  return (
    <Card
      {...(highlight ? { "data-tour-highlight": true } : {})}
      className="p-3 flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2"
      onClick={onClick}
      data-testid={`card-surah-${id}`}
    >
      <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
        {id}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" data-testid={`text-surah-name-${id}`}>
          {nameSimple}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {translatedName} · {versesCount} {versesLabel}
        </div>
      </div>
      <div className="text-2xl font-arabic shrink-0">{nameArabic}</div>
      {onPlay && (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          data-testid={`button-play-surah-${id}`}
          aria-label={`Play ${nameSimple}`}
        >
          <Play className="w-4 h-4" />
        </Button>
      )}
    </Card>
  );
}
