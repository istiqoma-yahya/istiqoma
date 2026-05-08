import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type RequestHandler } from "express";
import request from "supertest";
import {
  registerCommunityTargetRoutes,
  type CommunityTargetStorage,
} from "../../server/community-targets-router";
import type {
  CommunityTarget,
  CommunityTargetLeaderboardEntry,
  CommunityTargetListItem,
  CommunityTargetMember,
  InsertCommunityTarget,
} from "@shared/schema";

const CREATOR = "creator-user";
const MEMBER = "member-user";
const STRANGER = "stranger-user";

let currentUserId = CREATOR;

function makeStorage(): CommunityTargetStorage {
  return {
    listCommunityTargets: vi.fn<[string], Promise<CommunityTargetListItem[]>>(),
    getCommunityTarget: vi.fn<[number, string], Promise<CommunityTargetListItem | null>>(),
    createCommunityTarget: vi.fn<[string, InsertCommunityTarget], Promise<CommunityTarget>>(),
    updateCommunityTarget: vi.fn<[number, string, InsertCommunityTarget], Promise<CommunityTarget | null>>(),
    deleteCommunityTarget: vi.fn<[number, string], Promise<boolean>>(),
    joinCommunityTarget: vi.fn<[number, string], Promise<CommunityTargetMember | null>>(),
    leaveCommunityTarget: vi.fn<[number, string], Promise<boolean>>(),
    getCommunityTargetLeaderboard: vi.fn<
      [number, string, { limit?: number; offset?: number }],
      Promise<{ entries: CommunityTargetLeaderboardEntry[]; total: number } | null | "forbidden">
    >(),
  };
}

function buildApp(storage: CommunityTargetStorage) {
  const app = express();
  app.use(express.json());
  const fakeAuth: RequestHandler = (req, _res, next) => {
    (req as unknown as { user: { claims: { sub: string } } }).user = {
      claims: { sub: currentUserId },
    };
    next();
  };
  registerCommunityTargetRoutes(app, storage, fakeAuth);
  return app;
}

const VALID_INPUT: InsertCommunityTarget = {
  name: "Daily Dzikir",
  category: "Dzikir",
  targetValue: 100,
  period: "daily",
  unitLabel: "kali",
};

beforeEach(() => {
  currentUserId = CREATOR;
});

