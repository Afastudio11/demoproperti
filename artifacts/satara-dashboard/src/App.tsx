import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Akuisisi from "@/pages/akuisisi";
import Perencanaan from "@/pages/perencanaan";
import PasarPage from "@/pages/perencanaan/pasar";
import LahanPage from "@/pages/perencanaan/lahan";
import ProdukPage from "@/pages/perencanaan/produk";
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
import MarketingBranding from "@/pages/marketing/branding";
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
import SerahTerima from "@/pages/serah-terima";
import Settings from "@/pages/settings";
import SLIS from "@/pages/slis";
import Layout from "@/components/layout";
import ProgressProyek from "@/pages/produksi/progress/proyek";
import ProgressTahap from "@/pages/produksi/progress/tahap";
import ProgressUnit from "@/pages/produksi/progress/unit";
import FasumPage from "@/pages/produksi/fasum";
import SubkonKontrak from "@/pages/produksi/subkon/kontrak";
import SubkonTermin from "@/pages/produksi/subkon/termin";
import SubkonApproval from "@/pages/produksi/subkon/approval";
import SubkonPerforma from "@/pages/produksi/subkon/performa";
import MaterialMaster from "@/pages/produksi/material/master";
import MaterialMasuk from "@/pages/produksi/material/masuk";
import MaterialKeluar from "@/pages/produksi/material/keluar";
import MaterialStok from "@/pages/produksi/material/stok";
import MaterialKonsumsi from "@/pages/produksi/material/konsumsi";
import MaterialVariance from "@/pages/produksi/material/variance";
import MaterialForecast from "@/pages/produksi/material/forecast";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/akuisisi" component={Akuisisi} />
        <Route path="/perencanaan" component={Perencanaan} />
        <Route path="/perencanaan/pasar" component={PasarPage} />
        <Route path="/perencanaan/lahan" component={LahanPage} />
        <Route path="/perencanaan/produk" component={ProdukPage} />
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
        <Route path="/marketing/branding" component={MarketingBranding} />
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
        <Route path="/produksi/subkon/kontrak" component={SubkonKontrak} />
        <Route path="/produksi/subkon/termin" component={SubkonTermin} />
        <Route path="/produksi/subkon/approval" component={SubkonApproval} />
        <Route path="/produksi/subkon/performa" component={SubkonPerforma} />
        <Route path="/produksi/material/master" component={MaterialMaster} />
        <Route path="/produksi/material/masuk" component={MaterialMasuk} />
        <Route path="/produksi/material/keluar" component={MaterialKeluar} />
        <Route path="/produksi/material/stok" component={MaterialStok} />
        <Route path="/produksi/material/konsumsi" component={MaterialKonsumsi} />
        <Route path="/produksi/material/variance" component={MaterialVariance} />
        <Route path="/produksi/material/forecast" component={MaterialForecast} />
        <Route path="/produksi/qc/checklist" component={QcChecklist} />
        <Route path="/produksi/qc/rework" component={QcRework} />
        <Route path="/produksi/qc/defect" component={QcDefect} />
        <Route path="/produksi/ready-akad" component={ReadyAkad} />
        <Route path="/produksi/analitik/velocity" component={AnalitikVelocity} />
        <Route path="/produksi/analitik/baseline" component={AnalitikBaseline} />
        <Route path="/produksi/analitik/cost-to-complete" component={AnalitikCostToComplete} />
        <Route path="/produksi/analitik/cashflow-impact" component={AnalitikCashflowImpact} />
        <Route path="/produksi/analitik/produktivitas" component={AnalitikProduktivitas} />
        <Route path="/produksi/analitik/eligibilitas" component={AnalitikEligibilitas} />
        <Route path="/produksi/analitik/forecast" component={AnalitikForecast} />
        <Route path="/produksi/health" component={ProduksiHealth} />
        <Route path="/serah-terima" component={SerahTerima} />
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
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
