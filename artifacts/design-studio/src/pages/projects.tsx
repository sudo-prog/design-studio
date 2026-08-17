import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, GitBranch, Grid3X3, List, Plus, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  in_progress: "outline",
  ready: "default",
  archived: "secondary",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={(STATUS_COLORS[status] ?? "secondary") as "default" | "secondary" | "outline" | "destructive"}
      className={
        status === "ready"
          ? "bg-primary/20 text-primary border-primary/30"
          : status === "in_progress"
          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
          : ""
      }
    >
      {status.replace("_", " ")}
    </Badge>
  );
}

function PaletteSwatches({ palette }: { palette: string[] }) {
  if (!palette?.length) return null;
  return (
    <div className="flex gap-1 mt-2">
      {palette.slice(0, 6).map((color, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
      {palette.length > 6 && (
        <span className="text-xs text-muted-foreground self-center">+{palette.length - 6}</span>
      )}
    </div>
  );
}

function timeAgo(date: string | Date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function Projects() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "created">("updated");

  const { data: projects = [], isLoading, error: projectsError } = useListProjects();
  const safeProjects = projectsError ? [] : projects;
  const showSkeletons = isLoading && !projectsError;

  const categories = useMemo(() => {
    const cats = new Set(safeProjects.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [safeProjects]);

  const filtered = useMemo(() => {
    let list = [...safeProjects];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.brief ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [safeProjects, search, statusFilter, categoryFilter, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {showSkeletons ? "Loading…" : `${filtered.length} of ${safeProjects.length} project${safeProjects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild className="min-h-[44px] min-w-[44px]">
          <Link href="/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>
      {projectsError && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          ⚠️ Could not load projects. Showing empty state. Check your API connection.
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            className="pl-8 min-h-[44px] min-w-[44px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 min-h-[44px] min-w-[44px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 min-h-[44px] min-w-[44px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-36 min-h-[44px] min-w-[44px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last modified</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-md overflow-hidden ml-auto">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-none min-h-[44px] min-w-[44px]"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          ><Grid3X3 className="w-4 h-4" /></Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-none min-h-[44px] min-w-[44px]"
            onClick={() => setView("list")}
            aria-label="List view"
          ><List className="w-4 h-4" /></Button>
        </div>
      </div>

      {showSkeletons ? (
        <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className={view === "grid" ? "h-52 w-full" : "h-20 w-full"} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium">
            {search || statusFilter !== "all" || categoryFilter !== "all" ? "No projects match your filters" : "No projects yet"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 mb-4">
            {search ? "Try a different search term." : "Create your first project to start designing."}
          </p>
          {!search && statusFilter === "all" && categoryFilter === "all" && (
            <Button asChild className="min-h-[44px] min-w-[44px]"><Link href="/projects/new">Create Project</Link></Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover-elevate cursor-pointer transition-all border-border hover:border-primary/50 group h-full overflow-hidden">
                {project.coverAssetUrl ? (
                  <div className="h-36 w-full bg-muted overflow-hidden">
                    <img src={project.coverAssetUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="h-36 w-full bg-muted flex items-center justify-center border-b border-border">
                    <span className="text-muted-foreground font-mono text-xs opacity-30">No Cover</span>
                  </div>
                )}
                <CardHeader className="p-4 pb-2">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <CardTitle className="text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">{project.name}</CardTitle>
                    <StatusBadge status={project.status} />
                  </div>
                  <CardDescription className="text-xs">{project.category ?? "Uncategorized"}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <PaletteSwatches palette={project.colorPalette ?? []} />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{timeAgo(project.updatedAt)}</p>
                    {project.lastBackupAt && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500/70">
                        <GitBranch className="w-3 h-3" />
                        {timeAgo(project.lastBackupAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="flex items-center gap-4 px-4 py-3 min-h-[44px] hover:bg-muted/50 transition-colors group cursor-pointer">
                {project.coverAssetUrl ? (
                  <img src={project.coverAssetUrl} alt={project.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium group-hover:text-primary transition-colors truncate">{project.name}</span>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{project.category ?? "Uncategorized"}</span>
                    <PaletteSwatches palette={project.colorPalette ?? []} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 hidden sm:flex">
                  <span className="text-xs text-muted-foreground">{timeAgo(project.updatedAt)}</span>
                  {project.lastBackupAt && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-500/70">
                      <GitBranch className="w-2.5 h-2.5" />
                      {timeAgo(project.lastBackupAt)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
