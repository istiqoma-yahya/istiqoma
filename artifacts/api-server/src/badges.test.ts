// Run with: npx tsx --test server/badges.test.ts
process.env.SUPABASE_DEV_DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

import { test } from "node:test";
import assert from "node:assert/strict";
import { format, getDay, getDate, getHours } from "date-fns";

import {
  evaluateBadge,
  computeBadgeResults,
  type EvalContext,
  type ExistingBadgeRow,
} from "./badges";
import { BADGE_CATALOG, HARI_RAYA_DATES, type BadgeDef } from "@workspace/db";

type DeedFixture = {
  id?: number;
  category: string;
  sholatType?: string | null;
  fastingType?: string | null;
  isJamaah?: boolean | null;
  quranUnit?: string | null;
  sedekahType?: string | null;
  quantity?: number;
  points?: number;
  createdAt: Date;
  localDate?: string | null;
  editCount?: number | null;
};

function makeCtx(opts: {
  deeds?: DeedFixture[];
  frozenDates?: string[];
  oneTimeTargetsCompleted?: number;
  recurringPeriodsCompleted?: number;
  questExplorerCategories?: number;
  totalTargetsCreated?: number;
  freezerPurchases?: number;
  hasIdentity?: boolean;
} = {}): EvalContext {
  const deeds = opts.deeds ?? [];
  const sorted = deeds.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const deedRows = sorted.map((d, i) => ({
    id: d.id ?? i + 1,
    category: d.category,
    sholatType: d.sholatType ?? null,
    fastingType: d.fastingType ?? null,
    isJamaah: d.isJamaah ?? null,
    quranUnit: d.quranUnit ?? null,
    sedekahType: d.sedekahType ?? null,
    quantity: d.quantity ?? 1,
    points: d.points ?? 0,
    createdAt: d.createdAt,
    localDate: d.localDate ?? null,
    editCount: d.editCount ?? 0,
  }));

  // For unit tests we treat `createdAt` as already in the user's local zone,
  // sidestepping the timezone bucketing used by buildContext in production.
  const deedLocalDate: string[] = [];
  const deedLocalHour: number[] = [];
  const deedLocalDay: number[] = [];
  const deedLocalDayOfMonth: number[] = [];
  const distinctSet = new Set<string>();
  for (const d of deedRows) {
    const ds = format(d.createdAt, "yyyy-MM-dd");
    deedLocalDate.push(ds);
    deedLocalHour.push(getHours(d.createdAt));
    deedLocalDay.push(getDay(d.createdAt));
    deedLocalDayOfMonth.push(getDate(d.createdAt));
    distinctSet.add(ds);
  }
  const distinctDeedDates = Array.from(distinctSet).sort();

  return {
    userId: "u1",
    timezone: "UTC",
    now: new Date("2026-05-03T00:00:00Z"),
    deedRows,
    deedLocalDate,
    deedLocalHour,
    deedLocalDay,
    deedLocalDayOfMonth,
    distinctDeedDates,
    frozenDates: new Set(opts.frozenDates ?? []),
    oneTimeTargetsCompleted: opts.oneTimeTargetsCompleted ?? 0,
    recurringPeriodsCompleted: opts.recurringPeriodsCompleted ?? 0,
    questExplorerCategories: opts.questExplorerCategories ?? 0,
    totalTargetsCreated: opts.totalTargetsCreated ?? 0,
    freezerPurchases: opts.freezerPurchases ?? 0,
    hasIdentity: opts.hasIdentity ?? false,
  };
}

function getDef(id: string): BadgeDef {
  const def = BADGE_CATALOG.find((b) => b.id === id);
  if (!def) throw new Error(`Badge ${id} not in catalog`);
  return def;
}

// Local Date constructor (uses host TZ — fine because makeCtx mirrors it).
function local(year: number, month: number, day: number, hour = 12, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// ── Per-criteria unit tests ─────────────────────────────────────────────

test("deedCount counts deeds in matching category", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 1, 8) },
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 1, 13) },
      { category: "Dzikir", createdAt: local(2026, 1, 1, 14) },
    ],
  });
  assert.equal(evaluateBadge(getDef("ahli-sholat"), ctx), 2);
});

