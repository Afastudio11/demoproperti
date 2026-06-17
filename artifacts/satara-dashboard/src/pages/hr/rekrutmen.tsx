import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategorySelect, useCategoryOptions } from "@/components/category-select";

const DEFAULT_DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];
const DEFAULT_LOCATIONS = ["Makassar (HQ)", "Barru", "Villa Sinoa", "Lapangan", "Remote"];
const STAGES = ["screening_cv", "interview_hrd", "interview_user", "offering", "hired", "ditolak"];
const STAGE_LABELS: Record<string, string> = { screening_cv: "Screening CV", interview_hrd: "Interview HRD", interview_user: "Interview User", offering: "Offering", hired: "Hired", ditolak: "Ditolak" };
const DEFAULT_SOURCES = ["Referral Internal", "Job Portal", "LinkedIn", "Walk In", "Headhunter"];

const EMPTY_NEED = { positionName: "", division: DEFAULT_DIVISIONS[0], location: DEFAULT_LOCATIONS[0], headcountNeeded: 1, headcountFilled: 0, targetHireDate: "", jobDescription: "", minimumQualification: "", picRecruiter: "", status: "dibuka" };
const EMPTY_CAND = { needId: 0, name: "", phone: "", source: DEFAULT_SOURCES[0], stage: "screening_cv", stageDate: "", recruiterNotes: "" };

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = { screening_cv: "bg-blue-100 text-blue-700", interview_hrd: "bg-purple-100 text-purple-700", interview_user: "bg-indigo-100 text-indigo-700", offering: "bg-amber-100 text-amber-700", hired: "bg-emerald-100 text-emerald-700", ditolak: "bg-red-100 text-red-700" };
  return <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", colors[stage] ?? "bg-gray-100 text-gray-600")}>{STAGE_LABELS[stage] ?? stage}</span>;
}

