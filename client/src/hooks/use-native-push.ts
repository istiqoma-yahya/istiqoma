/**
 * useNativePush — registers the device for APNs / FCM push notifications
 * when the app is running inside a Capacitor native shell.
 *
 * Lifecycle:
 *  1. Requests push permission from the OS on first mount.
 *  2. On permission granted, calls PushNotifications.register().
 *  3. On registration success, POSTs the device token to
 *     POST /api/push/native-register so the scheduler can deliver
 *     reminders to this device.
 *  4. Adds a listener for pushNotificationActionPerformed so tapping
 *     a notification deep-links into the correct in-app page using
 *     the same `url` field the web service-worker already uses.
 *
 * The hook is a no-op on the web platform, so it is safe to call
 * unconditionally in App.tsx.
 *
 * Security: the device token is sent only to the app's own backend
 * over an authenticated session — it is never logged client-side.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { isNative, platform } from "@/lib/capacitor";
import { apiRequest } from "@/lib/queryClient";

export function useNativePush() {
  const [, navigate] = useLocation();
  // Guard: register only once per app session.
  const registered = useRef(false);

  useEffect(() => {
    if (!isNative) return;
    if (registered.current) return;

    const removers: Array<() => void> = [];

    async function init() {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Deep-link: notification tap → navigate to payload.url
      const tapHandle = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const url = action.notification.data?.url;
          if (typeof url === "string" && url.startsWith("/")) {
            navigate(url);
          }
        },
      );
      removers.push(() => tapHandle.remove());

      // Token registration → POST to backend
      const regHandle = await PushNotifications.addListener(
        "registration",
        async (token) => {
          try {
            await apiRequest("POST", "/api/push/native-register", {
              platform: platform as "ios" | "android",
              deviceToken: token.value,
            });
          } catch (err) {
            console.error("[native-push] token registration failed:", err);
          }
        },
      );
      removers.push(() => regHandle.remove());

      // Log registration errors (not actionable by the client, but useful for debugging)
      const errHandle = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          console.error("[native-push] registration error:", err);
        },
      );
      removers.push(() => errHandle.remove());

      // Ask the OS for permission, then register
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === "granted") {
        registered.current = true;
        await PushNotifications.register();
      } else {
        console.info("[native-push] permission not granted:", perm.receive);
      }
    }

    init().catch((err) => {
      console.error("[native-push] init failed:", err);
    });

    return () => {
      for (const remove of removers) {
        remove();
      }
    };
  }, [navigate]);
}
