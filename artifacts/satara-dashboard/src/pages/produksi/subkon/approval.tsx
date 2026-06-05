import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
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
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["payment-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/subkon/approvals");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Approval[]>;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      const res = await fetch(`/api/produksi/subkon/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approvedBy: "Admin" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-approvals"] });
      toast({ title: vars.status === "approved" ? "Disetujui" : "Ditolak" });
    },
  });

  const pending = (approvals ?? []).filter(a => a.status === "pending");
  const done = (approvals ?? []).filter(a => a.status !== "pending");

  const grouped = new Map<number, Approval[]>();
  pending.forEach(a => {
    const existing = grouped.get(a.paymentId) ?? [];
    grouped.set(a.paymentId, [...existing, a]);
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Approval Pembayaran Subkon</h1>
        <p className="text-sm text-muted-foreground">4 tahap approval: Pengawas → QC → Manager → Finance</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Pending Approval</p>
          <p className={`text-xl font-bold ${pending.length > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{pending.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Disetujui</p>
          <p className="text-xl font-bold text-emerald-500">{done.filter(a => a.status === "approved").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Ditolak</p>
          <p className="text-xl font-bold text-red-500">{done.filter(a => a.status === "rejected").length}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat approval queue...</div>
      ) : grouped.size === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Tidak ada pending approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([paymentId, steps]) => {
            const first = steps[0];
            return (
              <Card key={paymentId} className="border-amber-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-sm">{first.contract?.subkonName ?? "—"} {first.contract?.stageCode ? `(${first.contract.stageCode})` : ""}</span>
                      <span className="text-xs text-muted-foreground ml-2">— Termin T{first.payment?.terminNumber ?? "?"} — {fmtRp(first.payment?.netPayment ?? 0)}</span>
                    </div>
                    <span className="text-xs text-amber-500">Progress: {first.payment?.progressCurrent}%</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {steps.map(step => (
                      <div key={step.id} className={`rounded-lg border p-2.5 ${step.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : step.status === "rejected" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          {step.status === "approved" ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : step.status === "rejected" ? <XCircle className="size-3.5 text-red-500" /> : <Clock className="size-3.5 text-amber-500" />}
                          <span className="text-xs font-medium">{STEPS[step.step] ?? step.step}</span>
                        </div>
                        {step.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-[10px] px-2 flex-1" onClick={() => approveMutation.mutate({ id: step.id, status: "approved" })}>Setuju</Button>
                            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={() => approveMutation.mutate({ id: step.id, status: "rejected" })}>Tolak</Button>
                          </div>
                        )}
                        {step.status !== "pending" && step.approvedBy && (
                          <p className="text-[10px] text-muted-foreground">oleh: {step.approvedBy}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
