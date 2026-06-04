import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import logogram from '@assets/Istiqoma_New_Logogram_-_Darkmode_1777804992399.png';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Logo appears
      setTimeout(() => setPhase(2), 2000), // Text appears
      setTimeout(() => setPhase(3), 5500), // Start exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-[10vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      <motion.img 
        src={logogram}
        alt="Istiqoma Logogram"
        className="w-[12vw] h-auto object-contain mb-[4vh]"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      
      <motion.h2
        className="text-[4vw] font-display font-medium text-white tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        Find your steady path.
      </motion.h2>
      
      <motion.p
        className="text-[2vw] font-body text-white/60 mt-[2vh]"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        A calm, supportive space for daily worship.
      </motion.p>
    </motion.div>
  );
}