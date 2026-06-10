import { useMemo, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Calendar, Filter, X } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { useDeeds } from "@/hooks/use-deeds";
import { useCategories, useCategoryName } from "@/hooks/use-categories";
import { useCustomDzikirTypes, useDzikirTypeName } from "@/hooks/use-dzikir-types";
import { DeedCard } from "@/components/DeedCard";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Deed } from "@shared/schema";

function DatePickerButton({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
        className="flex items-center gap-2 w-full h-10 px-3 rounded-md border border-border bg-card text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid={testId}
      >
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? format(parseISO(value), "d MMM yyyy") : placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange(""); } }}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

function normalizeCategoryForSubcategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower === "dzikir" || lower === "dzikr") return "Dzikir";
  if (lower === "sholat fardhu") return "Sholat Fardhu";
  if (lower === "sholat sunnah") return "Sholat Sunnah";
  if (lower === "puasa" || lower === "fasting" || lower === "fasting fardhu" || lower === "fasting sunnah") return "Puasa";
  if (lower === "baca quran" || lower === "quran") return "Baca Quran";
  if (lower === "shodaqoh" || lower === "sedekah" || lower === "sodaqoh") return "Shodaqoh";
  return category;
}

const SUBCATEGORY_MAP: Record<string, { field: keyof Deed; items: { id: string; labelKey: string }[] }> = {
  "Dzikir": {
    field: "dzikirType",
    items: [
      { id: "subhanallah", labelKey: "dzikir.types.subhanallah" },
      { id: "alhamdulillah", labelKey: "dzikir.types.alhamdulillah" },
      { id: "allahuakbar", labelKey: "dzikir.types.allahuakbar" },
      { id: "lailahaillallah", labelKey: "dzikir.types.lailahaillallah" },
      { id: "istighfar", labelKey: "dzikir.types.istighfar" },
    ],
  },
  "Sholat Fardhu": {
    field: "sholatType",
    items: [
      { id: "subuh", labelKey: "sholat.types.subuh" },
      { id: "dzuhur", labelKey: "sholat.types.dzuhur" },
      { id: "ashar", labelKey: "sholat.types.ashar" },
      { id: "maghrib", labelKey: "sholat.types.maghrib" },
      { id: "isya", labelKey: "sholat.types.isya" },
      { id: "jumat", labelKey: "sholat.types.jumat" },
    ],
  },
  "Sholat Sunnah": {
    field: "sholatType",
    items: [
      { id: "rawatib", labelKey: "sholat.types.rawatib" },
      { id: "dhuha", labelKey: "sholat.types.dhuha" },
      { id: "tahajjud", labelKey: "sholat.types.tahajjud" },
      { id: "witir", labelKey: "sholat.types.witir" },
      { id: "tarawih", labelKey: "sholat.types.tarawih" },
      { id: "eid", labelKey: "sholat.types.eid" },
      { id: "istikharah", labelKey: "sholat.types.istikharah" },
      { id: "hajat", labelKey: "sholat.types.hajat" },
      { id: "taubat", labelKey: "sholat.types.taubat" },
      { id: "tasbih", labelKey: "sholat.types.tasbih" },
    ],
  },
  "Puasa": {
    field: "fastingType",
    items: [
      { id: "ramadhan", labelKey: "fasting.types.ramadhan" },
      { id: "qadha", labelKey: "fasting.types.qadha" },
      { id: "kaffarah", labelKey: "fasting.types.kaffarah" },
      { id: "nadzar", labelKey: "fasting.types.nadzar" },
      { id: "seninkamis", labelKey: "fasting.types.seninkamis" },
      { id: "ayyamulbidh", labelKey: "fasting.types.ayyamulbidh" },
      { id: "arafah", labelKey: "fasting.types.arafah" },
      { id: "asyura", labelKey: "fasting.types.asyura" },
      { id: "syawal", labelKey: "fasting.types.syawal" },
      { id: "daud", labelKey: "fasting.types.daud" },
    ],
  },
  "Baca Quran": {
    field: "quranUnit",
    items: [
      { id: "ayat", labelKey: "quran.units.ayat" },
      { id: "halaman", labelKey: "quran.units.halaman" },
      { id: "surat", labelKey: "quran.units.surat" },
      { id: "juz", labelKey: "quran.units.juz" },
    ],
  },
  "Shodaqoh": {
    field: "sedekahType",
    items: [
      { id: "uang", labelKey: "sedekah.types.uang" },
      { id: "hitungan", labelKey: "sedekah.types.hitungan" },
    ],
  },
};

