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
import Legal from "@/pages/legal";
import Marketing from "@/pages/marketing";
import Administrasi from "@/pages/administrasi";
import Produksi from "@/pages/produksi";
import SerahTerima from "@/pages/serah-terima";
import Settings from "@/pages/settings";
import KompetitorPage from "@/pages/kompetitor";
import Layout from "@/components/layout";

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
        <Route path="/legal" component={Legal} />
        <Route path="/marketing" component={Marketing} />
        <Route path="/administrasi" component={Administrasi} />
        <Route path="/produksi" component={Produksi} />
        <Route path="/serah-terima" component={SerahTerima} />
        <Route path="/kompetitor" component={KompetitorPage} />
        <Route path="/settings" component={Settings} />
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
