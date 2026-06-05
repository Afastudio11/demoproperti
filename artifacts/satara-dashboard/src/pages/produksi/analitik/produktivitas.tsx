import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

const ANALITIK_TABS = [
  { name: "Velocity", path: "/produksi/analitik/velocity" },
  { name: "Baseline", path: "/produksi/analitik/baseline" },
  { name: "Cost to Complete", path: "/produksi/analitik/cost-to-complete" },
  { name: "Cashflow Impact", path: "/produksi/analitik/cashflow-impact" },
  { name: "Produktivitas", path: "/produksi/analitik/produktivitas" },
  { name: "Eligibilitas", path: "/produksi/analitik/eligibilitas" },
  { name: "Forecast", path: "/produksi/analitik/forecast" },
];

type Contract = { id: number; subkonName: string; unitCount: number; contractValue: number };
type Payment = { id: number; contractId: number; progressCurrent: number; velocity: number | null; terminNumber: number | null; status: string };

export default function AnalitikProduktivitas() {
  const { data: contracts } = useQuery({ queryKey: ["subkon-contracts"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; } });
  const { data: payments } = useQuery({ queryKey: ["subkon-payments"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; } });

  const rows = (contracts ?? []).map(c => {
    const paid = (payments ?? []).filter(p => p.contractId === c.id && p.status === "paid").sort((a, b) => (b.terminNumber ?? 0) - (a.terminNumber ?? 0));
    const avgVelocity = paid.length > 0 ? paid.reduce((s, p) => s + (p.velocity ?? 0), 0) / paid.length : 0;
    const lastProgress = paid[0]?.progressCurrent ?? 0;
    const efficiencyScore = Math.min(100, Math.round(avgVelocity * 6.67));
    const estimatedCompletion = avgVelocity > 0 ? Math.ceil((100 - lastProgress) / avgVelocity) : null;
    return { ...c, avgVelocity: Math.round(avgVelocity * 10) / 10, lastProgress, efficiencyScore, estimatedCompletion, terminCount: paid.length };
  }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => <Link key={t.path} href={t.path}><button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/produktivitas" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button></Link>)}
      </div>
      <div><h2 className="text-base font-semibold mb-1">Produktivitas Score per Subkon</h2><p className="text-sm text-muted-foreground">Skor efisiensi berdasarkan rata-rata velocity dan konsistensi progress</p></div>
      {rows.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">Belum ada data termin</div> : (
        <div className="space-y-2">
          {rows.map((r, idx) => (
            <Card key={r.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground w-6">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{r.subkonName}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{r.unitCount} unit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.efficiencyScore >= 80 ? "bg-emerald-500" : r.efficiencyScore >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.efficiencyScore}%` }} />
                      </div>
                      <span className="text-sm font-semibold w-10">{r.efficiencyScore}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-1.5 text-xs">
                      <div><span className="text-muted-foreground block">Avg Velocity</span><span className="font-medium">{r.avgVelocity}%/termin</span></div>
                      <div><span className="text-muted-foreground block">Progress</span><span className="font-medium">{Math.round(r.lastProgress)}%</span></div>
                      <div><span className="text-muted-foreground block">Termin Selesai</span><span className="font-medium">{r.terminCount}x</span></div>
                      <div><span className="text-muted-foreground block">Est. Selesai</span><span className="font-medium">{r.estimatedCompletion ? `${r.estimatedCompletion} termin` : "N/A"}</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
