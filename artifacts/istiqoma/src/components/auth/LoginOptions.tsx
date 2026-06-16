import { useTranslation } from "react-i18next";
import { Mail, KeyRound } from "lucide-react";
import { openNativeLogin } from "@/lib/native-login";

/**
 * The two canonical login/sign-up paths used by both the Landing login sheet
 * and the guest sign-up upsell sheet:
 *   - Email (Replit Auth / OIDC) via openNativeLogin()
 *   - PIN (username + PIN) via /login/username
 */
export function LoginOptions({ onChosen }: { onChosen?: () => void }) {
  const { t } = useTranslation();

  const loginWithEmail = () => {
    onChosen?.();
    openNativeLogin().catch(console.error);
  };

  const loginWithPin = () => {
    onChosen?.();
    window.location.href = "/login/username";
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={loginWithEmail}
        className="btn-primary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2"
        data-testid="button-login-email"
      >
        <Mail className="w-5 h-5 shrink-0" />
        <span className="whitespace-nowrap">{t("auth.loginMethod.email")}</span>
      </button>
      <button
        type="button"
        onClick={loginWithPin}
        className="btn-secondary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2 border border-border"
        data-testid="button-login-pin"
      >
        <KeyRound className="w-5 h-5 shrink-0" />
        <span className="whitespace-nowrap">{t("auth.loginMethod.pin")}</span>
      </button>
    </div>
  );
}
