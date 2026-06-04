import { useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { CommunityTargetForm } from "@/components/CommunityTargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCommunityTarget, useUpdateCommunityTarget } from "@/hooks/use-community-targets";
import type { InsertCommunityTarget } from "@shared/schema";

export default function EditCommunityTargetPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();

  const { data: target, isLoading } = useCommunityTarget(id);
  const updateMutation = useUpdateCommunityTarget();

  const handleSubmit = async (data: InsertCommunityTarget) => {
    if (id == null) return;
    try {
      await updateMutation.mutateAsync({ id, data });
      toast({ title: t("community.updated"), description: t("community.updatedDesc") });
      navigate(`/community-targets/${id}`);
    } catch {
      toast({
        title: t("common.error"),
        description: t("community.updateError"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => navigate(id ? `/community-targets/${id}` : "/targets?tab=community");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <BottomNavigation />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <main className="container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t("community.notFound")}</h2>
              <Button onClick={handleCancel} data-testid="button-back-to-community">
                {t("common.back")}
              </Button>
            </div>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!target.isCreator) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <main className="container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t("community.onlyCreator")}</h2>
              <Button onClick={handleCancel} data-testid="button-back-to-community">
                {t("common.back")}
              </Button>
            </div>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl" data-testid="text-edit-community-title">
            {t("community.editTitle")}
          </h1>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-close-community-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-12">
        <CommunityTargetForm
          mode="edit"
          defaultValues={{
            name: target.name,
            category: target.category,
            targetValue: target.targetValue,
            period: target.period,
            unitLabel: target.unitLabel ?? "",
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateMutation.isPending}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
