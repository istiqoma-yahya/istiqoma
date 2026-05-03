import { pgTable, text, serial, integer, boolean, timestamp, varchar, doublePrecision, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Export auth models
export * from "./models/auth";
import { users } from "./models/auth";

// Re-export badges (catalog + user_badges table)
export * from "./badges";

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
  deedType: text("deed_type", { enum: ["good", "bad"] }).notNull().default("good"),
  category: text("category").notNull(),
  points: integer("points").notNull().default(1),
  quantity: integer("quantity").notNull().default(1),
  dzikirType: text("dzikir_type"),
  sholatType: text("sholat_type"),
  fastingType: text("fasting_type"),
  isJamaah: boolean("is_jamaah"),
  quranUnit: text("quran_unit"),
  sedekahType: text("sedekah_type"),
  customUnit: text("custom_unit"),
  editCount: integer("edit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  // Local calendar date (YYYY-MM-DD) the user assigned this deed to.
  // For Sholat Fardhu deeds this is the unique key with sholat_type and
  // user_id, preventing duplicate prayer marks for the same day even if
  // the client retries or has a stale cache.
  localDate: date("local_date"),
}, (table) => ({
  // Hard guarantee: at most one Sholat Fardhu deed per (user, prayer, day).
  // The application also performs a find-then-insert idempotency check, but
  // that is TOCTOU under concurrent requests. This partial unique index
  // closes the race by letting Postgres reject the second insert.
  uniqSholatPerDay: uniqueIndex("uniq_sholat_deed_per_day")
    .on(table.userId, table.sholatType, table.localDate)
    .where(sql`category = 'Sholat Fardhu' AND local_date IS NOT NULL AND sholat_type IS NOT NULL`),
}));

export const targetFolders = pgTable("target_folders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  folderId: integer("folder_id").references(() => targetFolders.id, { onDelete: "set null" }),
  name: text("name").default("Target"),
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
  customUnit: text("custom_unit"),
  notificationTimes: text("notification_times").array().default([]),
  intentionWhen: text("intention_when"),
  intentionWhere: text("intention_where"),
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
  // IANA timezone the periodStart/periodEnd boundaries were computed under.
  // Stored per-record so a later device timezone change cannot retroactively
  // shift historical period boundaries (which would silently break streaks).
  // Subsequent recalculations reuse the timezone already on file for this
  // target, keeping past period boundaries — and therefore streaks — stable.
  // NULLABLE on purpose: legacy rows written before this column existed are
  // left as NULL so the recalc path falls back to the user's
  // resolved request timezone instead of being locked to a wrong default.
  timezone: text("timezone"),
  capturedAt: timestamp("captured_at").defaultNow(),
});

