import {
  QURAN_ARABIC_FONTS,
  DEFAULT_QURAN_ARABIC_FONT,
  QURAN_ARABIC_FONT_SIZES,
  DEFAULT_QURAN_ARABIC_FONT_SIZE,
  QURAN_ARABIC_LINE_HEIGHTS,
  DEFAULT_QURAN_ARABIC_LINE_HEIGHT,
  type QuranArabicFont,
  type QuranArabicFontSize,
  type QuranArabicLineHeight,
} from "@shared/schema";

export {
  QURAN_ARABIC_FONTS,
  DEFAULT_QURAN_ARABIC_FONT,
  QURAN_ARABIC_FONT_SIZES,
  DEFAULT_QURAN_ARABIC_FONT_SIZE,
  QURAN_ARABIC_LINE_HEIGHTS,
  DEFAULT_QURAN_ARABIC_LINE_HEIGHT,
};
export type { QuranArabicFont, QuranArabicFontSize, QuranArabicLineHeight };

export type QuranArabicFontOption = {
  id: QuranArabicFont;
  label: string;
  description: string;
  cssFamily: string;
};

export const QURAN_ARABIC_FONT_OPTIONS: QuranArabicFontOption[] = [
  {
    id: "uthmani",
    label: "Uthmani (Amiri)",
    description: "Classic Uthmani-style script",
    cssFamily: "'Amiri', 'Scheherazade New', 'Noto Naskh Arabic', serif",
  },
  {
    id: "naskh",
    label: "Naskh",
    description: "Clean modern Naskh",
    cssFamily: "'Noto Naskh Arabic', 'Amiri', serif",
  },
  {
    id: "scheherazade",
    label: "Scheherazade",
    description: "Traditional with vowel marks",
    cssFamily: "'Scheherazade New', 'Amiri', serif",
  },
  {
    id: "indopak",
    label: "Indo-Pak (Nastaliq)",
    description: "South Asian Nastaliq style",
    cssFamily: "'Noto Nastaliq Urdu', 'Scheherazade New', serif",
  },
];

export function fontFamilyFor(id: QuranArabicFont | null | undefined): string {
  const opt = QURAN_ARABIC_FONT_OPTIONS.find((o) => o.id === id);
  return (opt ?? QURAN_ARABIC_FONT_OPTIONS[0]).cssFamily;
}

// Verse font-size presets. Picked so "md" matches the previous hard-coded
// `text-2xl` (1.5rem) rendering — existing readers see no shift until they
// opt into a different size.
export type QuranArabicFontSizeOption = {
  id: QuranArabicFontSize;
  label: string;
  cssSize: string;
};

export const QURAN_ARABIC_FONT_SIZE_OPTIONS: QuranArabicFontSizeOption[] = [
  { id: "sm", label: "S", cssSize: "1.25rem" },
  { id: "md", label: "M", cssSize: "1.5rem" },
  { id: "lg", label: "L", cssSize: "1.875rem" },
  { id: "xl", label: "XL", cssSize: "2.5rem" },
];

export function fontSizeCssFor(id: QuranArabicFontSize | null | undefined): string {
  const opt = QURAN_ARABIC_FONT_SIZE_OPTIONS.find((o) => o.id === id);
  return (opt ?? QURAN_ARABIC_FONT_SIZE_OPTIONS[1]).cssSize;
}

// Verse line-height presets. "normal" matches the previous `leading-relaxed`
// rendering closely enough that existing readers see no jump.
export type QuranArabicLineHeightOption = {
  id: QuranArabicLineHeight;
  label: string;
  cssLineHeight: string;
};

export const QURAN_ARABIC_LINE_HEIGHT_OPTIONS: QuranArabicLineHeightOption[] = [
  { id: "compact", label: "Compact", cssLineHeight: "1.6" },
  { id: "normal", label: "Normal", cssLineHeight: "1.9" },
  { id: "relaxed", label: "Relaxed", cssLineHeight: "2.2" },
  { id: "loose", label: "Loose", cssLineHeight: "2.6" },
];

export function lineHeightCssFor(id: QuranArabicLineHeight | null | undefined): string {
  const opt = QURAN_ARABIC_LINE_HEIGHT_OPTIONS.find((o) => o.id === id);
  return (opt ?? QURAN_ARABIC_LINE_HEIGHT_OPTIONS[1]).cssLineHeight;
}

export const QURAN_ARABIC_PREVIEW = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
