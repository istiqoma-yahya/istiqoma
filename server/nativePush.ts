/**
 * Native push notification dispatch — APNs (iOS) and FCM HTTP v1 (Android).
 *
 * Both senders are no-ops when the required environment variables are absent,
 * so the server starts cleanly in environments without credentials (Replit dev,
 * CI). Configure the secrets documented in mobile/BUILD.md for production use.
 *
 * Security note: device tokens are NEVER written to response logs (threat-model
 * constraint). They only appear in [native-push] console lines at debug level.
 *
 * APNs required env vars:
 *   APNS_KEY_ID        — 10-char key ID from Apple Developer portal
 *   APNS_TEAM_ID       — 10-char Team ID from Apple Developer portal
 *   APNS_BUNDLE_ID     — app bundle ID (default: com.istiqoma.app)
 *   APNS_KEY_P8        — contents of the .p8 Authentication Key file (PEM)
 *   APNS_ENV           — "production" (default) | "sandbox"
 *
 * FCM HTTP v1 required env var:
 *   FCM_SERVICE_ACCOUNT_JSON — JSON string of the Firebase service account key
 *                              (download from Firebase Console → Project Settings
 *                              → Service Accounts → Generate new private key)
 */

import { createSign } from "node:crypto";
import http2 from "node:http2";
import type { NotificationPayload, SendOutcome } from "./pushNotifications";

// ─── APNs ─────────────────────────────────────────────────────────────────────

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID ?? "com.istiqoma.app";
const APNS_KEY_P8 = process.env.APNS_KEY_P8; // PEM contents of the .p8 file
const APNS_PRODUCTION = process.env.APNS_ENV !== "sandbox";

const APNS_HOST = APNS_PRODUCTION
  ? "api.push.apple.com"
  : "api.development.push.apple.com";

export function isApnsConfigured(): boolean {
  return !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_KEY_P8);
}

// APNs provider tokens are valid for up to 1 hour. We cache one for 55 minutes.
let _apnsToken: string | null = null;
let _apnsTokenAt = 0;

function getApnsJwt(): string {
  const now = Date.now();
  if (_apnsToken && now - _apnsTokenAt < 55 * 60 * 1000) return _apnsToken;

  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(now / 1000) }),
  ).toString("base64url");
  const data = `${header}.${payload}`;

  const sign = createSign("SHA256");
  sign.update(data);
  // APNS_KEY_P8 is an EC (P-256) private key in PEM / PKCS#8 format.
  const sig = sign.sign(APNS_KEY_P8!, "base64url");

  _apnsToken = `${data}.${sig}`;
  _apnsTokenAt = now;
  return _apnsToken;
}

// Reuse a single HTTP/2 session per process to match Apple's recommended approach.
let _apnsSession: http2.ClientHttp2Session | null = null;

function getApnsSession(): http2.ClientHttp2Session {
  if (_apnsSession && !_apnsSession.closed && !_apnsSession.destroyed) {
    return _apnsSession;
  }
  _apnsSession = http2.connect(`https://${APNS_HOST}`);
  _apnsSession.on("error", () => {
    _apnsSession = null;
  });
  _apnsSession.on("close", () => {
    _apnsSession = null;
  });
  return _apnsSession;
}

