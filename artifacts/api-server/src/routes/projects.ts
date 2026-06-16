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
  const createData = parsed.data as typeof parsed.data & { vibe?: string };
  const [project] = await db
    .insert(projectsTable)
    .values({
      name: createData.name,
      category: createData.category ?? null,
      brief: createData.brief ?? null,
      vibe: createData.vibe ?? null,
      status: createData.status ?? "draft",
      printMethod: createData.printMethod ?? null,
      estimatedQuantity: createData.estimatedQuantity ?? null,
      colorPalette: createData.colorPalette ?? [],
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
  const patchData = parsed.data as typeof parsed.data & { vibe?: string };
  if (patchData.name !== undefined) updateData.name = patchData.name;
  if (patchData.category !== undefined) updateData.category = patchData.category;
  if (patchData.brief !== undefined) updateData.brief = patchData.brief;
  if (patchData.vibe !== undefined) updateData.vibe = patchData.vibe;
  if (patchData.status !== undefined) updateData.status = patchData.status;
  if (parsed.data.printMethod !== undefined) updateData.printMethod = parsed.data.printMethod;
  if (parsed.data.estimatedQuantity !== undefined) updateData.estimatedQuantity = parsed.data.estimatedQuantity;
  if (parsed.data.colorPalette !== undefined) updateData.colorPalette = parsed.data.colorPalette;
  if (parsed.data.githubRepo !== undefined) updateData.githubRepo = parsed.data.githubRepo;
  if (parsed.data.coverAssetUrl !== undefined) updateData.coverAssetUrl = parsed.data.coverAssetUrl;

  const [before] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!before) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const previousState = {
    name: before.name,
    category: before.category,
    brief: before.brief,
    vibe: (before as unknown as Record<string, unknown>).vibe,
    status: before.status,
    printMethod: before.printMethod,
    estimatedQuantity: before.estimatedQuantity,
    colorPalette: before.colorPalette,
    coverAssetUrl: before.coverAssetUrl,
  };

  await db.insert(projectHistoryTable).values({
    projectId: project.id,
    type: "updated",
    description: `Updated: ${Object.keys(updateData).join(", ")}`,
    metadata: JSON.stringify({ changes: updateData, previous: previousState }),
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

  const proj = project as unknown as Record<string, unknown>;

  const designJson = {
    id: project.id,
    name: project.name,
    category: project.category,
    brief: project.brief,
    vibe: proj.vibe,
    status: project.status,
    printMethod: project.printMethod,
    estimatedQuantity: project.estimatedQuantity,
    colorPalette: project.colorPalette,
    moodBoard: proj.moodBoard,
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

  const bodyRecord = req.body as Record<string, unknown>;
  const repo = (bodyRecord.repo as string | undefined) || project.githubRepo;
  const pat = (bodyRecord.pat as string | undefined) || (proj.githubPat as string | undefined);

  if (!repo || !pat) {
    res.json(
      BackupProjectResponse.parse({
        success: true,
        message: "No GitHub repository configured — use the download button to export design.json",
        commitUrl: null,
      })
    );
    return;
  }

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    res.status(400).json({ error: "Invalid repository format — expected owner/repo" });
    return;
  }

  let commitUrl: string;
  try {
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit({ auth: pat });
    const projectFolder = `projects/${project.id}`;
    const path = `${projectFolder}/design.json`;
    const content = Buffer.from(JSON.stringify(designJson, null, 2)).toString("base64");
    const message = `Backup: ${project.name} [${new Date().toISOString()}]`;

    let sha: string | undefined;
    try {
      const existing = await octokit.rest.repos.getContent({ owner, repo: repoName, path });
      if (!Array.isArray(existing.data) && "sha" in existing.data) {
        sha = existing.data.sha;
      }
    } catch {
      // file doesn't exist yet — that's fine, we'll create it
    }

    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path,
      message,
      content,
      ...(sha ? { sha } : {}),
    });
    commitUrl = result.data.commit.html_url ?? `https://github.com/${repo}`;
  } catch (err) {
    logger.error({ err }, "GitHub backup failed");
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `GitHub backup failed: ${msg}` });
    return;
  }

  await db
    .update(projectsTable)
    .set({ lastBackupAt: new Date() })
    .where(eq(projectsTable.id, params.data.id));

  await db.insert(activityLogTable).values({
    type: "backup_completed",
    description: `Project "${project.name}" backed up to GitHub`,
    projectId: project.id,
    projectName: project.name,
  });

  await db.insert(projectHistoryTable).values({
    projectId: project.id,
    type: "backup",
    description: `Backed up to GitHub: ${repo}`,
    metadata: JSON.stringify({ commitUrl, repo }),
  });

  res.json(
    BackupProjectResponse.parse({
      success: true,
      message: "Backed up to GitHub",
      commitUrl,
    })
  );
});

router.post("/projects/:id/restore/:historyId", async (req, res): Promise<void> => {
  const projectId = parseInt(String(req.params.id), 10);
  const historyId = parseInt(String(req.params.historyId), 10);
  if (isNaN(projectId) || isNaN(historyId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [entry] = await db
    .select()
    .from(projectHistoryTable)
    .where(eq(projectHistoryTable.id, historyId));
  if (!entry) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }
  if (!entry.metadata) {
    res.status(400).json({ error: "This history entry has no restorable state" });
    return;
  }
  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(entry.metadata);
  } catch {
    res.status(400).json({ error: "Could not parse history entry metadata" });
    return;
  }
  const allowedFields = ["name", "category", "brief", "vibe", "status", "printMethod", "estimatedQuantity", "colorPalette", "coverAssetUrl"];
  const restoreData: Record<string, unknown> = {};
  const source: Record<string, unknown> =
    metadata.previous !== null && typeof metadata.previous === "object"
      ? (metadata.previous as Record<string, unknown>)
      : metadata;
  for (const field of allowedFields) {
    if (source[field] !== undefined) restoreData[field] = source[field];
  }
  if (Object.keys(restoreData).length === 0) {
    res.status(400).json({ error: "No restorable fields in this history entry" });
    return;
  }
  const [updated] = await db
    .update(projectsTable)
    .set(restoreData)
    .where(eq(projectsTable.id, projectId))
    .returning();
  await db.insert(projectHistoryTable).values({
    projectId,
    type: "restored",
    description: `Restored from history entry #${historyId}: "${entry.description}"`,
    metadata: JSON.stringify({ fromHistoryId: historyId, restoredFields: Object.keys(restoreData) }),
  });
  res.json(GetProjectResponse.parse(updated));
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
