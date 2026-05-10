import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { Q1, Q2, Q3, Q4, Q5 } from "@/lib/onboardingTypes";
import type { User } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import ConsentScreen from "@/components/ConsentScreen";
import "./onboarding.css";

type Answers = {
  q1?: Q1;
  q2?: Q2;
  q3: Q3[];
  q4?: Q4;
  q5?: Q5;
};

const SCREEN_KEYS = ["consent", "s0", "s1", "s2", "q1", "q2", "q3", "q4", "q5", "result"] as const;
type ScreenKey = (typeof SCREEN_KEYS)[number];

const Q1_OPTIONS: { value: Q1; iconKey: string }[] = [
  { value: "pemula", iconKey: "🌱" },
  { value: "naik-turun", iconKey: "🌊" },
  { value: "cukup-baik", iconKey: "☀️" },
  { value: "tingkatkan", iconKey: "🚀" },
];

const Q2_OPTIONS: { value: Q2; iconKey: string }[] = [
  { value: "lupa", iconKey: "😅" },
  { value: "males", iconKey: "😴" },
  { value: "tidak-tahu", iconKey: "🤷" },
  { value: "sibuk", iconKey: "⏳" },
];

const Q3_OPTIONS: { value: Q3; iconKey: string; full?: boolean }[] = [
  { value: "baca-quran", iconKey: "📖" },
  { value: "dzikir", iconKey: "📿" },
  { value: "sholat-fardhu", iconKey: "🕌" },
  { value: "sholat-sunnah", iconKey: "🌙" },
  { value: "puasa", iconKey: "🌅" },
  { value: "hafalan-quran", iconKey: "🧠" },
  { value: "birrul-walidayn", iconKey: "🤲" },
  { value: "shodaqoh", iconKey: "💛" },
  { value: "tolabul-ilmi", iconKey: "📚", full: true },
];

const Q4_OPTIONS: { value: Q4; iconKey: string }[] = [
  { value: "subuh", iconKey: "🌅" },
  { value: "ashar", iconKey: "🌤️" },
  { value: "isya", iconKey: "🌙" },
  { value: "tidur", iconKey: "🌠" },
];

const Q5_OPTIONS: { value: Q5; iconKey: string }[] = [
  { value: "dekat-allah", iconKey: "🤲" },
  { value: "bermanfaat", iconKey: "🌟" },
  { value: "berilmu", iconKey: "📚" },
  { value: "istiqomah", iconKey: "🏔️" },
  { value: "keluarga", iconKey: "🏡" },
];

const Q5_ICONS: Record<Q5, string> = {
  "dekat-allah": "🤲",
  bermanfaat: "🌟",
  berilmu: "📚",
  istiqomah: "🏔️",
  keluarga: "🏡",
};

