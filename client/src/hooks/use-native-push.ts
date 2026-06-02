/**
 * useNativePush — registers the device for APNs / FCM push notifications
 * when the app is running inside a Capacitor native shell.
 *
 * Lifecycle:
 *  1. Requests push permission from the OS on first mount.
 *  2. On permission granted, calls PushNotifications.register().
 *  3. On registration, the OS fires a `registration` event with a device token.
 *     The handler saves the token and attempts POST /api/push/native-register.
 *  4. If the POST returns 401 (app launched before the user signed in), the
 *     token is kept in a ref. When auth state later becomes authenticated, a
 *     separate effect retries the POST with the saved token.
 *  5. Tapping a notification deep-links into the correct page via the `url`
 *     field in the notification data (same field the web service-worker uses).
 *
 * The hook is a no-op on the web platform — safe to call unconditionally from App.tsx.
 *
 * Security: device tokens are sent only to the app's own backend over an
 * authenticated session and are never logged client-side.
 */

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isNative, platform } from "@/lib/capacitor";
import { apiRequest } from "@/lib/queryClient";

export function useNativePush() {
  const [, navigate] = useLocation();

  // Whether OS listeners have been registered (one-shot for the session).
  const listenersRegistered = useRef(false);
  // Latest token received from the OS; kept so we can retry after sign-in.
  const pendingToken = useRef<string | null>(null);
  // True only after the backend POST returns 2xx.
  const postedSuccessfully = useRef(false);

  // Watch auth state so we can retry the backend POST after sign-in.
  const { data: authUser } = useQuery<{ id: string } | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30_000,
  });
  const isAuthenticated = !!authUser;

  // ── Step 1: Register OS listeners + request permission (once) ──────────────
  useEffect(() => {
    if (!isNative) return;
    if (listenersRegistered.current) return;
    listenersRegistered.current = true;

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

      // Token received from the OS → save and try to POST to the backend.
      // If the user isn't signed in yet, the POST will 401; we keep the token
      // and retry in the auth-state effect below.
      const regHandle = await PushNotifications.addListener(
        "registration",
        async (token) => {
          pendingToken.current = token.value;
          await postToken(token.value);
        },
      );
      removers.push(() => regHandle.remove());

      const errHandle = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          console.error("[native-push] registration error:", err);
        },
      );
      removers.push(() => errHandle.remove());

      // Ask the OS for permission, then register.
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === "granted") {
        await PushNotifications.register();
      } else {
        console.info("[native-push] permission not granted:", perm.receive);
      }
    }

    init().catch((err) => {
      console.error("[native-push] init failed:", err);
    });

    return () => {
      for (const remove of removers) remove();
    };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: Retry POST after sign-in if earlier attempt was 401 ────────────
  useEffect(() => {
    if (!isNative) return;
    if (!isAuthenticated) return;
    if (postedSuccessfully.current) return;
    const token = pendingToken.current;
    if (!token) return;

    // We have a token and the user just became authenticated — retry.
    postToken(token).catch(() => {});
  }, [isAuthenticated]);

  // ── Shared POST helper ───────────────────────────────────────────────────────
  async function postToken(token: string) {
    try {
      await apiRequest("POST", "/api/push/native-register", {
        platform: platform as "ios" | "android",
        deviceToken: token,
      });
      postedSuccessfully.current = true;
    } catch (err: any) {
      // 401 = not signed in yet — the auth-state effect will retry.
      // Any other error is worth surfacing.
      if (err?.status !== 401) {
        console.error("[native-push] token registration failed:", err);
      }
    }
  }
}