test("deedCount with isJamaah only counts jamaah=true rows", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Sholat Fardhu", isJamaah: true, createdAt: local(2026, 1, 1, 8) },
      { category: "Sholat Fardhu", isJamaah: false, createdAt: local(2026, 1, 1, 13) },
      { category: "Sholat Fardhu", isJamaah: null, createdAt: local(2026, 1, 1, 14) },
    ],
  });
  assert.equal(evaluateBadge(getDef("jamaah-devotee"), ctx), 1);
});

test("deedCount handles category aliases (Shodaqoh ↔ Sedekah/Sadaqah)", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Shodaqoh", createdAt: local(2026, 1, 1, 9) },
      { category: "Sedekah", createdAt: local(2026, 1, 2, 9) },
      { category: "Sadaqah", createdAt: local(2026, 1, 3, 9) },
    ],
  });
  assert.equal(evaluateBadge(getDef("tangan-pemberi"), ctx), 3);
});

test("sumQuantity sums Dzikir quantities", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Dzikir", quantity: 100, createdAt: local(2026, 1, 1, 9) },
      { category: "Dzikir", quantity: 33, createdAt: local(2026, 1, 1, 10) },
      { category: "Sholat Fardhu", quantity: 5, createdAt: local(2026, 1, 1, 11) },
    ],
  });
  assert.equal(evaluateBadge(getDef("pecinta-dzikir"), ctx), 133);
});

test("quranAyatEquiv converts juz/halaman/surat/ayat to ayat-equivalent", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Baca Quran", quranUnit: "juz", quantity: 1, createdAt: local(2026, 1, 1, 9) },
      { category: "Baca Quran", quranUnit: "halaman", quantity: 2, createdAt: local(2026, 1, 1, 10) },
      { category: "Baca Quran", quranUnit: "surat", quantity: 3, createdAt: local(2026, 1, 1, 11) },
      { category: "Baca Quran", quranUnit: "ayat", quantity: 7, createdAt: local(2026, 1, 1, 12) },
      { category: "Baca Quran", quranUnit: null, quantity: 4, createdAt: local(2026, 1, 1, 13) },
    ],
  });
  // 1*600 + 2*15 + 3*55 + 7 + 4 = 806
  assert.equal(evaluateBadge(getDef("sahabat-quran"), ctx), 806);
});

test("fastingCount counts distinct local fasting days across variants", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Puasa Fardhu", createdAt: local(2026, 1, 1, 9) },
      { category: "Puasa Fardhu", createdAt: local(2026, 1, 1, 19) },
      { category: "Puasa Sunnah", createdAt: local(2026, 1, 2, 9) },
      { category: "Fasting Fardhu", createdAt: local(2026, 1, 3, 9) },
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 4, 9) },
    ],
  });
  assert.equal(evaluateBadge(getDef("penahan-hawa"), ctx), 3);
});

test("lifetimePoints sums points across deeds", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Dzikir", points: 10, createdAt: local(2026, 1, 1, 9) },
      { category: "Sholat Fardhu", points: 50, createdAt: local(2026, 1, 1, 10) },
      { category: "Sholat Fardhu", points: 0, createdAt: local(2026, 1, 1, 11) },
    ],
  });
  assert.equal(evaluateBadge(getDef("kolektor-poin"), ctx), 60);
});

test("targetsCompleted sums one-time + recurring period completions", () => {
  const ctx = makeCtx({ oneTimeTargetsCompleted: 4, recurringPeriodsCompleted: 7 });
  assert.equal(evaluateBadge(getDef("pencapai-target"), ctx), 11);
});

test("longestStreak finds the longest run combining deeds and frozen days", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 1, 9) },
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 2, 9) },
      // 2026-01-03 frozen
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 4, 9) },
      // gap
      { category: "Sholat Fardhu", createdAt: local(2026, 1, 10, 9) },
    ],
    frozenDates: ["2026-01-03"],
  });
  assert.equal(evaluateBadge(getDef("istiqomah-streak"), ctx), 4);
});

test("longestStreak returns 0 when no deeds", () => {
  assert.equal(evaluateBadge(getDef("istiqomah-streak"), makeCtx()), 0);
});

