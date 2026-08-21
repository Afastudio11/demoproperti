import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Building2, MapPin, Calculator, FileCheck2,
  Users, HardHat, Settings, ChevronsUpDown, ChevronDown, ChevronRight,
  Shield, ShieldCheck, UserCog, Megaphone, Landmark, LogOut,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Module key → nav item definition ────────────────────────────────────────
const navItems = [
  { moduleKey: "executive_overview", name: "Executive Overview", path: "/teamwork", icon: LayoutDashboard },
  { moduleKey: "perencanaan", name: "Perencanaan", path: "/perencanaan", icon: Calculator },
  { moduleKey: "projects", name: "Daftar Proyek", path: "/projects", icon: Building2 },
  { moduleKey: "legal", name: "Legal & Perizinan", path: "/legal", icon: ShieldCheck },
  { moduleKey: "marketing", name: "Marketing", path: "/marketing", icon: Megaphone },
  { moduleKey: "administrasi", name: "Administrasi KPR", path: "/administrasi", icon: FileCheck2 },
  { moduleKey: "produksi", name: "Produksi", path: "/produksi", icon: HardHat },
  { moduleKey: "finance", name: "Finance & Accounting", path: "/finance", icon: Landmark },
  { moduleKey: "branding", name: "Branding", path: "/branding", icon: Megaphone },
  { moduleKey: "hr", name: "Human Resource", path: "/hr", icon: UserCog },
  { moduleKey: "settings", name: "Settings", path: "/settings", icon: Settings },
];

type SubNavItem = { type: "link"; name: string; path: string } | { type: "group"; label: string };

const financeSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/finance" },
  { type: "link", name: "Upload Center", path: "/finance/upload" },
  { type: "group", label: "Kas & Proyek" },
  { type: "link", name: "Cashflow Aktual", path: "/finance/cashflow" },
  { type: "link", name: "Keuangan Proyek", path: "/finance/proyek" },
  { type: "link", name: "Realisasi vs RAB", path: "/finance/rab" },
  { type: "group", label: "Kewajiban & Tagihan" },
  { type: "link", name: "Hutang", path: "/finance/hutang-records" },
  { type: "link", name: "Kredit & Investment", path: "/finance/hutang" },
  { type: "link", name: "Piutang", path: "/finance/piutang" },
  { type: "link", name: "Approval Subkon", path: "/finance/approval" },
  { type: "link", name: "Akad Cair", path: "/finance/akad-cair" },
  { type: "group", label: "Analitik Keuangan" },
  { type: "link", name: "Profitabilitas", path: "/finance/profitabilitas" },
  { type: "link", name: "Forecast Cashflow", path: "/finance/forecast" },
  { type: "link", name: "Accounting", path: "/finance/accounting" },
];

const hrSubNav: SubNavItem[] = [
  { type: "link", name: "Dashboard SDM", path: "/hr" },
  { type: "group", label: "Data Kehadiran" },
  { type: "link", name: "Absensi", path: "/hr/absensi" },
  { type: "link", name: "Lembur & Keterlambatan", path: "/hr/lembur" },
  { type: "link", name: "Masalah Individu", path: "/hr/masalah" },
  { type: "group", label: "KPI & Performa" },
  { type: "link", name: "Input Realisasi", path: "/hr/kpi/input" },
  { type: "link", name: "Performa Karyawan", path: "/hr/performance" },
  { type: "link", name: "Definisi KPI", path: "/hr/kpi/definisi" },
  { type: "group", label: "Organisasi" },
  { type: "link", name: "Data Karyawan", path: "/hr/organisasi" },
  { type: "link", name: "Rekrutmen", path: "/hr/rekrutmen" },
  { type: "link", name: "SOP", path: "/hr/sop" },
  { type: "link", name: "Payroll & Kompensasi", path: "/hr/kompensasi" },
  { type: "group", label: "Pengembangan" },
  { type: "link", name: "Kompetensi", path: "/hr/kompetensi" },
  { type: "link", name: "Pelatihan", path: "/hr/training" },
  { type: "link", name: "Jalur Karir", path: "/hr/karir" },
  { type: "group", label: "Analitik & Strategi" },
  { type: "link", name: "Produktivitas", path: "/hr/produktivitas" },
  { type: "link", name: "Beban Kerja", path: "/hr/workload" },
  { type: "link", name: "Kebutuhan Ekspansi", path: "/hr/ekspansi" },
  { type: "link", name: "Peta Talent", path: "/hr/talent-map" },
  { type: "link", name: "Risiko Resign", path: "/hr/flight-risk" },
  { type: "link", name: "Skor SDM", path: "/hr/hc-score" },
];

