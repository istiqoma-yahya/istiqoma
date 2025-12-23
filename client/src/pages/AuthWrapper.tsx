import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Dashboard from "./Dashboard";
import Landing from "./Landing";
import { BottomNavigation } from "@/components/BottomNavigation";

export default function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <Dashboard />
        <BottomNavigation />
      </>
    );
  }

  return <Landing />;
}
