import { useRef, useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Save,
  Printer,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
} from "lucide-react";
import type { IText } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  EditorProvider,
  useEditor,
  ARTBOARD_W,
  ARTBOARD_H,
} from "@/components/editor/canvas-editor";
import { Toolbar } from "@/components/editor/toolbar";
import { LayersPanel } from "@/components/editor/layers-panel";
import { PrintToolsPanel } from "@/components/editor/print-tools-panel";
import { ExportModal } from "@/components/editor/export-modal";

// ── Google Fonts loader ─────────────────────────────────────────────────────

const SYSTEM_FONTS = [
  "Arial",
  "Arial Black",
  "Impact",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Tahoma",
];
const WEB_FONTS = [
  "Bebas Neue",
  "Oswald",
  "Anton",
  "Barlow Condensed",
  "Roboto Condensed",
];

function loadGoogleFont(family: string) {
  const id = `gfont-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`;
  document.head.appendChild(link);
}

// ── Text Options Bar ────────────────────────────────────────────────────────

function TextOptionsBar() {
  const { canvas, snapshot, removeLayer, addSvg } = useEditor();
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [fill, setFill] = useState("#000000");
  const [charSpacing, setCharSpacing] = useState(0);

  // Sync controls to the active text object
  useEffect(() => {
    if (!canvas) return;
    function sync() {
      const obj = canvas!.getActiveObject();
      if (obj?.type !== "i-text") return;
      const t = obj as IText;
      setFontFamily((t.fontFamily as string) ?? "Arial");
      setFontSize(t.fontSize ?? 32);
      setBold(t.fontWeight === "bold");
      setItalic(t.fontStyle === "italic");
      setFill((t.fill as string) ?? "#000000");
      setCharSpacing(t.charSpacing ?? 0);
    }
    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    sync();
    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
    };
  }, [canvas]);

  function applyProp(props: Record<string, unknown>) {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== "i-text") return;
    (obj as IText).set(props as Parameters<IText["set"]>[0]);
    canvas!.requestRenderAll();
    snapshot();
  }

  async function handleOutlineText() {
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== "i-text") return;
    const t = obj as IText & { data?: Record<string, unknown> };
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg">${t.toSVG()}</svg>`;
    const lid = t.data?.layerId as string | undefined;
    if (lid) removeLayer(lid);
    await addSvg(svgStr, "Outlined Text");
  }

  return (
    <div className="flex items-center gap-1.5 px-3 h-9 border-b border-border bg-card/90 shrink-0 overflow-x-auto">
      {/* Font family */}
      <Select value={fontFamily} onValueChange={(f) => {
        setFontFamily(f);
        if (WEB_FONTS.includes(f)) loadGoogleFont(f);
        applyProp({ fontFamily: f });
      }}>
        <SelectTrigger className="h-6 w-40 text-xs border-none shadow-none bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SYSTEM_FONTS.map((f) => (
            <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
          ))}
          <Separator className="my-1" />
          {WEB_FONTS.map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font size */}
      <Input
        type="number"
        className="h-6 w-14 text-xs px-1.5"
        value={fontSize}
        min={6}
        max={400}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (v > 0) { setFontSize(v); applyProp({ fontSize: v }); }
        }}
      />

      <Separator orientation="vertical" className="h-4" />

      {/* Bold / Italic */}
      <Button size="icon" variant={bold ? "default" : "ghost"} className="w-6 h-6"
        onClick={() => { const next = !bold; setBold(next); applyProp({ fontWeight: next ? "bold" : "normal" }); }}>
        <Bold className="w-3 h-3" />
      </Button>
      <Button size="icon" variant={italic ? "default" : "ghost"} className="w-6 h-6"
        onClick={() => { const next = !italic; setItalic(next); applyProp({ fontStyle: next ? "italic" : "normal" }); }}>
        <Italic className="w-3 h-3" />
      </Button>

      <Separator orientation="vertical" className="h-4" />

      {/* Alignment */}
      {(["left", "center", "right"] as const).map((align, i) => {
        const Icon = [AlignLeft, AlignCenter, AlignRight][i];
        return (
          <Button key={align} size="icon" variant="ghost" className="w-6 h-6"
            onClick={() => applyProp({ textAlign: align })}>
            <Icon className="w-3 h-3" />
          </Button>
        );
      })}

      <Separator orientation="vertical" className="h-4" />

      {/* Color */}
      <input
        type="color"
        className="w-6 h-6 rounded border border-border cursor-pointer p-0 bg-transparent"
        value={fill}
        onChange={(e) => { setFill(e.target.value); applyProp({ fill: e.target.value }); }}
      />

      <Separator orientation="vertical" className="h-4" />

      {/* Letter spacing */}
      <span className="text-[10px] text-muted-foreground shrink-0">Spacing</span>
      <Slider
        className="w-16 shrink-0"
        min={-100} max={800} step={10}
        value={[charSpacing]}
        onValueChange={([v]) => { setCharSpacing(v); applyProp({ charSpacing: v }); }}
      />
      <span className="text-[10px] font-mono text-muted-foreground w-7 shrink-0">{charSpacing}</span>

      <Separator orientation="vertical" className="h-4" />

      <Button variant="outline" className="h-6 text-[10px] px-2 shrink-0" onClick={handleOutlineText}>
        Outline (print-safe)
      </Button>
    </div>
  );
}

