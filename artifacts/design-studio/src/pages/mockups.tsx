import { useState, useRef } from "react";
import { useSearchParams } from "wouter";
import {
  useListMockupTemplates,
  useListProjects,
  useCreateMockup,
  useListMockups,
} from "@workspace/api-client-react";
import type { MockupTemplate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Box,
  Camera,
  Download,
  Upload,
  Palette,
  Wand2,
  CheckCircle,
} from "lucide-react";
import { TemplatePicker } from "@/components/mockup/template-picker";
import { WarpCanvas, exportWarpComposite } from "@/components/mockup/warp-canvas";
import { Viewer3D } from "@/components/mockup/viewer-3d";
import { LifestyleCompositor } from "@/components/mockup/lifestyle-compositor";
import { useToast } from "@/hooks/use-toast";
import type { BlendMode } from "@/components/mockup/warp-canvas";

const GARMENT_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#111111" },
  { label: "Navy", value: "#1B2A4A" },
  { label: "Grey", value: "#808080" },
  { label: "Red", value: "#C0392B" },
  { label: "Forest Green", value: "#2D6A4F" },
  { label: "Sand", value: "#C8B99A" },
  { label: "Burgundy", value: "#6D1A36" },
];

const BLEND_MODES: { label: string; value: BlendMode }[] = [
  { label: "Multiply", value: "multiply" },
  { label: "Overlay", value: "overlay" },
  { label: "Screen", value: "screen" },
  { label: "Normal", value: "normal" },
];

export default function MockupsPage() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<MockupTemplate | null>(null);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [garmentColor, setGarmentColor] = useState("#FFFFFF");
  const [blendMode, setBlendMode] = useState<BlendMode>("multiply");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("2d");
  const [warpCorners, setWarpCorners] = useState([
    { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.7 }, { x: 0.2, y: 0.7 },
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [], error: projectsError } = useListProjects();
  const { data: savedMockups = [], error: mockupsError } = useListMockups(
    projectId ? { projectId } : undefined,
  );
  const createMockup = useCreateMockup();

  const safeProjects = projectsError ? [] : projects;
  const safeSavedMockups = mockupsError ? [] : savedMockups;

  function handleDesignUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDesignUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveMockup() {
    if (!selectedTemplate || !projectId) {
      toast({ title: "Select a template and project first", variant: "destructive" });
      return;
    }
    await createMockup.mutateAsync({
      data: {
        projectId,
        templateId: selectedTemplate.id,
        designAssetUrl: designUrl ?? selectedTemplate.thumbnailUrl,
        garmentColor,
        blendMode,
      },
    });
    toast({ title: "Mockup saved!", description: "Appears in project history." });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mockup Generator</h1>
          <p className="text-sm text-muted-foreground">Preview your design on 20+ garment and product templates.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={projectId ? String(projectId) : ""} onValueChange={(v) => setProjectId(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Link to project…" />
            </SelectTrigger>
            <SelectContent>
              {safeProjects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSaveMockup} disabled={createMockup.isPending} className="gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Save Mockup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-6">
        {/* ── Left panel ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Template picker */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Templates
                <Badge variant="secondary" className="text-[10px] ml-auto">{22}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <TemplatePicker
                selected={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
            </CardContent>
          </Card>

          {/* Design upload */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Your Design
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary transition-colors"
              >
                {designUrl ? (
                  <img src={designUrl} alt="Design" className="h-full w-full object-contain p-1 rounded" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">PNG, SVG, JPEG</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleDesignUpload}
                className="hidden"
              />
              {designUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-destructive"
                  onClick={() => setDesignUrl(null)}
                >
                  Remove design
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Garment options */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Garment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GARMENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setGarmentColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        garmentColor === c.value ? "border-primary scale-110" : "border-border"
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{GARMENT_COLORS.find(c => c.value === garmentColor)?.label ?? garmentColor}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Blend mode</Label>
                <Select value={blendMode} onValueChange={(v) => setBlendMode(v as BlendMode)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLEND_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Saved mockups */}
          {safeSavedMockups.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Saved Mockups</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {safeSavedMockups.slice(0, 6).map((m) => (
                    <div key={m.id} className="relative aspect-square rounded overflow-hidden border border-border">
                      <img src={m.resultUrl ?? m.designAssetUrl ?? ""} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right panel: mockup viewer ─────────────────────────────────────── */}
        <div className="space-y-4">
          {!selectedTemplate ? (
            <div className="h-[600px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 text-center">
              <Wand2 className="w-12 h-12 text-muted-foreground/40" />
              <div>
                <p className="text-lg font-semibold">Select a template</p>
                <p className="text-sm text-muted-foreground">Choose a garment or product template from the left panel to get started.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedTemplate.category}</p>
                </div>
                <Badge variant="outline" className="text-[10px] ml-auto">{selectedTemplate.id}</Badge>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="2d" className="gap-1.5">
                    <Layers className="w-3.5 h-3.5" />2D Warp
                  </TabsTrigger>
                  <TabsTrigger value="3d" className="gap-1.5">
                    <Box className="w-3.5 h-3.5" />3D Viewer
                  </TabsTrigger>
                  <TabsTrigger value="lifestyle" className="gap-1.5">
                    <Camera className="w-3.5 h-3.5" />Lifestyle
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="2d" className="mt-4">
                  <div className="space-y-3">
                    <WarpCanvas
                      templateUrl={selectedTemplate.thumbnailUrl}
                      designUrl={designUrl}
                      garmentColor={garmentColor}
                      blendMode={blendMode}
                      className="max-w-[520px] mx-auto"
                      onCornersChange={setWarpCorners}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {designUrl ? "Drag corner handles to warp design onto garment" : "Upload a design to enable warp controls"}
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isExporting}
                        onClick={async () => {
                          if (!selectedTemplate) return;
                          setIsExporting(true);
                          try {
                            const dataUrl = await exportWarpComposite(
                              selectedTemplate.thumbnailUrl,
                              designUrl,
                              garmentColor,
                              blendMode,
                              warpCorners,
                              2400,
                            );
                            const a = document.createElement("a");
                            a.href = dataUrl;
                            a.download = `${selectedTemplate.id}-mockup.png`;
                            a.click();
                          } catch {
                            toast({ title: "Export failed", variant: "destructive" });
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isExporting ? "Exporting…" : "Export PNG"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="3d" className="mt-4">
                  <div className="space-y-3">
                    <Viewer3D
                      designUrl={designUrl}
                      garmentColor={garmentColor}
                      className="max-w-[520px] mx-auto aspect-square"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Drag to orbit • Use light presets above • Save PNG to export
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="lifestyle" className="mt-4">
                  <div className="max-w-[520px] mx-auto">
                    <LifestyleCompositor designUrl={designUrl} />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
