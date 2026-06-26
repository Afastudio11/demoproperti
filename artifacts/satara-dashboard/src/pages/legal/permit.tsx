import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/contexts/confirmation-context";

const GROUPS: Record<string, string> = {
  perizinan_dasar: "Perizinan Dasar",
  perizinan_bangunan: "Perizinan Bangunan",
  izin_teknis: "Izin Teknis Khusus",
};

const STATUS_OPTIONS = [
  { value: "belum_diajukan", label: "Belum Diajukan" },
  { value: "dalam_proses", label: "Dalam Proses" },
  { value: "selesai", label: "Selesai" },
  { value: "tidak_diperlukan", label: "Tidak Diperlukan" },
];

const STATUS_BADGE: Record<string, string> = {
  belum_diajukan: "bg-zinc-100 text-zinc-600",
  dalam_proses: "bg-blue-50 text-blue-700",
  selesai: "bg-emerald-50 text-emerald-700",
  tidak_diperlukan: "bg-zinc-50 text-zinc-400",
};

const STATUS_LABEL: Record<string, string> = {
  belum_diajukan: "Belum Diajukan",
  dalam_proses: "Dalam Proses",
  selesai: "Selesai",
  tidak_diperlukan: "Tidak Diperlukan",
};

const PIC_OPTIONS = ["UMMU", "DINDA", "NIA", "HIKMAH", "EKKY", "IRDA", "ANTI"];
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function exportCsv(permits: any[], projectName: string) {
  const headers = ["Kelompok", "Nama Izin", "Instansi", "Status", "Tgl Pengajuan", "Target Selesai", "Tgl Aktual", "Nomor Dokumen", "PIC"];
  const rows = permits.map(p => [
    GROUPS[p.permitGroup] ?? p.permitGroup, p.permitName, p.institution ?? "", STATUS_LABEL[p.status] ?? p.status,
    fmtDate(p.submissionDate), fmtDate(p.targetDate), fmtDate(p.actualDate), p.documentNumber ?? "", p.pic ?? "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `permit-${projectName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PermitTracker() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const selectedProject = activeProjectId ?? (projects[0]?.id ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["permits", selectedProject],
    queryFn: () => fetch(`/api/legal/permits?projectId=${selectedProject}`).then(r => r.json()),
    enabled: !!selectedProject,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      fetch(`/api/legal/permits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permits", selectedProject] });
      qc.invalidateQueries({ queryKey: ["legal-dashboard"] });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/legal/permits/${id}`, { method: "DELETE" }).then(r => {
        if (!r.ok) throw new Error("Gagal menghapus permit");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permits", selectedProject] });
      qc.invalidateQueries({ queryKey: ["legal-dashboard"] });
      setEditId(null);
    },
  });

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Hapus Izin",
      description: `Apakah Anda yakin ingin menghapus izin "${name}"?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const seedDefaults = useMutation({
    mutationFn: () =>
      fetch("/api/legal/permits/seed-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject }),
      }).then(r => {
        if (!r.ok) throw new Error("Gagal inisialisasi permit");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permits", selectedProject] });
      qc.invalidateQueries({ queryKey: ["legal-dashboard"] });
    },
  });

  const permits: any[] = data?.permits ?? [];
  const readiness: number = data?.readiness ?? 0;
  const projectName = data?.project?.nama ?? projects.find((p: any) => p.id === selectedProject)?.nama ?? "";

  const byGroup = Object.entries(GROUPS).map(([key, label]) => ({
    key, label, items: permits.filter(p => p.permitGroup === key),
  }));

  function openEdit(p: any) {
    setEditId(p.id);
    setEditForm({ status: p.status, submissionDate: p.submissionDate ?? "", targetDate: p.targetDate ?? "", actualDate: p.actualDate ?? "", documentNumber: p.documentNumber ?? "", pic: p.pic ?? "", institution: p.institution ?? "", notes: p.notes ?? "" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Permit Tracker</h1>
          <p className="text-sm text-muted-foreground">Tracking kelengkapan dokumen perizinan per proyek</p>
        </div>
        <button onClick={() => exportCsv(permits, projectName)} className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted">
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      {/* Tab proyek */}
      <div className="flex gap-1 flex-wrap">
        {projects.map((p: any) => (
          <button key={p.id} onClick={() => { setActiveProjectId(p.id); setEditId(null); }}
            className={cn("text-xs px-3 py-1.5 rounded-md border transition-colors",
              selectedProject === p.id ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}>
            {p.nama}
          </button>
        ))}
      </div>

      {/* Permit Readiness bar */}
      {selectedProject && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{projectName}</span>
            <span className={cn("text-sm font-bold", readiness >= 80 ? "text-emerald-600" : readiness >= 60 ? "text-yellow-600" : "text-red-600")}>{readiness}%</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", readiness >= 80 ? "bg-emerald-500" : readiness >= 60 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${readiness}%` }} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">Permit Readiness: {permits.filter(p => p.status === "selesai").length} dari {permits.filter(p => p.status !== "tidak_diperlukan").length} izin selesai</div>
        </div>
      )}

      {isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Memuat data izin...</div> : permits.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Belum ada daftar permit untuk proyek ini.</p>
          <button
            onClick={() => seedDefaults.mutate()}
            disabled={!selectedProject || seedDefaults.isPending}
            className="inline-flex items-center gap-1.5 text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" /> {seedDefaults.isPending ? "Menyiapkan..." : "Inisialisasi Permit Default"}
          </button>
        </div>
      ) : (
        byGroup.map(({ key, label, items }) => items.length === 0 ? null : (
          <div key={key} className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="divide-y">
              {items.map(p => (
                <div key={p.id}>
                  {editId === p.id ? (
                    <div className="p-4 space-y-3 bg-muted/20">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                          <select className={selectCls} value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        <div><label className="text-xs font-medium text-muted-foreground">Tgl Pengajuan</label><input className={inputCls} type="date" value={editForm.submissionDate} onChange={e => setEditForm((f: any) => ({ ...f, submissionDate: e.target.value }))} /></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Target Selesai</label><input className={inputCls} type="date" value={editForm.targetDate} onChange={e => setEditForm((f: any) => ({ ...f, targetDate: e.target.value }))} /></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Tgl Aktual Selesai</label><input className={inputCls} type="date" value={editForm.actualDate} onChange={e => setEditForm((f: any) => ({ ...f, actualDate: e.target.value }))} /></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Nomor Dokumen</label><input className={inputCls} value={editForm.documentNumber} onChange={e => setEditForm((f: any) => ({ ...f, documentNumber: e.target.value }))} /></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Instansi</label><input className={inputCls} value={editForm.institution} onChange={e => setEditForm((f: any) => ({ ...f, institution: e.target.value }))} /></div>
                        <div><label className="text-xs font-medium text-muted-foreground">PIC</label>
                          <select className={selectCls} value={editForm.pic} onChange={e => setEditForm((f: any) => ({ ...f, pic: e.target.value }))}>
                            <option value="">-- Pilih --</option>
                            {PIC_OPTIONS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-1"><label className="text-xs font-medium text-muted-foreground">Catatan</label><input className={inputCls} value={editForm.notes} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => update.mutate({ id: p.id, body: editForm })} disabled={update.isPending} className="text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50">{update.isPending ? "Menyimpan..." : "Simpan"}</button>
                        <button onClick={() => setEditId(null)} className="text-xs border rounded-md px-3 py-1.5 hover:bg-muted">Batal</button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.permitName)}
                          className="text-xs border border-red-200 text-red-600 rounded-md px-3 py-1.5 hover:bg-red-50/50 cursor-pointer ml-auto"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => openEdit(p)}>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md min-w-20 text-center", STATUS_BADGE[p.status] ?? "bg-muted")}>{STATUS_LABEL[p.status] ?? p.status}</span>
                      <span className="text-sm font-medium flex-1">{p.permitName}</span>
                      <span className="text-xs text-muted-foreground hidden sm:block">{p.institution ?? "-"}</span>
                      <span className="text-xs text-muted-foreground">{p.documentNumber ? `No. ${p.documentNumber}` : ""}</span>
                      <span className="text-xs text-muted-foreground">{p.pic ?? "-"}</span>
                      {p.targetDate && <span className="text-xs text-muted-foreground">Target: {fmtDate(p.targetDate)}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
