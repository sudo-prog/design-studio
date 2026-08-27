import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, CheckCircle, Loader2, SlidersHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  projectId: number;
  onApprove?: (imageUrl: string) => void;
}

export function BackgroundRemoval({ projectId: _projectId, onApprove }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(230);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sliderPos, setSliderPos] = useState(50); // before/after split %

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSourceUrl(reader.result as string);
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveBg() {
    if (!sourceUrl) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/ai/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: sourceUrl,
          projectId: _projectId,
          threshold,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { resultBase64: string };
      setResultUrl(data.resultBase64);
    } catch (e) {
      toast({ title: "Background removal failed", description: String(e), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          Upload an image and remove its white/light background using luminance masking. Before accepting, preview the result with the comparison slider.
        </p>
      </div>

      {/* Drop zone */}
      <button
        onClick={() => fileRef.current?.click()}
        className={cn(
          "w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors",
          sourceUrl ? "h-12 border-border" : "h-32 border-border hover:border-primary",
        )}
      >
        {sourceUrl ? (
          <span className="text-xs text-muted-foreground">Click to replace image</span>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Drop image or click to upload</span>
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {sourceUrl && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs">BG threshold: {threshold}</Label>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v!)}
              min={100}
              max={255}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">Higher = removes more background. Lower = keeps subtle tones.</p>
          </div>

          <Button className="w-full gap-2" onClick={handleRemoveBg} disabled={isProcessing}>
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
            ) : (
              "Remove Background"
            )}
          </Button>
        </>
      )}

      {/* Before/after comparison */}
      {sourceUrl && resultUrl && (
        <div className="space-y-3">
          <p className="text-xs font-medium">Drag to compare</p>
          <div
            className="relative rounded-lg overflow-hidden border border-border h-48 cursor-col-resize select-none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              setSliderPos(Math.min(95, Math.max(5, x)));
            }}
          >
            {/* Result (transparent PNG) */}
            <div className="absolute inset-0 bg-[repeating-conic-gradient(#ccc_0%_25%,white_0%_50%)] bg-[length:16px_16px]">
              <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
            </div>
            {/* Original overlay */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img src={sourceUrl} alt="Original" className="w-full h-full object-contain" />
            </div>
            {/* Slider line */}
            <div
              className="absolute inset-y-0 w-0.5 bg-white shadow"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow border border-border" />
            </div>
            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">Before</div>
            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">After</div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => {
              onApprove?.(resultUrl);
              toast({ title: "Result accepted!", description: "Image saved to project." });
            }}
          >
            <CheckCircle className="w-4 h-4" />
            Accept Result
          </Button>
        </div>
      )}
    </div>
  );
}
