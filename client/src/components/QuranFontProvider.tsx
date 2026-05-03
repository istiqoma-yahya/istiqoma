import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useReadingState, useUpdateReadingState } from "@/hooks/use-quran";
import {
  DEFAULT_QURAN_ARABIC_FONT,
  DEFAULT_QURAN_ARABIC_FONT_SIZE,
  DEFAULT_QURAN_ARABIC_LINE_HEIGHT,
  fontFamilyFor,
  fontSizeCssFor,
  lineHeightCssFor,
  type QuranArabicFont,
  type QuranArabicFontSize,
  type QuranArabicLineHeight,
} from "@/lib/quranArabicFonts";

type Ctx = {
  font: QuranArabicFont;
  setFont: (font: QuranArabicFont) => void;
  fontSize: QuranArabicFontSize;
  setFontSize: (size: QuranArabicFontSize) => void;
  lineHeight: QuranArabicLineHeight;
  setLineHeight: (lh: QuranArabicLineHeight) => void;
  isPending: boolean;
};

const QuranFontContext = createContext<Ctx | null>(null);

export function QuranFontProvider({ children }: { children: ReactNode }) {
  const { data: readingState } = useReadingState();
  const update = useUpdateReadingState();

  // Local optimistic overrides so the typography swaps instantly when the
  // user taps a new option, even before the server PUT resolves. We clear
  // each one once the server confirms the same value so future server
  // updates (e.g. another device) take effect.
  const [optimisticFont, setOptimisticFont] = useState<QuranArabicFont | null>(null);
  const [optimisticSize, setOptimisticSize] = useState<QuranArabicFontSize | null>(null);
  const [optimisticLh, setOptimisticLh] = useState<QuranArabicLineHeight | null>(null);

  const serverFont = (readingState?.arabicFont as QuranArabicFont) ?? null;
  const serverSize = (readingState?.arabicFontSize as QuranArabicFontSize) ?? null;
  const serverLh = (readingState?.arabicLineHeight as QuranArabicLineHeight) ?? null;

  useEffect(() => {
    if (optimisticFont && serverFont === optimisticFont) setOptimisticFont(null);
  }, [optimisticFont, serverFont]);
  useEffect(() => {
    if (optimisticSize && serverSize === optimisticSize) setOptimisticSize(null);
  }, [optimisticSize, serverSize]);
  useEffect(() => {
    if (optimisticLh && serverLh === optimisticLh) setOptimisticLh(null);
  }, [optimisticLh, serverLh]);

  const font: QuranArabicFont = optimisticFont ?? serverFont ?? DEFAULT_QURAN_ARABIC_FONT;
  const fontSize: QuranArabicFontSize = optimisticSize ?? serverSize ?? DEFAULT_QURAN_ARABIC_FONT_SIZE;
  const lineHeight: QuranArabicLineHeight = optimisticLh ?? serverLh ?? DEFAULT_QURAN_ARABIC_LINE_HEIGHT;

  // Apply the typography choices as CSS variables on the root so every
  // `font-arabic` / `text-arabic` utility re-renders at once.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-quran-arabic", fontFamilyFor(font));
    root.style.setProperty("--quran-arabic-size", fontSizeCssFor(fontSize));
    root.style.setProperty("--quran-arabic-leading", lineHeightCssFor(lineHeight));
    return () => {
      root.style.setProperty("--font-quran-arabic", fontFamilyFor(DEFAULT_QURAN_ARABIC_FONT));
      root.style.setProperty("--quran-arabic-size", fontSizeCssFor(DEFAULT_QURAN_ARABIC_FONT_SIZE));
      root.style.setProperty("--quran-arabic-leading", lineHeightCssFor(DEFAULT_QURAN_ARABIC_LINE_HEIGHT));
    };
  }, [font, fontSize, lineHeight]);

  const value = useMemo<Ctx>(
    () => ({
      font,
      setFont: (next: QuranArabicFont) => {
        if (next === font) return;
        setOptimisticFont(next);
        update.mutate(
          { arabicFont: next },
          { onError: () => setOptimisticFont(null) },
        );
      },
      fontSize,
      setFontSize: (next: QuranArabicFontSize) => {
        if (next === fontSize) return;
        setOptimisticSize(next);
        update.mutate(
          { arabicFontSize: next },
          { onError: () => setOptimisticSize(null) },
        );
      },
      lineHeight,
      setLineHeight: (next: QuranArabicLineHeight) => {
        if (next === lineHeight) return;
        setOptimisticLh(next);
        update.mutate(
          { arabicLineHeight: next },
          { onError: () => setOptimisticLh(null) },
        );
      },
      isPending: update.isPending,
    }),
    [font, fontSize, lineHeight, update],
  );

  return <QuranFontContext.Provider value={value}>{children}</QuranFontContext.Provider>;
}

export function useQuranFont(): Ctx {
  const ctx = useContext(QuranFontContext);
  if (!ctx) {
    return {
      font: DEFAULT_QURAN_ARABIC_FONT,
      setFont: () => {},
      fontSize: DEFAULT_QURAN_ARABIC_FONT_SIZE,
      setFontSize: () => {},
      lineHeight: DEFAULT_QURAN_ARABIC_LINE_HEIGHT,
      setLineHeight: () => {},
      isPending: false,
    };
  }
  return ctx;
}
