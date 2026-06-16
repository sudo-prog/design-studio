import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import path from "path";
import fs from "fs";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@workspace/db";
import { assetsTable, activityLogTable, projectsTable, projectHistoryTable } from "@workspace/db";
import {
  ListAssetsParams,
  DeleteAssetParams,
  UploadAssetParams,
  ListAssetsResponse,
} from "@workspace/api-zod";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router: IRouter = Router();

router.get("/projects/:id/assets", async (req, res): Promise<void> => {
  const params = ListAssetsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.projectId, params.data.id))
    .orderBy(desc(assetsTable.createdAt));
  res.json(ListAssetsResponse.parse(assets));
});

router.post("/projects/:id/assets", upload.single("file"), async (req, res): Promise<void> => {
  const params = UploadAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  const fileUrl = `/uploads/${req.file.filename}`;
  const tags = req.body.tags ? req.body.tags.split(",").map((t: string) => t.trim()) : [];

  let width: number | null = null;
  let height: number | null = null;
  let thumbnailUrl: string | null = null;
  const isImage = req.file.mimetype.startsWith("image/");

  if (isImage) {
    try {
      const meta = await sharp(req.file.path).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      const thumbName = `thumb_${req.file.filename.replace(/\.[^.]+$/, ".webp")}`;
      const thumbPath = path.join(uploadsDir, thumbName);
      await sharp(req.file.path)
        .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbPath);
      thumbnailUrl = `/uploads/${thumbName}`;
    } catch {
    }
  }

  const [asset] = await db
    .insert(assetsTable)
    .values({
      projectId: params.data.id,
      filename: req.file.originalname,
      url: fileUrl,
      thumbnailUrl,
      type: req.body.type ?? "photo",
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      width,
      height,
      tags,
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "asset_uploaded",
    description: `Asset "${req.file.originalname}" uploaded`,
    projectId: params.data.id,
    projectName: project?.name ?? null,
  });
  await db.insert(projectHistoryTable).values({
    projectId: params.data.id,
    type: "asset_uploaded",
    description: `Asset uploaded: ${req.file.originalname}`,
    metadata: JSON.stringify({ assetId: asset.id, filename: req.file.originalname, type: req.body.type ?? "photo" }),
  });
  res.status(201).json(asset);
});

// POST /api/projects/:id/assets/url — ingest an external/AI-generated URL as a project asset
router.post("/projects/:id/assets/url", async (req, res): Promise<void> => {
  const params = UploadAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = z.object({
    url: z.string().url(),
    name: z.string().optional().default("AI Generated"),
    type: z.string().optional().default("image"),
    source: z.string().optional().default("ai_generate"),
  }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { url, name, type } = body.data;
  const [asset] = await db
    .insert(assetsTable)
    .values({
      projectId: params.data.id,
      filename: name,
      url,
      thumbnailUrl: url,
      type,
      mimeType: "image/jpeg",
      fileSize: 0,
      width: null,
      height: null,
      tags: [],
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "asset_uploaded",
    description: `AI-generated asset "${name}" saved to project`,
    projectId: params.data.id,
    projectName: project.name,
  });
  await db.insert(projectHistoryTable).values({
    projectId: params.data.id,
    type: "asset_uploaded",
    description: `AI asset saved: ${name}`,
    metadata: JSON.stringify({ assetId: asset.id, url, source: body.data.source }),
  });

  res.status(201).json(asset);
});

router.delete("/assets/:id", async (req, res): Promise<void> => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [asset] = await db
    .delete(assetsTable)
    .where(eq(assetsTable.id, params.data.id))
    .returning();
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  const filePath = path.resolve(uploadsDir, path.basename(asset.url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.sendStatus(204);
});

export default router;
