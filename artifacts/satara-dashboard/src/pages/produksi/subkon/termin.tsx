import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

type Contract = {
  id: number; projectId: number; subkonName: string; stageCode: string | null;
  contractValue: number; totalRetention: number; netPayableValue: number;
  valuePerUnit: number; retentionPerUnit: number;
  unitCount: number; status: string;
};
type Payment = {
  id: number; contractId: number; terminNumber: number | null;
  progressPrevious: number; progressCurrent: number;
  velocity: number | null; grossEligibleAmount: number | null;
  retentionDeducted: number | null; netPayment: number | null;
  status: string; paymentDate: string | null; createdAt: string;
};
type UnitPreview = {
  id: number; label: string; tipe: string; stageCode: string | null;
  progress: number; earnedGross: number; earnedRetention: number; earnedNet: number;
  status: string; readyAkad: boolean;
};
type PaymentPreview = {
  canSubmit: boolean;
  reasons: string[];
  progressPrevious: number;
  progressCurrent: number;
  velocity: number;
  grossEligibleAmount: number;
  retentionDeducted: number;
  netPayment: number;
  totalCurrentlyEarned: number;
  grossAlreadyPaid: number;
  netAlreadyPaid: number;
  unitStats: { total: number; selesai: number; berjalan: number; belumMulai: number; rataRata: number };
  unitProgress: UnitPreview[];
};

const STATUS_INFO: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  draft: { label: "Draft", icon: Clock, color: "text-muted-foreground" },
  pending_approval: { label: "Pending Approval", icon: Clock, color: "text-amber-500" },
  approved: { label: "Disetujui", icon: CheckCircle2, color: "text-blue-500" },
  paid: { label: "Dibayar", icon: CheckCircle2, color: "text-emerald-500" },
};

