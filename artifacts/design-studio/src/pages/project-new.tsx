import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, Check, FolderOpen, Palette, Printer, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Details", icon: FolderOpen, desc: "Name, category & brief" },
  { id: 2, label: "Vibe", icon: Palette, desc: "Colors & aesthetic" },
  { id: 3, label: "Print Specs", icon: Printer, desc: "Method & quantity" },
  { id: 4, label: "Review", icon: Eye, desc: "Confirm & create" },
];

const step1Schema = z.object({
  name: z.string().min(1, "Project name is required"),
  category: z.string().optional(),
  brief: z.string().optional(),
});

const step2Schema = z.object({
  vibe: z.string().optional(),
  colorPalette: z.string().optional(),
});

const step3Schema = z.object({
  printMethod: z.string().optional(),
  estimatedQuantity: z.coerce.number().int().positive().optional().or(z.literal("")),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

interface WizardData extends Step1, Step2, Step3 {}

const VIBE_OPTIONS = [
  "Streetwear / Urban", "Retro / Vintage", "Minimal / Clean",
  "Bold / Graphic", "Nature / Organic", "Dark / Moody",
  "Maximalist / Loud", "Tech / Futuristic", "Preppy / Classic", "Y2K / Nostalgia",
];

const SAMPLE_PALETTES: { name: string; colors: string[] }[] = [
  { name: "Midnight Drop", colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"] },
  { name: "Summer Wave", colors: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3"] },
  { name: "Earth Tones", colors: ["#c8a96e", "#8b6914", "#3d2b1f", "#f5e6c8"] },
  { name: "Neon Cyber", colors: ["#00ff88", "#00d4ff", "#ff0080", "#1a0033"] },
  { name: "Off-White", colors: ["#f5f5f0", "#e8e4d9", "#c9c0a8", "#2d2d2a"] },
];

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});
  const [selectedPalette, setSelectedPalette] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("#000000");

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: { name: "", category: "", brief: "" } });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: { vibe: "", colorPalette: "" } });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema), defaultValues: { printMethod: "screen_print", estimatedQuantity: "" } });

  function handleStep1(values: Step1) {
    setWizardData((d) => ({ ...d, ...values }));
    setStep(2);
  }

  function handleStep2(values: Step2) {
    setWizardData((d) => ({ ...d, ...values }));
    setStep(3);
  }

  function handleStep3(values: Step3) {
    setWizardData((d) => ({ ...d, ...values }));
    setStep(4);
  }

  function handleCreate() {
    const qty = wizardData.estimatedQuantity;
    createProject.mutate(
      {
        data: {
          name: wizardData.name!,
          category: wizardData.category || undefined,
          brief: wizardData.brief || undefined,
          vibe: wizardData.vibe || undefined,
          status: "draft",
          printMethod: wizardData.printMethod || undefined,
          estimatedQuantity: qty != null && qty !== "" ? Number(qty) : undefined,
          colorPalette: selectedPalette.length > 0 ? selectedPalette : undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast({ title: "Project created", description: `"${data.name}" is ready.` });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setLocation(`/projects/${data.id}`);
        },
        onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
      }
    );
  }

  function addColor(hex: string) {
    if (!selectedPalette.includes(hex)) setSelectedPalette((p) => [...p, hex]);
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
        <p className="text-muted-foreground">Set up your design project in 4 quick steps.</p>
      </div>

      <div className="relative">
        <div className="flex flex-wrap justify-between items-center relative z-10 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all",
                    done ? "bg-primary border-primary text-primary-foreground" :
                    active ? "border-primary text-primary bg-primary/10" :
                    "border-border text-muted-foreground bg-card"
                  )}
                >
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", active ? "text-primary" : done ? "text-primary/80" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border -z-0">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Give your project a name and brief.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form1}>
              <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
                <FormField control={form1.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Summer Drop — Heavyweight Tee" className="min-h-[44px]" {...field} autoFocus /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form1.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input placeholder="e.g. T-Shirts, Hoodies, Accessories" className="min-h-[44px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form1.control} name="brief" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creative Brief</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your vision, inspiration, target audience, or anything that sets the direction…"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex flex-wrap justify-end pt-2">
                  <Button type="submit" className="min-h-[44px]">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Vibe & Colors</CardTitle>
            <CardDescription>Define the aesthetic direction of this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form2}>
              <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-5">
                <FormField control={form2.control} name="vibe" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aesthetic / Vibe</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                      {VIBE_OPTIONS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => field.onChange(v)}
                          className={cn(
                            "text-xs px-3 py-2 min-h-[44px] rounded-md border transition-all text-left",
                            field.value === v
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="space-y-2">
                  <FormLabel>Color Palette</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_PALETTES.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedPalette(p.colors)}
                        className={cn(
                          "flex items-center gap-3 p-2 min-h-[44px] rounded-md border transition-all text-left",
                          JSON.stringify(selectedPalette) === JSON.stringify(p.colors)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex gap-1">
                          {p.colors.map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-xs font-medium">{p.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-8 h-8 min-h-[44px] min-w-[44px] rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => addColor(customColor)}>
                      Add custom color
                    </Button>
                    {selectedPalette.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-2">
                        {selectedPalette.map((c, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 min-h-[44px] min-w-[44px] rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                            title={`Remove ${c}`}
                            onClick={() => setSelectedPalette((p) => p.filter((x) => x !== c))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between pt-2 gap-2">
                  <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" className="min-h-[44px]">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Print Specifications</CardTitle>
            <CardDescription>What print method and quantity are you planning?</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form3}>
              <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-4">
                <FormField control={form3.control} name="printMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="screen_print">Screen Print</SelectItem>
                        <SelectItem value="dtg">DTG (Direct to Garment)</SelectItem>
                        <SelectItem value="embroidery">Embroidery</SelectItem>
                        <SelectItem value="sublimation">Sublimation</SelectItem>
                        <SelectItem value="vinyl">Vinyl / HTV</SelectItem>
                        <SelectItem value="dtf">DTF (Direct to Film)</SelectItem>
                        <SelectItem value="unknown">Not decided yet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form3.control} name="estimatedQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 50, 100, 500"
                        className="min-h-[44px]"
                        {...field}
                        value={field.value === undefined ? "" : String(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex flex-wrap justify-between pt-2 gap-2">
                  <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" className="min-h-[44px]">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Confirm your project details before creating.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Name", value: wizardData.name },
                { label: "Category", value: wizardData.category || "—" },
                { label: "Print Method", value: (wizardData.printMethod ?? "—").replace(/_/g, " ") },
                { label: "Quantity", value: wizardData.estimatedQuantity ? String(wizardData.estimatedQuantity) : "—" },
                { label: "Vibe", value: wizardData.vibe || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-sm mt-0.5 capitalize">{value}</p>
                </div>
              ))}
            </div>
            {wizardData.brief && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground">Brief</p>
                <p className="text-sm mt-0.5 line-clamp-3">{wizardData.brief}</p>
              </div>
            )}
            {selectedPalette.length > 0 && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-2">Color Palette</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPalette.map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-between pt-2 gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={createProject.isPending} className="min-h-[44px]">
                {createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
