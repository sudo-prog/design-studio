import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  assetsTable,
  aiJobsTable,
  mockupsTable,
  activityLogTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
  GetRecentActivityQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [totalProjects] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable);
  const projectRows = await db.select({ status: projectsTable.status }).from(projectsTable);
  const statusMap: Record<string, number> = {};
  for (const row of projectRows) {
    statusMap[row.status] = (statusMap[row.status] ?? 0) + 1;
  }
  const activeProjects = (statusMap["in_progress"] ?? 0) + (statusMap["draft"] ?? 0);
  const [totalAssets] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assetsTable);
  const [pendingAiJobs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiJobsTable)
    .where(sql`${aiJobsTable.status} IN ('pending','processing')`);
  const [recentMockups] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mockupsTable)
    .where(sql`${mockupsTable.createdAt} > now() - interval '7 days'`);
  const readyToPrint = statusMap["ready"] ?? 0;
  const recentProjectIds = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt))
    .limit(5);
  res.json(
    GetDashboardSummaryResponse.parse({
      totalProjects: totalProjects?.count ?? 0,
      activeProjects,
      totalAssets: totalAssets?.count ?? 0,
      pendingAiJobs: pendingAiJobs?.count ?? 0,
      recentMockups: recentMockups?.count ?? 0,
      readyToPrint,
      projectsByStatus: statusMap,
      recentProjectIds: recentProjectIds.map((r) => r.id),
    })
  );
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const activity = await db
    .select()
    .from(activityLogTable)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(limit);
  res.json(GetRecentActivityResponse.parse(activity));
});

export default router;
