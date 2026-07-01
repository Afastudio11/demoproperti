import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users, Filter, AlertCircle, CheckCircle2, Trash2, Plus, Settings, X, Download } from "lucide-react";
import { apiJson } from "@/lib/api";
import * as XLSX from "xlsx";

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
  lemburJam: string; // stored as numeric, treated as menit
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

type ViewMode = "bulanan" | "3-bulan" | "1-tahun";

// Compute last N months going back from a given month+year
function getPeriods(fromMonth: string, fromYear: number, count: number) {
  const periods: { month: string; year: number; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(fromYear, MONTHS.indexOf(fromMonth) - i, 1);
    periods.push({
      month: MONTHS[d.getMonth()],
      year: d.getFullYear(),
      label: `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
    });
  }
  return periods;
}

export default function HRLembur() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [project, setProject] = useState("Semua");
  const [viewMode, setViewMode] = useState<ViewMode>("bulanan");

  // Bulk input state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkProject, setBulkProject] = useState("");
  const [bulkGrid, setBulkGrid] = useState<Record<number, Record<number, { lembur: string; terlambat: string }>>>({});
  const [bulkSaved, setBulkSaved] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Kelola karyawan state
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDiv, setNewDiv] = useState("SN RESIDENCE");
  const [addError, setAddError] = useState<string | null>(null);

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees"],
    queryFn: () => fetch("/api/hr/employees").then(apiJson),
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects?all=true").then(apiJson),
  });
  const projectOptions = ["Semua", ...projects.map(p => p.nama)];
  const findProject = (name: string) => projects.find(p => p.nama === name);
  const selectedProject = findProject(project);
  const params = new URLSearchParams({ month, year: year.toString(), ...(selectedProject ? { projectId: String(selectedProject.id) } : {}) });
  const { data = [], isLoading } = useQuery<OvertimeRow[]>({
    queryKey: ["hr-overtime", month, year, selectedProject?.id ?? "all"],
    queryFn: () => fetch(`/api/hr/overtime?${params}`).then(apiJson),
    enabled: viewMode === "bulanan",
  });

  // Multi-month: compute periods + fetch data per unique year
  const multiPeriods = viewMode !== "bulanan" ? getPeriods(month, year, viewMode === "3-bulan" ? 3 : 12) : [];
  const multiYears = Array.from(new Set(multiPeriods.map(p => p.year)));

  const { data: multiDataY0 = [], isLoading: multiLoading0 } = useQuery<OvertimeRow[]>({
    queryKey: ["hr-overtime-multi", multiYears[0], selectedProject?.id ?? "all"],
    queryFn: () => {
      const p = new URLSearchParams({ year: String(multiYears[0]), ...(selectedProject ? { projectId: String(selectedProject.id) } : {}) });
      return fetch(`/api/hr/overtime?${p}`).then(apiJson);
    },
    enabled: viewMode !== "bulanan" && multiYears.length >= 1,
  });
  const { data: multiDataY1 = [], isLoading: multiLoading1 } = useQuery<OvertimeRow[]>({
    queryKey: ["hr-overtime-multi", multiYears[1], selectedProject?.id ?? "all"],
    queryFn: () => {
      const p = new URLSearchParams({ year: String(multiYears[1]), ...(selectedProject ? { projectId: String(selectedProject.id) } : {}) });
      return fetch(`/api/hr/overtime?${p}`).then(apiJson);
    },
    enabled: viewMode !== "bulanan" && multiYears.length >= 2,
  });
  const multiLoading = multiLoading0 || multiLoading1;

  // Combine multi-year data, filter to exact periods
  const periodKeys = new Set(multiPeriods.map(p => `${p.month}|${p.year}`));
  const multiAllRows: OvertimeRow[] = [...multiDataY0, ...multiDataY1].filter(
    r => r.month && r.year && periodKeys.has(`${r.month}|${r.year}`)
  );

  // Build multi-month summary: {empName: {periodLabel: {terlambat, lembur}}}
  const multiSummary: Record<string, Record<string, { terlambat: number; lembur: number }>> = {};
  for (const r of multiAllRows) {
    const label = multiPeriods.find(p => p.month === r.month && p.year === r.year)?.label ?? "";
    if (!label) continue;
    if (!multiSummary[r.employeeName]) multiSummary[r.employeeName] = {};
    if (!multiSummary[r.employeeName][label]) multiSummary[r.employeeName][label] = { terlambat: 0, lembur: 0 };
    multiSummary[r.employeeName][label].terlambat += r.terlambatMenit;
    multiSummary[r.employeeName][label].lembur += Number(r.lemburJam);
  }
  const multiEmpNames = Array.from(new Set([
    ...Object.keys(multiSummary),
    ...employees.map((e: any) => e.name),
  ])).sort();

  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/overtime/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-overtime"] }); setDeleteConfirmEmp(null); },
  });

  const bulkDelMut = useMutation({
    mutationFn: async (empNames: string[]) => {
      const ids = data.filter((r: any) => empNames.includes(r.employeeName)).map((r: any) => r.id);
      for (const id of ids) await fetch(`/api/hr/overtime/${id}`, { method: "DELETE" }).then(apiJson);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-overtime"] }); setSelectedEmps(new Set()); },
  });

  const bulkMut = useMutation({
    mutationFn: (records: any[]) => fetch("/api/hr/overtime/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records })
    }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      setBulkSaved(true);
      setTimeout(() => { setBulkMode(false); setBulkSaved(false); setBulkGrid({}); }, 1500);
      setBulkError(null);
    },
    onError: (e: any) => setBulkError(e.message),
  });

  const addEmpMut = useMutation({
    mutationFn: (body: any) => fetch("/api/hr/employees", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      setNewName(""); setAddError(null);
    },
    onError: (e: any) => setAddError(e.message),
  });

  const delEmpMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/employees/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-employees"] }),
  });

  const matrix = buildOvertimeMatrix(data);
  // Tampilkan SEMUA karyawan dari DB (bukan hanya yang punya record)
  const allLemburNamesSet = new Set<string>([
    ...Object.keys(matrix),
    ...employees
      .filter((e: any) => {
        if (project === "Semua") return true;
        const div = (e.division ?? "").toUpperCase();
        const loc = (e.location ?? "").toUpperCase();
        const proj = project.toUpperCase();
        return div === proj || loc === proj || proj.startsWith(div) || div.startsWith(proj.split(" ")[0]);
      })
      .map((e: any) => e.name),
  ]);
  const employees_in_matrix = Array.from(allLemburNamesSet).sort();
  const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();

  const totalLembur = data.reduce((s, r) => s + Number(r.lemburJam), 0);
  const totalTerlambat = data.reduce((s, r) => s + r.terlambatMenit, 0);
  const empWithLembur = new Set(data.filter(r => Number(r.lemburJam) > 0).map(r => r.employeeName)).size;
  const empWithTerlambat = new Set(data.filter(r => r.terlambatMenit > 0).map(r => r.employeeName)).size;

  function openBulk() {
    const grid: Record<number, Record<number, { lembur: string; terlambat: string }>> = {};
    for (const emp of employees) {
      grid[emp.id] = {};
      const empData = matrix[emp.name];
      if (empData) {
        for (let d = 1; d <= daysInMonth; d++) {
          const t = empData.terlambat[d];
          const l = empData.lembur[d];
          if (t || l) {
            grid[emp.id][d] = { terlambat: t ? String(t) : "", lembur: l ? String(l) : "" };
          }
        }
      }
    }
    setBulkGrid(grid);
    setBulkProject(project !== "Semua" ? project : (projects[0]?.nama ?? ""));
    setBulkMode(true); setBulkSaved(false); setBulkError(null);
  }

  function updateBulkCell(empId: number, day: number, field: "lembur" | "terlambat", value: string) {
    setBulkGrid(g => ({
      ...g,
      [empId]: { ...(g[empId] ?? {}), [day]: { ...(g[empId]?.[day] ?? { lembur: "", terlambat: "" }), [field]: value } },
    }));
  }

  function saveBulk() {
    const records: any[] = [];
    for (const emp of employees) {
      const days = bulkGrid[emp.id] ?? {};
      for (const [dayStr, vals] of Object.entries(days)) {
        const lembur = parseInt(vals.lembur) || 0;
        const terlambat = parseInt(vals.terlambat) || 0;
        if (lembur > 0 || terlambat > 0) {
          records.push({
            employeeId: emp.id,
            employeeName: emp.name,
            projectId: findProject(bulkProject)?.id ?? null,
            project: bulkProject,
            month, year,
            day: Number(dayStr),
            lemburJam: lembur.toString(), // field lama, nilainya sekarang menit
            terlambatMenit: terlambat,
          });
        }
      }
    }
    if (!records.length) { setBulkError("Belum ada data yang diisi."); return; }
    bulkMut.mutate(records);
  }

  const bulkFilledCount = Object.values(bulkGrid).reduce((s, days) =>
    s + Object.values(days).filter(v => parseInt(v.lembur) > 0 || parseInt(v.terlambat) > 0).length, 0);

  function addEmployee() {
    if (!newName.trim()) { setAddError("Nama tidak boleh kosong."); return; }
    addEmpMut.mutate({
      name: newName.trim().toUpperCase(),
      division: newDiv,
      position: "Staf",
      location: newDiv,
      employmentStatus: "aktif",
    });
  }

  function downloadMultiExcel() {
    const wb = XLSX.utils.book_new();
    const rangeLabel = viewMode === "3-bulan" ? "3 Bulan Terakhir" : "1 Tahun Terakhir";
    const title = `Ringkasan Lembur & Keterlambatan — ${rangeLabel}`;
    const periodRange = multiPeriods.length ? `${multiPeriods[0].label} s/d ${multiPeriods[multiPeriods.length - 1].label}` : "";

    const headerRow1: (string | number)[] = ["Nama Karyawan"];
    const headerRow2: (string | number)[] = [""];
    for (const p of multiPeriods) {
      headerRow1.push(p.label, "");
      headerRow2.push("Terlambat (mnt)", "Lembur (mnt)");
    }
    headerRow1.push("Total Terlambat", "Total Lembur");
    headerRow2.push("(menit)", "(menit)");

    const dataRows = multiEmpNames.map(emp => {
      const empPeriods = multiSummary[emp] ?? {};
      const row: (string | number)[] = [emp];
      let grandT = 0, grandL = 0;
      for (const p of multiPeriods) {
        const cell = empPeriods[p.label] ?? { terlambat: 0, lembur: 0 };
        row.push(cell.terlambat, cell.lembur);
        grandT += cell.terlambat;
        grandL += cell.lembur;
      }
      row.push(grandT, grandL);
      return row;
    });

    // Total row
    const totalRow: (string | number)[] = ["TOTAL"];
    let grandTAll = 0, grandLAll = 0;
    for (const p of multiPeriods) {
      const t = multiEmpNames.reduce((s, emp) => s + (multiSummary[emp]?.[p.label]?.terlambat ?? 0), 0);
      const l = multiEmpNames.reduce((s, emp) => s + (multiSummary[emp]?.[p.label]?.lembur ?? 0), 0);
      totalRow.push(t, l);
      grandTAll += t;
      grandLAll += l;
    }
    totalRow.push(grandTAll, grandLAll);

    const sheetData: (string | number)[][] = [
      [title],
      [periodRange],
      [`Kantor/Proyek: ${project}`],
      [],
      headerRow1,
      headerRow2,
      ...dataRows,
      [],
      totalRow,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [
      { wch: 28 },
      ...multiPeriods.flatMap(() => [{ wch: 14 }, { wch: 12 }]),
      { wch: 14 },
      { wch: 14 },
    ];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
      ...multiPeriods.map((_, i) => ({
        s: { r: 4, c: 1 + i * 2 },
        e: { r: 4, c: 2 + i * 2 },
      })),
      { s: { r: 4, c: 1 + multiPeriods.length * 2 }, e: { r: 5, c: 1 + multiPeriods.length * 2 } },
      { s: { r: 4, c: 2 + multiPeriods.length * 2 }, e: { r: 5, c: 2 + multiPeriods.length * 2 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, rangeLabel);
    XLSX.writeFile(wb, `Ringkasan_Lembur_${viewMode === "3-bulan" ? "3Bulan" : "1Tahun"}_${project.replace(/\s+/g, "_")}.xlsx`);
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // ── Header baris judul ──────────────────────────────────────────────────
    const title = `Rekap Lembur & Keterlambatan — ${month} ${year}`;
    const filterInfo = `Kantor/Proyek: ${project}`;

    // ── Header kolom ────────────────────────────────────────────────────────
    // Baris 1: "Nama Karyawan" | "Kantor/Proyek" | tanggal (masing2 gabung 2 col) | "Total T" | "Total L"
    // Baris 2: "" | "" | T/L per tanggal | "" | ""
    const headerRow1: (string | number)[] = ["Nama Karyawan", "Kantor/Proyek"];
    const headerRow2: (string | number)[] = ["", ""];
    for (const d of days) {
      headerRow1.push(d, "");
      headerRow2.push("Terlambat (mnt)", "Lembur (mnt)");
    }
    headerRow1.push("Total Terlambat", "Total Lembur");
    headerRow2.push("(menit)", "(menit)");

    // ── Data rows ────────────────────────────────────────────────────────────
    const dataRows: (string | number)[][] = employees_in_matrix.map(emp => {
      const empData = matrix[emp] ?? { terlambat: {}, lembur: {}, project: "" };
      const totalT = Object.values(empData.terlambat).reduce((s, v) => s + v, 0);
      const totalL = Object.values(empData.lembur).reduce((s, v) => s + v, 0);
      const row: (string | number)[] = [emp, empData.project];
      for (const d of days) {
        row.push(empData.terlambat[d] ?? 0);
        row.push(empData.lembur[d] ?? 0);
      }
      row.push(totalT, totalL);
      return row;
    });

    // ── Summary row ──────────────────────────────────────────────────────────
    const summaryRow: (string | number)[] = ["TOTAL", ""];
    for (const d of days) {
      const dayT = employees_in_matrix.reduce((s, emp) => {
        const em = matrix[emp] ?? { terlambat: {}, lembur: {}, project: "" };
        return s + (em.terlambat[d] ?? 0);
      }, 0);
      const dayL = employees_in_matrix.reduce((s, emp) => {
        const em = matrix[emp] ?? { terlambat: {}, lembur: {}, project: "" };
        return s + (em.lembur[d] ?? 0);
      }, 0);
      summaryRow.push(dayT, dayL);
    }
    summaryRow.push(totalTerlambat, totalLembur);

    // ── Susun sheet ──────────────────────────────────────────────────────────
    const sheetData: (string | number)[][] = [
      [title],
      [filterInfo],
      [],
      headerRow1,
      headerRow2,
      ...dataRows,
      [],
      summaryRow,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // ── Lebar kolom ──────────────────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 28 }, // Nama Karyawan
      { wch: 16 }, // Project
      ...days.flatMap(() => [{ wch: 9 }, { wch: 9 }]),
      { wch: 14 }, // Total T
      { wch: 14 }, // Total L
    ];

    // ── Merge cells untuk tanggal di header ──────────────────────────────────
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // title
      { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // Nama Karyawan
      { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // Project
      ...days.map((_, i) => ({
        s: { r: 3, c: 2 + i * 2 },
        e: { r: 3, c: 3 + i * 2 },
      })),
      { s: { r: 3, c: 2 + days.length * 2 }, e: { r: 4, c: 2 + days.length * 2 } },
      { s: { r: 3, c: 3 + days.length * 2 }, e: { r: 4, c: 3 + days.length * 2 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `${month} ${year}`);
    XLSX.writeFile(wb, `Lembur_${month}_${year}_${project.replace(/\s+/g, "_")}.xlsx`);
  }

  // Group employees by project/division for manage panel
  const empBySN = employees.filter((e: any) => e.division === "SN RESIDENCE" || e.location === "SN RESIDENCE");
  const empBySekala = employees.filter((e: any) => e.division === "SEKALA INDUSTRY" || e.location === "SEKALA INDUSTRY");
  const empOther = employees.filter((e: any) =>
    e.division !== "SN RESIDENCE" && e.location !== "SN RESIDENCE" &&
    e.division !== "SEKALA INDUSTRY" && e.location !== "SEKALA INDUSTRY"
  );

  return (
    <div className="space-y-5">
      <style>{`
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Data Lembur & Keterlambatan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rekap lembur dan keterlambatan karyawan per bulan — dalam menit</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowManage(v => !v)}
            className={`flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50 ${showManage ? "bg-muted" : ""}`}>
            <Settings className="size-3.5" /> Kelola Karyawan
          </button>
          <button
            onClick={downloadExcel}
            disabled={employees_in_matrix.length === 0}
            className="flex items-center gap-1.5 text-sm border border-emerald-600 text-emerald-700 rounded-md px-3 py-1.5 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-emerald-400 dark:hover:bg-emerald-950/30">
            <Download className="size-3.5" /> Download Excel
          </button>
          <button onClick={openBulk}
            className="flex items-center gap-1.5 text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90">
            <Users className="size-3.5" /> Input Data
          </button>
        </div>
      </div>

      {/* Kelola Karyawan Panel */}
      {showManage && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="text-sm font-semibold">Kelola Daftar Karyawan</span>
            <button onClick={() => setShowManage(false)}><X className="size-4 text-muted-foreground" /></button>
          </div>
          <div className="p-4 space-y-4">
            {/* Add new */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addEmployee()}
                placeholder="Nama karyawan baru..."
                className="text-sm border rounded-md px-3 py-1.5 bg-background flex-1 min-w-[180px]"
              />
              <select value={newDiv} onChange={e => setNewDiv(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 bg-background">
                <option>SN RESIDENCE</option>
                <option>SEKALA INDUSTRY</option>
              </select>
              <button onClick={addEmployee} disabled={addEmpMut.isPending}
                className="flex items-center gap-1.5 text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
                <Plus className="size-3.5" /> Tambah
              </button>
            </div>
            {addError && <p className="text-xs text-destructive">{addError}</p>}

            {/* Employee lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "SN RESIDENCE", list: empBySN },
                { label: "SEKALA INDUSTRY", list: empBySekala },
                ...(empOther.length ? [{ label: "Lainnya", list: empOther }] : []),
              ].map(({ label, list }) => (
                <div key={label}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label} ({list.length})</div>
                  <div className="space-y-1">
                    {list.map((emp: any) => (
                      <div key={emp.id} className="flex items-center justify-between px-3 py-1.5 border rounded-lg hover:bg-muted/20">
                        <span className="text-sm font-medium">{emp.name}</span>
                        <button
                          onClick={() => { if (confirm(`Hapus ${emp.name}?`)) delEmpMut.mutate(emp.id); }}
                          className="text-muted-foreground hover:text-destructive p-1 ml-2">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {list.length === 0 && <p className="text-xs text-muted-foreground px-1">Belum ada karyawan.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit">
        {([
          { key: "bulanan", label: "Bulanan" },
          { key: "3-bulan", label: "3 Bulan Terakhir" },
          { key: "1-tahun", label: "1 Tahun Terakhir" },
        ] as { key: ViewMode; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setViewMode(key)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="size-4 text-muted-foreground" />
        {viewMode === "bulanan" && (
          <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 bg-background">
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        )}
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border rounded-md px-2 py-1.5 bg-background w-20" />
        <select value={project} onChange={e => setProject(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 bg-background">
          {projectOptions.map(p => <option key={p}>{p}</option>)}
        </select>
        {viewMode !== "bulanan" && multiPeriods.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {multiPeriods[0].label} — {multiPeriods[multiPeriods.length - 1].label}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Lembur", val: `${totalLembur} menit`, color: "text-blue-600" },
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

      {/* BULK INPUT PANEL */}
      {bulkMode && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-wrap gap-3">
            <div>
              <span className="text-sm font-semibold">Input Lembur & Keterlambatan — {month} {year}</span>
              <span className="ml-2 text-xs text-muted-foreground">{bulkFilledCount} sel terisi</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Kantor/Proyek:</span>
                <select value={bulkProject} onChange={e => setBulkProject(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-background">
                  {projects.map(p => <option key={p.id}>{p.nama}</option>)}
                </select>
              </div>
              <div className="flex gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-400"></span>Terlambat (menit)</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-200 border border-blue-400"></span>Lembur (menit)</span>
              </div>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Belum ada data karyawan. Tambahkan melalui "Kelola Karyawan".</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/20 min-w-[160px]" rowSpan={2}>Karyawan</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i + 1} className="px-0.5 py-1 font-medium text-center w-10 text-muted-foreground" colSpan={2}>{i + 1}</th>
                    ))}
                    <th className="px-2 py-1 font-medium text-center text-muted-foreground" rowSpan={2}>Total</th>
                  </tr>
                  <tr className="border-b bg-muted/10">
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <>
                        <th key={`t${i}`} className="px-0.5 py-0.5 text-center w-5 text-[9px] text-amber-600 font-semibold">T</th>
                        <th key={`l${i}`} className="px-0.5 py-0.5 text-center w-5 text-[9px] text-blue-600 font-semibold">L</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => {
                    const days = bulkGrid[emp.id] ?? {};
                    const totalT = Object.values(days).reduce((s, v) => s + (parseInt(v.terlambat) || 0), 0);
                    const totalL = Object.values(days).reduce((s, v) => s + (parseInt(v.lembur) || 0), 0);
                    return (
                      <tr key={emp.id} className="border-b hover:bg-muted/10">
                        <td className="px-3 py-1 font-medium sticky left-0 bg-background border-r">
                          <div>{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground">{emp.division || emp.location}</div>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = i + 1;
                          const cell = days[d] ?? { lembur: "", terlambat: "" };
                          return (
                            <>
                              <td key={`t${d}`} className="px-0.5 py-0.5 text-center">
                                <input
                                  type="number" min={0} step={1}
                                  value={cell.terlambat}
                                  onChange={e => updateBulkCell(emp.id, d, "terlambat", e.target.value)}
                                  placeholder="0"
                                  className={`w-7 text-center text-[10px] border rounded py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 no-spinners ${
                                    parseInt(cell.terlambat) > 0 ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30" : ""
                                  }`}
                                />
                              </td>
                              <td key={`l${d}`} className="px-0.5 py-0.5 text-center">
                                <input
                                  type="number" min={0} step={1}
                                  value={cell.lembur}
                                  onChange={e => updateBulkCell(emp.id, d, "lembur", e.target.value)}
                                  placeholder="0"
                                  className={`w-7 text-center text-[10px] border rounded py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-blue-400 no-spinners ${
                                    parseInt(cell.lembur) > 0 ? "border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30" : ""
                                  }`}
                                />
                              </td>
                            </>
                          );
                        })}
                        <td className="px-2 py-1 text-right text-[11px]">
                          {totalT > 0 && <div className="text-amber-600 font-semibold">{totalT}m T</div>}
                          {totalL > 0 && <div className="text-blue-600 font-semibold">{totalL}m L</div>}
                          {totalT === 0 && totalL === 0 && <span className="text-muted-foreground/40">—</span>}
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
                  {bulkMut.isPending ? "Menyimpan..." : `Simpan (${bulkFilledCount} sel)`}
                </button>
                <button onClick={() => { setBulkMode(false); setBulkGrid({}); setBulkError(null); }}
                  className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Matrix view — BULANAN (hanya tampil saat tidak input) */}
      {!bulkMode && viewMode === "bulanan" && (
        isLoading ? (
          <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
        ) : employees_in_matrix.length === 0 ? (
          <div className="border rounded-xl p-12 text-center">
            <Clock className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada data lembur/keterlambatan untuk periode ini</p>
            <p className="text-xs text-muted-foreground mt-1">Klik "Input Data" untuk mengisi</p>
          </div>
        ) : (
          <>
          {/* Bulk delete bar */}
          {selectedEmps.size > 0 && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{selectedEmps.size} karyawan dipilih</span>
              <button
                onClick={() => bulkDelMut.mutate(Array.from(selectedEmps))}
                disabled={bulkDelMut.isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-md"
              >
                <Trash2 className="size-3.5" />
                {bulkDelMut.isPending ? "Menghapus..." : `Hapus Data ${selectedEmps.size} Karyawan`}
              </button>
              <button onClick={() => setSelectedEmps(new Set())} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border hover:bg-muted">
                Batal Pilih
              </button>
            </div>
          )}
          <div className="border rounded-xl overflow-auto">
            <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/10 text-[11px]">
              <span className="font-semibold text-muted-foreground">Keterangan:</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3.5 rounded bg-amber-100 border border-amber-300"></span><span className="text-amber-700 font-medium">T = Terlambat (menit)</span></span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3.5 rounded bg-blue-100 border border-blue-300"></span><span className="text-blue-700 font-medium">L = Lembur (menit)</span></span>
            </div>
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-2 py-2 w-6" rowSpan={2}>
                    <input
                      type="checkbox"
                      checked={employees_in_matrix.length > 0 && selectedEmps.size === employees_in_matrix.length}
                      ref={el => { if (el) el.indeterminate = selectedEmps.size > 0 && selectedEmps.size < employees_in_matrix.length; }}
                      onChange={() => {
                        if (selectedEmps.size === employees_in_matrix.length) setSelectedEmps(new Set());
                        else setSelectedEmps(new Set(employees_in_matrix));
                      }}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/30 min-w-[160px]" rowSpan={2}>Nama Karyawan</th>
                  <th className="text-left px-2 py-2 font-medium min-w-[90px]" rowSpan={2}>Kantor/Proyek</th>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i + 1} className="px-0.5 py-1 font-medium text-center w-10" colSpan={2}>{i + 1}</th>
                  ))}
                  <th className="px-2 py-1 font-medium text-center" colSpan={2}>Total</th>
                  <th className="px-1 py-1" rowSpan={2}></th>
                </tr>
                <tr className="border-b bg-muted/20">
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <>
                      <th key={`ht${i}`} className="px-0.5 py-0.5 text-center text-[9px] text-amber-600 font-bold">T</th>
                      <th key={`hl${i}`} className="px-0.5 py-0.5 text-center text-[9px] text-blue-600 font-bold">L</th>
                    </>
                  ))}
                  <th className="px-1 py-0.5 text-center text-[9px] text-amber-600 font-bold">T</th>
                  <th className="px-1 py-0.5 text-center text-[9px] text-blue-600 font-bold">L</th>
                </tr>
              </thead>
              <tbody>
                {employees_in_matrix.map(emp => {
                  const empData = matrix[emp] ?? { terlambat: {}, lembur: {}, project: "" };
                  const totalT = Object.values(empData.terlambat).reduce((s, v) => s + v, 0);
                  const totalL = Object.values(empData.lembur).reduce((s, v) => s + v, 0);
                  const empRows = data.filter((r: any) => r.employeeName === emp);
                  const isSelected = selectedEmps.has(emp);
                  return (
                    <tr key={emp} className={`border-b hover:bg-muted/20${isSelected ? " bg-red-50/50" : ""}`}>
                      <td className="px-2 py-1.5">
                        <input type="checkbox" checked={isSelected} onChange={() => {
                          setSelectedEmps(prev => { const s = new Set(prev); s.has(emp) ? s.delete(emp) : s.add(emp); return s; });
                        }} className="rounded cursor-pointer" />
                      </td>
                      <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">{emp}</td>
                      <td className="px-2 py-1.5 text-muted-foreground text-[11px]">{empData.project}</td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const t = empData.terlambat[d] ?? 0;
                        const l = empData.lembur[d] ?? 0;
                        return (
                          <>
                            <td key={`t${d}`} className="px-0.5 py-1 text-center">
                              {t > 0 ? <span className="inline-flex items-center justify-center min-w-[24px] h-5 rounded px-0.5 font-bold bg-amber-100 text-amber-700 text-[10px]">{t}</span>
                                : <span className="text-muted-foreground/20">·</span>}
                            </td>
                            <td key={`l${d}`} className="px-0.5 py-1 text-center">
                              {l > 0 ? <span className="inline-flex items-center justify-center min-w-[24px] h-5 rounded px-0.5 font-bold bg-blue-100 text-blue-700 text-[10px]">{l}</span>
                                : <span className="text-muted-foreground/20">·</span>}
                            </td>
                          </>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-semibold text-amber-600 text-[11px]">{totalT > 0 ? totalT : "-"}</td>
                      <td className="px-2 py-1.5 text-center font-semibold text-blue-600 text-[11px]">{totalL > 0 ? totalL : "-"}</td>
                      <td className="px-1 py-1.5">
                        {deleteConfirmEmp === emp ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Yakin?</span>
                            <button onClick={() => empRows.forEach((r: any) => deleteMut.mutate(r.id))} disabled={deleteMut.isPending}
                              className="text-[10px] font-semibold text-white bg-red-500 px-1.5 py-0.5 rounded disabled:opacity-50">Ya</button>
                            <button onClick={() => setDeleteConfirmEmp(null)}
                              className="text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded hover:bg-muted">Tidak</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmEmp(emp)} className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )
      )}

      {/* Multi-month summary view */}
      {!bulkMode && viewMode !== "bulanan" && (
        <div className="space-y-3">
          {/* Header + download */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-sm font-semibold">
                Ringkasan {viewMode === "3-bulan" ? "3 Bulan" : "1 Tahun"} Terakhir
              </span>
              {multiPeriods.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {multiPeriods[0].label} — {multiPeriods[multiPeriods.length - 1].label}
                </span>
              )}
            </div>
            <button
              onClick={downloadMultiExcel}
              disabled={multiLoading || multiEmpNames.length === 0}
              className="flex items-center gap-1.5 text-sm border border-emerald-600 text-emerald-700 rounded-md px-3 py-1.5 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-emerald-400 dark:hover:bg-emerald-950/30">
              <Download className="size-3.5" /> Download Excel
            </button>
          </div>

          {multiLoading ? (
            <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
          ) : (
            <div className="border rounded-xl overflow-auto">
              {/* Legend */}
              <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/10 text-[11px]">
                <span className="font-semibold text-muted-foreground">Keterangan:</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3.5 rounded bg-amber-100 border border-amber-300"></span><span className="text-amber-700 font-medium">T = Terlambat (menit)</span></span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3.5 rounded bg-blue-100 border border-blue-300"></span><span className="text-blue-700 font-medium">L = Lembur (menit)</span></span>
              </div>
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/30 min-w-[160px]" rowSpan={2}>Nama Karyawan</th>
                    {multiPeriods.map(p => (
                      <th key={p.label} className="px-1 py-1 font-medium text-center text-[11px]" colSpan={2}>{p.label}</th>
                    ))}
                    <th className="px-1 py-1 font-medium text-center" colSpan={2}>Total</th>
                  </tr>
                  <tr className="border-b bg-muted/20">
                    {multiPeriods.map(p => (
                      <>
                        <th key={`${p.label}-t`} className="px-2 py-0.5 text-center text-[9px] text-amber-600 font-bold w-14">T</th>
                        <th key={`${p.label}-l`} className="px-2 py-0.5 text-center text-[9px] text-blue-600 font-bold w-14">L</th>
                      </>
                    ))}
                    <th className="px-2 py-0.5 text-center text-[9px] text-amber-600 font-bold">T</th>
                    <th className="px-2 py-0.5 text-center text-[9px] text-blue-600 font-bold">L</th>
                  </tr>
                </thead>
                <tbody>
                  {multiEmpNames.map(emp => {
                    const empPeriods = multiSummary[emp] ?? {};
                    let grandT = 0, grandL = 0;
                    return (
                      <tr key={emp} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-1.5 font-medium sticky left-0 bg-background border-r">{emp}</td>
                        {multiPeriods.map(p => {
                          const cell = empPeriods[p.label] ?? { terlambat: 0, lembur: 0 };
                          grandT += cell.terlambat;
                          grandL += cell.lembur;
                          return (
                            <>
                              <td key={`${emp}-${p.label}-t`} className="px-2 py-1.5 text-center">
                                {cell.terlambat > 0
                                  ? <span className="inline-flex items-center justify-center min-w-[28px] h-5 rounded px-1 font-bold bg-amber-100 text-amber-700 text-[10px]">{cell.terlambat}</span>
                                  : <span className="text-muted-foreground/20">·</span>}
                              </td>
                              <td key={`${emp}-${p.label}-l`} className="px-2 py-1.5 text-center">
                                {cell.lembur > 0
                                  ? <span className="inline-flex items-center justify-center min-w-[28px] h-5 rounded px-1 font-bold bg-blue-100 text-blue-700 text-[10px]">{cell.lembur}</span>
                                  : <span className="text-muted-foreground/20">·</span>}
                              </td>
                            </>
                          );
                        })}
                        <td className="px-2 py-1.5 text-center font-bold text-amber-600 text-[11px]">{grandT > 0 ? grandT : "-"}</td>
                        <td className="px-2 py-1.5 text-center font-bold text-blue-600 text-[11px]">{grandL > 0 ? grandL : "-"}</td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-3 py-2 sticky left-0 bg-muted/30 text-xs font-bold border-r">TOTAL</td>
                    {multiPeriods.map(p => {
                      const t = multiEmpNames.reduce((s, emp) => s + (multiSummary[emp]?.[p.label]?.terlambat ?? 0), 0);
                      const l = multiEmpNames.reduce((s, emp) => s + (multiSummary[emp]?.[p.label]?.lembur ?? 0), 0);
                      return (
                        <>
                          <td key={`tot-${p.label}-t`} className="px-2 py-2 text-center text-amber-700 text-xs font-bold">{t > 0 ? t : "-"}</td>
                          <td key={`tot-${p.label}-l`} className="px-2 py-2 text-center text-blue-700 text-xs font-bold">{l > 0 ? l : "-"}</td>
                        </>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-amber-700 text-xs font-bold">
                      {multiAllRows.reduce((s, r) => s + r.terlambatMenit, 0) || "-"}
                    </td>
                    <td className="px-2 py-2 text-center text-blue-700 text-xs font-bold">
                      {multiAllRows.reduce((s, r) => s + Number(r.lemburJam), 0) || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
