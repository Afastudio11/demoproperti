import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Unit = { id: number; blok: string; nomor: string };
type Defect = { id: number; unitId: number; kategori: string; deskripsi: string; status: string; verifiedBy: string | null; createdAt: string };

const CATEGORIES = ["Struktur", "Dinding", "Atap", "Keramik", "Cat", "Instalasi Listrik", "Instalasi Air", "Kusen & Pintu", "Plafon", "Lainnya"];

export default function QcDefect() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ unitId: "", kategori: "", deskripsi: "" });
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: units } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; },
  });

  const { data: defects, isLoading } = useQuery({
    queryKey: ["qc-defects"],
    queryFn: async () => { const r = await fetch("/api/qc/defects"); return r.json() as Promise<Defect[]>; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/qc/defects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: parseInt(form.unitId), kategori: form.kategori, deskripsi: form.deskripsi }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qc-defects"] }); toast({ title: "Defect dicatat" }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/qc/defects/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qc-defects"] }),
  });

  const filtered = (defects ?? []).filter(d => filter === "all" || d.status === filter);
  const unitName = (id: number) => { const u = units?.find(u => u.id === id); return u ? `Blok ${u.blok}-${u.nomor}` : "—"; };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Defect & Garansi</h1>
          <p className="text-sm text-muted-foreground">Catat dan track defect yang ditemukan saat dan pasca konstruksi</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 h-8"><Plus className="size-3.5" /> Catat Defect</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {["open", "in_repair", "closed"].map(s => (
          <Card key={s} className={s === "open" ? "border-red-500/20" : s === "in_repair" ? "border-amber-500/20" : ""}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{s === "open" ? "Open" : s === "in_repair" ? "In Repair" : "Closed"}</p>
              <p className={`text-xl font-bold ${s === "open" ? "text-red-500" : s === "in_repair" ? "text-amber-500" : "text-emerald-500"}`}>{(defects ?? []).filter(d => d.status === s).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <Card className="border-primary/30"><CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={form.unitId} onValueChange={v => setForm(p => ({ ...p, unitId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih unit..." /></SelectTrigger>
                <SelectContent>{(units ?? []).map(u => <SelectItem key={u.id} value={String(u.id)}>Blok {u.blok}-{u.nomor}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Kategori..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs">Deskripsi</Label>
              <Input value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} placeholder="Deskripsi singkat..." className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.unitId || !form.kategori || !form.deskripsi || createMutation.isPending} className="h-8">Simpan</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="flex gap-2">
        {[{ v: "all", l: "Semua" }, { v: "open", l: "Open" }, { v: "in_repair", l: "In Repair" }, { v: "closed", l: "Closed" }].map(s => (
          <button key={s.v} onClick={() => setFilter(s.v)} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filter === s.v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{s.l}</button>
        ))}
      </div>

      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : (
        <div className="space-y-2">
          {filtered.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada defect</div> : filtered.map(d => (
            <Card key={d.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {d.status === "open" ? <AlertTriangle className="size-4 text-red-500" /> : d.status === "in_repair" ? <Wrench className="size-4 text-amber-500" /> : <CheckCircle2 className="size-4 text-emerald-500" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{unitName(d.unitId)}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{d.kategori}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.deskripsi}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {d.status === "open" && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateMutation.mutate({ id: d.id, status: "in_repair" })}>Repair</Button>}
                    {d.status === "in_repair" && <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => updateMutation.mutate({ id: d.id, status: "closed" })}>Tutup</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
