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

  app.patch(api.deeds.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.deeds.update.input.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const deed = await storage.updateDeed(id, userId, input);
      res.json(deed);
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

  // Categories Routes - Protected
  app.get(api.categories.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const cats = await storage.getCategories(userId);
    res.json(cats);
  });

  app.post(api.categories.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const category = await storage.createCategory(userId, input);
      res.status(201).json(category);
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

  app.delete(api.categories.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteCategory(id, userId);
    res.status(204).send();
  });

  app.patch(api.categories.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Invalid name" });
      }
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const category = await storage.updateCategory(id, userId, name);
      res.json(category);
    } catch (err) {
      throw err;
    }
  });

  app.post(api.categories.reorder.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.categories.reorder.input.parse(req.body);
      const userId = req.user.claims.sub;
      const cats = await storage.reorderCategories(userId, input.orderedIds);
      res.json(cats);
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

  // Targets Routes - Protected
  app.get(api.targets.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const targetsList = await storage.getTargets(userId);
    res.json(targetsList);
  });

  app.get(api.targets.listWithProgress.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const targetsWithProgress = await storage.getTargetsWithProgress(userId);
    res.json(targetsWithProgress);
  });

  app.post(api.targets.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targets.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const target = await storage.createTarget(userId, input);
      res.status(201).json(target);
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

  app.patch(api.targets.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.targets.update.input.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const target = await storage.updateTarget(id, userId, input);
      res.json(target);
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

  app.delete(api.targets.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteTarget(id, userId);
    res.status(204).send();
  });

  return httpServer;
}
