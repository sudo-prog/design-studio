import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Canvas,
  FabricImage,
  IText,
  Rect,
  Circle,
  Triangle,
  Line,
  PencilBrush,
  util,
  loadSVGFromString,
  type FabricObject,
} from "fabric";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
}

export interface CanvasPlugin {
  name: string;
  cursor?: string;
  onActivate(canvas: Canvas): void;
  onDeactivate(canvas: Canvas): void;
}

export interface EditorContextValue {
  canvas: Canvas | null;
  activeTool: string;
  setActiveTool(name: string): void;
  layers: LayerInfo[];
  canUndo: boolean;
  canRedo: boolean;
  undo(): void;
  redo(): void;
  snapshot(): void;
  registerPlugin(plugin: CanvasPlugin): void;
  addImageFromDataUrl(dataUrl: string, name?: string): Promise<void>;
  addText(text?: string): void;
  addShape(type: "rect" | "circle" | "triangle" | "line"): void;
  addSvg(svgStr: string, name?: string): Promise<void>;
  updateLayer(id: string, updates: Partial<LayerInfo>): void;
  removeLayer(id: string): void;
  reorderLayer(id: string, direction: "up" | "down"): void;
  deleteSelected(): void;
  exportPNG(dpi?: number, transparent?: boolean): string;
  exportSVG(): string;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const ARTBOARD_W = 900;
export const ARTBOARD_H = 675;
const MAX_HISTORY = 50;

// ── Layer helpers ──────────────────────────────────────────────────────────

let _seq = 0;
const newId = () => `l${++_seq}`;

type DataObj = FabricObject & { data?: Record<string, unknown> };

function ensureData(obj: FabricObject) {
  const o = obj as DataObj;
  if (!o.data) o.data = {};
  if (!o.data.layerId) o.data.layerId = newId();
  if (!o.data.layerName) {
    const labels: Record<string, string> = {
      image: "Image", "i-text": "Text", text: "Text",
      rect: "Rectangle", circle: "Circle", triangle: "Triangle",
      line: "Line", path: "Path", group: "Group",
    };
    o.data.layerName = labels[obj.type ?? ""] ?? "Layer";
  }
  return o;
}

function objToLayer(obj: FabricObject): LayerInfo {
  const d = ensureData(obj).data!;
  return {
    id: d.layerId as string,
    name: d.layerName as string,
    type: obj.type ?? "object",
    visible: obj.visible !== false,
    opacity: Math.round((obj.opacity ?? 1) * 100),
    locked: !!(d.locked as boolean),
  };
}

// ── Provider ───────────────────────────────────────────────────────────────

interface EditorProviderProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  children: React.ReactNode;
  width?: number;
  height?: number;
}

