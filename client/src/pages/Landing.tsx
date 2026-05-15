import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Target, TrendingUp, BookOpen, Bell, Users, Award, Fingerprint, Check, Moon, HandCoins, Shield, Calendar, CheckCircle2, Download, KeyRound, Play } from "lucide-react";
import { DuaHandsIcon } from "@/components/DuaHandsIcon";
import { SiGoogle } from "react-icons/si";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import testimonialAvatar from "@/assets/testimonial-yahya.png";
import istiqomaHorizontalLogo from "@assets/Istiqoma_New_Horizontal_Logo_1777797342711.png";
import istiqomaHorizontalLogoDark from "@assets/Istiqoma_New_Horizontal_Logo_-_Darkmode_1777805633685.png";
import { useTheme } from "@/components/ThemeProvider";
import { useInstallPWA } from "@/hooks/use-install-pwa";
import { ProductTour } from "@/components/ProductTour";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    UnicornStudio?: {
      init: () => void;
      isInitialized?: boolean;
    };
  }
}

export default function Landing() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const logoSrc = theme === "dark" ? istiqomaHorizontalLogoDark : istiqomaHorizontalLogo;
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

  const scrollToChooser = () => {
    const el = document.querySelector('[data-testid="auth-chooser"]');
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleUsernameLogin = () => {
    window.location.href = "/login/username";
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
                  src={logoSrc}
                  alt="Istiqoma"
                  className="h-8 w-auto"
                  data-testid="img-logo-sticky"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={scrollToChooser}
                  className="btn-secondary text-sm px-4 py-2 whitespace-nowrap"
                  data-testid="sticky-button-login"
                >
                  {t('landing.login')}
                </button>
                <button
                  onClick={scrollToChooser}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                  data-testid="sticky-button-start-tracking"
                >
                  {t('landing.startTracking')}
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
            onClick={scrollToChooser}
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
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-hero-join-pill">{t('landing.joinPill')}</span>
                </div>
              </div>
              <h1 className="font-display text-[32px] md:text-7xl font-bold mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent text-center md:text-left leading-tight" data-testid="text-hero-title">
                {t('landing.title')}<br />{t('landing.titleLine2')}
              </h1>
              <p className="text-base md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed text-center md:text-left" data-testid="text-hero-subtitle">
                {t('landing.subtitle')}
              </p>

              <div
                className="flex flex-col gap-3 max-w-md mx-auto md:mx-0"
                data-testid="auth-chooser"
              >
                <p
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-center md:text-left"
                  data-testid="text-auth-chooser-title"
                >
                  {t('landing.authChooser.title')}
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="btn-primary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2"
                  data-testid="button-chooser-google"
                >
                  <SiGoogle className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">{t('landing.authChooser.continueGoogle')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleUsernameLogin}
                  className="btn-secondary w-full text-base px-6 py-3.5 flex items-center justify-center gap-2 border border-border"
                  data-testid="button-chooser-username"
                >
                  <KeyRound className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">{t('landing.authChooser.continueUsername')}</span>
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

      {/* Personalize Section */}
      <section className="relative z-10 py-20 bg-muted/30" data-testid="section-personalize">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">

            {/* Left: Preferences Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-2 md:order-1 relative"
            >
              {/* Decorative BG */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-2xl transform rotate-2" />

              {/* Preferences Interface */}
              <div className="relative bg-card border border-border rounded-xl px-6 py-6 md:p-8 max-w-md mx-auto md:mx-0 shadow-2xl" data-testid="card-personalize">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6 border-b border-border pb-4" data-testid="text-personalize-card-title">
                  {t('landing.personalize.cardTitle')}
                </h4>

                <div className="space-y-6">
                  {/* Control 1: Slider */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-medium" data-testid="text-quran-goal-label">{t('landing.personalize.quranGoal')}</span>
                      <span className="text-emerald-500 font-medium" data-testid="text-quran-goal-value">{t('landing.personalize.quranPages')}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-[#43546b]">
                      <div className="h-full w-1/4 bg-emerald-500 rounded-full" />
                    </div>
                  </div>

                  {/* Control 2: Toggle ON */}
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

                  {/* Control 3: Toggle OFF */}
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
              </div>
            </motion.div>

            {/* Right: Text Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="order-1 md:order-2"
            >
              <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight mb-6" data-testid="text-personalize-title">
                {t('landing.personalize.title')}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="text-personalize-subtitle">
                {t('landing.personalize.subtitle')}
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground text-sm" data-testid="text-benefit-1">{t('landing.personalize.benefit1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground text-sm" data-testid="text-benefit-2">{t('landing.personalize.benefit2')}</span>
                </li>
              </ul>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="relative z-10 py-20 bg-background">
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
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 leading-tight" data-testid="text-cta-heading">
              {t('landing.cta.title')}
            </h2>
            <p className="text-muted-foreground mb-10 text-base md:text-lg" data-testid="text-cta-subtitle">
              {t('landing.cta.subtitle')}
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn-primary text-base px-10 py-3.5 inline-flex items-center justify-center gap-2"
              data-testid="button-cta-signup"
            >
              <SiGoogle className="w-5 h-5 shrink-0" />
              {t('landing.cta.button')}
            </button>
            <p className="mt-5 text-sm text-muted-foreground" data-testid="text-cta-note">
              {t('landing.cta.note')}
            </p>
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
