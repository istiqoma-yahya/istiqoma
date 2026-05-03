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
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // mirror server cap

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

type Phase = "idle" | "recording" | "transcribing" | "processing" | "error";
type Engine = "speech-recognition" | "media-recorder";

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

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac with touch events.
    (ua.includes("Mac") && (navigator as any).maxTouchPoints > 1);
  return isIos;
}

function pickRecorderMimeType(): string | undefined {
  const MR: any = (window as any).MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== "function") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const t of candidates) {
    if (MR.isTypeSupported(t)) return t;
  }
  return undefined;
}

function hasMediaRecorderSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export default function VoiceCaptureDeedPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Web Speech path
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");

  // MediaRecorder fallback path
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef<string | undefined>(undefined);

  const intervalRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  // True once we've initiated parsing for the current session.
  const submittedRef = useRef(false);
  // Tracks which engine is currently active so onend/onstop know what to do.
  const engineRef = useRef<Engine | null>(null);
  // True if user manually stopped — vs an unexpected end.
  const userStoppedRef = useRef(false);

  const SpeechRecognitionCtor = useMemo(getSpeechRecognitionCtor, []);
  // Prefer MediaRecorder on iOS (where webkitSpeechRecognition is unreliable).
  const preferMediaRecorder = useMemo(
    () => isIosSafari() && hasMediaRecorderSupport(),
    [],
  );
  const supported =
    SpeechRecognitionCtor !== null || hasMediaRecorderSupport();

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

  function releaseStream() {
    const stream = mediaStreamRef.current;
    if (stream) {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    }
    mediaStreamRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearTimers();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      try {
        const r = mediaRecorderRef.current;
        if (r && r.state !== "inactive") r.stop();
      } catch {
        // ignore
      }
      releaseStream();
    };
  }, []);

  function start() {
    finalTranscriptRef.current = "";
    submittedRef.current = false;
    userStoppedRef.current = false;
    audioChunksRef.current = [];
    setTranscript("");
    setErrorMessage(null);
    setElapsed(0);

    if (!preferMediaRecorder && SpeechRecognitionCtor) {
      startWebSpeech();
    } else if (hasMediaRecorderSupport()) {
      void startMediaRecorder();
    } else if (SpeechRecognitionCtor) {
      startWebSpeech();
    } else {
      setErrorMessage(t("voiceCapture.unsupported"));
      setPhase("error");
    }
  }

  function startWebSpeech() {
    if (!SpeechRecognitionCtor) return;
    engineRef.current = "speech-recognition";

    const recognition = new SpeechRecognitionCtor();
    const bcp47 =
      LANG_TO_BCP47[i18n.language] ||
      LANG_TO_BCP47[i18n.language?.split("-")[0]] ||
      "en-US";
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
      const code = (event?.error as string | undefined) ?? "unknown";
      // Log full event for debugging across browsers / mobile devices.
      // eslint-disable-next-line no-console
      console.error("[voice] SpeechRecognition error", event, {
        code,
        message: event?.message,
      });

      // On Android Chrome / older Safari setups webkitSpeechRecognition can
      // fail immediately with non-fatal errors (network/service blocked,
      // audio-capture glitch, language unsupported). Transparently fall back
      // to MediaRecorder if it's available and we haven't captured anything
      // yet. Explicit user denial ("not-allowed") never auto-retries — the
      // user has to grant permission first.
      const recoverable =
        code === "service-not-allowed" ||
        code === "audio-capture" ||
        code === "network" ||
        code === "language-not-supported" ||
        code === "aborted";
      if (
        hasMediaRecorderSupport() &&
        !finalTranscriptRef.current.trim() &&
        recoverable
      ) {
        clearTimers();
        try {
          recognitionRef.current?.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
        // Switch engines without surfacing an error.
        void startMediaRecorder();
        return;
      }

      let msg: string;
      if (code === "not-allowed") {
        msg = t("voiceCapture.permissionDenied");
      } else if (code === "service-not-allowed") {
        msg = t("voiceCapture.serviceNotAllowed");
      } else if (code === "no-speech") {
        msg = t("voiceCapture.noSpeech");
      } else if (code === "audio-capture") {
        msg = t("voiceCapture.noMicrophone");
      } else if (code === "network") {
        msg = t("voiceCapture.networkError");
      } else if (code === "language-not-supported") {
        msg = t("voiceCapture.languageNotSupported");
      } else if (code === "aborted") {
        msg = t("voiceCapture.aborted");
      } else if (code === "bad-grammar") {
        msg = t("voiceCapture.badGrammar");
      } else {
        msg = t("voiceCapture.unknownError", { code });
      }
      clearTimers();
      setErrorMessage(msg);
      setPhase("error");
    };

    recognition.onend = () => {
      clearTimers();
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
      // eslint-disable-next-line no-console
      console.error("[voice] SpeechRecognition.start threw", err);
      // Try MediaRecorder fallback first.
      if (hasMediaRecorderSupport()) {
        void startMediaRecorder();
        return;
      }
      const code =
        (err instanceof Error && (err.name || err.message)) || "start-failed";
      setErrorMessage(t("voiceCapture.unknownError", { code }));
      setPhase("error");
      return;
    }

    recognitionRef.current = recognition;
    setPhase("recording");
    startElapsedTimer();
  }

  async function startMediaRecorder() {
    engineRef.current = "media-recorder";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[voice] getUserMedia failed", err);
      const name = err?.name as string | undefined;
      let msg = t("voiceCapture.error");
      if (name === "NotAllowedError" || name === "SecurityError") {
        msg = t("voiceCapture.permissionDenied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        msg = t("voiceCapture.noMicrophone");
      } else if (name) {
        msg = t("voiceCapture.unknownError", { code: name });
      }
      setErrorMessage(msg);
      setPhase("error");
      return;
    }

    mediaStreamRef.current = stream;
    const mimeType = pickRecorderMimeType();
    recorderMimeRef.current = mimeType;
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[voice] MediaRecorder construct failed", err);
      releaseStream();
      const code =
        (err instanceof Error && (err.name || err.message)) || "construct-failed";
      setErrorMessage(t("voiceCapture.unknownError", { code }));
      setPhase("error");
      return;
    }

    audioChunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        audioChunksRef.current.push(ev.data);
      }
    };
    recorder.onerror = (ev: any) => {
      // eslint-disable-next-line no-console
      console.error("[voice] MediaRecorder error", ev, ev?.error);
      clearTimers();
      releaseStream();
      const code =
        (ev?.error?.name as string | undefined) ||
        (ev?.error?.message as string | undefined) ||
        "recorder-error";
      setErrorMessage(t("voiceCapture.unknownError", { code }));
      setPhase("error");
    };
    recorder.onstop = () => {
      clearTimers();
      releaseStream();
      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];
      if (submittedRef.current) return;
      submittedRef.current = true;

      if (chunks.length === 0) {
        setErrorMessage(t("voiceCapture.noSpeech"));
        setPhase("error");
        return;
      }
      const blobType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: blobType });
      if (blob.size > MAX_AUDIO_BYTES) {
        setErrorMessage(t("voiceCapture.tooLarge"));
        setPhase("error");
        return;
      }
      void transcribeAndSubmit(blob);
    };

    try {
      // Request data periodically so we always have chunks even if the user
      // navigates away before MediaRecorder produces its final frame.
      recorder.start(1000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[voice] MediaRecorder.start failed", err);
      releaseStream();
      const code =
        (err instanceof Error && (err.name || err.message)) || "start-failed";
      setErrorMessage(t("voiceCapture.unknownError", { code }));
      setPhase("error");
      return;
    }

    mediaRecorderRef.current = recorder;
    setPhase("recording");
    startElapsedTimer();
  }

  function startElapsedTimer() {
    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_SECONDS) {
          stop();
        }
        return next;
      });
    }, 1000);
  }

  function stop() {
    userStoppedRef.current = true;
    if (engineRef.current === "speech-recognition") {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      return;
    }
    if (engineRef.current === "media-recorder") {
      try {
        const r = mediaRecorderRef.current;
        if (r && r.state !== "inactive") r.stop();
      } catch {
        // ignore
      }
      return;
    }
  }

  function cancel() {
    submittedRef.current = true; // suppress later submit
    clearTimers();
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    try {
      const r = mediaRecorderRef.current;
      if (r && r.state !== "inactive") r.stop();
    } catch {
      // ignore
    }
    releaseStream();
    navigate("/");
  }

  async function transcribeAndSubmit(audioBlob: Blob) {
    setPhase("transcribing");
    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const res = await apiRequest("POST", "/api/deeds/voice-transcribe", {
        audioBase64,
        mimeType: audioBlob.type || undefined,
      });
      const data = (await res.json()) as { transcript: string };
      const finalText = (data.transcript || "").trim();
      if (!finalText) {
        setErrorMessage(t("voiceCapture.noSpeech"));
        setPhase("error");
        return;
      }
      setTranscript(finalText);
      await submitTranscript(finalText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // eslint-disable-next-line no-console
      console.error("[voice] transcribe request failed", err);
      let display = t("voiceCapture.error");
      if (msg.startsWith("429")) {
        display = t("voiceCapture.rateLimited");
      } else if (msg.startsWith("503") || msg.startsWith("415")) {
        display = t("voiceCapture.serviceUnavailable");
      } else if (msg.startsWith("413")) {
        display = t("voiceCapture.tooLarge");
      } else if (msg.startsWith("422")) {
        display = t("voiceCapture.noSpeech");
      } else if (msg.startsWith("401")) {
        display = t("voiceCapture.permissionDenied");
      }
      setErrorMessage(display);
      setPhase("error");
      toast({ title: display, variant: "destructive" });
    }
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

  const isBusy = phase === "transcribing" || phase === "processing";
  const busyLabel =
    phase === "transcribing"
      ? t("voiceCapture.transcribing")
      : t("voiceCapture.processing");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
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
        ) : isBusy ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-4"
            data-testid={
              phase === "transcribing"
                ? "state-voice-transcribing"
                : "state-voice-processing"
            }
          >
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-sm text-muted-foreground">{busyLabel}</p>
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
