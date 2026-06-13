import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Download, Lock, ReceiptText, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function paymentProofUrl(paymentId: number) {
  const token = btoa(`subkon-payment:${paymentId}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${window.location.origin}/public/payment-proof/${token}`;
}

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
    lockedAt?: string | null;
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

const STEP_FULL: Record<string, string> = {
  pengawas: "Pengawas Lapangan",
  qc: "QC Inspector",
  manager: "Site Manager",
  finance: "Finance",
};

async function downloadReceipt(items: Approval[]) {
  const first = items[0];
  const p = first.payment;
  const c = first.contract;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;

  // Grayscale color palette
  const black       = [0, 0, 0] as [number, number, number];
  const darkGrey    = [60, 60, 60] as [number, number, number];
  const mediumGrey  = [120, 120, 120] as [number, number, number];
  const borderGrey  = [210, 210, 210] as [number, number, number];
  const lightBg     = [248, 248, 248] as [number, number, number];
  const white       = [255, 255, 255] as [number, number, number];

  const docId = `SPK-${String(c?.id ?? 0).padStart(4, "0")}-T${p?.terminNumber ?? "?"}-${String(first.paymentId).padStart(5, "0")}`;
  const tanggal = p?.paymentDate ?? new Date().toISOString().split("T")[0];
  const generatedAt = new Date().toLocaleString("id-ID");
  const isPaid = true;
  const docTitle = "BUKTI PEMBAYARAN SUBKONTRAKTOR";
  const statusText = "LUNAS / PAID";

  // QR membuka halaman bukti bayar public tanpa login.
  const qrText = paymentProofUrl(first.paymentId);

  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: 250, margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // ── TOP DECORATIVE BORDER ──────────────────────────────────────────────────
  doc.setFillColor(...black);
  doc.rect(0, 0, W, 4, "F");

  // ── HEADER SECTION (Clean corporate style) ──────────────────────────────────
  doc.setTextColor(...black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SATARA DEVELOPMENT", M, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkGrey);
  doc.text("Internal Operations Dashboard  ·  Divisi Keuangan", M, 22);

  // Title
  doc.setTextColor(...black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(docTitle, M, 34);

  // Status badge (Black & White border style)
  const badgeW = isPaid ? 26 : 42;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...black);
  doc.setLineWidth(0.4);
  doc.roundedRect(W - M - badgeW, 28, badgeW, 9, 1.5, 1.5, "FD");
  doc.setTextColor(...black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(statusText, W - M - (badgeW / 2), 34, { align: "center" });

  // Doc ID & Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkGrey);
  doc.text(docId, W - M, 16, { align: "right" });
  doc.text(`Tanggal: ${tanggal}`, W - M, 22, { align: "right" });

  // ── SUBHEADER / META STRIP ─────────────────────────────────────────────────
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);
  doc.rect(M, 42, W - 2 * M, 10, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkGrey);
  doc.text(`Nomor Dokumen: ${docId}`, M + 4, 48.5);
  doc.text(`Dicetak: ${generatedAt}`, W - M - 4, 48.5, { align: "right" });

  let y = 60;

  // ── LEFT INFO + RIGHT QR ────────────────────────────────────────────────────
  const qrSize = 42;
  const qrX = W - M - qrSize;
  const qrY = y;

  // QR background card (Taller to prevent text overflowing outside bottom border)
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 18, 2, 2, "FD");
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...darkGrey);
  doc.text("Scan QR untuk verifikasi", qrX + qrSize / 2, qrY + qrSize + 7, { align: "center" });
  doc.text("pembayaran ini", qrX + qrSize / 2, qrY + qrSize + 11, { align: "center" });

  // Left info block
  const infoColW = qrX - M - 10;

  const drawField = (label: string, value: string, fx: number, fy: number, fw: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...mediumGrey);
    doc.text(label.toUpperCase(), fx, fy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...black);
    doc.text(value, fx, fy + 5.5);
  };

  const halfW = (infoColW - 6) / 2;

  drawField("Nama Subkontraktor", c?.subkonName ?? "-", M, y + 2, infoColW);
  drawField("Proyek / Tahap", `#${c?.projectId ?? "-"} / ${c?.stageCode ?? "-"}`, M, y + 17, halfW);
  drawField("Jumlah Unit", `${c?.unitCount ?? 0} unit`, M + halfW + 6, y + 17, halfW);
  drawField("Termin ke-", `T${p?.terminNumber ?? "-"}`, M, y + 32, halfW);
  drawField("Tanggal Bayar", tanggal, M + halfW + 6, y + 32, halfW);

  y = Math.max(y + qrSize + 22, y + 52);

  // ── DIVISION LINE ──────────────────────────────────────────────────────────
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── PROGRESS SECTION ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...black);
  doc.text("PROGRESS PEKERJAAN", M, y);
  y += 5;

  const progW = (W - 2 * M - 8) / 3;
  const progBoxes = [
    { label: "Progress Sebelum", value: `${p?.progressPrevious ?? 0}%` },
    { label: "Progress Sekarang", value: `${p?.progressCurrent ?? 0}%` },
    { label: "Velocity (delta)", value: `${p?.velocity ?? 0}%` },
  ];

  progBoxes.forEach((box, i) => {
    const bx = M + i * (progW + 4);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGrey);
    doc.setLineWidth(0.25);
    doc.roundedRect(bx, y, progW, 18, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...mediumGrey);
    doc.text(box.label, bx + progW / 2, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...black);
    doc.text(box.value, bx + progW / 2, y + 14, { align: "center" });
  });

  y += 24;

  // ── FINANCIAL BREAKDOWN ────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...black);
  doc.text("RINCIAN KEUANGAN", M, y);
  y += 5;

  const tableRows = [
    { label: "Nilai Kontrak Total", value: fmtRp(c?.contractValue ?? 0), sub: true },
    { label: "Nilai Termin", value: fmtRp(p?.grossEligibleAmount ?? 0), sub: false },
    { label: `Retensi (${c && p ? Math.round(((p.retentionDeducted ?? 0) / Math.max(p.grossEligibleAmount ?? 1, 1)) * 100) : 0}%)`, value: `– ${fmtRp(p?.retentionDeducted ?? 0)}`, sub: false },
  ];

  for (const row of tableRows) {
    doc.setFillColor(row.sub ? 250 : 243, row.sub ? 250 : 243, row.sub ? 250 : 243);
    doc.rect(M, y, W - 2 * M, 8.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(row.sub ? 140 : 50, row.sub ? 140 : 50, row.sub ? 140 : 50);
    doc.text(row.label, M + 4, y + 6);
    doc.setFont("helvetica", row.sub ? "normal" : "bold");
    doc.setTextColor(row.sub ? 140 : 30, row.sub ? 140 : 30, row.sub ? 140 : 30);
    doc.text(row.value, W - M - 4, y + 6, { align: "right" });
    y += 9.5;
  }

  // Jumlah dibayar — highlighted solid dark grey row
  doc.setFillColor(...black);
  doc.roundedRect(M, y, W - 2 * M, 13, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...white);
  doc.text("JUMLAH DIBAYAR", M + 5, y + 8.5);
  doc.setFontSize(13);
  doc.text(fmtRp(p?.netPayment ?? 0), W - M - 5, y + 8.5, { align: "right" });
  y += 18;

  if (p?.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...mediumGrey);
    doc.text(`Catatan: ${p.notes}`, M, y);
    y += 7;
  }

  // ── DIVISION LINE ──────────────────────────────────────────────────────────
  doc.setDrawColor(...borderGrey);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── APPROVAL CHAIN ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...black);
  doc.text("RANTAI PERSETUJUAN (CHAIN OF APPROVAL)", M, y);
  y += 5;

  const stepOrder = items.map(item => item.step);
  const stepW2 = (W - 2 * M - Math.max(0, stepOrder.length - 1) * 3) / Math.max(1, stepOrder.length);

  stepOrder.forEach((stepKey, idx) => {
    const found = items.find(i => i.step === stepKey);
    const status = found?.status ?? "pending";
    const approvedBy = found?.approvedBy;

    const sx = M + idx * (stepW2 + 3);
    const isApproved = status === "approved";
    const isRejected = status === "rejected";

    // Clean Grayscale styling
    const fillCol: [number, number, number] = isApproved ? [240, 240, 240] : isRejected ? [245, 245, 245] : [252, 252, 252];
    const borderCol: [number, number, number] = isApproved ? black : isRejected ? darkGrey : borderGrey;

    doc.setFillColor(...fillCol);
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(isApproved ? 0.45 : 0.25);
    doc.roundedRect(sx, y, stepW2, 19, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...black);
    doc.text(STEP_FULL[stepKey] ?? stepKey, sx + stepW2 / 2, y + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const statusLabel = isApproved ? "Disetujui" : isRejected ? "Ditolak" : "Menunggu";
    doc.setTextColor(...(isApproved ? black : mediumGrey));
    doc.text(statusLabel, sx + stepW2 / 2, y + 12, { align: "center" });

    if (approvedBy) {
      doc.setFontSize(6.5);
      doc.setTextColor(...darkGrey);
      doc.text(`oleh: ${approvedBy}`, sx + stepW2 / 2, y + 17, { align: "center" });
    }

    // Connector line
    if (idx < 3) {
      doc.setDrawColor(...borderGrey);
      doc.setLineWidth(0.3);
      const arrowX = sx + stepW2 + 1.5;
      doc.line(arrowX - 0.5, y + 9.5, arrowX + 2, y + 9.5);
    }
  });

  y += 26;

  // ── SIGNATURE AREA ─────────────────────────────────────────────────────────
  doc.setDrawColor(...borderGrey);
  doc.line(M, y, W - M, y);
  y += 8;

  const sigLabels = ["Dibuat Oleh\nAdmin Produksi", "Diperiksa\nSite Manager", "Disetujui\nFinance"];
  const sigW = (W - 2 * M - 12) / 3;

  sigLabels.forEach((label, i) => {
    const sx = M + i * (sigW + 6);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGrey);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, sigW, 30, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...darkGrey);
    label.split("\n").forEach((line, li) => {
      doc.text(line, sx + sigW / 2, y + 6.5 + li * 5, { align: "center" });
    });

    // Signature line
    doc.setDrawColor(...mediumGrey);
    doc.setLineWidth(0.4);
    doc.line(sx + 8, y + 24, sx + sigW - 8, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...mediumGrey);
    doc.text("( tanda tangan )", sx + sigW / 2, y + 28, { align: "center" });
  });

  y += 38;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...black);
  doc.rect(0, 285, W, 12, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(200, 200, 200);
  doc.text(
    "Dokumen ini diterbitkan secara digital oleh sistem Satara Development. Scan QR code di pojok kanan atas untuk memverifikasi keaslian.",
    W / 2, 290, { align: "center" }
  );
  doc.text(
    `${docId}  ·  Digenerate: ${generatedAt}  ·  Satara Development © ${new Date().getFullYear()}`,
    W / 2, 294, { align: "center" }
  );

  doc.save(`${isPaid ? docId : `${docId}-APPROVED`}.pdf`);
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
    mutationFn: (paymentId: number) =>
      fetch(`/api/finance/approval/subkon-payments/${paymentId}/mark-paid`, { method: "PATCH" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-approval-subkon"] });
      toast({ title: "Pembayaran ditandai paid" });
    },
  });

  const lockPayment = useMutation({
    mutationFn: (paymentId: number) =>
      fetch(`/api/finance/approval/subkon-payments/${paymentId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockedBy: "Finance" }),
      }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-approval-subkon"] });
      toast({ title: "Pembayaran berhasil dikunci" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
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
      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Memuat approval...</div>
      ) : grouped.map(items => {
        const first = items[0];
        const p = first.payment;
        const c = first.contract;
        const financeStep = items.find(i => i.step === "finance") ?? first;
        const isLocked = !!p?.lockedAt;

        return (
          <Card key={first.paymentId}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{c?.subkonName ?? "-"}</h2>
                    <Badge variant="outline">Termin {p?.terminNumber ?? "-"}</Badge>
                    <Badge className={p?.status === "paid" ? "bg-emerald-600" : ""}>{p?.status ?? "-"}</Badge>
                    {isLocked && <Badge variant="outline" className="gap-1 text-muted-foreground"><Lock className="size-2.5" /> Terkunci</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proyek #{c?.projectId ?? "-"} · Tahap {c?.stageCode ?? "-"} · {c?.unitCount ?? 0} unit
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{fmtRp(p?.netPayment ?? 0)}</div>
                  <div className="text-[11px] text-muted-foreground">jumlah dibayar</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Progress</span><div className="font-semibold">{p?.progressPrevious ?? 0}% {"→"} {p?.progressCurrent ?? 0}%</div></div>
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Velocity</span><div className="font-semibold">{p?.velocity ?? 0}%</div></div>
                <div className="rounded-md bg-muted/40 p-2"><span className="text-muted-foreground">Nilai Termin</span><div className="font-semibold">{fmtRp(p?.grossEligibleAmount ?? 0)}</div></div>
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
                {p?.status === "approved" && (
                  <Button size="sm" onClick={() => markPaid.mutate(first.paymentId)}>
                    <ReceiptText className="size-3.5 mr-1" /> Tandai Paid
                  </Button>
                )}
                {p?.status === "paid" && !isLocked && (
                  <Button size="sm" variant="outline" className="gap-1.5 border-slate-300 text-slate-600" onClick={() => lockPayment.mutate(first.paymentId)} disabled={lockPayment.isPending}>
                    <Lock className="size-3.5" /> Kunci Pembayaran
                  </Button>
                )}
                {(p?.status === "approved" || p?.status === "paid") && (
                  <Button size="sm" variant="outline" onClick={() => downloadReceipt(items)}>
                    <Download className="size-3.5 mr-1" /> {p?.status === "paid" ? "PDF Bukti Bayar" : "PDF Approval"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
