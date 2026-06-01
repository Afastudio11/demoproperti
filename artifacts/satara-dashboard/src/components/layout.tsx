import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, MapPin, Calculator, FileText, Magnet, Users, HardHat, Key, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const nav = [
    { name: "Executive Overview", path: "/", icon: LayoutDashboard },
    { name: "Daftar Proyek", path: "/projects", icon: Building2 },
    { name: "Akuisisi Lahan", path: "/akuisisi", icon: MapPin },
    { name: "Perencanaan", path: "/perencanaan", icon: Calculator },
    { name: "Legal & Perizinan", path: "/legal", icon: FileText },
    { name: "Marketing", path: "/marketing", icon: Magnet },
    { name: "Administrasi KPR", path: "/administrasi", icon: Users },
    { name: "Produksi", path: "/produksi", icon: HardHat },
    { name: "Serah Terima", path: "/serah-terima", icon: Key },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground">
              S
            </div>
            <span className="font-bold text-sidebar-foreground tracking-tight text-lg">Satara Dev.</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-background border-b flex items-center px-6 justify-between">
          <h1 className="text-xl font-semibold">Command Center</h1>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-sidebar-foreground text-xs font-medium">AD</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
