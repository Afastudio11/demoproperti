import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileCheck, Trash2 } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type Project = { id: number; nama: string };
type Contract = {
  id: number; projectId: number; stageCode: string | null; subkonName: string;
  unitCount: number; valuePerUnit: number; contractValue: number;
  retentionPerUnit: number; totalRetention: number; netPayableValue: number;
  maintenanceMonths: number; startDate: string | null; targetEndDate: string | null;
  retentionStatus: string; status: string;
};

const RETENTION_STATUS: Record<string, string> = {
  ditahan: "Ditahan", masa_pemeliharaan: "Masa Pemeliharaan", siap_cair: "Siap Cair", sudah_cair: "Sudah Cair",
};

export default function SubkonKontrak() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    projectId: "", stageCode: "", subkonName: "",
    unitCount: "", valuePerUnit: "", retentionPerUnit: "500000",
    maintenanceMonths: "3", startDate: "", targetEndDate: "",
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
          subkonName: form.subkonName,
          unitCount: parseInt(form.unitCount),
          valuePerUnit: parseFloat(form.valuePerUnit),
          retentionPerUnit: parseFloat(form.retentionPerUnit),
          maintenanceMonths: parseInt(form.maintenanceMonths),
          startDate: form.startDate || null,
          targetEndDate: form.targetEndDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subkon-contracts"] });
      toast({ title: "Kontrak berhasil dibuat" });
      setShowForm(false);
      setForm({ projectId: "", stageCode: "", subkonName: "", unitCount: "", valuePerUnit: "", retentionPerUnit: "500000", maintenanceMonths: "3", startDate: "", targetEndDate: "" });
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
                <NumericInput value={parseFloat(form.valuePerUnit) || 0} onChange={v => setForm(p => ({ ...p, valuePerUnit: String(v) }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retensi per Unit (Rp)</Label>
                <NumericInput value={parseFloat(form.retentionPerUnit) || 0} onChange={v => setForm(p => ({ ...p, retentionPerUnit: String(v) }))} className="h-8 text-sm" />
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.projectId || !form.subkonName || !form.unitCount || !form.valuePerUnit || createMutation.isPending} className="h-8">Simpan Kontrak</Button>
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
