import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

const fmtRp = (n: number) => `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
const ANALITIK_TABS = [
  { name: "Velocity", path: "/produksi/analitik/velocity" },
  { name: "Baseline", path: "/produksi/analitik/baseline" },
  { name: "Cost to Complete", path: "/produksi/analitik/cost-to-complete" },
  { name: "Dampak Termin ke Cashflow", path: "/produksi/analitik/cashflow-impact" },
  { name: "Produktivitas", path: "/produksi/analitik/produktivitas" },
  { name: "Eligibilitas", path: "/produksi/analitik/eligibilitas" },
  { name: "Forecast Penyelesaian", path: "/produksi/analitik/forecast" },
];

type Contract = { id: number; subkonName: string; stageCode: string | null; contractValue: number; totalRetention: number; status: string };
type Payment = { id: number; contractId: number; netPayment: number | null; status: string; progressCurrent: number };

export default function AnalitikCostToComplete() {
  const { data: contracts } = useQuery({ queryKey: ["subkon-contracts"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; } });
  const { data: payments } = useQuery({ queryKey: ["subkon-payments"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; } });

  const rows = (contracts ?? []).map(c => {
    const paid = (payments ?? []).filter(p => p.contractId === c.id && p.status === "paid");
    const totalPaid = paid.reduce((s, p) => s + (p.netPayment ?? 0), 0);
    const lastProgress = paid.sort((a, b) => b.progressCurrent - a.progressCurrent)[0]?.progressCurrent ?? 0;
    const remaining = 100 - lastProgress;
    const ctc = remaining > 0 ? (c.contractValue * remaining / 100) : 0;
    const eac = totalPaid + ctc;
    return { ...c, totalPaid, lastProgress, ctc, eac, variance: c.contractValue - eac };
  });

  const totalCtc = rows.reduce((s, r) => s + r.ctc, 0);
  const totalEac = rows.reduce((s, r) => s + r.eac, 0);
  const totalBudget = rows.reduce((s, r) => s + r.contractValue, 0);

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => <Link key={t.path} href={t.path}><button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/cost-to-complete" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button></Link>)}
      </div>
      <div><h2 className="text-base font-semibold mb-1">Cost to Complete (CTC)</h2><p className="text-sm text-muted-foreground">Proyeksi sisa biaya yang perlu dikeluarkan untuk menyelesaikan konstruksi</p></div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Budget Kontrak</p><p className="text-lg font-bold">{fmtRp(totalBudget)}</p></CardContent></Card>
        <Card className="border-amber-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Cost to Complete</p><p className="text-lg font-bold text-amber-500">{fmtRp(totalCtc)}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Est. at Completion</p><p className="text-lg font-bold">{fmtRp(totalEac)}</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/30">
            <th className="text-left py-2.5 px-4">Subkon</th><th className="text-right py-2.5 px-2">Progress</th>
            <th className="text-right py-2.5 px-2">Sudah Dibayar</th><th className="text-right py-2.5 px-2">Sisa CTC</th>
            <th className="text-right py-2.5 px-2">EAC</th><th className="text-right py-2.5 px-4">Variance</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada kontrak</td></tr> :
            rows.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/20">
                <td className="py-2 px-4 font-medium">{r.subkonName} {r.stageCode ? `(${r.stageCode})` : ""}</td>
                <td className="py-2 px-2 text-right">{Math.round(r.lastProgress)}%</td>
                <td className="py-2 px-2 text-right text-emerald-600">{fmtRp(r.totalPaid)}</td>
                <td className="py-2 px-2 text-right text-amber-600">{fmtRp(r.ctc)}</td>
                <td className="py-2 px-2 text-right">{fmtRp(r.eac)}</td>
                <td className={`py-2 px-4 text-right font-semibold ${r.variance >= 0 ? "text-emerald-500" : "text-red-500"}`}>{r.variance >= 0 ? "+" : ""}{fmtRp(r.variance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></CardContent></Card>
    </div>
  );
}
