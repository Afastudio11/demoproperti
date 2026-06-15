import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

const DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];

const SEED_COMP = [
  { position: "Staff Finance", division: "Finance", competencyName: "Excel", targetScore: 80 },
  { position: "Staff Finance", division: "Finance", competencyName: "Akuntansi", targetScore: 85 },
  { position: "Staff Finance", division: "Finance", competencyName: "Cashflow", targetScore: 80 },
  { position: "Staff Finance", division: "Finance", competencyName: "Budgeting", targetScore: 75 },
  { position: "Site Manager", division: "Produksi", competencyName: "Site Management", targetScore: 85 },
  { position: "Site Manager", division: "Produksi", competencyName: "QC", targetScore: 80 },
  { position: "Site Manager", division: "Produksi", competencyName: "Material Control", targetScore: 75 },
  { position: "Site Manager", division: "Produksi", competencyName: "K3", targetScore: 80 },
  { position: "Staff Legal", division: "Legal", competencyName: "Analisis Hukum", targetScore: 80 },
  { position: "Staff Legal", division: "Legal", competencyName: "Administrasi BPN", targetScore: 85 },
  { position: "Staff Legal", division: "Legal", competencyName: "Perizinan OSS", targetScore: 80 },
  { position: "Sales Marketing", division: "Marketing", competencyName: "Komunikasi", targetScore: 85 },
  { position: "Sales Marketing", division: "Marketing", competencyName: "Digital Marketing", targetScore: 75 },
  { position: "Sales Marketing", division: "Marketing", competencyName: "Negosiasi", targetScore: 80 },
  { position: "Sales Marketing", division: "Marketing", competencyName: "CRM", targetScore: 70 },
  { position: "Admin KPR", division: "Administrasi", competencyName: "Administrasi KPR", targetScore: 85 },
  { position: "Admin KPR", division: "Administrasi", competencyName: "Komunikasi Bank", targetScore: 80 },
  { position: "Admin KPR", division: "Administrasi", competencyName: "Pengarsipan", targetScore: 75 },
];

const EMPTY_DEF = { position: "", division: DIVISIONS[0], competencyName: "", description: "", targetScore: 80 };
const EMPTY_SCORE = { employeeId: 0, competencyDefinitionId: 0, actualScore: 0, assessmentDate: "", assessor: "", notes: "" };

