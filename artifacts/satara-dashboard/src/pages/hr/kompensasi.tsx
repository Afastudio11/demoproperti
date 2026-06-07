import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const now = new Date();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const EMPTY = { employeeId: 0, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, baseSalary: 0, fixedAllowance: 0, performanceBonus: 0, incentive: 0, thr: 0, deduction: 0, notes: "" };

export default function Kompensasi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(r => r.json()) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-compensation"], queryFn: () => fetch("/api/hr/compensation").then(r => r.json()) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/compensation/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/hr/compensation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-compensation"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/compensation/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-compensation"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r, baseSalary: Number(r.baseSalary), fixedAllowance: Number(r.fixedAllowance), performanceBonus: Number(r.performanceBonus), incentive: Number(r.incentive), thr: Number(r.thr), deduction: Number(r.deduction) }); setEditId(r.id); setShowForm(true); }
  function getEmpName(id: number) { return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }

  const total = (f: any) => (Number(f.baseSalary) || 0) + (Number(f.fixedAllowance) || 0) + (Number(f.performanceBonus) || 0) + (Number(f.incentive) || 0) + (Number(f.thr) || 0) - (Number(f.deduction) || 0);

  const filtered = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const totalPayroll = filtered.reduce((s: number, r: any) => s + Number(r.totalTakeHome), 0);
  const avgSalary = filtered.length > 0 ? totalPayroll / filtered.length : 0;
  const totalBonus = filtered.reduce((s: number, r: any) => s + Number(r.performanceBonus), 0);
  const totalIncentive = filtered.reduce((s: number, r: any) => s + Number(r.incentive), 0);

  function exportExcel() {
    const rows = filtered.map(r => ({
      "Nama": getEmpName(r.employeeId),
      "Gaji Pokok": Number(r.baseSalary),
      "Tunjangan": Number(r.fixedAllowance),
      "Bonus Kinerja": Number(r.performanceBonus),
      "Insentif": Number(r.incentive),
      "THR": Number(r.thr),
      "Potongan": Number(r.deduction),
      "Take Home Pay": Number(r.totalTakeHome),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `payroll_${MONTHS[filterMonth - 1]}_${filterYear}.xlsx`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Compensation & Benefit</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Data payroll dan komponen kompensasi karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 border text-sm px-3 py-1.5 rounded-md hover:bg-muted"><Download className="size-3.5" /> Export Excel</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Input Payroll</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Payroll", val: fmtRp(totalPayroll), color: "text-foreground" },
          { label: "Rata-rata Gaji", val: fmtRp(avgSalary), color: "text-blue-600" },
          { label: "Total Bonus", val: fmtRp(totalBonus), color: "text-emerald-600" },
          { label: "Total Insentif", val: fmtRp(totalIncentive), color: "text-amber-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-lg font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                <th className="text-right px-3 py-3 font-medium">Gaji Pokok</th>
                <th className="text-right px-3 py-3 font-medium">Tunjangan</th>
                <th className="text-right px-3 py-3 font-medium">Bonus</th>
                <th className="text-right px-3 py-3 font-medium">Insentif</th>
                <th className="text-right px-3 py-3 font-medium">THR</th>
                <th className="text-right px-3 py-3 font-medium">Potongan</th>
                <th className="text-right px-3 py-3 font-medium font-semibold">Take Home</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{getEmpName(r.employeeId)}</td>
                  <td className="text-right px-3 py-2.5 text-muted-foreground">{fmtRp(Number(r.baseSalary))}</td>
                  <td className="text-right px-3 py-2.5 text-muted-foreground">{Number(r.fixedAllowance) > 0 ? fmtRp(Number(r.fixedAllowance)) : "—"}</td>
                  <td className="text-right px-3 py-2.5 text-emerald-600">{Number(r.performanceBonus) > 0 ? fmtRp(Number(r.performanceBonus)) : "—"}</td>
                  <td className="text-right px-3 py-2.5 text-amber-600">{Number(r.incentive) > 0 ? fmtRp(Number(r.incentive)) : "—"}</td>
                  <td className="text-right px-3 py-2.5">{Number(r.thr) > 0 ? fmtRp(Number(r.thr)) : "—"}</td>
                  <td className="text-right px-3 py-2.5 text-red-500">{Number(r.deduction) > 0 ? `-${fmtRp(Number(r.deduction))}` : "—"}</td>
                  <td className="text-right px-3 py-2.5 font-bold">{fmtRp(Number(r.totalTakeHome))}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Hapus record ini?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Belum ada data payroll untuk periode ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Input"} Data Kompensasi</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Karyawan *</label><select value={form.employeeId} onChange={e => setForm((f: any) => ({ ...f, employeeId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value={0}>— Pilih karyawan —</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan</label><select value={form.periodMonth} onChange={e => setForm((f: any) => ({ ...f, periodMonth: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label><select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              </div>
              {[
                { label: "Gaji Pokok (Rp)", field: "baseSalary" },
                { label: "Tunjangan Tetap (Rp)", field: "fixedAllowance" },
                { label: "Bonus Kinerja (Rp)", field: "performanceBonus" },
                { label: "Insentif (Rp)", field: "incentive" },
                { label: "THR (Rp)", field: "thr" },
                { label: "Potongan (Rp)", field: "deduction" },
              ].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input type="number" value={form[field] ?? 0} onChange={e => setForm((f: any) => ({ ...f, [field]: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
              ))}
              <div className="bg-muted/50 border rounded-lg px-3 py-2 text-sm font-semibold">Total Take Home Pay: <span className="text-emerald-600">{fmtRp(total(form))}</span></div>
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
