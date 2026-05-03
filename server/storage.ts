import { db } from "./db";
export { db };
import { deeds, categories, targets, targetFolders, targetHistory, pushSubscriptions, customDzikirTypes, userOnboarding, streakFreezes, pointPurchases, userStreakState, getPackByCount, users, quranBookmarks, quranReadingState, quranMemorizations, quranMemorizationAwards, type InsertDeed, type Deed, type Category, type InsertCategory, type Target, type InsertTarget, type TargetFolder, type InsertTargetFolder, type TargetWithProgress, type TargetHistory, type InsertTargetHistory, type PushSubscription, type InsertPushSubscription, type CustomDzikirType, type UserOnboarding, type InsertUserOnboarding, type StreakFreezerPackSize, type QuranBookmark, type InsertQuranBookmark, type QuranReadingState, type UpsertQuranReadingState, type QuranMemorization, type InsertQuranMemorization } from "@shared/schema";
import { eq, desc, and, asc, sql, gte, lte, isNull } from "drizzle-orm";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Default timezone for users (Indonesia)
const DEFAULT_TIMEZONE = "Asia/Jakarta";

// Validate an IANA timezone string. Returns the string if valid, otherwise undefined.
function validateTimezone(tz: unknown): string | undefined {
  if (!tz || typeof tz !== "string") return undefined;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

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
  findSholatDeedByLocalDate(userId: string, sholatType: string, localDate: string): Promise<Deed | null>;
  deleteDeed(id: number, userId: string): Promise<void>;
  updateDeed(id: number, userId: string, deed: InsertDeed): Promise<Deed>;
  getCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, category: InsertCategory): Promise<Category>;
  deleteCategory(id: number, userId: string): Promise<void>;
  updateCategory(id: number, userId: string, name: string): Promise<Category>;
  reorderCategories(userId: string, orderedIds: number[]): Promise<Category[]>;
  markCategoryProtected(id: number, userId: string): Promise<void>;
  getTargets(userId: string): Promise<Target[]>;
  getTargetsWithProgress(userId: string, timezone?: string): Promise<TargetWithProgress[]>;
  createTarget(userId: string, target: InsertTarget): Promise<Target>;
  updateTarget(id: number, userId: string, target: Partial<InsertTarget>): Promise<Target>;
  deleteTarget(id: number, userId: string): Promise<void>;
  getTargetFolders(userId: string): Promise<TargetFolder[]>;
  createTargetFolder(userId: string, folder: InsertTargetFolder): Promise<TargetFolder>;
  updateTargetFolder(id: number, userId: string, folder: InsertTargetFolder): Promise<TargetFolder | undefined>;
  deleteTargetFolder(id: number, userId: string): Promise<boolean>;
  moveTargetToFolder(targetId: number, userId: string, folderId: number | null): Promise<Target>;
  getTargetHistory(targetId: number, userId: string, limit?: number): Promise<TargetHistory[]>;
  getTargetHistoryWithStreak(targetId: number, userId: string, limit?: number): Promise<TargetHistoryWithStreak>;
  calculateAndSaveTargetHistory(targetId: number, userId: string, periodsBack?: number, timezone?: string): Promise<TargetHistory[]>;
  getDeedsForTargetOnDate(targetId: number, userId: string, dateStr: string, timezone?: string): Promise<Deed[]>;
  getDailyBreakdown(targetId: number, userId: string, startDate: string, endDate: string, timezone?: string): Promise<{ date: string; quantity: number }[]>;
  getPushSubscription(userId: string): Promise<PushSubscription | null>;
  savePushSubscription(userId: string, subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscriptionSettings(userId: string, settings: Partial<InsertPushSubscription>): Promise<PushSubscription | null>;
  deletePushSubscription(userId: string): Promise<void>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  getCustomDzikirTypes(userId: string): Promise<CustomDzikirType[]>;
  createCustomDzikirType(userId: string, label: string): Promise<CustomDzikirType>;
  updateCustomDzikirType(id: number, userId: string, label: string): Promise<CustomDzikirType>;
  deleteCustomDzikirType(id: number, userId: string): Promise<void>;
  getUserOnboarding(userId: string): Promise<UserOnboarding | null>;
  upsertUserOnboarding(userId: string, data: InsertUserOnboarding): Promise<UserOnboarding>;
  getStreakFreezerBalance(userId: string): Promise<{ owned: number; used: number; available: number }>;
  getPointsBalance(userId: string): Promise<{ earned: number; spent: number; available: number }>;
  getFrozenDates(userId: string): Promise<Set<string>>;
  getFreezerEntries(userId: string): Promise<{ date: string; refundedAt: string | null }[]>;
  consumeFreezerForDate(userId: string, dateStr: string): Promise<boolean>;
  refundFreezerForDate(userId: string, dateStr: string): Promise<boolean>;
  getStreakFloor(userId: string): Promise<string | null>;
  setStreakFloor(userId: string, dateStr: string): Promise<void>;
  purchaseStreakFreezers(userId: string, packSize: StreakFreezerPackSize): Promise<{
    freezer: { owned: number; used: number; available: number };
    points: { earned: number; spent: number; available: number };
    purchased: { packSize: number; pointsCost: number; freezersGranted: number };
  }>;
  getQuranBookmarks(userId: string): Promise<QuranBookmark[]>;
  addQuranBookmark(userId: string, bookmark: InsertQuranBookmark): Promise<QuranBookmark>;
  removeQuranBookmark(userId: string, surahNumber: number, verseNumber: number): Promise<void>;
  getQuranReadingState(userId: string): Promise<QuranReadingState | null>;
  upsertQuranReadingState(userId: string, data: UpsertQuranReadingState): Promise<QuranReadingState>;
  getQuranMemorizations(userId: string, surahNumber?: number): Promise<QuranMemorization[]>;
  addQuranMemorization(userId: string, data: InsertQuranMemorization): Promise<QuranMemorization>;
  removeQuranMemorization(userId: string, surahNumber: number, verseNumber: number): Promise<void>;
  hasQuranMemorizationAward(userId: string, surahNumber: number, verseNumber: number): Promise<boolean>;
  recordQuranMemorizationAward(userId: string, surahNumber: number, verseNumber: number, deedId: number): Promise<boolean>;
  getLeaderboard(
    currentUserId: string,
    period: "daily" | "monthly" | "yearly",
    opts: { mode: "around" | "before" | "after"; cursor: number | null; limit: number; timezone?: string },
  ): Promise<{
    entries: LeaderboardEntry[];
    me: { rank: number; points: number } | null;
    total: number;
  }>;
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string | null;
  email: string | null;
  profileImageUrl: string | null;
  points: number;
};

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

  // Idempotency lookup for Sholat Fardhu deeds. Each (user, prayer, local
  // calendar date) tuple should map to at most one deed. This lets the POST
  // route short-circuit duplicate creates from rapid taps, retries, or stale
  // client caches without ever inserting a second row.
  async findSholatDeedByLocalDate(
    userId: string,
    sholatType: string,
    localDate: string,
  ): Promise<Deed | null> {
    const rows = await db
      .select()
      .from(deeds)
      .where(
        and(
          eq(deeds.userId, userId),
          eq(deeds.category, "Sholat Fardhu"),
          eq(deeds.sholatType, sholatType),
          eq(deeds.localDate, localDate),
        ),
      )
      .orderBy(asc(deeds.id))
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteDeed(id: number, userId: string): Promise<void> {
    await db
      .delete(deeds)
      .where(and(eq(deeds.id, id), eq(deeds.userId, userId)));
  }

  async updateDeed(id: number, userId: string, updateDeed: InsertDeed): Promise<Deed> {
    const values: any = { ...updateDeed, editCount: sql`${deeds.editCount} + 1` };
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

  async getTargetsWithProgress(userId: string, timezone?: string): Promise<TargetWithProgress[]> {
    const userTargets = await this.getTargets(userId);
    const userDeeds = await this.getDeeds(userId);
    const now = new Date();
    const tz = await this.resolveUserTimezone(userId, timezone);

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
      const nowInUserTz = toZonedTime(now, tz);

      switch (target.period) {
        case "daily":
          // Calculate start/end of day in user's timezone, then convert back to UTC
          periodStart = fromZonedTime(startOfDay(nowInUserTz), tz);
          periodEnd = fromZonedTime(endOfDay(nowInUserTz), tz);
          break;
        case "weekly":
          periodStart = fromZonedTime(startOfWeek(nowInUserTz, { weekStartsOn: 1 }), tz);
          periodEnd = fromZonedTime(endOfWeek(nowInUserTz, { weekStartsOn: 1 }), tz);
          break;
        case "monthly":
          periodStart = fromZonedTime(startOfMonth(nowInUserTz), tz);
          periodEnd = fromZonedTime(endOfMonth(nowInUserTz), tz);
          break;
        default:
          periodStart = fromZonedTime(startOfDay(nowInUserTz), tz);
          periodEnd = fromZonedTime(endOfDay(nowInUserTz), tz);
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

  private async assertFolderOwnership(folderId: number | null | undefined, userId: string): Promise<void> {
    if (folderId == null) return;
    const [folder] = await db
      .select({ id: targetFolders.id })
      .from(targetFolders)
      .where(and(eq(targetFolders.id, folderId), eq(targetFolders.userId, userId)))
      .limit(1);
    if (!folder) {
      const err = new Error("Folder not found or not owned by user") as Error & { status?: number };
      err.status = 403;
      throw err;
    }
  }

  async createTarget(userId: string, insertTarget: InsertTarget): Promise<Target> {
    await this.assertFolderOwnership(insertTarget.folderId ?? null, userId);
    const [target] = await db
      .insert(targets)
      .values({ ...insertTarget, userId })
      .returning();
    return target;
  }

  async updateTarget(id: number, userId: string, updateTarget: Partial<InsertTarget>): Promise<Target> {
    if ("folderId" in updateTarget) {
      await this.assertFolderOwnership(updateTarget.folderId ?? null, userId);
    }
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

  async getTargetFolders(userId: string): Promise<TargetFolder[]> {
    return await db
      .select()
      .from(targetFolders)
      .where(eq(targetFolders.userId, userId))
      .orderBy(asc(targetFolders.sortOrder), asc(targetFolders.id));
  }

  async createTargetFolder(userId: string, insertFolder: InsertTargetFolder): Promise<TargetFolder> {
    const existing = await this.getTargetFolders(userId);
    const maxSortOrder = existing.length > 0 ? Math.max(...existing.map(f => f.sortOrder)) : -1;
    const [folder] = await db
      .insert(targetFolders)
      .values({
        ...insertFolder,
        userId,
        sortOrder: maxSortOrder + 1,
      })
      .returning();
    return folder;
  }

  async updateTargetFolder(id: number, userId: string, updateFolder: InsertTargetFolder): Promise<TargetFolder | undefined> {
    const [folder] = await db
      .update(targetFolders)
      .set({ name: updateFolder.name })
      .where(and(eq(targetFolders.id, id), eq(targetFolders.userId, userId)))
      .returning();
    return folder;
  }

  async deleteTargetFolder(id: number, userId: string): Promise<boolean> {
    // ON DELETE SET NULL on targets.folder_id keeps the targets but ungroups them.
    const deleted = await db
      .delete(targetFolders)
      .where(and(eq(targetFolders.id, id), eq(targetFolders.userId, userId)))
      .returning({ id: targetFolders.id });
    return deleted.length > 0;
  }

  async moveTargetToFolder(targetId: number, userId: string, folderId: number | null): Promise<Target> {
    await this.assertFolderOwnership(folderId, userId);
    const [target] = await db
      .update(targets)
      .set({ folderId })
      .where(and(eq(targets.id, targetId), eq(targets.userId, userId)))
      .returning();
    if (!target) {
      const err = new Error("Target not found") as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return target;
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

  private async resolveUserTimezone(userId: string, explicitTz?: string): Promise<string> {
    const validated = validateTimezone(explicitTz);
    if (validated) return validated;
    const sub = await this.getPushSubscription(userId);
    return validateTimezone(sub?.timezone) ?? DEFAULT_TIMEZONE;
  }

  async calculateAndSaveTargetHistory(targetId: number, userId: string, periodsBack: number = 7, timezone?: string): Promise<TargetHistory[]> {
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

    // Lock the timezone for this target's history to whatever was used the
    // first time we computed history for it. Otherwise, a user travelling or
    // toggling their device timezone would shift every future recalculation
    // onto a different calendar grid, retroactively breaking past streaks.
    //
    // The request timezone is only used as the seed when:
    //   - the target has no history rows yet (brand-new target), or
    //   - the most recent history row is a legacy pre-column row whose
    //     timezone is NULL (we don't fabricate a timezone for it — we trust
    //     the caller's current timezone instead of locking everyone to a
    //     hardcoded default that would mis-shift non-Jakarta users).
    const requestTz = await this.resolveUserTimezone(userId, timezone);
    const [existingForTz] = await db
      .select({ timezone: targetHistory.timezone })
      .from(targetHistory)
      .where(and(eq(targetHistory.targetId, targetId), eq(targetHistory.userId, userId)))
      .orderBy(desc(targetHistory.periodEnd))
      .limit(1);
    const tz = validateTimezone(existingForTz?.timezone) ?? requestTz;

    // Convert to user's timezone for accurate period calculations
    const nowInUserTz = toZonedTime(now, tz);
    
    const periodBoundaries: Array<{ periodStart: Date; periodEnd: Date }> = [];
    for (let i = 1; i <= periodsBack; i++) {
      let periodStart: Date;
      let periodEnd: Date;

      switch (t.period) {
        case "daily":
          const dayInUserTz = subDays(nowInUserTz, i);
          periodStart = fromZonedTime(startOfDay(dayInUserTz), tz);
          periodEnd = fromZonedTime(endOfDay(dayInUserTz), tz);
          break;
        case "weekly":
          const weekInUserTz = subWeeks(nowInUserTz, i);
          periodStart = fromZonedTime(startOfWeek(weekInUserTz, { weekStartsOn: 1 }), tz);
          periodEnd = fromZonedTime(endOfWeek(weekInUserTz, { weekStartsOn: 1 }), tz);
          break;
        case "monthly":
          const monthInUserTz = subMonths(nowInUserTz, i);
          periodStart = fromZonedTime(startOfMonth(monthInUserTz), tz);
          periodEnd = fromZonedTime(endOfMonth(monthInUserTz), tz);
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
          timezone: tz,
        })
        .returning();

      savedHistory.push(entry);
    }

    return savedHistory.sort((a, b) => 
      new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
    );
  }

  async getDeedsForTargetOnDate(targetId: number, userId: string, dateStr: string, timezone?: string): Promise<Deed[]> {
    const target = await db
      .select()
      .from(targets)
      .where(and(eq(targets.id, targetId), eq(targets.userId, userId)))
      .limit(1);

    if (!target.length) {
      return [];
    }

    const t = target[0];
    const tz = await this.resolveUserTimezone(userId, timezone);
    const dateInUserTz = new Date(dateStr + "T00:00:00");
    const dayStart = fromZonedTime(startOfDay(dateInUserTz), tz);
    const dayEnd = fromZonedTime(endOfDay(dateInUserTz), tz);

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

  async getDailyBreakdown(
    targetId: number,
    userId: string,
    startDate: string,
    endDate: string,
    timezone?: string,
  ): Promise<{ date: string; quantity: number }[]> {
    const targetRows = await db
      .select()
      .from(targets)
      .where(and(eq(targets.id, targetId), eq(targets.userId, userId)))
      .limit(1);

    if (!targetRows.length) return [];

    const t = targetRows[0];
    const tz = await this.resolveUserTimezone(userId, timezone);

    const rangeStart = fromZonedTime(startOfDay(new Date(startDate + "T00:00:00")), tz);
    const rangeEnd = fromZonedTime(endOfDay(new Date(endDate + "T00:00:00")), tz);

    const userDeeds = await db
      .select()
      .from(deeds)
      .where(
        and(
          eq(deeds.userId, userId),
          gte(deeds.createdAt, rangeStart),
          lte(deeds.createdAt, rangeEnd)
        )
      );

    const matchingDeeds = userDeeds.filter((deed) => {
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

    const byDay = new Map<string, number>();
    for (const deed of matchingDeeds) {
      const deedInUserTz = toZonedTime(new Date(deed.createdAt!), tz);
      const dateStr = format(deedInUserTz, "yyyy-MM-dd");
      byDay.set(dateStr, (byDay.get(dateStr) || 0) + (deed.quantity || 1));
    }

    return Array.from(byDay.entries()).map(([date, quantity]) => ({ date, quantity }));
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
    // Only persist a timezone value if it is a valid IANA identifier
    const sanitizedTimezone = validateTimezone(subscription.timezone) ?? existing?.timezone ?? null;
    
    if (existing) {
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          dailyReminder: subscription.dailyReminder ?? existing.dailyReminder,
          reminderTime: subscription.reminderTime ?? existing.reminderTime,
          timezone: sanitizedTimezone,
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
      .values({ ...subscription, userId, timezone: sanitizedTimezone })
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

  async getCustomDzikirTypes(userId: string): Promise<CustomDzikirType[]> {
    return await db
      .select()
      .from(customDzikirTypes)
      .where(eq(customDzikirTypes.userId, userId))
      .orderBy(asc(customDzikirTypes.createdAt));
  }

  async createCustomDzikirType(userId: string, label: string): Promise<CustomDzikirType> {
    const [created] = await db
      .insert(customDzikirTypes)
      .values({ userId, label })
      .returning();
    return created;
  }

  async updateCustomDzikirType(id: number, userId: string, label: string): Promise<CustomDzikirType> {
    const [existing] = await db
      .select()
      .from(customDzikirTypes)
      .where(and(eq(customDzikirTypes.id, id), eq(customDzikirTypes.userId, userId)))
      .limit(1);
    if (!existing) {
      const err = new Error("Custom dzikir type not found") as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const oldLabel = existing.label;

    const [updated] = await db
      .update(customDzikirTypes)
      .set({ label })
      .where(and(eq(customDzikirTypes.id, id), eq(customDzikirTypes.userId, userId)))
      .returning();

    if (oldLabel !== label) {
      await db
        .update(deeds)
        .set({ dzikirType: label })
        .where(and(eq(deeds.userId, userId), eq(deeds.dzikirType, oldLabel)));

      await db
        .update(targets)
        .set({ dzikirType: label })
        .where(and(eq(targets.userId, userId), eq(targets.dzikirType, oldLabel)));
    }

    return updated;
  }

  async deleteCustomDzikirType(id: number, userId: string): Promise<void> {
    await db
      .delete(customDzikirTypes)
      .where(and(eq(customDzikirTypes.id, id), eq(customDzikirTypes.userId, userId)));
  }

  async getUserOnboarding(userId: string): Promise<UserOnboarding | null> {
    const [row] = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, userId))
      .limit(1);
    return row || null;
  }

  async upsertUserOnboarding(userId: string, data: InsertUserOnboarding): Promise<UserOnboarding> {
    const now = new Date();
    const values = {
      userId,
      q1: data.q1,
      q2: data.q2,
      q3: data.q3,
      q4: data.q4,
      q5: data.q5,
      identityKey: data.identityKey,
      completed: true,
      completedAt: now,
      updatedAt: now,
    };
    const [row] = await db
      .insert(userOnboarding)
      .values(values)
      .onConflictDoUpdate({
        target: userOnboarding.userId,
        set: {
          q1: values.q1,
          q2: values.q2,
          q3: values.q3,
          q4: values.q4,
          q5: values.q5,
          identityKey: values.identityKey,
          completed: true,
          completedAt: now,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  // ─── Streak Freezer ────────────────────────────────────────────
  // All balances are computed from append-only ledgers (point_purchases,
  // streak_freezes) so no separate counter can drift. The unique index on
  // (user_id, frozen_date) is what makes consumeFreezerForDate safe under
  // concurrency — a duplicate insert raises 23505 and we treat that as a
  // no-op success (the date is already frozen).

  async getStreakFreezerBalance(userId: string): Promise<{ owned: number; used: number; available: number }> {
    const [grantedRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${pointPurchases.freezersGranted}), 0)::int` })
      .from(pointPurchases)
      .where(eq(pointPurchases.userId, userId));
    const [usedRow] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(streakFreezes)
      .where(and(eq(streakFreezes.userId, userId), isNull(streakFreezes.refundedAt)));
    const owned = Number(grantedRow?.total ?? 0);
    const used = Number(usedRow?.total ?? 0);
    return { owned, used, available: Math.max(0, owned - used) };
  }

  async getPointsBalance(userId: string): Promise<{ earned: number; spent: number; available: number }> {
    const [earnedRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${deeds.points}), 0)::int` })
      .from(deeds)
      .where(eq(deeds.userId, userId));
    const [spentRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${pointPurchases.pointsCost}), 0)::int` })
      .from(pointPurchases)
      .where(eq(pointPurchases.userId, userId));
    const earned = Number(earnedRow?.total ?? 0);
    const spent = Number(spentRow?.total ?? 0);
    return { earned, spent, available: Math.max(0, earned - spent) };
  }

  // Normalize a drizzle `date` column (which can come back as string or Date
   // depending on the driver path) to a strict YYYY-MM-DD string.
  private normalizeDateColumn(value: string | Date | null): string | null {
    if (value === null) return null;
    if (typeof value === "string") return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
  }

  // Acquire a per-user transaction-scoped advisory lock. Released
  // automatically at end of transaction. Serializes all freezer point
  // operations for this user, preventing read-then-insert races
  // (double-spend on rapid clicks, or two concurrent walks both
  // consuming the same one freezer).
  private async acquireUserFreezerLock(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`streak-freezer:${userId}`}, 0))`);
  }

  async getFrozenDates(userId: string): Promise<Set<string>> {
    const rows = await db
      .select({ d: streakFreezes.frozenDate })
      .from(streakFreezes)
      .where(and(eq(streakFreezes.userId, userId), isNull(streakFreezes.refundedAt)));
    return new Set(
      rows
        .map((r) => this.normalizeDateColumn(r.d))
        .filter((s): s is string => s !== null),
    );
  }

  async getFreezerEntries(userId: string): Promise<{ date: string; refundedAt: string | null }[]> {
    const rows = await db
      .select({ d: streakFreezes.frozenDate, refundedAt: streakFreezes.refundedAt })
      .from(streakFreezes)
      .where(eq(streakFreezes.userId, userId))
      .orderBy(asc(streakFreezes.frozenDate));
    return rows
      .map((r) => {
        const date = this.normalizeDateColumn(r.d);
        if (date === null) return null;
        return {
          date,
          refundedAt: r.refundedAt ? r.refundedAt.toISOString() : null,
        };
      })
      .filter((e): e is { date: string; refundedAt: string | null } => e !== null);
  }

  async getStreakFloor(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ d: userStreakState.floorDate })
      .from(userStreakState)
      .where(eq(userStreakState.userId, userId));
    return this.normalizeDateColumn(row?.d ?? null);
  }

  // Idempotent upsert. Always advances forward in time — i.e. if a more
   // recent floor already exists we keep that one rather than rolling it
   // back to an older date. This makes setStreakFloor safe to call from
   // anywhere in the walk without ordering concerns.
  async setStreakFloor(userId: string, dateStr: string): Promise<void> {
    await db
      .insert(userStreakState)
      .values({ userId, floorDate: dateStr, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userStreakState.userId,
        set: {
          floorDate: sql`GREATEST(${userStreakState.floorDate}, ${dateStr}::date)`,
          updatedAt: new Date(),
        },
      });
  }

  async consumeFreezerForDate(userId: string, dateStr: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await this.acquireUserFreezerLock(tx, userId);
      const [grantedRow] = await tx
        .select({ total: sql<number>`COALESCE(SUM(${pointPurchases.freezersGranted}), 0)::int` })
        .from(pointPurchases)
        .where(eq(pointPurchases.userId, userId));
      const [usedRow] = await tx
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(streakFreezes)
        .where(and(eq(streakFreezes.userId, userId), isNull(streakFreezes.refundedAt)));
      const available = Number(grantedRow?.total ?? 0) - Number(usedRow?.total ?? 0);
      if (available <= 0) return false;
      try {
        await tx.insert(streakFreezes).values({ userId, frozenDate: dateStr });
        return true;
      } catch (err: unknown) {
        // 23505 = unique_violation: another concurrent walk already froze
        // this same date. Treat as success — the date is frozen, no double charge.
        if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505") {
          return true;
        }
        throw err;
      }
    });
  }

  async refundFreezerForDate(userId: string, dateStr: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await this.acquireUserFreezerLock(tx, userId);
      const updated = await tx
        .update(streakFreezes)
        .set({ refundedAt: new Date() })
        .where(
          and(
            eq(streakFreezes.userId, userId),
            eq(streakFreezes.frozenDate, dateStr),
            isNull(streakFreezes.refundedAt),
          ),
        )
        .returning({ id: streakFreezes.id });
      return updated.length > 0;
    });
  }

  async purchaseStreakFreezers(userId: string, packSize: StreakFreezerPackSize) {
    const pack = getPackByCount(packSize);
    if (!pack) {
      const err = new Error(`Invalid pack size: ${packSize}`) as Error & { status?: number };
      err.status = 400;
      throw err;
    }
    return await db.transaction(async (tx) => {
      await this.acquireUserFreezerLock(tx, userId);
      const [earnedRow] = await tx
        .select({ total: sql<number>`COALESCE(SUM(${deeds.points}), 0)::int` })
        .from(deeds)
        .where(eq(deeds.userId, userId));
      const [spentRow] = await tx
        .select({ total: sql<number>`COALESCE(SUM(${pointPurchases.pointsCost}), 0)::int` })
        .from(pointPurchases)
        .where(eq(pointPurchases.userId, userId));
      const earned = Number(earnedRow?.total ?? 0);
      const spent = Number(spentRow?.total ?? 0);
      const available = Math.max(0, earned - spent);
      if (available < pack.cost) {
        const err = new Error("INSUFFICIENT_POINTS") as Error & {
          status?: number;
          code?: string;
          available?: number;
          required?: number;
        };
        err.status = 402;
        err.code = "INSUFFICIENT_POINTS";
        err.available = available;
        err.required = pack.cost;
        throw err;
      }
      await tx.insert(pointPurchases).values({
        userId,
        kind: "streak_freezer",
        packSize: pack.size,
        pointsCost: pack.cost,
        freezersGranted: pack.size,
      });
      const newSpent = spent + pack.cost;
      const newGranted = await tx
        .select({ total: sql<number>`COALESCE(SUM(${pointPurchases.freezersGranted}), 0)::int` })
        .from(pointPurchases)
        .where(eq(pointPurchases.userId, userId));
      const [usedRow] = await tx
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(streakFreezes)
        .where(and(eq(streakFreezes.userId, userId), isNull(streakFreezes.refundedAt)));
      const owned = Number(newGranted[0]?.total ?? 0);
      const used = Number(usedRow?.total ?? 0);
      return {
        freezer: { owned, used, available: Math.max(0, owned - used) },
        points: { earned, spent: newSpent, available: Math.max(0, earned - newSpent) },
        purchased: { packSize: pack.size, pointsCost: pack.cost, freezersGranted: pack.size },
      };
    });
  }

  // ─── Qur'an ──────────────────────────────────────────────────
  async getQuranBookmarks(userId: string): Promise<QuranBookmark[]> {
    return await db
      .select()
      .from(quranBookmarks)
      .where(eq(quranBookmarks.userId, userId))
      .orderBy(asc(quranBookmarks.surahNumber), asc(quranBookmarks.verseNumber));
  }

  async addQuranBookmark(userId: string, bookmark: InsertQuranBookmark): Promise<QuranBookmark> {
    // Idempotent: if the (user, surah, verse) row already exists, return it
    // instead of letting the unique index raise. Bookmark toggling on the
    // client should never error on a double-tap.
    const existing = await db
      .select()
      .from(quranBookmarks)
      .where(
        and(
          eq(quranBookmarks.userId, userId),
          eq(quranBookmarks.surahNumber, bookmark.surahNumber),
          eq(quranBookmarks.verseNumber, bookmark.verseNumber),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(quranBookmarks)
      .values({ userId, ...bookmark })
      .returning();
    return created;
  }

  async removeQuranBookmark(userId: string, surahNumber: number, verseNumber: number): Promise<void> {
    await db
      .delete(quranBookmarks)
      .where(
        and(
          eq(quranBookmarks.userId, userId),
          eq(quranBookmarks.surahNumber, surahNumber),
          eq(quranBookmarks.verseNumber, verseNumber),
        ),
      );
  }

  async getQuranReadingState(userId: string): Promise<QuranReadingState | null> {
    const [row] = await db
      .select()
      .from(quranReadingState)
      .where(eq(quranReadingState.userId, userId))
      .limit(1);
    return row || null;
  }

  async upsertQuranReadingState(userId: string, data: UpsertQuranReadingState): Promise<QuranReadingState> {
    const now = new Date();
    // Only overwrite columns the caller actually supplied. e.g. updating
    // just the reciter must not blow away the saved last-read position.
    const set: Record<string, unknown> = { updatedAt: now };
    if (data.lastSurahNumber !== undefined) set.lastSurahNumber = data.lastSurahNumber;
    if (data.lastVerseNumber !== undefined) set.lastVerseNumber = data.lastVerseNumber;
    if (data.preferredReciterId !== undefined) set.preferredReciterId = data.preferredReciterId;
    if (data.arabicFont !== undefined) set.arabicFont = data.arabicFont;
    if (data.arabicFontSize !== undefined) set.arabicFontSize = data.arabicFontSize;
    if (data.arabicLineHeight !== undefined) set.arabicLineHeight = data.arabicLineHeight;

    const [row] = await db
      .insert(quranReadingState)
      .values({
        userId,
        lastSurahNumber: data.lastSurahNumber ?? null,
        lastVerseNumber: data.lastVerseNumber ?? null,
        preferredReciterId: data.preferredReciterId ?? null,
        ...(data.arabicFont !== undefined ? { arabicFont: data.arabicFont } : {}),
        ...(data.arabicFontSize !== undefined ? { arabicFontSize: data.arabicFontSize } : {}),
        ...(data.arabicLineHeight !== undefined ? { arabicLineHeight: data.arabicLineHeight } : {}),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: quranReadingState.userId,
        set,
      })
      .returning();
    return row;
  }

  async getQuranMemorizations(userId: string, surahNumber?: number): Promise<QuranMemorization[]> {
    const where = surahNumber !== undefined
      ? and(eq(quranMemorizations.userId, userId), eq(quranMemorizations.surahNumber, surahNumber))
      : eq(quranMemorizations.userId, userId);
    return await db
      .select()
      .from(quranMemorizations)
      .where(where)
      .orderBy(asc(quranMemorizations.surahNumber), asc(quranMemorizations.verseNumber));
  }

  async addQuranMemorization(userId: string, data: InsertQuranMemorization): Promise<QuranMemorization> {
    // Idempotent: a re-tap of "mark memorized" should converge on the
    // existing row instead of raising on the unique index.
    const existing = await db
      .select()
      .from(quranMemorizations)
      .where(
        and(
          eq(quranMemorizations.userId, userId),
          eq(quranMemorizations.surahNumber, data.surahNumber),
          eq(quranMemorizations.verseNumber, data.verseNumber),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(quranMemorizations)
      .values({ userId, ...data })
      .returning();
    return created;
  }

  async removeQuranMemorization(userId: string, surahNumber: number, verseNumber: number): Promise<void> {
    await db
      .delete(quranMemorizations)
      .where(
        and(
          eq(quranMemorizations.userId, userId),
          eq(quranMemorizations.surahNumber, surahNumber),
          eq(quranMemorizations.verseNumber, verseNumber),
        ),
      );
  }

  async hasQuranMemorizationAward(userId: string, surahNumber: number, verseNumber: number): Promise<boolean> {
    const rows = await db
      .select({ id: quranMemorizationAwards.id })
      .from(quranMemorizationAwards)
      .where(
        and(
          eq(quranMemorizationAwards.userId, userId),
          eq(quranMemorizationAwards.surahNumber, surahNumber),
          eq(quranMemorizationAwards.verseNumber, verseNumber),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  // Insert an award ledger row. Uses ON CONFLICT DO NOTHING on the unique
  // (user, surah, verse) index so a concurrent second request can't create
  // a duplicate award. Returns true if this call inserted a fresh row
  // (i.e. caller should treat the deed as freshly awarded), false if the
  // award was already present.
  async recordQuranMemorizationAward(
    userId: string,
    surahNumber: number,
    verseNumber: number,
    deedId: number,
  ): Promise<boolean> {
    const inserted = await db
      .insert(quranMemorizationAwards)
      .values({ userId, surahNumber, verseNumber, deedId })
      .onConflictDoNothing({ target: [
        quranMemorizationAwards.userId,
        quranMemorizationAwards.surahNumber,
        quranMemorizationAwards.verseNumber,
      ] })
      .returning({ id: quranMemorizationAwards.id });
    return inserted.length > 0;
  }

  // ─── Leaderboard ─────────────────────────────────────────────
  // Ranks all users by deed points within the requested time window
  // (daily/monthly/yearly, computed in the user's local timezone) and
  // returns a windowed slice around a target rank. Users with 0 points
  // in the window are excluded from the ranking. Ties are broken
  // deterministically by user id (ROW_NUMBER) so ranks are stable
  // across requests.
  async getLeaderboard(
    currentUserId: string,
    period: "daily" | "monthly" | "yearly",
    opts: { mode: "around" | "before" | "after"; cursor: number | null; limit: number; timezone?: string },
  ): Promise<{
    entries: LeaderboardEntry[];
    me: { rank: number; points: number } | null;
    total: number;
  }> {
    const tz = await this.resolveUserTimezone(currentUserId, opts.timezone);
    const nowInTz = toZonedTime(new Date(), tz);
    let startUtc: Date;
    let endUtc: Date;
    switch (period) {
      case "daily":
        startUtc = fromZonedTime(startOfDay(nowInTz), tz);
        endUtc = fromZonedTime(endOfDay(nowInTz), tz);
        break;
      case "monthly":
        startUtc = fromZonedTime(startOfMonth(nowInTz), tz);
        endUtc = fromZonedTime(endOfMonth(nowInTz), tz);
        break;
      case "yearly":
        startUtc = fromZonedTime(startOfYear(nowInTz), tz);
        endUtc = fromZonedTime(endOfYear(nowInTz), tz);
        break;
    }

    // Resolve effective cursor first when mode = around and no cursor is
    // provided. We look up the current user's rank in this window so the
    // initial fetch is centered on them. If the user has no points in this
    // window (so no rank), default the window to the top of the board.
    let cursor = opts.cursor;
    let me: { rank: number; points: number } | null = null;
    if (opts.mode === "around" && cursor === null) {
      const meRows = await db.execute(sql`
        WITH user_points AS (
          SELECT u.id,
            COALESCE(SUM(CASE WHEN d.created_at >= ${startUtc} AND d.created_at <= ${endUtc} THEN d.points ELSE 0 END), 0)::int AS pts
          FROM ${users} u
          LEFT JOIN ${deeds} d ON d.user_id = u.id
          GROUP BY u.id
        ),
        ranked AS (
          SELECT id, pts,
            (ROW_NUMBER() OVER (ORDER BY pts DESC, id ASC))::int AS rank
          FROM user_points
          WHERE pts > 0
        )
        SELECT rank, pts FROM ranked WHERE id = ${currentUserId}
      `);
      const row = (meRows.rows ?? meRows)[0] as { rank?: number; pts?: number } | undefined;
      if (row && typeof row.rank === "number") {
        me = { rank: Number(row.rank), points: Number(row.pts ?? 0) };
        cursor = me.rank;
      } else {
        cursor = 1;
      }
    }

    const limit = Math.max(1, Math.min(100, opts.limit | 0 || 50));
    let lowRank: number;
    let highRank: number;
    switch (opts.mode) {
      case "around": {
        const half = Math.floor(limit / 2);
        const c = cursor ?? 1;
        lowRank = Math.max(1, c - half);
        highRank = c + half;
        break;
      }
      case "before": {
        const c = cursor ?? 1;
        lowRank = Math.max(1, c - limit);
        highRank = Math.max(1, c - 1);
        break;
      }
      case "after": {
        const c = cursor ?? 0;
        lowRank = c + 1;
        highRank = c + limit;
        break;
      }
    }

    // `users.username` is the SSO display field. Username-login users
    // intentionally have NULL there — their handle lives in
    // `username_logins`. COALESCE so both kinds of users get a name on
    // the leaderboard.
    const result = await db.execute(sql`
      WITH user_points AS (
        SELECT u.id,
          COALESCE(u.username, ul.username) AS username,
          u.email, u.profile_image_url,
          COALESCE(SUM(CASE WHEN d.created_at >= ${startUtc} AND d.created_at <= ${endUtc} THEN d.points ELSE 0 END), 0)::int AS pts
        FROM ${users} u
        LEFT JOIN username_logins ul ON ul.user_id = u.id
        LEFT JOIN ${deeds} d ON d.user_id = u.id
        GROUP BY u.id, ul.username
      ),
      ranked AS (
        SELECT id, username, email, profile_image_url, pts,
          (ROW_NUMBER() OVER (ORDER BY pts DESC, id ASC))::int AS rank
        FROM user_points
        WHERE pts > 0
      ),
      window_rows AS (
        SELECT * FROM ranked
        WHERE rank BETWEEN ${lowRank} AND ${highRank}
        ORDER BY rank
      )
      SELECT
        (SELECT COALESCE(json_agg(row_to_json(w) ORDER BY w.rank), '[]'::json) FROM window_rows w) AS entries,
        (SELECT row_to_json(m) FROM (SELECT rank, pts FROM ranked WHERE id = ${currentUserId}) m) AS me,
        (SELECT COUNT(*)::int FROM ranked) AS total
    `);

    const row = (result.rows ?? result)[0] as {
      entries: Array<{ id: string; username: string | null; email: string | null; profile_image_url: string | null; pts: number; rank: number }>;
      me: { rank: number; pts: number } | null;
      total: number;
    };

    const entries: LeaderboardEntry[] = (row.entries ?? []).map((r) => ({
      rank: Number(r.rank),
      userId: r.id,
      username: r.username,
      email: r.email,
      profileImageUrl: r.profile_image_url,
      points: Number(r.pts),
    }));

    if (!me && row.me) {
      me = { rank: Number(row.me.rank), points: Number(row.me.pts) };
    } else if (!me && opts.mode !== "around") {
      // Other modes might be called without me being computed; keep as null.
    }

    return { entries, me, total: Number(row.total ?? 0) };
  }
}

export const storage = new DatabaseStorage();
