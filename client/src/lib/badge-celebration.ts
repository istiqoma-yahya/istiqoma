import type { NewlyEarnedBadge } from "@shared/schema";

type Listener = (badges: NewlyEarnedBadge[]) => void;

const listeners = new Set<Listener>();

export function celebrateBadges(badges: NewlyEarnedBadge[] | undefined | null) {
  if (!Array.isArray(badges) || badges.length === 0) return;
  listeners.forEach((cb) => cb(badges));
}

export function subscribeBadgeCelebrations(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
