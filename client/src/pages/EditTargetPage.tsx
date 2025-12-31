import { useLocation, useParams } from "wouter";
import { useTargetsWithProgress, useUpdateTarget } from "@/hooks/use-targets";
import { useTranslation } from "react-i18next";
import { TargetForm } from "@/components/TargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { InsertTarget } from "@shared/schema";

export default function EditTargetPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: targets, isLoading } = useTargetsWithProgress();
  const updateTarget = useUpdateTarget();

  const targetId = parseInt(params.id || "0", 10);
  const target = targets?.find((t) => t.id === targetId);

  const handleSubmit = async (data: InsertTarget) => {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" data-testid="loader-edit-target" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-2xl mx-auto p-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t("targets.notFound")}
          </h1>
          <p className="text-muted-foreground">{t("targets.notFoundDesc")}</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <header className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-edit-target-title">
            {t("targets.editTarget")}
          </h1>
          <ThemeToggle />
        </header>

        <TargetForm
          mode="edit"
          editingTarget={target}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateTarget.isPending}
        />
      </div>

      <BottomNavigation />
    </div>
  );
}