export const customDzikirTypes = pgTable("custom_dzikir_types", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomDzikirTypeSchema = createInsertSchema(customDzikirTypes).pick({
  label: true,
}).extend({
  label: z.string().min(1, "Label is required").max(80, "Label is too long"),
});

export type CustomDzikirType = typeof customDzikirTypes.$inferSelect;
export type InsertCustomDzikirType = z.infer<typeof insertCustomDzikirTypeSchema>;

// ─── Streak Freezer ───────────────────────────────────────────
// Per-user streak invariants. `floorDate` is the "no-revive boundary":
// once a user's streak is broken on date D (no deed AND no freezer
// available at the time of the walk), we set floorDate = D. Subsequent
// streak reads stop the walk at floorDate, so later buying freezers
// CANNOT retroactively resurrect that broken streak. Pre-existing
// users (who have no row yet) get a floor lazily computed from their
// natural deed history on first read.
export const userStreakState = pgTable("user_streak_state", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  floorDate: date("floor_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// One row per (user, frozen calendar date). Source of truth for which past
// days were saved by an auto-consumed freezer. Unique constraint on
// (user_id, frozen_date) prevents the same date from being charged twice.
export const streakFreezes = pgTable("streak_freezes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  frozenDate: date("frozen_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Set when a freezer that was auto-consumed for this date is later
  // refunded — typically because the user backdated a deed onto the
  // frozen day. Refunded rows are excluded from the active "used" /
  // "available" balance and from getFrozenDates(), but kept on the
  // ledger so we can surface refund events on the Streak Freezer page.
  refundedAt: timestamp("refunded_at"),
}, (table) => ({
  uniqUserDate: uniqueIndex("uniq_streak_freeze_user_date").on(table.userId, table.frozenDate),
}));

// Append-only ledger of point spends. Currently only "streak_freezer" but
// the kind column lets us add more spend reasons later. We never store a
// running balance — all balances are derived by aggregation so they cannot
// drift.
export const pointPurchases = pgTable("point_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  kind: text("kind", { enum: ["streak_freezer"] }).notNull().default("streak_freezer"),
  packSize: integer("pack_size").notNull(),
  pointsCost: integer("points_cost").notNull(),
  freezersGranted: integer("freezers_granted").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Single source of truth for freezer pack pricing. Server validates against
// this same table the client renders, so prices cannot diverge.
export const STREAK_FREEZER_PACKS = [
  { size: 1, cost: 500, discountPercent: 0 },
  { size: 10, cost: 4500, discountPercent: 10 },
  { size: 25, cost: 10000, discountPercent: 20 },
  { size: 50, cost: 18750, discountPercent: 25 },
  { size: 100, cost: 35000, discountPercent: 30 },
] as const;

export type StreakFreezerPack = typeof STREAK_FREEZER_PACKS[number];
export type StreakFreezerPackSize = StreakFreezerPack["size"];

export const STREAK_FREEZER_PACK_SIZES = STREAK_FREEZER_PACKS.map((p) => p.size) as readonly StreakFreezerPackSize[];

export function getPackByCount(size: number): StreakFreezerPack | undefined {
  return STREAK_FREEZER_PACKS.find((p) => p.size === size);
}

export const insertStreakFreezeSchema = createInsertSchema(streakFreezes).pick({
  frozenDate: true,
}).extend({
  frozenDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "frozenDate must be YYYY-MM-DD"),
});

export const insertPointPurchaseSchema = createInsertSchema(pointPurchases).pick({
  kind: true,
  packSize: true,
  pointsCost: true,
  freezersGranted: true,
});

export type StreakFreeze = typeof streakFreezes.$inferSelect;
export type InsertStreakFreeze = z.infer<typeof insertStreakFreezeSchema>;
export type PointPurchase = typeof pointPurchases.$inferSelect;
export type InsertPointPurchase = z.infer<typeof insertPointPurchaseSchema>;

export const purchaseStreakFreezerSchema = z.object({
  packSize: z.union(
    STREAK_FREEZER_PACK_SIZES.map((s) => z.literal(s)) as unknown as [
      z.ZodLiteral<number>,
      z.ZodLiteral<number>,
      ...z.ZodLiteral<number>[]
    ],
  ),
});

export type PurchaseStreakFreezerRequest = z.infer<typeof purchaseStreakFreezerSchema>;

export const recommendationRateLimitCalls = pgTable("recommendation_rate_limit_calls", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  calledAt: timestamp("called_at").notNull().defaultNow(),
}, (table) => ({
  byUserAndTime: index("rec_rate_limit_user_time_idx").on(table.userId, table.calledAt),
}));

// Sliding-window rate limit ledger for the voice-deed parsing endpoint.
// Same Postgres-backed pattern as recommendationRateLimitCalls so a runaway
// client cannot burn AI credits across replicas/restarts.
export const voiceParseRateLimitCalls = pgTable("voice_parse_rate_limit_calls", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  calledAt: timestamp("called_at").notNull().defaultNow(),
}, (table) => ({
  byUserAndTime: index("voice_parse_rate_limit_user_time_idx").on(table.userId, table.calledAt),
}));

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  dailyReminder: boolean("daily_reminder").notNull().default(true),
  reminderTime: text("reminder_time").notNull().default("21:00"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  targetAlerts: boolean("target_alerts").notNull().default(true),
  sholatReminder: boolean("sholat_reminder").notNull().default(true),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  notificationSound: text("notification_sound").notNull().default("chime"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeedSchema = createInsertSchema(deeds).pick({
  description: true,
  deedType: true,
  category: true,
  points: true,
  quantity: true,
  dzikirType: true,
  sholatType: true,
  fastingType: true,
  isJamaah: true,
  quranUnit: true,
  sedekahType: true,
  customUnit: true,
  createdAt: true,
  localDate: true,
}).extend({
  deedType: z.enum(["good", "bad"]).optional(),
  createdAt: z.coerce.date().optional(),
  dzikirType: z.string().optional(),
  sholatType: z.string().optional(),
  fastingType: z.string().optional(),
  isJamaah: z.boolean().optional(),
  quranUnit: z.enum(["ayat", "halaman", "surat", "juz"]).optional(),
  sedekahType: z.enum(["uang", "hitungan"]).optional(),
  customUnit: z.enum(["hitungan", "ayat", "halaman", "surat", "juz", "rakaat", "hari", "uang", "times", "days"]).optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "localDate must be YYYY-MM-DD").optional(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  isProtected: true,
}).extend({
  isProtected: z.boolean().optional(),
});

export const insertTargetFolderSchema = createInsertSchema(targetFolders).pick({
  name: true,
}).extend({
  name: z.string().min(1, "Folder name is required").max(80, "Folder name is too long"),
});

export const insertTargetSchema = createInsertSchema(targets).pick({
  name: true,
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
  customUnit: true,
  notificationTimes: true,
  intentionWhen: true,
  intentionWhere: true,
  folderId: true,
}).extend({
  folderId: z.number().int().positive().nullish(),
  name: z.string().min(1, "Target name is required"),
  category: z.string().min(1, "Category is required"),
  targetValue: z.number().min(0, "Target value must be at least 0"),
  period: z.enum(["daily", "weekly", "monthly"]).nullish(),
  targetType: z.enum(["achievement", "limit"]).default("achievement"),
  recurrence: z.enum(["recurring", "oneTime"]).default("recurring"),
  startDate: z.coerce.date().nullish(),
  dueDate: z.coerce.date().nullish(),
  unitLabel: z.string().optional(),
  dzikirType: z.string().optional(),
  sholatType: z.string().optional(),
  fastingType: z.string().optional(),
  isJamaah: z.boolean().optional(),
  quranUnit: z.enum(["ayat", "halaman", "surat", "juz"]).optional(),
  sedekahType: z.enum(["uang", "hitungan"]).optional(),
  customUnit: z.enum(["hitungan", "ayat", "halaman", "surat", "juz", "rakaat", "hari", "uang", "times", "days"]).optional(),
  notificationTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(5).optional().default([]),
  intentionWhen: z.string().max(120).optional().nullable(),
  intentionWhere: z.string().max(120).optional().nullable(),
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
  timezone: true,
});

export type InsertDeed = z.infer<typeof insertDeedSchema>;
export type Deed = typeof deeds.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type TargetFolder = typeof targetFolders.$inferSelect;
export type InsertTargetFolder = z.infer<typeof insertTargetFolderSchema>;
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
  timezone: true,
  targetAlerts: true,
  sholatReminder: true,
  latitude: true,
  longitude: true,
  notificationSound: true,
}).extend({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  dailyReminder: z.boolean().optional().default(true),
  reminderTime: z.string().optional().default("21:00"),
  timezone: z.string().optional().default("Asia/Jakarta"),
  targetAlerts: z.boolean().optional().default(true),
  sholatReminder: z.boolean().optional().default(true),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notificationSound: z.enum(["chime", "double", "ding", "none"]).optional().default("chime"),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// ─── Onboarding ───────────────────────────────────────────────
export const userOnboarding = pgTable("user_onboarding", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  q1: text("q1"),
  q2: text("q2"),
  q3: text("q3").array().default([]),
  q4: text("q4"),
  q5: text("q5"),
  identityKey: text("identity_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const Q1_VALUES = ["pemula", "naik-turun", "cukup-baik", "tingkatkan"] as const;
export const Q2_VALUES = ["lupa", "males", "tidak-tahu", "sibuk"] as const;
export const Q3_VALUES = [
  "baca-quran",
  "dzikir",
  "sholat-fardhu",
  "sholat-sunnah",
  "puasa",
  "hafalan-quran",
  "birrul-walidayn",
  "shodaqoh",
  "tolabul-ilmi",
] as const;
export const Q4_VALUES = ["subuh", "ashar", "isya", "tidur"] as const;
export const Q5_VALUES = ["dekat-allah", "bermanfaat", "berilmu", "istiqomah", "keluarga"] as const;

// Single source of truth for the onboarding Q4 → daily reminder time
// mapping. Used by the onboarding upsert path (server) and any UI that
// needs to display when the reminder will fire if the user picks a given
// Q4 answer. Keeping this mapping in one place ensures the Settings edit
// flow updates push_subscriptions.reminder_time the same way the original
// onboarding did.
export const Q4_TO_REMINDER_TIME: Record<(typeof Q4_VALUES)[number], string> = {
  subuh: "05:30",
  ashar: "16:00",
  isya: "20:00",
  tidur: "22:00",
};

export const insertUserOnboardingSchema = createInsertSchema(userOnboarding)
  .omit({ userId: true, createdAt: true, updatedAt: true, completed: true, completedAt: true })
  .extend({
    q1: z.enum(Q1_VALUES),
    q2: z.enum(Q2_VALUES),
    q3: z.array(z.enum(Q3_VALUES)).min(1, "Pick at least one"),
    q4: z.enum(Q4_VALUES),
    q5: z.enum(Q5_VALUES),
    identityKey: z.enum(Q5_VALUES),
  });

export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type InsertUserOnboarding = z.infer<typeof insertUserOnboardingSchema>;

// ─── Target Recommendations (LLM-backed) ──────────────────────
// Citations are restricted server-side to Quran, Sahih al-Bukhari, or
// Sahih Muslim. Any item the model returns with a different `source.kind`
// is dropped before responding to the client.
export const RECOMMENDATION_LANGUAGES = ["id", "en", "ms"] as const;
export type RecommendationLanguage = (typeof RECOMMENDATION_LANGUAGES)[number];

export const RECOMMENDATION_SOURCE_KINDS = ["quran", "bukhari", "muslim"] as const;
export type RecommendationSourceKind = (typeof RECOMMENDATION_SOURCE_KINDS)[number];

export const RECOMMENDATION_CATEGORIES = [
  "Sholat Fardhu",
  "Sholat Sunnah",
  "Dzikir",
  "Puasa",
  "Baca Quran",
  "Shodaqoh",
  "Birrul Walidayn",
  "Tolabul Ilmi",
] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

// Maps onboarding Q3 focus picks to the recommendation category that should
// surface for that pick. Both client and server import this so prompts and
// hints stay in lockstep with the onboarding choices.
export const Q3_TO_CATEGORY: Record<(typeof Q3_VALUES)[number], RecommendationCategory> = {
  "baca-quran": "Baca Quran",
  dzikir: "Dzikir",
  "sholat-fardhu": "Sholat Fardhu",
  "sholat-sunnah": "Sholat Sunnah",
  puasa: "Puasa",
  "hafalan-quran": "Baca Quran",
  "birrul-walidayn": "Birrul Walidayn",
  shodaqoh: "Shodaqoh",
  "tolabul-ilmi": "Tolabul Ilmi",
};

export const recommendationSourceSchema = z.object({
  kind: z.enum(RECOMMENDATION_SOURCE_KINDS),
  reference: z.string().min(1).max(200),
  arabic: z.string().min(1).max(4000),
  translation: z.string().min(1).max(4000),
});

export const targetRecommendationSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  category: z.enum(RECOMMENDATION_CATEGORIES),
  targetValue: z.number().int().min(1).max(100000),
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrence: z.enum(["recurring", "oneTime"]).default("recurring"),
  dzikirType: z.string().max(120).optional(),
  sholatType: z.string().max(60).optional(),
  fastingType: z.string().max(60).optional(),
  isJamaah: z.boolean().optional(),
  quranUnit: z.enum(["ayat", "halaman", "surat", "juz"]).optional(),
  sedekahType: z.enum(["uang", "hitungan"]).optional(),
  customUnit: z.enum(["hitungan", "ayat", "halaman", "surat", "juz", "rakaat", "hari", "uang", "times", "days"]).optional(),
  whyItFits: z.string().min(1).max(500),
  source: recommendationSourceSchema,
});

export type TargetRecommendation = z.infer<typeof targetRecommendationSchema>;

export const targetRecommendationsRequestSchema = z.object({
  language: z.enum(RECOMMENDATION_LANGUAGES).default("id"),
  forceRefresh: z.boolean().optional().default(false),
});

export const targetRecommendationsResponseSchema = z.object({
  recommendations: z.array(targetRecommendationSchema),
  cached: z.boolean().optional(),
});

export type TargetRecommendationsRequest = z.infer<typeof targetRecommendationsRequestSchema>;
export type TargetRecommendationsResponse = z.infer<typeof targetRecommendationsResponseSchema>;

// ─── Qur'an ───────────────────────────────────────────────────
// Per-user bookmarks of Qur'an verses. Unique on (user, surah, verse) so
// the same verse can't be bookmarked twice; a duplicate POST is treated
// as idempotent. Surah / verse numbers are 1-indexed to match the public
// quran.com API.
export const quranBookmarks = pgTable("quran_bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  surahNumber: integer("surah_number").notNull(),
  verseNumber: integer("verse_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqUserVerse: uniqueIndex("uniq_quran_bookmark_user_verse")
    .on(table.userId, table.surahNumber, table.verseNumber),
}));

// One row per user holding their last-read position and preferred reciter
// for Qur'an audio. Acts as a simple key-value resume marker that syncs
// across devices.
export const quranReadingState = pgTable("quran_reading_state", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  lastSurahNumber: integer("last_surah_number"),
  lastVerseNumber: integer("last_verse_number"),
  preferredReciterId: integer("preferred_reciter_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuranBookmarkSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  verseNumber: z.number().int().min(1).max(286),
});

export const upsertQuranReadingStateSchema = z.object({
  lastSurahNumber: z.number().int().min(1).max(114).nullable().optional(),
  lastVerseNumber: z.number().int().min(1).max(286).nullable().optional(),
  preferredReciterId: z.number().int().min(1).nullable().optional(),
});

export type QuranBookmark = typeof quranBookmarks.$inferSelect;
export type InsertQuranBookmark = z.infer<typeof insertQuranBookmarkSchema>;
export type QuranReadingState = typeof quranReadingState.$inferSelect;
export type UpsertQuranReadingState = z.infer<typeof upsertQuranReadingStateSchema>;

// ─── Voice-deed parsing (audio/transcript -> structured deed fields) ──
export const VOICE_PARSE_LANGUAGES = ["id", "en", "ms", "ar"] as const;
export type VoiceParseLanguage = (typeof VOICE_PARSE_LANGUAGES)[number];

export const voiceParseRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript is required").max(4000, "Transcript is too long"),
  language: z.enum(VOICE_PARSE_LANGUAGES).optional(),
  // ISO 8601 timestamp the client believes is "now". Used so the model can
  // resolve relative times like "yesterday morning" against the user's clock.
  clientNowIso: z.string().optional(),
  // IANA timezone for resolving relative times in the user's perspective.
  timezone: z.string().optional(),
});
export type VoiceParseRequest = z.infer<typeof voiceParseRequestSchema>;

