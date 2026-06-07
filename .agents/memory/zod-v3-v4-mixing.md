---
name: zod v3/v4 schema composition
description: Mixing `zod` (v3) and `zod/v4` imports when composing/extending a schema causes a runtime parse crash that react-hook-form swallows silently.
---

# Never mix `zod` and `zod/v4` imports in a single composed schema

The istiqoma `shared/schema.ts` builds its schemas with `import { z } from "zod/v4"`
(the v4 subpath shipped inside the `zod@3.25.x` package). When a form did
`insertDeedSchema.extend({ points: z.coerce.number()... })` where that `z` came
from plain `import { z } from "zod"` (v3), the resulting object is a v4 schema
containing a v3 child schema.

**Symptom:** at parse time the v4 parser throws
`Invalid element at key "<field>": expected a Zod schema` for ALL input
(including valid input). With `@hookform/resolvers` + react-hook-form, the
resolver promise rejects, RHF swallows it, so the submit handler never runs and
**no field error is shown** — the submit button appears to do nothing.

**Rule:** a composed/extended schema must use ONE zod version end to end. If the
base schema is `zod/v4`, every `.extend()` field and every form helper must also
import `z` from `"zod/v4"`.

**Why:** v3 and v4 schema instances have incompatible internals (`_def` vs
`_zod`); the v4 parser cannot walk a v3 child.

**How to apply:** when a save/submit button silently no-ops on a react-hook-form
+ zodResolver page, check the `z` import of the page against the import used by
the schema it extends. Reproduce in isolation by running the resolver against
valid input — it will throw rather than return.

**Resolver version matters too (the deeper bug):** `@hookform/resolvers@3.x`
does NOT properly support zod v4 at runtime. With a v4 schema it returns
`{errors:{},values}` for VALID input but **throws the raw ZodError** for ANY
invalid input instead of returning mapped field errors. RHF swallows the
rejected promise → submit silently no-ops with no visible field error — even
when the v3/v4 import mixing is already fixed. Fix = upgrade
`@hookform/resolvers` to v5.x (needs react-hook-form ≥7.55), which RETURNS
mapped errors. Verify in isolation with a node repro: invalid input must RETURN
`{errors:{field:...}}`, not throw.

**v5 type friction:** resolver v5 has a 3rd `TTransformedValues` generic and is
strict about `z.coerce.number()` (input type becomes `unknown`), causing TS2322
`Control` leaks and TS2345. Clean bridge: `resolver: zodResolver(schema) as
unknown as Resolver<FormValues>` (import `type Resolver` from react-hook-form).
Apply to EVERY `zodResolver` form, not just the broken one — the upgrade is
workspace-wide.

**Legacy enum data on edit:** deed enum-backed columns (`customUnit`,
`quranUnit`, `sedekahType`) are plain `text()` in the DB but `z.enum()` in the
schema. Editing a row whose stored value is outside the enum fails validation
(now a visible error instead of silent). Sanitize on form hydration: coerce
unknown enum values to `undefined` so the edit can still be saved.
