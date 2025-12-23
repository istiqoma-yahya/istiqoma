import { db } from "./db";
import { deeds, categories, type InsertDeed, type Deed, type Category, type InsertCategory } from "@shared/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
