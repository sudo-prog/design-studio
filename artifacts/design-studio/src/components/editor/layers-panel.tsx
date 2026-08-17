import { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  ImageIcon,
  Type,
  Square,
  Circle,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEditor, type LayerInfo } from "./canvas-editor";

function LayerIcon({ type }: { type: string }) {
  if (type === "image") return <ImageIcon className="w-3 h-3 shrink-0 text-blue-400" />;
  if (type === "i-text" || type === "text" || type === "textbox") return <Type className="w-3 h-3 shrink-0 text-emerald-400" />;
  if (type === "circle") return <Circle className="w-3 h-3 shrink-0 text-orange-400" />;
  if (type === "group") return <Square className="w-3 h-3 shrink-0 text-purple-400" />;
  return <Square className="w-3 h-3 shrink-0 text-muted-foreground" />;
}

function LayerRow({ layer, index, total }: { layer: LayerInfo; index: number; total: number }) {
  const { updateLayer, removeLayer, reorderLayer, canvas } = useEditor();
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const [showOpacity, setShowOpacity] = useState(false);

  function commitName() {
    if (draft.trim()) updateLayer(layer.id, { name: draft.trim() });
    setEditingName(false);
  }

  function handleRowClick() {
    if (!canvas) return;
    const obj = canvas.getObjects().find((o) => {
      return (o as { data?: Record<string, unknown> }).data?.layerId === layer.id;
    });
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    }
  }

  return (
    <div
      className={cn(
        "group flex flex-col border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 transition-colors",
        !layer.visible && "opacity-50"
      )}
      onClick={handleRowClick}
    >
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        {/* Visibility */}
        <button
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
        >
          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Icon */}
        <LayerIcon type={layer.type} />

        {/* Name */}
        {editingName ? (
          <Input
            className="h-8 text-xs py-0 px-1 flex-1 min-w-0 min-h-[44px]"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs truncate min-w-0"
            onDoubleClick={(e) => { e.stopPropagation(); setDraft(layer.name); setEditingName(true); }}
          >
            {layer.name}
          </span>
        )}

        {/* Lock */}
        <button
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
        >
          {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
        </button>

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-0.5 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <MoreVertical className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => reorderLayer(layer.id, "up")} disabled={index === 0}>
              <ChevronUp className="w-3.5 h-3.5 mr-1.5" /> Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => reorderLayer(layer.id, "down")} disabled={index === total - 1}>
              <ChevronDown className="w-3.5 h-3.5 mr-1.5" /> Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowOpacity((v) => !v)}>
              Opacity ({layer.opacity}%)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => removeLayer(layer.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Opacity slider (expandable) */}
      {showOpacity && (
        <div className="px-3 pb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-muted-foreground w-6">Opacity</span>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[layer.opacity]}
            onValueChange={([v]) => updateLayer(layer.id, { opacity: v })}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{layer.opacity}%</span>
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const { layers, addText, addShape, addImageFromDataUrl } = useEditor();
  const fileInputRef = useState<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Layers</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="w-6 h-6 min-h-[44px] min-w-[44px]" aria-label="Add layer">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => addText()}>
              <Type className="w-3.5 h-3.5 mr-1.5" /> Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addShape("rect")}>
              <Square className="w-3.5 h-3.5 mr-1.5" /> Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addShape("circle")}>
              <Circle className="w-3.5 h-3.5 mr-1.5" /> Circle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const url = ev.target?.result as string;
                  if (url) addImageFromDataUrl(url, file.name);
                };
                reader.readAsDataURL(file);
              };
              input.click();
            }}>
              <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No layers yet. Add shapes, text, or upload an image.
          </div>
        ) : (
          layers.map((layer, i) => (
            <LayerRow key={layer.id} layer={layer} index={i} total={layers.length} />
          ))
        )}
      </div>
    </div>
  );
}
