import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileCheck, Trash2 } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type Project = { id: number; nama: string };
type PaymentTerm = {
  id?: number;
  terminNumber: number;
  label: string;
  plannedDate: string;
  paymentType: string;
  grossAmount: number;
  retentionAmount: number;
  netAmount: number;
  notes?: string | null;
};
type Contract = {
  id: number; projectId: number; stageCode: string | null; subkonName: string;
  unitCount: number; valuePerUnit: number; contractValue: number;
  retentionPerUnit: number; totalRetention: number; netPayableValue: number;
  maintenanceMonths: number; startDate: string | null; targetEndDate: string | null;
  retentionStatus: string; status: string;
  paymentTerms?: PaymentTerm[];
};

const RETENTION_STATUS: Record<string, string> = {
  ditahan: "Ditahan", masa_pemeliharaan: "Masa Pemeliharaan", siap_cair: "Siap Cair", sudah_cair: "Sudah Cair",
};

const makeDefaultTerms = (): PaymentTerm[] => [
  { terminNumber: 1, label: "P. Pertama", plannedDate: "", paymentType: "termin", grossAmount: 0, retentionAmount: 0, netAmount: 0 },
  { terminNumber: 2, label: "P. Kedua", plannedDate: "", paymentType: "termin", grossAmount: 0, retentionAmount: 0, netAmount: 0 },
  { terminNumber: 3, label: "P. Ketiga", plannedDate: "", paymentType: "termin", grossAmount: 0, retentionAmount: 0, netAmount: 0 },
  { terminNumber: 4, label: "P. Keempat", plannedDate: "", paymentType: "termin", grossAmount: 0, retentionAmount: 0, netAmount: 0 },
  { terminNumber: 5, label: "Retensi", plannedDate: "", paymentType: "retensi", grossAmount: 0, retentionAmount: 0, netAmount: 0 },
];

