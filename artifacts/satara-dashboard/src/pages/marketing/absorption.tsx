import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

function fmtPct(n: number) { return `${n}%`; }
function rateColor(r: number) {
  if (r >= 70) return "text-emerald-600";
  if (r >= 40) return "text-amber-600";
  return "text-red-600";
}
function rateBg(r: number) {
  if (r >= 70) return "bg-emerald-500";
  if (r >= 40) return "bg-amber-500";
  return "bg-red-500";
}

const TAHAP_OPTIONS = ["T1","T2","T3","T4","T5","T6","T7","T8","Semua"];

export default function AbsorpsiPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ projectId: "", tahap: "T1", totalUnit: "", unitTerjual: "", tanggalLaunching: "", targetBulan: "" });

  const { data: absorptions = [], isLoading } = useQuery<any[]>({
    queryKey: ["marketing-absorption"],
    queryFn: () => fetch("/api/marketing/absorption").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body = { ...form, projectId: parseInt(form.projectId), totalUnit: parseInt(form.totalUnit), unitTerjual: parseInt(form.unitTerjual || "0"), targetBulan: form.targetBulan ? parseInt(form.targetBulan) : undefined };
      const r = await fetch("/api/marketing/absorption", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-absorption"] }); toast({ title: "Data absorpsi ditambahkan" }); setOpen(false); },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/marketing/absorption/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-absorption"] }); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const totalUnit = (absorptions as any[]).reduce((s, a) => s + (a.totalUnit ?? 0), 0);
  const totalTerjual = (absorptions as any[]).reduce((s, a) => s + (a.unitTerjual ?? 0), 0);
  const avgRate = totalUnit > 0 ? Math.round(totalTerjual / totalUnit * 100) : 0;

  const chartData = (absorptions as any[]).map(a => ({
    nama: `${a.projectName} ${a.tahap}`,
    Rate: a.absorptionRate ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Absorpsi Proyek</h1>
          <p className="text-xs text-muted-foreground">Persentase unit terjual per tahap peluncuran</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-3.5 mr-1" />Input Absorpsi</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">Input Data Absorpsi</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Proyek *</Label>
                  <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                    <SelectContent>{(projects as any[]).map((p:any) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tahap Peluncuran</Label>
                  <Select value={form.tahap} onValueChange={v => set("tahap", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TAHAP_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Launching</Label>
                  <Input type="date" className="h-8 text-xs" value={form.tanggalLaunching} onChange={e => set("tanggalLaunching", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Unit *</Label>
                  <Input type="number" className="h-8 text-xs" value={form.totalUnit} onChange={e => set("totalUnit", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Terjual</Label>
                  <Input type="number" className="h-8 text-xs" value={form.unitTerjual} onChange={e => set("unitTerjual", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target Bulan</Label>
                  <Input type="number" className="h-8 text-xs" value={form.targetBulan} onChange={e => set("targetBulan", e.target.value)} placeholder="bulan" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
                <Button size="sm" disabled={!form.projectId || !form.totalUnit || createMut.isPending} onClick={() => createMut.mutate()}>
                  {createMut.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Unit Keseluruhan", value: totalUnit },
          { label: "Unit Terjual", value: totalTerjual },
          { label: "Avg Absorption Rate", value: `${avgRate}%`, color: rateColor(avgRate) },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-xl font-semibold", color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-4 py-3"><CardTitle className="text-sm">Tabel Absorpsi per Proyek</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Proyek","Tahap","Total Unit","Unit Terjual","Sisa","Absorption Rate","Coverage","Launching"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : (absorptions as any[]).length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Belum ada data absorpsi</td></tr>
              ) : (absorptions as any[]).map(a => (
                <tr key={a.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{a.projectName}</td>
                  <td className="px-3 py-2">{a.tahap}</td>
                  <td className="px-3 py-2">{a.totalUnit}</td>
                  <td className="px-3 py-2">{a.unitTerjual}</td>
                  <td className="px-3 py-2">{a.sisa}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-muted rounded-full">
                        <div className={cn("h-full rounded-full", rateBg(a.absorptionRate ?? 0))} style={{ width: `${a.absorptionRate ?? 0}%` }} />
                      </div>
                      <span className={cn("font-medium", rateColor(a.absorptionRate ?? 0))}>{fmtPct(a.absorptionRate ?? 0)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{a.coverageMonths} bulan</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.tanggalLaunching ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Absorption Rate per Proyek/Tahap</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="nama" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="Rate" radius={[2,2,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.Rate >= 70 ? "#10b981" : entry.Rate >= 40 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
