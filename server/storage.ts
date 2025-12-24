import { db } from "./db";
import { deeds, categories, targets, type InsertDeed, type Deed, type Category, type InsertCategory, type Target, type InsertTarget, type TargetWithProgress } from "@shared/schema";
import { eq, desc, and, asc, sql, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

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

      const deedsInPeriod = userDeeds.filter((deed) => {
        const deedDate = new Date(deed.createdAt || now);
        return (
          deed.category === target.category &&
          deed.deedType === "good" &&
          deedDate >= periodStart &&
          deedDate <= periodEnd
        );
      });

      const currentValue = deedsInPeriod.reduce((sum, deed) => sum + deed.points, 0);
      const percentComplete = Math.min(100, Math.round((currentValue / target.targetValue) * 100));

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
}

export const storage = new DatabaseStorage();
