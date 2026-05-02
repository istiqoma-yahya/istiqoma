import { targetRecommendationSchema, type TargetRecommendation } from "@shared/schema";

const STORAGE_PREFIX = "target-recommendation:";

export function stashRecommendation(rec: TargetRecommendation): string {
  if (typeof window === "undefined") return rec.id;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + rec.id, JSON.stringify(rec));
  } catch {
    // sessionStorage may be unavailable (private mode, quota); the
    // CreateTargetPage will still work with just the category from the URL.
  }
  return rec.id;
}

export function loadRecommendation(id: string): TargetRecommendation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const parsed = targetRecommendationSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearRecommendation(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_PREFIX + id);
  } catch {
    // ignore
  }
}
