import webpush from 'web-push';
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
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0');
  const currentMinute = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${currentHour}:${currentMinute}`;
  
  for (const subscription of subscriptions) {
    if (!subscription.dailyReminder) continue;
    
    const [reminderHour, reminderMinute] = subscription.reminderTime.split(':');
    const reminderTime = `${reminderHour}:${reminderMinute}`;
    
    if (Math.abs(parseInt(currentHour) * 60 + parseInt(currentMinute) - parseInt(reminderHour) * 60 - parseInt(reminderMinute)) <= 1) {
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

export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
