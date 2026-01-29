import { Check, Moon, BookOpen, Heart, Flame } from "lucide-react";

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
      <div className="shadow-slate-200/50 overflow-hidden transform transition-transform hover:-translate-y-1 duration-500 bg-white max-w-sm border-slate-100 border rounded-2xl shadow-2xl" data-testid="mockup-personalize-goals">
        {/* Header */}
        <div className="bg-slate-50/50 border-slate-50 border-b pt-6 pr-6 pb-6 pl-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide" data-testid="text-mockup-goals-label">Personalize Goals</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Daily Quran Goal */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-quran-goal-label">Daily Quran Goal</p>
              <p className="text-sm font-medium text-emerald-600" data-testid="text-mockup-quran-goal-value">5 Pages</p>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full w-2/5 bg-emerald-500 rounded-full transition-all" />
            </div>
          </div>

          {/* Toggle Items */}
          <div className="space-y-3 pt-2">
            {/* Tahajjud Reminders */}
            <div className="group flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-reminder-1-title">Tahajjud Reminders</p>
                <p className="text-xs text-slate-400" data-testid="text-mockup-reminder-1-desc">Last 3rd of night</p>
              </div>
              {/* Toggle ON */}
              <div className="w-11 h-6 bg-emerald-500 rounded-full flex items-center px-0.5 cursor-pointer transition-colors">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm ml-auto" />
              </div>
            </div>

            {/* Monday/Thursday Fasting */}
            <div className="group flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900" data-testid="text-mockup-reminder-2-title">Monday/Thursday Fasting</p>
                <p className="text-xs text-slate-400" data-testid="text-mockup-reminder-2-desc">Sunnah habit</p>
              </div>
              {/* Toggle OFF */}
              <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center px-0.5 cursor-pointer transition-colors">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
