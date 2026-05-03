import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Q1_VALUES,
  Q2_VALUES,
  Q3_VALUES,
  Q4_VALUES,
  Q5_VALUES,
  Q4_TO_REMINDER_TIME,
  type UserOnboarding,
} from "@shared/schema";
import type { Q1, Q2, Q3, Q4, Q5 } from "@/lib/onboardingTypes";

const Q1_ICONS: Record<Q1, string> = {
  pemula: "🌱",
  "naik-turun": "🌊",
  "cukup-baik": "☀️",
  tingkatkan: "🚀",
};

const Q2_ICONS: Record<Q2, string> = {
  lupa: "😅",
  males: "😴",
  "tidak-tahu": "🤷",
  sibuk: "⏳",
};

const Q3_ICONS: Record<Q3, string> = {
  "baca-quran": "📖",
  dzikir: "📿",
  "sholat-fardhu": "🕌",
  "sholat-sunnah": "🌙",
  puasa: "🌅",
  "hafalan-quran": "🧠",
  "birrul-walidayn": "🤲",
  shodaqoh: "💛",
  "tolabul-ilmi": "📚",
};

const Q4_ICONS: Record<Q4, string> = {
  subuh: "🌅",
  ashar: "🌤️",
  isya: "🌙",
  tidur: "🌠",
};

const Q5_ICONS: Record<Q5, string> = {
  "dekat-allah": "🤲",
  bermanfaat: "🌟",
  berilmu: "📚",
  istiqomah: "🏔️",
  keluarga: "🏡",
};

type FormState = {
  q1: Q1 | "";
  q2: Q2 | "";
  q3: Q3[];
  q4: Q4 | "";
  q5: Q5 | "";
};

const EMPTY_FORM: FormState = {
  q1: "",
  q2: "",
  q3: [],
  q4: "",
  q5: "",
};

