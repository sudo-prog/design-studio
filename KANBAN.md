# Kanban — DESIGN.Studio (Updated 2026-06-22)

## 🔴 In Progress
- [ ] **Phase 2: Frontend-Backend Integration** (all pages need API wiring)
  - [ ] Dashboard page — wire to `/api/dashboard` summary + recent-activity
  - [ ] Projects list — wire to `/api/projects` CRUD
  - [ ] Project Detail — wire to `/api/projects/:id` + history
  - [ ] Project New — wire to POST `/api/projects`
  - [ ] Asset upload UI — wire to `/api/assets` (drag-drop, preview, tagging)
  - [ ] AI Hub — wire to `/api/ai-jobs` (create, approve, reject)
  - [ ] Colors — wire to `/api/colors` (palette list, extract from image)
  - [ ] Mockups — wire to `/api/mockups` (template listing, create)
  - [ ] Print — wire to `/api/print-jobs` (list, create, detail)
  - [ ] TechPacks — wire to `/api/tech-packs` (list, create, PDF preview)
  - [ ] Manufacturing — wire to `/api/manufacturing` (pricing, orders, RFQ)
  - [ ] Collections — wire to `/api/collections` (CRUD, batch ops)
  - [ ] Settings — wire LLM config save/load
  - [ ] Error handling + toast notifications (global)
  - [ ] Loading states + optimistic updates

## 🟡 To Do (Phase 3 — Core Features)
- [ ] Design editor (canvas, layers, tools) — canvas-editor.tsx exists, needs tool implementations
- [ ] Mockup 3D viewer — viewer-3d.tsx exists, needs Three.js integration
- [ ] Warp canvas (perspective transform) — warp-canvas.tsx exists, needs perspective matrix
- [ ] Lifestyle compositor (product-on-scene) — lifestyle-compositor.tsx exists
- [ ] Color palette extractor — needs full UI wiring
- [ ] AI image generation UI — ai.tsx exists, needs generation flow
- [ ] Project history + snapshots — project-history.tsx exists
- [ ] Activity log viewer — needs new component

## 🟢 To Do (Phase 4 — Print Workflow)
- [ ] Print job creation and management UI
- [ ] Tech pack PDF preview + download
- [ ] Manufacturing order flow
- [ ] RFQ generation + manufacturer selection
- [ ] Collection management UI
- [ ] Batch operations

## 🔵 To Do (Phase 5 — Polish & Deploy)
- [ ] Authentication (JWT or session-based)
- [ ] Database migrations (DrizzleKit)
- [ ] GitHub backup integration
- [ ] E2E tests (Playwright)
- [ ] Performance optimization (code splitting, lazy loading)
- [ ] Deployment pipeline (Docker or Vercel/Railway)

## ✅ Done
- [x] Monorepo scaffold
- [x] DB schema (16 tables)
- [x] Express API (14 routes)
- [x] OpenRouter AI integration
- [x] PDF generation
- [x] Image processing (sharp)
- [x] Printful/Printify integration
- [x] Frontend pages (14)
- [x] Editor scaffold
- [x] UI library
- [x] PWA
