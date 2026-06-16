import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { techPacksTable, activityLogTable, projectsTable } from "@workspace/db";
import {
  ListTechPacksQueryParams,
  CreateTechPackBody,
  ListTechPacksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tech-packs", async (req, res): Promise<void> => {
  const query = ListTechPacksQueryParams.safeParse(req.query);
  let q = db.select().from(techPacksTable).$dynamic();
  if (query.success && query.data.projectId) {
    q = q.where(eq(techPacksTable.projectId, query.data.projectId));
  }
  const packs = await q.orderBy(desc(techPacksTable.createdAt));
  res.json(ListTechPacksResponse.parse(packs));
});

router.post("/tech-packs", async (req, res): Promise<void> => {
  const parsed = CreateTechPackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  const [pack] = await db
    .insert(techPacksTable)
    .values({
      projectId: parsed.data.projectId,
      title: parsed.data.title ?? `Tech Pack — ${project?.name ?? ""}`,
      garmentType: parsed.data.garmentType ?? null,
      printMethod: parsed.data.printMethod ?? null,
      placement: parsed.data.placement ?? null,
      dimensions: parsed.data.dimensions ?? null,
      colorCount: parsed.data.colorCount ?? null,
      notes: parsed.data.notes ?? null,
      mockupAssetUrl: parsed.data.mockupAssetUrl ?? null,
      status: "completed",
      pdfUrl: null,
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "tech_pack_generated",
    description: `Tech pack generated for "${project?.name ?? ""}"`,
    projectId: parsed.data.projectId,
    projectName: project?.name ?? null,
  });
  res.status(201).json(pack);
});

export default router;