// ── Editor Header ───────────────────────────────────────────────────────────

interface HeaderProps {
  projectId: number | undefined;
  isSaving: boolean;
  onSave(): void;
  onExport(): void;
  onSendToPrint(): void;
}

function EditorHeader({ projectId, isSaving, onSave, onExport, onSendToPrint }: HeaderProps) {
  const { undo, redo, canUndo, canRedo } = useEditor();

  return (
    <header className="h-10 flex items-center px-2 gap-1 border-b border-border bg-card shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
            <Link href={projectId ? `/projects/${projectId}` : "/projects"}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />
      <span className="text-xs font-semibold tracking-tight">Image Editor</span>
      <span className="text-[10px] text-muted-foreground ml-1">{ARTBOARD_W}×{ARTBOARD_H}px</span>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={undo} disabled={!canUndo}>
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={redo} disabled={!canRedo}>
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5" onClick={onExport}>
        <Download className="w-3 h-3" />Export
      </Button>

      {projectId && (
        <>
          <Button size="sm" className="h-7 px-2.5 text-xs gap-1.5" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5"
            onClick={onSendToPrint}
          >
            <Printer className="w-3 h-3" />Print
          </Button>
        </>
      )}
    </header>
  );
}

// ── Editor Shell ────────────────────────────────────────────────────────────
// Must be a child of EditorProvider so it can call useEditor().
// The canvasRef is rendered here directly in the center area — Fabric.js
// wraps it in div.canvas-container after the parent's useEffect initialises.

