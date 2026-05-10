import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, forwardRef } from "react";
import { useTranslation } from "react-i18next";
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
  Bookmark,
  GraduationCap,
  Circle,
  Compass,
  Home,
  Snowflake,
  ThumbsUp,
  Trophy,
  BarChart3,
  Search,
  ChevronDown,
  Play,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { KeyRound, Loader2, Save, Settings } from "lucide-react";
import { StatsOverview } from "@/components/StatsOverview";
import { DeedCard } from "@/components/DeedCard";
import { DashboardNavLinks } from "@/components/shared/DashboardNavLinks";
import { SurahListCard } from "@/components/shared/SurahListCard";
import { PrayerListCard } from "@/components/shared/PrayerListCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import istiqomaHorizontalLogo from "@assets/Istiqoma_New_Horizontal_Logo_1777797342711.png";
import istiqomaHorizontalLogoDark from "@assets/Istiqoma_New_Horizontal_Logo_-_Darkmode_1777805633685.png";
import { useTheme } from "@/components/ThemeProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Deed } from "@shared/schema";

// Built-in dzikir types — kept in sync with client/src/pages/DzikirPage.tsx so
// the tour mirrors the real dropdown contents (and i18n keys) exactly.
const TOUR_BUILT_IN_DZIKIR_TYPES = [
  { id: "subhanallah", labelKey: "dzikir.types.subhanallah" },
  { id: "alhamdulillah", labelKey: "dzikir.types.alhamdulillah" },
  { id: "allahuakbar", labelKey: "dzikir.types.allahuakbar" },
  { id: "lailahaillallah", labelKey: "dzikir.types.lailahaillallah" },
  { id: "istighfar", labelKey: "dzikir.types.istighfar" },
] as const;

// Wrap a real navigating component (StatsOverview, DeedCard, nav cards) so its
// click handlers never fire and never unmount the Landing page out from under
// the tour. Inputs/selects/category chips not wrapped in <InertDemo /> remain
// fully interactive — that's how the Record Deed step keeps category and
// quantity controls live while only the spotlight target advances the tour.
const InertDemo = forwardRef<HTMLDivElement, { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>>(
  function InertDemo({ children, ...rest }, ref) {
    const stop = (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    return (
      <div
        ref={ref}
        {...rest}
        onClickCapture={stop}
        onMouseDownCapture={stop}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter" || e.key === " ") stop(e);
        }}
      >
        {children}
      </div>
    );
  }
);

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

const STEP_CONFIGS = [
  { id: "dashboard", stepKey: "dashboard", actionKey: "next", coachmarkSide: "right" as const, interactionAdvances: false },
  { id: "record-deed", stepKey: "recordDeed", actionKey: "saveDeed", coachmarkSide: "right" as const, interactionAdvances: true },
  { id: "dzikir", stepKey: "dzikir", actionKey: "tapToCount", coachmarkSide: "right" as const, interactionAdvances: true },
  { id: "sholat", stepKey: "sholat", actionKey: "markFajrDone", coachmarkSide: "right" as const, interactionAdvances: true },
  { id: "targets", stepKey: "targets", actionKey: "next", coachmarkSide: "right" as const, interactionAdvances: false },
  { id: "quran", stepKey: "quran", actionKey: "openSurah", coachmarkSide: "right" as const, interactionAdvances: true },
  { id: "progress", stepKey: "progress", actionKey: "next", coachmarkSide: "right" as const, interactionAdvances: false },
  { id: "final", stepKey: "final", actionKey: "signUpFree", coachmarkSide: "bottom" as const, interactionAdvances: false },
];

// ──────────────────────────────────────────────────────────────────────────────
// Mock app chrome — header & bottom nav, mirroring the real app
// ──────────────────────────────────────────────────────────────────────────────

function MockAppHeader({ title, showBack = false }: { title?: string; showBack?: boolean }) {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? istiqomaHorizontalLogoDark : istiqomaHorizontalLogo;
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && <ArrowLeft className="w-4 h-4 text-muted-foreground" />}
          {title ? (
            <h1 className="font-display font-bold text-sm truncate">{title}</h1>
          ) : (
            <img src={logoSrc} alt="Istiqoma" className="h-6 w-auto" />
          )}
        </div>
        <InertDemo className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            A
          </div>
        </InertDemo>
      </div>
    </header>
  );
}

