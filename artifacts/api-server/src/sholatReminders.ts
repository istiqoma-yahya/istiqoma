import { Coordinates, PrayerTimes, CalculationMethod, Prayer } from 'adhan';
import { toZonedTime } from 'date-fns-tz';
import { storage } from './storage';
import type { PushSubscription } from '@workspace/db';
import webpush from 'web-push';
import { getDisplayName, sholatReminderCopy } from './notificationCopy';
import { getAvatarUrl } from './avatarSelection';
import { sendApnsNotification, sendFcmNotification } from './nativePush';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'Subuh',
  dhuhr: 'Dzuhur',
  asr: 'Ashar',
  maghrib: 'Maghrib',
  isha: 'Isya',
};

const MINUTES_BEFORE = 10;

const sentSholatAlerts = new Map<string, number>();

function cleanupSentSholatAlerts(): void {
  const now = Date.now();
  for (const [key, timestamp] of sentSholatAlerts) {
    if (now - timestamp > 120000) {
      sentSholatAlerts.delete(key);
    }
  }
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'unknown';
  }
}

async function sendToSubscription(subscription: PushSubscription, payload: { title: string; body: string; url?: string; tag?: string; sound?: string }): Promise<boolean> {
  // ── Native: iOS (APNs) ──────────────────────────────────────────────────
  if (subscription.platform === 'ios') {
    if (!subscription.deviceToken) return false;
    const outcome = await sendApnsNotification(subscription.userId, subscription.deviceToken, {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      sound: payload.sound,
    });
    if (!outcome.ok && outcome.reason === 'expired') {
      await storage.deleteNativePushTokenByPlatform(subscription.userId, 'ios');
      console.warn(`[push] sholat APNs token expired — deleted ios row user=${subscription.userId}`);
    }
    return outcome.ok;
  }

  // ── Native: Android (FCM) ───────────────────────────────────────────────
  if (subscription.platform === 'android') {
    if (!subscription.deviceToken) return false;
    const outcome = await sendFcmNotification(subscription.userId, subscription.deviceToken, {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      sound: payload.sound,
    });
    if (!outcome.ok && outcome.reason === 'expired') {
      await storage.deleteNativePushTokenByPlatform(subscription.userId, 'android');
      console.warn(`[push] sholat FCM token expired — deleted android row user=${subscription.userId}`);
    }
    return outcome.ok;
  }

  // ── Web: VAPID ──────────────────────────────────────────────────────────
  if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const host = endpointHost(subscription.endpoint);
  try {
    const result = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(
      `[push] sholat delivered user=${subscription.userId} host=${host} status=${result.statusCode} tag=${payload.tag ?? 'none'}`
    );
    return true;
  } catch (error: any) {
    const status = error?.statusCode;
    const body = typeof error?.body === 'string' ? error.body.slice(0, 200) : undefined;
    console.error(
      `[push] sholat FAILED user=${subscription.userId} host=${host} status=${status ?? 'n/a'} tag=${payload.tag ?? 'none'} msg=${error?.message ?? 'unknown'}${body ? ` body=${body}` : ''}`
    );
    if (status === 410 || status === 404) {
      await storage.deletePushSubscription(subscription.userId);
      console.warn(
        `[push] sholat subscription gone — deleted web row user=${subscription.userId} host=${host}`
      );
    }
    return false;
  }
}

export async function sendSholatReminders(): Promise<void> {
  cleanupSentSholatAlerts();

  const subscriptions = await storage.getAllPushSubscriptions();
  const nowUtc = new Date();

  for (const subscription of subscriptions) {
    try {
      if (!subscription.sholatReminder) continue;
      if (subscription.latitude == null || subscription.longitude == null) continue;

      const lat = subscription.latitude;
      const lon = subscription.longitude;
      const userTimezone = subscription.timezone || 'Asia/Jakarta';

      let nowInUserTz: Date;
      try {
        nowInUserTz = toZonedTime(nowUtc, userTimezone);
      } catch {
        continue;
      }

      const coords = new Coordinates(lat, lon);
      const prayerTimes = new PrayerTimes(coords, nowInUserTz, CalculationMethod.MoonsightingCommittee());

      const prayers = [
        [Prayer.Fajr, 'fajr'],
        [Prayer.Dhuhr, 'dhuhr'],
        [Prayer.Asr, 'asr'],
        [Prayer.Maghrib, 'maghrib'],
        [Prayer.Isha, 'isha'],
      ] as [typeof Prayer[keyof typeof Prayer], string][];

      for (const [prayer, name] of prayers) {
        const prayerTime = prayerTimes.timeForPrayer(prayer);
        if (!prayerTime) continue;

        const reminderTime = new Date(prayerTime.getTime() - MINUTES_BEFORE * 60 * 1000);
        const diffMs = Math.abs(nowUtc.getTime() - reminderTime.getTime());
        if (diffMs > 60000) continue;

        const dedupKey = `${subscription.userId}-${name}-${prayerTime.toISOString()}`;
        if (sentSholatAlerts.has(dedupKey)) continue;
        sentSholatAlerts.set(dedupKey, Date.now());

        const displayName = await getDisplayName(subscription.userId);
        const prayerHours = String(prayerTime.getHours()).padStart(2, '0');
        const prayerMins = String(prayerTime.getMinutes()).padStart(2, '0');
        const { title, body } = sholatReminderCopy(subscription.userId, displayName, {
          prayerName: PRAYER_NAMES[name] ?? name,
          hours: prayerHours,
          minutes: prayerMins,
          minutesBefore: MINUTES_BEFORE,
        });

        let gender: string | null = null;
        try {
          const onboarding = await storage.getUserOnboarding(subscription.userId);
          gender = onboarding?.gender ?? null;
        } catch { /* ignore */ }

        const image = getAvatarUrl(subscription.userId, gender, 'neutral');

        await sendToSubscription(subscription, {
          title,
          body,
          url: '/sholat',
          tag: `sholat-${name}`,
          sound: subscription.notificationSound ?? 'chime',
          ...(image ? { image, icon: image } : {}),
        });
      }
    } catch (err) {
      console.error(`[push] sholat reminder error user=${subscription.userId}`, err);
    }
  }
}