export default function OnboardingSettingsPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const {
    data: onboarding,
    isLoading: onboardingLoading,
  } = useQuery<UserOnboarding | null>({
    queryKey: ["/api/onboarding"],
    enabled: isAuthenticated,
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (onboarding && !hydrated) {
      setForm({
        q1: (onboarding.q1 as Q1) ?? "",
        q2: (onboarding.q2 as Q2) ?? "",
        q3: ((onboarding.q3 as Q3[]) ?? []).filter((v) =>
          (Q3_VALUES as readonly string[]).includes(v),
        ),
        q4: (onboarding.q4 as Q4) ?? "",
        q5: (onboarding.q5 as Q5) ?? "",
      });
      setHydrated(true);
    }
  }, [onboarding, hydrated]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormState) => {
      if (!values.q1 || !values.q2 || !values.q4 || !values.q5 || values.q3.length === 0) {
        throw new Error(t("onboardingSettings.incompleteError"));
      }
      const res = await apiRequest("POST", "/api/onboarding/complete", {
        q1: values.q1,
        q2: values.q2,
        q3: values.q3,
        q4: values.q4,
        q5: values.q5,
        identityKey: values.q5,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
      toast({ title: t("onboardingSettings.saveSuccess") });
    },
    onError: (err: Error) => {
      toast({
        title: t("onboardingSettings.saveError"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    saveMutation.mutate(form);
  };

  const identity = form.q5 || (onboarding?.q5 as Q5 | undefined) || null;
  const identityIcon = identity ? Q5_ICONS[identity] : "🌿";
  const identityName = identity
    ? t(`onboarding.identities.${identity}.name`)
    : t("onboarding.identityFallback.name");
  const identityDesc = identity
    ? t(`onboarding.identities.${identity}.desc`)
    : t("onboarding.identityFallback.desc");
  const identityTags = useMemo(() => {
    const baseTags = identity
      ? (t(`onboarding.identities.${identity}.tags`, { returnObjects: true }) as string[])
      : (t("onboarding.identityFallback.tags", { returnObjects: true }) as string[]);
    const contextTag = form.q1 ? t(`onboarding.contextTags.${form.q1}`) : null;
    return contextTag ? [...baseTags, contextTag] : [...baseTags];
  }, [identity, form.q1, t]);

  const reminderTimePreview = form.q4 ? Q4_TO_REMINDER_TIME[form.q4] : null;

  const isLoading = authLoading || (isAuthenticated && onboardingLoading);
  const hasChanges =
    onboarding != null &&
    (form.q1 !== ((onboarding.q1 as Q1) ?? "") ||
      form.q2 !== ((onboarding.q2 as Q2) ?? "") ||
      form.q4 !== ((onboarding.q4 as Q4) ?? "") ||
      form.q5 !== ((onboarding.q5 as Q5) ?? "") ||
      !sameStringSet(form.q3, ((onboarding.q3 as Q3[]) ?? [])));

  const canSave =
    !!form.q1 &&
    !!form.q2 &&
    !!form.q4 &&
    !!form.q5 &&
    form.q3.length > 0 &&
    hasChanges &&
    !saveMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1
            className="text-lg font-semibold"
            data-testid="text-onboarding-settings-title"
          >
            {t("onboardingSettings.title")}
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !onboarding ? (
          <Card className="p-6 text-center" data-testid="card-no-onboarding">
            <p className="text-sm text-muted-foreground">
              {t("onboardingSettings.notCompletedYet")}
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("/")}
              data-testid="button-start-onboarding"
            >
              {t("onboardingSettings.startOnboardingCta")}
            </Button>
          </Card>
        ) : (
          <>
            <Card
              className="p-5 border-emerald-500/30 bg-emerald-500/5"
              data-testid="card-identity-preview"
            >
              <p className="text-xs text-muted-foreground mb-1">
                {t("onboardingSettings.identityHeading")}
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="text-3xl"
                  data-testid="text-identity-icon"
                >
                  {identityIcon}
                </div>
                <div className="min-w-0">
                  <p
                    className="font-semibold leading-tight"
                    data-testid="text-identity-name"
                  >
                    {identityName}
                  </p>
                </div>
              </div>
              <p
                className="text-xs text-muted-foreground mt-3"
                data-testid="text-identity-desc"
              >
                {identityDesc}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {identityTags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    data-testid={`tag-identity-${i}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>

            <SingleChoiceQuestion
              qKey="q1"
              question={t("onboarding.q1.question")}
              hint={t("onboarding.q1.hint")}
              options={Q1_VALUES.map((v) => ({
                value: v,
                icon: Q1_ICONS[v],
                label: t(`onboarding.q1.options.${v}`),
              }))}
              value={form.q1 || undefined}
              onSelect={(v) => setForm((s) => ({ ...s, q1: v }))}
            />

            <SingleChoiceQuestion
              qKey="q2"
              question={t("onboarding.q2.question")}
              hint={t("onboarding.q2.hint")}
              options={Q2_VALUES.map((v) => ({
                value: v,
                icon: Q2_ICONS[v],
                label: t(`onboarding.q2.options.${v}`),
              }))}
              value={form.q2 || undefined}
              onSelect={(v) => setForm((s) => ({ ...s, q2: v }))}
            />

            <Card className="p-5">
              <p className="font-semibold text-sm mb-1" data-testid="text-q3-question">
                {t("onboarding.q3.question")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("onboarding.q3.hint")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Q3_VALUES.map((v) => {
                  const selected = form.q3.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setForm((s) => ({
                          ...s,
                          q3: selected ? s.q3.filter((x) => x !== v) : [...s.q3, v],
                        }))
                      }
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md border text-left text-sm transition-colors ${
                        selected
                          ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                          : "border-border hover:border-emerald-500/50 hover:bg-muted"
                      }`}
                      data-testid={`option-q3-${v}`}
                      aria-pressed={selected}
                    >
                      <span className="text-lg">{Q3_ICONS[v]}</span>
                      <span className="flex-1 min-w-0">
                        {t(`onboarding.q3.options.${v}`)}
                      </span>
                      {selected && (
                        <span className="text-emerald-500 text-sm">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p
                className="text-xs text-muted-foreground mt-3"
                data-testid="text-q3-count"
              >
                {form.q3.length === 0
                  ? t("onboarding.q3.empty")
                  : t("onboarding.q3.count", { count: form.q3.length })}
              </p>
            </Card>

            <SingleChoiceQuestion
              qKey="q4"
              question={t("onboarding.q4.question")}
              hint={t("onboarding.q4.hint")}
              options={Q4_VALUES.map((v) => ({
                value: v,
                icon: Q4_ICONS[v],
                label: t(`onboarding.q4.options.${v}`),
              }))}
              value={form.q4 || undefined}
              onSelect={(v) => setForm((s) => ({ ...s, q4: v }))}
              footer={
                reminderTimePreview ? (
                  <p
                    className="text-xs text-muted-foreground mt-3"
                    data-testid="text-reminder-preview"
                  >
                    {t("onboardingSettings.reminderPreview", {
                      time: reminderTimePreview,
                    })}
                  </p>
                ) : null
              }
            />

            <Card className="p-5">
              <p className="font-semibold text-sm mb-1" data-testid="text-q5-question">
                {t("onboarding.q5.question")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("onboarding.q5.hint")}
              </p>
              <div className="space-y-2">
                {Q5_VALUES.map((v) => {
                  const selected = form.q5 === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, q5: v }))}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-md border text-left transition-colors ${
                        selected
                          ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                          : "border-border hover:border-emerald-500/50 hover:bg-muted"
                      }`}
                      data-testid={`option-q5-${v}`}
                      aria-pressed={selected}
                    >
                      <span className="text-xl mt-0.5">{Q5_ICONS[v]}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium">
                          {t(`onboarding.q5.options.${v}.label`)}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {t(`onboarding.q5.options.${v}.sublabel`)}
                        </span>
                      </span>
                      {selected && (
                        <span className="text-emerald-500 text-sm mt-1">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-t border-border">
              <div className="flex items-center justify-end gap-3">
                {hasChanges && (
                  <p
                    className="text-xs text-muted-foreground"
                    data-testid="text-unsaved-changes"
                  >
                    {t("onboardingSettings.unsavedChanges")}
                  </p>
                )}
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSave}
                  data-testid="button-save-onboarding"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saveMutation.isPending
                    ? t("onboardingSettings.saving")
                    : t("onboardingSettings.saveButton")}
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SingleChoiceQuestion<T extends string>({
  qKey,
  question,
  hint,
  options,
  value,
  onSelect,
  footer,
}: {
  qKey: string;
  question: string;
  hint: string;
  options: { value: T; icon: string; label: string }[];
  value: T | undefined;
  onSelect: (v: T) => void;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <p
        className="font-semibold text-sm mb-1"
        data-testid={`text-${qKey}-question`}
      >
        {question}
      </p>
      <p className="text-xs text-muted-foreground mb-4">{hint}</p>
      <div className="space-y-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left text-sm transition-colors ${
                selected
                  ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                  : "border-border hover:border-emerald-500/50 hover:bg-muted"
              }`}
              data-testid={`option-${qKey}-${o.value}`}
              aria-pressed={selected}
            >
              <span className="text-lg">{o.icon}</span>
              <span className="flex-1 min-w-0">{o.label}</span>
              {selected && <span className="text-emerald-500 text-sm">✓</span>}
            </button>
          );
        })}
      </div>
      {footer}
    </Card>
  );
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const v of b) if (!setA.has(v)) return false;
  return true;
}
