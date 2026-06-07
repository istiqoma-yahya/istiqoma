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

**Pre-existing type debt:** `@hookform/resolvers@3.10` types reference zod v3, so
`zodResolver(<v4 schema>)` shows TS2345 across all v4 forms. This is type-only;
vite/esbuild ignores it and runtime works once both sides are v4.
