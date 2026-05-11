import { pickIndex } from './notificationCopy';

export type Emotion = 'glow' | 'neutral' | 'sad';

const MALE_CHARS = ['muslim-1', 'muslim-2', 'muslim-3', 'muslim-4'] as const;
// muslimah-4 assets are pending delivery (tracked in follow-up task #243)
const FEMALE_CHARS = ['muslimah-1', 'muslimah-2', 'muslimah-3'] as const;
const ALL_CHARS = [...MALE_CHARS, ...FEMALE_CHARS] as const;

function getAppUrl(): string {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.REPLIT_DOMAINS) {
    const primary = process.env.REPLIT_DOMAINS.split(',')[0].trim();
    return `https://${primary}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return '';
}

export function getAvatarUrl(userId: string, gender: string | null | undefined, emotion: Emotion): string {
  const baseUrl = getAppUrl();
  if (!baseUrl) return '';

  let pool: readonly string[];
  if (gender === 'male') {
    pool = MALE_CHARS;
  } else if (gender === 'female') {
    pool = FEMALE_CHARS;
  } else {
    pool = ALL_CHARS;
  }

  const idx = pickIndex(userId, 'avatar-char', pool.length);
  const character = pool[idx];
  return `${baseUrl}/avatars/${character}-${emotion}.png`;
}
