import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_STATUS_OPTIONS = [
  { value: "belum_mulai", label: "Belum Mulai" },
  { value: "negosiasi", label: "Negosiasi" },
  { value: "ajb", label: "AJB" },
  { value: "balik_nama", label: "Balik Nama" },
  { value: "pemecahan_shm", label: "Pemecahan SHM" },
  { value: "pisah_pbb", label: "Pisah PBB" },
  { value: "siap_bangun", label: "Siap Bangun" },
  { value: "selesai", label: "Selesai" },
];

const STAGE_BADGE: Record<string, string> = {
  belum_mulai: "bg-zinc-100 text-zinc-500",
  negosiasi: "bg-blue-50 text-blue-700",
  ajb: "bg-yellow-50 text-yellow-700",
  balik_nama: "bg-yellow-100 text-yellow-800",
  pemecahan_shm: "bg-orange-50 text-orange-700",
  pisah_pbb: "bg-orange-100 text-orange-800",
  siap_bangun: "bg-emerald-50 text-emerald-700",
  selesai: "bg-emerald-100 text-emerald-800",
};

const CHECKLIST_STATUS_OPTIONS = [
  { value: "belum", label: "Belum", cls: "bg-zinc-100 text-zinc-600" },
  { value: "proses", label: "Proses", cls: "bg-blue-50 text-blue-700" },
  { value: "selesai", label: "Selesai", cls: "bg-emerald-50 text-emerald-700" },
];

const PIC_OPTIONS = ["UMMU", "DINDA", "NIA", "HIKMAH", "EKKY", "IRDA", "ANTI"];
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

