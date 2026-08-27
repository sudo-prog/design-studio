import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { mockupsTable, activityLogTable, projectsTable } from "@workspace/db";
import {
  ListMockupsQueryParams,
  CreateMockupBody,
  ListMockupTemplatesQueryParams,
  ListMockupsResponse,
  ListMockupTemplatesResponse,
} from "@workspace/api-zod";

// Base path for bundled local SVG assets (served from atelier-studio/public/mockups/).
// The atelier-studio Vite dev server serves these under its BASE_URL prefix.
// We store relative paths; clients resolve them against their own origin.
const MOCKUP_ASSET_BASE = "/mockups";

function localSvg(file: string) {
  return `${MOCKUP_ASSET_BASE}/${file}`;
}

const TEMPLATES = [
  // ── Tops ─────────────────────────────────────────────────────────────────
  { id: "tshirt-front",     name: "T-Shirt Front",       category: "tops",        thumbnailUrl: localSvg("tshirt-front.svg"),     tags: ["tshirt","apparel"],           anchorPoints: [[0.30,0.25],[0.70,0.25],[0.70,0.65],[0.30,0.65]] },
  { id: "tshirt-back",      name: "T-Shirt Back",        category: "tops",        thumbnailUrl: localSvg("tshirt-back.svg"),      tags: ["tshirt","apparel"],           anchorPoints: [[0.28,0.22],[0.72,0.22],[0.72,0.62],[0.28,0.62]] },
  { id: "hoodie-front",     name: "Hoodie Front",        category: "tops",        thumbnailUrl: localSvg("hoodie-front.svg"),     tags: ["hoodie","apparel"],           anchorPoints: [[0.25,0.20],[0.75,0.20],[0.75,0.65],[0.25,0.65]] },
  { id: "hoodie-back",      name: "Hoodie Back",         category: "tops",        thumbnailUrl: localSvg("hoodie-back.svg"),      tags: ["hoodie","apparel"],           anchorPoints: [[0.25,0.20],[0.75,0.20],[0.75,0.65],[0.25,0.65]] },
  { id: "longsleeve-front", name: "Long Sleeve Front",   category: "tops",        thumbnailUrl: localSvg("longsleeve-front.svg"), tags: ["longsleeve","apparel"],       anchorPoints: [[0.30,0.22],[0.70,0.22],[0.70,0.60],[0.30,0.60]] },
  { id: "crewneck-front",   name: "Crewneck Sweatshirt", category: "tops",        thumbnailUrl: localSvg("crewneck-front.svg"),   tags: ["crewneck","apparel"],         anchorPoints: [[0.25,0.20],[0.75,0.20],[0.75,0.65],[0.25,0.65]] },
  { id: "tank-front",       name: "Tank Top",            category: "tops",        thumbnailUrl: localSvg("tank-front.svg"),       tags: ["tank","apparel"],             anchorPoints: [[0.30,0.15],[0.70,0.15],[0.70,0.70],[0.30,0.70]] },
  { id: "polo-front",       name: "Polo Shirt",          category: "tops",        thumbnailUrl: localSvg("polo-front.svg"),       tags: ["polo","apparel"],             anchorPoints: [[0.30,0.25],[0.70,0.25],[0.70,0.65],[0.30,0.65]] },
  { id: "raglan-front",     name: "Raglan / Baseball Tee", category: "tops",      thumbnailUrl: localSvg("raglan-front.svg"),     tags: ["raglan","baseball","apparel"],anchorPoints: [[0.28,0.22],[0.72,0.22],[0.72,0.62],[0.28,0.62]] },
  { id: "zip-hoodie-front", name: "Zip Hoodie Front",    category: "tops",        thumbnailUrl: localSvg("zip-hoodie-front.svg"), tags: ["hoodie","zip","apparel"],     anchorPoints: [[0.28,0.18],[0.72,0.18],[0.72,0.62],[0.28,0.62]] },
  // ── Accessories ────────────────────────────────────────────────────────────
  { id: "cap-front",        name: "Cap Front",           category: "accessories", thumbnailUrl: localSvg("cap-front.svg"),        tags: ["cap","hat","accessories"],    anchorPoints: [[0.30,0.30],[0.70,0.30],[0.65,0.55],[0.35,0.55]] },
  { id: "tote-front",       name: "Tote Bag",            category: "accessories", thumbnailUrl: localSvg("tote-front.svg"),       tags: ["tote","bag","accessories"],   anchorPoints: [[0.22,0.20],[0.78,0.20],[0.78,0.75],[0.22,0.75]] },
  { id: "phone-case",       name: "Phone Case",          category: "accessories", thumbnailUrl: localSvg("phone-case.svg"),       tags: ["phone","case","accessories"], anchorPoints: [[0.22,0.15],[0.78,0.15],[0.78,0.85],[0.22,0.85]] },
  { id: "beanie-front",     name: "Beanie",              category: "accessories", thumbnailUrl: localSvg("beanie-front.svg"),     tags: ["beanie","hat","accessories"], anchorPoints: [[0.30,0.20],[0.70,0.20],[0.70,0.55],[0.30,0.55]] },
  { id: "sticker-sheet",    name: "Sticker Sheet",       category: "accessories", thumbnailUrl: localSvg("sticker-sheet.svg"),    tags: ["sticker","accessories"],      anchorPoints: [[0.15,0.15],[0.85,0.15],[0.85,0.85],[0.15,0.85]] },
  { id: "mug-wrap",         name: "Mug Wrap",            category: "accessories", thumbnailUrl: localSvg("mug-wrap.svg"),         tags: ["mug","drinkware"],            anchorPoints: [[0.22,0.28],[0.78,0.28],[0.78,0.84],[0.22,0.84]] },
  { id: "pin-button",       name: "Pin / Button Badge",  category: "accessories", thumbnailUrl: localSvg("pin-button.svg"),       tags: ["pin","button","accessories"], anchorPoints: [[0.15,0.15],[0.85,0.15],[0.85,0.85],[0.15,0.85]] },
  // ── Flat goods ─────────────────────────────────────────────────────────────
  { id: "poster-a2",        name: "Poster A2",           category: "flat",        thumbnailUrl: localSvg("poster-a2.svg"),        tags: ["poster","print"],             anchorPoints: [[0.10,0.08],[0.90,0.08],[0.90,0.92],[0.10,0.92]] },
  { id: "poster-a3",        name: "Poster A3 (Framed)",  category: "flat",        thumbnailUrl: localSvg("poster-a3.svg"),        tags: ["poster","print","framed"],    anchorPoints: [[0.12,0.10],[0.88,0.10],[0.88,0.90],[0.12,0.90]] },
  { id: "notebook-cover",   name: "Notebook Cover",      category: "flat",        thumbnailUrl: localSvg("notebook-cover.svg"),   tags: ["notebook","print"],           anchorPoints: [[0.26,0.10],[0.86,0.10],[0.86,0.88],[0.26,0.88]] },
  { id: "canvas-print",     name: "Canvas Print",        category: "flat",        thumbnailUrl: localSvg("canvas-print.svg"),     tags: ["canvas","print","art"],       anchorPoints: [[0.08,0.08],[0.92,0.08],[0.92,0.92],[0.08,0.92]] },
];

