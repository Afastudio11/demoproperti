import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type OutRow = { id: number; subkonName: string | null; materialId: number; quantity: number; material: { name: string; satuan: string; unitPrice: number | null } | null };

export default function MaterialKonsumsi() {
  const { data, isLoading } = useQuery({
    queryKey: ["material-out"],
    queryFn: async () => { const r = await fetch("/api/produksi/material/out"); return r.json() as Promise<OutRow[]>; },
  });

  const bySubkon = new Map<string, { material: string; qty: number; satuan: string; value: number }[]>();
  (data ?? []).forEach(r => {
    const key = r.subkonName ?? "Tanpa Subkon";
    const existing = bySubkon.get(key) ?? [];
    const mat = r.material?.name ?? "—";
    const found = existing.find(e => e.material === mat);
    if (found) { found.qty += r.quantity; found.value += r.quantity * (r.material?.unitPrice ?? 0); }
    else existing.push({ material: mat, qty: r.quantity, satuan: r.material?.satuan ?? "", value: r.quantity * (r.material?.unitPrice ?? 0) });
    bySubkon.set(key, existing);
  });

  const entries = Array.from(bySubkon.entries()).sort(([, a], [, b]) => b.reduce((s, x) => s + x.value, 0) - a.reduce((s, x) => s + x.value, 0));

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Konsumsi Material per Subkon</h1><p className="text-sm text-muted-foreground">Material yang telah diambil dan digunakan per subkontraktor</p></div>
      {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div> : entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Belum ada data keluar material</div>
      ) : (
        <div className="space-y-3">
          {entries.map(([subkon, items]) => {
            const totalValue = items.reduce((s, i) => s + i.value, 0);
            return (
              <Card key={subkon}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between"><CardTitle className="text-sm">{subkon}</CardTitle><span className="text-xs font-semibold text-primary">{fmtRp(totalValue)}</span></div>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1 pr-4">Material</th><th className="text-right py-1 pr-2">Qty</th><th className="text-right py-1">Nilai</th></tr></thead>
                    <tbody>
                      {items.map((i, idx) => (
                        <tr key={idx} className="border-b last:border-0"><td className="py-1 pr-4">{i.material}</td><td className="py-1 pr-2 text-right">{i.qty} {i.satuan}</td><td className="py-1 text-right">{fmtRp(i.value)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
