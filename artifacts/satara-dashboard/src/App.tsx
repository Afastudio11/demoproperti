import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, type AuthUser } from "@/contexts/auth-context";
import Login from "@/pages/login";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";
import PublicPaymentProof from "@/pages/public-payment-proof";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Akuisisi from "@/pages/akuisisi";
import Perencanaan from "@/pages/perencanaan";
import PasarPage from "@/pages/perencanaan/pasar";
import LahanPage from "@/pages/perencanaan/lahan";
import ProdukPage from "@/pages/perencanaan/produk";
import TahapanPage from "@/pages/perencanaan/tahapan";
import FeasibilityPage from "@/pages/perencanaan/feasibility";
import TimelinePage from "@/pages/perencanaan/timeline";
import CashflowPage from "@/pages/perencanaan/cashflow";
import SDMPage from "@/pages/perencanaan/sdm";
import LandBankPage from "@/pages/perencanaan/landbank";
import Legal from "@/pages/legal/index";
import LegalPermit from "@/pages/legal/permit";
import LegalLahan from "@/pages/legal/lahan";
import LegalShm from "@/pages/legal/shm";
import LegalIssue from "@/pages/legal/issue";
import LegalArsip from "@/pages/legal/arsip";
import Marketing from "@/pages/marketing";
import MarketingLead from "@/pages/marketing/lead";
import MarketingLeadNew from "@/pages/marketing/lead-new";
import MarketingLeadEdit from "@/pages/marketing/lead-edit";
import MarketingLeadDetail from "@/pages/marketing/lead-detail";
import MarketingCampaign from "@/pages/marketing/campaign";
import MarketingSales from "@/pages/marketing/sales";
import MarketingAbsorption from "@/pages/marketing/absorption";
import MarketingStock from "@/pages/marketing/stock";
import MarketingForecast from "@/pages/marketing/forecast";
import MarketingDemandScore from "@/pages/marketing/demand-score";
import MarketingKompetitor from "@/pages/marketing/kompetitor";
import MarketingHealth from "@/pages/marketing/health";
import AdminDokumen from "@/pages/administrasi/dokumen";
import AdminImport from "@/pages/administrasi/import";
import PerencanaanKppSimulasi from "@/pages/perencanaan/kpp-simulasi";
import PerencanaanEkspansiKesiapan from "@/pages/perencanaan/ekspansi-kesiapan";
import PerencanaanEkspansiSkenario from "@/pages/perencanaan/ekspansi-skenario";
import PerencanaanTimelineWarning from "@/pages/perencanaan/timeline-warning";
import Administrasi from "@/pages/administrasi";
import CustomerList from "@/pages/administrasi/customer";
import CustomerNew from "@/pages/administrasi/customer-new";
import CustomerEdit from "@/pages/administrasi/customer-edit";
import CustomerDetail from "@/pages/administrasi/customer-detail";
import BankSubmission from "@/pages/administrasi/bank-submission";
import OtsPage from "@/pages/administrasi/ots";
import Sp3kPage from "@/pages/administrasi/sp3k";
import AkadPage from "@/pages/administrasi/akad";
import HtPage from "@/pages/administrasi/ht";
import BankPerformancePage from "@/pages/administrasi/bank-performance";
import AgingPage from "@/pages/administrasi/aging";
import TargetPage from "@/pages/administrasi/target";
import KomplainPage from "@/pages/administrasi/komplain";
import Produksi from "@/pages/produksi";
import Settings from "@/pages/settings";
import SLIS from "@/pages/slis";
import Layout from "@/components/layout";
import ProgressProyek from "@/pages/produksi/progress/proyek";
import ProgressTahap from "@/pages/produksi/progress/tahap";
import ProgressUnit from "@/pages/produksi/progress/unit";
import FasumPage from "@/pages/produksi/fasum";
import SubkonMasterPage from "@/pages/produksi/subkon/master";
import SubkonKontrak from "@/pages/produksi/subkon/kontrak";
import SubkonTermin from "@/pages/produksi/subkon/termin";
import SubkonApproval from "@/pages/produksi/subkon/approval";
import SubkonPerforma from "@/pages/produksi/subkon/performa";
import MaterialMaster from "@/pages/produksi/material/master";
import MaterialAcuan from "@/pages/produksi/material/acuan";
import MaterialMasuk from "@/pages/produksi/material/masuk";
import MaterialKeluar from "@/pages/produksi/material/keluar";
import MaterialStok from "@/pages/produksi/material/stok";
import MaterialVariance from "@/pages/produksi/material/variance";
import QcChecklist from "@/pages/produksi/qc/checklist";
import QcRework from "@/pages/produksi/qc/rework";
import QcDefect from "@/pages/produksi/qc/defect";
import ReadyAkad from "@/pages/produksi/ready-akad";
import AnalitikVelocity from "@/pages/produksi/analitik/velocity";
import AnalitikBaseline from "@/pages/produksi/analitik/baseline";
import AnalitikCostToComplete from "@/pages/produksi/analitik/cost-to-complete";
import AnalitikCashflowImpact from "@/pages/produksi/analitik/cashflow-impact";
import AnalitikProduktivitas from "@/pages/produksi/analitik/produktivitas";
import AnalitikEligibilitas from "@/pages/produksi/analitik/eligibilitas";
import AnalitikForecast from "@/pages/produksi/analitik/forecast";
import AnalitikProduksi from "@/pages/produksi/analitik";
import ProduksiHealth from "@/pages/produksi/health";
import HRDashboard from "@/pages/hr/index";
import HROrganisasi from "@/pages/hr/organisasi";
import HRRekrutmen from "@/pages/hr/rekrutmen";
import HRKpiDefinisi from "@/pages/hr/kpi/definisi";
import HRKpiInput from "@/pages/hr/kpi/input";
import HRPerformance from "@/pages/hr/performance";
import HRKompetensi from "@/pages/hr/kompetensi";
import HRTraining from "@/pages/hr/training";
import HRKarir from "@/pages/hr/karir";
import HRKompensasi from "@/pages/hr/kompensasi";
import HRProduktivitas from "@/pages/hr/produktivitas";
import HRSuksesi from "@/pages/hr/suksesi";
import HRKultur from "@/pages/hr/kultur";
import HRWorkload from "@/pages/hr/workload";
import HREkspansi from "@/pages/hr/ekspansi";
import HRTalentMap from "@/pages/hr/talent-map";
import HRFlightRisk from "@/pages/hr/flight-risk";
import HRHcScore from "@/pages/hr/hc-score";
import HRAbsensi from "@/pages/hr/absensi";
import HRLembur from "@/pages/hr/lembur";
import HRMasalah from "@/pages/hr/masalah";
import BrandingDashboard from "@/pages/branding/index";
import BrandingKorporat from "@/pages/branding/korporat";
import BrandingFounder from "@/pages/branding/founder";
import BrandingKonten from "@/pages/branding/konten/index";
import BrandingKalender from "@/pages/branding/konten/kalender";
import BrandingProduksi from "@/pages/branding/konten/produksi";
import BrandingKontenNew from "@/pages/branding/konten/new";
import BrandingSosmed from "@/pages/branding/sosmed";
import BrandingPerformaKonten from "@/pages/branding/performa-konten";
import BrandingProyek from "@/pages/branding/proyek";
import BrandingPR from "@/pages/branding/pr";
import BrandingSentimen from "@/pages/branding/sentimen";
import BrandingROI from "@/pages/branding/roi";
import BrandingTrust from "@/pages/branding/trust";
import BrandingHealth from "@/pages/branding/health";
import FinanceDashboard from "@/pages/finance/index";
import FinanceUpload from "@/pages/finance/upload";
import FinanceCashflow from "@/pages/finance/cashflow";
import FinanceProyek from "@/pages/finance/proyek";
import FinanceKpp from "@/pages/finance/kpp";
import FinanceHutang from "@/pages/finance/hutang";
import FinanceHutangRecords from "@/pages/finance/hutang-records";
import FinanceApproval from "@/pages/finance/approval";
import FinanceAkadCair from "@/pages/finance/akad-cair";
import FinancePiutang from "@/pages/finance/piutang";
import FinanceRab from "@/pages/finance/rab";
import FinanceProfitabilitas from "@/pages/finance/profitabilitas";
import FinanceForecast from "@/pages/finance/forecast";
import FinanceAccounting from "@/pages/finance/accounting";
import FinanceAudit from "@/pages/finance/audit";
import FinanceWarning from "@/pages/finance/warning";
import FinanceEkspansi from "@/pages/finance/ekspansi";
import FinanceDataQuality from "@/pages/finance/data-quality";

