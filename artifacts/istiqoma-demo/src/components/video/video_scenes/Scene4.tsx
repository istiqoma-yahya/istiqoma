import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Number begins to climb
      setTimeout(() => setPhase(2), 2000), // Text appears
      setTimeout(() => setPhase(3), 5500), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-[10vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      <motion.div
        className="flex items-center justify-center gap-[2vw] mb-[4vh]"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div 
          className="text-[#34D399] flex items-center gap-[1vw]"
        >
           <motion.svg className="w-[4vw] h-[4vw]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <motion.path 
               d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
               stroke="currentColor" 
               strokeWidth="2" 
               strokeLinecap="round" 
               strokeLinejoin="round"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               transition={{ duration: 1.5, ease: "easeInOut" }}
             />
           </motion.svg>
           <motion.span className="text-[8vw] font-display font-bold leading-none tracking-tighter">
             <Counter from={0} to={12} duration={2} />
           </motion.span>
        </motion.div>
        <span className="text-[3vw] font-display text-white/50 pt-[2vw]">Day Streak</span>
      </motion.div>
      
      <motion.p
        className="text-[2.5vw] font-body font-light text-white mt-[2vh]"
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        Small steps build lasting growth.
      </motion.p>
    </motion.div>
  );
}

// Simple counter component for the streak
function Counter({ from, to, duration }: { from: number, to: number, duration: number }) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let start = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(from + (to - from) * ease));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [from, to, duration]);

  return <>{count}</>;
}