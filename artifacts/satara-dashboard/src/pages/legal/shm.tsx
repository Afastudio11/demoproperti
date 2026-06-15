import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";
const PIC_OPTIONS = ["UMMU", "DINDA", "NIA", "HIKMAH", "EKKY", "IRDA", "ANTI"];

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  const textColor = pct >= 80 ? "text-emerald-600" : pct >= 40 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs font-semibold", textColor)}>{pct}%</span>
    </div>
  );
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl p-5 w-full max-w-none shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Input / Update SHM Split</h3>
          <button onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ShmSplitTracker() {
  const qc = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form, setForm] = useState({ projectId: "", stageCode: "", targetSplit: "", realizedSplit: "", lastUpdated: "", pic: "", notes: "" });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const selectedProject = activeProjectId ?? (projects[0]?.id ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["shm-splits", selectedProject],
    queryFn: () => fetch(`/api/legal/shm-splits?projectId=${selectedProject}`).then(r => r.json()),
    enabled: !!selectedProject,
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch("/api/legal/shm-splits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shm-splits"] }); qc.invalidateQueries({ queryKey: ["legal-dashboard"] }); setShowForm(false); setForm({ projectId: "", stageCode: "", targetSplit: "", realizedSplit: "", lastUpdated: "", pic: "", notes: "" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      fetch(`/api/legal/shm-splits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shm-splits"] }); qc.invalidateQueries({ queryKey: ["legal-dashboard"] }); setEditRecord(null); },
  });

  const records: any[] = data?.records ?? [];
  const totals = data?.totals ?? { target: 0, realized: 0 };
  const totalProgress = totals.target > 0 ? Math.round((totals.realized / totals.target) * 100) : 0;
  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));

  function openEdit(r: any) {
    setEditRecord(r);
    setForm({ projectId: String(r.projectId), stageCode: r.stageCode, targetSplit: String(r.targetSplit), realizedSplit: String(r.realizedSplit), lastUpdated: r.lastUpdated ?? "", pic: r.pic ?? "", notes: r.notes ?? "" });
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SHM Split Tracker</h1>
          <p className="text-sm text-muted-foreground">Tracking pemecahan sertifikat per kavling. SHM belum pecah = unit tidak bisa diakadkan.</p>
        </div>
        <button onClick={() => { setEditRecord(null); setForm({ projectId: selectedProject ? String(selectedProject) : "", stageCode: "", targetSplit: "", realizedSplit: "", lastUpdated: "", pic: "", notes: "" }); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Input SHM
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Target Split", value: totals.target, color: "text-foreground" },
          { label: "Sudah Split", value: totals.realized, color: "text-emerald-600" },
          { label: "Sisa", value: totals.target - totals.realized, color: "text-red-600" },
          { label: "Overall Progress", value: `${totalProgress}%`, color: totalProgress >= 80 ? "text-emerald-600" : totalProgress >= 40 ? "text-yellow-600" : "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{value}</div>
          </div>
        ))}
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

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Tahap", "Target Split", "Realisasi Split", "Sisa", "Progress", "Tgl Update", "PIC", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Belum ada data SHM split.</td></tr>
              ) : records.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono font-semibold">{r.stageCode}</td>
                  <td className="px-3 py-2.5 text-center font-medium">{r.targetSplit}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-emerald-700">{r.realizedSplit}</td>
                  <td className="px-3 py-2.5 text-center text-red-600 font-semibold">{r.sisa}</td>
                  <td className="px-3 py-2.5"><ProgressBar pct={r.progress} /></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.pic ?? "-"}</td>
                  <td className="px-3 py-2.5"><button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">Update</button></td>
                </tr>
              ))}
              {records.length > 0 && (
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-3 py-2.5 text-xs">TOTAL</td>
                  <td className="px-3 py-2.5 text-center">{totals.target}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-700">{totals.realized}</td>
                  <td className="px-3 py-2.5 text-center text-red-600">{totals.target - totals.realized}</td>
                  <td className="px-3 py-2.5"><ProgressBar pct={totalProgress} /></td>
                  <td colSpan={3} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={e => {
          e.preventDefault();
          const body = { projectId: parseInt(form.projectId), stageCode: form.stageCode, targetSplit: parseInt(form.targetSplit), realizedSplit: parseInt(form.realizedSplit), lastUpdated: form.lastUpdated || null, pic: form.pic, notes: form.notes };
          if (editRecord) update.mutate({ id: editRecord.id, body: { targetSplit: body.targetSplit, realizedSplit: body.realizedSplit, lastUpdated: body.lastUpdated, pic: body.pic, notes: body.notes } });
          else create.mutate(body);
        }} className="space-y-3">
          {!editRecord && <>
            <div><label className="text-xs font-medium text-muted-foreground">Proyek *</label>
              <select className={selectCls} value={form.projectId} onChange={set("projectId")} required>
                <option value="">-- Pilih --</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Tahap *</label><input className={inputCls} placeholder="T1, T2, T3..." value={form.stageCode} onChange={set("stageCode")} required /></div>
          </>}
          {editRecord && <div className="bg-muted/30 rounded-md px-3 py-2 text-sm"><span className="text-muted-foreground">Tahap:</span> <strong>{editRecord.stageCode}</strong></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Target Split</label><input className={inputCls} type="number" min="0" value={form.targetSplit} onChange={set("targetSplit")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Realisasi Split</label><input className={inputCls} type="number" min="0" value={form.realizedSplit} onChange={set("realizedSplit")} /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Tanggal Update</label><input className={inputCls} type="date" value={form.lastUpdated} onChange={set("lastUpdated")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">PIC</label>
            <select className={selectCls} value={form.pic} onChange={set("pic")}><option value="">-</option>{PIC_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Catatan</label><textarea className={inputCls} rows={2} value={form.notes} onChange={set("notes")} /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">{(create.isPending || update.isPending) ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
