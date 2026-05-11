import webpush from 'web-push';
import { toZonedTime } from 'date-fns-tz';
import { storage } from './storage';
import type { PushSubscription } from '@shared/schema';
import { getDisplayName, dailyReminderCopy, targetReminderCopy } from './notificationCopy';
import { getAvatarUrl, type Emotion } from './avatarSelection';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@istiqoma.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  sound?: string;
  image?: string;
  icon?: string;
  emotion?: Emotion;
}

export type SendOutcome =
  | { ok: true; statusCode?: number }
  | { ok: false; reason: 'no_subscription' | 'expired' | 'push_service_error' | 'not_configured'; statusCode?: number; message?: string };

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'unknown';
  }
}

async function sendToSubscription(subscription: PushSubscription, payload: NotificationPayload): Promise<SendOutcome> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  const host = endpointHost(subscription.endpoint);
  try {
    const result = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(
      `[push] delivered user=${subscription.userId} host=${host} status=${result.statusCode} tag=${payload.tag ?? 'none'}`
    );
    return { ok: true, statusCode: result.statusCode };
  } catch (error: any) {
    const status = error?.statusCode;
    const body = typeof error?.body === 'string' ? error.body.slice(0, 200) : undefined;
    console.error(
      `[push] FAILED user=${subscription.userId} host=${host} status=${status ?? 'n/a'} tag=${payload.tag ?? 'none'} msg=${error?.message ?? 'unknown'}${body ? ` body=${body}` : ''}`
    );
    if (status === 410 || status === 404) {
      await storage.deletePushSubscription(subscription.userId);
      console.warn(
        `[push] subscription gone — deleted db row user=${subscription.userId} host=${host} (client must re-subscribe)`
      );
      return { ok: false, reason: 'expired', statusCode: status };
    }
    return { ok: false, reason: 'push_service_error', statusCode: status, message: error?.message };
  }
}

export async function sendNotificationToUser(userId: string, payload: NotificationPayload): Promise<SendOutcome> {
  if (!isPushConfigured()) {
    console.warn(`[push] not configured — VAPID keys missing, cannot send to user=${userId}`);
    return { ok: false, reason: 'not_configured' };
  }
  const subscription = await storage.getPushSubscription(userId);
  if (!subscription) {
    console.warn(`[push] no subscription on file for user=${userId}`);
    return { ok: false, reason: 'no_subscription' };
  }
  let enriched = payload;
  try {
    const onboarding = await storage.getUserOnboarding(userId);
    const gender = onboarding?.gender ?? null;
    // Respect emotion from caller; default to neutral when unspecified
    const emotion: Emotion = payload.emotion ?? 'neutral';
    const avatarUrl = getAvatarUrl(userId, gender, emotion);
    if (avatarUrl) {
      enriched = {
        ...payload,
        emotion,
        // Big hero image for Android/desktop Chrome (iOS ignores this).
        image: payload.image ?? avatarUrl,
        // Small icon — iOS Safari/PWA *does* render this, so the user
        // sees their avatar character on iPhone push notifications too.
        icon: payload.icon ?? avatarUrl,
      };
    }
  } catch (err) {
    console.warn(`sendNotificationToUser: avatar enrichment failed for ${userId}`, err);
  }
  return sendToSubscription(subscription, enriched);
}

export async function sendDailyReminders(): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions();
  const nowUtc = new Date();
  
  for (const subscription of subscriptions) {
    if (!subscription.dailyReminder) continue;
    
    const userTimezone = subscription.timezone || "Asia/Jakarta";
    let nowInUserTz: Date;
    try {
      nowInUserTz = toZonedTime(nowUtc, userTimezone);
    } catch {
      console.error(`sendDailyReminders: invalid timezone "${userTimezone}" for user ${subscription.userId}, skipping`);
      continue;
    }
    const currentHour = nowInUserTz.getHours();
    const currentMinute = nowInUserTz.getMinutes();
    
    const [reminderHour, reminderMinute] = subscription.reminderTime.split(':').map(Number);
    
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const reminderTotalMinutes = reminderHour * 60 + reminderMinute;
    
    if (Math.abs(currentTotalMinutes - reminderTotalMinutes) <= 1) {
      const name = await getDisplayName(subscription.userId);
      const { title, body } = dailyReminderCopy(subscription.userId, name);
      const onboarding = await storage.getUserOnboarding(subscription.userId);
      const gender = onboarding?.gender ?? null;
      // Check if the user has logged any deeds today (in their timezone)
      let emotion: Emotion = 'neutral';
      try {
        const allDeeds = await storage.getDeeds(subscription.userId);
        const todayStr = `${nowInUserTz.getFullYear()}-${String(nowInUserTz.getMonth() + 1).padStart(2, '0')}-${String(nowInUserTz.getDate()).padStart(2, '0')}`;
        const hasDeedToday = allDeeds.some((d) => {
          if (!d.createdAt) return false;
          const dInUserTz = toZonedTime(new Date(d.createdAt), userTimezone);
          const dStr = `${dInUserTz.getFullYear()}-${String(dInUserTz.getMonth() + 1).padStart(2, '0')}-${String(dInUserTz.getDate()).padStart(2, '0')}`;
          return dStr === todayStr;
        });
        emotion = hasDeedToday ? 'neutral' : 'sad';
      } catch {
        emotion = 'neutral';
      }
      const image = getAvatarUrl(subscription.userId, gender, emotion);
      await sendToSubscription(subscription, {
        title,
        body,
        url: '/',
        tag: 'daily-reminder',
        sound: subscription.notificationSound ?? 'chime',
        ...(image ? { image, icon: image, emotion } : {}),
      });
    }
  }
}

