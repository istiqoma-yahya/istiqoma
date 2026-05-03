import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Share2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  subscribeBadgeCelebrations,
} from "@/lib/badge-celebration";
import type { NewlyEarnedBadge } from "@shared/schema";

const TIER_RING_CLASSES = [
  "",
  "from-amber-500 to-amber-700 text-amber-50",
  "from-slate-300 to-slate-500 text-slate-50",
  "from-yellow-300 to-yellow-500 text-yellow-950",
  "from-cyan-300 to-cyan-500 text-cyan-950",
];

const CONFETTI_COLORS = [
  "#f59e0b",
  "#facc15",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#c084fc",
  "#fb7185",
];

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const Icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return Icons[name] ?? Icons.Award ?? Icons.Star;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.4,
        rotate: Math.random() * 720 - 360,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        drift: (Math.random() - 0.5) * 120,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: "110vh",
            x: p.drift,
            rotate: p.rotate,
            opacity: [0, 1, 1, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export function BadgeCelebration() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [queue, setQueue] = useState<NewlyEarnedBadge[]>([]);

  useEffect(
    () =>
      subscribeBadgeCelebrations((badges) => {
        setQueue((prev) => [...prev, ...badges]);
      }),
    [],
  );

  const current = queue[0] ?? null;

  const close = () => setQueue((prev) => prev.slice(1));

  const tierLabel = (tier: number) =>
    t(`achievements.tiers.${tier}`, { defaultValue: `Tier ${tier}` });

  const shareTitle = t("achievements.celebrationTitle", {
    defaultValue: "Badge unlocked!",
  });

  const handleShare = async () => {
    if (!current) return;
    const text = t("achievements.shareText", {
      defaultValue: "I just unlocked the {{tier}} {{name}} badge on Istiqoma! 🏆",
      tier: tierLabel(current.tier),
      name: current.name,
    });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: shareTitle, text });
        return;
      }
    } catch {
      // user cancelled or share failed; fall back to clipboard
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast({
          title: t("achievements.shareCopied", {
            defaultValue: "Copied to clipboard",
          }),
        });
      }
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={`${current.badgeId}-${current.tier}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="badge-celebration-overlay"
          onClick={close}
        >
          <Confetti />
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border bg-background p-6 text-center shadow-2xl"
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="badge-celebration-card"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover-elevate active-elevate-2"
              data-testid="button-close-celebration"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {shareTitle}
            </p>

            <motion.div
              className="mx-auto mt-5 flex h-28 w-28 items-center justify-center"
              initial={{ rotate: -20, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            >
              <div
                className={cn(
                  "relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br shadow-lg ring-4 ring-background",
                  TIER_RING_CLASSES[current.tier] ?? TIER_RING_CLASSES[1],
                )}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6), transparent 60%)",
                  }}
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                {(() => {
                  const Icon = getIcon(current.icon);
                  return <Icon className="relative h-14 w-14" />;
                })()}
              </div>
            </motion.div>

            <motion.h3
              className="mt-5 text-2xl font-bold"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              data-testid="text-celebration-name"
            >
              {t(`achievements.badges.${current.badgeId}.name`, {
                defaultValue: current.name,
              })}
            </motion.h3>
            <motion.p
              className="mt-1 text-sm font-semibold uppercase tracking-wider text-primary"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.32 }}
              data-testid="text-celebration-tier"
            >
              {tierLabel(current.tier)}
            </motion.p>
            <motion.p
              className="mt-3 text-sm text-muted-foreground"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              data-testid="text-celebration-description"
            >
              {t(`achievements.badges.${current.badgeId}.description`, {
                defaultValue: current.description,
              })}
            </motion.p>

            {queue.length > 1 && (
              <p className="mt-3 text-[11px] text-muted-foreground" data-testid="text-celebration-queue">
                {t("achievements.celebrationMore", {
                  defaultValue: "+{{count}} more to go",
                  count: queue.length - 1,
                })}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                data-testid="button-share-celebration"
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                {t("achievements.share", { defaultValue: "Share" })}
              </Button>
              <Button size="sm" onClick={close} data-testid="button-continue-celebration">
                {queue.length > 1
                  ? t("achievements.celebrationNext", { defaultValue: "Next" })
                  : t("achievements.celebrationContinue", { defaultValue: "Awesome!" })}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