export default function LandLegalTracker() {
  const qc = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showAddStage, setShowAddStage] = useState(false);
  const [addForm, setAddForm] = useState({ projectId: "", stageCode: "", stageIdentity: "", landArea: "", targetKavlings: "", certificateNumber: "", notes: "" });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const selectedProject = activeProjectId ?? (projects[0]?.id ?? null);

  const { data: stages = [], isLoading } = useQuery<any[]>({
    queryKey: ["land-stages", selectedProject],
    queryFn: () => fetch(`/api/legal/land-stages?projectId=${selectedProject}`).then(r => r.json()),
    enabled: !!selectedProject,
  });

  const updateChecklist = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      fetch(`/api/legal/land-checklist/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["land-stages", selectedProject] }); qc.invalidateQueries({ queryKey: ["legal-dashboard"] }); },
  });

  const updateStageStatus = useMutation({
    mutationFn: ({ id, stageStatus }: { id: number; stageStatus: string }) =>
      fetch(`/api/legal/land-stages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageStatus }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["land-stages", selectedProject] }),
  });

  const addStage = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/legal/land-stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["land-stages", selectedProject] }); setShowAddStage(false); setAddForm({ projectId: "", stageCode: "", stageIdentity: "", landArea: "", targetKavlings: "", certificateNumber: "", notes: "" }); },
  });

  function toggleExpand(id: number) { setExpanded(e => ({ ...e, [id]: !e[id] })); }

  const set = (f: string) => (e: React.ChangeEvent<any>) => setAddForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Land Legal Tracker</h1>
          <p className="text-sm text-muted-foreground">Progress legal setiap tahap lahan per proyek</p>
        </div>
        <button onClick={() => setShowAddStage(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Tambah Tahap
        </button>
      </div>

      {/* Tab proyek */}
      <div className="flex gap-1 flex-wrap">
        {projects.map((p: any) => (
          <button key={p.id} onClick={() => setActiveProjectId(p.id)}
            className={cn("text-xs px-3 py-1.5 rounded-md border transition-colors",
              selectedProject === p.id ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}>
            {p.nama}
          </button>
        ))}
      </div>

      {showAddStage && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Tambah Tahap Lahan Baru</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Proyek *</label>
              <select className={selectCls} value={addForm.projectId} onChange={set("projectId")} required>
                <option value="">-- Pilih --</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Kode Tahap *</label><input className={inputCls} placeholder="T1, T2, T3..." value={addForm.stageCode} onChange={set("stageCode")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Nama / Identitas</label><input className={inputCls} placeholder="Dg. Ari, H. Ani..." value={addForm.stageIdentity} onChange={set("stageIdentity")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Luas Lahan (m²)</label><input className={inputCls} type="number" value={addForm.landArea} onChange={set("landArea")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Jumlah Kavling Target</label><input className={inputCls} type="number" value={addForm.targetKavlings} onChange={set("targetKavlings")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">No. Sertifikat Induk</label><input className={inputCls} value={addForm.certificateNumber} onChange={set("certificateNumber")} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addStage.mutate({ ...addForm, projectId: parseInt(addForm.projectId), landArea: addForm.landArea || null, targetKavlings: addForm.targetKavlings || null })} disabled={!addForm.projectId || !addForm.stageCode || addStage.isPending} className="text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50">{addStage.isPending ? "Menyimpan..." : "Simpan"}</button>
            <button onClick={() => setShowAddStage(false)} className="text-xs border rounded-md px-3 py-1.5 hover:bg-muted">Batal</button>
          </div>
        </div>
      )}

      {isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Memuat data...</div> : stages.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground bg-card border rounded-xl">Belum ada data tahap lahan untuk proyek ini.</div>
      ) : stages.map((stage: any) => (
        <div key={stage.id} className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20" onClick={() => toggleExpand(stage.id)}>
            {expanded[stage.id] ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">{stage.stageCode}</span>
                {stage.stageIdentity && <span className="text-sm text-muted-foreground">— {stage.stageIdentity}</span>}
                {stage.landArea && <span className="text-xs text-muted-foreground">{Number(stage.landArea).toLocaleString("id-ID")} m²</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", stage.progress >= 80 ? "bg-emerald-500" : stage.progress >= 40 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${stage.progress}%` }} />
                </div>
                <span className="text-xs font-semibold">{stage.progress}%</span>
              </div>
              <select className="text-[10px] font-semibold px-2 py-0.5 rounded-md border focus:outline-none cursor-pointer" value={stage.stageStatus}
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); updateStageStatus.mutate({ id: stage.id, stageStatus: e.target.value }); }}>
                {STAGE_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {expanded[stage.id] && (
            <div className="border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Item Checklist", "Status", "Tgl Pengajuan", "Target", "Selesai", "PIC", "Catatan"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stage.checklist?.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-3 py-2 font-medium text-xs">{item.itemName}</td>
                      <td className="px-3 py-2">
                        <select className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border focus:outline-none cursor-pointer", CHECKLIST_STATUS_OPTIONS.find(s => s.value === item.status)?.cls ?? "bg-muted")}
                          value={item.status}
                          onChange={e => updateChecklist.mutate({ id: item.id, body: { status: e.target.value } })}>
                          {CHECKLIST_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="date" className="text-xs border rounded px-1.5 py-0.5 bg-background focus:outline-none" value={item.submissionDate ?? ""} onChange={e => updateChecklist.mutate({ id: item.id, body: { submissionDate: e.target.value } })} /></td>
                      <td className="px-3 py-2"><input type="date" className="text-xs border rounded px-1.5 py-0.5 bg-background focus:outline-none" value={item.targetDate ?? ""} onChange={e => updateChecklist.mutate({ id: item.id, body: { targetDate: e.target.value } })} /></td>
                      <td className="px-3 py-2"><input type="date" className="text-xs border rounded px-1.5 py-0.5 bg-background focus:outline-none" value={item.actualDate ?? ""} onChange={e => updateChecklist.mutate({ id: item.id, body: { actualDate: e.target.value } })} /></td>
                      <td className="px-3 py-2">
                        <select className="text-xs border rounded px-1.5 py-0.5 bg-background focus:outline-none" value={item.pic ?? ""} onChange={e => updateChecklist.mutate({ id: item.id, body: { pic: e.target.value } })}>
                          <option value="">-</option>{PIC_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input className="text-xs border rounded px-1.5 py-0.5 bg-background focus:outline-none w-full max-w-32" value={item.notes ?? ""} onChange={e => updateChecklist.mutate({ id: item.id, body: { notes: e.target.value } })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
