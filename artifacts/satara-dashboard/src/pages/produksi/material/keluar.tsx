import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/hooks/use-toast";
import SubkonSelect from "@/components/subkon-select";

type Material = { id: number; name: string; satuan: string };
type Project = { id: number; nama: string };
type OutRow = { id: number; projectId: number; materialId: number; quantity: number; takenBy: string | null; receiverName: string | null; subkonName: string | null; sourceType: string | null; proofUrl: string | null; dateOut: string; material: Material | null };

export default function MaterialKeluar() {
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({ projectId: "", stageCode: "T1", materialId: "", quantity: "", takenBy: "", receiverName: "", proofUrl: "", subkonName: "", dateOut: new Date().toISOString().split("T")[0] });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => { const r = await fetch("/api/projects"); return r.json() as Promise<Project[]>; } });
  const { data: materials } = useQuery({ queryKey: ["material-master"], queryFn: async () => { const r = await fetch("/api/produksi/material/master"); return r.json() as Promise<Material[]>; } });
  const { data: rows, isLoading } = useQuery({ queryKey: ["material-out"], queryFn: async () => { const r = await fetch("/api/produksi/material/out"); return r.json() as Promise<OutRow[]>; } });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/material/out", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(form.projectId),
          unitId: null,
          contractId: null,
          stageCode: form.stageCode,
          materialId: parseInt(form.materialId),
          quantity: parseFloat(form.quantity),
          batchId: null,
          batchUnitCount: 1,
          batchUnits: null,
          takenBy: form.takenBy || null,
          receiverName: form.receiverName || null,
          proofUrl: form.proofUrl || null,
          subkonName: form.subkonName || null,
          sourceType: "normal",
          dateOut: form.dateOut,
        }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal menyimpan material keluar" }));
        throw new Error(err.error ?? "Gagal menyimpan material keluar");
      }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["material-out"] }); qc.invalidateQueries({ queryKey: ["material-stok"] }); toast({ title: "Material keluar dicatat" }); setShowForm(false); },
    onError: (err: Error) => toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" }),
  });

  const projName = (id: number) => projects?.find(p => p.id === id)?.nama ?? "—";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-lg font-bold">Input Material Keluar Per Subkon</h1><p className="text-sm text-muted-foreground">Catat pengambilan material subkon.</p></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 h-8"><Plus className="size-3.5" /> Input Keluar</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30"><CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Proyek</Label>
              <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v, subkonName: "" }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
                <SelectContent>{(projects ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tahap</Label><Input value={form.stageCode} onChange={e => setForm(p => ({ ...p, stageCode: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Subkon</Label>
              <SubkonSelect value={form.subkonName} onValueChange={v => setForm(p => ({ ...p, subkonName: v }))} projectId={form.projectId} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Material</Label>
              <Select value={form.materialId} onValueChange={v => setForm(p => ({ ...p, materialId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih material..." /></SelectTrigger>
                <SelectContent>{(materials ?? []).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.satuan})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Jumlah</Label><NumericInput decimals={3} value={parseFloat(form.quantity) || 0} onChange={v => setForm(p => ({ ...p, quantity: String(v) }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Diambil Oleh</Label><Input value={form.takenBy} onChange={e => setForm(p => ({ ...p, takenBy: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Penerima</Label><Input value={form.receiverName} onChange={e => setForm(p => ({ ...p, receiverName: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tanggal Keluar</Label><Input type="date" value={form.dateOut} onChange={e => setForm(p => ({ ...p, dateOut: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Link Bukti/Nota/Foto</Label><Input value={form.proofUrl} onChange={e => setForm(p => ({ ...p, proofUrl: e.target.value }))} placeholder="URL bukti jika ada" className="h-8 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.projectId || !form.subkonName || !form.materialId || !form.quantity || createMutation.isPending} className="h-8">Simpan</Button>
          </div>
        </CardContent></Card>
      )}

      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-4">Tanggal</th>
              <th className="text-left py-2.5 px-2">Material</th>
              <th className="text-right py-2.5 px-2">Jumlah</th>
              <th className="text-left py-2.5 px-2">Subkon</th>
              <th className="text-left py-2.5 px-2">Sumber</th>
              <th className="text-left py-2.5 px-4">Diambil Oleh</th>
            </tr></thead>
            <tbody>
              {(rows ?? []).length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada data keluar</td></tr> :
              (rows ?? []).sort((a, b) => b.dateOut.localeCompare(a.dateOut)).map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="py-2 px-4">{r.dateOut}</td>
                  <td className="py-2 px-2 font-medium">{r.material?.name ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-red-500 font-medium">-{r.quantity} {r.material?.satuan}</td>
                  <td className="py-2 px-2 text-muted-foreground">{r.subkonName ?? "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{r.sourceType ?? "normal"}</td>
                  <td className="py-2 px-4 text-muted-foreground">{r.takenBy ?? "—"}{r.receiverName ? ` / ${r.receiverName}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></CardContent></Card>
      )}
    </div>
  );
}
