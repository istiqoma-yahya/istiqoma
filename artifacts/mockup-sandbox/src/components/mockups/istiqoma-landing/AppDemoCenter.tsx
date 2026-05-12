import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Flame, 
  Target, 
  Activity, 
  ChevronRight, 
  CheckCircle2, 
  Trophy, 
  Moon, 
  Star, 
  ShieldCheck, 
  Zap,
  BookOpen
} from "lucide-react";

export function AppDemoCenter() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: `
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
            <span className="text-xl font-bold font-jakarta text-white">Istiqoma</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#fitur" className="hover:text-emerald-400 transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-emerald-400 transition-colors">Cara Kerja</a>
            <a href="#testimoni" className="hover:text-emerald-400 transition-colors">Testimoni</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:inline-flex text-slate-300 hover:text-white hover:bg-slate-800">
              Masuk
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              Mulai Gratis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left: Text */}
            <div className="max-w-xl relative z-10">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-6 px-3 py-1 text-xs font-medium uppercase tracking-wider">
                Aplikasi Habit Tracker Muslim #1
              </Badge>
              <h1 className="text-5xl md:text-6xl font-extrabold font-jakarta text-white leading-[1.1] mb-3">
                Bangun Amalan Harian <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Yang Konsisten</span>
              </h1>
              <div className="flex items-center gap-3 mb-6 text-sm text-slate-500">
                <span>EN: Build Consistent Daily Deeds</span>
                <span className="opacity-40">·</span>
                <span>MS: Bina Amalan Harian Yang Konsisten</span>
              </div>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Istiqoma membantu Anda mencatat amal ibadah harian, membangun streak yang konsisten, dan memantau progress spiritual Anda dalam satu aplikasi yang elegan.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white h-14 px-8 text-base font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  Download Sekarang <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 hover:text-emerald-400">
                  Lihat Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>100% Gratis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-950 flex items-center justify-center text-[10px]">👤</div>
                    ))}
                  </div>
                  <span>10k+ Users</span>
                </div>
              </div>
            </div>

            {/* Right: Mockup */}
            <div className="relative">
              {/* Glow effects */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 w-full max-w-[400px] mx-auto rounded-[3rem] border-[8px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden aspect-[9/19]">
                <img 
                  src="/__mockup/images/istiqoma-app-mockup.png" 
                  alt="Istiqoma App Interface" 
                  className="w-full h-full object-cover"
                />
                
                {/* Floating UI Elements over the mockup to make it feel alive */}
                <div className="absolute top-12 left-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 shadow-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Current Streak</p>
                    <p className="text-sm text-white font-bold">14 Hari Berturut-turut!</p>
                  </div>
                </div>

                <div className="absolute bottom-16 right-4 bg-slate-900/90 backdrop-blur border border-emerald-500/30 rounded-xl p-3 shadow-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Al-Mulk Selesai</p>
                    <p className="text-sm text-emerald-400 font-bold">+50 Points</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="cara-kerja" className="py-24 bg-slate-900">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-jakarta text-white mb-4">Cara Kerja Istiqoma</h2>
            <p className="text-slate-400">Tiga langkah sederhana untuk menjaga rutinitas ibadah Anda tetap on track.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Catat Amal Harian",
                desc: "Checklist sholat fardhu, tilawah Qur'an, dan sedekah dengan satu tap.",
                icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              },
              {
                step: "02",
                title: "Kumpulkan Poin",
                desc: "Dapatkan reward untuk setiap amal baik yang Anda kerjakan hari ini.",
                icon: <Zap className="w-6 h-6 text-yellow-400" />
              },
              {
                step: "03",
                title: "Bangun Streak",
                desc: "Jaga api streak tetap menyala. Fitur freeze tersedia untuk hari darurat.",
                icon: <Flame className="w-6 h-6 text-orange-400" />
              }
            ].map((item, i) => (
              <Card key={i} className="bg-slate-950 border-slate-800 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-8">
                  <div className="text-5xl font-black text-slate-800/50 absolute top-4 right-4 pointer-events-none select-none">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-6 relative z-10">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 relative z-10">{item.title}</h3>
                  <p className="text-slate-400 relative z-10">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section id="fitur" className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700">
                  <Activity className="w-8 h-8 text-emerald-400 mb-4" />
                  <h4 className="text-white font-bold mb-2">Tracker Sholat</h4>
                  <p className="text-sm text-slate-400">Pantau sholat fardhu dan sunnah Anda.</p>
                </div>
                <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700 translate-y-8">
                  <Trophy className="w-8 h-8 text-yellow-400 mb-4" />
                  <h4 className="text-white font-bold mb-2">Leaderboard</h4>
                  <p className="text-sm text-slate-400">Kompetisi positif dengan teman-teman.</p>
                </div>
                <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700">
                  <BookOpen className="w-8 h-8 text-blue-400 mb-4" />
                  <h4 className="text-white font-bold mb-2">Jurnal Qur'an</h4>
                  <p className="text-sm text-slate-400">Catat progress tilawah dan hafalan.</p>
                </div>
                <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700 translate-y-8">
                  <Target className="w-8 h-8 text-purple-400 mb-4" />
                  <h4 className="text-white font-bold mb-2">Target Kustom</h4>
                  <p className="text-sm text-slate-400">Buat target ibadah personal Anda.</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold font-jakarta text-white mb-6">
                Lebih dari sekadar catatan. Ini tentang konsistensi.
              </h2>
              <p className="text-lg text-slate-400 mb-8">
                Kami memahami bahwa menjaga keistiqomahan itu berat. Karena itu kami mendesain pengalaman yang tidak hanya mencatat, tapi juga memotivasi.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Pengingat waktu sholat yang bisa disesuaikan",
                  "Streak freeze untuk kondisi udzur syar'i",
                  "Widget layar depan (Home screen)",
                  "Statistik mendalam tentang progress bulanan"
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{text}</span>
                  </li>
                ))}
              </ul>
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">
                Lihat Semua Fitur
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-slate-900 to-emerald-950/20 border-t border-slate-800/50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-jakarta text-white mb-6">
            Siap untuk berubah?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Bergabunglah dengan ribuan muslim lainnya yang sudah merasakan manfaat dari pencatatan ibadah harian yang konsisten.
          </p>
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white h-14 px-10 text-lg font-semibold shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            Mulai Gratis Sekarang
          </Button>
          <p className="mt-6 text-sm text-slate-500">
            Tersedia untuk iOS dan Android (PWA)
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800 text-center text-slate-500 text-sm">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Moon className="w-5 h-5 text-emerald-500/50" />
            <span className="font-bold font-jakarta text-slate-400">Istiqoma</span>
          </div>
          <p>© {new Date().getFullYear()} Istiqoma App. Hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
