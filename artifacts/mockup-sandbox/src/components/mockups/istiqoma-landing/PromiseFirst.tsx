import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, CalendarHeart, Users, ChevronRight, Activity, ShieldCheck } from "lucide-react";

export function PromiseFirst() {
  return (
    <div className="min-h-screen bg-[#0a0f18] text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-100 overflow-x-hidden">
      {/* Fonts via link tag to keep self-contained */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet" />
      
      <style>{`
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* Sticky Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f18]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight">Istiqoma</span>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 py-6 font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            Mulai Sekarang
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="relative min-h-[90vh] flex items-center pt-20">
          {/* Background Image / Gradient */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f18]/90 via-[#0a0f18]/60 to-[#0a0f18] z-10" />
            <img 
              src="/__mockup/images/hero-islamic-pattern.png" 
              alt="Islamic Pattern Background" 
              className="w-full h-full object-cover opacity-30 mix-blend-overlay"
            />
            {/* Ambient glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] z-10 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[150px] z-10 pointer-events-none" />
          </div>

          <div className="container relative z-20 mx-auto px-6 max-w-7xl flex flex-col items-center text-center mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-300">Bergabung dengan 50.000+ Muslim lainnya</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-semibold leading-[1.1] tracking-tight mb-8 max-w-5xl">
              Bangun Amalan Harian <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Yang Konsisten</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-12 leading-relaxed font-light">
              Lacak ibadah, tilawah, dan kebaikan harian Anda dalam satu aplikasi. Bangun kebiasaan spiritual yang istiqomah dan raih keberkahan setiap hari.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-10 py-8 text-lg font-bold shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] group">
                Mulai Gratis Sekarang
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Tanpa kartu kredit. 100% Gratis.
              </span>
            </div>

            {/* Trust Bar */}
            <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-24 w-full border-t border-white/5 pt-16">
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-white mb-2">50K+</div>
                <div className="text-slate-400 font-medium">Pengguna Aktif</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-white mb-2">1.2M</div>
                <div className="text-slate-400 font-medium">Amalan Tercatat</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-emerald-400 mb-2">365</div>
                <div className="text-slate-400 font-medium">Rekor Streak Hari</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-[#0a0f18] relative z-20">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl font-display font-semibold mb-6">Segala Kebutuhan Ibadah Anda</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">Dirancang khusus untuk membantu Anda menjaga rutinitas ibadah harian tanpa merasa terbebani.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="bg-[#111827]/50 border-white/5 hover:border-emerald-500/30 transition-colors backdrop-blur-sm group">
                <CardContent className="p-10">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:bg-emerald-500/20 transition-colors">
                    <CalendarHeart className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">Lacak Sholat & Puasa</h3>
                  <p className="text-slate-400 leading-relaxed text-lg">Catat ibadah wajib dan sunnah Anda dengan mudah. Pantau persentase kelengkapan ibadah harian Anda secara real-time.</p>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="bg-[#111827]/50 border-white/5 hover:border-emerald-500/30 transition-colors backdrop-blur-sm group">
                <CardContent className="p-10">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:bg-emerald-500/20 transition-colors">
                    <BookOpen className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">Target Tilawah Harian</h3>
                  <p className="text-slate-400 leading-relaxed text-lg">Tetapkan target bacaan Al-Qur'an harian. Istiqoma akan mengingatkan dan mencatat sejauh mana progres tilawah Anda.</p>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="bg-[#111827]/50 border-white/5 hover:border-emerald-500/30 transition-colors backdrop-blur-sm group">
                <CardContent className="p-10">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:bg-emerald-500/20 transition-colors">
                    <Users className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">Papan Peringkat</h3>
                  <p className="text-slate-400 leading-relaxed text-lg">Berlomba-lombalah dalam kebaikan. Kumpulkan poin dari setiap amalan dan berkompetisi secara sehat dengan pengguna lain.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA Band */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-900/20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-display font-semibold mb-8">Siap Membangun Kebiasaan Baik?</h2>
            <p className="text-xl text-emerald-100/70 mb-12">Mulailah perjalanan spiritual Anda hari ini. Unduh Istiqoma dan bergabung dengan ribuan Muslim lainnya.</p>
            <Button className="bg-white hover:bg-emerald-50 text-emerald-900 rounded-full px-12 py-8 text-xl font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20 group">
              Unduh Istiqoma Sekarang
              <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </section>

        {/* Simple Footer */}
        <footer className="border-t border-white/5 py-12 bg-[#0a0f18] relative z-20">
          <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-lg">Istiqoma</span>
            </div>
            <div className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Istiqoma App. Hak cipta dilindungi.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
