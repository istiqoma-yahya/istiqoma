import { db } from "./db";
export { db };
import { deeds, categories, targets, targetHistory, pushSubscriptions, type InsertDeed, type Deed, type Category, type InsertCategory, type Target, type InsertTarget, type TargetWithProgress, type TargetHistory, type InsertTargetHistory, type PushSubscription, type InsertPushSubscription } from "@shared/schema";
import { eq, desc, and, asc, sql, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Default timezone for users (Indonesia)
const DEFAULT_TIMEZONE = "Asia/Jakarta";

const FASTING_CATEGORY_VARIANTS = ["puasa", "fasting", "puasa fardhu", "puasa sunnah", "fasting fardhu", "fasting sunnah"];
function isFastingCategory(cat: string): boolean {
  return FASTING_CATEGORY_VARIANTS.includes(cat.toLowerCase());
}
function matchesFastingCategories(cat1: string, cat2: string): boolean {
  return cat1 === cat2 || (isFastingCategory(cat1) && isFastingCategory(cat2));
}

export type TargetHistoryWithStreak = {
  history: TargetHistory[];
  currentStreak: number;
};

export interface IStorage {
  getDeeds(userId: string): Promise<Deed[]>;
  createDeed(userId: string, deed: InsertDeed): Promise<Deed>;
  deleteDeed(id: number, userId: string): Promise<void>;
  updateDeed(id: number, userId: string, deed: InsertDeed): Promise<Deed>;
  getCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, category: InsertCategory): Promise<Category>;
  deleteCategory(id: number, userId: string): Promise<void>;
  updateCategory(id: number, userId: string, name: string): Promise<Category>;
  reorderCategories(userId: string, orderedIds: number[]): Promise<Category[]>;
  markCategoryProtected(id: number, userId: string): Promise<void>;
  getTargets(userId: string): Promise<Target[]>;
  getTargetsWithProgress(userId: string): Promise<TargetWithProgress[]>;
  createTarget(userId: string, target: InsertTarget): Promise<Target>;
  updateTarget(id: number, userId: string, target: InsertTarget): Promise<Target>;
  deleteTarget(id: number, userId: string): Promise<void>;
  getTargetHistory(targetId: number, userId: string, limit?: number): Promise<TargetHistory[]>;
  getTargetHistoryWithStreak(targetId: number, userId: string, limit?: number): Promise<TargetHistoryWithStreak>;
  calculateAndSaveTargetHistory(targetId: number, userId: string, periodsBack?: number): Promise<TargetHistory[]>;
  getDeedsForTargetOnDate(targetId: number, userId: string, dateStr: string): Promise<Deed[]>;
  getPushSubscription(userId: string): Promise<PushSubscription | null>;
  savePushSubscription(userId: string, subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscriptionSettings(userId: string, settings: Partial<InsertPushSubscription>): Promise<PushSubscription | null>;
  deletePushSubscription(userId: string): Promise<void>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
}

export class DatabaseStorage implements IStorage {
  async getDeeds(userId: string): Promise<Deed[]> {
    return await db
      .select()
      .from(deeds)
      .where(eq(deeds.userId, userId))
      .orderBy(desc(deeds.createdAt));
  }

  async createDeed(userId: string, insertDeed: InsertDeed): Promise<Deed> {
    const values: any = { ...insertDeed, userId, deedType: insertDeed.deedType || "good" };
    const [deed] = await db
      .insert(deeds)
      .values(values)
      .returning();
    return deed;
  }

  async deleteDeed(id: number, userId: string): Promise<void> {
    await db
      .delete(deeds)
      .where(and(eq(deeds.id, id), eq(deeds.userId, userId)));
  }

  async updateDeed(id: number, userId: string, updateDeed: InsertDeed): Promise<Deed> {
    const values: any = { ...updateDeed };
    const [deed] = await db
      .update(deeds)
      .set(values)
      .where(and(eq(deeds.id, id), eq(deeds.userId, userId)))
      .returning();
    return deed;
  }

  async getCategories(userId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  }

  async createCategory(userId: string, insertCategory: InsertCategory): Promise<Category> {
    const existing = await this.getCategories(userId);
    const duplicateCheck = existing.find(c => c.name.toLowerCase() === insertCategory.name.toLowerCase());
    if (duplicateCheck) {
      return duplicateCheck;
    }
    let maxSortOrder = existing.length > 0 ? Math.max(...existing.map(c => c.sortOrder)) : -1;
    const [category] = await db
      .insert(categories)
      .values({ 
        ...insertCategory, 
        userId, 
        sortOrder: maxSortOrder + 1,
        isProtected: insertCategory.isProtected ?? false,
      })
      .returning();
    
    // If this is a new user (only 1 category), seed other protected categories
    if (existing.length === 0) {
      const defaultProtected = [
        "Sholat Fardhu", 
        "Sholat Sunnah", 
        "Puasa", 
        "Dzikir", 
        "Baca Quran", 
        "Shodaqoh"
      ];
      
      // Get current categories again to avoid race conditions
      const currentCategories = await this.getCategories(userId);
      const existingNames = new Set(currentCategories.map(c => c.name));
      
      for (const name of defaultProtected) {
        if (!existingNames.has(name)) {
          await db.insert(categories).values({
            name,
            userId,
            isProtected: true,
            sortOrder: ++maxSortOrder + 1
          });
          existingNames.add(name);
        }
      }
    }
    
    return category;
  }

  async deleteCategory(id: number, userId: string): Promise<void> {
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  }

  async updateCategory(id: number, userId: string, name: string): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set({ name })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return category;
  }

  async reorderCategories(userId: string, orderedIds: number[]): Promise<Category[]> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(categories)
        .set({ sortOrder: i })
        .where(and(eq(categories.id, orderedIds[i]), eq(categories.userId, userId)));
    }
    return this.getCategories(userId);
  }

  async markCategoryProtected(id: number, userId: string): Promise<void> {
    await db
      .update(categories)
      .set({ isProtected: true })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  }

  async getTargets(userId: string): Promise<Target[]> {
    return await db
      .select()
      .from(targets)
      .where(eq(targets.userId, userId))
      .orderBy(desc(targets.createdAt));
  }

  async getTargetsWithProgress(userId: string): Promise<TargetWithProgress[]> {
    const userTargets = await this.getTargets(userId);
    const userDeeds = await this.getDeeds(userId);
    const now = new Date();

    return userTargets.map((target) => {
      const isOneTime = target.recurrence === "oneTime";
      
      // For one-time targets, count matching deeds only
      if (isOneTime) {
        // Filter deeds by date range (startDate to dueDate) and matching category/subcategory
        const isLimitTarget = target.targetType === "limit";
        
        const matchingDeeds = userDeeds.filter((deed) => {
          const deedDate = new Date(deed.createdAt || now);
          
          // Check date range if specified
          const afterStart = !target.startDate || deedDate >= new Date(target.startDate);
          const beforeDue = !target.dueDate || deedDate <= new Date(target.dueDate);
          const inDateRange = afterStart && beforeDue;
          
          // Match category (with backward compat for merged fasting categories)
          const matchesCategory = matchesFastingCategories(deed.category, target.category) || deed.category === target.category;
          
          // Match subcategories (metadata)
          const matchesDzikirType = !target.dzikirType || deed.dzikirType === target.dzikirType;
          const matchesSholatType = !target.sholatType || deed.sholatType === target.sholatType;
          const matchesFastingType = !target.fastingType || deed.fastingType === target.fastingType;
          const matchesQuranUnit = !target.quranUnit || deed.quranUnit === target.quranUnit;
          const matchesSedekahType = !target.sedekahType || deed.sedekahType === target.sedekahType;
          const matchesIsJamaah = target.isJamaah === null || target.isJamaah === undefined || deed.isJamaah === target.isJamaah;
          const matchesCustomUnit = !target.customUnit || deed.customUnit === target.customUnit || !deed.customUnit;
          
          // All deeds are now good deeds - count matching deeds
          return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && matchesQuranUnit && matchesSedekahType && matchesIsJamaah && matchesCustomUnit && inDateRange;
        });
        
        const deedProgress = matchingDeeds.reduce((sum, deed) => sum + (deed.quantity || 1), 0);
        const currentValue = deedProgress;
        
        const percentComplete = target.targetValue > 0 
          ? Math.min(100, Math.round((currentValue / target.targetValue) * 100))
          : 0;
        
        return {
          ...target,
          currentValue,
          percentComplete,
        };
      }
      
      // Recurring target logic - use user's timezone for period calculations
      let periodStart: Date;
      let periodEnd: Date;
      
      // Convert current time to user's timezone for period calculations
      const nowInUserTz = toZonedTime(now, DEFAULT_TIMEZONE);

      switch (target.period) {
        case "daily":
          // Calculate start/end of day in user's timezone, then convert back to UTC
          periodStart = fromZonedTime(startOfDay(nowInUserTz), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfDay(nowInUserTz), DEFAULT_TIMEZONE);
          break;
        case "weekly":
          periodStart = fromZonedTime(startOfWeek(nowInUserTz, { weekStartsOn: 1 }), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfWeek(nowInUserTz, { weekStartsOn: 1 }), DEFAULT_TIMEZONE);
          break;
        case "monthly":
          periodStart = fromZonedTime(startOfMonth(nowInUserTz), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfMonth(nowInUserTz), DEFAULT_TIMEZONE);
          break;
        default:
          periodStart = fromZonedTime(startOfDay(nowInUserTz), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfDay(nowInUserTz), DEFAULT_TIMEZONE);
      }

      // For achievement targets: count good deeds
      // For limit targets: count bad deeds (or deeds in that category regardless of type for Maksiat)
      const isLimitTarget = target.targetType === "limit";
      
      const deedsInPeriod = userDeeds.filter((deed) => {
        const deedDate = new Date(deed.createdAt || now);
        const inPeriod = deedDate >= periodStart && deedDate <= periodEnd;
        const matchesCategory = matchesFastingCategories(deed.category, target.category) || deed.category === target.category;
        
        // Match subcategories (metadata)
        const matchesDzikirType = !target.dzikirType || deed.dzikirType === target.dzikirType;
        const matchesSholatType = !target.sholatType || deed.sholatType === target.sholatType;
        const matchesFastingType = !target.fastingType || deed.fastingType === target.fastingType;
        const matchesQuranUnit = !target.quranUnit || deed.quranUnit === target.quranUnit;
        const matchesSedekahType = !target.sedekahType || deed.sedekahType === target.sedekahType;
        const matchesIsJamaah = target.isJamaah === null || target.isJamaah === undefined || deed.isJamaah === target.isJamaah;
        const matchesCustomUnit = !target.customUnit || deed.customUnit === target.customUnit || !deed.customUnit;
        
        // All deeds are now good deeds - count matching deeds
        return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && matchesQuranUnit && matchesSedekahType && matchesIsJamaah && matchesCustomUnit && inPeriod;
      });

      const currentValue = deedsInPeriod.reduce((sum, deed) => sum + (deed.quantity || 1), 0);
      
      let percentComplete: number;
      if (isLimitTarget) {
        // For limit targets: 100% means at limit, over 100% means exceeded
        // Show as usage percentage
        if (target.targetValue === 0) {
          // If limit is 0, any deed means 100%+ (exceeded)
          percentComplete = currentValue > 0 ? 100 : 0;
        } else {
          percentComplete = Math.round((currentValue / target.targetValue) * 100);
        }
      } else {
        // For achievement targets: progress toward goal, capped at 100%
        percentComplete = Math.min(100, Math.round((currentValue / target.targetValue) * 100));
      }

      return {
        ...target,
        currentValue,
        percentComplete,
      };
    });
  }

  async createTarget(userId: string, insertTarget: InsertTarget): Promise<Target> {
    const [target] = await db
      .insert(targets)
      .values({ ...insertTarget, userId })
      .returning();
    return target;
  }

  async updateTarget(id: number, userId: string, updateTarget: InsertTarget): Promise<Target> {
    const [target] = await db
      .update(targets)
      .set(updateTarget)
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .returning();
    return target;
  }

  async deleteTarget(id: number, userId: string): Promise<void> {
    await db
      .delete(targets)
      .where(and(eq(targets.id, id), eq(targets.userId, userId)));
  }

  async updateTargetProgress(id: number, userId: string, progress: number): Promise<Target> {
    const [target] = await db
      .update(targets)
      .set({ manualProgress: progress })
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .returning();
    return target;
  }

  async completeTarget(id: number, userId: string): Promise<Target> {
    const [target] = await db
      .update(targets)
      .set({ completedAt: new Date() })
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .returning();
    return target;
  }

  async getTargetHistory(targetId: number, userId: string, limit: number = 30): Promise<TargetHistory[]> {
    return await db
      .select()
      .from(targetHistory)
      .where(and(eq(targetHistory.targetId, targetId), eq(targetHistory.userId, userId)))
      .orderBy(desc(targetHistory.periodEnd))
      .limit(limit);
  }

  async getTargetHistoryWithStreak(targetId: number, userId: string, limit: number = 30): Promise<TargetHistoryWithStreak> {
    const history = await this.getTargetHistory(targetId, userId, limit);
    
    let currentStreak = 0;
    for (const entry of history) {
      if (entry.completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { history, currentStreak };
  }

  async calculateAndSaveTargetHistory(targetId: number, userId: string, periodsBack: number = 7): Promise<TargetHistory[]> {
    const target = await db
      .select()
      .from(targets)
      .where(and(eq(targets.id, targetId), eq(targets.userId, userId)))
      .limit(1);

    if (!target.length) {
      return [];
    }

    const t = target[0];
    const userDeeds = await this.getDeeds(userId);
    const now = new Date();
    
    // Convert to user's timezone for accurate period calculations
    const nowInUserTz = toZonedTime(now, DEFAULT_TIMEZONE);
    
    const periodBoundaries: Array<{ periodStart: Date; periodEnd: Date }> = [];
    for (let i = 1; i <= periodsBack; i++) {
      let periodStart: Date;
      let periodEnd: Date;

      switch (t.period) {
        case "daily":
          const dayInUserTz = subDays(nowInUserTz, i);
          periodStart = fromZonedTime(startOfDay(dayInUserTz), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfDay(dayInUserTz), DEFAULT_TIMEZONE);
          break;
        case "weekly":
          const weekInUserTz = subWeeks(nowInUserTz, i);
          periodStart = fromZonedTime(startOfWeek(weekInUserTz, { weekStartsOn: 1 }), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfWeek(weekInUserTz, { weekStartsOn: 1 }), DEFAULT_TIMEZONE);
          break;
        case "monthly":
          const monthInUserTz = subMonths(nowInUserTz, i);
          periodStart = fromZonedTime(startOfMonth(monthInUserTz), DEFAULT_TIMEZONE);
          periodEnd = fromZonedTime(endOfMonth(monthInUserTz), DEFAULT_TIMEZONE);
          break;
        default:
          continue;
      }
      periodBoundaries.push({ periodStart, periodEnd });
    }

    // Filter out periods that end before the target was created
    // We use periodEnd so that the period containing the creation date is included
    const targetCreatedAt = t.createdAt ? new Date(t.createdAt) : new Date();
    const validPeriods = periodBoundaries.filter(({ periodEnd }) => periodEnd >= targetCreatedAt);

    if (validPeriods.length === 0) {
      return [];
    }

    const oldestPeriodStart = validPeriods[validPeriods.length - 1].periodStart;
    const newestPeriodEnd = validPeriods[0].periodEnd;
    
    await db
      .delete(targetHistory)
      .where(and(
        eq(targetHistory.targetId, targetId),
        eq(targetHistory.userId, userId),
        gte(targetHistory.periodStart, oldestPeriodStart),
        lte(targetHistory.periodEnd, newestPeriodEnd)
      ));

    const savedHistory: TargetHistory[] = [];
    
    const isLimitTarget = t.targetType === "limit";
    
    for (const { periodStart, periodEnd } of validPeriods) {
      const deedsInPeriod = userDeeds.filter((deed) => {
        const deedDate = new Date(deed.createdAt || now);
        const inPeriod = deedDate >= periodStart && deedDate <= periodEnd;
        const matchesCategory = matchesFastingCategories(deed.category, t.category) || deed.category === t.category;
        
        // For dzikir targets with specific type, also match dzikirType
        const matchesDzikirType = !t.dzikirType || deed.dzikirType === t.dzikirType;
        // For sholat targets with specific type, also match sholatType
        const matchesSholatType = !t.sholatType || deed.sholatType === t.sholatType;
        // For fasting targets with specific type, also match fastingType
        const matchesFastingType = !t.fastingType || deed.fastingType === t.fastingType;
        const matchesQuranUnit = !t.quranUnit || deed.quranUnit === t.quranUnit;
        const matchesSedekahType = !t.sedekahType || deed.sedekahType === t.sedekahType;
        const matchesCustomUnit = !t.customUnit || deed.customUnit === t.customUnit || !deed.customUnit;
        const matchesIsJamaah = t.isJamaah === null || t.isJamaah === undefined || deed.isJamaah === t.isJamaah;
        
        return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && matchesQuranUnit && matchesSedekahType && matchesIsJamaah && matchesCustomUnit && inPeriod;
      });

      const achievedValue = deedsInPeriod.reduce((sum, deed) => sum + (deed.quantity || 1), 0);
      
      // For limit targets: success means staying at or below the limit
      // For achievement targets: success means reaching or exceeding the target
      const completed = isLimitTarget 
        ? achievedValue <= t.targetValue 
        : achievedValue >= t.targetValue;

      const [entry] = await db
        .insert(targetHistory)
        .values({
          targetId,
          userId,
          category: t.category,
          dzikirType: t.dzikirType,
          sholatType: t.sholatType,
          fastingType: t.fastingType,
          periodStart,
          periodEnd,
          achievedValue,
          targetValue: t.targetValue,
          targetType: t.targetType,
          completed,
        })
        .returning();

      savedHistory.push(entry);
    }

    return savedHistory.sort((a, b) => 
      new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
    );
  }

  async getDeedsForTargetOnDate(targetId: number, userId: string, dateStr: string): Promise<Deed[]> {
    const target = await db
      .select()
      .from(targets)
      .where(and(eq(targets.id, targetId), eq(targets.userId, userId)))
      .limit(1);

    if (!target.length) {
      return [];
    }

    const t = target[0];
    const dateInUserTz = new Date(dateStr + "T00:00:00");
    const dayStart = fromZonedTime(startOfDay(dateInUserTz), DEFAULT_TIMEZONE);
    const dayEnd = fromZonedTime(endOfDay(dateInUserTz), DEFAULT_TIMEZONE);

    const userDeeds = await db
      .select()
      .from(deeds)
      .where(
        and(
          eq(deeds.userId, userId),
          gte(deeds.createdAt, dayStart),
          lte(deeds.createdAt, dayEnd)
        )
      );

    return userDeeds.filter((deed) => {
      const matchesCategory = matchesFastingCategories(deed.category, t.category) || deed.category === t.category;
      const matchesDzikirType = !t.dzikirType || deed.dzikirType === t.dzikirType;
      const matchesSholatType = !t.sholatType || deed.sholatType === t.sholatType;
      const matchesFastingType = !t.fastingType || deed.fastingType === t.fastingType;
      const matchesQuranUnit = !t.quranUnit || deed.quranUnit === t.quranUnit;
      const matchesSedekahType = !t.sedekahType || deed.sedekahType === t.sedekahType;
      const matchesIsJamaah = t.isJamaah === null || t.isJamaah === undefined || deed.isJamaah === t.isJamaah;
      const matchesCustomUnit = !t.customUnit || deed.customUnit === t.customUnit || !deed.customUnit;
      return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && matchesQuranUnit && matchesSedekahType && matchesIsJamaah && matchesCustomUnit;
    });
  }

  async getPushSubscription(userId: string): Promise<PushSubscription | null> {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .limit(1);
    return subscription || null;
  }

  async savePushSubscription(userId: string, subscription: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await this.getPushSubscription(userId);
    
    if (existing) {
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          dailyReminder: subscription.dailyReminder ?? existing.dailyReminder,
          reminderTime: subscription.reminderTime ?? existing.reminderTime,
          timezone: subscription.timezone ?? existing.timezone,
          targetAlerts: subscription.targetAlerts ?? existing.targetAlerts,
          sholatReminder: subscription.sholatReminder ?? existing.sholatReminder,
          latitude: subscription.latitude ?? existing.latitude,
          longitude: subscription.longitude ?? existing.longitude,
        })
        .where(eq(pushSubscriptions.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(pushSubscriptions)
      .values({ ...subscription, userId })
      .returning();
    return created;
  }

  async updatePushSubscriptionSettings(userId: string, settings: Partial<InsertPushSubscription>): Promise<PushSubscription | null> {
    const existing = await this.getPushSubscription(userId);
    if (!existing) return null;
    
    const [updated] = await db
      .update(pushSubscriptions)
      .set(settings)
      .where(eq(pushSubscriptions.userId, userId))
      .returning();
    return updated;
  }

  async deletePushSubscription(userId: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }
}

export const storage = new DatabaseStorage();
