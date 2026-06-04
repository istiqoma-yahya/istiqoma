import { randomInt } from "crypto";
import {
  RECOVERY_CODE_ALPHABET,
  RECOVERY_CODE_LENGTH,
  formatRecoveryCode,
} from "@workspace/db";

export function generateRecoveryCode(): {
  raw: string;
  formatted: string;
} {
  let raw = "";
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i++) {
    raw += RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)];
  }
  return { raw, formatted: formatRecoveryCode(raw) };
}
