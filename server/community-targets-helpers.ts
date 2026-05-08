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
} from "@shared/schema";

const TZ = "Asia/Jakarta";

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
): { start: Date; end: Date } {
  const nowInTz = toZonedTime(now, TZ);
  switch (period) {
    case "weekly":
      return {
        start: fromZonedTime(startOfWeek(nowInTz, { weekStartsOn: 1 }), TZ),
        end: fromZonedTime(endOfWeek(nowInTz, { weekStartsOn: 1 }), TZ),
      };
    case "monthly":
      return {
        start: fromZonedTime(startOfMonth(nowInTz), TZ),
        end: fromZonedTime(endOfMonth(nowInTz), TZ),
      };
    case "daily":
    default:
      return {
        start: fromZonedTime(startOfDay(nowInTz), TZ),
        end: fromZonedTime(endOfDay(nowInTz), TZ),
      };
  }
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
  options: { limit?: number; offset?: number; now?: Date } = {},
): { entries: CommunityTargetLeaderboardEntry[]; total: number } {
  if (members.length === 0) return { entries: [], total: 0 };

  // Defense in depth: even if callers pre-filter deeds by the SQL window, the
  // helper independently enforces the Asia/Jakarta period bounds so scoring
  // is provably restricted to the current period.
  const { start, end } = getCommunityPeriodBounds(target.period, options.now);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const progressMap = new Map<string, number>();
  for (const deed of periodDeeds) {
    const created = deed.createdAt instanceof Date ? deed.createdAt.getTime() : NaN;
    if (!Number.isFinite(created) || created < startMs || created > endMs) continue;
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
