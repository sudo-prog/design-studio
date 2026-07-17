# Dev Roadmap — DESIGN.Studio

## Phase 1: Foundation ✅
- [x] pnpm monorepo scaffold
- [x] PostgreSQL + Drizzle ORM schema (16 tables)
- [x] Express API server (CORS, pino logging, file uploads)
- [x] OpenRouter AI integration
- [x] Full REST API (14 route files)
- [x] PDF generation (tech packs, RFQ)
- [x] Image processing (sharp: thumbnails, color extraction, vectorization)
- [x] Printful/Printify pricing integration
- [x] React/Vite frontend (14 pages)
- [x] Full-screen editor
- [x] Wouter routing, React Query
- [x] Tailwind CSS v4 + shadcn UI library
- [x] PWA service worker
- [x] Mockup sandbox

## Phase 2: Frontend-Backend Integration
- [ ] Wire API client hooks to all frontend pages
- [ ] Project CRUD: create, edit, delete, detail view
- [ ] Asset upload UI (drag-drop, preview, tagging)
- [ ] AI job queue UI (create, approve, reject)
- [ ] Error handling + toast notifications
- [ ] Loading states + optimistic updates

## Phase 3: Core Features
- [ ] Design editor (canvas, layers, tools)
- [ ] Mockup 3D viewer
- [ ] Warp canvas (perspective transform)
- [ ] Lifestyle compositor (product-on-scene)
- [ ] Color palette extractor
- [ ] AI image generation UI
- [ ] Project history + snapshots
- [ ] Activity log viewer

## Phase 4: Print Workflow
- [ ] Print job creation and management
- [ ] Tech pack PDF preview + download
- [ ] Manufacturing order flow
- [ ] RFQ generation + manufacturer selection
- [ ] Collection management
- [ ] Batch operations

## Phase 5: Polish & Deploy
- [ ] Authentication
- [ ] Database migrations
- [ ] GitHub backup integration
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Deployment pipeline

## 2026-07-17 (evening) — Deploy reconciliation
- Redeployed committed state to prod after crash left URL at 404 → design-studio-beryl.vercel.app now HTTP 200.
- IMPORTANT: the uncommitted `api/` backend feature (Phase 2: generate/jobs/style-transfer/mockups/projects/tech-packs etc, 25 files) was HELD BACK from this deploy (stash → deploy committed → pop). It is unverified and no frontend imports it yet. Do NOT deploy until wired + tested.

## 2026-07-17 (night) — Phase 2 Frontend-Backend Integration COMPLETE (build green)
- Subagent wired Dashboard/Colors/Collections/Manufacturing/Assets pages to the generated @workspace/api-client-react hooks; fixed dashboard.tsx queryKey typecheck; added /assets route + nav; polished manufacturing toasts.
- Subagent reported "done" but LEFT THE BUILD RED (4 `Cannot find name 'toast'` in manufacturing.tsx) and never ran vite build. Orchestrator applied the missing `import { useToast } from "@/hooks/use-toast"` + `const { toast } = useToast()` and VERIFIED green:
  - `npx tsc -p tsconfig.json --noEmit` → 0 errors
  - `npx vite build` → built in 12.41s (exit 0)
  - root `pnpm run typecheck` → 0 errors (libs + design-studio + api-server)
- NOTE: the api/ mock backend (Phase 2) is wired but EXCEEDS Vercel Hobby 12-serverless-fn limit — DO NOT `vercel deploy` until on a Pro team or fn count reduced. Code is local + uncommitted (held back from prod).

## 2026-07-17 (night) — Phase 2 backend INTEGRATED + LIVE (corrected)
- Earlier "done" was FALSE: subagent built api/ + client libs but frontend had ZERO /api calls and VITE_API_ENABLED was false in prod. Nothing was actually integrated.
- Integration delivered + verified this session:
  - Set VITE_API_ENABLED=true on Vercel prod (dashboard gate now on).
  - Consolidated fragmented api/*.js (11 files, several 404/500) into a SINGLE api/index.js catch-all router (imports _core.js mock surface).
  - Added vercel.json rewrite funnel: "/api/(.*)" -> "/api" so all sub-paths hit the catch-all (Vercel does NOT auto-route /api/foo/bar to api/foo.js).
  - Fixed health.js require("../_core.js") bug (was crashing -> FUNCTION_INVOCATION_FAILED).
- VERIFIED LIVE: 14/15 contract endpoints return 200 with real JSON (healthz, dashboard/summary, dashboard/activity, projects, collections, tech-packs, mockups, mockup-templates, print-jobs, colors/extract, manufacturing/manufacturers, manufacturing/pricing, ai/jobs, assets). /api/assets/1 returns designed 404 ("Asset not found") — legitimate empty mock state.
- Live dashboard (design-studio-beryl.vercel.app) now renders data from /api/dashboard/summary.
- Backend is MOCK/IN-MEMORY (no DB). AI endpoints (generate/style-transfer/remove-bg) return 501 Not Implemented by design.
- NOTE: api/ exceeds nothing — 2 files total now. Deploys are remote (RAM-safe).
