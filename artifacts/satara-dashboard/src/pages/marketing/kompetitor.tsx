import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";

function fmtRp(n: number) { return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", notation:"compact", maximumFractionDigits:1 }).format(n); }

const EMPTY = { projectId: "", namaKompetitor: "", lokasi: "", jarak: "", tipeUnit: "", hargaMin: "", hargaMax: "", totalUnit: "", unitTerjual: "", progress: "", tanggalLaunching: "", kelebihan: "", kekurangan: "" };

export default function KompetitorPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: competitors = [], isLoading } = useQuery<any[]>({
    queryKey: ["marketing-competitors"],
    queryFn: () => fetch("/api/marketing/competitors").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const { data: absorptions = [] } = useQuery<any[]>({
    queryKey: ["marketing-absorption"],
    queryFn: () => fetch("/api/marketing/absorption").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body: any = { ...form };
      if (body.projectId) body.projectId = parseInt(body.projectId);
      ["jarak","hargaMin","hargaMax","totalUnit","unitTerjual","progress"].forEach(k => {
        if (body[k]) body[k] = Number(body[k]); else delete body[k];
      });
      const r = await fetch("/api/marketing/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-competitors"] }); toast({ title: "Data kompetitor ditambahkan" }); setOpen(false); setForm({ ...EMPTY }); },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/marketing/competitors/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-competitors"] }),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const ownPrices = (absorptions as any[]).map(a => ({ min: 0, max: 0 }));
  const avgOwnPrice = 200000000;

  const alerts = (competitors as any[]).filter(c => c.hargaMin && c.hargaMin < avgOwnPrice && (c.progress ?? 0) > 60);
  const scatterData = [
    ...(competitors as any[]).map(c => ({ nama: c.namaKompetitor, harga: c.hargaMin ?? 0, progress: c.progress ?? 0, total: c.totalUnit ?? 10, type: "kompetitor" })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Monitor Kompetitor</h1>
          <p className="text-xs text-muted-foreground">Pantau proyek properti pesaing di sekitar lokasi</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-3.5 mr-1" />Tambah Kompetitor</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">Input Data Kompetitor</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Nama Kompetitor *</Label>
                  <Input className="h-8 text-xs" value={form.namaKompetitor} onChange={e => set("namaKompetitor", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lokasi</Label>
                  <Input className="h-8 text-xs" value={form.lokasi} onChange={e => set("lokasi", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Jarak dari Proyek Kita (km)</Label>
                  <Input type="number" className="h-8 text-xs" value={form.jarak} onChange={e => set("jarak", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipe Unit</Label>
                  <Input className="h-8 text-xs" value={form.tipeUnit} onChange={e => set("tipeUnit", e.target.value)} placeholder="Tipe 36, 45..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Launching</Label>
                  <Input type="date" className="h-8 text-xs" value={form.tanggalLaunching} onChange={e => set("tanggalLaunching", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Harga Min (Rp)</Label>
                  <CurrencyInput className="h-8 text-xs" value={form.hargaMin} onChange={raw => set("hargaMin", raw)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Harga Max (Rp)</Label>
                  <CurrencyInput className="h-8 text-xs" value={form.hargaMax} onChange={raw => set("hargaMax", raw)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Unit</Label>
                  <Input type="number" className="h-8 text-xs" value={form.totalUnit} onChange={e => set("totalUnit", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Terjual</Label>
                  <Input type="number" className="h-8 text-xs" value={form.unitTerjual} onChange={e => set("unitTerjual", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Progress Konstruksi (%)</Label>
                  <Input type="number" min="0" max="100" className="h-8 text-xs" value={form.progress} onChange={e => set("progress", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Proyek Terdekat (Property)</Label>
                  <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                    <SelectContent>{(projects as any[]).map((p:any) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Kelebihan Kompetitor</Label>
                  <Textarea className="text-xs min-h-14" value={form.kelebihan} onChange={e => set("kelebihan", e.target.value)} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Kelemahan Kompetitor</Label>
                  <Textarea className="text-xs min-h-14" value={form.kekurangan} onChange={e => set("kekurangan", e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
                <Button size="sm" disabled={!form.namaKompetitor || createMut.isPending} onClick={() => createMut.mutate()}>
                  {createMut.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700">Waspada: Kompetitor harga lebih rendah & konstruksi lebih maju</span>
          </div>
          {alerts.map(a => (
            <p key={a.id} className="text-xs text-red-600 ml-6">{a.namaKompetitor} — Harga {fmtRp(a.hargaMin)}, Progress {a.progress}%</p>
          ))}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Kompetitor","Lokasi","Jarak","Tipe","Harga Min","Harga Max","Total Unit","Terjual","Progress","Launching","Kelebihan","Aksi"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : (competitors as any[]).length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">Belum ada data kompetitor</td></tr>
              ) : (competitors as any[]).map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{c.namaKompetitor}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.lokasi ?? "-"}</td>
                  <td className="px-3 py-2">{c.jarak ? `${c.jarak}km` : "-"}</td>
                  <td className="px-3 py-2">{c.tipeUnit ?? "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.hargaMin ? fmtRp(c.hargaMin) : "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.hargaMax ? fmtRp(c.hargaMax) : "-"}</td>
                  <td className="px-3 py-2">{c.totalUnit ?? "-"}</td>
                  <td className="px-3 py-2">{c.unitTerjual ?? "-"}</td>
                  <td className="px-3 py-2">
                    {c.progress != null ? (
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-muted rounded-full"><div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} /></div>
                        <span>{c.progress}%</span>
                      </div>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-2">{c.tanggalLaunching ?? "-"}</td>
                  <td className="px-3 py-2 max-w-32 truncate" title={c.kelebihan}>{c.kelebihan ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                      onClick={() => confirm("Hapus data kompetitor?") && deleteMut.mutate(c.id)}>Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
