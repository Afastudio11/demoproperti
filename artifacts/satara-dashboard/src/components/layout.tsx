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
  Map,
  Compass,
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
  { name: "Potensi Ekspansi", path: "/ekspansi", icon: Compass },
  { name: "SLIS — Riset Wilayah", path: "/slis", icon: Map },
  { name: "Settings", path: "/settings", icon: Settings },
];

const perencanaanSubNav = [
  { name: "Command Center", path: "/perencanaan", icon: LayoutDashboard },
  { name: "Analisis Pasar", path: "/perencanaan/pasar", icon: TrendingUp },
  { name: "Analisis Lahan", path: "/perencanaan/lahan", icon: Map },
  { name: "Produk", path: "/perencanaan/produk", icon: Package },
  { name: "Feasibility", path: "/perencanaan/feasibility", icon: Calculator },
  { name: "Timeline SPTIS", path: "/perencanaan/timeline", icon: Calendar },
  { name: "Cashflow & KPP", path: "/perencanaan/cashflow", icon: DollarSign },
  { name: "SDM", path: "/perencanaan/sdm", icon: Users },
  { name: "Land Bank", path: "/perencanaan/landbank", icon: Building2 },
];

const produksiSubNav = [
  { name: "Command Center", path: "/produksi", icon: LayoutDashboard },
  { name: "Progress Proyek", path: "/produksi/progress/proyek", icon: BarChart3 },
  { name: "Progress Tahap", path: "/produksi/progress/tahap", icon: Layers },
  { name: "Progress Unit", path: "/produksi/progress/unit", icon: CheckSquare },
  { name: "Fasum Progress", path: "/produksi/fasum", icon: Building2 },
  { name: "Kontrak Subkon", path: "/produksi/subkon/kontrak", icon: FileCheck },
  { name: "Termin Bayar", path: "/produksi/subkon/termin", icon: DollarSign },
  { name: "Approval", path: "/produksi/subkon/approval", icon: ShieldCheck },
  { name: "Stok Material", path: "/produksi/material/stok", icon: Package },
  { name: "Input Masuk", path: "/produksi/material/masuk", icon: Truck },
  { name: "Input Keluar", path: "/produksi/material/keluar", icon: Wrench },
  { name: "QC Checklist", path: "/produksi/qc/checklist", icon: Shield },
  { name: "Rework", path: "/produksi/qc/rework", icon: AlertTriangle },
  { name: "Ready Akad", path: "/produksi/ready-akad", icon: Key },
  { name: "Analitik", path: "/produksi/analitik/velocity", icon: TrendingUp },
  { name: "Health Score", path: "/produksi/health", icon: Activity },
];

function DashboardSidebar() {
  const [location] = useLocation();
  const isPerencanaan = location === "/perencanaan" || location.startsWith("/perencanaan/");
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
                const isPerencanaanItem = item.path === "/perencanaan";
                const isProduksiItem = item.path === "/produksi";

                return (
                  <React.Fragment key={item.path}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive && !isPerencanaanItem && !isProduksiItem}
                        className="h-7"
                      >
                        <Link href={item.path}>
                          <item.icon className="size-3.5" />
                          <span className="text-sm">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {isPerencanaanItem && isPerencanaan && (
                      <div className="group-data-[collapsible=icon]:hidden">
                        {perencanaanSubNav.map((sub) => {
                          const isSubActive = location === sub.path;
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
                    )}

                    {isProduksiItem && isProduksi && (
                      <div className="group-data-[collapsible=icon]:hidden">
                        {produksiSubNav.map((sub) => {
                          const isSubActive = location === sub.path;
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
                    )}
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

function DashboardHeader() {
  const [location] = useLocation();
  const currentNav = navItems.find(
    (n) => n.path === location || (n.path !== "/" && location.startsWith(n.path))
  );

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card sticky top-0 z-10 w-full">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2" />
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          {currentNav && <currentNav.icon className="size-4" />}
          <span className="text-sm font-medium">{currentNav?.name ?? "Dashboard"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 hidden sm:flex">
          <Search className="size-3.5" />
          <span className="text-sm">Cari</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-7">
          <Bell className="size-4" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs bg-foreground text-background">AD</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Pengaturan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">Keluar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col bg-background h-full w-full">
          <DashboardHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
