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

// 10 MB cap on inbound audio. Now received as raw bytes (no base64 inflation),
// so the body limit is the same as the audio limit.
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const mimeTypeSchema = z.string().min(1).max(200).optional();

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
  // Accept the audio bytes directly as the request body (any content type:
  // audio/webm, audio/mp4, audio/ogg, etc.). This avoids JSON-encoding the
  // audio as base64, which both inflates the payload by ~33% and pushes it
  // through body parsers / proxies that have stricter JSON limits than raw
  // body limits. The client-declared MIME type is passed via the standard
  // Content-Type header.
  const rawParser = express.raw({
    type: () => true,
    limit: MAX_AUDIO_BYTES,
  });

  app.post(
    "/api/deeds/voice-transcribe",
    isAuthenticated,
    rawParser,
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

        const audioBuffer: Buffer = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.alloc(0);
        if (audioBuffer.length === 0) {
          return res.status(400).json({ message: "Empty audio." });
        }
        if (audioBuffer.length > MAX_AUDIO_BYTES) {
          return res
            .status(413)
            .json({ message: "Audio is too long. Please record a shorter clip." });
        }

        const mimeTypeParse = mimeTypeSchema.safeParse(
          typeof req.headers["content-type"] === "string"
            ? req.headers["content-type"]
            : undefined,
        );
        const declaredMime = mimeTypeParse.success ? mimeTypeParse.data : undefined;

        // Resolve container format. Prefer magic-byte detection; fall back to
        // the client-declared Content-Type (some browsers emit headerless
        // chunks). OpenAI's transcription endpoint natively accepts wav/mp3/
        // webm/mp4/ogg, so no ffmpeg conversion is needed in the common path.
        const detected = detectAudioFormat(audioBuffer);
        let target =
          detected !== "unknown"
            ? FORMAT_TO_EXT[detected]
            : extFromMime(declaredMime) ?? FORMAT_TO_EXT.webm;

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
