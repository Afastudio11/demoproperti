import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

type Contract = {
  id: number; projectId: number; subkonName: string; stageCode: string | null;
  contractValue: number; totalRetention: number; netPayableValue: number;
  unitCount: number; status: string;
  paymentTerms?: PaymentTerm[];
};
type PaymentTerm = {
  id: number;
  contractId: number;
  terminNumber: number;
  label: string;
  plannedDate: string | null;
  paymentType: string;
  grossAmount: number;
  retentionAmount: number;
  netAmount: number;
  notes: string | null;
};
type Unit = { id: number; projectId: number; contractId: number | null; stageCode: string | null; subkonName: string | null; progress: number };
type Payment = {
  id: number; contractId: number; paymentTermId: number | null; terminNumber: number | null;
  progressPrevious: number; progressCurrent: number;
  velocity: number | null; grossEligibleAmount: number | null;
  retentionDeducted: number | null; netPayment: number | null;
  status: string; paymentDate: string | null; period: string | null;
  createdAt: string;
};

const STATUS_INFO: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  draft: { label: "Draft", icon: Clock, color: "text-muted-foreground" },
  pending_approval: { label: "Pending Approval", icon: Clock, color: "text-amber-500" },
  approved: { label: "Disetujui", icon: CheckCircle2, color: "text-blue-500" },
  paid: { label: "Dibayar", icon: CheckCircle2, color: "text-emerald-500" },
};

