import { Q1_VALUES, Q2_VALUES, Q3_VALUES, Q4_VALUES, Q5_VALUES } from "@shared/schema";

export type Q1 = (typeof Q1_VALUES)[number];
export type Q2 = (typeof Q2_VALUES)[number];
export type Q3 = (typeof Q3_VALUES)[number];
export type Q4 = (typeof Q4_VALUES)[number];
export type Q5 = (typeof Q5_VALUES)[number];

export const Q3_TO_CATEGORY: Record<Q3, string> = {
  "baca-quran": "Baca Quran",
  dzikir: "Dzikir",
  "sholat-fardhu": "Sholat Fardhu",
  "sholat-sunnah": "Sholat Sunnah",
  puasa: "Puasa",
  "hafalan-quran": "Baca Quran",
  "birrul-walidayn": "Birrul Walidayn",
  shodaqoh: "Shodaqoh",
  "tolabul-ilmi": "Tolabul Ilmi",
};
