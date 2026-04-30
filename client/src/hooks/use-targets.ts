import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertTarget, type TargetWithProgress, type TargetHistory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export type TargetHistoryWithStreak = {
  history: TargetHistory[];
  currentStreak: number;
};

export function useTargets() {
  return useQuery({
    queryKey: [api.targets.list.path],
    queryFn: async () => {
      const res = await fetch(api.targets.list.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch targets");
      return api.targets.list.responses[200].parse(await res.json());
    },
  });
}

export function useTargetsWithProgress() {
  return useQuery<TargetWithProgress[]>({
    queryKey: [api.targets.listWithProgress.path],
    queryFn: async () => {
      const res = await fetch(api.targets.listWithProgress.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch targets with progress");
      return await res.json();
    },
  });
}

export function useCreateTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return api.targets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      toast({
        title: "Target Created",
        description: "Your spiritual goal has been set successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return api.targets.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      toast({
        title: "Target Updated",
        description: "Your spiritual goal has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        title: "Target Deleted",
        description: "The spiritual goal has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
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
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return { history: [], currentStreak: 0 };
      if (!res.ok) throw new Error("Failed to fetch target history");
      return await res.json();
    },
    enabled: !!targetId,
  });
}

export function useUpdateTargetProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCompleteTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
      toast({
        title: "Target Completed",
        description: "Congratulations on achieving your goal!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