const queryClient = new QueryClient();

const MODULE_PATH_RULES: Array<{ module: string; matches: (path: string) => boolean }> = [
  { module: "executive_overview", matches: (path) => path === "/executive" || path === "/teamwork" },
  { module: "projects", matches: (path) => path === "/projects" || path.startsWith("/projects/") },
  { module: "akuisisi", matches: (path) => path === "/akuisisi" || path.startsWith("/akuisisi/") },
  { module: "perencanaan", matches: (path) => path === "/perencanaan" || path.startsWith("/perencanaan/") || path === "/slis" },
  { module: "legal", matches: (path) => path === "/legal" || path.startsWith("/legal/") },
  { module: "branding", matches: (path) => path === "/marketing/branding" },
  { module: "marketing", matches: (path) => path === "/marketing" || path.startsWith("/marketing/") },
  { module: "branding", matches: (path) => path === "/branding" || path.startsWith("/branding/") },
  { module: "administrasi", matches: (path) => path === "/administrasi" || path.startsWith("/administrasi/") },
  { module: "produksi", matches: (path) => path === "/produksi" || path.startsWith("/produksi/") },
  { module: "hr", matches: (path) => path === "/hr" || path.startsWith("/hr/") },
  { module: "finance", matches: (path) => path === "/finance" || path.startsWith("/finance/") },
];

