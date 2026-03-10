export const NOTIFICATION_SOUNDS = [
  { id: "chime", labelKey: "notifications.sounds.chime" },
  { id: "double", labelKey: "notifications.sounds.double" },
  { id: "ding", labelKey: "notifications.sounds.ding" },
  { id: "none", labelKey: "notifications.sounds.none" },
] as const;

export type SoundId = typeof NOTIFICATION_SOUNDS[number]["id"];

function createBellNote(ctx: AudioContext, freq: number, startTime: number, decay: number, volume = 0.5): void {
  const harmonics = [
    { ratio: 1,    gain: 1.0,  decayMult: 1.0  },
    { ratio: 2,    gain: 0.5,  decayMult: 0.7  },
    { ratio: 3,    gain: 0.25, decayMult: 0.5  },
    { ratio: 4.2,  gain: 0.12, decayMult: 0.35 },
  ];

  const attackTime = 0.006;

  for (const h of harmonics) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq * h.ratio;

    const partialDecay = decay * h.decayMult;
    const peakGain = volume * h.gain;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attackTime + partialDecay);

    osc.start(startTime);
    osc.stop(startTime + attackTime + partialDecay + 0.05);
  }
}

export function playNotificationSound(soundId: string): void {
  if (soundId === "none") return;

  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    if (soundId === "chime") {
      createBellNote(ctx, 880, t, 1.4, 0.45);
    } else if (soundId === "double") {
      createBellNote(ctx, 659, t, 1.0, 0.4);
      createBellNote(ctx, 988, t + 0.28, 1.2, 0.4);
    } else if (soundId === "ding") {
      createBellNote(ctx, 554, t, 0.7, 0.35);
    }

    setTimeout(() => ctx.close(), 3000);
  } catch {
    // AudioContext not available
  }
}

export function registerNotificationSoundListener(): () => void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "PLAY_NOTIFICATION_SOUND") {
      playNotificationSound(event.data.sound ?? "chime");
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
