import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, Upload, FileText, Download, ChevronDown, ChevronRight, FolderOpen, Folder, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiJson } from "@/lib/api";
import { NumericInput } from "@/components/ui/numeric-input";

const DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];
const CATEGORIES = ["Operasional", "Administrasi", "Keuangan", "SDM", "K3", "Teknis", "Legal", "Marketing", "IT", "Lainnya"];
const STATUSES = ["aktif", "draft", "deprecated"];

const EMPTY = { title: "", divisi: DIVISIONS[0], category: CATEGORIES[0], description: "", version: "1.0", status: "aktif" };

function fmtBytes(b: number) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "aktif" ? "bg-emerald-100 text-emerald-700" : status === "draft" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500";
  return <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", cls)}>{status}</span>;
}

export default function HRSop() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openDivs, setOpenDivs] = useState<Set<string>>(new Set(DIVISIONS));
  const [uploadingSopId, setUploadingSopId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletedDivs, setDeletedDivs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("hr_sop_deleted_divisions");
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const hideDivision = (div: string) => {
    setDeletedDivs(prev => {
      const next = new Set(prev);
      next.add(div);
      localStorage.setItem("hr_sop_deleted_divisions", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const showDivision = (div: string) => {
    setDeletedDivs(prev => {
      if (!prev.has(div)) return prev;
      const next = new Set(prev);
      next.delete(div);
      localStorage.setItem("hr_sop_deleted_divisions", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const { data: sops = [], isLoading } = useQuery<any[]>({
    queryKey: ["hr-sop"],
    queryFn: () => fetch("/api/hr/sop").then(apiJson),
  });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/sop/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/sop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-sop"] });
      if (form?.divisi) {
        showDivision(form.divisi);
      }
      resetForm();
    },
    onError: (e: any) => setFormError(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/sop/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-sop"] }),
  });

  const deleteDivision = useMutation({
    mutationFn: (division: string) => fetch(`/api/hr/sop/divisions/${encodeURIComponent(division)}`, { method: "DELETE" }).then(apiJson),
    onSuccess: (_, division) => {
      qc.invalidateQueries({ queryKey: ["hr-sop"] });
      hideDivision(division);
    },
    onError: (e: any) => {
      alert(`Gagal menghapus folder divisi: ${e.message}`);
    }
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); setFormError(null); }

  function startEdit(s: any) {
    setForm({ title: s.title, divisi: s.divisi, category: s.category, description: s.description ?? "", version: s.version, status: s.status });
    setEditId(s.id);
    setShowForm(true);
  }

  async function handleUpload(sopId: number, file: File) {
    setUploadingSopId(sopId);
    setUploadProgress("Mengunggah dan mengkompresi...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/hr/sop/${sopId}/upload`, { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Upload gagal"); }
      const data = await res.json();
      const ratio = data.compressionRatio ?? 0;
      setUploadProgress(`Berhasil! Kompresi ${ratio}% (${fmtBytes(data.originalSizeBytes ?? 0)} → ${fmtBytes(data.fileSizeBytes ?? 0)})`);
      qc.invalidateQueries({ queryKey: ["hr-sop"] });
      setTimeout(() => { setUploadingSopId(null); setUploadProgress(null); }, 3000);
    } catch (e: any) {
      setUploadProgress(`Error: ${e.message}`);
      setTimeout(() => { setUploadingSopId(null); setUploadProgress(null); }, 4000);
    }
  }

  function toggleDiv(div: string) {
    setOpenDivs(prev => { const s = new Set(prev); s.has(div) ? s.delete(div) : s.add(div); return s; });
  }

  // Group SOPs by division
  const byDiv: Record<string, any[]> = {};
  for (const s of sops) {
    if (!byDiv[s.divisi]) byDiv[s.divisi] = [];
    byDiv[s.divisi].push(s);
  }

  const allDivisions = Array.from(new Set([...DIVISIONS, ...Object.keys(byDiv)]))
    .filter(div => !deletedDivs.has(div) || (byDiv[div] && byDiv[div].length > 0));
  const totalSops = sops.length;
  const totalWithFile = sops.filter(s => s.filePath).length;
  const totalAktif = sops.filter(s => s.status === "aktif").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Arsip SOP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Standard Operating Procedure per divisi — PDF terkompresi otomatis
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}
          className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"
        >
          <Plus className="size-3.5" /> Tambah SOP
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total SOP", val: totalSops, color: "text-foreground" },
          { label: "File Terupload", val: totalWithFile, color: "text-blue-600" },
          { label: "Status Aktif", val: totalAktif, color: "text-emerald-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      {/* Upload progress toast */}
      {uploadProgress && (
        <div className={cn("flex items-center gap-2 text-sm px-4 py-3 rounded-xl border", uploadProgress.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
          <FileText className="size-4 shrink-0" />
          {uploadProgress}
        </div>
      )}

      {/* Folder Tree */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      ) : (
        <div className="space-y-2">
          {allDivisions.map(div => {
            const items = byDiv[div] ?? [];
            const isOpen = openDivs.has(div);
            const byCategory: Record<string, any[]> = {};
            for (const s of items) {
              if (!byCategory[s.category]) byCategory[s.category] = [];
              byCategory[s.category].push(s);
            }

            return (
              <div key={div} className="bg-card border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleDiv(div)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 text-left group"
                >
                  {isOpen ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                  {isOpen ? <FolderOpen className="size-4 text-amber-500 shrink-0" /> : <Folder className="size-4 text-amber-500 shrink-0" />}
                  <span className="font-medium text-sm">{div}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{items.length} SOP</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Apakah Anda yakin ingin menghapus seluruh folder SOP divisi "${div}" beserta semua dokumen di dalamnya?`)) {
                          deleteDivision.mutate(div);
                        }
                      }}
                      disabled={deleteDivision.isPending}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={`Hapus folder divisi ${div}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t">
                    {items.length === 0 ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground">
                        Belum ada SOP untuk divisi ini.
                      </div>
                    ) : (
                      Object.entries(byCategory).map(([cat, catItems]) => (
                        <div key={cat}>
                          <div className="px-6 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b">
                            {cat}
                          </div>
                          {catItems.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-3 px-6 py-3 border-b last:border-b-0 hover:bg-muted/10">
                              <FileText className={cn("size-4 shrink-0", s.filePath ? "text-red-500" : "text-muted-foreground/40")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{s.title}</span>
                                  <span className="text-[10px] text-muted-foreground">v{s.version}</span>
                                  <StatusBadge status={s.status} />
                                </div>
                                {s.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
                                )}
                                {s.filePath && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-muted-foreground">
                                      {s.originalFileName} · {fmtBytes(s.fileSizeBytes ?? 0)} (terkompresi)
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* View/Download PDF */}
                                {s.filePath ? (
                                  <a
                                    href={`/api/hr/sop/files/${s.filePath}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded hover:bg-muted text-blue-600"
                                    title="Buka PDF"
                                  >
                                    <Download className="size-3.5" />
                                  </a>
                                ) : null}

                                {/* Upload PDF */}
                                <label
                                  className={cn(
                                    "p-1.5 rounded hover:bg-muted cursor-pointer",
                                    uploadingSopId === s.id ? "opacity-50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"
                                  )}
                                  title={s.filePath ? "Ganti PDF" : "Upload PDF"}
                                >
                                  <Upload className="size-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    disabled={uploadingSopId !== null}
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUpload(s.id, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>

                                <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                                  <Edit2 className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Hapus SOP "${s.title}"?`)) del.mutate(s.id); }}
                                  className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}

                    {/* Quick add SOP to this division */}
                    <div className="px-6 py-2 border-t">
                      <button
                        onClick={() => { setForm({ ...EMPTY, divisi: div }); setEditId(null); setShowForm(true); }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="size-3" /> Tambah SOP ke {div}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editId ? "Edit" : "Tambah"} SOP</h3>
              <button onClick={resetForm}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Judul SOP *</label>
                <input
                  value={form.title}
                  onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="cth: Prosedur Onboarding Karyawan Baru"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label>
                  <select value={form.divisi} onChange={e => setForm((f: any) => ({ ...f, divisi: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
                  <select value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Versi</label>
                  <input
                    value={form.version}
                    onChange={e => setForm((f: any) => ({ ...f, version: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi / Ringkasan</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Deskripsi singkat tujuan SOP ini..."
                />
              </div>

              {!editId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                  Simpan terlebih dahulu, kemudian upload file PDF di daftar SOP.
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  <AlertCircle className="size-3.5 shrink-0" /> {formError}
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => save.mutate(form)}
                disabled={!form.title || save.isPending}
                className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file ref for programmatic upload */}
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" />
    </div>
  );
}