test("distinctDaysSholatBeforeHour: subuh before 06:00, distinct days", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 1, 4, 30) },
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 1, 5, 0) },
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 2, 7, 0) },
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 3, 5, 30) },
      { category: "Sholat Fardhu", sholatType: "dzuhur", createdAt: local(2026, 1, 4, 5, 30) },
    ],
  });
  assert.equal(evaluateBadge(getDef("subuh-warrior"), ctx), 2);
});

test("distinctDaysSholat: tahajjud across fardhu+sunnah", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Sholat Sunnah", sholatType: "tahajjud", createdAt: local(2026, 1, 1, 3) },
      { category: "Sholat Sunnah", sholatType: "tahajjud", createdAt: local(2026, 1, 1, 3, 30) },
      { category: "Sholat Sunnah", sholatType: "tahajjud", createdAt: local(2026, 1, 5, 3) },
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 5, 5) },
    ],
  });
  assert.equal(evaluateBadge(getDef("tahajjud-knight"), ctx), 2);
});

test("distinctDaysHourRange: hour bound is half-open [min, maxExclusive)", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Dzikir", createdAt: local(2026, 1, 1, 0, 30) },
      { category: "Dzikir", createdAt: local(2026, 1, 2, 1, 0) },
      { category: "Dzikir", createdAt: local(2026, 1, 3, 3, 59) },
      { category: "Dzikir", createdAt: local(2026, 1, 4, 4, 0) },
    ],
  });
  assert.equal(evaluateBadge(getDef("sleepless-soul"), ctx), 2);
});

test("fullHouseDays: counts only days with all 5 fardhu prayers", () => {
  const day1 = ["subuh", "dzuhur", "ashar", "maghrib", "isya"].map((p, i) => ({
    category: "Sholat Fardhu",
    sholatType: p,
    createdAt: local(2026, 1, 1, 5 + i),
    localDate: "2026-01-01",
  }));
  const day2 = ["subuh", "dzuhur", "ashar", "maghrib"].map((p, i) => ({
    category: "Sholat Fardhu",
    sholatType: p,
    createdAt: local(2026, 1, 2, 5 + i),
    localDate: "2026-01-02",
  }));
  const ctx = makeCtx({ deeds: [...day1, ...day2] });
  assert.equal(evaluateBadge(getDef("full-house"), ctx), 1);
});

test("tripleCrownDays: needs sholat + dzikir + quran on same local day", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 1, 5) },
      { category: "Dzikir", quantity: 10, createdAt: local(2026, 1, 1, 6) },
      { category: "Baca Quran", quranUnit: "ayat", quantity: 5, createdAt: local(2026, 1, 1, 7) },
      { category: "Sholat Fardhu", sholatType: "subuh", createdAt: local(2026, 1, 2, 5) },
      { category: "Dzikir", quantity: 10, createdAt: local(2026, 1, 2, 6) },
    ],
  });
  assert.equal(evaluateBadge(getDef("triple-crown"), ctx), 1);
});

test("questExplorerCategories returns precomputed count", () => {
  assert.equal(evaluateBadge(getDef("quest-explorer"), makeCtx({ questExplorerCategories: 5 })), 5);
});

test("comebackKid counts every break following a run of ≥7 consecutive days", () => {
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) dates.push(`2026-01-${String(i).padStart(2, "0")}`);
  for (let i = 15; i <= 22; i++) dates.push(`2026-01-${String(i).padStart(2, "0")}`);
  dates.push("2026-01-25", "2026-01-26");
  const deeds = dates.map((d) => ({
    category: "Sholat Fardhu",
    createdAt: new Date(`${d}T12:00:00`),
  }));
  assert.equal(evaluateBadge(getDef("comeback-kid"), makeCtx({ deeds })), 2);
});

test("comebackKid returns 0 when no run reaches 7 days", () => {
  const deeds = ["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05"].map((d) => ({
    category: "Dzikir",
    createdAt: new Date(`${d}T12:00:00`),
  }));
  assert.equal(evaluateBadge(getDef("comeback-kid"), makeCtx({ deeds })), 0);
});

test("freezersUsed equals frozenDates set size", () => {
  assert.equal(
    evaluateBadge(getDef("freeze-master"), makeCtx({ frozenDates: ["2026-01-01", "2026-01-02"] })),
    2,
  );
});

