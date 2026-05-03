import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, registerUsernameAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { sendNotificationToUser, sendTargetAlert, isPushConfigured } from "./pushNotifications";
import { deeds, insertCustomDzikirTypeSchema, insertUserOnboardingSchema, Q4_TO_REMINDER_TIME, STREAK_FREEZER_PACKS, type NewlyEarnedBadge } from "@shared/schema";
import {
  checkRateLimit,
  generateRecommendations,
  getCachedRecommendations,
  setCachedRecommendations,
  invalidateUserRecommendationCache,
} from "./recommendations";
import { checkVoiceParseRateLimit, parseVoiceDeed } from "./voiceParse";
import { registerVoiceTranscribeRoute } from "./voiceTranscribe";
import { calculatePoints } from "./calculatePoints";
import { evaluateBadgesForUser } from "./badges";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

function getErrorStatus(err: unknown): number | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return undefined;
}

// Mask an email so other users' identities are never exposed by the
// leaderboard. Keeps the first character of the local part and the
// domain, so "yusuf@gmail.com" → "y***@gmail.com". Returns null/empty
// inputs unchanged.
function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 1);
  return `${head}***${domain}`;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Internal Server Error";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  registerUsernameAuthRoutes(app);
  registerVoiceTranscribeRoute(app);

  // Deeds Routes - Protected
  app.get(api.deeds.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const deeds = await storage.getDeeds(userId);
    res.json(deeds);
  });

  app.post(api.deeds.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.deeds.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      
      const originalQuantity = input.quantity || 1;
      const calculatedPoints = calculatePoints({
        category: input.category,
        quantity: originalQuantity,
        isJamaah: input.isJamaah,
        quranUnit: input.quranUnit,
        dzikirType: input.dzikirType,
        sholatType: input.sholatType,
        fastingType: input.fastingType,
        sedekahType: input.sedekahType,
        customUnit: input.customUnit,
      });
      
      const deedWithCalculatedPoints = {
        ...input,
        points: calculatedPoints,
        quantity: originalQuantity,
      };

      // Sholat Fardhu deeds are idempotent per (user, prayer, local calendar
      // date). If the client retries a tap, has a stale cache, or fires
      // multiple taps before the first round-trip resolves, we must not
      // create a second deed for the same prayer on the same day. Return
      // the existing deed so the client converges on a single canonical row.
      if (
        input.category === "Sholat Fardhu" &&
        input.sholatType &&
        input.localDate
      ) {
        const existing = await storage.findSholatDeedByLocalDate(
          userId,
          input.sholatType,
          input.localDate,
        );
        if (existing) {
          return res.status(200).json(existing);
        }
      }

      try {
        const deed = await storage.createDeed(userId, deedWithCalculatedPoints);
        // If this deed lands on a calendar day that was previously rescued
        // by an auto-consumed freezer, refund that freezer. The streak walk
        // freezes by UTC calendar date, so we derive the deed's UTC date
        // from its createdAt to match.
        const deedDate = deed.createdAt
          ? new Date(deed.createdAt).toISOString().slice(0, 10)
          : null;
        let freezerRefunded = false;
        if (deedDate) {
          freezerRefunded = await storage.refundFreezerForDate(userId, deedDate);
        }
        let newlyEarnedBadges: NewlyEarnedBadge[] = [];
        try {
          const result = await evaluateBadgesForUser(userId);
          newlyEarnedBadges = result.newlyEarned;
        } catch (e) {
          console.error("Badge evaluation failed (createDeed)", e);
        }
        return res.status(201).json({ ...deed, freezerRefunded, refundedDate: freezerRefunded ? deedDate : null, newlyEarnedBadges });
      } catch (insertErr: any) {
        // Postgres unique_violation: another concurrent request beat us to
        // creating the same Sholat Fardhu deed for this (user, prayer, day).
        // Recover by returning the row that already exists.
        const isUniqueViolation =
          insertErr?.code === "23505" ||
          insertErr?.cause?.code === "23505" ||
          insertErr?.constraint === "uniq_sholat_deed_per_day";
        if (
          isUniqueViolation &&
          input.category === "Sholat Fardhu" &&
          input.sholatType &&
          input.localDate
        ) {
          const existing = await storage.findSholatDeedByLocalDate(
            userId,
            input.sholatType,
            input.localDate,
          );
          if (existing) {
            return res.status(200).json(existing);
          }
        }
        throw insertErr;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.deeds.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteDeed(id, userId);
    try {
      await evaluateBadgesForUser(userId);
    } catch (e) {
      console.error("Badge evaluation failed (deleteDeed)", e);
    }
    res.status(204).send();
  });

  app.patch(api.deeds.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.deeds.update.input.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const originalQuantity = input.quantity || 1;
      const calculatedPoints = calculatePoints({
        category: input.category,
        quantity: originalQuantity,
        isJamaah: input.isJamaah,
        quranUnit: input.quranUnit,
        dzikirType: input.dzikirType,
        sholatType: input.sholatType,
        fastingType: input.fastingType,
        sedekahType: input.sedekahType,
        customUnit: input.customUnit,
      });
      
      const deedWithCalculatedPoints = {
        ...input,
        points: calculatedPoints,
        quantity: originalQuantity,
      };
      
      const deed = await storage.updateDeed(id, userId, deedWithCalculatedPoints);
      let newlyEarnedBadges: NewlyEarnedBadge[] = [];
      try {
        const result = await evaluateBadgesForUser(userId);
        newlyEarnedBadges = result.newlyEarned;
      } catch (e) {
        console.error("Badge evaluation failed (updateDeed)", e);
      }
      res.json({ ...deed, newlyEarnedBadges });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.deeds.voiceParse.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.deeds.voiceParse.input.parse(req.body);

      const limit = await checkVoiceParseRateLimit(userId);
      if (!limit.allowed) {
        res.setHeader("Retry-After", String(limit.retryAfterSeconds ?? 60));
        return res.status(429).json({
          message: "Too many voice parses. Please try again later.",
        });
      }

      const [cats, customDzikir] = await Promise.all([
        storage.getCategories(userId),
        storage.getCustomDzikirTypes(userId),
      ]);

      let result;
      try {
        result = await parseVoiceDeed({
          transcript: input.transcript,
          language: input.language,
          clientNowIso: input.clientNowIso,
          timezone: input.timezone,
          categoryNames: cats.map((c) => c.name),
          customDzikirLabels: customDzikir.map((d) => d.label),
        });
      } catch (err) {
        console.error("VoiceParse: Anthropic call failed", err);
        return res.status(503).json({
          message: "Failed to parse voice deed. Please try again.",
        });
      }

      res.json({
        parsed: result.parsed,
        notes: result.notes,
        lowConfidence: result.lowConfidence,
        transcript: input.transcript,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Categories Routes - Protected
  app.get(api.categories.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const cats = await storage.getCategories(userId);
    res.json(cats);
  });

  app.post(api.categories.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const category = await storage.createCategory(userId, input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.categories.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if category is protected
    const categories = await storage.getCategories(userId);
    const category = categories.find(c => c.id === id);
    if (category?.isProtected) {
      return res.status(403).json({ message: "Cannot delete protected category" });
    }
    
    await storage.deleteCategory(id, userId);
    res.status(204).send();
  });

  app.patch(api.categories.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Invalid name" });
      }
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Check if category is protected
      const categories = await storage.getCategories(userId);
      const existingCategory = categories.find(c => c.id === id);
      if (existingCategory?.isProtected) {
        return res.status(403).json({ message: "Cannot edit protected category" });
      }
      
      const category = await storage.updateCategory(id, userId, name);
      res.json(category);
    } catch (err) {
      throw err;
    }
  });

  app.post(api.categories.reorder.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.categories.reorder.input.parse(req.body);
      const userId = req.user.claims.sub;
      const cats = await storage.reorderCategories(userId, input.orderedIds);
      res.json(cats);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Target Folders Routes - Protected
  app.get(api.targetFolders.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const folders = await storage.getTargetFolders(userId);
    res.json(folders);
  });

  app.post(api.targetFolders.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targetFolders.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const folder = await storage.createTargetFolder(userId, input);
      res.status(201).json(folder);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.targetFolders.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targetFolders.update.input.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const folder = await storage.updateTargetFolder(id, userId, input);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      res.json(folder);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.targetFolders.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const deleted = await storage.deleteTargetFolder(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.status(204).send();
  });

  app.patch(api.targetFolders.moveTarget.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targetFolders.moveTarget.input.parse(req.body);
      const userId = req.user.claims.sub;
      const targetId = parseInt(req.params.id);
      if (isNaN(targetId)) {
        return res.status(400).json({ message: "Invalid target ID" });
      }
      const target = await storage.moveTargetToFolder(targetId, userId, input.folderId);
      res.json(target);
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      const status = getErrorStatus(err);
      if (status !== undefined) {
        return res.status(status).json({ message: getErrorMessage(err) });
      }
      throw err;
    }
  });

  // Targets Routes - Protected
  app.get(api.targets.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const targetsList = await storage.getTargets(userId);
    res.json(targetsList);
  });

  app.get(api.targets.listWithProgress.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const timezone = parseTimezone(req.query.timezone);
    const targetsWithProgress = await storage.getTargetsWithProgress(userId, timezone);
    res.json(targetsWithProgress);
  });

  app.post(api.targets.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targets.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const target = await storage.createTarget(userId, input);
      let newlyEarnedBadges: NewlyEarnedBadge[] = [];
      try {
        const result = await evaluateBadgesForUser(userId);
        newlyEarnedBadges = result.newlyEarned;
      } catch (e) {
        console.error("Badge evaluation failed (createTarget)", e);
      }
      res.status(201).json({ ...target, newlyEarnedBadges });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      const status = getErrorStatus(err);
      if (status !== undefined) {
        return res.status(status).json({ message: getErrorMessage(err) });
      }
      throw err;
    }
  });

  app.patch(api.targets.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targets.update.input.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const target = await storage.updateTarget(id, userId, input);
      let newlyEarnedBadges: NewlyEarnedBadge[] = [];
      try {
        const result = await evaluateBadgesForUser(userId);
        newlyEarnedBadges = result.newlyEarned;
      } catch (e) {
        console.error("Badge evaluation failed (updateTarget)", e);
      }
      res.json({ ...target, newlyEarnedBadges });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      const status = getErrorStatus(err);
      if (status !== undefined) {
        return res.status(status).json({ message: getErrorMessage(err) });
      }
      throw err;
    }
  });

  app.delete(api.targets.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteTarget(id, userId);
    res.status(204).send();
  });

  app.get(api.targets.history.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const timezone = parseTimezone(req.query.timezone);
    await storage.calculateAndSaveTargetHistory(id, userId, 7, timezone);
    const result = await storage.getTargetHistoryWithStreak(id, userId, 7);
    res.json(result);
  });

  function parseTimezone(raw: unknown): string | undefined {
    if (!raw || typeof raw !== "string") return undefined;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: raw });
      return raw;
    } catch {
      return undefined;
    }
  }

  app.get(api.targets.deedsForDate.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const dateStr = req.query.date as string;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    const timezone = parseTimezone(req.query.timezone);
    const matchingDeeds = await storage.getDeedsForTargetOnDate(id, userId, dateStr, timezone);
    res.json(matchingDeeds);
  });

  app.get("/api/targets/:id/daily-breakdown", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ message: "Invalid startDate. Use YYYY-MM-DD" });
    }
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ message: "Invalid endDate. Use YYYY-MM-DD" });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }
    const timezone = parseTimezone(req.query.timezone);
    const breakdown = await storage.getDailyBreakdown(id, userId, startDate, endDate, timezone);
    res.json(breakdown);
  });

  app.post(api.targets.recommendations.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Accept `language` from the query string (per spec) or the request
      // body (existing client sends it in the body). Whichever is present
      // wins; the schema enforces it must be one of id/en/ms.
      const rawLanguage =
        (typeof req.query?.language === "string" ? req.query.language : undefined) ??
        req.body?.language;
      const rawForceRefresh =
        (typeof req.query?.forceRefresh === "string"
          ? req.query.forceRefresh === "true"
          : undefined) ?? req.body?.forceRefresh;
      const { language, forceRefresh } = api.targets.recommendations.input.parse({
        language: rawLanguage,
        forceRefresh: rawForceRefresh,
      });

      const onboarding = await storage.getUserOnboarding(userId);

      // Cache hits skip rate-limiting entirely — they don't burn credits or
      // call Claude, so there's no abuse vector to throttle.
      if (!forceRefresh) {
        const cached = getCachedRecommendations(userId, language, onboarding);
        if (cached && cached.length > 0) {
          return res.json({ recommendations: cached, cached: true });
        }
      }

      const limit = await checkRateLimit(userId);
      if (!limit.allowed) {
        res.setHeader("Retry-After", String(limit.retryAfterSeconds ?? 60));
        return res.status(429).json({
          message: "Too many recommendation requests. Please try again later.",
        });
      }

      let recommendations;
      try {
        recommendations = await generateRecommendations(onboarding, language);
      } catch (err) {
        console.error("Recommendations: Anthropic call failed", err);
        return res.status(503).json({
          message: "Failed to fetch recommendations. Please try again.",
        });
      }

      if (recommendations.length === 0) {
        return res.status(503).json({
          message: "No valid recommendations were returned. Please try again.",
        });
      }

      setCachedRecommendations(userId, language, onboarding, recommendations);

      res.json({ recommendations, cached: false });
    } catch (err) {
      const status = getErrorStatus(err) ?? 400;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  app.get(api.targets.detail.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const timezone = parseTimezone(req.query.timezone);
    const targetsWithProgress = await storage.getTargetsWithProgress(userId, timezone);
    const target = targetsWithProgress.find(t => t.id === id);
    if (!target) {
      return res.status(404).json({ message: "Target not found" });
    }

    const periodsBack = 90;
    await storage.calculateAndSaveTargetHistory(id, userId, periodsBack, timezone);
    const { history, currentStreak } = await storage.getTargetHistoryWithStreak(id, userId, periodsBack);

    const totalAccumulated = history.reduce((sum, h) => sum + h.achievedValue, 0);

    const userDeeds = await storage.getDeeds(userId);
    const matchingDeeds = userDeeds.filter(deed => {
      const matchesCategory = deed.category === target.category;
      const matchesDzikirType = !target.dzikirType || deed.dzikirType === target.dzikirType;
      const matchesSholatType = !target.sholatType || deed.sholatType === target.sholatType;
      const matchesFastingType = !target.fastingType || deed.fastingType === target.fastingType;
      const matchesQuranUnit = !target.quranUnit || deed.quranUnit === target.quranUnit;
      const matchesSedekahType = !target.sedekahType || deed.sedekahType === target.sedekahType;
      const matchesCustomUnit = !target.customUnit || deed.customUnit === target.customUnit || !deed.customUnit;
      return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && matchesQuranUnit && matchesSedekahType && matchesCustomUnit;
    });
    const totalPoints = matchingDeeds.reduce((sum, d) => sum + d.points, 0);
    const totalQuantity = matchingDeeds.reduce((sum, d) => sum + (d.quantity || 1), 0);

    const completedPeriods = history.filter(h => h.completed).length;
    const averagePercentage = history.length > 0
      ? Math.round((completedPeriods / history.length) * 100)
      : 0;

    let longestStreak = 0;
    let tempStreak = 0;
    const sortedHistory = [...history].sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
    for (const entry of sortedHistory) {
      if (entry.completed) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    res.json({
      target,
      currentStreak,
      longestStreak,
      totalAccumulated,
      totalQuantity,
      totalPoints,
      averagePercentage,
      history,
    });
  });

  app.patch(api.targets.updateProgress.path, isAuthenticated, async (req: any, res) => {
    try {
      const { progress } = api.targets.updateProgress.input.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const target = await storage.updateTargetProgress(id, userId, progress);
      let newlyEarnedBadges: NewlyEarnedBadge[] = [];
      try {
        const result = await evaluateBadgesForUser(userId);
        newlyEarnedBadges = result.newlyEarned;
      } catch (e) {
        console.error("Badge evaluation failed (updateTargetProgress)", e);
      }
      res.json({ ...target, newlyEarnedBadges });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.targets.complete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const target = await storage.completeTarget(id, userId);
    let newlyEarnedBadges: NewlyEarnedBadge[] = [];
    try {
      const result = await evaluateBadgesForUser(userId);
      newlyEarnedBadges = result.newlyEarned;
    } catch (e) {
      console.error("Badge evaluation failed (completeTarget)", e);
    }
    res.json({ ...target, newlyEarnedBadges });
  });

  app.get(api.push.status.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const subscription = await storage.getPushSubscription(userId);
    res.json({
      configured: isPushConfigured(),
      subscribed: !!subscription,
      settings: subscription ? {
        dailyReminder: subscription.dailyReminder,
        reminderTime: subscription.reminderTime,
        targetAlerts: subscription.targetAlerts,
        sholatReminder: subscription.sholatReminder,
        hasLocation: subscription.latitude != null && subscription.longitude != null,
        notificationSound: subscription.notificationSound ?? "chime",
      } : null
    });
  });

  app.post(api.push.subscribe.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.push.subscribe.input.parse(req.body);
      const subscription = await storage.savePushSubscription(userId, input);
      res.status(201).json({ success: true, subscription });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.push.updateSettings.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = api.push.updateSettings.input.parse(req.body);
      
      const subscription = await storage.updatePushSubscriptionSettings(userId, settings);
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }
      res.json({ success: true, subscription });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.push.unsubscribe.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.deletePushSubscription(userId);
    res.status(204).send();
  });

  app.post(api.push.test.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const subscription = await storage.getPushSubscription(userId);
    const success = await sendNotificationToUser(userId, {
      title: "Test Notification",
      body: "Push notifications are working!",
      url: "/",
      sound: subscription?.notificationSound ?? "chime",
    });
    res.json({ success });
  });

  app.get(api.streak.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const distinctDatesResult = await db
        .select({ date: sql<string>`DATE(${deeds.createdAt})` })
        .from(deeds)
        .where(eq(deeds.userId, userId))
        .groupBy(sql`DATE(${deeds.createdAt})`)
        .orderBy(sql`DATE(${deeds.createdAt}) DESC`);

      const deedDates = new Set(
        distinctDatesResult.map((r) => r.date),
      );

      // Mutable copy of frozen dates so we can record any new freezes we
      // make during this single walk and reflect them in weekDays/frozenDays
      // without re-querying.
      const frozenDates = await storage.getFrozenDates(userId);

      const todayStr = todayUTC.toISOString().split("T")[0];
      const SAFETY_MAX_DAYS = 365 * 10;

      // ─── No-retroactive-repair migration ─────────────────────
      // The first time we ever read this user's streak, persist a "floor"
      // at the most recent natural break in their deed history (without
      // touching freezers). After this, buying freezers can ONLY save
      // future days — it can never resurrect a streak that was already
      // broken before the freezer existed. Users with a perfect record
      // get no floor (null) and can freeze freely.
      let floor = await storage.getStreakFloor(userId);
      if (floor === null) {
        let mDate = new Date(todayUTC);
        let mIsToday = true;
        let mWalked = 0;
        while (mWalked < SAFETY_MAX_DAYS) {
          const mStr = mDate.toISOString().split("T")[0];
          if (deedDates.has(mStr)) {
            // consecutive deed day — keep walking
          } else if (mIsToday) {
            // today empty is fine, not a break
          } else {
            // first historical gap — this is our floor
            await storage.setStreakFloor(userId, mStr);
            floor = mStr;
            break;
          }
          mIsToday = false;
          mDate = new Date(mDate);
          mDate.setUTCDate(mDate.getUTCDate() - 1);
          mWalked++;
        }
      }

      // Walk back from today. Today never gets auto-frozen (the user still has
      // the rest of the calendar day). Past gaps consume one freezer if any
      // are available; otherwise we set the floor to that gap and stop.
      // The floor is also a hard stop: we never walk past it, so freezers
      // bought later cannot revive an already-broken streak.
      let streakCount = 0;
      let isToday = true;
      let checkDate = new Date(todayUTC);
      let walked = 0;
      // Track freezers consumed during THIS walk so the client can surface a
      // one-time notice. We don't include freezers consumed on previous walks
      // because those have already had a chance to be shown.
      const newlyFrozenDates: string[] = [];
      while (walked < SAFETY_MAX_DAYS) {
        const checkStr = checkDate.toISOString().split("T")[0];
        // Hard stop at the no-revive floor.
        if (floor !== null && checkStr <= floor) break;
        const hasDeed = deedDates.has(checkStr);
        const isFrozen = frozenDates.has(checkStr);
        if (hasDeed || isFrozen) {
          streakCount++;
        } else if (isToday) {
          // Today empty: don't break, don't freeze, just walk to yesterday.
        } else {
          const frozen = await storage.consumeFreezerForDate(userId, checkStr);
          if (frozen) {
            frozenDates.add(checkStr);
            newlyFrozenDates.push(checkStr);
            streakCount++;
          } else {
            // Out of freezers on a real past gap → streak breaks here.
            // Persist the floor so a later freezer purchase can't revive it.
            await storage.setStreakFloor(userId, checkStr);
            floor = checkStr;
            break;
          }
        }
        isToday = false;
        checkDate = new Date(checkDate);
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        walked++;
      }

      const dayOfWeek = todayUTC.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(todayUTC);
      monday.setUTCDate(monday.getUTCDate() + mondayOffset);

      const weekDays: boolean[] = [];
      const frozenDays: boolean[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setUTCDate(d.getUTCDate() + i);
        const dStr = d.toISOString().split("T")[0];
        const hasDeed = deedDates.has(dStr);
        const isFrozen = frozenDates.has(dStr);
        weekDays.push(hasDeed || isFrozen);
        frozenDays.push(!hasDeed && isFrozen);
      }

      const hasActivityToday = deedDates.has(todayStr);
      res.json({ streakCount, weekDays, hasActivityToday, frozenDays, newlyFrozenDates });
    } catch (err) {
      throw err;
    }
  });

  // ─── Streak month calendar ───────────────────────────────────
  // Read-only monthly view of the user's streak. Returns one entry per
  // calendar day in the requested month interpreted in the user's timezone,
  // marking whether the day had a logged deed and whether it was rescued
  // by a streak freezer. Reuses the same data sources as /api/streak so
  // the calendar is always consistent with the dashboard streak number.
  app.get(api.streak.month.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const monthQuerySchema = z.object({
      year: z.coerce.number().int().min(1970).max(9999),
      month: z.coerce.number().int().min(1).max(12),
      timezone: z.string().optional(),
    });
    const parsed = monthQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid query",
        field: parsed.error.issues[0]?.path?.join(".") ?? undefined,
      });
    }
    const { year, month, timezone: rawTz } = parsed.data;

    // Resolve timezone with the same fallback strategy as the rest of the
    // app: explicit query → user's push subscription → Asia/Jakarta.
    let tz = parseTimezone(rawTz);
    if (!tz) {
      const sub = await storage.getPushSubscription(userId);
      tz = parseTimezone(sub?.timezone) ?? "Asia/Jakarta";
    }

    const monthStr = String(month).padStart(2, "0");
    const lastDayInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastDayStr = String(lastDayInMonth).padStart(2, "0");
    const monthStartUtc = fromZonedTime(`${year}-${monthStr}-01T00:00:00`, tz);
    const monthEndUtc = fromZonedTime(`${year}-${monthStr}-${lastDayStr}T23:59:59.999`, tz);

    // Distinct deed dates within the month, bucketed by the user's
    // local calendar day. We pull the raw createdAt timestamps and bucket
    // in JS so the bucketing rule is identical to the rest of the app
    // (toZonedTime + format yyyy-MM-dd).
    const deedRows = await db
      .select({ createdAt: deeds.createdAt })
      .from(deeds)
      .where(
        and(
          eq(deeds.userId, userId),
          gte(deeds.createdAt, monthStartUtc),
          lte(deeds.createdAt, monthEndUtc),
        ),
      );
    const deedDateSet = new Set<string>();
    for (const row of deedRows) {
      if (!row.createdAt) continue;
      const local = toZonedTime(row.createdAt, tz);
      deedDateSet.add(format(local, "yyyy-MM-dd"));
    }

    // streak_freezes is already keyed by YYYY-MM-DD strings (date column)
    // so we simply membership-check each day in the month against the set.
    const frozenDates = await storage.getFrozenDates(userId);

    const days: { date: string; hadDeed: boolean; wasFrozen: boolean }[] = [];
    let daysPracticed = 0;
    let freezersUsed = 0;
    for (let d = 1; d <= lastDayInMonth; d++) {
      const dayStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
      const hadDeed = deedDateSet.has(dayStr);
      // wasFrozen is only true when a freezer rescued a day with no deed,
      // matching the model used by /api/streak's frozenDays array.
      const wasFrozen = !hadDeed && frozenDates.has(dayStr);
      if (hadDeed) daysPracticed++;
      if (wasFrozen) freezersUsed++;
      days.push({ date: dayStr, hadDeed, wasFrozen });
    }

    res.json({ days, daysPracticed, freezersUsed });
  });

  // Read-only per-day view: returns the deeds the user logged on a given
  // local calendar day, plus whether that day was rescued by a streak
  // freezer. Used by the streak calendar to drill into a specific day.
  app.get(api.streak.day.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const dayQuerySchema = z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
      timezone: z.string().optional(),
    });
    const parsed = dayQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid query",
        field: parsed.error.issues[0]?.path?.join(".") ?? undefined,
      });
    }
    const { date: dateStr, timezone: rawTz } = parsed.data;

    let tz = parseTimezone(rawTz);
    if (!tz) {
      const sub = await storage.getPushSubscription(userId);
      tz = parseTimezone(sub?.timezone) ?? "Asia/Jakarta";
    }

    // Reject future days outright. The calendar already disables them;
    // this is a defensive guard against direct API calls.
    const todayStr = format(toZonedTime(new Date(), tz), "yyyy-MM-dd");
    if (dateStr > todayStr) {
      return res.json({ date: dateStr, hadDeed: false, wasFrozen: false, deeds: [] });
    }

    const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, tz);
    const dayEndUtc = fromZonedTime(`${dateStr}T23:59:59.999`, tz);

    const dayDeedsRaw = await db
      .select()
      .from(deeds)
      .where(
        and(
          eq(deeds.userId, userId),
          gte(deeds.createdAt, dayStartUtc),
          lte(deeds.createdAt, dayEndUtc),
        ),
      );

    // Bucket by the user's local timezone date the same way the month
    // endpoint does, so a deed that crosses midnight in UTC still lands
    // on the local day the user expects.
    const dayDeeds = dayDeedsRaw.filter((d) => {
      if (!d.createdAt) return false;
      return format(toZonedTime(d.createdAt, tz), "yyyy-MM-dd") === dateStr;
    });

    const hadDeed = dayDeeds.length > 0;
    const frozenDates = await storage.getFrozenDates(userId);
    const wasFrozen = !hadDeed && frozenDates.has(dateStr);

    res.json({ date: dateStr, hadDeed, wasFrozen, deeds: dayDeeds });
  });

  // ─── Streak Freezer ──────────────────────────────────────────
  app.get(api.streakFreezer.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const [freezer, points, entries] = await Promise.all([
      storage.getStreakFreezerBalance(userId),
      storage.getPointsBalance(userId),
      storage.getFreezerEntries(userId),
    ]);
    // frozenDates retains its original meaning: the set of currently-active
    // (non-refunded) frozen calendar dates. frozenEntries adds refund state
    // so the freezer page can render refunded events alongside active ones.
    const activeDates = entries
      .filter((e) => e.refundedAt === null)
      .map((e) => e.date)
      .sort();
    res.json({
      freezer,
      points,
      frozenDates: activeDates,
      frozenEntries: entries,
      packs: STREAK_FREEZER_PACKS.map((p) => ({
        size: p.size,
        cost: p.cost,
        discountPercent: p.discountPercent,
      })),
    });
  });

  app.post(api.streakFreezer.purchase.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const parsed = api.streakFreezer.purchase.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid pack size",
        field: parsed.error.issues[0]?.path?.join(".") ?? "packSize",
      });
    }
    try {
      const result = await storage.purchaseStreakFreezers(
        userId,
        parsed.data.packSize as 1 | 10 | 25 | 50 | 100,
      );
      res.json(result);
    } catch (err: any) {
      if (err?.code === "INSUFFICIENT_POINTS") {
        return res.status(402).json({
          message: "Not enough points to purchase this pack.",
          code: "INSUFFICIENT_POINTS",
          available: err.available ?? 0,
          required: err.required ?? 0,
        });
      }
      throw err;
    }
  });

  // Custom Dzikir Types Routes
  app.get("/api/dzikir-types", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const types = await storage.getCustomDzikirTypes(userId);
    res.json(types);
  });

  app.post("/api/dzikir-types", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { label } = insertCustomDzikirTypeSchema.parse(req.body);
      const created = await storage.createCustomDzikirType(userId, label);
      res.status(201).json(created);
    } catch (err) {
      const status = getErrorStatus(err) ?? 400;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  app.patch("/api/dzikir-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { label } = insertCustomDzikirTypeSchema.parse(req.body);
      const updated = await storage.updateCustomDzikirType(id, userId, label);
      res.json(updated);
    } catch (err) {
      const status = getErrorStatus(err) ?? 400;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  app.delete("/api/dzikir-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteCustomDzikirType(id, userId);
      res.status(204).send();
    } catch (err) {
      const status = getErrorStatus(err) ?? 400;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  // ─── Leaderboard ──────────────────────────────────────────────
  // Public leaderboard ranked by deed points within the user's chosen
  // window (daily/monthly/yearly, computed in their local timezone).
  // Returns a windowed slice plus the current user's rank so the client
  // can center its view on them and load more above/below as needed.
  // Other users' emails are masked server-side; the requester's own
  // email is returned unmasked for the "you" row.
  app.get(api.leaderboard.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const periodRaw = String(req.query.period ?? "daily");
      if (periodRaw !== "daily" && periodRaw !== "monthly" && periodRaw !== "yearly") {
        return res.status(400).json({ message: "Invalid period" });
      }
      const period = periodRaw as "daily" | "monthly" | "yearly";

      const beforeRank = req.query.beforeRank != null ? parseInt(String(req.query.beforeRank), 10) : null;
      const afterRank = req.query.afterRank != null ? parseInt(String(req.query.afterRank), 10) : null;
      const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : 50;
      const timezone = parseTimezone(req.query.timezone);

      let mode: "around" | "before" | "after" = "around";
      let cursor: number | null = null;
      if (beforeRank != null && !Number.isNaN(beforeRank)) {
        mode = "before";
        cursor = beforeRank;
      } else if (afterRank != null && !Number.isNaN(afterRank)) {
        mode = "after";
        cursor = afterRank;
      }

      const result = await storage.getLeaderboard(userId, period, {
        mode,
        cursor,
        limit: Number.isFinite(limit) ? limit : 50,
        timezone,
      });

      const entries = result.entries.map((e) => {
        const isCurrentUser = e.userId === userId;
        // Mask other users' emails server-side. The requester's own
        // email is returned raw (it's already their data) and the
        // client always re-masks it before rendering so the UI never
        // shows a raw email.
        return {
          rank: e.rank,
          userId: e.userId,
          username: e.username,
          email: isCurrentUser ? e.email : maskEmail(e.email),
          profileImageUrl: e.profileImageUrl,
          points: e.points,
          isCurrentUser,
        };
      });

      res.json({ entries, me: result.me, total: result.total });
    } catch (err) {
      const status = getErrorStatus(err) ?? 500;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  // ─── Badges ──────────────────────────────────────────────────
  app.get(api.badges.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { snapshot } = await evaluateBadgesForUser(userId);
      res.json(snapshot);
    } catch (err) {
      const status = getErrorStatus(err) ?? 500;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  // Onboarding routes
  app.get(api.onboarding.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const row = await storage.getUserOnboarding(userId);
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: getErrorMessage(err) });
    }
  });

  app.post(api.onboarding.complete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Identity key is derived server-side from validated answers; any
      // client-supplied identityKey is ignored to keep the stored profile
      // consistent with the answers.
      const parsed = insertUserOnboardingSchema
        .omit({ identityKey: true })
        .parse(req.body);
      const data = { ...parsed, identityKey: parsed.q5 };
      const row = await storage.upsertUserOnboarding(userId, data);

      // Onboarding answers are part of the recommendation cache key, so an
      // edit could leave a stale entry around for the same fingerprint if
      // the user happened to flip back and forth. Drop everything for this
      // user so the next open recomputes against the new answers.
      invalidateUserRecommendationCache(userId);

      // Map Q4 → reminder time and update push subscription if present.
      // Mapping is shared with the client so the Settings edit page can
      // preview the time the user will be reminded.
      const reminderTime = Q4_TO_REMINDER_TIME[data.q4];
      if (reminderTime) {
        const existing = await storage.getPushSubscription(userId);
        if (existing) {
          await storage.updatePushSubscriptionSettings(userId, { reminderTime });
        }
      }

      res.json(row);
    } catch (err) {
      const status = getErrorStatus(err) ?? 400;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  // ─── Qur'an ──────────────────────────────────────────────────
  // Personal data only (bookmarks + last-read / reciter pref). All public
  // Qur'an content (chapters, verses, audio) is fetched directly from the
  // public quran.com API by the frontend; we deliberately do not proxy it
  // server-side because it's read-heavy, CORS-enabled, and benefits from
  // browser caching.
  app.get(api.quran.listBookmarks.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const rows = await storage.getQuranBookmarks(userId);
    res.json(rows);
  });

  app.post(api.quran.addBookmark.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.quran.addBookmark.input.parse(req.body);
      const userId = req.user.claims.sub;
      const bookmark = await storage.addQuranBookmark(userId, input);
      res.status(201).json(bookmark);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.quran.removeBookmark.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const surah = parseInt(req.params.surah, 10);
    const verse = parseInt(req.params.verse, 10);
    if (isNaN(surah) || isNaN(verse)) {
      return res.status(400).json({ message: "Invalid surah or verse" });
    }
    await storage.removeQuranBookmark(userId, surah, verse);
    res.status(204).send();
  });

  app.get(api.quran.getReadingState.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const row = await storage.getQuranReadingState(userId);
    res.json(row);
  });

  app.put(api.quran.updateReadingState.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.quran.updateReadingState.input.parse(req.body);
      const userId = req.user.claims.sub;
      const row = await storage.upsertQuranReadingState(userId, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get(api.quran.listMemorizations.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    // Optional ?surah=N filter — keeps payloads small when the client only
    // needs memorization data for the surah currently being read.
    const surahParam = typeof req.query.surah === "string" ? parseInt(req.query.surah, 10) : NaN;
    const surahFilter = !isNaN(surahParam) && surahParam >= 1 && surahParam <= 114 ? surahParam : undefined;
    const rows = await storage.getQuranMemorizations(userId, surahFilter);
    res.json(rows);
  });

  app.post(api.quran.addMemorization.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.quran.addMemorization.input.parse(req.body);
      const userId = req.user.claims.sub;
      const row = await storage.addQuranMemorization(userId, input);

      // Award deed points the first time this verse is ever memorized.
      // Dedup is anchored on the persistent `quran_memorization_awards`
      // ledger (NOT on `quran_memorizations`) so a user can't farm points
      // by repeatedly unmarking and re-marking the same verse — once the
      // award row exists, it stays even if memorization is later removed.
      const alreadyAwarded = await storage.hasQuranMemorizationAward(
        userId,
        input.surahNumber,
        input.verseNumber,
      );
      if (!alreadyAwarded) {
        const points = calculatePoints({ category: "Hafalan Quran", quantity: 1 });
        try {
          const deed = await storage.createDeed(userId, {
            description: `Memorized Surah ${input.surahNumber}:${input.verseNumber}`,
            category: "Hafalan Quran",
            points,
            quantity: 1,
            deedType: "good",
          });
          // Race-safe: a concurrent second request might have inserted the
          // award row first. In that case `recordQuranMemorizationAward`
          // returns false and we roll back this duplicate deed so we don't
          // double-credit the user.
          const inserted = await storage.recordQuranMemorizationAward(
            userId,
            input.surahNumber,
            input.verseNumber,
            deed.id,
          );
          if (!inserted) {
            await storage.deleteDeed(deed.id, userId);
          } else {
            try {
              await evaluateBadgesForUser(userId);
            } catch (e) {
              console.error("Badge evaluation failed (memorization award)", e);
            }
          }
        } catch (e) {
          // Don't fail the memorization tap if the deed-award side-channel
          // hits a transient error — the verse is still marked memorized.
          console.error("Failed to award memorization deed", e);
        }
      }

      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.quran.removeMemorization.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const surah = parseInt(req.params.surah, 10);
    const verse = parseInt(req.params.verse, 10);
    if (isNaN(surah) || isNaN(verse)) {
      return res.status(400).json({ message: "Invalid surah or verse" });
    }
    await storage.removeQuranMemorization(userId, surah, verse);
    res.status(204).send();
  });

  // ─── Quiz ────────────────────────────────────────────────────
  // Islamic quiz progression. Independent of deeds/points: users
  // advance levels only on a perfect 10/10 score and the leaderboard
  // ranks by (level desc, totalCorrect desc).
  app.get(api.quiz.state.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const state = await storage.getQuizState(userId);
      res.json(state);
    } catch (err) {
      const status = getErrorStatus(err) ?? 500;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  app.post(api.quiz.start.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attempt = await storage.startQuizAttempt(userId);
      res.json(attempt);
    } catch (err) {
      const status = getErrorStatus(err) ?? 500;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  app.post(api.quiz.answer.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.quiz.answer.input.parse(req.body);
      const result = await storage.recordQuizAnswer(userId, input.attemptId, input.optionIndex);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      const status = getErrorStatus(err) ?? 500;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  app.get(api.quiz.leaderboard.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : 50;
      const result = await storage.getQuizLeaderboard(userId, Number.isFinite(limit) ? limit : 50);
      const entries = result.entries.map((e) => ({
        ...e,
        email: e.isCurrentUser ? e.email : maskEmail(e.email),
      }));
      res.json({ entries, me: result.me, total: result.total });
    } catch (err) {
      const status = getErrorStatus(err) ?? 500;
      res.status(status).json({ message: getErrorMessage(err) });
    }
  });

  return httpServer;
}
