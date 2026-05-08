import { describe, it, expect } from "vitest";
import {
  computeCommunityTargetLeaderboard,
  getCommunityPeriodBounds,
  deedMatchesCommunityTarget,
  type LeaderboardMember,
} from "../../server/community-targets-helpers";
import type { CommunityTarget, Deed } from "@shared/schema";

// Fixed instant inside Asia/Jakarta on Friday 2026-05-08 13:00 +07.
// Used as `now` for deterministic period-bound checks.
const NOW = new Date("2026-05-08T06:00:00Z");

function makeTarget(overrides: Partial<CommunityTarget> = {}): CommunityTarget {
  return {
    id: 1,
    creatorId: "creator",
    name: "Daily Dzikir",
    category: "Dzikir",
    targetValue: 100,
    period: "daily",
    unitLabel: "kali",
    dzikirType: null,
    sholatType: null,
    fastingType: null,
    quranUnit: null,
    sedekahType: null,
    customUnit: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// In-window: 2026-05-08 12:00 +07 == 2026-05-08T05:00:00Z (within today's
// Asia/Jakarta day window relative to NOW).
const IN_WINDOW = new Date("2026-05-08T05:00:00Z");

function makeDeed(overrides: Partial<Deed> = {}): Deed {
  const base: Deed = {
    id: 1,
    userId: "u1",
    description: "",
    deedType: "good",
    category: "Dzikir",
    points: 1,
    quantity: 1,
    dzikirType: null,
    sholatType: null,
    fastingType: null,
    isJamaah: null,
    quranUnit: null,
    sedekahType: null,
    customUnit: null,
    editCount: 0,
    createdAt: IN_WINDOW,
    localDate: null,
  };
  return { ...base, ...overrides };
}

function makeMember(userId: string, joinedAt: Date, name?: string): LeaderboardMember {
  return {
    userId,
    joinedAt,
    username: name ?? userId,
    email: `${userId}@example.com`,
    firstName: null,
    lastName: null,
    profileImageUrl: null,
  };
}

describe("getCommunityPeriodBounds (Asia/Jakarta)", () => {
  it("daily window starts at 00:00 Asia/Jakarta == 17:00 UTC the previous day", () => {
    const { start, end } = getCommunityPeriodBounds("daily", NOW);
    expect(start.toISOString()).toBe("2026-05-07T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-08T16:59:59.999Z");
  });

  it("weekly window starts on Monday in Asia/Jakarta", () => {
    const { start, end } = getCommunityPeriodBounds("weekly", NOW);
    expect(start.toISOString()).toBe("2026-05-03T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-10T16:59:59.999Z");
  });

  it("monthly window covers the full Asia/Jakarta month", () => {
    const { start, end } = getCommunityPeriodBounds("monthly", NOW);
    expect(start.toISOString()).toBe("2026-04-30T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-31T16:59:59.999Z");
  });
});

describe("deedMatchesCommunityTarget", () => {
  it("matches when category and all type filters align", () => {
    const target = makeTarget({ category: "Dzikir", dzikirType: "subhanallah" });
    const deed = makeDeed({ category: "Dzikir", dzikirType: "subhanallah" });
    expect(deedMatchesCommunityTarget(deed, target)).toBe(true);
  });

  it("rejects when dzikirType differs", () => {
    const target = makeTarget({ category: "Dzikir", dzikirType: "subhanallah" });
    const deed = makeDeed({ category: "Dzikir", dzikirType: "alhamdulillah" });
    expect(deedMatchesCommunityTarget(deed, target)).toBe(false);
  });

  it("rejects when category differs entirely", () => {
    const target = makeTarget({ category: "Dzikir" });
    const deed = makeDeed({ category: "Sedekah" });
    expect(deedMatchesCommunityTarget(deed, target)).toBe(false);
  });

  it("treats Puasa/Fasting variants as the same category", () => {
    const target = makeTarget({ category: "Puasa Fardhu" });
    const deed = makeDeed({ category: "Fasting Sunnah" });
    expect(deedMatchesCommunityTarget(deed, target)).toBe(true);
  });

  it("rejects when sholatType filter does not match", () => {
    const target = makeTarget({ category: "Sholat Fardhu", sholatType: "Subuh" });
    const deed = makeDeed({ category: "Sholat Fardhu", sholatType: "Dzuhur" });
    expect(deedMatchesCommunityTarget(deed, target)).toBe(false);
  });

  it("rejects when quranUnit filter does not match", () => {
    const target = makeTarget({ category: "Baca Quran", quranUnit: "ayat" });
    const deed = makeDeed({ category: "Baca Quran", quranUnit: "halaman" });
    expect(deedMatchesCommunityTarget(deed, target)).toBe(false);
  });

  // Parity assertion: the same fields a personal target filters on
  // (category + dzikirType/sholatType/fastingType/quranUnit/sedekahType/customUnit)
  // must drive identical accept/reject results for community targets.
  it("matches the personal-target field-set parity (all filters considered together)", () => {
    const baseTarget = makeTarget({
      category: "Dzikir",
      dzikirType: "subhanallah",
      sholatType: null,
      fastingType: null,
      quranUnit: null,
      sedekahType: null,
      customUnit: null,
    });
    const matchingDeed = makeDeed({ category: "Dzikir", dzikirType: "subhanallah" });
    const wrongCat = makeDeed({ category: "Sedekah", dzikirType: "subhanallah" });
    const wrongType = makeDeed({ category: "Dzikir", dzikirType: "istighfar" });
    expect(deedMatchesCommunityTarget(matchingDeed, baseTarget)).toBe(true);
    expect(deedMatchesCommunityTarget(wrongCat, baseTarget)).toBe(false);
    expect(deedMatchesCommunityTarget(wrongType, baseTarget)).toBe(false);
  });
});

describe("computeCommunityTargetLeaderboard", () => {
  const creatorJoin = new Date("2026-05-01T00:00:00Z");
  const memberJoin = new Date("2026-05-02T00:00:00Z");
  const otherJoin = new Date("2026-05-03T00:00:00Z");

  it("returns empty entries when no members exist", () => {
    const result = computeCommunityTargetLeaderboard(
      makeTarget(),
      [],
      [],
      "creator",
      { now: NOW },
    );
    expect(result).toEqual({ entries: [], total: 0 });
  });

  it("sums quantity from matching deeds, defaulting null/0 quantity to 1", () => {
    const target = makeTarget({ targetValue: 100 });
    const members = [
      makeMember("creator", creatorJoin),
      makeMember("alice", memberJoin),
    ];
    const deeds: Deed[] = [
      makeDeed({ userId: "creator", quantity: 33 }),
      makeDeed({ userId: "creator", quantity: 7 }),
      makeDeed({ userId: "alice", quantity: 0 }),
      makeDeed({ userId: "alice", quantity: null as unknown as number }),
    ];
    const { entries, total } = computeCommunityTargetLeaderboard(
      target,
      members,
      deeds,
      "creator",
      { now: NOW },
    );
    expect(total).toBe(2);
    expect(entries[0]).toMatchObject({ userId: "creator", progress: 40, percent: 40, rank: 1 });
    expect(entries[1]).toMatchObject({ userId: "alice", progress: 2, percent: 2, rank: 2 });
  });

  it("excludes deeds that do not match the target's category/type filters", () => {
    const target = makeTarget({ category: "Dzikir", dzikirType: "subhanallah", targetValue: 50 });
    const members = [makeMember("alice", memberJoin)];
    const deeds: Deed[] = [
      makeDeed({ userId: "alice", category: "Dzikir", dzikirType: "subhanallah", quantity: 10 }),
      makeDeed({ userId: "alice", category: "Dzikir", dzikirType: "alhamdulillah", quantity: 99 }),
      makeDeed({ userId: "alice", category: "Sedekah", quantity: 100 }),
    ];
    const { entries } = computeCommunityTargetLeaderboard(target, members, deeds, "alice", { now: NOW });
    expect(entries[0].progress).toBe(10);
  });

  it("excludes deeds outside the current Asia/Jakarta period (daily)", () => {
    const target = makeTarget({ period: "daily", targetValue: 100 });
    const members = [makeMember("alice", memberJoin)];

    // Yesterday in Jakarta == 2026-05-07 12:00 +07 == 2026-05-07T05:00:00Z
    const yesterday = new Date("2026-05-07T05:00:00Z");
    // Tomorrow in Jakarta == 2026-05-09 12:00 +07 == 2026-05-09T05:00:00Z
    const tomorrow = new Date("2026-05-09T05:00:00Z");
    // Just before today's window starts: 16:59:59.999 UTC == 23:59:59.999 +07 yesterday
    const justBeforeStart = new Date("2026-05-07T16:59:59.999Z");
    // Just inside today's window: 17:00:00 UTC == 00:00 +07 today
    const justInsideStart = new Date("2026-05-07T17:00:00.000Z");
    // Just inside today's window end
    const justInsideEnd = new Date("2026-05-08T16:59:59.999Z");
    // Just after today's window ends: next millisecond
    const justAfterEnd = new Date("2026-05-08T17:00:00.000Z");

    const deeds: Deed[] = [
      makeDeed({ id: 1, userId: "alice", quantity: 1, createdAt: yesterday }),
      makeDeed({ id: 2, userId: "alice", quantity: 1, createdAt: tomorrow }),
      makeDeed({ id: 3, userId: "alice", quantity: 1, createdAt: justBeforeStart }),
      makeDeed({ id: 4, userId: "alice", quantity: 1, createdAt: justInsideStart }),
      makeDeed({ id: 5, userId: "alice", quantity: 1, createdAt: IN_WINDOW }),
      makeDeed({ id: 6, userId: "alice", quantity: 1, createdAt: justInsideEnd }),
      makeDeed({ id: 7, userId: "alice", quantity: 1, createdAt: justAfterEnd }),
    ];

    const { entries } = computeCommunityTargetLeaderboard(target, members, deeds, "alice", { now: NOW });
    // Only the three "just inside start", "in-window mid-day", and
    // "just inside end" deeds should count.
    expect(entries[0].progress).toBe(3);
  });

  it("excludes out-of-period deeds even when they match all filters (weekly window)", () => {
    const target = makeTarget({ period: "weekly", targetValue: 100 });
    const members = [makeMember("alice", memberJoin)];
    const lastSunday = new Date("2026-05-03T12:00:00Z"); // Sunday before week start in +07
    const insideThisWeek = new Date("2026-05-05T03:00:00Z"); // Tuesday +07
    const nextMonday = new Date("2026-05-10T17:00:00.000Z"); // 1ms after week end

    const deeds: Deed[] = [
      makeDeed({ id: 1, userId: "alice", quantity: 5, createdAt: lastSunday }),
      makeDeed({ id: 2, userId: "alice", quantity: 7, createdAt: insideThisWeek }),
      makeDeed({ id: 3, userId: "alice", quantity: 9, createdAt: nextMonday }),
    ];

    const { entries } = computeCommunityTargetLeaderboard(target, members, deeds, "alice", { now: NOW });
    expect(entries[0].progress).toBe(7);
  });

  it("ranks by progress desc, breaking ties by earliest joinedAt", () => {
    const target = makeTarget({ targetValue: 100 });
    const members = [
      makeMember("late", otherJoin),
      makeMember("early", memberJoin),
      makeMember("creator", creatorJoin),
    ];
    const deeds: Deed[] = [
      makeDeed({ userId: "late", quantity: 20 }),
      makeDeed({ userId: "early", quantity: 20 }),
      makeDeed({ userId: "creator", quantity: 10 }),
    ];
    const { entries } = computeCommunityTargetLeaderboard(target, members, deeds, "creator", { now: NOW });
    expect(entries.map((e) => [e.userId, e.rank])).toEqual([
      ["early", 1],
      ["late", 2],
      ["creator", 3],
    ]);
  });

  it("caps percent at 100 even when progress exceeds targetValue", () => {
    const target = makeTarget({ targetValue: 10 });
    const members = [makeMember("alice", memberJoin)];
    const deeds: Deed[] = [makeDeed({ userId: "alice", quantity: 999 })];
    const { entries } = computeCommunityTargetLeaderboard(target, members, deeds, "alice", { now: NOW });
    expect(entries[0].progress).toBe(999);
    expect(entries[0].percent).toBe(100);
  });

  it("flags isCurrentUser only on the requesting user's row", () => {
    const target = makeTarget();
    const members = [
      makeMember("creator", creatorJoin),
      makeMember("alice", memberJoin),
    ];
    const { entries } = computeCommunityTargetLeaderboard(target, members, [], "alice", { now: NOW });
    const alice = entries.find((e) => e.userId === "alice");
    const creator = entries.find((e) => e.userId === "creator");
    expect(alice?.isCurrentUser).toBe(true);
    expect(creator?.isCurrentUser).toBe(false);
  });

  it("composes username from firstName/lastName when present", () => {
    const target = makeTarget();
    const members: LeaderboardMember[] = [
      { ...makeMember("alice", memberJoin), firstName: "Ali", lastName: "Smith", username: "fallback" },
      { ...makeMember("bob", otherJoin), firstName: null, lastName: null, username: "bobby" },
    ];
    const { entries } = computeCommunityTargetLeaderboard(target, members, [], "alice", { now: NOW });
    expect(entries.find((e) => e.userId === "alice")?.username).toBe("Ali Smith");
    expect(entries.find((e) => e.userId === "bob")?.username).toBe("bobby");
  });

  it("applies limit and offset over the ranked list", () => {
    const target = makeTarget({ targetValue: 100 });
    const members = [
      makeMember("a", new Date("2026-05-01")),
      makeMember("b", new Date("2026-05-02")),
      makeMember("c", new Date("2026-05-03")),
      makeMember("d", new Date("2026-05-04")),
    ];
    const deeds: Deed[] = [
      makeDeed({ userId: "a", quantity: 4 }),
      makeDeed({ userId: "b", quantity: 3 }),
      makeDeed({ userId: "c", quantity: 2 }),
      makeDeed({ userId: "d", quantity: 1 }),
    ];
    const { entries, total } = computeCommunityTargetLeaderboard(
      target,
      members,
      deeds,
      "a",
      { limit: 2, offset: 1, now: NOW },
    );
    expect(total).toBe(4);
    expect(entries.map((e) => e.userId)).toEqual(["b", "c"]);
    expect(entries.map((e) => e.rank)).toEqual([2, 3]);
  });
});
