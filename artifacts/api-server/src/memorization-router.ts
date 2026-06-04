import { type Express, type RequestHandler } from "express";
import { z } from "zod";
import { api } from "./shared-routes";
import { calculatePoints } from "./calculatePoints";
import type { IStorage } from "./storage";

type MemorizationStorage = Pick<
  IStorage,
  | "addQuranMemorization"
  | "removeQuranMemorization"
  | "hasQuranMemorizationAward"
  | "recordQuranMemorizationAward"
  | "createDeed"
  | "deleteDeed"
>;

export function registerMemorizationRoutes(
  app: Express,
  storage: MemorizationStorage,
  isAuthenticated: RequestHandler,
  evaluateBadgesForUser: (userId: string) => Promise<void>,
  requireConsent: RequestHandler,
): void {
  app.post(
    api.quran.addMemorization.path,
    isAuthenticated,
    requireConsent,
    async (req: any, res) => {
      try {
        const input = api.quran.addMemorization.input.parse(req.body);
        const userId = req.user.claims.sub;
        const row = await storage.addQuranMemorization(userId, input);

        // Respond immediately so the tap feels instant. The first-time
        // deed/award side-channel and badge re-evaluation are deferred to a
        // background task that runs after the response is sent.
        res.status(201).json(row);

        setImmediate(async () => {
          try {
            // Award deed points the first time this verse is ever memorized.
            // Dedup is anchored on the persistent `quran_memorization_awards`
            // ledger (NOT on `quran_memorizations`) so a user can't farm
            // points by repeatedly unmarking and re-marking the same verse.
            const alreadyAwarded = await storage.hasQuranMemorizationAward(
              userId,
              input.surahNumber,
              input.verseNumber,
            );
            if (alreadyAwarded) return;

            const points = calculatePoints({ category: "Hafalan Quran", quantity: 1 });
            const deed = await storage.createDeed(userId, {
              description: `Memorized Surah ${input.surahNumber}:${input.verseNumber}`,
              category: "Hafalan Quran",
              points,
              quantity: 1,
              deedType: "good",
            });
            // Race-safe: a concurrent second request might have inserted the
            // award row first. In that case `recordQuranMemorizationAward`
            // returns false and we roll back this duplicate deed.
            const inserted = await storage.recordQuranMemorizationAward(
              userId,
              input.surahNumber,
              input.verseNumber,
              deed.id,
            );
            if (!inserted) {
              await storage.deleteDeed(deed.id, userId);
              return;
            }
            try {
              await evaluateBadgesForUser(userId);
            } catch (e) {
              console.error("Badge evaluation failed (memorization award)", e);
            }
          } catch (e) {
            console.error("Failed to award memorization deed", e);
          }
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        throw err;
      }
    },
  );

  app.delete(
    api.quran.removeMemorization.path,
    isAuthenticated,
    async (req: any, res) => {
      const userId = req.user.claims.sub;
      const surah = parseInt(req.params.surah, 10);
      const verse = parseInt(req.params.verse, 10);
      if (isNaN(surah) || isNaN(verse)) {
        return res.status(400).json({ message: "Invalid surah or verse" });
      }
      await storage.removeQuranMemorization(userId, surah, verse);
      res.status(204).send();
    },
  );
}
