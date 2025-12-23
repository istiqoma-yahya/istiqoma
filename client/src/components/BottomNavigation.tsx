import { useLocation } from "wouter";
import { BarChart3, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNavigation() {
  const [location, navigate] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-background/80 backdrop-blur-md z-40">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive("/")
                ? "text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-nav-dashboard"
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/progress")}
            className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive("/progress")
                ? "text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-nav-progress"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Progress</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
