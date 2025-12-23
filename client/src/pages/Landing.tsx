import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <span className="font-display font-bold text-2xl">D</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">DeedTracker</span>
        </div>
        <button 
          onClick={handleLogin}
          className="btn-secondary text-sm px-5 py-2.5"
        >
          Login
        </button>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              Master Your Soul,<br />Track Your Deeds.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              A spiritual companion for the modern Muslim. Monitor your daily actions, visualize your progress, and strive for excellence in character.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleLogin}
                className="btn-primary w-full sm:w-auto text-lg px-8 py-4 flex items-center justify-center gap-2 group"
              >
                Start Tracking Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Feature Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mt-20"
          >
            {[
              {
                icon: CheckCircle2,
                title: "Track Easily",
                desc: "Record your good and bad deeds instantly with a simple, intuitive interface.",
                color: "text-emerald-600 dark:text-emerald-400"
              },
              {
                icon: TrendingUp,
                title: "Visualize Growth",
                desc: "See your spiritual progress over time with beautiful charts and summaries.",
                color: "text-blue-600 dark:text-blue-400"
              },
              {
                icon: ShieldCheck,
                title: "Private & Secure",
                desc: "Your data is yours alone. Securely authenticated and stored privately.",
                color: "text-purple-600 dark:text-purple-400"
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card p-6 text-left hover:border-primary/20 transition-colors">
                <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                <h3 className="text-lg font-bold font-display mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} DeedTracker. Built for the Ummah.</p>
      </footer>
    </div>
  );
}
