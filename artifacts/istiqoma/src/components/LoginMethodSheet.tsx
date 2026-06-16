import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LoginOptions } from "@/components/auth/LoginOptions";

/**
 * Bottom sheet offering the two login methods. Opened from the Landing page's
 * "Login to My Account" CTA.
 */
export function LoginMethodSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-border max-w-md mx-auto"
        data-testid="sheet-login-method"
      >
        <SheetHeader className="text-center sm:text-center">
          <SheetTitle data-testid="text-login-method-title">
            {t("auth.loginMethod.title")}
          </SheetTitle>
          <SheetDescription data-testid="text-login-method-desc">
            {t("auth.loginMethod.description")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 mb-2">
          <LoginOptions onChosen={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
