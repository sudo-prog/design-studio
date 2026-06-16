import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your design projects and drops.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-8" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : projects?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover-elevate cursor-pointer transition-all border-border hover:border-primary/50 group h-full">
                {project.coverAssetUrl ? (
                  <div className="h-32 w-full bg-muted rounded-t-lg overflow-hidden relative">
                    <img 
                      src={project.coverAssetUrl} 
                      alt={project.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-muted rounded-t-lg flex items-center justify-center border-b border-border">
                    <span className="text-muted-foreground font-mono text-xs opacity-50">No Cover</span>
                  </div>
                )}
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <Badge variant={project.status === "ready" ? "default" : "secondary"} className="text-[10px] uppercase">
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs">
                    {project.category || "Uncategorized"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 mb-4">
            Create your first project to start designing, generating mockups, and planning production.
          </p>
          <Button asChild>
            <Link href="/projects/new">Create Project</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// Ensure FolderOpen is available
import { FolderOpen } from "lucide-react";