import { db } from "./db";
import { storage } from "./storage";
import {
  deeds,
  targets,
  targetHistory,
  streakFreezes,
  pointPurchases,
  userBadges,
  BADGE_CATALOG,
  HARI_RAYA_DATES,
  highestEarnedTier,
  type BadgeDef,
  type BadgeProgress,
  type BadgesSnapshot,
  type NewlyEarnedBadge,
  type UserBadge,
} from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { format, getDay, getDate, getHours, differenceInCalendarDays, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const DEFAULT_TZ = "Asia/Jakarta";

async function resolveTimezone(userId: string): Promise<string> {
  try {
    const sub = await storage.getPushSubscription(userId);
    const tz = (sub as any)?.timezone;
    if (tz) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return tz;
      } catch {}
    }
  } catch {}
  return DEFAULT_TZ;
}

type EvalContext = {
  userId: string;
  timezone: string;
  now: Date;
  // Deeds, sorted ascending by createdAt.
  deedRows: Array<{
    id: number;
    category: string;
    sholatType: string | null;
    fastingType: string | null;
    isJamaah: boolean | null;
    quranUnit: string | null;
    sedekahType: string | null;
    quantity: number;
    points: number;
    createdAt: Date | null;
    localDate: string | null;
    editCount: number | null;
  }>;
  // Per-deed local date (YYYY-MM-DD) bucketed in user's timezone.
  deedLocalDate: string[]; // parallel to deedRows
  deedLocalHour: number[]; // parallel to deedRows
  deedLocalDay: number[]; // parallel to deedRows (0=Sun..6=Sat)
  deedLocalDayOfMonth: number[];
  // All distinct local deed dates (sorted asc).
  distinctDeedDates: string[];
  // Frozen dates set (active, non-refunded).
  frozenDates: Set<string>;
  // Targets-related
  oneTimeTargetsCompleted: number;
  recurringPeriodsCompleted: number;
  questExplorerCategories: number;
  totalTargetsCreated: number;
  // Point purchases
  freezerPurchases: number;
  // Onboarding
  hasIdentity: boolean;
};

async function buildContext(userId: string): Promise<EvalContext> {
  const timezone = await resolveTimezone(userId);
  const now = new Date();

  const allDeeds = await db
    .select({
      id: deeds.id,
      category: deeds.category,
      sholatType: deeds.sholatType,
      fastingType: deeds.fastingType,
      isJamaah: deeds.isJamaah,
      quranUnit: deeds.quranUnit,
      sedekahType: deeds.sedekahType,
      quantity: deeds.quantity,
      points: deeds.points,
      createdAt: deeds.createdAt,
      localDate: deeds.localDate,
      editCount: deeds.editCount,
    })
    .from(deeds)
    .where(eq(deeds.userId, userId));
  allDeeds.sort((a, b) => {
    const av = a.createdAt ? a.createdAt.getTime() : 0;
    const bv = b.createdAt ? b.createdAt.getTime() : 0;
    return av - bv;
  });

  const deedLocalDate: string[] = [];
  const deedLocalHour: number[] = [];
  const deedLocalDay: number[] = [];
  const deedLocalDayOfMonth: number[] = [];
  const distinctSet = new Set<string>();
  for (const d of allDeeds) {
    if (!d.createdAt) {
      deedLocalDate.push("");
      deedLocalHour.push(-1);
      deedLocalDay.push(-1);
      deedLocalDayOfMonth.push(-1);
      continue;
    }
    const local = toZonedTime(d.createdAt, timezone);
    const ds = format(local, "yyyy-MM-dd");
    deedLocalDate.push(ds);
    deedLocalHour.push(getHours(local));
    deedLocalDay.push(getDay(local));
    deedLocalDayOfMonth.push(getDate(local));
    distinctSet.add(ds);
  }
  const distinctDeedDates = Array.from(distinctSet).sort();

  // Frozen dates (active)
  const frozenDates = await storage.getFrozenDates(userId);

  // Target completions
  const allTargets = await db.select().from(targets).where(eq(targets.userId, userId));
  const totalTargetsCreated = allTargets.length;
  const oneTimeTargetsCompleted = allTargets.filter(
    (t) => t.recurrence === "oneTime" && t.completedAt != null,
  ).length;

  const completedHistoryRows = await db
    .select({ category: targetHistory.category })
    .from(targetHistory)
    .where(and(eq(targetHistory.userId, userId), eq(targetHistory.completed, true)));
  const recurringPeriodsCompleted = completedHistoryRows.length;

  // Quest explorer: distinct categories with at least one completed target
  // (one-time completedAt OR any completed target_history row).
  const explorerSet = new Set<string>();
  for (const t of allTargets) {
    if (t.recurrence === "oneTime" && t.completedAt != null) explorerSet.add(t.category);
  }
  for (const h of completedHistoryRows) explorerSet.add(h.category);

  // Freezer purchases (count of streak_freezer purchase rows)
  const purchaseRows = await db
    .select({ id: pointPurchases.id })
    .from(pointPurchases)
    .where(and(eq(pointPurchases.userId, userId), eq(pointPurchases.kind, "streak_freezer")));
  const freezerPurchases = purchaseRows.length;

  // Onboarding identity
  const onboarding = await storage.getUserOnboarding(userId);
  const hasIdentity = !!(onboarding && onboarding.identityKey);

  return {
    userId,
    timezone,
    now,
    deedRows: allDeeds,
    deedLocalDate,
    deedLocalHour,
    deedLocalDay,
    deedLocalDayOfMonth,
    distinctDeedDates,
    frozenDates,
    oneTimeTargetsCompleted,
    recurringPeriodsCompleted,
    questExplorerCategories: explorerSet.size,
    totalTargetsCreated,
    freezerPurchases,
    hasIdentity,
  };
}

