import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PrayerCompletion, PrayerKey, PrayerCompletionFlags } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const QUERY_BASE = "/api/prayer-completions";

const EMPTY_FLAGS: PrayerCompletionFlags = {
  fajr: false,
  dhuhr: false,
  asr: false,
  maghrib: false,
  isha: false,
};

function localStorageKey(date: string): string {
  return `sholat_done_${date}`;
}

function dirtyKey(date: string): string {
  return `sholat_done_dirty_${date}`;
}

const MIGRATED_PREFIX = "sholat_done_migrated_";

function migratedKey(date: string): string {
  return MIGRATED_PREFIX + date;
}

export function loadLocalCompletion(date: string): PrayerCompletionFlags {
  try {
    const raw = localStorage.getItem(localStorageKey(date));
    if (!raw) return { ...EMPTY_FLAGS };
    const parsed = JSON.parse(raw);
    return {
      fajr: !!parsed.fajr,
      dhuhr: !!parsed.dhuhr,
      asr: !!parsed.asr,
      maghrib: !!parsed.maghrib,
      isha: !!parsed.isha,
    };
  } catch {
    return { ...EMPTY_FLAGS };
  }
}

export function saveLocalCompletion(date: string, flags: PrayerCompletionFlags) {
  try {
    localStorage.setItem(localStorageKey(date), JSON.stringify(flags));
  } catch {}
}

function markDirty(date: string) {
  try {
    localStorage.setItem(dirtyKey(date), "1");
  } catch {}
}

function clearDirty(date: string) {
  try {
    localStorage.removeItem(dirtyKey(date));
  } catch {}
}

function isDirty(date: string): boolean {
  try {
    return localStorage.getItem(dirtyKey(date)) === "1";
  } catch {
    return false;
  }
}

function hasMigrated(date: string): boolean {
  try {
    return localStorage.getItem(migratedKey(date)) === "1";
  } catch {
    return true;
  }
}

function markMigrated(date: string) {
  try {
    localStorage.setItem(migratedKey(date), "1");
  } catch {}
}

function emptyCompletion(date: string): PrayerCompletion {
  return {
    id: 0,
    userId: "",
    date,
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
    createdAt: null,
    updatedAt: null,
  };
}

function withFlags(base: PrayerCompletion, flags: Partial<PrayerCompletionFlags>): PrayerCompletion {
  return { ...base, ...flags };
}

function flagsFromCompletion(c: PrayerCompletion | undefined | null): PrayerCompletionFlags {
  if (!c) return { ...EMPTY_FLAGS };
  return {
    fajr: !!c.fajr,
    dhuhr: !!c.dhuhr,
    asr: !!c.asr,
    maghrib: !!c.maghrib,
    isha: !!c.isha,
  };
}

function isAnyTrue(flags: PrayerCompletionFlags): boolean {
  return flags.fajr || flags.dhuhr || flags.asr || flags.maghrib || flags.isha;
}

// A network error means the request never reached (or got a response from)
// the server — fetch rejects with TypeError. HTTP error responses are wrapped
// by `apiRequest` as Errors with a `"<status>: ..."` message prefix.
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    return !/^\d{3}:/.test(err.message);
  }
  return true;
}

