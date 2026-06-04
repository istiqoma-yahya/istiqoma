/**
 * E2E tests for the floating voice-recording mini-player (Task #283).
 *
 * The mini-player appears at the bottom of the Qur'an surah reader whenever
 * a user taps "Play recording" on a verse that has a local recording in
 * memorization mode.
 *
 * Covers:
 *   1. After recording a verse and tapping "Play recording", the floating
 *      mini-player appears with the correct surah/verse label.
 *   2. The play/pause toggle changes the aria-label between playing and
 *      paused states (exercises the a.paused branch in toggleRecordPlayback).
 *   3. Dragging / keyboard-navigating the seek slider changes the displayed
 *      playback position (exercises seekRecord → setRecordPosition).
 *   4. Swapping to another verse's recording updates the player label.
 *   5. The close (×) button hides the mini-player and stops audio.
 *   6. The delete (trash) button hides the mini-player, stops audio, and
 *      removes the per-verse play/delete controls.
 *
 * Surah 112 (Al-Ikhlas, 4 verses) is used because it is short.
 *
 * Requires the `authenticated` Playwright project (storageState from
 * tests/e2e/global-setup.ts) so the Qur'an reader loads correctly.
 */
import { expect, test, type Page } from "@playwright/test";

const SURAH_ID = 112;

// Typed global so `window.__audioPlaying` is known to TypeScript within
// page.evaluate callbacks without requiring `as any` casts.
declare global {
  interface Window {
    __audioPlaying: boolean;
  }
}

/**
 * Browser-side script injected before each test via page.addInitScript.
 *
 * Replaces hardware-dependent APIs so tests run in headless Chrome without
 * a real microphone or audio output device:
 *
 * - MediaRecorder   : synchronous fake; on stop() synchronously delivers a
 *                     non-empty 128-byte Blob then fires onstop asynchronously,
 *                     matching real MediaRecorder event order so the
 *                     blob.size > 0 guard in stopRecord() passes.
 * - getUserMedia    : resolves immediately with a fake MediaStream.
 * - Audio.paused    : overridden via Object.defineProperty so the
 *                     `a.paused` branch in toggleRecordPlayback() works
 *                     correctly without real audio playback.
 * - Audio.play()    : resolves instantly, sets paused=false, dispatches
 *                     "loadedmetadata" (duration=30s) then "play" so React's
 *                     onPlay listener sets recordIsPlaying=true and the seek
 *                     slider is enabled (disabled={!duration}).
 * - Audio.pause()   : sets paused=true and dispatches "pause" so React's
 *                     onPause listener sets recordIsPlaying=false.
 * - window.__audioPlaying : global boolean updated by play/pause mocks so
 *                     tests can assert whether audio has stopped.
 */
const mockMediaAPIs = `
  // ── MediaRecorder mock ────────────────────────────────────────────────────
  class MockMediaRecorder {
    constructor(stream) {
      this.stream = stream;
      this.state = "inactive";
      this.ondataavailable = null;
      this.onstop = null;
    }
    start(_timeslice) {
      this.state = "recording";
    }
    stop() {
      if (this.state !== "recording") return;
      this.state = "inactive";
      // Deliver a non-empty chunk so new Blob(chunks).size > 0 passes.
      const chunk = new Blob([new Uint8Array(128).fill(42)], { type: "audio/webm" });
      if (this.ondataavailable) this.ondataavailable({ data: chunk });
      // Fire onstop asynchronously — same ordering as the real MediaRecorder.
      setTimeout(() => { if (this.onstop) this.onstop(); }, 0);
    }
    static isTypeSupported() { return true; }
  }
  window.MediaRecorder = MockMediaRecorder;

  // ── getUserMedia mock ──────────────────────────────────────────────────────
  const fakeStream = { getTracks: () => [{ stop: () => {} }] };
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", { value: {}, writable: true });
  }
  navigator.mediaDevices.getUserMedia = async () => fakeStream;

  // ── HTMLAudioElement mocks ─────────────────────────────────────────────────
  // Track per-instance paused state in a WeakMap; the native 'paused'
  // property is read-only so we shadow it at the prototype level.
  const _state = new WeakMap();
  window.__audioPlaying = false;

  Object.defineProperty(HTMLAudioElement.prototype, "paused", {
    get() { const s = _state.get(this); return s ? s.paused : true; },
    configurable: true,
  });

  HTMLAudioElement.prototype.play = function () {
    const el = this;
    _state.set(el, { paused: false });
    window.__audioPlaying = true;
    // Give the element a 30-second duration so the seek slider is enabled
    // (disabled={!duration}) and the slider's max is meaningful.
    if (!Object.getOwnPropertyDescriptor(el, "duration")) {
      Object.defineProperty(el, "duration", { value: 30, configurable: true, writable: false });
    }
    Promise.resolve().then(() => {
      // "loadedmetadata" → setRecordDuration(a.duration) = 30
      el.dispatchEvent(new Event("loadedmetadata"));
      // "play" → setRecordIsPlaying(true)
      el.dispatchEvent(new Event("play"));
    });
    return Promise.resolve();
  };

  HTMLAudioElement.prototype.pause = function () {
    _state.set(this, { paused: true });
    window.__audioPlaying = false;
    this.dispatchEvent(new Event("pause"));
  };
`;