// Mirrors the user-editable fields of insertDeedSchema. All fields are
// optional because the AI only sets what was confidently inferred from
// what the user said. The client uses these to prefill the deed form.
export const voiceParsedDeedSchema = z.object({
  category: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1).max(100000).optional(),
  customUnit: z
    .enum(["hitungan", "ayat", "halaman", "surat", "juz", "rakaat", "hari", "uang", "times", "days"])
    .optional(),
  dzikirType: z.string().max(120).optional(),
  sholatType: z.string().max(60).optional(),
  fastingType: z.string().max(60).optional(),
  isJamaah: z.boolean().optional(),
  quranUnit: z.enum(["ayat", "halaman", "surat", "juz"]).optional(),
  sedekahType: z.enum(["uang", "hitungan"]).optional(),
  // ISO 8601. Only set if the user explicitly stated a time/date.
  createdAtIso: z.string().optional(),
});
export type VoiceParsedDeed = z.infer<typeof voiceParsedDeedSchema>;

export const voiceParseResponseSchema = z.object({
  parsed: voiceParsedDeedSchema,
  // Notes are debug-only and not shown to the user. Useful for surfacing
  // why the AI couldn't pick a category, etc.
  notes: z.string().max(500).optional(),
  // True when the AI couldn't confidently fill at least the category. The
  // client treats this as a failure and shows the retry/text-form UI.
  lowConfidence: z.boolean().optional(),
  transcript: z.string(),
});
export type VoiceParseResponse = z.infer<typeof voiceParseResponseSchema>;