const FASTING_CATS = new Set([
  "Puasa Fardhu",
  "Puasa Sunnah",
  "Fasting Fardhu",
  "Fasting Sunnah",
  "Puasa",
  "Fasting",
]);
const SHOLAT_CATS = new Set(["Sholat Fardhu", "Sholat Sunnah"]);
const QURAN_CATS = new Set(["Baca Quran", "Quran"]);
const DZIKIR_CATS = new Set(["Dzikir"]);

function isCategory(actual: string, target: string): boolean {
  if (actual === target) return true;
  if (target === "Puasa Fardhu" && (actual === "Fasting Fardhu")) return true;
  if (target === "Puasa Sunnah" && (actual === "Fasting Sunnah")) return true;
  if (target === "Shodaqoh" && (actual === "Sedekah" || actual === "Sadaqah")) return true;
  if (target === "Tolabul Ilmi" && (actual === "Talabul Ilmi" || actual === "Mencari Ilmu" || actual === "Seeking Knowledge")) return true;
  if (target === "Birrul Walidayn" && (actual === "Birrul Walidain" || actual === "Honoring Parents")) return true;
  return false;
}

function quranAyatEquivalent(rows: EvalContext["deedRows"]): number {
  let total = 0;
  for (const d of rows) {
    if (!QURAN_CATS.has(d.category)) continue;
    const q = d.quantity || 1;
    const unit = (d.quranUnit || "").toLowerCase();
    if (unit === "juz") total += q * 600;
    else if (unit === "halaman" || unit === "page" || unit === "pages") total += q * 15;
    else if (unit === "surat" || unit === "surah") total += q * 55;
    else if (unit === "ayat" || unit === "verse" || unit === "verses") total += q;
    else total += q; // fallback: treat as ayat
  }
  return total;
}

function distinctDaysWhere(ctx: EvalContext, predicate: (i: number) => boolean): number {
  const set = new Set<string>();
  for (let i = 0; i < ctx.deedRows.length; i++) {
    if (!ctx.deedLocalDate[i]) continue;
    if (predicate(i)) set.add(ctx.deedLocalDate[i]);
  }
  return set.size;
}

function fullHouseDaysCount(ctx: EvalContext): number {
  const FARDHU = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];
  const byDate = new Map<string, Set<string>>();
  for (let i = 0; i < ctx.deedRows.length; i++) {
    const d = ctx.deedRows[i];
    if (d.category !== "Sholat Fardhu") continue;
    const key = (d.sholatType || "").toLowerCase();
    if (!FARDHU.includes(key)) continue;
    const date = d.localDate || ctx.deedLocalDate[i];
    if (!date) continue;
    let set = byDate.get(date);
    if (!set) {
      set = new Set();
      byDate.set(date, set);
    }
    set.add(key);
  }
  let count = 0;
  byDate.forEach((set) => {
    if (set.size === 5) count++;
  });
  return count;
}

