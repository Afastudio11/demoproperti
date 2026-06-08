import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { fmtCurrency } from "@/lib/planning-calc";
import { Save, Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type ProductRow = {
  id?: number;
  projectId: number;
  houseType: string;
  buildingArea: number;
  kavlingArea: number;
  sellingPrice: number;
  unitCount: number;
  targetSegment: string;
  competitorPrice: number;
};

const newRow = (projectId: number): ProductRow => ({
  projectId, houseType: "", buildingArea: 0, kavlingArea: 0,
  sellingPrice: 0, unitCount: 0, targetSegment: "MBR", competitorPrice: 0,
});

const SEGMENTS = ["MBR", "MBR+", "Menengah", "Menengah Atas", "Premium"];

export default function ProdukPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(0);
  const [rows, setRows] = useState<ProductRow[]>([]);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });

  const selectProject = async (id: number) => {
    setProjectId(id);
    const existing = await fetch(`/api/planning/product?projectId=${id}`).then(r => r.json());
    if (existing.length > 0) {
      setRows(existing);
    } else {
      setRows([newRow(id)]);
    }
  };

  const setRowField = (i: number, k: keyof ProductRow, v: string | number) => {
    setRows(prev => {
      const next = [...prev];
      (next[i] as Record<string, unknown>)[k] = v;
      return next;
    });
  };

  const addRow = () => setRows(prev => [...prev, newRow(projectId)]);

  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id) {
      await fetch(`/api/planning/product/${row.id}`, { method: "DELETE" });
    }
    setRows(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    for (const row of rows) {
      if (!row.houseType) continue;
      const payload = { ...row, projectId };
      if (row.id) {
        await fetch(`/api/planning/product/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        const resp = await fetch("/api/planning/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const d = await resp.json();
        row.id = d.id;
      }
    }
    await qc.invalidateQueries({ queryKey: ["planning-product"] });
    toast({ title: "Perencanaan produk tersimpan" });
  };

  const totalRevenue = rows.reduce((s, r) => s + r.sellingPrice * r.unitCount, 0);
  const totalUnits = rows.reduce((s, r) => s + r.unitCount, 0);
  const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  const chartData = rows.filter(r => r.houseType).map(r => ({
    name: r.houseType,
    "Harga Kita": r.sellingPrice / 1_000_000,
    "Kompetitor": r.competitorPrice / 1_000_000,
  }));

  const projectList = Array.isArray(projects) ? projects : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Perencanaan Produk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tipe unit, harga jual, segmen target & perbandingan kompetitor</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5"><Plus className="size-3.5" />Tambah Tipe</Button>
          <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select onValueChange={v => selectProject(parseInt(v))}>
          <SelectTrigger className="h-8 w-64">
            <SelectValue placeholder="Pilih proyek..." />
          </SelectTrigger>
          <SelectContent>
            {projectList.map((p: Record<string, unknown>) => (
              <SelectItem key={p.id as number} value={String(p.id)}>{p.nama as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Tipe Rumah", "LB (m²)", "LT (m²)", "Harga Jual (Rp)", "Jumlah Unit", "Segmen", "Harga Kompetitor (Rp)", ""].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5">
                      <Input className="h-7 w-28 text-xs" value={row.houseType} onChange={e => setRowField(i, "houseType", e.target.value)} placeholder="Tipe 36/72" />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumericInput className="h-7 w-16 text-xs" decimals={1} value={row.buildingArea} onChange={v => setRowField(i, "buildingArea", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumericInput className="h-7 w-16 text-xs" decimals={1} value={row.kavlingArea} onChange={v => setRowField(i, "kavlingArea", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <CurrencyInput className="h-7 w-36 text-xs" value={row.sellingPrice} onChange={raw => setRowField(i, "sellingPrice", raw ? Number(raw) : 0)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumericInput className="h-7 w-16 text-xs" value={row.unitCount} onChange={v => setRowField(i, "unitCount", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={row.targetSegment} onValueChange={v => setRowField(i, "targetSegment", v)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <CurrencyInput className="h-7 w-36 text-xs" value={row.competitorPrice} onChange={raw => setRowField(i, "competitorPrice", raw ? Number(raw) : 0)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => removeRow(i)}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="px-3 py-2 text-xs">TOTAL</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2 text-xs">{fmtCurrency(avgPrice)}</td>
                  <td className="px-3 py-2 text-xs">{totalUnits} unit</td>
                  <td colSpan={2} />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Total Revenue Proyeksi", val: fmtCurrency(totalRevenue), color: "text-emerald-500" },
          { label: "Total Unit", val: `${totalUnits} unit`, color: "text-foreground" },
          { label: "Harga Rata-rata", val: fmtCurrency(avgPrice), color: "text-blue-500" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className={`text-lg font-bold mt-1 ${kpi.color}`}>{kpi.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Perbandingan Harga vs Kompetitor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={10} tickFormatter={v => `${v}jt`} />
                <Tooltip formatter={(v: number) => [`Rp ${v.toFixed(0)} jt`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Harga Kita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Kompetitor" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
