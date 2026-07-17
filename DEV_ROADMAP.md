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
