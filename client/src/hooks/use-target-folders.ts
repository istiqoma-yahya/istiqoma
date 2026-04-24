import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertTargetFolder, type TargetFolder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export function useTargetFolders() {
  return useQuery<TargetFolder[]>({
    queryKey: [api.targetFolders.list.path],
    queryFn: async () => {
      const res = await fetch(api.targetFolders.list.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch folders");
      return await res.json();
    },
  });
}

export function useCreateTargetFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: InsertTargetFolder) => {
      const validated = api.targetFolders.create.input.parse(data);
      const res = await apiRequest(
        api.targetFolders.create.method,
        api.targetFolders.create.path,
        validated,
      );
      return (await res.json()) as TargetFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targetFolders.list.path] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTargetFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertTargetFolder }) => {
      const validated = api.targetFolders.update.input.parse(data);
      const url = buildUrl(api.targetFolders.update.path, { id });
      const res = await apiRequest(api.targetFolders.update.method, url, validated);
      return (await res.json()) as TargetFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targetFolders.list.path] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTargetFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.targetFolders.delete.path, { id });
      await apiRequest(api.targetFolders.delete.method, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targetFolders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useMoveTargetToFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ targetId, folderId }: { targetId: number; folderId: number | null }) => {
      const url = buildUrl(api.targets.update.path, { id: targetId });
      const res = await apiRequest(api.targets.update.method, url, { folderId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.targets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.targets.listWithProgress.path] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