describe("POST /api/community-targets/:id/join", () => {
  it("returns 200 with the membership row on success", async () => {
    const storage = makeStorage();
    vi.mocked(storage.joinCommunityTarget).mockResolvedValue({
      id: 1,
      communityTargetId: 5,
      userId: MEMBER,
      joinedAt: new Date(),
    });
    currentUserId = MEMBER;

    const res = await request(buildApp(storage))
      .post("/api/community-targets/5/join")
      .expect(200);

    expect(res.body.userId).toBe(MEMBER);
    expect(storage.joinCommunityTarget).toHaveBeenCalledWith(5, MEMBER);
  });

  it("returns 404 when the target does not exist", async () => {
    const storage = makeStorage();
    vi.mocked(storage.joinCommunityTarget).mockResolvedValue(null);

    await request(buildApp(storage))
      .post("/api/community-targets/999/join")
      .expect(404);
  });

  it("returns 400 for non-numeric id", async () => {
    const storage = makeStorage();
    await request(buildApp(storage))
      .post("/api/community-targets/abc/join")
      .expect(400);
    expect(storage.joinCommunityTarget).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/community-targets/:id/leave", () => {
  it("returns 204 when a non-creator member leaves", async () => {
    const storage = makeStorage();
    vi.mocked(storage.leaveCommunityTarget).mockResolvedValue(true);
    currentUserId = MEMBER;

    await request(buildApp(storage))
      .delete("/api/community-targets/5/leave")
      .expect(204);

    expect(storage.leaveCommunityTarget).toHaveBeenCalledWith(5, MEMBER);
  });

  it("returns 400 when the creator tries to leave their own target", async () => {
    const storage = makeStorage();
    vi.mocked(storage.leaveCommunityTarget).mockImplementation(async () => {
      const err = new Error("Creator cannot leave their own community target") as Error & { status?: number };
      err.status = 400;
      throw err;
    });

    const res = await request(buildApp(storage))
      .delete("/api/community-targets/5/leave")
      .expect(400);
    expect(res.body.message).toMatch(/creator/i);
  });

  it("returns 404 when the target does not exist", async () => {
    const storage = makeStorage();
    vi.mocked(storage.leaveCommunityTarget).mockResolvedValue(false);

    await request(buildApp(storage))
      .delete("/api/community-targets/999/leave")
      .expect(404);
  });
});

describe("PATCH /api/community-targets/:id (creator-only edit)", () => {
  function makeTarget(): CommunityTarget {
    return {
      id: 5,
      creatorId: CREATOR,
      name: VALID_INPUT.name,
      category: VALID_INPUT.category,
      targetValue: VALID_INPUT.targetValue,
      period: VALID_INPUT.period,
      unitLabel: VALID_INPUT.unitLabel ?? null,
      dzikirType: null,
      sholatType: null,
      fastingType: null,
      quranUnit: null,
      sedekahType: null,
      customUnit: null,
      isActive: true,
      createdAt: new Date(),
    };
  }

  it("returns 200 when the creator edits their own target", async () => {
    const storage = makeStorage();
    vi.mocked(storage.updateCommunityTarget).mockResolvedValue(makeTarget());

    const res = await request(buildApp(storage))
      .patch("/api/community-targets/5")
      .send(VALID_INPUT)
      .expect(200);

    expect(res.body.id).toBe(5);
    expect(storage.updateCommunityTarget).toHaveBeenCalledWith(
      5,
      CREATOR,
      expect.objectContaining(VALID_INPUT),
    );
  });

  it("returns 403 when a non-creator tries to edit", async () => {
    const storage = makeStorage();
    vi.mocked(storage.updateCommunityTarget).mockImplementation(async () => {
      const err = new Error("Only the creator can edit this community target") as Error & { status?: number };
      err.status = 403;
      throw err;
    });
    currentUserId = STRANGER;

    const res = await request(buildApp(storage))
      .patch("/api/community-targets/5")
      .send(VALID_INPUT)
      .expect(403);
    expect(res.body.message).toMatch(/creator/i);
  });

  it("returns 400 for invalid input (missing required fields)", async () => {
    const storage = makeStorage();
    await request(buildApp(storage))
      .patch("/api/community-targets/5")
      .send({ name: "" })
      .expect(400);
    expect(storage.updateCommunityTarget).not.toHaveBeenCalled();
  });

  it("returns 404 when the target does not exist", async () => {
    const storage = makeStorage();
    vi.mocked(storage.updateCommunityTarget).mockResolvedValue(null);

    await request(buildApp(storage))
      .patch("/api/community-targets/999")
      .send(VALID_INPUT)
      .expect(404);
  });
});

describe("DELETE /api/community-targets/:id (creator-only delete)", () => {
  it("returns 204 when the creator deletes their own target", async () => {
    const storage = makeStorage();
    vi.mocked(storage.deleteCommunityTarget).mockResolvedValue(true);

    await request(buildApp(storage))
      .delete("/api/community-targets/5")
      .expect(204);
    expect(storage.deleteCommunityTarget).toHaveBeenCalledWith(5, CREATOR);
  });

  it("returns 403 when a non-creator tries to delete", async () => {
    const storage = makeStorage();
    vi.mocked(storage.deleteCommunityTarget).mockImplementation(async () => {
      const err = new Error("Only the creator can delete this community target") as Error & { status?: number };
      err.status = 403;
      throw err;
    });
    currentUserId = STRANGER;

    await request(buildApp(storage))
      .delete("/api/community-targets/5")
      .expect(403);
  });

  it("returns 404 when the target does not exist", async () => {
    const storage = makeStorage();
    vi.mocked(storage.deleteCommunityTarget).mockResolvedValue(false);

    await request(buildApp(storage))
      .delete("/api/community-targets/999")
      .expect(404);
  });
});

describe("POST /api/community-targets (create)", () => {
  it("returns 201 with the new target and uses the authenticated user as creator", async () => {
    const storage = makeStorage();
    vi.mocked(storage.createCommunityTarget).mockResolvedValue({
      id: 9,
      creatorId: CREATOR,
      name: VALID_INPUT.name,
      category: VALID_INPUT.category,
      targetValue: VALID_INPUT.targetValue,
      period: VALID_INPUT.period,
      unitLabel: VALID_INPUT.unitLabel ?? null,
      dzikirType: null,
      sholatType: null,
      fastingType: null,
      quranUnit: null,
      sedekahType: null,
      customUnit: null,
      isActive: true,
      createdAt: new Date(),
    });

    const res = await request(buildApp(storage))
      .post("/api/community-targets")
      .send(VALID_INPUT)
      .expect(201);

    expect(res.body.id).toBe(9);
    expect(storage.createCommunityTarget).toHaveBeenCalledWith(
      CREATOR,
      expect.objectContaining(VALID_INPUT),
    );
  });

  it("returns 400 when input fails Zod validation", async () => {
    const storage = makeStorage();
    await request(buildApp(storage))
      .post("/api/community-targets")
      .send({ ...VALID_INPUT, targetValue: 0 })
      .expect(400);
    expect(storage.createCommunityTarget).not.toHaveBeenCalled();
  });
});

describe("GET /api/community-targets/:id/leaderboard (members-only)", () => {
  it("returns 200 with masked emails for members", async () => {
    const storage = makeStorage();
    vi.mocked(storage.getCommunityTargetLeaderboard).mockResolvedValue({
      entries: [
        {
          rank: 1,
          userId: CREATOR,
          username: "Yusuf",
          email: "yusuf@example.com",
          profileImageUrl: null,
          progress: 50,
          percent: 50,
          joinedAt: new Date().toISOString(),
          isCurrentUser: true,
        },
      ],
      total: 1,
    });

    const res = await request(buildApp(storage))
      .get("/api/community-targets/5/leaderboard")
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.entries[0].email).toBe("y***@example.com");
  });

  it("returns 403 for non-members", async () => {
    const storage = makeStorage();
    vi.mocked(storage.getCommunityTargetLeaderboard).mockResolvedValue("forbidden");
    currentUserId = STRANGER;

    await request(buildApp(storage))
      .get("/api/community-targets/5/leaderboard")
      .expect(403);
  });

  it("returns 404 when the target does not exist", async () => {
    const storage = makeStorage();
    vi.mocked(storage.getCommunityTargetLeaderboard).mockResolvedValue(null);

    await request(buildApp(storage))
      .get("/api/community-targets/999/leaderboard")
      .expect(404);
  });

  it("clamps limit/offset query parameters into a sane range", async () => {
    const storage = makeStorage();
    vi.mocked(storage.getCommunityTargetLeaderboard).mockResolvedValue({
      entries: [],
      total: 0,
    });

    await request(buildApp(storage))
      .get("/api/community-targets/5/leaderboard?limit=9999&offset=-5")
      .expect(200);

    expect(storage.getCommunityTargetLeaderboard).toHaveBeenCalledWith(5, CREATOR, {
      limit: 100,
      offset: 0,
    });
  });
});
