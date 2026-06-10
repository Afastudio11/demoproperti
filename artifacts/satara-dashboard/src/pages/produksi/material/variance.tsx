import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StokRow = { id: number; name: string; category: string; satuan: string; standardPerUnit: number | null; totalKeluar: number; unitPrice: number | null };
type Unit = { id: number; progress: number };

export default function MaterialVariance() {
  const { data: stok, isLoading } = useQuery({ queryKey: ["material-stok"], queryFn: async () => { const r = await fetch("/api/produksi/material/stok"); return r.json() as Promise<StokRow[]>; } });
  const { data: units } = useQuery({ queryKey: ["units-list"], queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; } });

  const unitCount = Math.max(1, (units ?? []).filter(u => u.progress > 0).length);

  const rows = (stok ?? []).filter(s => s.standardPerUnit != null && s.totalKeluar > 0).map(s => {
    const standard = (s.standardPerUnit ?? 0) * unitCount;
    const actual = s.totalKeluar;
    const variance = actual - standard;
    const pct = standard > 0 ? Math.round((variance / standard) * 100) : 0;
    const value = Math.abs(variance) * (s.unitPrice ?? 0);
    return { ...s, standard, actual, variance, pct, value };
  }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const overuse = rows.filter(r => r.variance > 0);
  const underuse = rows.filter(r => r.variance < 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Variance Analysis</h1>
        <p className="text-sm text-muted-foreground">Aktual vs standar penggunaan material ({unitCount} unit)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-red-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Over Usage</p><p className="text-xl font-bold text-red-500">{overuse.length} item</p></CardContent></Card>
        <Card className="border-emerald-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Under Usage</p><p className="text-xl font-bold text-emerald-500">{underuse.length} item</p></CardContent></Card>
      </div>
      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-4">Material</th>
              <th className="text-right py-2.5 px-2">Standar</th>
              <th className="text-right py-2.5 px-2">Aktual</th>
              <th className="text-right py-2.5 px-2">Variance</th>
              <th className="text-right py-2.5 px-4">%</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Tidak ada data variance</td></tr> :
              rows.map(r => (
                <tr key={r.id} className={`border-b hover:bg-muted/20 ${r.pct > 10 ? "bg-red-500/5" : r.pct < -10 ? "bg-emerald-500/5" : ""}`}>
                  <td className="py-2 px-4 font-medium">{r.name}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{r.standard.toFixed(1)} {r.satuan}</td>
                  <td className="py-2 px-2 text-right">{r.actual.toFixed(1)} {r.satuan}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${r.variance > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    <div className="flex items-center justify-end gap-1">
                      {r.variance > 0 ? <TrendingUp className="size-3" /> : r.variance < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                      {r.variance > 0 ? "+" : ""}{r.variance.toFixed(1)}
                    </div>
                  </td>
                  <td className={`py-2 px-4 text-right font-semibold ${r.pct > 10 ? "text-red-500" : r.pct < -10 ? "text-emerald-500" : "text-muted-foreground"}`}>{r.pct > 0 ? "+" : ""}{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></CardContent></Card>
      )}
    </div>
  );
}
