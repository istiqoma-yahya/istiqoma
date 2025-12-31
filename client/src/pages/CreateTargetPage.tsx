import { useLocation } from "wouter";
import { useCreateTarget } from "@/hooks/use-targets";
import { useTranslation } from "react-i18next";
import { TargetForm } from "@/components/TargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { InsertTarget } from "@shared/schema";

export default function CreateTargetPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createTarget = useCreateTarget();

  const handleSubmit = async (data: InsertTarget) => {
    try {
      await createTarget.mutateAsync(data);
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
    navigate("/targets");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <header className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-create-target-title">
            {t("targets.addTarget")}
          </h1>
          <ThemeToggle />
        </header>

        <TargetForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createTarget.isPending}
        />
      </div>

      <BottomNavigation />
    </div>
  );
}
