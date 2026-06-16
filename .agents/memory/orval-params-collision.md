---
name: Orval params collision fix
description: When an OpenAPI operation has both a path param and query params, Orval generates a combined Params type in both api.ts (Zod) and types/ (TypeScript interface), causing TS2308 collision in api-zod barrel.
---

## The Rule
Never put query params on an operation that also has a path param in the same URL segment.

**Why:** Orval generates `<OperationPascal>Params` both as a Zod schema in `generated/api.ts` AND as a TypeScript interface in `generated/types/`. The api-zod barrel exports both with `export *`, causing TS2308: "Module has already exported a member named X".

Operations with ONLY path params (e.g. `getProject`, `deleteProject`) generate Zod schemas in api.ts but NOT TypeScript interfaces in types/ — no collision.
Operations with ONLY query params generate TypeScript interfaces in types/ but NOT Zod schemas in api.ts — no collision.
Operations with BOTH path + query params generate BOTH — collision.

**How to apply:** When you need filtering on a resource nested under a path param (e.g. `/projects/{id}/assets?type=...`), either:
1. Remove the query params and filter client-side
2. Move to a separate endpoint (e.g. `/assets?projectId=X&type=Y`) with no path param
3. Apply the filter server-side from the path param only

The `listAssets` operation at `/projects/{id}/assets` had this exact collision — fixed by removing the `type` query param.