function tripleCrownDaysCount(ctx: EvalContext): number {
  const map = new Map<string, { sholat: boolean; dzikir: boolean; quran: boolean }>();
  for (let i = 0; i < ctx.deedRows.length; i++) {
    const d = ctx.deedRows[i];
    const date = ctx.deedLocalDate[i];
    if (!date) continue;
    const entry = map.get(date) || { sholat: false, dzikir: false, quran: false };
    if (SHOLAT_CATS.has(d.category)) entry.sholat = true;
    if (DZIKIR_CATS.has(d.category)) entry.dzikir = true;
    if (QURAN_CATS.has(d.category)) entry.quran = true;
    map.set(date, entry);
  }
  let count = 0;
  map.forEach((e) => {
    if (e.sholat && e.dzikir && e.quran) count++;
  });
  return count;
}

function comebackKidCount(distinctDates: string[]): number {
  if (distinctDates.length === 0) return 0;
  let runLen = 1;
  let comebacks = 0;
  let prev = parseISO(distinctDates[0]);
  for (let i = 1; i < distinctDates.length; i++) {
    const cur = parseISO(distinctDates[i]);
    const diff = differenceInCalendarDays(cur, prev);
    if (diff === 1) {
      runLen++;
    } else if (diff > 1) {
      if (runLen >= 7) comebacks++;
      runLen = 1;
    }
    prev = cur;
  }
  return comebacks;
}

function noFreezeStreakLongest(distinctDates: string[], frozen: Set<string>): number {
  if (distinctDates.length === 0) return 0;
  // Longest run of consecutive deed days where none of those days are
  // frozen-rescued. Since distinctDates only contains days that have an
  // actual deed, the "no freezer used" check on those days is effectively
  // always true (a frozen day has no deed). What we measure is therefore
  // the longest run of consecutive days with at least one deed.
  let best = 1;
  let cur = 1;
  let prev = parseISO(distinctDates[0]);
  for (let i = 1; i < distinctDates.length; i++) {
    const d = parseISO(distinctDates[i]);
    const diff = differenceInCalendarDays(d, prev);
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else if (diff > 1) {
      cur = 1;
    }
    prev = d;
  }
  return best;
}

function longestStreakOverall(ctx: EvalContext): number {
  // Combine deed days with frozen days for the longest "active" streak.
  const all = new Set<string>(ctx.distinctDeedDates);
  ctx.frozenDates.forEach((f) => all.add(f));
  const sorted = Array.from(all).sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let cur = 1;
  let prev = parseISO(sorted[0]);
  for (let i = 1; i < sorted.length; i++) {
    const d = parseISO(sorted[i]);
    const diff = differenceInCalendarDays(d, prev);
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else if (diff > 1) {
      cur = 1;
    }
    prev = d;
  }
  return best;
}

function ramadhanMarathonBest(ctx: EvalContext): number {
  // Best month-window count of Puasa Fardhu (Ramadhan) days. Approximated
  // as the largest cluster of distinct days with fastingType=ramadhan
  // within any 30-day window.
  const days = new Set<string>();
  for (let i = 0; i < ctx.deedRows.length; i++) {
    const d = ctx.deedRows[i];
    if ((d.fastingType || "").toLowerCase() !== "ramadhan") continue;
    if (ctx.deedLocalDate[i]) days.add(ctx.deedLocalDate[i]);
  }
  const arr = Array.from(days).sort();
  if (arr.length === 0) return 0;
  let best = 1;
  // Sliding window over the array of dates.
  let l = 0;
  for (let r = 0; r < arr.length; r++) {
    while (l < r && differenceInCalendarDays(parseISO(arr[r]), parseISO(arr[l])) > 30) l++;
    const count = r - l + 1;
    if (count > best) best = count;
  }
  return best;
}

function shodaqohDistinctDaysInMonthBest(ctx: EvalContext): number {
  const byMonth = new Map<string, Set<string>>();
  for (let i = 0; i < ctx.deedRows.length; i++) {
    const d = ctx.deedRows[i];
    if (!isCategory(d.category, "Shodaqoh")) continue;
    const date = ctx.deedLocalDate[i];
    if (!date) continue;
    const ym = date.slice(0, 7);
    let s = byMonth.get(ym);
    if (!s) {
      s = new Set();
      byMonth.set(ym, s);
    }
    s.add(date);
  }
  let best = 0;
  byMonth.forEach((s) => {
    if (s.size > best) best = s.size;
  });
  return best;
}

