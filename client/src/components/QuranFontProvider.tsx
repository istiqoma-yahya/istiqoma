import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useReadingState, useUpdateReadingState } from "@/hooks/use-quran";
import {
  DEFAULT_QURAN_ARABIC_FONT,
  fontFamilyFor,
  type QuranArabicFont,
} from "@/lib/quranArabicFonts";

type Ctx = {
  font: QuranArabicFont;
  setFont: (font: QuranArabicFont) => void;
  isPending: boolean;
};

const QuranFontContext = createContext<Ctx | null>(null);

export function QuranFontProvider({ children }: { children: ReactNode }) {
  const { data: readingState } = useReadingState();
  const update = useUpdateReadingState();

  // Local optimistic override so the font swaps instantly when the user
  // taps a new option, even before the server PUT resolves. We clear it
  // once the server confirms the same value so future server updates
  // (e.g. another device) take effect.
  const [optimistic, setOptimistic] = useState<QuranArabicFont | null>(null);
  const serverFont = (readingState?.arabicFont as QuranArabicFont) ?? null;

  useEffect(() => {
    if (optimistic && serverFont === optimistic) setOptimistic(null);
  }, [optimistic, serverFont]);

  const font: QuranArabicFont = optimistic ?? serverFont ?? DEFAULT_QURAN_ARABIC_FONT;

  // Apply the font as a CSS variable on the root so every `font-arabic`
  // utility (which resolves to var(--font-quran-arabic)) re-renders at once.
  useEffect(() => {
    const family = fontFamilyFor(font);
    document.documentElement.style.setProperty("--font-quran-arabic", family);
    return () => {
      document.documentElement.style.setProperty(
        "--font-quran-arabic",
        fontFamilyFor(DEFAULT_QURAN_ARABIC_FONT),
      );
    };
  }, [font]);

  const value = useMemo<Ctx>(
    () => ({
      font,
      setFont: (next: QuranArabicFont) => {
        if (next === font) return;
        setOptimistic(next);
        update.mutate(
          { arabicFont: next },
          { onError: () => setOptimistic(null) },
        );
      },
      isPending: update.isPending,
    }),
    [font, update],
  );

  return <QuranFontContext.Provider value={value}>{children}</QuranFontContext.Provider>;
}

export function useQuranFont(): Ctx {
  const ctx = useContext(QuranFontContext);
  if (!ctx) {
    return {
      font: DEFAULT_QURAN_ARABIC_FONT,
      setFont: () => {},
      isPending: false,
    };
  }
  return ctx;
}
