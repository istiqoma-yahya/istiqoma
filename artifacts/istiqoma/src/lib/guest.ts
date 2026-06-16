// Client-side "guest browse" mode.
//
// Guests have NO server session. We persist a small flag in localStorage so
// the app can render the authenticated UI shell (dashboard, nav, read-only
// pages) without a logged-in user, while still blocking every write action
// behind a sign-up prompt. The flag is cleared the moment the user actually
// authenticates (see AuthWrapper).

const GUEST_KEY = "istiqoma:guest";
const GUEST_ONBOARDED_KEY = "istiqoma:guestOnboarded";

// Fired (on window) whenever the guest flags change, so React state stays in
// sync across the provider and any non-React reader.
export const GUEST_CHANGED_EVENT = "istiqoma:guest-changed";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(key, "1");
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage can be unavailable (private mode / disabled). Guest mode
    // simply won't persist across reloads in that case, which is acceptable.
  }
  try {
    window.dispatchEvent(new CustomEvent(GUEST_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

/**
 * Synchronous read of guest mode. Safe to call from non-React code such as the
 * query client (used to suppress the session-expired redirect for guests).
 */
export function isGuestMode(): boolean {
  return readFlag(GUEST_KEY);
}

export function isGuestOnboarded(): boolean {
  return readFlag(GUEST_ONBOARDED_KEY);
}

export function setGuestMode(on: boolean): void {
  writeFlag(GUEST_KEY, on);
}

export function setGuestOnboardedFlag(on: boolean): void {
  writeFlag(GUEST_ONBOARDED_KEY, on);
}

/** Clear all guest state (called on successful login / logout). */
export function clearGuestState(): void {
  setGuestMode(false);
  setGuestOnboardedFlag(false);
}
