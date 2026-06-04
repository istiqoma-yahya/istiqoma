import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * CSRF protection via Origin / Referer header validation.
 *
 * Browsers always send an `Origin` header on cross-origin requests (including
 * cross-site form POSTs and fetch calls). We reject any state-mutating request
 * whose `Origin` header is present but does not match the server's own full
 * origin (scheme + host + port). Same-origin browser requests either omit
 * `Origin` (some navigations) or send the matching origin, so they pass through
 * unaffected.
 *
 * Referer is used as a fallback when Origin is absent (e.g. older browsers or
 * some same-site navigations that strip it). If neither header is present the
 * request is allowed through — legitimate same-origin API clients (mobile apps,
 * server-to-server) don't send these headers and are already protected by the
 * session-cookie authentication requirement.
 *
 * The expected origin is reconstructed from the incoming request using:
 *   `${req.protocol}://${req.headers.host}`
 * `req.headers.host` preserves any non-standard port (e.g. `localhost:5000`)
 * while `req.protocol` respects the `X-Forwarded-Proto` header when Express
 * has `trust proxy` enabled (as this app does in setupAuth).
 */
export function csrfOriginCheck(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get("Origin");
    const referer = req.get("Referer");

    const checkHeader = origin ?? referer;

    if (!checkHeader) {
      return next();
    }

    let requestOrigin: string;
    try {
      requestOrigin = new URL(checkHeader).origin;
    } catch {
      return res.status(403).json({ message: "Forbidden: invalid Origin header" });
    }

    // Reconstruct expected origin using scheme + Host header (preserves port).
    const host = (req.headers.host as string | undefined) ?? req.hostname;
    const expectedOrigin = `${req.protocol}://${host}`;

    if (requestOrigin !== expectedOrigin) {
      console.warn(
        `[csrf] rejected ${req.method} ${req.path} — request origin "${requestOrigin}" != expected "${expectedOrigin}"`,
      );
      return res.status(403).json({ message: "Forbidden: cross-site request rejected" });
    }

    return next();
  };
}
