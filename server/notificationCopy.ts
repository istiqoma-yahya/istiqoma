import { authStorage } from "./replit_integrations/auth/storage";

export type DisplayName = string | null;

export async function getDisplayName(userId: string): Promise<DisplayName> {
  try {
    const user = await authStorage.getUser(userId);
    if (!user) return null;
    const first = (user.firstName || "").trim();
    if (first) return first;
    const username = (user.username || "").trim();
    if (username) return username;
    return null;
  } catch {
    return null;
  }
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function pickIndex(userId: string, bucket: string, poolSize: number): number {
  if (poolSize <= 0) return 0;
  const seed = hashStr(`${userId}|${bucket}`) + dayOfYear();
  return seed % poolSize;
}

type Variant<C> = (ctx: C & { name: DisplayName }) => { title: string; body: string };

function pick<C>(variants: Variant<C>[], userId: string, bucket: string, ctx: C & { name: DisplayName }) {
  const idx = pickIndex(userId, bucket, variants.length);
  return variants[idx](ctx);
}

const GENERIC_GREETINGS_EN = ["Hey there", "Assalamu'alaikum", "Friend", "You"];
const GENERIC_GREETINGS_ID = ["Assalamu'alaikum", "Sahabat", "Teman"];

function greetEn(name: DisplayName, userId: string, bucket: string): string {
  if (name) return name;
  const pool = GENERIC_GREETINGS_EN;
  return pool[pickIndex(userId, `${bucket}|greet-en`, pool.length)];
}

function greetId(name: DisplayName, userId: string, bucket: string): string {
  if (name) return name;
  const pool = GENERIC_GREETINGS_ID;
  return pool[pickIndex(userId, `${bucket}|greet-id`, pool.length)];
}

// ===== Daily reminder (English) =====
const DAILY_VARIANTS: Variant<{ userId: string }>[] = [
  ({ name, userId }) => ({
    title: "Istiqoma Daily Reminder",
    body: `${greetEn(name, userId, "daily")}, your deeds are waiting to be logged today.`,
  }),
  ({ name, userId }) => ({
    title: name ? `${name}, log today's deeds` : "Log today's deeds",
    body: "Only a few hours left in the day — don't let it slip away.",
  }),
  ({ name, userId }) => ({
    title: "Keep your streak alive",
    body: `${greetEn(name, userId, "daily")}, a quick log now keeps your momentum going.`,
  }),
  ({ name }) => ({
    title: "MasyaAllah, time to reflect",
    body: name
      ? `${name}, take a moment to log the good you did today.`
      : "Take a moment to log the good you did today.",
  }),
  ({ name, userId }) => ({
    title: "People who log daily stay consistent",
    body: `${greetEn(name, userId, "daily")} — be one of them. Log today's deeds in under a minute.`,
  }),
  ({ name }) => ({
    title: name ? `${name}, small steps, big rewards` : "Small steps, big rewards",
    body: "Log even one deed today — consistency compounds.",
  }),
]; 

export function dailyReminderCopy(userId: string, name: DisplayName) {
  return pick(DAILY_VARIANTS, userId, "daily", { name, userId });
}

// ===== Target reminders (English) =====
type TargetCtx = {
  userId: string;
  targetName: string;
  progress: number;
  goal: number;
  percent: number;
};

const TARGET_ACHIEVED_VARIANTS: Variant<TargetCtx>[] = [
  ({ name, targetName, progress, goal, userId }) => ({
    title: `Target hit: ${targetName}`,
    body: name
      ? `MasyaAllah ${name}! You reached ${progress}/${goal} on ${targetName}.`
      : `MasyaAllah! You reached ${progress}/${goal} on ${targetName}.`,
  }),
  ({ name, targetName, userId }) => ({
    title: name ? `${name}, you did it!` : "You did it!",
    body: `${targetName} — goal achieved. Keep that energy going.`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: "Alhamdulillah",
    body: name
      ? `${name}, ${targetName} is complete (${progress}/${goal}). May Allah accept it.`
      : `${targetName} is complete (${progress}/${goal}). May Allah accept it.`,
  }),
  ({ name, targetName, userId }) => ({
    title: `${targetName}: complete`,
    body: `${greetEn(name, userId, "target-done")}, this is what consistency looks like.`,
  }),
  ({ targetName, name }) => ({
    title: name ? `Strong work, ${name}` : "Strong work",
    body: `You closed out ${targetName} for this period. One more streak in the bag.`,
  }),
];

const TARGET_ONTRACK_VARIANTS: Variant<TargetCtx>[] = [
  ({ name, targetName, progress, goal, percent, userId }) => ({
    title: `Target Reminder: ${targetName}`,
    body: `${greetEn(name, userId, "target-ontrack")}, you're at ${progress}/${goal} (${percent}%). Keep going!`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: name ? `${name}, almost there` : "Almost there",
    body: `${targetName}: ${progress}/${goal}. A little more closes the gap.`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: `Don't break the streak`,
    body: name
      ? `${name}, ${targetName} is at ${progress}/${goal}. Don't lose the progress you've built.`
      : `${targetName} is at ${progress}/${goal}. Don't lose the progress you've built.`,
  }),
  ({ name, targetName, percent, userId }) => ({
    title: `${targetName}: ${percent}% done`,
    body: `${greetEn(name, userId, "target-ontrack")}, finish strong — every deed counts.`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: "Quick check-in",
    body: name
      ? `${name}, you're ${progress}/${goal} on ${targetName}. One more push?`
      : `You're ${progress}/${goal} on ${targetName}. One more push?`,
  }),
  ({ name, targetName }) => ({
    title: name ? `Stay consistent, ${name}` : "Stay consistent",
    body: `${targetName} — consistent people finish what they start. Be one of them.`,
  }),
];

const TARGET_LIMIT_OK_VARIANTS: Variant<TargetCtx>[] = [
  ({ name, targetName, progress, goal, userId }) => ({
    title: `${targetName}: within limit`,
    body: `${greetEn(name, userId, "limit-ok")}, you're at ${progress}/${goal}. Stay mindful.`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: name ? `Good control, ${name}` : "Good control",
    body: `${targetName}: ${progress}/${goal} so far. Keep your guard up.`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: `${targetName} check-in`,
    body: name
      ? `${name}, ${progress}/${goal} used. You're still in safe territory.`
      : `${progress}/${goal} used. You're still in safe territory.`,
  }),
  ({ name, targetName, userId }) => ({
    title: `Stay mindful`,
    body: `${greetEn(name, userId, "limit-ok")}, ${targetName} is within limit — let's keep it that way.`,
  }),
  ({ name, targetName }) => ({
    title: name ? `${name}, discipline pays off` : "Discipline pays off",
    body: `${targetName} is still under control. Every restraint counts.`,
  }),
];

const TARGET_LIMIT_EXCEEDED_VARIANTS: Variant<TargetCtx>[] = [
  ({ name, targetName, progress, goal, userId }) => ({
    title: `${targetName}: limit exceeded`,
    body: `${greetEn(name, userId, "limit-over")}, you're at ${progress}/${goal}. Time to pause and reset.`,
  }),
  ({ name, targetName }) => ({
    title: name ? `${name}, gentle reminder` : "Gentle reminder",
    body: `${targetName} is over your limit. Tomorrow is a fresh start, in sha Allah.`,
  }),
  ({ name, targetName, progress, goal }) => ({
    title: `Limit passed`,
    body: name
      ? `${name}, ${targetName}: ${progress}/${goal}. Step back and breathe.`
      : `${targetName}: ${progress}/${goal}. Step back and breathe.`,
  }),
  ({ name, targetName, userId }) => ({
    title: `${targetName}: over the line`,
    body: `${greetEn(name, userId, "limit-over")}, every reset is a chance to grow. Don't give up.`,
  }),
  ({ name, targetName }) => ({
    title: name ? `${name}, you can recover` : "You can recover",
    body: `${targetName} is past its limit — what matters now is the next choice.`,
  }),
];

function truncate(s: string, max = 40): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function targetReminderCopy(
  userId: string,
  name: DisplayName,
  args: { targetName: string; progress: number; goal: number; percent: number; targetType: "achievement" | "limit" | string },
) {
  const ctx: TargetCtx & { name: DisplayName } = {
    name,
    userId,
    targetName: truncate(args.targetName),
    progress: args.progress,
    goal: args.goal,
    percent: args.percent,
  };
  if (args.targetType === "limit") {
    if (args.percent <= 100) {
      return pick(TARGET_LIMIT_OK_VARIANTS, userId, "target-limit-ok", ctx);
    }
    return pick(TARGET_LIMIT_EXCEEDED_VARIANTS, userId, "target-limit-over", ctx);
  }
  if (args.percent >= 100) {
    return pick(TARGET_ACHIEVED_VARIANTS, userId, "target-achieved", ctx);
  }
  return pick(TARGET_ONTRACK_VARIANTS, userId, "target-ontrack", ctx);
}

// ===== Sholat reminders (Indonesian) =====
type SholatCtx = {
  userId: string;
  prayerName: string;
  hours: string;
  minutes: string;
  minutesBefore: number;
};

const SHOLAT_VARIANTS: Variant<SholatCtx>[] = [
  ({ name, prayerName, hours, minutes, minutesBefore, userId }) => ({
    title: `Waktu Sholat ${prayerName}`,
    body: `${greetId(name, userId, "sholat")}, sholat ${prayerName} ${minutesBefore} menit lagi (${hours}:${minutes}). Siapkan diri.`,
  }),
  ({ name, prayerName, hours, minutes, minutesBefore }) => ({
    title: name ? `${name}, ${prayerName} sebentar lagi` : `${prayerName} sebentar lagi`,
    body: `${minutesBefore} menit menuju ${prayerName} (${hours}:${minutes}). Yuk berwudhu.`,
  }),
  ({ name, prayerName, hours, minutes }) => ({
    title: `Bersiap untuk ${prayerName}`,
    body: name
      ? `${name}, jam ${hours}:${minutes} adzan ${prayerName}. Jangan sampai terlewat.`
      : `Jam ${hours}:${minutes} adzan ${prayerName}. Jangan sampai terlewat.`,
  }),
  ({ name, prayerName, minutesBefore, userId }) => ({
    title: `${prayerName} ${minutesBefore} menit lagi`,
    body: `${greetId(name, userId, "sholat")}, sisihkan waktu sebentar untuk menghadap Allah.`,
  }),
  ({ name, prayerName, hours, minutes }) => ({
    title: `Panggilan ${prayerName}`,
    body: name
      ? `${name}, sholat tepat waktu adalah amal yang dicintai Allah. ${prayerName} pukul ${hours}:${minutes}.`
      : `Sholat tepat waktu adalah amal yang dicintai Allah. ${prayerName} pukul ${hours}:${minutes}.`,
  }),
  ({ name, prayerName, hours, minutes, userId }) => ({
    title: `Sebentar lagi ${prayerName}`,
    body: `${greetId(name, userId, "sholat")}, hentikan sejenak aktivitas. ${prayerName} pukul ${hours}:${minutes}.`,
  }),
];

export function sholatReminderCopy(
  userId: string,
  name: DisplayName,
  args: { prayerName: string; hours: string; minutes: string; minutesBefore: number },
) {
  return pick(SHOLAT_VARIANTS, userId, `sholat-${args.prayerName}`, {
    name,
    userId,
    prayerName: args.prayerName,
    hours: args.hours,
    minutes: args.minutes,
    minutesBefore: args.minutesBefore,
  });
}
