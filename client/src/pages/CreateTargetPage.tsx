import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateTarget } from "@/hooks/use-targets";
import { useTranslation } from "react-i18next";
import { TargetForm } from "@/components/TargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { RecommendationsEntryCard } from "@/components/RecommendationsEntryCard";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { clearRecommendation, loadRecommendation } from "@/lib/recommendationStorage";
import type { InsertTarget, TargetRecommendation } from "@shared/schema";

export default function CreateTargetPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const createTarget = useCreateTarget();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const prefilledCategory = params.get("category") || undefined;
  const recommendationId = params.get("recommendation") || undefined;

  // Derive the recommendation directly from the URL on every render. Wouter
  // does NOT remount this component when navigating from /targets/new to
  // /targets/new?recommendation=<id>; it only updates `search`. Combined with
  // the `key={recommendationId || ...}` on TargetForm below, this guarantees
  // the form re-initializes with the recommendation defaults on the very
  // first render after the URL changes (no useEffect lag).
  const recommendation = useMemo<TargetRecommendation | null>(
    () => (recommendationId ? loadRecommendation(recommendationId) : null),
    [recommendationId],
  );

  const defaultValues = useMemo<Partial<InsertTarget> | undefined>(() => {
    if (recommendation) {
      return {
        name: recommendation.name,
        category: recommendation.category,
        targetValue: recommendation.targetValue,
        period: recommendation.period,
        targetType: "achievement",
        recurrence: recommendation.recurrence,
        dzikirType: recommendation.dzikirType,
        sholatType: recommendation.sholatType,
        fastingType: recommendation.fastingType,
        isJamaah: recommendation.isJamaah,
        quranUnit: recommendation.quranUnit,
        sedekahType: recommendation.sedekahType,
        customUnit: recommendation.customUnit,
        notificationTimes: [],
        intentionWhen: "",
        intentionWhere: "",
      };
    }
    if (prefilledCategory) {
      return {
        name: "",
        category: prefilledCategory,
        targetValue: 10,
        period: "daily",
        targetType: "achievement",
        recurrence: "recurring",
        notificationTimes: [],
        intentionWhen: "",
        intentionWhere: "",
      };
    }
    return undefined;
  }, [recommendation, prefilledCategory]);

  const handleSubmit = async (data: InsertTarget) => {
    try {
      await createTarget.mutateAsync(data);
      if (recommendationId) clearRecommendation(recommendationId);
      toast({
        title: t("targets.targetCreated"),
        description: t("targets.targetCreatedDesc"),
      });
      navigate("/targets");
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("targets.createError"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (recommendationId) clearRecommendation(recommendationId);
    navigate("/targets");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl" data-testid="text-create-target-title">
            {t("targets.addTarget")}
          </h1>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-close-target-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-12">
        <p className="text-muted-foreground mb-8">
          {t("targets.addTargetSubtitle")}
        </p>

        {!recommendation && <RecommendationsEntryCard surface="create-target" />}

        <TargetForm
          key={recommendationId || prefilledCategory || "blank"}
          mode="create"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createTarget.isPending}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
