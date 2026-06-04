import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function GenderPromptCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState(false);

  const patchMutation = useMutation({
    mutationFn: async (payload: { gender?: "male" | "female"; genderPromptDismissed?: boolean }) => {
      await apiRequest("PATCH", "/api/onboarding/gender", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      setHidden(true);
    },
  });

  if (hidden) return null;

  const handleGender = (gender: "male" | "female") => {
    patchMutation.mutate({ gender, genderPromptDismissed: true });
  };

  const handleDismiss = () => {
    patchMutation.mutate({ genderPromptDismissed: true });
  };

  return (
    <div
      className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6"
      data-testid="card-gender-prompt"
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label={t("genderPrompt.dismiss")}
        data-testid="button-gender-prompt-dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <p className="text-sm font-semibold mb-1 pr-6" data-testid="text-gender-prompt-title">
        {t("genderPrompt.title")}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {t("genderPrompt.subtitle")}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleGender("male")}
          disabled={patchMutation.isPending}
          className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-muted transition-colors"
          data-testid="button-gender-male"
        >
          <img
            src="/avatars/muslim-1-neutral.png"
            alt="Muslim"
            className="w-16 h-16 object-contain"
          />
          <span className="text-xs font-medium">{t("genderPrompt.male")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleGender("female")}
          disabled={patchMutation.isPending}
          className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-muted transition-colors"
          data-testid="button-gender-female"
        >
          <img
            src="/avatars/muslimah-1-neutral.png"
            alt="Muslimah"
            className="w-16 h-16 object-contain"
          />
          <span className="text-xs font-medium">{t("genderPrompt.female")}</span>
        </button>
      </div>
    </div>
  );
}
