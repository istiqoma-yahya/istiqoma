export const NOTIFICATION_SOUNDS = [
  { id: "chime", labelKey: "notifications.sounds.chime" },
  { id: "double", labelKey: "notifications.sounds.double" },
  { id: "ding", labelKey: "notifications.sounds.ding" },
  { id: "none", labelKey: "notifications.sounds.none" },
] as const;

export type SoundId = typeof NOTIFICATION_SOUNDS[number]["id"];

function createBellTone(ctx: AudioContext, freq: number, startTime: number, duration: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + duration);

  gain.gain.setValueAtTime(0.4, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playNotificationSound(soundId: string): void {
  if (soundId === "none") return;

  try {
    const ctx = new AudioContext();

    if (soundId === "chime") {
      createBellTone(ctx, 880, ctx.currentTime, 0.8);
    } else if (soundId === "double") {
      createBellTone(ctx, 880, ctx.currentTime, 0.5);
      createBellTone(ctx, 1046, ctx.currentTime + 0.3, 0.6);
    } else if (soundId === "ding") {
      createBellTone(ctx, 660, ctx.currentTime, 0.5);
    }

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // AudioContext not available (e.g. server-side or restricted)
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
