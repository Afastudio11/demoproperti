import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Pencil, Trash2, Users, Filter, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiJson } from "@/lib/api";

const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const STATUS_COLORS: Record<string, string> = {
  H: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  L: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  C: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  A: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  S: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  I: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
};
const STATUS_LABELS: Record<string, string> = {
  H: "Hadir", L: "Lembur", C: "Cuti", A: "Alpha", S: "Sakit", I: "Izin",
};
const STATUS_CYCLE = ["H", "A", "C", "S", "I", "L", ""];

const PROJECTS = ["SN RESIDENCE", "SEKALA INDUSTRY", "Semua"];

function buildAttendanceMatrix(rows: any[]) {
  const byEmployee: Record<string, Record<number, { status: string; id: number }>> = {};
  for (const r of rows) {
    if (!byEmployee[r.employeeName]) byEmployee[r.employeeName] = {};
    byEmployee[r.employeeName][r.day] = { status: r.status ?? "", id: r.id };
  }
  return byEmployee;
}

export default function HRAbsensi() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [project, setProject] = useState("Semua");

  // Bulk input state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkProject, setBulkProject] = useState("SN RESIDENCE");
  // grid: employeeId -> day -> status
  const [bulkGrid, setBulkGrid] = useState<Record<number, Record<number, string>>>({});
  const [bulkSaved, setBulkSaved] = useState(false);

  // Single edit
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeName: "", project: "SN RESIDENCE", month, year, day: 1, status: "H" });
  const [editId, setEditId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const params = new URLSearchParams({ month, year: year.toString(), ...(project !== "Semua" ? { project } : {}) });
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["hr-attendance", month, year, project],
    queryFn: () => fetch(`/api/hr/attendance?${params}`).then(apiJson),
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees"],
    queryFn: () => fetch("/api/hr/employees").then(apiJson),
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/attendance/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance"] }); setShowForm(false); setEditId(null); setFormError(null); },
    onError: (e: any) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/attendance/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-attendance"] }),
  });

  const bulkMut = useMutation({
    mutationFn: (records: any[]) => fetch("/api/hr/attendance/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-attendance"] });
      setBulkSaved(true);
      setTimeout(() => { setBulkMode(false); setBulkSaved(false); setBulkGrid({}); }, 1500);
      setBulkError(null);
    },
    onError: (e: any) => setBulkError(e.message),
  });

  const matrix = buildAttendanceMatrix(data);
  const employees_in_matrix = Object.keys(matrix).sort();
  const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();

  const statusCounts: Record<string, number> = {};
  for (const r of data) {
    const s = r.status ?? "";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // Bulk grid handlers
  function openBulk() {
    const grid: Record<number, Record<number, string>> = {};
    for (const emp of employees) {
      grid[emp.id] = {};
    }
    setBulkGrid(grid);
    setBulkProject(project !== "Semua" ? project : "SN RESIDENCE");
    setBulkMode(true);
    setBulkSaved(false);
    setBulkError(null);
  }

  function toggleBulkCell(empId: number, day: number) {
    setBulkGrid(g => {
      const cur = g[empId]?.[day] ?? "";
      const idx = STATUS_CYCLE.indexOf(cur);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...g, [empId]: { ...(g[empId] ?? {}), [day]: next } };
    });
  }

  function saveBulk() {
    const records: any[] = [];
    for (const emp of employees) {
      const days = bulkGrid[emp.id] ?? {};
      for (const [dayStr, status] of Object.entries(days)) {
        if (status) {
          records.push({
            employeeName: emp.name,
            project: bulkProject,
            month,
            year,
            day: Number(dayStr),
            status,
          });
        }
      }
    }
    if (!records.length) { setBulkError("Belum ada data absensi yang diisi."); return; }
    bulkMut.mutate(records);
  }

  const bulkFilledCount = Object.values(bulkGrid).reduce((s, days) => s + Object.values(days).filter(Boolean).length, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Data Absensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rekap kehadiran karyawan per bulan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openBulk}
            className="flex items-center gap-1.5 text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90">
            <Users className="size-3.5" /> Input Semua Karyawan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="size-4 text-muted-foreground" />
        <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 bg-background">
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border rounded-md px-2 py-1.5 bg-background w-20" />
        <select value={project} onChange={e => setProject(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 bg-background">
          {PROJECTS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([code, label]) => (
          <div key={code} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium", STATUS_COLORS[code] ?? "bg-muted text-muted-foreground")}>
            <span className="font-bold">{code}</span>
            <span>{label}</span>
            <span className="ml-1 font-bold">{statusCounts[code] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* ── BULK INPUT PANEL ─────────────────────────────────────────────────── */}
      {bulkMode && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div>
              <span className="text-sm font-semibold">Input Absensi — {month} {year}</span>
              <span className="ml-2 text-xs text-muted-foreground">{bulkFilledCount} sel terisi</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Project:</span>
                <select value={bulkProject} onChange={e => setBulkProject(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-background">
                  {["SN RESIDENCE","SEKALA INDUSTRY"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-1 text-[10px] text-muted-foreground items-center border rounded px-2 py-1 bg-background">
                {STATUS_CYCLE.filter(Boolean).map(s => (
                  <span key={s} className={cn("inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold", STATUS_COLORS[s])}>{s}</span>
                ))}
                <span className="ml-1">← klik untuk siklus</span>
              </div>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Belum ada data karyawan di database. Tambah karyawan di menu Data Karyawan terlebih dahulu.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/20 min-w-[160px]">Karyawan</th>
                    <th className="text-left px-2 py-2 font-medium min-w-[100px] text-muted-foreground">Jabatan</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i + 1} className="px-0.5 py-2 font-medium text-center w-7 text-muted-foreground">{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => {
                    const days = bulkGrid[emp.id] ?? {};
                    const filled = Object.values(days).filter(Boolean).length;
                    return (
                      <tr key={emp.id} className="border-b hover:bg-muted/10">
                        <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">
                          <div>{emp.name}</div>
                          {filled > 0 && <div className="text-[10px] text-emerald-600">{filled} hari terisi</div>}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground text-[11px]">{emp.position}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = i + 1;
                          const status = days[d] ?? "";
                          return (
                            <td key={d} className="px-0.5 py-1 text-center">
                              <button
                                onClick={() => toggleBulkCell(emp.id, d)}
                                className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all hover:ring-1 hover:ring-offset-1 hover:ring-current",
                                  status ? (STATUS_COLORS[status] ?? "bg-muted") : "text-muted-foreground/30 hover:bg-muted/40"
                                )}
                              >
                                {status || "·"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {bulkError && (
            <div className="mx-4 my-2 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" /> {bulkError}
            </div>
          )}

          <div className="flex items-center gap-3 p-3 border-t bg-muted/10">
            {bulkSaved ? (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="size-4" /> Berhasil disimpan!
              </div>
            ) : (
              <>
                <button onClick={saveBulk} disabled={bulkMut.isPending || employees.length === 0}
                  className="text-sm bg-foreground text-background rounded-md px-4 py-1.5 hover:opacity-90 disabled:opacity-50">
                  {bulkMut.isPending ? "Menyimpan..." : `Simpan ${bulkFilledCount} Entri`}
                </button>
                <button onClick={() => { setBulkMode(false); setBulkGrid({}); setBulkError(null); }}
                  className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Single edit form (edit only, triggered from grid) */}
      {showForm && (
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <h3 className="font-medium text-sm">Edit Record Absensi</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[["Nama Karyawan","employeeName","text"],["Project","project","text"],["Bulan","month","text"],["Tahun","year","number"],["Hari","day","number"]].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                {key === "project" ? (
                  <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                    {["SN RESIDENCE","SEKALA INDUSTRY"].map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : key === "month" ? (
                  <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                ) : (
                  <input type={type as any} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
                )}
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                {Object.entries(STATUS_LABELS).map(([code, lbl]) => <option key={code} value={code}>{code} — {lbl}</option>)}
              </select>
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" /> {formError}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setFormError(null); saveMut.mutate(form); }} disabled={saveMut.isPending}
              className="text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setFormError(null); }}
              className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
          </div>
        </div>
      )}

      {/* Grid view */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      ) : employees_in_matrix.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Calendar className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data absensi untuk periode ini</p>
          <p className="text-xs text-muted-foreground mt-1">Klik "Input Semua Karyawan" untuk mengisi absensi</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/30 min-w-[160px]">Nama Karyawan</th>
                <th className="text-left px-2 py-2 font-medium min-w-[100px]">Project</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="px-1 py-2 font-medium text-center w-7">{i + 1}</th>
                ))}
                <th className="px-2 py-2 font-medium text-center">H</th>
                <th className="px-2 py-2 font-medium text-center">A</th>
                <th className="px-1 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees_in_matrix.map(emp => {
                const days = matrix[emp] ?? {};
                const hadir = Object.values(days).filter(d => d.status === "H" || d.status === "L").length;
                const alpha = Object.values(days).filter(d => d.status === "A").length;
                const empRows = data.filter(r => r.employeeName === emp);
                const proj = empRows[0]?.project ?? "";
                return (
                  <tr key={emp} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">{emp}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{proj}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1;
                      const cell = days[d];
                      const status = cell?.status ?? "";
                      return (
                        <td key={d} className="px-0.5 py-1 text-center">
                          {status ? (
                            <button
                              onClick={() => {
                                if (cell) {
                                  setEditId(cell.id);
                                  const rec = empRows.find(r => r.day === d);
                                  if (rec) setForm({ employeeName: rec.employeeName, project: rec.project ?? "", month: rec.month ?? "", year: rec.year ?? year, day: rec.day, status: rec.status ?? "H" });
                                  setFormError(null);
                                  setShowForm(true);
                                }
                              }}
                              className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold hover:ring-2 hover:ring-offset-1 hover:ring-current", STATUS_COLORS[status] ?? "bg-muted text-muted-foreground")}
                            >
                              {status}
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] text-muted-foreground/40">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-semibold text-emerald-700">{hadir}</td>
                    <td className="px-2 py-1.5 text-center font-semibold text-red-600">{alpha}</td>
                    <td className="px-1 py-1.5">
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => { if (confirm(`Hapus semua data ${emp} bulan ini?`)) { empRows.forEach(r => deleteMut.mutate(r.id)); } }}
                          className="text-muted-foreground hover:text-destructive p-1"
                          title="Hapus semua"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
