import { CheckCircle, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GeneratedImage } from "@/lib/ai-adapters";

interface Props {
  images: GeneratedImage[];
  selected: GeneratedImage | null;
  onSelect(img: GeneratedImage): void;
  onApprove(img: GeneratedImage): void;
  onRefine(): void;
}

export function GenerateResultGrid({ images, selected, onSelect, onApprove, onRefine }: Props) {
  return (
    <div className="space-y-3">
      <div className={cn(
        "grid gap-2",
        images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2",
      )}>
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => onSelect(img)}
            className={cn(
              "relative rounded-lg overflow-hidden border-2 transition-all aspect-square",
              selected?.url === img.url ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/40",
            )}
          >
            <img src={img.url} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
            {selected?.url === img.url && (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5" onClick={() => onApprove(selected)}>
            <CheckCircle className="w-3.5 h-3.5" />
            Approve & Save
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onRefine}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refine
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => {
              const a = document.createElement("a");
              a.href = selected.url;
              a.download = "generated.jpg";
              a.target = "_blank";
              a.click();
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
