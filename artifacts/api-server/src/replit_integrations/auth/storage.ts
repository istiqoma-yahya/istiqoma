import {
  users,
  usernameLogins,
  type User,
  type UpsertUser,
  type UsernameLogin,
} from "@workspace/db";
import { db } from "../../db";
import { and, eq, sql } from "drizzle-orm";

/**
 * Thrown by `updateProfile` when the requested username collides
 * (case-insensitively) with another user's username. The route layer
 * translates this into a 409 response so the client can surface it as
 * a field-level error.
 */
export class UsernameTakenError extends Error {
  constructor() {
    super("Username is already taken");
    this.name = "UsernameTakenError";
  }
}

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateProfile(
    userId: string,
    data: {
      // `undefined` means "skip this field" — used for username-auth users
      // who do not own `users.username` (their handle lives in
      // `username_logins`). `null` clears the field.
      username?: string | null;
      phoneNumber: string | null;
    },
  ): Promise<User | undefined>;
  // Username + PIN sign-in (independent of Replit/Google SSO).
  getUsernameLoginByUsername(usernameLower: string): Promise<UsernameLogin | undefined>;
  getUsernameLoginByUserId(userId: string): Promise<UsernameLogin | undefined>;
  createUsernameUser(data: {
    username: string;
    pinHash: string;
  }): Promise<{ user: User; login: UsernameLogin }>;
  recordFailedPinAttempt(
    userId: string,
    lockedUntil: Date | null,
  ): Promise<UsernameLogin | undefined>;
  clearFailedPinAttempts(userId: string): Promise<void>;
  updatePinHash(userId: string, pinHash: string): Promise<void>;
  setRecoveryCodeHash(userId: string, hash: string | null): Promise<void>;
  recordFailedRecoveryAttempt(
    userId: string,
    lockedUntil: Date | null,
  ): Promise<UsernameLogin | undefined>;
  clearFailedRecoveryAttempts(userId: string): Promise<void>;
  consumeRecoveryAndResetPin(
    userId: string,
    pinHash: string,
  ): Promise<void>;
  updatePrivacyVersionSeen(userId: string, version: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // IMPORTANT: the `set` clause must NOT spread `...userData` blindly,
    // because Replit Auth claims do not carry our app-owned `username` and
    // `phoneNumber` fields. Spreading them would wipe whatever the user
    // previously typed every time they sign back in. List the
    // Replit-Auth-owned fields explicitly and leave username/phoneNumber
    // alone on conflict.
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateProfile(
    userId: string,
    data: {
      username?: string | null;
      phoneNumber: string | null;
    },
  ): Promise<User | undefined> {
    try {
      // Build the update set so `undefined` values are skipped (i.e. the
      // existing column value is kept). This lets username-auth users
      // update other profile fields without touching `users.username`.
      const set: {
        phoneNumber: string | null;
        updatedAt: Date;
        username?: string | null;
      } = {
        phoneNumber: data.phoneNumber,
        updatedAt: new Date(),
      };
      if (data.username !== undefined) {
        set.username = data.username;
      }
      const [user] = await db
        .update(users)
        .set(set)
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (err: unknown) {
      // Postgres unique_violation on the case-insensitive username index
      // means another user already claimed this handle. Translate into a
      // typed error so the route layer can return a clean 409.
      const code =
        (err as { code?: string })?.code ??
        (err as { cause?: { code?: string } })?.cause?.code;
      const constraint =
        (err as { constraint?: string })?.constraint ??
        (err as { cause?: { constraint?: string } })?.cause?.constraint;
      if (
        code === "23505" &&
        (constraint === "users_username_lower_unique" ||
          constraint === undefined)
      ) {
        throw new UsernameTakenError();
      }
      throw err;
    }
  }

  async getUsernameLoginByUsername(
    usernameLower: string,
  ): Promise<UsernameLogin | undefined> {
    const [row] = await db
      .select()
      .from(usernameLogins)
      .where(sql`lower(${usernameLogins.username}) = ${usernameLowerLiteral(usernameLower)}`);
    return row;
  }

  async getUsernameLoginByUserId(
    userId: string,
  ): Promise<UsernameLogin | undefined> {
    const [row] = await db
      .select()
      .from(usernameLogins)
      .where(eq(usernameLogins.userId, userId));
    return row;
  }

  async createUsernameUser(data: {
    username: string;
    pinHash: string;
  }): Promise<{ user: User; login: UsernameLogin }> {
    return await db.transaction(async (tx) => {
      try {
        // Username-login lives in its OWN namespace (`username_logins`). We
        // intentionally do NOT mirror the chosen handle into `users.username`
        // — that column is the user-editable display field owned by Google-
        // SSO accounts and shares a case-insensitive unique index with all
        // other users. Mirroring would (a) cause username-login signups to
        // collide with unrelated SSO display names, and (b) blur the two
        // namespaces. The login username is exposed via `username_logins`
        // and merged into `/api/auth/user` for display.
        const [user] = await tx
          .insert(users)
          .values({})
          .returning();
        const [login] = await tx
          .insert(usernameLogins)
          .values({
            userId: user.id,
            username: data.username,
            pinHash: data.pinHash,
          })
          .returning();
        return { user, login };
      } catch (err: unknown) {
        const code =
          (err as { code?: string })?.code ??
          (err as { cause?: { code?: string } })?.cause?.code;
        if (code === "23505") {
          throw new UsernameTakenError();
        }
        throw err;
      }
    });
  }

  async recordFailedPinAttempt(
    userId: string,
    lockedUntil: Date | null,
  ): Promise<UsernameLogin | undefined> {
    const [row] = await db
      .update(usernameLogins)
      .set({
        failedAttempts: sql`${usernameLogins.failedAttempts} + 1`,
        lockedUntil,
      })
      .where(eq(usernameLogins.userId, userId))
      .returning();
    return row;
  }

  async clearFailedPinAttempts(userId: string): Promise<void> {
    await db
      .update(usernameLogins)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(usernameLogins.userId, userId));
  }

  async updatePinHash(userId: string, pinHash: string): Promise<void> {
    await db
      .update(usernameLogins)
      .set({
        pinHash,
        pinUpdatedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(usernameLogins.userId, userId));
  }

  async setRecoveryCodeHash(
    userId: string,
    hash: string | null,
  ): Promise<void> {
    await db
      .update(usernameLogins)
      .set({
        recoveryCodeHash: hash,
        recoveryCodeUsedAt: hash === null ? new Date() : null,
      })
      .where(eq(usernameLogins.userId, userId));
  }

  async recordFailedRecoveryAttempt(
    userId: string,
    lockedUntil: Date | null,
  ): Promise<UsernameLogin | undefined> {
    const [row] = await db
      .update(usernameLogins)
      .set({
        recoveryFailedAttempts: sql`${usernameLogins.recoveryFailedAttempts} + 1`,
        recoveryLockedUntil: lockedUntil,
      })
      .where(eq(usernameLogins.userId, userId))
      .returning();
    return row;
  }

  async clearFailedRecoveryAttempts(userId: string): Promise<void> {
    await db
      .update(usernameLogins)
      .set({ recoveryFailedAttempts: 0, recoveryLockedUntil: null })
      .where(eq(usernameLogins.userId, userId));
  }

  async consumeRecoveryAndResetPin(
    userId: string,
    pinHash: string,
  ): Promise<void> {
    // Burn the recovery code AND reset the PIN + every lockout counter in
    // one atomic write so a partial failure can't leave the account in a
    // half-recovered state (e.g. PIN reset but recovery code still valid).
    await db
      .update(usernameLogins)
      .set({
        pinHash,
        pinUpdatedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
        recoveryCodeHash: null,
        recoveryCodeUsedAt: new Date(),
        recoveryFailedAttempts: 0,
        recoveryLockedUntil: null,
      })
      .where(eq(usernameLogins.userId, userId));
  }

  async updatePrivacyVersionSeen(userId: string, version: string): Promise<void> {
    await db
      .update(users)
      .set({ privacyVersionSeen: version, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

// Bind a string into a SQL literal so we can compare against `lower(username)`.
function usernameLowerLiteral(usernameLower: string) {
  return sql`${usernameLower}`;
}

export const authStorage = new AuthStorage();
