import { useLocation, useParams } from "wouter";
import { useTargetsWithProgress, useUpdateTarget } from "@/hooks/use-targets";
import { useTranslation } from "react-i18next";
import { TargetForm } from "@/components/TargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InsertTarget } from "@shared/schema";

export default function EditTargetPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const targetId = params.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();
  
  const { data: targets, isLoading } = useTargetsWithProgress();
  const updateTarget = useUpdateTarget();
  
  const target = targets?.find(t => t.id === targetId);

  const handleSubmit = async (data: InsertTarget) => {
    if (!targetId) return;
    
    try {
      await updateTarget.mutateAsync({ id: targetId, data });
      toast({
        title: t("targets.targetUpdated"),
        description: t("targets.targetUpdatedDesc"),
      });
      navigate("/targets");
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("targets.updateError"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    navigate("/targets");
  };

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
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="font-display font-bold text-xl">
              {t("targets.editTarget")}
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

        <main className="container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t("targets.targetNotFound")}</h2>
              <p className="text-muted-foreground">{t("targets.targetNotFoundDesc")}</p>
              <Button onClick={handleCancel} data-testid="button-back-to-targets">
                {t("targets.backToTargets")}
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
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl" data-testid="text-edit-target-title">
            {t("targets.editTarget")}
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
          {t("targets.editTargetSubtitle")}
        </p>

        <TargetForm
          mode="edit"
          editingTarget={target}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateTarget.isPending}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
