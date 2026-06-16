import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { printJobsTable, activityLogTable, projectsTable } from "@workspace/db";
import {
  ListPrintJobsQueryParams,
  CreatePrintJobBody,
  GetPrintJobParams,
  ListPrintJobsResponse,
  GetPrintJobResponse,
} from "@workspace/api-zod";

const DEFAULT_CHANNELS = [
  { name: "Cyan", color: "#00AEEF", angle: 15, outputUrl: null },
  { name: "Magenta", color: "#EC008C", angle: 75, outputUrl: null },
  { name: "Yellow", color: "#FFF200", angle: 0, outputUrl: null },
  { name: "Black", color: "#231F20", angle: 45, outputUrl: null },
];

const router: IRouter = Router();

router.get("/print-jobs", async (req, res): Promise<void> => {
  const query = ListPrintJobsQueryParams.safeParse(req.query);
  let q = db.select().from(printJobsTable).$dynamic();
  if (query.success && query.data.projectId) {
    q = q.where(eq(printJobsTable.projectId, query.data.projectId));
  }
  const jobs = await q.orderBy(desc(printJobsTable.createdAt));
  res.json(ListPrintJobsResponse.parse(jobs));
});

router.post("/print-jobs", async (req, res): Promise<void> => {
  const parsed = CreatePrintJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const channels = (parsed.data.channels ?? DEFAULT_CHANNELS).slice(
    0,
    parsed.data.channelCount ?? 4
  );
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  const [job] = await db
    .insert(printJobsTable)
    .values({
      projectId: parsed.data.projectId,
      sourceAssetUrl: parsed.data.sourceAssetUrl,
      channelCount: parsed.data.channelCount ?? 4,
      lpi: parsed.data.lpi ?? 65,
      dotShape: parsed.data.dotShape ?? "round",
      status: "completed",
      channels,
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "print_job_created",
    description: `Print separation created (${job.channelCount} colors, ${job.lpi} LPI)`,
    projectId: parsed.data.projectId,
    projectName: project?.name ?? null,
  });
  res.status(201).json(GetPrintJobResponse.parse(job));
});

router.get("/print-jobs/:id", async (req, res): Promise<void> => {
  const params = GetPrintJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db
    .select()
    .from(printJobsTable)
    .where(eq(printJobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Print job not found" });
    return;
  }
  res.json(GetPrintJobResponse.parse(job));
});

export default router;
