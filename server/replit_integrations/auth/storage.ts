import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateProfile(
    userId: string,
    data: { username: string | null; phoneNumber: string | null },
  ): Promise<User | undefined>;
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
    data: { username: string | null; phoneNumber: string | null },
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        username: data.username,
        phoneNumber: data.phoneNumber,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
