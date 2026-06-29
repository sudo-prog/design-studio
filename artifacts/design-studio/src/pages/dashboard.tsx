import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Folder, Image as ImageIcon, Printer, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { AIStyleEngineWidget, MultiAiImageStudioWidget, AiGeneratorWidget } from "@/components/widgets";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity({ limit: 10 });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={summary?.activeProjects}
          loading={loadingSummary}
          icon={Folder}
          trend={`${summary?.totalProjects} total`}
        />
        <StatCard
          title="Ready to Print"
          value={summary?.readyToPrint}
          loading={loadingSummary}
          icon={Printer}
          className="border-primary/50 bg-primary/5"
        />
        <StatCard
          title="Pending AI Jobs"
          value={summary?.pendingAiJobs}
          loading={loadingSummary}
          icon={Activity}
        />
        <StatCard
          title="Total Assets"
          value={summary?.totalAssets}
          loading={loadingSummary}
          icon={ImageIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Studio Widgets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AIStyleEngineWidget />
            <MultiAiImageStudioWidget />
            <AiGeneratorWidget />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-6">
                {activity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {entry.description}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground gap-2">
                        {entry.projectName && (
                          <Link href={`/projects/${entry.projectId}`} className="hover:text-primary transition-colors">
                            {entry.projectName}
                          </Link>
                        )}
                        <span>•</span>
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon: Icon, trend, className }: any) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value || 0}</div>
        )}
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
