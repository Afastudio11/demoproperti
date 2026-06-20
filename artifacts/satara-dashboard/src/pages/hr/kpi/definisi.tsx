import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];

const SEED_KPI = [
  { position: "Sales Marketing", division: "Marketing", kpiName: "Lead per bulan", unit: "lead", monthlyTarget: 20, weight: 30, dataSource: "otomatis", sourceModule: "Marketing" },
  { position: "Sales Marketing", division: "Marketing", kpiName: "Survey Rate %", unit: "%", monthlyTarget: 40, weight: 25, dataSource: "otomatis", sourceModule: "Marketing" },
  { position: "Sales Marketing", division: "Marketing", kpiName: "Booking per bulan", unit: "unit", monthlyTarget: 3, weight: 30, dataSource: "otomatis", sourceModule: "Marketing" },
  { position: "Sales Marketing", division: "Marketing", kpiName: "Berkas per bulan", unit: "berkas", monthlyTarget: 3, weight: 15, dataSource: "otomatis", sourceModule: "Marketing" },
  { position: "Admin KPR", division: "Administrasi", kpiName: "SP3K per bulan", unit: "unit", monthlyTarget: 3, weight: 30, dataSource: "otomatis", sourceModule: "Administrasi KPR" },
  { position: "Admin KPR", division: "Administrasi", kpiName: "Akad per bulan", unit: "unit", monthlyTarget: 2, weight: 40, dataSource: "otomatis", sourceModule: "Administrasi KPR" },
  { position: "Admin KPR", division: "Administrasi", kpiName: "HT Cair per bulan (Rp)", unit: "Rp", monthlyTarget: 1000000000, weight: 30, dataSource: "otomatis", sourceModule: "Administrasi KPR" },
  { position: "Staff Legal", division: "Legal", kpiName: "Permit Readiness %", unit: "%", monthlyTarget: 80, weight: 40, dataSource: "otomatis", sourceModule: "Legal" },
  { position: "Staff Legal", division: "Legal", kpiName: "SHM Split Readiness %", unit: "%", monthlyTarget: 80, weight: 40, dataSource: "otomatis", sourceModule: "Legal" },
  { position: "Staff Legal", division: "Legal", kpiName: "Penyelesaian Legal Issue", unit: "kasus", monthlyTarget: 2, weight: 20, dataSource: "manual", sourceModule: "" },
  { position: "Site Manager", division: "Produksi", kpiName: "Progress Pembangunan %", unit: "%", monthlyTarget: 5, weight: 35, dataSource: "otomatis", sourceModule: "Produksi" },
  { position: "Site Manager", division: "Produksi", kpiName: "QC Score", unit: "skor", monthlyTarget: 85, weight: 35, dataSource: "manual", sourceModule: "" },
  { position: "Site Manager", division: "Produksi", kpiName: "Velocity (unit/bulan)", unit: "unit", monthlyTarget: 2, weight: 30, dataSource: "otomatis", sourceModule: "Produksi" },
];

const UNIT_OPTIONS = ["%", "unit", "Rp", "lead", "berkas", "skor", "kasus", "hari", "menit", "jam", "orang", "poin", "transaksi", "dokumen"];
const EMPTY = { position: "", division: DIVISIONS[0], kpiName: "", description: "", unit: "%", monthlyTarget: 0, weight: 0, dataSource: "manual", sourceModule: "" };

type FilterMode = "divisi" | "jabatan";

