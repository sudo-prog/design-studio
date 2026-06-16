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
  { id: "tshirt-front", name: "T-Shirt Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", tags: ["tshirt", "apparel"] },
  { id: "tshirt-back", name: "T-Shirt Back", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1503341733017-1901578f9f1e?w=400", tags: ["tshirt", "apparel"] },
  { id: "hoodie-front", name: "Hoodie Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400", tags: ["hoodie", "apparel"] },
  { id: "hoodie-back", name: "Hoodie Back", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", tags: ["hoodie", "apparel"] },
  { id: "cap-front", name: "Cap Front", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", tags: ["cap", "accessories"] },
  { id: "tote-front", name: "Tote Bag", category: "accessories", thumbnailUrl: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=400", tags: ["tote", "accessories"] },
  { id: "longsleeve-front", name: "Long Sleeve Front", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1602810319250-a663f0af2f75?w=400", tags: ["longsleeve", "apparel"] },
  { id: "crewneck-front", name: "Crewneck Sweatshirt", category: "tops", thumbnailUrl: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400", tags: ["crewneck", "apparel"] },
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
