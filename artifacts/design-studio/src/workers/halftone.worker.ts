
/**
 * CMYK Halftone Worker
 * Supports per-channel screen angles (0–360°) — C, M, Y, K.
 * Uses subtractive ink compositing on a white background.
 */

const INK_COLORS: Record<string, [number, number, number]> = {
  c: [0, 255, 255],   // Cyan
  m: [255, 0, 255],   // Magenta
  y: [255, 255, 0],   // Yellow
  k: [0, 0, 0],       // Key (Black)
};

function drawDot(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  dotShape: string,
  inkR: number,
  inkG: number,
  inkB: number
) {
  if (radius < 0.5) return;
  const x0 = Math.max(0, Math.floor(cx - radius - 1));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius + 1));
  const y0 = Math.max(0, Math.floor(cy - radius - 1));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius + 1));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let inside = false;
      const dx = x - cx;
      const dy = y - cy;
      switch (dotShape) {
        case "ellipse":
          inside = (dx / (radius * 1.5)) ** 2 + (dy / radius) ** 2 <= 1;
          break;
        case "line":
          inside = Math.abs(dy) <= radius * 0.4 && Math.abs(dx) <= radius * 2;
          break;
        case "diamond":
          inside = Math.abs(dx) + Math.abs(dy) <= radius;
          break;
        default:
          inside = dx * dx + dy * dy <= radius * radius;
      }
      if (inside) {
        const idx = (y * width + x) * 4;
        // Subtractive (multiply) blend: ink absorbs complementary light
        data[idx]     = Math.round(data[idx]     * inkR / 255);
        data[idx + 1] = Math.round(data[idx + 1] * inkG / 255);
        data[idx + 2] = Math.round(data[idx + 2] * inkB / 255);
        // alpha stays 255
      }
    }
  }
}

function runChannelHalftone(
  src: Uint8ClampedArray,
  out: Uint8ClampedArray,
  width: number,
  height: number,
  channelExtract: (idx: number) => number,   // returns 0-255 ink density
  angleRad: number,
  cellSize: number,
  dotShape: string,
  inkR: number,
  inkG: number,
  inkB: number
) {
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const cx0 = width / 2;
  const cy0 = height / 2;
  const diag = Math.sqrt(width * width + height * height);
  const gridRange = Math.ceil(diag / cellSize) + 2;

  for (let gy = -gridRange; gy <= gridRange; gy++) {
    for (let gx = -gridRange; gx <= gridRange; gx++) {
      const rcx = gx * cellSize;
      const rcy = gy * cellSize;
      const cx = rcx * cos - rcy * sin + cx0;
      const cy = rcx * sin + rcy * cos + cy0;
      if (cx < -cellSize || cx > width + cellSize || cy < -cellSize || cy > height + cellSize) continue;

      const sx = Math.round(cx);
      const sy = Math.round(cy);
      let inkDensity = 0;
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        inkDensity = channelExtract((sy * width + sx) * 4);
      }
      const radius = (cellSize / 2) * (inkDensity / 255);
      drawDot(out, width, height, cx, cy, radius, dotShape, inkR, inkG, inkB);
    }
  }
}

self.onmessage = (e: MessageEvent) => {
  const {
    imageData,
    lpi,
    angles,   // { c: number, m: number, y: number, k: number } — 0-360°
    dotShape,
  } = e.data as {
    imageData: ImageData;
    lpi: number;
    angles: { c: number; m: number; y: number; k: number };
    dotShape: string;
  };

  const { data, width, height } = imageData;
  const cellSize = 96 / lpi;

  // Start with a white output canvas
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = out[i + 1] = out[i + 2] = 255;
    out[i + 3] = 255;
  }

  // Convert source RGB to CMYK ink densities
  // C = 255 - R, M = 255 - G, Y = 255 - B
  // K = min(C, M, Y); C -= K; M -= K; Y -= K
  const channels = {
    c: new Uint8Array(width * height),
    m: new Uint8Array(width * height),
    y: new Uint8Array(width * height),
    k: new Uint8Array(width * height),
  };

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let c = 255 - r, m = 255 - g, yy = 255 - b;
    const k = Math.min(c, m, yy);
    channels.c[p] = c - k;
    channels.m[p] = m - k;
    channels.y[p] = yy - k;
    channels.k[p] = k;
  }

  // Render each CMYK channel at its screen angle
  const channelDefs = [
    { key: "c" as const, angleDeg: angles.c, ink: INK_COLORS.c },
    { key: "m" as const, angleDeg: angles.m, ink: INK_COLORS.m },
    { key: "y" as const, angleDeg: angles.y, ink: INK_COLORS.y },
    { key: "k" as const, angleDeg: angles.k, ink: INK_COLORS.k },
  ];

  for (const { key, angleDeg, ink } of channelDefs) {
    const rad = (angleDeg * Math.PI) / 180;
    const arr = channels[key];
    runChannelHalftone(
      data, out, width, height,
      (idx) => arr[idx / 4],
      rad, cellSize, dotShape,
      ink[0], ink[1], ink[2]
    );
  }

  const output = new ImageData(out, width, height);
  self.postMessage({ imageData: output });
};
