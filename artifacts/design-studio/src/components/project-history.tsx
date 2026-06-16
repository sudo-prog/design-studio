import { useGetProjectHistory, getGetProjectHistoryQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Sparkles, Palette, FileText, Package, GitBranch,
  Pencil, Plus, RotateCcw, Clock
} from "lucide-react";

const EVENT_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  updated: Pencil,
  asset_uploaded: Upload,
  ai_job_completed: Sparkles,
  ai_job_approved: Sparkles,
  color_extracted: Palette,
  tech_pack_generated: FileText,
  mockup_generated: Package,
  backup: GitBranch,
  mood_board_updated: Package,
  restored: RotateCcw,
};

const EVENT_COLORS: Record<string, string> = {
  created: "text-primary bg-primary/10",
  updated: "text-blue-400 bg-blue-400/10",
  asset_uploaded: "text-orange-400 bg-orange-400/10",
  ai_job_completed: "text-purple-400 bg-purple-400/10",
  ai_job_approved: "text-green-400 bg-green-400/10",
  color_extracted: "text-pink-400 bg-pink-400/10",
  tech_pack_generated: "text-yellow-400 bg-yellow-400/10",
  mockup_generated: "text-cyan-400 bg-cyan-400/10",
  backup: "text-emerald-400 bg-emerald-400/10",
  mood_board_updated: "text-indigo-400 bg-indigo-400/10",
  restored: "text-amber-400 bg-amber-400/10",
};

function timeAgo(date: string | Date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function ProjectHistory({ projectId }: { projectId: number }) {
  const { data: history, isLoading } = useGetProjectHistory(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectHistoryQueryKey(projectId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No history yet. Actions on this project will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, idx) => {
        const Icon = EVENT_ICONS[entry.type] ?? Clock;
        const colorClass = EVENT_COLORS[entry.type] ?? "text-muted-foreground bg-muted";
        const isLast = idx === history.length - 1;

        return (
          <div key={entry.id} className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className={`flex-1 pb-4 ${!isLast ? "pb-4" : "pb-0"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium leading-tight">{entry.description}</p>
                  {entry.metadata && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {typeof entry.metadata === "string"
                        ? (() => {
                            try {
                              const m = JSON.parse(entry.metadata);
                              return Object.entries(m)
                                .filter(([, v]) => v !== null && v !== undefined)
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ");
                            } catch {
                              return entry.metadata;
                            }
                          })()
                        : null}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {entry.type.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(entry.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
