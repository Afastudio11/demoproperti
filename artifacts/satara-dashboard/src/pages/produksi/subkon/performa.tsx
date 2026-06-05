import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const fmtPct = (n: number) => `${Math.round(n)}%`;

type Contract = { id: number; subkonName: string; stageCode: string | null; unitCount: number; contractValue: number; totalRetention: number; status: string };
type Payment = { id: number; contractId: number; terminNumber: number | null; progressCurrent: number; velocity: number | null; netPayment: number | null; status: string };

export default function SubkonPerforma() {
  const { data: contracts, isLoading: loadingC } = useQuery({
    queryKey: ["subkon-contracts"],
    queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; },
  });

  const { data: payments } = useQuery({
    queryKey: ["subkon-payments"],
    queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; },
  });

  const performa = (contracts ?? []).map(c => {
    const cp = (payments ?? []).filter(p => p.contractId === c.id);
    const paidPayments = cp.filter(p => p.status === "paid");
    const lastPayment = paidPayments.sort((a, b) => (b.terminNumber ?? 0) - (a.terminNumber ?? 0))[0];
    const progressAktual = lastPayment?.progressCurrent ?? 0;
    const velocity = lastPayment?.velocity ?? 0;
    const totalPaid = paidPayments.reduce((s, p) => s + (p.netPayment ?? 0), 0);
    const pendingCount = cp.filter(p => p.status === "pending_approval").length;
    const eligibilityScore = Math.min(100, progressAktual + (pendingCount === 0 ? 10 : 0));
    return { ...c, progressAktual, velocity, totalPaid, pendingCount, terminCount: paidPayments.length, eligibilityScore };
  }).sort((a, b) => b.eligibilityScore - a.eligibilityScore);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Performa Subkon</h1>
        <p className="text-sm text-muted-foreground">Rangkuman kinerja semua subkontraktor aktif</p>
      </div>

      {loadingC ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data...</div>
      ) : performa.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Belum ada kontrak. <Link href="/produksi/subkon/kontrak" className="underline">Tambah kontrak</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {performa.map(c => (
            <Card key={c.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{c.subkonName}</span>
                      {c.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.stageCode}</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === "aktif" ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600"}`}>{c.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.progressAktual >= 90 ? "bg-emerald-500" : c.progressAktual >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${c.progressAktual}%` }} />
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{fmtPct(c.progressAktual)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div><span className="text-muted-foreground block">Unit</span><span className="font-medium">{c.unitCount}</span></div>
                      <div><span className="text-muted-foreground block">Velocity</span>
                        <span className={`font-medium flex items-center gap-0.5 ${c.velocity >= 10 ? "text-emerald-600" : c.velocity >= 5 ? "text-blue-600" : "text-amber-600"}`}>
                          {c.velocity >= 10 ? <TrendingUp className="size-3" /> : c.velocity >= 5 ? <Minus className="size-3" /> : <TrendingDown className="size-3" />}
                          {fmtPct(c.velocity)}/termin
                        </span>
                      </div>
                      <div><span className="text-muted-foreground block">Termin Dibayar</span><span className="font-medium">{c.terminCount}x</span></div>
                      <div><span className="text-muted-foreground block">Total Dibayar</span><span className="font-medium">{fmtRp(c.totalPaid)}</span></div>
                      <div><span className="text-muted-foreground block">Nilai Kontrak</span><span className="font-medium">{fmtRp(c.contractValue)}</span></div>
                    </div>
                    {c.pendingCount > 0 && <p className="text-[10px] text-amber-500 mt-1">{c.pendingCount} tagihan menunggu approval</p>}
                  </div>
                  <div className="text-center shrink-0">
                    <div className={`text-2xl font-bold ${c.eligibilityScore >= 80 ? "text-emerald-500" : c.eligibilityScore >= 60 ? "text-amber-500" : "text-red-500"}`}>{c.eligibilityScore}</div>
                    <div className="text-[10px] text-muted-foreground">Skor</div>
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
