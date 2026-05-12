import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, ArrowRight, ShieldCheck, Target, Award, Users, Heart } from "lucide-react";

export function SocialProofLed() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: `
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .bg-hero-pattern {
          background-image: linear-gradient(to bottom, rgba(2, 6, 23, 0.8), rgba(2, 6, 23, 1)), url('/__mockup/images/istiqoma-hero-bg.png');
          background-size: cover;
          background-position: center;
        }
      `}} />

      <div className="font-jakarta">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-slate-950" />
              </div>
              <span className="text-xl font-bold tracking-tight">Istiqoma</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-slate-300 hover:text-white hidden md:inline-flex">
                Masuk
              </Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-full px-6">
                Mulai Gratis
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6 bg-hero-pattern relative min-h-[90vh] flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8 mt-12">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full text-sm font-medium">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Dipercaya oleh 10,000+ Muslim di Indonesia
              </span>
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-extbold tracking-tight text-white leading-[1.1]">
              Konsisten Beribadah, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                Satu Hari Sekali.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Bangun kebiasaan spiritual yang tahan lama. Lacak sholat, tilawah, dan puasa Anda dalam satu aplikasi yang didesain untuk menjaga keistiqomahan Anda.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="h-14 px-8 text-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-full w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
                Mulai Sekarang <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-sm text-slate-400 sm:hidden">100% Gratis selamanya</p>
            </div>
          </div>

          {/* Social Proof Shelf - Right below hero content */}
          <div className="max-w-6xl mx-auto w-full mt-24 relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-1 text-emerald-400 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-slate-300 font-medium">Rating 4.8/5 dari 2,300+ ulasan</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "Dulu sering bolong tahajud, semenjak pakai Istiqoma jadi malu sendiri kalau streak-nya putus. Sangat membantu!",
                  name: "Ahmad F.",
                  role: "Karyawan Swasta"
                },
                {
                  quote: "Fitur tracker tilawahnya juara. Bikin target khatam bulan ini jadi lebih terukur dan termotivasi karena ada leaderboard.",
                  name: "Sarah M.",
                  role: "Mahasiswi"
                },
                {
                  quote: "UI-nya dark mode bikin adem di mata pas buka hp sehabis sholat subuh. Simple, gak ribet, dan yang penting no ads.",
                  name: "Reza P.",
                  role: "Software Engineer"
                }
              ].map((testimonial, i) => (
                <Card key={i} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                      ))}
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed mb-6 italic">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                        <p className="text-xs text-slate-400">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Semua yang Anda butuhkan untuk Istiqomah</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Dirancang khusus untuk membantu Muslim membangun dan mempertahankan kebiasaan baik setiap harinya.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Streak Tracker</h3>
                <p className="text-slate-400 leading-relaxed">
                  Pantau konsistensi ibadah Anda. Jangan biarkan rantai kebaikan terputus. Visualisasi streak memotivasi Anda untuk terus berlanjut.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Poin & Leaderboard</h3>
                <p className="text-slate-400 leading-relaxed">
                  Berkompetisi dalam kebaikan (Fastabiqul Khairat). Kumpulkan poin dari setiap amal dan lihat posisi Anda di komunitas.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Komunitas Saling Support</h3>
                <p className="text-slate-400 leading-relaxed">
                  Tidak sendirian. Bergabung dengan ribuan Muslim lainnya yang memiliki tujuan sama: menjadi versi terbaik dari diri mereka.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-4xl font-bold text-white mb-6">Siap untuk mulai perjalanan Anda?</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Ribuan orang telah membuktikan bahwa mencatat ibadah membantu mereka lebih konsisten. Giliran Anda sekarang.
            </p>
            <Button size="lg" className="h-14 px-10 text-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-full transition-transform hover:scale-105 active:scale-95">
              Daftar Gratis Sekarang
            </Button>
            <p className="mt-6 text-sm text-slate-400">Tidak perlu kartu kredit. Langsung bisa dipakai.</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center border-t border-slate-800/50">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Istiqoma. Dibuat dengan <Heart className="w-3 h-3 inline text-emerald-500 mx-1" /> untuk Ummah.
          </p>
        </footer>
      </div>
    </div>
  );
}
