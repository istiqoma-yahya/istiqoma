import { describe, it, expect, vi, beforeEach } from "vitest";
import { subDays } from "date-fns";
import type { Deed, Target, TargetHistory } from "@shared/schema";

// Hoisted, mutable config the mocked `db` reads from. Each test rewrites these
// fields; the mock closes over the same object reference so the changes are
// visible without re-mocking.
const h = vi.hoisted(() => ({
  cfg: {
    target: null as any,
    existingTz: [] as any[],
    historyStore: [] as any[],
    failInsert: false,
  },
}));

// Mock the real Postgres-backed `db` so no database (or env vars) are needed.
// The fake faithfully models the one transaction in
// `calculateAndSaveTargetHistory`: a delete followed by a multi-row insert,
// where the result is committed ONLY if the whole callback resolves. That lets
// us assert real rollback semantics when the insert throws midway.
vi.mock("../../server/db", () => {
  const cfg = h.cfg;

  function selectBuilder(cols: unknown) {
    // The function issues exactly two db.select reads inside this method:
    //   - db.select()            -> the target row
    //   - db.select({ timezone}) -> the most-recent history row's timezone
    // Branch on whether columns were passed to tell them apart.
    const isTzRead = cols !== undefined;
    const chain: any = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      then: (resolve: any, reject: any) =>
        Promise.resolve(isTzRead ? cfg.existingTz : [cfg.target]).then(resolve, reject),
    };
    return chain;
  }

  const db = {
    select: (cols?: unknown) => selectBuilder(cols),
    async transaction(cb: (tx: any) => Promise<any>) {
      // Operate on a copy; only commit back if the callback succeeds.
      const working = [...cfg.historyStore];
      const tx = {
        delete: () => ({
          where: () => {
            working.length = 0;
            return Promise.resolve([]);
          },
        }),
        insert: () => ({
          values: (rows: any[]) => ({
            returning: () => {
              if (cfg.failInsert) {
                return Promise.reject(new Error("insert failed midway"));
              }
              working.push(...rows);
              return Promise.resolve(rows);
            },
          }),
        }),
      };
      const result = await cb(tx);
      cfg.historyStore = working; // commit
      return result;
    },
  };

  return { db, pool: {} };
});

import { DatabaseStorage } from "../../server/storage";

const USER = "test-user";
const TZ = "Asia/Jakarta";
const now0 = new Date();

// A deed placed at midday Jakarta (05:00 UTC = 12:00 WIB) `n` days ago, safely
// away from any midnight boundary so the two recompute calls — which each read
// their own `new Date()` microseconds apart — never flip the deed into a
// neighbouring period.
function dayAt(n: number): Date {
  const d = subDays(now0, n);
  d.setUTCHours(5, 0, 0, 0);
  return d;
}

function makeDeed(overrides: Partial<Deed>): Deed {
  return {
    id: 0,
    userId: USER,
    category: "Dzikir",
    description: null,
    points: 0,
    quantity: 1,
    deedType: "good",
    dzikirType: null,
    sholatType: null,
    fastingType: null,
    quranUnit: null,
    sedekahType: null,
    customUnit: null,
    isJamaah: null,
    createdAt: now0,
    ...overrides,
  } as Deed;
}

// Achievement target of 100/day. Created 30 days ago so all looked-back daily
// periods are valid.
const TARGET = {
  id: 1,
  userId: USER,
  name: "Daily Dzikir",
  category: "Dzikir",
  targetValue: 100,
  targetType: "achievement",
  period: "daily",
  createdAt: subDays(now0, 30),
  dzikirType: null,
  sholatType: null,
  fastingType: null,
  quranUnit: null,
  sedekahType: null,
  customUnit: null,
  isJamaah: null,
} as unknown as Target;

// Deed fixture: day-1 totals 110 (>=100 -> completed), day-2 totals 30 (<100).
const DEEDS: Deed[] = [
  makeDeed({ id: 1, createdAt: dayAt(1), quantity: 60 }),
  makeDeed({ id: 2, createdAt: dayAt(1), quantity: 50 }),
  makeDeed({ id: 3, createdAt: dayAt(2), quantity: 30 }),
];

const PERIODS_BACK = 7;

let storage: DatabaseStorage;
let getDeedsSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  h.cfg.target = TARGET;
  h.cfg.existingTz = [];
  h.cfg.historyStore = [];
  h.cfg.failInsert = false;

  storage = new DatabaseStorage();
  // resolveUserTimezone is private and reads a push subscription from the DB;
  // pin it so period boundaries are deterministic.
  vi.spyOn(DatabaseStorage.prototype as any, "resolveUserTimezone").mockResolvedValue(TZ);
  // getDeeds is the fallback deed source when the prefetch window doesn't cover
  // the history window. Default it to the same fixture as the prefetched list.
  getDeedsSpy = vi.spyOn(DatabaseStorage.prototype, "getDeeds").mockResolvedValue(DEEDS);
});

// Reduce a history result to just the values users actually see, so we can
// compare the different code paths for exact equality.
function normalize(rows: TargetHistory[]) {
  return rows.map((r) => ({
    periodStart: new Date(r.periodStart).toISOString(),
    periodEnd: new Date(r.periodEnd).toISOString(),
    achievedValue: r.achievedValue,
    completed: r.completed,
  }));
}