function hasPageAccess(path: string, user: AuthUser) {
  if (user.role === "super_admin") return true;
  if (path === "/settings") return true;
  const rule = MODULE_PATH_RULES.find((item) => item.matches(path));
  return rule ? user.allowedModules.includes(rule.module) : true;
}

function AccessDenied() {
  return (
    <Layout>
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Akses ditolak</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Akun ini belum diberi akses ke modul tersebut. Hubungi super admin untuk mengubah akses modul.
        </p>
      </div>
    </Layout>
  );
}

function ExecutiveRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/teamwork");
  }, [setLocation]);

  return null;
}

function MaterialForecastRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/produksi/material/stok");
  }, [setLocation]);

  return null;
}

function MaterialKonsumsiRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/produksi/subkon/performa");
  }, [setLocation]);

  return null;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/satara-logo.png" alt="Satara" className="size-10 object-contain opacity-50" />
          <div className="text-sm text-muted-foreground">Memuat...</div>
        </div>
      </div>
    );
  }

  if (location === "/") {
    return <LandingPage />;
  }

  if (location === "/executive") {
    return <ExecutiveRedirect />;
  }

  if (location.startsWith("/public/payment-proof/")) {
    return <PublicPaymentProof />;
  }

  if (!user) {
    return <Login />;
  }

  if (!hasPageAccess(location, user)) {
    return <AccessDenied />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/executive" component={ExecutiveRedirect} />
        <Route path="/teamwork" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/akuisisi" component={Akuisisi} />
        <Route path="/perencanaan" component={Perencanaan} />
        <Route path="/perencanaan/pasar" component={PasarPage} />
        <Route path="/perencanaan/lahan" component={LahanPage} />
        <Route path="/perencanaan/produk" component={ProdukPage} />
        <Route path="/perencanaan/tahapan" component={TahapanPage} />
        <Route path="/perencanaan/feasibility" component={FeasibilityPage} />
        <Route path="/perencanaan/timeline" component={TimelinePage} />
        <Route path="/perencanaan/cashflow" component={CashflowPage} />
        <Route path="/perencanaan/sdm" component={SDMPage} />
        <Route path="/perencanaan/landbank" component={LandBankPage} />
        <Route path="/perencanaan/kpp/:id/simulasi" component={PerencanaanKppSimulasi} />
        <Route path="/perencanaan/ekspansi/kesiapan" component={PerencanaanEkspansiKesiapan} />
        <Route path="/perencanaan/ekspansi/skenario" component={PerencanaanEkspansiSkenario} />
        <Route path="/perencanaan/timeline/warning" component={PerencanaanTimelineWarning} />
        <Route path="/legal" component={Legal} />
        <Route path="/legal/permit" component={LegalPermit} />
        <Route path="/legal/lahan" component={LegalLahan} />
        <Route path="/legal/shm" component={LegalShm} />
        <Route path="/legal/issue" component={LegalIssue} />
        <Route path="/legal/arsip" component={LegalArsip} />
        <Route path="/marketing" component={Marketing} />
        <Route path="/marketing/lead/new" component={MarketingLeadNew} />
        <Route path="/marketing/lead/:id/edit" component={MarketingLeadEdit} />
        <Route path="/marketing/lead/:id" component={MarketingLeadDetail} />
        <Route path="/marketing/lead" component={MarketingLead} />
        <Route path="/marketing/branding" component={BrandingDashboard} />
        <Route path="/marketing/campaign" component={MarketingCampaign} />
        <Route path="/marketing/sales" component={MarketingSales} />
        <Route path="/marketing/absorption" component={MarketingAbsorption} />
        <Route path="/marketing/stock" component={MarketingStock} />
        <Route path="/marketing/forecast" component={MarketingForecast} />
        <Route path="/marketing/demand-score" component={MarketingDemandScore} />
        <Route path="/marketing/kompetitor" component={MarketingKompetitor} />
        <Route path="/marketing/health" component={MarketingHealth} />
        <Route path="/administrasi" component={Administrasi} />
        <Route path="/administrasi/customer/new" component={CustomerNew} />
        <Route path="/administrasi/customer/:id/edit" component={CustomerEdit} />
        <Route path="/administrasi/customer/:id" component={CustomerDetail} />
        <Route path="/administrasi/customer" component={CustomerList} />
        <Route path="/administrasi/bank-submission" component={BankSubmission} />
        <Route path="/administrasi/ots" component={OtsPage} />
        <Route path="/administrasi/sp3k" component={Sp3kPage} />
        <Route path="/administrasi/akad" component={AkadPage} />
        <Route path="/administrasi/ht" component={HtPage} />
        <Route path="/administrasi/bank-performance" component={BankPerformancePage} />
        <Route path="/administrasi/aging" component={AgingPage} />
        <Route path="/administrasi/target" component={TargetPage} />
        <Route path="/administrasi/komplain" component={KomplainPage} />
        <Route path="/administrasi/dokumen/:customerId" component={AdminDokumen} />
        <Route path="/administrasi/import" component={AdminImport} />
        <Route path="/produksi" component={Produksi} />
        <Route path="/produksi/progress/proyek" component={ProgressProyek} />
        <Route path="/produksi/progress/tahap" component={ProgressTahap} />
        <Route path="/produksi/progress/unit" component={ProgressUnit} />
        <Route path="/produksi/fasum" component={FasumPage} />
        <Route path="/produksi/subkon/master" component={SubkonMasterPage} />
        <Route path="/produksi/subkon/kontrak" component={SubkonKontrak} />
        <Route path="/produksi/subkon/termin" component={SubkonTermin} />
        <Route path="/produksi/subkon/approval" component={SubkonApproval} />
        <Route path="/produksi/subkon/performa" component={SubkonPerforma} />
        <Route path="/produksi/material/master" component={MaterialMaster} />
        <Route path="/produksi/material/acuan" component={MaterialAcuan} />
        <Route path="/produksi/material/masuk" component={MaterialMasuk} />
        <Route path="/produksi/material/keluar" component={MaterialKeluar} />
        <Route path="/produksi/material/stok" component={MaterialStok} />
        <Route path="/produksi/material/konsumsi" component={MaterialKonsumsiRedirect} />
        <Route path="/produksi/material/variance" component={MaterialVariance} />
        <Route path="/produksi/material/forecast" component={MaterialForecastRedirect} />
        <Route path="/produksi/qc/checklist" component={QcChecklist} />
        <Route path="/produksi/qc/rework" component={QcRework} />
        <Route path="/produksi/qc/defect" component={QcDefect} />
        <Route path="/produksi/ready-akad" component={ReadyAkad} />
        <Route path="/produksi/analitik" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/velocity" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/baseline" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/cost-to-complete" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/cashflow-impact" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/produktivitas" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/eligibilitas" component={AnalitikProduksi} />
        <Route path="/produksi/analitik/forecast" component={AnalitikProduksi} />
        <Route path="/produksi/health" component={ProduksiHealth} />
        <Route path="/settings" component={Settings} />
        <Route path="/slis" component={SLIS} />
        <Route path="/hr" component={HRDashboard} />
        <Route path="/hr/organisasi" component={HROrganisasi} />
        <Route path="/hr/rekrutmen" component={HRRekrutmen} />
        <Route path="/hr/kpi/definisi" component={HRKpiDefinisi} />
        <Route path="/hr/kpi/input" component={HRKpiInput} />
        <Route path="/hr/performance" component={HRPerformance} />
        <Route path="/hr/kompetensi" component={HRKompetensi} />
        <Route path="/hr/training" component={HRTraining} />
        <Route path="/hr/karir" component={HRKarir} />
        <Route path="/hr/kompensasi" component={HRKompensasi} />
        <Route path="/hr/produktivitas" component={HRProduktivitas} />
        <Route path="/hr/suksesi" component={HRSuksesi} />
        <Route path="/hr/kultur" component={HRKultur} />
        <Route path="/hr/workload" component={HRWorkload} />
        <Route path="/hr/ekspansi" component={HREkspansi} />
        <Route path="/hr/talent-map" component={HRTalentMap} />
        <Route path="/hr/flight-risk" component={HRFlightRisk} />
        <Route path="/hr/hc-score" component={HRHcScore} />
        <Route path="/hr/absensi" component={HRAbsensi} />
        <Route path="/hr/lembur" component={HRLembur} />
        <Route path="/hr/masalah" component={HRMasalah} />
        <Route path="/branding" component={BrandingDashboard} />
        <Route path="/branding/korporat" component={BrandingKorporat} />
        <Route path="/branding/founder" component={BrandingFounder} />
        <Route path="/branding/konten/kalender" component={BrandingKalender} />
        <Route path="/branding/konten/produksi" component={BrandingProduksi} />
        <Route path="/branding/konten/new" component={BrandingKontenNew} />
        <Route path="/branding/konten" component={BrandingKonten} />
        <Route path="/branding/sosmed" component={BrandingSosmed} />
        <Route path="/branding/performa-konten" component={BrandingPerformaKonten} />
        <Route path="/branding/proyek" component={BrandingProyek} />
        <Route path="/branding/pr" component={BrandingPR} />
        <Route path="/branding/sentimen" component={BrandingSentimen} />
        <Route path="/branding/roi" component={BrandingROI} />
        <Route path="/branding/trust" component={BrandingTrust} />
        <Route path="/branding/health" component={BrandingHealth} />
        <Route path="/finance" component={FinanceDashboard} />
        <Route path="/finance/upload" component={FinanceUpload} />
        <Route path="/finance/cashflow" component={FinanceCashflow} />
        <Route path="/finance/proyek" component={FinanceProyek} />
        <Route path="/finance/kpp" component={FinanceKpp} />
        <Route path="/finance/hutang" component={FinanceHutang} />
        <Route path="/finance/hutang-records" component={FinanceHutangRecords} />
        <Route path="/finance/approval" component={FinanceApproval} />
        <Route path="/finance/akad-cair" component={FinanceAkadCair} />
        <Route path="/finance/piutang" component={FinancePiutang} />
        <Route path="/finance/rab" component={FinanceRab} />
        <Route path="/finance/profitabilitas" component={FinanceProfitabilitas} />
        <Route path="/finance/forecast" component={FinanceForecast} />
        <Route path="/finance/accounting" component={FinanceAccounting} />
        <Route path="/finance/audit" component={FinanceAudit} />
        <Route path="/finance/data-quality" component={FinanceDataQuality} />
        <Route path="/finance/warning" component={FinanceWarning} />
        <Route path="/finance/ekspansi" component={FinanceEkspansi} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
