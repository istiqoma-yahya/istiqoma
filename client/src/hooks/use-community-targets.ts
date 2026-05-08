import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  CommunityTarget,
  CommunityTargetListItem,
  CommunityTargetLeaderboardEntry,
  InsertCommunityTarget,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function useCommunityTargets() {
  return useQuery<CommunityTargetListItem[]>({
    queryKey: [api.communityTargets.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.communityTargets.list.path);
      return await res.json();
    },
  });
}

export function useCommunityTarget(id: number | null) {
  return useQuery<CommunityTargetListItem>({
    queryKey: [api.communityTargets.list.path, id],
    enabled: id != null && Number.isFinite(id),
    queryFn: async () => {
      const url = buildUrl(api.communityTargets.get.path, { id: id! });
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });
}

export function useCommunityTargetLeaderboard(id: number | null, opts?: { limit?: number; offset?: number }) {
  return useQuery<{ entries: CommunityTargetLeaderboardEntry[]; total: number }>({
    queryKey: [api.communityTargets.list.path, id, "leaderboard", opts?.limit ?? 50, opts?.offset ?? 0],
    enabled: id != null && Number.isFinite(id),
    queryFn: async () => {
      const base = buildUrl(api.communityTargets.leaderboard.path, { id: id! });
      const qs = new URLSearchParams();
      if (opts?.limit) qs.set("limit", String(opts.limit));
      if (opts?.offset) qs.set("offset", String(opts.offset));
      const url = qs.toString() ? `${base}?${qs.toString()}` : base;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    refetchInterval: 30_000,
  });
}

function invalidateCommunity(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [api.communityTargets.list.path] });
}

export function useCreateCommunityTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (data: InsertCommunityTarget) => {
      const validated = api.communityTargets.create.input.parse(data);
      const res = await apiRequest(
        api.communityTargets.create.method,
        api.communityTargets.create.path,
        validated,
      );
      return (await res.json()) as CommunityTarget;
    },
    onSuccess: () => invalidateCommunity(queryClient),
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCommunityTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertCommunityTarget }) => {
      const validated = api.communityTargets.update.input.parse(data);
      const url = buildUrl(api.communityTargets.update.path, { id });
      const res = await apiRequest(api.communityTargets.update.method, url, validated);
      return (await res.json()) as CommunityTarget;
    },
    onSuccess: () => invalidateCommunity(queryClient),
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCommunityTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.communityTargets.delete.path, { id });
      await apiRequest(api.communityTargets.delete.method, url);
    },
    onSuccess: () => invalidateCommunity(queryClient),
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useJoinCommunityTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.communityTargets.join.path, { id });
      const res = await apiRequest(api.communityTargets.join.method, url);
      return await res.json();
    },
    onSuccess: () => invalidateCommunity(queryClient),
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}

export function useLeaveCommunityTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.communityTargets.leave.path, { id });
      await apiRequest(api.communityTargets.leave.method, url);
    },
    onSuccess: () => invalidateCommunity(queryClient),
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });
}
