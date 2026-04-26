import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Deed } from "@shared/schema";
import { api, buildUrl } from "@shared/routes";
import { useDeeds } from "@/hooks/use-deeds";
import { apiRequest } from "@/lib/queryClient";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerCompletionFlags = {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
};

export const PRAYER_KEYS: readonly PrayerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

const SHOLAT_FARDHU_CATEGORY = "Sholat Fardhu";

const PRAYER_TO_SHOLAT_TYPE: Record<PrayerKey, string> = {
  fajr: "subuh",
  dhuhr: "dzuhur",
  asr: "ashar",
  maghrib: "maghrib",
  isha: "isya",
};

const PRAYER_TO_DESCRIPTION: Record<PrayerKey, string> = {
  fajr: "Sholat Subuh",
  dhuhr: "Sholat Dzuhur",
  asr: "Sholat Ashar",
  maghrib: "Sholat Maghrib",
  isha: "Sholat Isya",
};

const EMPTY_FLAGS: PrayerCompletionFlags = {
  fajr: false,
  dhuhr: false,
  asr: false,
  maghrib: false,
  isha: false,
};

const DEEDS_QUERY_KEY = [api.deeds.list.path] as const;
const PENDING_LS_KEY = "sholat_pending_ops_v1";
const LEGACY_PREFIXES = [
  "sholat_done_",
  "sholat_done_dirty_",
  "sholat_done_migrated_",
] as const;