export default function SubkonKontrak() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    projectId: "", stageCode: "", subkonName: "",
    unitCount: "", valuePerUnit: "", retentionPerUnit: "500000",
    maintenanceMonths: "3", startDate: "", targetEndDate: "",
    paymentTerms: makeDefaultTerms(),
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const r = await fetch("/api/projects"); return r.json() as Promise<Project[]>; },
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["subkon-contracts"],
    queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/subkon/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(form.projectId),
          stageCode: form.stageCode || null,
          subkonName: form.subkonName.trim().replace(/\s+/g, " "),
          unitCount: parseInt(form.unitCount),
          valuePerUnit: parseFloat(form.valuePerUnit),
          retentionPerUnit: parseFloat(form.retentionPerUnit),
          maintenanceMonths: parseInt(form.maintenanceMonths),
          startDate: form.startDate || null,
          targetEndDate: form.targetEndDate || null,
          paymentTerms: form.paymentTerms
            .filter(t => t.grossAmount > 0 || t.retentionAmount > 0 || t.netAmount > 0)
            .map(t => ({ ...t, plannedDate: t.plannedDate || null, notes: t.notes || null })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subkon-contracts"] });
      toast({ title: "Kontrak berhasil dibuat" });
      setShowForm(false);
      setForm({ projectId: "", stageCode: "", subkonName: "", unitCount: "", valuePerUnit: "", retentionPerUnit: "500000", maintenanceMonths: "3", startDate: "", targetEndDate: "", paymentTerms: makeDefaultTerms() });
    },
    onError: () => toast({ title: "Gagal membuat kontrak", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/produksi/subkon/contracts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subkon-contracts"] }); toast({ title: "Kontrak dihapus" }); },
  });

  const cv = parseFloat(form.valuePerUnit) * parseInt(form.unitCount) || 0;
  const tr = parseFloat(form.retentionPerUnit) * parseInt(form.unitCount) || 0;
  const nv = cv - tr;
  const scheduledNet = form.paymentTerms.reduce((sum, term) => sum + (term.netAmount || 0), 0);
  const scheduledRetention = form.paymentTerms.reduce((sum, term) => sum + (term.retentionAmount || 0), 0);

  const updateTerm = (index: number, patch: Partial<PaymentTerm>) => {
    setForm(prev => ({
      ...prev,
      paymentTerms: prev.paymentTerms.map((term, i) => {
        if (i !== index) return term;
        const next = { ...term, ...patch };
        if ("grossAmount" in patch || "retentionAmount" in patch) {
          next.netAmount = Math.max(0, (next.grossAmount || 0) - (next.retentionAmount || 0));
        }
        return next;
      }),
    }));
  };

  const addTerm = (paymentType = "termin") => {
    setForm(prev => ({
      ...prev,
      paymentTerms: [
        ...prev.paymentTerms,
        {
          terminNumber: prev.paymentTerms.length + 1,
          label: paymentType === "retensi" ? "Retensi" : `Termin ${prev.paymentTerms.length + 1}`,
          plannedDate: "",
          paymentType,
          grossAmount: 0,
          retentionAmount: 0,
          netAmount: 0,
        },
      ],
    }));
  };

  const removeTerm = (index: number) => {
    setForm(prev => ({
      ...prev,
      paymentTerms: prev.paymentTerms.filter((_, i) => i !== index).map((term, i) => ({ ...term, terminNumber: i + 1 })),
    }));
  };

  const projectName = (id: number) => projects?.find(p => p.id === id)?.nama ?? "—";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Kontrak Subkon</h1>
          <p className="text-sm text-muted-foreground">Manajemen kontrak kerja subkontraktor per tahap proyek</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 h-8"><Plus className="size-3.5" /> Tambah Kontrak</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3 pt-4"><CardTitle className="text-sm flex items-center gap-2"><FileCheck className="size-4" /> Form Kontrak Baru</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Proyek</Label>
                <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
                  <SelectContent>{(projects ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Tahap (opsional)</Label>
                <Input value={form.stageCode} onChange={e => setForm(p => ({ ...p, stageCode: e.target.value }))} placeholder="T1, T2..." className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Subkon</Label>
                <Input value={form.subkonName} onChange={e => setForm(p => ({ ...p, subkonName: e.target.value }))} placeholder="CV. ..." className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Jumlah Unit</Label>
                <NumericInput value={parseFloat(form.unitCount) || 0} onChange={v => setForm(p => ({ ...p, unitCount: String(v) }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nilai per Unit (Rp)</Label>
                <CurrencyInput value={form.valuePerUnit} onChange={raw => setForm(p => ({ ...p, valuePerUnit: raw }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retensi per Unit (Rp)</Label>
                <CurrencyInput value={form.retentionPerUnit} onChange={raw => setForm(p => ({ ...p, retentionPerUnit: raw }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Masa Pemeliharaan (bln)</Label>
                <NumericInput value={parseFloat(form.maintenanceMonths) || 0} onChange={v => setForm(p => ({ ...p, maintenanceMonths: String(v) }))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Mulai</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Selesai</Label>
                <Input type="date" value={form.targetEndDate} onChange={e => setForm(p => ({ ...p, targetEndDate: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            {cv > 0 && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg text-xs">
                <div><span className="text-muted-foreground block">Nilai Kontrak</span><span className="font-semibold">{fmtRp(cv)}</span></div>
                <div><span className="text-muted-foreground block">Total Retensi</span><span className="font-semibold text-amber-600">{fmtRp(tr)}</span></div>
                <div><span className="text-muted-foreground block">Netto Dibayarkan</span><span className="font-semibold text-emerald-600">{fmtRp(nv)}</span></div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs">Jadwal Termin Pembayaran</Label>
                  <p className="text-[11px] text-muted-foreground">Nominal ini menjadi acuan saat Produksi mengajukan termin ke Finance.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTerm()}>Tambah Termin</Button>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full min-w-[920px] text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="text-left p-2 w-24">Termin</th>
                      <th className="text-left p-2 w-36">Tipe</th>
                      <th className="text-left p-2 w-36">Tanggal</th>
                      <th className="text-right p-2">Bruto</th>
                      <th className="text-right p-2">Pot. Retensi</th>
                      <th className="text-right p-2">Netto</th>
                      <th className="text-left p-2">Catatan</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.paymentTerms.map((term, index) => (
                      <tr key={`${term.label}-${index}`} className="border-b last:border-0">
                        <td className="p-2">
                          <Input value={term.label} onChange={e => updateTerm(index, { label: e.target.value })} className="h-8 text-xs" />
                        </td>
                        <td className="p-2">
                          <Select value={term.paymentType} onValueChange={value => updateTerm(index, { paymentType: value, label: value === "retensi" ? "Retensi" : term.label })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="termin">Termin</SelectItem>
                              <SelectItem value="retensi">Retensi</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input type="date" value={term.plannedDate} onChange={e => updateTerm(index, { plannedDate: e.target.value })} className="h-8 text-xs" />
                        </td>
                        <td className="p-2">
                          <CurrencyInput value={term.grossAmount} onChange={raw => updateTerm(index, { grossAmount: parseFloat(raw) || 0 })} className="h-8 text-xs text-right" />
                        </td>
                        <td className="p-2">
                          <CurrencyInput value={term.retentionAmount} onChange={raw => updateTerm(index, { retentionAmount: parseFloat(raw) || 0 })} className="h-8 text-xs text-right" />
                        </td>
                        <td className="p-2">
                          <CurrencyInput value={term.netAmount} onChange={raw => updateTerm(index, { netAmount: parseFloat(raw) || 0 })} className="h-8 text-xs text-right font-medium" />
                        </td>
                        <td className="p-2">
                          <Input value={term.notes ?? ""} onChange={e => updateTerm(index, { notes: e.target.value })} className="h-8 text-xs" />
                        </td>
                        <td className="p-2 text-center">
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={() => removeTerm(index)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/20 rounded-lg text-xs">
                <div><span className="text-muted-foreground block">Total Netto Termin</span><span className="font-semibold">{fmtRp(scheduledNet)}</span></div>
                <div><span className="text-muted-foreground block">Total Pot. Retensi</span><span className="font-semibold text-amber-600">{fmtRp(scheduledRetention)}</span></div>
                <div><span className="text-muted-foreground block">Sisa vs Nilai Kontrak</span><span className={`font-semibold ${cv - scheduledNet < 0 ? "text-red-500" : "text-muted-foreground"}`}>{fmtRp(cv - scheduledNet)}</span></div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.projectId || !form.subkonName.trim() || !form.unitCount || !form.valuePerUnit || createMutation.isPending} className="h-8">Simpan Kontrak</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat kontrak...</div>
      ) : (contracts?.length ?? 0) === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Belum ada kontrak subkon.</div>
      ) : (
        <div className="space-y-2">
          {contracts!.map(c => (
            <Card key={c.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.subkonName}</span>
                      {c.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.stageCode}</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === "aktif" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{projectName(c.projectId)} — {c.unitCount} unit</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                      <div><span className="text-muted-foreground block">Nilai Kontrak</span><span className="font-medium">{fmtRp(c.contractValue)}</span></div>
                      <div><span className="text-muted-foreground block">Retensi</span><span className="font-medium text-amber-600">{fmtRp(c.totalRetention)}</span></div>
                      <div><span className="text-muted-foreground block">Netto</span><span className="font-medium text-emerald-600">{fmtRp(c.netPayableValue)}</span></div>
                      <div><span className="text-muted-foreground block">Status Retensi</span><span className="font-medium">{RETENTION_STATUS[c.retentionStatus] ?? c.retentionStatus}</span></div>
                    </div>
                    {(c.paymentTerms?.length ?? 0) > 0 && (
                      <div className="mt-3 overflow-x-auto rounded-lg border">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-muted/30 text-muted-foreground border-b">
                              <th className="text-left p-2">Termin</th>
                              <th className="text-left p-2">Rencana</th>
                              <th className="text-right p-2">Bruto</th>
                              <th className="text-right p-2">Retensi</th>
                              <th className="text-right p-2">Netto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.paymentTerms!.map(term => (
                              <tr key={term.id ?? `${c.id}-${term.terminNumber}`} className="border-b last:border-0">
                                <td className="p-2 font-medium">{term.label}</td>
                                <td className="p-2 text-muted-foreground">{term.plannedDate || "—"}</td>
                                <td className="p-2 text-right">{fmtRp(term.grossAmount)}</td>
                                <td className="p-2 text-right text-amber-600">{fmtRp(term.retentionAmount)}</td>
                                <td className="p-2 text-right text-emerald-600 font-medium">{fmtRp(term.netAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
