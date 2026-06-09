import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const now = new Date();
const EMPTY = { employeeId: 0, kpiDefinitionId: 0, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, target: 0, actual: 0, notes: "" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function KpiInput() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: defs = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-defs"], queryFn: () => fetch("/api/hr/kpi/definitions").then(apiJson) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-records"], queryFn: () => fetch("/api/hr/kpi/records").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/kpi/records/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/kpi/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-kpi-records"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/kpi/records/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-kpi-records"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r, target: Number(r.target), actual: Number(r.actual) }); setEditId(r.id); setShowForm(true); }

  const filtered = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);

  const selectedEmployee = employees.find((e: any) => e.id === Number(form.employeeId));
  const relevantDefs = selectedEmployee ? defs.filter((d: any) => d.position === selectedEmployee.position || d.division === selectedEmployee.division) : [];

  function getEmpName(id: number) { return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }
  function getKpiName(id: number) { return defs.find((d: any) => d.id === id)?.kpiName ?? `#${id}`; }

  const byEmployee: Record<string, any[]> = {};
  for (const r of filtered) {
    const name = getEmpName(r.employeeId);
    if (!byEmployee[name]) byEmployee[name] = [];
    byEmployee[name].push(r);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">KPI — Input Realisasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Input realisasi KPI karyawan per bulan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
          <Plus className="size-3.5" /> Input KPI
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} record</span>
      </div>

      <div className="space-y-4">
        {Object.keys(byEmployee).length === 0 && (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">Belum ada data KPI untuk periode ini.</div>
        )}
        {Object.entries(byEmployee).map(([empName, items]) => {
          const avgAch = items.length > 0 ? items.reduce((s, r) => s + Number(r.achievementPct), 0) / items.length : 0;
          const color = avgAch >= 90 ? "text-emerald-600" : avgAch >= 75 ? "text-amber-600" : "text-red-500";
          return (
            <div key={empName} className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <span className="font-medium text-sm">{empName}</span>
                <span className={cn("font-semibold text-sm", color)}>Avg Achievement: {avgAch.toFixed(1)}%</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">KPI</th>
                      <th className="text-center px-3 py-2 font-medium">Target</th>
                      <th className="text-center px-3 py-2 font-medium">Realisasi</th>
                      <th className="text-center px-3 py-2 font-medium">Achievement</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(r => {
                      const ach = Number(r.achievementPct);
                      const achColor = ach >= 90 ? "text-emerald-600" : ach >= 75 ? "text-amber-600" : "text-red-500";
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2">{getKpiName(r.kpiDefinitionId)}</td>
                          <td className="text-center px-3 py-2">{Number(r.target).toLocaleString("id-ID")}</td>
                          <td className="text-center px-3 py-2 font-medium">{Number(r.actual).toLocaleString("id-ID")}</td>
                          <td className="text-center px-3 py-2">
                            <span className={cn("font-semibold", achColor)}>{ach.toFixed(1)}%</span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                              <button onClick={() => { if (confirm("Hapus record ini?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editId ? "Edit" : "Input"} Realisasi KPI</h3>
              <button onClick={resetForm}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Karyawan *</label>
                <select value={form.employeeId} onChange={e => setForm((f: any) => ({ ...f, employeeId: Number(e.target.value), kpiDefinitionId: 0 }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value={0}>— Pilih karyawan —</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">KPI *</label>
                <select value={form.kpiDefinitionId} onChange={e => {
                  const def = defs.find((d: any) => d.id === Number(e.target.value));
                  setForm((f: any) => ({ ...f, kpiDefinitionId: Number(e.target.value), target: def ? Number(def.monthlyTarget) : 0 }));
                }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={!form.employeeId}>
                  <option value={0}>— Pilih KPI —</option>
                  {relevantDefs.map((d: any) => <option key={d.id} value={d.id}>{d.kpiName} {d.dataSource === "otomatis" ? "🔄" : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan</label>
                  <select value={form.periodMonth} onChange={e => setForm((f: any) => ({ ...f, periodMonth: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label>
                  <select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Target</label>
                  <input type="number" value={form.target} onChange={e => setForm((f: any) => ({ ...f, target: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Realisasi</label>
                  <input type="number" value={form.actual} onChange={e => setForm((f: any) => ({ ...f, actual: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              {form.target > 0 && (
                <div className={cn("text-sm font-semibold px-3 py-2 rounded-lg", form.actual / form.target >= 0.9 ? "bg-emerald-50 text-emerald-700" : form.actual / form.target >= 0.75 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                  Achievement: {Math.min(100, (form.actual / form.target) * 100).toFixed(1)}%
                </div>
              )}
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.employeeId || !form.kpiDefinitionId || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
