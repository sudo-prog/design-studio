import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Image as ImageIcon, Palette, Type, Link2, Trash2, Save, GripVertical } from "lucide-react";

export type MoodBoardItemType = "image" | "color" | "text" | "url";

export interface MoodBoardItem {
  id: string;
  type: MoodBoardItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  label?: string;
  color?: string;
}

interface MoodBoardProps {
  projectId: number;
  initialItems?: MoodBoardItem[];
  onSave?: (items: MoodBoardItem[]) => void;
  isSaving?: boolean;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const PIN_COLORS = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#1dd1a1", "#ffffff", "#1a1a2e"];

export function MoodBoard({ projectId, initialItems = [], onSave, isSaving }: MoodBoardProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MoodBoardItem[]>(initialItems);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newTextContent, setNewTextContent] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [addingType, setAddingType] = useState<MoodBoardItemType | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setItems(initialItems);
  }, [JSON.stringify(initialItems)]);

  const scheduleSave = useCallback((nextItems: MoodBoardItem[]) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave?.(nextItems);
    }, 1500);
  }, [onSave]);

  function updateItems(next: MoodBoardItem[]) {
    setItems(next);
    scheduleSave(next);
  }

  function addItem(item: Omit<MoodBoardItem, "id">) {
    const next = [...items, { ...item, id: genId() }];
    updateItems(next);
    setAddingType(null);
    setNewImageUrl("");
    setNewTextContent("");
    setNewLinkUrl("");
  }

  function removeItem(id: string) {
    const next = items.filter((i) => i.id !== id);
    updateItems(next);
  }

  function addColorPin(color: string) {
    const board = boardRef.current?.getBoundingClientRect();
    const x = Math.random() * ((board?.width ?? 800) - 80);
    const y = Math.random() * ((board?.height ?? 500) - 80);
    addItem({ type: "color", x, y, w: 80, h: 80, content: color, color });
  }

  function addImagePin(url: string) {
    if (!url) return;
    const board = boardRef.current?.getBoundingClientRect();
    const x = Math.random() * Math.max(100, (board?.width ?? 800) - 220);
    const y = Math.random() * Math.max(100, (board?.height ?? 500) - 180);
    addItem({ type: "image", x, y, w: 220, h: 180, content: url });
  }

  function addTextPin(text: string) {
    if (!text) return;
    const board = boardRef.current?.getBoundingClientRect();
    const x = Math.random() * Math.max(100, (board?.width ?? 800) - 180);
    const y = Math.random() * Math.max(100, (board?.height ?? 500) - 80);
    addItem({ type: "text", x, y, w: 180, h: 80, content: text });
  }

  function addUrlPin(url: string) {
    if (!url) return;
    const board = boardRef.current?.getBoundingClientRect();
    const x = Math.random() * Math.max(100, (board?.width ?? 800) - 200);
    const y = Math.random() * Math.max(100, (board?.height ?? 500) - 80);
    addItem({ type: "url", x, y, w: 200, h: 60, content: url });
  }

  function onMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, itemX: item.x, itemY: item.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    setItems((prev) =>
      prev.map((item) =>
        item.id === dragging.id
          ? { ...item, x: Math.max(0, dragging.itemX + dx), y: Math.max(0, dragging.itemY + dy) }
          : item
      )
    );
  }

  function onMouseUp() {
    if (dragging) {
      scheduleSave(items);
      setDragging(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) addImagePin(url);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground">Add:</span>
        <Button size="sm" variant="outline" onClick={() => setAddingType("image")} className="gap-1.5 min-h-[44px]">
          <ImageIcon className="w-3.5 h-3.5" /> Image URL
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddingType("text")} className="gap-1.5 min-h-[44px]">
          <Type className="w-3.5 h-3.5" /> Text Note
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddingType("url")} className="gap-1.5 min-h-[44px]">
          <Link2 className="w-3.5 h-3.5" /> Link
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddingType("color")} className="gap-1.5 min-h-[44px]">
          <Palette className="w-3.5 h-3.5" /> Color
        </Button>
        <label className="cursor-pointer">
          <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px] pointer-events-none">
            <Plus className="w-3.5 h-3.5" /> Upload Image
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{items.length} pin{items.length !== 1 ? "s" : ""}</span>
          <Button
            size="sm"
            onClick={() => onSave?.(items)}
            disabled={isSaving}
            className="gap-1.5 min-h-[44px]"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {addingType === "image" && (
              <div className="flex gap-2 items-center p-2 bg-muted/50 rounded-md flex-wrap">
                <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="https://... (image URL)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addImagePin(newImageUrl)}
                  autoFocus
                  className="min-h-[44px] flex-1 min-w-[200px]"
                />
                <Button size="sm" onClick={() => addImagePin(newImageUrl)} className="min-h-[44px]">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingType(null)} className="min-h-[44px]">Cancel</Button>
              </div>
            )}

            {addingType === "text" && (
              <div className="flex gap-2 items-center p-2 bg-muted/50 rounded-md flex-wrap">
                <Type className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="Type a note..."
                  value={newTextContent}
                  onChange={(e) => setNewTextContent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTextPin(newTextContent)}
                  autoFocus
                  className="min-h-[44px] flex-1 min-w-[200px]"
                />
                <Button size="sm" onClick={() => addTextPin(newTextContent)} className="min-h-[44px]">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingType(null)} className="min-h-[44px]">Cancel</Button>
              </div>
            )}

            {addingType === "url" && (
              <div className="flex gap-2 items-center p-2 bg-muted/50 rounded-md flex-wrap">
                <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="https://... (link URL)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUrlPin(newLinkUrl)}
                  autoFocus
                  className="min-h-[44px] flex-1 min-w-[200px]"
                />
                <Button size="sm" onClick={() => addUrlPin(newLinkUrl)} className="min-h-[44px]">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingType(null)} className="min-h-[44px]">Cancel</Button>
              </div>
            )}

      {addingType === "color" && (
        <div className="flex gap-2 items-center flex-wrap p-2 bg-muted/50 rounded-md">
          <Palette className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {PIN_COLORS.map((c) => (
            <button
              key={c}
              className="w-7 h-7 min-h-[44px] min-w-[44px] rounded-full border-2 border-border hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => addColorPin(c)}
              title={c}
            />
          ))}
          <input type="color" className="w-7 h-7 min-h-[44px] min-w-[44px] rounded cursor-pointer" onChange={(e) => addColorPin(e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => setAddingType(null)} className="min-h-[44px]">Cancel</Button>
        </div>
      )}

      <div
        ref={boardRef}
        className="relative w-full bg-card border border-border rounded-lg overflow-hidden select-none"
        style={{ height: "520px" }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <GripVertical className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">Your mood board is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Add images, colors, text notes, and links above</p>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="absolute group cursor-grab active:cursor-grabbing"
            style={{
              left: item.x,
              top: item.y,
              width: item.w,
              userSelect: "none",
              zIndex: dragging?.id === item.id ? 100 : 1,
            }}
            onMouseDown={(e) => onMouseDown(e, item.id)}
          >
            {item.type === "image" && (
              <div className="rounded-lg overflow-hidden border border-border/50 shadow-md bg-muted">
                <img
                  src={item.content}
                  alt="mood board pin"
                  className="w-full object-cover pointer-events-none"
                  style={{ height: item.h }}
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666' font-size='12'%3EBroken%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            )}
            {item.type === "color" && (
              <div
                className="rounded-full border-4 border-white/20 shadow-lg flex items-center justify-center"
                style={{ width: item.w, height: item.h, backgroundColor: item.content }}
              >
                <span className="text-[10px] font-mono opacity-70 mix-blend-difference text-white">{item.content}</span>
              </div>
            )}
            {item.type === "text" && (
              <div className="rounded-lg bg-yellow-900/80 border border-yellow-700/50 shadow-md p-3 min-h-[60px]">
                <p className="text-yellow-100 text-sm font-medium leading-tight whitespace-pre-wrap break-words">{item.content}</p>
              </div>
            )}
            {item.type === "url" && (
              <div className="rounded-lg bg-card border border-border shadow-md px-3 py-2 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-primary truncate">{item.content}</span>
              </div>
            )}
            <button
              className="absolute -top-2 -right-2 w-5 h-5 min-h-[44px] min-w-[44px] rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm z-10"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
