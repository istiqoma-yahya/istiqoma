---
name: istiqoma pre-existing typecheck errors
description: istiqoma typecheck fails on errors unrelated to feature work; don't assume you broke it.
---

`pnpm --filter @workspace/istiqoma run typecheck` reports failures that predate
recent feature work and live in code unrelated to most tasks:

- `src/components/ProductTour.tsx` — "Not all code paths return a value" (TS7030).
- `src/components/ui/calendar.tsx` — shadcn `IconLeft` not in `CustomComponents`, implicit `any` bindings.
- `src/lib/pushNotifications.ts` — `Uint8Array<ArrayBufferLike>` not assignable to `BufferSource`.
- `src/pages/DzikirPage.tsx` (`getDzikirLabel` / `getDzikirTypeForDeed`) — `BUILT_IN_IDS.has(typeId)` where `BUILT_IN_IDS` is a `Set` of string-literal union; `.has(string)` errors (TS2345).

**Why:** these are strictness/library-typing issues in components and helpers, not
in feature logic. A clean feature change can still show a red typecheck because of them.

**How to apply:** when verifying an istiqoma change with typecheck, confirm the
reported errors are in *files/functions you touched*. If they're only in the four
areas above (or similar untouched code), they're pre-existing — don't try to "fix"
them as part of an unrelated task.