function midnightLoggerCount(ctx: EvalContext): number {
  // Count deeds whose user-assigned localDate is strictly before the local
  // date at the time the deed was created.
  let count = 0;
  for (let i = 0; i < ctx.deedRows.length; i++) {
    const d = ctx.deedRows[i];
    if (!d.localDate) continue;
    const cdate = ctx.deedLocalDate[i];
    if (!cdate) continue;
    // localDate is a YYYY-MM-DD string in DB; compare lexicographically.
    if (d.localDate < cdate) count++;
  }
  return count;
}

function hariRayaDeedCount(ctx: EvalContext): number {
  const set = new Set(HARI_RAYA_DATES);
  let count = 0;
  for (const date of ctx.distinctDeedDates) {
    if (set.has(date)) count++;
  }
  return count;
}

export type { EvalContext };

export function evaluateBadge(def: BadgeDef, ctx: EvalContext): number {
  const c = def.criteria;
  switch (c.kind) {
    case "deedCount": {
      let count = 0;
      for (const d of ctx.deedRows) {
        if (!isCategory(d.category, c.category)) continue;
        if (c.isJamaah && d.isJamaah !== true) continue;
        count++;
      }
      return count;
    }
    case "sumQuantity": {
      let total = 0;
      for (const d of ctx.deedRows) {
        if (!isCategory(d.category, c.category)) continue;
        total += d.quantity || 1;
      }
      return total;
    }
    case "quranAyatEquiv":
      return quranAyatEquivalent(ctx.deedRows);
    case "fastingCount": {
      const days = new Set<string>();
      for (let i = 0; i < ctx.deedRows.length; i++) {
        const d = ctx.deedRows[i];
        if (!FASTING_CATS.has(d.category)) continue;
        if (ctx.deedLocalDate[i]) days.add(ctx.deedLocalDate[i]);
      }
      return days.size;
    }
    case "lifetimePoints":
      return ctx.deedRows.reduce((s, d) => s + (d.points || 0), 0);
    case "targetsCompleted":
      return ctx.oneTimeTargetsCompleted + ctx.recurringPeriodsCompleted;
    case "longestStreak":
      return longestStreakOverall(ctx);
    case "distinctDaysSholatBeforeHour":
      return distinctDaysWhere(ctx, (i) => {
        const d = ctx.deedRows[i];
        return (
          d.category === "Sholat Fardhu" &&
          (d.sholatType || "").toLowerCase() === c.sholatType &&
          ctx.deedLocalHour[i] >= 0 &&
          ctx.deedLocalHour[i] < c.localHourMaxExclusive
        );
      });
    case "distinctDaysSholat":
      return distinctDaysWhere(ctx, (i) => {
        const d = ctx.deedRows[i];
        return (
          (d.category === "Sholat Fardhu" || d.category === "Sholat Sunnah") &&
          (d.sholatType || "").toLowerCase() === c.sholatType
        );
      });
    case "distinctDaysHourRange":
      return distinctDaysWhere(ctx, (i) => {
        const h = ctx.deedLocalHour[i];
        return h >= c.minHour && h < c.maxHourExclusive;
      });
    case "fullHouseDays":
      return fullHouseDaysCount(ctx);
    case "tripleCrownDays":
      return tripleCrownDaysCount(ctx);
    case "questExplorerCategories":
      return ctx.questExplorerCategories;
    case "comebackKid":
      return comebackKidCount(ctx.distinctDeedDates);
    case "freezersUsed":
      return ctx.frozenDates.size;
    case "noFreezeStreak":
      return noFreezeStreakLongest(ctx.distinctDeedDates, ctx.frozenDates);
    case "ramadhanMarathon":
      return ramadhanMarathonBest(ctx);
    case "puasaSunnahOnWeekdays": {
      let count = 0;
      for (let i = 0; i < ctx.deedRows.length; i++) {
        const d = ctx.deedRows[i];
        const ft = (d.fastingType || "").toLowerCase();
        if (!FASTING_CATS.has(d.category)) continue;
        if (ft === "ramadhan") continue; // sunnah only
        if (c.weekdays.includes(ctx.deedLocalDay[i])) count++;
      }
      return count;
    }
    case "puasaSunnahOnDayOfMonth": {
      let count = 0;
      for (let i = 0; i < ctx.deedRows.length; i++) {
        const d = ctx.deedRows[i];
        const ft = (d.fastingType || "").toLowerCase();
        if (!FASTING_CATS.has(d.category)) continue;
        if (ft === "ramadhan") continue;
        if (c.daysOfMonth.includes(ctx.deedLocalDayOfMonth[i])) count++;
      }
      return count;
    }
    case "shodaqohDistinctDaysInMonth":
      return shodaqohDistinctDaysInMonthBest(ctx);
    case "deedEdits": {
      let n = 0;
      for (const d of ctx.deedRows) n += (d as any).editCount ?? 0;
      return n;
    }
    case "midnightLogger":
      return midnightLoggerCount(ctx);
    case "targetsCreated":
      return ctx.totalTargetsCreated;
    case "onboardingIdentity":
      return ctx.hasIdentity ? 1 : 0;
    case "freezerPurchases":
      return ctx.freezerPurchases;
    case "hariRayaDeed":
      return hariRayaDeedCount(ctx);
  }
}

