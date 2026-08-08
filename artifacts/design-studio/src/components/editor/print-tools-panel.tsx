import { useCallback, useEffect, useRef, useState } from "react";
import { FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { useEditor } from "./canvas-editor";

// ── helpers ────────────────────────────────────────────────────────────────

function getApiBase() {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}api` : `${base}/api`;
}

function getImageDataFromSelected(canvas: ReturnType<typeof useEditor>["canvas"]): ImageData | null {
  if (!canvas) return null;
  const active = canvas.getActiveObject();
  if (!active) return null;

  const w = Math.round((active.width ?? 100) * (active.scaleX ?? 1));
  const h = Math.round((active.height ?? 100) * (active.scaleY ?? 1));
  if (w < 1 || h < 1) return null;

  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const ctx2d = tmp.getContext("2d")!;

  if (active.type === "image") {
    const img = active as FabricImage;
    const el = img.getElement() as HTMLImageElement | HTMLCanvasElement;
    ctx2d.drawImage(el, 0, 0, w, h);
  } else {
    active.clone().then((cloned: ReturnType<typeof active.clone> extends Promise<infer T> ? T : never) => {
      (cloned as typeof active).render(ctx2d);
    });
    active.render(ctx2d);
  }

  return ctx2d.getImageData(0, 0, w, h);
}

function imageDataToDataUrl(imgData: ImageData): string {
  const tmp = document.createElement("canvas");
  tmp.width = imgData.width;
  tmp.height = imgData.height;
  tmp.getContext("2d")!.putImageData(imgData, 0, 0);
  return tmp.toDataURL("image/png");
}

// ── Preview Canvas ─────────────────────────────────────────────────────────

function PreviewCanvas({ dataUrl }: { dataUrl: string | null }) {
  return (
    <div className="w-full aspect-video rounded border border-border bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2YwZjBmMCIvPjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')] overflow-hidden flex items-center justify-center">
      {dataUrl ? (
        <img src={dataUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
      ) : (
        <span className="text-xs text-muted-foreground">Preview will appear here</span>
      )}
    </div>
  );
}

// ── Halftone ───────────────────────────────────────────────────────────────

// Default CMYK screen angles (standard offset printing)
const DEFAULT_ANGLES = { c: 15, m: 75, y: 0, k: 45 };

function AngleSlider({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold w-3 shrink-0 ${color}`}>{label}</span>
      <Slider
        className="flex-1"
        min={0}
        max={360}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{value}°</span>
    </div>
  );
}

function HalftoneTool() {
  const { canvas, addImageFromDataUrl } = useEditor();
  const [lpi, setLpi] = useState(60);
  const [angles, setAngles] = useState({ ...DEFAULT_ANGLES });
  const [dotShape, setDotShape] = useState("round");
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(
      new URL("../../workers/halftone.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = w;
    w.onmessage = (e) => {
      const { imageData } = e.data;
      setPreview(imageDataToDataUrl(imageData));
      setWorking(false);
    };
    return () => w.terminate();
  }, []);

  const runPreview = useCallback(() => {
    const imgData = getImageDataFromSelected(canvas);
    if (!imgData || !workerRef.current) return;
    setWorking(true);
    workerRef.current.postMessage({ imageData: imgData, lpi, angles, dotShape });
  }, [canvas, lpi, angles, dotShape]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runPreview, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [runPreview]);

  function setAngle(ch: keyof typeof angles, v: number) {
    setAngles((prev) => ({ ...prev, [ch]: v }));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs">LPI (Lines Per Inch)</Label>
          <span className="text-xs font-mono text-muted-foreground">{lpi}</span>
        </div>
        <Slider min={15} max={200} step={1} value={[lpi]} onValueChange={([v]) => setLpi(v)} />
      </div>

      {/* Per-channel CMYK screen angles */}
      <div className="space-y-1.5">
        <Label className="text-xs">Screen Angles (0–360°)</Label>
        <div className="space-y-1">
          <AngleSlider label="C" color="text-cyan-400"    value={angles.c} onChange={(v) => setAngle("c", v)} />
          <AngleSlider label="M" color="text-pink-400"    value={angles.m} onChange={(v) => setAngle("m", v)} />
          <AngleSlider label="Y" color="text-yellow-400"  value={angles.y} onChange={(v) => setAngle("y", v)} />
          <AngleSlider label="K" color="text-muted-foreground" value={angles.k} onChange={(v) => setAngle("k", v)} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] w-full"
          onClick={() => setAngles({ ...DEFAULT_ANGLES })}
        >
          Reset to standard (15/75/0/45°)
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Dot Shape</Label>
        <Select value={dotShape} onValueChange={setDotShape}>
          <SelectTrigger className="h-7 min-h-[44px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="round">Round</SelectItem>
            <SelectItem value="ellipse">Ellipse</SelectItem>
            <SelectItem value="diamond">Diamond</SelectItem>
            <SelectItem value="line">Line Screen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PreviewCanvas dataUrl={working ? null : preview} />
      {working && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Computing CMYK halftone…
        </div>
      )}

      <Button
        size="sm"
        className="w-full text-xs"
        disabled={!preview || working}
        onClick={() => { if (preview) addImageFromDataUrl(preview, "Halftone"); }}
      >
        Apply to Canvas
      </Button>
    </div>
  );
}

