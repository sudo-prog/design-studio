import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { techPacksTable, activityLogTable, projectsTable } from "@workspace/db";
import {
  ListTechPacksQueryParams,
  CreateTechPackBody,
  ListTechPacksResponse,
} from "@workspace/api-zod";
import { z } from "zod";
import { generateTechPackPdf, type TechPackData, type ColorSpec } from "./pdfGen";

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

// ── POST /api/tech-pack/generate — returns PDF binary ─────────────────────
const GenerateTechPackBody = z.object({
  projectName: z.string().min(1),
  date: z.string().default(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })),
  designer: z.string().optional(),
  garmentType: z.string().optional(),
  printMethod: z.string().optional(),
  placement: z.string().optional(),
  dimensions: z.string().optional(),
  colorCount: z.number().optional(),
  colors: z.array(z.object({
    name: z.string(),
    hex: z.string(),
    pantone: z.string().optional(),
    cmyk: z.string().optional(),
  })).default([]),
  notes: z.string().optional(),
  designImageBase64: z.string().optional(),
  mockupImageBase64: z.string().optional(),
});

router.post("/tech-pack/generate", async (req, res): Promise<void> => {
  const parsed = GenerateTechPackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const techPackData: TechPackData = {
    projectName: data.projectName,
    date: data.date,
    designer: data.designer,
    garmentType: data.garmentType,
    printMethod: data.printMethod,
    placement: data.placement,
    dimensions: data.dimensions,
    colorCount: data.colorCount,
    colors: data.colors.map((c) => ({
      name: c.name,
      hex: c.hex,
      pantone: c.pantone,
      cmyk: c.cmyk ? (() => {
        const parts = c.cmyk.split(/[,/\s]+/).map(Number);
        if (parts.length >= 4) return { c: parts[0], m: parts[1], y: parts[2], k: parts[3] };
        return undefined;
      })() : undefined,
    } as ColorSpec)),
    notes: data.notes,
    designImageBase64: data.designImageBase64,
    mockupImageBase64: data.mockupImageBase64,
  };
  const pdfBuf = await generateTechPackPdf(techPackData);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="tech-pack-${Date.now()}.pdf"`);
  res.send(pdfBuf);
});

export default router;
