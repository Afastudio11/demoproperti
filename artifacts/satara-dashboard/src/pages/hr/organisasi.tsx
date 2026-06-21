import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Edit2, Trash2, X, Save, ChevronDown, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategorySelect, useCategoryOptions } from "@/components/category-select";

const DEFAULT_DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];
const STATUSES = ["aktif", "probasi", "kontrak", "tetap", "resign", "nonaktif"];
const DEFAULT_LOCATIONS = ["Makassar (HQ)", "Barru", "Villa Sinoa", "Lapangan", "Remote"];

const DIVISION_TARGETS: Record<string, number> = {
  "CEO Office": 2, Planning: 3, Legal: 3, Marketing: 6, Administrasi: 4, Produksi: 6, Finance: 3, HR: 2,
};

function StatusBadge({ status }: { status: string }) {
  const color = status === "aktif" || status === "tetap" ? "bg-emerald-100 text-emerald-700" : status === "probasi" || status === "kontrak" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";
  return <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", color)}>{status}</span>;
}

type Employee = { id: number; employeeCode: string; name: string; division: string; position: string; directManagerId?: number; employmentStatus: string; joinDate?: string; location?: string; phone?: string; email?: string; notes?: string };

const EMPTY: Omit<Employee, "id" | "employeeCode"> = { name: "", division: DEFAULT_DIVISIONS[0], position: "", directManagerId: undefined, employmentStatus: "aktif", joinDate: "", location: "Makassar (HQ)", phone: "", email: "", notes: "" };

