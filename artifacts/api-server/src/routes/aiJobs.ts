import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { aiJobsTable, activityLogTable, projectsTable } from "@workspace/db";
import {
  ListAiJobsQueryParams,
  CreateAiJobBody,
  GetAiJobParams,
  ApproveAiJobParams,
  RejectAiJobParams,
  ListAiJobsResponse,
  GetAiJobResponse,
  ApproveAiJobResponse,
  RejectAiJobResponse,
} from "@workspace/api-zod";

const MOCK_RESULTS = [
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
  "https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=800",
  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",
];

const router: IRouter = Router();

router.get("/ai/jobs", async (req, res): Promise<void> => {
  const query = ListAiJobsQueryParams.safeParse(req.query);
  let q = db.select().from(aiJobsTable).$dynamic();
  if (query.success) {
    if (query.data.projectId) {
      q = q.where(eq(aiJobsTable.projectId, query.data.projectId));
    } else if (query.data.status) {
      q = q.where(eq(aiJobsTable.status, query.data.status));
    }
  }
  const jobs = await q.orderBy(desc(aiJobsTable.createdAt));
  res.json(ListAiJobsResponse.parse(jobs));
});

router.post("/ai/jobs", async (req, res): Promise<void> => {
  const parsed = CreateAiJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const qty = parsed.data.quantity ?? 1;
  const results = MOCK_RESULTS.slice(0, Math.min(qty, MOCK_RESULTS.length));
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  const [job] = await db
    .insert(aiJobsTable)
    .values({
      projectId: parsed.data.projectId,
      type: parsed.data.type,
      status: "completed",
      prompt: parsed.data.prompt,
      negativePrompt: parsed.data.negativePrompt ?? null,
      provider: parsed.data.provider ?? "dall-e-3",
      model: parsed.data.model ?? "dall-e-3",
      aspectRatio: parsed.data.aspectRatio ?? null,
      quantity: qty,
      sourceAssetUrl: parsed.data.sourceAssetUrl ?? null,
      resultUrls: results,
      selectedResultUrl: results[0] ?? null,
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "ai_job_completed",
    description: `AI ${parsed.data.type.replace(/_/g, " ")} completed`,
    projectId: parsed.data.projectId,
    projectName: project?.name ?? null,
  });
  res.status(201).json(GetAiJobResponse.parse(job));
});

router.get("/ai/jobs/:id", async (req, res): Promise<void> => {
  const params = GetAiJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db
    .select()
    .from(aiJobsTable)
    .where(eq(aiJobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "AI job not found" });
    return;
  }
  res.json(GetAiJobResponse.parse(job));
});

router.post("/ai/jobs/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveAiJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db
    .update(aiJobsTable)
    .set({ status: "approved" })
    .where(eq(aiJobsTable.id, params.data.id))
    .returning();
  if (!job) {
    res.status(404).json({ error: "AI job not found" });
    return;
  }
  res.json(ApproveAiJobResponse.parse(job));
});

router.post("/ai/jobs/:id/reject", async (req, res): Promise<void> => {
  const params = RejectAiJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db
    .update(aiJobsTable)
    .set({ status: "rejected" })
    .where(eq(aiJobsTable.id, params.data.id))
    .returning();
  if (!job) {
    res.status(404).json({ error: "AI job not found" });
    return;
  }
  res.json(RejectAiJobResponse.parse(job));
});

export default router;
