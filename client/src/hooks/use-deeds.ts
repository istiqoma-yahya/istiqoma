import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, errorSchemas } from "@shared/routes";
import { type InsertDeed } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type CreateDeedRequest = InsertDeed;

export function useDeeds() {
  const { toast } = useToast();

  return useQuery({
    queryKey: [api.deeds.list.path],
    queryFn: async () => {
      const res = await fetch(api.deeds.list.path, { credentials: "include" });
      if (res.status === 401) return null; 
      if (!res.ok) throw new Error("Failed to fetch deeds");
      return api.deeds.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDeed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        if (res.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to create deed");
      }
      return api.deeds.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      toast({
        title: "Deed Recorded",
        description: "Your deed has been successfully tracked.",
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

export function useDeleteDeed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({
        title: "Deed Deleted",
        description: "The deed has been removed from your history.",
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

export function useUpdateDeed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deeds.list.path] });
      toast({
        title: "Deed Updated",
        description: "Your deed has been successfully updated.",
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
