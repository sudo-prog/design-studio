import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db } from "@workspace/db";
import { assetsTable, activityLogTable, projectsTable } from "@workspace/db";
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
  const [asset] = await db
    .insert(assetsTable)
    .values({
      projectId: params.data.id,
      filename: req.file.originalname,
      url: fileUrl,
      type: req.body.type ?? "photo",
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      tags,
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "asset_uploaded",
    description: `Asset "${req.file.originalname}" uploaded`,
    projectId: params.data.id,
    projectName: project?.name ?? null,
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