export async function sendApnsNotification(
  userId: string,
  deviceToken: string,
  payload: NotificationPayload,
): Promise<SendOutcome> {
  if (!isApnsConfigured()) {
    console.warn("[native-push] APNs not configured — skipping iOS push");
    return { ok: false, reason: "not_configured" };
  }

  const apsBody = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      "thread-id": payload.tag ?? "general",
    },
    // Custom data used by the Capacitor listener for deep-linking.
    url: payload.url ?? "/",
    tag: payload.tag ?? "",
  });

  return new Promise<SendOutcome>((resolve) => {
    try {
      const session = getApnsSession();
      const req = session.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        ":scheme": "https",
        ":authority": APNS_HOST,
        authorization: `bearer ${getApnsJwt()}`,
        "apns-push-type": "alert",
        "apns-topic": APNS_BUNDLE_ID,
        "apns-expiration": "0",
        "apns-priority": "10",
        "content-type": "application/json",
      });

      req.setEncoding("utf8");
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("response", (headers) => {
        const status = headers[":status"] as number;
        req.on("end", () => {
          if (status === 200) {
            console.log(`[native-push] APNs delivered user=${userId} tag=${payload.tag ?? "none"}`);
            resolve({ ok: true, statusCode: status });
          } else {
            let reason = "push_service_error";
            try {
              const parsed = JSON.parse(body);
              reason = parsed.reason ?? reason;
            } catch {}
            console.error(
              `[native-push] APNs FAILED user=${userId} status=${status} reason=${reason}`,
            );
            // BadDeviceToken / Unregistered → remove the token
            if (status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") {
              resolve({ ok: false, reason: "expired", statusCode: status });
            } else {
              resolve({ ok: false, reason: "push_service_error", statusCode: status });
            }
          }
        });
      });
      req.on("error", (err) => {
        console.error(`[native-push] APNs request error user=${userId}`, err);
        resolve({ ok: false, reason: "push_service_error" });
      });

      req.write(apsBody);
      req.end();
    } catch (err) {
      console.error(`[native-push] APNs send threw user=${userId}`, err);
      resolve({ ok: false, reason: "push_service_error" });
    }
  });
}

// ─── FCM HTTP v1 ──────────────────────────────────────────────────────────────

export function isFcmConfigured(): boolean {
  return !!process.env.FCM_SERVICE_ACCOUNT_JSON;
}

// Cache the Google access token; it expires in 1 hour.
let _fcmAccessToken: string | null = null;
let _fcmAccessTokenExpiry = 0;

async function getGoogleAccessToken(): Promise<string> {
  if (_fcmAccessToken && Date.now() < _fcmAccessTokenExpiry) {
    return _fcmAccessToken;
  }

  const sa = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON!);
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    }),
  ).toString("base64url");

  const toSign = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(toSign);
  const sig = sign.sign(sa.private_key, "base64url");
  const jwt = `${toSign}.${sig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`FCM token exchange failed: ${resp.status} ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number };
  _fcmAccessToken = data.access_token;
  // Expire 60s before actual expiry to avoid edge-case races
  _fcmAccessTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _fcmAccessToken;
}

export async function sendFcmNotification(
  userId: string,
  deviceToken: string,
  payload: NotificationPayload,
): Promise<SendOutcome> {
  if (!isFcmConfigured()) {
    console.warn("[native-push] FCM not configured — skipping Android push");
    return { ok: false, reason: "not_configured" };
  }

  let sa: { project_id: string };
  try {
    sa = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON!);
  } catch {
    console.error("[native-push] FCM_SERVICE_ACCOUNT_JSON is not valid JSON");
    return { ok: false, reason: "not_configured" };
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (err) {
    console.error("[native-push] FCM access-token fetch failed", err);
    return { ok: false, reason: "push_service_error" };
  }

  const fcmPayload = {
    message: {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      // Custom data for the Capacitor listener (deep-link + sound).
      data: {
        url: payload.url ?? "/",
        tag: payload.tag ?? "",
        sound: payload.sound ?? "chime",
      },
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channel_id: "reminders",
        },
      },
    },
  };

  try {
    const resp = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload),
      },
    );

    const body = await resp.json() as Record<string, unknown>;

    if (resp.ok) {
      console.log(`[native-push] FCM delivered user=${userId} tag=${payload.tag ?? "none"}`);
      return { ok: true, statusCode: resp.status };
    }

    const errCode = (body?.error as Record<string,unknown>)?.status as string | undefined;
    console.error(
      `[native-push] FCM FAILED user=${userId} status=${resp.status} code=${errCode ?? "unknown"}`,
    );
    // UNREGISTERED / INVALID_ARGUMENT with bad token → remove
    if (resp.status === 404 || errCode === "UNREGISTERED") {
      return { ok: false, reason: "expired", statusCode: resp.status };
    }
    return { ok: false, reason: "push_service_error", statusCode: resp.status };
  } catch (err) {
    console.error(`[native-push] FCM send threw user=${userId}`, err);
    return { ok: false, reason: "push_service_error" };
  }
}
