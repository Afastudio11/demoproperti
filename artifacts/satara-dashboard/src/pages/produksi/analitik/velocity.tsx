import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Link } from "wouter";

const ANALITIK_TABS = [
  { name: "Velocity", path: "/produksi/analitik/velocity" },
  { name: "Baseline", path: "/produksi/analitik/baseline" },
  { name: "Cost to Complete", path: "/produksi/analitik/cost-to-complete" },
  { name: "Dampak Termin ke Cashflow", path: "/produksi/analitik/cashflow-impact" },
  { name: "Produktivitas", path: "/produksi/analitik/produktivitas" },
  { name: "Eligibilitas", path: "/produksi/analitik/eligibilitas" },
  { name: "Forecast Penyelesaian", path: "/produksi/analitik/forecast" },
];

type Payment = { id: number; contractId: number; terminNumber: number | null; velocity: number | null; progressCurrent: number; status: string };
type Contract = { id: number; subkonName: string };

export default function AnalitikVelocity() {
  const { data: payments } = useQuery({ queryKey: ["subkon-payments"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; } });
  const { data: contracts } = useQuery({ queryKey: ["subkon-contracts"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; } });

  const velocityByTermin = (payments ?? []).filter(p => p.velocity != null).map(p => {
    const c = contracts?.find(c => c.id === p.contractId);
    return { name: `${c?.subkonName ?? "?"} T${p.terminNumber ?? "?"}`, velocity: Math.round(p.velocity ?? 0), progress: p.progressCurrent };
  });

  const avgVelocity = velocityByTermin.length > 0 ? Math.round(velocityByTermin.reduce((s, v) => s + v.velocity, 0) / velocityByTermin.length) : 0;

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => (
          <Link key={t.path} href={t.path}>
            <button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/velocity" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button>
          </Link>
        ))}
      </div>
      <div>
        <h2 className="text-base font-semibold mb-1">Velocity Analysis</h2>
        <p className="text-sm text-muted-foreground">Kecepatan progress aktual per termin pembayaran</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Avg Velocity</p><p className="text-xl font-bold">{avgVelocity}%/termin</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Target Velocity</p><p className="text-xl font-bold text-primary">15%/termin</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Termin</p><p className="text-xl font-bold">{velocityByTermin.length}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Velocity per Termin</CardTitle></CardHeader>
        <CardContent>
          {velocityByTermin.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">Belum ada data termin</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={velocityByTermin} margin={{ top: 5, right: 5, bottom: 40, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <ReferenceLine y={15} stroke="#e2a838" strokeDasharray="3 3" label={{ value: "Target 15%", position: "right", fontSize: 9, fill: "#e2a838" }} />
                <Bar dataKey="velocity" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
