import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGuest } from "@/hooks/use-guest";
import { Loader2 } from "lucide-react";
import Dashboard from "./Dashboard";
import Landing from "./Landing";
import OnboardingFlow from "./OnboardingFlow";
import ConsentScreen from "@/components/ConsentScreen";
import { BottomNavigation } from "@/components/BottomNavigation";
export default function AuthWrapper() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isGuest, guestOnboarded, exitGuestMode } = useGuest();

  // Once a real session exists, guest mode is over — clear the flag so the
  // normal authenticated flows take over on the next render.
  useEffect(() => {
    if (isAuthenticated && isGuest) {
      exitGuestMode();
    }
  }, [isAuthenticated, isGuest, exitGuestMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (user && !user.onboardingComplete) {
      return <OnboardingFlow />;
    }
    const hasConsented = user?.consentReligiousData && user?.consentAgeConfirmed;
    if (!hasConsented) {
      return (
        <ConsentScreen
          onConfirmed={() => {}}
          onRefused={() => logout()}
          asModal
        />
      );
    }
    return (
      <>
        <Dashboard />
        <BottomNavigation />
      </>
    );
  }

  // Unauthenticated guest browsing: show the (skippable) onboarding first,
  // then the normal app shell. No server session, no consent gate — guest
  // state lives entirely client-side and writes are blocked behind a prompt.
  if (isGuest) {
    if (!guestOnboarded) {
      return <OnboardingFlow />;
    }
    return (
      <>
        <Dashboard />
        <BottomNavigation />
      </>
    );
  }

  return <Landing />;
}
