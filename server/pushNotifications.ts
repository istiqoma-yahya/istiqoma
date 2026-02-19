import webpush from 'web-push';
import { toZonedTime } from 'date-fns-tz';
import { storage } from './storage';
import type { PushSubscription } from '@shared/schema';

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
}

async function sendToSubscription(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error: any) {
    console.error('Failed to send push notification:', error);
    if (error.statusCode === 410 || error.statusCode === 404) {
      await storage.deletePushSubscription(subscription.userId);
    }
    return false;
  }
}

export async function sendNotificationToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
  const subscription = await storage.getPushSubscription(userId);
  if (!subscription) {
    return false;
  }
  return sendToSubscription(subscription, payload);
}

export async function sendDailyReminders(): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions();
  const nowUtc = new Date();
  
  for (const subscription of subscriptions) {
    if (!subscription.dailyReminder) continue;
    
    const userTimezone = subscription.timezone || "Asia/Jakarta";
    const nowInUserTz = toZonedTime(nowUtc, userTimezone);
    const currentHour = nowInUserTz.getHours();
    const currentMinute = nowInUserTz.getMinutes();
    
    const [reminderHour, reminderMinute] = subscription.reminderTime.split(':').map(Number);
    
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const reminderTotalMinutes = reminderHour * 60 + reminderMinute;
    
    if (Math.abs(currentTotalMinutes - reminderTotalMinutes) <= 1) {
      await sendToSubscription(subscription, {
        title: 'Istiqoma Daily Reminder',
        body: 'Time to log your deeds for today!',
        url: '/',
        tag: 'daily-reminder'
      });
    }
  }
}

export async function sendTargetAlert(userId: string, targetName: string, message: string): Promise<boolean> {
  const subscription = await storage.getPushSubscription(userId);
  if (!subscription || !subscription.targetAlerts) {
    return false;
  }
  
  return sendToSubscription(subscription, {
    title: `Target: ${targetName}`,
    body: message,
    url: '/targets',
    tag: 'target-alert'
  });
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
    const nowInUserTz = toZonedTime(nowUtc, userTimezone);
    const currentHour = nowInUserTz.getHours();
    const currentMinute = nowInUserTz.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const todayStr = `${nowInUserTz.getFullYear()}-${String(nowInUserTz.getMonth() + 1).padStart(2, '0')}-${String(nowInUserTz.getDate()).padStart(2, '0')}`;

    const targetsWithProgress = await storage.getTargetsWithProgress(subscription.userId);

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

        let body: string;
        if (target.targetType === "limit") {
          body = `${targetName}: ${progress}/${goal} used. ${percentComplete <= 100 ? 'Within limit.' : 'Limit exceeded!'}`;
        } else if (percentComplete >= 100) {
          body = `${targetName}: Target achieved! ${progress}/${goal}. MasyaAllah!`;
        } else {
          body = `${targetName}: ${progress}/${goal} (${percentComplete}%). Keep going!`;
        }

        await sendToSubscription(subscription, {
          title: 'Target Reminder',
          body,
          url: `/targets/${target.id}`,
          tag: `target-reminder-${target.id}`,
        });
      }
    }
  }
}

export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