const brandingSubNav: SubNavItem[] = [
  { type: "link", name: "Dashboard Branding", path: "/branding" },
  { type: "group", label: "Content Management" },
  { type: "link", name: "Kalender Konten", path: "/branding/konten/kalender" },
  { type: "link", name: "Production Tracker", path: "/branding/konten/produksi" },
  { type: "link", name: "Tambah Konten", path: "/branding/konten/new" },
  { type: "link", name: "Semua Konten", path: "/branding/konten" },
  { type: "group", label: "Performa" },
  { type: "link", name: "Social Media Performance", path: "/branding/sosmed" },
  { type: "link", name: "Content Performance", path: "/branding/performa-konten" },
  { type: "group", label: "Brand Identity" },
  { type: "link", name: "Personal Branding Founder", path: "/branding/founder" },
  { type: "link", name: "Corporate Branding", path: "/branding/korporat" },
  { type: "link", name: "Project Branding Score", path: "/branding/proyek" },
  { type: "group", label: "Analitik" },
  { type: "link", name: "Public Relations", path: "/branding/pr" },
  { type: "link", name: "Brand Sentiment", path: "/branding/sentimen" },
  { type: "link", name: "Content ROI", path: "/branding/roi" },
  { type: "link", name: "Trust Score", path: "/branding/trust" },
  { type: "link", name: "Brand Health Score", path: "/branding/health" },
];

const perencanaanSubNav: SubNavItem[] = [
  { type: "group", label: "Flow Perencanaan" },
  { type: "link", name: "Analisis Pasar", path: "/perencanaan/pasar" },
  { type: "link", name: "Analisis Lahan & Siteplan", path: "/perencanaan/lahan" },
  { type: "link", name: "Rencana Tahapan", path: "/perencanaan/tahapan" },
  { type: "link", name: "Feasibility", path: "/perencanaan/feasibility" },
  { type: "link", name: "Rencana Cashflow & KPP", path: "/perencanaan/cashflow" },
  { type: "link", name: "Timeline SPTIS", path: "/perencanaan/timeline" },
  { type: "link", name: "SDM / Sumber Daya", path: "/perencanaan/sdm" },
  { type: "link", name: "Early Warning", path: "/perencanaan/timeline/warning" },
  { type: "link", name: "Land Bank", path: "/perencanaan/landbank" },
  { type: "link", name: "Kesiapan Ekspansi", path: "/perencanaan/ekspansi/kesiapan" },
  { type: "link", name: "Skenario Ekspansi", path: "/perencanaan/ekspansi/skenario" },
];

const administrasiSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/administrasi" },
  { type: "group", label: "Pipeline KPR" },
  { type: "link", name: "Daftar Customer", path: "/administrasi/customer" },
  { type: "group", label: "Analitik & Monitoring" },
  { type: "link", name: "Bank Performance", path: "/administrasi/bank-performance" },
  { type: "link", name: "Aging Pipeline", path: "/administrasi/aging" },
  { type: "link", name: "Target & Realisasi", path: "/administrasi/target" },
  { type: "link", name: "Komplain", path: "/administrasi/komplain" },
  { type: "group", label: "Dokumen & Import" },
  { type: "link", name: "Import Data Excel", path: "/administrasi/import" },
];

const legalSubNav: SubNavItem[] = [
  { type: "link", name: "Dashboard Legal", path: "/legal" },
  { type: "link", name: "Perizinan", path: "/legal/permit" },
  { type: "link", name: "Legalitas Lahan", path: "/legal/lahan" },
  { type: "link", name: "Pemecahan SHM", path: "/legal/shm" },
  { type: "link", name: "Isu Legal", path: "/legal/issue" },
  { type: "link", name: "Arsip Dokumen", path: "/legal/arsip" },
];

const marketingSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/marketing" },
  { type: "group", label: "Manajemen Lead" },
  { type: "link", name: "Daftar Lead", path: "/marketing/lead" },
  { type: "group", label: "Marketing" },
  { type: "link", name: "Campaign Digital", path: "/marketing/campaign" },
  { type: "link", name: "Performa Sales", path: "/marketing/sales" },
  { type: "group", label: "Analitik" },
  { type: "link", name: "Absorpsi Proyek", path: "/marketing/absorption" },
  { type: "link", name: "Stok & Coverage", path: "/marketing/stock" },
  { type: "link", name: "Demand Forecast", path: "/marketing/forecast" },
  { type: "link", name: "Demand Score", path: "/marketing/demand-score" },
  { type: "link", name: "Kompetitor", path: "/marketing/kompetitor" },
  { type: "link", name: "Skor Kesehatan", path: "/marketing/health" },
];

