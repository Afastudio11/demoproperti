import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Struktur", "Finishing", "Instalasi Listrik", "Instalasi Air", "Kusen & Pintu", "Lain-lain"];
const SEVERITIES = [{ key: "kritis", label: "Kritis" }, { key: "sedang", label: "Sedang" }, { key: "ringan", label: "Ringan" }];
const STATUSES = [{ key: "belum", label: "Belum" }, { key: "proses", label: "Proses" }, { key: "selesai", label: "Selesai" }];

const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

const SEVERITY_BADGE: Record<string, string> = { kritis: "bg-red-100 text-red-700", sedang: "bg-amber-100 text-amber-700", ringan: "bg-blue-100 text-blue-700" };
const STATUS_BADGE: Record<string, string> = { belum: "bg-zinc-100 text-zinc-600", proses: "bg-yellow-100 text-yellow-700", selesai: "bg-emerald-100 text-emerald-700" };

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl p-5 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function KomplainPage() {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [form, setForm] = useState({ projectId: "", unitBlock: "", complaint: "", category: "Finishing", severity: "ringan", pic: "", deadline: "", status: "belum", notes: "" });
  const qc = useQueryClient();

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterSeverity) params.set("severity", filterSeverity);

  const { data, isLoading } = useQuery({
    queryKey: ["complaints", filterStatus, filterSeverity],
    queryFn: () => fetch(`/api/administrasi/complaints?${params}`).then(r => r.json()),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => fetch("/api/administrasi/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, projectId: d.projectId ? parseInt(d.projectId) : null }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["complaints"] }); setShowForm(false); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/administrasi/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, completedDate: status === "selesai" ? new Date().toISOString().slice(0, 10) : null }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const complaints: any[] = data?.complaints ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Komplain & Purna Jual</h1>
          <p className="text-sm text-muted-foreground">Tracking komplain customer setelah serah terima</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Input Komplain
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Komplain Aktif", value: data?.total ?? 0, color: "text-foreground" },
          { label: "Kritis Belum Selesai", value: data?.totalKritis ?? 0, color: "text-red-600" },
          { label: "Melewati Deadline", value: data?.totalOverdue ?? 0, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-xl font-semibold", color)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <select className="text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="">Semua Urgensi</option>
          {SEVERITIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Blok", "Keluhan", "Kategori", "Urgensi", "PIC", "Deadline", "Status", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Tidak ada komplain.</td></tr>
              ) : complaints.map((c: any) => {
                const overdue = c.deadline && c.status !== "selesai" && new Date(c.deadline) < new Date();
                return (
                  <tr key={c.id} className={cn("border-b last:border-0 hover:bg-muted/20", overdue ? "bg-red-50/30" : "")}>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">{c.unitBlock ?? "-"}</td>
                    <td className="px-3 py-2.5 text-sm max-w-48">
                      <div className="truncate" title={c.complaint}>{c.complaint}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.category ?? "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", SEVERITY_BADGE[c.severity] ?? "bg-muted")}>{c.severity}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.pic ?? "-"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                        {c.deadline ? new Date(c.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                        {overdue && " (lewat)"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={c.status}
                        onChange={e => updateStatus.mutate({ id: c.id, status: e.target.value })}
                        className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none",
                          STATUS_BADGE[c.status] ?? "bg-muted")}
                      >
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.completedDate ? new Date(c.completedDate).toLocaleDateString("id-ID") : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <h3 className="font-semibold text-sm mb-4">Input Komplain Customer</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Proyek</label>
            <select className={selectCls} value={form.projectId} onChange={set("projectId")}>
              <option value="">-- Pilih Proyek --</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Blok / Unit</label><input className={inputCls} placeholder="B.19, C.27..." value={form.unitBlock} onChange={set("unitBlock")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Keluhan *</label><textarea className={inputCls} rows={3} value={form.complaint} onChange={set("complaint")} required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Kategori</label>
            <select className={selectCls} value={form.category} onChange={set("category")}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Urgensi</label>
            <select className={selectCls} value={form.severity} onChange={set("severity")}>
              {SEVERITIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">PIC Penanggungjawab</label><input className={inputCls} value={form.pic} onChange={set("pic")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Deadline Penyelesaian</label><input className={inputCls} type="date" value={form.deadline} onChange={set("deadline")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Catatan</label><textarea className={inputCls} rows={2} value={form.notes} onChange={set("notes")} /></div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={save.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">{save.isPending ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
