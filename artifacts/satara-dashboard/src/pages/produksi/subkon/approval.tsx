import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type Approval = {
  id: number; paymentId: number; step: string; approvedBy: string | null; status: string; notes: string | null;
  payment: { id: number; terminNumber: number | null; progressCurrent: number; netPayment: number | null; status: string } | null;
  contract: { id: number; subkonName: string; stageCode: string | null } | null;
};

const STEPS: Record<string, string> = {
  pengawas: "Pengawas Lapangan", qc: "QC Inspector", manager: "Site Manager", finance: "Finance",
};

export default function SubkonApproval() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["payment-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/subkon/approvals");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Approval[]>;
    },
  });

  const resubmit = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await fetch(`/api/finance/approval/subkon/${paymentId}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submittedBy: "produksi" }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Gagal submit ulang"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-approvals"] });
      toast({ title: "Pengajuan berhasil disubmit ulang ke Finance" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const allPayments = approvals ?? [];
  const grouped = new Map<number, Approval[]>();
  allPayments.forEach(a => {
    const existing = grouped.get(a.paymentId) ?? [];
    grouped.set(a.paymentId, [...existing, a]);
  });

  const pending = Array.from(grouped.entries()).filter(([, steps]) => steps.some(s => s.status === "pending"));
  const rejected = Array.from(grouped.entries()).filter(([, steps]) => steps.some(s => s.status === "rejected") && steps.every(s => s.status !== "pending") && steps[0]?.payment?.status !== "paid");
  const approved = Array.from(grouped.entries()).filter(([, steps]) => steps.every(s => s.status === "approved" || s.payment?.status === "paid") && steps[0]?.payment?.status !== "paid");
  const paid = Array.from(grouped.entries()).filter(([, steps]) => steps[0]?.payment?.status === "paid");

  function renderGroup(entries: [number, Approval[]][], label: string, borderClass: string) {
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        {entries.map(([paymentId, steps]) => {
          const first = steps[0];
          const isRejected = steps.some(s => s.status === "rejected");
          return (
            <Card key={paymentId} className={`border ${borderClass}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-sm">{first.contract?.subkonName ?? "—"} {first.contract?.stageCode ? `(${first.contract.stageCode})` : ""}</span>
                    <span className="text-xs text-muted-foreground ml-2">— Termin T{first.payment?.terminNumber ?? "?"} — {fmtRp(first.payment?.netPayment ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Progress: {first.payment?.progressCurrent}%</span>
                    {isRejected && first.payment?.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => resubmit.mutate(paymentId)}
                        disabled={resubmit.isPending}
                      >
                        <RefreshCw className="size-3" /> Submit Ulang
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {steps.map(step => (
                    <div key={step.id} className={`rounded-lg border p-2.5 ${step.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : step.status === "rejected" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {step.status === "approved" ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : step.status === "rejected" ? <XCircle className="size-3.5 text-red-500" /> : <Clock className="size-3.5 text-amber-500" />}
                        <span className="text-xs font-medium">{STEPS[step.step] ?? step.step}</span>
                      </div>
                      {step.status === "pending" && <Badge variant="outline" className="text-[10px]">Menunggu</Badge>}
                      {step.status === "rejected" && <Badge variant="destructive" className="text-[10px]">Ditolak</Badge>}
                      {step.status === "approved" && <Badge className="text-[10px] bg-emerald-600">Disetujui</Badge>}
                      {step.notes && <p className="text-[10px] text-muted-foreground mt-1 truncate" title={step.notes}>{step.notes}</p>}
                      {step.approvedBy && <p className="text-[10px] text-muted-foreground mt-0.5">oleh: {step.approvedBy}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Monitoring Approval Pembayaran Subkon</h1>
        <p className="text-sm text-muted-foreground">Pantau status approval. Jika ditolak Finance, klik "Submit Ulang" untuk mengajukan kembali.</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className={`text-xl font-bold ${pending.length > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{pending.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Disetujui</p>
          <p className="text-xl font-bold text-emerald-500">{approved.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Ditolak</p>
          <p className="text-xl font-bold text-red-500">{rejected.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Dibayar</p>
          <p className="text-xl font-bold text-blue-500">{paid.length}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat approval queue...</div>
      ) : grouped.size === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan pembayaran</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {renderGroup(pending, "Menunggu Approval", "border-amber-500/20")}
          {renderGroup(rejected, "Ditolak — Perlu Submit Ulang", "border-red-500/20")}
          {renderGroup(approved, "Disetujui (Belum Dibayar)", "border-emerald-500/20")}
          {renderGroup(paid, "Sudah Dibayar", "border-muted")}
        </div>
      )}
    </div>
  );
}
