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
import { fmtCurrency } from "@/lib/planning-calc";
import { Save, Plus, Trash2 } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

const DEFAULT_MONTHS = 24;

function buildDefaultEntries(months: number) {
  return Array.from({ length: months }, (_, i) => ({
    monthNumber: i + 1,
    monthLabel: `Bln ${i + 1}`,
    landCostOut: 0, constructionCostOut: 0, marketingCostOut: 0,
    operationalCostOut: 0, kppInstallmentOut: 0,
    bookingFeeIn: 0, htKprIn: 0, downPaymentIn: 0, kppDisbursementIn: 0,
    conservativeUnits: 0, moderateUnits: 0, aggressiveUnits: 0,
  }));
}

type HtRow = { id?: number; buyerName: string; unitNumber: string; akadDate: string; htAmount: number; kprBank: string; htStatus: string; htDisbDate: string };
const newHt = (): HtRow => ({ buyerName: "", unitNumber: "", akadDate: "", htAmount: 0, kprBank: "", htStatus: "proses", htDisbDate: "" });

export default function CashflowPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(0);
  const [entries, setEntries] = useState(() => buildDefaultEntries(DEFAULT_MONTHS));
  const [htRows, setHtRows] = useState<HtRow[]>([]);
  const [kpp, setKpp] = useState({ bankName: "", approvedAmount: 0, interestRate: 6, tenureMonths: 12, adminFee: 0 });

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });

  const selectProject = async (id: number) => {
    setProjectId(id);
    const [cfRows, htData, kppData] = await Promise.all([
      fetch(`/api/planning/cashflow?projectId=${id}`).then(r => r.json()),
      fetch(`/api/planning/ht?projectId=${id}`).then(r => r.json()),
      fetch(`/api/planning/kpp?projectId=${id}`).then(r => r.json()),
    ]);
    setEntries(cfRows.length > 0 ? cfRows : buildDefaultEntries(DEFAULT_MONTHS));
    setHtRows(htData.length > 0 ? htData : []);
    if (kppData.length > 0) setKpp(kppData[0]);
  };

  const setEntry = (i: number, k: string, v: number) => {
    setEntries(prev => { const next = [...prev]; (next[i] as Record<string, unknown>)[k] = v; return next; });
  };

  const saveCashflow = async () => {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    await fetch("/api/planning/cashflow/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, entries }),
    });
    await qc.invalidateQueries({ queryKey: ["planning-cashflow"] });
    toast({ title: "Cashflow tersimpan" });
  };

  const saveKppHt = async () => {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const kppRows = await fetch("/api/planning/kpp?projectId=" + projectId).then(r => r.json());
    if (kppRows.length > 0) {
      await fetch(`/api/planning/kpp/${kppRows[0].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...kpp, projectId }) });
    } else {
      await fetch("/api/planning/kpp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...kpp, projectId }) });
    }
    for (const ht of htRows) {
      if (ht.id) {
        await fetch(`/api/planning/ht/${ht.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...ht, projectId }) });
      } else if (ht.buyerName) {
        const resp = await fetch("/api/planning/ht", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...ht, projectId }) });
        const d = await resp.json();
        ht.id = d.id;
      }
    }
    toast({ title: "KPP & HT tersimpan" });
  };

  const chartData = entries.map(e => {
    const totalOut = e.landCostOut + e.constructionCostOut + e.marketingCostOut + e.operationalCostOut + e.kppInstallmentOut;
    const totalIn = e.bookingFeeIn + e.htKprIn + e.downPaymentIn + e.kppDisbursementIn;
    return {
      month: e.monthLabel || `Bln ${e.monthNumber}`,
      Pemasukan: totalIn / 1_000_000,
      Pengeluaran: -totalOut / 1_000_000,
    };
  });

  const cumulativeData = chartData.reduce((acc: { month: string; kumulatif: number }[], d, i) => {
    acc.push({ month: d.month, kumulatif: (acc[i - 1]?.kumulatif ?? 0) + d.Pemasukan + d.Pengeluaran });
    return acc;
  }, []);

  const totalIn = entries.reduce((s, e) => s + e.bookingFeeIn + e.htKprIn + e.downPaymentIn + e.kppDisbursementIn, 0);
  const totalOut = entries.reduce((s, e) => s + e.landCostOut + e.constructionCostOut + e.marketingCostOut + e.operationalCostOut + e.kppInstallmentOut, 0);
  const peakNegative = Math.abs(Math.min(0, ...cumulativeData.map(d => d.kumulatif)));

  const projectList = Array.isArray(projects) ? projects : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Cashflow & KPP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cashflow bulanan, kredit konstruksi & HT realisasi</p>
        </div>
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

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Pemasukan", val: fmtCurrency(totalIn), color: "text-emerald-500" },
          { label: "Total Pengeluaran", val: fmtCurrency(totalOut), color: "text-red-500" },
          { label: "Peak Funding Needed", val: `${fmtCurrency(peakNegative * 1_000_000)}`, color: "text-amber-500" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className={`text-base font-bold mt-0.5 ${kpi.color}`}>{kpi.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Grafik Cashflow</TabsTrigger>
          <TabsTrigger value="table">Input Bulanan</TabsTrigger>
          <TabsTrigger value="kpp">KPP Konstruksi</TabsTrigger>
          <TabsTrigger value="ht">HT Realisasi</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Cashflow Bulanan (Jt Rp)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.slice(0, 24)} margin={{ top: 5, right: 10, bottom: 0, left: 5 }}>
                  <XAxis dataKey="month" fontSize={9} />
                  <YAxis fontSize={9} tickFormatter={v => `${v.toFixed(0)}`} />
                  <Tooltip formatter={(v: number) => [`Rp ${Math.abs(v).toFixed(1)} jt`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#666" />
                  <Bar dataKey="Pemasukan" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[0, 0, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Kumulatif Cashflow (Jt Rp)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={cumulativeData.slice(0, 24)} margin={{ top: 5, right: 10, bottom: 0, left: 5 }}>
                  <XAxis dataKey="month" fontSize={9} />
                  <YAxis fontSize={9} />
                  <Tooltip formatter={(v: number) => [`Rp ${v.toFixed(1)} jt`, "Kumulatif"]} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="kumulatif" stroke="#3b82f6" fill="#3b82f620" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={saveCashflow} className="gap-1.5"><Save className="size-3.5" />Simpan Cashflow</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b sticky top-0">
                    <tr>
                      {["Bulan", "Biaya Lahan", "Konstruksi", "Marketing", "Operasional", "Angsuran KPP", "Booking Fee", "HT/KPR", "DP", "Cairang KPP"].map(h => (
                        <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1 font-medium">{e.monthLabel}</td>
                        {["landCostOut","constructionCostOut","marketingCostOut","operationalCostOut","kppInstallmentOut","bookingFeeIn","htKprIn","downPaymentIn","kppDisbursementIn"].map(k => (
                          <td key={k} className="px-1 py-1">
                            <CurrencyInput className="h-6 w-28 text-xs" value={(e as Record<string, unknown>)[k] as number ?? 0} onChange={raw => setEntry(i, k, raw ? Number(raw) : 0)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpp" className="mt-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={saveKppHt} className="gap-1.5"><Save className="size-3.5" />Simpan KPP & HT</Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Data KPP (Kredit Pemilikan Properti Konstruksi)</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {[
                ["bankName", "Nama Bank", "text"],
                ["approvedAmount", "Plafon Disetujui (Rp)", "currency"],
                ["interestRate", "Suku Bunga (%/thn)", "number"],
                ["tenureMonths", "Jangka Waktu (Bulan)", "number"],
                ["adminFee", "Biaya Admin (Rp)", "currency"],
              ].map(([k, label, type]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  {type === "currency"
                  ? <CurrencyInput className="h-8 text-sm" value={(kpp as Record<string, unknown>)[k] as number ?? 0} onChange={raw => setKpp(prev => ({ ...prev, [k]: raw ? Number(raw) : 0 }))} />
                  : type === "number"
                  ? <NumericInput className="h-8 text-sm" value={(kpp as Record<string, unknown>)[k] as number ?? 0} onChange={v => setKpp(prev => ({ ...prev, [k]: v }))} />
                  : <Input className="h-8 text-sm" value={(kpp as Record<string, unknown>)[k] as string ?? ""} onChange={e => setKpp(prev => ({ ...prev, [k]: e.target.value }))} />
                }
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ht" className="mt-3">
          <div className="flex justify-end gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={() => setHtRows(prev => [...prev, newHt()])} className="gap-1.5"><Plus className="size-3.5" />Tambah HT</Button>
            <Button size="sm" onClick={saveKppHt} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Nama Pembeli", "No Unit", "Tgl Akad", "Nilai HT (Rp)", "Bank KPR", "Status", "Tgl Cair", ""].map(h => (
                        <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {htRows.map((ht, i) => (
                      <tr key={i} className="border-t">
                        {["buyerName","unitNumber"].map(k => (
                          <td key={k} className="px-2 py-1.5">
                            <Input className="h-7 text-xs w-28" value={(ht as Record<string, unknown>)[k] as string ?? ""} onChange={e => {
                              const next = [...htRows]; (next[i] as Record<string, unknown>)[k] = e.target.value; setHtRows(next);
                            }} />
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-28" type="date" value={ht.akadDate} onChange={e => { const next = [...htRows]; next[i].akadDate = e.target.value; setHtRows(next); }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <CurrencyInput className="h-7 text-xs w-28" value={ht.htAmount} onChange={raw => { const next = [...htRows]; next[i].htAmount = raw ? Number(raw) : 0; setHtRows(next); }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-20" value={ht.kprBank} onChange={e => { const next = [...htRows]; next[i].kprBank = e.target.value; setHtRows(next); }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select value={ht.htStatus} onValueChange={v => { const next = [...htRows]; next[i].htStatus = v; setHtRows(next); }}>
                            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["proses","approved","cair","batal"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-7 text-xs w-28" type="date" value={ht.htDisbDate} onChange={e => { const next = [...htRows]; next[i].htDisbDate = e.target.value; setHtRows(next); }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button variant="ghost" size="icon" className="size-7" onClick={async () => {
                            if (ht.id) await fetch(`/api/planning/ht/${ht.id}`, { method: "DELETE" });
                            setHtRows(prev => prev.filter((_, idx) => idx !== i));
                          }}><Trash2 className="size-3 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
