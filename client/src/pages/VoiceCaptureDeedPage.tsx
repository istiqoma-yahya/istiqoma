import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Mic, Square, X, Loader2, Keyboard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  VoiceParseLanguage,
  VoiceParseRequest,
  VoiceParseResponse,
} from "@shared/schema";

// SessionStorage key consumed by CreateDeedPage to prefill the form.
export const VOICE_DEED_PREFILL_KEY = "voice-deed-prefill";

const MAX_SECONDS = 60;

// Map our app's i18n language codes to BCP-47 codes the browser understands.
const LANG_TO_BCP47: Record<string, string> = {
  id: "id-ID",
  en: "en-US",
  ms: "ms-MY",
  ar: "ar-SA",
};

function toVoiceParseLanguage(lng: string): VoiceParseLanguage | undefined {
  if (lng.startsWith("id")) return "id";
  if (lng.startsWith("en")) return "en";
  if (lng.startsWith("ms")) return "ms";
  if (lng.startsWith("ar")) return "ar";
  return undefined;
}

type Phase = "idle" | "recording" | "processing" | "error";

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: ((ev: any) => void) | null;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceCaptureDeedPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const intervalRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  // True once we've initiated parsing for the current session, so the
  // recognition `onend` handler doesn't accidentally fire it again.
  const submittedRef = useRef(false);

  const SpeechRecognitionCtor = useMemo(getSpeechRecognitionCtor, []);
  const supported = SpeechRecognitionCtor !== null;

  function clearTimers() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearTimers();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  function start() {
    if (!SpeechRecognitionCtor) return;

    finalTranscriptRef.current = "";
    submittedRef.current = false;
    setTranscript("");
    setErrorMessage(null);
    setElapsed(0);

    const recognition = new SpeechRecognitionCtor();
    const bcp47 = LANG_TO_BCP47[i18n.language] || LANG_TO_BCP47[i18n.language?.split("-")[0]] || "en-US";
    recognition.lang = bcp47;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += text;
        } else {
          interim += text;
        }
      }
      setTranscript((finalTranscriptRef.current + " " + interim).trim());
    };

    recognition.onerror = (event: any) => {
      const code = event?.error as string | undefined;
      let msg = t("voiceCapture.error");
      if (code === "not-allowed" || code === "service-not-allowed") {
        msg = t("voiceCapture.permissionDenied");
      } else if (code === "no-speech") {
        msg = t("voiceCapture.noSpeech");
      } else if (code === "audio-capture") {
        msg = t("voiceCapture.noMicrophone");
      } else if (code === "network") {
        msg = t("voiceCapture.networkError");
      } else if (code === "language-not-supported") {
        msg = t("voiceCapture.languageNotSupported");
      }
      clearTimers();
      setErrorMessage(msg);
      setPhase("error");
    };

    recognition.onend = () => {
      clearTimers();
      // If we already moved to processing/error, ignore.
      if (submittedRef.current) return;
      const final = finalTranscriptRef.current.trim();
      if (!final) {
        if (phase === "recording") {
          setErrorMessage(t("voiceCapture.noSpeech"));
          setPhase("error");
        }
        return;
      }
      submittedRef.current = true;
      void submitTranscript(final);
    };

    try {
      recognition.start();
    } catch (err) {
      setErrorMessage(t("voiceCapture.error"));
      setPhase("error");
      return;
    }

    recognitionRef.current = recognition;
    setPhase("recording");

    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_SECONDS) {
          // Auto-stop at the cap.
          stop();
        }
        return next;
      });
    }, 1000);
  }

  function stop() {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  }

  function cancel() {
    submittedRef.current = true; // suppress onend submit
    clearTimers();
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    navigate("/");
  }

  async function submitTranscript(finalTranscript: string) {
    setPhase("processing");
    try {
      const language = toVoiceParseLanguage(i18n.language);
      const body: VoiceParseRequest = {
        transcript: finalTranscript,
        language,
        clientNowIso: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const res = await apiRequest("POST", "/api/deeds/voice-parse", body);
      const data = (await res.json()) as VoiceParseResponse;

      if (data.lowConfidence || !data.parsed.category) {
        setErrorMessage(t("voiceCapture.couldNotUnderstand"));
        setPhase("error");
        return;
      }

      sessionStorage.setItem(
        VOICE_DEED_PREFILL_KEY,
        JSON.stringify({ ...data.parsed, transcript: data.transcript }),
      );
      navigate("/create-deed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      let display = t("voiceCapture.error");
      if (msg.startsWith("429")) {
        display = t("voiceCapture.rateLimited");
      } else if (msg.startsWith("503")) {
        display = t("voiceCapture.serviceUnavailable");
      }
      setErrorMessage(display);
      setPhase("error");
      toast({ title: display, variant: "destructive" });
    }
  }

  function reset() {
    setPhase("idle");
    setElapsed(0);
    setTranscript("");
    finalTranscriptRef.current = "";
    setErrorMessage(null);
  }

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">{t("voiceCapture.title")}</h1>
          <button
            onClick={cancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-close-voice-capture"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-12">
        {!supported ? (
          <div
            className="rounded-xl border border-border bg-card p-6 text-center space-y-4"
            data-testid="state-voice-unsupported"
          >
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-semibold">{t("voiceCapture.unsupportedTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("voiceCapture.unsupported")}</p>
            <Button
              onClick={() => navigate("/create-deed")}
              className="bg-emerald-500 text-white"
              data-testid="button-switch-to-text"
            >
              <Keyboard className="w-4 h-4 mr-2" />
              {t("voiceCapture.switchToText")}
            </Button>
          </div>
        ) : phase === "error" ? (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-6 text-center space-y-4"
            data-testid="state-voice-error"
          >
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm" data-testid="text-voice-error-message">
              {errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={reset}
                variant="outline"
                data-testid="button-voice-retry"
              >
                {t("voiceCapture.retry")}
              </Button>
              <Button
                onClick={() => navigate("/create-deed")}
                className="bg-emerald-500 text-white"
                data-testid="button-voice-switch-to-text"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                {t("voiceCapture.switchToText")}
              </Button>
            </div>
          </div>
        ) : phase === "processing" ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-4"
            data-testid="state-voice-processing"
          >
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-sm text-muted-foreground">{t("voiceCapture.processing")}</p>
            {transcript && (
              <p className="text-sm italic text-center max-w-md" data-testid="text-voice-transcript">
                "{transcript}"
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-center text-muted-foreground max-w-md">
              {t("voiceCapture.instructions")}
            </p>

            <button
              type="button"
              onClick={phase === "recording" ? stop : start}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                phase === "recording"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
              }`}
              data-testid={phase === "recording" ? "button-voice-stop" : "button-voice-start"}
              aria-label={phase === "recording" ? t("voiceCapture.stop") : t("voiceCapture.start")}
            >
              {phase === "recording" ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
                  <Square className="w-12 h-12 relative" fill="currentColor" />
                </>
              ) : (
                <Mic className="w-14 h-14" />
              )}
            </button>

            <div
              className="text-2xl font-mono tabular-nums"
              data-testid="text-voice-timer"
            >
              {minutes}:{seconds}
            </div>

            {transcript && (
              <p
                className="text-sm italic text-center max-w-md text-muted-foreground"
                data-testid="text-voice-live-transcript"
              >
                "{transcript}"
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {t("voiceCapture.timerHint", { seconds: MAX_SECONDS })}
            </p>

            {phase === "idle" && (
              <button
                type="button"
                onClick={() => navigate("/create-deed")}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                data-testid="button-voice-prefer-text"
              >
                {t("voiceCapture.switchToText")}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
