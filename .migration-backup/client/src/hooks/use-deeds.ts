import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, errorSchemas } from "@shared/routes";
import { type InsertDeed } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { celebrateBadges } from "@/lib/badge-celebration";
import { apiRequest } from "@/lib/queryClient";

type CreateDeedRequest = InsertDeed;

export function useDeeds() {
  return useQuery({
    queryKey: [api.deeds.list.path],
    queryFn: async () => {
      // Route through `apiRequest` so a 401 here triggers the centralized
      // session-expired recovery flow (silent retry → toast → redirect to
      // /api/login?returnTo=…) instead of silently rendering "no deeds".
      // React Query's default behavior keeps the previously-cached deeds
      // visible while the redirect happens, so the user never sees their
      // history wink out of existence on auth loss.
      const res = await apiRequest("GET", api.deeds.list.path);
      return api.deeds.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDeed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateDeedRequest) => {
      // Ensure numeric types are correct before sending
      const validated = api.deeds.create.input.parse(data);
      
      const res = await fetch(api.deeds.create.path, {
        method: api.deeds.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = errorSchemas.validation.parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create deed");
      }
      return api.deeds.create.responses[201].parse(await res.json());
    },
    onSuccess: (deed) => {
      queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets/progress"] });
      // Surface celebratory toasts + animation for newly-earned badge tiers.
      const newlyEarned = deed.newlyEarnedBadges;
      if (newlyEarned && newlyEarned.length > 0) {
        const tierLabels = ["", "Bronze", "Silver", "Gold", "Platinum"];
        for (const b of newlyEarned) {
          toast({
            title: t("achievements.toastTitle", { defaultValue: "Badge unlocked!" }),
            description: `${b.name} • ${tierLabels[b.tier] ?? `Tier ${b.tier}`}`,
          });
        }
        celebrateBadges(newlyEarned);
      }
      // If the server refunded a freezer because this deed landed on a
      // previously auto-frozen day, also refresh the freezer & streak views
      // and surface a confirmation toast.
      const refunded = deed.freezerRefunded;
      const refundedDate = deed.refundedDate ?? null;
      if (refunded) {
        queryClient.invalidateQueries({ queryKey: ["/api/streak-freezer"] });
        queryClient.invalidateQueries({ queryKey: ["/api/streak"] });
        toast({
          title: t("streakFreezer.refundToastTitle"),
          description: t("streakFreezer.refundToastDescription", { date: refundedDate ?? "" }),
        });
        return;
      }
      if (!newlyEarned || newlyEarned.length === 0) {
        toast({
          title: t("deeds.recorded"),
          description: t("deeds.recordedDesc"),
        });
      }
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

export function useDeleteDeed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.deeds.delete.path, { id });
      const res = await fetch(url, { 
        method: api.deeds.delete.method,
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Deed not found");
        throw new Error("Failed to delete deed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets/progress"] });
      toast({
        title: t("deeds.deleted"),
        description: t("deeds.deletedDesc"),
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

export function useUpdateDeed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateDeedRequest }) => {
      const validated = api.deeds.update.input.parse(data);
      const url = buildUrl(api.deeds.update.path, { id });
      
      const res = await fetch(url, {
        method: api.deeds.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = errorSchemas.validation.parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 404) throw new Error("Deed not found");
        throw new Error("Failed to update deed");
      }
      return api.deeds.update.responses[200].parse(await res.json());
    },
    onSuccess: (deed) => {
      queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets/progress"] });
      const newlyEarned = deed.newlyEarnedBadges;
      if (newlyEarned && newlyEarned.length > 0) {
        for (const b of newlyEarned) {
          const tierLabel = t(`achievements.tiers.${b.tier}` as any, "");
          toast({
            title: t("achievements.celebrationTitle"),
            description: `${b.name} • ${tierLabel || `Tier ${b.tier}`}`,
          });
        }
        celebrateBadges(newlyEarned);
      } else {
        toast({
          title: t("deeds.updated"),
          description: t("deeds.updatedDesc"),
        });
      }
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
