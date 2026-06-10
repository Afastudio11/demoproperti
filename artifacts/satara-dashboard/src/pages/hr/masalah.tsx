import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, Pencil, Trash2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiJson } from "@/lib/api";

type Project = { id: number; nama: string };

type Issue = {
  id: number;
  project: string | null;
  tanggal: string | null;
  divisi: string | null;
  nama: string | null;
  masalah: string | null;
  solusi: string | null;
  deadline: string | null;
  keterangan: string | null;
  createdAt: string;
};

const emptyForm = { project: "", tanggal: "", divisi: "", nama: "", masalah: "", solusi: "", deadline: "", keterangan: "" };

export default function HRMasalah() {
  const qc = useQueryClient();
  const [project, setProject] = useState("Semua");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(apiJson),
  });
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees"],
    queryFn: () => fetch("/api/hr/employees").then(apiJson),
  });
  const projectOptions = ["Semua", ...projects.map(p => p.nama)];
  const findProject = (name: string) => projects.find(p => p.nama === name);
  const selectedProject = findProject(project);
  const params = new URLSearchParams(selectedProject ? { projectId: String(selectedProject.id) } : {});
  const { data = [], isLoading } = useQuery<Issue[]>({
    queryKey: ["hr-individual-issues", selectedProject?.id ?? "all"],
    queryFn: () => fetch(`/api/hr/individual-issues?${params}`).then(apiJson),
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => {
      const employee = employees.find((emp: any) => emp.name === body.nama);
      const payload = { ...body, projectId: findProject(body.project)?.id ?? null, divisi: body.divisi || employee?.division || "" };
      return editId
        ? fetch(`/api/hr/individual-issues/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(apiJson)
        : fetch("/api/hr/individual-issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(apiJson);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-individual-issues"] }); setShowForm(false); setEditId(null); setForm({ ...emptyForm }); setFormError(null); },
    onError: (e: any) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/individual-issues/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-individual-issues"] }),
  });

  const filtered = data.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.nama ?? "").toLowerCase().includes(q) || (d.divisi ?? "").toLowerCase().includes(q) || (d.masalah ?? "").toLowerCase().includes(q);
  });

  const openCount = data.filter(d => !d.keterangan || d.keterangan.toLowerCase() === "open" || d.keterangan === "").length;

  function openEdit(issue: Issue) {
    setEditId(issue.id);
    setForm({ project: issue.project ?? "", tanggal: issue.tanggal ?? "", divisi: issue.divisi ?? "", nama: issue.nama ?? "", masalah: issue.masalah ?? "", solusi: issue.solusi ?? "", deadline: issue.deadline ?? "", keterangan: issue.keterangan ?? "" });
    setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Masalah Individu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tracking masalah dan solusi karyawan per proyek</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm, project: project !== "Semua" ? project : (projects[0]?.nama ?? "") }); }}
          className="flex items-center gap-1.5 text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90">
          <Plus className="size-3.5" /> Tambah Masalah
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Masalah", val: data.length, color: "text-foreground" },
          { label: "Masih Open", val: openCount, color: openCount > 0 ? "text-red-600" : "text-emerald-600" },
          { label: projects[0]?.nama ?? "Proyek 1", val: projects[0] ? data.filter(d => d.project === projects[0].nama).length : 0, color: "text-blue-600" },
          { label: projects[1]?.nama ?? "Proyek 2", val: projects[1] ? data.filter(d => d.project === projects[1].nama).length : 0, color: "text-purple-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="border rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="size-4 text-muted-foreground" />
        <select value={project} onChange={e => setProject(e.target.value)} className="text-sm border rounded-md px-2 py-1.5 bg-background">
          {projectOptions.map(p => <option key={p}>{p}</option>)}
        </select>
        <input placeholder="Cari nama / divisi / masalah..." value={search} onChange={e => setSearch(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 bg-background flex-1 min-w-[200px]" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="border rounded-xl p-4 space-y-4 bg-muted/30">
          <h3 className="font-medium text-sm">{editId ? "Edit Masalah" : "Tambah Masalah Baru"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Project</label>
              <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                <option value="">Pilih proyek...</option>
                {projects.map(p => <option key={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Divisi</label>
              <input value={form.divisi} onChange={e => setForm(f => ({ ...f, divisi: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" placeholder="cth: Marketing, Produksi" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nama Karyawan</label>
              <select value={form.nama} onChange={e => {
                const employee = employees.find((emp: any) => emp.name === e.target.value);
                setForm(f => ({ ...f, nama: e.target.value, divisi: employee?.division ?? f.divisi }));
              }} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background">
                <option value="">Pilih karyawan...</option>
                {employees.map((emp: any) => <option key={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Masalah</label>
              <textarea value={form.masalah} onChange={e => setForm(f => ({ ...f, masalah: e.target.value }))} rows={2} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Solusi</label>
              <textarea value={form.solusi} onChange={e => setForm(f => ({ ...f, solusi: e.target.value }))} rows={2} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background resize-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Keterangan / Status</label>
              <input value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" placeholder="cth: Open, Selesai, On-Progress" />
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" /> {formError}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setFormError(null); saveMut.mutate(form); }} disabled={saveMut.isPending || !form.nama}
              className="text-sm bg-foreground text-background rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...emptyForm }); setFormError(null); }} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50">Batal</button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada masalah individu yang tercatat</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(issue => {
            const isResolved = issue.keterangan?.toLowerCase() === "selesai";
            const isOpen = !issue.keterangan || issue.keterangan === "" || issue.keterangan.toLowerCase() === "open";
            return (
              <div key={issue.id} className={cn("border rounded-xl p-4 space-y-3", isResolved ? "border-emerald-200 bg-emerald-50/30" : isOpen ? "border-red-200 bg-red-50/30" : "bg-card")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", issue.project === "SEKALA INDUSTRY" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                      {issue.project}
                    </span>
                    <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">{issue.divisi}</span>
                    {issue.tanggal && <span className="text-[10px] text-muted-foreground">{issue.tanggal}</span>}
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", isResolved ? "bg-emerald-100 text-emerald-700" : isOpen ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                      {issue.keterangan || "Open"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(issue)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
                    <button onClick={() => { if (confirm("Hapus masalah ini?")) deleteMut.mutate(issue.id); }} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold">{issue.nama}</span>
                  </div>
                  <p className="text-sm text-foreground">{issue.masalah}</p>
                </div>
                {issue.solusi && (
                  <div className="border-t pt-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Solusi</span>
                    <p className="text-sm mt-0.5 text-muted-foreground">{issue.solusi}</p>
                  </div>
                )}
                {issue.deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="size-3" />
                    Deadline: <span className="font-medium text-foreground">{issue.deadline}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
