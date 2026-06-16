import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import i18next from "i18next";
import { isGuestMode } from "@/lib/guest";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ─── 401 / session-expired recovery ────────────────────────────────────────
//
// Task #173: when the server responds 401 to a normally-authenticated
// request (e.g. the OIDC refresh token was revoked), instead of letting
// individual queries silently render empty data, we:
//   1. retry the request once after a tiny delay (covers transient blips
//      where the server's silent refresh succeeds on the next call);
//   2. if still 401, redirect the browser to /api/login with a same-origin
//      `returnTo` so the user lands back where they were after re-auth;
//   3. show a brief toast so the redirect doesn't feel like a crash.
//
// We guard against piling up duplicate redirects when many queries 401 at
// once, and we never redirect away from the public landing/login pages.
let redirectInFlight = false;

function shouldTriggerSessionRedirect(): boolean {
  if (typeof window === "undefined") return false;
  // Guests intentionally have no server session — every authenticated GET
  // returns 401. Bouncing them to /api/login would make guest browse mode
  // impossible, so we never trigger the session-expired flow for guests.
  if (isGuestMode()) return false;
  const path = window.location.pathname;
  // Don't bounce off the landing page or the username-login page — the
  // user is already on a "please sign in" surface there, and a redirect
  // would either no-op or loop.
  if (path === "/" || path === "/login/username") return false;
  return true;
}

function safeReturnToFromLocation(): string {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  const candidate = `${pathname}${search}${hash}`;
  // Mirror the server's isSafeReturnTo: must be a same-origin path that
  // does not point back at auth endpoints.
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/api/login") ||
    candidate.startsWith("/api/logout") ||
    candidate.length > 512
  ) {
    return "/";
  }
  return candidate;
}

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return (
    cap !== undefined &&
    typeof cap.isNativePlatform === "function" &&
    cap.isNativePlatform() === true
  );
}

function triggerSessionExpiredRedirect(): void {
  if (redirectInFlight) return;
  redirectInFlight = true;
  if (!shouldTriggerSessionRedirect()) {
    redirectInFlight = false;
    return;
  }

  // On native (Capacitor WebView) we must NOT navigate window.location to
  // /api/login — that would run the OIDC flow inside the WebView which
  // breaks cookie sharing. Instead dispatch a custom event; the
  // useNativeAuth hook listens for it and opens the system browser.
  if (isCapacitorNative()) {
    window.dispatchEvent(new CustomEvent("istiqoma:reauth-needed"));
    redirectInFlight = false;
    return;
  }

  try {
    toast({
      title: i18next.t("common.sessionExpired"),
      description: i18next.t("common.sessionExpiredDesc"),
    });
  } catch {
    // toast can fail before <Toaster /> mounts; ignore — the redirect
    // itself is the important part.
  }
  const returnTo = encodeURIComponent(safeReturnToFromLocation());
  // Small delay so the toast actually paints before navigation.
  setTimeout(() => {
    window.location.href = `/api/login?returnTo=${returnTo}`;
  }, 200);
}

// Some endpoints legitimately return 401 as part of their normal contract
// — username/PIN sign-in returns 401 for wrong credentials, /api/auth/user
// returns 401 when there's simply no session, and the OIDC endpoints
// themselves obviously shouldn't trigger a recursive redirect. For those
// URLs we let 401 surface to the caller untouched so it can render an
// inline error instead of bouncing the user to /api/login.
function isAuthRecoveryExempt(url: string): boolean {
  // Strip a leading origin so callers using either "/api/foo" or a full
  // URL behave the same.
  const path = url.startsWith("http")
    ? (() => {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      })()
    : url;
  return (
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/login") ||
    path.startsWith("/api/logout")
  );
}

// Same-credential GET helper used to silently retry a 401 once before
// giving up and triggering the redirect flow.
async function fetchWithCredentials(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, { credentials: "include", ...init });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const init: RequestInit = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };

  let res = await fetch(url, init);

  // 401 recovery: retry once, then escalate to the session-expired flow.
  // Skipped for the auth endpoints themselves, where 401 is a normal
  // "wrong credentials" / "no session" response that the caller handles.
  if (res.status === 401 && !isAuthRecoveryExempt(url)) {
    await new Promise((r) => setTimeout(r, 150));
    res = await fetch(url, init);
    if (res.status === 401) {
      triggerSessionExpiredRedirect();
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    let res = await fetchWithCredentials(url);

    // Silent retry for transient 401s (e.g. server in the middle of a
    // background refresh). One quick re-attempt, then escalate. Auth
    // endpoints opt out so a "no session" response from /api/auth/user
    // doesn't get amplified into a noisy retry.
    if (res.status === 401 && !isAuthRecoveryExempt(url)) {
      await new Promise((r) => setTimeout(r, 150));
      res = await fetchWithCredentials(url);
    }

    if (res.status === 401) {
      // `returnNull` is reserved for queries that semantically want
      // "anonymous = no user" (e.g. the auth probe). For those we don't
      // bounce — the caller knows what to do.
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // Trigger the redirect flow but still throw so React Query keeps
      // showing the previously-cached data instead of swapping it out
      // for an empty/zeroed value while the redirect happens. Skip the
      // bounce for auth endpoints themselves — those should surface 401
      // to the caller.
      if (!isAuthRecoveryExempt(url)) {
        triggerSessionExpiredRedirect();
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
