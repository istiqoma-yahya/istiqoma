import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import type { User } from "@/hooks/use-auth";

interface ConsentScreenProps {
  onConfirmed: () => void;
  onRefused?: () => void;
  asModal?: boolean;
}

export default function ConsentScreen({ onConfirmed, onRefused, asModal = false }: ConsentScreenProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [consentReligious, setConsentReligious] = useState(false);
  const [consentAge, setConsentAge] = useState(false);

  const canProceed = consentReligious && consentAge;

  const consentMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/account/consent", {
        consentReligiousData: true,
        consentAgeConfirmed: true,
      }),
    onSuccess: async () => {
      queryClient.setQueryData<User | null>(["/api/auth/user"], (prev) =>
        prev
          ? { ...prev, consentReligiousData: true, consentAgeConfirmed: true }
          : prev,
      );
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onConfirmed();
    },
  });

  const content = (
    <div
      className={
        asModal
          ? "relative z-50 bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 flex flex-col gap-5"
          : "flex flex-col gap-5 max-w-md w-full"
      }
      data-testid="consent-screen"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight" data-testid="text-consent-title">
            {t("consent.title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("consent.required")}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-consent-body">
        {t("consent.body")}
      </p>

      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
        <li>{t("consent.dataTypes.deeds")}</li>
        <li>{t("consent.dataTypes.prayer")}</li>
        <li>{t("consent.dataTypes.quran")}</li>
      </ul>

      <p className="text-xs text-muted-foreground">
        {t("consent.gdprNote")}
      </p>

      <div className="space-y-3">
        <label
          className="flex items-start gap-3 cursor-pointer group"
          data-testid="label-consent-religious"
        >
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0 cursor-pointer"
            checked={consentReligious}
            onChange={(e) => setConsentReligious(e.target.checked)}
            data-testid="checkbox-consent-religious"
          />
          <span className="text-sm leading-snug group-hover:text-foreground transition-colors">
            {t("consent.checkboxReligious")}
          </span>
        </label>

        <label
          className="flex items-start gap-3 cursor-pointer group"
          data-testid="label-consent-age"
        >
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0 cursor-pointer"
            checked={consentAge}
            onChange={(e) => setConsentAge(e.target.checked)}
            data-testid="checkbox-consent-age"
          />
          <span className="text-sm leading-snug group-hover:text-foreground transition-colors">
            {t("consent.checkboxAge")}
          </span>
        </label>
      </div>

      {consentMutation.isError && (
        <div className="flex items-center gap-2 text-destructive text-sm" data-testid="text-consent-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {t("consent.saveError")}
        </div>
      )}

      <button
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: canProceed ? "var(--color-primary, #10b981)" : undefined,
          backgroundColor: canProceed ? undefined : "hsl(var(--muted))",
          color: canProceed ? "#fff" : "hsl(var(--muted-foreground))",
        }}
        disabled={!canProceed || consentMutation.isPending}
        onClick={() => consentMutation.mutate()}
        data-testid="button-consent-continue"
      >
        {consentMutation.isPending ? (
          <Loader2 className="inline w-4 h-4 animate-spin" />
        ) : (
          t("consent.continue")
        )}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        {t("consent.privacyHint")}{" "}
        <a href="/privacy" className="underline underline-offset-2 text-primary" target="_blank" rel="noopener noreferrer">
          {t("consent.privacyLink")}
        </a>
      </p>

      {onRefused && (
        <p className="text-xs text-muted-foreground text-center">
          {t("consent.refuseHint")}{" "}
          <button
            type="button"
            className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onRefused}
            data-testid="button-consent-signout"
          >
            {t("consent.refuseLink")}
          </button>
        </p>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        data-testid="consent-modal-overlay"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-background"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {content}
    </motion.div>
  );
}
