import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fmtCurrency } from "@/lib/planning-calc";
import { Plus, Trash2, Save, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type LandBankRow = {
  id?: number;
  name: string;
  status: string;
  landArea: number;
  availableUnits: number;
  acquisitionPrice: number;
  targetStartDate: string;
  notes: string;
};

type ExpansionRow = {
  id?: number;
  scenarioName: string;
  description: string;
  estimatedRoi: number;
  riskScore: number;
  cashflowImpact: string;
  sdmScore: number;
  sopScore: number;
  dashboardScore: number;
};

const newLb = (): LandBankRow => ({ name: "", status: "land_bank", landArea: 0, availableUnits: 0, acquisitionPrice: 0, targetStartDate: "", notes: "" });
const newExp = (): ExpansionRow => ({ scenarioName: "", description: "", estimatedRoi: 0, riskScore: 0, cashflowImpact: "", sdmScore: 0, sopScore: 0, dashboardScore: 0 });

const STATUSES = [
  { value: "land_bank", label: "Land Bank", color: "text-blue-600" },
  { value: "in_progress", label: "In Progress", color: "text-amber-600" },
  { value: "completed", label: "Selesai", color: "text-emerald-600" },
  { value: "on_hold", label: "On Hold", color: "text-muted-foreground" },
];

const READINESS_CHECKS = [
  { label: "Cashflow positif 6 bulan ke depan", key: "cashflow", score: 25 },
  { label: "SDM tersedia (Site Manager + Supervisor)", key: "sdm", score: 25 },
  { label: "SOP operasional terdokumentasi", key: "sop", score: 25 },
  { label: "Dashboard monitoring aktif", key: "dashboard", score: 25 },
];

const MIN_COVERAGE_MONTHS = 18;

export default function LandBankPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [lands, setLands] = useState<LandBankRow[]>([]);
  const [expansions, setExpansions] = useState<ExpansionRow[]>([]);
  const [readiness, setReadiness] = useState({ cashflow: false, sdm: false, sop: false, dashboard: false });
  const [avgAkadPerMonth, setAvgAkadPerMonth] = useState(4);

  const { data: landData } = useQuery({
    queryKey: ["planning-landbank"],
    queryFn: () => fetch("/api/planning/landbank").then(r => r.json()),
  });

  const { data: expansionData } = useQuery({
    queryKey: ["planning-expansion"],
    queryFn: () => fetch("/api/planning/expansion").then(r => r.json()),
  });

  useEffect(() => {
    if (Array.isArray(landData) && landData.length > 0) setLands(landData);
  }, [landData]);

  useEffect(() => {
    if (Array.isArray(expansionData) && expansionData.length > 0) setExpansions(expansionData);
  }, [expansionData]);

  const setLand = (i: number, k: keyof LandBankRow, v: string | number) => {
    setLands(prev => { const next = [...prev]; (next[i] as Record<string, unknown>)[k] = v; return next; });
  };
  const setExp = (i: number, k: keyof ExpansionRow, v: string | number) => {
    setExpansions(prev => { const next = [...prev]; (next[i] as Record<string, unknown>)[k] = v; return next; });
  };

  const saveLands = async () => {
    for (const land of lands) {
      if (!land.name) continue;
      if (land.id) {
        await fetch(`/api/planning/landbank/${land.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(land) });
      } else {
        const resp = await fetch("/api/planning/landbank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(land) });
        const d = await resp.json();
        land.id = d.id;
      }
    }
    await qc.invalidateQueries({ queryKey: ["planning-landbank"] });
    toast({ title: "Land bank tersimpan" });
  };

  const saveExpansions = async () => {
    for (const exp of expansions) {
      if (!exp.scenarioName) continue;
      if (exp.id) {
        await fetch(`/api/planning/expansion/${exp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exp) });
      } else {
        const resp = await fetch("/api/planning/expansion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exp) });
        const d = await resp.json();
        exp.id = d.id;
      }
    }
    await qc.invalidateQueries({ queryKey: ["planning-expansion"] });
    toast({ title: "Skenario ekspansi tersimpan" });
  };

  const deleteLand = async (i: number) => {
    if (lands[i].id) await fetch(`/api/planning/landbank/${lands[i].id}`, { method: "DELETE" });
    setLands(prev => prev.filter((_, idx) => idx !== i));
  };

  const deleteExp = async (i: number) => {
    if (expansions[i].id) await fetch(`/api/planning/expansion/${expansions[i].id}`, { method: "DELETE" });
    setExpansions(prev => prev.filter((_, idx) => idx !== i));
  };

  const readinessScore = Object.values(readiness).filter(Boolean).length * 25;
  const totalLandArea = lands.reduce((s, l) => s + (l.landArea ?? 0), 0);
  const totalUnits = lands.reduce((s, l) => s + (l.availableUnits ?? 0), 0);
  const totalValue = lands.reduce((s, l) => s + (l.acquisitionPrice ?? 0), 0);

  const statusChartData = STATUSES.map(s => ({
    name: s.label,
    count: lands.filter(l => l.status === s.value).length,
  }));
  const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#94a3b8"];

  // Absorption Simulator
  const coverageMonths = avgAkadPerMonth > 0 ? Math.round(totalUnits / avgAkadPerMonth) : 0;
  const absorptionData = Array.from({ length: Math.min(coverageMonths + 3, 36) }, (_, i) => ({
    month: i + 1,
    stok: Math.max(totalUnits - i * avgAkadPerMonth, 0),
  }));
  const depletionMonth = absorptionData.find(d => d.stok === 0)?.month ?? coverageMonths;
  const acquisitionAlert = coverageMonths < MIN_COVERAGE_MONTHS;
  const acquisitionDeadlineMonth = Math.max(0, depletionMonth - MIN_COVERAGE_MONTHS);

  // Expansion readiness radar data
  const readinessRadarData = [
    { subject: "Land Bank", score: Math.min(coverageMonths / MIN_COVERAGE_MONTHS * 100, 100) },
    { subject: "Cashflow", score: readiness.cashflow ? 100 : 0 },
    { subject: "SDM", score: readiness.sdm ? 100 : 0 },
    { subject: "SOP", score: readiness.sop ? 100 : 0 },
    { subject: "Dashboard", score: readiness.dashboard ? 100 : 0 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Land Bank & Ekspansi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Portofolio lahan, simulasi absorpsi, ekspansi readiness & skenario bisnis</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Lahan", val: `${totalLandArea.toLocaleString("id-ID")} m²` },
          { label: "Total Unit Potensial", val: `${totalUnits} unit` },
          { label: "Nilai Perolehan", val: fmtCurrency(totalValue) },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="font-bold mt-0.5">{kpi.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="landbank">
        <TabsList>
          <TabsTrigger value="landbank">Land Bank</TabsTrigger>
          <TabsTrigger value="absorpsi">Absorpsi Simulator</TabsTrigger>
          <TabsTrigger value="readiness">Expansion Readiness</TabsTrigger>
          <TabsTrigger value="skenario">Skenario Ekspansi</TabsTrigger>
        </TabsList>

        <TabsContent value="landbank" className="mt-3 space-y-3">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setLands(prev => [...prev, newLb()])} className="gap-1.5"><Plus className="size-3.5" />Tambah Lahan</Button>
            <Button size="sm" onClick={saveLands} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Nama/Lokasi", "Status", "Luas (m²)", "Est Unit", "Harga Perolehan (Rp)", "Target Mulai", "Catatan", ""].map(h => (
                        <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lands.map((land, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5 min-w-40">
                          <Input className="h-7 text-xs" value={land.name} onChange={e => setLand(i, "name", e.target.value)} placeholder="Nama / lokasi lahan" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select value={land.status} onValueChange={v => setLand(i, "status", v)}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 w-20 text-xs" type="number" value={land.landArea || ""} onChange={e => setLand(i, "landArea", parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 w-16 text-xs" type="number" value={land.availableUnits || ""} onChange={e => setLand(i, "availableUnits", parseInt(e.target.value) || 0)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 w-32 text-xs" type="number" value={land.acquisitionPrice || ""} onChange={e => setLand(i, "acquisitionPrice", parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 w-28 text-xs" type="date" value={land.targetStartDate} onChange={e => setLand(i, "targetStartDate", e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5 min-w-32">
                          <Input className="h-7 text-xs" value={land.notes} onChange={e => setLand(i, "notes", e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteLand(i)}><Trash2 className="size-3 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {lands.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribusi Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={statusChartData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="absorpsi" className="mt-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Land Absorption Simulator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0">Rata-rata akad per bulan</Label>
                <Input className="h-8 w-24 text-sm" type="number" min={1} value={avgAkadPerMonth} onChange={e => setAvgAkadPerMonth(parseInt(e.target.value) || 1)} />
                <span className="text-sm text-muted-foreground">unit/bulan</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Stok Unit", val: `${totalUnits} unit`, color: "text-foreground" },
                  { label: "Coverage Stok", val: `${coverageMonths} bulan`, color: coverageMonths >= MIN_COVERAGE_MONTHS ? "text-emerald-600" : "text-red-600" },
                  { label: "Standar Minimum", val: `${MIN_COVERAGE_MONTHS} bulan`, color: "text-muted-foreground" },
                  { label: "Est. Habis Bulan ke", val: depletionMonth > 0 ? `${depletionMonth}` : "—", color: "text-amber-600" },
                ].map(kpi => (
                  <div key={kpi.label} className="p-3 rounded-md bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
                    <div className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.val}</div>
                  </div>
                ))}
              </div>

              {/* Alert */}
              {acquisitionAlert ? (
                <div className="flex items-start gap-3 p-3 rounded-md border-2 border-amber-200 bg-amber-50/20">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-700">Stok Land Bank Di Bawah Standar Minimum</div>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Coverage {coverageMonths} bulan — standar minimum Satara {MIN_COVERAGE_MONTHS} bulan.
                      {acquisitionDeadlineMonth > 0
                        ? ` Akuisisi tahap berikutnya harus dimulai paling lambat bulan ke-${acquisitionDeadlineMonth}.`
                        : " Akuisisi harus dilakukan segera."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-md border border-emerald-200 bg-emerald-50/20">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-700">
                    <span className="font-semibold">Stok Land Bank Aman</span>
                    <span className="text-xs block mt-0.5">Coverage {coverageMonths} bulan — melebihi standar minimum {MIN_COVERAGE_MONTHS} bulan</span>
                  </div>
                </div>
              )}

              {/* Chart */}
              {absorptionData.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2">Proyeksi Deplesi Stok</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={absorptionData} margin={{ top: 5, right: 10, bottom: 0, left: 5 }}>
                      <XAxis dataKey="month" fontSize={9} label={{ value: "Bulan", position: "insideBottom", offset: -2, fontSize: 9 }} />
                      <YAxis fontSize={9} />
                      <Tooltip formatter={(v: number) => [`${v} unit`, "Sisa Stok"]} labelFormatter={l => `Bulan ke-${l}`} />
                      <ReferenceLine
                        x={acquisitionDeadlineMonth > 0 ? acquisitionDeadlineMonth : undefined}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{ value: "Mulai Akuisisi", fontSize: 9, fill: "#f59e0b" }}
                      />
                      <Line type="monotone" dataKey="stok" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sisa Stok" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="mt-3 space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Expansion Readiness Score</CardTitle>
                  <div className={`text-2xl font-bold ${readinessScore >= 75 ? "text-emerald-500" : readinessScore >= 50 ? "text-amber-500" : "text-red-500"}`}>
                    {readinessScore}%
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${readinessScore >= 75 ? "bg-emerald-500" : readinessScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
                <div className="space-y-3 pt-2">
                  {READINESS_CHECKS.map(check => {
                    const checked = readiness[check.key as keyof typeof readiness];
                    return (
                      <div
                        key={check.key}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${checked ? "bg-emerald-50/10 border-emerald-200/50" : "hover:bg-muted/30"}`}
                        onClick={() => setReadiness(prev => ({ ...prev, [check.key]: !prev[check.key as keyof typeof readiness] }))}
                      >
                        {checked ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> : <XCircle className="size-4 text-muted-foreground shrink-0" />}
                        <span className="text-sm flex-1">{check.label}</span>
                        <Badge variant="outline" className="text-xs">{check.score} poin</Badge>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-3 p-3 rounded-md text-sm font-medium ${readinessScore >= 75 ? "bg-emerald-50/20 text-emerald-600" : readinessScore >= 50 ? "bg-amber-50/20 text-amber-600" : "bg-red-50/20 text-red-600"}`}>
                  {readinessScore >= 75 ? "SIAP EKSPANSI — Semua komponen utama telah terpenuhi" :
                    readinessScore >= 50 ? "PERLU PERSIAPAN — Penuhi checklist sebelum ekspansi" :
                    "BELUM SIAP — Fokus perkuat operasional existing dahulu"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Radar 5 Dimensi</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={readinessRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" fontSize={10} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar name="Readiness" dataKey="score" stroke="#3b82f6" fill="#3b82f620" />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skenario" className="mt-3 space-y-3">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setExpansions(prev => [...prev, newExp()])} className="gap-1.5"><Plus className="size-3.5" />Tambah Skenario</Button>
            <Button size="sm" onClick={saveExpansions} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
          </div>

          {expansions.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Perbandingan Skenario</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Skenario", "Est ROI", "Risk Score", "Weighted Score", "Rekomendasi"].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expansions.filter(e => e.scenarioName).map((exp, i) => {
                      const weighted = exp.estimatedRoi * 0.6 + (100 - exp.riskScore) * 0.4;
                      const bestWeighted = Math.max(...expansions.filter(e => e.scenarioName).map(e => e.estimatedRoi * 0.6 + (100 - e.riskScore) * 0.4));
                      const isBest = weighted === bestWeighted;
                      return (
                        <tr key={i} className={`border-t ${isBest ? "bg-emerald-50/10" : ""}`}>
                          <td className="px-3 py-2 font-medium">
                            {exp.scenarioName}
                            {isBest && <Badge className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700">Terbaik</Badge>}
                          </td>
                          <td className={`px-3 py-2 ${exp.estimatedRoi >= 35 ? "text-emerald-600 font-medium" : exp.estimatedRoi >= 25 ? "text-amber-600" : "text-red-600"}`}>{exp.estimatedRoi}%</td>
                          <td className={`px-3 py-2 ${exp.riskScore <= 30 ? "text-emerald-600" : exp.riskScore <= 60 ? "text-amber-600" : "text-red-600"}`}>{exp.riskScore}/100</td>
                          <td className="px-3 py-2 font-semibold">{weighted.toFixed(1)}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={`text-[10px] ${isBest ? "border-emerald-500 text-emerald-600" : ""}`}>
                              {isBest ? "PRIORITAS" : exp.estimatedRoi >= 35 ? "LAYAK" : "TINJAU"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {expansions.map((exp, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Input className="h-7 text-sm font-medium w-64" value={exp.scenarioName} onChange={e => setExp(i, "scenarioName", e.target.value)} placeholder="Nama skenario..." />
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteExp(i)}><Trash2 className="size-3 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Deskripsi</Label>
                  <Textarea className="text-xs resize-none" rows={2} value={exp.description} onChange={e => setExp(i, "description", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dampak Cashflow</Label>
                  <Textarea className="text-xs resize-none" rows={2} value={exp.cashflowImpact} onChange={e => setExp(i, "cashflowImpact", e.target.value)} />
                </div>
                {[
                  ["estimatedRoi", "Est ROI (%)", "%"],
                  ["riskScore", "Risk Score (0-100)", "/ 100"],
                ] .map(([k, label, unit]) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <div className="flex items-center gap-1">
                      <Input className="h-7 text-xs" type="number" value={(exp as Record<string, unknown>)[k] as number || ""} onChange={e => setExp(i, k as keyof ExpansionRow, parseFloat(e.target.value) || 0)} />
                      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {expansions.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada skenario ekspansi — klik Tambah Skenario</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
