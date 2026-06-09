import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Upload, Plus, Filter, AlertCircle } from "lucide-react";
import { apiJson } from "@/lib/api";

const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const PROJECTS = ["SN RESIDENCE", "SEKALA INDUSTRY", "Semua"];

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
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ employeeName: "", project: "SN RESIDENCE", month, year, day: 1, terlambatMenit: 0, lemburJam: 0 });
  const [importMode, setImportMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [viewMode, setViewMode] = useState<"terlambat" | "lembur">("lembur");
  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const params = new URLSearchParams({ month, year: year.toString(), ...(project !== "Semua" ? { project } : {}) });
  const { data = [], isLoading } = useQuery<OvertimeRow[]>({
    queryKey: ["hr-overtime", month, year, project],
    queryFn: () => fetch(`/api/hr/overtime?${params}`).then(apiJson),
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/overtime/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/overtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-overtime"] }); setShowForm(false); setEditId(null); setFormError(null); },
    onError: (e: any) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/overtime/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-overtime"] }),
  });

  const bulkMut = useMutation({
    mutationFn: (records: any[]) => fetch("/api/hr/overtime/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-overtime"] }); setImportMode(false); setBulkText(""); setImportError(null); },
    onError: (e: any) => setImportError(e.message),
  });

  const matrix = buildOvertimeMatrix(data);
  const employees = Object.keys(matrix).sort();
  const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();

  const totalLembur = data.reduce((s, r) => s + Number(r.lemburJam), 0);
  const totalTerlambat = data.reduce((s, r) => s + r.terlambatMenit, 0);
  const empWithLembur = new Set(data.filter(r => Number(r.lemburJam) > 0).map(r => r.employeeName)).size;
  const empWithTerlambat = new Set(data.filter(r => r.terlambatMenit > 0).map(r => r.employeeName)).size;

  function handleImport() {
    const lines = bulkText.trim().split("\n").filter(Boolean);
    const records: any[] = [];
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 6) continue;
      const no = parseInt(parts[0]);
      const empName = parts[1]?.trim();
      const proj = parts[2]?.trim() || (project !== "Semua" ? project : "SN RESIDENCE");
      const m = parts[3]?.trim() || month;
      const y = parseInt(parts[4]) || year;
      for (let d = 1; d <= 31; d++) {
        const colIdx = (d - 1) * 2 + 5;
        const terlambat = parseInt(parts[colIdx]) || 0;
        const lembur = parseFloat(parts[colIdx + 1]) || 0;
        if ((terlambat > 0 || lembur > 0) && empName) {
          records.push({ employeeName: empName, project: proj, month: m, year: y, day: d, terlambatMenit: terlambat, lemburJam: lembur.toString() });
        }
      }
      void no;
    }
    if (records.length) bulkMut.mutate(records);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Data Lembur & Keterlambatan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rekap lembur dan keterlambatan karyawan per bulan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportMode(v => !v)} className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">
            <Upload className="size-3.5" /> Import
          </button>
          <button onClick={() => { setShowForm(true); setEditId(null); setFormError(null); setForm({ employeeName: "", project: project !== "Semua" ? project : "SN RESIDENCE", month, year, day: 1, terlambatMenit: 0, lemburJam: 0 }); }}
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
        <div className="flex rounded-md border overflow-hidden ml-auto">
          {(["lembur","terlambat"] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)} className={`text-xs px-3 py-1.5 font-medium ${viewMode === v ? "bg-foreground text-background" : "hover:bg-muted/50"}`}>
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

      {/* Import panel */}
      {importMode && (
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Paste dari Excel (tab-separated):</p>
          <p className="text-xs text-muted-foreground">Format: No [TAB] NAMA [TAB] PROJECT [TAB] BULAN [TAB] TAHUN [TAB] TERLAMBAT_1 [TAB] LEMBUR_1 [TAB] TERLAMBAT_2 [TAB] LEMBUR_2 ... (per hari)</p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
            className="w-full text-xs border rounded-md p-2 font-mono bg-background" placeholder="Paste data Excel di sini..." />
          {importError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" /> {importError}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={bulkMut.isPending} className="text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
              {bulkMut.isPending ? "Menyimpan..." : "Import Data"}
            </button>
            <button onClick={() => { setImportMode(false); setImportError(null); }} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <h3 className="font-medium text-sm">{editId ? "Edit Record Lembur" : "Tambah Record Lembur"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Nama Karyawan","employeeName","text"],["Hari","day","number"],["Terlambat (menit)","terlambatMenit","number"],["Lembur (jam)","lemburJam","number"]].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Project</label>
              <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                {["SN RESIDENCE","SEKALA INDUSTRY"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bulan</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tahun</label>
              <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" /> {formError}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setFormError(null); saveMut.mutate({ ...form, lemburJam: form.lemburJam.toString() }); }} disabled={saveMut.isPending}
              className="text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setFormError(null); }} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
          </div>
        </div>
      )}

      {/* Matrix view */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      ) : employees.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Clock className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data lembur/keterlambatan untuk periode ini</p>
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
                  <th key={i + 1} className="px-1 py-2 font-medium text-center w-9">{i + 1}</th>
                ))}
                <th className="px-2 py-2 font-medium text-center">Total</th>
                <th className="px-1 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const empData = matrix[emp];
                const total = viewMode === "lembur"
                  ? Object.values(empData.lembur).reduce((s, v) => s + v, 0)
                  : Object.values(empData.terlambat).reduce((s, v) => s + v, 0);
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
                        const r = data.find(x => x.employeeName === emp);
                        if (r) deleteMut.mutate(r.id);
                      }} className="text-muted-foreground hover:text-destructive p-1 text-[10px]">×</button>
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
