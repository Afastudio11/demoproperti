import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const now = new Date();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const EMPTY = { employeeId: 0, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, daysPresent: 20, workingDays: 22, lateCount: 0, disciplineViolations: 0, sopComplianceScore: 80, taskCompletionScore: 80, notes: "" };

function calcCultureScore(r: any) {
  const attendRate = r.workingDays > 0 ? (r.daysPresent / r.workingDays) * 100 : 0;
  return Math.round((attendRate * 0.30 + Number(r.sopComplianceScore) * 0.35 + Number(r.taskCompletionScore) * 0.35) * 10) / 10;
}

export default function Kultur() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-culture"], queryFn: () => fetch("/api/hr/culture").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/culture/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/culture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-culture"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/culture/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-culture"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r }); setEditId(r.id); setShowForm(true); }
  function getEmpName(id: number) { return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }

  const filtered = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const companyScore = filtered.length > 0 ? filtered.reduce((s: number, r: any) => s + calcCultureScore(r), 0) / filtered.length : 0;
  const avgAttend = filtered.length > 0 ? filtered.reduce((s: number, r: any) => s + (r.workingDays > 0 ? (r.daysPresent / r.workingDays) * 100 : 0), 0) / filtered.length : 0;
  const totalViolations = filtered.reduce((s: number, r: any) => s + (r.disciplineViolations ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Culture Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring disiplin, kepatuhan SOP, dan kesehatan budaya kerja</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Input Data Kultur</button>
      </div>

      <div className="flex items-center gap-2">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Culture Score Perusahaan", val: companyScore > 0 ? `${companyScore.toFixed(1)}/100` : "—", color: companyScore >= 80 ? "text-emerald-600" : companyScore >= 70 ? "text-amber-600" : "text-red-500" },
          { label: "Rata-rata Attendance", val: avgAttend > 0 ? `${avgAttend.toFixed(1)}%` : "—", color: "text-blue-600" },
          { label: "Pelanggaran Disiplin", val: totalViolations, color: totalViolations > 0 ? "text-red-500" : "text-emerald-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-center px-3 py-3 font-medium">Attendance</th>
                <th className="text-center px-3 py-3 font-medium">Terlambat</th>
                <th className="text-center px-3 py-3 font-medium">Pelanggaran</th>
                <th className="text-center px-3 py-3 font-medium">SOP</th>
                <th className="text-center px-3 py-3 font-medium">Task</th>
                <th className="text-center px-3 py-3 font-medium">Culture Score</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const score = calcCultureScore(r);
                const attendRate = r.workingDays > 0 ? (r.daysPresent / r.workingDays) * 100 : 0;
                return (
                  <tr key={r.id} className={cn("border-b last:border-0 hover:bg-muted/20", score < 70 ? "bg-red-50/50" : "")}>
                    <td className="px-4 py-2.5 font-medium">{getEmpName(r.employeeId)}</td>
                    <td className="text-center px-3 py-2.5">{r.daysPresent}/{r.workingDays} <span className="text-xs text-muted-foreground">({attendRate.toFixed(0)}%)</span></td>
                    <td className="text-center px-3 py-2.5"><span className={cn(r.lateCount > 3 ? "text-amber-600 font-semibold" : "text-muted-foreground")}>{r.lateCount}x</span></td>
                    <td className="text-center px-3 py-2.5"><span className={cn(r.disciplineViolations > 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>{r.disciplineViolations}</span></td>
                    <td className="text-center px-3 py-2.5">{Number(r.sopComplianceScore).toFixed(0)}</td>
                    <td className="text-center px-3 py-2.5">{Number(r.taskCompletionScore).toFixed(0)}</td>
                    <td className="text-center px-3 py-2.5">
                      <span className={cn("font-bold text-sm", score >= 80 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-500")}>{score.toFixed(1)}</span>
                      {score < 70 && <span className="ml-1 text-[10px] text-red-500">⚠</span>}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                        <button onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Belum ada data kultur untuk periode ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Input"} Data Kultur</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Karyawan *</label><select value={form.employeeId} onChange={e => setForm((f: any) => ({ ...f, employeeId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value={0}>— Pilih karyawan —</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan</label><select value={form.periodMonth} onChange={e => setForm((f: any) => ({ ...f, periodMonth: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label><select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                {[{ l: "Hari Hadir", f: "daysPresent" }, { l: "Hari Kerja Aktif", f: "workingDays" }, { l: "Jumlah Keterlambatan", f: "lateCount" }, { l: "Pelanggaran Disiplin", f: "disciplineViolations" }, { l: "Skor Kepatuhan SOP (1-100)", f: "sopComplianceScore" }, { l: "Skor Penyelesaian Tugas (1-100)", f: "taskCompletionScore" }].map(({ l, f }) => (
                  <div key={f}><label className="text-xs font-medium text-muted-foreground mb-1 block">{l}</label><input type="number" value={form[f] ?? 0} onChange={e => setForm((fn: any) => ({ ...fn, [f]: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} max={f.includes("Score") ? 100 : undefined} /></div>
                ))}
              </div>
              {form.daysPresent > 0 && form.workingDays > 0 && (
                <div className="bg-muted/50 border rounded-lg px-3 py-2 text-sm font-semibold">Culture Score: <span className={cn(calcCultureScore(form) >= 80 ? "text-emerald-600" : "text-amber-600")}>{calcCultureScore(form).toFixed(1)}/100</span></div>
              )}
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.employeeId || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
