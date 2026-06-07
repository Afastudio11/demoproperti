import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { value: "sengketa_batas", label: "Sengketa Batas" },
  { value: "klaim_kepemilikan", label: "Klaim Kepemilikan" },
  { value: "masalah_shm", label: "Masalah SHM" },
  { value: "perizinan", label: "Perizinan" },
  { value: "lainnya", label: "Lainnya" },
];

const STATUS_OPTIONS = [
  { value: "aktif", label: "Aktif" },
  { value: "mediasi", label: "Mediasi" },
  { value: "sidang", label: "Sidang" },
  { value: "selesai", label: "Selesai" },
  { value: "ditutup", label: "Ditutup" },
];

const RISK_OPTIONS = [
  { value: "high", label: "Kritis (High)" },
  { value: "medium", label: "Sedang (Medium)" },
  { value: "low", label: "Ringan (Low)" },
];

const RISK_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_BADGE: Record<string, string> = {
  aktif: "bg-red-50 text-red-600",
  mediasi: "bg-yellow-50 text-yellow-700",
  sidang: "bg-orange-50 text-orange-700",
  selesai: "bg-emerald-50 text-emerald-700",
  ditutup: "bg-zinc-100 text-zinc-500",
};

const ROW_CLS: Record<string, string> = {
  high: "bg-red-50/30",
  medium: "bg-yellow-50/30",
  low: "",
};

const PIC_OPTIONS = ["UMMU", "DINDA", "NIA", "HIKMAH", "EKKY", "IRDA", "ANTI"];
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function LegalIssueTracker() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterRisk, setFilterRisk] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ projectId: "", title: "", objectDescription: "", category: "lainnya", riskLevel: "low", description: "", status: "aktif", pic: "", startDate: "", targetResolution: "" });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const { data: issues = [], isLoading } = useQuery<any[]>({
    queryKey: ["legal-issues"],
    queryFn: () => fetch("/api/legal/issues").then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch("/api/legal/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["legal-issues"] }); qc.invalidateQueries({ queryKey: ["legal-dashboard"] }); setShowForm(false); setForm({ projectId: "", title: "", objectDescription: "", category: "lainnya", riskLevel: "low", description: "", status: "aktif", pic: "", startDate: "", targetResolution: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/legal/issues/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["legal-issues"] }); qc.invalidateQueries({ queryKey: ["legal-dashboard"] }); },
  });

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const filtered = issues.filter((i: any) => {
    if (filterRisk && i.riskLevel !== filterRisk) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  });

  const high = issues.filter((i: any) => i.riskLevel === "high" && i.status !== "selesai" && i.status !== "ditutup").length;
  const medium = issues.filter((i: any) => i.riskLevel === "medium" && i.status !== "selesai" && i.status !== "ditutup").length;
  const riskScore = Math.max(0, 100 - (high * 15) - (medium * 5));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Legal Issue Tracker</h1>
          <p className="text-sm text-muted-foreground">Masalah hukum aktif lintas proyek</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Tambah Isu
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[
          { label: "Isu High Risk", value: high, color: "text-red-600" },
          { label: "Isu Medium Risk", value: medium, color: "text-yellow-600" },
          { label: "Total Aktif", value: issues.filter((i: any) => i.status !== "selesai" && i.status !== "ditutup").length, color: "text-foreground" },
          { label: "Legal Risk Score", value: riskScore, color: riskScore >= 80 ? "text-emerald-600" : riskScore >= 60 ? "text-yellow-600" : "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "high", "medium", "low"].map(r => (
          <button key={r} onClick={() => setFilterRisk(r)}
            className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
              filterRisk === r ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}>
            {r === "" ? "Semua Risiko" : r === "high" ? "Kritis" : r === "medium" ? "Sedang" : "Ringan"}
          </button>
        ))}
        <span className="text-muted-foreground">|</span>
        {["", "aktif", "mediasi", "sidang", "selesai", "ditutup"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
              filterStatus === s ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}>
            {s === "" ? "Semua Status" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Judul Isu", "Proyek", "Objek", "Kategori", "Risiko", "Status", "PIC", "Hari Berjalan", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">Tidak ada isu hukum.</td></tr>
              ) : filtered.map((i: any) => (
                <tr key={i.id} className={cn("border-b last:border-0 hover:bg-muted/20", ROW_CLS[i.riskLevel] ?? "")}>
                  <td className="px-3 py-2.5 font-semibold text-sm max-w-48">
                    <div className="flex items-center gap-1.5">
                      {i.riskLevel === "high" && <AlertTriangle className="size-3.5 text-red-500 shrink-0" />}
                      <span className="truncate">{i.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{i.projectName}</td>
                  <td className="px-3 py-2.5 text-xs">{i.objectDescription ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{CATEGORY_OPTIONS.find(c => c.value === i.category)?.label ?? i.category}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", RISK_BADGE[i.riskLevel] ?? "bg-muted")}>
                      {i.riskLevel === "high" ? "Kritis" : i.riskLevel === "medium" ? "Sedang" : "Ringan"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <select className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border focus:outline-none cursor-pointer", STATUS_BADGE[i.status] ?? "bg-muted")}
                      value={i.status} onChange={e => updateStatus.mutate({ id: i.id, status: e.target.value })}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{i.pic ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-xs font-semibold", i.daysRunning > 60 ? "text-red-600" : i.daysRunning > 30 ? "text-yellow-600" : "text-muted-foreground")}>
                      {i.daysRunning} hari
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{i.startDate ? new Date(i.startDate).toLocaleDateString("id-ID") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tambah Isu Hukum">
        <form onSubmit={e => { e.preventDefault(); create.mutate({ ...form, projectId: form.projectId ? parseInt(form.projectId) : null }); }} className="space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Judul Isu *</label><input className={inputCls} value={form.title} onChange={set("title")} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Proyek</label>
              <select className={selectCls} value={form.projectId} onChange={set("projectId")}>
                <option value="">Lintas Proyek</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Objek Sengketa</label><input className={inputCls} value={form.objectDescription} onChange={set("objectDescription")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Kategori</label>
              <select className={selectCls} value={form.category} onChange={set("category")}>
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Tingkat Risiko</label>
              <select className={selectCls} value={form.riskLevel} onChange={set("riskLevel")}>
                {RISK_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className={selectCls} value={form.status} onChange={set("status")}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">PIC Legal</label>
              <select className={selectCls} value={form.pic} onChange={set("pic")}><option value="">-</option>{PIC_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Tanggal Mulai</label><input className={inputCls} type="date" value={form.startDate} onChange={set("startDate")} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Target Resolusi</label><input className={inputCls} type="date" value={form.targetResolution} onChange={set("targetResolution")} /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Deskripsi</label><textarea className={inputCls} rows={3} value={form.description} onChange={set("description")} /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={create.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">{create.isPending ? "Menyimpan..." : "Simpan Isu"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
