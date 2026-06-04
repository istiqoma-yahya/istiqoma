import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type {
  CommunityTarget,
  CommunityTargetLeaderboardEntry,
  Deed,
} from "@workspace/db";

const TZ = "Asia/Jakarta";

function periodBoundsInTz(
  period: string,
  now: Date,
  tz: string,
): { start: Date; end: Date } {
  const nowInTz = toZonedTime(now, tz);
  switch (period) {
    case "weekly":
      return {
        start: fromZonedTime(startOfWeek(nowInTz, { weekStartsOn: 1 }), tz),
        end: fromZonedTime(endOfWeek(nowInTz, { weekStartsOn: 1 }), tz),
      };
    case "monthly":
      return {
        start: fromZonedTime(startOfMonth(nowInTz), tz),
        end: fromZonedTime(endOfMonth(nowInTz), tz),
      };
    case "daily":
    default:
      return {
        start: fromZonedTime(startOfDay(nowInTz), tz),
        end: fromZonedTime(endOfDay(nowInTz), tz),
      };
  }
}

const FASTING_CATEGORY_VARIANTS = [
  "puasa",
  "fasting",
  "puasa fardhu",
  "puasa sunnah",
  "fasting fardhu",
  "fasting sunnah",
];

function isFastingCategory(cat: string): boolean {
  return FASTING_CATEGORY_VARIANTS.includes(cat.toLowerCase());
}

export function matchesFastingCategories(cat1: string, cat2: string): boolean {
  return cat1 === cat2 || (isFastingCategory(cat1) && isFastingCategory(cat2));
}

export function getCommunityPeriodBounds(
  period: string,
  now: Date = new Date(),
  tz: string = TZ,
): { start: Date; end: Date } {
  return periodBoundsInTz(period, now, tz);
}

export function deedMatchesCommunityTarget(
  deed: Deed,
  t: CommunityTarget,
): boolean {
  const matchesCategory =
    matchesFastingCategories(deed.category, t.category) ||
    deed.category === t.category;
  const matchesDzikirType = !t.dzikirType || deed.dzikirType === t.dzikirType;
  const matchesSholatType = !t.sholatType || deed.sholatType === t.sholatType;
  const matchesFastingType =
    !t.fastingType || deed.fastingType === t.fastingType;
  const matchesQuranUnit = !t.quranUnit || deed.quranUnit === t.quranUnit;
  const matchesSedekahType =
    !t.sedekahType || deed.sedekahType === t.sedekahType;
  const matchesCustomUnit =
    !t.customUnit || deed.customUnit === t.customUnit || !deed.customUnit;
  return (
    matchesCategory &&
    matchesDzikirType &&
    matchesSholatType &&
    matchesFastingType &&
    matchesQuranUnit &&
    matchesSedekahType &&
    matchesCustomUnit
  );
}

export type LeaderboardMember = {
  userId: string;
  joinedAt: Date | null;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export function computeCommunityTargetLeaderboard(
  target: CommunityTarget,
  members: LeaderboardMember[],
  periodDeeds: Deed[],
  currentUserId: string,
  options: {
    limit?: number;
    offset?: number;
    now?: Date;
    memberTimezones?: Map<string, string>;
  } = {},
): { entries: CommunityTargetLeaderboardEntry[]; total: number } {
  if (members.length === 0) return { entries: [], total: 0 };

  const now = options.now ?? new Date();

  // Defense in depth: even if callers pre-filter deeds by the SQL union
  // window, the helper independently enforces each member's local period
  // bounds so scoring is provably restricted to that member's current period.
  // Members without a known timezone fall back to Asia/Jakarta.
  const boundsCache = new Map<string, { startMs: number; endMs: number }>();
  const memberBounds = new Map<string, { startMs: number; endMs: number }>();
  for (const m of members) {
    const tz = options.memberTimezones?.get(m.userId) ?? TZ;
    let bounds = boundsCache.get(tz);
    if (!bounds) {
      const { start, end } = periodBoundsInTz(target.period, now, tz);
      bounds = { startMs: start.getTime(), endMs: end.getTime() };
      boundsCache.set(tz, bounds);
    }
    memberBounds.set(m.userId, bounds);
  }

  const progressMap = new Map<string, number>();
  for (const deed of periodDeeds) {
    const created = deed.createdAt instanceof Date ? deed.createdAt.getTime() : NaN;
    if (!Number.isFinite(created)) continue;
    const bounds = memberBounds.get(deed.userId);
    if (!bounds) continue;
    if (created < bounds.startMs || created > bounds.endMs) continue;
    if (!deedMatchesCommunityTarget(deed, target)) continue;
    const prev = progressMap.get(deed.userId) ?? 0;
    progressMap.set(deed.userId, prev + (deed.quantity || 1));
  }

  const entries = members.map((m) => {
    const progress = progressMap.get(m.userId) ?? 0;
    const percent =
      target.targetValue > 0
        ? Math.min(100, Math.round((progress / target.targetValue) * 100))
        : 0;
    const composedName =
      [m.firstName, m.lastName].filter(Boolean).join(" ").trim() ||
      m.username ||
      null;
    return {
      userId: m.userId,
      username: composedName,
      email: m.email,
      profileImageUrl: m.profileImageUrl,
      progress,
      percent,
      joinedAt: (m.joinedAt ?? new Date()).toISOString(),
      isCurrentUser: m.userId === currentUserId,
    };
  });

  entries.sort((a, b) => {
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.joinedAt.localeCompare(b.joinedAt);
  });

  const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }));
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  return { entries: ranked.slice(offset, offset + limit), total: ranked.length };
}