export default function SubkonTermin() {
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: contracts } = useQuery({
    queryKey: ["subkon-contracts"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/subkon/contracts");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Contract[]>;
    },
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["subkon-payments"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/subkon/payments");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Payment[]>;
    },
  });

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ["subkon-payment-preview", selectedContract],
    queryFn: async () => {
      const res = await fetch(`/api/produksi/subkon/contracts/${selectedContract}/payment-preview`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal preview");
      return res.json() as Promise<PaymentPreview>;
    },
    enabled: !!selectedContract,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/subkon/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: parseInt(selectedContract) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subkon-payments"] });
      qc.invalidateQueries({ queryKey: ["subkon-payment-preview", selectedContract] });
      toast({ title: "Pengajuan pembayaran berhasil disubmit untuk approval" });
      setShowForm(false);
      setSelectedContract("");
    },
    onError: (e: Error) => toast({ title: "Gagal submit", description: e.message, variant: "destructive" }),
  });

  const contract = contracts?.find(c => c.id === parseInt(selectedContract));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Termin Pembayaran Subkon</h1>
          <p className="text-sm text-muted-foreground">Pembayaran dihitung otomatis dari progress aktual per unit</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5 h-8">
          <Plus className="size-3.5" /> Ajukan Pembayaran
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm flex items-center gap-2"><Calculator className="size-4" /> Pengajuan Pembayaran dari Progress Unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Kontrak Subkon</Label>
              <Select value={selectedContract} onValueChange={v => setSelectedContract(v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih kontrak..." /></SelectTrigger>
                <SelectContent>
                  {(contracts ?? []).filter(c => c.status === "aktif").map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.subkonName} {c.stageCode ? `(${c.stageCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contract && (
              <div className="grid grid-cols-3 gap-3 text-xs p-3 bg-muted/50 rounded-lg">
                <div><span className="text-muted-foreground block">Harga per Unit</span><span className="font-medium">{fmtRp(contract.valuePerUnit)}</span></div>
                <div><span className="text-muted-foreground block">Retensi per Unit</span><span className="font-medium">{fmtRp(contract.retentionPerUnit)}</span></div>
                <div><span className="text-muted-foreground block">Nilai Kontrak Total</span><span className="font-medium">{fmtRp(contract.contractValue)}</span></div>
              </div>
            )}

            {selectedContract && previewLoading && (
              <div className="py-4 text-center text-xs text-muted-foreground">Menghitung dari progress unit...</div>
            )}

            {selectedContract && previewError && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                {(previewError as Error).message}
              </div>
            )}

            {preview && contract && (
              <>
                <div className="border rounded-lg p-3 space-y-3 bg-background">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">Progress Per Unit</p>
                      <p className="text-[11px] text-muted-foreground">
                        Nilai yang dibayar = progress% × harga per unit ({fmtRp(contract.valuePerUnit)})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{fmtPct(preview.unitStats.rataRata)}</div>
                      <div className="text-[10px] text-muted-foreground">rata-rata progress</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Total Unit</span><span className="font-semibold">{preview.unitStats.total}</span></div>
                    <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Selesai</span><span className="font-semibold text-emerald-600">{preview.unitStats.selesai}</span></div>
                    <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Berjalan</span><span className="font-semibold text-amber-600">{preview.unitStats.berjalan}</span></div>
                    <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Belum Mulai</span><span className="font-semibold">{preview.unitStats.belumMulai}</span></div>
                  </div>

                  {preview.unitProgress.length === 0 ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700">
                      Belum ada unit produksi yang terhubung ke kontrak ini.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
                          <tr className="text-muted-foreground">
                            <th className="text-left px-2 py-1.5">Unit</th>
                            <th className="text-left px-2 py-1.5">Tipe</th>
                            <th className="text-right px-2 py-1.5">Progress</th>
                            <th className="text-right px-2 py-1.5">Earned (Gross)</th>
                            <th className="text-right px-2 py-1.5">Retensi</th>
                            <th className="text-right px-2 py-1.5">Earned (Net)</th>
                            <th className="px-2 py-1.5 w-24">Bar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.unitProgress.map(unit => (
                            <tr key={unit.id} className="border-t">
                              <td className="px-2 py-1.5 font-medium">{unit.label}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{unit.tipe || "—"}</td>
                              <td className="px-2 py-1.5 text-right font-medium">{fmtPct(unit.progress)}</td>
                              <td className="px-2 py-1.5 text-right">{fmtRp(unit.earnedGross)}</td>
                              <td className="px-2 py-1.5 text-right text-red-500">({fmtRp(unit.earnedRetention)})</td>
                              <td className="px-2 py-1.5 text-right font-semibold text-emerald-600">{fmtRp(unit.earnedNet)}</td>
                              <td className="px-2 py-1.5">
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, unit.progress))}%` }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-3 space-y-3 bg-background">
                  <p className="text-xs font-semibold flex items-center gap-1.5"><TrendingUp className="size-3.5" /> Rekapitulasi Klaim</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-md bg-muted/40 p-2.5">
                      <span className="text-muted-foreground block mb-0.5">Total Earned saat ini</span>
                      <span className="font-semibold">{fmtRp(preview.totalCurrentlyEarned)}</span>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2.5">
                      <span className="text-muted-foreground block mb-0.5">Sudah Diklaim Sebelumnya</span>
                      <span className="font-semibold text-muted-foreground">({fmtRp(preview.grossAlreadyPaid)})</span>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2.5">
                      <span className="text-muted-foreground block mb-0.5">Potongan Retensi Klaim Ini</span>
                      <span className="font-semibold text-red-500">({fmtRp(preview.retentionDeducted)})</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">Jumlah Dibayar Klaim Ini</p>
                      <p className="text-[11px] text-muted-foreground">Progress {fmtPct(preview.progressPrevious)} → {fmtPct(preview.progressCurrent)} (+{fmtPct(preview.velocity)})</p>
                    </div>
                    <span className="text-xl font-bold text-emerald-700">{fmtRp(preview.netPayment)}</span>
                  </div>
                  {!preview.canSubmit && (
                    <div className="text-[11px] text-amber-600 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                      Belum bisa submit: {preview.reasons.join(", ")}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setSelectedContract(""); }} className="h-8">Batal</Button>
              <Button
                size="sm"
                onClick={() => submitMutation.mutate()}
                disabled={!preview || !preview.canSubmit || submitMutation.isPending}
                className="h-8"
              >
                Submit untuk Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Riwayat Pembayaran</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Memuat...</div>
          ) : (payments?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada pengajuan pembayaran.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Subkon</th>
                    <th className="text-right py-2 pr-4">Progress</th>
                    <th className="text-right py-2 pr-4">Kenaikan</th>
                    <th className="text-right py-2 pr-4">Gross Klaim</th>
                    <th className="text-right py-2 pr-4">Retensi</th>
                    <th className="text-right py-2 pr-4">Jumlah Dibayar</th>
                    <th className="text-center py-2 pr-4">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments!.map(p => {
                    const c = contracts?.find(c => c.id === p.contractId);
                    const st = STATUS_INFO[p.status] ?? STATUS_INFO.draft;
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 font-medium">{c?.subkonName ?? "—"}{c?.stageCode ? ` (${c.stageCode})` : ""}</td>
                        <td className="py-2 pr-4 text-right">{fmtPct(p.progressPrevious)} → {fmtPct(p.progressCurrent)}</td>
                        <td className="py-2 pr-4 text-right text-blue-600">+{fmtPct(p.velocity ?? 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmtRp(p.grossEligibleAmount ?? 0)}</td>
                        <td className="py-2 pr-4 text-right text-red-500">({fmtRp(p.retentionDeducted ?? 0)})</td>
                        <td className="py-2 pr-4 text-right font-semibold text-emerald-600">{fmtRp(p.netPayment ?? 0)}</td>
                        <td className="py-2 pr-4 text-center">
                          <span className={`flex items-center justify-center gap-1 ${st.color}`}>
                            <st.icon className="size-3" /> {st.label}
                          </span>
                        </td>
                        <td className="py-2">
                          {p.status === "approved" && (
                            <span className="text-[10px] text-muted-foreground">Menunggu Finance</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