export default function KpiDefinisi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [filterMode, setFilterMode] = useState<FilterMode>("divisi");
  const [filterDivisi, setFilterDivisi] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");
  const [searchText, setSearchText] = useState("");

  const { data: defs = [], isLoading } = useQuery<any[]>({ queryKey: ["hr-kpi-defs"], queryFn: () => fetch("/api/hr/kpi/definitions").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => {
      const { id: _id, createdAt: _ca, ...cleanBody } = body;
      return editId
        ? fetch(`/api/hr/kpi/definitions/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanBody) }).then(apiJson)
        : fetch("/api/hr/kpi/definitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanBody) }).then(apiJson);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-kpi-defs"] }); resetForm(); },
  });

  const delByDivision = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await fetch(`/api/hr/kpi/definitions/${id}`, { method: "DELETE" }).then(apiJson);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-kpi-defs"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/kpi/definitions/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-kpi-defs"] }),
  });

  const seedAll = useMutation({
    mutationFn: async () => {
      for (const s of SEED_KPI) {
        await fetch("/api/hr/kpi/definitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-kpi-defs"] }),
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(d: any) { setForm({ ...d }); setEditId(d.id); setShowForm(true); }

  // Derived: unique jabatan list from all defs
  const allJabatan = Array.from(new Set(defs.map(d => d.position))).sort();

  // Filtering logic
  let filtered = defs;
  if (filterMode === "divisi" && filterDivisi) {
    filtered = filtered.filter(d => d.division === filterDivisi);
  }
  if (filterMode === "jabatan" && filterJabatan) {
    filtered = filtered.filter(d => d.position === filterJabatan);
  }
  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    filtered = filtered.filter(d =>
      d.kpiName.toLowerCase().includes(q) ||
      d.position.toLowerCase().includes(q) ||
      d.division.toLowerCase().includes(q)
    );
  }

  // Group by position key
  const byPosition: Record<string, any[]> = {};
  for (const d of filtered) {
    const key = `${d.division} — ${d.position}`;
    if (!byPosition[key]) byPosition[key] = [];
    byPosition[key].push(d);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">KPI — Definisi per Jabatan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tentukan KPI dan bobotnya per jabatan</p>
        </div>
        <div className="flex items-center gap-2">
          {defs.length === 0 && (
            <button onClick={() => seedAll.mutate()} disabled={seedAll.isPending} className="text-sm border px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-50">
              {seedAll.isPending ? "Mengisi..." : "Seed Data Awal"}
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Plus className="size-3.5" /> Tambah KPI
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mode tabs */}
        <div className="flex rounded-md border overflow-hidden">
          {([["divisi","Per Divisi"],["jabatan","Per Jabatan"]] as [FilterMode, string][]).map(([mode, label]) => (
            <button key={mode} onClick={() => { setFilterMode(mode); setFilterDivisi(""); setFilterJabatan(""); }}
              className={`text-xs px-3 py-1.5 font-medium ${filterMode === mode ? "bg-foreground text-background" : "hover:bg-muted/50"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Divisi dropdown */}
        {filterMode === "divisi" && (
          <select value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
            <option value="">Semua Divisi</option>
            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {/* Jabatan dropdown */}
        {filterMode === "jabatan" && (
          <select value={filterJabatan} onChange={e => setFilterJabatan(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
            <option value="">Semua Jabatan</option>
            {allJabatan.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        )}

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="size-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Cari nama KPI, jabatan..."
            className="border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-52"
          />
          {searchText && (
            <button onClick={() => setSearchText("")} className="absolute right-2 text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          )}
        </div>

        <span className="text-xs text-muted-foreground">{filtered.length} KPI</span>
      </div>

      {isLoading ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Memuat...</div> : (
        <div className="space-y-4">
          {Object.keys(byPosition).length === 0 && (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">
              {defs.length === 0 ? 'Belum ada definisi KPI. Klik "Seed Data Awal" atau tambah manual.' : "Tidak ada KPI yang cocok dengan filter."}
            </div>
          )}
          {Object.entries(byPosition).map(([key, items]) => {
            const totalWeight = items.reduce((s, d) => s + Number(d.weight), 0);
            return (
              <div key={key} className="bg-card border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <span className="font-medium text-sm">{key}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", Math.abs(totalWeight - 100) < 0.5 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      Bobot: {totalWeight}% {Math.abs(totalWeight - 100) >= 0.5 && "(harus 100%)"}
                    </span>
                    <button
                      onClick={() => { if (confirm(`Hapus semua ${items.length} KPI untuk ${key}?`)) delByDivision.mutate(items.map((i: any) => i.id)); }}
                      disabled={delByDivision.isPending}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2 font-medium">Nama KPI</th>
                        <th className="text-center px-3 py-2 font-medium">Target/Bulan</th>
                        <th className="text-center px-3 py-2 font-medium">Satuan</th>
                        <th className="text-center px-3 py-2 font-medium">Bobot</th>
                        <th className="text-center px-3 py-2 font-medium">Sumber</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(d => (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2">
                            <div className="font-medium">{d.kpiName}</div>
                            {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
                          </td>
                          <td className="text-center px-3 py-2">{Number(d.monthlyTarget).toLocaleString("id-ID")}</td>
                          <td className="text-center px-3 py-2 text-muted-foreground">{d.unit}</td>
                          <td className="text-center px-3 py-2 font-semibold">{d.weight}%</td>
                          <td className="text-center px-3 py-2">
                            <span className={cn("px-2 py-0.5 rounded-full text-[11px]", d.dataSource === "otomatis" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                              {d.dataSource === "otomatis" ? `Auto (${d.sourceModule})` : "Manual"}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEdit(d)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                              <button onClick={() => { if (confirm("Hapus KPI ini?")) del.mutate(d.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editId ? "Edit" : "Tambah"} Definisi KPI</h3>
              <button onClick={resetForm}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[{ label: "Jabatan *", field: "position" }, { label: "Nama KPI *", field: "kpiName" }, { label: "Deskripsi", field: "description" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input value={form[field] ?? ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan / Unit</label>
                <div className="flex gap-2">
                  <select value={UNIT_OPTIONS.includes(form.unit) ? form.unit : "__custom__"} onChange={e => { if (e.target.value !== "__custom__") setForm((f: any) => ({ ...f, unit: e.target.value })); }} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1">
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    {!UNIT_OPTIONS.includes(form.unit) && <option value="__custom__">{form.unit || "custom..."}</option>}
                  </select>
                  <input value={form.unit} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-28" placeholder="atau ketik..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Divisi</label><select value={form.division} onChange={e => setForm((f: any) => ({ ...f, division: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Sumber Data</label><select value={form.dataSource} onChange={e => setForm((f: any) => ({ ...f, dataSource: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="manual">Manual</option><option value="otomatis">Otomatis dari Sistem</option></select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Target per Bulan</label><input type="number" value={form.monthlyTarget ?? 0} onChange={e => setForm((f: any) => ({ ...f, monthlyTarget: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Bobot (%)</label><input type="number" value={form.weight ?? 0} onChange={e => setForm((f: any) => ({ ...f, weight: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} max={100} /></div>
              </div>
              {form.dataSource === "otomatis" && (
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Modul Sumber</label>
                  <select value={form.sourceModule ?? ""} onChange={e => setForm((f: any) => ({ ...f, sourceModule: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">— Pilih modul —</option>
                    {["Marketing", "Administrasi KPR", "Legal", "Produksi", "Finance"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.position || !form.kpiName || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
