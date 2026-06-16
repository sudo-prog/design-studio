import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetProject,
  useUpdateProject,
  useBackupProject,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import type { ProjectUpdateStatus } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, GitBranch, Download, Loader2, Check, ExternalLink,
  Calendar, Layers, Printer, Hash
} from "lucide-react";
import { Link } from "wouter";
import { MoodBoard, type MoodBoardItem } from "@/components/mood-board";
import { ProjectAssets } from "@/components/project-assets";
import { ProjectHistory } from "@/components/project-history";

function timeAgo(date: string | Date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}

const STATUS_OPTIONS = ["draft", "in_progress", "ready", "archived"];

function getApiBase() {
  if (typeof window !== "undefined") {
    const base = import.meta.env.BASE_URL ?? "/";
    return base.endsWith("/") ? `${base}api` : `${base}/api`;
  }
  return "/api";
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) },
  });

  const updateProject = useUpdateProject();
  const backupProject = useBackupProject();

  const [editName, setEditName] = useState("");
  const [editBrief, setEditBrief] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubPat, setGithubPat] = useState("");
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [backupResult, setBackupResult] = useState<{ commitUrl?: string | null } | null>(null);

  function startEdit() {
    setEditName(project?.name ?? "");
    setEditBrief(project?.brief ?? "");
    setEditStatus(project?.status ?? "draft");
    setEditCategory(project?.category ?? "");
    setGithubRepo((project as unknown as Record<string, string>)?.githubRepo ?? "");
    setIsEditingOverview(true);
  }

  function saveOverview() {
    updateProject.mutate(
      {
        id,
        data: {
          name: editName,
          brief: editBrief || undefined,
          status: editStatus as ProjectUpdateStatus,
          category: editCategory || undefined,
          githubRepo: githubRepo || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          setIsEditingOverview(false);
          toast({ title: "Project updated" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  }

  async function saveMoodBoard(items: MoodBoardItem[]) {
    setIsSavingBoard(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/projects/${id}/mood-board`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error((err as { error?: string }).error ?? "Save failed");
      }
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
    } catch (err) {
      toast({ title: "Failed to save mood board", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setIsSavingBoard(false);
    }
  }

  async function saveGithubConfig() {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/projects/${id}/github`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: githubRepo, pat: githubPat }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error((err as { error?: string }).error ?? "Save failed");
      }
      toast({ title: "GitHub config saved" });
    } catch (err) {
      toast({ title: "Failed to save GitHub config", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  function triggerBackup() {
    backupProject.mutate(
      { id },
      {
        onSuccess: (data) => {
          const d = data as unknown as Record<string, unknown>;
          setBackupResult({ commitUrl: d.commitUrl as string | null });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          toast({
            title: "Backup complete",
            description: d.commitUrl ? "Committed to GitHub" : "design.json prepared",
          });
        },
        onError: () => toast({ title: "Backup failed", variant: "destructive" }),
      }
    );
  }

  function downloadDesignJson() {
    const base = getApiBase();
    window.open(`${base}/projects/${id}/design.json`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Project not found.</p>
        <Button asChild variant="outline">
          <Link href="/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  const proj = project as unknown as Record<string, unknown>;
  const moodBoardItems = Array.isArray(proj.moodBoard)
    ? (proj.moodBoard as MoodBoardItem[])
    : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/projects"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
            <Badge
              variant={project.status === "ready" ? "default" : "secondary"}
              className={project.status === "ready" ? "bg-primary/20 text-primary border-primary/30" : ""}
            >
              {project.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {project.category && `${project.category} · `}Updated {timeAgo(project.updatedAt)}
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href={`/projects/${id}/editor`}>
            <Layers className="w-3.5 h-3.5" /> Open Editor
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={downloadDesignJson} className="gap-1.5 hidden sm:flex">
          <Download className="w-3.5 h-3.5" /> design.json
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moodboard">Mood Board</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Core metadata for this design project.</CardDescription>
              </div>
              {!isEditingOverview && (
                <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditingOverview ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. T-Shirts, Hoodies" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Creative Brief</Label>
                    <Textarea value={editBrief} onChange={(e) => setEditBrief(e.target.value)} className="min-h-[100px]" placeholder="Describe the vision…" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEditingOverview(false)}>Cancel</Button>
                    <Button onClick={saveOverview} disabled={updateProject.isPending}>
                      {updateProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Hash, label: "Category", value: project.category ?? "—" },
                    { icon: Printer, label: "Print Method", value: (project.printMethod ?? "—").replace(/_/g, " ") },
                    { icon: Layers, label: "Qty Estimate", value: project.estimatedQuantity ? `${project.estimatedQuantity} units` : "—" },
                    { icon: Calendar, label: "Created", value: new Date(project.createdAt).toLocaleDateString() },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-md p-3 flex items-start gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium text-sm capitalize mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}
                  {(project.colorPalette?.length ?? 0) > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-2">Color Palette</p>
                      <div className="flex gap-2 flex-wrap">
                        {project.colorPalette?.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: c }} />
                            <span className="text-xs font-mono text-muted-foreground">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.brief && (
                    <div className="bg-muted/50 rounded-md p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Brief</p>
                      <p className="text-sm leading-relaxed">{project.brief}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-muted-foreground" />
                <CardTitle>GitHub Backup</CardTitle>
              </div>
              <CardDescription>
                Commit your design.json to a GitHub repository for version control.
                {project.lastBackupAt && (
                  <span className="text-primary ml-2">Last backup: {timeAgo(project.lastBackupAt)}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Repository (owner/repo)</Label>
                  <Input placeholder="e.g. myuser/my-designs" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Personal Access Token</Label>
                  <Input type="password" placeholder="ghp_…" value={githubPat} onChange={(e) => setGithubPat(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={saveGithubConfig} className="gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Save Config
                </Button>
                <Button size="sm" onClick={triggerBackup} disabled={backupProject.isPending} className="gap-1.5">
                  {backupProject.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  Backup Now
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDesignJson} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download design.json
                </Button>
              </div>
              {backupResult?.commitUrl && (
                <a href={backupResult.commitUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> View commit on GitHub
                </a>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MOOD BOARD ── */}
        <TabsContent value="moodboard" className="mt-6">
          <MoodBoard
            projectId={id}
            initialItems={moodBoardItems}
            onSave={saveMoodBoard}
            isSaving={isSavingBoard}
          />
        </TabsContent>

        {/* ── ASSETS ── */}
        <TabsContent value="assets" className="mt-6">
          <ProjectAssets projectId={id} />
        </TabsContent>

        {/* ── HISTORY ── */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>Every significant action on this project, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectHistory projectId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
