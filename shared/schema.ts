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
  sortOrder: integer("sort_order").notNull().default(0),
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

export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  targetValue: integer("target_value").notNull(),
  period: text("period", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  targetType: text("target_type", { enum: ["achievement", "limit"] }).notNull().default("achievement"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const targetHistory = pgTable("target_history", {
  id: serial("id").primaryKey(),
  targetId: integer("target_id").notNull().references(() => targets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  achievedValue: integer("achieved_value").notNull(),
  targetValue: integer("target_value").notNull(),
  targetType: text("target_type", { enum: ["achievement", "limit"] }).notNull().default("achievement"),
  completed: boolean("completed").notNull(),
  capturedAt: timestamp("captured_at").defaultNow(),
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

export const insertTargetSchema = createInsertSchema(targets).pick({
  category: true,
  targetValue: true,
  period: true,
  targetType: true,
}).extend({
  targetValue: z.number().min(0, "Target value must be at least 0"),
  period: z.enum(["daily", "weekly", "monthly"]),
  targetType: z.enum(["achievement", "limit"]).default("achievement"),
});

export const insertTargetHistorySchema = createInsertSchema(targetHistory).pick({
  targetId: true,
  userId: true,
  category: true,
  periodStart: true,
  periodEnd: true,
  achievedValue: true,
  targetValue: true,
  targetType: true,
  completed: true,
});

export type InsertDeed = z.infer<typeof insertDeedSchema>;
export type Deed = typeof deeds.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type TargetHistory = typeof targetHistory.$inferSelect;
export type InsertTargetHistory = z.infer<typeof insertTargetHistorySchema>;

export type CreateDeedRequest = InsertDeed;
export type DeedResponse = Deed;
export type CreateCategoryRequest = InsertCategory;
export type CategoryResponse = Category;
export type CreateTargetRequest = InsertTarget;
export type TargetResponse = Target;

export type TargetWithProgress = Target & {
  currentValue: number;
  percentComplete: number;
};
