---
name: Express 5 wildcard routes
description: Express 5 uses path-to-regexp v8 which broke the Express 4 /:param(*) wildcard syntax
---

The pattern `/:objectPath(*)` (Express 4 style) throws a `PathError: Unexpected (` at startup with Express 5.

**Why:** Express 5 upgraded path-to-regexp to v8 which changed wildcard capture syntax.

**How to apply:** Replace `/:param(*)` with `/*param` throughout all route definitions when migrating an Express 4 codebase to Express 5.

Example:
- Before: `app.get("/objects/:objectPath(*)", ...)`
- After:  `app.get("/objects/*objectPath", ...)`
