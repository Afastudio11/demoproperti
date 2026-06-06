import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { calcFeasibility, fmtCurrency, fmtPct, type FeasibilityInputs } from "@/lib/planning-calc";
import { Save, CheckCircle2, XCircle, AlertTriangle, Brain, Zap, FileDown, ArrowRight } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const SATARA = { roi: 35, irr: 20, payback: 24, margin: 25 };

const defaultInputs: FeasibilityInputs = {
  landCost: 0, landPrepCost: 0, constructionCostPerUnit: 0,
  fasumRoadCost: 0, permitCost: 0, marketingCost: 0, overheadCost: 0,
  contingencyPct: 5, sellingPricePerUnit: 0, totalUnits: 0,
  bookingFeePerUnit: 0, salesPerMonth: 2, kprPct: 75, cashHardPct: 15,
  cashInstallmentPct: 10, discountRate: 12,
};

function StatusBadge({ pass }: { pass: boolean }) {
  return pass
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="size-3" />PASS</Badge>
    : <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="size-3" />FAIL</Badge>;
}

function NumField({ label, value, onChange, unit, prefix, hint, decimals }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; prefix?: string; hint?: string; decimals?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <NumericInput className="h-8 text-sm" value={value} onChange={onChange} decimals={decimals} />
        {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FeasibilityPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(0);
  const [inputs, setInputs] = useState<FeasibilityInputs>(defaultInputs);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const urlProjectId = searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : null;

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });

  useEffect(() => {
    if (!urlProjectId || autoSelected || !projects) return;
    setAutoSelected(true);
    selectProject(urlProjectId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectId, projects]);

  const selectProject = async (id: number) => {
    setProjectId(id);
    setAiText("");
    // Load feasibility data
    const rows = await fetch(`/api/planning/feasibility?projectId=${id}`).then(r => r.json());
    if (rows.length > 0) {
      const d = rows[0];
      setSavedId(d.id);
      setInputs({
        landCost: d.landCost ?? 0, landPrepCost: d.landPrepCost ?? 0,
        constructionCostPerUnit: d.constructionCostPerUnit ?? 0, fasumRoadCost: d.fasumRoadCost ?? 0,
        permitCost: d.permitCost ?? 0, marketingCost: d.marketingCost ?? 0,
        overheadCost: d.overheadCost ?? 0, contingencyPct: d.contingencyPct ?? 5,
        sellingPricePerUnit: d.sellingPricePerUnit ?? 0, totalUnits: d.totalUnits ?? 0,
        bookingFeePerUnit: d.bookingFeePerUnit ?? 0, salesPerMonth: d.salesPerMonth ?? 2,
        kprPct: d.kprPct ?? 75, cashHardPct: d.cashHardPct ?? 15,
        cashInstallmentPct: d.cashInstallmentPct ?? 10, discountRate: d.discountRate ?? 12,
      });
    } else {
      setSavedId(null);
      // Try auto-fill from land analysis
      const landRows = await fetch(`/api/planning/land?projectId=${id}`).then(r => r.json());
      if (landRows.length > 0) {
        const land = landRows[0];
        setInputs(prev => ({
          ...prev,
          landCost: land.landPriceTotal ?? 0,
          totalUnits: land.maxUnits ?? 0,
        }));
        toast({ title: "Data lahan diisi otomatis dari Analisis Lahan" });
      } else {
        setInputs(defaultInputs);
      }
      // Also try auto-fill selling price from product planning
      const prodRows = await fetch(`/api/planning/product?projectId=${id}`).then(r => r.json());
      if (prodRows.length > 0) {
        const avgPrice = prodRows.reduce((s: number, r: Record<string, number>) => s + r.sellingPrice, 0) / prodRows.length;
        const totalUnitsFromProd = prodRows.reduce((s: number, r: Record<string, number>) => s + r.unitCount, 0);
        setInputs(prev => ({
          ...prev,
          sellingPricePerUnit: avgPrice || prev.sellingPricePerUnit,
          totalUnits: totalUnitsFromProd || prev.totalUnits,
        }));
        if (prodRows.length > 0) toast({ title: "Harga jual diisi otomatis dari Perencanaan Produk" });
      }
    }
  };

  const setI = (k: keyof FeasibilityInputs, v: number) => setInputs(prev => ({ ...prev, [k]: v }));

  const result = useMemo(() => inputs.totalUnits > 0 && inputs.sellingPricePerUnit > 0
    ? calcFeasibility(inputs) : null, [inputs]);

  const save = async () => {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const payload = {
      projectId, ...inputs,
      totalRevenue: result?.totalRevenue ?? 0,
      totalCost: result?.totalCost ?? 0,
      grossProfit: result?.grossProfit ?? 0,
      margin: result?.margin ?? 0,
      roi: result?.roi ?? 0,
      irr: result?.irr ?? 0,
      npv: result?.npv ?? 0,
      paybackPeriod: result?.paybackPeriod ?? 0,
      bepUnits: result?.bepUnits ?? 0,
      peakFunding: result?.peakFunding ?? 0,
    };
    const url = savedId ? `/api/planning/feasibility/${savedId}` : "/api/planning/feasibility";
    const method = savedId ? "PATCH" : "POST";
    const resp = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!resp.ok) { toast({ title: "Gagal simpan", variant: "destructive" }); return; }
    const d = await resp.json();
    setSavedId(d.id);
    await qc.invalidateQueries({ queryKey: ["planning-feasibility"] });
    toast({ title: "Feasibility tersimpan — lanjut ke Daftar Proyek untuk konfirmasi." });
  };

  const fetchAiAnalysis = async () => {
    if (!result) return;
    setAiLoading(true);
    setAiText("");
    const proj = (Array.isArray(projects) ? projects : []).find((p: Record<string, unknown>) => p.id === projectId) as Record<string, string> | undefined;
    try {
      const resp = await fetch("/api/ai/planning-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: proj?.nama ?? `Proyek #${projectId}`,
          roi: result.roi, irr: result.irr, margin: result.margin,
          paybackPeriod: result.paybackPeriod, npv: result.npv,
          totalRevenue: result.totalRevenue, totalCost: result.totalCost,
          grossProfit: result.grossProfit, bepUnits: result.bepUnits,
          totalUnits: inputs.totalUnits, peakFunding: result.peakFunding,
          discountRate: inputs.discountRate, salesPerMonth: inputs.salesPerMonth,
          kprPct: inputs.kprPct, sellingPricePerUnit: inputs.sellingPricePerUnit,
          passROI: result.passROI, passIRR: result.passIRR,
          passMargin: result.passMargin, passPayback: result.passPayback,
        }),
      });
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiText(prev => prev + decoder.decode(value));
      }
    } catch {
      setAiText("Gagal memuat analisis AI. Pastikan DEEPSEEK_API_KEY sudah dikonfigurasi.");
    } finally {
      setAiLoading(false);
    }
  };

  const exportPdf = () => {
    if (!result) return;
    const proj = (Array.isArray(projects) ? projects : []).find((p: Record<string, unknown>) => p.id === projectId) as Record<string, string> | undefined;
    const passCount = [result.passROI, result.passIRR, result.passMargin, result.passPayback].filter(Boolean).length;
    const rec = passCount === 4 ? "APPROVE" : passCount >= 2 ? "HOLD" : "REJECT";
    const content = [
      `CEO DECISION REPORT — SATARA DEVELOPMENT`,
      `========================================`,
      `PROYEK     : ${proj?.nama ?? `Proyek #${projectId}`}`,
      `UNIT       : ${inputs.totalUnits} unit`,
      `LAND COST  : ${fmtCurrency(inputs.landCost)}`,
      `REVENUE    : ${fmtCurrency(result.totalRevenue)}`,
      `HPP TOTAL  : ${fmtCurrency(result.totalCost)}`,
      `PROFIT     : ${fmtCurrency(result.grossProfit)}`,
      `MARGIN     : ${fmtPct(result.margin)} ${result.passMargin ? "✓ PASS" : "✗ FAIL"}`,
      `ROI        : ${fmtPct(result.roi)} ${result.passROI ? "✓ PASS" : "✗ FAIL"}`,
      `IRR        : ${fmtPct(result.irr)} ${result.passIRR ? "✓ PASS" : "✗ FAIL"}`,
      `PAYBACK    : ${result.paybackPeriod} bulan ${result.passPayback ? "✓ PASS" : "✗ FAIL"}`,
      `NPV        : ${fmtCurrency(result.npv)}`,
      `BEP        : ${result.bepUnits} unit`,
      `PEAK FUND  : ${fmtCurrency(result.peakFunding)}`,
      `KRITERIA   : ${passCount}/4 standar Satara terpenuhi`,
      `REKOMENDASI: ${rec}`,
      ``,
      aiText ? `ANALISIS AI:\n${aiText}` : "",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CEO_Report_${proj?.nama ?? projectId}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const projectList = Array.isArray(projects) ? projects : [];

  const cashflowChartData = result?.monthlyCashflows.reduce((acc: { month: number; cumulative: number }[], cf, i) => {
    acc.push({ month: i + 1, cumulative: (acc[i - 1]?.cumulative ?? 0) + cf / 1_000_000 });
    return acc;
  }, []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Feasibility Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ROI, IRR, NPV, payback & CEO report otomatis</p>
        </div>
        <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select value={projectId ? String(projectId) : ""} onValueChange={v => selectProject(parseInt(v))}>
          <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
          <SelectContent>
            {projectList.map((p: Record<string, unknown>) => (
              <SelectItem key={p.id as number} value={String(p.id)}>{p.nama as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {savedId && projectId ? (
          <Link href={`/projects`} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <ArrowRight className="size-3" />
            Lihat di Daftar Proyek
          </Link>
        ) : null}
      </div>

      <Tabs defaultValue="biaya">
        <TabsList>
          <TabsTrigger value="biaya">Biaya HPP</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="hasil">Hasil</TabsTrigger>
          <TabsTrigger value="ceo">CEO Report</TabsTrigger>
        </TabsList>

        <TabsContent value="biaya" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Komponen Biaya (HPP)</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumField label="Biaya Lahan (Rp)" value={inputs.landCost} onChange={v => setI("landCost", v)} prefix="Rp" hint="Auto-fill dari Analisis Lahan" />
              <NumField label="Pematangan Lahan (Rp)" value={inputs.landPrepCost} onChange={v => setI("landPrepCost", v)} prefix="Rp" />
              <NumField label="Biaya Konstruksi/Unit (Rp)" value={inputs.constructionCostPerUnit} onChange={v => setI("constructionCostPerUnit", v)} prefix="Rp" />
              <NumField label="Jalan & Fasum (Rp)" value={inputs.fasumRoadCost} onChange={v => setI("fasumRoadCost", v)} prefix="Rp" />
              <NumField label="PKKPR/PBG/Perizinan (Rp)" value={inputs.permitCost} onChange={v => setI("permitCost", v)} prefix="Rp" />
              <NumField label="Biaya Pemasaran (Rp)" value={inputs.marketingCost} onChange={v => setI("marketingCost", v)} prefix="Rp" />
              <NumField label="Overhead & Operasional (Rp)" value={inputs.overheadCost} onChange={v => setI("overheadCost", v)} prefix="Rp" />
              <NumField label="Contingency (%)" value={inputs.contingencyPct} onChange={v => setI("contingencyPct", v)} unit="%" hint="Umumnya 5-10%" />
              {result && (
                <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Konstruksi Total", val: fmtCurrency(result.constructionTotal) },
                      { label: "Contingency", val: fmtCurrency(result.contingency) },
                      { label: "Total HPP", val: fmtCurrency(result.totalCost) },
                      { label: "HPP/Unit", val: inputs.totalUnits > 0 ? fmtCurrency(result.totalCost / inputs.totalUnits) : "—" },
                    ].map(item => (
                      <div key={item.label} className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                        <div className="font-semibold text-xs mt-0.5">{item.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Asumsi Revenue</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumField label="Harga Jual/Unit (Rp)" value={inputs.sellingPricePerUnit} onChange={v => setI("sellingPricePerUnit", v)} prefix="Rp" hint="Auto-fill dari Perencanaan Produk" />
              <NumField label="Total Unit" value={inputs.totalUnits} onChange={v => setI("totalUnits", v)} unit="unit" hint="Auto-fill dari Analisis Lahan" />
              <NumField label="Booking Fee/Unit (Rp)" value={inputs.bookingFeePerUnit} onChange={v => setI("bookingFeePerUnit", v)} prefix="Rp" />
              <NumField label="Sales/Bulan" value={inputs.salesPerMonth} onChange={v => setI("salesPerMonth", v)} unit="unit/bln" />
              <NumField label="Porsi KPR (%)" value={inputs.kprPct} onChange={v => setI("kprPct", v)} unit="%" />
              <NumField label="Porsi Cash Keras (%)" value={inputs.cashHardPct} onChange={v => setI("cashHardPct", v)} unit="%" />
              <NumField label="Porsi Cash Bertahap (%)" value={inputs.cashInstallmentPct} onChange={v => setI("cashInstallmentPct", v)} unit="%" />
              <NumField label="Discount Rate (%/thn)" value={inputs.discountRate} onChange={v => setI("discountRate", v)} unit="%" hint="Untuk kalkulasi NPV" />
              {result && (
                <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Total Revenue", val: fmtCurrency(result.totalRevenue) },
                      { label: "Gross Profit", val: fmtCurrency(result.grossProfit) },
                      { label: "BEP", val: `${result.bepUnits} unit` },
                    ].map(item => (
                      <div key={item.label} className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                        <div className="font-semibold text-xs mt-0.5">{item.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hasil" className="mt-3">
          {!result ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Isi data biaya dan revenue terlebih dahulu</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "ROI", value: fmtPct(result.roi), pass: result.passROI, target: `target ≥${SATARA.roi}%` },
                  { label: "IRR", value: fmtPct(result.irr), pass: result.passIRR, target: `target ≥${SATARA.irr}%` },
                  { label: "Margin", value: fmtPct(result.margin), pass: result.passMargin, target: `target ≥${SATARA.margin}%` },
                  { label: "Payback", value: `${result.paybackPeriod} bulan`, pass: result.passPayback, target: `target ≤${SATARA.payback} bln` },
                ].map(kpi => (
                  <Card key={kpi.label} className={`border-2 ${kpi.pass ? "border-emerald-200" : "border-red-200"}`}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{kpi.label}</span>
                        <StatusBadge pass={kpi.pass} />
                      </div>
                      <div className={`text-2xl font-bold ${kpi.pass ? "text-emerald-600" : "text-red-600"}`}>{kpi.value}</div>
                      <div className="text-[10px] text-muted-foreground">{kpi.target}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {[
                      { label: "NPV", val: fmtCurrency(result.npv) },
                      { label: "Peak Funding Needed", val: fmtCurrency(result.peakFunding) },
                      { label: "BEP", val: `${result.bepUnits} unit` },
                      { label: "Total Revenue", val: fmtCurrency(result.totalRevenue) },
                      { label: "Total Cost (HPP)", val: fmtCurrency(result.totalCost) },
                      { label: "Gross Profit", val: fmtCurrency(result.grossProfit) },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.val}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-xs">Cumulative Cashflow (Jt Rp)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={cashflowChartData} margin={{ top: 5, right: 10, bottom: 0, left: 5 }}>
                        <XAxis dataKey="month" fontSize={9} />
                        <YAxis fontSize={9} tickFormatter={v => `${v.toFixed(0)}`} />
                        <Tooltip formatter={(v: number) => [`Rp ${v.toFixed(1)} jt`, "Kumulatif"]} />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="cumulative" stroke="#3b82f6" fill="#3b82f620" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ceo" className="mt-3">
          {!result ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Isi data biaya dan revenue terlebih dahulu</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Laporan Ringkasan Eksekutif</CardTitle>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={exportPdf}>
                      <FileDown className="size-3.5" />Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className={`flex items-center gap-3 p-3 rounded-md border-2 ${result.passROI && result.passIRR && result.passMargin && result.passPayback ? "border-emerald-200 bg-emerald-50/30" : result.passROI || result.passIRR ? "border-amber-200 bg-amber-50/30" : "border-red-200 bg-red-50/30"}`}>
                    {result.passROI && result.passIRR && result.passMargin && result.passPayback
                      ? <CheckCircle2 className="size-8 text-emerald-500 shrink-0" />
                      : result.passROI || result.passIRR
                      ? <AlertTriangle className="size-8 text-amber-500 shrink-0" />
                      : <XCircle className="size-8 text-red-500 shrink-0" />}
                    <div>
                      <div className="font-bold text-base">
                        {result.passROI && result.passIRR && result.passMargin && result.passPayback ? "REKOMENDASI: APPROVE" :
                          result.passROI || result.passIRR ? "REKOMENDASI: HOLD / REVIEW" : "REKOMENDASI: REJECT"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[result.passROI, result.passIRR, result.passMargin, result.passPayback].filter(Boolean).length} dari 4 kriteria standar Satara terpenuhi
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      ["LAND COST", fmtCurrency(inputs.landCost)],
                      ["REVENUE", fmtCurrency(result.totalRevenue)],
                      ["HPP TOTAL", fmtCurrency(result.totalCost)],
                      ["PROFIT", fmtCurrency(result.grossProfit)],
                      ["MARGIN", fmtPct(result.margin)],
                      ["ROI", fmtPct(result.roi)],
                      ["IRR", fmtPct(result.irr)],
                      ["NPV", fmtCurrency(result.npv)],
                      ["PAYBACK", `${result.paybackPeriod} bulan`],
                      ["BEP", `${result.bepUnits} unit`],
                      ["PEAK FUNDING", fmtCurrency(result.peakFunding)],
                      ["TOTAL UNIT", `${inputs.totalUnits} unit`],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-muted/30 rounded-md text-xs space-y-1">
                    <div className="font-semibold">Asumsi Utama:</div>
                    <div>Harga jual {fmtCurrency(inputs.sellingPricePerUnit)}/unit · {inputs.totalUnits} unit · {inputs.salesPerMonth} unit/bln</div>
                    <div>KPR {inputs.kprPct}% · Cash keras {inputs.cashHardPct}% · Cash bertahap {inputs.cashInstallmentPct}%</div>
                    <div>Standar Satara: ROI≥{SATARA.roi}% · IRR≥{SATARA.irr}% · Margin≥{SATARA.margin}% · Payback≤{SATARA.payback} bln</div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis Section */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="size-4 text-primary" />
                      Analisis AI — DeepSeek
                    </CardTitle>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={fetchAiAnalysis} disabled={aiLoading}>
                      <Zap className="size-3" />
                      {aiLoading ? "Menganalisis..." : "Generate Analisis"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {aiText ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{aiText}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Klik "Generate Analisis" untuk mendapatkan penilaian AI mendalam tentang kelayakan proyek ini, kekuatan, risiko, dan rekomendasi tindakan konkret.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
