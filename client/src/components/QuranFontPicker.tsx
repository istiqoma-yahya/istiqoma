import { Type, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuranFont } from "@/components/QuranFontProvider";
import {
  QURAN_ARABIC_FONT_OPTIONS,
  QURAN_ARABIC_FONT_SIZE_OPTIONS,
  QURAN_ARABIC_LINE_HEIGHT_OPTIONS,
  QURAN_ARABIC_PREVIEW,
} from "@/lib/quranArabicFonts";
import { cn } from "@/lib/utils";

export function QuranFontPicker() {
  const { t } = useTranslation();
  const {
    font,
    setFont,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
  } = useQuranFont();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          data-testid="button-open-font-picker"
          aria-label={t("quranMenu.fontStyle", { defaultValue: "Font style" })}
        >
          <Type className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" data-testid="sheet-font-picker">
        <SheetHeader>
          <SheetTitle>{t("quranMenu.typography", { defaultValue: "Typography" })}</SheetTitle>
          <SheetDescription>
            {t("quranMenu.typographyHint", {
              defaultValue: "Adjust how Arabic verses are rendered.",
            })}
          </SheetDescription>
        </SheetHeader>

        {/* Live preview reflects every typography choice in one place so the
            user can compare changes without scrolling through individual
            font cards. */}
        <div
          className="mt-4 mb-2 px-4 py-5 rounded-lg border border-card-border bg-muted/40 text-right font-arabic text-arabic"
          dir="rtl"
          data-testid="preview-typography"
        >
          {QURAN_ARABIC_PREVIEW}
        </div>

        <div className="py-4 space-y-6">
          <section>
            <div className="text-sm font-medium mb-2">
              {t("quranMenu.fontSize", { defaultValue: "Size" })}
            </div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Arabic verse size">
              {QURAN_ARABIC_FONT_SIZE_OPTIONS.map((opt) => {
                const active = opt.id === fontSize;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFontSize(opt.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg border border-card-border hover-elevate active-elevate-2 text-sm font-medium",
                      active && "border-emerald-500/60 bg-emerald-500/5",
                    )}
                    data-testid={`button-font-size-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="text-sm font-medium mb-2">
              {t("quranMenu.lineHeight", { defaultValue: "Line spacing" })}
            </div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Arabic verse line spacing">
              {QURAN_ARABIC_LINE_HEIGHT_OPTIONS.map((opt) => {
                const active = opt.id === lineHeight;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLineHeight(opt.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg border border-card-border hover-elevate active-elevate-2 text-xs font-medium",
                      active && "border-emerald-500/60 bg-emerald-500/5",
                    )}
                    data-testid={`button-line-height-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="text-sm font-medium mb-2">
              {t("quranMenu.fontStyle", { defaultValue: "Font style" })}
            </div>
            <div className="space-y-2">
              {QURAN_ARABIC_FONT_OPTIONS.map((opt) => {
                const active = opt.id === font;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFont(opt.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg border border-card-border hover-elevate active-elevate-2 flex items-start justify-between gap-3",
                      active && "border-emerald-500/60 bg-emerald-500/5",
                    )}
                    data-testid={`button-font-${opt.id}`}
                    aria-pressed={active}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {opt.label}
                        {active && (
                          <Check
                            className="w-4 h-4 text-emerald-500"
                            data-testid={`indicator-font-active-${opt.id}`}
                          />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {opt.description}
                      </div>
                      <div
                        className="text-2xl text-right leading-relaxed"
                        style={{ fontFamily: opt.cssFamily }}
                        dir="rtl"
                        data-testid={`preview-font-${opt.id}`}
                      >
                        {QURAN_ARABIC_PREVIEW}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
