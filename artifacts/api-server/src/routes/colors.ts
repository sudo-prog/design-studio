import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { colorPalettesTable } from "@workspace/db";
import {
  ListPalettesParams,
  CreatePaletteParams,
  CreatePaletteBody,
  ExtractColorsBody,
  ListPalettesResponse,
  ExtractColorsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:id/palettes", async (req, res): Promise<void> => {
  const params = ListPalettesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const palettes = await db
    .select()
    .from(colorPalettesTable)
    .where(eq(colorPalettesTable.projectId, params.data.id))
    .orderBy(desc(colorPalettesTable.createdAt));
  res.json(ListPalettesResponse.parse(palettes));
});

router.post("/projects/:id/palettes", async (req, res): Promise<void> => {
  const params = CreatePaletteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreatePaletteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [palette] = await db
    .insert(colorPalettesTable)
    .values({
      projectId: params.data.id,
      name: parsed.data.name,
      colors: parsed.data.colors,
    })
    .returning();
  res.status(201).json(palette);
});

router.post("/colors/extract", async (req, res): Promise<void> => {
  const parsed = ExtractColorsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const colorCount = parsed.data.colorCount ?? 6;
  const palette = [
    { hex: "#1A1A2E", rgb: "26, 26, 46", cmyk: null, pantone: null, name: "Midnight Navy", percentage: 28 },
    { hex: "#E94560", rgb: "233, 69, 96", cmyk: null, pantone: null, name: "Electric Crimson", percentage: 22 },
    { hex: "#F5A623", rgb: "245, 166, 35", cmyk: null, pantone: null, name: "Amber Gold", percentage: 18 },
    { hex: "#FFFFFF", rgb: "255, 255, 255", cmyk: null, pantone: null, name: "Pure White", percentage: 15 },
    { hex: "#0A3D62", rgb: "10, 61, 98", cmyk: null, pantone: null, name: "Deep Ocean", percentage: 10 },
    { hex: "#6C3483", rgb: "108, 52, 131", cmyk: null, pantone: null, name: "Royal Violet", percentage: 7 },
  ].slice(0, colorCount);
  res.json(ExtractColorsResponse.parse({ colors: palette }));
});

export default router;
