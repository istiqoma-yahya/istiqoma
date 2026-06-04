import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { api } from "./shared-routes";
import { insertCommunityTargetSchema } from "@workspace/db";
import type {
  CommunityTarget,
  CommunityTargetMember,
  CommunityTargetListItem,
  CommunityTargetLeaderboardEntry,
  InsertCommunityTarget,
} from "@workspace/db";

export interface CommunityTargetStorage {
  listCommunityTargets(
    currentUserId: string,
    opts?: {
      search?: string;
      category?: string;
      period?: string;
      sort?: "recency" | "participants";
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: CommunityTargetListItem[]; total: number }>;
  listCommunityTargetCategories(): Promise<string[]>;
  getCommunityTarget(id: number, currentUserId: string): Promise<CommunityTargetListItem | null>;
  createCommunityTarget(creatorId: string, data: InsertCommunityTarget): Promise<CommunityTarget>;
  updateCommunityTarget(id: number, creatorId: string, data: InsertCommunityTarget): Promise<CommunityTarget | null>;
  deleteCommunityTarget(id: number, creatorId: string): Promise<boolean>;
  joinCommunityTarget(id: number, userId: string): Promise<CommunityTargetMember | null>;
  leaveCommunityTarget(id: number, userId: string): Promise<boolean>;
  getCommunityTargetLeaderboard(
    id: number,
    currentUserId: string,
    options: { limit?: number; offset?: number },
  ): Promise<{ entries: CommunityTargetLeaderboardEntry[]; total: number } | null | "forbidden">;
}

function getErrorStatus(err: unknown): number | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return undefined;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Internal Server Error";
}

// Mask an email so other users' identities are never exposed by the
// leaderboard. Keeps the first character of the local part and the
// domain, so "yusuf@gmail.com" → "y***@gmail.com".
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 1);
  return `${head}***${domain}`;
}

export function registerCommunityTargetRoutes(
  app: Express,
  storage: CommunityTargetStorage,
  isAuthenticated: RequestHandler,
): void {
  app.get(api.communityTargets.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const period = typeof req.query.period === "string" ? req.query.period : undefined;
    const sortRaw = typeof req.query.sort === "string" ? req.query.sort : undefined;
    const sort = sortRaw === "participants" || sortRaw === "recency" ? sortRaw : undefined;
    const limit = req.query.limit !== undefined ? Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 100) : 20;
    const offset = req.query.offset !== undefined ? Math.max(parseInt(String(req.query.offset), 10) || 0, 0) : 0;
    const result = await storage.listCommunityTargets(userId, { search, category, period, sort, limit, offset });
    const masked = {
      items: result.items.map((it) => ({ ...it, creatorEmail: maskEmail(it.creatorEmail) })),
      total: result.total,
    };
    res.json(masked);
  });

  app.get(api.communityTargets.categories.path, isAuthenticated, async (_req, res) => {
    const cats = await storage.listCommunityTargetCategories();
    res.json(cats);
  });

  app.get(api.communityTargets.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });
    const item = await storage.getCommunityTarget(id, userId);
    if (!item) return res.status(404).json({ message: "Community target not found" });
    res.json({ ...item, creatorEmail: maskEmail(item.creatorEmail) });
  });

  app.post(api.communityTargets.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = insertCommunityTargetSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const row = await storage.createCommunityTarget(userId, input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.patch(api.communityTargets.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = insertCommunityTargetSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.updateCommunityTarget(id, userId, input);
      if (!row) return res.status(404).json({ message: "Community target not found" });
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      const status = getErrorStatus(err);
      if (status) return res.status(status).json({ message: getErrorMessage(err) });
      throw err;
    }
  });

  app.delete(api.communityTargets.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deleteCommunityTarget(id, userId);
      if (!ok) return res.status(404).json({ message: "Community target not found" });
      res.status(204).send();
    } catch (err) {
      const status = getErrorStatus(err);
      if (status) return res.status(status).json({ message: getErrorMessage(err) });
      throw err;
    }
  });

  app.post(api.communityTargets.join.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });
    const member = await storage.joinCommunityTarget(id, userId);
    if (!member) return res.status(404).json({ message: "Community target not found" });
    res.json(member);
  });

  app.delete(api.communityTargets.leave.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.leaveCommunityTarget(id, userId);
      if (!ok) return res.status(404).json({ message: "Community target not found" });
      res.status(204).send();
    } catch (err) {
      const status = getErrorStatus(err);
      if (status) return res.status(status).json({ message: getErrorMessage(err) });
      throw err;
    }
  });

  app.get(api.communityTargets.leaderboard.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
    const board = await storage.getCommunityTargetLeaderboard(id, userId, { limit, offset });
    if (board === null) return res.status(404).json({ message: "Community target not found" });
    if (board === "forbidden") return res.status(403).json({ message: "Members only" });
    const masked = {
      entries: board.entries.map((e) => ({ ...e, email: maskEmail(e.email) })),
      total: board.total,
    };
    res.json(masked);
  });
}