const router: IRouter = Router();

router.get("/mockups", async (req, res): Promise<void> => {
  const query = ListMockupsQueryParams.safeParse(req.query);
  let q = db.select().from(mockupsTable).$dynamic();
  if (query.success && query.data.projectId) {
    q = q.where(eq(mockupsTable.projectId, query.data.projectId));
  }
  const mockups = await q.orderBy(desc(mockupsTable.createdAt));
  res.json(ListMockupsResponse.parse(mockups));
});

router.post("/mockups", async (req, res): Promise<void> => {
  const parsed = CreateMockupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const template = TEMPLATES.find((t) => t.id === parsed.data.templateId);
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  const [mockup] = await db
    .insert(mockupsTable)
    .values({
      projectId: parsed.data.projectId,
      templateId: parsed.data.templateId,
      designAssetUrl: parsed.data.designAssetUrl,
      garmentColor: parsed.data.garmentColor ?? "#FFFFFF",
      blendMode: parsed.data.blendMode ?? "multiply",
      resultUrl: template?.thumbnailUrl ?? null,
      status: "completed",
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "mockup_generated",
    description: `Mockup generated on ${template?.name ?? parsed.data.templateId}`,
    projectId: parsed.data.projectId,
    projectName: project?.name ?? null,
  });
  res.status(201).json(mockup);
});

router.get("/mockup-templates", async (req, res): Promise<void> => {
  const query = ListMockupTemplatesQueryParams.safeParse(req.query);
  let templates = TEMPLATES;
  if (query.success && query.data.category) {
    templates = templates.filter((t) => t.category === query.data.category);
  }
  res.json(ListMockupTemplatesResponse.parse(templates));
});

export default router;
