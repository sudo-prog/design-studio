import { Router, type IRouter } from "express";
import sharp from "sharp";

const router: IRouter = Router();

/**
 * Merge raw pixel spans into rectangles by scanning for vertically identical
 * runs. simplification (0–10) controls the minimum span width kept — higher
 * values remove narrow noise rects.  Returns an SVG path string.
 */
function pixelTraceToSVG(
  buffer: Buffer,
  width: number,
  height: number,
  simplification = 0
): string {
  const pixels = new Uint8Array(buffer);
  const minSpan = Math.max(0, Math.round(simplification));

  // Build row spans: for each row, collect [startX, endX) runs of "on" pixels
  const rowSpans: Array<Array<[number, number]>> = [];
  for (let y = 0; y < height; y++) {
    const spans: Array<[number, number]> = [];
    let startX = -1;
    for (let x = 0; x <= width; x++) {
      const isOn = x < width && pixels[y * width + x] === 0;
      if (isOn && startX === -1) startX = x;
      else if (!isOn && startX !== -1) {
        if (x - startX > minSpan) spans.push([startX, x]);
        startX = -1;
      }
    }
    rowSpans.push(spans);
  }

  // Merge vertically: if the same [x0,x1] span repeats on the next row, grow
  // the rect's height instead of emitting a new 1-pixel-tall rect.
  const rects: string[] = [];
  // active: Map<key, {x, y, w, bottom}>
  type ActiveRect = { x: number; y: number; w: number; bottom: number };
  const active = new Map<string, ActiveRect>();

  function flushRect(r: ActiveRect) {
    rects.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.bottom - r.y}"/>`
    );
  }

  for (let y = 0; y < height; y++) {
    const currentKeys = new Set<string>();
    for (const [sx, ex] of rowSpans[y]) {
      const key = `${sx},${ex}`;
      currentKeys.add(key);
      const existing = active.get(key);
      if (existing) {
        existing.bottom = y + 1;
      } else {
        active.set(key, { x: sx, y, w: ex - sx, bottom: y + 1 });
      }
    }
    // Flush rects that did not appear on this row
    for (const [key, rect] of active) {
      if (!currentKeys.has(key)) {
        flushRect(rect);
        active.delete(key);
      }
    }
  }
  for (const rect of active.values()) flushRect(rect);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="#000000">${rects.join("")}</g></svg>`;
}

router.post("/vectorize", async (req, res): Promise<void> => {
  try {
    const {
      imageData,
      colorThreshold = 128,
      maxSize = 512,
      simplification = 0,
    } = req.body as {
      imageData?: string;
      colorThreshold?: number;
      maxSize?: number;
      simplification?: number;
    };

    if (!imageData) {
      res.status(400).json({ error: "imageData (base64 or data URL) is required" });
      return;
    }

    const base64 = imageData.replace(/^data:image\/[a-z+]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const threshold = Math.max(1, Math.min(254, colorThreshold));
    const size = Math.max(64, Math.min(1024, maxSize));

    const { data, info } = await sharp(buffer)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .grayscale()
      .threshold(threshold)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const safeSimplification = Math.max(0, Math.min(20, simplification));
    const svg = pixelTraceToSVG(data, info.width, info.height, safeSimplification);

    res.json({ svg, width: info.width, height: info.height });
  } catch (err) {
    console.error("[vectorize]", err);
    res.status(500).json({ error: "Failed to vectorize image" });
  }
});

export default router;