let legacyCleanedUp = false;
function cleanupLegacyLocalStorage() {
  if (legacyCleanedUp) return;
  legacyCleanedUp = true;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (LEGACY_PREFIXES.some((p) => key.startsWith(p))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

function localDateKey(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function findPrayerKey(deed: Deed): PrayerKey | null {
  if (deed.category !== SHOLAT_FARDHU_CATEGORY) return null;
  if (!deed.sholatType) return null;
  for (const k of PRAYER_KEYS) {
    if (PRAYER_TO_SHOLAT_TYPE[k] === deed.sholatType) return k;
  }
  return null;
}

function flagsFromDeeds(deeds: Deed[] | null | undefined, date: string): PrayerCompletionFlags {
  if (!deeds) return { ...EMPTY_FLAGS };
  const flags: PrayerCompletionFlags = { ...EMPTY_FLAGS };
  for (const d of deeds) {
    if (localDateKey(d.createdAt) !== date) continue;
    const key = findPrayerKey(d);
    if (key) flags[key] = true;
  }
  return flags;
}

function findMatchingDeed(
  deeds: Deed[] | null | undefined,
  date: string,
  prayer: PrayerKey,
): Deed | null {
  if (!deeds) return null;
  let match: Deed | null = null;
  for (const d of deeds) {
    if (localDateKey(d.createdAt) !== date) continue;
    if (findPrayerKey(d) !== prayer) continue;
    if (!match || (d.id ?? 0) > (match.id ?? 0)) match = d;
  }
  return match;
}

// Generate a temp id that is:
// - negative (real deed ids are positive serials, so this can never collide
//   with a server-assigned id);
// - monotonically decreasing with time so newer temps sort before older ones;
// - unique across page reloads (uses `Date.now()` plus a random suffix so
//   even queued ops persisted to localStorage from a previous session can't
//   share an id with a fresh tap).
function nextTempId(): number {
  return -(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

const TARGETS_LIST_KEY = [api.targets.list.path] as const;
const TARGETS_PROGRESS_KEY = [api.targets.listWithProgress.path] as const;

function invalidateDeedDependents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DEEDS_QUERY_KEY });
  // Sholat deeds count toward target progress, so any open Targets / progress
  // view must refetch immediately after a toggle.
  queryClient.invalidateQueries({ queryKey: TARGETS_LIST_KEY });
  queryClient.invalidateQueries({ queryKey: TARGETS_PROGRESS_KEY });
}

function buildOptimisticDeed(
  date: string,
  prayer: PrayerKey,
  tempId: number,
  createdAtIso: string,
): Deed {
  return {
    id: tempId,
    userId: "",
    description: PRAYER_TO_DESCRIPTION[prayer],
    deedType: "good",
    category: SHOLAT_FARDHU_CATEGORY,
    points: 100,
    quantity: 1,
    dzikirType: null,
    sholatType: PRAYER_TO_SHOLAT_TYPE[prayer],
    fastingType: null,
    isJamaah: null,
    quranUnit: null,
    sedekahType: null,
    customUnit: "times",
    createdAt: new Date(createdAtIso),
  };
}

// -- Pending ops queue --------------------------------------------------------
// Persists across reloads so an offline toggle is not lost. Each pending op
// represents either a deed-create that has not yet been confirmed by the
// server (we keep the temp deed visible), or a deed-delete that has been
// applied optimistically (we hide the real deed until the server confirms).

type PendingCreate = {
  kind: "create";
  date: string;
  prayer: PrayerKey;
  tempId: number;
  createdAtIso: string;
};

type PendingDelete = {
  kind: "delete";
  date: string;
  prayer: PrayerKey;
  deedId: number;
};

type PendingOp = PendingCreate | PendingDelete;

function readPending(): PendingOp[] {
  try {
    const raw = localStorage.getItem(PENDING_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (op: any) =>
        op &&
        (op.kind === "create" || op.kind === "delete") &&
        typeof op.date === "string" &&
        typeof op.prayer === "string",
    );
  } catch {
    return [];
  }
}

function writePending(ops: PendingOp[]) {
  try {
    if (ops.length === 0) localStorage.removeItem(PENDING_LS_KEY);
    else localStorage.setItem(PENDING_LS_KEY, JSON.stringify(ops));
  } catch {}
}

function enqueuePending(op: PendingOp) {
  const ops = readPending();
  ops.push(op);
  writePending(ops);
}

function removePending(predicate: (op: PendingOp) => boolean) {
  const ops = readPending().filter((op) => !predicate(op));
  writePending(ops);
}

// Apply pending ops on top of the server's deed list so the cache (and the
// derived flags) reflects the user's optimistic state even after a hard
// reload while offline — at which point `serverDeeds` may be `null` /
// `undefined` because `useDeeds()` hasn't been able to reach the network
// yet. We treat the missing case as an empty list so pending creates still
// surface as ephemeral deeds.
//
// Importantly: any cache entries with IDs that match a pending-create's
// `tempId` (i.e. ephemerals we already added in a previous pass) are
// stripped first, then the canonical ephemerals are re-prepended. This
// keeps the result idempotent — calling it repeatedly on its own output
// produces the same list, so the focus/online refresh path can never
// duplicate temp deeds.
function applyPendingToDeeds(serverDeeds: Deed[] | null | undefined): Deed[] {
  const pending = readPending();
  const base = serverDeeds ?? [];
  if (pending.length === 0) return base;

  const deletedIds = new Set(
    pending.filter((op): op is PendingDelete => op.kind === "delete").map((op) => op.deedId),
  );
  const tempIds = new Set(
    pending.filter((op): op is PendingCreate => op.kind === "create").map((op) => op.tempId),
  );

  const filtered = base.filter(
    (d) => !deletedIds.has(d.id) && !tempIds.has(d.id),
  );

  const ephemerals: Deed[] = pending
    .filter((op): op is PendingCreate => op.kind === "create")
    .map((op) => buildOptimisticDeed(op.date, op.prayer, op.tempId, op.createdAtIso));

  return [...ephemerals, ...filtered];
}

function deedsListsEqual(a: Deed[] | null | undefined, b: Deed[] | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) return !/^\d{3}:/.test(err.message);
  return true;
}

// -- Hook ---------------------------------------------------------------------

export function usePrayerCompletion(date: string) {
  const queryClient = useQueryClient();
  const deedsQuery = useDeeds();

  useEffect(() => {
    cleanupLegacyLocalStorage();
  }, []);

  // Whenever the deeds query freshly resolves (note: keyed on
  // `dataUpdatedAt`, not `data`, to ensure we only re-merge when the server
  // actually returned new data — not when our own setQueryData write fires
  // the observer), layer pending ops back on top so the optimistic UI is
  // never lost.
  useEffect(() => {
    if (!deedsQuery.data) return;
    const merged = applyPendingToDeeds(deedsQuery.data);
    if (!deedsListsEqual(merged, deedsQuery.data)) {
      queryClient.setQueryData<Deed[]>(DEEDS_QUERY_KEY, merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deedsQuery.dataUpdatedAt, queryClient]);

  const drainPending = useCallback(async () => {
    const ops = readPending();
    if (ops.length === 0) return;
    let mutated = false;
    for (const op of ops) {
      try {
        if (op.kind === "create") {
          await apiRequest("POST", api.deeds.create.path, {
            description: PRAYER_TO_DESCRIPTION[op.prayer],
            category: SHOLAT_FARDHU_CATEGORY,
            deedType: "good",
            points: 100,
            quantity: 1,
            sholatType: PRAYER_TO_SHOLAT_TYPE[op.prayer],
            customUnit: "times",
            createdAt: op.createdAtIso,
          });
          removePending((p) => p.kind === "create" && p.tempId === op.tempId);
          mutated = true;
        } else {
          await apiRequest("DELETE", buildUrl(api.deeds.delete.path, { id: op.deedId }));
          removePending((p) => p.kind === "delete" && p.deedId === op.deedId);
          mutated = true;
        }
      } catch (err) {
        if (isNetworkError(err)) {
          // Still offline — leave it in the queue and try again next event.
          break;
        }
        // Server rejected — drop this op so the queue doesn't loop forever.
        removePending((p) =>
          op.kind === "create"
            ? p.kind === "create" && p.tempId === op.tempId
            : p.kind === "delete" && p.deedId === op.deedId,
        );
        mutated = true;
      }
    }
    if (mutated) {
      invalidateDeedDependents(queryClient);
    }
  }, [queryClient]);

  useEffect(() => {
    // Try to drain whatever was left over from a previous session.
    drainPending();

    const handler = () => {
      drainPending();
      invalidateDeedDependents(queryClient);
    };
    window.addEventListener("focus", handler);
    window.addEventListener("online", handler);
    return () => {
      window.removeEventListener("focus", handler);
      window.removeEventListener("online", handler);
    };
  }, [drainPending, queryClient]);

  // Derive flags from server deeds with pending ops layered on top. This
  // matters most on a hard reload while offline: `deedsQuery.data` is then
  // `undefined`, but pending creates persisted in localStorage must still
  // present as checked prayers so the user's prior optimistic taps survive
  // the reload.
  const flags = useMemo(
    () => flagsFromDeeds(applyPendingToDeeds(deedsQuery.data), date),
    [deedsQuery.data, date],
  );

  const pendingRef = useRef<Set<PrayerKey>>(new Set());

  const createPrayerDeed = useCallback(
    async (prayer: PrayerKey) => {
      const tempId = nextTempId();
      const now = new Date();
      const createdAtIso = now.toISOString();
      const optimistic = buildOptimisticDeed(date, prayer, tempId, createdAtIso);

      await queryClient.cancelQueries({ queryKey: DEEDS_QUERY_KEY });
      const previous = queryClient.getQueryData<Deed[]>(DEEDS_QUERY_KEY) ?? [];
      queryClient.setQueryData<Deed[]>(DEEDS_QUERY_KEY, [optimistic, ...previous]);

      // Persist the pending create up-front so a reload mid-flight (or while
      // offline) doesn't lose the user's tap.
      enqueuePending({ kind: "create", date, prayer, tempId, createdAtIso });

      try {
        const res = await apiRequest("POST", api.deeds.create.path, {
          description: PRAYER_TO_DESCRIPTION[prayer],
          category: SHOLAT_FARDHU_CATEGORY,
          deedType: "good",
          points: 100,
          quantity: 1,
          sholatType: PRAYER_TO_SHOLAT_TYPE[prayer],
          customUnit: "times",
          // createdAt intentionally omitted so the server stamps `now()` —
          // keeps Recent Activity ordering natural.
        });
        const created = (await res.json()) as Deed;
        removePending((op) => op.kind === "create" && op.tempId === tempId);
        queryClient.setQueryData<Deed[]>(DEEDS_QUERY_KEY, (current) => {
          const list = current ?? [];
          const withoutTemp = list.filter((d) => d.id !== tempId);
          if (withoutTemp.some((d) => d.id === created.id)) return withoutTemp;
          return [created, ...withoutTemp];
        });
        invalidateDeedDependents(queryClient);
      } catch (err) {
        if (isNetworkError(err)) {
          // Offline: keep the optimistic deed visible AND the pending op in
          // the queue so a later online event will flush it to the server.
          return;
        }
        // Server rejected — revert.
        removePending((op) => op.kind === "create" && op.tempId === tempId);
        queryClient.setQueryData<Deed[]>(DEEDS_QUERY_KEY, previous);
        throw err;
      }
    },
    [date, queryClient],
  );

  const deletePrayerDeed = useCallback(
    async (prayer: PrayerKey, deedId: number) => {
      await queryClient.cancelQueries({ queryKey: DEEDS_QUERY_KEY });
      const previous = queryClient.getQueryData<Deed[]>(DEEDS_QUERY_KEY) ?? [];
      queryClient.setQueryData<Deed[]>(
        DEEDS_QUERY_KEY,
        previous.filter((d) => d.id !== deedId),
      );

      enqueuePending({ kind: "delete", date, prayer, deedId });

      try {
        await apiRequest("DELETE", buildUrl(api.deeds.delete.path, { id: deedId }));
        removePending((op) => op.kind === "delete" && op.deedId === deedId);
        invalidateDeedDependents(queryClient);
      } catch (err) {
        if (isNetworkError(err)) {
          // Offline: keep optimistic state + pending op for later retry.
          return;
        }
        removePending((op) => op.kind === "delete" && op.deedId === deedId);
        queryClient.setQueryData<Deed[]>(DEEDS_QUERY_KEY, previous);
        throw err;
      }
    },
    [date, queryClient],
  );

  const togglePrayer = useCallback(
    (prayer: PrayerKey) => {
      if (pendingRef.current.has(prayer)) return;
      pendingRef.current.add(prayer);

      const list = queryClient.getQueryData<Deed[]>(DEEDS_QUERY_KEY) ?? deedsQuery.data ?? [];
      const existing = findMatchingDeed(list, date, prayer);

      const work =
        existing && existing.id > 0
          ? deletePrayerDeed(prayer, existing.id)
          : existing && existing.id < 0
            ? // Tapping off an as-yet-unsynced create: just drop the temp deed
              // and the queued op. No network call needed.
              (() => {
                removePending((op) => op.kind === "create" && op.tempId === existing.id);
                queryClient.setQueryData<Deed[]>(DEEDS_QUERY_KEY, (current) =>
                  (current ?? []).filter((d) => d.id !== existing.id),
                );
                return Promise.resolve();
              })()
            : createPrayerDeed(prayer);

      work
        .catch(() => {
          // Errors are already handled inside the mutators (revert + rethrow);
          // we just need to swallow here so a server-rejection toast fires
          // once instead of bubbling further.
        })
        .finally(() => {
          pendingRef.current.delete(prayer);
        });
    },
    [createPrayerDeed, date, deedsQuery.data, deletePrayerDeed, queryClient],
  );

  const markAll = useCallback(() => {
    const list = queryClient.getQueryData<Deed[]>(DEEDS_QUERY_KEY) ?? deedsQuery.data ?? [];
    const current = flagsFromDeeds(list, date);
    for (const prayer of PRAYER_KEYS) {
      if (current[prayer]) continue;
      if (pendingRef.current.has(prayer)) continue;
      pendingRef.current.add(prayer);
      createPrayerDeed(prayer)
        .catch(() => {})
        .finally(() => {
          pendingRef.current.delete(prayer);
        });
    }
  }, [createPrayerDeed, date, deedsQuery.data, queryClient]);

  return {
    flags,
    isLoading: deedsQuery.isLoading,
    isError: deedsQuery.isError,
    togglePrayer,
    markAll,
    isMutating: false,
  };
}
