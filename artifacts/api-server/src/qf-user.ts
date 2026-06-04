// Quran Foundation User API integration (Bookmarks only).
//
// QF User APIs use the OAuth2 Authorization Code flow with PKCE. The
// user clicks "Connect Quran Foundation" on the profile page, we redirect
// them to QF's authorization endpoint, they sign in there, QF redirects
// back to /api/qf/callback with a one-time `code`, and the server
// exchanges the code (plus our `code_verifier`) for an access + refresh
// token pair.
//
// After connection, we mirror local bookmark add/remove operations to
// QF. Failures are non-fatal — the local DB stays the source of truth so
// our streak/points system never breaks if QF is unreachable.
//
// Docs:
// https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2/
// https://api-docs.quran.foundation/docs/user_related_apis_versioned/add-user-bookmark/
import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { qfUserTokens, type QfUserToken } from "@workspace/db";

const QF_ENV = (process.env.QF_ENV || "production").toLowerCase();
const IS_PRELIVE = QF_ENV === "prelive" || QF_ENV === "dev" || QF_ENV === "development";

const AUTH_BASE = IS_PRELIVE
  ? "https://prelive-oauth2.quran.foundation"
  : "https://oauth2.quran.foundation";

const API_BASE = IS_PRELIVE
  ? "https://apis-prelive.quran.foundation"
  : "https://apis.quran.foundation";

const CLIENT_ID = process.env.QF_USER_CLIENT_ID || "";
const CLIENT_SECRET = process.env.QF_USER_CLIENT_SECRET || "";
// Scopes required for the Bookmarks endpoints. `openid` is required by
// the OIDC layer; `offline_access` requests a refresh_token; `bookmark`
// grants access to the bookmarks endpoints. QF's production OAuth client
// only allows the standard OIDC name `offline_access` — passing the
// shorthand `offline` (which the pre-live server tolerated) is rejected
// with `error=invalid_scope`, which surfaces in the browser as a failed
// redirect ("site can't be reached").
const SCOPES = "openid offline_access bookmark";

