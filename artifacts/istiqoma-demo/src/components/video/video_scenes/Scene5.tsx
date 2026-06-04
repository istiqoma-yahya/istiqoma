import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import horizontalLogo from '@assets/Istiqoma_New_Horizontal_Logo_-_Darkmode_1777804992389.png';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Logo appears
      setTimeout(() => setPhase(2), 2000), // Tagline appears
      setTimeout(() => setPhase(3), 5000), // Exit / Loop reset
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-[10vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 1.5 } }}
      transition={{ duration: 2, ease: 'easeInOut' }}
    >
      <motion.img 
        src={horizontalLogo}
        alt="Istiqoma Logo"
        className="w-[25vw] h-auto object-contain mb-[6vh]"
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={phase >= 1 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 30, filter: 'blur(10px)' }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />
      
      <motion.p
        className="text-[2.2vw] font-display font-light text-[#34D399] tracking-widest uppercase"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        Steady steps. Lasting growth.
      </motion.p>
    </motion.div>
  );
}