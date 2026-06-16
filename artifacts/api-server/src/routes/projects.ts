import { Router, type IRouter } from "express";
import { eq, desc, and, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  projectHistoryTable,
  activityLogTable,
  assetsTable,
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
  if (query.success) {
    if (query.data.status) where.push(eq(projectsTable.status, query.data.status));
    if (query.data.category) where.push(ilike(projectsTable.category, `%${query.data.category}%`));
  }
  const projects = await db
    .select()
    .from(projectsTable)
    .where(where.length > 0 ? and(...where) : undefined)
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
      vibe: (parsed.data as Record<string, unknown>).vibe as string ?? null,
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
    metadata: JSON.stringify({ name: project.name, status: project.status }),
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
    description: "Project updated",
    metadata: JSON.stringify(updateData),
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

  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.projectId, params.data.id));

  const designJson = {
    id: project.id,
    name: project.name,
    category: project.category,
    brief: project.brief,
    vibe: (project as Record<string, unknown>).vibe,
    status: project.status,
    printMethod: project.printMethod,
    estimatedQuantity: project.estimatedQuantity,
    colorPalette: project.colorPalette,
    moodBoard: (project as Record<string, unknown>).moodBoard,
    printSpecs: {},
    githubBackup: {
      repo: project.githubRepo,
      lastBackupAt: project.lastBackupAt,
    },
    assets: assets.map((a) => ({
      id: a.id,
      filename: a.filename,
      url: a.url,
      type: a.type,
      tags: a.tags,
    })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };

  const repoInput = (req.body as Record<string, unknown>).repo as string | undefined;
  const patInput = (req.body as Record<string, unknown>).pat as string | undefined;
  const repo = repoInput || project.githubRepo;
  const pat = patInput || (project as Record<string, unknown>).githubPat as string;

  let commitUrl: string | null = null;

  if (repo && pat) {
    try {
      const { Octokit } = await import("@octokit/rest");
      const octokit = new Octokit({ auth: pat });
      const [owner, repoName] = repo.split("/");
      const path = `design.json`;
      const content = Buffer.from(JSON.stringify(designJson, null, 2)).toString("base64");
      const message = `Backup: ${project.name} — ${new Date().toISOString()}`;

      let sha: string | undefined;
      try {
        const existing = await octokit.rest.repos.getContent({ owner, repo: repoName, path });
        if (!Array.isArray(existing.data) && "sha" in existing.data) {
          sha = existing.data.sha;
        }
      } catch {}

      const result = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path,
        message,
        content,
        ...(sha ? { sha } : {}),
      });
      commitUrl = result.data.commit.html_url ?? null;
    } catch (err) {
      logger.error({ err }, "GitHub backup failed");
    }
  }

  await db
    .update(projectsTable)
    .set({ lastBackupAt: new Date() })
    .where(eq(projectsTable.id, params.data.id));

  await db.insert(activityLogTable).values({
    type: "backup_completed",
    description: `Project "${project.name}" backed up${commitUrl ? " to GitHub" : " (local only)"}`,
    projectId: project.id,
    projectName: project.name,
  });

  await db.insert(projectHistoryTable).values({
    projectId: project.id,
    type: "backup",
    description: "Project backed up",
    metadata: JSON.stringify({ commitUrl, repo }),
  });

  res.json(
    BackupProjectResponse.parse({
      success: true,
      message: commitUrl ? "Backed up to GitHub" : "design.json prepared (no GitHub configured)",
      commitUrl,
    })
  );
});

router.patch("/projects/:id/mood-board", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const items = req.body.items;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "items must be an array" });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ moodBoard: items } as Record<string, unknown>)
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.insert(projectHistoryTable).values({
    projectId: id,
    type: "mood_board_updated",
    description: `Mood board updated (${items.length} items)`,
  });
  res.json({ success: true, itemCount: items.length });
});

router.patch("/projects/:id/github", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const { repo, pat } = req.body as { repo?: string; pat?: string };
  const [project] = await db
    .update(projectsTable)
    .set({ githubRepo: repo ?? null, githubPat: pat ?? null } as Record<string, unknown>)
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ success: true });
});

router.get("/projects/:id/design.json", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const assets = await db.select().from(assetsTable).where(eq(assetsTable.projectId, id));
  const history = await db
    .select()
    .from(projectHistoryTable)
    .where(eq(projectHistoryTable.projectId, id))
    .orderBy(desc(projectHistoryTable.createdAt));

  const designJson = {
    id: project.id,
    name: project.name,
    category: project.category,
    brief: project.brief,
    vibe: (project as Record<string, unknown>).vibe,
    status: project.status,
    coverAssetUrl: project.coverAssetUrl,
    colorPalette: project.colorPalette,
    moodBoard: (project as Record<string, unknown>).moodBoard,
    printSpecs: {
      method: project.printMethod,
      estimatedQuantity: project.estimatedQuantity,
    },
    githubBackup: {
      repo: project.githubRepo,
      lastBackupAt: project.lastBackupAt,
    },
    assets: assets.map((a) => ({
      id: a.id,
      filename: a.filename,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl,
      type: a.type,
      mimeType: a.mimeType,
      width: a.width,
      height: a.height,
      fileSize: a.fileSize,
      tags: a.tags,
      createdAt: a.createdAt,
    })),
    historyEntries: history.map((h) => ({
      id: h.id,
      type: h.type,
      description: h.description,
      metadata: h.metadata ? JSON.parse(h.metadata) : null,
      createdAt: h.createdAt,
    })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };

  res.setHeader("Content-Disposition", `attachment; filename="design-${project.id}.json"`);
  res.json(designJson);
});

export default router;
