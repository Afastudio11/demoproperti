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
  Users, HardHat, Settings, ChevronsUpDown,
  Shield, ShieldCheck, UserCog, Megaphone, Landmark, LogOut,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Module key → nav item definition ────────────────────────────────────────
const navItems = [
  { moduleKey: "executive_overview", name: "Executive Overview", path: "/teamwork", icon: LayoutDashboard },
  { moduleKey: "projects", name: "Daftar Proyek", path: "/projects", icon: Building2 },
  { moduleKey: "akuisisi", name: "Akuisisi Lahan", path: "/akuisisi", icon: MapPin },
  { moduleKey: "perencanaan", name: "Perencanaan", path: "/perencanaan", icon: Calculator },
  { moduleKey: "legal", name: "Legal & Perizinan", path: "/legal", icon: ShieldCheck },
  { moduleKey: "marketing", name: "Marketing", path: "/marketing", icon: Megaphone },
  { moduleKey: "branding", name: "Branding", path: "/branding", icon: Megaphone },
  { moduleKey: "administrasi", name: "Administrasi KPR", path: "/administrasi", icon: FileCheck2 },
  { moduleKey: "produksi", name: "Produksi", path: "/produksi", icon: HardHat },
  { moduleKey: "hr", name: "Human Resource", path: "/hr", icon: UserCog },
  { moduleKey: "finance", name: "Finance & Accounting", path: "/finance", icon: Landmark },
  { moduleKey: "settings", name: "Settings", path: "/settings", icon: Settings },
];

type SubNavItem = { type: "link"; name: string; path: string } | { type: "group"; label: string };

