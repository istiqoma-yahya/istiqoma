import { useEffect, useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Target, TrendingUp, BookOpen, Bell, Users, Award, Fingerprint, Check, Moon, HandCoins, Shield, Calendar, CheckCircle2, Download, KeyRound, Play } from "lucide-react";
import { DuaHandsIcon } from "@/components/DuaHandsIcon";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import testimonialAvatar from "@/assets/testimonial-yahya.png";
import istiqomaHorizontalLogo from "@assets/Istiqoma_New_Horizontal_Logo_1777797342711.png";
import istiqomaHorizontalLogoDark from "@assets/Istiqoma_New_Horizontal_Logo_-_Darkmode_1777805633685.png";
import istiqomaLogogram from "@assets/Istiqoma_New_Logogram_1777797303038.png";
import istiqomaLogogramDark from "@assets/Istiqoma_New_Logogram_-_Darkmode_1777804992399.png";
import { useTheme } from "@/components/ThemeProvider";
import { useInstallPWA } from "@/hooks/use-install-pwa";
import { ProductTour } from "@/components/ProductTour";
import { useToast } from "@/hooks/use-toast";
import { useGuest } from "@/hooks/use-guest";

declare global {
  interface Window {
    UnicornStudio?: {
      init: () => void;
      isInitialized?: boolean;
    };
  }
}

type FeatureDeepDiveTestIds = {
  section?: string;
  illustration?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  benefit1?: string;
  benefit2?: string;
};

type FeatureDeepDiveProps = {
  featureKey: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  decorativeGradient: string;
  side: "left" | "right";
  bgAlt: boolean;
  illustration: React.ReactNode;
  i18nBase?: string;
  showEyebrow?: boolean;
  testIds?: FeatureDeepDiveTestIds;
};

