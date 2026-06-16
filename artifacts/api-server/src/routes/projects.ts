import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  projectHistoryTable,
  activityLogTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  GetProjectHistoryParams,
  BackupProjectParams,
  ListProjectsQueryParams,
  ListProjectsResponse,
  GetProjectResponse,
  GetProjectHistoryResponse,
  BackupProjectResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  const where = [];
  if (query.success && query.data.status) {
    where.push(eq(projectsTable.status, query.data.status));
  }
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt));
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      brief: parsed.data.brief ?? null,
      status: parsed.data.status ?? "draft",
      printMethod: parsed.data.printMethod ?? null,
      estimatedQuantity: parsed.data.estimatedQuantity ?? null,
      colorPalette: parsed.data.colorPalette ?? [],
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "project_created",
    description: `Project "${project.name}" created`,
    projectId: project.id,
    projectName: project.name,
  });
  await db.insert(projectHistoryTable).values({
    projectId: project.id,
    type: "created",
    description: "Project created",
  });
  res.status(201).json(GetProjectResponse.parse(project));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.brief !== undefined) updateData.brief = parsed.data.brief;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.printMethod !== undefined) updateData.printMethod = parsed.data.printMethod;
  if (parsed.data.estimatedQuantity !== undefined) updateData.estimatedQuantity = parsed.data.estimatedQuantity;
  if (parsed.data.colorPalette !== undefined) updateData.colorPalette = parsed.data.colorPalette;
  if (parsed.data.githubRepo !== undefined) updateData.githubRepo = parsed.data.githubRepo;
  if (parsed.data.coverAssetUrl !== undefined) updateData.coverAssetUrl = parsed.data.coverAssetUrl;
  const [project] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.insert(projectHistoryTable).values({
    projectId: project.id,
    type: "updated",
    description: `Project updated`,
  });
  res.json(GetProjectResponse.parse(project));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/projects/:id/history", async (req, res): Promise<void> => {
  const params = GetProjectHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const history = await db
    .select()
    .from(projectHistoryTable)
    .where(eq(projectHistoryTable.projectId, params.data.id))
    .orderBy(desc(projectHistoryTable.createdAt));
  res.json(GetProjectHistoryResponse.parse(history));
});

router.post("/projects/:id/backup", async (req, res): Promise<void> => {
  const params = BackupProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db
    .update(projectsTable)
    .set({ lastBackupAt: new Date() })
    .where(eq(projectsTable.id, params.data.id));
  await db.insert(activityLogTable).values({
    type: "backup_completed",
    description: `Project "${project.name}" backed up`,
    projectId: project.id,
    projectName: project.name,
  });
  res.json(
    BackupProjectResponse.parse({
      success: true,
      message: "Project backed up successfully",
      commitUrl: null,
    })
  );
});

export default router;
