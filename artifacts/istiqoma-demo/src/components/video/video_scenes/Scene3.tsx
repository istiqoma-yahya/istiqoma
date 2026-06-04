import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Card frame
      setTimeout(() => setPhase(2), 1500), // Item 1 checks
      setTimeout(() => setPhase(3), 2500), // Item 2 checks
      setTimeout(() => setPhase(4), 3500), // Item 3 checks
      setTimeout(() => setPhase(5), 5500), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const deeds = [
    { label: "Fajr Prayer", checked: phase >= 2 },
    { label: "Read 2 pages of Quran", checked: phase >= 3 },
    { label: "Morning Adhkar", checked: phase >= 4 }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h3
        className="text-[3vw] font-display text-white/90 mb-[6vh] text-center"
        initial={{ opacity: 0, filter: 'blur(5px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        Gentle progress, every day.
      </motion.h3>

      <motion.div 
        className="w-[30vw] bg-[#1E293B] border border-[#1E293B]/50 rounded-[2vw] p-[3vw] shadow-2xl relative"
        initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, rotateX: 0 } : { opacity: 0, scale: 0.9, rotateX: 10 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1000 }}
      >
        <h4 className="text-[1.5vw] font-display font-medium text-white mb-[2vw]">Today's Goals</h4>
        
        <div className="space-y-[1.5vw]">
          {deeds.map((deed, i) => (
            <motion.div 
              key={i}
              className="flex items-center gap-[1.5vw] p-[1vw] rounded-[1vw] bg-[#0F172A]/50 border border-white/5"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.8, delay: 0.8 + (i * 0.2) }}
            >
              <div className={`w-[2vw] h-[2vw] rounded-full border-2 flex items-center justify-center transition-colors duration-700 ${deed.checked ? 'bg-[#34D399] border-[#34D399]' : 'border-white/20'}`}>
                {deed.checked && (
                  <motion.svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="w-[1.2vw] h-[1.2vw] text-white"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </motion.svg>
                )}
              </div>
              <span className={`text-[1.2vw] font-body transition-colors duration-700 ${deed.checked ? 'text-white/40 line-through' : 'text-white/80'}`}>
                {deed.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}