import { useAuth } from "@/hooks/use-auth";
import { useDeeds } from "@/hooks/use-deeds";
import { useTargetsWithProgress } from "@/hooks/use-targets";
import { StatsOverview } from "@/components/StatsOverview";
import { DeedCard } from "@/components/DeedCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Loader2, LogOut, User, Settings, Plus, Target, Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  const { user, logout, isLoggingOut } = useAuth();
  const { data: deeds, isLoading } = useDeeds();
  const { data: targets } = useTargetsWithProgress();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // Sort deeds by date desc
  const sortedDeeds = deeds?.slice().sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }) || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <span style={{ fontFamily: "'Alhabsyi', serif" }} className="text-xl">I</span>
            </div>
            <h1 style={{ fontFamily: "'Alhabsyi', serif" }} className="text-2xl">Istiqoma</h1>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(user?.firstName && user.firstName.charAt(0)) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => navigate("/categories")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('user.manageCategories')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('user.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold mb-2">{t('dashboard.greeting')}</h2>
            <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>
          <button 
            onClick={() => navigate("/create-deed")}
            className="btn-primary flex items-center gap-2"
            data-testid="button-create-deed"
          >
            <Plus className="w-5 h-5" />
            <span>{t('dashboard.recordDeed')}</span>
          </button>
        </div>

        <StatsOverview deeds={sortedDeeds} />

        {targets && targets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                {t('dashboard.activeTargets')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/targets")}
                className="text-muted-foreground"
                data-testid="button-view-all-targets"
              >
                {t('dashboard.viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {targets.slice(0, 3).map((target) => (
                <Card key={target.id} className="p-3" data-testid={`card-dashboard-target-${target.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{target.category}</span>
                    {target.percentComplete >= 100 && (
                      <Trophy className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <Progress value={target.percentComplete} className="h-2 mb-1" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{target.currentValue} / {target.targetValue}</span>
                    <span className={target.percentComplete >= 100 ? "text-emerald-500 font-medium" : ""}>
                      {target.percentComplete}%
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            {t('dashboard.recentActivity')}
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {sortedDeeds.length}
            </span>
          </h3>

          {sortedDeeds.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-border">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t('dashboard.noDeeds')}</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {t('dashboard.startRecording')}
              </p>
              <button 
                onClick={() => navigate("/create-deed")}
                className="btn-primary flex items-center gap-2"
                data-testid="button-create-deed-empty"
              >
                <Plus className="w-5 h-5" />
                <span>{t('dashboard.recordDeed')}</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedDeeds.map((deed, i) => (
                <DeedCard key={deed.id} deed={deed} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
