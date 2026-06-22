# Agent Notes — DESIGN.Studio
**Last updated:** 2026-06-22
**Status:** Full-stack application complete — needs deployment and testing

---

## Project Overview

Print-first AI design studio. Full-stack pnpm monorepo for managing design projects from concept through manufacturing. Handles project management, asset uploads, AI-generated designs, mockup generation, print job processing, tech pack PDF generation, and manufacturing order management with Printful/Printify integration.

- **Stack:** pnpm monorepo, Node.js 24, TypeScript 5.9, Express 5, React 19, Vite, PostgreSQL, Drizzle ORM, OpenRouter AI
- **Artifacts:** design-studio (frontend), api-server (backend), mockup-sandbox
- **DB tables:** 16 tables (projects, assets, colorPalettes, aiJobs, mockups, printJobs, techPacks, manufacturers, manufacturingOrders, collections, collectionProjects, batchJobs, activityLog, projectHistory, conversations, messages)

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

## Key Features

### AI Integration
- **OpenRouter AI** — allowlisted providers (OpenRouter, OpenAI, Groq, Ollama/local)
- **AI Jobs** — async job queue with approval workflow
- **AI Generate** — image generation with provider allowlist
- **Color extraction** — extract palette from uploaded images (sharp)

### Print Workflow
- **Mockup generation** — template-based with 3D viewer, warp canvas, lifestyle compositor
- **Print processing** — pixel trace to SVG, zip export
- **Tech pack PDF** — full PDF generation with pdf-lib (colors, pantone, CMYK, garment specs)
- **Manufacturing** — Printful/Printify pricing integration, manufacturer directory, order management, RFQ PDF generation

### Asset Management
- **Multer + Sharp** — image upload with thumbnail generation
- **Vectorize** — raster image → SVG pixel trace (sharp + fflate)
- **Project history** — snapshot-based versioning
- **Activity log** — audit trail of all actions

---

## Development Roadmap

### Completed
- [x] pnpm monorepo scaffold
- [x] PostgreSQL + Drizzle ORM schema (16 tables)
- [x] Express API server (CORS, pino logging, file uploads)
- [x] Full REST API (14 route files)
- [x] OpenRouter AI integration (allowlisted providers)
- [x] PDF generation (tech packs, RFQ)
- [x] Image processing (sharp: thumbnails, color extraction, vectorization)
- [x] Printful/Printify pricing integration
- [x] React/Vite frontend (14 pages)
- [x] Full-screen editor with project context
- [x] Wouter routing, React Query
- [x] Tailwind CSS v4 + shadcn-style UI library
- [x] PWA service worker
- [x] Mockup sandbox

### In Progress / Not Yet Built
- [ ] Frontend-backend integration (API client hooks → pages)
- [ ] Project CRUD UI wiring
- [ ] Asset upload UI wiring
- [ ] AI job queue UI
- [ ] Mockup 3D viewer implementation
- [ ] Print job management UI
- [ ] Tech pack PDF preview
- [ ] Manufacturing order flow
- [ ] Collection management UI
- [ ] Settings page implementation
- [ ] GitHub backup integration
- [ ] Database migrations
- [ ] Authentication
- [ ] Deployment pipeline
- [ ] E2E tests

### Known Issues
- pnpm-workspace.yaml has Replit-specific packages in catalog
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

---

## File Reference
| Path | Purpose |
|------|---------|
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
| `artifacts/design-studio/src/components/mockup/` | Mockup components (3D, warp, lifestyle) |
| `lib/db/src/schema/` | All 16 Drizzle table definitions |
| `lib/integrations/openrouter-ai/` | OpenRouter AI client |
