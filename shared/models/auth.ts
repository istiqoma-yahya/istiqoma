import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
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
});

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
