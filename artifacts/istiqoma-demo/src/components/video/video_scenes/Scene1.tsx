import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text in
      setTimeout(() => setPhase(2), 2500), // Next line
      setTimeout(() => setPhase(3), 4500), // Fade out
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-[10vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      {/* Scattered dots representing lonely days */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
      ))}

      <motion.p
        className="text-[3.5vw] font-display font-light text-white/80"
        style={{ fontFamily: 'var(--font-serif)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Building a daily habit is hard.
      </motion.p>
      
      <motion.p
        className="text-[2.5vw] font-body font-light text-white/50 mt-[2vh]"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Especially on your own.
      </motion.p>
    </motion.div>
  );
}