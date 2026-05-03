import { pgTable, serial, varchar, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const userBadges = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id),
    badgeId: text("badge_id").notNull(),
    tier: integer("tier").notNull(),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqUserBadgeTier: uniqueIndex("uniq_user_badge_tier").on(t.userId, t.badgeId, t.tier),
  }),
);

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

export type BadgeFamily = "milestone" | "behavior";

export type BadgeCriteria =
  | { kind: "deedCount"; category: string; isJamaah?: boolean }
  | { kind: "sumQuantity"; category: string }
  | { kind: "quranAyatEquiv" }
  | { kind: "fastingCount" }
  | { kind: "lifetimePoints" }
  | { kind: "targetsCompleted" }
  | { kind: "longestStreak" }
  | { kind: "distinctDaysSholatBeforeHour"; sholatType: string; localHourMaxExclusive: number }
  | { kind: "distinctDaysSholat"; sholatType: string }
  | { kind: "distinctDaysHourRange"; minHour: number; maxHourExclusive: number }
  | { kind: "fullHouseDays" }
  | { kind: "tripleCrownDays" }
  | { kind: "questExplorerCategories" }
  | { kind: "comebackKid" }
  | { kind: "freezersUsed" }
  | { kind: "noFreezeStreak" }
  | { kind: "ramadhanMarathon" }
  | { kind: "puasaSunnahOnWeekdays"; weekdays: number[] }
  | { kind: "puasaSunnahOnDayOfMonth"; daysOfMonth: number[] }
  | { kind: "shodaqohDistinctDaysInMonth" }
  | { kind: "deedEdits" }
  | { kind: "midnightLogger" }
  | { kind: "targetsCreated" }
  | { kind: "onboardingIdentity" }
  | { kind: "freezerPurchases" }
  | { kind: "hariRayaDeed" };

export type BadgeDef = {
  id: string;
  family: BadgeFamily;
  name: string;
  description: string;
  icon: string;
  thresholds: number[];
  unit: string;
  criteria: BadgeCriteria;
};

export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Platinum"] as const;

