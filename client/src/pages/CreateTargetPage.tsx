import { useLocation } from "wouter";
import { useCreateTarget } from "@/hooks/use-targets";
import { useTranslation } from "react-i18next";
import { TargetForm } from "@/components/TargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
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

        <TargetForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createTarget.isPending}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
