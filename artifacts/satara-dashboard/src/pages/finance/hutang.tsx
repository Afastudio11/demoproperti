import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const CATS = ["kpp", "vendor", "supplier", "internal"];
const CAT_LABELS: Record<string, string> = { kpp: "KPP", vendor: "Vendor", supplier: "Supplier", internal: "Internal" };

const EMPTY = { creditorName: "", category: "vendor", totalAmount: "", dueDate: "", notes: "" };

export default function HutangCenter() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [catFilter, setCatFilter] = useState("semua");

  const { data, isLoading } = useQuery({
    queryKey: ["finance-hutang"],
    queryFn: () => fetch("/api/finance/hutang").then(r => r.json()),
    refetchInterval: 60000,
  });

  const byCategory: Record<string, any> = data?.byCategory ?? {};
  const total = data?.total ?? 0;
  const records: any[] = data?.records ?? [];

  const addDebt = useMutation({
    mutationFn: (body: any) => fetch("/api/finance/hutang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-hutang"] }); setShowForm(false); setForm(EMPTY); },
  });

  const chartData = CATS.map(cat => ({
    name: CAT_LABELS[cat],
    lt30: byCategory[cat]?.lt30 ?? 0,
    d30_60: byCategory[cat]?.d30_60 ?? 0,
    gt60: byCategory[cat]?.gt60 ?? 0,
  }));

  const totalLt30 = CATS.reduce((s, c) => s + (byCategory[c]?.lt30 ?? 0), 0);
  const totalD30_60 = CATS.reduce((s, c) => s + (byCategory[c]?.d30_60 ?? 0), 0);

  const filtered = catFilter === "semua" ? records : records.filter(r => r.category === catFilter);

  const isEmpty = records.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Hutang Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring seluruh kewajiban hutang perusahaan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
            <Plus className="size-3.5" />
            Tambah Hutang
          </button>
        </div>
      </div>

      {isEmpty && !isLoading && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data hutang belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file hutang di Upload Center atau tambah data manual</p>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">Total Hutang</div>
          <div className="text-xl font-bold tabular-nums text-red-500">{fmtRp(total)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="size-3 text-red-500" />Jatuh Tempo &lt;30 Hari</div>
          <div className={cn("text-xl font-bold tabular-nums", totalLt30 > 0 ? "text-red-500" : "")}>{fmtRp(totalLt30)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="size-3 text-amber-500" />Jatuh Tempo 30-60 Hari</div>
          <div className={cn("text-xl font-bold tabular-nums", totalD30_60 > 0 ? "text-amber-500" : "")}>{fmtRp(totalD30_60)}</div>
        </div>
      </div>

      {/* Summary Table by Category */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Ringkasan per Kategori</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Kategori","Total Hutang","Jatuh Tempo <30 Hari","Jatuh Tempo 30-60 Hari","Jatuh Tempo >60 Hari"].map(h => (
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
                      <td className="px-4 py-2.5 tabular-nums text-red-500">{fmtRp(d.total)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums", d.lt30 > 0 ? "text-red-600 font-semibold" : "")}>{fmtRp(d.lt30)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums", d.d30_60 > 0 ? "text-amber-500" : "")}>{fmtRp(d.d30_60)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{fmtRp(d.gt60)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 tabular-nums text-red-500">{fmtRp(total)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-red-600">{fmtRp(totalLt30)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-amber-500">{fmtRp(totalD30_60)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{fmtRp(CATS.reduce((s, c) => s + (byCategory[c]?.gt60 ?? 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bar chart */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Hutang per Kategori (Aging)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-10" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}Jt`} />
              <Tooltip formatter={(v: number, k: string) => [fmtRp(v), k === "lt30" ? "<30 Hari" : k === "d30_60" ? "30-60 Hari" : ">60 Hari"]} />
              <Bar dataKey="lt30" fill="#ef4444" name="lt30" />
              <Bar dataKey="d30_60" fill="#f59e0b" name="d30_60" />
              <Bar dataKey="gt60" fill="#6b7280" name="gt60" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail table */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Detail Hutang</h2>
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
              <thead><tr className="border-b bg-muted/30">{["Kreditur","Kategori","Total Hutang","Jatuh Tempo","Status"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((r: any) => {
                  const isUrgent = r.dueDate && new Date(r.dueDate) <= new Date(Date.now() + 14 * 86400000);
                  return (
                    <tr key={r.id} className={cn("border-b last:border-0", isUrgent ? "bg-red-50/50 dark:bg-red-950/10" : "")}>
                      <td className="px-4 py-2.5 font-medium">{r.creditorName}{isUrgent && <AlertTriangle className="inline size-3 text-red-500 ml-1.5" />}</td>
                      <td className="px-4 py-2.5 text-xs">{CAT_LABELS[r.category] ?? r.category}</td>
                      <td className="px-4 py-2.5 tabular-nums text-red-500 font-medium">{fmtRp(Number(r.totalAmount))}</td>
                      <td className="px-4 py-2.5 text-xs">{r.dueDate ?? "-"}</td>
                      <td className="px-4 py-2.5"><span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                        r.status === "outstanding" ? "bg-amber-100 text-amber-700" : r.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {r.status}
                      </span></td>
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
          <div className="rounded-xl border bg-background w-full max-w-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold">Tambah Data Hutang</h2>
            {[{ key: "creditorName", label: "Nama Kreditur", type: "text" },{ key: "totalAmount", label: "Total Hutang (Rp)", type: "number" },{ key: "dueDate", label: "Jatuh Tempo", type: "date" }].map(f => (
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
              <button onClick={() => addDebt.mutate(form)} disabled={addDebt.isPending} className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">
                {addDebt.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
