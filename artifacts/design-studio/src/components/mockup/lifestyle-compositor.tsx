import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const LIFESTYLE_SCENES = [
  {
    id: "urban-street",
    label: "Urban Street",
    url: "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=800&q=80",
    designZone: { left: "28%", top: "20%", width: "44%", height: "38%" },
  },
  {
    id: "studio-white",
    label: "Studio White",
    url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80",
    designZone: { left: "30%", top: "18%", width: "40%", height: "36%" },
  },
  {
    id: "outdoor-park",
    label: "Outdoor Park",
    url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
    designZone: { left: "25%", top: "15%", width: "50%", height: "42%" },
  },
  {
    id: "coffee-shop",
    label: "Coffee Shop",
    url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
    designZone: { left: "26%", top: "18%", width: "48%", height: "40%" },
  },
  {
    id: "rooftop",
    label: "Rooftop",
    url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80",
    designZone: { left: "27%", top: "16%", width: "46%", height: "38%" },
  },
  {
    id: "studio-dark",
    label: "Studio Dark",
    url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80",
    designZone: { left: "30%", top: "20%", width: "40%", height: "36%" },
  },
];

type ExportRatio = "1:1" | "4:5";

interface Props {
  designUrl: string | null;
  className?: string;
}

export function LifestyleCompositor({ designUrl, className }: Props) {
  const [sceneId, setSceneId] = useState(LIFESTYLE_SCENES[0]!.id);
  const [ratio, setRatio] = useState<ExportRatio>("1:1");
  const [designOpacity, setDesignOpacity] = useState(85);
  const [designScale, setDesignScale] = useState(100);
  const [shadowStrength, setShadowStrength] = useState(40);

  const scene = LIFESTYLE_SCENES.find((s) => s.id === sceneId) ?? LIFESTYLE_SCENES[0]!;

  function handleExport() {
    // Canvas-based composite export
    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.src = scene.url;
    bgImg.onload = () => {
      const [ew, eh] = ratio === "1:1" ? [1080, 1080] : [1080, 1350];
      const canvas = document.createElement("canvas");
      canvas.width = ew!;
      canvas.height = eh!;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bgImg, 0, 0, ew!, eh!);
      if (designUrl) {
        const dImg = new Image();
        dImg.crossOrigin = "anonymous";
        dImg.src = designUrl;
        dImg.onload = () => {
          const sz = (ew! * 0.45 * designScale) / 100;
          const x = ew! * 0.5 - sz / 2;
          const y = eh! * 0.25;
          ctx.globalAlpha = designOpacity / 100;
          ctx.drawImage(dImg, x, y, sz, sz);
          ctx.globalAlpha = 1;
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/jpeg", 0.92);
          a.download = `lifestyle-${ratio.replace(":", "x")}.jpg`;
          a.click();
        };
      } else {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/jpeg", 0.92);
        a.download = `lifestyle-${ratio.replace(":", "x")}.jpg`;
        a.click();
      }
    };
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Scene preview */}
      <div className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-muted",
        ratio === "4:5" ? "aspect-[4/5]" : "aspect-square",
      )}>
        <img
          src={scene.url}
          alt={scene.label}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
        />
        {designUrl && (
          <div
            className="absolute pointer-events-none"
            style={{
              ...scene.designZone,
              transform: `scale(${designScale / 100})`,
              transformOrigin: "center center",
            }}
          >
            {/* Drop shadow */}
            <div
              className="absolute inset-0 rounded"
              style={{
                background: "black",
                opacity: shadowStrength / 200,
                filter: "blur(8px)",
                transform: "translate(4px, 6px)",
              }}
            />
            <img
              src={designUrl}
              alt="design overlay"
              className="w-full h-full object-contain"
              style={{ opacity: designOpacity / 100, mixBlendMode: "multiply" }}
              crossOrigin="anonymous"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Scene</Label>
          <Select value={sceneId} onValueChange={setSceneId}>
            <SelectTrigger className="h-7 min-h-[44px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIFESTYLE_SCENES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Export ratio</Label>
          <Select value={ratio} onValueChange={(v) => setRatio(v as ExportRatio)}>
            <SelectTrigger className="h-7 min-h-[44px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">Square 1:1</SelectItem>
              <SelectItem value="4:5">Social 4:5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Design opacity</span><span>{designOpacity}%</span>
        </div>
        <Slider value={[designOpacity]} onValueChange={([v]) => setDesignOpacity(v!)} min={20} max={100} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Design scale</span><span>{designScale}%</span>
        </div>
        <Slider value={[designScale]} onValueChange={([v]) => setDesignScale(v!)} min={40} max={160} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Shadow</span><span>{shadowStrength}%</span>
        </div>
        <Slider value={[shadowStrength]} onValueChange={([v]) => setShadowStrength(v!)} min={0} max={100} />
      </div>

      <Button className="w-full gap-2 h-8 min-h-[44px]" onClick={handleExport}>
        <Download className="w-3.5 h-3.5" />
        Export {ratio} JPEG
      </Button>
    </div>
  );
}
