import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { DuaHandsIcon } from "@/components/DuaHandsIcon";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type BadgeProgress = {
  badgeId: string;
  family: "milestone" | "behavior";
  name: string;
  description: string;
  icon: string;
  thresholds: number[];
  unit: string;
  value: number;
  earnedTier: number;
  earnedAt: Record<number, string>;
};

type BadgesSnapshot = {
  badges: BadgeProgress[];
  totalBadges: number;
  earnedBadges: number;
  latestEarned: { badgeId: string; tier: number; earnedAt: string } | null;
};

const TIER_BG_CLASSES = [
  "",
  "bg-amber-700/20 text-amber-700 dark:text-amber-300 border-amber-700/30",
  "bg-slate-400/25 text-slate-700 dark:text-slate-200 border-slate-400/40",
  "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
  "bg-cyan-400/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/40",
];

const LOCKED_CLASSES =
  "bg-muted/40 text-muted-foreground/70 border-muted-foreground/20";

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  if (name === "DuaHands") return DuaHandsIcon;
  const Icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return Icons[name] ?? Icons.Award ?? Icons.Star;
}

function tierProgress(b: BadgeProgress) {
  if (b.thresholds.length === 0) return { current: 0, next: 1, percent: 0 };
  const earned = b.earnedTier;
  if (earned >= b.thresholds.length) {
    const max = b.thresholds[b.thresholds.length - 1];
    return { current: max, next: max, percent: 100 };
  }
  const lower = earned > 0 ? b.thresholds[earned - 1] : 0;
  const upper = b.thresholds[earned];
  const span = Math.max(1, upper - lower);
  const localValue = Math.max(0, Math.min(b.value - lower, span));
  return { current: lower, next: upper, percent: Math.round((localValue / span) * 100) };
}

function useBadgeI18n() {
  const { t } = useTranslation();
  const tName = (b: BadgeProgress) =>
    t(`achievements.badges.${b.badgeId}.name`, { defaultValue: b.name });
  const tDesc = (b: BadgeProgress) =>
    t(`achievements.badges.${b.badgeId}.description`, { defaultValue: b.description });
  const tTier = (tier: number) =>
    t(`achievements.tiers.${tier}`, { defaultValue: "" });
  return { t, tName, tDesc, tTier };
}

function BadgeCell({
  badge,
  onClick,
}: {
  badge: BadgeProgress;
  onClick: () => void;
}) {
  const { tName, tDesc, tTier } = useBadgeI18n();
  const Icon = getIcon(badge.icon);
  const earned = badge.earnedTier > 0;
  const { percent, next } = tierProgress(badge);
  const atMax = earned && badge.earnedTier >= badge.thresholds.length;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`badge-cell-${badge.badgeId}`}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors hover-elevate active-elevate-2",
        earned ? TIER_BG_CLASSES[badge.earnedTier] : LOCKED_CLASSES,
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full ring-2",
          earned
            ? "bg-background/60 ring-current"
            : "bg-background/40 ring-muted-foreground/20",
        )}
      >
        <Icon className={cn("h-6 w-6", !earned && "opacity-50")} />
      </div>
      <p
        className="line-clamp-2 text-xs font-medium leading-tight"
        data-testid={`text-badge-name-${badge.badgeId}`}
      >
        {tName(badge)}
      </p>
      <p
        className="line-clamp-2 text-[10px] leading-snug opacity-80"
        data-testid={`text-badge-description-${badge.badgeId}`}
      >
        {tDesc(badge)}
      </p>
      {earned && (
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {tTier(badge.earnedTier)}
        </span>
      )}
      <span
        className="text-[10px] text-muted-foreground"
        data-testid={`text-badge-progress-${badge.badgeId}`}
      >
        {atMax
          ? `${badge.value.toLocaleString()} ${badge.unit}`.trim()
          : `${badge.value.toLocaleString()}/${next.toLocaleString()}${badge.unit ? ` ${badge.unit}` : ""}`}
      </span>
      <Progress value={percent} className="h-1 w-full" />
    </button>
  );
}