const produksiSubNav: SubNavItem[] = [
  { type: "link", name: "Command Center", path: "/produksi" },
  { type: "group", label: "Baseline dari Perencanaan" },
  { type: "link", name: "Progress Proyek", path: "/produksi/progress/proyek" },
  { type: "link", name: "Progress Tahap", path: "/produksi/progress/tahap" },
  { type: "link", name: "Progress Unit", path: "/produksi/progress/unit" },
  { type: "group", label: "Subkontraktor" },
  { type: "link", name: "Master Subkon", path: "/produksi/subkon/master" },
  { type: "link", name: "Kontrak Subkon", path: "/produksi/subkon/kontrak" },
  { type: "link", name: "Termin Bayar", path: "/produksi/subkon/termin" },
  { type: "link", name: "Approval", path: "/produksi/subkon/approval" },
  { type: "link", name: "Performa & Konsumsi", path: "/produksi/subkon/performa" },
  { type: "group", label: "Material" },
  { type: "link", name: "Master Material", path: "/produksi/material/master" },
  { type: "link", name: "Master Acuan", path: "/produksi/material/acuan" },
  { type: "link", name: "Stok Material", path: "/produksi/material/stok" },
  { type: "link", name: "Input Masuk", path: "/produksi/material/masuk" },
  { type: "link", name: "Input Keluar", path: "/produksi/material/keluar" },
  { type: "link", name: "Variance", path: "/produksi/material/variance" },
  { type: "group", label: "Pelaksanaan Lapangan" },
  { type: "link", name: "Fasum", path: "/produksi/fasum" },
  { type: "link", name: "QC Checklist", path: "/produksi/qc/checklist" },
  { type: "link", name: "Defect & Garansi", path: "/produksi/qc/defect" },
  { type: "link", name: "Rework", path: "/produksi/qc/rework" },
  { type: "group", label: "Serah Terima" },
  { type: "link", name: "Ready Akad", path: "/produksi/ready-akad" },
  { type: "group", label: "Monitoring" },
  { type: "link", name: "Monitoring Siteplan", path: "/produksi/siteplan" },
  { type: "link", name: "Skor Kesehatan", path: "/produksi/health" },
  { type: "link", name: "Analitik Produksi", path: "/produksi/analitik" },
];

const SUB_NAVS: Record<string, SubNavItem[]> = {
  perencanaan: perencanaanSubNav,
  legal: legalSubNav,
  marketing: marketingSubNav,
  administrasi: administrasiSubNav,
  produksi: produksiSubNav,
  finance: financeSubNav,
  branding: brandingSubNav,
  hr: hrSubNav,
};

