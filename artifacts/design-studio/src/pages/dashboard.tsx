import { useGetDashboardSummary, useGetRecentActivity, getGetDashboardSummaryQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Folder, Image as ImageIcon, Printer, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { AIStyleEngineWidget, MultiAiImageStudioWidget, AiGeneratorWidget } from "@/components/widgets";

export default function Dashboard() {
  // The dashboard relies on a backend API. On a static Vercel deploy there is
  // no backend, so skip these queries to avoid 404 console errors. Local dev
  // (DEV) or an explicit VITE_API_ENABLED opt-in keeps them active.
  const apiEnabled = import.meta.env.DEV || import.meta.env.VITE_API_ENABLED === 'true';
  const { data: summary, isLoading: loadingSummary, error: summaryError } = useGetDashboardSummary({ query: { enabled: apiEnabled, queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: activity, isLoading: loadingActivity, error: activityError } = useGetRecentActivity({ limit: 10 }, { query: { enabled: apiEnabled, queryKey: getGetRecentActivityQueryKey({ limit: 10 }) } });

  // Gracefully handle API errors (e.g. on Vercel SPA rewrite, /api/* returns HTML)
  const hasError = summaryError || activityError;
  const safeSummary = hasError ? null : summary;
  const safeActivity = hasError ? [] : (activity ?? []);
  const showSkeletons = loadingSummary && !hasError;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={safeSummary?.activeProjects}
          loading={showSkeletons}
          icon={Folder}
          trend={safeSummary ? `${safeSummary.totalProjects} total` : undefined}
        />
        <StatCard
          title="Ready to Print"
          value={safeSummary?.readyToPrint}
          loading={showSkeletons}
          icon={Printer}
          className="border-primary/50 bg-primary/5"
        />
        <StatCard
          title="Pending AI Jobs"
          value={safeSummary?.pendingAiJobs}
          loading={showSkeletons}
          icon={Activity}
        />
        <StatCard
          title="Total Assets"
          value={safeSummary?.totalAssets}
          loading={showSkeletons}
          icon={ImageIcon}
        />
      </div>
      {hasError && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          ⚠️ Dashboard data could not be loaded. Showing empty state. Check your API connection.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Studio Widgets
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <AIStyleEngineWidget />
            <MultiAiImageStudioWidget />
            <AiGeneratorWidget />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
                    {loadingActivity && !hasError ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : safeActivity && safeActivity.length > 0 ? (
              <div className="space-y-6">
                {safeActivity.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-start gap-4">
                    <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {entry.description}
                      </p>
                      <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-2">
                        {entry.projectName && (
                          <Link href={`/projects/${entry.projectId}`} className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center">
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
      <CardHeader className="flex flex-row flex-wrap items-center justify-between space-y-0 pb-2 gap-4">
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
