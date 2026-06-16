import { useRef } from "react";
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Triangle,
  Pencil,
  Minus,
  Printer,
  Move,
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor } from "./canvas-editor";

interface ToolBtnProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick(): void;
}

function ToolBtn({ icon: Icon, label, active, danger, onClick }: ToolBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={active ? "default" : danger ? "destructive" : "ghost"}
          className="w-9 h-9"
          onClick={onClick}
        >
          <Icon className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

interface ToolbarProps {
  onOpenPrintTools(): void;
  zoom: number;
  onZoomChange(zoom: number): void;
}

export function Toolbar({ onOpenPrintTools, zoom, onZoomChange }: ToolbarProps) {
  const { activeTool, setActiveTool, addText, addShape, deleteSelected, addImageFromDataUrl, canvas } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) addImageFromDataUrl(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function activateSelect() {
    if (canvas) { canvas.isDrawingMode = false; canvas.defaultCursor = "default"; canvas.hoverCursor = "move"; }
    setActiveTool("select");
  }

  function toggleDraw() {
    const next = activeTool === "draw" ? "select" : "draw";
    if (canvas) {
      canvas.isDrawingMode = next === "draw";
      if (next === "draw") {
        const brush = new fabric.PencilBrush(canvas);
        brush.color = "#000000";
        brush.width = 3;
        canvas.freeDrawingBrush = brush;
      }
    }
    setActiveTool(next);
  }

  return (
    <div className="flex flex-col items-center gap-1 py-2 px-1 border-r border-border bg-card w-12 shrink-0 overflow-y-auto">
      {/* Select */}
      <ToolBtn icon={MousePointer2} label="Select (V)" active={activeTool === "select"} onClick={activateSelect} />
      <ToolBtn icon={Move} label="Hand" active={activeTool === "hand"} onClick={() => {
        if (canvas) { canvas.isDrawingMode = false; canvas.defaultCursor = "grab"; }
        setActiveTool("hand");
      }} />

      <Separator className="my-1 w-6" />

      {/* Upload */}
      <ToolBtn icon={Upload} label="Upload Image" onClick={() => fileInputRef.current?.click()} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Text */}
      <ToolBtn icon={Type} label="Text (T)" active={activeTool === "text"} onClick={() => {
        activateSelect();
        setActiveTool("text");
        addText();
      }} />

      <Separator className="my-1 w-6" />

      {/* Shapes */}
      <ToolBtn icon={Square} label="Rectangle" onClick={() => { activateSelect(); addShape("rect"); }} />
      <ToolBtn icon={Circle} label="Circle" onClick={() => { activateSelect(); addShape("circle"); }} />
      <ToolBtn icon={Triangle} label="Triangle" onClick={() => { activateSelect(); addShape("triangle"); }} />
      <ToolBtn icon={Minus} label="Line" onClick={() => { activateSelect(); addShape("line"); }} />

      <Separator className="my-1 w-6" />

      {/* Draw */}
      <ToolBtn icon={Pencil} label="Freehand Draw (D)" active={activeTool === "draw"} onClick={toggleDraw} />

      <Separator className="my-1 w-6" />

      {/* Print tools */}
      <ToolBtn icon={Printer} label="Print Tools" active={activeTool === "print"} onClick={() => {
        activateSelect();
        onOpenPrintTools();
        setActiveTool("print");
      }} />

      <div className="flex-1" />

      <Separator className="my-1 w-6" />

      {/* Zoom */}
      <ToolBtn icon={ZoomIn} label="Zoom In" onClick={() => onZoomChange(Math.min(zoom + 0.15, 3))} />
      <div className="text-[9px] text-muted-foreground font-mono leading-none py-0.5 select-none">
        {Math.round(zoom * 100)}%
      </div>
      <ToolBtn icon={ZoomOut} label="Zoom Out" onClick={() => onZoomChange(Math.max(zoom - 0.15, 0.2))} />

      <Separator className="my-1 w-6" />

      {/* Delete */}
      <ToolBtn icon={Trash2} label="Delete Selected (Del)" danger onClick={deleteSelected} />
    </div>
  );
}
