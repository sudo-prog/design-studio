import { useListAiJobs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AiHub() {
  const { data: jobs, isLoading } = useListAiJobs();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Concept Generation</h1>
        <p className="text-muted-foreground">Generate, upscale, and vectorize artwork.</p>
      </div>

      <div className="p-12 text-center border border-dashed rounded-lg bg-card/50">
        <p className="text-muted-foreground">AI tool suite coming soon...</p>
      </div>
    </div>
  );
}