export async function sendTargetAlert(userId: string, targetName: string, message: string, emotion: Emotion = 'neutral'): Promise<boolean> {
  const subscription = await storage.getPushSubscription(userId);
  if (!subscription || !subscription.targetAlerts) {
    return false;
  }
  let image: string | undefined;
  try {
    const onboarding = await storage.getUserOnboarding(userId);
    const gender = onboarding?.gender ?? null;
    const url = getAvatarUrl(userId, gender, emotion);
    if (url) image = url;
  } catch (err) {
    console.warn(`sendTargetAlert: avatar enrichment failed for ${userId}`, err);
  }

  const outcome = await sendToSubscription(subscription, {
    title: `Target: ${targetName}`,
    body: message,
    url: '/targets',
    tag: 'target-alert',
    sound: subscription.notificationSound ?? 'chime',
    ...(image ? { image, icon: image, emotion } : {}),
  });
  return outcome.ok;
}

const sentTargetAlerts = new Map<string, number>();

function cleanupSentAlerts(): void {
  const now = Date.now();
  for (const [key, timestamp] of sentTargetAlerts) {
    if (now - timestamp > 120000) {
      sentTargetAlerts.delete(key);
    }
  }
}

export async function sendTargetReminders(): Promise<void> {
  cleanupSentAlerts();

  const subscriptions = await storage.getAllPushSubscriptions();
  const nowUtc = new Date();

  for (const subscription of subscriptions) {
    if (!subscription.targetAlerts) continue;

    const userTimezone = subscription.timezone || "Asia/Jakarta";
    let nowInUserTz: Date;
    try {
      nowInUserTz = toZonedTime(nowUtc, userTimezone);
    } catch {
      console.error(`sendTargetReminders: invalid timezone "${userTimezone}" for user ${subscription.userId}, skipping`);
      continue;
    }
    const currentHour = nowInUserTz.getHours();
    const currentMinute = nowInUserTz.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const todayStr = `${nowInUserTz.getFullYear()}-${String(nowInUserTz.getMonth() + 1).padStart(2, '0')}-${String(nowInUserTz.getDate()).padStart(2, '0')}`;

    const targetsWithProgress = await storage.getTargetsWithProgress(subscription.userId, userTimezone);
    let cachedName: string | null | undefined;

    for (const target of targetsWithProgress) {
      if (!target.isActive) continue;
      const times = target.notificationTimes;
      if (!times || times.length === 0) continue;

      for (const timeStr of times) {
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) continue;

        const reminderTotalMinutes = h * 60 + m;
        if (Math.abs(currentTotalMinutes - reminderTotalMinutes) > 1) continue;

        const dedupKey = `${subscription.userId}-${target.id}-${timeStr}-${todayStr}`;
        if (sentTargetAlerts.has(dedupKey)) continue;

        sentTargetAlerts.set(dedupKey, Date.now());

        const targetName = target.name || target.category;
        const progress = target.currentValue;
        const goal = target.targetValue;
        const percentComplete = target.percentComplete;

        if (cachedName === undefined) {
          cachedName = await getDisplayName(subscription.userId);
        }
        const { title, body } = targetReminderCopy(subscription.userId, cachedName, {
          targetName,
          progress,
          goal,
          percent: percentComplete,
          targetType: target.targetType,
        });

        // Emotion: glow if achieved, sad if limit exceeded or behind, neutral otherwise
        let emotion: Emotion = 'neutral';
        if (target.targetType === 'achievement' && percentComplete >= 100) {
          emotion = 'glow';
        } else if (target.targetType === 'limit' && percentComplete > 100) {
          emotion = 'sad';
        } else if (target.targetType === 'achievement' && percentComplete < 50) {
          emotion = 'sad';
        }

        let gender: string | null = null;
        try {
          const onboarding = await storage.getUserOnboarding(subscription.userId);
          gender = onboarding?.gender ?? null;
        } catch { /* ignore */ }

        const image = getAvatarUrl(subscription.userId, gender, emotion);

        await sendToSubscription(subscription, {
          title,
          body,
          url: `/targets/${target.id}`,
          tag: `target-reminder-${target.id}`,
          sound: subscription.notificationSound ?? 'chime',
          ...(image ? { image, icon: image, emotion } : {}),
        });
      }
    }
  }
}

export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
