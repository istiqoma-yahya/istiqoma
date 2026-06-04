// Quran Foundation Content API integration.
//
// The QF Content API is the official, hackathon-required source of Qur'an
// content (chapters, verses, recitations, audio, translations). It uses
// OAuth2 Client Credentials with the `content` scope. The token is
// short-lived; we cache it in-process and re-request on expiry or 401.
//
// We expose a thin Express proxy at `/api/qf/content/*` that forwards
// `GET` requests to `${API_BASE}/content/api/v4/*`, attaching the
// required `x-auth-token` and `x-client-id` headers. This keeps the
// client_secret server-side and means the browser never sees QF
// credentials.
//
// Fallback: if QF_CONTENT_CLIENT_ID / QF_CONTENT_CLIENT_SECRET are not
// configured, the proxy falls through to the public quran.com v4 API
// (same path shape) so local development without QF credentials still
// works. Production is expected to have the secrets set.
//
// Docs: https://api-docs.quran.foundation/docs/quickstart/manual-authentication
import type { Express, Request, Response as ExpressResponse } from "express";

// QF_CONTENT_ENV lets the content API use a different environment than the
// user API. If not set, falls back to QF_ENV (default: "production").
// Set QF_CONTENT_ENV=production + QF_ENV=prelive to get full Qur'an content
// from production while running user/bookmark auth against prelive.
const QF_CONTENT_ENV = (
  process.env.QF_CONTENT_ENV || process.env.QF_ENV || "production"
).toLowerCase();
const IS_PRELIVE = QF_CONTENT_ENV === "prelive" || QF_CONTENT_ENV === "dev" || QF_CONTENT_ENV === "development";

const AUTH_BASE = IS_PRELIVE
  ? "https://prelive-oauth2.quran.foundation"
  : "https://oauth2.quran.foundation";

const API_BASE = IS_PRELIVE
  ? "https://apis-prelive.quran.foundation"
  : "https://apis.quran.foundation";

const FALLBACK_BASE = "https://api.quran.com";

const CLIENT_ID = process.env.QF_CONTENT_CLIENT_ID || "";
const CLIENT_SECRET = process.env.QF_CONTENT_CLIENT_SECRET || "";

export function isQfContentConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;
let inFlight: Promise<string> | null = null;

async function fetchToken(): Promise<string> {
  if (!isQfContentConfigured()) {
    throw new Error("QF Content API credentials are not configured");
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=content",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`QF token request failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  // Refresh 60s before actual expiry to avoid edge-case 401s.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (expiresIn - 60) * 1000 };
  return data.access_token;
}

export async function getQfContentToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  if (inFlight) return inFlight;
  inFlight = fetchToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function clearCachedToken() {
  cachedToken = null;
}

// Allow only the v4 endpoints the app actually uses. This also prevents
// the proxy from being used as an open relay to arbitrary upstream paths.
const ALLOWED_PATH_RE =
  /^\/(chapters|chapters\/\d+|verses\/by_chapter\/\d+|resources\/recitations|resources\/translations|chapter_recitations\/\d+\/\d+|recitations\/\d+\/by_chapter\/\d+)$/;

async function proxyGet(targetPath: string, query: string): Promise<globalThis.Response> {
  const qs = query ? `?${query}` : "";
  if (isQfContentConfigured()) {
    try {
      let token = await getQfContentToken();
      let upstream = await fetch(`${API_BASE}/content/api/v4${targetPath}${qs}`, {
        headers: {
          "x-auth-token": token,
          "x-client-id": CLIENT_ID,
        },
      });
      if (upstream.status === 401) {
        // Token may have expired between the cache check and the call.
        // Per QF docs: clear cache, re-request once, retry once.
        clearCachedToken();
        token = await getQfContentToken();
        upstream = await fetch(`${API_BASE}/content/api/v4${targetPath}${qs}`, {
          headers: {
            "x-auth-token": token,
            "x-client-id": CLIENT_ID,
          },
        });
      }
      if (!upstream.ok) {
        throw new Error(`QF upstream returned ${upstream.status} for ${targetPath}`);
      }
      return upstream;
    } catch (err) {
      console.warn(
        "[qf-content] token error or upstream failure, falling back to quran.com:",
        err instanceof Error ? err.message : err
      );
      // Fall through to the public quran.com fallback below.
    }
  }
  // Fallback to public quran.com v4 (identical path shape).
  return fetch(`${FALLBACK_BASE}/api/v4${targetPath}${qs}`);
}

export function registerQfContentRoutes(app: Express): void {
  if (isQfContentConfigured()) {
    console.log(
      `[qf-content] QF Content API configured (env=${QF_CONTENT_ENV}, base=${API_BASE})`
    );
  } else {
    console.log("[qf-content] QF Content API credentials not set — using quran.com fallback");
  }

  // `/api/qf/content/<rest>` → upstream `<API_BASE>/content/api/v4/<rest>`.
  // GET only — the Content API is read-only for our use cases.
  app.get(/^\/api\/qf\/content(\/.*)$/, async (req: Request, res: ExpressResponse) => {
    const subPath = (req.params as unknown as string[])[0] || "";
    if (!ALLOWED_PATH_RE.test(subPath)) {
      return res.status(404).json({ message: "Unknown QF content path" });
    }
    const query = (req.url.split("?")[1] || "").trim();
    try {
      const upstream = await proxyGet(subPath, query);
      const ct = upstream.headers.get("content-type") || "application/json";
      const body = await upstream.text();
      res
        .status(upstream.status)
        .type(ct)
        // 1 hour browser cache for these read-mostly content endpoints.
        // Matches our React Query 24h staleTime — this just speeds up
        // cold loads and reduces token-bucket usage.
        .set("Cache-Control", "public, max-age=3600")
        .send(body);
    } catch (err) {
      console.error("[qf-content] proxy error:", err);
      res.status(502).json({ message: "QF Content API request failed" });
    }
  });
}