/** Go to the surah, wait for it to load, and enter memorization mode. */
async function openMemorizationMode(page: Page): Promise<void> {
  await page.goto(`/quran/${SURAH_ID}`);
  await expect(page.getByTestId("text-surah-title")).toBeVisible();
  await expect(page.getByTestId("verse-1")).toBeVisible();
  await page.getByTestId("button-toggle-memorization").click();
  await expect(page.getByTestId("button-record-1")).toBeVisible();
}

/**
 * Record a verse: click Record → wait for Stop button → click Stop →
 * wait for the per-verse Play and Delete buttons (blob stored in recordingsRef).
 */
async function recordVerse(page: Page, verseNumber: number): Promise<void> {
  await page.getByTestId(`button-record-${verseNumber}`).click();
  await expect(page.getByTestId(`button-stop-record-${verseNumber}`)).toBeVisible();
  await page.getByTestId(`button-stop-record-${verseNumber}`).click();
  await expect(page.getByTestId(`button-play-record-${verseNumber}`)).toBeVisible();
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Voice recording mini-player", () => {
  test.beforeEach(async ({ page }) => {
    // Inject all media mocks before any page script runs.
    await page.addInitScript(mockMediaAPIs);
  });

  test("mini-player appears with correct label after playing a recording", async ({
    page,
  }) => {
    await openMemorizationMode(page);
    await recordVerse(page, 1);

    // Tap "Play recording" for verse 1 → floating player must appear.
    await page.getByTestId("button-play-record-1").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();

    // Label format: "<surah.name_simple> · <verseShort> <verseNumber>".
    // Verify the label is non-empty and contains the verse number (1).
    // We intentionally avoid asserting the exact surah name so the test
    // stays green if the upstream API changes its transliteration.
    const label = await page.getByTestId("text-voice-player-label").textContent();
    expect(label?.trim().length).toBeGreaterThan(0);
    expect(label).toMatch(/\b1\b/);

    // All core controls must be rendered.
    await expect(page.getByTestId("button-voice-player-toggle")).toBeVisible();
    await expect(page.getByTestId("button-voice-player-close")).toBeVisible();
    await expect(page.getByTestId("slider-voice-player-progress")).toBeVisible();
    await expect(page.getByTestId("text-voice-player-position")).toBeVisible();
    await expect(page.getByTestId("text-voice-player-duration")).toBeVisible();
  });

  test("play/pause toggle changes the player's playing state", async ({ page }) => {
    await openMemorizationMode(page);
    await recordVerse(page, 1);

    await page.getByTestId("button-play-record-1").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();

    const toggleBtn = page.getByTestId("button-voice-player-toggle");

    // After the mocked "play" event fires, isPlaying=true → Pause label.
    // All three i18n locales: "Pause recording" / "Jeda rekaman" / "Jeda rakaman".
    await expect(toggleBtn).toHaveAttribute("aria-label", /pause|jeda/i);

    // Clicking toggle calls toggleRecordPlayback() → a.pause() → "pause" event
    // → setRecordIsPlaying(false) → button label switches to Play.
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-label", /^(play|putar|main)/i);

    // Clicking again resumes: a.paused=true → a.play() → "play" event → Pause label.
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-label", /pause|jeda/i);
  });

  test("seek slider changes the displayed playback position", async ({ page }) => {
    await openMemorizationMode(page);
    await recordVerse(page, 1);

    await page.getByTestId("button-play-record-1").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();

    // Wait for duration to be populated (loadedmetadata dispatched by play mock).
    // The slider is disabled={!duration}, so once duration > 0 it becomes interactive.
    const sliderThumb = page
      .getByTestId("slider-voice-player-progress")
      .locator('[role="slider"]')
      .first();
    await expect(sliderThumb).toBeVisible();

    // The slider starts at 0 (position = 0).
    await expect(sliderThumb).toHaveAttribute("aria-valuenow", "0");

    // Focus the thumb and press ArrowRight once.
    // Radix fires onValueChange([step]) → onSeek(step) → seekRecord(0.1)
    // → a.currentTime = 0.1; setRecordPosition(0.1).
    await sliderThumb.focus();
    await sliderThumb.press("ArrowRight");

    // aria-valuenow must advance beyond 0, confirming the seek pipeline fired.
    await expect(sliderThumb).not.toHaveAttribute("aria-valuenow", "0");

    // Press Right enough more times to accumulate > 1 second (step=0.1, 10 presses=1s).
    for (let i = 0; i < 9; i++) {
      await sliderThumb.press("ArrowRight");
    }

    // After 10 total presses: position = 1.0 s → fmt(1.0) = "0:01".
    await expect(page.getByTestId("text-voice-player-position")).toHaveText("0:01");
  });

  test("swapping to a different verse updates the mini-player label", async ({
    page,
  }) => {
    await openMemorizationMode(page);
    await recordVerse(page, 1);
    await recordVerse(page, 2);

    // Open player for verse 1.
    await page.getByTestId("button-play-record-1").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();
    const label1 = await page.getByTestId("text-voice-player-label").textContent();
    expect(label1).toMatch(/\b1\b/);

    // Tap "Play recording" for verse 2 — swaps the source in-place.
    await page.getByTestId("button-play-record-2").click();
    // Player remains visible throughout the swap.
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();
    const label2 = await page.getByTestId("text-voice-player-label").textContent();
    // Label must now reference verse 2.
    expect(label2).toMatch(/\b2\b/);
    expect(label2).not.toEqual(label1);
  });

  test("close (×) hides the mini-player and stops audio", async ({ page }) => {
    await openMemorizationMode(page);
    await recordVerse(page, 1);

    await page.getByTestId("button-play-record-1").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();

    // Confirm audio is reported as playing.
    await expect
      .poll(() => page.evaluate(() => window.__audioPlaying))
      .toBe(true);

    // Close the player.
    await page.getByTestId("button-voice-player-close").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeHidden();

    // closeRecordPlayer() calls a.pause() → pause mock sets __audioPlaying=false.
    await expect
      .poll(() => page.evaluate(() => window.__audioPlaying))
      .toBe(false);

    // The per-verse play/delete controls must still exist (recording survives).
    await expect(page.getByTestId("button-play-record-1")).toBeVisible();
    await expect(page.getByTestId("button-delete-record-1")).toBeVisible();
  });

  test("delete removes per-verse controls, hides the player, and stops audio", async ({
    page,
  }) => {
    await openMemorizationMode(page);
    await recordVerse(page, 1);

    // Open the player, then delete the recording while it is active.
    await page.getByTestId("button-play-record-1").click();
    await expect(page.getByTestId("voice-recording-mini-player")).toBeVisible();

    // Confirm audio is reported as playing.
    await expect
      .poll(() => page.evaluate(() => window.__audioPlaying))
      .toBe(true);

    // Delete the recording.
    await page.getByTestId("button-delete-record-1").click();

    // Player disappears and audio stops.
    await expect(page.getByTestId("voice-recording-mini-player")).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => window.__audioPlaying))
      .toBe(false);

    // Per-verse play/delete controls are gone (recording no longer exists).
    await expect(page.getByTestId("button-play-record-1")).toBeHidden();
    await expect(page.getByTestId("button-delete-record-1")).toBeHidden();

    // The Record button is restored so the user can record again.
    await expect(page.getByTestId("button-record-1")).toBeVisible();
  });
});
