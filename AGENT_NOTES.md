# Agent Notes — DESIGN.Studio
**Last updated:** 2026-07-02
**Status:** Build + typecheck clean, deployed to Vercel (monorepo workspace root configured)

---

## Project Overview

Print-first AI design studio. Full-stack pnpm monorepo for managing design projects from concept through manufacturing. Handles project management, asset uploads, AI-generated designs, mockup generation, print job processing, tech pack PDF generation, and manufacturing order management with Printful/Printify integration.

- **Live URL:** https://design-studio-beryl.vercel.app
- **Stack:** pnpm monorepo, Node.js 24, TypeScript 5.9, Express 5, React 19, Vite, PostgreSQL, Drizzle ORM, OpenRouter AI
- **Artifacts:** design-studio (frontend), api-server (backend), mockup-sandbox
- **Deploy:** Vercel (linked from workspace root, buildCommand: `pnpm --filter design-studio build`)

---

## Architecture

### Monorepo Structure
```
artifacts/
  design-studio/    — React/Vite frontend (14 pages, components)
  api-server/       — Express API (14 route files, lib, uploads/)
  mockup-sandbox/   — UI component sandbox
lib/
  api-spec/         — OpenAPI YAML spec
  api-zod/          — Generated Zod schemas
  api-client-react/ — Generated React Query hooks
  db/               — Drizzle ORM schema (16 tables)
  integrations/
    openrouter-ai/  — OpenRouter AI client wrapper
scripts/            — Build/merge scripts
```

### Vercel Setup
- **Root Directory:** workspace root (`04_Design-Studio-Pro/`)
- **Build Command:** `pnpm --filter design-studio build`
- **Output Directory:** `artifacts/design-studio/dist/public`
- **Install:** `pnpm install --no-frozen-lockfile`
- **vercel.json:** at workspace root (not package subdirectory)

### API Routes (14 files)
| Route | Key Endpoints |
|-------|---------------|
| `/api/healthz` | GET health check |
| `/api/dashboard` | GET summary, GET recent-activity |
| `/api/projects` | CRUD + search/filter + history |
| `/api/assets` | Upload (multer+sharp), list, delete, thumbnail |
| `/api/colors` | List palettes, create palette, extract colors from image |
| `/api/ai-jobs` | List, create, approve, reject AI generation jobs |
| `/api/mockups` | List, create, template listing |
| `/api/print-jobs` | List, create, get detail |
| `/api/tech-packs` | List, create, generate PDF (pdf-lib) |
| `/api/manufacturing` | Pricing (Printful/Printify), manufacturers, orders, RFQ PDF |
| `/api/collections` | CRUD, batch operations |
| `/api/vectorize` | Image → SVG pixel trace (sharp + fflate) |
| `/api/ai-generate` | AI image generation (OpenRouter, allowlisted providers) |
| `/api/print-processing` | Pixel trace SVG, zip export |

### Database Schema (16 tables)
- **projects** — name, category, brief, vibe, status, coverAssetUrl, colorPalette[], printMethod, estimatedQuantity, githubRepo, githubPat, lastBackupAt, moodBoard[], timestamps
- **assets** — projectId, filename, url, thumbnailUrl, type, mimeType, width, height, fileSize, tags[]
- **colorPalettes** — name, colors[], source, tags[]
- **aiJobs** — projectId, type, status, prompt, result, approvedBy, timestamps
- **mockups** — projectId, templateId, settings, resultUrl, status
- **printJobs** — projectId, type, status, specifications, quantity, channels[]
- **techPacks** — projectId, data JSON, pdfUrl
- **manufacturers** — name, location, capabilities[], rating, isVerified
- **manufacturingOrders** — projectId, manufacturerId, status, pricing, timeline
- **collections** — name, description, coverAssetUrl
- **collectionProjects** — collectionId, projectId
- **batchJobs** — type, status, config, result
- **activityLog** — projectId, action, actor, metadata, timestamp
- **projectHistory** — projectId, action, snapshot, timestamp
- **conversations** — id, title, createdAt
- **messages** — id, conversationId, role, content, createdAt

### Frontend Pages (14)
Dashboard, Projects, NewProject, ProjectDetail, Editor (full-screen), AiHub, Colors, Mockups, Print, TechPacks, Manufacturing, Collections, Settings, NotFound

### Frontend Components
ai/, editor/, layout.tsx, mockup/ (warp-canvas, template-picker, viewer-3d, lifestyle-compositor), mood-board.tsx, project-assets.tsx, project-history.tsx, ui/

---

