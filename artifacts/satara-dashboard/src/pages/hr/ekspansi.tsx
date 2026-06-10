import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ProjectNameSelect from "@/components/project-name-select";

const EMPTY = { projectName: "", positionName: "", headcount: 1, minCompetencyScore: 70, minKpiAchievement: 75 };

export default function Ekspansi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: needs = [] } = useQuery<any[]>({ queryKey: ["hr-expansion-needs"], queryFn: () => fetch("/api/hr/expansion").then(apiJson) });
  const { data: kpiRecords = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-records"], queryFn: () => fetch("/api/hr/kpi/records").then(apiJson) });
  const { data: compScores = [] } = useQuery<any[]>({ queryKey: ["hr-comp-scores"], queryFn: () => fetch("/api/hr/competency/scores").then(apiJson) });
  const { data: compDefs = [] } = useQuery<any[]>({ queryKey: ["hr-comp-defs"], queryFn: () => fetch("/api/hr/competency/definitions").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/expansion/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/expansion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-expansion-needs"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/expansion/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-expansion-needs"] }),
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(n: any) { setForm({ ...n }); setEditId(n.id); setShowForm(true); }

  const activeEmps = employees.filter((e: any) => ["aktif", "tetap", "kontrak", "probasi"].includes(e.employmentStatus));

  function getEligible(need: any) {
    const empKpiMap: Record<number, number[]> = {};
    for (const r of kpiRecords) { if (!empKpiMap[r.employeeId]) empKpiMap[r.employeeId] = []; empKpiMap[r.employeeId].push(Number(r.achievementPct)); }
    const empCompMap: Record<number, number[]> = {};
    for (const sc of compScores) { const def = compDefs.find((d: any) => d.id === sc.competencyDefinitionId); if (!def) continue; empCompMap[sc.employeeId] = empCompMap[sc.employeeId] || []; empCompMap[sc.employeeId].push(Math.min(Number(sc.actualScore) / Number(def.targetScore), 1) * 100); }
    return activeEmps.filter(e => {
      const avgKpi = empKpiMap[e.id] ? empKpiMap[e.id].reduce((a: number, b: number) => a + b, 0) / empKpiMap[e.id].length : 0;
      const avgComp = empCompMap[e.id] ? empCompMap[e.id].reduce((a: number, b: number) => a + b, 0) / empCompMap[e.id].length : 0;
      return avgKpi >= Number(need.minKpiAchievement) && avgComp >= Number(need.minCompetencyScore);
    });
  }

  const byProject: Record<string, { need: any; eligible: any[]; readinessPct: number }[]> = {};
  for (const n of needs) {
    const eligible = getEligible(n);
    const readinessPct = n.headcount > 0 ? Math.min(eligible.length / n.headcount, 1) * 100 : 100;
    if (!byProject[n.projectName]) byProject[n.projectName] = [];
    byProject[n.projectName].push({ need: n, eligible, readinessPct });
  }

  const totalNeeded = needs.reduce((s: number, n: any) => s + n.headcount, 0);
  const totalEligible = needs.reduce((s: number, n: any) => s + Math.min(getEligible(n).length, n.headcount), 0);
  const overallReadiness = totalNeeded > 0 ? (totalEligible / totalNeeded) * 100 : 100;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Expansion Readiness</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kesiapan SDM untuk mengisi kebutuhan posisi proyek baru</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Tambah Kebutuhan</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Kebutuhan Posisi", val: totalNeeded },
          { label: "SDM Eligible", val: totalEligible },
          { label: "Readiness Keseluruhan", val: `${overallReadiness.toFixed(0)}%`, color: overallReadiness >= 80 ? "text-emerald-600" : overallReadiness >= 50 ? "text-amber-600" : "text-red-500" },
        ].map(({ label, val, color }: any) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color ?? "text-foreground")}>{val}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {Object.keys(byProject).length === 0 && <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">Belum ada kebutuhan ekspansi SDM.</div>}
        {Object.entries(byProject).map(([project, items]) => {
          const projNeeded = items.reduce((s, i) => s + i.need.headcount, 0);
          const projEligible = items.reduce((s, i) => s + Math.min(i.eligible.length, i.need.headcount), 0);
          const projReadiness = projNeeded > 0 ? (projEligible / projNeeded) * 100 : 100;
          return (
            <div key={project} className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div>
                  <span className="font-semibold text-sm">{project}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{projEligible}/{projNeeded} posisi tercover</span>
                </div>
                <span className={cn("text-sm font-bold px-3 py-1 rounded-full", projReadiness >= 80 ? "bg-emerald-100 text-emerald-700" : projReadiness >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{projReadiness.toFixed(0)}% Siap</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left px-4 py-2 font-medium">Posisi</th><th className="text-center px-3 py-2 font-medium">Dibutuhkan</th><th className="text-center px-3 py-2 font-medium">Min. KPI</th><th className="text-center px-3 py-2 font-medium">Min. Comp</th><th className="text-center px-3 py-2 font-medium">Eligible</th><th className="text-center px-3 py-2 font-medium">Status</th><th className="px-2 py-2" /></tr></thead>
                  <tbody>
                    {items.map(({ need, eligible, readinessPct }) => (
                      <tr key={need.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{need.positionName}</td>
                        <td className="text-center px-3 py-2.5">{need.headcount}</td>
                        <td className="text-center px-3 py-2.5 text-muted-foreground">{need.minKpiAchievement}%</td>
                        <td className="text-center px-3 py-2.5 text-muted-foreground">{need.minCompetencyScore}</td>
                        <td className="text-center px-3 py-2.5 font-medium">{eligible.length}</td>
                        <td className="text-center px-3 py-2.5">
                          <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", readinessPct >= 100 ? "bg-emerald-100 text-emerald-700" : readinessPct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                            {readinessPct >= 100 ? "Tercover" : readinessPct >= 50 ? "Parsial" : "Kekurangan"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(need)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                            <button onClick={() => { if (confirm("Hapus?")) del.mutate(need.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Eligible employees list */}
              {items.flatMap(i => i.eligible).length > 0 && (
                <div className="px-4 pb-4">
                  <div className="text-xs font-semibold text-muted-foreground mt-3 mb-1">KANDIDAT ELIGIBLE</div>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(items.flatMap(i => i.eligible).map(e => e.name))].map(name => (
                      <span key={name} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-medium">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Tambah"} Kebutuhan Posisi Ekspansi</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Proyek *</label>
                <ProjectNameSelect
                  value={form.projectName ?? ""}
                  onChange={value => setForm((f: any) => ({ ...f, projectName: value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Posisi *</label><input value={form.positionName ?? ""} onChange={e => setForm((f: any) => ({ ...f, positionName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "Headcount", field: "headcount" }, { label: "Min. KPI (%)", field: "minKpiAchievement" }, { label: "Min. Comp. Score", field: "minCompetencyScore" }].map(({ label, field }) => (
                  <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input type="number" value={form[field] ?? 0} onChange={e => setForm((f: any) => ({ ...f, [field]: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.projectName || !form.positionName || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
