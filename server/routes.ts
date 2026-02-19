import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { sendNotificationToUser, sendTargetAlert, isPushConfigured } from "./pushNotifications";
import { insertPushSubscriptionSchema, deeds } from "@shared/schema";
import { calculatePoints } from "./calculatePoints";
import { sql, eq, and, gte, lte } from "drizzle-orm";

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

  app.get("/api/targets/:id/detail", isAuthenticated, async (req: any, res) => {
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
      return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && matchesQuranUnit && matchesSedekahType;
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

  // Push Notification Routes
  app.get("/api/push/status", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const subscription = await storage.getPushSubscription(userId);
    res.json({
      configured: isPushConfigured(),
      subscribed: !!subscription,
      settings: subscription ? {
        dailyReminder: subscription.dailyReminder,
        reminderTime: subscription.reminderTime,
        targetAlerts: subscription.targetAlerts
      } : null
    });
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = insertPushSubscriptionSchema.parse(req.body);
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

  app.patch("/api/push/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dailyReminder, reminderTime, targetAlerts, timezone } = req.body;
      const settings: any = {};
      if (typeof dailyReminder === 'boolean') settings.dailyReminder = dailyReminder;
      if (typeof reminderTime === 'string') settings.reminderTime = reminderTime;
      if (typeof timezone === 'string') settings.timezone = timezone;
      if (typeof targetAlerts === 'boolean') settings.targetAlerts = targetAlerts;
      
      const subscription = await storage.updatePushSubscriptionSettings(userId, settings);
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }
      res.json({ success: true, subscription });
    } catch (err) {
      throw err;
    }
  });

  app.delete("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.deletePushSubscription(userId);
    res.status(204).send();
  });

  app.post("/api/push/test", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const success = await sendNotificationToUser(userId, {
      title: "Test Notification",
      body: "Push notifications are working!",
      url: "/"
    });
    res.json({ success });
  });

  // Streak Route - Protected
  app.get("/api/streak", isAuthenticated, async (req: any, res) => {
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

  return httpServer;
}
