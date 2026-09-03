import { useState, useRef } from "react";
import {
  useListProjects,
  useListPalettes,
  useExtractColors,
  useCreatePalette,
  getListPalettesQueryKey,
} from "@workspace/api-client-react";
import type { ColorSwatch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Palette, Upload, Wand2, Save, Copy, Loader2, ImageOff } from "lucide-react";

function Swatch({ color }: { color: ColorSwatch }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-14 h-14 rounded-lg border border-border/60 shadow-sm"
        style={{ backgroundColor: color.hex }}
        title={`${color.name}\n${color.hex}${color.pantone ? ` · ${color.pantone}` : ""}`}
      />
      <span className="text-[10px] font-mono text-muted-foreground">{color.hex}</span>
      {color.pantone && <span className="text-[9px] text-muted-foreground/70">{color.pantone}</span>}
    </div>
  );
}

export default function Colors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ColorSwatch[] | null>(null);
  const [paletteName, setPaletteName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [], error: projectsError } = useListProjects();
  const safeProjects = projectsError ? [] : projects;

  const { data: palettes = [], isLoading: palettesLoading, error: palettesError } = useListPalettes(
    projectId as number,
    { query: { enabled: !!projectId, queryKey: getListPalettesQueryKey(projectId as number) } },
  );
  const safePalettes = palettesError ? [] : palettes;

  const extractColors = useExtractColors();
  const createPalette = useCreatePalette();

  async function handleExtract() {
    if (!imageUrl.trim()) {
      toast({ title: "Enter an image URL", variant: "destructive" });
      return;
    }
    setExtracting(true);
    setExtracted(null);
    try {
      const result = await extractColors.mutateAsync({ data: { assetUrl: imageUrl.trim(), colorCount: 6 } });
      setExtracted(result.colors ?? []);
      if (!result.colors || result.colors.length === 0) {
        toast({ title: "No colors returned", description: "The extractor returned an empty palette." });
      } else {
        toast({ title: "Colors extracted", description: `${result.colors.length} swatches found.` });
      }
    } catch {
      toast({ title: "Extraction failed", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  }

  async function handleSavePalette() {
    if (!projectId || (extracted?.length ?? 0) === 0) return;
    const name = paletteName.trim() || `Palette ${new Date().toLocaleDateString()}`;
    try {
      await createPalette.mutateAsync(
        { id: projectId, data: { name, colors: extracted as ColorSwatch[] } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPalettesQueryKey(projectId) });
            setPaletteName("");
            setExtracted(null);
            setImageUrl("");
            toast({ title: "Palette saved", description: name });
          },
          onError: () => toast({ title: "Save failed", variant: "destructive" }),
        },
      );
    } catch {
      /* handled in onError */
    }
  }

  function copyHex(hex: string) {
    navigator.clipboard?.writeText(hex).catch(() => {});
    toast({ title: "Copied", description: hex });
  }

  return (
    <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Color Tools</h1>
        <p className="text-muted-foreground">Extract, manage, and verify print colors.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Saved palettes ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Saved Palettes
            </CardTitle>
            <CardDescription>Color palettes linked to your projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={projectId ? String(projectId) : ""}
              onValueChange={(v) => setProjectId(Number(v))}
            >
              <SelectTrigger className="min-h-[44px] min-w-[44px]">
                <SelectValue placeholder="Select a project…" />
              </SelectTrigger>
              <SelectContent>
                {safeProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="min-h-[44px]">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {palettesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : safePalettes.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg">
                <Palette className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {projectId ? "No saved palettes yet for this project." : "Select a project to view its palettes."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <div className="space-y-4">
                {safePalettes.map((pal) => (
                  <div key={pal.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium mb-2">{pal.name}</p>
                    <div className="flex flex-wrap gap-3">
                      {pal.colors.map((c, i) => (
                        <Swatch key={i} color={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Extract from image ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Extract from Image
            </CardTitle>
            <CardDescription>Paste an image URL to pull its dominant colors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="img-url">Image URL</Label>
              <Input
                id="img-url"
                placeholder="https://…/design.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setImageUrl(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExtract} disabled={extracting || !imageUrl.trim()} className="gap-1.5 min-h-[44px] min-w-[44px]">
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {extracting ? "Extracting…" : "Extract Colors"}
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="min-h-[44px] min-w-[44px]">
                Use local file
              </Button>
            </div>

            {extracting && (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!extracting && extracted && (
              <div className="space-y-3">
                {extracted.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-lg">
                    <ImageOff className="w-7 h-7 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No colors detected.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3 justify-center py-2">
                      {extracted.map((c, i) => (
                        <button key={i} onClick={() => copyHex(c.hex)} title="Copy hex" className="min-h-[44px] min-w-[44px]">
                          <Swatch color={c} />
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pal-name">Save as palette</Label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          id="pal-name"
                          placeholder="Palette name"
                          value={paletteName}
                          onChange={(e) => setPaletteName(e.target.value)}
                          className="min-h-[44px]"
                        />
                        <Button
                          onClick={handleSavePalette}
                          disabled={!projectId || createPalette.isPending}
                          className="gap-1.5 min-h-[44px] min-w-[44px]"
                        >
                          {createPalette.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save
                        </Button>
                      </div>
                      {!projectId && (
                        <p className="text-xs text-muted-foreground">Select a project above to enable saving.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
