import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/hooks/use-toast";

type Material = { id: number; name: string; satuan: string; category: string };
type Project = { id: number; nama: string };
type Unit = { id: number; projectId: number; blok: string; nomor: string; stageCode: string | null; subkonName: string | null; contractId: number | null };
type Contract = { id: number; projectId: number; stageCode: string | null; subkonName: string };
type InRow = { id: number; projectId: number; unitId: number | null; contractId: number | null; stageCode: string | null; materialId: number; quantity: number; supplier: string | null; documentNumber: string | null; dateIn: string; material: Material | null; unit?: Unit | null; contract?: Contract | null };
const STAGE_OPTIONS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

export default function MaterialMasuk() {
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({ projectId: "", unitId: "", contractId: "", stageCode: "", materialId: "", quantity: "", supplier: "", documentNumber: "", dateIn: new Date().toISOString().split("T")[0] });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => { const r = await fetch("/api/projects"); return r.json() as Promise<Project[]>; } });
  const { data: units } = useQuery({ queryKey: ["units"], queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; } });
  const { data: contracts } = useQuery({ queryKey: ["subkon-contracts", form.projectId], queryFn: async () => { const r = await fetch(`/api/produksi/subkon/contracts${form.projectId ? `?projectId=${form.projectId}` : ""}`); return r.json() as Promise<Contract[]>; } });
  const { data: materials } = useQuery({ queryKey: ["material-master"], queryFn: async () => { const r = await fetch("/api/produksi/material/master"); return r.json() as Promise<Material[]>; } });
  const { data: rows, isLoading } = useQuery({ queryKey: ["material-in"], queryFn: async () => { const r = await fetch("/api/produksi/material/in"); return r.json() as Promise<InRow[]>; } });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/material/in", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: parseInt(form.projectId), unitId: form.unitId ? parseInt(form.unitId) : null, contractId: form.contractId ? parseInt(form.contractId) : null, stageCode: form.stageCode || null, materialId: parseInt(form.materialId), quantity: parseFloat(form.quantity), supplier: form.supplier || null, documentNumber: form.documentNumber || null, dateIn: form.dateIn }) });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["material-in"] }); qc.invalidateQueries({ queryKey: ["material-stok"] }); toast({ title: "Material masuk dicatat" }); setShowForm(false); setForm(p => ({ ...p, quantity: "", supplier: "", documentNumber: "" })); },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const projName = (id: number) => projects?.find(p => p.id === id)?.nama ?? "—";
  const visibleUnits = (units ?? []).filter(u => !form.projectId || u.projectId === Number(form.projectId));
  const unitLabel = (unit?: Unit | null) => unit ? `${unit.blok}-${unit.nomor}` : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-lg font-bold">Input Material Masuk</h1><p className="text-sm text-muted-foreground">Catat penerimaan material dari supplier ke gudang</p></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 h-8"><Plus className="size-3.5" /> Input Masuk</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30"><CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Proyek</Label>
              <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v, unitId: "", contractId: "", stageCode: "" }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
                <SelectContent>{(projects ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Unit</Label>
              <Select value={form.unitId || "none"} onValueChange={v => {
                const unit = visibleUnits.find(u => String(u.id) === v);
                setForm(p => ({ ...p, unitId: v === "none" ? "" : v, contractId: unit?.contractId ? String(unit.contractId) : p.contractId, stageCode: unit?.stageCode ?? p.stageCode }));
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Opsional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak spesifik unit</SelectItem>
                  {visibleUnits.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.blok}-{u.nomor}{u.stageCode ? ` (${u.stageCode})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Material</Label>
              <Select value={form.materialId} onValueChange={v => setForm(p => ({ ...p, materialId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih material..." /></SelectTrigger>
                <SelectContent>{(materials ?? []).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.satuan})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tahap</Label>
              <Select value={form.stageCode} onValueChange={v => setForm(p => ({ ...p, stageCode: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih tahap..." /></SelectTrigger>
                <SelectContent>{STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Kontrak Subkon</Label>
              <Select value={form.contractId || "none"} onValueChange={v => {
                const contract = (contracts ?? []).find(c => String(c.id) === v);
                setForm(p => ({ ...p, contractId: v === "none" ? "" : v, stageCode: contract?.stageCode ?? p.stageCode }));
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Opsional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak terkait kontrak</SelectItem>
                  {(contracts ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.subkonName}{c.stageCode ? ` (${c.stageCode})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Jumlah</Label>
              <NumericInput decimals={3} value={parseFloat(form.quantity) || 0} onChange={v => setForm(p => ({ ...p, quantity: String(v) }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Supplier</Label>
              <Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Nama supplier..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">No. Dokumen</Label>
              <Input value={form.documentNumber} onChange={e => setForm(p => ({ ...p, documentNumber: e.target.value }))} placeholder="DO-2025-..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.dateIn} onChange={e => setForm(p => ({ ...p, dateIn: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.projectId || !form.materialId || !form.quantity || createMutation.isPending} className="h-8">Simpan</Button>
          </div>
        </CardContent></Card>
      )}

      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-4">Tanggal</th>
              <th className="text-left py-2.5 px-2">Material</th>
              <th className="text-left py-2.5 px-2">Proyek</th>
              <th className="text-left py-2.5 px-2">Tahap</th>
              <th className="text-left py-2.5 px-2">Unit/Kontrak</th>
              <th className="text-right py-2.5 px-2">Jumlah</th>
              <th className="text-left py-2.5 px-2">Supplier</th>
              <th className="text-left py-2.5 px-4">No. Dokumen</th>
            </tr></thead>
            <tbody>
              {(rows ?? []).length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Belum ada data masuk</td></tr> :
              (rows ?? []).sort((a, b) => b.dateIn.localeCompare(a.dateIn)).map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="py-2 px-4">{r.dateIn}</td>
                  <td className="py-2 px-2 font-medium">{r.material?.name ?? "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{projName(r.projectId)}</td>
                  <td className="py-2 px-2 text-muted-foreground">{r.stageCode ?? "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{unitLabel(r.unit)}{r.contract?.subkonName ? ` / ${r.contract.subkonName}` : ""}</td>
                  <td className="py-2 px-2 text-right text-emerald-600 font-medium">+{r.quantity} {r.material?.satuan}</td>
                  <td className="py-2 px-2 text-muted-foreground">{r.supplier ?? "—"}</td>
                  <td className="py-2 px-4 text-muted-foreground">{r.documentNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></CardContent></Card>
      )}
    </div>
  );
}
