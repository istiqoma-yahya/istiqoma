import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  BookOpen,
  HandCoins,
  Flame,
  Plus,
  RotateCcw,
  Target,
  TrendingUp,
  ArrowRight,
  Play,
  Bookmark,
  GraduationCap,
  Circle,
  Compass,
  Home,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { KeyRound } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Tour step definitions
// ──────────────────────────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  title: string;
  description: string;
  coachmarkSide: "right" | "bottom" | "top";
  actionLabel: string;
  interactionAdvances: boolean;
}

const STEPS: StepDef[] = [
  {
    id: "dashboard",
    title: "Dashboard & Today's Progress",
    description: "See all your worship goals for today at a glance. Your progress ring shows how much you've already completed.",
    coachmarkSide: "right",
    actionLabel: "Next →",
    interactionAdvances: false,
  },
  {
    id: "record-deed",
    title: "Record a Good Deed",
    description: "Log any act of worship in seconds — pick a category, describe it, and save. Tap \"Save Deed\" to try it!",
    coachmarkSide: "right",
    actionLabel: "Save Deed",
    interactionAdvances: true,
  },
  {
    id: "dzikir",
    title: "Dzikir Counter",
    description: "Tap the glowing circle to count your dhikr. Try tapping 3 times to see it in action!",
    coachmarkSide: "right",
    actionLabel: "Tap to count",
    interactionAdvances: true,
  },
  {
    id: "sholat",
    title: "Sholat Tracking",
    description: "Track your 5 daily prayers and mark them complete. Tap \"Mark done\" on Fajr to try it.",
    coachmarkSide: "right",
    actionLabel: "Mark Fajr done",
    interactionAdvances: true,
  },
  {
    id: "targets",
    title: "Spiritual Targets",
    description: "Set recurring goals for your worship — daily Quran pages, dzikir counts, weekly sadaqah, and more.",
    coachmarkSide: "right",
    actionLabel: "Next →",
    interactionAdvances: false,
  },
  {
    id: "quran",
    title: "Quran Journey",
    description: "Read, listen, and track your Quran progress. Pick up exactly where you left off, with bookmarks and memorization tools.",
    coachmarkSide: "right",
    actionLabel: "Open a Surah",
    interactionAdvances: true,
  },
  {
    id: "progress",
    title: "Progress & Streaks",
    description: "Watch your spiritual journey unfold — streaks, weekly heatmaps, and charts to keep you motivated day after day.",
    coachmarkSide: "right",
    actionLabel: "Next →",
    interactionAdvances: false,
  },
  {
    id: "final",
    title: "Ready to Begin?",
    description: "Join thousands of Muslims growing spiritually every day. It's free forever.",
    coachmarkSide: "bottom",
    actionLabel: "Sign Up Free",
    interactionAdvances: false,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Mock Bottom Navigation
// ──────────────────────────────────────────────────────────────────────────────

function MockBottomNav({ active }: { active: string }) {
  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "dzikir", icon: Circle, label: "Dzikir" },
    { id: "sholat", icon: Compass, label: "Sholat" },
    { id: "quran", icon: BookOpen, label: "Quran" },
  ];
  return (
    <div className="border-t border-border bg-background/90">
      <div className="flex items-center justify-around h-11">
        {tabs.map(({ id, icon: Icon, label }) => (
          <div
            key={id}
            className={`flex flex-col items-center gap-0.5 py-1 text-[8px] font-medium ${
              active === id ? "text-emerald-500" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulated Screens — each marks its highlighted element with data-tour-highlight
// ──────────────────────────────────────────────────────────────────────────────

function DashboardScreen() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[8px] font-medium text-muted-foreground uppercase tracking-wide">Today's Progress</p>
          <p className="text-xs font-bold">3 Muharram 1447</p>
        </div>
        <div
          data-tour-highlight
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center bg-background shadow-sm"
        >
          <div className="relative w-5 h-5">
            <svg className="transform -rotate-90 w-full h-full">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" className="text-muted" />
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50.2" strokeDashoffset="12" className="text-emerald-500" />
            </svg>
          </div>
        </div>
      </div>

      <div className="px-2 flex-1 overflow-hidden space-y-0.5">
        {[
          { label: "Fajr Prayer", sub: "Completed at 5:12 AM", done: true, icon: Moon },
          { label: "Read Surah Al-Kahf", sub: "Target: 20 mins", done: false, icon: BookOpen },
          { label: "Give Sadaqah", sub: "Daily goal", done: false, icon: HandCoins },
        ].map(({ label, sub, done, icon: Icon }, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500 text-white" : "border border-border"}`}>
              {done && <Check className="w-3 h-3" strokeWidth={2.5} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-medium leading-tight ${done ? "line-through opacity-50" : ""}`}>{label}</p>
              <p className="text-[8px] text-muted-foreground">{sub}</p>
            </div>
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${done ? "text-muted-foreground/50" : "text-emerald-500"}`} />
          </div>
        ))}

        <div className="mt-1 p-2 bg-slate-900 rounded-xl flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white/10 rounded-lg">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-[7px] font-medium text-slate-300">Current Streak</p>
              <p className="text-[10px] font-semibold">12 days</p>
            </div>
          </div>
          <div className="text-[7px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">+40 pts</div>
        </div>
      </div>

      <div className="px-2 pb-1.5 flex-shrink-0">
        <button className="w-full btn-primary text-[9px] py-1.5 flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" />
          Record a Good Deed
        </button>
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function RecordDeedScreen({ deedRecorded, onRecord }: { deedRecorded: boolean; onRecord: () => void }) {
  const [selected, setSelected] = useState("Sholat");
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <h3 className="text-xs font-bold">Record Good Deed</h3>
        <p className="text-[8px] text-muted-foreground">Log your worship & good acts</p>
      </div>

      <div className="px-2 space-y-2 flex-1 overflow-hidden">
        <div>
          <p className="text-[8px] font-medium text-muted-foreground mb-1">CATEGORY</p>
          <div className="flex flex-wrap gap-1">
            {["Sholat", "Dzikir", "Sedekah", "Quran"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                className={`text-[8px] px-2 py-0.5 rounded-full border transition-all ${
                  selected === cat ? "bg-emerald-500 text-white border-emerald-500" : "border-border text-muted-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[8px] font-medium text-muted-foreground mb-1">DESCRIPTION</p>
          <div className="bg-muted border border-border rounded-lg p-2 text-[9px]">
            Fajr prayer, 2 rakaat, in congregation
          </div>
        </div>

        <div>
          <p className="text-[8px] font-medium text-muted-foreground mb-1">POINTS</p>
          <div className="flex gap-1">
            {[1, 3, 5, 10].map((pt) => (
              <div key={pt} className={`flex-1 text-center py-0.5 rounded-md border text-[9px] font-bold ${pt === 5 ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "border-border text-muted-foreground"}`}>
                {pt}
              </div>
            ))}
          </div>
        </div>

        {deedRecorded ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Deed recorded! +5 points earned.</p>
          </div>
        ) : (
          <button
            data-tour-highlight
            onClick={onRecord}
            className="w-full btn-primary text-[9px] py-1.5"
            data-testid="tour-button-record-deed"
          >
            Save Deed (+5 pts)
          </button>
        )}
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function DzikirScreen({ count, onTap }: { count: number; onTap: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <h1 className="text-xs font-bold">Dzikir Counter</h1>
      </div>

      <div className="px-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
          {["Subhanallah", "Alhamdulillah", "Allahu Akbar"].map((t, i) => (
            <div key={t} className={`flex-1 text-center text-[7px] py-0.5 rounded-full ${i === 0 ? "bg-emerald-500 text-white" : "text-muted-foreground"}`}>
              {t}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <button
          data-tour-highlight
          onClick={onTap}
          className="w-28 h-28 rounded-full flex items-center justify-center transition-all active:scale-95 bg-emerald-500/20 border-4 border-emerald-500 hover:bg-emerald-500/25"
          data-testid="tour-button-dzikir-tap"
        >
          <span className="text-4xl font-bold text-emerald-500">{count}</span>
        </button>

        <p className="text-[8px] text-muted-foreground">Tap to count</p>

        {count > 0 && (
          <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[8px] text-emerald-500 font-medium">
            SubhanAllah ×{count}
          </motion.p>
        )}

        <div className="flex gap-2 mt-1">
          <button className="text-[8px] text-muted-foreground border border-border rounded-lg px-2.5 py-0.5 flex items-center gap-1">
            <RotateCcw className="w-2.5 h-2.5" /> Reset
          </button>
          <button className={`text-[8px] rounded-lg px-2.5 py-0.5 transition-all ${count > 0 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
            Save (+{count})
          </button>
        </div>
      </div>

      <MockBottomNav active="dzikir" />
    </div>
  );
}

function SholatScreen({ fajrDone, onMarkFajr }: { fajrDone: boolean; onMarkFajr: () => void }) {
  const prayers = [
    { key: "fajr", name: "Fajr", time: "05:10", icon: Sunrise, highlight: true },
    { key: "dhuhr", name: "Dhuhr", time: "12:15", icon: Sun, highlight: false },
    { key: "asr", name: "Asr", time: "15:30", icon: Sun, highlight: false },
    { key: "maghrib", name: "Maghrib", time: "18:02", icon: Sunset, highlight: false },
    { key: "isha", name: "Isha", time: "19:17", icon: Moon, highlight: false },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 flex-shrink-0">
        <Moon className="w-3.5 h-3.5 text-emerald-500" />
        <h1 className="text-xs font-bold">Prayer Times</h1>
      </div>

      <div className="px-2 mb-1.5 text-center flex-shrink-0">
        <p className="text-[7px] text-muted-foreground">Jakarta · Today</p>
        <p className="text-[8px] font-medium">Next: Dhuhr in 2h 14m</p>
      </div>

      <div className="px-2 space-y-1 flex-1 overflow-hidden">
        {prayers.map(({ key, name, time, icon: Icon, highlight }) => {
          const isDone = key === "fajr" && fajrDone;
          return (
            <div
              key={key}
              {...(highlight ? { "data-tour-highlight": true } : {})}
              className="flex items-center gap-2 p-1.5 rounded-lg border border-border"
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isDone ? "text-emerald-500" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="text-[9px] font-semibold">{name}</p>
                <p className="text-[7px] text-muted-foreground">{time}</p>
              </div>
              <button
                onClick={key === "fajr" ? onMarkFajr : undefined}
                className={`text-[8px] px-2 py-0.5 rounded-md border transition-all flex items-center gap-0.5 ${
                  isDone ? "bg-emerald-500 text-white border-emerald-500" : "border-border text-muted-foreground hover:border-emerald-400"
                }`}
                data-testid={key === "fajr" ? "tour-button-mark-fajr" : undefined}
              >
                {isDone ? <><Check className="w-2.5 h-2.5" />Done</> : "Mark done"}
              </button>
            </div>
          );
        })}
      </div>

      <MockBottomNav active="sholat" />
    </div>
  );
}

function TargetsScreen() {
  const targets = [
    { title: "Read Quran", sub: "Daily · 2 pages", pct: 65, cat: "Quran", catColor: "text-blue-500 bg-blue-500/10" },
    { title: "Subhanallah 33×", sub: "Daily dzikir", pct: 42, cat: "Dzikir", catColor: "text-emerald-500 bg-emerald-500/10" },
    { title: "Sedekah Fridays", sub: "Weekly", pct: 100, cat: "Sedekah", catColor: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-emerald-500" />
          <h1 className="text-xs font-bold">Spiritual Goals</h1>
        </div>
        <button className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <div className="px-2 space-y-2 flex-1 overflow-hidden">
        {targets.map(({ title, sub, pct, cat, catColor }, i) => (
          <div
            key={i}
            {...(i === 0 ? { "data-tour-highlight": true } : {})}
            className="p-2 rounded-xl border border-border bg-card"
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[9px] font-bold">{title}</p>
                <p className="text-[7px] text-muted-foreground">{sub}</p>
              </div>
              <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${catColor}`}>{cat}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-emerald-400"}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[7px] text-muted-foreground">{pct}%</span>
            </div>
          </div>
        ))}
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function QuranScreen({ onTapSurah }: { onTapSurah: () => void }) {
  const surahs = [
    { id: 1, name: "Al-Fatihah", arabic: "الفاتحة", verses: 7, highlight: true },
    { id: 2, name: "Al-Baqarah", arabic: "البقرة", verses: 286, highlight: false },
    { id: 18, name: "Al-Kahf", arabic: "الكهف", verses: 110, highlight: false },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 flex-shrink-0">
        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
        <h1 className="text-xs font-bold">Al-Quran</h1>
      </div>

      <div className="px-2 mb-1.5 flex-shrink-0">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-1.5 flex items-center justify-between">
          <div>
            <p className="text-[7px] text-muted-foreground uppercase tracking-wide">Continue Reading</p>
            <p className="text-[9px] font-semibold">Al-Kahf · Verse 12</p>
          </div>
          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
        </div>
      </div>

      <div className="px-2 flex gap-1.5 mb-1.5 flex-shrink-0">
        {[{ icon: Bookmark, label: "Bookmarks", count: 3 }, { icon: GraduationCap, label: "Memorize", count: 1 }].map(({ icon: Icon, label, count }) => (
          <button key={label} className="flex-1 border border-border rounded-lg py-1.5 flex flex-col items-center gap-0.5">
            <Icon className="w-3 h-3 text-emerald-500" />
            <span className="text-[7px]">{label}</span>
            <span className="text-[7px] text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      <div className="px-2 flex-1 space-y-1 overflow-hidden">
        {surahs.map(({ id, name, arabic, verses, highlight }) => (
          <div
            key={id}
            {...(highlight ? { "data-tour-highlight": true } : {})}
            onClick={highlight ? onTapSurah : undefined}
            className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${
              highlight ? "border-border hover:border-emerald-400/50" : "border-border"
            }`}
            data-testid={`tour-surah-${id}`}
          >
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
              {id}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-medium">{name}</p>
              <p className="text-[7px] text-muted-foreground">{verses} verses</p>
            </div>
            <div className="text-sm text-muted-foreground">{arabic}</div>
          </div>
        ))}
      </div>

      <MockBottomNav active="quran" />
    </div>
  );
}

function ProgressScreen() {
  const bars = [60, 80, 40, 100, 90, 70, 50];
  const weekHeatmap = [true, true, false, true, true, true, false];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 flex-shrink-0">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        <h1 className="text-xs font-bold">My Progress</h1>
      </div>

      <div className="px-2 grid grid-cols-2 gap-1.5 mb-1.5 flex-shrink-0">
        <div className="bg-card border border-border rounded-xl p-2">
          <p className="text-[7px] text-muted-foreground">This Month</p>
          <p className="text-base font-bold text-emerald-500">47</p>
          <p className="text-[7px] text-muted-foreground">good deeds</p>
        </div>
        <div
          data-tour-highlight
          className="bg-card border border-border rounded-xl p-2"
        >
          <p className="text-[7px] text-muted-foreground">Streak</p>
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-base font-bold text-amber-500">12</p>
          </div>
          <p className="text-[7px] text-muted-foreground">days</p>
        </div>
      </div>

      <div className="mx-2 p-2 bg-card border border-border rounded-xl mb-1.5 flex-shrink-0">
        <p className="text-[7px] font-medium mb-1">This Week</p>
        <div className="flex gap-1.5 items-end">
          {weekHeatmap.map((active, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`w-full h-5 rounded-sm ${active ? "bg-emerald-500" : "bg-muted"}`} />
              <span className="text-[6px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-2 p-2 bg-card border border-border rounded-xl flex-shrink-0">
        <p className="text-[7px] font-medium mb-1">Deeds per Day</p>
        <div className="flex gap-0.5 items-end h-10">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t-sm bg-emerald-500" style={{ height: `${(h / 100) * 32}px` }} />
              <span className="text-[5px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function FinalScreen({ onSignUp }: { onSignUp: () => void }) {
  return (
    <div className="flex flex-col h-full items-center justify-center px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3"
      >
        <Flame className="w-7 h-7 text-emerald-500" />
      </motion.div>

      <h3 className="text-sm font-bold mb-1.5">Start Your Journey</h3>
      <p className="text-[9px] text-muted-foreground mb-4 max-w-[180px]">
        Join thousands of Muslims growing spiritually every day.
      </p>

      <div className="space-y-2 w-full">
        <button
          data-tour-highlight
          onClick={onSignUp}
          className="w-full btn-primary text-[9px] py-1.5 flex items-center justify-center gap-1.5"
          data-testid="tour-button-signup-google"
        >
          <SiGoogle className="w-3 h-3" />
          Continue with Google
        </button>
        <button
          onClick={onSignUp}
          className="w-full btn-secondary text-[9px] py-1.5 flex items-center justify-center gap-1.5 border border-border"
          data-testid="tour-button-signup-username"
        >
          <KeyRound className="w-3 h-3" />
          Use Username & PIN
        </button>
      </div>

      <p className="text-[7px] text-muted-foreground mt-3">Free forever · No credit card needed</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Spotlight + Coachmark overlay (rendered inside the device frame)
// ──────────────────────────────────────────────────────────────────────────────

interface HighlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 6;

function SpotlightOverlay({ bounds }: { bounds: HighlightBounds }) {
  const { top, left, width, height } = bounds;
  const spotTop = top - SPOTLIGHT_PADDING;
  const spotLeft = left - SPOTLIGHT_PADDING;
  const spotW = width + SPOTLIGHT_PADDING * 2;
  const spotH = height + SPOTLIGHT_PADDING * 2;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[28px]">
      {/* Dark overlay with hole via box-shadow trick */}
      <div
        style={{
          position: "absolute",
          top: spotTop,
          left: spotLeft,
          width: spotW,
          height: spotH,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.52)",
          borderRadius: 10,
          border: "2px solid rgba(52, 211, 153, 0.85)",
          zIndex: 10,
          transition: "top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease",
        }}
      />
      {/* Outer pulse ring */}
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: spotTop - 5,
          left: spotLeft - 5,
          width: spotW + 10,
          height: spotH + 10,
          borderRadius: 14,
          border: "2px solid rgba(52, 211, 153, 0.5)",
          zIndex: 9,
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// External Coachmark card (anchored to device frame)
// ──────────────────────────────────────────────────────────────────────────────

interface CoachmarkCardProps {
  step: StepDef;
  stepIndex: number;
  totalSteps: number;
  interactionDone: boolean;
  onAction: () => void;
  side: "right" | "bottom";
}

function CoachmarkCard({ step, stepIndex, totalSteps, interactionDone, onAction, side }: CoachmarkCardProps) {
  const canAct = interactionDone || !step.interactionAdvances;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: side === "right" ? 12 : 0, y: side === "bottom" ? 12 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-card border border-border rounded-2xl shadow-2xl p-4 ${
        side === "right" ? "w-56" : "w-full max-w-xs"
      }`}
    >
      {/* Arrow toward device frame */}
      {side === "right" && (
        <div className="absolute right-full top-8 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-card" />
      )}
      {side === "bottom" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-card" />
      )}

      <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">
        Step {stepIndex + 1} of {totalSteps}
      </p>
      <h4 className="text-sm font-bold mb-1.5">{step.title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.description}</p>

      {step.interactionAdvances && !interactionDone && (
        <div className="flex items-center gap-1.5 text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 mb-2.5">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
          Interact with the highlighted element
        </div>
      )}

      <button
        onClick={onAction}
        className="w-full text-xs py-2 rounded-xl font-semibold transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
        data-testid={`tour-coachmark-action-${step.id}`}
      >
        {step.id === "final" ? "Sign Up Free" : interactionDone ? "Next →" : step.actionLabel}
      </button>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main ProductTour Component
// ──────────────────────────────────────────────────────────────────────────────

interface ProductTourProps {
  onClose: () => void;
}

export function ProductTour({ onClose }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dzikirCount, setDzikirCount] = useState(0);
  const [deedRecorded, setDeedRecorded] = useState(false);
  const [fajrDone, setFajrDone] = useState(false);
  const [surahTapped, setSurahTapped] = useState(false);

  // Highlight bounds measured from the device frame
  const screenRef = useRef<HTMLDivElement>(null);
  const [highlightBounds, setHighlightBounds] = useState<HighlightBounds | null>(null);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const interactionDoneForStep = useCallback(
    (idx: number): boolean => {
      const s = STEPS[idx];
      if (!s.interactionAdvances) return true;
      if (s.id === "dzikir") return dzikirCount >= 3;
      if (s.id === "record-deed") return deedRecorded;
      if (s.id === "sholat") return fajrDone;
      if (s.id === "quran") return surahTapped;
      return false;
    },
    [dzikirCount, deedRecorded, fajrDone, surahTapped]
  );

  const canAdvance = interactionDoneForStep(currentStep);

  // Measure the highlighted element's position within the screen area
  const measureHighlight = useCallback(() => {
    const screenEl = screenRef.current;
    if (!screenEl) return;
    const target = screenEl.querySelector("[data-tour-highlight]") as HTMLElement | null;
    if (!target) {
      setHighlightBounds(null);
      return;
    }
    const screenRect = screenEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setHighlightBounds({
      top: targetRect.top - screenRect.top,
      left: targetRect.left - screenRect.left,
      width: targetRect.width,
      height: targetRect.height,
    });
  }, []);

  useLayoutEffect(() => {
    // Run after the Framer Motion screen transition (0.3s) settles
    const id = setTimeout(measureHighlight, 360);
    return () => clearTimeout(id);
  }, [currentStep, dzikirCount, deedRecorded, fajrDone, surahTapped, measureHighlight]);

  // Re-measure on resize / orientation change so the spotlight stays aligned
  useEffect(() => {
    const onResize = () => measureHighlight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureHighlight]);

  const goNext = useCallback(() => {
    if (isLast) {
      onClose();
      const el = document.querySelector('[data-testid="auth-chooser"]');
      if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setCurrentStep((s) => s + 1);
    setHighlightBounds(null);
  }, [isLast, onClose]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setHighlightBounds(null);
    }
  }, [currentStep]);

  const handleDzikirTap = useCallback(() => {
    setDzikirCount((c) => c + 1);
  }, []);

  const handleRecordDeed = useCallback(() => {
    setDeedRecorded(true);
    setTimeout(goNext, 900);
  }, [goNext]);

  const handleMarkFajr = useCallback(() => {
    setFajrDone(true);
    setTimeout(goNext, 700);
  }, [goNext]);

  const handleSurahTap = useCallback(() => {
    setSurahTapped(true);
    setTimeout(goNext, 500);
  }, [goNext]);

  // Auto-advance dzikir after 3 taps
  useEffect(() => {
    if (step.id === "dzikir" && dzikirCount >= 3) {
      const t = setTimeout(goNext, 700);
      return () => clearTimeout(t);
    }
  }, [dzikirCount, step.id, goNext]);

  const handleCoachmarkAction = useCallback(() => {
    if (step.id === "final") {
      onClose();
      const el = document.querySelector('[data-testid="auth-chooser"]');
      if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // For interaction steps, trigger the interaction if not done, then advance.
    if (step.id === "record-deed" && !deedRecorded) { handleRecordDeed(); return; }
    if (step.id === "sholat" && !fajrDone) { handleMarkFajr(); return; }
    if (step.id === "quran" && !surahTapped) { handleSurahTap(); return; }
    // dzikir: just advance even if not tapped enough yet
    goNext();
  }, [step.id, deedRecorded, fajrDone, surahTapped, handleRecordDeed, handleMarkFajr, handleSurahTap, goNext, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const renderScreen = () => {
    switch (step.id) {
      case "dashboard": return <DashboardScreen />;
      case "record-deed": return <RecordDeedScreen deedRecorded={deedRecorded} onRecord={handleRecordDeed} />;
      case "dzikir": return <DzikirScreen count={dzikirCount} onTap={handleDzikirTap} />;
      case "sholat": return <SholatScreen fajrDone={fajrDone} onMarkFajr={handleMarkFajr} />;
      case "targets": return <TargetsScreen />;
      case "quran": return <QuranScreen onTapSurah={handleSurahTap} />;
      case "progress": return <ProgressScreen />;
      case "final": return <FinalScreen onSignUp={() => { onClose(); const el = document.querySelector('[data-testid="auth-chooser"]'); if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" }); }} />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background/97 backdrop-blur-md flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive product tour"
    >
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted"
          data-testid="tour-button-exit"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit tour</span>
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5" data-testid="tour-progress-dots">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setCurrentStep(i); setHighlightBounds(null); }}
              className={`rounded-full transition-all ${
                i === currentStep ? "w-5 h-2 bg-emerald-500" :
                i < currentStep ? "w-2 h-2 bg-emerald-500/60 hover:bg-emerald-500" :
                "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              data-testid={`tour-dot-${i}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">{currentStep + 1} / {STEPS.length}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-all"
              aria-label="Previous step"
              data-testid="tour-button-prev"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={goNext}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-all"
              aria-label="Next step"
              data-testid="tour-button-next"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="h-0.5 bg-muted flex-shrink-0" data-testid="tour-progress-bar">
        <motion.div
          className="h-full bg-emerald-500"
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/*
          Single unified layout: flex-col on mobile, flex-row on desktop.
          We use ONE device frame with a single screenRef so measurements
          are always taken from the actually-visible DOM element.
        */}
        <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 w-full max-w-5xl">

          {/* Left info panel — desktop only */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${currentStep}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden md:flex flex-col gap-4 flex-1 max-w-xs"
            >
              <div>
                <p className="text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-2">
                  Step {currentStep + 1} of {STEPS.length}
                </p>
                <h2 className="text-2xl font-bold font-display mb-3">{step.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {step.interactionAdvances && !canAdvance && (
                <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
                  Try it in the screen, or click Continue to skip
                </div>
              )}

              {!isLast && (
                <button
                  onClick={goNext}
                  className="btn-primary flex items-center gap-2 self-start"
                  data-testid="tour-desktop-next"
                >
                  {canAdvance ? "Continue" : "Skip"} <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {isLast && (
                <button
                  onClick={() => {
                    onClose();
                    const el = document.querySelector('[data-testid="auth-chooser"]');
                    if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="btn-primary flex items-center gap-2 self-start"
                  data-testid="tour-desktop-signup"
                >
                  Sign Up Free <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Single Device Frame (shared ref for accurate spotlight measurement) ── */}
          <div className="relative flex-shrink-0">
            <div className="relative w-[240px] sm:w-[260px] h-[460px] sm:h-[500px] bg-card border-[3px] border-border rounded-[32px] shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-border rounded-b-xl z-20" />
              {/* Status bar */}
              <div className="absolute top-0 left-0 right-0 h-4 flex items-center justify-between px-5 z-20">
                <span className="text-[7px] font-medium text-muted-foreground">9:41</span>
                <span className="text-[7px] text-muted-foreground">●●●</span>
              </div>
              {/* Screen content */}
              <div ref={screenRef} className="absolute inset-0 pt-4 bg-background overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.28 }}
                    className="h-full"
                  >
                    {renderScreen()}
                  </motion.div>
                </AnimatePresence>
                {/* Spotlight overlay — only when we have a valid highlight target */}
                {highlightBounds && step.id !== "final" && (
                  <SpotlightOverlay bounds={highlightBounds} />
                )}
              </div>
              {/* Home indicator bar */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-14 h-1 bg-foreground/20 rounded-full z-20" />
            </div>
          </div>

          {/* Right coachmark — desktop only */}
          <div className="hidden md:block relative flex-1 max-w-[220px]">
            <AnimatePresence mode="wait">
              <CoachmarkCard
                key={step.id}
                step={step}
                stepIndex={currentStep}
                totalSteps={STEPS.length}
                interactionDone={interactionDoneForStep(currentStep)}
                onAction={handleCoachmarkAction}
                side="right"
              />
            </AnimatePresence>
          </div>

          {/* Bottom coachmark — mobile only */}
          <div className="md:hidden w-full max-w-xs">
            <AnimatePresence mode="wait">
              <CoachmarkCard
                key={step.id}
                step={step}
                stepIndex={currentStep}
                totalSteps={STEPS.length}
                interactionDone={interactionDoneForStep(currentStep)}
                onAction={handleCoachmarkAction}
                side="bottom"
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
