import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomDzikirType } from "@shared/schema";

const QUERY_KEY = "/api/dzikir-types";

export function useCustomDzikirTypes() {
  return useQuery<CustomDzikirType[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const res = await fetch(QUERY_KEY, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch custom dzikir types");
      return res.json();
    },
  });
}

export function useCreateCustomDzikirType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch(QUERY_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create custom dzikir type");
      }
      return res.json() as Promise<CustomDzikirType>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteCustomDzikirType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${QUERY_KEY}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete custom dzikir type");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