interface ShellProps {
  projectId: number | undefined;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function EditorShell({ projectId, canvasRef }: ShellProps) {
  const { canvas, exportPNG } = useEditor();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [zoom, setZoom] = useState(0.82);
  const [showExport, setShowExport] = useState(false);
  const [rightTab, setRightTab] = useState("layers");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Apply zoom via Fabric viewport — keeps pointer events correct
  useEffect(() => {
    if (!canvas) return;
    canvas.setZoom(zoom);
    canvas.setDimensions({ width: ARTBOARD_W * zoom, height: ARTBOARD_H * zoom });
    canvas.requestRenderAll();
  }, [canvas, zoom]);

  // Track active object type for contextual bars
  useEffect(() => {
    if (!canvas) return;
    const onSel = () => setSelectedType(canvas.getActiveObject()?.type ?? null);
    const onClear = () => setSelectedType(null);
    canvas.on("selection:created", onSel);
    canvas.on("selection:updated", onSel);
    canvas.on("selection:cleared", onClear);
    return () => {
      canvas.off("selection:created", onSel);
      canvas.off("selection:updated", onSel);
      canvas.off("selection:cleared", onClear);
    };
  }, [canvas]);

  function getApiBase() {
    const base = import.meta.env.BASE_URL ?? "/";
    return base.endsWith("/") ? `${base}api` : `${base}/api`;
  }

  async function handleSave() {
    if (!projectId || !canvas) return;
    setIsSaving(true);
    try {
      const api = getApiBase();
      const ts = Date.now();

      // 1 — Export PNG and upload as project asset (also creates history event via assets route)
      const dataUrl = exportPNG(300);
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, `canvas-${ts}.png`);
      fd.append("type", "photo");
      fd.append("name", `Editor canvas — ${new Date().toLocaleString()}`);
      const assetRes = await fetch(`${api}/projects/${projectId}/assets`, {
        method: "POST",
        body: fd,
      });
      if (!assetRes.ok) throw new Error(await assetRes.text());
      const assetData = await assetRes.json() as { id: number; url: string };

      // 2 — Persist canvas JSON state to localStorage for session restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvasJson = (canvas as any).toJSON(["data"]);
      const stateKey = `canvas-state-${projectId}`;
      try {
        localStorage.setItem(stateKey, JSON.stringify({ ts, json: canvasJson }));
      } catch {
        // Storage quota exceeded — silently skip local persist
      }

      // 3 — Emit explicit history event with canvas metadata
      await fetch(`${api}/projects/${projectId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "canvas_saved",
          description: "Canvas saved from Image Editor",
          metadata: {
            assetId: assetData.id,
            assetUrl: assetData.url,
            layerCount: canvas.getObjects().length,
            savedAt: new Date().toISOString(),
          },
        }),
      });

      toast({ title: "Saved", description: "Canvas saved to project history and assets." });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleSendToPrint() {
    if (!canvas || !projectId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvasJson = (canvas as any).toJSON(["data"]);
      const previewDataUrl = exportPNG(72); // low-res preview for print job
      sessionStorage.setItem("print-canvas-json", JSON.stringify(canvasJson));
      sessionStorage.setItem("print-canvas-preview", previewDataUrl);
    } catch {
      // sessionStorage unavailable — proceed without canvas payload
    }
    navigate(`/print?projectId=${projectId}&fromEditor=1`);
  }

  // Restore canvas state from localStorage on init
  useEffect(() => {
    if (!canvas || !projectId) return;
    const stateKey = `canvas-state-${projectId}`;
    const stored = localStorage.getItem(stateKey);
    if (!stored) return;
    try {
      const { json } = JSON.parse(stored) as { ts: number; json: unknown };
      // Only restore if canvas is currently blank
      if (canvas.getObjects().length > 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (canvas as any).loadFromJSON(json, () => {
        canvas.requestRenderAll();
      });
    } catch {
      // Corrupt state — ignore
    }
  }, [canvas, projectId]);

  const isText = selectedType === "i-text" || selectedType === "text";

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      <EditorHeader
        projectId={projectId}
        isSaving={isSaving}
        onSave={handleSave}
        onExport={() => setShowExport(true)}
        onSendToPrint={handleSendToPrint}
      />

      {isText && <TextOptionsBar />}

      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <Toolbar
          zoom={zoom}
          onZoomChange={setZoom}
          onOpenPrintTools={() => setRightTab("print")}
        />

        {/* Canvas scroll area */}
        <div className="flex-1 overflow-auto" style={{ minHeight: 0, backgroundColor: "hsl(var(--muted) / 0.4)" }}>
          <div
            style={{
              minHeight: "100%",
              minWidth: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              boxSizing: "border-box",
            }}
          >
            {/*
              canvas element is rendered here.
              After EditorProvider's useEffect fires, Fabric wraps this
              element in a div.canvas-container at the same DOM position.
              Zoom is applied via canvas.setZoom() + setDimensions().
            */}
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right panel */}
        <div className="w-60 border-l border-border flex flex-col min-h-0 shrink-0">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="rounded-none border-b h-9 w-full bg-transparent p-0 gap-0 shrink-0">
              {(["layers", "print"] as const).map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="flex-1 rounded-none text-xs h-9 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  {t === "print" ? "Print Tools" : "Layers"}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="layers" className="flex-1 min-h-0 mt-0 overflow-y-auto">
              <LayersPanel />
            </TabsContent>
            <TabsContent value="print" className="flex-1 min-h-0 mt-0 overflow-y-auto">
              <PrintToolsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ExportModal
        open={showExport}
        onOpenChange={setShowExport}
        projectId={projectId}
        onSaved={() => toast({ title: "Saved to project assets" })}
      />
    </div>
  );
}

// ── Root page ───────────────────────────────────────────────────────────────

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, params] = useRoute("/projects/:id/editor");
  const projectId = params?.id ? parseInt(params.id, 10) : undefined;

  return (
    /*
     * EditorProvider initializes Fabric.js in a useEffect.
     * EditorShell (child) renders <canvas ref={canvasRef} /> into the DOM first
     * (React commits DOM before running effects), so canvasRef.current is set
     * by the time EditorProvider's useEffect fires — Fabric finds the element.
     */
    <EditorProvider canvasRef={canvasRef} width={ARTBOARD_W} height={ARTBOARD_H}>
      <EditorShell projectId={projectId} canvasRef={canvasRef} />
    </EditorProvider>
  );
}