export default function Rekrutmen() {
  const qc = useQueryClient();
  const [showNeedForm, setShowNeedForm] = useState(false);
  const [showCandForm, setShowCandForm] = useState(false);
  const [needForm, setNeedForm] = useState<any>(EMPTY_NEED);
  const [candForm, setCandForm] = useState<any>(EMPTY_CAND);
  const [editNeedId, setEditNeedId] = useState<number | null>(null);
  const [editCandId, setEditCandId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data: needs = [] } = useQuery<any[]>({ queryKey: ["hr-recruitment-needs"], queryFn: () => fetch("/api/hr/recruitment/needs").then(apiJson) });

  const saveNeed = useMutation({
    mutationFn: (body: any) => editNeedId
      ? fetch(`/api/hr/recruitment/needs/${editNeedId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/recruitment/needs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-recruitment-needs"] }); setShowNeedForm(false); setNeedForm(EMPTY_NEED); setEditNeedId(null); },
  });

  const delNeed = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/recruitment/needs/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-recruitment-needs"] }),
  });

  const saveCand = useMutation({
    mutationFn: (body: any) => editCandId
      ? fetch(`/api/hr/recruitment/candidates/${editCandId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/recruitment/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-recruitment-needs"] }); setShowCandForm(false); setCandForm(EMPTY_CAND); setEditCandId(null); },
  });

  const delCand = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/recruitment/candidates/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-recruitment-needs"] }),
  });

  const totalOpen = needs.filter((n: any) => n.status === "dibuka").length;
  const totalCandidates = needs.reduce((s: number, n: any) => s + (n.candidates?.length ?? 0), 0);
  const totalHired = needs.reduce((s: number, n: any) => s + (n.candidates?.filter((c: any) => c.stage === "hired").length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Recruitment System</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tracking pipeline rekrutmen dari kebutuhan hingga hired</p>
        </div>
        <button onClick={() => setShowNeedForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
          <Plus className="size-3.5" /> Tambah Posisi
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Posisi Terbuka", val: totalOpen, color: "text-amber-600" },
          { label: "Total Kandidat", val: totalCandidates, color: "text-blue-600" },
          { label: "Hired Bulan Ini", val: totalHired, color: "text-emerald-600" },
          { label: "Kebutuhan Posisi", val: needs.length, color: "text-foreground" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <div className="space-y-3">
        {needs.length === 0 && <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">Belum ada kebutuhan posisi. Tambahkan posisi pertama.</div>}
        {needs.map((n: any) => {
          const isExpanded = expanded.has(n.id);
          const pipeline = STAGES.map(s => ({ stage: s, count: (n.candidates ?? []).filter((c: any) => c.stage === s).length }));
          return (
            <div key={n.id} className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20" onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(n.id) ? s.delete(n.id) : s.add(n.id); return s; })}>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                  <div>
                    <span className="font-medium text-sm">{n.positionName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{n.division} · {n.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{n.headcountFilled}/{n.headcountNeeded} terisi</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", n.status === "dibuka" ? "bg-emerald-100 text-emerald-700" : n.status === "on_hold" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>{n.status}</span>
                  <span className="text-xs text-muted-foreground">{(n.candidates ?? []).length} kandidat</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setNeedForm({ ...n }); setEditNeedId(n.id); setShowNeedForm(true); }} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm("Hapus posisi dan semua kandidatnya?")) delNeed.mutate(n.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t p-4 space-y-4">
                  {/* Funnel */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {pipeline.map(({ stage, count }, i) => (
                      <div key={stage} className="flex items-center gap-1">
                        <div className={cn("px-3 py-1.5 rounded-lg text-xs font-medium", count > 0 ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
                          {STAGE_LABELS[stage]}: {count}
                        </div>
                        {i < pipeline.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                      </div>
                    ))}
                  </div>
                  {/* Candidates */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">KANDIDAT</span>
                      <button onClick={() => { setCandForm({ ...EMPTY_CAND, needId: n.id }); setShowCandForm(true); }} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Plus className="size-3" /> Tambah Kandidat
                      </button>
                    </div>
                    <div className="space-y-1">
                      {(n.candidates ?? []).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between text-xs border rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">{c.phone}</span>
                            <span className="text-muted-foreground">{c.source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StageBadge stage={c.stage} />
                            <button onClick={() => { setCandForm({ ...c }); setEditCandId(c.id); setShowCandForm(true); }} className="p-0.5 hover:bg-muted rounded"><Edit2 className="size-3 text-muted-foreground" /></button>
                            <button onClick={() => { if (confirm("Hapus kandidat?")) delCand.mutate(c.id); }} className="p-0.5 hover:bg-muted rounded"><Trash2 className="size-3 text-red-400" /></button>
                          </div>
                        </div>
                      ))}
                      {(n.candidates ?? []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Belum ada kandidat</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Need Form Modal */}
      {showNeedForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editNeedId ? "Edit" : "Tambah"} Kebutuhan Posisi</h3>
              <button onClick={() => { setShowNeedForm(false); setNeedForm(EMPTY_NEED); setEditNeedId(null); }}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[{ label: "Nama Posisi *", field: "positionName" }, { label: "PIC Recruiter", field: "picRecruiter" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input value={needForm[field] ?? ""} onChange={e => setNeedForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label><CategorySelect type="hr_divisi" defaults={DEFAULT_DIVISIONS} value={needForm.division ?? ""} onChange={v => setNeedForm((f: any) => ({ ...f, division: v }))} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Lokasi</label><CategorySelect type="hr_lokasi" defaults={DEFAULT_LOCATIONS} value={needForm.location ?? ""} onChange={v => setNeedForm((f: any) => ({ ...f, location: v }))} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label><select value={needForm.status ?? ""} onChange={e => setNeedForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{["dibuka", "ditutup", "on_hold"].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah Kebutuhan</label><input type="number" value={needForm.headcountNeeded ?? 1} onChange={e => setNeedForm((f: any) => ({ ...f, headcountNeeded: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={1} /></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Target Hire</label><input type="date" value={needForm.targetHireDate ?? ""} onChange={e => setNeedForm((f: any) => ({ ...f, targetHireDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              {[{ label: "Deskripsi Pekerjaan", field: "jobDescription" }, { label: "Kualifikasi Minimum", field: "minimumQualification" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><textarea value={needForm[field] ?? ""} onChange={e => setNeedForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
              ))}
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => saveNeed.mutate(needForm)} disabled={!needForm.positionName || saveNeed.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {saveNeed.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={() => { setShowNeedForm(false); setNeedForm(EMPTY_NEED); setEditNeedId(null); }} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Form Modal */}
      {showCandForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editCandId ? "Edit" : "Tambah"} Kandidat</h3>
              <button onClick={() => { setShowCandForm(false); setCandForm(EMPTY_CAND); setEditCandId(null); }}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[{ label: "Nama Kandidat *", field: "name" }, { label: "Nomor HP", field: "phone" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input value={candForm[field] ?? ""} onChange={e => setCandForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Sumber</label><CategorySelect type="hr_sumber_rekrutmen" defaults={DEFAULT_SOURCES} value={candForm.source ?? ""} onChange={v => setCandForm((f: any) => ({ ...f, source: v }))} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tahap</label>
                  <select value={candForm.stage ?? ""} onChange={e => setCandForm((f: any) => ({ ...f, stage: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal Tahap</label><input type="date" value={candForm.stageDate ?? ""} onChange={e => setCandForm((f: any) => ({ ...f, stageDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Recruiter</label><textarea value={candForm.recruiterNotes ?? ""} onChange={e => setCandForm((f: any) => ({ ...f, recruiterNotes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => saveCand.mutate(candForm)} disabled={!candForm.name || saveCand.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {saveCand.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={() => { setShowCandForm(false); setCandForm(EMPTY_CAND); setEditCandId(null); }} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
