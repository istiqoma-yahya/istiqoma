import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Target, TrendingUp, BookOpen, Bell, Users, Award, Fingerprint, Check, Moon, Star, Heart, Shield, Download, KeyRound, Play } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import testimonialAvatar from "@/assets/testimonial-yahya.png";
import istiqomaHorizontalLogoDark from "@assets/Istiqoma_New_Horizontal_Logo_-_Darkmode_1777805633685.png";
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

const AMIRI: React.CSSProperties = { fontFamily: "'Amiri', serif" };
const PLAYFAIR: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

export default function Landing() {
  const { t } = useTranslation();
  const { toast } = useToast();
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

  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (window.UnicornStudio?.init) window.UnicornStudio.init();
  }, []);

  const scrollToChooser = () => {
    const el = document.querySelector('[data-testid="auth-chooser"]');
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGoogleLogin = () => { window.location.href = "/api/login"; };
  const handleUsernameLogin = () => { window.location.href = "/login/username"; };

  const rhythmItems = [
    { time: t('landing.editorial.rhythmSubuh'), title: t('landing.editorial.rhythmSubuhTitle'), desc: t('landing.editorial.rhythmSubuhDesc'), Icon: Moon },
    { time: t('landing.editorial.rhythmDhuha'), title: t('landing.editorial.rhythmDhuhaTitle'), desc: t('landing.editorial.rhythmDhuhaDesc'), Icon: Star },
    { time: t('landing.editorial.rhythmSiang'), title: t('landing.editorial.rhythmSiangTitle'), desc: t('landing.editorial.rhythmSiangDesc'), Icon: Heart },
    { time: t('landing.editorial.rhythmMalam'), title: t('landing.editorial.rhythmMalamTitle'), desc: t('landing.editorial.rhythmMalamDesc'), Icon: BookOpen },
  ];

  const features = [
    { icon: Target, title: t('landing.features.targetsTitle'), desc: t('landing.features.targetsDesc'), color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/10" },
    { icon: Fingerprint, title: t('landing.features.dzikirTitle'), desc: t('landing.features.dzikirDesc'), color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
    { icon: BookOpen, title: t('landing.features.quranTitle'), desc: t('landing.features.quranDesc'), color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
    { icon: Bell, title: t('landing.features.remindersTitle'), desc: t('landing.features.remindersDesc'), color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" },
    { icon: TrendingUp, title: t('landing.features.analyticsTitle'), desc: t('landing.features.analyticsDesc'), color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/10" },
    { icon: Users, title: t('landing.features.communityTitle'), desc: t('landing.features.communityDesc'), color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/10" },
    { icon: Award, title: t('landing.features.badgesTitle'), desc: t('landing.features.badgesDesc'), color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/10" },
    { icon: Shield, title: t('landing.features.privacyTitle'), desc: t('landing.features.privacyDesc'), color: "text-slate-400", border: "border-slate-500/20", bg: "bg-slate-500/10" },
  ];

  return (
    <div style={{ background: '#0A0F16', color: '#e2e8f0', minHeight: '100vh' }} className="overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            exit={{ y: -80 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b py-3 px-6 shadow-xl"
            style={{ background: 'rgba(10,15,22,0.92)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="container mx-auto flex items-center justify-between gap-4">
              <img src={istiqomaHorizontalLogoDark} alt="Istiqoma" className="h-8 w-auto" data-testid="img-logo-sticky" />
              <div className="flex items-center gap-3">
                <button onClick={scrollToChooser} className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2" data-testid="sticky-button-login">
                  {t('landing.login')}
                </button>
                <button
                  onClick={scrollToChooser}
                  className="text-sm px-5 py-2 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  style={PLAYFAIR}
                  data-testid="sticky-button-start-tracking"
                >
                  {t('landing.startTracking')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav ── */}
      <nav className="relative z-20 px-6 md:px-12 py-8 flex items-center justify-between">
        <img src={istiqomaHorizontalLogoDark} alt="Istiqoma" className="h-10 w-auto" data-testid="img-logo" />
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={scrollToChooser}
            className="text-sm px-5 py-2.5 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors hidden md:inline-flex"
            data-testid="button-login"
          >
            {t('landing.login')}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center -mt-20 pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src="/islamic-hero.png"
            alt="Islamic geometric background"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,15,22,0.4), rgba(10,15,22,0.85) 60%, #0A0F16)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0A0F16 0%, transparent 20%, transparent 80%, #0A0F16 100%)' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 text-center flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="text-amber-500/90 italic tracking-widest text-sm uppercase mb-6 block" style={PLAYFAIR} data-testid="text-hero-premium-label">
              {t('landing.editorial.premiumLabel')}
            </span>

            <h1
              className="text-5xl md:text-8xl text-white leading-tight mb-4"
              style={PLAYFAIR}
              data-testid="text-hero-title"
            >
              {t('landing.title')}<br />
              <span className="text-emerald-400">{t('landing.titleLine2')}</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mt-6 font-light leading-relaxed" data-testid="text-hero-subtitle">
              {t('landing.subtitle')}
            </p>

            <div className="mt-12 flex flex-col items-center gap-6 max-w-sm mx-auto" data-testid="auth-chooser">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500" data-testid="text-auth-chooser-title">
                {t('landing.authChooser.title')}
              </p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-8 text-base transition-all border border-emerald-400/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                data-testid="button-chooser-google"
              >
                <SiGoogle className="w-5 h-5 shrink-0" />
                <span>{t('landing.authChooser.continueGoogle')}</span>
              </button>
              <button
                type="button"
                onClick={handleUsernameLogin}
                className="w-full flex items-center justify-center gap-2 border text-slate-300 hover:text-white hover:border-slate-400 py-4 px-8 text-base transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                data-testid="button-chooser-username"
              >
                <KeyRound className="w-5 h-5 shrink-0" />
                <span>{t('landing.authChooser.continueUsername')}</span>
              </button>
              {isInstallable && !isInstalled && (
                <button
                  onClick={install}
                  className="w-full flex items-center justify-center gap-2 border text-slate-300 hover:text-white hover:border-slate-400 py-4 px-8 text-base transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  data-testid="button-download-app-hero"
                >
                  <Download className="w-5 h-5 shrink-0" />
                  <span>{t('landing.downloadApp')}</span>
                </button>
              )}
            </div>

            <div className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-500" data-testid="text-hero-join-pill">
              <div className="flex -space-x-2">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs"
                    style={{ background: '#1a2332', borderColor: '#0A0F16' }}>
                    {i < 3 ? <Star className="w-3 h-3 text-amber-500" /> : <span className="text-[10px]">+50</span>}
                  </div>
                ))}
              </div>
              <span>{t('landing.joinPill')}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-16 px-6 md:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { num: "50+", label: t('landing.editorial.statsUsersLabel') },
            { num: "1.000+", label: t('landing.editorial.statsDeedsLabel') },
            { num: "365", label: t('landing.editorial.statsStreakLabel'), color: "text-amber-400" },
          ].map((s, i) => (
            <div key={i} data-testid={`stat-item-${i}`}>
              <div className={`text-4xl md:text-5xl font-bold mb-2 ${s.color ?? 'text-white'}`} style={PLAYFAIR}>{s.num}</div>
              <div className="text-slate-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Decorative dot divider ── */}
      <div className="w-full h-12 opacity-10"
        style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* ── Quranic Quote ── */}
      <section className="py-24 px-6 md:px-12 relative overflow-hidden" data-testid="section-quran-quote">
        <div className="absolute right-0 top-1/2 w-[600px] h-[600px] -translate-y-1/2 translate-x-1/3 rounded-full blur-[120px]"
          style={{ background: 'rgba(6,78,59,0.08)' }} />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-8 h-8 border-t border-l" style={{ borderColor: 'rgba(217,119,6,0.5)' }} />
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b border-r" style={{ borderColor: 'rgba(217,119,6,0.5)' }} />
            <div className="p-10 md:p-12" style={{ background: '#0c141d', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-4xl md:text-5xl leading-[2] text-right text-emerald-100/90 mb-8" style={AMIRI}>
                فَاسْتَقِمْ كَمَا أُمِرْتَ وَمَنْ تَابَ مَعَكَ
              </p>
              <div className="w-12 h-px mb-6" style={{ background: 'rgba(217,119,6,0.5)' }} />
              <p className="italic text-slate-300 text-lg leading-relaxed" style={PLAYFAIR} data-testid="text-quran-quote-translation">
                "{t('landing.editorial.quoteTranslation')}"
              </p>
              <p className="text-sm text-slate-500 mt-4 uppercase tracking-widest" style={PLAYFAIR}>QS. Hud: 112</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl text-white mb-6 leading-tight" style={PLAYFAIR} data-testid="text-philosophy-title">
              {t('landing.editorial.philosophyTitle')}
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8 font-light" data-testid="text-philosophy-desc">
              {t('landing.editorial.philosophyDesc')}
            </p>
            <ul className="space-y-4">
              {[
                t('landing.editorial.philosophyPoint1'),
                t('landing.editorial.philosophyPoint2'),
                t('landing.editorial.philosophyPoint3'),
                t('landing.editorial.philosophyPoint4'),
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-300">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(6,78,59,0.2)' }}>
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Daily Rhythm ── */}
      <section className="py-24 px-6 md:px-12 relative" style={{ background: '#0c131a' }} data-testid="section-rhythm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl text-white mb-4" style={PLAYFAIR} data-testid="text-rhythm-title">
              {t('landing.editorial.rhythmTitle')}
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto" data-testid="text-rhythm-subtitle">
              {t('landing.editorial.rhythmSubtitle')}
            </p>
          </div>
          <div className="relative">
            <div className="absolute top-10 left-0 right-0 h-px hidden md:block"
              style={{ background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.3), transparent)' }} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              {rhythmItems.map(({ time, title, desc, Icon }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center group"
                  data-testid={`rhythm-item-${i}`}
                >
                  <div className="text-amber-500/80 italic mb-5 text-sm opacity-0 group-hover:opacity-100 transition-all -translate-y-1 group-hover:translate-y-0" style={PLAYFAIR}>
                    {time}
                  </div>
                  <div
                    className="w-16 h-16 flex items-center justify-center rotate-45 mb-6 transition-all duration-500 group-hover:scale-110"
                    style={{ background: '#0A0F16', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    <div className="-rotate-45">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="text-lg text-white mb-1 group-hover:text-emerald-300 transition-colors" style={PLAYFAIR}>{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-24 px-6 md:px-12" data-testid="section-features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-500 text-sm tracking-widest uppercase mb-3" data-testid="text-features-label">{t('landing.featuresLabel')}</p>
            <h2 className="text-3xl md:text-4xl text-white mb-4" style={PLAYFAIR} data-testid="text-features-title">{t('landing.featuresTitle')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-8" data-testid="text-features-subtitle">{t('landing.featuresSubtitle')}</p>
            <button
              onClick={() => setShowTour(true)}
              className="inline-flex items-center gap-3 px-6 py-3 text-sm border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              data-testid="button-take-tour-features"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Play className="w-3 h-3 ml-0.5" />
              </div>
              <span>{t('landing.tour.cta')}</span>
              <span className="text-slate-500 text-xs">{t('landing.tour.subtitle')}</span>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className={`p-6 text-left transition-colors group hover:border-opacity-40 ${f.border}`}
                style={{ background: '#0c141d', border: `1px solid rgba(255,255,255,0.06)` }}
                data-testid={`card-feature-${i}`}
              >
                <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2" style={PLAYFAIR} data-testid={`text-feature-title-${i}`}>{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed" data-testid={`text-feature-desc-${i}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-24 px-6 md:px-12 relative" style={{ background: '#0c131a', borderTop: '1px solid rgba(255,255,255,0.04)' }} data-testid="section-testimonial">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-amber-500/60 text-6xl leading-none block mb-2" style={AMIRI}>"</span>
          <p className="text-xl md:text-2xl font-light leading-relaxed mb-10 text-slate-200" style={PLAYFAIR} data-testid="text-testimonial-quote">
            {t('landing.testimonial.quote')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Avatar className="w-14 h-14" style={{ border: '2px solid rgba(16,185,129,0.3)' }} data-testid="img-testimonial-avatar">
              <AvatarImage src={testimonialAvatar} alt={t('landing.testimonial.name')} className="object-cover" />
              <AvatarFallback>YPE</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-semibold text-white" data-testid="text-testimonial-name">{t('landing.testimonial.name')}</p>
              <p className="text-sm text-slate-500" data-testid="text-testimonial-role">{t('landing.testimonial.role')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hadith Quote ── */}
      <section className="py-20 px-6 md:px-12" data-testid="section-hadith">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-px h-12 mx-auto mb-8" style={{ background: 'linear-gradient(to bottom, transparent, rgba(217,119,6,0.5))' }} />
          <p className="text-2xl md:text-3xl leading-[2] text-emerald-100/80 mb-6" style={AMIRI} data-testid="text-hadith-arabic">
            {t('landing.editorial.hadithArabic')}
          </p>
          <div className="w-8 h-px mx-auto mb-6" style={{ background: 'rgba(217,119,6,0.4)' }} />
          <p className="text-slate-400 italic leading-relaxed max-w-xl mx-auto" style={PLAYFAIR} data-testid="text-hadith-translation">
            "{t('landing.editorial.hadithTranslation')}"
          </p>
          <p className="text-xs text-slate-600 mt-4 uppercase tracking-widest" style={PLAYFAIR} data-testid="text-hadith-ref">
            {t('landing.editorial.hadithRef')}
          </p>
          <div className="w-px h-12 mx-auto mt-8" style={{ background: 'linear-gradient(to top, transparent, rgba(217,119,6,0.5))' }} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 md:px-12 relative text-center overflow-hidden" style={{ borderTop: '1px solid rgba(16,185,129,0.1)' }} data-testid="section-cta">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(6,78,59,0.18) 0%, transparent 60%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="text-4xl text-amber-500/80 mb-6 block" style={AMIRI} data-testid="text-cta-bismillah">
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم
          </span>
          <h2 className="text-4xl md:text-6xl text-white mb-8 leading-tight" style={PLAYFAIR} data-testid="text-cta-heading">
            {t('landing.cta.title')}
          </h2>
          <p className="text-slate-400 mb-10 text-lg" data-testid="text-cta-subtitle">
            {t('landing.cta.subtitle')}
          </p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-12 text-lg transition-all border border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.35)]"
            data-testid="button-cta-signup"
          >
            <SiGoogle className="w-5 h-5 shrink-0" />
            {t('landing.cta.button')}
          </button>
          <p className="mt-6 text-sm text-slate-600" data-testid="text-cta-note">
            {t('landing.cta.note')}
          </p>
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="mt-4 inline-flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              data-testid="button-download-app-bottom"
            >
              <Download className="w-4 h-4" />
              {t('landing.downloadApp')}
            </button>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 text-center text-sm text-slate-600" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex justify-center items-center gap-2 mb-4">
          <img src={istiqomaHorizontalLogoDark} alt="Istiqoma" className="h-7 w-auto opacity-60" />
        </div>
        <p data-testid="text-footer-copyright">© {new Date().getFullYear()} {t('app.name')}. {t('app.tagline')}</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="/privacy" className="hover:text-slate-400 transition-colors" data-testid="link-privacy-policy">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms" className="hover:text-slate-400 transition-colors" data-testid="link-terms-of-service">Terms of Service</a>
        </div>
      </footer>

      {/* ── Product Tour Overlay ── */}
      <AnimatePresence>
        {showTour && <ProductTour onClose={() => setShowTour(false)} />}
      </AnimatePresence>
    </div>
  );
}
