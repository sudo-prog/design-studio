import { useState, useRef } from "react";
import { useListProjects, useListAiJobs, useApproveAiJob, useRejectAiJob } from "@workspace/api-client-react";
import type { AiJob } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Eraser,
  MessageSquare,
  Zap,
  Settings2,
  Upload,
  Loader2,
} from "lucide-react";
import { AiModuleRunner } from "@/components/ai/ai-module-runner";
import { loadProviderConfig, saveProviderConfig } from "@/lib/ai-adapters";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3 h-3 text-green-500" />,
  approved: <CheckCircle className="w-3 h-3 text-primary" />,
  rejected: <XCircle className="w-3 h-3 text-destructive" />,
  failed: <XCircle className="w-3 h-3 text-destructive" />,
  pending: <Clock className="w-3 h-3 text-yellow-500 animate-pulse" />,
  processing: <Clock className="w-3 h-3 text-blue-500 animate-spin" />,
};

const TYPE_LABELS: Record<string, string> = {
  image_generation: "Image Gen",
  background_removal: "BG Remove",
  style_transfer: "Style Transfer",
  upscale: "Upscale",
  vectorize: "Vectorize",
};

function JobCard({ job, onApprove, onReject }: { job: AiJob; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        {STATUS_ICON[job.status] ?? <Clock className="w-3 h-3" />}
        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[job.type] ?? job.type}</Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </span>
      </div>
      <p className="text-xs line-clamp-2 text-muted-foreground">{job.prompt}</p>
      {job.resultUrls && Array.isArray(job.resultUrls) && job.resultUrls.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {job.resultUrls.slice(0, 4).map((url, i) => (
            <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded border border-border" />
          ))}
        </div>
      )}
      {job.status === "completed" && (
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" className="min-h-[44px] text-[10px] gap-1" onClick={onApprove}>
            <CheckCircle className="w-3 h-3" />Approve
          </Button>
          <Button size="sm" variant="outline" className="min-h-[44px] text-[10px] gap-1" onClick={onReject}>
            <XCircle className="w-3 h-3" />Reject
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Style Transfer Panel ───────────────────────────────────────────────────
interface StyleTransferPanelProps {
  projectId: number;
  onApprove: (url: string) => void;
  onJobCreated: () => void;
}

function StyleTransferPanel({ projectId, onApprove, onJobCreated }: StyleTransferPanelProps) {
  const { toast } = useToast();
  const designRef = useRef<HTMLInputElement>(null);
  const styleRef = useRef<HTMLInputElement>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  function readFile(e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleTransfer() {
    if (!designPreview && !stylePreview) {
      toast({ title: "Upload at least one image", variant: "destructive" });
      return;
    }
    if (!projectId) {
      toast({ title: "Select a project first", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    setResult(null);
    try {
      const cfg = loadProviderConfig();
      const res = await fetch("/api/ai/style-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sourceBase64: designPreview ?? undefined,
          styleBase64: stylePreview ?? undefined,
          apiKey: cfg.apiKey,
          model: cfg.model ?? "dall-e-3",
          provider: cfg.provider === "local" ? "gemini-web2api" : cfg.provider === "nous" ? "nous" : cfg.provider,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const job = await res.json() as { resultUrls?: string[] };
      const url = job.resultUrls?.[0];
      if (url) {
        setResult(url);
        onJobCreated();
        toast({ title: "Style transfer complete", description: "Review and approve to save." });
      }
    } catch (e) {
      toast({ title: "Style transfer failed", description: String(e), variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">Beta</Badge>
        <p className="text-sm font-medium">Style Transfer</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Apply the style of a reference image to your design.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Design slot */}
        <button
          onClick={() => designRef.current?.click()}
          className="min-h-[44px] h-24 border-2 border-dashed border-border rounded overflow-hidden flex items-center justify-center text-xs text-muted-foreground hover:border-primary/50 transition-colors relative"
        >
          {designPreview
            ? <img src={designPreview} className="w-full h-full object-cover" alt="design" />
            : <><Upload className="w-4 h-4 mr-1" />Your design</>
          }
        </button>
        {/* Style reference slot */}
        <button
          onClick={() => styleRef.current?.click()}
          className="min-h-[44px] h-24 border-2 border-dashed border-border rounded overflow-hidden flex items-center justify-center text-xs text-muted-foreground hover:border-primary/50 transition-colors relative"
        >
          {stylePreview
            ? <img src={stylePreview} className="w-full h-full object-cover" alt="style" />
            : <><Upload className="w-4 h-4 mr-1" />Style reference</>
          }
        </button>
      </div>
      <input ref={designRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e, setDesignPreview)} />
      <input ref={styleRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e, setStylePreview)} />

      <Button className="w-full min-h-[44px] text-xs gap-1.5" onClick={handleTransfer} disabled={isRunning}>
        {isRunning
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Transferring…</>
          : <><Sparkles className="w-3.5 h-3.5" />Transfer Style</>
        }
      </Button>

      {result && (
        <div className="space-y-2">
          <img src={result} alt="Style transfer result" className="w-full rounded border border-border" />
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="flex-1 gap-1 min-h-[44px] text-xs" onClick={() => onApprove(result)}>
              <CheckCircle className="w-3 h-3" />Approve & Save
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1 min-h-[44px] text-xs" onClick={() => { setResult(null); handleTransfer(); }}>
              <Sparkles className="w-3 h-3" />Re-run
            </Button>
            <Button size="sm" variant="ghost" className="min-h-[44px] text-xs" onClick={() => setResult(null)}>
              <XCircle className="w-3 h-3" />Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiHub() {
  const { toast } = useToast();
  const { data: projects = [], error: projectsError } = useListProjects();
  const [projectId, setProjectId] = useState<number>(0);
  const activeProjectId = projectId > 0 ? projectId : (projects[0]?.id ?? 0);
  const { data: jobs = [], refetch, error: jobsError } = useListAiJobs(projectId && projectId > 0 ? { projectId } : undefined);
  const approveJob = useApproveAiJob();
  const rejectJob = useRejectAiJob();

  const safeProjects = projectsError ? [] : projects;
  const safeJobs = jobsError ? [] : jobs;

  const cfg = loadProviderConfig();
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerChoice, setProviderChoice] = useState<string>(cfg.provider);
  const [providerKey, setProviderKey] = useState<string>(cfg.apiKey ?? "");
  const [providerModel, setProviderModel] = useState<string>(cfg.model ?? "");

  const saveProviderForm = () => {
    const p = providerChoice.trim() as "local" | "nous" | "gemini-web2api" | "openrouter" | "openai" | "groq";
    if (!["local","nous","gemini-web2api","openrouter","openai","groq"].includes(p)) return;
    if (p === "local" || p === "gemini-web2api" || p === "nous") {
      saveProviderConfig({ provider: p });
    } else {
      saveProviderConfig({ provider: p, apiKey: providerKey || undefined, model: providerModel || undefined });
    }
    toast({ title: "Provider config saved" });
    setShowProviderForm(false);
  };

  async function handleApprove(imageUrl: string) {
    const pid = activeProjectId;
    if (!pid) {
      toast({ title: "Select a project first", description: "Choose a project from the dropdown to save assets.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/projects/${pid}/assets/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl, type: "image", name: "AI Generated", source: "ai_generate" }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Design approved!", description: "Saved to project assets." });
      refetch();
    } catch {
      toast({ title: "Save failed", description: "Could not save asset. Try again.", variant: "destructive" });
    }
  }

  async function handleApproveJob(id: number) {
    await approveJob.mutateAsync({ id });
    refetch();
    toast({ title: "Job approved" });
  }

  async function handleRejectJob(id: number) {
    await rejectJob.mutateAsync({ id });
    refetch();
  }

  const completedJobs = safeJobs.filter((j) => j.status === "completed" || j.status === "approved" || j.status === "rejected");
  const activeJobs = safeJobs.filter((j) => j.status === "pending" || j.status === "processing");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[100dvh] pb-safe pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Concept Generation</h1>
          <p className="text-sm text-muted-foreground">Generate, remove backgrounds, and refine designs with AI assistance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] gap-1 cursor-pointer min-h-[44px] min-w-[44px] px-3"
            onClick={() => setShowProviderForm((v) => !v)}
          >
            <Zap className="w-3 h-3" />
            {cfg.provider === "local" ? "Built-in AI" : cfg.provider}
          </Badge>
          {showProviderForm && (
                      <div className="flex items-center gap-2 flex-wrap bg-background border border-border rounded-md p-2">
                        <input
                          type="text"
                          value={providerChoice}
                          onChange={(e) => setProviderChoice(e.target.value)}
                          placeholder="Provider"
                          className="min-h-[44px] text-xs rounded border border-border bg-background px-2 w-full"
                        />
                        {![ "local", "nous", "gemini-web2api" ].includes(providerChoice) && (
                          <>
                            <input
                              type="text"
                              value={providerKey}
                              onChange={(e) => setProviderKey(e.target.value)}
                              placeholder="API key"
                              className="min-h-[44px] text-xs rounded border border-border bg-background px-2 w-full sm:w-40"
                            />
                            <input
                              type="text"
                              value={providerModel}
                              onChange={(e) => setProviderModel(e.target.value)}
                              placeholder="Model"
                              className="min-h-[44px] text-xs rounded border border-border bg-background px-2 w-full sm:w-40"
                            />
                          </>
                        )}
                        <Button size="sm" className="min-h-[44px] text-[10px] gap-1" onClick={saveProviderForm}>Save</Button>
                        <Button size="sm" variant="ghost" className="min-h-[44px] text-[10px]" onClick={() => setShowProviderForm(false)}>Cancel</Button>
                      </div>
                    )}
          <Select value={String(projectId)} onValueChange={(v) => setProjectId(Number(v))}>
            <SelectTrigger className="min-h-[44px] min-w-[44px] text-xs w-44">
              <SelectValue placeholder="Filter by project…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All projects</SelectItem>
              {safeProjects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
        { label: "Total Jobs", value: safeJobs.length, icon: <Sparkles className="w-4 h-4" /> },
        { label: "Completed", value: completedJobs.length, icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
        { label: "Approved", value: safeJobs.filter(j => j.status === "approved").length, icon: <CheckCircle className="w-4 h-4 text-primary" /> },
        { label: "Active", value: activeJobs.length, icon: <Clock className="w-4 h-4 text-yellow-500" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 min-h-[44px]">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
        {/* ── AI Module runner ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <AiModuleRunner
              projectId={activeProjectId}
              onApprove={handleApprove}
            />
          </CardContent>
        </Card>

        {/* ── Job history ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Generation History</h2>
            <Button size="sm" variant="ghost" onClick={() => refetch()} className="min-h-[44px] text-xs">
              Refresh
            </Button>
          </div>

          {safeJobs.length === 0 ? (
            <div className="h-64 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 text-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No generations yet</p>
                <p className="text-sm text-muted-foreground">Use the AI Tools panel to generate your first concept.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {safeJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApprove={() => handleApproveJob(job.id)}
                  onReject={() => handleRejectJob(job.id)}
                />
              ))}
            </div>
          )}

          {/* Style Transfer */}
          <Separator />
          <StyleTransferPanel
            projectId={activeProjectId}
            onApprove={handleApprove}
            onJobCreated={refetch}
          />
        </div>
        </div>
      </div>
    </div>
  );
}
