import type { Express } from "express";
import { authStorage, UsernameTakenError } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { api } from "@shared/routes";
import { storage } from "../../storage";
import { normalizeProfileField } from "@shared/models/auth";

export function registerAuthRoutes(app: Express): void {
  app.get(api.auth.user.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const onboarding = await storage.getUserOnboarding(userId);
      // Tell the client whether this user signed in via Google SSO or via the
      // self-contained username + PIN flow. The client uses this to show /
      // hide PIN management and the "Connect Gmail" affordance.
      const authProvider: "username" | "replit" =
        req.user?.authProvider === "username" ? "username" : "replit";
      // For username-auth users, `users.username` is intentionally NULL —
      // the chosen handle lives in the separate `username_logins` namespace.
      // Surface it on the response so the profile page can display it.
      let displayUser = user as typeof user & { username: string | null };
      if (authProvider === "username") {
        const login = await authStorage.getUsernameLoginByUserId(userId);
        if (login) {
          displayUser = { ...user, username: login.username };
        }
      }
      res.json({
        ...displayUser,
        onboardingComplete: !!onboarding?.completed,
        authProvider,
        consentReligiousData: displayUser.consentReligiousData ?? false,
        consentAgeConfirmed: displayUser.consentAgeConfirmed ?? false,
        consentedAt: displayUser.consentedAt ?? null,
        privacyVersionSeen: displayUser.privacyVersionSeen ?? null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch(api.auth.updateProfile.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isUsernameAuth = req.user?.authProvider === "username";
      const parsed = api.auth.updateProfile.input.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return res.status(400).json({
          message: first?.message ?? "Invalid profile fields",
          field: typeof first?.path?.[0] === "string" ? first.path[0] : undefined,
        });
      }
      let updated;
      try {
        // Username-auth users do not own a `users.username` — their handle
        // lives in `username_logins`. Strip the field server-side so other
        // profile edits (phone number, etc.) still go through.
        updated = await authStorage.updateProfile(userId, {
          username: isUsernameAuth
            ? undefined
            : normalizeProfileField(parsed.data.username),
          phoneNumber: normalizeProfileField(parsed.data.phoneNumber),
        });
      } catch (err) {
        if (err instanceof UsernameTakenError) {
          return res.status(409).json({
            message: "That username is already taken",
            field: "username",
          });
        }
        throw err;
      }
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const onboarding = await storage.getUserOnboarding(userId);
      res.json({
        ...updated,
        onboardingComplete: !!onboarding?.completed,
        consentReligiousData: updated?.consentReligiousData ?? false,
        consentAgeConfirmed: updated?.consentAgeConfirmed ?? false,
        consentedAt: updated?.consentedAt ?? null,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}
