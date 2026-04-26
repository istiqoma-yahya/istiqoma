import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { sendNotificationToUser, sendTargetAlert, isPushConfigured } from "./pushNotifications";
import { deeds, insertCustomDzikirTypeSchema } from "@shared/schema";
import { calculatePoints } from "./calculatePoints";
import { sql, eq, and, gte, lte } from "drizzle-orm";

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
      
      const deed = await storage.createDeed(userId, deedWithCalculatedPoints);
      res.status(201).json(deed);
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
      res.json(deed);
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
    const targetsWithProgress = await storage.getTargetsWithProgress(userId);
    res.json(targetsWithProgress);
  });

  app.post(api.targets.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targets.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const target = await storage.createTarget(userId, input);
      res.status(201).json(target);
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
    
    await storage.calculateAndSaveTargetHistory(id, userId, 7);
    const result = await storage.getTargetHistoryWithStreak(id, userId, 7);
    res.json(result);
  });

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
    const matchingDeeds = await storage.getDeedsForTargetOnDate(id, userId, dateStr);
    res.json(matchingDeeds);
  });

  app.get(api.targets.detail.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const targetsWithProgress = await storage.getTargetsWithProgress(userId);
    const target = targetsWithProgress.find(t => t.id === id);
    if (!target) {
      return res.status(404).json({ message: "Target not found" });
    }

    const periodsBack = 90;
    await storage.calculateAndSaveTargetHistory(id, userId, periodsBack);
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
      res.json(target);
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
    res.json(target);
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
        distinctDatesResult.map((r) => r.date)
      );

      const todayStr = todayUTC.toISOString().split("T")[0];
      let streakCount = 0;

      const yesterdayUTC = new Date(todayUTC);
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
      const yesterdayStr = yesterdayUTC.toISOString().split("T")[0];

      if (deedDates.has(todayStr)) {
        streakCount = 1;
        let checkDate = new Date(todayUTC);
        while (true) {
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          const checkStr = checkDate.toISOString().split("T")[0];
          if (deedDates.has(checkStr)) {
            streakCount++;
          } else {
            break;
          }
        }
      } else if (deedDates.has(yesterdayStr)) {
        streakCount = 1;
        let checkDate = new Date(yesterdayUTC);
        while (true) {
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          const checkStr = checkDate.toISOString().split("T")[0];
          if (deedDates.has(checkStr)) {
            streakCount++;
          } else {
            break;
          }
        }
      }

      const dayOfWeek = todayUTC.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(todayUTC);
      monday.setUTCDate(monday.getUTCDate() + mondayOffset);

      const weekDays: boolean[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setUTCDate(d.getUTCDate() + i);
        const dStr = d.toISOString().split("T")[0];
        weekDays.push(deedDates.has(dStr));
      }

      const hasActivityToday = deedDates.has(todayStr);
      res.json({ streakCount, weekDays, hasActivityToday });
    } catch (err) {
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

  return httpServer;
}
