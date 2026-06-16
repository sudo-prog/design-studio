import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  collectionsTable,
  collectionProjectsTable,
  batchJobsTable,
  projectsTable,
} from "@workspace/db";
import {
  ListCollectionsResponse,
  CreateCollectionBody,
  GetCollectionParams,
  GetCollectionResponse,
  UpdateCollectionParams,
  UpdateCollectionBody,
  DeleteCollectionParams,
  StartBatchExportParams,
  StartBatchExportBody,
  GetCollectionStatsParams,
  GetCollectionStatsResponse,
} from "@workspace/api-zod";

async function getCollectionWithProjectIds(id: number) {
  const [collection] = await db
    .select()
    .from(collectionsTable)
    .where(eq(collectionsTable.id, id));
  if (!collection) return null;
  const links = await db
    .select({ projectId: collectionProjectsTable.projectId })
    .from(collectionProjectsTable)
    .where(eq(collectionProjectsTable.collectionId, id));
  return { ...collection, projectIds: links.map((l) => l.projectId) };
}

const router: IRouter = Router();

router.get("/collections", async (_req, res): Promise<void> => {
  const collections = await db
    .select()
    .from(collectionsTable)
    .orderBy(desc(collectionsTable.updatedAt));
  const withIds = await Promise.all(
    collections.map(async (c) => {
      const links = await db
        .select({ projectId: collectionProjectsTable.projectId })
        .from(collectionProjectsTable)
        .where(eq(collectionProjectsTable.collectionId, c.id));
      return { ...c, projectIds: links.map((l) => l.projectId) };
    })
  );
  res.json(ListCollectionsResponse.parse(withIds));
});

router.post("/collections", async (req, res): Promise<void> => {
  const parsed = CreateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [collection] = await db
    .insert(collectionsTable)
    .values({ name: parsed.data.name, season: parsed.data.season ?? null })
    .returning();
  if (parsed.data.projectIds?.length) {
    await db.insert(collectionProjectsTable).values(
      parsed.data.projectIds.map((pid) => ({ collectionId: collection.id, projectId: pid }))
    );
  }
  const result = await getCollectionWithProjectIds(collection.id);
  res.status(201).json(result);
});

router.get("/collections/:id", async (req, res): Promise<void> => {
  const params = GetCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getCollectionWithProjectIds(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }
  res.json(GetCollectionResponse.parse(result));
});

router.patch("/collections/:id", async (req, res): Promise<void> => {
  const params = UpdateCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.season !== undefined) updateData.season = parsed.data.season;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  const [updated] = await db
    .update(collectionsTable)
    .set(updateData)
    .where(eq(collectionsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }
  if (parsed.data.projectIds !== undefined) {
    await db
      .delete(collectionProjectsTable)
      .where(eq(collectionProjectsTable.collectionId, params.data.id));
    if (parsed.data.projectIds.length) {
      await db.insert(collectionProjectsTable).values(
        parsed.data.projectIds.map((pid) => ({ collectionId: params.data.id, projectId: pid }))
      );
    }
  }
  const result = await getCollectionWithProjectIds(params.data.id);
  res.json(result);
});

router.delete("/collections/:id", async (req, res): Promise<void> => {
  const params = DeleteCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(collectionsTable)
    .where(eq(collectionsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/collections/:id/batch", async (req, res): Promise<void> => {
  const params = StartBatchExportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = StartBatchExportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const links = await db
    .select()
    .from(collectionProjectsTable)
    .where(eq(collectionProjectsTable.collectionId, params.data.id));
  const [job] = await db
    .insert(batchJobsTable)
    .values({
      collectionId: params.data.id,
      action: parsed.data.action,
      status: "pending",
      totalItems: links.length,
      completedItems: 0,
    })
    .returning();
  res.status(201).json(job);
});

router.get("/collections/:id/stats", async (req, res): Promise<void> => {
  const params = GetCollectionStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const links = await db
    .select({ projectId: collectionProjectsTable.projectId })
    .from(collectionProjectsTable)
    .where(eq(collectionProjectsTable.collectionId, params.data.id));
  const projectIds = links.map((l) => l.projectId);
  let readyToPrint = 0;
  if (projectIds.length > 0) {
    const readyProjects = await db
      .select()
      .from(projectsTable)
      .where(inArray(projectsTable.id, projectIds));
    readyToPrint = readyProjects.filter((p) => p.status === "ready").length;
  }
  res.json(
    GetCollectionStatsResponse.parse({
      collectionId: params.data.id,
      totalDesigns: projectIds.length,
      readyToPrint,
      orderedCount: 0,
      projectedCogs: projectIds.length * 450,
      projectedRevenue: projectIds.length * 1575,
      projectedMarginPercent: 71.4,
    })
  );
});

export default router;