export function AchievementsSection() {
  const [selected, setSelected] = useState<BadgeProgress | null>(null);
  const { toast } = useToast();
  const seenLatestRef = useRef<string | null>(null);
  const { t, tName, tDesc, tTier } = useBadgeI18n();

  const { data, isLoading, isError } = useQuery<BadgesSnapshot>({
    queryKey: ["/api/badges"],
  });

  const milestones = useMemo(
    () => (data?.badges ?? []).filter((b) => b.family === "milestone"),
    [data],
  );
  const behaviors = useMemo(
    () => (data?.badges ?? []).filter((b) => b.family === "behavior"),
    [data],
  );

  const latestBadge = useMemo(() => {
    if (!data?.latestEarned) return null;
    return data.badges.find((b) => b.badgeId === data.latestEarned!.badgeId) ?? null;
  }, [data]);

  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;
    const storageKey = "istiqoma:seenBadgeKeys";
    let seen: Set<string>;
    try {
      const raw = window.localStorage.getItem(storageKey);
      seen = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      seen = new Set<string>();
    }

    const earnedKeys: Array<{ key: string; badge: BadgeProgress; tier: number }> = [];
    for (const b of data.badges) {
      for (let tier = 1; tier <= b.earnedTier; tier++) {
        const at = b.earnedAt[tier] ?? "";
        earnedKeys.push({ key: `${b.badgeId}:${tier}:${at}`, badge: b, tier });
      }
    }

    if (seen.size === 0) {
      const next = new Set<string>();
      earnedKeys.forEach((e) => next.add(e.key));
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      return;
    }

    const fresh = earnedKeys.filter((e) => !seen.has(e.key));
    if (fresh.length === 0) return;

    const toShow = fresh.slice(0, 3);
    for (const e of toShow) {
      toast({
        title: `🏆 ${tName(e.badge)}`,
        description: t("achievements.newBadgeTierDesc", {
          tier: tTier(e.tier),
          description: tDesc(e.badge),
        }),
      });
    }
    if (fresh.length > toShow.length) {
      toast({
        title: t("achievements.newBadgesToastTitle"),
        description: t("achievements.newBadgesToastDesc", {
          count: fresh.length - toShow.length,
        }),
      });
    }

    fresh.forEach((e) => seen.add(e.key));
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seen)));
  }, [data, toast, t, tName, tDesc, tTier]);

  return (
    <Card className="p-5" data-testid="card-achievements">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-base font-semibold"
            data-testid="text-achievements-heading"
          >
            {t("achievements.heading")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("achievements.subheading")}
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            {latestBadge && data.latestEarned && (
              <button
                type="button"
                onClick={() => setSelected(latestBadge)}
                data-testid="chip-latest-badge"
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold hover-elevate active-elevate-2",
                  TIER_BG_CLASSES[data.latestEarned.tier],
                )}
              >
                {(() => {
                  const Icon = getIcon(latestBadge.icon);
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
                <span className="max-w-[100px] truncate">{tName(latestBadge)}</span>
              </button>
            )}
            <div
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              data-testid="text-achievements-summary"
            >
              {data.earnedBadges}/{data.totalBadges}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("achievements.loadError")}
        </p>
      ) : (
        <div className="space-y-5">
          <section>
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              data-testid="text-achievements-milestone-heading"
            >
              {t("achievements.milestone")}
            </h3>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
              data-testid="grid-achievements-milestone"
            >
              {milestones.map((b) => (
                <BadgeCell
                  key={b.badgeId}
                  badge={b}
                  onClick={() => setSelected(b)}
                />
              ))}
            </div>
          </section>
          <section>
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              data-testid="text-achievements-behavior-heading"
            >
              {t("achievements.behavior")}
            </h3>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
              data-testid="grid-achievements-behavior"
            >
              {behaviors.map((b) => (
                <BadgeCell
                  key={b.badgeId}
                  badge={b}
                  onClick={() => setSelected(b)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-achievement-detail">
          {selected && <AchievementDetail badge={selected} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AchievementDetail({ badge }: { badge: BadgeProgress }) {
  const { t, tName, tDesc, tTier } = useBadgeI18n();
  const Icon = getIcon(badge.icon);
  const { percent, next } = tierProgress(badge);
  const earned = badge.earnedTier > 0;
  const tierClass = earned ? TIER_BG_CLASSES[badge.earnedTier] : LOCKED_CLASSES;
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border-2",
              tierClass,
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <DialogTitle data-testid="text-achievement-detail-name">
              {tName(badge)}
            </DialogTitle>
            <DialogDescription>
              {earned
                ? t("achievements.tierEarned", { tier: tTier(badge.earnedTier) })
                : t("achievements.notEarnedYet")}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <p
        className="text-sm text-muted-foreground"
        data-testid="text-achievement-detail-description"
      >
        {tDesc(badge)}
      </p>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">{t("achievements.progress")}</span>
          <span className="font-medium" data-testid="text-achievement-detail-progress">
            {badge.value.toLocaleString()}
            {badge.thresholds.length > 0 && (
              <> / {badge.thresholds[badge.thresholds.length - 1].toLocaleString()}</>
            )}
            {badge.unit ? ` ${badge.unit}` : ""}
          </span>
        </div>
        <Progress value={percent} />
        {!earned ? (
          <p className="text-xs text-muted-foreground">
            {t("achievements.oneStepAway", {
              value: next.toLocaleString(),
              unit: badge.unit,
            })}
          </p>
        ) : (
          badge.earnedTier < badge.thresholds.length && (
            <p className="text-xs text-muted-foreground">
              {t("achievements.nextTier", {
                value: next.toLocaleString(),
                unit: badge.unit,
              })}
            </p>
          )
        )}
      </div>

      {badge.thresholds.length === 1 && earned && badge.earnedAt[1] && (
        <p
          className="text-xs text-muted-foreground"
          data-testid={`text-achievement-detail-earned-at-${badge.badgeId}`}
        >
          {t("achievements.earnedOn", {
            date: new Date(badge.earnedAt[1]).toLocaleDateString(),
          })}
        </p>
      )}

      {badge.thresholds.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("achievements.tierLabel")}
          </h4>
          <ul className="space-y-1 text-sm">
            {badge.thresholds.map((threshold, idx) => {
              const tier = idx + 1;
              const isEarned = badge.earnedTier >= tier;
              const at = badge.earnedAt[tier];
              return (
                <li
                  key={tier}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2",
                    isEarned ? TIER_BG_CLASSES[tier] : LOCKED_CLASSES,
                  )}
                  data-testid={`row-achievement-tier-${badge.badgeId}-${tier}`}
                >
                  <span className="font-medium">
                    {tTier(tier)} · {threshold.toLocaleString()} {badge.unit}
                  </span>
                  <span className="text-xs">
                    {isEarned && at
                      ? new Date(at).toLocaleDateString()
                      : isEarned
                        ? t("achievements.earned")
                        : t("achievements.locked")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
