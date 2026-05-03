import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// `username` and `phoneNumber` are user-editable profile fields owned by
// our app (not by Replit Auth). They MUST be excluded from the upsert
// `set` clause so a subsequent login (whose claims do not carry them)
// does not wipe them.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username"),
  phoneNumber: varchar("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Case-insensitive uniqueness on `username`. Postgres allows multiple NULLs
  // in a unique index, so users who haven't set a username are unaffected.
  uniqueIndex("users_username_lower_unique").on(sql`lower(${table.username})`),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Shared input schema for the profile-edit form and the PATCH endpoint.
// Both fields accept strings (incl. empty); empty after trimming becomes
// `null` in storage so we can render "no value set" cleanly in the UI.
const PHONE_REGEX = /^[0-9 +\-()]*$/;

// Pure validator: accepts strings (including empty). The route handler is
// responsible for trimming and converting empty strings to `null` before
// writing to the database. Keeping the schema transform-free means the same
// schema can validate both the form input on the client AND the request body
// on the server without one side rejecting the other side's output.
export const updateProfileSchema = z.object({
  username: z
    .string()
    .max(40, "Username must be 40 characters or less"),
  phoneNumber: z
    .string()
    .max(30, "Phone number must be 30 characters or less")
    .refine((v) => PHONE_REGEX.test(v), {
      message: "Phone number can only contain digits, spaces, +, -, ( and )",
    }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
// Backwards-compat alias used by the form.
export type UpdateProfileValues = UpdateProfileInput;

/** Trim a profile string and return null when empty (storage representation). */
export function normalizeProfileField(v: string): string | null {
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Username + PIN sign-in (independent of Google SSO)
// ---------------------------------------------------------------------------
//
// `username_logins` lives in its own namespace. The `username` column here is
// independent of `users.username` (which is a user-editable display field
// owned by Google-SSO accounts). Each row references a `users.id` so the rest
// of the app (deeds, streaks, leaderboard, badges) works without changes.
export const usernameLogins = pgTable(
  "username_logins",
  {
    userId: varchar("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username").notNull(),
    pinHash: varchar("pin_hash").notNull(),
    pinUpdatedAt: timestamp("pin_updated_at").defaultNow().notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Case-insensitive uniqueness within the username-login namespace only.
    uniqueIndex("username_logins_username_lower_unique").on(
      sql`lower(${table.username})`,
    ),
  ],
);

// Drizzle-zod insert schema for `username_logins`. Auto-generated columns
// (timestamps, the lockout state, the failed-attempt counter) are omitted
// so callers only need to supply `userId`, the chosen `username`, and the
// scrypt-derived `pinHash`.
export const insertUsernameLoginSchema = createInsertSchema(usernameLogins).omit({
  pinUpdatedAt: true,
  failedAttempts: true,
  lockedUntil: true,
  createdAt: true,
});

export type UsernameLogin = typeof usernameLogins.$inferSelect;
export type InsertUsernameLogin = z.infer<typeof insertUsernameLoginSchema>;

// Validation rules shared by client + server.
export const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,40}$/;
export const PIN_REGEX = /^[0-9]{4,8}$/;

export const usernameLoginUsernameSchema = z
  .string()
  .min(3, "Username must be 3–40 characters")
  .max(40, "Username must be 3–40 characters")
  .regex(USERNAME_REGEX, "Letters, digits, _ and - only");

export const usernameLoginPinSchema = z
  .string()
  .regex(PIN_REGEX, "PIN must be 4–8 digits");

export const usernameSignupSchema = z
  .object({
    username: usernameLoginUsernameSchema,
    pin: usernameLoginPinSchema,
    confirmPin: z.string(),
  })
  .refine((d) => d.pin === d.confirmPin, {
    path: ["confirmPin"],
    message: "PINs do not match",
  });

export type UsernameSignupInput = z.infer<typeof usernameSignupSchema>;

// Sign-in must enforce the same format rules as signup so malformed input is
// rejected up-front (no DB lookup, no PIN-hash comparison work) — this keeps
// the per-IP rate limiter focused on real credential-stuffing attempts.
export const usernameSigninSchema = z.object({
  username: usernameLoginUsernameSchema,
  pin: usernameLoginPinSchema,
});

export type UsernameSigninInput = z.infer<typeof usernameSigninSchema>;

export const changePinSchema = z
  .object({
    // Tighten currentPin to the same 4–8-digit shape as newPin so malformed
    // input is rejected up-front instead of being treated as a wrong PIN.
    currentPin: usernameLoginPinSchema,
    newPin: usernameLoginPinSchema,
    confirmPin: z.string(),
  })
  .refine((d) => d.newPin === d.confirmPin, {
    path: ["confirmPin"],
    message: "PINs do not match",
  });

export type ChangePinInput = z.infer<typeof changePinSchema>;
