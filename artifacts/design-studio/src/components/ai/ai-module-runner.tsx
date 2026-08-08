import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronRight,
  Settings2,
  Loader2,
  Download,
} from "lucide-react";
import {
  buildAdapter,
  loadProviderConfig,
  type AspectRatio,
  type GeneratedImage,
} from "@/lib/ai-adapters";
import { GenerateResultGrid } from "./generate-result-grid";
import { RefinePanel } from "./refine-panel";
import { BackgroundRemoval } from "./background-removal";
import { ChatRefinement } from "./chat-refinement";
import { useToast } from "@/hooks/use-toast";

export type AiTab = "generate" | "remove-bg" | "chat";

interface Props {
  projectId: number;
  onApprove?: (imageUrl: string) => void;
}

export function AiModuleRunner({ projectId, onApprove }: Props) {
  const { toast } = useToast();
  const providerCfg = loadProviderConfig();

  // ── Generate state ────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quantity, setQuantity] = useState(2);
  const [style, setStyle] = useState("default");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [generationHistory, setGenerationHistory] = useState<{ prompt: string; images: GeneratedImage[] }[]>([]);
  const [showRefine, setShowRefine] = useState(false);
  const historyRef = useRef<{ prompt: string; images: GeneratedImage[] }[]>([]);

  async function handleGenerate(overridePrompt?: string) {
    const p = overridePrompt ?? prompt;
    if (!p.trim()) {
      toast({ title: "Enter a prompt first", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setResults([]);
    setSelectedImage(null);
    setShowRefine(false);
    try {
      const adapter = buildAdapter(providerCfg, projectId);
      const imgs = await adapter.generate({
        prompt: p,
        negativePrompt: negativePrompt || undefined,
        aspectRatio,
        quantity,
        style,
      });
      setResults(imgs);
      const entry = { prompt: p, images: imgs };
      historyRef.current = [entry, ...historyRef.current].slice(0, 10);
      setGenerationHistory([...historyRef.current]);
      if (imgs.length > 0) setSelectedImage(imgs[0]!);
    } catch (e) {
      toast({ title: "Generation failed", description: String(e), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApprove(img: GeneratedImage) {
    onApprove?.(img.url);
    toast({ title: "Approved!", description: "Image saved to project assets." });
  }

  function handleRefineSubmit(newPrompt: string) {
    setPrompt(newPrompt);
    setShowRefine(false);
    handleGenerate(newPrompt);
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="generate">
        <TabsList className="w-full">
          <TabsTrigger value="generate" className="flex-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="remove-bg" className="flex-1">
            Remove BG
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1">
            Chat Refine
          </TabsTrigger>
        </TabsList>

        {/* ── GENERATE ─────────────────────────────────────────────────── */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {providerCfg.provider === "local" ? "Built-in AI" : providerCfg.provider}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {providerCfg.model ?? "dall-e-3"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Prompt</Label>
            <Textarea
              placeholder="Describe your design concept... e.g. 'bold streetwear graphic with wolves and moon, high contrast'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="text-sm resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Negative prompt (optional)</Label>
            <Input
              placeholder="low quality, blurry, watermark..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="min-h-[44px] text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="min-h-[44px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Auto</SelectItem>
                  <SelectItem value="streetwear">Streetwear</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="abstract">Abstract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ratio</Label>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatio)}>
                <SelectTrigger className="min-h-[44px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">Square 1:1</SelectItem>
                  <SelectItem value="16:9">Wide 16:9</SelectItem>
                  <SelectItem value="9:16">Portrait 9:16</SelectItem>
                  <SelectItem value="4:5">Social 4:5</SelectItem>
                  <SelectItem value="3:2">Photo 3:2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Count</Label>
              <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
                <SelectTrigger className="min-h-[44px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => handleGenerate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate</>
            )}
          </Button>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <GenerateResultGrid
                images={results}
                selected={selectedImage}
                onSelect={setSelectedImage}
                onApprove={handleApprove}
                onRefine={() => setShowRefine(true)}
              />

              {showRefine && (
                <RefinePanel
                  originalPrompt={prompt}
                  previousImages={results}
                  onSubmit={handleRefineSubmit}
                  onCancel={() => setShowRefine(false)}
                />
              )}
            </div>
          )}

          {/* History */}
          {generationHistory.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">History</p>
              <div className="space-y-1.5">
                {generationHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(h.prompt); setResults(h.images); }}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors truncate"
                  >
                    <ChevronRight className="w-3 h-3 inline mr-1 text-muted-foreground" />
                    {h.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── BACKGROUND REMOVAL ───────────────────────────────────────── */}
        <TabsContent value="remove-bg" className="mt-4">
          <BackgroundRemoval projectId={projectId} onApprove={onApprove} />
        </TabsContent>

        {/* ── CHAT REFINEMENT ─────────────────────────────────────────── */}
        <TabsContent value="chat" className="mt-4">
          <ChatRefinement projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
