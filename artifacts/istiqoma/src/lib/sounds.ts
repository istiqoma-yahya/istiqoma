export const NOTIFICATION_SOUNDS = [
  { id: "chime", labelKey: "notifications.sounds.chime" },
  { id: "double", labelKey: "notifications.sounds.double" },
  { id: "ding", labelKey: "notifications.sounds.ding" },
  { id: "none", labelKey: "notifications.sounds.none" },
] as const;

export type SoundId = typeof NOTIFICATION_SOUNDS[number]["id"];

let audioUnlocked = false;
const audioElements = new Map<string, HTMLAudioElement>();

const SOUND_URLS: Record<string, string> = {
  chime: "/sounds/chime.wav",
  double: "/sounds/double.wav",
  ding: "/sounds/ding.wav",
};

function getOrCreateAudio(soundId: string): HTMLAudioElement | null {
  const url = SOUND_URLS[soundId];
  if (!url) return null;

  let audio = audioElements.get(soundId);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = "auto";
    audioElements.set(soundId, audio);
  }
  return audio;
}

export async function playNotificationSound(soundId: string): Promise<void> {
  if (soundId === "none") return;

  try {
    const audio = getOrCreateAudio(soundId);
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = 1.0;
    await audio.play();
  } catch {
    try {
      const freshAudio = new Audio(SOUND_URLS[soundId]);
      freshAudio.volume = 1.0;
      await freshAudio.play();
    } catch {
      // Audio playback not available
    }
  }
}

export function unlockAudio(): void {
  if (audioUnlocked) return;

  try {
    const silentAudio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    silentAudio.volume = 0;
    silentAudio.play().then(() => {
      audioUnlocked = true;

      Object.keys(SOUND_URLS).forEach((id) => {
        getOrCreateAudio(id);
      });
    }).catch(() => {});
  } catch {
    // Audio not available
  }
}

export function setupAudioUnlock(): void {
  const events = ["touchstart", "touchend", "click", "keydown"];

  const handler = () => {
    unlockAudio();
    events.forEach((e) => document.removeEventListener(e, handler, true));
  };

  events.forEach((e) => document.addEventListener(e, handler, { capture: true, once: false, passive: true }));
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
