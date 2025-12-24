import { useLocation } from "wouter";
import { BarChart3, Home, Circle, Compass, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function BottomNavigation() {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md z-40">
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
            <span>{t('nav.home')}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/dzikir")}
            className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive("/dzikir")
                ? "text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-nav-dzikir"
          >
            <Circle className="w-5 h-5" />
            <span>{t('nav.dzikir')}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/qibla")}
            className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive("/qibla")
                ? "text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-nav-qibla"
          >
            <Compass className="w-5 h-5" />
            <span>{t('nav.qibla')}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/targets")}
            className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive("/targets")
                ? "text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-nav-targets"
          >
            <Target className="w-5 h-5" />
            <span>{t('nav.targets')}</span>
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
            <span>{t('nav.progress')}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
