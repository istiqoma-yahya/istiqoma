import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { insertCommunityTargetSchema, type InsertCommunityTarget } from "@shared/schema";
import { useCategories } from "@/hooks/use-categories";

interface CommunityTargetFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<InsertCommunityTarget>;
  onSubmit: (data: InsertCommunityTarget) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CommunityTargetForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: CommunityTargetFormProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();

  const form = useForm<InsertCommunityTarget>({
    resolver: zodResolver(insertCommunityTargetSchema) as unknown as Resolver<InsertCommunityTarget>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      category: defaultValues?.category ?? "",
      targetValue: defaultValues?.targetValue ?? 1,
      period: defaultValues?.period ?? "daily",
      unitLabel: defaultValues?.unitLabel ?? "",
    },
  });

  const handleSubmit = (data: InsertCommunityTarget) => {
    const cleaned: InsertCommunityTarget = {
      ...data,
      unitLabel: data.unitLabel?.trim() ? data.unitLabel.trim() : null,
    };
    return onSubmit(cleaned);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.targetName")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("community.namePlaceholder")}
                  className="glass-input"
                  maxLength={120}
                  {...field}
                  value={field.value ?? ""}
                  data-testid="input-community-target-name"
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
              <FormLabel>{t("targets.selectCategory")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="glass-input" data-testid="select-community-category">
                    <SelectValue placeholder={t("targets.selectCategory")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  value={field.value ?? 1}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                  data-testid="input-community-target-value"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targets.period")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? "daily"}>
                <FormControl>
                  <SelectTrigger className="glass-input" data-testid="select-community-period">
                    <SelectValue placeholder={t("targets.selectPeriod")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">{t("targets.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("targets.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("targets.monthly")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unitLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("community.unitLabelOptional")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("community.unitPlaceholder")}
                  className="glass-input"
                  maxLength={40}
                  {...field}
                  value={field.value ?? ""}
                  data-testid="input-community-unit-label"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 py-2 text-base"
            data-testid="button-cancel-community-target"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
            data-testid="button-submit-community-target"
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
    </Form>
  );
}