test("noFreezeStreak finds longest consecutive deed-day run", () => {
  const deeds = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05"].map((d) => ({
    category: "Dzikir",
    createdAt: new Date(`${d}T12:00:00`),
  }));
  assert.equal(evaluateBadge(getDef("no-freeze-november"), makeCtx({ deeds })), 3);
});

test("ramadhanMarathon best window of fastingType=ramadhan within 30 days", () => {
  const deeds: DeedFixture[] = [];
  for (let i = 1; i <= 29; i++) {
    deeds.push({
      category: "Puasa Fardhu",
      fastingType: "ramadhan",
      createdAt: new Date(`2026-03-${String(i).padStart(2, "0")}T12:00:00`),
    });
  }
  deeds.push({
    category: "Puasa Sunnah",
    fastingType: "ayyamul-bidh",
    createdAt: new Date("2026-06-13T12:00:00"),
  });
  assert.equal(evaluateBadge(getDef("ramadhan-marathoner"), makeCtx({ deeds })), 29);
});

test("puasaSunnahOnWeekdays: senin/kamis only, excludes ramadhan", () => {
  // 2026-01-05 = Mon, 2026-01-08 = Thu, 2026-01-07 = Wed
  const deeds: DeedFixture[] = [
    { category: "Puasa Sunnah", fastingType: "senin-kamis", createdAt: local(2026, 1, 5, 12) },
    { category: "Puasa Sunnah", fastingType: "senin-kamis", createdAt: local(2026, 1, 8, 12) },
    { category: "Puasa Sunnah", fastingType: "senin-kamis", createdAt: local(2026, 1, 7, 12) },
    { category: "Puasa Fardhu", fastingType: "ramadhan", createdAt: local(2026, 1, 5, 12) },
  ];
  assert.equal(evaluateBadge(getDef("senin-kamis"), makeCtx({ deeds })), 2);
});

test("puasaSunnahOnDayOfMonth: 13/14/15 only, excludes ramadhan", () => {
  const deeds: DeedFixture[] = [
    { category: "Puasa Sunnah", fastingType: "ayyamul-bidh", createdAt: local(2026, 2, 13) },
    { category: "Puasa Sunnah", fastingType: "ayyamul-bidh", createdAt: local(2026, 2, 14) },
    { category: "Puasa Sunnah", fastingType: "ayyamul-bidh", createdAt: local(2026, 2, 15) },
    { category: "Puasa Sunnah", fastingType: "ayyamul-bidh", createdAt: local(2026, 2, 16) },
    { category: "Puasa Fardhu", fastingType: "ramadhan", createdAt: local(2026, 3, 14) },
  ];
  assert.equal(evaluateBadge(getDef("ayyamul-bidh"), makeCtx({ deeds })), 3);
});

test("shodaqohDistinctDaysInMonth picks the best month's distinct-day count", () => {
  const deeds: DeedFixture[] = [
    ...Array.from({ length: 7 }, (_, i) => ({
      category: "Shodaqoh",
      createdAt: local(2026, 1, i + 1),
    })),
    { category: "Shodaqoh", createdAt: local(2026, 2, 1) },
    { category: "Shodaqoh", createdAt: local(2026, 2, 1, 18) },
    { category: "Shodaqoh", createdAt: local(2026, 2, 5) },
    { category: "Shodaqoh", createdAt: local(2026, 2, 10) },
    { category: "Shodaqoh", createdAt: local(2026, 2, 20) },
  ];
  assert.equal(evaluateBadge(getDef("diam-diam-bersedekah"), makeCtx({ deeds })), 7);
});

test("deedEdits sums per-deed editCount", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Dzikir", editCount: 3, createdAt: local(2026, 1, 1) },
      { category: "Dzikir", editCount: 7, createdAt: local(2026, 1, 2) },
      { category: "Dzikir", editCount: null, createdAt: local(2026, 1, 3) },
    ],
  });
  assert.equal(evaluateBadge(getDef("mistake-mechanic"), ctx), 10);
});

