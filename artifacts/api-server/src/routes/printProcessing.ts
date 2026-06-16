import { Router, type IRouter } from "express";
import sharp from "sharp";
import { z } from "zod";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64ToBuffer(b64: string): Buffer {
  const data = b64.includes(",") ? b64.split(",")[1] : b64;
  return Buffer.from(data, "base64");
}

// Simple k-means color quantization (2 iterations, max N clusters)
function kMeans(pixels: number[][], k: number, iterations = 4): number[][] {
  let centers = pixels.filter((_, i) => i % Math.floor(pixels.length / k) === 0).slice(0, k);
  for (let iter = 0; iter < iterations; iter++) {
    const buckets: number[][][] = Array.from({ length: k }, () => []);
    for (const px of pixels) {
      let best = 0, bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const dr = px[0] - centers[c][0], dg = px[1] - centers[c][1], db = px[2] - centers[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; best = c; }
      }
      buckets[best].push(px);
    }
    centers = centers.map((c, i) => {
      if (!buckets[i].length) return c;
      const n = buckets[i].length;
      return [
        buckets[i].reduce((s, p) => s + p[0], 0) / n,
        buckets[i].reduce((s, p) => s + p[1], 0) / n,
        buckets[i].reduce((s, p) => s + p[2], 0) / n,
      ];
    });
  }
  return centers;
}

// Convert [r,g,b] to hex
function rgbToHex([r, g, b]: number[]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// Build a grayscale PNG where pixels close to `color` are dark (printing = ink presence)
async function buildChannelPng(
  rawPixels: Buffer,
  width: number,
  height: number,
  color: number[],
  tolerance: number = 80
): Promise<Buffer> {
  const out = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rawPixels[i * 3], g = rawPixels[i * 3 + 1], b = rawPixels[i * 3 + 2];
    const dr = r - color[0], dg = g - color[1], db = b - color[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    const ink = Math.max(0, 1 - dist / tolerance);
    out[i] = Math.round(255 - ink * 255);
  }
  return sharp(out, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

// Apply halftone pattern to a grayscale buffer
async function applyHalftone(
  greyBuffer: Buffer,
  width: number,
  height: number,
  lpi: number,
  angleDeg: number,
  dotShape: string,
  outputDpi: number = 300
): Promise<Buffer> {
  const cellSize = outputDpi / lpi;
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  const out = Buffer.alloc(width * height, 255);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const grey = greyBuffer[y * width + x];
      const ink = 1 - grey / 255;

      // Rotate into halftone grid space
      const rx = x * cos + y * sin;
      const ry = -x * sin + y * cos;

      const cx = Math.floor(rx / cellSize) * cellSize + cellSize / 2;
      const cy = Math.floor(ry / cellSize) * cellSize + cellSize / 2;
      const dx = (rx - cx) / (cellSize / 2);
      const dy = (ry - cy) / (cellSize / 2);

      let inside = false;
      const r = Math.sqrt(ink);
      if (dotShape === "line") {
        inside = Math.abs(dy) < ink;
      } else if (dotShape === "diamond") {
        inside = Math.abs(dx) + Math.abs(dy) < r;
      } else if (dotShape === "ellipse") {
        inside = (dx * dx) / (r * r) + (dy * dy) / ((r * 0.7) * (r * 0.7)) <= 1;
      } else {
        inside = dx * dx + dy * dy <= r * r;
      }
      out[y * width + x] = inside ? 0 : 255;
    }
  }
  return out;
}

// Add registration marks to a PNG buffer (cross + circle in corners)
async function addRegMarks(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const markSvg = (x: number, y: number) => `
    <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="black" stroke-width="1.5"/>
    <line x1="${x - 18}" y1="${y}" x2="${x + 18}" y2="${y}" stroke="black" stroke-width="1.5"/>
    <line x1="${x}" y1="${y - 18}" x2="${x}" y2="${y + 18}" stroke="black" stroke-width="1.5"/>
  `;
  const marks = [
    markSvg(30, 30), markSvg(width - 30, 30),
    markSvg(30, height - 30), markSvg(width - 30, height - 30),
  ].join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${marks}</svg>`;
  const overlay = Buffer.from(svg);
  return sharp(buf).composite([{ input: overlay, blend: "over" }]).png().toBuffer();
}

// ── POST /api/print/separate ──────────────────────────────────────────────────
const SeparateBody = z.object({
  imageBase64: z.string().min(1),
  channelCount: z.number().int().min(1).max(8).default(4),
  dpi: z.number().int().min(72).max(600).default(300),
});

router.post("/print/separate", async (req, res): Promise<void> => {
  const parsed = SeparateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { imageBase64, channelCount, dpi } = parsed.data;
  const inputBuf = base64ToBuffer(imageBase64);

  const { data: rawPixels, info } = await sharp(inputBuf)
    .resize({ width: 400, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // Sample pixels for k-means (every 4th pixel for speed)
  const samples: number[][] = [];
  for (let i = 0; i < rawPixels.length; i += 12) {
    samples.push([rawPixels[i], rawPixels[i + 1], rawPixels[i + 2]]);
  }

  const centers = kMeans(samples, channelCount);

  const channels = await Promise.all(
    centers.map(async (color, idx) => {
      const pngBuf = await buildChannelPng(rawPixels, width, height, color);
      const b64 = pngBuf.toString("base64");
      return {
        index: idx,
        name: `Channel ${idx + 1}`,
        color: rgbToHex(color),
        imageBase64: `data:image/png;base64,${b64}`,
        width,
        height,
        dpi,
      };
    })
  );

  res.json({ channels, width, height, dpi });
});

// ── POST /api/print/halftone-film ─────────────────────────────────────────────
const HalftoneFilmBody = z.object({
  imageBase64: z.string().min(1),
  lpi: z.number().int().min(20).max(200).default(65),
  angle: z.number().min(0).max(360).default(45),
  dotShape: z.enum(["round", "ellipse", "line", "diamond"]).default("round"),
  dpi: z.number().int().min(150).max(600).default(300),
  channelName: z.string().default("Channel"),
  channelColor: z.string().default("#000000"),
});

router.post("/print/halftone-film", async (req, res): Promise<void> => {
  const parsed = HalftoneFilmBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { imageBase64, lpi, angle, dotShape, dpi, channelName } = parsed.data;
  const inputBuf = base64ToBuffer(imageBase64);

  // Convert to greyscale at target DPI-equivalent size
  const maxW = 800;
  const { data: greyBuf, info } = await sharp(inputBuf)
    .resize({ width: maxW, withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  const halftoneBuf = await applyHalftone(greyBuf, width, height, lpi, angle, dotShape, dpi);

  // Convert raw greyscale back to PNG
  const filmPng = await sharp(halftoneBuf, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  const withMarks = await addRegMarks(filmPng, width, height);

  res.json({
    imageBase64: `data:image/png;base64,${withMarks.toString("base64")}`,
    channelName,
    lpi,
    angle,
    dotShape,
    dpi,
    width,
    height,
  });
});

export default router;
