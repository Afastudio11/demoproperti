import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { CategorySelect, useCategoryOptions } from "@/components/category-select";

const DEFAULT_DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];
const now = new Date();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function getWorkloadStatus(ratio: number) {
  if (ratio > 120) return { label: "Critical Overload", color: "text-red-600", bg: "bg-red-50 border-red-200" };
  if (ratio > 100) return { label: "Overloaded", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  if (ratio >= 80) return { label: "Normal", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  return { label: "Underloaded", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
}

const EMPTY = { division: DEFAULT_DIVISIONS[0], periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, capacity: 100, actualLoad: 0, loadDescription: "" };

export default function Workload() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-workload"], queryFn: () => fetch("/api/hr/workload").then(r => r.json()) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/workload/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/hr/workload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-workload"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/workload/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-workload"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r, capacity: Number(r.capacity), actualLoad: Number(r.actualLoad) }); setEditId(r.id); setShowForm(true); }

  const filtered = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const chartData = filtered.map((r: any) => ({
    division: r.division.replace(" Office", ""),
    Kapasitas: Number(r.capacity),
    Beban: Number(r.actualLoad),
    ratio: Number(r.capacity) > 0 ? (Number(r.actualLoad) / Number(r.capacity)) * 100 : 0,
  }));

  const criticals = filtered.filter((r: any) => Number(r.actualLoad) / Number(r.capacity) > 1.2);
  const overloaded = filtered.filter((r: any) => { const rt = Number(r.actualLoad) / Number(r.capacity); return rt > 1.0 && rt <= 1.2; });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Workload Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mengukur keseimbangan beban kerja dengan kapasitas SDM per divisi</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Input Beban Kerja</button>
      </div>

      <div className="flex items-center gap-2">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
      </div>

      {/* Alerts */}
      {(criticals.length > 0 || overloaded.length > 0) && (
        <div className="space-y-2">
          {criticals.map((r: any) => {
            const ratio = (Number(r.actualLoad) / Number(r.capacity) * 100 - 100).toFixed(0);
            return (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
                <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-red-700">{r.division} Critical Overload {ratio}%.</span>
                  <span className="text-red-600 ml-1">Pertimbangkan penambahan SDM atau redistribusi tugas segera.</span>
                  {r.loadDescription && <div className="text-xs text-red-500 mt-0.5">{r.loadDescription}</div>}
                </div>
              </div>
            );
          })}
          {overloaded.map((r: any) => {
            const ratio = (Number(r.actualLoad) / Number(r.capacity) * 100 - 100).toFixed(0);
            return (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-700">{r.division} Overloaded {ratio}%.</span>
                  <span className="text-amber-600 ml-1">Perlu perhatian dan monitoring lebih lanjut.</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-medium text-sm mb-4">Kapasitas vs Beban Aktual per Divisi</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="division" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "100%", fontSize: 10, fill: "#ef4444" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Kapasitas" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Beban" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Divisi</th>
                <th className="text-center px-3 py-3 font-medium">Kapasitas</th>
                <th className="text-center px-3 py-3 font-medium">Beban Aktual</th>
                <th className="text-center px-3 py-3 font-medium">Workload Ratio</th>
                <th className="text-left px-3 py-3 font-medium">Status</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const ratio = Number(r.capacity) > 0 ? (Number(r.actualLoad) / Number(r.capacity)) * 100 : 0;
                const { label, color, bg } = getWorkloadStatus(ratio);
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{r.division}</div>
                      {r.loadDescription && <div className="text-xs text-muted-foreground">{r.loadDescription}</div>}
                    </td>
                    <td className="text-center px-3 py-2.5">{r.capacity}</td>
                    <td className="text-center px-3 py-2.5 font-medium">{r.actualLoad}</td>
                    <td className="text-center px-3 py-2.5"><span className={cn("font-bold", color)}>{ratio.toFixed(0)}%</span></td>
                    <td className="px-3 py-2.5"><span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border", bg, color)}>{label}</span></td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                        <button onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Belum ada data workload untuk periode ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Input"} Beban Kerja</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label><CategorySelect type="hr_divisi" defaults={DEFAULT_DIVISIONS} value={form.division ?? ""} onChange={v => setForm((f: any) => ({ ...f, division: v }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan</label><select value={form.periodMonth} onChange={e => setForm((f: any) => ({ ...f, periodMonth: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label><select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kapasitas (poin)</label><input type="number" value={form.capacity ?? 100} onChange={e => setForm((f: any) => ({ ...f, capacity: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Beban Aktual (poin)</label><input type="number" value={form.actualLoad ?? 0} onChange={e => setForm((f: any) => ({ ...f, actualLoad: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
              </div>
              {form.actualLoad > 0 && form.capacity > 0 && (() => {
                const rt = (form.actualLoad / form.capacity) * 100;
                const { label, color } = getWorkloadStatus(rt);
                return <div className={cn("text-sm font-semibold px-3 py-2 rounded-lg bg-muted/50 border")}>Workload Ratio: <span className={color}>{rt.toFixed(0)}% — {label}</span></div>;
              })()}
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Beban</label><textarea value={form.loadDescription ?? ""} onChange={e => setForm((f: any) => ({ ...f, loadDescription: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Deskripsi pekerjaan yang menyebabkan overload..." /></div>
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
