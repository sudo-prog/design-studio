import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Sparkles, 
  Palette, 
  Layers, 
  Printer, 
  FileText, 
  Factory, 
  Library,
  Plus,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderOpen },
  { title: "AI Generation", url: "/ai", icon: Sparkles },
  { title: "Colors", url: "/colors", icon: Palette },
  { title: "Mockups", url: "/mockups", icon: Layers },
  { title: "Print Setup", url: "/print", icon: Printer },
  { title: "Tech Packs", url: "/tech-packs", icon: FileText },
  { title: "Manufacturing", url: "/manufacturing", icon: Factory },
  { title: "Collections", url: "/collections", icon: Library },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <span className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">
                D
              </span>
              DESIGN.Studio
            </Link>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                        tooltip={item.title}
                      >
                        <Link href={item.url} className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4 space-y-2">
            <Button asChild className="w-full justify-start gap-2" variant="outline">
              <Link href="/projects/new">
                <Plus className="w-4 h-4" />
                New Project
              </Link>
            </Button>
            <Button asChild className="w-full justify-start gap-2" variant="ghost">
              <Link href="/settings">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
            <SidebarTrigger className="mr-4 lg:hidden" />
            <div className="flex-1" />
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
