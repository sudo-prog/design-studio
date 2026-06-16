---
name: api-zod dom lib requirement
description: The api-zod tsconfig must include the "dom" lib when any endpoint uses multipart/form-data, because Orval generates zod.instanceof(File) and Blob references.
---

## The Rule
Add `"lib": ["esnext", "dom"]` to `lib/api-zod/tsconfig.json` whenever the OpenAPI spec includes a `multipart/form-data` endpoint.

**Why:** Orval generates `zod.instanceof(File)` for binary form fields and TypeScript `Blob` types in the generated types. Without the `dom` lib, the TypeScript compiler cannot find `File` or `Blob`, producing TS2304 errors during `typecheck:libs`.

**How to apply:** Before running codegen on any spec that includes file uploads, add the dom lib to `lib/api-zod/tsconfig.json`. The base tsconfig doesn't include it.
