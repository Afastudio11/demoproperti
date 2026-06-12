import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Velocity from "./velocity";
import Baseline from "./baseline";
import CostToComplete from "./cost-to-complete";
import CashflowImpact from "./cashflow-impact";
import Produktivitas from "./produktivitas";
import Eligibilitas from "./eligibilitas";
import Forecast from "./forecast";

export default function AnalitikProduksi() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Analitik Produksi</h1>
        <p className="text-sm text-muted-foreground">Velocity, baseline, cost to complete, cashflow, produktivitas, eligibilitas, dan forecast dalam satu halaman.</p>
      </div>
      <Tabs defaultValue="velocity" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="baseline">Baseline</TabsTrigger>
          <TabsTrigger value="cost">Cost to Complete</TabsTrigger>
          <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
          <TabsTrigger value="produktivitas">Produktivitas</TabsTrigger>
          <TabsTrigger value="eligibilitas">Eligibilitas</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>
        <TabsContent value="velocity"><Velocity /></TabsContent>
        <TabsContent value="baseline"><Baseline /></TabsContent>
        <TabsContent value="cost"><CostToComplete /></TabsContent>
        <TabsContent value="cashflow"><CashflowImpact /></TabsContent>
        <TabsContent value="produktivitas"><Produktivitas /></TabsContent>
        <TabsContent value="eligibilitas"><Eligibilitas /></TabsContent>
        <TabsContent value="forecast"><Forecast /></TabsContent>
      </Tabs>
    </div>
  );
}
