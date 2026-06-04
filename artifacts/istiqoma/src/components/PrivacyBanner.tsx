import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export const PRIVACY_VERSION = "2025-06-13";

export default function PrivacyBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const ackMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/account/privacy-ack", { version: PRIVACY_VERSION });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      setDismissed(false);
    },
  });

  const handleDismiss = () => {
    setDismissed(true);
    ackMutation.mutate();
  };

  if (!user) return null;
  if (dismissed) return null;
  if (user.privacyVersionSeen === PRIVACY_VERSION) return null;

  return (
    <div
      className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center gap-3 text-sm"
      data-testid="banner-privacy-update"
    >
      <p className="flex-1 text-foreground min-w-0">
        {t("privacyBanner.message")}{" "}
        <Link
          href="/privacy"
          className="text-primary underline underline-offset-2 font-medium hover:text-primary/80"
          data-testid="link-privacy-banner-view"
        >
          {t("privacyBanner.viewLink")}
        </Link>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={t("privacyBanner.dismiss")}
        data-testid="button-privacy-banner-dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
