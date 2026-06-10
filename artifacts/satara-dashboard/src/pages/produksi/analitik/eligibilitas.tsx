import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { CheckCircle2, XCircle } from "lucide-react";

const ANALITIK_TABS = [
  { name: "Velocity", path: "/produksi/analitik/velocity" },
  { name: "Baseline", path: "/produksi/analitik/baseline" },
  { name: "Cost to Complete", path: "/produksi/analitik/cost-to-complete" },
  { name: "Cashflow Impact", path: "/produksi/analitik/cashflow-impact" },
  { name: "Produktivitas", path: "/produksi/analitik/produktivitas" },
  { name: "Eligibilitas", path: "/produksi/analitik/eligibilitas" },
  { name: "Forecast", path: "/produksi/analitik/forecast" },
];

type Contract = { id: number; subkonName: string; stageCode: string | null; retentionStatus: string; maintenanceMonths: number; actualCompletionDate: string | null; status: string };
type Payment = { id: number; contractId: number; status: string; progressCurrent: number };

export default function AnalitikEligibilitas() {
  const { data: contracts } = useQuery({ queryKey: ["subkon-contracts"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; } });
  const { data: payments } = useQuery({ queryKey: ["subkon-payments"], queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; } });

  const rows = (contracts ?? []).map(c => {
    const cp = (payments ?? []).filter(p => p.contractId === c.id);
    const hasPending = cp.some(p => p.status === "pending_approval");
    const isCompleted = c.status === "selesai" || c.actualCompletionDate != null;
    const retentionEligible = isCompleted && c.retentionStatus === "siap_cair";
    const progress100 = cp.some(p => p.progressCurrent >= 100);
    const noPendingBills = !hasPending;
    const eligibilityScore = [isCompleted, retentionEligible || c.retentionStatus === "sudah_cair", progress100, noPendingBills].filter(Boolean).length * 25;
    return { ...c, hasPending, isCompleted, retentionEligible, progress100, noPendingBills, eligibilityScore };
  });

  const eligible = rows.filter(r => r.eligibilityScore >= 75);

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => <Link key={t.path} href={t.path}><button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/eligibilitas" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button></Link>)}
      </div>
      <div><h2 className="text-base font-semibold mb-1">Eligibilitas Pencairan Retensi</h2><p className="text-sm text-muted-foreground">Checklist kelayakan pencairan retensi subkon</p></div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Siap Cair Retensi</p><p className="text-xl font-bold text-emerald-500">{eligible.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Kontrak</p><p className="text-xl font-bold">{rows.length}</p></CardContent></Card>
      </div>
      {rows.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">Belum ada kontrak</div> : (
        <div className="space-y-2">
          {rows.sort((a, b) => b.eligibilityScore - a.eligibilityScore).map(r => (
            <Card key={r.id} className={r.eligibilityScore >= 75 ? "border-emerald-500/30" : ""}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <span className="font-medium text-sm">{r.subkonName}</span>
                    {r.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-2">{r.stageCode}</span>}
                  </div>
                  <div className={`text-lg font-bold ${r.eligibilityScore >= 75 ? "text-emerald-500" : r.eligibilityScore >= 50 ? "text-amber-500" : "text-red-500"}`}>{r.eligibilityScore}%</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { label: "Konstruksi Selesai", ok: r.isCompleted },
                    { label: "Progress 100%", ok: r.progress100 },
                    { label: "Tidak Ada Tagihan Pending", ok: r.noPendingBills },
                    { label: "Status Retensi Siap", ok: r.retentionEligible || r.retentionStatus === "sudah_cair" },
                  ].map(item => (
                    <div key={item.label} className={`flex items-center gap-1.5 p-2 rounded ${item.ok ? "bg-emerald-500/10" : "bg-muted"}`}>
                      {item.ok ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> : <XCircle className="size-3.5 text-muted-foreground shrink-0" />}
                      <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
