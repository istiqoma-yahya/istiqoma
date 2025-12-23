import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateCategoryRequest, type CategoryResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useCategories() {
  const { toast } = useToast();

  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const res = await fetch(api.categories.create.path, {
        method: api.categories.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = z.object({ message: z.string() }).parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create category");
      }
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({
        title: "Category Created",
        description: "Your category has been created successfully.",
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

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = `/api/categories/${id}`;
      const res = await fetch(url, {
        method: api.categories.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Category not found");
        throw new Error("Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({
        title: "Category Deleted",
        description: "The category has been removed.",
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

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: api.categories.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update category");
      }
      return api.categories.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({
        title: "Category Updated",
        description: "The category has been updated successfully.",
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

export function useReorderCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await fetch(api.categories.reorder.path, {
        method: api.categories.reorder.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to reorder categories");
      }
      return api.categories.reorder.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
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
