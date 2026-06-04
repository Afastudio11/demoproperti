import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { calcFeasibility, fmtCurrency, fmtPct, type FeasibilityInputs } from "@/lib/planning-calc";
import { Save, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
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

function NumField({ label, value, onChange, unit, prefix }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; prefix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input className="h-8 text-sm" type="number" value={value || ""} onChange={e => onChange(parseFloat(e.target.value) || 0)} />
        {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

export default function FeasibilityPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(0);
  const [inputs, setInputs] = useState<FeasibilityInputs>(defaultInputs);
  const [savedId, setSavedId] = useState<number | null>(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });

  const selectProject = async (id: number) => {
    setProjectId(id);
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
      setInputs(defaultInputs);
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
    toast({ title: "Feasibility tersimpan" });
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

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select onValueChange={v => selectProject(parseInt(v))}>
          <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
          <SelectContent>
            {projectList.map((p: Record<string, unknown>) => (
              <SelectItem key={p.id as number} value={String(p.id)}>{p.nama as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <CardHeader><CardTitle className="text-sm">Komponen Biaya</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumField label="Biaya Lahan (Rp)" value={inputs.landCost} onChange={v => setI("landCost", v)} prefix="Rp" />
              <NumField label="Pematangan Lahan (Rp)" value={inputs.landPrepCost} onChange={v => setI("landPrepCost", v)} prefix="Rp" />
              <NumField label="Biaya Konstruksi/Unit (Rp)" value={inputs.constructionCostPerUnit} onChange={v => setI("constructionCostPerUnit", v)} prefix="Rp" />
              <NumField label="Jalan & Fasum (Rp)" value={inputs.fasumRoadCost} onChange={v => setI("fasumRoadCost", v)} prefix="Rp" />
              <NumField label="IMB/Perizinan (Rp)" value={inputs.permitCost} onChange={v => setI("permitCost", v)} prefix="Rp" />
              <NumField label="Biaya Pemasaran (Rp)" value={inputs.marketingCost} onChange={v => setI("marketingCost", v)} prefix="Rp" />
              <NumField label="Overhead & Operasional (Rp)" value={inputs.overheadCost} onChange={v => setI("overheadCost", v)} prefix="Rp" />
              <NumField label="Contingency (%)" value={inputs.contingencyPct} onChange={v => setI("contingencyPct", v)} unit="%" />
              {result && (
                <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Konstruksi Total", val: fmtCurrency(result.constructionTotal) },
                      { label: "Contingency", val: fmtCurrency(result.contingency) },
                      { label: "Total HPP", val: fmtCurrency(result.totalCost) },
                      { label: "HPP/Unit", val: fmtCurrency(result.totalCost / inputs.totalUnits) },
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
              <NumField label="Harga Jual/Unit (Rp)" value={inputs.sellingPricePerUnit} onChange={v => setI("sellingPricePerUnit", v)} prefix="Rp" />
              <NumField label="Total Unit" value={inputs.totalUnits} onChange={v => setI("totalUnits", v)} unit="unit" />
              <NumField label="Booking Fee/Unit (Rp)" value={inputs.bookingFeePerUnit} onChange={v => setI("bookingFeePerUnit", v)} prefix="Rp" />
              <NumField label="Sales/Bulan" value={inputs.salesPerMonth} onChange={v => setI("salesPerMonth", v)} unit="unit/bln" />
              <NumField label="Porsi KPR (%)" value={inputs.kprPct} onChange={v => setI("kprPct", v)} unit="%" />
              <NumField label="Porsi Cash Keras (%)" value={inputs.cashHardPct} onChange={v => setI("cashHardPct", v)} unit="%" />
              <NumField label="Porsi Cash Bertahap (%)" value={inputs.cashInstallmentPct} onChange={v => setI("cashInstallmentPct", v)} unit="%" />
              <NumField label="Discount Rate (%/thn)" value={inputs.discountRate} onChange={v => setI("discountRate", v)} unit="%" />
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
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.val}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-xs">Cumulative Cashflow (Jt)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Laporan Ringkasan Eksekutif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-md border">
                  {result.passROI && result.passIRR && result.passMargin && result.passPayback
                    ? <CheckCircle2 className="size-8 text-emerald-500 shrink-0" />
                    : result.passROI || result.passIRR
                    ? <AlertTriangle className="size-8 text-amber-500 shrink-0" />
                    : <XCircle className="size-8 text-red-500 shrink-0" />}
                  <div>
                    <div className="font-semibold text-base">
                      {result.passROI && result.passIRR && result.passMargin && result.passPayback ? "REKOMENDASI: GO" :
                        result.passROI || result.passIRR ? "REKOMENDASI: REVIEW" : "REKOMENDASI: NO-GO"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[result.passROI, result.passIRR, result.passMargin, result.passPayback].filter(Boolean).length} dari 4 kriteria Satara terpenuhi
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Total Investasi (HPP)", fmtCurrency(result.totalCost)],
                    ["Total Revenue", fmtCurrency(result.totalRevenue)],
                    ["Gross Profit", fmtCurrency(result.grossProfit)],
                    ["Margin Keuntungan", fmtPct(result.margin)],
                    ["Return on Investment", fmtPct(result.roi)],
                    ["Internal Rate of Return", fmtPct(result.irr)],
                    ["Net Present Value", fmtCurrency(result.npv)],
                    ["Payback Period", `${result.paybackPeriod} bulan`],
                    ["Break Even Point", `${result.bepUnits} unit`],
                    ["Kebutuhan Modal Puncak", fmtCurrency(result.peakFunding)],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-muted/30 rounded-md text-xs space-y-1.5">
                  <div className="font-semibold">Asumsi Utama:</div>
                  <div>Harga jual per unit: {fmtCurrency(inputs.sellingPricePerUnit)}, total {inputs.totalUnits} unit</div>
                  <div>Penjualan {inputs.salesPerMonth} unit/bulan, KPR {inputs.kprPct}% / Cash {inputs.cashHardPct + inputs.cashInstallmentPct}%</div>
                  <div>Standar Satara: ROI≥{SATARA.roi}%, IRR≥{SATARA.irr}%, Margin≥{SATARA.margin}%, Payback≤{SATARA.payback} bulan</div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
