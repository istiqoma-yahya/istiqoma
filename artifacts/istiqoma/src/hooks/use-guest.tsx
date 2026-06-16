import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GUEST_CHANGED_EVENT,
  clearGuestState,
  isGuestMode,
  isGuestOnboarded,
  setGuestMode,
  setGuestOnboardedFlag,
} from "@/lib/guest";
import { GuestUpsellSheet } from "@/components/GuestUpsellSheet";
import { LoginMethodSheet } from "@/components/LoginMethodSheet";

type GuestContextValue = {
  /** True when the user is browsing as a guest (no server session). */
  isGuest: boolean;
  /** True once the guest has finished (or skipped) the onboarding flow. */
  guestOnboarded: boolean;
  /** Start guest browsing — leads into the (skippable) onboarding flow. */
  enterGuestMode: () => void;
  /** Clear all guest state (used on successful login / logout). */
  exitGuestMode: () => void;
  /** Mark the guest onboarding as done so the app shell renders. */
  markGuestOnboarded: () => void;
  /** Block a write action and prompt the guest to sign up. */
  promptSignup: () => void;
  /** Open the login-method bottom sheet (email / PIN). */
  openLoginSheet: () => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState<boolean>(() => isGuestMode());
  const [guestOnboarded, setGuestOnboarded] = useState<boolean>(() =>
    isGuestOnboarded(),
  );
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [loginSheetOpen, setLoginSheetOpen] = useState(false);

  // Keep React state in sync if the flags change (e.g. another component or a
  // different tab toggles guest mode).
  useEffect(() => {
    const sync = () => {
      setIsGuest(isGuestMode());
      setGuestOnboarded(isGuestOnboarded());
    };
    window.addEventListener(GUEST_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GUEST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const enterGuestMode = useCallback(() => {
    setGuestOnboardedFlag(false);
    setGuestMode(true);
    setIsGuest(true);
    setGuestOnboarded(false);
  }, []);

  const exitGuestMode = useCallback(() => {
    clearGuestState();
    setIsGuest(false);
    setGuestOnboarded(false);
  }, []);

  const markGuestOnboarded = useCallback(() => {
    setGuestOnboardedFlag(true);
    setGuestOnboarded(true);
  }, []);

  const promptSignup = useCallback(() => {
    setUpsellOpen(true);
  }, []);

  const openLoginSheet = useCallback(() => {
    setLoginSheetOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isGuest,
      guestOnboarded,
      enterGuestMode,
      exitGuestMode,
      markGuestOnboarded,
      promptSignup,
      openLoginSheet,
    }),
    [
      isGuest,
      guestOnboarded,
      enterGuestMode,
      exitGuestMode,
      markGuestOnboarded,
      promptSignup,
      openLoginSheet,
    ],
  );

  return (
    <GuestContext.Provider value={value}>
      {children}
      <GuestUpsellSheet open={upsellOpen} onOpenChange={setUpsellOpen} />
      <LoginMethodSheet open={loginSheetOpen} onOpenChange={setLoginSheetOpen} />
    </GuestContext.Provider>
  );
}

export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return ctx;
}
