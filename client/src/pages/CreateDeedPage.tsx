import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCategories, useCategoryName } from "@/hooks/use-categories";
import { insertDeedSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar, Clock, X, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { CreateCategoryDialog } from "@/components/CreateCategoryDialog";

const formSchema = insertDeedSchema.extend({
  points: z.coerce.number().min(1, "Points must be at least 1"),
  createdAt: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function getCurrentDateTime() {
  const now = new Date();
  // Use local timezone for both date and time (user's perspective)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

export default function CreateDeedPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { mutate, isPending } = useCreateDeed();
  const { data: categories = [] } = useCategories();
  const translateCategoryName = useCategoryName();
  const [dateTime, setDateTime] = useState(getCurrentDateTime());
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      category: "",
      points: 1,
      createdAt: undefined,
      dzikirType: undefined,
      sholatType: undefined,
      fastingType: undefined,
      isJamaah: undefined,
      quranUnit: undefined,
      sedekahType: undefined,
      customUnit: undefined,
    },
  });

  const watchedCategory = form.watch("category");
  const isDzikirCategory = watchedCategory?.toLowerCase() === "dzikir" || watchedCategory?.toLowerCase() === "dzikr";
  const isSholatFardhuCategory = watchedCategory?.toLowerCase() === "sholat fardhu";
  const isSholatSunnahCategory = watchedCategory?.toLowerCase() === "sholat sunnah";
  const isSholatCategory = isSholatFardhuCategory || isSholatSunnahCategory;
  const isFastingFardhuCategory = watchedCategory?.toLowerCase() === "fasting fardhu" || watchedCategory?.toLowerCase() === "puasa fardhu";
  const isFastingSunnahCategory = watchedCategory?.toLowerCase() === "fasting sunnah" || watchedCategory?.toLowerCase() === "puasa sunnah";
  const isFastingCategory = isFastingFardhuCategory || isFastingSunnahCategory;
  const isQuranCategory = watchedCategory?.toLowerCase() === "baca quran" || watchedCategory?.toLowerCase() === "quran";
  const isSedekahCategory = watchedCategory?.toLowerCase() === "shodaqoh" || watchedCategory?.toLowerCase() === "sedekah" || watchedCategory?.toLowerCase() === "sodaqoh";
  
  const isBuiltInCategory = isDzikirCategory || isSholatCategory || isFastingCategory || isQuranCategory || isSedekahCategory;
  const isCustomCategory = watchedCategory && !isBuiltInCategory;
  
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
  ];

  const FASTING_FARDHU_TYPES = [
    { id: "ramadhan", labelKey: "fasting.types.ramadhan" },
    { id: "qadha", labelKey: "fasting.types.qadha" },
    { id: "kaffarah", labelKey: "fasting.types.kaffarah" },
    { id: "nadzar", labelKey: "fasting.types.nadzar" },
  ];

  const FASTING_SUNNAH_TYPES = [
    { id: "seninkamis", labelKey: "fasting.types.seninkamis" },
    { id: "ayyamulbidh", labelKey: "fasting.types.ayyamulbidh" },
    { id: "arafah", labelKey: "fasting.types.arafah" },
    { id: "asyura", labelKey: "fasting.types.asyura" },
    { id: "syawal", labelKey: "fasting.types.syawal" },
    { id: "daud", labelKey: "fasting.types.daud" },
  ];

  const currentSholatTypes = isSholatFardhuCategory ? SHOLAT_FARDHU_TYPES : SHOLAT_SUNNAH_TYPES;
  const currentFastingTypes = isFastingFardhuCategory ? FASTING_FARDHU_TYPES : FASTING_SUNNAH_TYPES;

  useEffect(() => {
    if (categories.length > 0 && !form.getValues("category")) {
      form.setValue("category", categories[0].name);
    }
  }, [categories, form]);
  
  useEffect(() => {
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
    if (!isCustomCategory) {
      form.setValue("customUnit", undefined);
    }
  }, [watchedCategory, isDzikirCategory, isSholatCategory, isFastingCategory, isQuranCategory, isSedekahCategory, isCustomCategory, form]);

  const onSubmit = (data: FormValues) => {
    let createdAt = data.createdAt;
    if (dateTime.date && dateTime.time) {
      // Create date in local timezone (user's perspective)
      const combinedDateTime = new Date(`${dateTime.date}T${dateTime.time}:00`);
      if (!isNaN(combinedDateTime.getTime())) {
        createdAt = combinedDateTime;
      }
    }

    mutate({ ...data, createdAt }, {
      onSuccess: () => {
        form.reset();
        setDateTime(getCurrentDateTime());
        navigate("/");
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">{t("createDeed.title")}</h1>
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-close-deed-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-12">
        <p className="text-muted-foreground mb-8">
          {t("createDeed.subtitle")}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createDeed.categoryLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="glass-input" data-testid="select-deed-category">
                        <SelectValue placeholder={t("createDeed.categoryPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{translateCategoryName(cat.name)}</SelectItem>
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
                          data-testid="button-create-category-from-dropdown"
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
                        <SelectTrigger className="glass-input" data-testid="select-deed-dzikir-type">
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
                        <SelectTrigger className="glass-input" data-testid="select-deed-sholat-type">
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
                        <SelectTrigger className="glass-input" data-testid="select-deed-fasting-type">
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input" data-testid="select-deed-sedekah-type">
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
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createDeed.pointsLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="glass-input"
                      {...field}
                      data-testid="input-deed-points"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <SelectTrigger className="glass-input" data-testid="select-deed-custom-unit">
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input" data-testid="select-deed-quran-unit">
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
                        data-testid="checkbox-deed-jamaah"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">{t("sholat.isJamaah")}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createDeed.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("createDeed.descriptionPlaceholder")}
                      className="glass-input"
                      {...field}
                      data-testid="input-deed-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">{t("createDeed.dateTimeSection")}</p>
              <div className="flex gap-6">
                <div className="space-y-2 min-w-0">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t("createDeed.dateLabel")}
                  </label>
                  <Input
                    type="date"
                    value={dateTime.date}
                    onChange={(e) => setDateTime({ ...dateTime, date: e.target.value })}
                    className="glass-input min-w-0"
                    data-testid="input-deed-date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("createDeed.timeLabel")}
                  </label>
                  <Input
                    type="time"
                    value={dateTime.time}
                    onChange={(e) => setDateTime({ ...dateTime, time: e.target.value })}
                    className="glass-input"
                    data-testid="input-deed-time"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 py-2 text-base"
                data-testid="button-cancel-deed"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 text-base shadow-lg shadow-emerald-500/20"
                data-testid="button-submit-deed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("createDeed.saving")}
                  </>
                ) : (
                  t("createDeed.saveDeed")
                )}
              </Button>
            </div>
          </form>
        </Form>

        <CreateCategoryDialog
          open={showCreateCategoryDialog}
          onOpenChange={setShowCreateCategoryDialog}
          onCategoryCreated={(categoryName) => {
            form.setValue("category", categoryName);
          }}
        />
      </main>
    </div>
  );
}
