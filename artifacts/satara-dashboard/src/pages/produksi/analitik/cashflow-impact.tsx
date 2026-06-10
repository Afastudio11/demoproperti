import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Link } from "wouter";

const fmtRp = (n: number) => `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
const ANALITIK_TABS = [
  { name: "Velocity", path: "/produksi/analitik/velocity" },
  { name: "Baseline", path: "/produksi/analitik/baseline" },
  { name: "Cost to Complete", path: "/produksi/analitik/cost-to-complete" },
  { name: "Dampak Termin ke Cashflow", path: "/produksi/analitik/cashflow-impact" },
  { name: "Produktivitas", path: "/produksi/analitik/produktivitas" },
  { name: "Eligibilitas", path: "/produksi/analitik/eligibilitas" },
  { name: "Forecast Penyelesaian", path: "/produksi/analitik/forecast" },
];

type Payment = { id: number; contractId: number; netPayment: number | null; status: string; period: string | null; createdAt: string };

export default function AnalitikCashflowImpact() {
  const { data: payments } = useQuery({ queryKey: ["subkon-payments"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; } });

  const byMonth = new Map<string, { paid: number; pending: number }>();
  (payments ?? []).forEach(p => {
    const month = p.createdAt.slice(0, 7);
    const ex = byMonth.get(month) ?? { paid: 0, pending: 0 };
    if (p.status === "paid") ex.paid += p.netPayment ?? 0;
    else if (p.status === "pending_approval" || p.status === "approved") ex.pending += p.netPayment ?? 0;
    byMonth.set(month, ex);
  });

  const chartData = Array.from(byMonth.entries()).sort().map(([month, data]) => ({ month, dibayar: Math.round(data.paid / 1_000_000), pending: Math.round(data.pending / 1_000_000) }));
  const totalPaid = (payments ?? []).filter(p => p.status === "paid").reduce((s, p) => s + (p.netPayment ?? 0), 0);
  const totalPending = (payments ?? []).filter(p => p.status !== "paid" && p.status !== "draft").reduce((s, p) => s + (p.netPayment ?? 0), 0);

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => <Link key={t.path} href={t.path}><button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/cashflow-impact" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button></Link>)}
      </div>
      <div><h2 className="text-base font-semibold mb-1">Dampak Termin ke Cashflow</h2><p className="text-sm text-muted-foreground">Dampak pembayaran termin subkon terhadap arus kas perusahaan</p></div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Terbayar</p><p className="text-lg font-bold text-emerald-500">{fmtRp(totalPaid)}</p></CardContent></Card>
        <Card className="border-amber-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Tagihan Pending</p><p className="text-lg font-bold text-amber-500">{fmtRp(totalPending)}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Komitmen</p><p className="text-lg font-bold">{fmtRp(totalPaid + totalPending)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Pembayaran per Bulan (Juta Rp)</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">Belum ada data pembayaran</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="Jt" />
                <Tooltip formatter={(v: number) => `Rp ${v} Jt`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="dibayar" fill="#10b981" name="Dibayar" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
