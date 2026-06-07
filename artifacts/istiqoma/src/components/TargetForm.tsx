import { useState, useEffect } from "react";
import { useCategories, useCategoryName } from "@/hooks/use-categories";
import { useCustomDzikirTypes } from "@/hooks/use-dzikir-types";
import { resolveDzikirTypeLabel } from "@/lib/targets";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTargetSchema, type InsertTarget, type TargetWithProgress } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CalendarIcon, Plus, X, Bell } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { CreateCategoryDialog } from "@/components/CreateCategoryDialog";

interface TargetFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<InsertTarget>;
  editingTarget?: TargetWithProgress | null;
  onSubmit: (data: InsertTarget) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  beforeActions?: React.ReactNode;
}

export function TargetForm({
  mode,
  defaultValues,
  editingTarget,
  onSubmit,
  onCancel,
  isSubmitting,
  beforeActions,
}: TargetFormProps) {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const translateCategoryName = useCategoryName();
  const { data: customDzikirTypes = [] } = useCustomDzikirTypes();
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [targetValueInput, setTargetValueInput] = useState<string>(
    String(editingTarget?.targetValue ?? defaultValues?.targetValue ?? 10),
  );

  const form = useForm<InsertTarget>({
    resolver: zodResolver(insertTargetSchema) as unknown as Resolver<InsertTarget>,
    defaultValues: defaultValues || {
      name: "",
      category: "",
      targetValue: 10,
      period: "daily",
      targetType: "achievement",
      recurrence: "recurring",
      startDate: undefined,
      dueDate: undefined,
      unitLabel: undefined,
      dzikirType: undefined,
      sholatType: undefined,
      fastingType: undefined,
      isJamaah: undefined,
      quranUnit: undefined,
      sedekahType: undefined,
      customUnit: undefined,
      notificationTimes: [],
      intentionWhen: "",
      intentionWhere: "",
    },
  });

  useEffect(() => {
    if (editingTarget) {
      form.reset({
        name: editingTarget.name || undefined,
        category: editingTarget.category,
        targetValue: editingTarget.targetValue,
        period: editingTarget.period as "daily" | "weekly" | "monthly" | undefined,
        targetType: "achievement",
        recurrence: (editingTarget.recurrence as "recurring" | "oneTime") || "recurring",
        startDate: editingTarget.startDate ? new Date(editingTarget.startDate) : undefined,
        dueDate: editingTarget.dueDate ? new Date(editingTarget.dueDate) : undefined,
        unitLabel: editingTarget.unitLabel || undefined,
        dzikirType: editingTarget.dzikirType || undefined,
        sholatType: editingTarget.sholatType || undefined,
        fastingType: editingTarget.fastingType || undefined,
        isJamaah: editingTarget.isJamaah || undefined,
        quranUnit: (editingTarget.quranUnit as "ayat" | "halaman" | "surat" | "juz" | undefined) || undefined,
        sedekahType: (editingTarget.sedekahType as "uang" | "hitungan" | undefined) || undefined,
        customUnit: (editingTarget.customUnit as "hitungan" | "ayat" | "halaman" | "surat" | "juz" | "rakaat" | "hari" | "uang" | "times" | "days" | undefined) || undefined,
        notificationTimes: editingTarget.notificationTimes || [],
        intentionWhen: editingTarget.intentionWhen || "",
        intentionWhere: editingTarget.intentionWhere || "",
      });
      setTargetValueInput(String(editingTarget.targetValue));
    }
  }, [editingTarget, form]);

  const watchedCategory = form.watch("category");
  const watchedRecurrence = form.watch("recurrence");

  const isDzikirCategory = watchedCategory?.toLowerCase() === "dzikir" || watchedCategory?.toLowerCase() === "dzikr";
  const isSholatFardhuCategory = watchedCategory?.toLowerCase() === "sholat fardhu";
  const isSholatSunnahCategory = watchedCategory?.toLowerCase() === "sholat sunnah";
  const isSholatCategory = isSholatFardhuCategory || isSholatSunnahCategory;
  const isFastingCategory = watchedCategory?.toLowerCase() === "puasa" || watchedCategory?.toLowerCase() === "fasting" || watchedCategory?.toLowerCase() === "fasting fardhu" || watchedCategory?.toLowerCase() === "puasa fardhu" || watchedCategory?.toLowerCase() === "fasting sunnah" || watchedCategory?.toLowerCase() === "puasa sunnah";
  const isQuranCategory = watchedCategory?.toLowerCase() === "baca quran" || watchedCategory?.toLowerCase() === "quran";
  const isSedekahCategory = watchedCategory?.toLowerCase() === "shodaqoh" || watchedCategory?.toLowerCase() === "sedekah" || watchedCategory?.toLowerCase() === "sodaqoh";

  const isBuiltInCategory = isDzikirCategory || isSholatCategory || isFastingCategory || isQuranCategory || isSedekahCategory;
  const isCustomCategory = watchedCategory && !isBuiltInCategory;

  useEffect(() => {
    if (isSholatCategory) {
      if (!form.getValues("customUnit")) form.setValue("customUnit", "times");
    } else if (isFastingCategory) {
      form.setValue("customUnit", "days");
    } else if (isDzikirCategory) {
      form.setValue("customUnit", "times");
    } else if (!isCustomCategory) {
      form.setValue("customUnit", undefined);
    }
  }, [watchedCategory, isDzikirCategory, isSholatCategory, isFastingCategory, isCustomCategory, form]);

  const CUSTOM_UNITS = [
    { id: "hitungan", labelKey: "customUnit.units.hitungan" },
    { id: "ayat", labelKey: "customUnit.units.ayat" },
    { id: "halaman", labelKey: "customUnit.units.halaman" },
    { id: "surat", labelKey: "customUnit.units.surat" },
    { id: "juz", labelKey: "customUnit.units.juz" },
    { id: "rakaat", labelKey: "customUnit.units.rakaat" },
    { id: "hari", labelKey: "customUnit.units.hari" },
    { id: "uang", labelKey: "customUnit.units.uang" },
  ];

  const DZIKIR_TYPES = [
    { id: "subhanallah", labelKey: "dzikir.types.subhanallah" },
    { id: "alhamdulillah", labelKey: "dzikir.types.alhamdulillah" },
    { id: "allahuakbar", labelKey: "dzikir.types.allahuakbar" },
    { id: "lailahaillallah", labelKey: "dzikir.types.lailahaillallah" },
    { id: "istighfar", labelKey: "dzikir.types.istighfar" },
  ];

  const SHOLAT_FARDHU_TYPES = [
    { id: "subuh", labelKey: "sholat.types.subuh" },
    { id: "dzuhur", labelKey: "sholat.types.dzuhur" },
    { id: "ashar", labelKey: "sholat.types.ashar" },
    { id: "maghrib", labelKey: "sholat.types.maghrib" },
    { id: "isya", labelKey: "sholat.types.isya" },
    { id: "jumat", labelKey: "sholat.types.jumat" },
  ];

  const SHOLAT_SUNNAH_TYPES = [
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
  ];

  const FASTING_TYPES = [
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
  ];

  const QURAN_UNITS = [
    { id: "ayat", labelKey: "quran.units.ayat" },
    { id: "halaman", labelKey: "quran.units.halaman" },
    { id: "surat", labelKey: "quran.units.surat" },
    { id: "juz", labelKey: "quran.units.juz" },
  ];

  const SEDEKAH_TYPES = [
    { id: "uang", labelKey: "sedekah.types.uang" },
    { id: "hitungan", labelKey: "sedekah.types.hitungan" },
  ];

  const SHOLAT_UNITS = [
    { id: "times", labelKey: "sholat.units.times" },
    { id: "rakaat", labelKey: "sholat.units.rakaat" },
  ];

  const FASTING_UNITS = [
    { id: "days", labelKey: "fasting.units.days" },
  ];

  const DZIKIR_UNITS = [
    { id: "times", labelKey: "dzikir.units.times" },
  ];

  const currentSholatTypes = isSholatFardhuCategory ? SHOLAT_FARDHU_TYPES : SHOLAT_SUNNAH_TYPES;
  const currentFastingTypes = FASTING_TYPES;

  const handleDurationSelect = (duration: string) => {
    setSelectedDuration(duration);
    const now = new Date();
    let dueDate: Date;

    switch (duration) {
      case "1day":
        dueDate = addDays(now, 1);
        break;
      case "1week":
        dueDate = addWeeks(now, 1);
        break;
      case "1month":
        dueDate = addMonths(now, 1);
        break;
      case "3months":
        dueDate = addMonths(now, 3);
        break;
      default:
        return;
    }

    form.setValue("startDate", now);
    form.setValue("dueDate", dueDate);
  };

  const handleFormSubmit = async (data: InsertTarget) => {
    await onSubmit(data);
  };

  const availableCategories = categories?.filter(c => c.name !== "Istighfar" && c.name !== "Maksiat") || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="recurrence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.recurrenceType")}</FormLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={field.value === "recurring" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    field.onChange("recurring");
                    form.setValue("startDate", undefined);
                    form.setValue("dueDate", undefined);
                    setSelectedDuration(null);
                  }}
                  data-testid="button-recurrence-recurring"
                >
                  {t("targets.recurring")}
                </Button>
                <Button
                  type="button"
                  variant={field.value === "oneTime" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    field.onChange("oneTime");
                    form.setValue("period", undefined);
                  }}
                  data-testid="button-recurrence-onetime"
                >
                  {t("targets.oneTime")}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.targetName")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("targets.targetNamePlaceholder")}
                  className="glass-input"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-target-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("deed.category")}</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  if (!isDzikirCategory) {
                    form.setValue("dzikirType", undefined);
                  }
                  if (!isSholatCategory) {
                    form.setValue("sholatType", undefined);
                    form.setValue("isJamaah", undefined);
                  }
                  if (!isFastingCategory) {
                    form.setValue("fastingType", undefined);
                  }
                  if (!isQuranCategory) {
                    form.setValue("quranUnit", undefined);
                  }
                  if (!isSedekahCategory) {
                    form.setValue("sedekahType", undefined);
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="glass-input" data-testid="select-target-category">
                    <SelectValue placeholder={t("targets.selectCategory")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {translateCategoryName(cat.name)}
                    </SelectItem>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCreateCategoryDialog(true);
                      }}
                      data-testid="button-create-category-from-target-dropdown"
                    >
                      <Plus className="w-4 h-4" />
                      {t("categories.addCategory")}
                    </button>
                  </div>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isDzikirCategory && (
          <FormField
            control={form.control}
            name="dzikirType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("dzikir.selectType")}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "__any__" ? undefined : value)}
                  value={field.value || "__any__"}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-dzikir-type">
                      <SelectValue placeholder={t("dzikir.selectType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="__any__">{t("dzikir.anyType")}</SelectItem>
                    {DZIKIR_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                    {customDzikirTypes.map((type) => (
                      <SelectItem key={`custom-${type.id}`} value={type.label}>
                        {resolveDzikirTypeLabel(type.label, t, customDzikirTypes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isSholatCategory && (
          <FormField
            control={form.control}
            name="sholatType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("sholat.selectType")}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "__any__" ? undefined : value)}
                  value={field.value || "__any__"}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-sholat-type">
                      <SelectValue placeholder={t("sholat.selectType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="__any__">{t("sholat.anyType")}</SelectItem>
                    {currentSholatTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isFastingCategory && (
          <FormField
            control={form.control}
            name="fastingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fasting.selectType")}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "__any__" ? undefined : value)}
                  value={field.value || "__any__"}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-fasting-type">
                      <SelectValue placeholder={t("fasting.selectType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="__any__">{t("fasting.anyType")}</SelectItem>
                    {currentFastingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isSedekahCategory && (
          <FormField
            control={form.control}
            name="sedekahType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("sedekah.selectType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-sedekah-type">
                      <SelectValue placeholder={t("sedekah.selectType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {SEDEKAH_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="targetValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.targetValue")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  className="glass-input"
                  {...field}
                  value={targetValueInput}
                  onChange={(e) => {
                    setTargetValueInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      field.onChange(val);
                    }
                  }}
                  data-testid="input-target-value"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isSholatCategory && (
          <FormField
            control={form.control}
            name="customUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("sholat.selectUnit")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || "times"}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-sholat-unit">
                      <SelectValue placeholder={t("sholat.selectUnit")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {SHOLAT_UNITS.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {t(unit.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isFastingCategory && (
          <FormField
            control={form.control}
            name="customUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fasting.selectUnit")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || "days"}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-fasting-unit">
                      <SelectValue placeholder={t("fasting.selectUnit")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {FASTING_UNITS.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {t(unit.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isDzikirCategory && (
          <FormField
            control={form.control}
            name="customUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("dzikir.selectUnit")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || "times"}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-dzikir-unit">
                      <SelectValue placeholder={t("dzikir.selectUnit")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {DZIKIR_UNITS.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {t(unit.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isCustomCategory && (
          <FormField
            control={form.control}
            name="customUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("customUnit.selectUnit")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-custom-unit">
                      <SelectValue placeholder={t("customUnit.selectUnit")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {CUSTOM_UNITS.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {t(unit.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isQuranCategory && (
          <FormField
            control={form.control}
            name="quranUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("quran.selectUnit")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-quran-unit">
                      <SelectValue placeholder={t("quran.selectUnit")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {QURAN_UNITS.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {t(unit.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isSholatCategory && (
          <FormField
            control={form.control}
            name="isJamaah"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-target-jamaah"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">{t("sholat.isJamaah")}</FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}

        {watchedRecurrence === "oneTime" && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t("targets.deadline")}</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Button
                  type="button"
                  variant={selectedDuration === "1day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDurationSelect("1day")}
                  data-testid="button-duration-1day"
                >
                  {t("targets.duration.1day")}
                </Button>
                <Button
                  type="button"
                  variant={selectedDuration === "1week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDurationSelect("1week")}
                  data-testid="button-duration-1week"
                >
                  {t("targets.duration.1week")}
                </Button>
                <Button
                  type="button"
                  variant={selectedDuration === "1month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDurationSelect("1month")}
                  data-testid="button-duration-1month"
                >
                  {t("targets.duration.1month")}
                </Button>
                <Button
                  type="button"
                  variant={selectedDuration === "3months" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDurationSelect("3months")}
                  data-testid="button-duration-3months"
                >
                  {t("targets.duration.3months")}
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("targets.customDeadline")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal glass-input",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-custom-deadline"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("targets.pickDate")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(date) => {
                          field.onChange(date);
                          setSelectedDuration(null);
                          if (!form.getValues("startDate")) {
                            form.setValue("startDate", new Date());
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {watchedRecurrence === "recurring" && (
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("targets.period")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "daily"}>
                  <FormControl>
                    <SelectTrigger className="glass-input" data-testid="select-target-period">
                      <SelectValue placeholder={t("targets.selectPeriod")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="daily">{t("targets.daily")}</SelectItem>
                    <SelectItem value="weekly">{t("targets.weekly")}</SelectItem>
                    <SelectItem value="monthly">{t("targets.monthly")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="intentionWhen"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.intentionWhenLabel")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("targets.intentionWhenPlaceholder")}
                  className="glass-input"
                  maxLength={120}
                  {...field}
                  value={field.value ?? ""}
                  data-testid="input-target-when"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="intentionWhere"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.intentionWhereLabel")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("targets.intentionWherePlaceholder")}
                  className="glass-input"
                  maxLength={120}
                  {...field}
                  value={field.value ?? ""}
                  data-testid="input-target-where"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t("targets.intentionHelper")}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notificationTimes"
          render={({ field }) => {
            const times = field.value || [];
            return (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <FormLabel>{t("targets.notificationTimes")}</FormLabel>
                </div>
                <p className="text-xs text-muted-foreground">{t("targets.notificationTimesDesc")}</p>
                <div className="space-y-2">
                  {times.map((time: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px]">
                        {t("targets.reminderTimeLabel", { number: index + 1 })}
                      </Label>
                      <Input
                        type="time"
                        value={time}
                        className="glass-input flex-1"
                        onChange={(e) => {
                          const newTimes = [...times];
                          newTimes[index] = e.target.value;
                          field.onChange(newTimes);
                        }}
                        data-testid={`input-reminder-time-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newTimes = times.filter((_: string, i: number) => i !== index);
                          field.onChange(newTimes);
                        }}
                        data-testid={`button-remove-reminder-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {times.length < 5 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        field.onChange([...times, "08:00"]);
                      }}
                      className="w-full"
                      data-testid="button-add-reminder-time"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("targets.addReminderTime")}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">{t("targets.maxReminders")}</p>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {beforeActions}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 py-2 text-base"
            data-testid="button-cancel-target"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
            data-testid="button-submit-target"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.saving")}
              </>
            ) : mode === "edit" ? (
              t("targets.updateTarget")
            ) : (
              t("targets.saveTarget")
            )}
          </Button>
        </div>
      </form>
      <CreateCategoryDialog
        open={showCreateCategoryDialog}
        onOpenChange={setShowCreateCategoryDialog}
        onCategoryCreated={(categoryName) => {
          form.setValue("category", categoryName);
        }}
      />
    </Form>
  );
}
