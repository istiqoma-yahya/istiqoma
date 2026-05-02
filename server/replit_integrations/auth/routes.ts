import type { Express } from "express";
import { authStorage } from "./storage";
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
      res.json({ ...user, onboardingComplete: !!onboarding?.completed });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch(api.auth.updateProfile.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = api.auth.updateProfile.input.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return res.status(400).json({
          message: first?.message ?? "Invalid profile fields",
          field: typeof first?.path?.[0] === "string" ? first.path[0] : undefined,
        });
      }
      const updated = await authStorage.updateProfile(userId, {
        username: normalizeProfileField(parsed.data.username),
        phoneNumber: normalizeProfileField(parsed.data.phoneNumber),
      });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const onboarding = await storage.getUserOnboarding(userId);
      res.json({ ...updated, onboardingComplete: !!onboarding?.completed });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}
