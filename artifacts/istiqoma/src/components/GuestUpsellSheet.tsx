import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LoginOptions } from "@/components/auth/LoginOptions";

/**
 * Bottom sheet shown when a guest tries to perform a write action (record a
 * deed, create a target, etc.). It explains an account is needed and offers
 * the same two login/sign-up paths as the Landing login sheet.
 */
export function GuestUpsellSheet({
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
        data-testid="sheet-guest-upsell"
      >
        <SheetHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <SheetTitle data-testid="text-guest-upsell-title">
            {t("guest.upsell.title")}
          </SheetTitle>
          <SheetDescription data-testid="text-guest-upsell-desc">
            {t("guest.upsell.description")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 mb-2">
          <LoginOptions onChosen={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
