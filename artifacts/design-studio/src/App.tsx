// Vercel deployment cache buster v2
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/project-new";
import ProjectDetail from "@/pages/project-detail";
import Editor from "@/pages/editor";
import AiHub from "@/pages/ai";
import Colors from "@/pages/colors";
import Mockups from "@/pages/mockups";
import Print from "@/pages/print";
import TechPacks from "@/pages/tech-packs";
import Manufacturing from "@/pages/manufacturing";
import Collections from "@/pages/collections";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Full-screen editor — rendered outside AppLayout */}
      <Route path="/editor" component={Editor} />
      <Route path="/projects/:id/editor" component={Editor} />

      {/* App shell with sidebar */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/new" component={NewProject} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/ai" component={AiHub} />
            <Route path="/colors" component={Colors} />
            <Route path="/mockups" component={Mockups} />
            <Route path="/print" component={Print} />
            <Route path="/tech-packs" component={TechPacks} />
            <Route path="/manufacturing" component={Manufacturing} />
            <Route path="/collections" component={Collections} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;