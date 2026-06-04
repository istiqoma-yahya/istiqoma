import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  hook: 6000,
  turn: 7000,
  product: 7000,
  growth: 7000,
  closing: 7000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1,
  turn: Scene2,
  product: Scene3,
  growth: Scene4,
  closing: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Math.max(0, Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey));
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] font-body">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/islamic_pattern.png)` }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 bg-cover bg-center mix-blend-lighten"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/night_sky.png)` }}
          animate={{
            opacity: sceneIndex >= 3 ? 0.4 : 0.1,
            scale: sceneIndex >= 3 ? 1.05 : 1
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 1) 100%)',
              'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.15) 0%, rgba(15, 23, 42, 1) 100%)',
              'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.1) 0%, rgba(15, 23, 42, 1) 100%)',
              'radial-gradient(circle at 50% 100%, rgba(52, 211, 153, 0.2) 0%, rgba(15, 23, 42, 1) 100%)',
              'radial-gradient(circle at 50% 100%, rgba(252, 211, 77, 0.15) 0%, rgba(52, 211, 153, 0.1) 40%, rgba(15, 23, 42, 1) 100%)',
            ][sceneIndex]
          }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Persistent Winding Path / Arch Motif */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-40">
         <motion.svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
           {/* Arc */}
           <motion.path
             d="M 660,1080 L 660,400 Q 960,100 1260,400 L 1260,1080"
             fill="none"
             stroke="rgba(248, 250, 252, 0.05)"
             strokeWidth="2"
             animate={{
               strokeDasharray: sceneIndex >= 1 ? '10000 10000' : '0 10000',
               strokeDashoffset: sceneIndex >= 1 ? 0 : 10000,
             }}
             transition={{ duration: 3, ease: 'easeInOut' }}
           />
           {/* Central Winding Path */}
           <motion.path
             d="M 960,1080 Q 860,800 960,600 Q 1060,400 960,200"
             fill="none"
             stroke="#34D399"
             strokeWidth={sceneIndex >= 3 ? 4 : 2}
             initial={{ strokeDasharray: '20 40', strokeDashoffset: 1000, opacity: 0.1 }}
             animate={{
                strokeDasharray: sceneIndex === 0 ? '10 30' : (sceneIndex >= 3 ? '10000 10000' : '100 100'),
                strokeDashoffset: sceneIndex === 0 ? [1000, 0] : 0,
                opacity: sceneIndex === 0 ? [0.1, 0.3, 0.1] : (sceneIndex >= 3 ? 0.8 : 0.4),
             }}
             transition={{
                duration: sceneIndex === 0 ? 6 : 2,
                repeat: sceneIndex === 0 ? Infinity : 0,
                ease: "linear"
             }}
           />
         </motion.svg>
      </div>

      {/* Foreground Scenes */}
      <div className="relative z-20 w-full h-full">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
