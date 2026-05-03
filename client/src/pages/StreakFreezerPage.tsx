import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Snowflake, Gem, Loader2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";

interface StreakFreezerPack {
  size: number;
  cost: number;
  discountPercent: number;
}

interface FreezerEntry {
  date: string;
  refundedAt: string | null;
}

interface StreakFreezerData {
  freezer: { owned: number; used: number; available: number };
  points: { earned: number; spent: number; available: number };
  frozenDates: string[];
  frozenEntries: FreezerEntry[];
  packs: StreakFreezerPack[];
}

interface PurchaseResponse {
  freezer: { owned: number; used: number; available: number };
  points: { earned: number; spent: number; available: number };
  purchased: { packSize: number; pointsCost: number; freezersGranted: number };
}

const FREEZER_DATA_KEY = "/api/streak-freezer";

export default function StreakFreezerPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [pendingPack, setPendingPack] = useState<StreakFreezerPack | null>(null);

  const { data, isLoading } = useQuery<StreakFreezerData>({
    queryKey: [FREEZER_DATA_KEY],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packSize: number) => {
      const res = await apiRequest("POST", "/api/streak-freezer/purchase", { packSize });
      return (await res.json()) as PurchaseResponse;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [FREEZER_DATA_KEY] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak"] });
      toast({
        title: t("streakFreezer.purchaseSuccessTitle"),
        description: t("streakFreezer.purchaseSuccessDescription", {
          count: result.purchased.freezersGranted,
        }),
      });
      setPendingPack(null);
    },
    onError: (err: Error) => {
      const isInsufficient = err.message.startsWith("402:");
      toast({
        title: isInsufficient
          ? t("streakFreezer.insufficientPointsTitle")
          : t("streakFreezer.purchaseErrorTitle"),
        description: isInsufficient
          ? t("streakFreezer.insufficientPointsDescription")
          : err.message,
        variant: "destructive",
      });
      setPendingPack(null);
    },
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T00:00:00Z`);
      return d.toLocaleDateString(i18n.language, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const { freezer, points, frozenEntries, packs } = data;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back-streak-freezer"
            aria-label={t("streakFreezer.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold" data-testid="text-streak-freezer-title">
            {t("streakFreezer.title")}
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="p-5 border border-sky-500/20" data-testid="card-freezer-balance">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Snowflake className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("streakFreezer.balanceLabel")}
              </p>
            </div>
            <h2 className="text-3xl font-bold font-display text-sky-600 dark:text-sky-400" data-testid="text-freezer-balance">
              {formatNumber(freezer.available)}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("streakFreezer.usedSoFar", { count: freezer.used })}
            </p>
          </Card>

          <Card className="p-5 border border-emerald-500/20" data-testid="card-points-balance">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Gem className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("streakFreezer.pointsLabel")}
              </p>
            </div>
            <h2 className="text-3xl font-bold font-display text-emerald-600 dark:text-emerald-400" data-testid="text-points-balance">
              {formatNumber(points.available)}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("streakFreezer.spentSoFar", { count: points.spent })}
            </p>
          </Card>
        </motion.div>

        <Card className="p-5">
          <h3 className="text-base font-semibold mb-1" data-testid="text-how-it-works">
            {t("streakFreezer.howItWorksTitle")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("streakFreezer.howItWorksDescription")}
          </p>
        </Card>

        <div>
          <h3 className="text-base font-semibold mb-3">{t("streakFreezer.packsTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {packs.map((pack) => {
              const canAfford = points.available >= pack.cost;
              const pricePerFreezer = Math.round(pack.cost / pack.size);
              const pointsShort = Math.max(0, pack.cost - points.available);
              return (
                <Card
                  key={pack.size}
                  className={`p-4 transition-colors ${canAfford ? "hover:bg-muted/40" : "opacity-70"}`}
                  data-testid={`card-pack-${pack.size}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xl font-bold font-display" data-testid={`text-pack-size-${pack.size}`}>
                        {t("streakFreezer.packSize", { count: pack.size })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("streakFreezer.pricePer", { price: formatNumber(pricePerFreezer) })}
                      </p>
                    </div>
                    {pack.discountPercent > 0 && (
                      <span className="text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-lg" data-testid={`text-pack-discount-${pack.size}`}>
                        {t("streakFreezer.discountBadge", { percent: pack.discountPercent })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Gem className="w-4 h-4" />
                      <span data-testid={`text-pack-cost-${pack.size}`}>{formatNumber(pack.cost)}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={!canAfford || purchaseMutation.isPending}
                      onClick={() => setPendingPack(pack)}
                      data-testid={`button-buy-pack-${pack.size}`}
                    >
                      {canAfford
                        ? t("streakFreezer.buy")
                        : t("streakFreezer.notEnough")}
                    </Button>
                  </div>
                  {!canAfford && (
                    <p
                      className="text-xs text-muted-foreground mt-2 text-right"
                      data-testid={`text-pack-shortfall-${pack.size}`}
                    >
                      {t("streakFreezer.needMorePoints", { count: pointsShort })}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">{t("streakFreezer.frozenDaysTitle")}</h3>
          {frozenEntries.length === 0 ? (
            <Card className="p-6 border-dashed text-center">
              <p className="text-sm text-muted-foreground" data-testid="text-no-frozen-days">
                {t("streakFreezer.noFrozenDays")}
              </p>
            </Card>
          ) : (
            <Card className="divide-y divide-border" data-testid="list-frozen-days">
              {frozenEntries.slice().reverse().map((entry) => {
                const isRefunded = entry.refundedAt !== null;
                return (
                  <div
                    key={entry.date}
                    className="flex items-center gap-3 px-4 py-3"
                    data-testid={`row-frozen-date-${entry.date}`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isRefunded
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {isRefunded ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <Snowflake className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${isRefunded ? "line-through text-muted-foreground" : ""}`}
                        data-testid={`text-frozen-date-${entry.date}`}
                      >
                        {formatDate(entry.date)}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-frozen-status-${entry.date}`}>
                        {isRefunded
                          ? t("streakFreezer.refundedByBackdate")
                          : t("streakFreezer.savedByFreezer")}
                      </p>
                    </div>
                    {isRefunded ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400" data-testid={`text-refunded-${entry.date}`}>
                        {t("streakFreezer.refundedBadge")}
                      </span>
                    ) : (
                      <Check className="w-4 h-4 text-sky-500" />
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </main>

      <AlertDialog
        open={pendingPack !== null}
        onOpenChange={(open) => { if (!open) setPendingPack(null); }}
      >
        <AlertDialogContent data-testid="dialog-confirm-purchase">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("streakFreezer.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPack && t("streakFreezer.confirmDescription", {
                count: pendingPack.size,
                cost: formatNumber(pendingPack.cost),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-purchase">
              {t("streakFreezer.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingPack && purchaseMutation.mutate(pendingPack.size)}
              disabled={purchaseMutation.isPending}
              data-testid="button-confirm-purchase"
            >
              {purchaseMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("streakFreezer.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