export default function Organisasi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/employees/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-employees"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/employees/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-employees"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); setDeleteConfirmId(null); },
  });

  const bulkDel = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) await fetch(`/api/hr/employees/${id}`, { method: "DELETE" }).then(apiJson);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      setSelectedIds(new Set());
    },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(e: Employee) { setForm({ ...e }); setEditId(e.id); setShowForm(true); setDeleteConfirmId(null); }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e.id)));
    }
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Hapus ${ids.length} karyawan sekaligus? Tindakan ini tidak bisa dibatalkan.`)) return;
    bulkDel.mutate(ids);
  }

  const { all: divisions } = useCategoryOptions("hr_divisi", DEFAULT_DIVISIONS);
  const { all: locations } = useCategoryOptions("hr_lokasi", DEFAULT_LOCATIONS);
  const active = employees.filter(e => ["aktif", "tetap", "kontrak", "probasi"].includes(e.employmentStatus));
  const byDivision = divisions.map(div => ({
    div,
    count: active.filter(e => e.division === div).length,
    target: DIVISION_TARGETS[div] ?? 0,
  }));

  const allSelected = employees.length > 0 && selectedIds.size === employees.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Organisasi & Headcount</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Struktur dan komposisi SDM Satara Development</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
          <Plus className="size-3.5" /> Tambah Karyawan
        </button>
      </div>

      {/* Headcount Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {byDivision.map(({ div, count, target }) => {
          const gap = count - target;
          return (
            <div key={div} className={cn("bg-card border rounded-xl p-3", gap < 0 ? "border-amber-300" : "")}>
              <div className="text-[10px] text-muted-foreground truncate">{div}</div>
              <div className="text-2xl font-bold mt-1">{count}</div>
              <div className="text-[10px] text-muted-foreground">target: {target}</div>
              <div className={cn("text-[11px] font-semibold mt-1", gap < 0 ? "text-red-500" : "text-emerald-600")}>{gap < 0 ? `${gap}` : gap > 0 ? `+${gap}` : "✓"}</div>
            </div>
          );
        })}
      </div>

      {/* Headcount Table */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Users className="size-4 text-muted-foreground" /> Headcount per Divisi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left pb-2 font-medium">Divisi</th>
                <th className="text-center pb-2 font-medium">Headcount</th>
                <th className="text-center pb-2 font-medium">Target</th>
                <th className="text-center pb-2 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody>
              {byDivision.map(({ div, count, target }) => {
                const gap = count - target;
                return (
                  <tr key={div} className="border-b last:border-0">
                    <td className="py-2">{div}</td>
                    <td className="text-center py-2 font-semibold">{count}</td>
                    <td className="text-center py-2 text-muted-foreground">{target}</td>
                    <td className={cn("text-center py-2 font-semibold", gap < 0 ? "text-red-500" : gap > 0 ? "text-emerald-600" : "text-muted-foreground")}>{gap === 0 ? "—" : gap > 0 ? `+${gap}` : gap}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold text-sm">
                <td className="py-2">Total</td>
                <td className="text-center py-2">{active.length}</td>
                <td className="text-center py-2 text-muted-foreground">{Object.values(DIVISION_TARGETS).reduce((a, b) => a + b, 0)}</td>
                <td className={cn("text-center py-2", active.length - Object.values(DIVISION_TARGETS).reduce((a, b) => a + b, 0) < 0 ? "text-red-500" : "text-emerald-600")}>
                  {active.length - Object.values(DIVISION_TARGETS).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-medium text-sm">Daftar Karyawan ({employees.length})</h3>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} dipilih</span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDel.isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-md"
              >
                <Trash2 className="size-3.5" />
                {bulkDel.isPending ? "Menghapus..." : `Hapus ${selectedIds.size} Karyawan`}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border hover:bg-muted"
              >
                Batal Pilih
              </button>
            </div>
          )}
        </div>

        {isLoading ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Memuat...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="text-left pb-2 font-medium">Kode</th>
                  <th className="text-left pb-2 font-medium">Nama</th>
                  <th className="text-left pb-2 font-medium">Jabatan</th>
                  <th className="text-left pb-2 font-medium">Divisi</th>
                  <th className="text-left pb-2 font-medium">Lokasi</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Bergabung</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} className={cn("border-b last:border-0 hover:bg-muted/30", selectedIds.has(e.id) && "bg-red-50/50")}>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(e.id)}
                        onChange={() => toggleSelect(e.id)}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{e.employeeCode}</td>
                    <td className="py-2 font-medium">{e.name}</td>
                    <td className="py-2 text-muted-foreground">{e.position}</td>
                    <td className="py-2 text-muted-foreground">{e.division}</td>
                    <td className="py-2 text-muted-foreground text-xs">{e.location}</td>
                    <td className="py-2"><StatusBadge status={e.employmentStatus} /></td>
                    <td className="py-2 text-xs text-muted-foreground">{e.joinDate}</td>
                    <td className="py-2">
                      {deleteConfirmId === e.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Yakin hapus?</span>
                          <button
                            onClick={() => del.mutate(e.id)}
                            disabled={del.isPending}
                            className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded disabled:opacity-50"
                          >
                            Ya
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] font-semibold text-muted-foreground border hover:bg-muted px-2 py-0.5 rounded"
                          >
                            Tidak
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(e)} className="p-1 hover:bg-muted rounded">
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(e.id)} className="p-1 hover:bg-muted rounded">
                            <Trash2 className="size-3.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Belum ada data karyawan. Tambahkan karyawan pertama.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editId ? "Edit" : "Tambah"} Karyawan</h3>
              <button onClick={resetForm}><X className="size-4" /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {[{ label: "Nama Lengkap *", field: "name" }, { label: "Jabatan *", field: "position" }, { label: "Nomor HP", field: "phone" }, { label: "Email", field: "email" }].map(({ label, field }) => (
                <div key={field} className={field === "name" || field === "position" ? "" : ""}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                  <input value={form[field] ?? ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal Bergabung</label>
                <input type="date" value={form.joinDate ?? ""} onChange={e => setForm((f: any) => ({ ...f, joinDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label>
                <CategorySelect type="hr_divisi" defaults={DEFAULT_DIVISIONS} value={form.division ?? ""} onChange={v => setForm((f: any) => ({ ...f, division: v }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status Karyawan</label>
                <select value={form.employmentStatus ?? "aktif"} onChange={e => setForm((f: any) => ({ ...f, employmentStatus: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lokasi Penugasan</label>
                <CategorySelect type="hr_lokasi" defaults={DEFAULT_LOCATIONS} value={form.location ?? ""} onChange={v => setForm((f: any) => ({ ...f, location: v }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Atasan Langsung</label>
                <select value={form.directManagerId ?? ""} onChange={e => setForm((f: any) => ({ ...f, directManagerId: e.target.value ? Number(e.target.value) : undefined }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Tidak ada —</option>
                  {employees.filter(e => e.id !== editId).map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                <textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.name || !form.position || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                <Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