export default function SubkonTermin() {
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
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

  const { data: units } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Unit[]>;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/subkon/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: parseInt(selectedContract), paymentTermId: parseInt(selectedTermId) }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subkon-payments"] });
      toast({ title: "Pengajuan termin berhasil disubmit untuk approval" });
      setShowForm(false);
      setSelectedTermId("");
    },
    onError: () => toast({ title: "Gagal submit termin", variant: "destructive" }),
  });

  const contract = contracts?.find(c => c.id === parseInt(selectedContract));
  const submittedTermIds = new Set((payments ?? []).filter(p => p.status !== "rejected" && p.paymentTermId).map(p => p.paymentTermId!));
  const availableTerms = (contract?.paymentTerms ?? []).filter(term => !submittedTermIds.has(term.id));
  const selectedTerm = availableTerms.find(term => term.id === parseInt(selectedTermId));
  const contractUnits = contract
    ? (units ?? []).filter(u => {
        if (u.contractId === contract.id) return true;
        return u.projectId === contract.projectId && (u.stageCode ?? "") === (contract.stageCode ?? "") && (u.subkonName ?? "") === contract.subkonName;
      })
    : [];
  const fieldProgress = contractUnits.length > 0
    ? Math.round((contractUnits.reduce((sum, u) => sum + (u.progress ?? 0), 0) / contractUnits.length) * 10) / 10
    : 0;
  const prevProgress = payments?.filter(p => p.contractId === parseInt(selectedContract) && ["pending_approval", "approved", "paid"].includes(p.status))
    .reduce((m, p) => Math.max(m, p.progressCurrent), 0) ?? 0;
  const curProgress = fieldProgress;
  const velocity = curProgress - prevProgress;
  const gross = selectedTerm?.grossAmount ?? 0;
  const retention = selectedTerm?.retentionAmount ?? 0;
  const net = selectedTerm?.netAmount ?? Math.max(0, gross - retention);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Termin Pembayaran Subkon</h1>
          <p className="text-sm text-muted-foreground">Pengajuan termin mengikuti jadwal nominal yang dibuat di Kontrak Subkon</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5 h-8">
          <Plus className="size-3.5" /> Pengajuan Termin
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm flex items-center gap-2"><Calculator className="size-4" /> Pengajuan Termin dari Jadwal Kontrak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Kontrak Subkon</Label>
                <Select value={selectedContract} onValueChange={value => { setSelectedContract(value); setSelectedTermId(""); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih kontrak..." /></SelectTrigger>
                  <SelectContent>
                    {(contracts ?? []).filter(c => c.status === "aktif").map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.subkonName} {c.stageCode ? `(${c.stageCode})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Termin yang Diajukan</Label>
                <Select value={selectedTermId} onValueChange={setSelectedTermId} disabled={!contract}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih termin..." /></SelectTrigger>
                  <SelectContent>
                    {availableTerms.map(term => (
                      <SelectItem key={term.id} value={String(term.id)}>
                        {term.label} — {fmtRp(term.netAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {contract && (
              <div className="grid grid-cols-3 gap-3 text-xs p-3 bg-muted/50 rounded-lg">
                <div><span className="text-muted-foreground block">Nilai Kontrak</span><span className="font-medium">{fmtRp(contract.contractValue)}</span></div>
                <div><span className="text-muted-foreground block">Total Retensi</span><span className="font-medium">{fmtRp(contract.totalRetention)}</span></div>
                <div><span className="text-muted-foreground block">Sisa setelah Retensi</span><span className="font-medium">{fmtRp(contract.netPayableValue)}</span></div>
              </div>
            )}

            {contract && availableTerms.length === 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                Semua termin pada kontrak ini sudah diajukan atau sedang diproses.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Progress Sebelumnya</Label>
                <Input value={fmtPct(prevProgress)} disabled className="h-8 text-sm bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Progress Lapangan Saat Ini</Label>
                <Input value={contract ? `${fmtPct(fieldProgress)} (${contractUnits.length} unit)` : "Pilih kontrak"} disabled className="h-8 text-sm bg-muted" />
              </div>
            </div>

            {selectedTerm && contract && (
              <div className="border rounded-lg p-3 space-y-2 bg-background">
                <p className="text-xs font-medium text-muted-foreground">Nominal Sesuai Jadwal Kontrak</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground block">Rencana Bayar</span><span className="font-semibold">{selectedTerm.plannedDate ?? "—"}</span></div>
                  <div><span className="text-muted-foreground block">Nilai Termin</span><span className="font-semibold">{fmtRp(gross)}</span></div>
                  <div><span className="text-muted-foreground block">Potongan Retensi</span><span className="font-semibold text-red-500">({fmtRp(retention)})</span></div>
                  <div><span className="text-muted-foreground block">Jumlah Dibayar</span><span className="font-bold text-emerald-600">{fmtRp(net)}</span></div>
                </div>
                <div className="text-[11px] text-muted-foreground">Progress pekerjaan saat pengajuan: {fmtPct(prevProgress)} → {fmtPct(curProgress)} ({fmtPct(velocity)} naik)</div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
              <Button size="sm" onClick={() => submitMutation.mutate()} disabled={!selectedContract || !selectedTerm || contractUnits.length === 0 || (selectedTerm.paymentType !== "retensi" && curProgress <= prevProgress) || submitMutation.isPending} className="h-8">
                Submit untuk Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Riwayat Termin</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Memuat...</div>
          ) : (payments?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada pengajuan termin.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Subkon</th>
                    <th className="text-right py-2 pr-4">Termin</th>
                    <th className="text-right py-2 pr-4">Progress</th>
                    <th className="text-right py-2 pr-4">Velocity</th>
                    <th className="text-right py-2 pr-4">Nilai Termin</th>
                    <th className="text-right py-2 pr-4">Retensi</th>
                    <th className="text-right py-2 pr-4">Jumlah Dibayar</th>
                    <th className="text-center py-2 pr-4">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments!.map(p => {
                    const contract = contracts?.find(c => c.id === p.contractId);
                    const st = STATUS_INFO[p.status] ?? STATUS_INFO.draft;
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 font-medium">{contract?.subkonName ?? "—"}</td>
                        <td className="py-2 pr-4 text-right">T{p.terminNumber ?? "?"}</td>
                        <td className="py-2 pr-4 text-right">{fmtPct(p.progressPrevious)} → {fmtPct(p.progressCurrent)}</td>
                        <td className="py-2 pr-4 text-right">{fmtPct(p.velocity ?? 0)}</td>
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
