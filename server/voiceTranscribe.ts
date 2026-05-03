import type { Express, Response } from "express";
import express from "express";
import { z } from "zod";
import { toFile } from "openai";
import { isAuthenticated } from "./replit_integrations/auth";
import {
  openai,
  detectAudioFormat,
  type AudioFormat,
} from "./replit_integrations/audio/client";
import { checkVoiceParseRateLimit } from "./voiceParse";

// 10 MB cap on inbound audio (base64 expansion in JSON requires headroom).
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const JSON_BODY_LIMIT = "15mb";

const voiceTranscribeRequestSchema = z.object({
  audioBase64: z
    .string()
    .min(1, "audioBase64 is required")
    .max(((MAX_AUDIO_BYTES * 4) / 3) | 0, "Audio is too long. Please record a shorter clip."),
  mimeType: z.string().min(1).max(200).optional(),
});

// OpenAI's audio.transcriptions endpoint natively supports these container
// formats — we don't need ffmpeg for any of them. Mapping detected format →
// (extension, mime) for the multipart upload.
const FORMAT_TO_EXT: Record<
  Exclude<AudioFormat, "unknown">,
  { ext: string; mime: string }
> = {
  wav: { ext: "wav", mime: "audio/wav" },
  mp3: { ext: "mp3", mime: "audio/mpeg" },
  webm: { ext: "webm", mime: "audio/webm" },
  mp4: { ext: "mp4", mime: "audio/mp4" },
  ogg: { ext: "ogg", mime: "audio/ogg" },
};

function extFromMime(mime: string | undefined): { ext: string; mime: string } | null {
  if (!mime) return null;
  const m = mime.toLowerCase();
  if (m.includes("webm")) return { ext: "webm", mime: "audio/webm" };
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a"))
    return { ext: "mp4", mime: "audio/mp4" };
  if (m.includes("ogg") || m.includes("opus"))
    return { ext: "ogg", mime: "audio/ogg" };
  if (m.includes("wav") || m.includes("wave") || m.includes("pcm"))
    return { ext: "wav", mime: "audio/wav" };
  if (m.includes("mpeg") || m.includes("mp3"))
    return { ext: "mp3", mime: "audio/mpeg" };
  return null;
}

export function registerVoiceTranscribeRoute(app: Express): void {
  const jsonParser = express.json({ limit: JSON_BODY_LIMIT });

  app.post(
    "/api/deeds/voice-transcribe",
    isAuthenticated,
    jsonParser,
    async (req: any, res: Response) => {
      try {
        const userId = req.user.claims.sub;

        const limit = await checkVoiceParseRateLimit(userId);
        if (!limit.allowed) {
          res.setHeader("Retry-After", String(limit.retryAfterSeconds ?? 60));
          return res.status(429).json({
            message: "Too many voice requests. Please try again later.",
          });
        }

        const input = voiceTranscribeRequestSchema.parse(req.body);

        let audioBuffer: Buffer;
        try {
          audioBuffer = Buffer.from(input.audioBase64, "base64");
        } catch {
          return res.status(400).json({ message: "Invalid audio data." });
        }
        if (audioBuffer.length === 0) {
          return res.status(400).json({ message: "Empty audio." });
        }
        if (audioBuffer.length > MAX_AUDIO_BYTES) {
          return res
            .status(413)
            .json({ message: "Audio is too long. Please record a shorter clip." });
        }

        // Resolve container format. Prefer magic-byte detection; fall back to
        // the client-declared mimeType (some browsers emit headerless chunks).
        // OpenAI's transcription endpoint natively accepts wav/mp3/webm/mp4/
        // ogg, so no ffmpeg conversion is needed in the common path.
        const detected = detectAudioFormat(audioBuffer);
        let target =
          detected !== "unknown"
            ? FORMAT_TO_EXT[detected]
            : extFromMime(input.mimeType) ?? FORMAT_TO_EXT.webm;

        let transcript: string;
        try {
          const file = await toFile(audioBuffer, `audio.${target.ext}`, {
            type: target.mime,
          });
          const response = await openai.audio.transcriptions.create({
            file,
            model: "gpt-4o-mini-transcribe",
          });
          transcript = response.text ?? "";
        } catch (err) {
          console.error("voice-transcribe: STT failed", err);
          return res.status(503).json({
            message: "Transcription service is unavailable. Please try again.",
          });
        }

        const trimmed = transcript.trim();
        if (!trimmed) {
          return res.status(422).json({
            message: "We didn't catch any speech. Please try again.",
          });
        }

        return res.json({ transcript: trimmed });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        console.error("voice-transcribe: unexpected error", err);
        return res
          .status(500)
          .json({ message: "Internal error. Please try again." });
      }
    },
  );
}
