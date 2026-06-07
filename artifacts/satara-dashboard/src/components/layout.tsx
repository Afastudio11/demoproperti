import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Calculator,
  FileText,
  Magnet,
  Users,
  HardHat,
  Key,
  Settings,
  ChevronsUpDown,
  Bell,
  Search,
  BarChart3,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Activity,
  Shield,
  Wrench,
  ShieldCheck,
  Layers,
  FileCheck,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
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

type SubNavItem =
  | { type: "link"; name: string; path: string }
  | { type: "group"; label: string };

const akuisisiSubNav: SubNavItem[] = [
  { type: "link", name: "Pipeline Prospek", path: "/akuisisi" },
  { type: "link", name: "Potensi Ekspansi", path: "/ekspansi" },
];

const perencanaanSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/perencanaan" },
  { type: "group", label: "Riset" },
  { type: "link", name: "Analisis Pasar", path: "/perencanaan/pasar" },
  { type: "link", name: "Analisis Lahan", path: "/perencanaan/lahan" },
  { type: "link", name: "Land Bank", path: "/perencanaan/landbank" },
  { type: "group", label: "Produk & Kelayakan" },
  { type: "link", name: "Produk", path: "/perencanaan/produk" },
  { type: "link", name: "Feasibility", path: "/perencanaan/feasibility" },
  { type: "group", label: "Finansial & Jadwal" },
  { type: "link", name: "Cashflow & KPP", path: "/perencanaan/cashflow" },
  { type: "link", name: "Timeline SPTIS", path: "/perencanaan/timeline" },
  { type: "group", label: "Sumber Daya" },
  { type: "link", name: "SDM", path: "/perencanaan/sdm" },
];

const administrasiSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/administrasi" },
  { type: "group", label: "Pipeline KPR" },
  { type: "link", name: "Daftar Customer", path: "/administrasi/customer" },
  { type: "link", name: "Bank Submission", path: "/administrasi/bank-submission" },
  { type: "link", name: "OTS Tracker", path: "/administrasi/ots" },
  { type: "link", name: "SP3K Tracker", path: "/administrasi/sp3k" },
  { type: "link", name: "Akad Tracker", path: "/administrasi/akad" },
  { type: "link", name: "HT Tracker", path: "/administrasi/ht" },
  { type: "group", label: "Analitik & Monitoring" },
  { type: "link", name: "Bank Performance", path: "/administrasi/bank-performance" },
  { type: "link", name: "Aging Pipeline", path: "/administrasi/aging" },
  { type: "link", name: "Target & Realisasi", path: "/administrasi/target" },
  { type: "link", name: "Komplain", path: "/administrasi/komplain" },
];

const produksiSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/produksi" },
  { type: "group", label: "Subkontraktor" },
  { type: "link", name: "Kontrak Subkon", path: "/produksi/subkon/kontrak" },
  { type: "link", name: "Approval", path: "/produksi/subkon/approval" },
  { type: "link", name: "Termin Bayar", path: "/produksi/subkon/termin" },
  { type: "group", label: "Material" },
  { type: "link", name: "Stok Material", path: "/produksi/material/stok" },
  { type: "link", name: "Input Masuk", path: "/produksi/material/masuk" },
  { type: "link", name: "Input Keluar", path: "/produksi/material/keluar" },
  { type: "group", label: "Progress" },
  { type: "link", name: "Progress Proyek", path: "/produksi/progress/proyek" },
  { type: "link", name: "Progress Tahap", path: "/produksi/progress/tahap" },
  { type: "link", name: "Progress Unit", path: "/produksi/progress/unit" },
  { type: "link", name: "Fasum", path: "/produksi/fasum" },
  { type: "group", label: "Quality Control" },
  { type: "link", name: "QC Checklist", path: "/produksi/qc/checklist" },
  { type: "link", name: "Rework", path: "/produksi/qc/rework" },
  { type: "group", label: "Milestone & Analitik" },
  { type: "link", name: "Ready Akad", path: "/produksi/ready-akad" },
  { type: "link", name: "Health Score", path: "/produksi/health" },
  { type: "link", name: "Analitik", path: "/produksi/analitik/velocity" },
];

