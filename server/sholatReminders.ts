import { Coordinates, PrayerTimes, CalculationMethod, Prayer } from 'adhan';
import { toZonedTime } from 'date-fns-tz';
import { storage } from './storage';
import type { PushSubscription } from '@shared/schema';
import webpush from 'web-push';
import { getDisplayName, sholatReminderCopy } from './notificationCopy';
import { getAvatarUrl } from './avatarSelection';

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
        `[push] sholat subscription gone — deleted db row user=${subscription.userId} host=${host}`
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
      const lng = subscription.longitude;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

      const userTimezone = subscription.timezone || 'Asia/Jakarta';
      const nowInUserTz = toZonedTime(nowUtc, userTimezone);

      const coordinates = new Coordinates(lat, lng);
      const params = CalculationMethod.MuslimWorldLeague();
      const prayerTimes = new PrayerTimes(coordinates, nowInUserTz, params);

      const prayers = [
        { key: 'fajr', time: prayerTimes.fajr },
        { key: 'dhuhr', time: prayerTimes.dhuhr },
        { key: 'asr', time: prayerTimes.asr },
        { key: 'maghrib', time: prayerTimes.maghrib },
        { key: 'isha', time: prayerTimes.isha },
      ];

      const todayStr = `${nowInUserTz.getFullYear()}-${String(nowInUserTz.getMonth() + 1).padStart(2, '0')}-${String(nowInUserTz.getDate()).padStart(2, '0')}`;
      let cachedName: string | null | undefined;

      for (const prayer of prayers) {
        const prayerTimeInUserTz = toZonedTime(prayer.time, userTimezone);
        const diffMs = prayerTimeInUserTz.getTime() - nowInUserTz.getTime();
        const diffMinutes = diffMs / 60000;

        if (diffMinutes >= (MINUTES_BEFORE - 1) && diffMinutes <= (MINUTES_BEFORE + 1)) {
          const dedupKey = `sholat-${subscription.userId}-${prayer.key}-${todayStr}`;
          if (sentSholatAlerts.has(dedupKey)) continue;

          sentSholatAlerts.set(dedupKey, Date.now());

          const prayerName = PRAYER_NAMES[prayer.key] || prayer.key;
          const hours = prayerTimeInUserTz.getHours().toString().padStart(2, '0');
          const minutes = prayerTimeInUserTz.getMinutes().toString().padStart(2, '0');

          if (cachedName === undefined) {
            cachedName = await getDisplayName(subscription.userId);
          }
          const { title, body } = sholatReminderCopy(subscription.userId, cachedName, {
            prayerName,
            hours,
            minutes,
            minutesBefore: MINUTES_BEFORE,
          });

          let gender: string | null = null;
          try {
            const onboarding = await storage.getUserOnboarding(subscription.userId);
            gender = onboarding?.gender ?? null;
          } catch (err) {
            console.warn(`sholatReminders: avatar enrichment failed for ${subscription.userId}`, err);
          }
          const image = getAvatarUrl(subscription.userId, gender, 'neutral');

          await sendToSubscription(subscription, {
            title,
            body,
            url: '/',
            tag: `sholat-${prayer.key}`,
            sound: subscription.notificationSound ?? 'chime',
            ...(image ? { image, emotion: 'neutral' } : {}),
          });
        }
      }
    } catch (error) {
      console.error(`Error processing sholat reminder for user ${subscription.userId}:`, error);
    }
  }
}
