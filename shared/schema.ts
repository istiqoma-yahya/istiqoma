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
  isProtected: boolean("is_protected").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deeds = pgTable("deeds", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  deedType: text("deed_type", { enum: ["good", "bad"] }).notNull(),
  category: text("category").notNull(),
  points: integer("points").notNull().default(1),
  dzikirType: text("dzikir_type"),
  sholatType: text("sholat_type"),
  fastingType: text("fasting_type"),
  isJamaah: boolean("is_jamaah"),
  quranUnit: text("quran_unit"),
  sedekahType: text("sedekah_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  targetValue: integer("target_value").notNull(),
  period: text("period", { enum: ["daily", "weekly", "monthly"] }),
  targetType: text("target_type", { enum: ["achievement", "limit"] }).notNull().default("achievement"),
  recurrence: text("recurrence", { enum: ["recurring", "oneTime"] }).notNull().default("recurring"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  manualProgress: integer("manual_progress").default(0),
  unitLabel: text("unit_label"),
  dzikirType: text("dzikir_type"),
  sholatType: text("sholat_type"),
  fastingType: text("fasting_type"),
  isJamaah: boolean("is_jamaah"),
  quranUnit: text("quran_unit"),
  sedekahType: text("sedekah_type"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const targetHistory = pgTable("target_history", {
  id: serial("id").primaryKey(),
  targetId: integer("target_id").notNull().references(() => targets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  dzikirType: text("dzikir_type"),
  sholatType: text("sholat_type"),
  fastingType: text("fasting_type"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  achievedValue: integer("achieved_value").notNull(),
  targetValue: integer("target_value").notNull(),
  targetType: text("target_type", { enum: ["achievement", "limit"] }).notNull().default("achievement"),
  completed: boolean("completed").notNull(),
  capturedAt: timestamp("captured_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  dailyReminder: boolean("daily_reminder").notNull().default(true),
  reminderTime: text("reminder_time").notNull().default("08:00"),
  targetAlerts: boolean("target_alerts").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeedSchema = createInsertSchema(deeds).pick({
  description: true,
  deedType: true,
  category: true,
  points: true,
  dzikirType: true,
  sholatType: true,
  fastingType: true,
  isJamaah: true,
  quranUnit: true,
  sedekahType: true,
  createdAt: true,
}).extend({
  createdAt: z.coerce.date().optional(),
  dzikirType: z.string().optional(),
  sholatType: z.string().optional(),
  fastingType: z.string().optional(),
  isJamaah: z.boolean().optional(),
  quranUnit: z.enum(["ayat", "halaman", "surat", "juz"]).optional(),
  sedekahType: z.enum(["uang", "hitungan"]).optional(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  isProtected: true,
}).extend({
  isProtected: z.boolean().optional().default(false),
});

export const insertTargetSchema = createInsertSchema(targets).pick({
  category: true,
  targetValue: true,
  period: true,
  targetType: true,
  recurrence: true,
  startDate: true,
  dueDate: true,
  unitLabel: true,
  dzikirType: true,
  sholatType: true,
  fastingType: true,
  isJamaah: true,
  quranUnit: true,
  sedekahType: true,
}).extend({
  category: z.string().min(1, "Category is required"),
  targetValue: z.number().min(0, "Target value must be at least 0"),
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
  targetType: z.enum(["achievement", "limit"]).default("achievement"),
  recurrence: z.enum(["recurring", "oneTime"]).default("recurring"),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  unitLabel: z.string().optional(),
  dzikirType: z.string().optional(),
  sholatType: z.string().optional(),
  fastingType: z.string().optional(),
  isJamaah: z.boolean().optional(),
  quranUnit: z.enum(["ayat", "halaman", "surat", "juz"]).optional(),
  sedekahType: z.enum(["uang", "hitungan"]).optional(),
});

export const insertTargetHistorySchema = createInsertSchema(targetHistory).pick({
  targetId: true,
  userId: true,
  category: true,
  dzikirType: true,
  sholatType: true,
  fastingType: true,
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

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).pick({
  endpoint: true,
  p256dh: true,
  auth: true,
  dailyReminder: true,
  reminderTime: true,
  targetAlerts: true,
}).extend({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  dailyReminder: z.boolean().optional().default(true),
  reminderTime: z.string().optional().default("08:00"),
  targetAlerts: z.boolean().optional().default(true),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
