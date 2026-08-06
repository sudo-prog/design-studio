import { useState } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { ProjectAssets } from "@/components/project-assets";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Library, ImageOff } from "lucide-react";

export default function Assets() {
  const [projectId, setProjectId] = useState<number | null>(null);

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useListProjects();
  const safeProjects = projectsError ? [] : projects;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
        <p className="text-muted-foreground">
          Upload, preview, and tag design assets. Pick a project to manage its files.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Library className="w-4 h-4 text-muted-foreground" />
            {projectsLoading ? (
              <Skeleton className="h-9 w-56" />
            ) : (
              <Select
                value={projectId ? String(projectId) : ""}
                onValueChange={(v) => setProjectId(Number(v))}
              >
                <SelectTrigger className="w-64 min-h-[44px]">
                  <SelectValue placeholder="Select a project…" />
                </SelectTrigger>
                <SelectContent>
                  {safeProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {projectId ? (
            <ProjectAssets projectId={projectId} />
          ) : (
            <div className="p-12 text-center border border-dashed rounded-lg">
              <ImageOff className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {safeProjects.length === 0 ? "No projects yet — create one first." : "Select a project to view its assets."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