export default function OnboardingFlow() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ q3: [] });

  const screen = SCREEN_KEYS[index];
  const total = SCREEN_KEYS.length;
  const progressPct = (index / (total - 1)) * 100;

  const stepLabel = useMemo(() => {
    if (index === 0) return "";
    if (index === 1) return "";
    if (index <= 3) return t("onboarding.intro");
    if (index <= 8) return t("onboarding.quizCount", { current: index - 3, total: 5 });
    return t("onboarding.done");
  }, [index, t]);

  const showBack = index > 1 && index < total - 1;

  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));
  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!answers.q1 || !answers.q2 || !answers.q4 || !answers.q5 || answers.q3.length === 0) {
        throw new Error("Incomplete answers");
      }
      return apiRequest("POST", "/api/onboarding/complete", {
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4,
        q5: answers.q5,
        identityKey: answers.q5,
      });
    },
    onSuccess: async () => {
      queryClient.setQueryData<User | null>(["/api/auth/user"], (prev) =>
        prev ? { ...prev, onboardingComplete: true } : prev,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] }),
      ]);
    },
  });

  const handleFinish = () => {
    completeMutation.mutate();
  };

  // Touch swipe back support
  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 70 && diff < 0 && index > 1 && index < total - 1) {
        goBack();
      }
    };
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [index, total]);

  const identity = answers.q5 ? answers.q5 : null;
  const resultIcon = identity ? Q5_ICONS[identity] : "🌿";
  const resultName = identity
    ? t(`onboarding.identities.${identity}.name`)
    : t("onboarding.identityFallback.name");
  const resultDesc = identity
    ? t(`onboarding.identities.${identity}.desc`)
    : t("onboarding.identityFallback.desc");
  const baseTags = identity
    ? (t(`onboarding.identities.${identity}.tags`, { returnObjects: true }) as string[])
    : (t("onboarding.identityFallback.tags", { returnObjects: true }) as string[]);
  const contextTag = answers.q1 ? t(`onboarding.contextTags.${answers.q1}`) : null;
  const tags = contextTag ? [...baseTags, contextTag] : [...baseTags];

  if (screen === "consent") {
    return (
      <div className="onboarding-root" data-testid="onboarding-flow">
        <div className="ob-glow-tl" />
        <div className="ob-glow-br" />
        <div className="ob-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ConsentScreen onConfirmed={goNext} onRefused={() => logout()} />
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-root" data-testid="onboarding-flow">
      <div className="ob-glow-tl" />
      <div className="ob-glow-br" />

      <div className="ob-progress-bar">
        <div className="ob-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="ob-step-label" data-testid="text-onboarding-step">
        {stepLabel}
      </div>

      {showBack && (
        <button
          type="button"
          className="ob-back-btn"
          onClick={goBack}
          data-testid="button-onboarding-back"
        >
          ← {t("onboarding.back")}
        </button>
      )}

      <div className="ob-app">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            className="ob-screen"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            {screen === "s0" && (
              <div className="ob-center">
                <div className="ob-logo-mark">🕌</div>
                <p className="ob-app-title">إستقامة</p>
                <p className="ob-app-tagline">{t("onboarding.splashTagline")}</p>
                <div className="ob-divider" />
                <span className="ob-bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</span>
                <p className="ob-subtext" style={{ fontSize: "0.8rem" }}>
                  {t("onboarding.bismillahMeaning")}
                </p>
                <button
                  className="ob-btn-main"
                  onClick={goNext}
                  data-testid="button-onboarding-start"
                >
                  {t("onboarding.start")} →
                </button>
              </div>
            )}

            {screen === "s1" && (
              <div className="ob-center">
                <p className="ob-eyebrow">{t("onboarding.s1.eyebrow")}</p>
                <h2
                  className="ob-headline"
                  dangerouslySetInnerHTML={{ __html: t("onboarding.s1.headline") }}
                />
                <p className="ob-subtext">{t("onboarding.s1.subtext")}</p>
                <div className="ob-feature-list">
                  {(["a", "b", "c"] as const).map((k) => (
                    <div key={k} className="ob-feature-item">
                      <div className="ob-fi-icon">{t(`onboarding.s1.features.${k}.icon`)}</div>
                      <div className="ob-fi-text">
                        <h4>{t(`onboarding.s1.features.${k}.title`)}</h4>
                        <p>{t(`onboarding.s1.features.${k}.desc`)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="ob-btn-main"
                  onClick={goNext}
                  data-testid="button-onboarding-next-s1"
                >
                  {t("onboarding.next")} →
                </button>
              </div>
            )}

            {screen === "s2" && (
              <div className="ob-center">
                <p className="ob-eyebrow">{t("onboarding.s2.eyebrow")}</p>
                <h2
                  className="ob-headline"
                  dangerouslySetInnerHTML={{ __html: t("onboarding.s2.headline") }}
                />
                <div className="ob-benefit-grid">
                  {(["a", "b", "c", "d"] as const).map((k) => (
                    <div key={k} className="ob-benefit-card">
                      <div className="ob-benefit-icon">
                        {t(`onboarding.s2.benefits.${k}.icon`)}
                      </div>
                      <h4>{t(`onboarding.s2.benefits.${k}.title`)}</h4>
                      <p>{t(`onboarding.s2.benefits.${k}.desc`)}</p>
                    </div>
                  ))}
                </div>
                <div className="ob-hadith-box">
                  <p className="ob-hadith-arabic">
                    إِنَّ أَحَبَّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا
                  </p>
                  <p className="ob-hadith-text">{t("onboarding.s2.hadithText")}</p>
                  <p className="ob-hadith-source">{t("onboarding.s2.hadithSource")}</p>
                </div>
                <button
                  className="ob-btn-main"
                  onClick={goNext}
                  data-testid="button-onboarding-start-quiz"
                >
                  {t("onboarding.startQuiz")} →
                </button>
              </div>
            )}

            {screen === "q1" && (
              <SingleChoiceQuiz
                qKey="q1"
                question={t("onboarding.q1.question")}
                hint={t("onboarding.q1.hint")}
                options={Q1_OPTIONS.map((o) => ({
                  ...o,
                  label: t(`onboarding.q1.options.${o.value}`),
                }))}
                value={answers.q1}
                onSelect={(v) => setAnswers((a) => ({ ...a, q1: v as Q1 }))}
                onNext={goNext}
                stepLabel={t("onboarding.quizCount", { current: 1, total: 5 })}
                nextLabel={t("onboarding.next")}
              />
            )}

            {screen === "q2" && (
              <SingleChoiceQuiz
                qKey="q2"
                question={t("onboarding.q2.question")}
                hint={t("onboarding.q2.hint")}
                options={Q2_OPTIONS.map((o) => ({
                  ...o,
                  label: t(`onboarding.q2.options.${o.value}`),
                }))}
                value={answers.q2}
                onSelect={(v) => setAnswers((a) => ({ ...a, q2: v as Q2 }))}
                onNext={goNext}
                stepLabel={t("onboarding.quizCount", { current: 2, total: 5 })}
                nextLabel={t("onboarding.next")}
              />
            )}

            {screen === "q3" && (
              <div className="ob-quiz-wrap">
                <p className="ob-eyebrow">
                  {t("onboarding.quizCount", { current: 3, total: 5 })}
                </p>
                <p className="ob-quiz-question">{t("onboarding.q3.question")}</p>
                <p className="ob-quiz-hint">{t("onboarding.q3.hint")}</p>
                <div
                  className="ob-options"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}
                >
                  {Q3_OPTIONS.map((o) => {
                    const selected = answers.q3.includes(o.value);
                    return (
                      <button
                        type="button"
                        key={o.value}
                        className={`ob-option ob-option-grid ${selected ? "selected" : ""}`}
                        style={o.full ? { gridColumn: "1/-1" } : undefined}
                        onClick={() =>
                          setAnswers((a) => ({
                            ...a,
                            q3: selected
                              ? a.q3.filter((v) => v !== o.value)
                              : [...a.q3, o.value],
                          }))
                        }
                        data-testid={`option-q3-${o.value}`}
                      >
                        <span className="ob-option-icon">{o.iconKey}</span>
                        <span className="ob-option-label">
                          {t(`onboarding.q3.options.${o.value}`)}
                        </span>
                        <span className="ob-option-check" />
                      </button>
                    );
                  })}
                </div>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "var(--ob-cream-muted)",
                    marginTop: "0.8rem",
                  }}
                  data-testid="text-q3-count"
                >
                  {answers.q3.length === 0
                    ? t("onboarding.q3.empty")
                    : t("onboarding.q3.count", { count: answers.q3.length })}
                </p>
                <button
                  className="ob-btn-main"
                  disabled={answers.q3.length === 0}
                  onClick={goNext}
                  data-testid="button-onboarding-next-q3"
                >
                  {t("onboarding.next")} →
                </button>
              </div>
            )}

            {screen === "q4" && (
              <SingleChoiceQuiz
                qKey="q4"
                question={t("onboarding.q4.question")}
                hint={t("onboarding.q4.hint")}
                options={Q4_OPTIONS.map((o) => ({
                  ...o,
                  label: t(`onboarding.q4.options.${o.value}`),
                }))}
                value={answers.q4}
                onSelect={(v) => setAnswers((a) => ({ ...a, q4: v as Q4 }))}
                onNext={goNext}
                stepLabel={t("onboarding.quizCount", { current: 4, total: 5 })}
                nextLabel={t("onboarding.next")}
              />
            )}

            {screen === "q5" && (
              <div className="ob-quiz-wrap">
                <p className="ob-eyebrow">
                  {t("onboarding.quizCount", { current: 5, total: 5 })}
                </p>
                <p className="ob-quiz-question">{t("onboarding.q5.question")}</p>
                <p className="ob-quiz-hint">{t("onboarding.q5.hint")}</p>
                <div className="ob-options">
                  {Q5_OPTIONS.map((o) => {
                    const selected = answers.q5 === o.value;
                    return (
                      <button
                        type="button"
                        key={o.value}
                        className={`ob-option ${selected ? "selected" : ""}`}
                        onClick={() => setAnswers((a) => ({ ...a, q5: o.value }))}
                        data-testid={`option-q5-${o.value}`}
                      >
                        <span className="ob-option-icon">{o.iconKey}</span>
                        <div className="ob-option-text-block">
                          <span className="ob-option-label">
                            {t(`onboarding.q5.options.${o.value}.label`)}
                          </span>
                          <span className="ob-option-sublabel">
                            {t(`onboarding.q5.options.${o.value}.sublabel`)}
                          </span>
                        </div>
                        <span className="ob-option-check" />
                      </button>
                    );
                  })}
                </div>
                <button
                  className="ob-btn-main"
                  disabled={!answers.q5}
                  onClick={goNext}
                  data-testid="button-onboarding-show-result"
                >
                  {t("onboarding.showIdentity")} ✨
                </button>
              </div>
            )}

            {screen === "result" && (
              <div className="ob-center">
                <p className="ob-eyebrow">{t("onboarding.result.eyebrow")}</p>
                <div className="ob-result-icon" data-testid="text-result-icon">
                  {resultIcon}
                </div>
                <p className="ob-result-name" data-testid="text-result-name">
                  {resultName}
                </p>
                <div className="ob-divider" />
                <p className="ob-result-desc" data-testid="text-result-desc">
                  {resultDesc}
                </p>
                <div className="ob-result-tags">
                  {tags.map((tag, i) => (
                    <span key={`${tag}-${i}`} className="ob-tag" data-testid={`tag-result-${i}`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <p
                  className="ob-subtext"
                  style={{ marginTop: "1.5rem", fontSize: "0.8rem" }}
                  dangerouslySetInnerHTML={{ __html: t("onboarding.result.note") }}
                />
                <button
                  className="ob-btn-main"
                  onClick={handleFinish}
                  disabled={completeMutation.isPending}
                  data-testid="button-onboarding-finish"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="inline w-4 h-4 animate-spin" />
                  ) : (
                    <>{t("onboarding.startJourney")} 🌿</>
                  )}
                </button>
                {completeMutation.isError && (
                  <p
                    style={{
                      marginTop: "0.8rem",
                      fontSize: "0.75rem",
                      color: "hsl(var(--destructive))",
                    }}
                    data-testid="text-onboarding-error"
                  >
                    {t("onboarding.saveError")}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SingleChoiceQuiz<T extends string>({
  qKey,
  question,
  hint,
  options,
  value,
  onSelect,
  onNext,
  stepLabel,
  nextLabel,
}: {
  qKey: string;
  question: string;
  hint: string;
  options: { value: T; iconKey: string; label: string }[];
  value: T | undefined;
  onSelect: (v: T) => void;
  onNext: () => void;
  stepLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="ob-quiz-wrap">
      <p className="ob-eyebrow">{stepLabel}</p>
      <p className="ob-quiz-question">{question}</p>
      <p className="ob-quiz-hint">{hint}</p>
      <div className="ob-options">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              className={`ob-option ${selected ? "selected" : ""}`}
              onClick={() => onSelect(o.value)}
              data-testid={`option-${qKey}-${o.value}`}
            >
              <span className="ob-option-icon">{o.iconKey}</span>
              <span className="ob-option-label">{o.label}</span>
              <span className="ob-option-check" />
            </button>
          );
        })}
      </div>
      <button
        className="ob-btn-main"
        disabled={!value}
        onClick={onNext}
        data-testid={`button-onboarding-next-${qKey}`}
      >
        {nextLabel} →
      </button>
    </div>
  );
}
