import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Deeds Routes - Protected
  app.get(api.deeds.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const deeds = await storage.getDeeds(userId);
    res.json(deeds);
  });

  app.post(api.deeds.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.deeds.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const deed = await storage.createDeed(userId, input);
      res.status(201).json(deed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.deeds.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteDeed(id, userId);
    res.status(204).send();
  });

  return httpServer;
}
