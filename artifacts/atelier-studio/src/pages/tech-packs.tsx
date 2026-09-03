import { useState, useRef } from "react";
import { useListTechPacks, useCreateTechPack, useListProjects } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Download, Loader2, Trash2, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";
import { format } from "date-fns";

type ColorSpec = { name: string; hex: string; pantone: string; cmyk: string };

type PageId = "cover" | "colors" | "specs" | "mockup" | "notes";
const PAGE_LABELS: Record<PageId, string> = {
  cover: "Cover / Design Image",
  colors: "Color Specifications",
  specs: "Print Specifications",
  mockup: "Garment Mockup",
  notes: "Production Notes",
};
const DEFAULT_PAGE_ORDER: PageId[] = ["cover", "colors", "specs", "mockup", "notes"];

function PageOrderEditor({ order, onChange }: { order: PageId[]; onChange: (o: PageId[]) => void }) {
  const dragIdx = useRef<number | null>(null);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(dragIdx.current, 1);
    newOrder.splice(i, 0, moved);
    dragIdx.current = i;
    onChange(newOrder);
  }
  function onDragEnd() { dragIdx.current = null; }

  return (
    <div className="space-y-1.5">
      {order.map((pageId, i) => (
        <div
          key={pageId}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDragEnd={onDragEnd}
          className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-md border bg-card cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors select-none"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium">{i + 1}.</span>
          <span className="text-sm">{PAGE_LABELS[pageId]}</span>
        </div>
      ))}
    </div>
  );
}

const GARMENT_TYPES = ["T-Shirt", "Hoodie", "Sweatshirt", "Tank Top", "Polo", "Long Sleeve", "Jacket", "Cap", "Tote Bag", "Other"];
const PRINT_METHODS = ["Screen Print", "DTG (Direct to Garment)", "Embroidery", "Sublimation", "Heat Transfer", "Discharge Print"];
const PLACEMENTS = ["Center Front", "Left Chest", "Full Back", "Center Back", "Sleeve", "Bottom Hem", "All-Over", "Custom"];

function HexSwatch({ hex }: { hex: string }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#cccccc";
  return <div className="w-6 h-6 rounded border flex-shrink-0" style={{ backgroundColor: safe }} />;
}