## AI Configuration
- **Default Provider:** `gemini-web2api` (model: `gemini-3.5-flash`) — runs locally via gemini-web2api proxy at `http://localhost:8081/v1`
- **Fallback Provider:** OpenRouter — uses `OPENROUTER_API_KEY` env var, defaults to `openrouter/free` model
- **Self-Heal:** `artifacts/design-studio/src/lib/ai-self-heal.ts` — provides DOM snapshot, EVAL, FIX_NOTIFICATIONS, and CLEAR_STALE operations
- **Provider Fallback Order:** Gemini Web2API → OpenRouter → Ollama (local)
- **Key Files:**
  - `artifacts/api-server/src/routes/aiGenerate.ts` — AI generation routes with gemini-web2api default
  - `lib/integrations/openrouter-ai/src/client.ts` — OpenRouter AI client wrapper
  - `artifacts/design-studio/src/lib/ai-self-heal.ts` — Self-healing AI capability

## Session History
- **2026-07-03:** Updated default AI provider from `openrouter` to `gemini-web2api` with model `gemini-3.5-flash`. Added localhost:8081 to allowlisted provider endpoints. Added `ai-self-heal.ts` — self-healing AI capability for DOM inspection, JS fixes, notification dismissal, and stale element cleanup. Added OpenRouter fallback support.
- **2026-07-02:** Fixed `prompt()` blocking calls in `src/pages/ai.tsx` replaced with inline form. TypeScript typecheck passes. Local build succeeds (16.5s). Fixed Vercel monorepo deployment by linking from workspace root with correct `vercel.json`. Redeployed successfully.
- **2026-06-22:** Initial project notes recorded.

---

## Vercel Deployment Configuration (2026-07-03)

**GitHub Workflow:** `.github/workflows/deploy.yml`
- Updated to use Vercel deployment instead of GitHub Pages
- Triggers on push to `main` and pull requests
- Build: `pnpm --filter @workspace/design-studio run build`
- Requires secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_GITHUB_TOKEN`

---

## Known Issues
- **Vercel monorepo:** must link from workspace root, not package subdirectory
- No authentication implemented yet
- OpenRouter API key required for AI features
- Printful/Printify API keys required for manufacturing pricing
- Uploads directory needs to be created: `artifacts/api-server/uploads/`

---

## Common Pitfalls
- **Drizzle numeric columns** returned as `string` — always cast before arithmetic
- **File uploads** — multer stores to `artifacts/api-server/uploads/` (must exist)
- **Sharp image processing** — ensure libvips is installed on target system
- **PDF generation** — pdf-lib has no async API, all operations are synchronous
- **Vectorize** — pixel trace can be memory-intensive on large images
- **OpenRouter** — provider allowlist must be updated for new AI providers
- **API client hooks** — run `pnpm --filter @workspace/api-client-react run codegen` after schema changes
- **pnpm catalog:** — `catalog:` refs only resolve from workspace root; Vercel rootDirectory must be workspace root

---

## File Reference
| Path | Purpose |
|------|---------|
| `artifacts/api-server/src/routes/aiGenerate.ts` | AI generation routes (default: gemini-web2api, fallback: openrouter) |
| `artifacts/design-studio/src/lib/ai-self-heal.ts` | Self-healing AI capability |
| `artifacts/api-server/src/app.ts` | Express app setup |
| `artifacts/api-server/src/routes/index.ts` | Route aggregation (14 routes) |
| `artifacts/api-server/src/routes/projects.ts` | Project CRUD + history |
| `artifacts/api-server/src/routes/assets.ts` | Multer upload + sharp processing |
| `artifacts/api-server/src/routes/aiGenerate.ts` | AI image generation |
| `artifacts/api-server/src/routes/aiJobs.ts` | AI job queue |
| `artifacts/api-server/src/routes/mockups.ts` | Mockup generation |
| `artifacts/api-server/src/routes/printJobs.ts` | Print job management |
| `artifacts/api-server/src/routes/techPacks.ts` | Tech pack PDF generation |
| `artifacts/api-server/src/routes/manufacturing.ts` | Printful/Printify + orders |
| `artifacts/api-server/src/routes/pdfGen.ts` | PDF generation utilities |
| `artifacts/api-server/src/routes/vectorize.ts` | Image → SVG pixel trace |
| `artifacts/api-server/src/routes/printProcessing.ts` | Print processing pipeline |
| `artifacts/design-studio/src/App.tsx` | React app root with routing |
| `artifacts/design-studio/src/pages/editor.tsx` | Full-screen design editor |
| `artifacts/design-studio/src/pages/ai.tsx` | AI hub (fixed: removed blocking prompt() calls) |
| `artifacts/design-studio/src/components/mockup/` | Mockup components (3D, warp, lifestyle) |
| `lib/db/src/schema/` | All 16 Drizzle table definitions |
| `lib/integrations/openrouter-ai/` | OpenRouter AI client |
| `vercel.json` | Vercel config at workspace root |

---

# CURRENT NOTES (merged 2026-07-28 from lowercase agent_notes.md duplicate — this section is NEWER, includes 2026-07-17 Phase-2 live API integration; where it conflicts with the 2026-07-02 sections above, THIS section is authoritative)


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
