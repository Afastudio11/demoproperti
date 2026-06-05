import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Material = { id: number; name: string; category: string; satuan: string; standardPerUnit: number | null; unitPrice: number | null; minimumStock: number };

const fmtRp = (n: number) => n.toLocaleString("id-ID");
const CATEGORIES = ["A - Pendahuluan", "B - Struktur", "C - Atap & Rangka", "D - Finishing", "E - Instalasi Listrik", "F - Instalasi Air"];

export default function MaterialMaster() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", satuan: "", standardPerUnit: "", unitPrice: "", minimumStock: "0" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["material-master"],
    queryFn: async () => { const r = await fetch("/api/produksi/material/master"); return r.json() as Promise<Material[]>; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/material/master", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, category: form.category, satuan: form.satuan, standardPerUnit: parseFloat(form.standardPerUnit) || null, unitPrice: parseFloat(form.unitPrice) || null, minimumStock: parseFloat(form.minimumStock) || 0 }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["material-master"] }); toast({ title: "Material ditambahkan" }); setShowForm(false); },
    onError: () => toast({ title: "Gagal menambah material", variant: "destructive" }),
  });

  const cats = [...new Set((data ?? []).map(m => m.category))].sort();
  const filtered = (data ?? []).filter(m => {
    if (filterCat !== "all" && m.category !== filterCat) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = new Map<string, Material[]>();
  filtered.forEach(m => { const ex = grouped.get(m.category) ?? []; grouped.set(m.category, [...ex, m]); });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Master Material</h1>
          <p className="text-sm text-muted-foreground">Katalog material standar dengan spesifikasi per unit</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 h-8"><Plus className="size-3.5" /> Tambah</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30"><CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs">Nama Material</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Satuan</Label>
              <Input value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} placeholder="zak, btg, m3..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Standar per Unit</Label>
              <Input type="number" value={form.standardPerUnit} onChange={e => setForm(p => ({ ...p, standardPerUnit: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Harga Satuan (Rp)</Label>
              <Input type="number" value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum Stok</Label>
              <Input type="number" value={form.minimumStock} onChange={e => setForm(p => ({ ...p, minimumStock: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Batal</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!form.name || !form.category || !form.satuan || createMutation.isPending} className="h-8">Simpan</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari material..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat katalog material...</div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <Card key={cat}>
              <div className="px-4 py-2 bg-muted/30 border-b">
                <span className="text-xs font-semibold">{cat}</span>
                <span className="text-xs text-muted-foreground ml-2">({items.length} item)</span>
              </div>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1.5 px-4">Nama</th>
                      <th className="text-right py-1.5 px-2">Satuan</th>
                      <th className="text-right py-1.5 px-2">Std/Unit</th>
                      <th className="text-right py-1.5 px-2">Harga Satuan</th>
                      <th className="text-right py-1.5 px-4">Min. Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(m => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-1.5 px-4">{m.name}</td>
                        <td className="py-1.5 px-2 text-right">{m.satuan}</td>
                        <td className="py-1.5 px-2 text-right">{m.standardPerUnit ?? "—"}</td>
                        <td className="py-1.5 px-2 text-right">{m.unitPrice ? `Rp ${fmtRp(m.unitPrice)}` : "—"}</td>
                        <td className="py-1.5 px-4 text-right">{m.minimumStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Material tidak ditemukan</div>}
        </div>
      )}
    </div>
  );
}
