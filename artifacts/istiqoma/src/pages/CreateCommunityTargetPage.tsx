import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { CommunityTargetForm } from "@/components/CommunityTargetForm";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { useCreateCommunityTarget } from "@/hooks/use-community-targets";
import { useGuest } from "@/hooks/use-guest";
import type { InsertCommunityTarget } from "@shared/schema";

export default function CreateCommunityTargetPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateCommunityTarget();
  const { isGuest, promptSignup } = useGuest();

  const handleSubmit = async (data: InsertCommunityTarget) => {
    if (isGuest) {
      promptSignup();
      return;
    }
    try {
      const created = await createMutation.mutateAsync(data);
      toast({ title: t("community.created"), description: t("community.createdDesc") });
      navigate(`/community-targets/${created.id}`);
    } catch {
      toast({
        title: t("common.error"),
        description: t("community.createError"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => navigate("/targets?tab=community");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl" data-testid="text-create-community-title">
            {t("community.createTitle")}
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
        <p className="text-muted-foreground mb-8">{t("community.createSubtitle")}</p>
        <CommunityTargetForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createMutation.isPending}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
