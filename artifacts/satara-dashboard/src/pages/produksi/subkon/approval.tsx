import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import QRCode from "@/lib/browser-shims/qrcode";

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
  pengawas: "Pengawas Lapangan", qc: "QC Inspector", manager: "Site Manager", finance: "Finance",
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

  const navy    = [15, 23, 42] as [number, number, number];
  const emerald = [5, 150, 105] as [number, number, number];
  const slate   = [71, 85, 105] as [number, number, number];
  const slate50 = [248, 250, 252] as [number, number, number];
  const slate100= [241, 245, 249] as [number, number, number];
  const slate200= [226, 232, 240] as [number, number, number];
  const white   = [255, 255, 255] as [number, number, number];

  const docId = `SPK-${String(c?.id ?? 0).padStart(4, "0")}-T${p?.terminNumber ?? "?"}-${String(first.paymentId).padStart(5, "0")}`;
  const tanggal = p?.paymentDate ?? new Date().toISOString().split("T")[0];
  const generatedAt = new Date().toLocaleString("id-ID");
  const isPaid = p?.status === "paid";
  const docTitle = isPaid ? "BUKTI PEMBAYARAN SUBKONTRAKTOR" : "BUKTI APPROVAL PEMBAYARAN SUBKONTRAKTOR";
  const statusText = isPaid ? "LUNAS / PAID" : "APPROVED / SIAP BAYAR";

  // ── QR Code (generated first so we can place it later) ─────────────────────
  const qrText = [
    "SATARA DEVELOPMENT - PAYMENT VERIFICATION",
    `Doc No : ${docId}`,
    `Subkon : ${c?.subkonName ?? "-"}`,
    `Proyek : #${c?.projectId ?? "-"} / Tahap ${c?.stageCode ?? "-"}`,
    `Termin : T${p?.terminNumber ?? "?"}`,
    `Gross  : ${fmtRp(p?.grossEligibleAmount ?? 0)}`,
    `Retensi: ${fmtRp(p?.retentionDeducted ?? 0)}`,
    `Net    : ${fmtRp(p?.netPayment ?? 0)}`,
    `Tgl    : ${tanggal}`,
    `Status : ${statusText}`,
    `Ref    : ${docId}`,
  ].join("\n");

  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: 250, margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 46, "F");

  // Accent stripe
  doc.setFillColor(...emerald);
  doc.rect(0, 0, 4, 46, "F");

  // Company name
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SATARA DEVELOPMENT", M + 2, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Internal Operations Dashboard  ·  Divisi Keuangan", M + 2, 22);

  // Title + badge
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(docTitle, M + 2, 34);

  // Status badge
  const badgeW = isPaid ? 26 : 42;
  doc.setFillColor(...emerald);
  doc.roundedRect(W - M - badgeW, 28, badgeW, 10, 2, 2, "F");
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(statusText, W - M - (badgeW / 2), 34.5, { align: "center" });

  // Doc ID + date (top right, inside header)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(docId, W - M, 15, { align: "right" });
  doc.text(`Tanggal: ${tanggal}`, W - M, 22, { align: "right" });

  // ── SUBHEADER / META STRIP ─────────────────────────────────────────────────
  doc.setFillColor(...slate100);
  doc.rect(0, 46, W, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slate);
  doc.text(`Nomor Dokumen: ${docId}`, M + 2, 53.5);
  doc.text(`Dicetak: ${generatedAt}`, W - M, 53.5, { align: "right" });

  let y = 66;

  // ── LEFT INFO + RIGHT QR ────────────────────────────────────────────────────
  const qrSize = 46;
  const qrX = W - M - qrSize;
  const qrY = y;

  // QR background card
  doc.setFillColor(...slate50);
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 14, 2, 2, "FD");
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...slate);
  doc.text("Scan QR untuk verifikasi", qrX + qrSize / 2, qrY + qrSize + 7, { align: "center" });
  doc.text("pembayaran ini", qrX + qrSize / 2, qrY + qrSize + 11, { align: "center" });

  // Left info block
  const infoColW = qrX - M - 10;

  const drawField = (label: string, value: string, fx: number, fy: number, fw: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    doc.text(label.toUpperCase(), fx, fy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...navy);
    doc.text(value, fx, fy + 5.5);
  };

  const halfW = (infoColW - 6) / 2;

  drawField("Nama Subkontraktor", c?.subkonName ?? "-", M, y + 2, infoColW);
  drawField("Proyek / Tahap", `#${c?.projectId ?? "-"} / ${c?.stageCode ?? "-"}`, M, y + 17, halfW);
  drawField("Jumlah Unit", `${c?.unitCount ?? 0} unit`, M + halfW + 6, y + 17, halfW);
  drawField("Termin ke-", `T${p?.terminNumber ?? "-"}`, M, y + 32, halfW);
  drawField("Tanggal Bayar", tanggal, M + halfW + 6, y + 32, halfW);

  y = Math.max(y + qrSize + 16, y + 52);

  // ── DIVIDER ────────────────────────────────────────────────────────────────
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── PROGRESS SECTION ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navy);
  doc.text("PROGRESS PEKERJAAN", M, y);
  y += 5;

  const progW = (W - 2 * M - 8) / 3;
  const progBoxes = [
    { label: "Progress Sebelum", value: `${p?.progressPrevious ?? 0}%`, color: slate },
    { label: "Progress Sekarang", value: `${p?.progressCurrent ?? 0}%`, color: emerald },
    { label: "Velocity (delta)", value: `${p?.velocity ?? 0}%`, color: [59, 130, 246] as [number, number, number] },
  ];

  progBoxes.forEach((box, i) => {
    const bx = M + i * (progW + 4);
    doc.setFillColor(...slate100);
    doc.roundedRect(bx, y, progW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    doc.text(box.label, bx + progW / 2, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...box.color);
    doc.text(box.value, bx + progW / 2, y + 14.5, { align: "center" });
  });

  y += 24;

  // ── FINANCIAL BREAKDOWN ────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navy);
  doc.text("RINCIAN KEUANGAN", M, y);
  y += 5;

  const tableRows = [
    { label: "Nilai Kontrak Total", value: fmtRp(c?.contractValue ?? 0), sub: true },
    { label: "Gross Eligible Termin ini", value: fmtRp(p?.grossEligibleAmount ?? 0), sub: false },
    { label: `Retensi (${c && p ? Math.round(((p.retentionDeducted ?? 0) / Math.max(p.grossEligibleAmount ?? 1, 1)) * 100) : 0}%)`, value: `– ${fmtRp(p?.retentionDeducted ?? 0)}`, sub: false },
  ];

  for (const row of tableRows) {
    doc.setFillColor(row.sub ? 248 : 243, row.sub ? 250 : 244, row.sub ? 252 : 246);
    doc.rect(M, y, W - 2 * M, 8.5, "F");
    doc.setFont("helvetica", row.sub ? "normal" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(row.sub ? 148 : 51, row.sub ? 163 : 65, row.sub ? 184 : 85);
    doc.text(row.label, M + 4, y + 6);
    doc.setFont("helvetica", row.sub ? "normal" : "bold");
    doc.setTextColor(row.sub ? 148 : 30, row.sub ? 163 : 41, row.sub ? 184 : 59);
    doc.text(row.value, W - M - 4, y + 6, { align: "right" });
    y += 9.5;
  }

  // Net payment — highlighted green row
  doc.setFillColor(...emerald);
  doc.roundedRect(M, y, W - 2 * M, 13, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...white);
  doc.text("NET DIBAYARKAN", M + 5, y + 9);
  doc.setFontSize(13);
  doc.text(fmtRp(p?.netPayment ?? 0), W - M - 5, y + 9, { align: "right" });
  y += 19;

  if (p?.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Catatan: ${p.notes}`, M, y);
    y += 7;
  }

  // ── DIVIDER ────────────────────────────────────────────────────────────────
  doc.setDrawColor(...slate200);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── APPROVAL CHAIN ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navy);
  doc.text("RANTAI PERSETUJUAN (CHAIN OF APPROVAL)", M, y);
  y += 5;

  const stepOrder = ["pengawas", "qc", "manager", "finance"];
  const stepW2 = (W - 2 * M - 9) / 4;

  stepOrder.forEach((stepKey, idx) => {
    const found = items.find(i => i.step === stepKey);
    const status = found?.status ?? "pending";
    const approvedBy = found?.approvedBy;

    const sx = M + idx * (stepW2 + 3);
    const isApproved = status === "approved";
    const isRejected = status === "rejected";
    const fillColor: [number, number, number] = isApproved ? emerald : isRejected ? [220, 38, 38] : [100, 116, 139];

    doc.setFillColor(...fillColor);
    doc.roundedRect(sx, y, stepW2, 19, 2, 2, "F");

    // Step icon
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...white);
    doc.text(STEP_FULL[stepKey] ?? stepKey, sx + stepW2 / 2, y + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const statusLabel = isApproved ? "Disetujui" : isRejected ? "Ditolak" : "Menunggu";
    doc.text(statusLabel, sx + stepW2 / 2, y + 12, { align: "center" });

    if (approvedBy) {
      doc.setFontSize(6.5);
      doc.text(`oleh: ${approvedBy}`, sx + stepW2 / 2, y + 17, { align: "center" });
    }

    // Connector arrow (except last)
    if (idx < 3) {
      doc.setDrawColor(...slate200);
      doc.setLineWidth(0.4);
      const arrowX = sx + stepW2 + 1.5;
      doc.line(arrowX - 0.5, y + 9.5, arrowX + 2, y + 9.5);
    }
  });

  y += 26;

  // ── SIGNATURE AREA ─────────────────────────────────────────────────────────
  doc.setDrawColor(...slate200);
  doc.line(M, y, W - M, y);
  y += 8;

  const sigLabels = ["Dibuat Oleh\nAdmin Produksi", "Diperiksa\nSite Manager", "Disetujui\nFinance"];
  const sigW = (W - 2 * M - 12) / 3;

  sigLabels.forEach((label, i) => {
    const sx = M + i * (sigW + 6);
    doc.setFillColor(...slate50);
    doc.setDrawColor(...slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, sigW, 30, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...slate);
    label.split("\n").forEach((line, li) => {
      doc.text(line, sx + sigW / 2, y + 6.5 + li * 5, { align: "center" });
    });

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(sx + 8, y + 26, sx + sigW - 8, y + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("( tanda tangan )", sx + sigW / 2, y + 30, { align: "center" });
  });

  y += 38;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 284, W, 13, "F");
  doc.setFillColor(...emerald);
  doc.rect(0, 284, 4, 13, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Dokumen ini diterbitkan secara digital oleh sistem Satara Development. Scan QR code di pojok kanan atas untuk memverifikasi keaslian.",
    W / 2, 289.5, { align: "center" }
  );
  doc.text(
    `${docId}  ·  Digenerate: ${generatedAt}  ·  Satara Development © ${new Date().getFullYear()}`,
    W / 2, 294.5, { align: "center" }
  );

  doc.save(`${isPaid ? docId : `${docId}-APPROVED`}.pdf`);
}

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
                    {(first.payment?.status === "approved" || first.payment?.status === "paid") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => downloadReceipt(steps)}
                      >
                        <Download className="size-3" /> PDF Bukti
                      </Button>
                    )}
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
