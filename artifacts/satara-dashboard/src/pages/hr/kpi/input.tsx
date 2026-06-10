import { apiJson } from "@/lib/api";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, Users, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const now = new Date();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function KpiInput() {
  const qc = useQueryClient();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  // Bulk input mode
  const [bulkMode, setBulkMode] = useState(false);
  // bulkValues: record id (or temp key empId_defId) -> actual value string
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [bulkSaved, setBulkSaved] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [expandedEmps, setExpandedEmps] = useState<Record<number, boolean>>({});

  // Single edit modal
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ employeeId: 0, kpiDefinitionId: 0, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, target: 0, actual: 0, notes: "" });

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: defs = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-defs"], queryFn: () => fetch("/api/hr/kpi/definitions").then(apiJson) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-records"], queryFn: () => fetch("/api/hr/kpi/records").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/kpi/records/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/kpi/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-kpi-records"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const bulkSave = useMutation({
    mutationFn: async (items: any[]) => {
      for (const item of items) {
        await fetch("/api/hr/kpi/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) }).then(apiJson);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-kpi-records"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      setBulkSaved(true);
      setTimeout(() => { setBulkMode(false); setBulkSaved(false); setBulkValues({}); }, 1500);
      setBulkError(null);
    },
    onError: (e: any) => setBulkError(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/kpi/records/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-kpi-records"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm({ employeeId: 0, kpiDefinitionId: 0, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, target: 0, actual: 0, notes: "" }); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r, target: Number(r.target), actual: Number(r.actual) }); setEditId(r.id); setShowForm(true); }

  const filtered = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);

  function getEmpName(id: number) { return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }
  function getKpiName(id: number) { return defs.find((d: any) => d.id === id)?.kpiName ?? `#${id}`; }

  const byEmployee: Record<string, any[]> = {};
  for (const r of filtered) {
    const name = getEmpName(r.employeeId);
    if (!byEmployee[name]) byEmployee[name] = [];
    byEmployee[name].push(r);
  }

  // Bulk input: build employee -> relevant KPIs matrix
  // Pair employees with their applicable KPI definitions
  const bulkMatrix = useMemo(() => {
    return employees.map((emp: any) => {
      const relevantDefs = defs.filter((d: any) => d.position === emp.position || d.division === emp.division);
      return { emp, defs: relevantDefs };
    }).filter(({ defs: d }) => d.length > 0);
  }, [employees, defs]);

  // Check which employee+def combos already have records for this period
  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of filtered) {
      keys.add(`${r.employeeId}_${r.kpiDefinitionId}`);
    }
    return keys;
  }, [filtered]);

  function openBulk() {
    // Pre-fill bulk values with defaults (target from def)
    const vals: Record<string, string> = {};
    for (const { emp, defs: empDefs } of bulkMatrix) {
      for (const def of empDefs) {
        const key = `${emp.id}_${def.id}`;
        if (!existingKeys.has(key)) {
          vals[key] = "";
        }
      }
    }
    setBulkValues(vals);
    setBulkMode(true);
    setBulkSaved(false);
    setBulkError(null);
    // Expand all
    const expanded: Record<number, boolean> = {};
    for (const { emp } of bulkMatrix) expanded[emp.id] = true;
    setExpandedEmps(expanded);
  }

  function handleBulkSave() {
    const items: any[] = [];
    for (const { emp, defs: empDefs } of bulkMatrix) {
      for (const def of empDefs) {
        const key = `${emp.id}_${def.id}`;
        const val = bulkValues[key];
        if (val === undefined || val === "") continue;
        const actual = parseFloat(val);
        if (isNaN(actual)) continue;
        items.push({
          employeeId: emp.id,
          kpiDefinitionId: def.id,
          periodYear: filterYear,
          periodMonth: filterMonth,
          target: Number(def.monthlyTarget),
          actual,
          notes: "",
        });
      }
    }
    if (!items.length) { setBulkError("Belum ada nilai realisasi yang diisi."); return; }
    bulkSave.mutate(items);
  }

  const filledCount = Object.values(bulkValues).filter(v => v !== "").length;

  const selectedEmployee = employees.find((e: any) => e.id === Number(form.employeeId));
  const relevantDefs = selectedEmployee ? defs.filter((d: any) => d.position === selectedEmployee.position || d.division === selectedEmployee.division) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">KPI — Input Realisasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Input realisasi KPI karyawan per bulan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openBulk}
            className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Users className="size-3.5" /> Input Semua Karyawan
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} record</span>
      </div>

      {/* ── BULK INPUT PANEL ─────────────────────────────────────────────── */}
      {bulkMode && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div>
              <span className="text-sm font-semibold">Input Realisasi KPI — {MONTHS[filterMonth - 1]} {filterYear}</span>
              <span className="ml-2 text-xs text-muted-foreground">{filledCount} KPI terisi</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Isi kolom "Realisasi" untuk masing-masing KPI</span>
            </div>
          </div>

          {bulkMatrix.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Belum ada karyawan dengan definisi KPI yang terdaftar. Tambah karyawan dan definisi KPI terlebih dahulu.
            </div>
          ) : (
            <div className="divide-y">
              {bulkMatrix.map(({ emp, defs: empDefs }) => {
                const isExpanded = expandedEmps[emp.id] ?? true;
                const empFilled = empDefs.filter((def: any) => {
                  const key = `${emp.id}_${def.id}`;
                  return bulkValues[key] !== undefined && bulkValues[key] !== "";
                }).length;
                const empAlready = empDefs.filter((def: any) => existingKeys.has(`${emp.id}_${def.id}`)).length;

                return (
                  <div key={emp.id}>
                    <button
                      onClick={() => setExpandedEmps(e => ({ ...e, [emp.id]: !e[emp.id] }))}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{emp.name}</span>
                        <span className="text-xs text-muted-foreground">{emp.position} · {emp.division}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {empAlready > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{empAlready} sudah ada</span>
                        )}
                        {empFilled > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{empFilled} diisi</span>
                        )}
                        {isExpanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b">
                              <th className="text-left py-1.5 font-medium">Nama KPI</th>
                              <th className="text-center px-3 py-1.5 font-medium w-24">Target</th>
                              <th className="text-center px-3 py-1.5 font-medium w-28">Realisasi</th>
                              <th className="text-center px-3 py-1.5 font-medium w-20">Achievement</th>
                              <th className="text-center px-3 py-1.5 font-medium w-16">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empDefs.map((def: any) => {
                              const key = `${emp.id}_${def.id}`;
                              const alreadyExists = existingKeys.has(key);
                              const val = bulkValues[key] ?? "";
                              const actual = parseFloat(val);
                              const target = Number(def.monthlyTarget);
                              const ach = !isNaN(actual) && target > 0 ? Math.min(100, (actual / target) * 100) : null;
                              return (
                                <tr key={def.id} className={cn("border-b last:border-0", alreadyExists ? "opacity-50" : "")}>
                                  <td className="py-1.5">
                                    <div className="font-medium">{def.kpiName}</div>
                                    <div className="text-muted-foreground">{def.unit}{def.dataSource === "otomatis" ? " · otomatis" : ""}</div>
                                  </td>
                                  <td className="text-center px-3 py-1.5 font-medium">{target.toLocaleString("id-ID")}</td>
                                  <td className="px-3 py-1.5">
                                    {alreadyExists ? (
                                      <span className="block text-center text-muted-foreground text-[11px]">sudah diisi</span>
                                    ) : (
                                      <input
                                        type="number"
                                        min={0}
                                        value={val}
                                        onChange={e => setBulkValues(v => ({ ...v, [key]: e.target.value }))}
                                        placeholder={`Target: ${target.toLocaleString("id-ID")}`}
                                        className={cn(
                                          "w-full border rounded px-2 py-1 text-center bg-background focus:outline-none focus:ring-1 focus:ring-ring",
                                          val !== "" ? "border-emerald-400" : ""
                                        )}
                                      />
                                    )}
                                  </td>
                                  <td className="text-center px-3 py-1.5">
                                    {ach !== null ? (
                                      <span className={cn("font-semibold", ach >= 90 ? "text-emerald-600" : ach >= 75 ? "text-amber-600" : "text-red-500")}>
                                        {ach.toFixed(1)}%
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td className="text-center px-3 py-1.5">
                                    {alreadyExists ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Ada</span>
                                    ) : val !== "" ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Siap</span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Kosong</span>
                                    )}
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
              })}
            </div>
          )}

          {bulkError && (
            <div className="mx-4 my-2 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {bulkError}
            </div>
          )}

          <div className="flex items-center gap-3 p-3 border-t bg-muted/10">
            {bulkSaved ? (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="size-4" /> Berhasil disimpan!
              </div>
            ) : (
              <>
                <button onClick={handleBulkSave} disabled={bulkSave.isPending}
                  className="text-sm bg-foreground text-background rounded-md px-4 py-1.5 hover:opacity-90 disabled:opacity-50">
                  {bulkSave.isPending ? "Menyimpan..." : `Simpan ${filledCount} KPI`}
                </button>
                <button onClick={() => { setBulkMode(false); setBulkValues({}); setBulkError(null); }}
                  className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
                <span className="text-xs text-muted-foreground ml-1">Data yang sudah ada tidak akan ditimpa</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EXISTING RECORDS VIEW ────────────────────────────────────────── */}
      <div className="space-y-4">
        {Object.keys(byEmployee).length === 0 && !bulkMode && (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">
            Belum ada data KPI untuk periode ini.
            <div className="mt-1 text-xs">Klik "Input Semua Karyawan" untuk mengisi realisasi KPI.</div>
          </div>
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

      {/* ── SINGLE EDIT MODAL ────────────────────────────────────────────── */}
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
                <select value={form.employeeId} onChange={e => setForm((f: any) => ({ ...f, employeeId: Number(e.target.value), kpiDefinitionId: 0 }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                  <option value={0}>— Pilih karyawan —</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">KPI *</label>
                <select value={form.kpiDefinitionId} onChange={e => {
                  const def = defs.find((d: any) => d.id === Number(e.target.value));
                  setForm((f: any) => ({ ...f, kpiDefinitionId: Number(e.target.value), target: def ? Number(def.monthlyTarget) : 0 }));
                }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" disabled={!form.employeeId}>
                  <option value={0}>— Pilih KPI —</option>
                  {relevantDefs.map((d: any) => <option key={d.id} value={d.id}>{d.kpiName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan</label>
                  <select value={form.periodMonth} onChange={e => setForm((f: any) => ({ ...f, periodMonth: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label>
                  <select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Target</label>
                  <input type="number" value={form.target} onChange={e => setForm((f: any) => ({ ...f, target: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Realisasi</label>
                  <input type="number" value={form.actual} onChange={e => setForm((f: any) => ({ ...f, actual: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" />
                </div>
              </div>
              {form.target > 0 && (
                <div className={cn("text-sm font-semibold px-3 py-2 rounded-lg", form.actual / form.target >= 0.9 ? "bg-emerald-50 text-emerald-700" : form.actual / form.target >= 0.75 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                  Achievement: {Math.min(100, (form.actual / form.target) * 100).toFixed(1)}%
                </div>
              )}
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" rows={2} /></div>
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
