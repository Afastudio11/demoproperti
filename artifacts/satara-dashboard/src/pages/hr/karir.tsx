import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];

const SEED_CAREER = [
  { division: "Marketing", level: 1, positionName: "Junior Sales", previousPosition: null, minTenureMonths: 0, minKpiAchievement: 0, minCompetencyScore: 0 },
  { division: "Marketing", level: 2, positionName: "Sales Marketing", previousPosition: "Junior Sales", minTenureMonths: 6, minKpiAchievement: 75, minCompetencyScore: 70 },
  { division: "Marketing", level: 3, positionName: "Senior Sales", previousPosition: "Sales Marketing", minTenureMonths: 18, minKpiAchievement: 80, minCompetencyScore: 75 },
  { division: "Marketing", level: 4, positionName: "Marketing Lead", previousPosition: "Senior Sales", minTenureMonths: 36, minKpiAchievement: 85, minCompetencyScore: 80 },
  { division: "Administrasi", level: 1, positionName: "Junior Admin KPR", previousPosition: null, minTenureMonths: 0, minKpiAchievement: 0, minCompetencyScore: 0 },
  { division: "Administrasi", level: 2, positionName: "Admin KPR", previousPosition: "Junior Admin KPR", minTenureMonths: 6, minKpiAchievement: 75, minCompetencyScore: 70 },
  { division: "Administrasi", level: 3, positionName: "Senior Admin KPR", previousPosition: "Admin KPR", minTenureMonths: 24, minKpiAchievement: 80, minCompetencyScore: 75 },
  { division: "Produksi", level: 1, positionName: "Mandor", previousPosition: null, minTenureMonths: 0, minKpiAchievement: 0, minCompetencyScore: 0 },
  { division: "Produksi", level: 2, positionName: "Supervisor Lapangan", previousPosition: "Mandor", minTenureMonths: 12, minKpiAchievement: 75, minCompetencyScore: 70 },
  { division: "Produksi", level: 3, positionName: "Site Manager", previousPosition: "Supervisor Lapangan", minTenureMonths: 24, minKpiAchievement: 80, minCompetencyScore: 75 },
  { division: "Legal", level: 1, positionName: "Junior Staff Legal", previousPosition: null, minTenureMonths: 0, minKpiAchievement: 0, minCompetencyScore: 0 },
  { division: "Legal", level: 2, positionName: "Staff Legal", previousPosition: "Junior Staff Legal", minTenureMonths: 12, minKpiAchievement: 75, minCompetencyScore: 70 },
  { division: "Legal", level: 3, positionName: "Legal Officer", previousPosition: "Staff Legal", minTenureMonths: 30, minKpiAchievement: 80, minCompetencyScore: 80 },
];

const EMPTY = { division: DIVISIONS[0], level: 1, positionName: "", previousPosition: "", minTenureMonths: 12, minKpiAchievement: 75, minCompetencyScore: 70 };

