import { QURAN_ARABIC_FONTS, DEFAULT_QURAN_ARABIC_FONT, type QuranArabicFont } from "@shared/schema";

export { QURAN_ARABIC_FONTS, DEFAULT_QURAN_ARABIC_FONT };
export type { QuranArabicFont };

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

export const QURAN_ARABIC_PREVIEW = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