function renderSubNav(items: SubNavItem[], location: string) {
  return (
    <div className="group-data-[collapsible=icon]:hidden pl-1 pr-1 py-1 space-y-0.5 transition-all duration-200">
      {items.map((sub, i) => {
        if (sub.type === "group") {
          return (
            <div key={`group-${i}`} className="px-5 pt-2 pb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{sub.label}</span>
            </div>
          );
        }
        const isRootPath = ["/hr", "/finance", "/marketing", "/produksi", "/branding", "/legal", "/administrasi", "/perencanaan"].includes(sub.path);
        const hasMoreSpecificMatch = items.some(item =>
          item.type === "link" &&
          item.path !== sub.path &&
          item.path.startsWith(sub.path + "/") &&
          (location === item.path || location.startsWith(item.path + "/"))
        );
        const isSubActive = location === sub.path || (!isRootPath && location.startsWith(sub.path + "/") && !hasMoreSpecificMatch);
        return (
          <SidebarMenuItem key={sub.path}>
            <SidebarMenuButton asChild isActive={isSubActive} className="h-6 pl-5">
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

function getInitialOpenMenus(currentPath: string): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  if (currentPath.startsWith("/perencanaan") || currentPath === "/slis") state["perencanaan"] = true;
  if (currentPath.startsWith("/legal")) state["legal"] = true;
  if (currentPath.startsWith("/marketing")) state["marketing"] = true;
  if (currentPath.startsWith("/administrasi")) state["administrasi"] = true;
  if (currentPath.startsWith("/produksi")) state["produksi"] = true;
  if (currentPath.startsWith("/finance")) state["finance"] = true;
  if (currentPath.startsWith("/branding")) state["branding"] = true;
  if (currentPath.startsWith("/hr")) state["hr"] = true;
  return state;
}

function DashboardSidebar() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>(() => getInitialOpenMenus(location));

  React.useEffect(() => {
    setOpenMenus(prev => {
      const updated = { ...prev };
      if (location.startsWith("/perencanaan") || location === "/slis") updated["perencanaan"] = true;
      if (location.startsWith("/legal")) updated["legal"] = true;
      if (location.startsWith("/marketing")) updated["marketing"] = true;
      if (location.startsWith("/administrasi")) updated["administrasi"] = true;
      if (location.startsWith("/produksi")) updated["produksi"] = true;
      if (location.startsWith("/finance")) updated["finance"] = true;
      if (location.startsWith("/branding")) updated["branding"] = true;
      if (location.startsWith("/hr")) updated["hr"] = true;
      return updated;
    });
  }, [location]);

  const toggleMenu = (key: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allModuleKeysWithSub = Object.keys(SUB_NAVS);
  const areAllOpen = allModuleKeysWithSub.every(k => openMenus[k]);

  const toggleAll = () => {
    if (areAllOpen) {
      setOpenMenus({});
    } else {
      const allOpen: Record<string, boolean> = {};
      allModuleKeysWithSub.forEach(k => { allOpen[k] = true; });
      setOpenMenus(allOpen);
    }
  };

  const isSuperAdmin = user?.role === "super_admin";
  const allowedModules = user?.allowedModules ?? [];

  // Filter navItems: super admin sees all, admin sees only allowed
  const visibleNavItems = navItems.filter(item =>
    isSuperAdmin || allowedModules.includes(item.moduleKey)
  );

  async function handleLogout() {
    await logout();
  }

  return (
    <Sidebar className="lg:border-r-0!" collapsible="icon">
      <SidebarHeader className="px-2.5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full hover:bg-sidebar-accent rounded-md p-1 -m-1 transition-colors shrink-0">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <Building2 className="size-5" />
              </div>
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">Operations</span>
                <ChevronsUpDown className="size-3 text-muted-foreground" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {user?.role === "super_admin" ? <ShieldCheck className="size-3" /> : <Shield className="size-3" />}
                {user?.role === "super_admin" ? "Super Admin" : "Admin"}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="size-4" />
              <span>Pengaturan</span>
            </DropdownMenuItem>
            {isSuperAdmin && (
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Users className="size-4" />
                <span>Kelola Pengguna</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="px-2.5">
        <SidebarGroup className="p-0">
          <div className="flex items-center justify-between px-2 py-1 mb-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden border-b border-border/40 pb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/70">Menu Navigasi</span>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1 hover:text-foreground text-[10px] font-medium px-2 py-0.5 rounded bg-muted/40 hover:bg-muted transition-colors border border-border/40"
              title={areAllOpen ? "Tutup Semua Sub-menu" : "Buka Semua Sub-menu"}
            >
              {areAllOpen ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
              <span>{areAllOpen ? "Tutup Semua" : "Buka Semua"}</span>
            </button>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const subNav = SUB_NAVS[item.moduleKey];
                const hasSub = Boolean(subNav && subNav.length > 0);
                const isOpen = openMenus[item.moduleKey] ?? false;

                const isActive =
                  location === item.path ||
                  (item.path !== "/" && location.startsWith(item.path)) ||
                  (item.moduleKey === "perencanaan" && (location.startsWith("/perencanaan") || location === "/slis"));

                return (
                  <React.Fragment key={item.path}>
                    <SidebarMenuItem className="relative">
                      <div className="flex items-center w-full group/item rounded-md hover:bg-sidebar-accent/50 transition-colors">
                        <SidebarMenuButton asChild isActive={isActive} className="h-7 flex-1 pr-1">
                          <Link
                            href={item.path}
                            onClick={() => {
                              if (hasSub && !isOpen) {
                                setOpenMenus(prev => ({ ...prev, [item.moduleKey]: true }));
                              }
                            }}
                          >
                            <span className="text-sm font-medium">{item.name}</span>
                          </Link>
                        </SidebarMenuButton>

                        {hasSub && (
                          <button
                            type="button"
                            onClick={(e) => toggleMenu(item.moduleKey, e)}
                            className="size-6 mr-1 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:hidden shrink-0"
                            title={isOpen ? `Tutup menu ${item.name}` : `Buka menu ${item.name}`}
                          >
                            {isOpen ? (
                              <ChevronDown className="size-3.5 transition-transform duration-200 text-foreground/70" />
                            ) : (
                              <ChevronRight className="size-3.5 transition-transform duration-200 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </SidebarMenuItem>

                    {hasSub && isOpen && renderSubNav(subNav, location)}
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2.5 pb-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2.5 rounded-lg border p-3 bg-background">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              {user?.role === "super_admin" ? <ShieldCheck className="size-2.5" /> : <Shield className="size-2.5" />}
              {user?.role === "super_admin" ? "Super Admin" : "Admin"}
            </div>
          </div>
          <button onClick={handleLogout} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Keluar">
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-auto transition-all duration-200">
      <div className="w-full max-w-none p-4 sm:p-5 lg:p-6">
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
