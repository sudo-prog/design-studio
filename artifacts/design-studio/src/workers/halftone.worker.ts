function drawDot(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  dotShape: string
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
          inside = Math.abs(dy) <= radius && Math.abs(dx) <= radius * 3;
          break;
        case "diamond":
          inside = Math.abs(dx) + Math.abs(dy) <= radius;
          break;
        default:
          inside = dx * dx + dy * dy <= radius * radius;
      }
      if (inside) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }
  }
}

self.onmessage = (e: MessageEvent) => {
  const { imageData, lpi, angle, dotShape } = e.data as {
    imageData: ImageData;
    lpi: number;
    angle: number;
    dotShape: string;
  };
  const { data, width, height } = imageData;

  const output = new ImageData(width, height);
  for (let i = 0; i < output.data.length; i += 4) {
    output.data[i] = 255;
    output.data[i + 1] = 255;
    output.data[i + 2] = 255;
    output.data[i + 3] = 255;
  }

  const cellSize = 96 / lpi;
  const angleRad = (angle * Math.PI) / 180;
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
      let brightness = 255;
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const idx = (sy * width + sx) * 4;
        brightness = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      }

      const radius = (cellSize / 2) * (1 - brightness / 255);
      drawDot(output.data, width, height, cx, cy, radius, dotShape);
    }
  }

  self.postMessage({ imageData: output });
};