export function EditorProvider({
  canvasRef,
  children,
  width = ARTBOARD_W,
  height = ARTBOARD_H,
}: EditorProviderProps) {
  const fabricRef = useRef<Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const pluginsRef = useRef<Map<string, CanvasPlugin>>(new Map());
  const activeToolRef = useRef("select");
  const [, forceUpdate] = useState(0);

  const [activeTool, setActiveToolState] = useState("select");
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncLayers = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    const objs = c.getObjects();
    const infos: LayerInfo[] = [];
    for (let i = objs.length - 1; i >= 0; i--) {
      infos.push(objToLayer(objs[i]));
    }
    setLayers(infos);
  }, []);

  const snapshot = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.stringify((c as any).toJSON(["data"]));
    const past = historyRef.current.slice(0, historyIdxRef.current + 1);
    past.push(json);
    if (past.length > MAX_HISTORY) past.shift();
    else historyIdxRef.current = past.length - 1;
    historyRef.current = past;
    historyIdxRef.current = past.length - 1;
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(async () => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const c = fabricRef.current;
    if (!c) return;
    await c.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current]));
    c.requestRenderAll();
    syncLayers();
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
  }, [syncLayers]);

  const redo = useCallback(async () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const c = fabricRef.current;
    if (!c) return;
    await c.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current]));
    c.requestRenderAll();
    syncLayers();
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, [syncLayers]);

  const registerPlugin = useCallback((plugin: CanvasPlugin) => {
    pluginsRef.current.set(plugin.name, plugin);
  }, []);

  const setActiveTool = useCallback((name: string) => {
    const c = fabricRef.current;
    if (!c) return;
    const prev = pluginsRef.current.get(activeToolRef.current);
    prev?.onDeactivate(c);
    const next = pluginsRef.current.get(name);
    if (next) {
      next.onActivate(c);
      if (next.cursor) c.defaultCursor = next.cursor;
    }
    activeToolRef.current = name;
    setActiveToolState(name);
  }, []);

  const addImageFromDataUrl = useCallback(async (dataUrl: string, name?: string) => {
    const c = fabricRef.current;
    if (!c) return;
    const img = await FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
    const iw = img.width ?? 1;
    const ih = img.height ?? 1;
    const scale = Math.min(1, (width * 0.7) / iw, (height * 0.7) / ih);
    img.set({ left: (width - iw * scale) / 2, top: (height - ih * scale) / 2, scaleX: scale, scaleY: scale });
    ensureData(img).data!.layerName = name ?? "Image";
    c.add(img);
    c.setActiveObject(img);
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [width, height, snapshot, syncLayers]);

  const addText = useCallback((text = "Double-click to edit") => {
    const c = fabricRef.current;
    if (!c) return;
    const t = new IText(text, {
      left: width / 2 - 100,
      top: height / 2 - 24,
      fontSize: 32,
      fill: "#000000",
      fontFamily: "Arial",
    });
    ensureData(t).data!.layerName = "Text";
    c.add(t);
    c.setActiveObject(t);
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [width, height, snapshot, syncLayers]);

  const addShape = useCallback((type: "rect" | "circle" | "triangle" | "line") => {
    const c = fabricRef.current;
    if (!c) return;
    const cx = width / 2;
    const cy = height / 2;
    let obj: FabricObject;
    if (type === "rect") {
      obj = new Rect({ left: cx - 60, top: cy - 60, width: 120, height: 120, fill: "#4f46e5" });
    } else if (type === "circle") {
      obj = new Circle({ left: cx - 60, top: cy - 60, radius: 60, fill: "#4f46e5" });
    } else if (type === "triangle") {
      obj = new Triangle({ left: cx - 60, top: cy - 60, width: 120, height: 120, fill: "#4f46e5" });
    } else {
      obj = new Line([cx - 80, cy, cx + 80, cy], { stroke: "#000000", strokeWidth: 2 });
    }
    const names = { rect: "Rectangle", circle: "Circle", triangle: "Triangle", line: "Line" };
    ensureData(obj).data!.layerName = names[type];
    c.add(obj);
    c.setActiveObject(obj);
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [width, height, snapshot, syncLayers]);

  const addSvg = useCallback(async (svgStr: string, name?: string) => {
    const c = fabricRef.current;
    if (!c) return;
    const { objects, options } = await loadSVGFromString(svgStr);
    const valid = objects.filter(Boolean) as FabricObject[];
    const group = util.groupSVGElements(valid, options ?? {});
    const gw = group.width ?? 1;
    const gh = group.height ?? 1;
    const scale = Math.min(1, (width * 0.6) / gw, (height * 0.6) / gh);
    group.set({ left: (width - gw * scale) / 2, top: (height - gh * scale) / 2, scaleX: scale, scaleY: scale });
    ensureData(group).data!.layerName = name ?? "Vector";
    c.add(group);
    c.setActiveObject(group);
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [width, height, snapshot, syncLayers]);

  const getObjById = useCallback((id: string) => {
    return fabricRef.current?.getObjects().find((o) => {
      return (o as DataObj).data?.layerId === id;
    });
  }, []);

  const updateLayer = useCallback((id: string, updates: Partial<LayerInfo>) => {
    const c = fabricRef.current;
    const obj = getObjById(id);
    if (!c || !obj) return;
    if (updates.visible !== undefined) obj.set("visible", updates.visible);
    if (updates.opacity !== undefined) obj.set("opacity", updates.opacity / 100);
    if (updates.locked !== undefined) {
      const locked = updates.locked;
      obj.set({
        selectable: !locked,
        evented: !locked,
        lockMovementX: locked,
        lockMovementY: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        lockRotation: locked,
      });
      (obj as DataObj).data!.locked = locked;
    }
    if (updates.name !== undefined) {
      (obj as DataObj).data!.layerName = updates.name;
    }
    c.requestRenderAll();
    syncLayers();
  }, [getObjById, syncLayers]);

  const removeLayer = useCallback((id: string) => {
    const c = fabricRef.current;
    const obj = getObjById(id);
    if (!c || !obj) return;
    c.remove(obj);
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [getObjById, syncLayers, snapshot]);

  const reorderLayer = useCallback((id: string, direction: "up" | "down") => {
    const c = fabricRef.current;
    const obj = getObjById(id);
    if (!c || !obj) return;
    if (direction === "up") c.bringObjectForward(obj);
    else c.sendObjectBackwards(obj);
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [getObjById, syncLayers, snapshot]);

  const deleteSelected = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    const active = c.getActiveObjects();
    active.forEach((o) => c.remove(o));
    c.discardActiveObject();
    c.requestRenderAll();
    syncLayers();
    snapshot();
  }, [syncLayers, snapshot]);

  const exportPNG = useCallback((dpi = 96, transparent = false) => {
    const c = fabricRef.current;
    if (!c) return "";
    if (transparent) {
      const prevBg = c.backgroundColor;
      c.backgroundColor = "";
      c.requestRenderAll();
      const url = c.toDataURL({ format: "png", multiplier: dpi / 96 });
      c.backgroundColor = prevBg;
      c.requestRenderAll();
      return url;
    }
    return c.toDataURL({ format: "png", multiplier: dpi / 96 });
  }, []);

  const exportSVG = useCallback(() => {
    return fabricRef.current?.toSVG() ?? "";
  }, []);

  // ── Init Fabric canvas ─────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const c = new Canvas(el, {
      width,
      height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
    fabricRef.current = c;
    forceUpdate((n) => n + 1);

    const onChange = () => syncLayers();
    const onModified = () => { syncLayers(); snapshot(); };

    c.on("object:added", onChange);
    c.on("object:removed", onChange);
    c.on("object:modified", onModified);
    c.on("selection:created", onChange);
    c.on("selection:cleared", onChange);
    c.on("path:created", onModified);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = JSON.stringify((c as any).toJSON(["data"]));
    historyRef.current = [init];
    historyIdxRef.current = 0;

    return () => {
      c.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteSelected]);

  const ctx = useMemo<EditorContextValue>(() => ({
    canvas: fabricRef.current,
    activeTool,
    setActiveTool,
    layers,
    canUndo,
    canRedo,
    undo,
    redo,
    snapshot,
    registerPlugin,
    addImageFromDataUrl,
    addText,
    addShape,
    addSvg,
    updateLayer,
    removeLayer,
    reorderLayer,
    deleteSelected,
    exportPNG,
    exportSVG,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activeTool, layers, canUndo, canRedo, undo, redo, snapshot, registerPlugin,
    addImageFromDataUrl, addText, addShape, addSvg, updateLayer, removeLayer, reorderLayer,
    deleteSelected, exportPNG, exportSVG, setActiveTool]);

  return (
    <EditorContext.Provider value={{ ...ctx, canvas: fabricRef.current }}>
      {children}
    </EditorContext.Provider>
  );
}