function FeatureDeepDive({
  featureKey,
  icon: Icon,
  iconBg,
  iconColor,
  decorativeGradient,
  side,
  bgAlt,
  illustration,
  i18nBase,
  showEyebrow = true,
  testIds,
}: FeatureDeepDiveProps) {
  const { t } = useTranslation();
  const base = i18nBase ?? `landing.featureSections.${featureKey}`;
  const ids = {
    section: testIds?.section ?? `section-feature-${featureKey}`,
    illustration: testIds?.illustration ?? `card-feature-${featureKey}-illustration`,
    eyebrow: testIds?.eyebrow ?? `text-feature-${featureKey}-eyebrow`,
    title: testIds?.title ?? `text-feature-${featureKey}-title`,
    subtitle: testIds?.subtitle ?? `text-feature-${featureKey}-subtitle`,
    benefit1: testIds?.benefit1 ?? `text-feature-${featureKey}-benefit-1`,
    benefit2: testIds?.benefit2 ?? `text-feature-${featureKey}-benefit-2`,
  };
  const illustrationOnLeft = side === "left";
  return (
    <section
      className={`relative z-10 py-20 ${bgAlt ? "bg-muted/30" : "bg-background"}`}
      data-testid={ids.section}
    >
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: illustrationOnLeft ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className={`relative ${illustrationOnLeft ? "order-2 md:order-1" : "order-2 md:order-2"}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${decorativeGradient} rounded-2xl transform rotate-2`} />
            <div
              className="relative bg-card border border-border rounded-xl p-6 md:p-8 max-w-md mx-auto md:mx-0 shadow-2xl"
              data-testid={ids.illustration}
            >
              {illustration}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: illustrationOnLeft ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={illustrationOnLeft ? "order-1 md:order-2" : "order-1 md:order-1"}
          >
            {showEyebrow && (
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  data-testid={ids.eyebrow}
                >
                  {t(`${base}.eyebrow`)}
                </span>
              </div>
            )}
            <h2
              className="text-3xl md:text-4xl font-bold font-display tracking-tight mb-6"
              data-testid={ids.title}
            >
              {t(`${base}.title`)}
            </h2>
            <p
              className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed"
              data-testid={ids.subtitle}
            >
              {t(`${base}.subtitle`)}
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span
                  className="text-muted-foreground text-sm"
                  data-testid={ids.benefit1}
                >
                  {t(`${base}.benefit1`)}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span
                  className="text-muted-foreground text-sm"
                  data-testid={ids.benefit2}
                >
                  {t(`${base}.benefit2`)}
                </span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SpiritualGoalsIllustration() {
  const { t } = useTranslation();
  return (
    <>
      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6 border-b border-border pb-4" data-testid="text-personalize-card-title">
        {t('landing.personalize.cardTitle')}
      </h4>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-foreground font-medium" data-testid="text-quran-goal-label">{t('landing.personalize.quranGoal')}</span>
            <span className="text-emerald-500 font-medium" data-testid="text-quran-goal-value">{t('landing.personalize.quranPages')}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-[#43546b]">
            <div className="h-full w-1/4 bg-emerald-500 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-md text-muted-foreground">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-tahajjud-title">{t('landing.personalize.tahajjudTitle')}</p>
              <p className="text-xs text-muted-foreground" data-testid="text-tahajjud-desc">{t('landing.personalize.tahajjudDesc')}</p>
            </div>
          </div>
          <div className="w-11 h-6 bg-emerald-500 rounded-full flex items-center px-1">
            <div className="w-4 h-4 rounded-full shadow-sm ml-auto bg-[#f8fafc]" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-md text-muted-foreground">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-fasting-title">{t('landing.personalize.fastingTitle')}</p>
              <p className="text-xs text-muted-foreground" data-testid="text-fasting-desc">{t('landing.personalize.fastingDesc')}</p>
            </div>
          </div>
          <div className="w-11 h-6 rounded-full flex items-center px-1 bg-[#43546b]">
            <div className="w-4 h-4 bg-muted-foreground rounded-full shadow-sm" />
          </div>
        </div>
      </div>
    </>
  );
}

function DzikirIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.dzikir.illustration";
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4" data-testid="text-dzikir-illustration-label">
        {t(`${base}.label`)}
      </p>
      <div className="relative w-40 h-40 mx-auto mb-5">
        <svg className="absolute inset-0 transform -rotate-90 w-full h-full" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="68" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted" />
          <circle cx="80" cy="80" r="68" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - 33 / 100)} className="text-emerald-500" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-display text-foreground" data-testid="text-dzikir-illustration-count">33</span>
          <span className="text-xs text-muted-foreground mt-1" data-testid="text-dzikir-illustration-target">/ 100</span>
        </div>
      </div>
      <p className="font-arabic text-2xl text-foreground mb-1" data-testid="text-dzikir-illustration-arabic">سُبْحَانَ ٱللَّٰه</p>
      <p className="text-sm text-muted-foreground mb-5" data-testid="text-dzikir-illustration-type">{t(`${base}.type`)}</p>
      <button type="button" className="w-full bg-emerald-500 text-white rounded-xl py-3 text-sm font-semibold shadow-sm" tabIndex={-1} data-testid="button-dzikir-illustration-tap">
        {t(`${base}.tap`)}
      </button>
    </div>
  );
}

function QuranIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.quran.illustration";
  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-quran-illustration-surah">
            {t(`${base}.surah`)}
          </p>
          <p className="text-sm text-foreground font-medium" data-testid="text-quran-illustration-verse-ref">{t(`${base}.verseRef`)}</p>
        </div>
        <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-blue-500" />
        </div>
      </div>
      <p className="font-arabic text-2xl text-foreground text-right leading-loose mb-4" dir="rtl" data-testid="text-quran-illustration-arabic">
        وَلَا تَيْـَٔسُوا۟ مِن رَّوْحِ ٱللَّهِ
      </p>
      <p className="text-sm text-muted-foreground italic mb-4" data-testid="text-quran-illustration-translation">
        {t(`${base}.translation`)}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>{t(`${base}.progress`)}</span>
      </div>
    </div>
  );
}

function RemindersIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.reminders.illustration";
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" data-testid="text-reminders-illustration-label">
        {t(`${base}.label`)}
      </p>
      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl" data-testid="row-reminders-illustration-fajr">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground" data-testid="text-reminders-illustration-fajr-title">{t(`${base}.fajrTitle`)}</p>
          <p className="text-xs text-muted-foreground" data-testid="text-reminders-illustration-fajr-desc">{t(`${base}.fajrDesc`)}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="text-reminders-illustration-fajr-time">04:42</span>
      </div>
      <div className="flex items-start gap-3 p-3 bg-muted rounded-xl" data-testid="row-reminders-illustration-tahajjud">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Moon className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground" data-testid="text-reminders-illustration-tahajjud-title">{t(`${base}.tahajjudTitle`)}</p>
          <p className="text-xs text-muted-foreground" data-testid="text-reminders-illustration-tahajjud-desc">{t(`${base}.tahajjudDesc`)}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="text-reminders-illustration-tahajjud-time">03:15</span>
      </div>
      <div className="flex items-start gap-3 p-3 bg-muted rounded-xl" data-testid="row-reminders-illustration-quran">
        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground" data-testid="text-reminders-illustration-quran-title">{t(`${base}.quranTitle`)}</p>
          <p className="text-xs text-muted-foreground" data-testid="text-reminders-illustration-quran-desc">{t(`${base}.quranDesc`)}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="text-reminders-illustration-quran-time">20:00</span>
      </div>
    </div>
  );
}

function AnalyticsIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.analytics.illustration";
  const dayValues = [12, 20, 15, 24, 17, 27, 21];
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => t(`${base}.dayShort_${i}`));
  const yMax = 30;
  const peakIdx = dayValues.indexOf(Math.max(...dayValues));
  const peakValue = dayValues[peakIdx];
  const gridLines = [30, 20, 10];

  const sparkPoints = [10, 14, 12, 18, 16, 22, 24];
  const sparkMax = Math.max(...sparkPoints);
  const sparkMin = Math.min(...sparkPoints);
  const sparkW = 100;
  const sparkH = 24;
  const sparkCoords = sparkPoints.map((v, i) => {
    const x = (i / (sparkPoints.length - 1)) * sparkW;
    const y = sparkH - ((v - sparkMin) / (sparkMax - sparkMin || 1)) * sparkH;
    return [x, y] as const;
  });
  const sparkLine = sparkCoords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const sparkArea = `${sparkLine} L${sparkW},${sparkH} L0,${sparkH} Z`;

  const categories = [
    { key: "sholat", value: 78, color: "bg-emerald-500" },
    { key: "dzikir", value: 62, color: "bg-violet-500" },
    { key: "quran", value: 45, color: "bg-blue-500" },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-analytics-illustration-label">
            {t(`${base}.label`)}
          </p>
          <p className="text-2xl font-bold font-display text-foreground mt-1" data-testid="text-analytics-illustration-total">128 <span className="text-sm font-normal text-muted-foreground">{t(`${base}.deeds`)}</span></p>
        </div>
        <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold bg-emerald-500/10 px-2 py-1 rounded-md" data-testid="text-analytics-illustration-trend">
          <TrendingUp className="w-3 h-3" />
          +24%
        </div>
      </div>

      <div className="mb-4" data-testid="row-analytics-illustration-chart">
        <div className="relative h-28 pl-6">
          {gridLines.map((v) => (
            <div
              key={v}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${(1 - v / yMax) * 100}%` }}
            >
              <span className="w-5 -translate-y-1/2 pr-1 text-right text-[9px] text-muted-foreground/70 tabular-nums">{v}</span>
              <div className="flex-1 border-t border-dashed border-border/70" />
            </div>
          ))}
          <div className="absolute left-6 right-0 top-0 bottom-0 flex items-end gap-2">
            {dayValues.map((v, i) => {
              const isPeak = i === peakIdx;
              return (
                <div key={i} className="relative flex-1 flex flex-col items-center justify-end h-full">
                  {isPeak && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 -top-1 -translate-y-full rounded bg-violet-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm whitespace-nowrap"
                      data-testid="text-analytics-illustration-peak-value"
                    >
                      {peakValue}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t-md ${isPeak ? "bg-violet-500" : "bg-violet-500/40"}`}
                    style={{ height: `${(v / yMax) * 100}%` }}
                    data-testid={`row-analytics-illustration-bar-${i}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pl-6 mt-1.5">
          {days.map((d, i) => (
            <span
              key={i}
              className={`flex-1 text-center text-[10px] ${i === peakIdx ? "text-violet-500 font-semibold" : "text-muted-foreground"}`}
              data-testid={`text-analytics-illustration-day-${i}`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border/70 bg-muted/30 p-3" data-testid="row-analytics-illustration-trend">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-analytics-illustration-trend-label">
            {t(`${base}.trendLabel`)}
          </span>
          <span className="text-[11px] font-semibold text-emerald-500 tabular-nums" data-testid="text-analytics-illustration-trend-delta">+18%</span>
        </div>
        <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" className="block w-full h-7" aria-hidden="true">
          <defs>
            <linearGradient id="analyticsSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" className="text-emerald-500" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-emerald-500" />
            </linearGradient>
          </defs>
          <path d={sparkArea} fill="url(#analyticsSparkFill)" />
          <path d={sparkLine} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" vectorEffect="non-scaling-stroke" />
          <circle cx={sparkCoords[sparkCoords.length - 1][0]} cy={sparkCoords[sparkCoords.length - 1][1]} r="2" className="fill-emerald-500" />
        </svg>
      </div>

      <div className="space-y-2 mb-4" data-testid="row-analytics-illustration-categories">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-analytics-illustration-categories-title">
          {t(`${base}.categoriesTitle`)}
        </p>
        {categories.map((c) => (
          <div key={c.key} className="flex items-center gap-3" data-testid={`row-analytics-illustration-category-${c.key}`}>
            <span className="w-14 truncate text-xs text-foreground" data-testid={`text-analytics-illustration-category-${c.key}-name`}>
              {t(`${base}.category_${c.key}`)}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.value}%` }} />
            </div>
            <span className="w-9 text-right text-[11px] font-semibold text-foreground tabular-nums" data-testid={`text-analytics-illustration-category-${c.key}-value`}>
              {c.value}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
        <span className="text-muted-foreground">{t(`${base}.streak`)}</span>
        <span className="text-foreground font-semibold" data-testid="text-analytics-illustration-streak">42 {t(`${base}.days`)}</span>
      </div>
    </div>
  );
}

function CommunityIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.community.illustration";
  const rows = [
    { name: "Aisha R.", pts: 1840, accent: "bg-amber-500/20 text-amber-500" },
    { name: "Yusuf A.", pts: 1620, accent: "bg-slate-400/20 text-slate-400" },
    { name: t(`${base}.you`), pts: 1485, accent: "bg-orange-500/20 text-orange-500", me: true },
  ];
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4" data-testid="text-community-illustration-label">
        {t(`${base}.label`)}
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border ${r.me ? "border-cyan-500/40 bg-cyan-500/5" : "border-border bg-muted/40"}`}
            data-testid={`row-community-illustration-rank-${i + 1}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r.accent}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" data-testid={`text-community-illustration-name-${i + 1}`}>{r.name}</p>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums" data-testid={`text-community-illustration-points-${i + 1}`}>{r.pts.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4 text-center">{t(`${base}.caption`)}</p>
    </div>
  );
}

function BadgesIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.badges.illustration";
  const badges = [
    { icon: Moon, label: t(`${base}.badge1`), color: "text-emerald-500", bg: "bg-emerald-500/10", unlocked: true },
    { icon: BookOpen, label: t(`${base}.badge2`), color: "text-blue-500", bg: "bg-blue-500/10", unlocked: true },
    { icon: Award, label: t(`${base}.badge3`), color: "text-orange-500", bg: "bg-orange-500/10", unlocked: false },
  ];
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4" data-testid="text-badges-illustration-label">
        {t(`${base}.label`)}
      </p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {badges.map((b, i) => (
          <div key={i} className={`flex flex-col items-center text-center p-3 rounded-xl border border-border ${b.unlocked ? "" : "opacity-40"}`} data-testid={`card-badges-illustration-badge-${i + 1}`}>
            <div className={`w-12 h-12 rounded-full ${b.bg} flex items-center justify-center mb-2`}>
              <b.icon className={`w-5 h-5 ${b.color}`} />
            </div>
            <p className="text-[11px] font-semibold text-foreground leading-tight" data-testid={`text-badges-illustration-badge-${i + 1}`}>{b.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/30" data-testid="row-badges-illustration-progress">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-semibold text-foreground">{t(`${base}.progressTitle`)}</span>
        </div>
        <span className="text-xs text-muted-foreground" data-testid="text-badges-illustration-progress-value">14 / 30</span>
      </div>
    </div>
  );
}

function PrivacyIllustration() {
  const { t } = useTranslation();
  const base = "landing.featureSections.privacy.illustration";
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5" data-testid="text-privacy-illustration-label">
        {t(`${base}.label`)}
      </p>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-slate-500/10 flex items-center justify-center mb-4">
          <Shield className="w-10 h-10 text-slate-500" />
        </div>
        <p className="text-lg font-bold font-display text-foreground" data-testid="text-privacy-illustration-headline">{t(`${base}.headline`)}</p>
      </div>
      <div className="space-y-3">
        {([
          [Check, t(`${base}.point1`)],
          [Check, t(`${base}.point2`)],
          [Check, t(`${base}.point3`)],
        ] as const).map(([Ic, txt], i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40" data-testid={`row-privacy-illustration-point-${i + 1}`}>
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Ic className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
            <span className="text-sm text-foreground" data-testid={`text-privacy-illustration-point-${i + 1}`}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { t, i18n } = useTranslation();
  usePageMeta({
    title: t("seo.landing.title"),
    description: t("seo.landing.description"),
    locale: i18n.language?.split("-")[0] ?? "en",
    canonicalPath: "/",
  });
  const { theme } = useTheme();
  const { toast } = useToast();
  const logoSrc = theme === "dark" ? istiqomaHorizontalLogoDark : istiqomaHorizontalLogo;
  const logogramSrc = theme === "dark" ? istiqomaLogogramDark : istiqomaLogogram;
  const [showSticky, setShowSticky] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const { isInstallable, isInstalled, install } = useInstallPWA();

  useEffect(() => {
    if (localStorage.getItem("accountDeleted") === "1") {
      localStorage.removeItem("accountDeleted");
      toast({
        title: t("profile.dangerZone.deleteSuccessTitle"),
        description: t("profile.dangerZone.deleteSuccessDesc"),
      });
    }
  }, []);

  const { enterGuestMode, openLoginSheet } = useGuest();

  const handleStartJourney = () => {
    // Begin guest browsing — AuthWrapper swaps to the (skippable) onboarding.
    enterGuestMode();
  };

  const handleOpenLoginSheet = () => {
    openLoginSheet();
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowSticky(true);
      } else {
        setShowSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (window.UnicornStudio && window.UnicornStudio.init) {
      window.UnicornStudio.init();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border py-3 px-6 shadow-xl"
          >
            <div className="container mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center">
                <img
                  src={logogramSrc}
                  alt="Istiqoma"
                  className="h-8 w-auto"
                  data-testid="img-logo-sticky"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenLoginSheet}
                  className="btn-secondary text-sm px-4 py-2 whitespace-nowrap"
                  data-testid="sticky-button-login"
                >
                  {t('landing.login')}
                </button>
                <button
                  onClick={handleStartJourney}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                  data-testid="sticky-button-start-tracking"
                >
                  {t('landing.guestCta.startJourney')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center">
          <img
            src={logoSrc}
            alt="Istiqoma"
            className="h-10 w-auto"
            data-testid="img-logo"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleOpenLoginSheet}
            className="btn-secondary text-sm px-5 py-2.5"
            data-testid="button-login"
          >
            {t('landing.login')}
          </button>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative min-h-[600px] md:min-h-[700px]">
        {/* Unicorn Studio Animation Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <div data-us-project="xHUd2xqFoER642lhnH69" className="w-full h-full" data-testid="hero-animation-background" />
        </div>

        <main className="container mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Left Column - Hero Content (65%) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full md:w-[65%]"
            >
              <div className="flex justify-center md:justify-start mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-border backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-hero-join-pill">{t('landing.joinPill')}</span>
                </div>
              </div>
              <h1 className="font-display text-[32px] md:text-7xl font-bold mb-6 pb-2 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent text-center md:text-left leading-tight" data-testid="text-hero-title">
                {t('landing.title')}<br />{t('landing.titleLine2')}
              </h1>
              <p className="text-base md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed text-center md:text-left" data-testid="text-hero-subtitle">
                {t('landing.subtitle')}
              </p>

              <div
                className="flex flex-col gap-3 max-w-md mx-auto md:mx-0"
                data-testid="auth-chooser"
              >
                <button
                  type="button"
                  onClick={handleStartJourney}
                  className="btn-primary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2"
                  data-testid="button-start-journey"
                >
                  <span className="whitespace-nowrap">{t('landing.guestCta.startJourney')}</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenLoginSheet}
                  className="btn-secondary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2 border border-border"
                  data-testid="button-login-account"
                >
                  <KeyRound className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">{t('landing.guestCta.loginAccount')}</span>
                </button>
                {isInstallable && !isInstalled && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <button
                      onClick={install}
                      className="btn-secondary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2 border border-border"
                      data-testid="button-download-app-hero"
                    >
                      <Download className="w-5 h-5 shrink-0" />
                      <span className="whitespace-nowrap">{t('landing.downloadApp')}</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Right Column - Illustration (35%) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full md:w-[35%]"
            >
              <div className="overflow-hidden bg-card max-w-sm border border-border rounded-2xl mx-auto shadow-2xl" data-testid="card-hero-illustration">
                {/* Header UI */}
                <div className="flex bg-muted/50 border-b border-border p-6 items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{t('landing.heroCard.todaysProgress')}</p>
                    <h3 className="text-2xl font-semibold text-foreground tracking-tight">{t('landing.heroCard.muharramDate')}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center bg-background shadow-sm">
                    <div className="relative w-5 h-5">
                      <svg className="transform -rotate-90 w-full h-full">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" className="text-muted" />
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50.2" strokeDashoffset="12" className="text-emerald-500" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* List Items */}
                <div className="p-2 space-y-1">
                  {/* Item 1: Completed */}
                  <div className="flex items-center gap-4 p-3 rounded-xl">
                    <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className="line-through text-sm font-medium text-foreground opacity-50">{t('landing.heroCard.fajrPrayer')}</p>
                      <p className="text-xs text-muted-foreground">{t('landing.heroCard.completedAt')}</p>
                    </div>
                    <Moon className="w-5 h-5 text-muted-foreground/50" />
                  </div>

                  {/* Item 2: Pending */}
                  <div className="flex gap-4 rounded-xl p-3 items-center">
                    <div className="w-6 h-6 rounded-md border border-border flex items-center justify-center" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{t('landing.heroCard.readSurahKahf')}</p>
                      <p className="text-xs text-muted-foreground">{t('landing.heroCard.target20mins')}</p>
                    </div>
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>

                  {/* Item 3: Pending */}
                  <div className="flex items-center gap-4 p-3 rounded-xl">
                    <div className="w-6 h-6 rounded-md border border-border flex items-center justify-center" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{t('landing.heroCard.giveSadaqah')}</p>
                      <p className="text-xs text-muted-foreground">{t('landing.heroCard.dailyGoal')}</p>
                    </div>
                    <HandCoins className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>

                {/* Streak Footer */}
                <div className="mt-2 mx-2 mb-2 p-3 bg-slate-900 rounded-xl flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                      <DuaHandsIcon className="text-amber-400" style={{ fontSize: "1.125rem" }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-300">{t('landing.heroCard.currentStreak')}</p>
                      <p className="text-sm font-semibold">12 {t('landing.heroCard.days')}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">
                    +40 {t('landing.heroCard.pts')}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </section>
      {/* Features Section */}
      <section
        className="relative z-20 py-20 -mt-24"
        style={{ background: 'linear-gradient(to bottom, #0C1221 0%, hsl(var(--background)) 50%)' }}
        data-testid="section-features"
      >
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-emerald-500 font-medium text-sm tracking-wider uppercase mb-3" data-testid="text-features-label">{t('landing.featuresLabel')}</p>
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4" data-testid="text-features-title">{t('landing.featuresTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-12" data-testid="text-features-subtitle">{t('landing.featuresSubtitle')}</p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mb-10"
            >
              <button
                onClick={() => setShowTour(true)}
                className="inline-flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 rounded-2xl px-6 py-3 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.99]"
                data-testid="button-take-tour-features"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold">{t('landing.tour.cta')}</span>
                  <span className="text-xs opacity-75">{t('landing.tour.subtitle')}</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </button>
            </motion.div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Target,
                  title: t('landing.features.targetsTitle'),
                  desc: t('landing.features.targetsDesc'),
                  iconBg: "bg-rose-500/10",
                  iconColor: "text-rose-500"
                },
                {
                  icon: Fingerprint,
                  title: t('landing.features.dzikirTitle'),
                  desc: t('landing.features.dzikirDesc'),
                  iconBg: "bg-emerald-500/10",
                  iconColor: "text-emerald-500"
                },
                {
                  icon: BookOpen,
                  title: t('landing.features.quranTitle'),
                  desc: t('landing.features.quranDesc'),
                  iconBg: "bg-blue-500/10",
                  iconColor: "text-blue-500"
                },
                {
                  icon: Bell,
                  title: t('landing.features.remindersTitle'),
                  desc: t('landing.features.remindersDesc'),
                  iconBg: "bg-amber-500/10",
                  iconColor: "text-amber-500"
                },
                {
                  icon: TrendingUp,
                  title: t('landing.features.analyticsTitle'),
                  desc: t('landing.features.analyticsDesc'),
                  iconBg: "bg-violet-500/10",
                  iconColor: "text-violet-500"
                },
                {
                  icon: Users,
                  title: t('landing.features.communityTitle'),
                  desc: t('landing.features.communityDesc'),
                  iconBg: "bg-cyan-500/10",
                  iconColor: "text-cyan-500"
                },
                {
                  icon: Award,
                  title: t('landing.features.badgesTitle'),
                  desc: t('landing.features.badgesDesc'),
                  iconBg: "bg-orange-500/10",
                  iconColor: "text-orange-500"
                },
                {
                  icon: Shield,
                  title: t('landing.features.privacyTitle'),
                  desc: t('landing.features.privacyDesc'),
                  iconBg: "bg-slate-500/10",
                  iconColor: "text-slate-500"
                }
              ].map((feature, i) => (
                <div key={i} className="glass-card p-5 text-left hover-elevate" data-testid={`card-feature-${i}`}>
                  <div className={`w-11 h-11 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-base font-bold font-display mb-2" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed" data-testid={`text-feature-desc-${i}`}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      {/* Testimonial Section (moved before deep-dives) */}
      <section className="relative z-10 py-20 bg-background" data-testid="section-testimonial">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-3xl mx-auto text-center"
          >
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8" data-testid="text-testimonial-quote">
              "{t('landing.testimonial.quote')}"
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-emerald-500/30" data-testid="img-testimonial-avatar">
                <AvatarImage src={testimonialAvatar} alt={t('landing.testimonial.name')} className="object-cover" />
                <AvatarFallback>YPE</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-bold" data-testid="text-testimonial-name">{t('landing.testimonial.name')}</p>
                <p className="text-sm text-muted-foreground" data-testid="text-testimonial-role">{t('landing.testimonial.role')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Deep-dive: Spiritual Goals (Personalize) */}
      <FeatureDeepDive
        featureKey="goals"
        icon={Target}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
        decorativeGradient="from-emerald-500/10 to-emerald-500/5"
        side="left"
        bgAlt
        showEyebrow={false}
        illustration={<SpiritualGoalsIllustration />}
        testIds={{
          section: "section-personalize",
          illustration: "card-personalize",
          title: "text-personalize-title",
          subtitle: "text-personalize-subtitle",
          benefit1: "text-benefit-1",
          benefit2: "text-benefit-2",
        }}
      />
      {/* Deep-dive: Dzikir */}
      <FeatureDeepDive
        featureKey="dzikir"
        icon={Fingerprint}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
        decorativeGradient="from-emerald-500/10 to-emerald-500/5"
        side="right"
        bgAlt={false}
        illustration={<DzikirIllustration />}
      />
      {/* Deep-dive: Quran Reader */}
      <FeatureDeepDive
        featureKey="quran"
        icon={BookOpen}
        iconBg="bg-blue-500/10"
        iconColor="text-blue-500"
        decorativeGradient="from-blue-500/10 to-blue-500/5"
        side="left"
        bgAlt={true}
        illustration={<QuranIllustration />}
      />
      {/* Deep-dive: Reminders */}
      <FeatureDeepDive
        featureKey="reminders"
        icon={Bell}
        iconBg="bg-amber-500/10"
        iconColor="text-amber-500"
        decorativeGradient="from-amber-500/10 to-amber-500/5"
        side="right"
        bgAlt={false}
        illustration={<RemindersIllustration />}
      />
      {/* Deep-dive: Analytics */}
      <FeatureDeepDive
        featureKey="analytics"
        icon={TrendingUp}
        iconBg="bg-violet-500/10"
        iconColor="text-violet-500"
        decorativeGradient="from-violet-500/10 to-violet-500/5"
        side="left"
        bgAlt={true}
        illustration={<AnalyticsIllustration />}
      />
      {/* Deep-dive: Community */}
      <FeatureDeepDive
        featureKey="community"
        icon={Users}
        iconBg="bg-cyan-500/10"
        iconColor="text-cyan-500"
        decorativeGradient="from-cyan-500/10 to-cyan-500/5"
        side="right"
        bgAlt={false}
        illustration={<CommunityIllustration />}
      />
      {/* Deep-dive: Badges */}
      <FeatureDeepDive
        featureKey="badges"
        icon={Award}
        iconBg="bg-orange-500/10"
        iconColor="text-orange-500"
        decorativeGradient="from-orange-500/10 to-orange-500/5"
        side="left"
        bgAlt={true}
        illustration={<BadgesIllustration />}
      />
      {/* Deep-dive: Privacy First */}
      <FeatureDeepDive
        featureKey="privacy"
        icon={Shield}
        iconBg="bg-slate-500/10"
        iconColor="text-slate-500"
        decorativeGradient="from-slate-500/10 to-slate-500/5"
        side="right"
        bgAlt={false}
        illustration={<PrivacyIllustration />}
      />
      {isInstallable && !isInstalled && (
        <section className="relative z-10 pb-16 bg-background">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-md mx-auto text-center"
            >
              <button
                onClick={install}
                className="btn-primary w-full sm:w-auto text-base px-8 py-3.5 flex items-center justify-center gap-2 mx-auto"
                data-testid="button-download-app-bottom"
              >
                <Download className="w-5 h-5" />
                {t('landing.downloadApp')}
              </button>
              <p className="text-sm text-muted-foreground mt-3" data-testid="text-download-app-desc">
                {t('landing.downloadAppDesc')}
              </p>
            </motion.div>
          </div>
        </section>
      )}
      {/* CTA Section */}
      <section className="relative z-10 py-24 overflow-hidden border-t border-border" data-testid="section-cta">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-background to-background pointer-events-none" />
        <div className="relative z-10 container mx-auto px-6 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-arabic text-3xl text-amber-500/80 mb-6 block" data-testid="text-cta-bismillah">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-display leading-tight mb-[32px]" data-testid="text-cta-heading">
              {t('landing.cta.title')}
            </h2>
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleStartJourney}
                className="btn-primary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2"
                data-testid="button-cta-start-journey"
              >
                <span className="whitespace-nowrap">{t('landing.guestCta.startJourney')}</span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </button>
              <button
                type="button"
                onClick={handleOpenLoginSheet}
                className="btn-secondary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2 border border-border"
                data-testid="button-cta-login-account"
              >
                <KeyRound className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">{t('landing.guestCta.loginAccount')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p data-testid="text-footer-copyright">© {new Date().getFullYear()} {t('app.name')}. {t('app.tagline')}</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy-policy">
            Privacy Policy
          </a>
          <span aria-hidden="true">·</span>
          <a href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms-of-service">
            Terms of Service
          </a>
        </div>
      </footer>
      {/* Product Tour Overlay */}
      <AnimatePresence>
        {showTour && <ProductTour onClose={() => setShowTour(false)} />}
      </AnimatePresence>
    </div>
  );
}