export default function Kompetensi() {
  const qc = useQueryClient();
  const [showDefForm, setShowDefForm] = useState(false);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [defForm, setDefForm] = useState<any>(EMPTY_DEF);
  const [scoreForm, setScoreForm] = useState<any>(EMPTY_SCORE);
  const [editDefId, setEditDefId] = useState<number | null>(null);
  const [editScoreId, setEditScoreId] = useState<number | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [tab, setTab] = useState<"definisi" | "assessment">("definisi");

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: defs = [] } = useQuery<any[]>({ queryKey: ["hr-comp-defs"], queryFn: () => fetch("/api/hr/competency/definitions").then(apiJson) });
  const { data: scores = [] } = useQuery<any[]>({ queryKey: ["hr-comp-scores"], queryFn: () => fetch("/api/hr/competency/scores").then(apiJson) });

  const saveDef = useMutation({
    mutationFn: (body: any) => editDefId
      ? fetch(`/api/hr/competency/definitions/${editDefId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/competency/definitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-comp-defs"] }); setShowDefForm(false); setDefForm(EMPTY_DEF); setEditDefId(null); },
  });

  const delDef = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/competency/definitions/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-comp-defs"] }),
  });

  const saveScore = useMutation({
    mutationFn: (body: any) => editScoreId
      ? fetch(`/api/hr/competency/scores/${editScoreId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/competency/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-comp-scores"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); setShowScoreForm(false); setScoreForm(EMPTY_SCORE); setEditScoreId(null); },
  });

  const delScore = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/competency/scores/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-comp-scores"] }),
  });

  const seedAll = useMutation({
    mutationFn: async () => { for (const s of SEED_COMP) await fetch("/api/hr/competency/definitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-comp-defs"] }),
  });

  const selectedEmp = employees.find((e: any) => e.id === selectedEmpId);
  const empDefs = selectedEmp ? defs.filter((d: any) => d.position === selectedEmp.position || d.division === selectedEmp.division) : [];
  const empScores = selectedEmpId ? scores.filter((s: any) => s.employeeId === selectedEmpId) : [];

  const radarData = empDefs.map((d: any) => {
    const sc = empScores.find((s: any) => s.competencyDefinitionId === d.id);
    return { name: d.competencyName, target: Number(d.targetScore), actual: sc ? Number(sc.actualScore) : 0 };
  });

  const byPosition: Record<string, any[]> = {};
  for (const d of defs) {
    const key = `${d.division} — ${d.position}`;
    if (!byPosition[key]) byPosition[key] = [];
    byPosition[key].push(d);
  }

  const empCompScore = selectedEmpId ? (() => {
    if (empDefs.length === 0) return 0;
    let total = 0; let count = 0;
    for (const d of empDefs) {
      const sc = empScores.find((s: any) => s.competencyDefinitionId === d.id);
      if (sc) { total += Math.min(Number(sc.actualScore) / Number(d.targetScore), 1) * 100; count++; }
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  })() : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Competency Matrix</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Definisi kompetensi per jabatan dan skill gap karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          {defs.length === 0 && <button onClick={() => seedAll.mutate()} disabled={seedAll.isPending} className="text-sm border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-50">{seedAll.isPending ? "Mengisi..." : "Seed Data Awal"}</button>}
          <button onClick={() => { setTab("definisi"); setShowDefForm(true); }} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
            <Plus className="size-3.5" /> Tambah Kompetensi
          </button>
          <button onClick={() => { setTab("assessment"); setShowScoreForm(true); }} className="flex items-center gap-2 border text-sm px-3 py-1.5 rounded-md hover:bg-muted">
            <Plus className="size-3.5" /> Input Assessment
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(["definisi", "assessment"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t === "definisi" ? "Definisi Kompetensi" : "Assessment & Radar"}
          </button>
        ))}
      </div>

      {tab === "definisi" && (
        <div className="space-y-4">
          {Object.keys(byPosition).length === 0 && <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">Belum ada definisi kompetensi.</div>}
          {Object.entries(byPosition).map(([key, items]) => (
            <div key={key} className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 font-medium text-sm">{key}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left px-4 py-2 font-medium">Kompetensi</th><th className="text-center px-3 py-2 font-medium">Target Skor</th><th className="px-2 py-2" /></tr></thead>
                  <tbody>
                    {items.map(d => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2">{d.competencyName}{d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}</td>
                        <td className="text-center px-3 py-2 font-semibold">{d.targetScore}/100</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => { setDefForm({ ...d }); setEditDefId(d.id); setShowDefForm(true); }} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                            <button onClick={() => { if (confirm("Hapus?")) delDef.mutate(d.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "assessment" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-medium text-sm mb-3">Pilih Karyawan</h3>
              <select value={selectedEmpId ?? ""} onChange={e => setSelectedEmpId(e.target.value ? Number(e.target.value) : null)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Pilih karyawan —</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {selectedEmpId && <div className="mt-3 text-sm font-semibold">Competency Score: <span className={cn(empCompScore >= 80 ? "text-emerald-600" : empCompScore >= 60 ? "text-amber-600" : "text-red-500")}>{empCompScore}%</span></div>}
            </div>
            {selectedEmpId && (
              <div className="bg-card border rounded-xl p-4">
                <h3 className="font-medium text-sm mb-2">Skill Gap</h3>
                <div className="space-y-2">
                  {radarData.filter(r => r.actual < r.target).sort((a, b) => (b.target - b.actual) - (a.target - a.actual)).map(r => {
                    const gap = r.target - r.actual;
                    return (
                      <div key={r.name} className={cn("flex items-center justify-between text-xs p-2 rounded-lg border", gap > 20 ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50")}>
                        <span>{r.name}</span>
                        <span className={cn("font-semibold", gap > 20 ? "text-red-600" : "text-amber-600")}>Gap: {gap}</span>
                      </div>
                    );
                  })}
                  {radarData.filter(r => r.actual >= r.target).length > 0 && <div className="text-xs text-emerald-600 text-center">✓ {radarData.filter(r => r.actual >= r.target).length} kompetensi memenuhi target</div>}
                  {radarData.every(r => r.actual === 0) && <p className="text-xs text-muted-foreground text-center">Belum ada data assessment</p>}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 bg-card border rounded-xl p-4">
            {selectedEmpId && radarData.length > 0 ? (
              <>
                <h3 className="font-medium text-sm mb-4">Radar Chart — {selectedEmp?.name}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <Radar name="Target" dataKey="target" stroke="#d1d5db" fill="#d1d5db" fillOpacity={0.3} />
                    <Radar name="Aktual" dataKey="actual" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left py-2 font-medium">Kompetensi</th><th className="text-center py-2 font-medium">Target</th><th className="text-center py-2 font-medium">Aktual</th><th className="text-center py-2 font-medium">Gap</th><th className="py-2" /></tr></thead>
                    <tbody>
                      {radarData.map(r => {
                        const sc = empScores.find((s: any) => {
                          const def = defs.find((d: any) => d.competencyName === r.name);
                          return def && s.competencyDefinitionId === def.id;
                        });
                        const gap = r.target - r.actual;
                        return (
                          <tr key={r.name} className="border-b last:border-0">
                            <td className="py-2">{r.name}</td>
                            <td className="text-center py-2">{r.target}</td>
                            <td className="text-center py-2 font-medium">{r.actual > 0 ? r.actual : "—"}</td>
                            <td className="text-center py-2">
                              {r.actual > 0 ? <span className={cn("font-semibold", gap > 20 ? "text-red-500" : gap > 0 ? "text-amber-500" : "text-emerald-600")}>{gap > 0 ? `-${gap}` : "✓"}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-2">
                              {sc && <button onClick={() => { setScoreForm({ ...sc }); setEditScoreId(sc.id); setShowScoreForm(true); }} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-48 text-muted-foreground text-sm">Pilih karyawan untuk melihat radar chart kompetensi</div>
            )}
          </div>
        </div>
      )}

      {/* Definition Form */}
      {showDefForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editDefId ? "Edit" : "Tambah"} Definisi Kompetensi</h3><button onClick={() => { setShowDefForm(false); setDefForm(EMPTY_DEF); setEditDefId(null); }}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              {[{ label: "Jabatan *", field: "position" }, { label: "Nama Kompetensi *", field: "competencyName" }, { label: "Deskripsi", field: "description" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input value={defForm[field] ?? ""} onChange={e => setDefForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label><select value={defForm.division} onChange={e => setDefForm((f: any) => ({ ...f, division: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Target Skor (1-100)</label><input type="number" value={defForm.targetScore ?? 80} onChange={e => setDefForm((f: any) => ({ ...f, targetScore: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={1} max={100} /></div>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => saveDef.mutate(defForm)} disabled={!defForm.position || !defForm.competencyName || saveDef.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {saveDef.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={() => { setShowDefForm(false); setDefForm(EMPTY_DEF); setEditDefId(null); }} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Score Form */}
      {showScoreForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editScoreId ? "Edit" : "Input"} Assessment Kompetensi</h3><button onClick={() => { setShowScoreForm(false); setScoreForm(EMPTY_SCORE); setEditScoreId(null); }}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Karyawan *</label><select value={scoreForm.employeeId} onChange={e => setScoreForm((f: any) => ({ ...f, employeeId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value={0}>— Pilih karyawan —</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kompetensi *</label><select value={scoreForm.competencyDefinitionId} onChange={e => setScoreForm((f: any) => ({ ...f, competencyDefinitionId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value={0}>— Pilih kompetensi —</option>{defs.map((d: any) => <option key={d.id} value={d.id}>{d.competencyName} ({d.position})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Skor Aktual (1-100)</label><input type="number" value={scoreForm.actualScore} onChange={e => setScoreForm((f: any) => ({ ...f, actualScore: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} max={100} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal Assessment</label><input type="date" value={scoreForm.assessmentDate ?? ""} onChange={e => setScoreForm((f: any) => ({ ...f, assessmentDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Assessor</label><input value={scoreForm.assessor ?? ""} onChange={e => setScoreForm((f: any) => ({ ...f, assessor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={scoreForm.notes ?? ""} onChange={e => setScoreForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => saveScore.mutate(scoreForm)} disabled={!scoreForm.employeeId || !scoreForm.competencyDefinitionId || saveScore.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {saveScore.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={() => { setShowScoreForm(false); setScoreForm(EMPTY_SCORE); setEditScoreId(null); }} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