function MockBottomNav({ active }: { active: string }) {
  const { t } = useTranslation();
  const tabs = [
    { id: "home", icon: Home, label: t("tour.nav.home") },
    { id: "dzikir", icon: Circle, label: t("tour.nav.dzikir") },
    { id: "sholat", icon: Compass, label: t("tour.nav.sholat") },
    { id: "quran", icon: BookOpen, label: t("tour.nav.quran") },
  ];
  return (
    <nav className="border-t border-border bg-background/80 backdrop-blur-md flex-shrink-0">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ id, icon: Icon, label }) => (
          <div
            key={id}
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              active === id ? "text-emerald-500" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulated Screens — each marks its highlighted element with data-tour-highlight
// All screens scroll inside the device viewport.
// ──────────────────────────────────────────────────────────────────────────────

// Demo Deed[] shaped exactly like the real schema (drizzle's $inferSelect),
// so the real <DeedCard /> renders them faithfully.
function buildMockDeeds(): Deed[] {
  const now = Date.now();
  const deeds: Deed[] = [
    {
      id: -1,
      userId: "demo",
      description: "Sholat Subuh",
      deedType: "good",
      category: "Sholat Fardhu",
      points: 5,
      quantity: 1,
      dzikirType: null,
      sholatType: "subuh",
      fastingType: null,
      isJamaah: false,
      quranUnit: null,
      sedekahType: null,
      customUnit: null,
      editCount: 0,
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      localDate: null,
    },
    {
      id: -2,
      userId: "demo",
      description: "Baca Al-Mulk",
      deedType: "good",
      category: "Baca Quran",
      points: 10,
      quantity: 1,
      dzikirType: null,
      sholatType: null,
      fastingType: null,
      isJamaah: null,
      quranUnit: "surah",
      sedekahType: null,
      customUnit: null,
      editCount: 0,
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
      localDate: null,
    },
  ];
  return deeds;
}

function DashboardScreen() {
  const { t } = useTranslation();
  const mockDeeds = useMemo(() => buildMockDeeds(), []);
  const statsRef = useRef<HTMLDivElement>(null);

  // Spotlight the specific streak card inside the real StatsOverview.
  useEffect(() => {
    const node = statsRef.current?.querySelector('[data-testid="card-stats-streak"]');
    if (node) node.setAttribute("data-tour-highlight", "");
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
        <div className="mb-5">
          <p className="text-xs text-muted-foreground mb-0.5">{t("dashboard.greeting")}</p>
          <h2 className="text-lg font-display font-bold mb-3">{t("dashboard.subtitle")}</h2>
          <button className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            {t("dashboard.recordDeed")}
          </button>
        </div>

        <InertDemo ref={statsRef} className="mb-2 [&_.mb-8]:mb-0">
          <StatsOverview deeds={mockDeeds} />
        </InertDemo>

        <InertDemo>
          <DashboardNavLinks doneCount={3} pendingCount={2} onNavigate={() => {}} />
        </InertDemo>

        <div>
          <h3 className="text-sm font-display font-bold mb-2 flex items-center gap-2">
            {t("dashboard.recentActivity")}
            <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {mockDeeds.length}
            </span>
          </h3>
          <InertDemo className="grid gap-3">
            {mockDeeds.map((deed, i) => (
              <DeedCard key={deed.id} deed={deed} index={i} />
            ))}
          </InertDemo>
        </div>
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function RecordDeedScreen({ deedRecorded, onRecord }: { deedRecorded: boolean; onRecord: () => void }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("Quran");
  const [quantity, setQuantity] = useState(5);
  const categories = [
    { key: "Sholat", label: t("tour.recordDeedScreen.catSholat"), icon: Moon },
    { key: "Dzikir", label: t("tour.recordDeedScreen.catDzikir"), icon: Circle },
    { key: "Quran", label: t("tour.recordDeedScreen.catQuran"), icon: BookOpen },
    { key: "Sedekah", label: t("tour.recordDeedScreen.catSedekah"), icon: HandCoins },
  ];

  // Mirror CreateDeedPage: category drives whether a quantity/unit row is
  // shown, and points are calculated server-side from quantity. We surface
  // both controls so the tour reflects the real form's dynamic behavior.
  const showQuantity = selected === "Quran" || selected === "Dzikir";
  const unitLabel =
    selected === "Quran" ? t("quran.units.ayat") :
    selected === "Dzikir" ? "x" :
    selected === "Sedekah" ? t("category.unitOptions.uang") : "";
  const points = showQuantity ? quantity : 5;

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader title={t("tour.recordDeedScreen.title")} showBack />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3 space-y-4">
        <p className="text-xs text-muted-foreground">{t("tour.recordDeedScreen.subtitle")}</p>

        {/* Category — same row of category chips as CreateDeedPage. */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">
            {t("deed.category")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant={selected === key ? "default" : "outline"}
                onClick={() => setSelected(key)}
                className={`justify-start gap-2 h-auto py-2.5 text-xs font-medium ${
                  selected === key
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                    : ""
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quantity + unit — mirrors CreateDeedPage's category-dependent
            quantity field (e.g. ayat for Baca Quran, hitungan for Dzikir). */}
        {showQuantity && (
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">
              {t("deed.quantity")}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-10 text-sm"
              />
              <div className="px-3 h-10 rounded-md border border-border bg-muted/40 text-xs text-muted-foreground flex items-center min-w-[64px] justify-center">
                {unitLabel}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-foreground mb-2 block">
            {t("deed.description")}
          </label>
          <div className="bg-muted/50 border border-border rounded-md p-3 text-xs text-foreground min-h-[60px] leading-relaxed">
            {t("tour.recordDeedScreen.sampleDesc")}
          </div>
        </div>

        {/* Auto-calculated points — emphasises the server-side calc rule. */}
        <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            {t("deed.points")}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-emerald-500">+{points}</span>
            <span className="text-xs text-muted-foreground">{t("stats.points")}</span>
          </div>
        </Card>

        {deedRecorded && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t("tour.recordDeedScreen.deedRecorded")}
            </p>
          </div>
        )}
      </div>

      {/* Sticky save CTA — wraps real <Button /> so it inherits app styling. */}
      <div className="px-4 pt-2 pb-3 border-t border-border bg-background flex-shrink-0">
        {!deedRecorded ? (
          <Button
            data-tour-highlight
            onClick={onRecord}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-2.5"
            data-testid="tour-button-record-deed"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {t("tour.recordDeedScreen.saveDeedPts")}
          </Button>
        ) : (
          <Button
            disabled
            className="w-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm py-2.5"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {t("tour.sholatScreen.done")}
          </Button>
        )}
      </div>
    </div>
  );
}

function DzikirScreen({ count, onTap }: { count: number; onTap: () => void }) {
  const { t } = useTranslation();
  const [type, setType] = useState<string>("subhanallah");

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader title={t("dzikir.title")} />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 flex flex-col items-center">
        <p className="text-xs text-muted-foreground mb-4 text-center">{t("dzikir.dzikirDesc")}</p>

        {/* Type selector — real shadcn <Select /> with the same built-in
            entries as DzikirPage so the dropdown UI is identical. The
            Settings/Plus buttons mirror the custom-type management row. */}
        <div className="flex items-center gap-2 mb-6 w-full">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="flex-1 h-9 text-xs" data-testid="tour-select-dzikir-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("dzikir.builtInTypes")}</SelectLabel>
                {TOUR_BUILT_IN_DZIKIR_TYPES.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {t(d.labelKey)}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="__add" className="text-emerald-500 font-medium">
                <Plus className="w-3.5 h-3.5 mr-1 inline-block" />
                {t("dzikir.addCustomType")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" type="button">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" type="button">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Tap counter — mirrors the real DzikirPage Card + 192px circle exactly. */}
        <Card className="w-full p-6 flex flex-col items-center gap-4">
          <motion.button
            data-tour-highlight
            onClick={onTap}
            whileTap={{ scale: 0.95 }}
            className="w-48 h-48 rounded-full flex items-center justify-center transition-all bg-emerald-500/20 border-4 border-emerald-500 active:bg-emerald-500/30 hover:bg-emerald-500/25"
            data-testid="tour-button-dzikir-tap"
            type="button"
          >
            <span className="text-6xl font-bold text-emerald-500">{count}</span>
          </motion.button>
          <p className="text-xs text-muted-foreground">{t("dzikir.tapToCount")}</p>
        </Card>

        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="outline"
            disabled={count === 0}
            className="gap-1.5 text-xs"
            type="button"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t("dzikir.reset")}
          </Button>
          <Button
            disabled={count === 0}
            className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
            type="button"
          >
            <Save className="w-3.5 h-3.5" />
            {`${t("dzikir.save")} (+${count})`}
          </Button>
        </div>
      </div>

      <MockBottomNav active="dzikir" />
    </div>
  );
}

function SholatScreen({ fajrDone, onMarkFajr }: { fajrDone: boolean; onMarkFajr: () => void }) {
  const { t } = useTranslation();

  // Demo prayer times anchored to today; consumed by the shared
  // <PrayerListCard /> exactly like SholatPage.tsx.
  const demoPrayers = useMemo(() => {
    const mk = (h: number, m: number) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };
    return [
      { name: "fajr" as const, time: mk(5, 10), isDone: fajrDone, highlight: true },
      { name: "dhuhr" as const, time: mk(12, 15), isCurrent: true },
      { name: "asr" as const, time: mk(15, 30), isNext: true },
      { name: "maghrib" as const, time: mk(18, 2) },
      { name: "isha" as const, time: mk(19, 17), locked: true },
    ];
  }, [fajrDone]);

  const handleToggle = (key: string) => {
    if (key === "fajr") onMarkFajr();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader title={t("sholatPage.title")} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Compass className="w-3.5 h-3.5" />
            <span>{t("tour.sholatScreen.location")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ChevronLeft className="w-3.5 h-3.5" />
            <Calendar className="w-3.5 h-3.5" />
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
            {t("sholatPage.nextPrayer")}
          </p>
          <p className="text-base font-display font-bold">{t("tour.sholatScreen.nextPrayer")}</p>
        </div>

        {/* Wrap PrayerListCard so its "fajr" highlight survives the shared
            component's own data-testid hooks; only fajr advances the tour. */}
        <div data-tour-anchor="sholat-prayer-list">
          <PrayerListCard
            prayers={demoPrayers}
            prayerLabel={(key) => t(`qibla.prayers.${key}`)}
            doneAriaLabel={t("sholatPage.doneLabel")}
            nowLabel={t("qibla.now")}
            nextLabel={t("sholatPage.in") + " 25m"}
            onTogglePrayer={handleToggle}
          />
        </div>
      </div>

      <MockBottomNav active="sholat" />
    </div>
  );
}

function TargetsScreen() {
  const { t } = useTranslation();
  const targets = [
    {
      title: t("tour.targetsScreen.readQuran"),
      sub: t("tour.targetsScreen.readQuranSub"),
      pct: 65,
      done: 13,
      total: 20,
      cat: t("tour.nav.quran"),
      catColor: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
      icon: BookOpen,
      iconColor: "text-blue-500 bg-blue-500/10",
    },
    {
      title: t("tour.targetsScreen.subhanallah33"),
      sub: t("tour.targetsScreen.dailyDzikir"),
      pct: 42,
      done: 14,
      total: 33,
      cat: t("tour.nav.dzikir"),
      catColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      icon: Circle,
      iconColor: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: t("tour.targetsScreen.sedekahFridays"),
      sub: t("tour.targetsScreen.weekly"),
      pct: 100,
      done: 4,
      total: 4,
      cat: t("tour.recordDeedScreen.catSedekah"),
      catColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
      icon: HandCoins,
      iconColor: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader title={t("tour.targetsScreen.title")} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
        {targets.map(({ title, sub, pct, done, total, cat, catColor, icon: Icon, iconColor }, i) => (
          <Card
            key={i}
            {...(i === 0 ? { "data-tour-highlight": true } : {})}
            className="p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${catColor} border-transparent`}>
                {cat}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-emerald-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {done}/{total}
              </span>
            </div>
          </Card>
        ))}

        {/* FAB — real shadcn <Button /> styled like the TargetsPage FAB. */}
        <div className="flex justify-end pt-2">
          <Button
            size="icon"
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
            type="button"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function QuranScreen({ onTapSurah }: { onTapSurah: () => void }) {
  const { t } = useTranslation();
  const surahs = [
    { id: 1, name: "Al-Fatihah", translit: t("tour.quranScreen.surahs.alFatihah"), arabic: "الفاتحة", verses: 7, highlight: true },
    { id: 2, name: "Al-Baqarah", translit: t("tour.quranScreen.surahs.alBaqarah"), arabic: "البقرة", verses: 286, highlight: false },
    { id: 18, name: "Al-Kahf", translit: t("tour.quranScreen.surahs.alKahf"), arabic: "الكهف", verses: 110, highlight: false },
    { id: 36, name: "Ya-Sin", translit: t("tour.quranScreen.surahs.yaSin"), arabic: "يس", verses: 83, highlight: false },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader title={t("quranMenu.title")} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3 space-y-3">
        <Card
          className="p-4 cursor-pointer hover-elevate active-elevate-2"
          data-testid="card-continue-reading"
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {t("quranMenu.continueReading")}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold truncate">
                {t("tour.quranScreen.currentPosition")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("quranMenu.verseShort")} 7
              </div>
            </div>
            <BookOpen className="w-5 h-5 text-emerald-500" />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1"
            data-testid="button-bookmarks"
          >
            <Bookmark className="w-5 h-5 text-emerald-500" />
            <span className="text-xs">{t("quranMenu.bookmarks")}</span>
            <span className="text-[10px] text-muted-foreground">3</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1"
            data-testid="button-memorization-progress"
          >
            <GraduationCap className="w-5 h-5 text-emerald-500" />
            <span className="text-xs">{t("quranMenu.memorize")}</span>
            <span className="text-[10px] text-muted-foreground">1</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            readOnly
            placeholder={t("quranMenu.searchSurah")}
            className="pl-9"
            data-testid="input-search-surah"
          />
        </div>

        <div className="space-y-2">
          {surahs.map(({ id, name, translit, arabic, verses, highlight }) => (
            <SurahListCard
              key={id}
              id={id}
              nameSimple={name}
              nameArabic={arabic}
              translatedName={translit}
              versesCount={verses}
              versesLabel={t("quranMenu.verses")}
              onClick={highlight ? onTapSurah : undefined}
              highlight={highlight}
            />
          ))}
        </div>
      </div>

      <MockBottomNav active="quran" />
    </div>
  );
}

function ProgressScreen() {
  const { t } = useTranslation();
  const weekHeatmap = [3, 5, 0, 4, 6, 5, 2];
  const weekDays = t("tour.progressScreen.weekDays", { returnObjects: true }) as string[];
  const lineData = [2, 4, 3, 5, 6, 4, 7, 5, 6, 8, 6, 7, 9, 7];
  const max = Math.max(...lineData);

  // Build polyline points for the line chart
  const chartW = 260;
  const chartH = 80;
  const stepX = chartW / (lineData.length - 1);
  const points = lineData
    .map((v, i) => `${i * stepX},${chartH - (v / max) * chartH}`)
    .join(" ");

  return (
    <div className="flex flex-col h-full bg-background">
      <MockAppHeader title={t("tour.progressScreen.title")} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
        {/* Filter row (mirrors real ProgressPage filter card) */}
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-3 flex items-center gap-2">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {t("tour.progressScreen.thisMonth")}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
        </div>

        {/* Two stat cards — real shadcn <Card />. */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              {t("tour.progressScreen.goodDeeds")}
            </p>
            <p className="text-2xl font-display font-bold text-emerald-500">47</p>
          </Card>
          <Card data-tour-highlight className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              {t("tour.progressScreen.streak")}
            </p>
            <div className="flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-orange-500" />
              <p className="text-2xl font-display font-bold text-orange-500">12</p>
              <span className="text-[10px] text-muted-foreground self-end mb-1">
                {t("tour.progressScreen.days")}
              </span>
            </div>
          </Card>
        </div>

        {/* Weekly heatmap */}
        <Card className="p-3">
          <p className="text-xs font-semibold mb-2.5">{t("tour.progressScreen.thisWeek")}</p>
          <div className="flex items-end gap-2 h-20">
            {weekHeatmap.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md ${v > 0 ? "bg-emerald-500" : "bg-muted"}`}
                  style={{ height: `${(v / 6) * 100}%`, minHeight: v > 0 ? "8px" : "4px" }}
                />
                <span className="text-[10px] text-muted-foreground">{weekDays[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Line chart */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs font-semibold">{t("tour.progressScreen.deedsPerDay")}</p>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-20">
            {/* grid */}
            {[0, 1, 2, 3].map((g) => (
              <line
                key={g}
                x1="0"
                x2={chartW}
                y1={(g * chartH) / 3}
                y2={(g * chartH) / 3}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-muted"
              />
            ))}
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className="text-emerald-500"
            />
            {lineData.map((v, i) => (
              <circle
                key={i}
                cx={i * stepX}
                cy={chartH - (v / max) * chartH}
                r="2"
                className="fill-emerald-500"
              />
            ))}
          </svg>
        </Card>
      </div>

      <MockBottomNav active="home" />
    </div>
  );
}

function FinalScreen({ onSignUp }: { onSignUp: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full bg-background items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5"
      >
        <Flame className="w-10 h-10 text-emerald-500" />
      </motion.div>

      <h3 className="text-xl font-display font-bold mb-2">{t("tour.finalScreen.title")}</h3>
      <p className="text-sm text-muted-foreground mb-7 max-w-[260px] leading-relaxed">
        {t("tour.finalScreen.subtitle")}
      </p>

      <div className="space-y-2.5 w-full max-w-[280px]">
        <button
          data-tour-highlight
          onClick={onSignUp}
          className="w-full btn-primary text-sm py-3 rounded-xl flex items-center justify-center gap-2"
          data-testid="tour-button-signup-google"
        >
          <SiGoogle className="w-4 h-4" />
          {t("tour.finalScreen.continueGoogle")}
        </button>
        <button
          onClick={onSignUp}
          className="w-full text-sm py-3 rounded-xl flex items-center justify-center gap-2 border border-border bg-card hover:bg-muted text-foreground transition-colors"
          data-testid="tour-button-signup-username"
        >
          <KeyRound className="w-4 h-4" />
          {t("tour.finalScreen.useUsername")}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground mt-5">{t("tour.finalScreen.freeForever")}</p>
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

  // The dimming is created by four strips that surround the spotlight area
  // without placing any element ON TOP of the highlighted button. This
  // guarantees that elementFromPoint() (used by Playwright's actionability
  // checks and real browsers) returns the highlighted element itself rather
  // than an overlay div, so direct .click() events reach the button.
  const DIM = "rgba(0,0,0,0.52)";
  const strips = [
    // top strip
    { top: 0, left: 0, width: "100%", height: spotTop },
    // bottom strip
    { top: spotTop + spotH, left: 0, width: "100%", height: `calc(100% - ${spotTop + spotH}px)` },
    // left strip (vertically between top and bottom strips)
    { top: spotTop, left: 0, width: spotLeft, height: spotH },
    // right strip
    { top: spotTop, left: spotLeft + spotW, width: `calc(100% - ${spotLeft + spotW}px)`, height: spotH },
  ] as const;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[28px]">
      {/* Four dimming strips — none of them covers the spotlight area */}
      {strips.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            background: DIM,
            transition: "top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease",
            ...s,
          }}
        />
      ))}

      {/* Green border frame around the spotlight */}
      <div
        style={{
          position: "absolute",
          top: spotTop,
          left: spotLeft,
          width: spotW,
          height: spotH,
          borderRadius: 12,
          border: "2px solid rgba(52, 211, 153, 0.85)",
          transition: "top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease",
          pointerEvents: "none",
        }}
      />

      {/* Pulsing glow ring */}
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: spotTop - 5,
          left: spotLeft - 5,
          width: spotW + 10,
          height: spotH + 10,
          borderRadius: 16,
          border: "2px solid rgba(52, 211, 153, 0.5)",
          pointerEvents: "none",
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
  const { t } = useTranslation();

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: side === "right" ? 12 : 0, y: side === "bottom" ? 12 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-card border border-border rounded-2xl shadow-2xl p-4 ${
        side === "right" ? "w-64" : "w-full max-w-sm"
      }`}
    >
      {side === "right" && (
        <div className="absolute right-full top-8 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-card" />
      )}
      {side === "bottom" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-card" />
      )}

      <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">
        {t("tour.coachmark.stepOf", { current: stepIndex + 1, total: totalSteps })}
      </p>
      <h4 className="text-sm font-display font-bold mb-1.5">{step.title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.description}</p>

      {step.interactionAdvances && !interactionDone && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 mb-2.5">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
          {t("tour.coachmark.interactHint")}
        </div>
      )}

      <button
        onClick={onAction}
        className="w-full text-xs py-2 rounded-xl font-semibold transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
        data-testid={`tour-coachmark-action-${step.id}`}
      >
        {step.id === "final" ? t("tour.actions.signUpFree") : interactionDone ? t("tour.actions.next") : step.actionLabel}
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
  const { t } = useTranslation();

  const STEPS: StepDef[] = useMemo(() => STEP_CONFIGS.map(cfg => ({
    id: cfg.id,
    title: t(`tour.steps.${cfg.stepKey}.title`),
    description: t(`tour.steps.${cfg.stepKey}.description`),
    coachmarkSide: cfg.coachmarkSide,
    actionLabel: t(`tour.actions.${cfg.actionKey}`),
    interactionAdvances: cfg.interactionAdvances,
  })), [t]);

  const [currentStep, setCurrentStep] = useState(0);
  const [dzikirCount, setDzikirCount] = useState(0);
  const [deedRecorded, setDeedRecorded] = useState(false);
  const [fajrDone, setFajrDone] = useState(false);
  const [surahTapped, setSurahTapped] = useState(false);
  const [isDesktopCoachmark, setIsDesktopCoachmark] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktopCoachmark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
    [dzikirCount, deedRecorded, fajrDone, surahTapped, STEPS]
  );

  const canAdvance = interactionDoneForStep(currentStep);

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
    const id = setTimeout(measureHighlight, 360);
    return () => clearTimeout(id);
  }, [currentStep, dzikirCount, deedRecorded, fajrDone, surahTapped, measureHighlight]);

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

  useEffect(() => {
    if (step.id === "dzikir" && dzikirCount >= 3) {
      const timer = setTimeout(goNext, 700);
      return () => clearTimeout(timer);
    }
  }, [dzikirCount, step.id, goNext]);

  const handleCoachmarkAction = useCallback(() => {
    if (step.id === "final") {
      onClose();
      const el = document.querySelector('[data-testid="auth-chooser"]');
      if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (step.id === "record-deed" && !deedRecorded) { handleRecordDeed(); return; }
    if (step.id === "sholat" && !fajrDone) { handleMarkFajr(); return; }
    if (step.id === "quran" && !surahTapped) { handleSurahTap(); return; }
    goNext();
  }, [step.id, deedRecorded, fajrDone, surahTapped, handleRecordDeed, handleMarkFajr, handleSurahTap, goNext, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

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
      aria-label={t("tour.topBar.ariaLabel")}
    >
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted"
          data-testid="tour-button-exit"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("tour.topBar.exitTour")}</span>
        </button>

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
              aria-label={t("tour.topBar.goToStep", { step: i + 1, title: s.title })}
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
              aria-label={t("tour.topBar.previousStep")}
              data-testid="tour-button-prev"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={goNext}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-all"
              aria-label={t("tour.topBar.nextStep")}
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
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 w-full max-w-6xl">

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
                  {t("tour.coachmark.stepOf", { current: currentStep + 1, total: STEPS.length })}
                </p>
                <h2 className="text-2xl font-display font-bold mb-3">{step.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {step.interactionAdvances && !canAdvance && (
                <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
                  {t("tour.topBar.tryOrSkip")}
                </div>
              )}

              {!isLast && (
                <button
                  onClick={goNext}
                  className="btn-primary flex items-center gap-2 self-start"
                  data-testid="tour-desktop-next"
                >
                  {canAdvance ? t("tour.topBar.continue") : t("tour.topBar.skip")} <ArrowRight className="w-4 h-4" />
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
                  {t("tour.actions.signUpFree")} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Single Device Frame (shared ref for accurate spotlight measurement) ── */}
          <div className="relative flex-shrink-0 w-[320px] sm:w-[340px]">
            <div className="relative w-full aspect-[320/640] sm:aspect-[340/680] max-h-[calc(100vh-120px)] bg-card border-[10px] border-foreground/90 dark:border-foreground/80 rounded-[44px] shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/90 dark:bg-foreground/80 rounded-b-2xl z-20" />
              {/* Screen content — interactivity is preserved by default; only
                  navigating components (StatsOverview, DeedCard, nav cards)
                  are individually wrapped in <InertDemo /> so the tour
                  doesn't get unmounted when a demo card is clicked. */}
              <div
                ref={screenRef}
                className="absolute inset-0 bg-background overflow-hidden rounded-[28px]"
              >
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
                    {highlightBounds && step.id !== "final" && (
                      <SpotlightOverlay bounds={highlightBounds} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {isDesktopCoachmark ? (
            /* Right coachmark — desktop only */
            <div className="relative flex-1 max-w-[260px]">
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
          ) : (
            /* Bottom coachmark — mobile only */
            <div className="w-full max-w-sm">
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
          )}
        </div>
      </div>
    </motion.div>
  );
}