export const BADGE_CATALOG: BadgeDef[] = [
  // ── Family A: Milestone ────────────────────────────────────────
  {
    id: "ahli-sholat",
    family: "milestone",
    name: "Ahli Sholat",
    description: "Total Sholat Fardhu yang dicatat.",
    icon: "Sun",
    thresholds: [50, 250, 1000, 2500],
    unit: "sholat",
    criteria: { kind: "deedCount", category: "Sholat Fardhu" },
  },
  {
    id: "jamaah-devotee",
    family: "milestone",
    name: "Jamaah Devotee",
    description: "Sholat Fardhu yang dilakukan berjamaah.",
    icon: "Users",
    thresholds: [25, 100, 500, 1500],
    unit: "sholat",
    criteria: { kind: "deedCount", category: "Sholat Fardhu", isJamaah: true },
  },
  {
    id: "penjaga-sunnah",
    family: "milestone",
    name: "Penjaga Sunnah",
    description: "Total Sholat Sunnah yang dicatat.",
    icon: "Moon",
    thresholds: [20, 100, 365, 1000],
    unit: "sholat",
    criteria: { kind: "deedCount", category: "Sholat Sunnah" },
  },
  {
    id: "pecinta-dzikir",
    family: "milestone",
    name: "Pecinta Dzikir",
    description: "Total hitungan dzikir yang terkumpul.",
    icon: "Sparkles",
    thresholds: [1000, 10000, 100000, 1000000],
    unit: "dzikir",
    criteria: { kind: "sumQuantity", category: "Dzikir" },
  },
  {
    id: "sahabat-quran",
    family: "milestone",
    name: "Sahabat Quran",
    description: "Bacaan Quran setara ayat (juz × 600, halaman × 15, surat × 55).",
    icon: "BookOpen",
    thresholds: [100, 1000, 6236, 31180],
    unit: "ayat",
    criteria: { kind: "quranAyatEquiv" },
  },
  {
    id: "tangan-pemberi",
    family: "milestone",
    name: "Tangan Pemberi",
    description: "Total sedekah yang dicatat.",
    icon: "Hand",
    thresholds: [5, 25, 100, 365],
    unit: "sedekah",
    criteria: { kind: "deedCount", category: "Shodaqoh" },
  },
  {
    id: "penahan-hawa",
    family: "milestone",
    name: "Penahan Hawa",
    description: "Total hari berpuasa yang dicatat.",
    icon: "Flame",
    thresholds: [7, 30, 100, 365],
    unit: "hari",
    criteria: { kind: "fastingCount" },
  },
  {
    id: "pencari-ilmu",
    family: "milestone",
    name: "Pencari Ilmu",
    description: "Total kegiatan Tolabul Ilmi yang dicatat.",
    icon: "GraduationCap",
    thresholds: [10, 50, 200, 1000],
    unit: "kegiatan",
    criteria: { kind: "deedCount", category: "Tolabul Ilmi" },
  },
  {
    id: "birrul-walidayn",
    family: "milestone",
    name: "Birrul Walidayn",
    description: "Total kebaikan untuk orang tua yang dicatat.",
    icon: "Heart",
    thresholds: [5, 25, 100, 365],
    unit: "kebaikan",
    criteria: { kind: "deedCount", category: "Birrul Walidayn" },
  },
  {
    id: "kolektor-poin",
    family: "milestone",
    name: "Kolektor Poin",
    description: "Total poin yang pernah dikumpulkan.",
    icon: "Coins",
    thresholds: [1000, 10000, 100000, 1000000],
    unit: "poin",
    criteria: { kind: "lifetimePoints" },
  },
  {
    id: "pencapai-target",
    family: "milestone",
    name: "Pencapai Target",
    description: "Target yang berhasil diselesaikan.",
    icon: "Target",
    thresholds: [5, 25, 100, 500],
    unit: "target",
    criteria: { kind: "targetsCompleted" },
  },
  {
    id: "istiqomah-streak",
    family: "milestone",
    name: "Istiqomah Streak",
    description: "Streak harian terpanjang yang pernah diraih.",
    icon: "Flame",
    thresholds: [7, 30, 100, 365],
    unit: "hari",
    criteria: { kind: "longestStreak" },
  },

  // ── Family B: Behavior ─────────────────────────────────────────
  {
    id: "subuh-warrior",
    family: "behavior",
    name: "Subuh Warrior",
    description: "Catat Sholat Subuh sebelum jam 06.00 di hari yang berbeda.",
    icon: "Sunrise",
    thresholds: [30],
    unit: "hari",
    criteria: { kind: "distinctDaysSholatBeforeHour", sholatType: "subuh", localHourMaxExclusive: 6 },
  },
  {
    id: "tahajjud-knight",
    family: "behavior",
    name: "Tahajjud Knight",
    description: "Catat Sholat Tahajjud di hari yang berbeda.",
    icon: "Moon",
    thresholds: [10, 50, 100],
    unit: "hari",
    criteria: { kind: "distinctDaysSholat", sholatType: "tahajjud" },
  },
  {
    id: "sleepless-soul",
    family: "behavior",
    name: "Sleepless Soul",
    description: "Catat ibadah antara jam 01.00–04.00 di hari yang berbeda.",
    icon: "Stars",
    thresholds: [7],
    unit: "hari",
    criteria: { kind: "distinctDaysHourRange", minHour: 1, maxHourExclusive: 4 },
  },
  {
    id: "full-house",
    family: "behavior",
    name: "Full House",
    description: "Lengkap 5 Sholat Fardhu dalam satu hari.",
    icon: "LayoutGrid",
    thresholds: [10, 50, 200],
    unit: "hari",
    criteria: { kind: "fullHouseDays" },
  },
  {
    id: "triple-crown",
    family: "behavior",
    name: "Triple Crown",
    description: "Sholat, Dzikir, dan Baca Quran di hari yang sama.",
    icon: "Crown",
    thresholds: [30],
    unit: "hari",
    criteria: { kind: "tripleCrownDays" },
  },
  {
    id: "quest-explorer",
    family: "behavior",
    name: "Quest Explorer",
    description: "Selesaikan target dari kategori yang berbeda-beda.",
    icon: "Compass",
    thresholds: [5],
    unit: "kategori",
    criteria: { kind: "questExplorerCategories" },
  },
  {
    id: "comeback-kid",
    family: "behavior",
    name: "Comeback Kid",
    description: "Bangkit lagi setelah streak ≥ 7 hari yang sempat terputus.",
    icon: "Repeat",
    thresholds: [1],
    unit: "kali",
    criteria: { kind: "comebackKid" },
  },
  {
    id: "freeze-master",
    family: "behavior",
    name: "Freeze Master",
    description: "Streak Freezer berhasil menyelamatkan streak-mu.",
    icon: "Snowflake",
    thresholds: [5],
    unit: "kali",
    criteria: { kind: "freezersUsed" },
  },
  {
    id: "no-freeze-november",
    family: "behavior",
    name: "No Freeze November",
    description: "Streak 30 hari tanpa pakai freezer satu kali pun.",
    icon: "ShieldCheck",
    thresholds: [30],
    unit: "hari",
    criteria: { kind: "noFreezeStreak" },
  },
  {
    id: "khatam-champion",
    family: "behavior",
    name: "Khatam Champion",
    description: "Bacaan Quran setara satu khatam penuh.",
    icon: "BookOpenCheck",
    thresholds: [6236],
    unit: "ayat",
    criteria: { kind: "quranAyatEquiv" },
  },
  {
    id: "ramadhan-marathoner",
    family: "behavior",
    name: "Ramadhan Marathoner",
    description: "Puasa Fardhu (Ramadhan) sepanjang bulan Ramadhan.",
    icon: "CalendarDays",
    thresholds: [29],
    unit: "hari",
    criteria: { kind: "ramadhanMarathon" },
  },
  {
    id: "senin-kamis",
    family: "behavior",
    name: "Senin-Kamis",
    description: "Puasa Sunnah di hari Senin atau Kamis.",
    icon: "CalendarCheck",
    thresholds: [12, 52],
    unit: "kali",
    criteria: { kind: "puasaSunnahOnWeekdays", weekdays: [1, 4] },
  },
  {
    id: "ayyamul-bidh",
    family: "behavior",
    name: "Ayyamul Bidh",
    description: "Puasa Sunnah di tanggal 13, 14, atau 15 (perkiraan).",
    icon: "Calendar",
    thresholds: [6],
    unit: "kali",
    criteria: { kind: "puasaSunnahOnDayOfMonth", daysOfMonth: [13, 14, 15] },
  },
  {
    id: "diam-diam-bersedekah",
    family: "behavior",
    name: "Diam-Diam Bersedekah",
    description: "Sedekah di 7 hari berbeda dalam satu bulan.",
    icon: "Gift",
    thresholds: [7],
    unit: "hari",
    criteria: { kind: "shodaqohDistinctDaysInMonth" },
  },
  {
    id: "mistake-mechanic",
    family: "behavior",
    name: "Mistake Mechanic",
    description: "Mengoreksi catatan deed yang sudah dibuat.",
    icon: "Wrench",
    thresholds: [10],
    unit: "kali",
    criteria: { kind: "deedEdits" },
  },
  {
    id: "midnight-logger",
    family: "behavior",
    name: "Midnight Logger",
    description: "Mencatat deed untuk hari kemarin (back-dated).",
    icon: "Clock",
    thresholds: [5],
    unit: "kali",
    criteria: { kind: "midnightLogger" },
  },
  {
    id: "goal-setter",
    family: "behavior",
    name: "Goal Setter",
    description: "Buat target pertamamu.",
    icon: "Flag",
    thresholds: [1],
    unit: "target",
    criteria: { kind: "targetsCreated" },
  },
  {
    id: "identity-found",
    family: "behavior",
    name: "Identity Found",
    description: "Selesaikan onboarding & pilih identitas spiritual.",
    icon: "Sparkle",
    thresholds: [1],
    unit: "",
    criteria: { kind: "onboardingIdentity" },
  },
  {
    id: "big-spender",
    family: "behavior",
    name: "Big Spender",
    description: "Membeli paket Streak Freezer.",
    icon: "ShoppingBag",
    thresholds: [3],
    unit: "kali",
    criteria: { kind: "freezerPurchases" },
  },
  {
    id: "hari-raya-spirit",
    family: "behavior",
    name: "Hari Raya Spirit",
    description: "Catat deed di hari Idul Fitri atau Idul Adha.",
    icon: "PartyPopper",
    thresholds: [1],
    unit: "",
    criteria: { kind: "hariRayaDeed" },
  },
];