export default function DeedHistoryPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { t } = useTranslation();
  const { data: deeds, isLoading: deedsLoading } = useDeeds();
  const { data: categories } = useCategories();
  const translateCategoryName = useCategoryName();
  const { data: customDzikirTypes = [] } = useCustomDzikirTypes();
  const translateDzikirType = useDzikirTypeName();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const selectedCategory = params.get("category") || "all";
  const selectedSubcategory = params.get("subcategory") || "all";
  const startDate = params.get("startDate") || "";
  const endDate = params.get("endDate") || "";

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    const qs = next.toString();
    navigate(qs ? `/deeds?${qs}` : "/deeds", { replace: true });
  };

  const subcategoryOptions = useMemo(() => {
    if (selectedCategory === "all") return null;
    const normalized = normalizeCategoryForSubcategory(selectedCategory);
    const base = SUBCATEGORY_MAP[normalized];
    if (!base) return null;
    if (normalized === "Dzikir" && customDzikirTypes.length > 0) {
      return {
        ...base,
        items: [
          ...base.items,
          ...customDzikirTypes.map((ct) => ({ id: ct.label, labelKey: ct.label, isCustom: true })),
        ],
      };
    }
    return base;
  }, [selectedCategory, customDzikirTypes]);

  const filteredDeeds = useMemo(() => {
    if (!deeds) return [];

    return deeds.filter((deed) => {
      if (selectedCategory !== "all" && deed.category !== selectedCategory) {
        return false;
      }

      if (selectedSubcategory !== "all" && subcategoryOptions) {
        const fieldValue = deed[subcategoryOptions.field];
        if (fieldValue !== selectedSubcategory) {
          return false;
        }
      }

      if (startDate || endDate) {
        const deedDate = deed.createdAt ? new Date(deed.createdAt) : new Date();
        if (startDate && endDate) {
          const start = startOfDay(new Date(startDate));
          const end = endOfDay(new Date(endDate));
          const intervalStart = start <= end ? start : end;
          const intervalEnd = start <= end ? end : start;
          if (!isWithinInterval(deedDate, { start: intervalStart, end: intervalEnd })) {
            return false;
          }
        } else if (startDate) {
          if (deedDate < startOfDay(new Date(startDate))) {
            return false;
          }
        } else if (endDate) {
          if (deedDate > endOfDay(new Date(endDate))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [deeds, selectedCategory, selectedSubcategory, startDate, endDate, subcategoryOptions]);

  const totalFilteredPoints = useMemo(() => {
    return filteredDeeds.reduce((acc, d) => acc + d.points, 0);
  }, [filteredDeeds]);

  const hasActiveFilters = selectedCategory !== "all" || selectedSubcategory !== "all" || startDate || endDate;

  const clearFilters = () => {
    navigate("/deeds", { replace: true });
  };

  const handleCategoryChange = (value: string) => {
    updateParams({ category: value, subcategory: "all" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-xl"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold font-display text-foreground" data-testid="text-page-title">
                {t('deedHistory.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('deedHistory.subtitle')}
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3 mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('common.filter')}</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-clear-filters"
              >
                <X className="w-3 h-3 mr-1" />
                {t('deedHistory.clearFilters')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t('deed.category')}
              </label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="bg-card border-border" data-testid="select-category">
                  <SelectValue placeholder={t('common.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-category-all">{t('common.allCategories')}</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} data-testid={`option-category-${cat.id}`}>
                      {translateCategoryName(cat.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t('deedHistory.subcategory')}
              </label>
              <Select
                value={selectedSubcategory}
                onValueChange={(value) => updateParams({ subcategory: value })}
                disabled={!subcategoryOptions}
              >
                <SelectTrigger className="bg-card border-border" data-testid="select-subcategory">
                  <SelectValue placeholder={t('common.allSubCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-subcategory-all">{t('common.allSubCategories')}</SelectItem>
                  {subcategoryOptions?.items.map((item) => {
                    const isDzikirCategory = normalizeCategoryForSubcategory(selectedCategory) === "Dzikir";
                    const label = isDzikirCategory
                      ? translateDzikirType(item.id)
                      : t(item.labelKey);
                    return (
                      <SelectItem key={item.id} value={item.id} data-testid={`option-subcategory-${item.id}`}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t('deedHistory.startDate')}
              </label>
              <DatePickerButton
                value={startDate}
                onChange={(v) => updateParams({ startDate: v })}
                placeholder={t('deedHistory.selectDate')}
                testId="input-start-date"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t('deedHistory.endDate')}
              </label>
              <DatePickerButton
                value={endDate}
                onChange={(v) => updateParams({ endDate: v })}
                placeholder={t('deedHistory.selectDate')}
                testId="input-end-date"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 border border-emerald-500/20 mb-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">{t('deedHistory.resultsCount')}</p>
              <p className="text-2xl font-bold font-display text-foreground" data-testid="text-filtered-count">
                {formatNumber(filteredDeeds.length)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('stats.totalPoints')}</p>
              <p className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400" data-testid="text-filtered-points">
                {formatNumber(totalFilteredPoints)}
              </p>
            </div>
          </div>
        </motion.div>

        {deedsLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : filteredDeeds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium" data-testid="text-no-results">
              {t('deedHistory.noResults')}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {t('deedHistory.tryDifferentFilters')}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3" data-testid="deed-list">
            {filteredDeeds.map((deed, index) => (
              <DeedCard key={deed.id} deed={deed} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
