import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Sparkles } from "lucide-react";
import type { GeneratedImage } from "@/lib/ai-adapters";

interface Props {
  originalPrompt: string;
  previousImages: GeneratedImage[];
  onSubmit(newPrompt: string): void;
  onCancel(): void;
}

const REFINEMENT_SUGGESTIONS = [
  "make it more grungy and textured",
  "shift palette to earth tones",
  "add more contrast, bolder shapes",
  "make it minimal and clean",
  "add halftone grain effect",
  "make colors more vibrant",
];

export function RefinePanel({ originalPrompt, previousImages, onSubmit, onCancel }: Props) {
  const [refinedPrompt, setRefinedPrompt] = useState(originalPrompt);

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Refine Generation</p>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancel} aria-label="Close refine panel">
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Previous results mini strip */}
      {previousImages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {previousImages.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={`v${i + 1}`}
              className="w-12 h-12 object-cover rounded shrink-0 border border-border"
            />
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Refined prompt</Label>
        <Textarea
          value={refinedPrompt}
          onChange={(e) => setRefinedPrompt(e.target.value)}
          className="text-sm resize-none h-16"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground">Quick suggestions:</p>
        <div className="flex flex-wrap gap-1">
          {REFINEMENT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setRefinedPrompt((p) => `${p}, ${s}`)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full gap-2 h-8 text-xs" onClick={() => onSubmit(refinedPrompt)}>
        <Sparkles className="w-3.5 h-3.5" />
        Re-generate with refined prompt
      </Button>
    </div>
  );
}