// Approximate Gregorian dates of Idul Fitri / Idul Adha for the years the
// app is reasonably expected to run. Hari Raya Spirit only needs an
// approximation per the task spec.
export const HARI_RAYA_DATES: string[] = [
  // Idul Fitri (1 Syawal)
  "2022-05-02",
  "2023-04-22",
  "2024-04-10",
  "2025-03-31",
  "2026-03-20",
  "2027-03-09",
  "2028-02-26",
  "2029-02-14",
  "2030-02-04",
  // Idul Adha (10 Dzulhijjah)
  "2022-07-09",
  "2023-06-28",
  "2024-06-16",
  "2025-06-06",
  "2026-05-26",
  "2027-05-16",
  "2028-05-04",
  "2029-04-23",
  "2030-04-13",
];

export type BadgeProgress = {
  badgeId: string;
  family: BadgeFamily;
  name: string;
  description: string;
  icon: string;
  thresholds: number[];
  unit: string;
  value: number;
  earnedTier: number; // 0 = none, otherwise 1..thresholds.length
  earnedAt: Record<number, string>; // tier -> ISO date
};

export type NewlyEarnedBadge = {
  badgeId: string;
  tier: number;
  name: string;
  description: string;
  icon: string;
  family: BadgeFamily;
};

export type BadgesSnapshot = {
  badges: BadgeProgress[];
  totalBadges: number;
  earnedBadges: number;
  latestEarned: { badgeId: string; tier: number; earnedAt: string } | null;
};

export function highestEarnedTier(value: number, thresholds: number[]): number {
  let earned = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) earned = i + 1;
    else break;
  }
  return earned;
}