export function isQfUserConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getRedirectUri(req: Request): string {
  // Trust the deployment URL we're served from. Allows the same code to
  // work in prelive/production and across Replit deployment hostnames.
  if (process.env.QF_REDIRECT_URI) return process.env.QF_REDIRECT_URI;
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}/api/qf/callback`;
}

// ─── Token storage ───────────────────────────────────────────────────

async function readTokens(userId: string): Promise<QfUserToken | null> {
  const rows = await db
    .select()
    .from(qfUserTokens)
    .where(eq(qfUserTokens.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function writeTokens(
  userId: string,
  data: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
    scope: string | null;
    qfAccountId: string | null;
  },
): Promise<void> {
  // COALESCE(newValue, currentColumn) in the SET clause is atomic: if the
  // incoming value is null, PostgreSQL keeps the current stored value.
  // ${qfUserTokens.refreshToken} is a typed Drizzle column reference so
  // any future column rename is caught by the TypeScript compiler.
  await db
    .insert(qfUserTokens)
    .values({
      userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      scope: data.scope,
      qfAccountId: data.qfAccountId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: qfUserTokens.userId,
      set: {
        accessToken: data.accessToken,
        refreshToken: sql`COALESCE(${data.refreshToken}, ${qfUserTokens.refreshToken})`,
        expiresAt: data.expiresAt,
        scope: data.scope,
        qfAccountId: sql`COALESCE(${data.qfAccountId}, ${qfUserTokens.qfAccountId})`,
        updatedAt: new Date(),
      },
    });
}

async function deleteTokens(userId: string): Promise<void> {
  await db.delete(qfUserTokens).where(eq(qfUserTokens.userId, userId));
}

// ─── Native PKCE store — for the Capacitor in-app browser flow ──────────────
// When the user connects QF from the native app, we can't use the session
// to hold the PKCE state because the QF OAuth flow runs in
// SFSafariViewController / Chrome Custom Tab which does NOT share cookies
// with the Capacitor WebView. Instead we stash the PKCE state here, keyed
// by the `state` parameter, and the callback looks it up without needing
// a session. Entries expire after 10 minutes.
const NATIVE_QF_PKCE_TTL_MS = 10 * 60 * 1000;
const nativeQfPkceStore = new Map<
  string,
  { codeVerifier: string; userId: string; expiresAt: number }
>();

function cleanupNativeQfPkce() {
  const now = Date.now();
  nativeQfPkceStore.forEach((v, k) => {
    if (now > v.expiresAt) nativeQfPkceStore.delete(k);
  });
}

// ─── PKCE pending state — stored on the user's session, not in DB.
// One in-flight authorization at a time per session is plenty for our
// "Connect Quran Foundation" button.
declare module "express-session" {
  interface SessionData {
    qfPkce?: { state: string; codeVerifier: string; returnTo?: string };
  }
}

// ─── Token refresh ──────────────────────────────────────────────────
async function refreshAccessToken(userId: string, row: QfUserToken): Promise<string | null> {
  if (!row.refreshToken) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refreshToken,
  });
  // QF requires client_secret_basic — credentials in the Authorization
  // header, NOT in the POST body (which would be client_secret_post and
  // is rejected with invalid_client).
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await writeTokens(userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? row.refreshToken,
    expiresAt,
    scope: data.scope ?? row.scope,
    qfAccountId: row.qfAccountId,
  });
  return data.access_token;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const row = await readTokens(userId);
  if (!row) return null;
  // Re-use if at least 60s of validity remain.
  if (row.expiresAt.getTime() - 60_000 > Date.now()) return row.accessToken;
  return refreshAccessToken(userId, row);
}

// ─── Public: connection status & disconnect ────────────────────────
export async function isUserConnected(userId: string): Promise<boolean> {
  const r = await readTokens(userId);
  return Boolean(r);
}

export async function disconnectUser(userId: string): Promise<void> {
  await deleteTokens(userId);
}

// ─── Public: mirror bookmark to QF (fire-and-forget by callers) ────
async function qfRequest(
  userId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const token = await getValidAccessToken(userId);
  if (!token) return { ok: false, status: 401 };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-client-id": CLIENT_ID,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let parsed: unknown = undefined;
  try {
    parsed = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

const BOOKMARKS_PATH = "/content/api/v4/user/bookmarks";

export async function mirrorAddBookmark(
  userId: string,
  surahNumber: number,
  verseNumber: number,
): Promise<void> {
  if (!isQfUserConfigured()) return;
  if (!(await isUserConnected(userId))) return;
  try {
    // QF identifies verses by the canonical "key" (e.g. "2:255").
    const r = await qfRequest(userId, "POST", BOOKMARKS_PATH, {
      key: `${surahNumber}:${verseNumber}`,
      mushaf_id: 1,
    });
    if (!r.ok && r.status !== 409 /* already bookmarked */) {
      console.warn(
        `[qf-user] mirrorAddBookmark non-OK status=${r.status} for ${surahNumber}:${verseNumber}`,
      );
    }
  } catch (err) {
    console.warn("[qf-user] mirrorAddBookmark failed:", err);
  }
}

export async function mirrorRemoveBookmark(
  userId: string,
  surahNumber: number,
  verseNumber: number,
): Promise<void> {
  if (!isQfUserConfigured()) return;
  if (!(await isUserConnected(userId))) return;
  try {
    const key = encodeURIComponent(`${surahNumber}:${verseNumber}`);
    const r = await qfRequest(userId, "DELETE", `${BOOKMARKS_PATH}/${key}`);
    if (!r.ok && r.status !== 404) {
      console.warn(
        `[qf-user] mirrorRemoveBookmark non-OK status=${r.status} for ${surahNumber}:${verseNumber}`,
      );
    }
  } catch (err) {
    console.warn("[qf-user] mirrorRemoveBookmark failed:", err);
  }
}

export type RemoteBookmark = { surahNumber: number; verseNumber: number; source: "qf" };

export async function listRemoteBookmarks(userId: string): Promise<RemoteBookmark[]> {
  if (!isQfUserConfigured()) return [];
  if (!(await isUserConnected(userId))) return [];
  try {
    const r = await qfRequest(userId, "GET", BOOKMARKS_PATH);
    if (!r.ok) return [];
    const body = r.body as { bookmarks?: Array<{ key?: string; verse_key?: string }> } | undefined;
    const items = body?.bookmarks ?? [];
    const out: RemoteBookmark[] = [];
    for (const it of items) {
      const k = it.key ?? it.verse_key;
      if (!k) continue;
      const [s, v] = k.split(":").map((n) => parseInt(n, 10));
      if (!isNaN(s) && !isNaN(v)) out.push({ surahNumber: s, verseNumber: v, source: "qf" });
    }
    return out;
  } catch (err) {
    console.warn("[qf-user] listRemoteBookmarks failed:", err);
    return [];
  }
}

// ─── OAuth routes ──────────────────────────────────────────────────
export function registerQfUserRoutes(
  app: Express,
  isAuthenticated: (req: Request, res: Response, next: (err?: unknown) => void) => void,
): void {
  // Status: is the current user connected to QF? (Public-readable via session.)
  app.get("/api/qf/status", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as unknown as { user: { claims: { sub: string } } }).user.claims.sub;
    res.json({
      configured: isQfUserConfigured(),
      connected: isQfUserConfigured() ? await isUserConnected(userId) : false,
      env: IS_PRELIVE ? "prelive" : "production",
    });
  });

  // Begin connection (web): generate PKCE, stash on session, redirect to QF.
  app.get("/api/qf/connect", isAuthenticated, (req: Request, res: Response) => {
    if (!isQfUserConfigured()) {
      return res.status(503).json({ message: "QF User API is not configured on the server" });
    }
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
    const state = base64url(crypto.randomBytes(16));
    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "/profile";
    req.session.qfPkce = { state, codeVerifier, returnTo };

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: getRedirectUri(req),
      scope: SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    res.redirect(`${AUTH_BASE}/oauth2/auth?${params.toString()}`);
  });

  // Begin connection (native): called via authenticated fetch from the WebView.
  // Returns a JSON object with the QF authorization URL so the client can open
  // it in the system browser via @capacitor/browser. The PKCE state is stored
  // in the server-side nativeQfPkceStore (not the session) so the callback can
  // validate it even though SFSafariViewController has a different session.
  app.get("/api/qf/connect-native", isAuthenticated, (req: Request, res: Response) => {
    if (!isQfUserConfigured()) {
      return res.status(503).json({ message: "QF User API is not configured on the server" });
    }
    const userId = (req as unknown as { user: { claims: { sub: string } } }).user.claims.sub;
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
    const state = base64url(crypto.randomBytes(16));

    nativeQfPkceStore.set(state, {
      codeVerifier,
      userId,
      expiresAt: Date.now() + NATIVE_QF_PKCE_TTL_MS,
    });
    cleanupNativeQfPkce();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: getRedirectUri(req),
      scope: SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    res.json({ url: `${AUTH_BASE}/oauth2/auth?${params.toString()}` });
  });

  // Shared token exchange helper used by both web and native callback paths.
  async function exchangeQfCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  } | null> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    });
    // QF requires client_secret_basic — credentials in the Authorization
    // header, NOT in the POST body (which would be client_secret_post and
    // is rejected with invalid_client).
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const r = await fetch(`${AUTH_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("[qf-user] token exchange failed:", r.status, txt);
      return null;
    }
    return r.json() as Promise<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      id_token?: string;
    }>;
  }

  // Callback: handles both the web flow (PKCE from session) and the native
  // flow (PKCE from nativeQfPkceStore). The native branch runs without
  // isAuthenticated middleware because SFSafariViewController has a different
  // session than the Capacitor WebView — the userId comes from the PKCE store.
  app.get("/api/qf/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string | undefined>;

    // ── Native path ────────────────────────────────────────────────────────
    // Check the server-side PKCE store first (no session auth needed).
    const nativePending = state ? nativeQfPkceStore.get(state) : null;
    if (nativePending) {
      nativeQfPkceStore.delete(state!);
      if (Date.now() > nativePending.expiresAt) {
        return res.redirect("istiqoma://qf/failed");
      }
      if (error || !code) {
        return res.redirect("istiqoma://qf/failed");
      }
      try {
        const tok = await exchangeQfCode(
          code,
          nativePending.codeVerifier,
          getRedirectUri(req),
        );
        if (!tok) return res.redirect("istiqoma://qf/failed");

        let qfAccountId: string | null = null;
        if (tok.id_token) {
          try {
            const part = tok.id_token.split(".")[1];
            const json = JSON.parse(Buffer.from(part, "base64").toString("utf8"));
            if (typeof json.sub === "string") qfAccountId = json.sub;
          } catch { /* ignore */ }
        }
        await writeTokens(nativePending.userId, {
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token ?? null,
          expiresAt: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000),
          scope: tok.scope ?? SCOPES,
          qfAccountId,
        });
        return res.redirect("istiqoma://qf/done");
      } catch (err) {
        console.error("[qf-user] native callback error:", err);
        return res.redirect("istiqoma://qf/failed");
      }
    }

    // ── Web path ───────────────────────────────────────────────────────────
    // Require an authenticated session (equivalent to the former isAuthenticated
    // middleware, applied inline so native requests can bypass it above).
    const webUser = (req as any).user as { claims?: { sub?: string } } | undefined;
    const userId = webUser?.claims?.sub;
    if (!userId) {
      return res.redirect("/api/login?returnTo=/profile");
    }

    const pending = req.session.qfPkce;
    delete req.session.qfPkce;

    if (error) {
      return res.redirect(`/profile?qf=error&reason=${encodeURIComponent(error)}`);
    }
    if (!pending || !code || !state || state !== pending.state) {
      return res.redirect(`/profile?qf=error&reason=state_mismatch`);
    }
    try {
      const tok = await exchangeQfCode(code, pending.codeVerifier, getRedirectUri(req));
      if (!tok) {
        return res.redirect(`/profile?qf=error&reason=exchange_failed`);
      }
      // Best-effort QF account id from id_token (sub claim) — purely
      // informational. Decoding the JWT body is enough; we do not verify
      // the signature here because we just received the token over TLS
      // from the QF endpoint we configured.
      let qfAccountId: string | null = null;
      if (tok.id_token) {
        try {
          const part = tok.id_token.split(".")[1];
          const json = JSON.parse(Buffer.from(part, "base64").toString("utf8"));
          if (typeof json.sub === "string") qfAccountId = json.sub;
        } catch { /* ignore */ }
      }
      await writeTokens(userId, {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token ?? null,
        expiresAt: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000),
        scope: tok.scope ?? SCOPES,
        qfAccountId,
      });
      return res.redirect(`${pending.returnTo ?? "/profile"}?qf=connected`);
    } catch (err) {
      console.error("[qf-user] callback error:", err);
      return res.redirect(`/profile?qf=error&reason=server_error`);
    }
  });

  app.post("/api/qf/disconnect", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as unknown as { user: { claims: { sub: string } } }).user.claims.sub;
    await disconnectUser(userId);
    res.json({ disconnected: true });
  });
}
