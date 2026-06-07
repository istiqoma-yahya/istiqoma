---
name: framer-motion onTap fires on scroll (Istiqoma)
description: Why list cards using framer-motion onTap navigate accidentally during scroll, and the pointer-thresholding fix.
---

# framer-motion `onTap` cannot tell a tap from a scroll

**Symptom:** scrolling a list of tappable cards (on touch) accidentally
triggers the card's action (e.g. opens an edit page).

**Why:** framer-motion's `onTap` fires on pointer *release* as long as the
pointer is still over the element — it does NOT cancel when the finger moves to
scroll the list. So a vertical scroll that starts and ends on the same card is
registered as a tap. This is touch-only, which is why it never shows up with a
desktop mouse during testing.

**Fix pattern (don't use onTap for navigation on scrollable lists):** track the
pointer manually and gate on movement + duration.
- `onPointerDown`: record `{pointerId, x, y, time}`; ignore non-primary pointers
  (`!event.isPrimary`) so a second finger can't hijack the gesture.
- `onPointerUp`: navigate only if same `pointerId`, moved ≤ ~10px in BOTH axes,
  and pressed ≤ ~700ms (else it's a scroll or long-press). Still guard against
  taps that land on inner buttons/dialogs (`target.closest('button')`).
- `onPointerCancel`: clear the pending tap — the browser fires this when it
  takes the gesture over for scrolling, so it must never navigate.
- Keep keyboard a11y: add `onKeyDown` for Enter/Space since the card is
  `role="button" tabIndex={0}`.

**How to apply:** any `motion.*` element that both scrolls and navigates on tap.
Prefer this pointer-thresholding over `onTap`. `whileTap` (visual scale) is fine
to keep — only the navigation trigger is the problem.