export function usePrayerCompletion(date: string) {
  const queryClient = useQueryClient();
  const queryKey = [QUERY_BASE, date] as const;

  const query = useQuery<PrayerCompletion>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${QUERY_BASE}/${date}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      const completion = (await res.json()) as PrayerCompletion;

      // If the user toggled while offline, push local state to the server
      // before trusting what we just fetched.
      if (isDirty(date)) {
        const local = loadLocalCompletion(date);
        try {
          const putRes = await apiRequest("PUT", `${QUERY_BASE}/${date}`, local);
          const updated = (await putRes.json()) as PrayerCompletion;
          clearDirty(date);
          markMigrated(date);
          saveLocalCompletion(date, flagsFromCompletion(updated));
          return updated;
        } catch {
          // Still offline — keep local state; do not overwrite it.
          return withFlags(completion, local);
        }
      }

      // One-shot migration of legacy localStorage values into the server.
      // Migrate whenever the local cache has any prayer marked done that the
      // server doesn't yet know about — even if the server already has other
      // prayers marked from another device. We OR-merge so no checkmark is
      // ever lost.
      if (!hasMigrated(date)) {
        const local = loadLocalCompletion(date);
        const server = flagsFromCompletion(completion);
        const needsMigration = (Object.keys(local) as Array<keyof PrayerCompletionFlags>).some(
          (k) => local[k] && !server[k],
        );
        if (needsMigration) {
          try {
            const merged: PrayerCompletionFlags = {
              fajr: local.fajr || server.fajr,
              dhuhr: local.dhuhr || server.dhuhr,
              asr: local.asr || server.asr,
              maghrib: local.maghrib || server.maghrib,
              isha: local.isha || server.isha,
            };
            const putRes = await apiRequest("PUT", `${QUERY_BASE}/${date}`, merged);
            const updated = (await putRes.json()) as PrayerCompletion;
            markMigrated(date);
            saveLocalCompletion(date, flagsFromCompletion(updated));
            return updated;
          } catch {
            // Leave migrated flag unset so we retry on next load.
          }
        } else {
          markMigrated(date);
        }
      }

      saveLocalCompletion(date, flagsFromCompletion(completion));
      return completion;
    },
    // Use placeholderData (not initialData) so the cached localStorage value
    // is shown immediately on mount but does NOT count as fresh server data —
    // queryFn always runs to pull the latest from the API.
    placeholderData: () => {
      const local = loadLocalCompletion(date);
      return withFlags(emptyCompletion(date), local);
    },
    staleTime: 0,
  });

  // When the tab regains focus or the network comes back, refetch so any
  // local-only changes get flushed to the server (handled inside queryFn).
  useEffect(() => {
    const refetchIfDirty = () => {
      if (isDirty(date)) {
        queryClient.invalidateQueries({ queryKey: [QUERY_BASE, date] });
      }
    };
    window.addEventListener("focus", refetchIfDirty);
    window.addEventListener("online", refetchIfDirty);
    return () => {
      window.removeEventListener("focus", refetchIfDirty);
      window.removeEventListener("online", refetchIfDirty);
    };
  }, [date, queryClient]);

  const flags = flagsFromCompletion(query.data);

  type MutationContext = { previous: PrayerCompletion | undefined };

  const updateOne = useMutation<PrayerCompletion, Error, { prayer: PrayerKey; done: boolean }, MutationContext>({
    mutationFn: async ({ prayer, done }) => {
      const res = await apiRequest("PATCH", `${QUERY_BASE}/${date}`, { prayer, done });
      return (await res.json()) as PrayerCompletion;
    },
    onMutate: async ({ prayer, done }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PrayerCompletion>(queryKey);
      const base = previous ?? emptyCompletion(date);
      const next = withFlags(base, { [prayer]: done });
      queryClient.setQueryData(queryKey, next);
      saveLocalCompletion(date, flagsFromCompletion(next));
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (isNetworkError(err)) {
        // Offline: keep the optimistic state locally and remember to sync
        // it back when the network returns.
        markDirty(date);
        return;
      }
      // Server rejected the change — revert to last known good state.
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        saveLocalCompletion(date, flagsFromCompletion(context.previous));
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      saveLocalCompletion(date, flagsFromCompletion(data));
      clearDirty(date);
    },
  });

  const setAll = useMutation<PrayerCompletion, Error, PrayerCompletionFlags, MutationContext>({
    mutationFn: async (newFlags) => {
      const res = await apiRequest("PUT", `${QUERY_BASE}/${date}`, newFlags);
      return (await res.json()) as PrayerCompletion;
    },
    onMutate: async (newFlags) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PrayerCompletion>(queryKey);
      const base = previous ?? emptyCompletion(date);
      const next = withFlags(base, newFlags);
      queryClient.setQueryData(queryKey, next);
      saveLocalCompletion(date, newFlags);
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (isNetworkError(err)) {
        markDirty(date);
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        saveLocalCompletion(date, flagsFromCompletion(context.previous));
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      saveLocalCompletion(date, flagsFromCompletion(data));
      clearDirty(date);
    },
  });

  return {
    flags,
    isLoading: query.isLoading,
    isError: query.isError,
    togglePrayer: (prayer: PrayerKey) => updateOne.mutate({ prayer, done: !flags[prayer] }),
    markAll: () =>
      setAll.mutate({
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      }),
    isMutating: updateOne.isPending || setAll.isPending,
  };
}