test("midnightLogger counts deeds whose user-set localDate precedes the bucketed date", () => {
  const ctx = makeCtx({
    deeds: [
      { category: "Dzikir", localDate: "2026-01-01", createdAt: local(2026, 1, 2, 0, 5) },
      { category: "Dzikir", localDate: "2026-01-03", createdAt: local(2026, 1, 3, 12) },
      { category: "Dzikir", localDate: null, createdAt: local(2026, 1, 4, 12) },
    ],
  });
  assert.equal(evaluateBadge(getDef("midnight-logger"), ctx), 1);
});

test("targetsCreated returns ctx.totalTargetsCreated", () => {
  assert.equal(evaluateBadge(getDef("goal-setter"), makeCtx({ totalTargetsCreated: 1 })), 1);
  assert.equal(evaluateBadge(getDef("goal-setter"), makeCtx({ totalTargetsCreated: 0 })), 0);
});

test("onboardingIdentity returns 1 iff hasIdentity", () => {
  assert.equal(evaluateBadge(getDef("identity-found"), makeCtx({ hasIdentity: true })), 1);
  assert.equal(evaluateBadge(getDef("identity-found"), makeCtx({ hasIdentity: false })), 0);
});

test("freezerPurchases passes through ctx.freezerPurchases", () => {
  assert.equal(evaluateBadge(getDef("big-spender"), makeCtx({ freezerPurchases: 4 })), 4);
});

test("hariRayaDeed counts deed days that fall on a Hari Raya date", () => {
  const hariRaya = HARI_RAYA_DATES[0];
  const ctx = makeCtx({
    deeds: [
      { category: "Dzikir", createdAt: new Date(`${hariRaya}T08:00:00`) },
      { category: "Dzikir", createdAt: local(2024, 1, 1, 8) },
    ],
  });
  assert.equal(evaluateBadge(getDef("hari-raya-spirit"), ctx), 1);
});

test("every BadgeCriteria.kind in the catalog is covered by a tested evaluator above", () => {
  const tested = new Set<string>([
    "deedCount",
    "sumQuantity",
    "quranAyatEquiv",
    "fastingCount",
    "lifetimePoints",
    "targetsCompleted",
    "longestStreak",
    "distinctDaysSholatBeforeHour",
    "distinctDaysSholat",
    "distinctDaysHourRange",
    "fullHouseDays",
    "tripleCrownDays",
    "questExplorerCategories",
    "comebackKid",
    "freezersUsed",
    "noFreezeStreak",
    "ramadhanMarathon",
    "puasaSunnahOnWeekdays",
    "puasaSunnahOnDayOfMonth",
    "shodaqohDistinctDaysInMonth",
    "deedEdits",
    "midnightLogger",
    "targetsCreated",
    "onboardingIdentity",
    "freezerPurchases",
    "hariRayaDeed",
  ]);
  for (const def of BADGE_CATALOG) {
    assert.ok(tested.has(def.criteria.kind), `Missing test coverage for kind=${def.criteria.kind}`);
  }
});

// ── Integration tests against a fake in-memory store ────────────────────

function makeStreakCtx(days: number) {
  const deeds: DeedFixture[] = [];
  for (let i = 0; i < days; i++) {
    deeds.push({ category: "Sholat Fardhu", createdAt: new Date(2026, 0, 1 + i, 12) });
  }
  return makeCtx({ deeds });
}

test("computeBadgeResults: first earn persists every newly crossed tier", () => {
  // istiqomah-streak thresholds [7, 30, 100, 365] → a 35-day streak earns tiers 1 and 2.
  const ctx = makeStreakCtx(35);
  const now = new Date("2026-05-03T10:00:00Z");
  const { snapshot, newlyEarned, toInsert } = computeBadgeResults(ctx, [], now);

  const istiqomah = snapshot.badges.find((b) => b.badgeId === "istiqomah-streak")!;
  assert.equal(istiqomah.value, 35);
  assert.equal(istiqomah.earnedTier, 2);

  const istiqomahNew = newlyEarned.filter((n) => n.badgeId === "istiqomah-streak");
  assert.deepEqual(istiqomahNew.map((n) => n.tier).sort(), [1, 2]);
  assert.ok(toInsert.some((r) => r.badgeId === "istiqomah-streak" && r.tier === 1));
  assert.ok(toInsert.some((r) => r.badgeId === "istiqomah-streak" && r.tier === 2));
  assert.equal(istiqomah.earnedAt[1], now.toISOString());
  assert.equal(istiqomah.earnedAt[2], now.toISOString());
});

