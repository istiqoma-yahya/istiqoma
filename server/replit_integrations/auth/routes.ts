import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { api } from "@shared/routes";
import { storage } from "../../storage";

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
}
