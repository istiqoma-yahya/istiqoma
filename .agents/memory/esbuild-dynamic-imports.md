---
name: esbuild dynamic import resolution
description: esbuild fails to resolve directory-style dynamic imports; must use static imports or explicit index file paths
---

esbuild (used in the api-server build) cannot follow directory-index resolution for dynamic `await import()` calls. It will error with "Could not resolve './some/dir'" even when `./some/dir/index.ts` exists.

**Why:** esbuild's dynamic import bundling does not perform Node.js-style directory resolution.

**How to apply:** When you see a dynamic import of a directory, either:
1. Convert it to a static top-level import (preferred — esbuild handles static imports correctly)
2. Point the dynamic import at the explicit file: `await import("./dir/index")`

This came up with `./replit_integrations/object_storage` — fixed by adding a static import at the top of routes.ts.
