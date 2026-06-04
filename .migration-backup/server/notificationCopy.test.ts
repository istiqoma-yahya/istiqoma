// Run with: npx tsx --test server/notificationCopy.test.ts
process.env.SUPABASE_DEV_DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

import { test } from "node:test";
import assert from "node:assert/strict";

const mod = await import("./notificationCopy");
const { dailyReminderCopy, targetReminderCopy, sholatReminderCopy, pickIndex } = mod;
type DisplayName = import("./notificationCopy").DisplayName;

const RealDate = globalThis.Date;
const DAY_MS = 86_400_000;
const BASE = RealDate.UTC(2026, 4, 1);

// Freeze "now" so dayOfYear() is deterministic. Arg-form Date construction
// (used by dayOfYear's start-of-year calc) passes through to the real Date.
function withDate(ts: number, fn: () => void): void {
  const stub: DateConstructor = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      if (args.length === 0) {
        return Reflect.construct(target, [ts], newTarget);
      }
      return Reflect.construct(target, args, newTarget);
    },
    get(target, prop, receiver) {
      if (prop === "now") return () => ts;
      return Reflect.get(target, prop, receiver);
    },
  });
  globalThis.Date = stub;
  try {
    fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

function assertWellFormed(
  o: { title: string; body: string },
  label: string,
) {
  for (const [field, value] of [
    ["title", o.title],
    ["body", o.body],
  ] as const) {
    assert.equal(typeof value, "string", `${label}: ${field} not string`);
    assert.ok(value.trim().length > 0, `${label}: empty ${field}`);
    assert.ok(
      !value.includes("undefined"),
      `${label}: 'undefined' in ${field}: "${value}"`,
    );
    assert.ok(
      !/\bnull\b/.test(value),
      `${label}: 'null' in ${field}: "${value}"`,
    );
    assert.ok(
      !value.includes("${"),
      `${label}: unrendered template in ${field}: "${value}"`,
    );
    assert.ok(
      !/\bNaN\b/.test(value),
      `${label}: 'NaN' in ${field}: "${value}"`,
    );
    // Catches "Hey , ..." style empty-name interpolation.
    assert.ok(
      !/\s,/.test(value),
      `${label}: space-before-comma in ${field}: "${value}"`,
    );
    // Catches stray leading punctuation like ", foo".
    assert.ok(
      !/^[,.!?]/.test(value.trimStart()),
      `${label}: leading punctuation in ${field}: "${value}"`,
    );
  }
}

const NAMES: DisplayName[] = [
  null,
  "Aisha",
  "أحمد",
  "A".repeat(80),
];

const USER_IDS = ["user-1", "user-2", "user-with-a-rather-long-id-xyz"];

// Iterating DAY_ITERATIONS consecutive days walks every variant index for
// any pool of size <= DAY_ITERATIONS (pickIndex shifts by 1 per day).
const DAY_ITERATIONS = 20;

test("pool-size assumption: DAY_ITERATIONS covers any current pool", () => {
  const seen = new Set<number>();
  for (let day = 0; day < DAY_ITERATIONS; day++) {
    withDate(BASE + day * DAY_MS, () => {
      seen.add(pickIndex("user-1", "daily", DAY_ITERATIONS));
    });
  }
  assert.equal(seen.size, DAY_ITERATIONS);
});

// ---------- daily ----------

test("dailyReminderCopy: every variant renders safely for all name shapes", () => {
  for (let day = 0; day < DAY_ITERATIONS; day++) {
    withDate(BASE + day * DAY_MS, () => {
      for (const userId of USER_IDS) {
        for (const name of NAMES) {
          const out = dailyReminderCopy(userId, name);
          assertWellFormed(
            out,
            `daily day=${day} user=${userId} name=${String(name)}`,
          );
        }
      }
    });
  }
});

test("dailyReminderCopy: rotation produces different copy across consecutive days", () => {
  let a!: { title: string; body: string };
  let b!: { title: string; body: string };
  withDate(BASE, () => {
    a = dailyReminderCopy("user-1", "Aisha");
  });
  withDate(BASE + DAY_MS, () => {
    b = dailyReminderCopy("user-1", "Aisha");
  });
  assert.notDeepEqual(a, b, "consecutive-day copy should rotate");
});

test("dailyReminderCopy: deterministic for same day + user + bucket", () => {
  withDate(BASE, () => {
    const a = dailyReminderCopy("user-1", "Aisha");
    const b = dailyReminderCopy("user-1", "Aisha");
    assert.deepEqual(a, b);
  });
});

test("dailyReminderCopy: name-null falls back to a generic greeter", () => {
  withDate(BASE, () => {
    const out = dailyReminderCopy("user-1", null);
    assertWellFormed(out, "daily-null-name");
    assert.ok(!/^\s*,/.test(out.body));
  });
});

// ---------- target ----------

type TargetCase = {
  label: string;
  args: {
    targetName: string;
    progress: number;
    goal: number;
    percent: number;
    targetType: "achievement" | "limit";
  };
};

const TARGET_CASES: TargetCase[] = [
  {
    label: "achievement progress=0",
    args: { targetName: "Tahajud", progress: 0, goal: 5, percent: 0, targetType: "achievement" },
  },
  {
    label: "achievement on-track",
    args: { targetName: "Tahajud", progress: 3, goal: 5, percent: 60, targetType: "achievement" },
  },
  {
    label: "achievement progress=goal",
    args: { targetName: "Tahajud", progress: 5, goal: 5, percent: 100, targetType: "achievement" },
  },
  {
    label: "achievement progress > goal",
    args: { targetName: "Tahajud", progress: 12, goal: 5, percent: 240, targetType: "achievement" },
  },
  {
    label: "achievement very long target name",
    args: {
      targetName: "صلاة التهجد في جوف الليل لأطول وقت ممكن وبخشوع كامل ".repeat(4),
      progress: 0,
      goal: 7,
      percent: 0,
      targetType: "achievement",
    },
  },
  {
    label: "limit within",
    args: { targetName: "Maksiat", progress: 0, goal: 3, percent: 0, targetType: "limit" },
  },
  {
    label: "limit at edge",
    args: { targetName: "Maksiat", progress: 3, goal: 3, percent: 100, targetType: "limit" },
  },
  {
    label: "limit exceeded",
    args: { targetName: "Maksiat", progress: 5, goal: 3, percent: 167, targetType: "limit" },
  },
  {
    label: "limit very long name + exceeded",
    args: {
      targetName: "X".repeat(200),
      progress: 99,
      goal: 1,
      percent: 9900,
      targetType: "limit",
    },
  },
];

test("targetReminderCopy: every variant renders safely across all cases", () => {
  for (let day = 0; day < DAY_ITERATIONS; day++) {
    withDate(BASE + day * DAY_MS, () => {
      for (const userId of USER_IDS) {
        for (const name of NAMES) {
          for (const c of TARGET_CASES) {
            const out = targetReminderCopy(userId, name, c.args);
            assertWellFormed(
              out,
              `target ${c.label} day=${day} user=${userId} name=${String(name)}`,
            );
          }
        }
      }
    });
  }
});

test("targetReminderCopy: routes by targetType + percent", () => {
  withDate(BASE, () => {
    const ontrack = targetReminderCopy("user-1", "Aisha", {
      targetName: "Tahajud", progress: 1, goal: 5, percent: 20, targetType: "achievement",
    });
    const achieved = targetReminderCopy("user-1", "Aisha", {
      targetName: "Tahajud", progress: 5, goal: 5, percent: 100, targetType: "achievement",
    });
    assert.notDeepEqual(ontrack, achieved);

    const ok = targetReminderCopy("user-1", "Aisha", {
      targetName: "Maksiat", progress: 1, goal: 3, percent: 33, targetType: "limit",
    });
    const over = targetReminderCopy("user-1", "Aisha", {
      targetName: "Maksiat", progress: 5, goal: 3, percent: 167, targetType: "limit",
    });
    assert.notDeepEqual(ok, over);
  });
});

test("targetReminderCopy: deterministic for same day + user + bucket", () => {
  withDate(BASE, () => {
    const args = {
      targetName: "Tahajud", progress: 3, goal: 5, percent: 60, targetType: "achievement" as const,
    };
    const a = targetReminderCopy("user-1", "Aisha", args);
    const b = targetReminderCopy("user-1", "Aisha", args);
    assert.deepEqual(a, b);
  });
});

test("targetReminderCopy: rotation differs across consecutive days for same user", () => {
  const args = {
    targetName: "Tahajud", progress: 3, goal: 5, percent: 60, targetType: "achievement" as const,
  };
  let a!: { title: string; body: string };
  let b!: { title: string; body: string };
  withDate(BASE, () => { a = targetReminderCopy("user-1", "Aisha", args); });
  withDate(BASE + DAY_MS, () => { b = targetReminderCopy("user-1", "Aisha", args); });
  assert.notDeepEqual(a, b);
});

test("targetReminderCopy: very long target names are truncated in output", () => {
  withDate(BASE, () => {
    const longName = "Z".repeat(500);
    const out = targetReminderCopy("user-1", "Aisha", {
      targetName: longName,
      progress: 0,
      goal: 1,
      percent: 0,
      targetType: "achievement",
    });
    assert.ok(!out.title.includes(longName));
    assert.ok(!out.body.includes(longName));
  });
});

// ---------- sholat ----------

const PRAYER_NAMES = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"];

test("sholatReminderCopy: every variant renders safely across all name shapes", () => {
  for (let day = 0; day < DAY_ITERATIONS; day++) {
    withDate(BASE + day * DAY_MS, () => {
      for (const userId of USER_IDS) {
        for (const name of NAMES) {
          for (const prayerName of PRAYER_NAMES) {
            const out = sholatReminderCopy(userId, name, {
              prayerName,
              hours: "04",
              minutes: "37",
              minutesBefore: 10,
            });
            assertWellFormed(
              out,
              `sholat ${prayerName} day=${day} user=${userId} name=${String(name)}`,
            );
          }
        }
      }
    });
  }
});

test("sholatReminderCopy: deterministic for same day + user + prayer", () => {
  withDate(BASE, () => {
    const args = { prayerName: "Subuh", hours: "04", minutes: "37", minutesBefore: 10 };
    const a = sholatReminderCopy("user-1", "Aisha", args);
    const b = sholatReminderCopy("user-1", "Aisha", args);
    assert.deepEqual(a, b);
  });
});

test("sholatReminderCopy: rotates across consecutive days for same user + prayer", () => {
  const args = { prayerName: "Subuh", hours: "04", minutes: "37", minutesBefore: 10 };
  let a!: { title: string; body: string };
  let b!: { title: string; body: string };
  withDate(BASE, () => { a = sholatReminderCopy("user-1", "Aisha", args); });
  withDate(BASE + DAY_MS, () => { b = sholatReminderCopy("user-1", "Aisha", args); });
  assert.notDeepEqual(a, b);
});

// ---------- pickIndex ----------

test("pickIndex: stable for same inputs on the same day", () => {
  withDate(BASE, () => {
    assert.equal(pickIndex("user-1", "daily", 6), pickIndex("user-1", "daily", 6));
  });
});

test("pickIndex: returns 0 for empty pool", () => {
  withDate(BASE, () => {
    assert.equal(pickIndex("user-1", "daily", 0), 0);
  });
});

test("pickIndex: shifts by exactly 1 across consecutive days", () => {
  let a!: number;
  let b!: number;
  const pool = 7;
  withDate(BASE, () => { a = pickIndex("user-1", "daily", pool); });
  withDate(BASE + DAY_MS, () => { b = pickIndex("user-1", "daily", pool); });
  assert.equal(b, (a + 1) % pool);
});
