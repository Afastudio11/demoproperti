import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users, Filter, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { apiJson } from "@/lib/api";

const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
type Project = { id: number; nama: string };

type OvertimeRow = {
  id: number;
  employeeName: string;
  project: string | null;
  month: string | null;
  year: number | null;
  day: number;
  terlambatMenit: number;
  lemburJam: string;
};

function buildOvertimeMatrix(rows: OvertimeRow[]) {
  const byEmployee: Record<string, { terlambat: Record<number, number>; lembur: Record<number, number>; project: string }> = {};
  for (const r of rows) {
    if (!byEmployee[r.employeeName]) byEmployee[r.employeeName] = { terlambat: {}, lembur: {}, project: r.project ?? "" };
    byEmployee[r.employeeName].terlambat[r.day] = r.terlambatMenit;
    byEmployee[r.employeeName].lembur[r.day] = Number(r.lemburJam);
  }
  return byEmployee;
}

export default function HRLembur() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [project, setProject] = useState("Semua");
  const [viewMode, setViewMode] = useState<"terlambat" | "lembur">("lembur");

  // Bulk input state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkProject, setBulkProject] = useState("");
  const [bulkTab, setBulkTab] = useState<"lembur" | "terlambat">("lembur");
  // grid: employeeId -> day -> { lemburJam, terlambatMenit }
  const [bulkGrid, setBulkGrid] = useState<Record<number, Record<number, { lembur: string; terlambat: string }>>>({});
  const [bulkSaved, setBulkSaved] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees"],
    queryFn: () => fetch("/api/hr/employees").then(apiJson),
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(apiJson),
  });
  const projectOptions = ["Semua", ...projects.map(p => p.nama)];
  const findProject = (name: string) => projects.find(p => p.nama === name);
  const selectedProject = findProject(project);
  const params = new URLSearchParams({ month, year: year.toString(), ...(selectedProject ? { projectId: String(selectedProject.id) } : {}) });
  const { data = [], isLoading } = useQuery<OvertimeRow[]>({
    queryKey: ["hr-overtime", month, year, selectedProject?.id ?? "all"],
    queryFn: () => fetch(`/api/hr/overtime?${params}`).then(apiJson),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/overtime/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-overtime"] }),
  });

  const bulkMut = useMutation({
    mutationFn: (records: any[]) => fetch("/api/hr/overtime/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      setBulkSaved(true);
      setTimeout(() => { setBulkMode(false); setBulkSaved(false); setBulkGrid({}); }, 1500);
      setBulkError(null);
    },
    onError: (e: any) => setBulkError(e.message),
  });

  const matrix = buildOvertimeMatrix(data);
  const employees_in_matrix = Object.keys(matrix).sort();
  const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();

  const totalLembur = data.reduce((s, r) => s + Number(r.lemburJam), 0);
  const totalTerlambat = data.reduce((s, r) => s + r.terlambatMenit, 0);
  const empWithLembur = new Set(data.filter(r => Number(r.lemburJam) > 0).map(r => r.employeeName)).size;
  const empWithTerlambat = new Set(data.filter(r => r.terlambatMenit > 0).map(r => r.employeeName)).size;

  function openBulk() {
    const grid: Record<number, Record<number, { lembur: string; terlambat: string }>> = {};
    for (const emp of employees) {
      grid[emp.id] = {};
    }
    setBulkGrid(grid);
    setBulkProject(project !== "Semua" ? project : (projects[0]?.nama ?? ""));
    setBulkMode(true);
    setBulkSaved(false);
    setBulkError(null);
  }

  function updateBulkCell(empId: number, day: number, field: "lembur" | "terlambat", value: string) {
    setBulkGrid(g => ({
      ...g,
      [empId]: {
        ...(g[empId] ?? {}),
        [day]: { ...(g[empId]?.[day] ?? { lembur: "", terlambat: "" }), [field]: value },
      },
    }));
  }

  function saveBulk() {
    const records: any[] = [];
    for (const emp of employees) {
      const days = bulkGrid[emp.id] ?? {};
      for (const [dayStr, vals] of Object.entries(days)) {
        const lembur = parseFloat(vals.lembur) || 0;
        const terlambat = parseInt(vals.terlambat) || 0;
        if (lembur > 0 || terlambat > 0) {
          records.push({
            employeeId: emp.id,
            employeeName: emp.name,
            projectId: findProject(bulkProject)?.id ?? null,
            project: bulkProject,
            month,
            year,
            day: Number(dayStr),
            lemburJam: lembur.toString(),
            terlambatMenit: terlambat,
          });
        }
      }
    }
    if (!records.length) { setBulkError("Belum ada data lembur/keterlambatan yang diisi."); return; }
    bulkMut.mutate(records);
  }

  const bulkFilledCount = Object.values(bulkGrid).reduce((s, days) =>
    s + Object.values(days).filter(v => parseFloat(v.lembur) > 0 || parseInt(v.terlambat) > 0).length, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Data Lembur & Keterlambatan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rekap lembur dan keterlambatan karyawan per bulan</p>
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
          {projectOptions.map(p => <option key={p}>{p}</option>)}
        </select>
        <div className="flex rounded-md border overflow-hidden ml-auto">
          {(["lembur","terlambat"] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`text-xs px-3 py-1.5 font-medium ${viewMode === v ? "bg-foreground text-background" : "hover:bg-muted/50"}`}>
              {v === "lembur" ? "Lembur (jam)" : "Terlambat (menit)"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Jam Lembur", val: `${totalLembur.toFixed(1)} jam`, color: "text-blue-600" },
          { label: "Karyawan Lembur", val: `${empWithLembur} orang`, color: "text-blue-600" },
          { label: "Total Keterlambatan", val: `${totalTerlambat} menit`, color: "text-amber-600" },
          { label: "Karyawan Terlambat", val: `${empWithTerlambat} orang`, color: "text-amber-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="border rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
            <div className={`text-lg font-bold ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* ── BULK INPUT PANEL ─────────────────────────────────────────────────── */}
      {bulkMode && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-wrap gap-3">
            <div>
              <span className="text-sm font-semibold">Input Lembur & Keterlambatan — {month} {year}</span>
              <span className="ml-2 text-xs text-muted-foreground">{bulkFilledCount} hari terisi</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Project:</span>
                <select value={bulkProject} onChange={e => setBulkProject(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-background">
                  {projects.map(p => <option key={p.id}>{p.nama}</option>)}
                </select>
              </div>
              <div className="flex rounded-md border overflow-hidden">
                {(["lembur","terlambat"] as const).map(v => (
                  <button key={v} onClick={() => setBulkTab(v)}
                    className={`text-xs px-3 py-1 font-medium ${bulkTab === v ? "bg-foreground text-background" : "hover:bg-muted/50"}`}>
                    {v === "lembur" ? "Lembur (jam)" : "Terlambat (menit)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Belum ada data karyawan di database.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/20 min-w-[160px]">Karyawan</th>
                    <th className="text-left px-2 py-2 font-medium min-w-[100px] text-muted-foreground">Jabatan</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i + 1} className="px-0.5 py-2 font-medium text-center w-9 text-muted-foreground">{i + 1}</th>
                    ))}
                    <th className="px-2 py-2 font-medium text-right text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => {
                    const days = bulkGrid[emp.id] ?? {};
                    const total = Object.values(days).reduce((s, v) => {
                      const n = bulkTab === "lembur" ? parseFloat(v.lembur) : parseInt(v.terlambat);
                      return s + (isNaN(n) ? 0 : n);
                    }, 0);
                    return (
                      <tr key={emp.id} className="border-b hover:bg-muted/10">
                        <td className="px-3 py-1 font-medium sticky left-0 bg-background border-r">
                          {emp.name}
                        </td>
                        <td className="px-2 py-1 text-muted-foreground text-[11px]">{emp.position}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = i + 1;
                          const cell = days[d] ?? { lembur: "", terlambat: "" };
                          const val = bulkTab === "lembur" ? cell.lembur : cell.terlambat;
                          return (
                            <td key={d} className="px-0.5 py-0.5 text-center">
                              <input
                                type="number"
                                min={0}
                                step={bulkTab === "lembur" ? 0.5 : 1}
                                value={val}
                                onChange={e => updateBulkCell(emp.id, d, bulkTab, e.target.value)}
                                placeholder="0"
                                className={`w-8 text-center text-[11px] border rounded py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring ${
                                  parseFloat(val) > 0 ? (bulkTab === "lembur" ? "border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30" : "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30") : ""
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className={`px-2 py-1 text-right font-semibold ${bulkTab === "lembur" ? "text-blue-600" : "text-amber-600"}`}>
                          {total > 0 ? (bulkTab === "lembur" ? total.toFixed(1) : total) : "—"}
                        </td>
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
                  {bulkMut.isPending ? "Menyimpan..." : `Simpan (${bulkFilledCount} hari)`}
                </button>
                <button onClick={() => { setBulkMode(false); setBulkGrid({}); setBulkError(null); }}
                  className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Matrix view */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      ) : employees_in_matrix.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Clock className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data lembur/keterlambatan untuk periode ini</p>
          <p className="text-xs text-muted-foreground mt-1">Klik "Input Semua Karyawan" untuk mengisi data</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/30 min-w-[160px]">Nama Karyawan</th>
                <th className="text-left px-2 py-2 font-medium min-w-[100px]">Project</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="px-1 py-2 font-medium text-center w-9">{i + 1}</th>
                ))}
                <th className="px-2 py-2 font-medium text-center">Total</th>
                <th className="px-1 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees_in_matrix.map(emp => {
                const empData = matrix[emp];
                const total = viewMode === "lembur"
                  ? Object.values(empData.lembur).reduce((s, v) => s + v, 0)
                  : Object.values(empData.terlambat).reduce((s, v) => s + v, 0);
                const empRows = data.filter(r => r.employeeName === emp);
                return (
                  <tr key={emp} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">{emp}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{empData.project}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1;
                      const val = viewMode === "lembur" ? empData.lembur[d] : empData.terlambat[d];
                      return (
                        <td key={d} className="px-0.5 py-1 text-center">
                          {val > 0 ? (
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-5 rounded px-1 font-bold ${viewMode === "lembur" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-semibold">{total > 0 ? total.toFixed(viewMode === "lembur" ? 1 : 0) : "-"}</td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => {
                        if (confirm(`Hapus semua data lembur/keterlambatan ${emp} bulan ini?`)) {
                          empRows.forEach(r => deleteMut.mutate(r.id));
                        }
                      }} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="size-3" />
                      </button>
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