test("computeBadgeResults: idempotent re-evaluation yields no new earns or inserts", () => {
  const ctx = makeStreakCtx(35);
  const now1 = new Date("2026-05-03T10:00:00Z");
  const first = computeBadgeResults(ctx, [], now1);

  // Persist into an in-memory "store".
  const stored: ExistingBadgeRow[] = first.toInsert.map((r) => ({
    badgeId: r.badgeId,
    tier: r.tier,
    earnedAt: now1,
  }));

  const now2 = new Date("2026-05-04T10:00:00Z");
  const second = computeBadgeResults(ctx, stored, now2);

  assert.deepEqual(second.toInsert, []);
  assert.deepEqual(second.newlyEarned, []);
  assert.equal(second.snapshot.earnedBadges, first.snapshot.earnedBadges);

  const istiqomah = second.snapshot.badges.find((b) => b.badgeId === "istiqomah-streak")!;
  assert.equal(istiqomah.earnedAt[1], now1.toISOString());
  assert.equal(istiqomah.earnedAt[2], now1.toISOString());
});

test("computeBadgeResults: tier upgrade only inserts the newly crossed tier", () => {
  // Initial: 7-day streak earns istiqomah tier 1.
  const ctx1 = makeStreakCtx(7);
  const now1 = new Date("2026-05-03T10:00:00Z");
  const first = computeBadgeResults(ctx1, [], now1);

  const istiqomah1 = first.snapshot.badges.find((b) => b.badgeId === "istiqomah-streak")!;
  assert.equal(istiqomah1.earnedTier, 1);
  assert.ok(first.newlyEarned.find((n) => n.badgeId === "istiqomah-streak" && n.tier === 1));

  const stored: ExistingBadgeRow[] = [
    { badgeId: "istiqomah-streak", tier: 1, earnedAt: now1 },
  ];

  // Later: streak grows to 30 → tier 2 newly earned.
  const ctx2 = makeStreakCtx(30);
  const now2 = new Date("2026-06-01T10:00:00Z");
  const second = computeBadgeResults(ctx2, stored, now2);

  const istiqomah2 = second.snapshot.badges.find((b) => b.badgeId === "istiqomah-streak")!;
  assert.equal(istiqomah2.earnedTier, 2);

  const newIstiqomah = second.newlyEarned.filter((n) => n.badgeId === "istiqomah-streak");
  assert.deepEqual(newIstiqomah.map((n) => n.tier), [2]);

  assert.ok(second.toInsert.some((r) => r.badgeId === "istiqomah-streak" && r.tier === 2));
  assert.ok(!second.toInsert.some((r) => r.badgeId === "istiqomah-streak" && r.tier === 1));

  // Existing tier 1 keeps its original earnedAt; tier 2 takes the new now.
  assert.equal(istiqomah2.earnedAt[1], now1.toISOString());
  assert.equal(istiqomah2.earnedAt[2], now2.toISOString());
});

test("computeBadgeResults: snapshot.latestEarned reflects the most recent earnedAt", () => {
  const ctx = makeStreakCtx(35);
  const now = new Date("2026-05-03T10:00:00Z");
  const { snapshot } = computeBadgeResults(ctx, [], now);

  assert.ok(snapshot.latestEarned);
  assert.equal(snapshot.latestEarned!.earnedAt, now.toISOString());
  assert.equal(snapshot.totalBadges, BADGE_CATALOG.length);
  assert.ok(snapshot.earnedBadges > 0);
});

test("computeBadgeResults: empty context yields zero earns", () => {
  const { snapshot, newlyEarned, toInsert } = computeBadgeResults(makeCtx(), []);
  assert.deepEqual(toInsert, []);
  assert.deepEqual(newlyEarned, []);
  assert.equal(snapshot.earnedBadges, 0);
  assert.equal(snapshot.latestEarned, null);
  assert.equal(snapshot.totalBadges, BADGE_CATALOG.length);
  for (const b of snapshot.badges) assert.equal(b.earnedTier, 0);
});