describe("calculateAndSaveTargetHistory — prefetch reuse vs. fallback", () => {
  it("covering-prefetch path skips getDeeds and reuses the caller's deeds", async () => {
    // since=createdAt (<= oldest period start) => window covers => reuse.
    const rows = await storage.calculateAndSaveTargetHistory(
      TARGET.id,
      USER,
      PERIODS_BACK,
      TZ,
      { deeds: DEEDS, since: TARGET.createdAt ?? undefined },
    );

    expect(getDeedsSpy).not.toHaveBeenCalled();
    expect(rows.length).toBe(PERIODS_BACK);

    // Sanity: day-1 (110) completed, day-2 (30) not, the rest 0.
    const completedCount = rows.filter((r) => r.completed).length;
    expect(completedCount).toBe(1);
    const totalAchieved = rows.reduce((s, r) => s + r.achievedValue, 0);
    expect(totalAchieved).toBe(140);
  });

  it("no-prefetch path fetches deeds via getDeeds", async () => {
    h.cfg.historyStore = [];
    const rows = await storage.calculateAndSaveTargetHistory(TARGET.id, USER, PERIODS_BACK, TZ);

    expect(getDeedsSpy).toHaveBeenCalledTimes(1);
    expect(rows.length).toBe(PERIODS_BACK);
  });

  it("non-covering prefetch falls back to getDeeds", async () => {
    h.cfg.historyStore = [];
    // since=now (> oldest period start) => window does NOT cover => fallback.
    const rows = await storage.calculateAndSaveTargetHistory(
      TARGET.id,
      USER,
      PERIODS_BACK,
      TZ,
      { deeds: DEEDS, since: new Date() },
    );

    expect(getDeedsSpy).toHaveBeenCalledTimes(1);
    expect(rows.length).toBe(PERIODS_BACK);
  });

  it("produces identical streak/total/completed values across all three paths", async () => {
    // Path A: covering prefetch (reuse).
    h.cfg.historyStore = [];
    const a = normalize(
      await storage.calculateAndSaveTargetHistory(TARGET.id, USER, PERIODS_BACK, TZ, {
        deeds: DEEDS,
        since: TARGET.createdAt ?? undefined,
      }),
    );

    // Path B: no prefetch (getDeeds fallback).
    h.cfg.historyStore = [];
    const b = normalize(
      await storage.calculateAndSaveTargetHistory(TARGET.id, USER, PERIODS_BACK, TZ),
    );

    // Path C: non-covering prefetch (getDeeds fallback).
    h.cfg.historyStore = [];
    const c = normalize(
      await storage.calculateAndSaveTargetHistory(TARGET.id, USER, PERIODS_BACK, TZ, {
        deeds: DEEDS,
        since: new Date(),
      }),
    );

    expect(a).toEqual(b);
    expect(a).toEqual(c);

    // The current streak (consecutive completed from the most recent period)
    // must also be identical — derive it the same way the app does.
    const streak = (rows: typeof a) => {
      let s = 0;
      for (const r of rows) {
        if (r.completed) s++;
        else break;
      }
      return s;
    };
    expect(streak(a)).toBe(streak(b));
    expect(streak(a)).toBe(streak(c));
  });
});

describe("calculateAndSaveTargetHistory — transaction rollback", () => {
  it("leaves existing history intact when the insert fails midway", async () => {
    const existing: TargetHistory[] = [
      {
        id: 99,
        targetId: TARGET.id,
        userId: USER,
        category: "Dzikir",
        dzikirType: null,
        sholatType: null,
        fastingType: null,
        periodStart: subDays(now0, 2),
        periodEnd: subDays(now0, 1),
        achievedValue: 42,
        targetValue: 100,
        targetType: "achievement",
        completed: true,
        timezone: TZ,
      } as unknown as TargetHistory,
    ];
    h.cfg.historyStore = [...existing];
    const snapshot = JSON.parse(JSON.stringify(existing));
    h.cfg.failInsert = true;

    await expect(
      storage.calculateAndSaveTargetHistory(TARGET.id, USER, PERIODS_BACK, TZ, {
        deeds: DEEDS,
        since: TARGET.createdAt ?? undefined,
      }),
    ).rejects.toThrow(/insert failed/i);

    // The delete+insert ran inside one transaction; the failed insert must roll
    // the delete back, so the pre-existing history row is untouched.
    expect(JSON.parse(JSON.stringify(h.cfg.historyStore))).toEqual(snapshot);
  });

  it("commits the rebuilt history when the insert succeeds", async () => {
    h.cfg.historyStore = [{ id: 1, stale: true } as any];
    h.cfg.failInsert = false;

    const rows = await storage.calculateAndSaveTargetHistory(TARGET.id, USER, PERIODS_BACK, TZ, {
      deeds: DEEDS,
      since: TARGET.createdAt ?? undefined,
    });

    // The stale row is gone and the store now holds exactly the rebuilt rows.
    expect(h.cfg.historyStore.length).toBe(rows.length);
    expect(h.cfg.historyStore.some((r: any) => r.stale)).toBe(false);
  });
});