// ── Threshold ──────────────────────────────────────────────────────────────

function ThresholdTool() {
  const { canvas, addImageFromDataUrl } = useEditor();
  const [threshold, setThreshold] = useState(128);
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../../workers/threshold.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e) => {
      setPreview(imageDataToDataUrl(e.data.imageData));
      setWorking(false);
    };
    return () => w.terminate();
  }, []);

  const runPreview = useCallback(() => {
    const imgData = getImageDataFromSelected(canvas);
    if (!imgData || !workerRef.current) return;
    setWorking(true);
    workerRef.current.postMessage({ imageData: imgData, threshold });
  }, [canvas, threshold]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runPreview, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [runPreview]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs">Threshold</Label>
          <span className="text-xs font-mono text-muted-foreground">{threshold}</span>
        </div>
        <Slider min={1} max={254} step={1} value={[threshold]} onValueChange={([v]) => setThreshold(v)} />
      </div>
      <PreviewCanvas dataUrl={working ? null : preview} />
      {working && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Computing…</div>}
      <Button size="sm" className="w-full text-xs" disabled={!preview || working}
        onClick={() => { if (preview) addImageFromDataUrl(preview, "Threshold"); }}>
        Apply to Canvas
      </Button>
    </div>
  );
}

// ── Posterize ──────────────────────────────────────────────────────────────

function PosterizeTool() {
  const { canvas, addImageFromDataUrl } = useEditor();
  const [levels, setLevels] = useState(4);
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../../workers/posterize.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e) => {
      setPreview(imageDataToDataUrl(e.data.imageData));
      setWorking(false);
    };
    return () => w.terminate();
  }, []);

  const runPreview = useCallback(() => {
    const imgData = getImageDataFromSelected(canvas);
    if (!imgData || !workerRef.current) return;
    setWorking(true);
    workerRef.current.postMessage({ imageData: imgData, levels });
  }, [canvas, levels]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runPreview, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [runPreview]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs">Color Levels</Label>
          <span className="text-xs font-mono text-muted-foreground">{levels}</span>
        </div>
        <Slider min={2} max={8} step={1} value={[levels]} onValueChange={([v]) => setLevels(v)} />
      </div>
      <PreviewCanvas dataUrl={working ? null : preview} />
      {working && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Computing…</div>}
      <Button size="sm" className="w-full text-xs" disabled={!preview || working}
        onClick={() => { if (preview) addImageFromDataUrl(preview, "Posterize"); }}>
        Apply to Canvas
      </Button>
    </div>
  );
}

// ── Channel Split ──────────────────────────────────────────────────────────

