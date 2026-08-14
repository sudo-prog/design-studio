# DESIGN.Studio

DESIGN.Studio is a comprehensive, print-first AI design studio platform designed to manage design projects from initial concept through to manufacturing. It integrates advanced AI image processing, project management, and print-on-demand workflows into a single professional workspace.

## Key Features

### 🎨 Design & Creative Tools
- **Advanced Design Editor** — A full-screen canvas for creating and refining design assets with layer management and professional tools.
- **AI-Powered Generation** — Integrated AI image generation and style transfer to rapidly iterate on creative concepts.
- **Color Intelligence** — Automatic color palette extraction from images to ensure brand and design consistency.
- **Lifestyle Compositing** — Tools to place product designs onto real-world scenes for realistic visualization.

### 📐 Technical Specification & Print
- **Automated Tech Packs** — Generate professional PDF technical packages and RFQs (Request for Quotes) for manufacturers.
- **Mockup System** — 3D mockup viewers and warp canvas tools for accurate perspective transforms on physical products.
- **Manufacturing Integration** — Built-in pricing integration with major print providers (Printful, Printify) to estimate costs in real-time.
- **Collection Management** — Organize designs into cohesive collections for batch manufacturing and release.

### 🛠️ Project & Workflow Management
- **End-to-End Pipeline** — Manage the entire lifecycle from asset upload and AI iteration to manufacturing order flow.
- **Asset Library** — Centralized repository for all design assets with tagging and versioning.
- **Manufacturing Dashboard** — Track orders, manufacturer selection, and production status.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS v4, shadcn/ui
- **Backend:** Express, Node.js (via Vercel Serverless)
- **Database:** PostgreSQL with Drizzle ORM
- **AI Integration:** OpenRouter AI, Custom AI Image Pipelines
- **Processing:** Sharp (Image processing), PDFKit/Puppeteer (Tech pack generation)
- **Deployment:** Vercel

## Getting Started

### Prerequisites
- Node.js (Latest LTS)
- pnpm (`npm install -g pnpm`)

### Installation
```bash
# Clone the repository
git clone https://github.com/sudo-prog/design-studio.git
cd design-studio

# Install dependencies
pnpm install
```

### Development
```bash
# Run the development server
pnpm run dev

# Typecheck the project
pnpm run typecheck
```

## License

This project is licensed under the MIT License.
