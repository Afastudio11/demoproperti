import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubkonSelect from "@/components/subkon-select";

type Unit = { id: number; contractId: number | null; subkonName: string | null; blok: string; nomor: string; tipe: string };
type Rework = { id: number; unitId: number; subkonName: string | null; pekerjaanItem: string | null; description: string | null; foundDate: string | null; targetCompletion: string | null; actualCompletion: string | null; status: string; unit: Unit | null };

const STATUS_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  open: { icon: AlertTriangle, color: "text-red-500", label: "Open" },
  in_progress: { icon: Clock, color: "text-amber-500", label: "Dalam Perbaikan" },
  closed: { icon: CheckCircle2, color: "text-emerald-500", label: "Selesai" },
};

export default function QcRework() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ unitId: "", subkonName: "", pekerjaanItem: "", description: "", foundDate: new Date().toISOString().split("T")[0], targetCompletion: "" });
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: units } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; },
  });

  const { data: reworks, isLoading } = useQuery({
    queryKey: ["reworks"],
    queryFn: async () => { const r = await fetch("/api/produksi/qc/reworks"); return r.json() as Promise<Rework[]>; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/qc/reworks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: parseInt(form.unitId),
          contractId: selectedUnit?.contractId ?? null,
          subkonName: selectedUnit?.subkonName ?? (form.subkonName || null),
          pekerjaanItem: form.pekerjaanItem || null,
          description: form.description || null,
          foundDate: form.foundDate,
          targetCompletion: form.targetCompletion || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reworks"] }); toast({ title: "Rework berhasil dicatat" }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/produksi/qc/reworks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === "closed" ? { actualCompletion: new Date().toISOString().split("T")[0] } : {}) }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reworks"] }); },
  });

  const filtered = (reworks ?? []).filter(r => filter === "all" || r.status === filter);
  const openCount = (reworks ?? []).filter(r => r.status === "open").length;
  const inProgressCount = (reworks ?? []).filter(r => r.status === "in_progress").length;
  const selectedUnit = units?.find(u => u.id === parseInt(form.unitId));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Rework Monitoring</h1>
          <p className="text-sm text-muted-foreground">Tracking pekerjaan ulang yang perlu diperbaiki subkon</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 h-8"><Plus className="size-3.5" /> Catat Rework</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Open</p><p className="text-xl font-bold text-red-500">{openCount}</p></CardContent></Card>
        <Card className="border-amber-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Dalam Perbaikan</p><p className="text-xl font-bold text-amber-500">{inProgressCount}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{reworks?.length ?? 0}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-primary/30"><CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={form.unitId} onValueChange={v => {
                const unit = units?.find(u => u.id === parseInt(v));
                setForm(p => ({ ...p, unitId: v, subkonName: unit?.subkonName ?? p.subkonName }));
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih unit..." /></SelectTrigger>
                <SelectContent>{(units ?? []).map(u => <SelectItem key={u.id} value={String(u.id)}>Blok {u.blok}-{u.nomor}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subkon</Label>
              <SubkonSelect value={form.subkonName} onValueChange={v => setForm(p => ({ ...p, subkonName: v }))} disabled={!!selectedUnit?.subkonName} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Item Pekerjaan</Label>
              <Input value={form.pekerjaanItem} onChange={e => setForm(p => ({ ...p, pekerjaanItem: e.target.value }))} placeholder="Cat, keramik..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Deskripsi Masalah</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi singkat..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Selesai</Label>
              <Input type="date" value={form.targetCompletion} onChange={e => setForm(p => ({ ...p, targetCompletion: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.unitId || createMutation.isPending} className="h-8">Simpan</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="flex gap-2">
        {["all", "open", "in_progress", "closed"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
            {s === "all" ? "Semua" : STATUS_ICONS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : (
        <div className="space-y-2">
          {filtered.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada rework {filter !== "all" ? `status "${filter}"` : ""}</div> : filtered.map(r => {
            const st = STATUS_ICONS[r.status] ?? STATUS_ICONS.open;
            return (
              <Card key={r.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <st.icon className={`size-4 shrink-0 mt-0.5 ${st.color}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.unit ? `Blok ${r.unit.blok}-${r.unit.nomor}` : "—"}</span>
                          {r.pekerjaanItem && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.pekerjaanItem}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description ?? "—"}</p>
                        {r.subkonName && <p className="text-[10px] text-muted-foreground mt-0.5">Subkon: {r.subkonName}</p>}
                        {r.targetCompletion && <p className="text-[10px] text-muted-foreground">Target: {r.targetCompletion}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {r.status === "open" && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateMutation.mutate({ id: r.id, status: "in_progress" })}>Mulai</Button>}
                      {r.status === "in_progress" && <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => updateMutation.mutate({ id: r.id, status: "closed" })}>Selesai</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
