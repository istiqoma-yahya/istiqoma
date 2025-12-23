import { useAuth } from "@/hooks/use-auth";
import { useDeeds } from "@/hooks/use-deeds";
import { StatsOverview } from "@/components/StatsOverview";
import { DeedCard } from "@/components/DeedCard";
import { Loader2, LogOut, User, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
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
  const [, navigate] = useLocation();

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
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <span className="font-display font-bold text-xl">D</span>
            </div>
            <h1 className="font-display font-bold text-xl">DeedTracker</h1>
          </div>

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
            <DropdownMenuContent className="w-56 bg-[#1E293B] border-white/10 text-white" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => navigate("/categories")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage Categories</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">Track your journey, one deed at a time.</p>
          </div>
          <button 
            onClick={() => navigate("/create-deed")}
            className="btn-primary flex items-center gap-2"
            data-testid="button-create-deed"
          >
            <Plus className="w-5 h-5" />
            <span>Record Deed</span>
          </button>
        </div>

        <StatsOverview deeds={sortedDeeds} />

        <div className="space-y-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            Recent Activity
            <span className="text-sm font-normal text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
              {sortedDeeds.length}
            </span>
          </h3>

          {sortedDeeds.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-white/10">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <h3 className="text-lg font-medium mb-2">No deeds recorded yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Start tracking your good and bad deeds to see your progress over time.
              </p>
              <button 
                onClick={() => navigate("/create-deed")}
                className="btn-primary flex items-center gap-2"
                data-testid="button-create-deed-empty"
              >
                <Plus className="w-5 h-5" />
                <span>Record Deed</span>
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
