import { db } from "./db";
import { deeds, type InsertDeed, type Deed } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getDeeds(userId: string): Promise<Deed[]>;
  createDeed(userId: string, deed: InsertDeed): Promise<Deed>;
  deleteDeed(id: number, userId: string): Promise<void>;
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
    const [deed] = await db
      .insert(deeds)
      .values({ ...insertDeed, userId })
      .returning();
    return deed;
  }

  async deleteDeed(id: number, userId: string): Promise<void> {
    await db
      .delete(deeds)
      .where(and(eq(deeds.id, id), eq(deeds.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
