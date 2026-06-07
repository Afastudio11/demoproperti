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
import Legal from "@/pages/legal";
import Marketing from "@/pages/marketing";
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
import Ekspansi from "@/pages/ekspansi";
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
        <Route path="/legal" component={Legal} />
        <Route path="/marketing" component={Marketing} />
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
        <Route path="/ekspansi" component={Ekspansi} />
        <Route path="/slis" component={SLIS} />
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
