import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";

type StokRow = { id: number; name: string; category: string; satuan: string; standardPerUnit: number | null; stokAktual: number; minimumStock: number; unitPrice: number | null; isBelowMinimum: boolean };
type Unit = { id: number; progress: number };

export default function MaterialForecast() {
  const { data: stok, isLoading } = useQuery({ queryKey: ["material-stok"], queryFn: async () => { const r = await fetch("/api/produksi/material/stok"); return r.json() as Promise<StokRow[]>; } });
  const { data: units } = useQuery({ queryKey: ["units-list"], queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; } });

  const activeUnits = (units ?? []).filter(u => u.progress > 0 && u.progress < 100).length;
  const urgency = (stok ?? []).filter(s => s.isBelowMinimum).map(s => {
    const need = Math.max(0, (s.minimumStock * 2) - s.stokAktual);
    const cost = need * (s.unitPrice ?? 0);
    return { ...s, need, cost, urgencyLevel: s.stokAktual <= 0 ? "urgent" : s.stokAktual < s.minimumStock * 0.5 ? "high" : "medium" };
  }).sort((a, b) => (b.urgencyLevel === "urgent" ? 2 : b.urgencyLevel === "high" ? 1 : 0) - (a.urgencyLevel === "urgent" ? 2 : a.urgencyLevel === "high" ? 1 : 0));

  const totalCost = urgency.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Procurement Forecast (14 Hari)</h1>
        <p className="text-sm text-muted-foreground">Material yang perlu segera diprocure untuk kebutuhan {activeUnits} unit aktif</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Harus Dicure</p><p className="text-xl font-bold text-red-500">{urgency.filter(u => u.urgencyLevel === "urgent").length}</p></CardContent></Card>
        <Card className="border-amber-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Prioritas Tinggi</p><p className="text-xl font-bold text-amber-500">{urgency.filter(u => u.urgencyLevel === "high").length}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Est. Biaya Pengadaan</p><p className="text-lg font-bold">Rp {(totalCost / 1_000_000).toFixed(1)} Jt</p></CardContent></Card>
      </div>
      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : urgency.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-emerald-500 font-medium">Semua material cukup untuk 14 hari ke depan</p>
        </div>
      ) : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left py-2.5 px-4">Material</th>
              <th className="text-right py-2.5 px-2">Stok Saat Ini</th>
              <th className="text-right py-2.5 px-2">Min. Stok</th>
              <th className="text-right py-2.5 px-2">Perlu Dibeli</th>
              <th className="text-right py-2.5 px-2">Est. Biaya</th>
              <th className="text-center py-2.5 px-4">Urgensi</th>
            </tr></thead>
            <tbody>
              {urgency.map(r => (
                <tr key={r.id} className={`border-b hover:bg-muted/20 ${r.urgencyLevel === "urgent" ? "bg-red-500/5" : r.urgencyLevel === "high" ? "bg-amber-500/5" : ""}`}>
                  <td className="py-2 px-4 font-medium">{r.name}</td>
                  <td className={`py-2 px-2 text-right ${r.stokAktual <= 0 ? "text-red-500 font-bold" : "text-amber-500"}`}>{r.stokAktual} {r.satuan}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{r.minimumStock}</td>
                  <td className="py-2 px-2 text-right font-semibold">{r.need} {r.satuan}</td>
                  <td className="py-2 px-2 text-right">{r.cost > 0 ? `Rp ${(r.cost / 1_000_000).toFixed(1)} Jt` : "—"}</td>
                  <td className="py-2 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${r.urgencyLevel === "urgent" ? "text-red-500" : r.urgencyLevel === "high" ? "text-amber-500" : "text-blue-500"}`}>
                      {r.urgencyLevel === "urgent" && <AlertTriangle className="size-3" />}
                      {r.urgencyLevel === "urgent" ? "URGENT" : r.urgencyLevel === "high" ? "TINGGI" : "SEDANG"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></CardContent></Card>
      )}
    </div>
  );
}
