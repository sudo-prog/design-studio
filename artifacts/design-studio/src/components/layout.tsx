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
  Images,
  Plus,
  Settings,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
  { title: "Assets", url: "/assets", icon: Images },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible, mobile drawer */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 flex flex-col h-dvh w-64 border-r border-border bg-background transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-auto lg:flex-shrink-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile header with close */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight" onClick={() => setMobileMenuOpen(false)}>
            <span className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">
              D
            </span>
            DESIGN.Studio
          </Link>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Desktop header - hidden on mobile since mobile has its own header */}
        <div className="h-16 hidden lg:flex items-center px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">
              D
            </span>
            DESIGN.Studio
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace
            </div>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                    location === item.url || (item.url !== "/" && location.startsWith(item.url))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-border p-4 space-y-2">
          <Button asChild className="w-full justify-start gap-2" variant="outline">
            <Link href="/projects/new" onClick={() => setMobileMenuOpen(false)}>
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </Button>
          <Button asChild className="w-full justify-start gap-2" variant="ghost">
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-3 md:px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-3 w-10 h-10 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          {/* Hide the header nav items on desktop since sidebar is always visible */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto md:overflow-visible lg:hidden">
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <Link
                key={item.title}
                href={item.url}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                  location === item.url || (item.url !== "/" && location.startsWith(item.url))
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </Link>
            ))}
            {location.startsWith("/manufacturing") || location.startsWith("/tech-packs") || location.startsWith("/collections") ? (
              <span className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
                {NAV_ITEMS.find(n => location.startsWith(n.url) && n.url !== "/" && n.url !== "/projects")?.icon && (() => {
                  const activeNav = NAV_ITEMS.find(n => location.startsWith(n.url) && n.url !== "/" && n.url !== "/projects");
                  if (!activeNav) return null;
                  const Icon = activeNav.icon;
                  return <Icon className="w-4 h-4" />;
                })()}
                <span className="hidden sm:inline">{NAV_ITEMS.find(n => location.startsWith(n.url) && n.url !== "/" && n.url !== "/projects")?.title}</span>
              </span>
            ) : null}
          </div>
          <div className="flex-1 hidden lg:block" />
        </header>
        <div className="flex-1 overflow-auto p-3 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
