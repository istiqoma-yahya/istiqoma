import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerMemorizationRoutes } from "../../server/memorization-router";

// Mock storage — vi.fn() mocks so no real database is needed.
const storage = {
  addQuranMemorization: vi.fn(),
  removeQuranMemorization: vi.fn(),
  hasQuranMemorizationAward: vi.fn(),
  createDeed: vi.fn(),
  recordQuranMemorizationAward: vi.fn(),
  deleteDeed: vi.fn(),
};

const evaluateBadgesForUser = vi.fn();

const USER = "test-user";
const SURAH = 2;
const VERSE = 255;
// calculatePoints({ category: "Hafalan Quran", quantity: 1 }) === 5
const HAFALAN_POINTS = 5;

const fakeAuth = ((req: any, _res: any, next: any) => {
  req.user = { claims: { sub: USER } };
  next();
}) as express.RequestHandler;

function buildApp() {
  const app = express();
  app.use(express.json());
  registerMemorizationRoutes(app, storage, fakeAuth, evaluateBadgesForUser);
  return app;
}

function drainSetImmediate(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  vi.clearAllMocks();
  evaluateBadgesForUser.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/quran/memorizations", () => {
  it("returns HTTP 201 with the memorization row", async () => {
    const row = { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE };
    storage.addQuranMemorization.mockResolvedValue(row);
    storage.hasQuranMemorizationAward.mockResolvedValue(true);

    const res = await request(buildApp())
      .post("/api/quran/memorizations")
      .send({ surahNumber: SURAH, verseNumber: VERSE })
      .expect(201);

    expect(res.body.surahNumber).toBe(SURAH);
    expect(res.body.verseNumber).toBe(VERSE);
  });

  it("returns HTTP 400 for invalid input", async () => {
    const res = await request(buildApp())
      .post("/api/quran/memorizations")
      .send({ surahNumber: "bad", verseNumber: VERSE })
      .expect(400);
    expect(res.body.message).toBeTruthy();
  });

  it("returns HTTP 400 when surahNumber is out of range", async () => {
    await request(buildApp())
      .post("/api/quran/memorizations")
      .send({ surahNumber: 115, verseNumber: 1 })
      .expect(400);
  });

  it("sends the HTTP 201 response before the setImmediate side-channel runs", async () => {
    // Intercept res.json to set a flag synchronously. The side-channel reads
    // it to confirm the response path completed before setImmediate fired.
    let responseSent = false;
    let sideChannelSawResponseSent: boolean | undefined;

    const row = { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE };
    storage.addQuranMemorization.mockResolvedValue(row);
    storage.hasQuranMemorizationAward.mockImplementation(async () => {
      sideChannelSawResponseSent = responseSent;
      return true;
    });

    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      const orig = res.json.bind(res);
      res.json = function (body: unknown) {
        const r = orig(body);
        responseSent = true;
        return r;
      };
      next();
    });
    registerMemorizationRoutes(
      app,
      storage,
      ((req: any, _res, next) => { req.user = { claims: { sub: USER } }; next(); }) as express.RequestHandler,
      evaluateBadgesForUser,
    );

    await request(app)
      .post("/api/quran/memorizations")
      .send({ surahNumber: SURAH, verseNumber: VERSE })
      .expect(201);

    await drainSetImmediate();
    await drainSetImmediate();

    expect(sideChannelSawResponseSent).toBe(true);
  });

  it("first-time mark: creates exactly one deed and one award-ledger row", async () => {
    storage.addQuranMemorization.mockResolvedValue(
      { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE },
    );
    storage.hasQuranMemorizationAward.mockResolvedValue(false);
    storage.createDeed.mockResolvedValue(
      { id: 42, userId: USER, points: HAFALAN_POINTS, category: "Hafalan Quran" },
    );
    storage.recordQuranMemorizationAward.mockResolvedValue(true);

    await request(buildApp())
      .post("/api/quran/memorizations")
      .send({ surahNumber: SURAH, verseNumber: VERSE })
      .expect(201);

    await drainSetImmediate();
    await drainSetImmediate();

    expect(storage.createDeed).toHaveBeenCalledOnce();
    expect(storage.createDeed).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ category: "Hafalan Quran", points: HAFALAN_POINTS, quantity: 1, deedType: "good" }),
    );
    expect(storage.recordQuranMemorizationAward).toHaveBeenCalledOnce();
    expect(storage.recordQuranMemorizationAward).toHaveBeenCalledWith(USER, SURAH, VERSE, 42);
    expect(storage.deleteDeed).not.toHaveBeenCalled();
    expect(evaluateBadgesForUser).toHaveBeenCalledOnce();
  });

  it("first-time mark: deed points match the real calculatePoints result (5 for Hafalan Quran)", async () => {
    storage.addQuranMemorization.mockResolvedValue(
      { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE },
    );
    storage.hasQuranMemorizationAward.mockResolvedValue(false);
    storage.createDeed.mockResolvedValue({ id: 1, userId: USER, points: HAFALAN_POINTS });
    storage.recordQuranMemorizationAward.mockResolvedValue(true);

    await request(buildApp())
      .post("/api/quran/memorizations")
      .send({ surahNumber: SURAH, verseNumber: VERSE })
      .expect(201);

    await drainSetImmediate();
    await drainSetImmediate();

    const [, deedData] = storage.createDeed.mock.calls[0];
    expect(deedData.points).toBe(HAFALAN_POINTS);
  });

  it("re-mark after unmark: award row persists, no second deed created", async () => {
    storage.addQuranMemorization.mockResolvedValue(
      { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE },
    );
    storage.hasQuranMemorizationAward.mockResolvedValue(true);

    await request(buildApp())
      .post("/api/quran/memorizations")
      .send({ surahNumber: SURAH, verseNumber: VERSE })
      .expect(201);

    await drainSetImmediate();
    await drainSetImmediate();

    expect(storage.createDeed).not.toHaveBeenCalled();
    expect(evaluateBadgesForUser).not.toHaveBeenCalled();
  });

  it("mark/unmark/re-mark: exactly one deed ever created", async () => {
    const app = buildApp();
    storage.addQuranMemorization.mockResolvedValue(
      { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE },
    );
    storage.removeQuranMemorization.mockResolvedValue(undefined);
    storage.createDeed.mockResolvedValue({ id: 42, userId: USER, points: HAFALAN_POINTS });
    storage.recordQuranMemorizationAward.mockResolvedValue(true);

    storage.hasQuranMemorizationAward.mockResolvedValueOnce(false);
    await request(app).post("/api/quran/memorizations").send({ surahNumber: SURAH, verseNumber: VERSE }).expect(201);
    await drainSetImmediate();
    await drainSetImmediate();

    await request(app).delete(`/api/quran/memorizations/${SURAH}/${VERSE}`).expect(204);

    storage.hasQuranMemorizationAward.mockResolvedValueOnce(true);
    await request(app).post("/api/quran/memorizations").send({ surahNumber: SURAH, verseNumber: VERSE }).expect(201);
    await drainSetImmediate();
    await drainSetImmediate();

    expect(storage.createDeed).toHaveBeenCalledOnce();
    expect(evaluateBadgesForUser).toHaveBeenCalledOnce();
  });

  it("concurrent marks: exactly one deed (race loser rolls back its deed)", async () => {
    const app = buildApp();
    storage.addQuranMemorization.mockResolvedValue(
      { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE },
    );
    storage.hasQuranMemorizationAward.mockResolvedValue(false);

    let nextId = 100;
    storage.createDeed.mockImplementation(async (uid: string) => ({
      id: ++nextId, userId: uid, points: HAFALAN_POINTS,
    }));
    storage.recordQuranMemorizationAward
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    storage.deleteDeed.mockResolvedValue(undefined);

    await Promise.all([
      request(app).post("/api/quran/memorizations").send({ surahNumber: SURAH, verseNumber: VERSE }),
      request(app).post("/api/quran/memorizations").send({ surahNumber: SURAH, verseNumber: VERSE }),
    ]);
    await drainSetImmediate();
    await drainSetImmediate();
    await drainSetImmediate();

    expect(storage.createDeed).toHaveBeenCalledTimes(2);
    expect(storage.deleteDeed).toHaveBeenCalledOnce();
    expect(evaluateBadgesForUser).toHaveBeenCalledOnce();

    // The deleted deed ID must be one that was passed to recordQuranMemorizationAward.
    const awardedIds = storage.recordQuranMemorizationAward.mock.calls.map(
      (c: unknown[]) => c[3] as number,
    );
    expect(awardedIds).toContain(storage.deleteDeed.mock.calls[0][0]);
  });

  it("concurrent marks: net deed count is 1 (created - deleted)", async () => {
    const app = buildApp();
    storage.addQuranMemorization.mockResolvedValue(
      { id: 1, userId: USER, surahNumber: SURAH, verseNumber: VERSE },
    );
    storage.hasQuranMemorizationAward.mockResolvedValue(false);
    storage.createDeed.mockImplementation(async () => ({
      id: Math.floor(Math.random() * 1_000_000), userId: USER, points: HAFALAN_POINTS,
    }));
    storage.recordQuranMemorizationAward
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    storage.deleteDeed.mockResolvedValue(undefined);

    await Promise.all([
      request(app).post("/api/quran/memorizations").send({ surahNumber: SURAH, verseNumber: VERSE }),
      request(app).post("/api/quran/memorizations").send({ surahNumber: SURAH, verseNumber: VERSE }),
    ]);
    await drainSetImmediate();
    await drainSetImmediate();
    await drainSetImmediate();

    expect(storage.createDeed.mock.calls.length - storage.deleteDeed.mock.calls.length).toBe(1);
  });
});

describe("DELETE /api/quran/memorizations/:surah/:verse", () => {
  it("returns HTTP 204 and calls removeQuranMemorization", async () => {
    storage.removeQuranMemorization.mockResolvedValue(undefined);
    await request(buildApp()).delete(`/api/quran/memorizations/${SURAH}/${VERSE}`).expect(204);
    expect(storage.removeQuranMemorization).toHaveBeenCalledWith(USER, SURAH, VERSE);
  });

  it("does not touch the award ledger on unmark", async () => {
    storage.removeQuranMemorization.mockResolvedValue(undefined);
    await request(buildApp()).delete(`/api/quran/memorizations/${SURAH}/${VERSE}`).expect(204);
    expect(storage.hasQuranMemorizationAward).not.toHaveBeenCalled();
    expect(storage.recordQuranMemorizationAward).not.toHaveBeenCalled();
    expect(storage.deleteDeed).not.toHaveBeenCalled();
  });

  it("returns HTTP 400 for non-numeric params", async () => {
    await request(buildApp()).delete("/api/quran/memorizations/abc/def").expect(400);
  });
});