export type ExistingBadgeRow = Pick<UserBadge, "badgeId" | "tier" | "earnedAt">;

export function computeBadgeResults(
  ctx: EvalContext,
  existing: ExistingBadgeRow[],
  now: Date = new Date(),
): {
  snapshot: BadgesSnapshot;
  newlyEarned: NewlyEarnedBadge[];
  toInsert: Array<{ badgeId: string; tier: number }>;
} {
  const existingMap = new Map<string, ExistingBadgeRow[]>();
  for (const row of existing) {
    const list = existingMap.get(row.badgeId) || [];
    list.push(row);
    existingMap.set(row.badgeId, list);
  }

  const toInsert: Array<{ badgeId: string; tier: number }> = [];
  const newlyEarned: NewlyEarnedBadge[] = [];
  const progressList: BadgeProgress[] = [];
  const nowIso = now.toISOString();

  for (const def of BADGE_CATALOG) {
    const value = evaluateBadge(def, ctx);
    const earnedTier = highestEarnedTier(value, def.thresholds);
    const earnedAt: Record<number, string> = {};
    for (const r of existingMap.get(def.id) || []) {
      earnedAt[r.tier] = r.earnedAt instanceof Date ? r.earnedAt.toISOString() : String(r.earnedAt);
    }
    for (let t = 1; t <= earnedTier; t++) {
      if (!earnedAt[t]) {
        toInsert.push({ badgeId: def.id, tier: t });
        newlyEarned.push({
          badgeId: def.id,
          tier: t,
          name: def.name,
          description: def.description,
          icon: def.icon,
          family: def.family,
        });
        earnedAt[t] = nowIso;
      }
    }
    progressList.push({
      badgeId: def.id,
      family: def.family,
      name: def.name,
      description: def.description,
      icon: def.icon,
      thresholds: def.thresholds,
      unit: def.unit,
      value,
      earnedTier,
      earnedAt,
    });
  }

  let earnedCount = 0;
  let latestEarned: BadgesSnapshot["latestEarned"] = null;
  for (const p of progressList) {
    if (p.earnedTier > 0) earnedCount++;
    for (const [tierStr, iso] of Object.entries(p.earnedAt)) {
      if (!latestEarned || iso > latestEarned.earnedAt) {
        latestEarned = { badgeId: p.badgeId, tier: Number(tierStr), earnedAt: iso };
      }
    }
  }

  return {
    snapshot: {
      badges: progressList,
      totalBadges: BADGE_CATALOG.length,
      earnedBadges: earnedCount,
      latestEarned,
    },
    newlyEarned,
    toInsert,
  };
}

export async function evaluateBadgesForUser(
  userId: string,
): Promise<{ snapshot: BadgesSnapshot; newlyEarned: NewlyEarnedBadge[] }> {
  const ctx = await buildContext(userId);

  const existing = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const { snapshot, newlyEarned, toInsert } = computeBadgeResults(ctx, existing);

  if (toInsert.length > 0) {
    await db
      .insert(userBadges)
      .values(toInsert.map((r) => ({ userId, badgeId: r.badgeId, tier: r.tier })))
      .onConflictDoNothing();
  }

  return { snapshot, newlyEarned };
}

