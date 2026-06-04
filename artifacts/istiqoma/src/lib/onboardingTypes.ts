import {
  Q1_VALUES,
  Q2_VALUES,
  Q3_VALUES,
  Q4_VALUES,
  Q5_VALUES,
  Q3_TO_CATEGORY as SHARED_Q3_TO_CATEGORY,
} from "@shared/schema";

export type Q1 = (typeof Q1_VALUES)[number];
export type Q2 = (typeof Q2_VALUES)[number];
export type Q3 = (typeof Q3_VALUES)[number];
export type Q4 = (typeof Q4_VALUES)[number];
export type Q5 = (typeof Q5_VALUES)[number];

// Re-export the shared mapping so existing client imports keep working
// without forcing every consumer to update its import path.
export const Q3_TO_CATEGORY = SHARED_Q3_TO_CATEGORY;
