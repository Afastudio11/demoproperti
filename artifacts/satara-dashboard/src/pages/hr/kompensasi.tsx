import { apiJson } from "@/lib/api";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, Download, RefreshCw, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { CurrencyInput } from "@/components/ui/currency-input";

const now = new Date();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtRpFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

const EMPTY = {
  employeeId: 0,
  periodYear: now.getFullYear(),
  periodMonth: now.getMonth() + 1,
  baseSalary: 0,
  hariKerjaPerBulan: 26,
  menitKerjaPerHari: 480,
  fixedAllowance: 0,
  performanceBonus: 0,
  incentive: 0,
  thr: 0,
  deduction: 0,
  notes: "",
};

export default function PayrollKompensasi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  // Auto-calculated adjustments preview
  const [adjPreview, setAdjPreview] = useState<{ potonganTelat: number; tambahanLembur: number; totalTelatMenit: number; totalLemburMenit: number } | null>(null);
  const [adjLoading, setAdjLoading] = useState(false);

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees"],
    queryFn: () => fetch("/api/hr/employees").then(apiJson),
  });
  const { data: records = [] } = useQuery<any[]>({
    queryKey: ["hr-compensation"],
    queryFn: () => fetch("/api/hr/compensation").then(apiJson),
  });

  // Derived gaji values
  const gajiHarian = form.baseSalary > 0 && form.hariKerjaPerBulan > 0
    ? form.baseSalary / form.hariKerjaPerBulan
    : 0;
  const gajiMenit = gajiHarian > 0 && form.menitKerjaPerHari > 0
    ? gajiHarian / form.menitKerjaPerHari
    : 0;

  // Fetch preview when key fields change
  useEffect(() => {
    if (!form.employeeId || !form.baseSalary || !showForm) { setAdjPreview(null); return; }
    const timeout = setTimeout(async () => {
      setAdjLoading(true);
      try {
        const res = await fetch("/api/hr/compensation/preview-adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: form.employeeId,
            periodYear: form.periodYear,
            periodMonth: form.periodMonth,
            baseSalary: form.baseSalary,
            hariKerjaPerBulan: form.hariKerjaPerBulan,
            menitKerjaPerHari: form.menitKerjaPerHari,
          }),
        });
        if (res.ok) setAdjPreview(await res.json());
      } catch { /* ignore */ } finally { setAdjLoading(false); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.employeeId, form.periodYear, form.periodMonth, form.baseSalary, form.hariKerjaPerBulan, form.menitKerjaPerHari, showForm]);

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/compensation/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/compensation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-compensation"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      resetForm();
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/compensation/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-compensation"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
    },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); setAdjPreview(null); }

  function startEdit(r: any) {
    setForm({
      ...r,
      baseSalary: Number(r.baseSalary),
      hariKerjaPerBulan: Number(r.hariKerjaPerBulan) || 26,
      menitKerjaPerHari: Number(r.menitKerjaPerHari) || 480,
      fixedAllowance: Number(r.fixedAllowance),
      performanceBonus: Number(r.performanceBonus),
      incentive: Number(r.incentive),
      thr: Number(r.thr),
      deduction: Number(r.deduction),
    });
    setEditId(r.id);
    setShowForm(true);
  }

  function getEmpName(id: number) { return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }

  function totalPreview(f: any, adj: typeof adjPreview) {
    return (Number(f.baseSalary) || 0)
      + (Number(f.fixedAllowance) || 0)
      + (Number(f.performanceBonus) || 0)
      + (Number(f.incentive) || 0)
      + (Number(f.thr) || 0)
      + (adj?.tambahanLembur ?? 0)
      - (Number(f.deduction) || 0)
      - (adj?.potonganTelat ?? 0);
  }

  const filtered = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const totalPayroll = filtered.reduce((s: number, r: any) => s + Number(r.totalTakeHome), 0);
  const avgSalary = filtered.length > 0 ? totalPayroll / filtered.length : 0;
  const totalBonus = filtered.reduce((s: number, r: any) => s + Number(r.performanceBonus), 0);
  const totalPotonganTelat = filtered.reduce((s: number, r: any) => s + Number(r.potonganTelat ?? 0), 0);
  const totalLembur = filtered.reduce((s: number, r: any) => s + Number(r.tambahanLembur ?? 0), 0);

  function exportExcel() {
    const rows = filtered.map((r: any) => {
      const hari = Number(r.hariKerjaPerBulan) || 26;
      const menit = Number(r.menitKerjaPerHari) || 480;
      const gajHarian = Number(r.baseSalary) / hari;
      const gajiMenitVal = gajHarian / menit;
      return {
        "Nama": getEmpName(r.employeeId),
        "Gaji Pokok": Number(r.baseSalary),
        "Gaji Harian": Math.round(gajHarian),
        "Gaji Menit": Math.round(gajiMenitVal),
        "Hari Kerja/Bulan": hari,
        "Menit Kerja/Hari": menit,
        "Tunjangan": Number(r.fixedAllowance),
        "Bonus Kinerja": Number(r.performanceBonus),
        "Insentif": Number(r.incentive),
        "THR": Number(r.thr),
        "Potongan Manual": Number(r.deduction),
        "Potongan Telat": Number(r.potonganTelat ?? 0),
        "Tambahan Lembur": Number(r.tambahanLembur ?? 0),
        "Take Home Pay": Number(r.totalTakeHome),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `payroll_${MONTHS[filterMonth - 1]}_${filterYear}.xlsx`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Payroll & Kompensasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Penggajian bulanan dengan perhitungan otomatis potongan telat dan tambahan lembur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 border text-sm px-3 py-1.5 rounded-md hover:bg-muted">
            <Download className="size-3.5" /> Export Excel
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
            <Plus className="size-3.5" /> Input Payroll
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-2">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Payroll", val: fmtRp(totalPayroll), color: "text-foreground" },
          { label: "Rata-rata Gaji", val: fmtRp(avgSalary), color: "text-blue-600" },
          { label: "Total Bonus", val: fmtRp(totalBonus), color: "text-emerald-600" },
          { label: "Total Tambahan Lembur", val: fmtRp(totalLembur), color: "text-amber-600" },
          { label: "Total Potongan Telat", val: fmtRp(totalPotonganTelat), color: "text-red-500" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-lg font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                <th className="text-right px-3 py-3 font-medium">Gaji Pokok</th>
                <th className="text-right px-3 py-3 font-medium">Gaji Harian</th>
                <th className="text-right px-3 py-3 font-medium">Gaji Menit</th>
                <th className="text-right px-3 py-3 font-medium">Tunjangan</th>
                <th className="text-right px-3 py-3 font-medium">Bonus</th>
                <th className="text-right px-3 py-3 font-medium">THR</th>
                <th className="text-right px-3 py-3 font-medium text-amber-600">+Lembur</th>
                <th className="text-right px-3 py-3 font-medium text-red-500">-Telat</th>
                <th className="text-right px-3 py-3 font-medium text-red-500">-Potongan</th>
                <th className="text-right px-3 py-3 font-medium font-semibold">Take Home</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const hari = Number(r.hariKerjaPerBulan) || 26;
                const menit = Number(r.menitKerjaPerHari) || 480;
                const gajHarian = Number(r.baseSalary) / hari;
                const gajiMenitVal = gajHarian / menit;
                const potonganTelat = Number(r.potonganTelat ?? 0);
                const tambahanLembur = Number(r.tambahanLembur ?? 0);
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{getEmpName(r.employeeId)}</td>
                    <td className="text-right px-3 py-2.5 text-muted-foreground">{fmtRp(Number(r.baseSalary))}</td>
                    <td className="text-right px-3 py-2.5 text-muted-foreground text-xs">{fmtRp(Math.round(gajHarian))}</td>
                    <td className="text-right px-3 py-2.5 text-muted-foreground text-xs">{fmtRpFull(gajiMenitVal)}</td>
                    <td className="text-right px-3 py-2.5 text-muted-foreground">{Number(r.fixedAllowance) > 0 ? fmtRp(Number(r.fixedAllowance)) : "—"}</td>
                    <td className="text-right px-3 py-2.5 text-emerald-600">{Number(r.performanceBonus) > 0 ? fmtRp(Number(r.performanceBonus)) : "—"}</td>
                    <td className="text-right px-3 py-2.5">{Number(r.thr) > 0 ? fmtRp(Number(r.thr)) : "—"}</td>
                    <td className="text-right px-3 py-2.5 text-amber-600">{tambahanLembur > 0 ? `+${fmtRp(tambahanLembur)}` : "—"}</td>
                    <td className="text-right px-3 py-2.5 text-red-500">{potonganTelat > 0 ? `-${fmtRp(potonganTelat)}` : "—"}</td>
                    <td className="text-right px-3 py-2.5 text-red-500">{Number(r.deduction) > 0 ? `-${fmtRp(Number(r.deduction))}` : "—"}</td>
                    <td className="text-right px-3 py-2.5 font-bold">{fmtRp(Number(r.totalTakeHome))}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                        <button onClick={() => { if (confirm("Hapus record ini?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8 text-muted-foreground text-sm">Belum ada data payroll untuk periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editId ? "Edit" : "Input"} Payroll Karyawan</h3>
              <button onClick={resetForm}><X className="size-4" /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Karyawan & Periode */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Karyawan *</label>
                <select
                  value={form.employeeId}
                  onChange={e => setForm((f: any) => ({ ...f, employeeId: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={0}>— Pilih karyawan —</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
              </div>

              {/* Gaji Pokok */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gaji Pokok (Rp/bulan) *</label>
                <CurrencyInput
                  value={form.baseSalary ?? 0}
                  onChange={raw => setForm((f: any) => ({ ...f, baseSalary: raw ? Number(raw) : 0 }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Hitungan harian & menit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Hari Kerja per Bulan</label>
                  <input
                    type="number" min={1} max={31}
                    value={form.hariKerjaPerBulan}
                    onChange={e => setForm((f: any) => ({ ...f, hariKerjaPerBulan: Number(e.target.value) || 26 }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Menit Kerja per Hari</label>
                  <input
                    type="number" min={1} max={1440}
                    value={form.menitKerjaPerHari}
                    onChange={e => setForm((f: any) => ({ ...f, menitKerjaPerHari: Number(e.target.value) || 480 }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Derived display */}
              {form.baseSalary > 0 && (
                <div className="bg-muted/40 border rounded-lg px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Gaji Harian</span>
                    <span className="font-medium text-xs">{fmtRpFull(gajiHarian)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Gaji per Menit</span>
                    <span className="font-medium text-xs">{fmtRpFull(gajiMenit)}</span>
                  </div>
                </div>
              )}

              {/* Auto-calc telat & lembur preview */}
              {form.employeeId > 0 && form.baseSalary > 0 && (
                <div className={cn("border rounded-lg px-4 py-3 space-y-2", adjLoading ? "opacity-60" : "")}>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                    <Clock className="size-3.5" />
                    Penyesuaian Otomatis dari Absensi
                    {adjLoading && <RefreshCw className="size-3 animate-spin" />}
                  </div>

                  {adjPreview ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Telat</span>
                        <span className="font-medium">{adjPreview.totalTelatMenit} menit</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-500">Potongan Telat</span>
                        <span className="font-semibold text-red-500">-{fmtRpFull(adjPreview.potonganTelat)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Lembur</span>
                        <span className="font-medium">{adjPreview.totalLemburMenit} menit</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-600">Tambahan Lembur</span>
                        <span className="font-semibold text-amber-600">+{fmtRpFull(adjPreview.tambahanLembur)}</span>
                      </div>
                      {adjPreview.totalTelatMenit === 0 && adjPreview.totalLemburMenit === 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="size-3" />
                          Tidak ada data telat/lembur untuk periode ini. Input di menu Lembur & Keterlambatan terlebih dahulu.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Pilih karyawan dan isi gaji pokok untuk melihat penyesuaian otomatis.</p>
                  )}
                </div>
              )}

              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Komponen Tambahan</p>
                {[
                  { label: "Tunjangan Tetap (Rp)", field: "fixedAllowance" },
                  { label: "Bonus Kinerja (Rp)", field: "performanceBonus" },
                  { label: "Insentif (Rp)", field: "incentive" },
                  { label: "THR (Rp)", field: "thr" },
                  { label: "Potongan Manual (Rp)", field: "deduction" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                    <CurrencyInput
                      value={form[field] ?? 0}
                      onChange={raw => setForm((f: any) => ({ ...f, [field]: raw ? Number(raw) : 0 }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>

              {/* Take home summary */}
              <div className="bg-muted/50 border rounded-lg px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Gaji Pokok + Tunjangan + Bonus</span>
                  <span>{fmtRpFull((Number(form.baseSalary) || 0) + (Number(form.fixedAllowance) || 0) + (Number(form.performanceBonus) || 0) + (Number(form.incentive) || 0) + (Number(form.thr) || 0))}</span>
                </div>
                {adjPreview && adjPreview.tambahanLembur > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>+ Tambahan Lembur</span>
                    <span>{fmtRpFull(adjPreview.tambahanLembur)}</span>
                  </div>
                )}
                {adjPreview && adjPreview.potonganTelat > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>- Potongan Telat</span>
                    <span>{fmtRpFull(adjPreview.potonganTelat)}</span>
                  </div>
                )}
                {(Number(form.deduction) || 0) > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>- Potongan Manual</span>
                    <span>{fmtRpFull(Number(form.deduction))}</span>
                  </div>
                )}
                <div className="border-t pt-1.5 flex justify-between text-sm font-bold">
                  <span>Total Take Home Pay</span>
                  <span className="text-emerald-600">{fmtRpFull(totalPreview(form, adjPreview))}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => save.mutate(form)}
                disabled={!form.employeeId || save.isPending}
                className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
