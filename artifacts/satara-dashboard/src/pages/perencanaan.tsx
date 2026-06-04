import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator, Map, Package, Calendar, DollarSign,
  Users, ChevronRight, Building2, TrendingUp, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency } from "@/lib/planning-calc";

const modules = [
  { name: "Analisis Pasar", path: "/perencanaan/pasar", icon: TrendingUp, desc: "Demografi, FLPP, kompetitor & demand score" },
  { name: "Analisis Lahan", path: "/perencanaan/lahan", icon: Building2, desc: "Kavling split 18/12/70, luas efektif, max unit" },
  { name: "Perencanaan Produk", path: "/perencanaan/produk", icon: Package, desc: "Tipe unit, harga, segmen & simulasi revenue" },
  { name: "Feasibility Engine", path: "/perencanaan/feasibility", icon: Calculator, desc: "ROI, IRR, NPV, payback & CEO report" },
  { name: "Timeline SPTIS", path: "/perencanaan/timeline", icon: Calendar, desc: "Master schedule & milestone tracking" },
  { name: "Cashflow & KPP", path: "/perencanaan/cashflow", icon: DollarSign, desc: "Cashflow 3 skenario & kredit konstruksi" },
  { name: "Sumber Daya", path: "/perencanaan/sdm", icon: Users, desc: "Kapasitas SDM & alokasi tim proyek" },
  { name: "Land Bank", path: "/perencanaan/landbank", icon: Map, desc: "Portofolio lahan & ekspansi readiness" },
];

export default function Perencanaan() {
  const { data: feasibilities } = useQuery({
    queryKey: ["planning-feasibility"],
    queryFn: () => fetch("/api/planning/feasibility").then(r => r.json()),
  });
  const { data: milestones } = useQuery({
    queryKey: ["planning-milestones"],
    queryFn: () => fetch("/api/planning/milestones").then(r => r.json()),
  });
  const { data: markets } = useQuery({
    queryKey: ["planning-market"],
    queryFn: () => fetch("/api/planning/market").then(r => r.json()),
  });

  const feasArr = Array.isArray(feasibilities) ? feasibilities : [];
  const msArr = Array.isArray(milestones) ? milestones : [];
  const mktArr = Array.isArray(markets) ? markets : [];

  const goCount = feasArr.filter((f: Record<string, number>) => (f.roi ?? 0) >= 35 && (f.irr ?? 0) >= 20).length;
  const reviewCount = feasArr.filter((f: Record<string, number>) => !((f.roi ?? 0) >= 35 && (f.irr ?? 0) >= 20) && ((f.roi ?? 0) >= 20 || (f.irr ?? 0) >= 15)).length;
  const overdueCount = msArr.filter((m: Record<string, string>) => m.status === "terlambat").length;
  const totalRevenue = feasArr.reduce((s: number, f: Record<string, number>) => s + (f.totalRevenue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Planning Intelligence Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Command center untuk seluruh proses perencanaan proyek properti
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Feasibility GO", value: goCount, color: "text-emerald-500", icon: CheckCircle2 },
          { label: "Perlu Review", value: reviewCount, color: "text-amber-500", icon: AlertTriangle },
          { label: "Milestone Terlambat", value: overdueCount, color: "text-red-500", icon: AlertTriangle },
          { label: "Analisis Pasar Tersimpan", value: mktArr.length, color: "text-blue-500", icon: TrendingUp },
        ].map(kpi => (
          <Card key={kpi.label} className="gap-2">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalRevenue > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Total Revenue Proyeksi (semua proyek)</div>
              <div className="text-xl font-bold text-emerald-500">{fmtCurrency(totalRevenue)}</div>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
              {feasArr.length} studi feasibility
            </Badge>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Modul Perencanaan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modules.map(mod => (
            <Link key={mod.path} href={mod.path}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <mod.icon className="size-4 text-primary" />
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{mod.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {feasArr.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Ringkasan Feasibility</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Proyek", "ROI", "IRR", "Margin", "Payback", "Status"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feasArr.slice(0, 8).map((f: Record<string, number | string>) => {
                  const pass = (f.roi as number ?? 0) >= 35 && (f.irr as number ?? 0) >= 20;
                  const review = !pass && ((f.roi as number ?? 0) >= 20 || (f.irr as number ?? 0) >= 15);
                  return (
                    <tr key={f.id as number} className="border-t">
                      <td className="px-3 py-2 font-medium">Proyek #{f.projectId}</td>
                      <td className="px-3 py-2">{((f.roi as number) ?? 0).toFixed(1)}%</td>
                      <td className="px-3 py-2">{((f.irr as number) ?? 0).toFixed(1)}%</td>
                      <td className="px-3 py-2">{((f.margin as number) ?? 0).toFixed(1)}%</td>
                      <td className="px-3 py-2">{f.paybackPeriod ?? "-"} bln</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={pass ? "text-emerald-600 border-emerald-200" : review ? "text-amber-600 border-amber-200" : "text-red-600 border-red-200"}
                        >
                          {pass ? "GO" : review ? "REVIEW" : "NO-GO"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
