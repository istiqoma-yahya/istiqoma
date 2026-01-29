import { Check, Moon, BookOpen, Heart, Bell, Calendar, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AppMockups() {
  return (
    <div className="flex flex-wrap justify-center gap-6 mb-12">
      {/* Today's Progress Card */}
      <Card className="w-72 bg-white dark:bg-slate-50 border-0 shadow-xl" data-testid="mockup-today-progress">
        <CardContent className="p-5 text-left">
          <p className="text-emerald-600 text-xs font-semibold tracking-wider uppercase mb-1" data-testid="text-mockup-progress-label">TODAY'S PROGRESS</p>
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <h3 className="text-slate-900 text-2xl font-bold" data-testid="text-mockup-date">14 Muharram</h3>
            <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-semibold text-sm" data-testid="text-mockup-task-1-title">Fajr Prayer</p>
                <p className="text-slate-500 text-xs" data-testid="text-mockup-task-1-status">Completed at 5:45 AM</p>
              </div>
              <Moon className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center" />
              <div className="flex-1">
                <p className="text-slate-800 font-semibold text-sm" data-testid="text-mockup-task-2-title">Read Surah Kahf</p>
                <p className="text-emerald-600 text-xs" data-testid="text-mockup-task-2-status">Target: 20 mins</p>
              </div>
              <BookOpen className="w-5 h-5 text-emerald-500" />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center" />
              <div className="flex-1">
                <p className="text-slate-800 font-semibold text-sm" data-testid="text-mockup-task-3-title">Give Sadaqah</p>
                <p className="text-emerald-600 text-xs" data-testid="text-mockup-task-3-status">Daily goal</p>
              </div>
              <Heart className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          
          <div className="mt-4 bg-slate-900 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-slate-400 text-xs" data-testid="text-mockup-streak-label">Current Streak</p>
                <p className="text-white font-bold" data-testid="text-mockup-streak-value">12 Days</p>
              </div>
            </div>
            <span className="bg-slate-800 text-slate-300 text-sm px-3 py-1 rounded-lg" data-testid="text-mockup-points">+40 pts</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Personalize Goals Card */}
      <Card className="w-72 bg-white dark:bg-slate-50 border-0 shadow-xl" data-testid="mockup-personalize-goals">
        <CardContent className="p-5 text-left">
          <p className="text-slate-900 text-sm font-bold tracking-wide uppercase mb-5" data-testid="text-mockup-goals-label">PERSONALIZE GOALS</p>
          
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-slate-800 font-semibold text-sm" data-testid="text-mockup-quran-goal-label">Daily Quran Goal</p>
              <p className="text-emerald-600 text-sm font-medium" data-testid="text-mockup-quran-goal-value">5 Pages</p>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full w-2/5 bg-emerald-500 rounded-full" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-semibold text-sm" data-testid="text-mockup-reminder-1-title">Tahajjud Reminders</p>
                <p className="text-emerald-600 text-xs" data-testid="text-mockup-reminder-1-desc">Last 3rd of night</p>
              </div>
              <div className="w-12 h-7 bg-emerald-500 rounded-full flex items-center justify-end px-1">
                <div className="w-5 h-5 bg-white rounded-full" />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-semibold text-sm" data-testid="text-mockup-reminder-2-title">Monday/Thursday Fasting</p>
                <p className="text-emerald-600 text-xs" data-testid="text-mockup-reminder-2-desc">Sunnah habit</p>
              </div>
              <div className="w-12 h-7 bg-slate-300 rounded-full flex items-center justify-start px-1">
                <div className="w-5 h-5 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
