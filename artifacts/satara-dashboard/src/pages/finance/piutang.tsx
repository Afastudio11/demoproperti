import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Upload, TrendingDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const CATS = ["konsumen", "vendor", "internal", "bank_ht"];
const CAT_LABELS: Record<string, string> = { konsumen: "Konsumen", vendor: "Vendor", internal: "Internal", bank_ht: "Bank (HT)" };
const EMPTY = { debtorName: "", category: "konsumen", totalAmount: "", dueDate: "", notes: "" };

export default function PiutangCenter() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [catFilter, setCatFilter] = useState("semua");

  const { data, isLoading } = useQuery({
    queryKey: ["finance-piutang"],
    queryFn: () => fetch("/api/finance/piutang").then(r => r.json()),
    refetchInterval: 60000,
  });

  const byCategory: Record<string, any> = data?.byCategory ?? {};
  const total = data?.total ?? 0;
  const macetTotal = data?.macetTotal ?? 0;
  const records: any[] = data?.records ?? [];

  const addReceivable = useMutation({
    mutationFn: (body: any) => fetch("/api/finance/piutang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-piutang"] }); setShowForm(false); setForm(EMPTY); },
  });

  const totalCurrent = CATS.reduce((s, c) => s + (byCategory[c]?.current ?? 0), 0);
  const filtered = catFilter === "semua" ? records : records.filter(r => r.category === catFilter);
  const isEmpty = records.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Piutang Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring seluruh tagihan yang belum diterima perusahaan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" />
          Tambah Piutang
        </button>
      </div>

      {isEmpty && !isLoading && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data piutang belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1">Upload file piutang di Upload Center atau tambah data manual</p>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">Total Piutang</div>
          <div className="text-xl font-bold tabular-nums text-blue-600">{fmtRp(total)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">Piutang Cair &lt;30 Hari</div>
          <div className="text-xl font-bold tabular-nums text-emerald-600">{fmtRp(totalCurrent)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="size-3 text-red-500" />Piutang Macet (&gt;90 Hari)</div>
          <div className={cn("text-xl font-bold tabular-nums", macetTotal > 0 ? "text-red-500" : "")}>{fmtRp(macetTotal)}</div>
        </div>
      </div>

      {/* Aging analysis table */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Aging Analysis Piutang</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Kategori","Total","Current (<30 hr)","30-60 Hari","60-90 Hari",">90 Hari (Macet)"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATS.map(cat => {
                  const d = byCategory[cat];
                  if (!d) return null;
                  return (
                    <tr key={cat} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{CAT_LABELS[cat]}</td>
                      <td className="px-4 py-2.5 tabular-nums text-blue-600">{fmtRp(d.total)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-emerald-600">{fmtRp(d.current)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums", d.d30_60 > 0 ? "text-amber-500" : "")}>{fmtRp(d.d30_60)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums", d.d60_90 > 0 ? "text-orange-500" : "")}>{fmtRp(d.d60_90)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", d.macet > 0 ? "text-red-600" : "")}>{fmtRp(d.macet)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 tabular-nums text-blue-600">{fmtRp(total)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-emerald-600">{fmtRp(totalCurrent)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{fmtRp(CATS.reduce((s, c) => s + (byCategory[c]?.d30_60 ?? 0), 0))}</td>
                  <td className="px-4 py-2.5 tabular-nums">{fmtRp(CATS.reduce((s, c) => s + (byCategory[c]?.d60_90 ?? 0), 0))}</td>
                  <td className="px-4 py-2.5 tabular-nums text-red-600">{fmtRp(macetTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Deteksi */}
      {macetTotal > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">Deteksi AI: Piutang Berisiko</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300">Total piutang macet (&gt;90 hari): {fmtRp(macetTotal)}. Segera lakukan tindak lanjut penagihan.</p>
        </div>
      )}

      {/* Detail table */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Detail Piutang</h2>
            <div className="flex gap-1">
              {["semua", ...CATS].map(c => (
                <button key={c} onClick={() => setCatFilter(c)} className={cn("text-xs px-2.5 py-1 rounded-md transition-colors",
                  catFilter === c ? "bg-foreground text-background" : "border hover:bg-muted")}>
                  {c === "semua" ? "Semua" : CAT_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">{["Debitur","Kategori","Total","Jatuh Tempo","Status"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((r: any) => {
                  const today = new Date();
                  const due = r.dueDate ? new Date(r.dueDate) : null;
                  const daysOverdue = due ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
                  const isMacet = daysOverdue > 90;
                  return (
                    <tr key={r.id} className={cn("border-b last:border-0", isMacet ? "bg-red-50/50 dark:bg-red-950/10" : "")}>
                      <td className="px-4 py-2.5 font-medium">{r.debtorName}{isMacet && <AlertTriangle className="inline size-3 text-red-500 ml-1.5" />}</td>
                      <td className="px-4 py-2.5 text-xs">{CAT_LABELS[r.category] ?? r.category}</td>
                      <td className="px-4 py-2.5 tabular-nums text-blue-600 font-medium">{fmtRp(Number(r.totalAmount))}</td>
                      <td className="px-4 py-2.5 text-xs">{r.dueDate ?? "-"}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                          isMacet ? "bg-red-100 text-red-700" : daysOverdue > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                          {isMacet ? "Macet" : daysOverdue > 0 ? "Lewat Tempo" : "Current"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-none p-5 space-y-3">
            <h2 className="text-sm font-semibold">Tambah Data Piutang</h2>
            {[{ key: "debtorName", label: "Nama Debitur", type: "text" },{ key: "totalAmount", label: "Total Piutang (Rp)", type: "number" },{ key: "dueDate", label: "Jatuh Tempo", type: "date" }].map(f => (
              <div key={f.key}><label className="text-xs text-muted-foreground">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
              </div>
            ))}
            <div><label className="text-xs text-muted-foreground">Kategori</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
                {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Catatan</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => addReceivable.mutate(form)} disabled={addReceivable.isPending} className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">
                {addReceivable.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
