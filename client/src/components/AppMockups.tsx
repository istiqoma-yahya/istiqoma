import { Check, Moon, BookOpen, Heart, Flame, Bell, Calendar } from "lucide-react";

export function AppMockups() {
  return (
    <div className="flex flex-wrap justify-center gap-6 mb-12">
      {/* Today's Progress Card */}
      <div className="shadow-slate-200/50 overflow-hidden transform transition-transform hover:-translate-y-1 duration-500 bg-white max-w-sm border-slate-100 border rounded-2xl shadow-2xl" data-testid="mockup-today-progress">
        {/* Header UI */}
        <div className="flex bg-slate-50/50 border-slate-50 border-b pt-6 pr-6 pb-6 pl-6 items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1" data-testid="text-mockup-progress-label">Today's Progress</p>
            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight" data-testid="text-mockup-date">14 Muharram</h3>
          </div>
          <div className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm">
            <div className="relative w-5 h-5">
              <svg className="transform -rotate-90 w-full h-full">
                <circle cx="10" cy="10" r="8" stroke="#e2e8f0" strokeWidth="2" fill="none" />
                <circle cx="10" cy="10" r="8" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="50.2" strokeDashoffset="12" />
              </svg>
            </div>
          </div>
        </div>

        {/* List Items */}
        <div className="pt-2 pr-2 pb-2 pl-2 space-y-1">
          {/* Item 1: Active/Checked */}
          <div className="group flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-white shadow-sm transition-all">
              <Check className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="line-through text-sm font-medium text-slate-900 opacity-50" data-testid="text-mockup-task-1-title">Fajr Prayer</p>
              <p className="text-xs text-slate-400" data-testid="text-mockup-task-1-status">Completed at 5:45 AM</p>
            </div>
            <Moon className="w-5 h-5 text-slate-300" />
          </div>

          {/* Item 2: Pending */}
          <div className="group flex flex-wrap gap-4 hover:bg-slate-50 transition-colors cursor-pointer rounded-xl p-3 items-center">
            <div className="w-6 h-6 rounded-md border border-slate-300 group-hover:border-emerald-500 flex items-center justify-center transition-all" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-task-2-title">Read Surah Kahf</p>
              <p className="text-xs text-slate-400" data-testid="text-mockup-task-2-status">Target: 20 mins</p>
            </div>
            <BookOpen className="w-5 h-5 text-emerald-500 group-hover:text-emerald-500 transition-colors" />
          </div>

          {/* Item 3: Pending */}
          <div className="group flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-md border border-slate-300 group-hover:border-emerald-500 flex items-center justify-center transition-all" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-task-3-title">Give Sadaqah</p>
              <p className="text-xs text-slate-400" data-testid="text-mockup-task-3-status">Daily goal</p>
            </div>
            <Heart className="w-5 h-5 text-emerald-500 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>

        {/* Streak Footer */}
        <div className="mt-2 mx-2 mb-2 p-3 bg-slate-900 rounded-xl flex flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <Flame className="w-[18px] h-[18px] text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300" data-testid="text-mockup-streak-label">Current Streak</p>
              <p className="text-sm font-semibold" data-testid="text-mockup-streak-value">12 Days</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded" data-testid="text-mockup-points">
            +40 pts
          </div>
        </div>
      </div>
      
      {/* Personalize Goals Card */}
      <div className="bg-white max-w-md border-slate-200 border rounded-xl px-6 py-6 relative shadow-xl transform transition-transform hover:-translate-y-1 duration-500" data-testid="mockup-personalize-goals">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-6 border-b border-slate-100 pb-4" data-testid="text-mockup-goals-label">Personalize Goals</h4>
        
        <div className="space-y-6">
          {/* Control 1: Slider */}
          <div>
            <div className="flex flex-wrap justify-between gap-2 text-sm mb-2">
              <span className="text-slate-700 font-medium" data-testid="text-mockup-quran-goal-label">Daily Quran Goal</span>
              <span className="text-emerald-600 font-medium" data-testid="text-mockup-quran-goal-value">5 Pages</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-1/4 bg-emerald-500 rounded-full" />
            </div>
          </div>

          {/* Control 2: Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-md text-slate-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-reminder-1-title">Tahajjud Reminders</p>
                <p className="text-xs text-slate-500" data-testid="text-mockup-reminder-1-desc">Last 3rd of night</p>
              </div>
            </div>
            {/* Custom Toggle */}
            <div className="w-11 h-6 bg-emerald-500 rounded-full flex items-center px-1 cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full shadow-sm ml-auto" />
            </div>
          </div>

          {/* Control 3: Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-md text-slate-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-reminder-2-title">Monday/Thursday Fasting</p>
                <p className="text-xs text-slate-500" data-testid="text-mockup-reminder-2-desc">Sunnah habit</p>
              </div>
            </div>
            {/* Custom Toggle Off */}
            <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center px-1 cursor-pointer hover:bg-slate-300 transition-colors">
              <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
