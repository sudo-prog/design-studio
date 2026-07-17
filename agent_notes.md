# Agent Notes — DESIGN Studio

Architecture decisions, file structure, API patterns, and known issues.

---

## Project Path
`/home/thinkpad/Data/20_Projects/20.10_DESIGN_STUDIO/04_Design-Studio-Pro/`

## Repository
- GitHub: `sudo-prog/DESIGN-Studio` (private)
- Main branch: `main`
- pnpm monorepo with workspaces

## Monorepo Structure
- `artifacts/design-studio/` — React 19 frontend (Vite 7, Tailwind 4, shadcn/ui, Zustand, TanStack Query, Fabric.js)
- `artifacts/api-server/` — Express 5 backend (Drizzle ORM, PostgreSQL, Image generation, Sharp for bg removal)
- `lib/db/` — Shared database schema (Drizzle), migrations
- `lib/api-zod/` — Shared Zod schemas, API client
- `lib/api-client-react/` — Generated API client for frontend
- `lib/api-spec/` — OpenAPI spec, Orval codegen

## Key Technologies
- Frontend: React 19, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand, TanStack Query, Fabric.js (canvas editor)
- Backend: Express 5, Drizzle ORM, PostgreSQL, Sharp (image processing)
- AI: Gemini Web2API (default), OpenRouter fallback, SSRF-guarded proxy endpoints
- Image Generation: DALL-E 3, Gemini via Cloudflare proxy, Unsplash fallback
- PWA: Not explicitly configured (uses manifest.webmanifest)

## Vercel Deployment Configuration
- Web app deployed via Vercel
- API server runs as serverless functions with Vite preview for API routes

## Audit Fixes (2026-07-05)

### API Client Base URL Wiring
- `artifacts/design-studio/src/main.tsx` — Already has `setBaseUrl(import.meta.env.VITE_API_BASE_URL)` configured correctly.

### Mobile / Touch Support
- Web app has responsive meta tags in index.html (`viewport-fit=cover`, `maximum-scale=5.0`)
- Fabric.js canvas supports touch events natively

### AI Integration
- `artifacts/api-server/src/routes/aiGenerate.ts` — Full AI ecosystem:
  - `/api/ai/generate` — Image generation with provider fallback
  - `/api/ai/style-transfer` — Style transfer endpoint
  - `/api/ai/remove-bg` — Sharp-based background removal
  - `/api/ai/chat` — LLM chat refinement
- SSRF protection with allowlisted provider URLs
- Curated Unsplash fallbacks when no API key provided

### Known Issues
- AI image generation requires API key for real provider calls
- Fabric.js canvas may have performance issues on mobile with many objects
- No dedicated mobile app (web app is responsive)

---

## Deployment Checklist
- [ ] Set environment variables in deployment platform
- [ ] Apply database migrations (`pnpm db:push` or direct SQL)
- [ ] Configure `VITE_API_BASE_URL` in Vercel dashboard to point to API server
- [ ] Configure `OPENROUTER_API_KEY` for AI image generation fallback

## Audit History
- 2026-07-09: Frontend route audit (chief-of-staff agent)
  - **Routes**: 14 routes crawled headless (wouter router, no auth gate). All render correct headings + real content (Dashboard, Projects, AI Concept Generation, Color Tools, Mockup Generator, Print Setup, Tech Packs, Manufacturing Hub, Collections, Settings, etc.). 0 JS/React errors, 0 missing chunks.
  - **Console errors**: All are `/api/*` 500s (api-server needs Postgres/Drizzle — not running locally) + `favicon.svg` 404 (dev-only artifact of forced base path; resolves correctly in Vercel where `BASE_PATH=/`). NOT code bugs.
  - **Build**: `cd artifacts/design-studio && pnpm build` passes (`vite build && cp -r api dist/public/`, 9.43s, `dist/public/index.html` + assets emitted). Sourcemap warnings harmless.
  - **Verdict**: UI not broken. No code fixes required. Backend (Postgres) must be provisioned for live data.
## Mobile UI Compliance (MOBILE-UI-STANDARD.md)
- **Status:** PASS (live: design-studio-beryl.vercel.app; console 6->0, taps 59->0)
- **Verified:** 2026-07-17 via /tmp/mobile_audit.mjs @390x844 (tap-target >=44px T-1, overflow, safe-area, console errors)
- **T-1 fix:** enforce 44x44px on touch/coarse + <=767px.
- **CORRECTION (2026-07-17 night):** The "gated behind DEV||VITE_API_ENABLED to silence 404s" note is now OUTDATED. The Phase-2 mock `api/` backend IS deployed and `VITE_API_ENABLED=true` is set on Vercel prod, so the frontend now actually calls the live API (dashboard renders from `/api/dashboard/summary`).

## Phase 2 Frontend↔Backend Integration — 2026-07-17 (night) — COMPLETE + LIVE
- A prior subagent falsely reported "done": the frontend made ZERO `/api` calls and `VITE_API_ENABLED` was `false` in prod. Integration never happened until this session.
- What shipped + is VERIFIED live at `design-studio-beryl.vercel.app`:
  - `VITE_API_ENABLED=true` set on Vercel prod (dashboard gate now on).
  - `api/` consolidated from 11 fragmented files into ONE `api/index.js` catch-all router (imports `_core.js` mock surface — in-memory, NO database).
  - `vercel.json` rewrite `"\/api\/(.*)" -> "\/api"` added because Vercel does NOT auto-funnel `/api/foo/bar` to `api/foo.js` (it looks for a file at the exact path) — without this, all sub-paths 404.
  - Fixed `health.js` `require("../_core.js")` bug (crashed -> `FUNCTION_INVOCATION_FAILED`).
- VERIFIED: 14/15 client-contract `/api/*` endpoints return 200 with real JSON (healthz, dashboard/summary+activity, projects, collections, tech-packs, mockups, mockup-templates, print-jobs, colors/extract, manufacturing/manufacturers+pricing, ai/jobs, assets). `/api/assets/1` returns the designed 404 (`"Asset not found"`) — legitimate empty mock state.
- Live dashboard renders from `/api/dashboard/summary`. Backend is MOCK/IN-MEMORY (no DB). AI endpoints (generate/style-transfer/remove-bg) return 501 by design.
- The separate `artifacts/api-server/` (Express 5 + Drizzle + Postgres) described above is a DIFFERENT, unrealized real-backend plan — NOT deployed. The shipped `api/` is the standalone mock serverless layer.
- Deploys are REMOTE (Vercel builds in-cloud) -> zero local RAM impact.
