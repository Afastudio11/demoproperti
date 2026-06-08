import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Upload, Trash2, Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const STATUS_COLORS: Record<string, string> = {
  H: "bg-emerald-100 text-emerald-700",
  L: "bg-amber-100 text-amber-700",
  C: "bg-blue-100 text-blue-700",
  A: "bg-red-100 text-red-700",
  S: "bg-purple-100 text-purple-700",
  I: "bg-orange-100 text-orange-700",
};
const STATUS_LABELS: Record<string, string> = {
  H: "Hadir", L: "Lembur", C: "Cuti", A: "Alpha", S: "Sakit", I: "Izin",
};

const PROJECTS = ["SN RESIDENCE", "SEKALA INDUSTRY", "Semua"];

function buildAttendanceMatrix(rows: any[]) {
  const byEmployee: Record<string, Record<number, string>> = {};
  for (const r of rows) {
    if (!byEmployee[r.employeeName]) byEmployee[r.employeeName] = {};
    byEmployee[r.employeeName][r.day] = r.status ?? "";
  }
  return byEmployee;
}

export default function HRAbsensi() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [project, setProject] = useState("Semua");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeName: "", project: "SN RESIDENCE", month, year, day: 1, status: "H" });
  const [editId, setEditId] = useState<number | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const params = new URLSearchParams({ month, year: year.toString(), ...(project !== "Semua" ? { project } : {}) });
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["hr-attendance", month, year, project],
    queryFn: () => fetch(`/api/hr/attendance?${params}`).then(r => r.json()),
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/attendance/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/hr/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance"] }); setShowForm(false); setEditId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/attendance/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-attendance"] }),
  });

  const bulkMut = useMutation({
    mutationFn: (records: any[]) => fetch("/api/hr/attendance/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance"] }); setImportMode(false); setBulkText(""); },
  });

  const matrix = buildAttendanceMatrix(data);
  const employees = Object.keys(matrix).sort();
  const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();

  const statusCounts: Record<string, number> = {};
  for (const r of data) {
    const s = r.status ?? "";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  function handleImport() {
    const lines = bulkText.trim().split("\n").filter(Boolean);
    const records: any[] = [];
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 6) continue;
      const empName = parts[0]?.trim();
      const proj = parts[1]?.trim() || project;
      const m = parts[2]?.trim() || month;
      const y = parseInt(parts[3]) || year;
      for (let d = 1; d <= 31; d++) {
        const val = parts[d + 3]?.trim();
        if (val && empName) records.push({ employeeName: empName, project: proj, month: m, year: y, day: d, status: val });
      }
    }
    if (records.length) bulkMut.mutate(records);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Data Absensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rekap kehadiran karyawan per bulan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportMode(v => !v)} className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">
            <Upload className="size-3.5" /> Import
          </button>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ employeeName: "", project: project !== "Semua" ? project : "SN RESIDENCE", month, year, day: 1, status: "H" }); }}
            className="flex items-center gap-1.5 text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90">
            <Plus className="size-3.5" /> Tambah
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

      {/* Import panel */}
      {importMode && (
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Paste dari Excel (tab-separated):</p>
          <p className="text-xs text-muted-foreground">Format: NAMA [TAB] PROJECT [TAB] BULAN [TAB] TAHUN [TAB] Hari1 [TAB] Hari2 ... Hari31</p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
            className="w-full text-xs border rounded-md p-2 font-mono bg-background" placeholder="Paste data Excel di sini..." />
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={bulkMut.isPending} className="text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
              {bulkMut.isPending ? "Menyimpan..." : "Import Data"}
            </button>
            <button onClick={() => setImportMode(false)} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <h3 className="font-medium text-sm">{editId ? "Edit Record" : "Tambah Record Absensi"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[["Nama Karyawan","employeeName","text"],["Project","project","text"],["Bulan","month","text"],["Tahun","year","number"],["Hari","day","number"],["Status (H/C/L/A/S/I)","status","text"]].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                {key === "project" ? (
                  <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                    {["SN RESIDENCE","SEKALA INDUSTRY"].map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : key === "status" ? (
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                    {Object.entries(STATUS_LABELS).map(([code, lbl]) => <option key={code} value={code}>{code} — {lbl}</option>)}
                  </select>
                ) : key === "month" ? (
                  <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                ) : (
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
          </div>
        </div>
      )}

      {/* Grid view */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      ) : employees.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Calendar className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data absensi untuk periode ini</p>
          <p className="text-xs text-muted-foreground mt-1">Tambah data atau gunakan fitur Import dari Excel</p>
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
              {employees.map(emp => {
                const days = matrix[emp] ?? {};
                const hadir = Object.values(days).filter(s => s === "H" || s === "L").length;
                const alpha = Object.values(days).filter(s => s === "A").length;
                const empRows = data.filter(r => r.employeeName === emp);
                const proj = empRows[0]?.project ?? "";
                return (
                  <tr key={emp} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">{emp}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{proj}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1;
                      const status = days[d] ?? "";
                      return (
                        <td key={d} className="px-0.5 py-1 text-center">
                          {status ? (
                            <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold", STATUS_COLORS[status] ?? "bg-muted text-muted-foreground")}>{status}</span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] text-muted-foreground/40">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-semibold text-emerald-700">{hadir}</td>
                    <td className="px-2 py-1.5 text-center font-semibold text-red-600">{alpha}</td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => {
                        const r = empRows[0];
                        if (r) { setEditId(r.id); setForm({ employeeName: r.employeeName, project: r.project ?? "", month: r.month ?? "", year: r.year ?? year, day: r.day, status: r.status ?? "H" }); setShowForm(true); }
                      }} className="text-muted-foreground hover:text-foreground p-1">
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
