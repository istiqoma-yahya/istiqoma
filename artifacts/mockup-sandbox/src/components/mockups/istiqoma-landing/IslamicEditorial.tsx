import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Star, BookOpen, Heart, Activity, Check, ArrowRight } from "lucide-react";

export function IslamicEditorial() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F16] text-slate-200 min-w-[1280px] font-sans overflow-x-hidden">
      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: `
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-arabic { font-family: 'Amiri', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .pattern-divider {
          background-image: radial-gradient(#d97706 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.1;
        }
      `}} />

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-12 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif text-2xl text-white tracking-wide">Istiqoma</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium">
          <a href="#" className="hover:text-emerald-400 transition-colors">Filosofi</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Fitur</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Komunitas</a>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none px-6 h-10 border border-emerald-500/30 font-serif tracking-wide">
            Mulai Sekarang
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/islamic-hero.png" 
            alt="Islamic geometric background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F16]/50 via-[#0A0F16]/80 to-[#0A0F16]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F16] via-transparent to-[#0A0F16]"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-12 text-center flex flex-col items-center">
          <div className={`transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span className="text-amber-500 font-serif italic tracking-widest text-sm uppercase mb-6 block">Premium Spiritual Habit Tracker</span>
            <h1 className="text-6xl md:text-8xl font-serif text-white leading-tight mb-4">
              Bangun Amalan Harian <br/>
              <span className="text-emerald-400">Yang Konsisten</span>
            </h1>
            <div className="flex items-center justify-center gap-3 mb-4 text-sm text-slate-500">
              <span>EN: Build Consistent Daily Deeds</span>
              <span className="opacity-40">·</span>
              <span>MS: Bina Amalan Harian Yang Konsisten</span>
            </div>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mt-8 font-light leading-relaxed">
              Jejak langkah spiritualmu, dirawat dengan indah. Bangun kebiasaan baik, lacak ibadah, dan temukan ketenangan dalam konsistensi.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 px-10 rounded-none text-lg font-serif tracking-wide border border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] group transition-all">
                Mulai Perjalanan
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0A0F16] flex items-center justify-center text-xs">
                      {i === 4 ? '+50k' : <Star className="w-3 h-3 text-amber-500" />}
                    </div>
                  ))}
                </div>
                <span>Dipercaya oleh 50.000+ muslim</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="h-16 pattern-divider w-full"></div>

      {/* Trust & Qur'an Section */}
      <section className="py-32 px-12 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="max-w-6xl mx-auto flex gap-20 items-center">
          <div className="w-1/2">
            <div className="border border-emerald-900/30 bg-[#0c141d] p-12 relative">
              <div className="absolute -top-4 -left-4 w-8 h-8 border-t border-l border-amber-500/50"></div>
              <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b border-r border-amber-500/50"></div>
              
              <p className="font-arabic text-5xl leading-[1.8] text-right text-emerald-100/90 mb-8">
                فَاسْتَقِمْ كَمَا أُمِرْتَ وَمَنْ تَابَ مَعَكَ
              </p>
              <div className="w-12 h-[1px] bg-amber-500/50 mb-6"></div>
              <p className="font-serif italic text-slate-300 text-lg leading-relaxed">
                "Maka tetaplah kamu pada jalan yang benar, sebagaimana diperintahkan kepadamu dan (juga) orang yang telah taubat beserta kamu."
              </p>
              <p className="text-sm text-slate-500 mt-4 uppercase tracking-widest font-serif">QS. Hud: 112</p>
            </div>
          </div>
          <div className="w-1/2">
            <h2 className="text-4xl font-serif text-white mb-6">Bukan Sekadar Target, Melainkan Ketaatan.</h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8 font-light">
              Aplikasi produktivitas biasa tidak mengerti esensi ibadah. Istiqoma dirancang khusus dengan kelembutan visual dan struktur yang menghormati perjalanan spiritual seorang Muslim.
            </p>
            <ul className="space-y-4">
              {[
                "Lacak Sholat Wajib & Sunnah dengan anggun",
                "Jurnal tilawah Al-Qur'an harian",
                "Puasa sunnah dan catatan kebaikan",
                "Privasi terjaga, tanpa iklan mengganggu"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-300">
                  <div className="w-6 h-6 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-900/20">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rhythm Strip / Daily Journey */}
      <section className="py-32 px-12 bg-[#0c131a] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-serif text-white mb-4">Ritme Kebaikan Harian</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Sebuah harmoni ibadah dari fajar hingga malam.</p>
          </div>

          <div className="relative">
            {/* Horizontal Line */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-800/50 to-transparent -translate-y-1/2"></div>
            
            <div className="grid grid-cols-4 gap-8 relative z-10">
              {[
                { time: "Subuh", title: "Awal yang Suci", desc: "Sholat Subuh & Dzikir Pagi", icon: Moon },
                { time: "Dhuha", title: "Cahaya Rezeki", desc: "Sholat Dhuha & Tilawah", icon: Star },
                { time: "Siang", title: "Jeda Bermakna", desc: "Dzuhur & Sedekah", icon: Heart },
                { time: "Malam", title: "Muhasabah", desc: "Isya, Witir & Jurnal", icon: BookOpen }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                  <div className="text-amber-500/80 font-serif italic mb-6 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    {step.time}
                  </div>
                  <div className="w-20 h-20 bg-[#0A0F16] border border-emerald-800/50 flex items-center justify-center rotate-45 group-hover:border-amber-500/50 transition-colors duration-500 relative z-10 mb-8">
                    <div className="-rotate-45">
                      <step.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-serif text-white mb-2 group-hover:text-emerald-300 transition-colors">{step.title}</h3>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-12 relative text-center border-t border-emerald-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0A0F16] to-[#0A0F16]"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="font-arabic text-4xl text-amber-500/80 mb-6 block">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم</span>
          <h2 className="text-4xl md:text-6xl font-serif text-white mb-8 leading-tight">Mulai Perjalanan<br/>Istiqomahmu</h2>
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white h-16 px-12 rounded-none text-xl font-serif tracking-wide shadow-2xl shadow-emerald-900/50 border border-emerald-400/50">
            Daftar Gratis Sekarang
          </Button>
          <p className="mt-6 text-sm text-slate-500">Tersedia di iOS dan Android. Tanpa iklan.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/50 text-center text-slate-500 text-sm font-light">
        <div className="flex justify-center items-center gap-2 mb-4">
          <Moon className="w-4 h-4 text-emerald-600" />
          <span className="font-serif text-lg text-slate-300">Istiqoma</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Istiqoma. Dibuat dengan niat baik.</p>
      </footer>
    </div>
  );
}