function renderSubNav(items: SubNavItem[], location: string) {
  return (
    <div className="group-data-[collapsible=icon]:hidden">
      {items.map((sub, i) => {
        if (sub.type === "group") {
          return (
            <div key={`group-${i}`} className="px-5 pt-2.5 pb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {sub.label}
              </span>
            </div>
          );
        }
        const isSubActive = location === sub.path || (sub.path !== "/administrasi" && sub.path !== "/perencanaan" && sub.path !== "/produksi" && location.startsWith(sub.path + "/"));
        return (
          <SidebarMenuItem key={sub.path}>
            <SidebarMenuButton
              asChild
              isActive={isSubActive}
              className="h-6 pl-5"
            >
              <Link href={sub.path}>
                <span className={`size-1.5 rounded-full shrink-0 ${isSubActive ? "bg-foreground" : "bg-muted-foreground/50"}`} />
                <span className="text-xs">{sub.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </div>
  );
}

function DashboardSidebar() {
  const [location] = useLocation();
  const isAkuisisi = location === "/akuisisi" || location === "/ekspansi" || location.startsWith("/akuisisi/");
  const isPerencanaan = location === "/perencanaan" || location.startsWith("/perencanaan/");
  const isAdministrasi = location === "/administrasi" || location.startsWith("/administrasi/");
  const isProduksi = location === "/produksi" || location.startsWith("/produksi/");

  return (
    <Sidebar className="lg:border-r-0!" collapsible="icon">
      <SidebarHeader className="px-2.5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full hover:bg-sidebar-accent rounded-md p-1 -m-1 transition-colors shrink-0">
              <img src="/satara-logo.png" alt="Satara" className="size-10 object-contain shrink-0" />
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">Satara Dev.</span>
                <ChevronsUpDown className="size-3 text-muted-foreground" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <Settings className="size-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Users className="size-4" />
              <span>Kelola Pengguna</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="px-2.5">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location === item.path ||
                  (item.path !== "/" && location.startsWith(item.path));
                const isAkuisisiItem = item.path === "/akuisisi";
                const isPerencanaanItem = item.path === "/perencanaan";
                const isAdministrasiItem = item.path === "/administrasi";
                const isProduksiItem = item.path === "/produksi";

                return (
                  <React.Fragment key={item.path}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive && !isAkuisisiItem && !isPerencanaanItem && !isAdministrasiItem && !isProduksiItem}
                        className="h-7"
                      >
                        <Link href={item.path}>
                          <item.icon className="size-3.5" />
                          <span className="text-sm">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {isAkuisisiItem && isAkuisisi && renderSubNav(akuisisiSubNav, location)}
                    {isPerencanaanItem && isPerencanaan && renderSubNav(perencanaanSubNav, location)}
                    {isAdministrasiItem && isAdministrasi && renderSubNav(administrasiSubNav, location)}
                    {isProduksiItem && isProduksi && renderSubNav(produksiSubNav, location)}
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2.5 pb-3 group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm bg-background">
          <div className="text-xs font-semibold leading-tight">Satara Development</div>
          <div className="text-[11px] text-muted-foreground">
            Internal Operations Dashboard
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  return (
    <main
      className={cn(
        "flex-1 overflow-auto transition-all duration-200",
        open ? "lg:ml-0" : "lg:ml-0"
      )}
    >
      <div className="p-4 sm:p-5 lg:p-6 max-w-screen-2xl mx-auto">
        {children}
      </div>
    </main>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center gap-2 border-b px-4 py-2.5 shrink-0">
            <SidebarTrigger className="size-7" />
          </header>
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </SidebarProvider>
  );
}
