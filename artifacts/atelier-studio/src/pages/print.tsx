import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Layers, Film, Archive, ChevronRight, ChevronLeft, Download, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";

type Channel = {
  index: number;
  name: string;
  color: string;
  imageBase64: string;
  svgData?: string;
  width: number;
  height: number;
  dpi: number;
};

type FilmResult = {
  imageBase64: string;
  channelName: string;
  lpi: number;
  angle: number;
  dotShape: string;
};

const STEPS = ["Source", "Channels", "Film Settings", "Preview & Export"] as const;

const DOT_SHAPES = [
  { value: "round", label: "Round" },
  { value: "ellipse", label: "Ellipse" },
  { value: "line", label: "Line" },
  { value: "diamond", label: "Diamond" },
];

const PRINT_METHODS = [
  { id: "screen", label: "Screen Print", icon: "🖨️" },
  { id: "dtg", label: "DTG", icon: "🎨" },
  { id: "embroidery", label: "Embroidery", icon: "🧵" },
];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target?.result as string);
    r.readAsDataURL(file);
  });
}

export default function PrintSetup() {
  const [step, setStep] = useState(0);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [channelCount, setChannelCount] = useState(4);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [separating, setSeparating] = useState(false);
  const [lpi, setLpi] = useState(65);
  const [angle, setAngle] = useState(45);
  const [dotShape, setDotShape] = useState("round");
  const [dpi, setDpi] = useState(300);
  const [films, setFilms] = useState<FilmResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await toBase64(f);
    setSourceImage(b64);
  }

  async function separateChannels() {
    if (!sourceImage) return;
    setSeparating(true);
    try {
      const res = await fetch(getApiUrl("print/separate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: sourceImage, channelCount, dpi }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setChannels(data.channels);
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setSeparating(false);
    }
  }

  async function generateFilms() {
    if (channels.length === 0) return;
    setGenerating(true);
    setProgress(0);
    const results: FilmResult[] = [];
    const CMYK_ANGLES = [15, 75, 0, 45, 30, 60, 90, 105];
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      const chAngle = CMYK_ANGLES[i] ?? angle;
      try {
        const res = await fetch(getApiUrl("print/halftone-film"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: ch.imageBase64,
            lpi,
            angle: chAngle,
            dotShape,
            dpi,
            channelName: ch.name,
            channelColor: ch.color,
          }),
        });
        if (res.ok) {
          const film = await res.json();
          results.push(film);
        }
      } catch { /* skip failed channel */ }
      setProgress(Math.round(((i + 1) / channels.length) * 100));
    }
    setFilms(results);
    setGenerating(false);
    setStep(3);
  }

  const [zipping, setZipping] = useState(false);

  async function downloadZip() {
    // Include both PNG halftone films and SVG channel splits
    const pngItems = films.length > 0
      ? films.map((f, i) => ({ filename: `channel_${i + 1}_${f.channelName.toLowerCase().replace(/\s+/g, "_")}_${f.lpi}lpi_${f.angle}deg.png`, dataUrl: f.imageBase64 }))
      : channels.map((c) => ({ filename: `channel_${c.index + 1}_${c.name.toLowerCase().replace(/\s+/g, "_")}.png`, dataUrl: c.imageBase64 }));

    const svgItems = channels
      .filter((c) => c.svgData)
      .map((c) => ({ filename: `channel_${c.index + 1}_${c.name.toLowerCase().replace(/\s+/g, "_")}_vector.svg`, dataUrl: c.svgData! }));

    const items = [...pngItems, ...svgItems];

    const manifest = [
      "DESIGN.Studio Print Export",
      `Date: ${new Date().toISOString()}`,
      `LPI: ${lpi}  DPI: ${dpi}  Dot: ${dotShape}`,
      "",
      ...items.map((it, i) => `Channel ${i + 1}: ${it.filename}`),
      "",
      "Registration marks are included on each film.",
      "Films are print-ready at the specified DPI.",
    ].join("\n");

    setZipping(true);
    try {
      const res = await fetch(getApiUrl("print/export-zip"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: items, manifest }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `print-films-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP export failed:", err);
      // Fallback: download individually
      for (const f of items) {
        const a = document.createElement("a");
        a.href = f.dataUrl;
        a.download = f.filename;
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }
    } finally {
      setZipping(false);
    }
  }

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
            i === step ? "bg-primary text-primary-foreground" :
            i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {i < step ? "✓" : i + 1}
          </div>
          <span className={cn("text-sm hidden sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
          {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[100dvh] pb-[env(safe-area-inset-bottom)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Print Setup</h1>
        <p className="text-muted-foreground">Color separations, halftone films, and prepress output.</p>
      </div>

      <StepIndicator />

      {/* Step 0: Source */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Select Source Image</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {sourceImage ? (
                <div className="space-y-3">
                  <img src={sourceImage} alt="Source" className="max-h-48 mx-auto rounded object-contain" />
                  <p className="text-sm text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="font-medium">Drop artwork here or click to browse</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG, SVG — max 10 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <div className="space-y-2">
              <Label>Print Method</Label>
              <div className="flex gap-3 flex-wrap">
                {PRINT_METHODS.map((m) => (
                  <button key={m.id} className="flex-1 min-h-[44px] border rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className="text-sm font-medium">{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full min-h-[44px]" disabled={!sourceImage} onClick={() => setStep(1)}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Channel config */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" />Configure Color Channels</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {sourceImage && (
              <div className="flex gap-4 items-start">
                <img src={sourceImage} alt="Source" className="w-32 h-32 object-contain rounded border" />
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label>Number of color channels: <span className="font-bold text-primary">{channelCount}</span></Label>
                    <Slider
                      min={1} max={8} step={1}
                      value={[channelCount]}
                      onValueChange={([v]) => setChannelCount(v)}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Fewer channels = simpler screen print. CMYK = 4 channels.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Output DPI</Label>
                    <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="150">150 DPI (draft)</SelectItem>
                        <SelectItem value="300">300 DPI (standard)</SelectItem>
                        <SelectItem value="600">600 DPI (high quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setStep(0)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
              <Button className="flex-1 min-h-[44px]" disabled={separating} onClick={separateChannels}>
                {separating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Separating…</> : <>Separate Channels <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Film settings */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Film className="w-5 h-5" />Halftone Film Settings</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>LPI (Lines per inch): <span className="font-bold text-primary">{lpi}</span></Label>
                  <Slider min={25} max={200} step={5} value={[lpi]} onValueChange={([v]) => setLpi(v)} />
                  <p className="text-xs text-muted-foreground">45–65 LPI for screen print, 85–133 for offset.</p>
                </div>
                <div className="space-y-2">
                  <Label>Default screen angle: <span className="font-bold text-primary">{angle}°</span></Label>
                  <Slider min={0} max={360} step={5} value={[angle]} onValueChange={([v]) => setAngle(v)} />
                  <p className="text-xs text-muted-foreground">Each channel auto-offset (CMYK: 15/75/0/45°). This sets the base angle.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dot shape</Label>
                <div className="flex gap-2 flex-wrap">
                  {DOT_SHAPES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDotShape(d.value)}
                      className={cn("px-3 min-h-[44px] rounded border text-sm transition-colors", dotShape === d.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Channel preview grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {channels.map((ch) => (
              <Card key={ch.index} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  <img src={ch.imageBase64} alt={ch.name} className="w-full h-full object-contain" />
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border flex-shrink-0" style={{ backgroundColor: ch.color }} />
                    <span className="text-xs font-medium truncate">{ch.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ch.color}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="min-h-[44px]" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <Button className="flex-1 min-h-[44px]" disabled={generating} onClick={generateFilms}>
              {generating ? (
                <div className="flex items-center gap-2 w-full justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating films… {progress}%</span>
                </div>
              ) : <>Generate Films <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
          {generating && <Progress value={progress} className="h-2" />}
        </div>
      )}

      {/* Step 3: Preview + Export */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Film className="w-5 h-5" />Film Preview</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => { setFilms([]); setStep(2); }}>
                    <RefreshCw className="w-3 h-3 mr-1" />Re-generate
                  </Button>
                  <Button size="sm" className="min-h-[44px]" onClick={downloadZip} disabled={zipping}>
                    {zipping ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Packaging…</> : <><Download className="w-3 h-3 mr-1" />Download All Films</>}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="films">
                <TabsList>
                  <TabsTrigger value="films" className="min-h-[44px]">Halftone Films ({films.length})</TabsTrigger>
                  <TabsTrigger value="separations" className="min-h-[44px]">Separations ({channels.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="films" className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {films.map((film, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-square bg-white rounded border overflow-hidden">
                          <img src={film.imageBase64} alt={film.channelName} className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium">{film.channelName}</p>
                          <p className="text-xs text-muted-foreground">{film.lpi} LPI · {film.angle}° · {film.dotShape}</p>
                          <Button
                            variant="outline" size="sm" className="w-full min-h-[44px] text-xs"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = film.imageBase64;
                              a.download = `${film.channelName.toLowerCase().replace(/\s+/g,"_")}_film.png`;
                              a.click();
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />Save
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="separations" className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {channels.map((ch) => (
                      <div key={ch.index} className="space-y-2">
                        <div className="aspect-square bg-white rounded border overflow-hidden">
                          <img src={ch.imageBase64} alt={ch.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: ch.color }} />
                          <span className="text-xs font-medium">{ch.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Cost estimator stub */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Cost Estimate</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: "Channels", value: channels.length },
                  { label: "LPI", value: lpi },
                  { label: "DPI", value: dpi },
                  { label: "Est. setup fee", value: `$${(channels.length * 15).toFixed(0)}` },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Full pricing available in the Manufacturing Hub.</p>
            </CardContent>
          </Card>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="min-h-[44px]" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <Button className="flex-1 min-h-[44px]" onClick={downloadZip} disabled={zipping}>
              {zipping
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Packaging ZIP…</>
                : <><Archive className="w-4 h-4 mr-2" />Download ZIP (All Films + Manifest)</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