function ChannelSplitTool() {
  const { canvas, addImageFromDataUrl } = useEditor();
  const [mode, setMode] = useState<"rgb" | "cmyk">("rgb");
  const [working, setWorking] = useState(false);

  function extractChannel(imgData: ImageData, channel: number): ImageData {
    const out = new ImageData(imgData.width, imgData.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = imgData.data[i + channel];
      out.data[i] = v;
      out.data[i + 1] = v;
      out.data[i + 2] = v;
      out.data[i + 3] = 255;
    }
    return out;
  }

  function rgbToCmyk(r: number, g: number, b: number) {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const k = 1 - Math.max(rf, gf, bf);
    if (k === 1) return [0, 0, 0, 1];
    const c = (1 - rf - k) / (1 - k);
    const m = (1 - gf - k) / (1 - k);
    const y = (1 - bf - k) / (1 - k);
    return [c, m, y, k];
  }

  function extractCMYKChannel(imgData: ImageData, ch: 0 | 1 | 2 | 3): ImageData {
    const out = new ImageData(imgData.width, imgData.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const cmyk = rgbToCmyk(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
      const v = Math.round((1 - cmyk[ch]) * 255);
      out.data[i] = v;
      out.data[i + 1] = v;
      out.data[i + 2] = v;
      out.data[i + 3] = 255;
    }
    return out;
  }

  async function applyChannelSplit() {
    const imgData = getImageDataFromSelected(canvas);
    if (!imgData) return;
    setWorking(true);
    try {
      if (mode === "rgb") {
        const names = ["Red Channel", "Green Channel", "Blue Channel"];
        for (let ch = 0; ch < 3; ch++) {
          await new Promise<void>((res) => setTimeout(res, 10));
          const out = extractChannel(imgData, ch);
          await addImageFromDataUrl(imageDataToDataUrl(out), names[ch]);
        }
      } else {
        const names = ["Cyan", "Magenta", "Yellow", "Black (Key)"];
        for (let ch = 0; ch < 4; ch++) {
          await new Promise<void>((res) => setTimeout(res, 10));
          const out = extractCMYKChannel(imgData, ch as 0 | 1 | 2 | 3);
          await addImageFromDataUrl(imageDataToDataUrl(out), names[ch]);
        }
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Color Mode</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as "rgb" | "cmyk")}>
          <SelectTrigger className="h-7 min-h-[44px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rgb">RGB (3 layers)</SelectItem>
            <SelectItem value="cmyk">CMYK (4 layers)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Separates the selected image into {mode === "rgb" ? "R, G, B" : "C, M, Y, K"} grayscale channel layers. Each layer represents ink coverage for that separation.
      </p>
      <Button size="sm" className="w-full text-xs" onClick={applyChannelSplit} disabled={working}>
        {working ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Splitting…</> : `Split into ${mode.toUpperCase()} Channels`}
      </Button>
    </div>
  );
}

// ── Vectorize ──────────────────────────────────────────────────────────────

function VectorizeTool() {
  const { canvas, addSvg } = useEditor();
  const [colorThreshold, setColorThreshold] = useState(128);
  const [maxSize, setMaxSize] = useState(512);
  const [simplification, setSimplification] = useState(2);
  const [preview, setPreview] = useState<string | null>(null);
  const [svgStr, setSvgStr] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runVectorize() {
    const active = canvas?.getActiveObject();
    if (!active || active.type !== "image") {
      setError("Select an image layer first.");
      return;
    }

    setWorking(true);
    setError(null);
    setSvgStr(null);
    setPreview(null);

    try {
      const imgEl = (active as FabricImage).getElement() as HTMLImageElement | HTMLCanvasElement;
      const tmp = document.createElement("canvas");
      tmp.width = imgEl instanceof HTMLCanvasElement ? imgEl.width : imgEl.naturalWidth || 200;
      tmp.height = imgEl instanceof HTMLCanvasElement ? imgEl.height : imgEl.naturalHeight || 200;
      tmp.getContext("2d")!.drawImage(imgEl, 0, 0);
      const b64 = tmp.toDataURL("image/png");

      const res = await fetch(`${getApiBase()}/vectorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: b64, colorThreshold, maxSize, simplification }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { svg: string; width: number; height: number };
      setSvgStr(data.svg);
      const blob = new Blob([data.svg], { type: "image/svg+xml" });
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vectorize failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs">Color Threshold</Label>
          <span className="text-xs font-mono text-muted-foreground">{colorThreshold}</span>
        </div>
        <Slider min={1} max={254} step={1} value={[colorThreshold]} onValueChange={([v]) => setColorThreshold(v)} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs">Max Resolution</Label>
          <span className="text-xs font-mono text-muted-foreground">{maxSize}px</span>
        </div>
        <Slider min={128} max={1024} step={64} value={[maxSize]} onValueChange={([v]) => setMaxSize(v)} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs">Path Simplification</Label>
          <span className="text-xs font-mono text-muted-foreground">{simplification}</span>
        </div>
        <Slider min={0} max={20} step={1} value={[simplification]} onValueChange={([v]) => setSimplification(v)} />
        <p className="text-[10px] text-muted-foreground">
          Higher values merge small noise paths — reduces file size.
        </p>
      </div>

      <Button size="sm" className="w-full text-xs" onClick={runVectorize} disabled={working}>
        {working ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Tracing…</> : "Trace to Vector"}
      </Button>

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {preview && <PreviewCanvas dataUrl={preview} />}

      {svgStr && (
        <Button size="sm" variant="outline" className="w-full text-xs"
          onClick={() => addSvg(svgStr, "Vectorized")}>
          Add SVG to Canvas
        </Button>
      )}
    </div>
  );
}

// ── Print Tools Panel ──────────────────────────────────────────────────────

export function PrintToolsPanel() {
  const { canvas } = useEditor();
  const hasSelection = !!canvas?.getActiveObject();

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Print Tools</span>
        {!hasSelection && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Select a layer to apply tools</p>
        )}
      </div>

      {!hasSelection ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-1">
            <Badge variant="outline" className="text-[10px]">No Selection</Badge>
            <p className="text-[11px] text-muted-foreground">Click an image or shape on the canvas to select it, then use the tools below.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="halftone">
            <TabsList className="w-full rounded-none border-b border-border h-8 bg-transparent p-0 gap-0">
              {["halftone", "threshold", "posterize", "channels", "vectorize"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="flex-1 rounded-none text-[10px] h-8 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary capitalize"
                >
                  {t === "channels" ? "Split" : t === "threshold" ? "Thresh" : t.charAt(0).toUpperCase() + t.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-3">
              <TabsContent value="halftone" className="mt-0"><HalftoneTool /></TabsContent>
              <TabsContent value="threshold" className="mt-0"><ThresholdTool /></TabsContent>
              <TabsContent value="posterize" className="mt-0"><PosterizeTool /></TabsContent>
              <TabsContent value="channels" className="mt-0"><ChannelSplitTool /></TabsContent>
              <TabsContent value="vectorize" className="mt-0"><VectorizeTool /></TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
