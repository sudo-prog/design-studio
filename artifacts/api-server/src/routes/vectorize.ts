import { Router, type IRouter } from "express";
import sharp from "sharp";

const router: IRouter = Router();

function pixelTraceToSVG(buffer: Buffer, width: number, height: number): string {
  const pixels = new Uint8Array(buffer);
  const rects: string[] = [];

  for (let y = 0; y < height; y++) {
    let startX = -1;
    for (let x = 0; x <= width; x++) {
      const isOn = x < width && pixels[y * width + x] === 0;
      if (isOn && startX === -1) {
        startX = x;
      } else if (!isOn && startX !== -1) {
        rects.push(`<rect x="${startX}" y="${y}" width="${x - startX}" height="1"/>`);
        startX = -1;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="#000000">${rects.join("")}</g></svg>`;
}

router.post("/vectorize", async (req, res): Promise<void> => {
  try {
    const { imageData, colorThreshold = 128, maxSize = 512 } = req.body as {
      imageData?: string;
      colorThreshold?: number;
      maxSize?: number;
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

    const svg = pixelTraceToSVG(data, info.width, info.height);

    res.json({ svg, width: info.width, height: info.height });
  } catch (err) {
    console.error("[vectorize]", err);
    res.status(500).json({ error: "Failed to vectorize image" });
  }
});

export default router;
