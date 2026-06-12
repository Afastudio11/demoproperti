import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Download, ReceiptText, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

type Approval = {
  id: number;
  paymentId: number;
  step: string;
  status: string;
  approvedBy: string | null;
  notes: string | null;
  payment: {
    id: number;
    terminNumber: number | null;
    progressPrevious: number;
    progressCurrent: number;
    velocity: number | null;
    grossEligibleAmount: number | null;
    retentionDeducted: number | null;
    netPayment: number | null;
    status: string;
    notes: string | null;
    paymentDate: string | null;
  } | null;
  contract: {
    id: number;
    projectId: number;
    subkonName: string;
    stageCode: string | null;
    unitCount: number;
    contractValue: number;
    totalRetention: number;
  } | null;
};

const STEPS: Record<string, string> = {
  pengawas: "Pengawas",
  qc: "QC",
  manager: "Manager",
  finance: "Finance",
};

function downloadReceipt(a: Approval) {
  const doc = new jsPDF();
  const p = a.payment;
  const c = a.contract;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BUKTI BAYAR SUBKON", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Tanggal: ${p?.paymentDate ?? new Date().toISOString().split("T")[0]}`, 14, 28);
  doc.text(`Subkon: ${c?.subkonName ?? "-"}`, 14, 38);
  doc.text(`Proyek ID: ${c?.projectId ?? "-"} / Tahap: ${c?.stageCode ?? "-"}`, 14, 46);
  doc.text(`Termin: ${p?.terminNumber ?? "-"}`, 14, 54);
  doc.text(`Progress: ${p?.progressPrevious ?? 0}% -> ${p?.progressCurrent ?? 0}%`, 14, 62);
  doc.text(`Nilai Kotor: ${fmtRp(p?.grossEligibleAmount ?? 0)}`, 14, 72);
  doc.text(`Retensi: ${fmtRp(p?.retentionDeducted ?? 0)}`, 14, 80);
  doc.setFont("helvetica", "bold");
  doc.text(`Net Dibayar: ${fmtRp(p?.netPayment ?? 0)}`, 14, 90);
  doc.setFont("helvetica", "normal");
  doc.text(`Catatan: ${p?.notes ?? "-"}`, 14, 102);
  doc.text("Disetujui Finance", 140, 130);
  doc.line(135, 150, 190, 150);
  doc.save(`bukti-bayar-subkon-${a.paymentId}.pdf`);
}

export default function FinanceApproval() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ["finance-approval-subkon"],
    queryFn: () => fetch("/api/finance/approval/subkon").then(r => r.json()) as Promise<Approval[]>,
  });

  const approve = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      fetch(`/api/finance/approval/subkon/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approvedBy: "Finance" }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-approval-subkon"] });
      toast({ title: "Status approval diperbarui" });
    },
  });

  const markPaid = useMutation({
    mutationFn: (paymentId: number) => fetch(`/api/finance/approval/subkon-payments/${paymentId}/mark-paid`, { method: "PATCH" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-approval-subkon"] });
      toast({ title: "Pembayaran ditandai paid" });
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<number, Approval[]>();
    data.forEach(a => map.set(a.paymentId, [...(map.get(a.paymentId) ?? []), a]));
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Approval Subkon</h1>
        <p className="text-sm text-muted-foreground">Mirror pengajuan termin dari Produksi, diproses oleh Finance.</p>
      </div>
      {isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Memuat approval...</div> : grouped.map(items => {
        const first = items[0];
        const p = first.payment;
        const c = first.contract;
        const financeStep = items.find(i => i.step === "finance") ?? first;
        return (
          <Card key={first.paymentId}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{c?.subkonName ?? "-"}</h2>
                    <Badge variant="outline">Termin {p?.terminNumber ?? "-"}</Badge>
                    <Badge>{p?.status ?? "-"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Proyek #{c?.projectId ?? "-"} · Tahap {c?.stageCode ?? "-"} · {c?.unitCount ?? 0} unit</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{fmtRp(p?.netPayment ?? 0)}</div>
                  <div className="text-[11px] text-muted-foreground">net payment</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Progress</span><div className="font-semibold">{p?.progressPrevious ?? 0}% {"->"} {p?.progressCurrent ?? 0}%</div></div>
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Velocity</span><div className="font-semibold">{p?.velocity ?? 0}%</div></div>
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Gross</span><div className="font-semibold">{fmtRp(p?.grossEligibleAmount ?? 0)}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Retensi</span><div className="font-semibold">{fmtRp(p?.retentionDeducted ?? 0)}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Catatan</span><div className="font-semibold truncate">{p?.notes ?? "-"}</div></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {items.map(step => (
                  <div key={step.id} className="rounded-md border p-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {step.status === "approved" ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : step.status === "rejected" ? <XCircle className="size-3.5 text-red-500" /> : <Clock className="size-3.5 text-amber-500" />}
                      {STEPS[step.step] ?? step.step}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{step.status}{step.approvedBy ? ` oleh ${step.approvedBy}` : ""}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {financeStep.status === "pending" && (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => approve.mutate({ id: financeStep.id, status: "rejected" })}>Reject</Button>
                    <Button size="sm" onClick={() => approve.mutate({ id: financeStep.id, status: "approved" })}>Approve Finance</Button>
                  </>
                )}
                {p?.status === "approved" && <Button size="sm" onClick={() => markPaid.mutate(first.paymentId)}><ReceiptText className="size-3.5 mr-1" /> Tandai Paid</Button>}
                {p?.status === "paid" && <Button size="sm" variant="outline" onClick={() => downloadReceipt(first)}><Download className="size-3.5 mr-1" /> PDF Bukti Bayar</Button>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
