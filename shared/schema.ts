import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export auth models
export * from "./models/auth";
import { users } from "./models/auth";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deeds = pgTable("deeds", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  deedType: text("deed_type", { enum: ["good", "bad"] }).notNull(),
  category: text("category").notNull(),
  points: integer("points").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeedSchema = createInsertSchema(deeds).pick({
  description: true,
  deedType: true,
  category: true,
  points: true,
  createdAt: true,
}).extend({
  createdAt: z.coerce.date().optional(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

export type InsertDeed = z.infer<typeof insertDeedSchema>;
export type Deed = typeof deeds.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type CreateDeedRequest = InsertDeed;
export type DeedResponse = Deed;
export type CreateCategoryRequest = InsertCategory;
export type CategoryResponse = Category;