export default function Karir() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterDiv, setFilterDiv] = useState("");

  const { data: paths = [] } = useQuery<any[]>({ queryKey: ["hr-career-paths"], queryFn: () => fetch("/api/hr/career-paths").then(apiJson) });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: kpiRecords = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-records"], queryFn: () => fetch("/api/hr/kpi/records").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/career-paths/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/career-paths", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-career-paths"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/career-paths/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-career-paths"] }),
  });

  const seedAll = useMutation({
    mutationFn: async () => { for (const s of SEED_CAREER) await fetch("/api/hr/career-paths", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-career-paths"] }),
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(p: any) { setForm({ ...p }); setEditId(p.id); setShowForm(true); }

  const filtered = filterDiv ? paths.filter(p => p.division === filterDiv) : paths;
  const byDivision: Record<string, any[]> = {};
  for (const p of filtered) {
    if (!byDivision[p.division]) byDivision[p.division] = [];
    byDivision[p.division].push(p);
  }

  const activeEmployees = employees.filter((e: any) => ["aktif", "tetap", "kontrak", "probasi"].includes(e.employmentStatus));
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();

  function getEmpReadiness(emp: any, nextPath: any) {
    const joinDate = emp.joinDate ? new Date(emp.joinDate) : null;
    const joinMonth = joinDate ? joinDate.getFullYear() * 12 + joinDate.getMonth() : 0;
    const tenureMonths = joinDate ? currentMonth - joinMonth : 0;
    const empKpi = kpiRecords.filter((r: any) => r.employeeId === emp.id);
    const avgKpi = empKpi.length > 0 ? empKpi.reduce((s: number, r: any) => s + Number(r.achievementPct), 0) / empKpi.length : 0;
    const tenureOk = tenureMonths >= (nextPath.minTenureMonths ?? 0);
    const kpiOk = avgKpi >= (Number(nextPath.minKpiAchievement) ?? 0);
    return { tenureOk, kpiOk, tenureMonths, avgKpi, ready: tenureOk && kpiOk };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Career Path</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Jalur karir dan kesiapan promosi karyawan per divisi</p>
        </div>
        <div className="flex items-center gap-2">
          {paths.length === 0 && <button onClick={() => seedAll.mutate()} disabled={seedAll.isPending} className="text-sm border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-50">{seedAll.isPending ? "Mengisi..." : "Seed Data Awal"}</button>}
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Tambah Jalur</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Semua Divisi</option>
          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {Object.keys(byDivision).length === 0 && <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">Belum ada data jalur karir.</div>}

      {Object.entries(byDivision).map(([div, items]) => {
        const sorted = [...items].sort((a, b) => a.level - b.level);
        const divEmps = activeEmployees.filter((e: any) => e.division === div);
        return (
          <div key={div} className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 font-semibold text-sm">{div}</div>
            {/* Career Ladder Visual */}
            <div className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {sorted.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="border rounded-xl p-3 min-w-[120px]">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Level {p.level}</div>
                      <div className="text-sm font-semibold leading-tight">{p.positionName}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {p.minTenureMonths > 0 && <div>Min. {p.minTenureMonths} bln</div>}
                        {Number(p.minKpiAchievement) > 0 && <div>KPI ≥ {p.minKpiAchievement}%</div>}
                        {Number(p.minCompetencyScore) > 0 && <div>Komp. ≥ {p.minCompetencyScore}</div>}
                      </div>
                    </div>
                    {i < sorted.length - 1 && <ArrowRight className="size-4 text-muted-foreground shrink-0" />}
                    <button onClick={() => startEdit(p)} className="sr-only"><Edit2 className="size-3" /></button>
                  </div>
                ))}
              </div>

              {/* Karyawan di divisi ini & promosi readiness */}
              {divEmps.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">KARYAWAN DI DIVISI INI</div>
                  <div className="space-y-1">
                    {divEmps.map((emp: any) => {
                      const currentLevel = sorted.find(p => p.positionName === emp.position);
                      const nextLevel = currentLevel ? sorted.find(p => p.level === currentLevel.level + 1) : sorted[0];
                      const { ready, tenureMonths, avgKpi, tenureOk, kpiOk } = nextLevel ? getEmpReadiness(emp, nextLevel) : { ready: false, tenureMonths: 0, avgKpi: 0, tenureOk: false, kpiOk: false };
                      return (
                        <div key={emp.id} className={cn("flex items-center justify-between text-xs border rounded-lg p-2", ready ? "border-emerald-200 bg-emerald-50" : "")}>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{emp.name}</span>
                            <span className="text-muted-foreground">{emp.position}</span>
                          </div>
                          {nextLevel && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">→ {nextLevel.positionName}:</span>
                              <span className={cn(tenureOk ? "text-emerald-600" : "text-red-500")}>{tenureMonths}bln {tenureOk ? "✓" : "✗"}</span>
                              <span className={cn(kpiOk ? "text-emerald-600" : "text-red-500")}>KPI {avgKpi.toFixed(0)}% {kpiOk ? "✓" : "✗"}</span>
                              {ready && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Siap Promosi</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Delete links */}
            <div className="border-t px-4 py-2 flex gap-2 flex-wrap">
              {sorted.map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  <button onClick={() => startEdit(p)} className="text-xs text-blue-600 hover:underline">{p.positionName}</button>
                  <span className="text-muted-foreground/30">|</span>
                  <button onClick={() => { if (confirm("Hapus?")) del.mutate(p.id); }} className="text-xs text-red-400 hover:underline">hapus</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Tambah"} Jalur Karir</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label><select value={form.division} onChange={e => setForm((f: any) => ({ ...f, division: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Level</label><input type="number" value={form.level} onChange={e => setForm((f: any) => ({ ...f, level: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={1} /></div>
              </div>
              {[{ label: "Nama Jabatan *", field: "positionName" }, { label: "Jabatan Sebelumnya (level-1)", field: "previousPosition" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input value={form[field] ?? ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "Min. Masa Kerja (bln)", field: "minTenureMonths" }, { label: "Min. KPI Achievement (%)", field: "minKpiAchievement" }, { label: "Min. Competency Score", field: "minCompetencyScore" }].map(({ label, field }) => (
                  <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input type="number" value={form[field] ?? 0} onChange={e => setForm((f: any) => ({ ...f, [field]: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.positionName || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
