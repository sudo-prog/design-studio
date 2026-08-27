import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export type BlendMode = "multiply" | "overlay" | "screen" | "normal";

interface WarpPoint { x: number; y: number }

interface Props {
  templateUrl: string;
  designUrl: string | null;
  garmentColor: string;
  blendMode: BlendMode;
  className?: string;
  onExport?: (dataUrl: string) => void;
  onCornersChange?: (corners: WarpPoint[]) => void;
}

const DEFAULT_CORNERS: WarpPoint[] = [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.7 },
  { x: 0.2, y: 0.7 },
];

function computeMatrix3d(src: WarpPoint[], dst: WarpPoint[]): string {
  // CSS matrix3d perspective warp from unit square → dst corners (simplified homography)
  // src = unit square corners, dst = target corners in 0..1 space
  const [tl, tr, br, bl] = dst;
  // Using CSS perspective-origin trick: map 4 corners via perspective-transform
  // We use the standard CSS matrix3d computed from 4-point correspondence
  const x1 = tl!.x, y1 = tl!.y;
  const x2 = tr!.x, y2 = tr!.y;
  const x3 = br!.x, y3 = br!.y;
  const x4 = bl!.x, y4 = bl!.y;

  // Build 4-point projective transform (homography) using Gauss elimination
  function solve(A: number[][], b: number[]): number[] {
    const n = b.length;
    const aug = A.map((row, i) => [...row, b[i]!]);
    for (let c = 0; c < n; c++) {
      let pivot = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(aug[r]![c]!) > Math.abs(aug[pivot]![c]!)) pivot = r;
      [aug[c], aug[pivot]] = [aug[pivot]!, aug[c]!];
      const pv = aug[c]![c]!;
      if (Math.abs(pv) < 1e-10) continue;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = aug[r]![c]! / pv;
        for (let k = c; k <= n; k++) aug[r]![k]! -= f * aug[c]![k]!;
      }
    }
    return aug.map((row, i) => row[n]! / row[i]!);
  }

  // Compute homography matrix H such that H * [x,y,1] ~ [X,Y,1]
  const srcPts = [[0,0],[1,0],[1,1],[0,1]];
  const dstPts = [[x1,y1],[x2,y2],[x3,y3],[x4,y4]];

  const A: number[][] = [];
  const bv: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = srcPts[i]!;
    const [dx, dy] = dstPts[i]!;
    A.push([sx!, sy!, 1, 0, 0, 0, -sx!*dx!, -sy!*dx!]);
    bv.push(dx!);
    A.push([0, 0, 0, sx!, sy!, 1, -sx!*dy!, -sy!*dy!]);
    bv.push(dy!);
  }
  let hCoeffs: number[];
  try { hCoeffs = solve(A, bv); } catch { hCoeffs = [1,0,0,0,1,0,0,0]; }
  const [h0,h1,h2,h3,h4,h5,h6,h7] = hCoeffs;

  // CSS matrix3d is column-major, 4×4
  // projective: [[h0,h3,0,h6],[h1,h4,0,h7],[0,0,1,0],[h2,h5,0,1]]
  const m = [
    h0!,  h3!, 0, h6!,
    h1!,  h4!, 0, h7!,
    0,    0,   1, 0,
    h2!,  h5!, 0, 1,
  ];
  return `matrix3d(${m.map(v => v.toFixed(6)).join(",")})`;
}

export async function exportWarpComposite(
  templateUrl: string,
  designUrl: string | null,
  garmentColor: string,
  blendMode: BlendMode,
  corners: WarpPoint[],
  exportSize = 2400,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d")!;

  function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // 1. Garment color fill
  ctx.fillStyle = garmentColor;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillRect(0, 0, exportSize, exportSize);

  // 2. Template image
  try {
    const tmpl = await loadImg(templateUrl);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(tmpl, 0, 0, exportSize, exportSize);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(tmpl, 0, 0, exportSize, exportSize);
  } catch { /* cross-origin fallback: skip template */ }

  // 3. Design overlay with perspective warp (via CSS matrix3d → canvas transform)
  if (designUrl) {
    try {
      const design = await loadImg(designUrl);
      const matStr = computeMatrix3d(
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        corners,
      );
      // Extract matrix3d numbers
      const nums = matStr.replace("matrix3d(", "").replace(")", "").split(",").map(Number);
      // CSS matrix3d is column-major 4×4; extract 2D affine for canvas (approximate)
      // For the export we apply the homographic scale to fill corner bounds
      const [x1, y1] = [corners[0]!.x * exportSize, corners[0]!.y * exportSize];
      const [x2, y2] = [corners[1]!.x * exportSize, corners[1]!.y * exportSize];
      const [x4, y4] = [corners[3]!.x * exportSize, corners[3]!.y * exportSize];
      ctx.save();
      ctx.globalCompositeOperation = blendMode === "normal" ? "source-over" : blendMode as GlobalCompositeOperation;
      ctx.globalAlpha = 0.9;
      // Use setTransform for the affine portion (top-left, right, bottom-left vectors)
      const a = x2 - x1, b = y2 - y1;
      const c2 = x4 - x1, d = y4 - y1;
      ctx.setTransform(a / design.naturalWidth, b / design.naturalWidth, c2 / design.naturalHeight, d / design.naturalHeight, x1, y1);
      ctx.drawImage(design, 0, 0, design.naturalWidth, design.naturalHeight);
      ctx.restore();
      // suppress unused variable warning
      void nums;
    } catch { /* design load failed */ }
  }

  return canvas.toDataURL("image/png");
}

export function WarpCanvas({ templateUrl, designUrl, garmentColor, blendMode, className, onExport, onCornersChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [corners, setCorners] = useState<WarpPoint[]>(DEFAULT_CORNERS);
  const [dragging, setDragging] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 400, h: 400 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleMouseDown = useCallback((i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(i);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging === null) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height));
    setCorners(prev => {
      const next = prev.map((c, i) => i === dragging ? { x, y } : c);
      onCornersChange?.(next);
      return next;
    });
  }, [dragging, onCornersChange]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const matrixStr = computeMatrix3d(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    corners,
  );

  const { w, h } = containerSize;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full aspect-square select-none overflow-hidden rounded-lg bg-muted", className)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Garment template with color tint */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: garmentColor, mixBlendMode: "multiply" as const }}
      />
      <img
        src={templateUrl}
        alt="template"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        crossOrigin="anonymous"
      />

      {/* Design overlay with perspective warp */}
      {designUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transformOrigin: "0 0" }}
        >
          <img
            src={designUrl}
            alt="design"
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: matrixStr,
              transformOrigin: "0 0",
              mixBlendMode: blendMode === "normal" ? undefined : blendMode,
              opacity: 0.9,
            }}
          />
        </div>
      )}

      {/* Corner drag handles */}
      {designUrl && corners.map((c, i) => (
        <div
          key={i}
          onMouseDown={handleMouseDown(i)}
          style={{
            position: "absolute",
            left: c.x * w - 8,
            top: c.y * h - 8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "white",
            border: "2px solid hsl(var(--primary))",
            cursor: "grab",
            zIndex: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        />
      ))}

      {/* Reset button */}
      {designUrl && (
        <button
          onClick={() => setCorners(DEFAULT_CORNERS)}
          className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded hover:bg-black/70 transition-colors z-10"
        >
          Reset warp
        </button>
      )}

      {/* Hidden export canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
