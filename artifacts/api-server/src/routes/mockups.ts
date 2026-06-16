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

const TEMPLATES = [
  // ── Tops ─────────────────────────────────────────────────────────────────
  { id: "tshirt-front", name: "T-Shirt Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", tags: ["tshirt", "apparel"], anchorPoints: [[0.3,0.25],[0.7,0.25],[0.7,0.65],[0.3,0.65]] },
  { id: "tshirt-back", name: "T-Shirt Back", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1503341733017-1901578f9f1e?w=400", tags: ["tshirt", "apparel"], anchorPoints: [[0.28,0.22],[0.72,0.22],[0.72,0.62],[0.28,0.62]] },
  { id: "hoodie-front", name: "Hoodie Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400", tags: ["hoodie", "apparel"], anchorPoints: [[0.25,0.2],[0.75,0.2],[0.75,0.65],[0.25,0.65]] },
  { id: "hoodie-back", name: "Hoodie Back", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", tags: ["hoodie", "apparel"], anchorPoints: [[0.25,0.2],[0.75,0.2],[0.75,0.65],[0.25,0.65]] },
  { id: "longsleeve-front", name: "Long Sleeve Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1602810319250-a663f0af2f75?w=400", tags: ["longsleeve", "apparel"], anchorPoints: [[0.3,0.22],[0.7,0.22],[0.7,0.6],[0.3,0.6]] },
  { id: "longsleeve-back", name: "Long Sleeve Back", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=400", tags: ["longsleeve", "apparel"], anchorPoints: [[0.3,0.22],[0.7,0.22],[0.7,0.6],[0.3,0.6]] },
  { id: "crewneck-front", name: "Crewneck Sweatshirt", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400", tags: ["crewneck", "apparel"], anchorPoints: [[0.25,0.2],[0.75,0.2],[0.75,0.65],[0.25,0.65]] },
  { id: "crewneck-back", name: "Crewneck Back", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400", tags: ["crewneck", "apparel"], anchorPoints: [[0.25,0.2],[0.75,0.2],[0.75,0.65],[0.25,0.65]] },
  { id: "tank-front", name: "Tank Top Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400", tags: ["tank", "apparel"], anchorPoints: [[0.3,0.15],[0.7,0.15],[0.7,0.7],[0.3,0.7]] },
  { id: "polo-front", name: "Polo Shirt", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400", tags: ["polo", "apparel"], anchorPoints: [[0.3,0.25],[0.7,0.25],[0.7,0.65],[0.3,0.65]] },
  { id: "raglan-front", name: "Raglan / Baseball Tee", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400", tags: ["raglan", "baseball", "apparel"], anchorPoints: [[0.28,0.22],[0.72,0.22],[0.72,0.62],[0.28,0.62]] },
  { id: "zip-hoodie-front", name: "Zip Hoodie Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400", tags: ["hoodie", "zip", "apparel"], anchorPoints: [[0.28,0.18],[0.72,0.18],[0.72,0.62],[0.28,0.62]] },
  // ── Accessories ────────────────────────────────────────────────────────────
  { id: "cap-front", name: "Cap Front", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", tags: ["cap", "hat", "accessories"], anchorPoints: [[0.3,0.3],[0.7,0.3],[0.65,0.55],[0.35,0.55]] },
  { id: "cap-side", name: "Cap Side", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=400", tags: ["cap", "hat", "accessories"], anchorPoints: [[0.35,0.28],[0.65,0.28],[0.65,0.55],[0.35,0.55]] },
  { id: "tote-front", name: "Tote Bag", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=400", tags: ["tote", "bag", "accessories"], anchorPoints: [[0.22,0.2],[0.78,0.2],[0.78,0.75],[0.22,0.75]] },
  { id: "beanie-front", name: "Beanie", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1510598155970-c5e2eea8fdd1?w=400", tags: ["beanie", "hat", "accessories"], anchorPoints: [[0.3,0.2],[0.7,0.2],[0.7,0.55],[0.3,0.55]] },
  { id: "phone-case", name: "Phone Case", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400", tags: ["phone", "case", "accessories"], anchorPoints: [[0.22,0.15],[0.78,0.15],[0.78,0.85],[0.22,0.85]] },
  { id: "sticker-sheet", name: "Sticker Sheet", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1558171813-4f8d9f9c3b07?w=400", tags: ["sticker", "accessories"], anchorPoints: [[0.15,0.15],[0.85,0.15],[0.85,0.85],[0.15,0.85]] },
  // ── Flat goods ─────────────────────────────────────────────────────────────
  { id: "poster-a2", name: "Poster A2", category: "flat", thumbnailUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400", tags: ["poster", "print"], anchorPoints: [[0.1,0.08],[0.9,0.08],[0.9,0.92],[0.1,0.92]] },
  { id: "poster-a3", name: "Poster A3 (Framed)", category: "flat", thumbnailUrl: "https://images.unsplash.com/photo-1506792006437-256b665541e2?w=400", tags: ["poster", "print", "framed"], anchorPoints: [[0.12,0.1],[0.88,0.1],[0.88,0.9],[0.12,0.9]] },
  { id: "notebook-cover", name: "Notebook Cover", category: "flat", thumbnailUrl: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=400", tags: ["notebook", "print"], anchorPoints: [[0.15,0.1],[0.85,0.1],[0.85,0.9],[0.15,0.9]] },
  { id: "canvas-print", name: "Canvas Print", category: "flat", thumbnailUrl: "https://images.unsplash.com/photo-1578926288207-a90a5366e07b?w=400", tags: ["canvas", "print", "art"], anchorPoints: [[0.08,0.08],[0.92,0.08],[0.92,0.92],[0.08,0.92]] },
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