export default function TechPacks() {
  const { data: projects = [], error: projectsError } = useListProjects();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const { data: techPacks = [], refetch, error: techPacksError } = useListTechPacks(
    selectedProject ? { projectId: selectedProject } : {}
  );

  const createMutation = useCreateTechPack();

  const safeProjects = projectsError ? [] : projects;
  const safeTechPacks = techPacksError ? [] : techPacks;

  const [showForm, setShowForm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageOrder, setPageOrder] = useState<PageId[]>([...DEFAULT_PAGE_ORDER]);

  // Form state
  const [title, setTitle] = useState("");
  const [garmentType, setGarmentType] = useState("");
  const [printMethod, setPrintMethod] = useState("");
  const [placement, setPlacement] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [notes, setNotes] = useState("");
  const [designer, setDesigner] = useState("");
  const [colors, setColors] = useState<ColorSpec[]>([
    { name: "Main Color", hex: "#000000", pantone: "", cmyk: "" },
  ]);

  function addColor() {
    setColors((prev) => [...prev, { name: `Color ${prev.length + 1}`, hex: "#ffffff", pantone: "", cmyk: "" }]);
  }
  function removeColor(i: number) {
    setColors((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateColor(i: number, field: keyof ColorSpec, value: string) {
    setColors((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  async function generatePdf() {
    if (!selectedProject) return;
    setGeneratingPdf(true);
    setPdfUrl(null);
    try {
      const project = projects.find((p) => p.id === selectedProject);
      const res = await fetch(getApiUrl("/tech-pack/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project?.name ?? title,
          date: format(new Date(), "MMMM d, yyyy"),
          designer,
          garmentType,
          printMethod,
          placement,
          dimensions,
          colorCount: colors.length,
          colors,
          notes,
          pageOrder,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Also save to DB
      await createMutation.mutateAsync({
        data: {
          projectId: selectedProject,
          title: title || `Tech Pack — ${project?.name ?? ""}`,
          garmentType: garmentType || undefined,
          printMethod: printMethod || undefined,
          placement: placement || undefined,
          dimensions: dimensions || undefined,
          colorCount: colors.length,
          notes: notes || undefined,
        },
      });
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPdf(false);
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${title || "tech-pack"}.pdf`;
    a.click();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tech Packs</h1>
          <p className="text-muted-foreground">Generate production-ready specification sheets.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancel" : "New Tech Pack"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tech Pack Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={selectedProject?.toString() ?? ""} onValueChange={(v) => setSelectedProject(Number(v))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select project…" /></SelectTrigger>
                  <SelectContent>
                    {safeProjects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tech Pack Title</Label>
                <Input placeholder="e.g. SS25 Drop 1 Tech Pack" className="min-h-[44px]" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Designer / Studio</Label>
                <Input placeholder="Your name or studio" className="min-h-[44px]" value={designer} onChange={(e) => setDesigner(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Garment Type</Label>
                <Select value={garmentType} onValueChange={setGarmentType}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select garment…" /></SelectTrigger>
                  <SelectContent>
                    {GARMENT_TYPES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Print Method</Label>
                <Select value={printMethod} onValueChange={setPrintMethod}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select method…" /></SelectTrigger>
                  <SelectContent>
                    {PRINT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Print Placement</Label>
                <Select value={placement} onValueChange={setPlacement}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select placement…" /></SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Print Dimensions (W × H)</Label>
                <Input placeholder='e.g. 10" × 12"' className="min-h-[44px]" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* Color specs */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-base font-semibold">Color Specifications</Label>
                <Button variant="outline" size="sm" className="min-h-[44px]" onClick={addColor}>
                  <Plus className="w-3 h-3 mr-1" />Add Color
                </Button>
              </div>
              <div className="space-y-3">
                {colors.map((color, i) => (
                  <div key={i} className="flex flex-wrap gap-3 items-center p-3 rounded-lg border bg-card">
                    <HexSwatch hex={color.hex} />
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : "#000000"}
                      onChange={(e) => updateColor(i, "hex", e.target.value)}
                      className="min-h-[44px] min-w-[44px] cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <Input
                      placeholder="Color name"
                      value={color.name}
                      onChange={(e) => updateColor(i, "name", e.target.value)}
                      className="flex-1 min-h-[44px]"
                    />
                    <Input
                      placeholder="Pantone"
                      value={color.pantone}
                      onChange={(e) => updateColor(i, "pantone", e.target.value)}
                      className="w-24 min-h-[44px] text-xs"
                    />
                    <Input
                      placeholder="CMYK"
                      value={color.cmyk}
                      onChange={(e) => updateColor(i, "cmyk", e.target.value)}
                      className="w-32 min-h-[44px] text-xs"
                    />
                    {colors.length > 1 && (
                      <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => removeColor(i)} aria-label={`Remove color ${i + 1}`}>
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Production Notes</Label>
              <Textarea
                className="min-h-[44px]"
                placeholder="Special instructions, fabric type, wash requirements, print notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <Separator />

            {/* Page reorder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-base font-semibold">PDF Page Order</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline min-h-[44px]"
                  onClick={() => setPageOrder([...DEFAULT_PAGE_ORDER])}
                >
                  Reset default
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Drag pages to reorder them in the exported PDF.</p>
              <PageOrderEditor order={pageOrder} onChange={setPageOrder} />
            </div>

            {/* Generate + PDF preview */}
            <div className="space-y-3">
              <Button
                className="w-full min-h-[44px]"
                disabled={!selectedProject || generatingPdf}
                onClick={generatePdf}
              >
                {generatingPdf ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating PDF…</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" />Generate PDF</>
                )}
              </Button>

              {pdfUrl && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">PDF Ready</Badge>
                    <Button size="sm" className="min-h-[44px]" onClick={downloadPdf}>
                      <Download className="w-3 h-3 mr-1" />Download PDF
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[600px] rounded-lg border bg-white"
                      title="Tech Pack Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved tech packs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Saved Tech Packs</h2>
          <Select value={selectedProject?.toString() ?? "all"} onValueChange={(v) => setSelectedProject(v === "all" ? null : Number(v))}>
            <SelectTrigger className="w-44 min-h-[44px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {safeProjects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {techPacks.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-lg">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tech packs yet. Create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeTechPacks.map((pack) => (
              <Card key={pack.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold truncate">{pack.title ?? "Untitled Tech Pack"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pack.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{pack.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {pack.garmentType && <p>🎽 {pack.garmentType}</p>}
                    {pack.printMethod && <p>🖨️ {pack.printMethod}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