const financeSubNav: SubNavItem[] = [
  { type: "link", name: "Finance Dashboard", path: "/finance" },
  { type: "link", name: "Upload Center", path: "/finance/upload" },
  { type: "group", label: "Cashflow & Proyek" },
  { type: "link", name: "Cashflow Aktual", path: "/finance/cashflow" },
  { type: "link", name: "Project Finance", path: "/finance/proyek" },
  { type: "link", name: "Realisasi vs RAB", path: "/finance/rab" },
  { type: "group", label: "Kewajiban & Tagihan" },
  { type: "link", name: "Kredit & Investment", path: "/finance/hutang" },
  { type: "link", name: "Piutang Center", path: "/finance/piutang" },
  { type: "link", name: "Approval Subkon", path: "/finance/approval" },
  { type: "link", name: "Akad Cair Tracker", path: "/finance/akad-cair" },
  { type: "group", label: "Analitik Keuangan" },
  { type: "link", name: "Profitability Center", path: "/finance/profitabilitas" },
  { type: "link", name: "Forecast Cashflow", path: "/finance/forecast" },
  { type: "link", name: "Accounting Center", path: "/finance/accounting" },
  { type: "group", label: "Kontrol & Strategi" },
  { type: "link", name: "Audit Center", path: "/finance/audit" },
  { type: "link", name: "Data Quality", path: "/finance/data-quality" },
  { type: "link", name: "Early Warning System", path: "/finance/warning" },
  { type: "link", name: "Analisis Ekspansi", path: "/finance/ekspansi" },
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
  { type: "link", name: "Kompensasi", path: "/hr/kompensasi" },
  { type: "group", label: "Pengembangan" },
  { type: "link", name: "Kompetensi", path: "/hr/kompetensi" },
  { type: "link", name: "Pelatihan", path: "/hr/training" },
  { type: "link", name: "Jalur Karir", path: "/hr/karir" },
  { type: "group", label: "Analitik & Strategi" },
  { type: "link", name: "Produktivitas", path: "/hr/produktivitas" },
  { type: "link", name: "Budaya Kerja", path: "/hr/kultur" },
  { type: "link", name: "Beban Kerja", path: "/hr/workload" },
  { type: "link", name: "Suksesi", path: "/hr/suksesi" },
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

const akuisisiSubNav: SubNavItem[] = [
  { type: "link", name: "Pipeline Prospek", path: "/akuisisi" },
];

const perencanaanSubNav: SubNavItem[] = [
  { type: "group", label: "Riset" },
  { type: "link", name: "Analisis Pasar", path: "/perencanaan/pasar" },
  { type: "link", name: "Analisis Lahan", path: "/perencanaan/lahan" },
  { type: "link", name: "Land Bank", path: "/perencanaan/landbank" },
  { type: "group", label: "Produk & Kelayakan" },
  { type: "link", name: "Produk", path: "/perencanaan/produk" },
  { type: "link", name: "Feasibility", path: "/perencanaan/feasibility" },
  { type: "group", label: "Finansial & Jadwal" },
  { type: "link", name: "Rencana Cashflow & KPP", path: "/perencanaan/cashflow" },
  { type: "link", name: "Timeline SPTIS", path: "/perencanaan/timeline" },
  { type: "link", name: "Early Warning", path: "/perencanaan/timeline/warning" },
  { type: "group", label: "Sumber Daya" },
  { type: "link", name: "SDM", path: "/perencanaan/sdm" },
  { type: "group", label: "Ekspansi" },
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
  { type: "group", label: "Subkontraktor" },
  { type: "link", name: "Kontrak Subkon", path: "/produksi/subkon/kontrak" },
  { type: "link", name: "Approval", path: "/produksi/subkon/approval" },
  { type: "link", name: "Termin Bayar", path: "/produksi/subkon/termin" },
  { type: "link", name: "Performa Subkon", path: "/produksi/subkon/performa" },
  { type: "group", label: "Material" },
  { type: "link", name: "Master Material", path: "/produksi/material/master" },
  { type: "link", name: "Master Acuan", path: "/produksi/material/acuan" },
  { type: "link", name: "Stok Material", path: "/produksi/material/stok" },
  { type: "link", name: "Input Masuk", path: "/produksi/material/masuk" },
  { type: "link", name: "Input Keluar", path: "/produksi/material/keluar" },
  { type: "link", name: "Konsumsi", path: "/produksi/material/konsumsi" },
  { type: "link", name: "Variance", path: "/produksi/material/variance" },
  { type: "link", name: "Forecast Material", path: "/produksi/material/forecast" },
  { type: "group", label: "Progress" },
  { type: "link", name: "Progress Proyek", path: "/produksi/progress/proyek" },
  { type: "link", name: "Progress Tahap", path: "/produksi/progress/tahap" },
  { type: "link", name: "Progress Unit", path: "/produksi/progress/unit" },
  { type: "link", name: "Fasum", path: "/produksi/fasum" },
  { type: "group", label: "Quality Control" },
  { type: "link", name: "QC Checklist", path: "/produksi/qc/checklist" },
  { type: "link", name: "Defect & Garansi", path: "/produksi/qc/defect" },
  { type: "link", name: "Rework", path: "/produksi/qc/rework" },
  { type: "group", label: "Milestone" },
  { type: "link", name: "Ready Akad", path: "/produksi/ready-akad" },
  { type: "link", name: "Skor Kesehatan", path: "/produksi/health" },
  { type: "group", label: "Analitik" },
  { type: "link", name: "Analitik Produksi", path: "/produksi/analitik" },
];

function renderSubNav(items: SubNavItem[], location: string) {
  return (
    <div className="group-data-[collapsible=icon]:hidden">
      {items.map((sub, i) => {
        if (sub.type === "group") {
          return (
            <div key={`group-${i}`} className="px-5 pt-2.5 pb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{sub.label}</span>
            </div>
          );
        }
        const isSubActive = location === sub.path || (sub.path !== "/administrasi" && sub.path !== "/perencanaan" && sub.path !== "/produksi" && sub.path !== "/legal" && location.startsWith(sub.path + "/"));
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

function DashboardSidebar() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const allowedModules = user?.allowedModules ?? [];

  // Filter navItems: super admin sees all, admin sees only allowed
  const visibleNavItems = navItems.filter(item =>
    isSuperAdmin || allowedModules.includes(item.moduleKey)
  );

  const isAkuisisi = location === "/akuisisi" || location.startsWith("/akuisisi/");
  const isPerencanaan = location === "/perencanaan" || location.startsWith("/perencanaan/") || location === "/slis";
  const isLegal = location === "/legal" || location.startsWith("/legal/");
  const isAdministrasi = location === "/administrasi" || location.startsWith("/administrasi/");
  const isProduksi = location === "/produksi" || location.startsWith("/produksi/");
  const isMarketing = location === "/marketing" || location.startsWith("/marketing/");
  const isHR = location === "/hr" || location.startsWith("/hr/");
  const isBranding = location === "/branding" || location.startsWith("/branding/");
  const isFinance = location === "/finance" || location.startsWith("/finance/");

  async function handleLogout() {
    await logout();
  }

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
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isAkuisisiItem = item.path === "/akuisisi";
                const isPerencanaanItem = item.path === "/perencanaan";
                const isLegalItem = item.path === "/legal";
                const isAdministrasiItem = item.path === "/administrasi";
                const isProduksiItem = item.path === "/produksi";
                const isMarketingItem = item.path === "/marketing";
                const isHRItem = item.path === "/hr";
                const isBrandingItem = item.path === "/branding";
                const isFinanceItem = item.path === "/finance";
                const isActive =
                  location === item.path ||
                  (item.path !== "/" && location.startsWith(item.path)) ||
                  (isAkuisisiItem && isAkuisisi) ||
                  (isPerencanaanItem && isPerencanaan) ||
                  (isLegalItem && isLegal) ||
                  (isAdministrasiItem && isAdministrasi) ||
                  (isProduksiItem && isProduksi) ||
                  (isMarketingItem && isMarketing) ||
                  (isHRItem && isHR) ||
                  (isBrandingItem && isBranding) ||
                  (isFinanceItem && isFinance);

                return (
                  <React.Fragment key={item.path}>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive} className="h-7">
                        <Link href={item.path}>
                          <span className="text-sm">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isAkuisisiItem && isAkuisisi && renderSubNav(akuisisiSubNav, location)}
                    {isPerencanaanItem && isPerencanaan && renderSubNav(perencanaanSubNav, location)}
                    {isLegalItem && isLegal && renderSubNav(legalSubNav, location)}
                    {isAdministrasiItem && isAdministrasi && renderSubNav(administrasiSubNav, location)}
                    {isProduksiItem && isProduksi && renderSubNav(produksiSubNav, location)}
                    {isMarketingItem && isMarketing && renderSubNav(marketingSubNav, location)}
                    {isHRItem && isHR && renderSubNav(hrSubNav, location)}
                    {isBrandingItem && isBranding && renderSubNav(brandingSubNav, location)}
                    {isFinanceItem && isFinance && renderSubNav(financeSubNav, location)}
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
