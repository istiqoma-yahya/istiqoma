import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Dashboard from "./Dashboard";
import Landing from "./Landing";
import OnboardingFlow from "./OnboardingFlow";
import ConsentScreen from "@/components/ConsentScreen";
import { BottomNavigation } from "@/components/BottomNavigation";

export default function AuthWrapper() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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

  return <Landing />;
}
