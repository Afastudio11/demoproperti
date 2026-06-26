import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Edit2, Trash2, X, Save, Building2 } from "lucide-react";
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

type Employee = {
  id: number; employeeCode: string; name: string; division: string; position: string;
  directManagerId?: number; employmentStatus: string; joinDate?: string;
  location?: string; project?: string; phone?: string; email?: string; notes?: string;
};

type Project = { id: number; nama: string };

const EMPTY: Omit<Employee, "id" | "employeeCode"> = {
  name: "", division: DEFAULT_DIVISIONS[0], position: "", directManagerId: undefined,
  employmentStatus: "aktif", joinDate: "", location: "Makassar (HQ)", project: "", phone: "", email: "", notes: "",
};

type ViewMode = "divisi" | "proyek";

export default function Organisasi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("divisi");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterDivision, setFilterDivision] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [officeForm, setOfficeForm] = useState({ nama: "", lokasi: "" });

  const saveOffice = useMutation({
    mutationFn: (body: any) => fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, totalUnit: 0, fase: "SCALE", status: "active" }),
    }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      resetOfficeForm();
    },
  });

  function resetOfficeForm() {
    setOfficeForm({ nama: "", lokasi: "" });
    setShowOfficeForm(false);
  }

  const deleteOffice = useMutation({
    mutationFn: (id: number) => fetch(`/api/projects/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
    },
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["hr-employees"],
    queryFn: () => fetch("/api/hr/employees").then(apiJson),
  });

  // Ambil daftar proyek dari sumber yang sama dengan absensi
  const { data: projectList = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects?all=true").then(apiJson),
  });

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
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleSelectAll() {
    if (selectedIds.size === filteredEmployees.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
  }
  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Hapus ${ids.length} karyawan sekaligus? Tindakan ini tidak bisa dibatalkan.`)) return;
    bulkDel.mutate(ids);
  }

  const { all: divisions } = useCategoryOptions("hr_divisi", DEFAULT_DIVISIONS);
  const { all: locations, custom: customLocations } = useCategoryOptions("hr_lokasi", DEFAULT_LOCATIONS);

  const active = employees.filter(e => ["aktif", "tetap", "kontrak", "probasi"].includes(e.employmentStatus));

  const byDivision = divisions.map(div => ({
    div,
    count: active.filter(e => e.division === div).length,
    target: DIVISION_TARGETS[div] ?? 0,
  }));

  const projectNames = projectList.map(p => p.nama);
  const byProject = projectList.map(p => ({
    id: p.id,
    nama: p.nama,
    count: active.filter(e => e.project === p.nama).length,
  }));
  const unassigned = active.filter(e => !e.project || !projectNames.includes(e.project)).length;

  const filteredEmployees = employees.filter(e => {
    if (filterProject === "__unassigned__") {
      if (e.project && projectNames.includes(e.project)) return false;
    } else if (filterProject && e.project !== filterProject) {
      return false;
    }
    if (filterDivision && e.division !== filterDivision) return false;
    if (filterLocation && e.location !== filterLocation) return false;
    if (filterStatus && e.employmentStatus !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (e.name ?? "").toLowerCase();
      const code = (e.employeeCode ?? "").toLowerCase();
      const pos = (e.position ?? "").toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !pos.includes(q)) return false;
    }
    return true;
  });

  const allSelected = filteredEmployees.length > 0 && selectedIds.size === filteredEmployees.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Organisasi & Headcount</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Struktur dan komposisi SDM Satara Development</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowOfficeForm(true)} className="flex items-center gap-2 border text-foreground text-sm font-medium px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
            <Plus className="size-3.5" /> Tambah Kantor/Proyek
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Plus className="size-3.5" /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode("divisi")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            viewMode === "divisi" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Users className="size-3.5" /> Per Divisi
        </button>
        <button
          onClick={() => setViewMode("proyek")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            viewMode === "proyek" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Building2 className="size-3.5" /> Per Kantor/Proyek
        </button>
      </div>

      {viewMode === "divisi" ? (
        <>
          {/* Headcount Cards per Divisi */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {byDivision.map(({ div, count, target }) => {
              const gap = count - target;
              return (
                <button
                  key={div}
                  onClick={() => setFilterDivision(filterDivision === div ? "" : div)}
                  className={cn(
                    "bg-card border rounded-xl p-3 text-left transition-all hover:border-primary/50",
                    gap < 0 ? "border-amber-300" : "",
                    filterDivision === div ? "ring-2 ring-primary border-primary" : ""
                  )}
                >
                  <div className="text-[10px] text-muted-foreground truncate">{div}</div>
                  <div className="text-2xl font-bold mt-1">{count}</div>
                  <div className="text-[10px] text-muted-foreground">target: {target}</div>
                  <div className={cn("text-[11px] font-semibold mt-1", gap < 0 ? "text-red-500" : "text-emerald-600")}>
                    {gap < 0 ? `${gap}` : gap > 0 ? `+${gap}` : "—"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Headcount Table per Divisi */}
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
                        <td className={cn("text-center py-2 font-semibold", gap < 0 ? "text-red-500" : gap > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {gap === 0 ? "—" : gap > 0 ? `+${gap}` : gap}
                        </td>
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
        </>
      ) : (
        <>
          {/* Headcount per Kantor/Proyek */}
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" /> Headcount per Kantor/Proyek
              </h3>
              <p className="text-xs text-muted-foreground">Proyek dikelola di menu Daftar Proyek</p>
            </div>

            {projectList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data proyek.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {byProject.map(({ id, nama, count }) => (
                  <div
                    key={nama}
                    onClick={() => setFilterProject(filterProject === nama ? "" : nama)}
                    className={cn(
                      "group relative border rounded-xl p-3 text-left transition-all hover:border-primary/50 cursor-pointer",
                      filterProject === nama ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs text-muted-foreground truncate flex-1">{nama}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus kantor/proyek "${nama}"? Tindakan ini akan mengarsipkan/menghapus proyek ini.`)) {
                            deleteOffice.mutate(id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5 rounded transition-opacity shrink-0"
                        title="Hapus Kantor/Proyek"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="text-3xl font-bold mt-1">{count}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">karyawan aktif</div>
                  </div>
                ))}
                {unassigned > 0 && (
                  <button
                    onClick={() => setFilterProject(filterProject === "__unassigned__" ? "" : "__unassigned__")}
                    className={cn(
                      "border rounded-xl p-3 text-left",
                      filterProject === "__unassigned__" ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50/50" : "bg-card border-dashed hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="text-xs text-muted-foreground">Belum ditugaskan</div>
                    <div className="text-3xl font-bold mt-1 text-amber-600">{unassigned}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">karyawan aktif</div>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Filter Info */}
      {(filterProject || filterDivision || filterLocation || filterStatus || searchQuery) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>Filter aktif:</span>
          {searchQuery && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Cari: "{searchQuery}"
              <button onClick={() => setSearchQuery("")}><X className="size-3" /></button>
            </span>
          )}
          {filterDivision && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Divisi: {filterDivision}
              <button onClick={() => setFilterDivision("")}><X className="size-3" /></button>
            </span>
          )}
          {filterProject && filterProject !== "__unassigned__" && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Kantor/Proyek: {filterProject}
              <button onClick={() => setFilterProject("")}><X className="size-3" /></button>
            </span>
          )}
          {filterProject === "__unassigned__" && (
            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Belum ditugaskan
              <button onClick={() => setFilterProject("")}><X className="size-3" /></button>
            </span>
          )}
          {filterLocation && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Lokasi: {filterLocation}
              <button onClick={() => setFilterLocation("")}><X className="size-3" /></button>
            </span>
          )}
          {filterStatus && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Status: {filterStatus}
              <button onClick={() => setFilterStatus("")}><X className="size-3" /></button>
            </span>
          )}
          <button onClick={() => { setFilterDivision(""); setFilterProject(""); setFilterLocation(""); setFilterStatus(""); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground underline ml-1">
            Reset semua filter
          </button>
        </div>
      )}

      {/* Employee Table */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-medium text-sm">
            Daftar Karyawan ({filteredEmployees.length}{filteredEmployees.length !== employees.length ? ` dari ${employees.length}` : ""})
          </h3>
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
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border hover:bg-muted">
                Batal Pilih
              </button>
            </div>
          )}
        </div>

        {/* Table Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <input
            type="text"
            placeholder="Cari nama, kode, jabatan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          />
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          >
            <option value="">— Semua Kantor/Proyek —</option>
            <option value="__unassigned__">Belum ditugaskan</option>
            {projectList.map(p => (
              <option key={p.id} value={p.nama}>{p.nama}</option>
            ))}
          </select>
          <select
            value={filterDivision}
            onChange={e => setFilterDivision(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          >
            <option value="">— Semua Divisi —</option>
            {divisions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          >
            <option value="">— Semua Lokasi —</option>
            {locations.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          >
            <option value="">— Semua Status —</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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
                  <th className="text-left pb-2 font-medium">Kantor/Proyek</th>
                  <th className="text-left pb-2 font-medium">Lokasi</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Bergabung</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(e => (
                  <tr key={e.id} className={cn("border-b last:border-0 hover:bg-muted/30", selectedIds.has(e.id) && "bg-red-50/50")}>
                    <td className="py-2">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded cursor-pointer" />
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{e.employeeCode}</td>
                    <td className="py-2 font-medium">{e.name}</td>
                    <td className="py-2 text-muted-foreground">{e.position}</td>
                    <td className="py-2 text-muted-foreground">{e.division}</td>
                    <td className="py-2">
                      {e.project ? (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">{e.project}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{e.location}</td>
                    <td className="py-2"><StatusBadge status={e.employmentStatus} /></td>
                    <td className="py-2 text-xs text-muted-foreground">{e.joinDate}</td>
                    <td className="py-2">
                      {deleteConfirmId === e.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Yakin hapus?</span>
                          <button onClick={() => del.mutate(e.id)} disabled={del.isPending} className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded disabled:opacity-50">Ya</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] font-semibold text-muted-foreground border hover:bg-muted px-2 py-0.5 rounded">Tidak</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(e)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                          <button onClick={() => setDeleteConfirmId(e.id)} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                      {employees.length === 0 ? "Belum ada data karyawan. Tambahkan karyawan pertama." : "Tidak ada karyawan yang sesuai filter."}
                    </td>
                  </tr>
                )}
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
                <div key={field}>
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kantor/Proyek</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={form.project ?? ""}
                    onChange={e => setForm((f: any) => ({ ...f, project: e.target.value }))}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                  >
                    <option value="">— Tidak ada —</option>
                    {projectList.map(p => (
                      <option key={p.id} value={p.nama}>{p.nama}</option>
                    ))}
                  </select>
                  {form.project && (() => {
                    const selectedProj = projectList.find(p => p.nama === form.project);
                    return (
                      <div className="flex items-center gap-1">
                        {selectedProj && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const newName = window.prompt("Ubah nama Kantor/Proyek:", selectedProj.nama);
                                if (newName && newName.trim()) {
                                  fetch(`/api/projects/${selectedProj.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ nama: newName.trim() }),
                                  })
                                    .then(apiJson)
                                    .then(() => {
                                      qc.invalidateQueries({ queryKey: ["projects"] });
                                      setForm((f: any) => ({ ...f, project: newName.trim() }));
                                    });
                                }
                              }}
                              title="Edit Kantor/Proyek"
                              className="p-1.5 rounded-md border hover:bg-muted text-muted-foreground bg-background animate-fade-in"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus/arsipkan Kantor/Proyek "${selectedProj.nama}"?`)) {
                                  fetch(`/api/projects/${selectedProj.id}`, { method: "DELETE" })
                                    .then(apiJson)
                                    .then(() => {
                                      qc.invalidateQueries({ queryKey: ["projects"] });
                                      setForm((f: any) => ({ ...f, project: "" }));
                                    });
                                }
                              }}
                              title="Hapus Kantor/Proyek"
                              className="p-1.5 rounded-md border hover:bg-red-50 hover:text-red-600 text-muted-foreground bg-background"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setForm((f: any) => ({ ...f, project: "" }))}
                          title="Hapus penugasan"
                          className="p-1.5 rounded-md border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors bg-background"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status Karyawan</label>
                <select value={form.employmentStatus ?? "aktif"} onChange={e => setForm((f: any) => ({ ...f, employmentStatus: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lokasi Penugasan</label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <CategorySelect type="hr_lokasi" defaults={DEFAULT_LOCATIONS} value={form.location ?? ""} onChange={v => setForm((f: any) => ({ ...f, location: v }))} />
                  </div>
                  {form.location && (() => {
                    const selectedCat = customLocations.find(c => c.label === form.location);
                    return (
                      <div className="flex items-center gap-1">
                        {selectedCat && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const newLabel = window.prompt("Ubah nama Lokasi Penugasan:", selectedCat.label);
                                if (newLabel && newLabel.trim()) {
                                  fetch(`/api/categories/${selectedCat.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ label: newLabel.trim() }),
                                  })
                                    .then(apiJson)
                                    .then(() => {
                                      qc.invalidateQueries({ queryKey: ["categories", "hr_lokasi"] });
                                      setForm((f: any) => ({ ...f, location: newLabel.trim() }));
                                    });
                                }
                              }}
                              title="Edit Lokasi"
                              className="p-1.5 rounded-md border hover:bg-muted text-muted-foreground bg-background"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus Lokasi "${selectedCat.label}"?`)) {
                                  fetch(`/api/categories/${selectedCat.id}`, { method: "DELETE" })
                                    .then(apiJson)
                                    .then(() => {
                                      qc.invalidateQueries({ queryKey: ["categories", "hr_lokasi"] });
                                      setForm((f: any) => ({ ...f, location: "" }));
                                    });
                                }
                              }}
                              title="Hapus Lokasi"
                              className="p-1.5 rounded-md border hover:bg-red-50 hover:text-red-600 text-muted-foreground bg-background"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setForm((f: any) => ({ ...f, location: "" }))}
                          title="Hapus lokasi"
                          className="p-1.5 rounded-md border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors bg-background"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
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
      {/* Office Form Modal */}
      {showOfficeForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Tambah Kantor/Proyek Baru</h3>
              <button onClick={resetOfficeForm}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Kantor/Proyek *</label>
                <input
                  value={officeForm.nama}
                  onChange={e => setOfficeForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                  placeholder="Contoh: Kantor Cabang Baru, SN RESIDENCE 2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lokasi / Alamat *</label>
                <input
                  value={officeForm.lokasi}
                  onChange={e => setOfficeForm(f => ({ ...f, lokasi: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                  placeholder="Contoh: Makassar, Gowa"
                />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t bg-muted/10">
              <button
                onClick={() => saveOffice.mutate(officeForm)}
                disabled={!officeForm.nama || !officeForm.lokasi || saveOffice.isPending}
                className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save className="size-3.5" /> {saveOffice.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={resetOfficeForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
