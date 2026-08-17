import { useState } from "react";
import { Download, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useEditor } from "./canvas-editor";

interface ExportModalProps {
  open: boolean;
  onOpenChange(v: boolean): void;
  projectId?: number;
  onSaved?(): void;
}

function getApiBase() {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}api` : `${base}/api`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function ExportModal({ open, onOpenChange, projectId, onSaved }: ExportModalProps) {
  const { exportPNG, exportSVG } = useEditor();
  const { toast } = useToast();

  const [format, setFormat] = useState<"png" | "svg">("png");
  const [dpi, setDpi] = useState<"72" | "150" | "300" | "600">("300");
  const [colorSpace, setColorSpace] = useState<"srgb" | "cmyk">("srgb");
  const [transparent, setTransparent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const dpiValue = parseInt(dpi, 10);

  function getExportData() {
    if (format === "svg") return exportSVG();
    return exportPNG(dpiValue, transparent);
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const data = getExportData();
      if (!data) { toast({ title: "Nothing to export", variant: "destructive" }); return; }
      const link = document.createElement("a");
      link.download = `design.${format}`;
      if (format === "svg") {
        link.href = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
      } else {
        link.href = data;
      }
      link.click();
      if (link.href.startsWith("blob:")) URL.revokeObjectURL(link.href);
      toast({ title: `Downloaded as ${format.toUpperCase()}` });
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSaveToProject() {
    if (!projectId) {
      toast({ title: "No project selected", description: "Open the editor from a project to save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const data = getExportData();
      if (!data) { toast({ title: "Nothing to export", variant: "destructive" }); return; }

      const formData = new FormData();
      let blob: Blob;
      let filename: string;
      let assetType: string;

      if (format === "svg") {
        blob = new Blob([data], { type: "image/svg+xml" });
        filename = `design-${Date.now()}.svg`;
        assetType = "vector";
      } else {
        blob = await dataUrlToBlob(data);
        filename = `design-${Date.now()}-${dpi}dpi.png`;
        assetType = "photo";
      }

      formData.append("file", blob, filename);
      formData.append("type", assetType);
      formData.append("name", filename);

      const res = await fetch(`${getApiBase()}/projects/${projectId}/assets`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);

      toast({ title: "Saved to project assets", description: filename });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Design</DialogTitle>
          <DialogDescription>Choose format, resolution, and color space.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Format */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "png" | "svg")} className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <RadioGroupItem value="png" />
                <span className="text-sm">PNG</span>
                <Badge variant="secondary" className="text-[10px]">Raster</Badge>
              </label>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <RadioGroupItem value="svg" />
                <span className="text-sm">SVG</span>
                <Badge variant="secondary" className="text-[10px]">Vector</Badge>
              </label>
            </RadioGroup>
          </div>

          {/* DPI (PNG only) */}
          {format === "png" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resolution
              </Label>
              <RadioGroup value={dpi} onValueChange={(v) => setDpi(v as typeof dpi)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(["72", "150", "300", "600"] as const).map((d) => (
                  <label key={d} className={`flex flex-col items-center p-2 rounded border cursor-pointer transition-colors min-h-[44px] ${dpi === d ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                    <RadioGroupItem value={d} className="sr-only" />
                    <span className="text-sm font-bold">{d}</span>
                    <span className="text-[10px] text-muted-foreground">DPI</span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-[10px] text-muted-foreground">
                {dpi === "72" ? "Screen use only" : dpi === "150" ? "Web / low print" : dpi === "300" ? "Print ready" : "High-res film output"}
              </p>
            </div>
          )}

          {/* Color space */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color Space</Label>
            <Select value={colorSpace} onValueChange={(v) => setColorSpace(v as "srgb" | "cmyk")}>
              <SelectTrigger className="h-8 min-h-[44px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="srgb">sRGB (standard)</SelectItem>
                <SelectItem value="cmyk">CMYK preview (visual)</SelectItem>
              </SelectContent>
            </Select>
            {colorSpace === "cmyk" && (
              <p className="text-[10px] text-muted-foreground">
                CMYK is a visual preview — browser exports are always sRGB. Use Channel Split for true CMYK separations.
              </p>
            )}
          </div>

          {/* Transparent background (PNG only) */}
          {format === "png" && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transparent Background</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Remove white fill — logo / sticker use</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={transparent}
                onClick={() => setTransparent((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none min-h-[44px] min-w-[44px] ${transparent ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${transparent ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 gap-1.5 text-sm min-h-[44px]"
            onClick={handleDownload}
            disabled={isDownloading || isSaving}
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download
          </Button>
          {projectId && (
            <Button
              className="flex-1 gap-1.5 text-sm min-h-[44px]"
              onClick={handleSaveToProject}
              disabled={isSaving || isDownloading}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save to Project
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
