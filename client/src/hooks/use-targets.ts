import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertTarget, type TargetWithProgress, type TargetHistory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { NewlyEarnedBadge } from "@shared/schema";
import { celebrateBadges } from "@/lib/badge-celebration";
import { apiRequest } from "@/lib/queryClient";

function toastNewlyEarned(
  badges: NewlyEarnedBadge[] | undefined,
  toast: ReturnType<typeof useToast>["toast"],
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (!Array.isArray(badges) || badges.length === 0) return;
  for (const b of badges) {
    const tierLabel = t(`achievements.tiers.${b.tier}` as any, "");
    const desc = tierLabel
      ? t("achievements.tierEarned", { tier: tierLabel }) + (b.description ? ` — ${b.description}` : "")
      : b.description ?? "";
    toast({
      title: `🏆 ${b.name}`,
      description: desc,
    });
  }
  celebrateBadges(badges);
}

export type TargetHistoryWithStreak = {
  history: TargetHistory[];
  currentStreak: number;
};

export function useTargets() {
  return useQuery({
    queryKey: [api.targets.list.path],
    queryFn: async () => {
      // Route through `apiRequest` so a 401 triggers the centralized
      // session-expired flow (silent retry → toast → redirect with returnTo)
      // instead of replacing the user's targets list with `[]`.
      const res = await apiRequest("GET", api.targets.list.path);
      return api.targets.list.responses[200].parse(await res.json());
    },
  });
}

export function useTargetsWithProgress() {
  return useQuery<TargetWithProgress[]>({
    queryKey: [api.targets.listWithProgress.path],
    queryFn: async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const url = tz
        ? `${api.targets.listWithProgress.path}?timezone=${encodeURIComponent(tz)}`
        : api.targets.listWithProgress.path;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });
}

export function useCreateTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: InsertTarget) => {
      const validated = api.targets.create.input.parse(data);
      
      const res = await fetch(api.targets.create.path, {
        method: api.targets.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = z.object({ message: z.string() }).parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create target");
      }
      const json = await res.json();
      const parsed = api.targets.create.responses[201].parse(json);
      return { ...parsed, newlyEarnedBadges: (json.newlyEarnedBadges ?? []) as NewlyEarnedBadge[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({
        title: t("targets.targetCreated"),
        description: t("targets.targetCreatedDesc"),
      });
      toastNewlyEarned(data.newlyEarnedBadges, toast, t);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertTarget }) => {
      const validated = api.targets.update.input.parse(data);
      const url = buildUrl(api.targets.update.path, { id });
      
      const res = await fetch(url, {
        method: api.targets.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = z.object({ message: z.string() }).parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 404) throw new Error("Target not found");
        throw new Error("Failed to update target");
      }
      const json = await res.json();
      const parsed = api.targets.update.responses[200].parse(json);
      return { ...parsed, newlyEarnedBadges: (json.newlyEarnedBadges ?? []) as NewlyEarnedBadge[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({
        title: t("targets.targetUpdated"),
        description: t("targets.targetUpdatedDesc"),
      });
      toastNewlyEarned(data.newlyEarnedBadges, toast, t);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.targets.delete.path, { id });
      const res = await fetch(url, {
        method: api.targets.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Target not found");
        throw new Error("Failed to delete target");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      toast({
        title: t("targets.targetDeleted"),
        description: t("targets.targetDeletedDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTargetHistory(targetId: number | null) {
  return useQuery<TargetHistoryWithStreak>({
    queryKey: [api.targets.history.path, targetId],
    queryFn: async () => {
      if (!targetId) return { history: [], currentStreak: 0 };
      const base = buildUrl(api.targets.history.path, { id: targetId });
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const url = `${base}?timezone=${encodeURIComponent(timezone)}`;
      // Same rationale as `useTargets`: route through `apiRequest` so a 401
      // here surfaces the session-expired recovery flow instead of silently
      // erasing the user's history view.
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    enabled: !!targetId,
  });
}

export function useUpdateTargetProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) => {
      const url = buildUrl(api.targets.updateProgress.path, { id });
      const res = await fetch(url, {
        method: api.targets.updateProgress.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress }),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Target not found");
        throw new Error("Failed to update progress");
      }
      const json = await res.json();
      const parsed = api.targets.updateProgress.responses[200].parse(json);
      return { ...parsed, newlyEarnedBadges: (json.newlyEarnedBadges ?? []) as NewlyEarnedBadge[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toastNewlyEarned(data.newlyEarnedBadges, toast, t);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCompleteTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.targets.complete.path, { id });
      const res = await fetch(url, {
        method: api.targets.complete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Target not found");
        throw new Error("Failed to complete target");
      }
      const json = await res.json();
      const parsed = api.targets.complete.responses[200].parse(json);
      return { ...parsed, newlyEarnedBadges: (json.newlyEarnedBadges ?? []) as NewlyEarnedBadge[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({
        title: t("targets.targetCompleted"),
        description: t("targets.targetCompletedDesc"),
      });
      toastNewlyEarned(data.newlyEarnedBadges, toast, t);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
