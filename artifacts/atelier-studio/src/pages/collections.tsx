import { useState } from "react";
import {
  useListCollections,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useStartBatchExport,
  useListProjects,
  getListCollectionsQueryKey,
} from "@workspace/api-client-react";
import type { Collection, CollectionInput, CollectionUpdate, BatchExportInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Library, Plus, Trash2, Pencil, Download, Loader2, Boxes, CheckSquare } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  archived: "Archived",
};

type BatchAction = "mockups" | "separations" | "tech_packs";

export default function Collections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<BatchAction>("mockups");

  const { data: collections = [], isLoading, error: collectionsError } = useListCollections();
  const safeCollections = collectionsError ? [] : collections;

  const { data: projects = [], error: projectsError } = useListProjects();
  const safeProjects = projectsError ? [] : projects;

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const startBatch = useStartBatchExport();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListCollectionsQueryKey() });
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const body: CollectionInput = {
      name: name.trim(),
      season: season.trim() || undefined,
      projectIds: projectIds.map(Number),
    };
    try {
      await createCollection.mutateAsync(
        { data: body },
        {
          onSuccess: () => {
            setName("");
            setSeason("");
            setProjectIds([]);
            refresh();
            toast({ title: "Collection created", description: body.name });
          },
          onError: () => toast({ title: "Create failed", variant: "destructive" }),
        },
      );
    } catch {
      /* handled in onError */
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const body: CollectionUpdate = {
      name: editing.name,
      season: editing.season ?? undefined,
      status: editing.status,
      projectIds: editing.projectIds,
    };
    try {
      await updateCollection.mutateAsync(
        { id: editing.id, data: body },
        {
          onSuccess: () => {
            setEditing(null);
            refresh();
            toast({ title: "Collection updated", description: editing.name });
          },
          onError: () => toast({ title: "Update failed", variant: "destructive" }),
        },
      );
    } catch {
      /* handled in onError */
    }
  }

  async function handleDelete(id: number, label: string) {
    try {
      await deleteCollection.mutateAsync(
        { id },
        {
          onSuccess: () => {
            setSelected((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            refresh();
            toast({ title: "Collection deleted", description: label });
          },
          onError: () => toast({ title: "Delete failed", variant: "destructive" }),
        },
      );
    } catch {
      /* handled in onError */
    }
  }

  async function handleBatchExport() {
    if (selected.size === 0) {
      toast({ title: "Select collections first", variant: "destructive" });
      return;
    }
    for (const id of selected) {
      const body: BatchExportInput = { action: batchAction };
      try {
        await startBatch.mutateAsync({ id, data: body });
      } catch {
        toast({ title: `Batch export failed (${id})`, variant: "destructive" });
      }
    }
    toast({ title: "Batch export started", description: `${selected.size} collection(s) · ${batchAction}` });
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[100dvh] pb-[env(safe-area-inset-bottom)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
        <p className="text-muted-foreground">Manage drops, seasons, and batch exports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        {/* ── Create / edit panel ── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editing ? "Edit Collection" : "New Collection"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="col-name">Name</Label>
              <Input
                id="col-name"
                placeholder="Spring Drop 2026" className="min-h-[44px] min-w-[44px]"
                value={editing ? editing.name : name}
                onChange={(e) => (editing ? setEditing({ ...editing, name: e.target.value }) : setName(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="col-season">Season</Label>
              <Input
                id="col-season"
                placeholder="SS26" className="min-h-[44px] min-w-[44px]"
                value={editing ? (editing.season ?? "") : season}
                onChange={(e) =>
                  editing ? setEditing({ ...editing, season: e.target.value }) : setSeason(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Linked Projects</Label>
              <Select
                value={editing ? (editing.projectIds?.[0] ? String(editing.projectIds[0]) : "") : (projectIds[0] ?? "")}
                onValueChange={(v) =>
                  editing
                    ? setEditing({ ...editing, projectIds: v ? [Number(v)] : [] })
                    : setProjectIds(v ? [v] : [])
                }
              >
                <SelectTrigger className="min-h-[44px] min-w-[44px]">
                  <SelectValue placeholder="Link a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {safeProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editing.status ?? "planning"}
                  onValueChange={(v) => setEditing({ ...editing, status: v as CollectionUpdate["status"] })}
                >
                  <SelectTrigger className="min-h-[44px] min-w-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <Button onClick={handleSaveEdit} disabled={updateCollection.isPending} className="flex-1 gap-1.5 min-h-[44px] min-w-[44px]">
                    {updateCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)} className="min-h-[44px] min-w-[44px]">Cancel</Button>
                </>
              ) : (
                <Button onClick={handleCreate} disabled={createCollection.isPending} className="w-full gap-1.5 min-h-[44px] min-w-[44px]">
                  {createCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Collection
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── List + batch toolbar ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-3">
            <Boxes className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : "Select collections for batch export"}
            </span>
            <Select value={batchAction} onValueChange={(v) => setBatchAction(v as BatchAction)}>
              <SelectTrigger className="w-40 min-h-[44px] min-w-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mockups">Mockups</SelectItem>
                <SelectItem value="separations">Separations</SelectItem>
                <SelectItem value="tech_packs">Tech Packs</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || startBatch.isPending}
              onClick={handleBatchExport}
              className="gap-1.5 min-h-[44px] min-w-[44px]"
            >
              {startBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Batch Export
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : safeCollections.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-lg bg-card/50">
              <Library className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No collections yet. Create one to group your drops.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeCollections.map((col) => (
                <Card key={col.id} className={selected.has(col.id) ? "border-primary/60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => toggleSelect(col.id)}
                          className={`mt-0.5 min-h-[44px] min-w-[44px] rounded border flex items-center justify-center ${
                            selected.has(col.id) ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          }`}
                          aria-label={`Select ${col.name}`}
                        >
                          {selected.has(col.id) && <CheckSquare className="w-3 h-3" />}
                        </button>
                        <CardTitle className="text-base min-w-0 break-words">{col.name}</CardTitle>
                      </div>
                      <Badge variant={col.status === "active" ? "default" : "secondary"}>
                        {STATUS_LABEL[col.status ?? "planning"] ?? col.status}
                      </Badge>
                    </div>
                    {col.season && <CardDescription>Season: {col.season}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {(col.projectIds ?? []).map((pid) => {
                        const proj = safeProjects.find((p) => p.id === pid);
                        return (
                          <Badge key={pid} variant="outline" className="text-xs">
                            {proj?.name ?? `Project ${pid}`}
                          </Badge>
                        );
                      })}
                      {(col.projectIds?.length ?? 0) === 0 && (
                        <span className="text-xs text-muted-foreground">No linked projects</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px]" onClick={() => setEditing(col)}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5 min-h-[44px]"
                        onClick={() => handleDelete(col.id, col.name)}
                        disabled={deleteCollection.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
