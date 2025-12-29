import { db } from "./db";
import { deeds, categories, targets, targetHistory, type InsertDeed, type Deed, type Category, type InsertCategory, type Target, type InsertTarget, type TargetWithProgress, type TargetHistory, type InsertTargetHistory } from "@shared/schema";
import { eq, desc, and, asc, sql, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";

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
  getTargets(userId: string): Promise<Target[]>;
  getTargetsWithProgress(userId: string): Promise<TargetWithProgress[]>;
  createTarget(userId: string, target: InsertTarget): Promise<Target>;
  updateTarget(id: number, userId: string, target: InsertTarget): Promise<Target>;
  deleteTarget(id: number, userId: string): Promise<void>;
  getTargetHistory(targetId: number, userId: string, limit?: number): Promise<TargetHistory[]>;
  getTargetHistoryWithStreak(targetId: number, userId: string, limit?: number): Promise<TargetHistoryWithStreak>;
  calculateAndSaveTargetHistory(targetId: number, userId: string, periodsBack?: number): Promise<TargetHistory[]>;
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
    const values: any = { ...insertDeed, userId };
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
    const maxSortOrder = existing.length > 0 ? Math.max(...existing.map(c => c.sortOrder)) : -1;
    const [category] = await db
      .insert(categories)
      .values({ ...insertCategory, userId, sortOrder: maxSortOrder + 1 })
      .returning();
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
      let periodStart: Date;
      let periodEnd: Date;

      switch (target.period) {
        case "daily":
          periodStart = startOfDay(now);
          periodEnd = endOfDay(now);
          break;
        case "weekly":
          periodStart = startOfWeek(now, { weekStartsOn: 1 });
          periodEnd = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "monthly":
          periodStart = startOfMonth(now);
          periodEnd = endOfMonth(now);
          break;
        default:
          periodStart = startOfDay(now);
          periodEnd = endOfDay(now);
      }

      // For achievement targets: count good deeds
      // For limit targets: count bad deeds (or deeds in that category regardless of type for Maksiat)
      const isLimitTarget = target.targetType === "limit";
      
      const deedsInPeriod = userDeeds.filter((deed) => {
        const deedDate = new Date(deed.createdAt || now);
        const inPeriod = deedDate >= periodStart && deedDate <= periodEnd;
        const matchesCategory = deed.category === target.category;
        
        // For dzikir targets with specific type, also match dzikirType
        const matchesDzikirType = !target.dzikirType || deed.dzikirType === target.dzikirType;
        // For sholat targets with specific type, also match sholatType
        const matchesSholatType = !target.sholatType || deed.sholatType === target.sholatType;
        // For fasting targets with specific type, also match fastingType
        const matchesFastingType = !target.fastingType || deed.fastingType === target.fastingType;
        
        if (isLimitTarget) {
          // For limit targets, count all deeds in this category (typically bad deeds like Maksiat)
          return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && inPeriod;
        } else {
          // For achievement targets, only count good deeds
          return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && deed.deedType === "good" && inPeriod;
        }
      });

      const currentValue = deedsInPeriod.reduce((sum, deed) => sum + deed.points, 0);
      
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
    
    const periodBoundaries: Array<{ periodStart: Date; periodEnd: Date }> = [];
    for (let i = 1; i <= periodsBack; i++) {
      let periodStart: Date;
      let periodEnd: Date;

      switch (t.period) {
        case "daily":
          periodStart = startOfDay(subDays(now, i));
          periodEnd = endOfDay(subDays(now, i));
          break;
        case "weekly":
          periodStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          periodEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          break;
        case "monthly":
          periodStart = startOfMonth(subMonths(now, i));
          periodEnd = endOfMonth(subMonths(now, i));
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
        const matchesCategory = deed.category === t.category;
        
        // For dzikir targets with specific type, also match dzikirType
        const matchesDzikirType = !t.dzikirType || deed.dzikirType === t.dzikirType;
        // For sholat targets with specific type, also match sholatType
        const matchesSholatType = !t.sholatType || deed.sholatType === t.sholatType;
        // For fasting targets with specific type, also match fastingType
        const matchesFastingType = !t.fastingType || deed.fastingType === t.fastingType;
        
        if (isLimitTarget) {
          // For limit targets, count all deeds in this category
          return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && inPeriod;
        } else {
          // For achievement targets, only count good deeds
          return matchesCategory && matchesDzikirType && matchesSholatType && matchesFastingType && deed.deedType === "good" && inPeriod;
        }
      });

      const achievedValue = deedsInPeriod.reduce((sum, deed) => sum + deed.points, 0);
      
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
}

export const storage = new DatabaseStorage();
