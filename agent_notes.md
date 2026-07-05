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