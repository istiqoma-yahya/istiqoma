// Force Node to prefer IPv4 results from DNS lookups. Without this, Node 18+
// returns AAAA (IPv6) records first, and the Replit deployment environment
// cannot route to Supabase over IPv6 — causing
// `getaddrinfo EAI_AGAIN aws-*.pooler.supabase.com` on every DB call. Must be
// set before any module that opens a DB connection is imported.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { sendDailyReminders, sendTargetReminders, isPushConfigured } from "./pushNotifications";
import { sendSholatReminders } from "./sholatReminders";
import { pool } from "./db";
import { migratePrayerCompletionsToDeeds } from "../scripts/migrate-prayer-completions-to-deeds";
import { seedQuizQuestions } from "./quiz-seed";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const globalJsonParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\/+$/, "");
  if (req.method === "POST" && normalizedPath === "/api/deeds/voice-transcribe") {
    return next();
  }
  return globalJsonParser(req, res, next);
});

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Only capture response bodies when explicitly enabled via LOG_API_RESPONSES=true
  // (dev default) to avoid leaking secrets (recovery codes, push subscription keys,
  // location data, presigned URLs, etc.) into production log sinks.
  const isDev = process.env.NODE_ENV !== "production" && process.env.LOG_API_RESPONSES !== "false";

  if (isDev) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (isDev && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Safety-net: migrate any leftover prayer_completions rows into Sholat
  // Fardhu deeds. The migration is idempotent and no-ops once the table is
  // gone, so it's safe to run on every boot.
  try {
    await migratePrayerCompletionsToDeeds(pool);
  } catch (err) {
    console.error("[startup] prayer-completions migration failed:", err);
  }

  try {
    await seedQuizQuestions();
  } catch (err) {
    console.error("[startup] quiz seed failed:", err);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start daily reminder scheduler - runs every minute to check for reminders
      if (isPushConfigured()) {
        setInterval(() => {
          sendDailyReminders().catch(err => {
            console.error('Error sending daily reminders:', err);
          });
          sendTargetReminders().catch(err => {
            console.error('Error sending target reminders:', err);
          });
          sendSholatReminders().catch(err => {
            console.error('Error sending sholat reminders:', err);
          });
        }, 60000); // Check every minute
        log('Push notification scheduler started');
      }
    },
  );
})();
