import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import SubkonSelect from "@/components/subkon-select";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";

type Project = { id: number; nama: string };
type Standard = { id: number; projectId: number; stageCode: string | null; subkonName: string | null; category: string; subMaterial: string | null; materialName: string; satuan: string; plannedQuantity: number; usedQuantity: number; referenceUnitCount: number; unitBatchLabel: string | null; version?: number; status?: string; effectiveDate?: string | null };
type Productivity = Standard & { standardPerUnit: number; plannedBatchQuantity: number; actualQuantity: number; variance: number; efficiency: number; status: string; batchUnitCount: number };

const EMPTY = { projectId: "", stageCode: "T1", subkonName: "", unitBatchLabel: "", referenceUnitCount: 2, version: 1, status: "aktif", effectiveDate: new Date().toISOString().split("T")[0], category: "", subMaterial: "", materialName: "", satuan: "", plannedQuantity: 0, usedQuantity: 0 };

export default function MaterialAcuan() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [projectFilter, setProjectFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) as Promise<Project[]> });
  const { data: standards = [] } = useQuery({
    queryKey: ["material-standards", projectFilter],
    queryFn: () => fetch(`/api/produksi/material/standards${projectFilter ? `?projectId=${projectFilter}` : ""}`).then(r => r.json()) as Promise<Standard[]>,
  });
  const { data: productivity = [] } = useQuery({
    queryKey: ["material-productivity", projectFilter],
    queryFn: () => fetch(`/api/produksi/material/productivity${projectFilter ? `?projectId=${projectFilter}` : ""}`).then(r => r.json()) as Promise<Productivity[]>,
  });
  const add = useMutation({
    mutationFn: () => fetch(editingId ? `/api/produksi/material/standards/${editingId}` : "/api/produksi/material/standards", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, projectId: Number(form.projectId) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["material-standards"] }); qc.invalidateQueries({ queryKey: ["material-productivity"] }); setEditingId(null); setForm(p => ({ ...p, category: "", subMaterial: "", materialName: "", satuan: "", plannedQuantity: 0, usedQuantity: 0 })); },
  });
  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/produksi/material/standards/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["material-standards"] }); qc.invalidateQueries({ queryKey: ["material-productivity"] }); },
  });
  function editStandard(s: Standard) {
    setEditingId(s.id);
    setForm({
      projectId: String(s.projectId),
      stageCode: s.stageCode ?? "T1",
      subkonName: s.subkonName ?? "",
      unitBatchLabel: s.unitBatchLabel ?? "",
      referenceUnitCount: s.referenceUnitCount ?? 1,
      version: s.version ?? 1,
      status: s.status ?? "aktif",
      effectiveDate: s.effectiveDate ?? new Date().toISOString().split("T")[0],
      category: s.category,
      subMaterial: s.subMaterial ?? "",
      materialName: s.materialName,
      satuan: s.satuan,
      plannedQuantity: s.plannedQuantity,
      usedQuantity: s.usedQuantity,
    });
    setProjectFilter(String(s.projectId));
  }
  function exportCsv() {
    const header = ["Kategori", "Sub Material", "Material", "Satuan", "Tahap", "Subkon", "Versi", "Status", "Tanggal Berlaku", "Unit Acuan", "Rencana", "Digunakan", "Sisa"];
    const rows = standards.map(s => [s.category, s.subMaterial ?? "", s.materialName, s.satuan, s.stageCode ?? "", s.subkonName ?? "", s.version ?? 1, s.status ?? "aktif", s.effectiveDate ?? "", s.referenceUnitCount, s.plannedQuantity, s.usedQuantity, (s.plannedQuantity ?? 0) - (s.usedQuantity ?? 0)]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `master-acuan-material-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Master Acuan Material Proyek</h1>
          <p className="text-sm text-muted-foreground">Standar pemakaian bahan per proyek, tahap, subkon, batch unit, dan versi aktif.</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="h-8 gap-1.5"><Download className="size-3.5" /> Export CSV</Button>
      </div>
      <Card className="border-primary/30"><CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1"><Label className="text-xs">Proyek</Label><Select value={form.projectId} onValueChange={v => { setForm(p => ({ ...p, projectId: v })); setProjectFilter(v); }}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Tahap</Label><Input className="h-8 text-sm" value={form.stageCode} onChange={e => setForm(p => ({ ...p, stageCode: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Subkon</Label><SubkonSelect value={form.subkonName} projectId={form.projectId} onValueChange={v => setForm(p => ({ ...p, subkonName: v }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Jumlah Unit Acuan</Label><NumericInput className="h-8 text-sm" value={form.referenceUnitCount} onChange={v => setForm(p => ({ ...p, referenceUnitCount: v }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Versi</Label><NumericInput className="h-8 text-sm" value={form.version} onChange={v => setForm(p => ({ ...p, version: Math.max(1, Math.round(v)) }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{["draft", "aktif", "arsip"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Tanggal Berlaku</Label><Input type="date" className="h-8 text-sm" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Kategori</Label><Input className="h-8 text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="B. Struktur" /></div>
          <div className="space-y-1"><Label className="text-xs">Sub Material</Label><Input className="h-8 text-sm" value={form.subMaterial} onChange={e => setForm(p => ({ ...p, subMaterial: e.target.value }))} placeholder="Pondasi" /></div>
          <div className="space-y-1"><Label className="text-xs">Material</Label><Input className="h-8 text-sm" value={form.materialName} onChange={e => setForm(p => ({ ...p, materialName: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Satuan</Label><Input className="h-8 text-sm" value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} placeholder="zak, m3, btg" /></div>
          <div className="space-y-1"><Label className="text-xs">Rencana</Label><NumericInput className="h-8 text-sm" decimals={3} value={form.plannedQuantity} onChange={v => setForm(p => ({ ...p, plannedQuantity: v }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Jumlah Digunakan</Label><NumericInput className="h-8 text-sm" decimals={3} value={form.usedQuantity} onChange={v => setForm(p => ({ ...p, usedQuantity: v }))} /></div>
          <div className="space-y-1 md:col-span-2"><Label className="text-xs">Nomor Rumah/Batch</Label><Input className="h-8 text-sm" value={form.unitBatchLabel} onChange={e => setForm(p => ({ ...p, unitBatchLabel: e.target.value }))} placeholder="A-01 s/d A-03" /></div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="h-8">Batal Edit</Button>}
          <Button size="sm" onClick={() => add.mutate()} disabled={!form.projectId || !form.category || !form.materialName || !form.satuan}><Plus className="size-3.5 mr-1" /> {editingId ? "Update Acuan" : "Tambah Acuan"}</Button>
        </div>
      </CardContent></Card>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filter proyek</span>
        <Select value={projectFilter || "all"} onValueChange={v => setProjectFilter(v === "all" ? "" : v)}><SelectTrigger className="h-8 w-56 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua</SelectItem>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent></Select>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/30">{["Kategori", "Sub", "Material", "Satuan", "Versi", "Status", "Acuan Unit", "Rencana", "Per Unit", "Realisasi", "Efisiensi", ""].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>{standards.length === 0 ? <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Belum ada acuan.</td></tr> : standards.map(s => {
            const p = productivity.find(x => x.id === s.id);
            return <tr key={s.id} className="border-b last:border-0">
              <td className="px-3 py-2">{s.category}</td><td className="px-3 py-2">{s.subMaterial ?? "-"}</td><td className="px-3 py-2 font-medium">{s.materialName}</td><td className="px-3 py-2">{s.satuan}</td><td className="px-3 py-2">v{s.version ?? 1}</td><td className="px-3 py-2">{s.status ?? "aktif"}</td><td className="px-3 py-2">{s.referenceUnitCount}</td><td className="px-3 py-2">{s.plannedQuantity}</td><td className="px-3 py-2">{p?.standardPerUnit?.toFixed(2) ?? "-"}</td><td className="px-3 py-2">{p?.actualQuantity ?? 0}</td><td className="px-3 py-2">{p?.efficiency ?? 0}% ({p?.status ?? "-"})</td><td className="px-3 py-2"><div className="flex items-center gap-2"><button onClick={() => editStandard(s)} className="text-blue-500"><Pencil className="size-3.5" /></button><button onClick={() => del.mutate(s.id)} className="text-red-500"><Trash2 className="size-3.5" /></button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
