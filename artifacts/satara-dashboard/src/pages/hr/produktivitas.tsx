import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

const now = new Date();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const EMPTY = { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, totalRevenue: 0, totalProfit: 0, totalUnitsSold: 0, notes: "" };

function fmtRp(n: number) { if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`; if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`; return `Rp ${n.toLocaleString("id-ID")}`; }

export default function Produktivitas() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(r => r.json()) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-productivity"], queryFn: () => fetch("/api/hr/productivity").then(r => r.json()) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/productivity/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/hr/productivity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-productivity"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/productivity/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-productivity"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r, totalRevenue: Number(r.totalRevenue), totalProfit: Number(r.totalProfit), totalUnitsSold: Number(r.totalUnitsSold) }); setEditId(r.id); setShowForm(true); }

  const sortedRecords = [...records].sort((a: any, b: any) => a.periodYear * 12 + a.periodMonth - (b.periodYear * 12 + b.periodMonth));
  const activeEmps = employees.filter((e: any) => ["aktif", "tetap", "kontrak", "probasi"].includes(e.employmentStatus));
  const headcount = activeEmps.length || 1;

  const chartData = sortedRecords.map((r: any) => ({
    period: `${MONTHS[(r.periodMonth ?? 1) - 1]} ${r.periodYear}`,
    "Revenue/Karyawan (Jt)": headcount > 0 ? Math.round(Number(r.totalRevenue) / headcount / 1_000_000) : 0,
    "Profit/Karyawan (Jt)": headcount > 0 ? Math.round(Number(r.totalProfit) / headcount / 1_000_000) : 0,
    "Unit/Karyawan": headcount > 0 ? Math.round((Number(r.totalUnitsSold) / headcount) * 100) / 100 : 0,
  }));

  const latestRec = sortedRecords[sortedRecords.length - 1];
  const revPerEmp = latestRec ? Number(latestRec.totalRevenue) / headcount : 0;
  const profitPerEmp = latestRec ? Number(latestRec.totalProfit) / headcount : 0;
  const unitPerEmp = latestRec ? Number(latestRec.totalUnitsSold) / headcount : 0;
  const profitMargin = latestRec && Number(latestRec.totalRevenue) > 0 ? (Number(latestRec.totalProfit) / Number(latestRec.totalRevenue)) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Employee Productivity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue per karyawan, profit per karyawan, unit terjual per karyawan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Input Produktivitas</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Revenue/Karyawan", val: revPerEmp > 0 ? fmtRp(revPerEmp) : "—", color: "text-blue-600" },
          { label: "Profit/Karyawan", val: profitPerEmp > 0 ? fmtRp(profitPerEmp) : "—", color: "text-emerald-600" },
          { label: "Unit/Karyawan", val: unitPerEmp > 0 ? unitPerEmp.toFixed(2) : "—", color: "text-foreground" },
          { label: "Profit Margin", val: profitMargin > 0 ? `${profitMargin.toFixed(1)}%` : "—", color: profitMargin >= 20 ? "text-emerald-600" : "text-amber-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-lg font-bold", color)}>{val}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Headcount: {headcount}</div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-medium text-sm mb-4">Tren Produktivitas per Karyawan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Revenue/Karyawan (Jt)" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Profit/Karyawan (Jt)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Periode</th>
                <th className="text-right px-3 py-3 font-medium">Total Revenue</th>
                <th className="text-right px-3 py-3 font-medium">Total Profit</th>
                <th className="text-center px-3 py-3 font-medium">Unit Terjual</th>
                <th className="text-right px-3 py-3 font-medium">Revenue/Karyawan</th>
                <th className="text-center px-3 py-3 font-medium">Profit Margin</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => {
                const rpe = Number(r.totalRevenue) / headcount;
                const pm = Number(r.totalRevenue) > 0 ? (Number(r.totalProfit) / Number(r.totalRevenue)) * 100 : 0;
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</td>
                    <td className="text-right px-3 py-2.5">{fmtRp(Number(r.totalRevenue))}</td>
                    <td className="text-right px-3 py-2.5 text-emerald-600">{fmtRp(Number(r.totalProfit))}</td>
                    <td className="text-center px-3 py-2.5">{Number(r.totalUnitsSold)}</td>
                    <td className="text-right px-3 py-2.5">{fmtRp(rpe)}</td>
                    <td className="text-center px-3 py-2.5"><span className={cn("font-semibold", pm >= 20 ? "text-emerald-600" : "text-amber-600")}>{pm.toFixed(1)}%</span></td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                        <button onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Belum ada data produktivitas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Input"} Data Produktivitas</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan</label><select value={form.periodMonth} onChange={e => setForm((f: any) => ({ ...f, periodMonth: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label><select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              </div>
              {[{ label: "Total Revenue (Rp)", field: "totalRevenue" }, { label: "Total Profit (Rp)", field: "totalProfit" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input type="number" value={form[field] ?? 0} onChange={e => setForm((f: any) => ({ ...f, [field]: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
              ))}
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Terjual</label><input type="number" value={form.totalUnitsSold ?? 0} onChange={e => setForm((f: any) => ({ ...f, totalUnitsSold: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
              {form.totalRevenue > 0 && <div className="bg-muted/50 border rounded-lg px-3 py-2 text-sm font-semibold">Revenue/Karyawan: <span className="text-blue-600">{fmtRp(form.totalRevenue / headcount)}</span></div>}
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
