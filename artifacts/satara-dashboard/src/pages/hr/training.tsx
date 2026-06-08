import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CategorySelect } from "@/components/category-select";

const DEFAULT_TYPES = ["Training Internal", "Training Eksternal", "Coaching", "Sertifikasi", "Workshop"];
const STATUSES = ["direncanakan", "berlangsung", "selesai"];
const STATUS_COLORS: Record<string, string> = { direncanakan: "bg-blue-100 text-blue-700", berlangsung: "bg-amber-100 text-amber-700", selesai: "bg-emerald-100 text-emerald-700" };

function fmtRp(n: number) { if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`; return `Rp ${n.toLocaleString("id-ID")}`; }

const EMPTY = { name: "", type: DEFAULT_TYPES[0], competencyId: null, trainingDate: "", durationHours: 0, organizer: "", cost: 0, status: "direncanakan", evaluationScore: null, notes: "", participantIds: [] as number[] };

export default function Training() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(r => r.json()) });
  const { data: compDefs = [] } = useQuery<any[]>({ queryKey: ["hr-comp-defs"], queryFn: () => fetch("/api/hr/competency/definitions").then(r => r.json()) });
  const { data: programs = [] } = useQuery<any[]>({ queryKey: ["hr-training"], queryFn: () => fetch("/api/hr/training/programs").then(r => r.json()) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/training/programs/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/hr/training/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-training"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/training/programs/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-training"] }),
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(p: any) { setForm({ ...p, participantIds: p.participantIds ?? [], cost: Number(p.cost), durationHours: Number(p.durationHours), evaluationScore: p.evaluationScore ? Number(p.evaluationScore) : null }); setEditId(p.id); setShowForm(true); }

  const getEmpName = (id: number) => employees.find((e: any) => e.id === id)?.name ?? `#${id}`;
  const getCompName = (id: number) => compDefs.find((d: any) => d.id === id)?.competencyName ?? `#${id}`;

  const totalCost = programs.reduce((s: number, p: any) => s + Number(p.cost ?? 0), 0);
  const avgScore = programs.filter((p: any) => p.evaluationScore).length > 0
    ? programs.filter((p: any) => p.evaluationScore).reduce((s: number, p: any) => s + Number(p.evaluationScore), 0) / programs.filter((p: any) => p.evaluationScore).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Training & Development</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Program pelatihan, coaching, dan sertifikasi karyawan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Tambah Program
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Program", val: programs.length },
          { label: "Bulan Ini", val: programs.filter((p: any) => p.trainingDate?.startsWith(new Date().toISOString().slice(0, 7))).length },
          { label: "Avg Evaluasi", val: avgScore > 0 ? `${avgScore.toFixed(1)}/100` : "—" },
          { label: "Total Biaya", val: fmtRp(totalCost) },
        ].map(({ label, val }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-bold">{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Program</th>
                <th className="text-left px-3 py-3 font-medium">Jenis</th>
                <th className="text-left px-3 py-3 font-medium">Peserta</th>
                <th className="text-center px-3 py-3 font-medium">Tanggal</th>
                <th className="text-center px-3 py-3 font-medium">Durasi</th>
                <th className="text-center px-3 py-3 font-medium">Biaya</th>
                <th className="text-center px-3 py-3 font-medium">Status</th>
                <th className="text-center px-3 py-3 font-medium">Evaluasi</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {programs.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{p.name}</div>
                    {p.competencyId && <div className="text-xs text-muted-foreground">Kompetensi: {getCompName(p.competencyId)}</div>}
                    {p.organizer && <div className="text-xs text-muted-foreground">{p.organizer}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.type}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs space-y-0.5">{(p.participantIds ?? []).slice(0, 2).map((id: number) => <div key={id}>{getEmpName(id)}</div>)}{(p.participantIds ?? []).length > 2 && <div className="text-muted-foreground">+{(p.participantIds ?? []).length - 2} lainnya</div>}</div>
                    {(p.participantIds ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="text-center px-3 py-2.5 text-xs">{p.trainingDate ?? "—"}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{p.durationHours ? `${p.durationHours} jam` : "—"}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{Number(p.cost) > 0 ? fmtRp(Number(p.cost)) : "—"}</td>
                  <td className="text-center px-3 py-2.5"><span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", STATUS_COLORS[p.status] ?? "bg-gray-100")}>{p.status}</span></td>
                  <td className="text-center px-3 py-2.5 font-semibold">{p.evaluationScore ? `${Number(p.evaluationScore).toFixed(0)}/100` : "—"}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(p)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Hapus program?")) del.mutate(p.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {programs.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Belum ada program training.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editId ? "Edit" : "Tambah"} Program Training</h3>
              <button onClick={resetForm}><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[{ label: "Nama Program *", field: "name" }, { label: "Penyelenggara / Trainer", field: "organizer" }].map(({ label, field }) => (
                <div key={field}><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label><input value={form[field] ?? ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Jenis</label><CategorySelect type="hr_tipe_training" defaults={DEFAULT_TYPES} value={form.type ?? ""} onChange={v => setForm((f: any) => ({ ...f, type: v }))} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label><select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal Pelaksanaan</label><input type="date" value={form.trainingDate ?? ""} onChange={e => setForm((f: any) => ({ ...f, trainingDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Durasi (jam)</label><input type="number" value={form.durationHours ?? 0} onChange={e => setForm((f: any) => ({ ...f, durationHours: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Biaya (Rp)</label><CurrencyInput value={form.cost ?? 0} onChange={raw => setForm((f: any) => ({ ...f, cost: raw ? Number(raw) : 0 }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Skor Evaluasi (setelah selesai)</label><input type="number" value={form.evaluationScore ?? ""} onChange={e => setForm((f: any) => ({ ...f, evaluationScore: e.target.value ? Number(e.target.value) : null }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} max={100} placeholder="0-100" /></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kompetensi yang Disasar</label>
                <select value={form.competencyId ?? ""} onChange={e => setForm((f: any) => ({ ...f, competencyId: e.target.value ? Number(e.target.value) : null }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Pilih kompetensi —</option>
                  {compDefs.map((d: any) => <option key={d.id} value={d.id}>{d.competencyName} ({d.position})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Peserta (multi-pilih)</label>
                <div className="border rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                  {employees.map((e: any) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded">
                      <input type="checkbox" checked={(form.participantIds ?? []).includes(e.id)} onChange={ev => setForm((f: any) => ({ ...f, participantIds: ev.target.checked ? [...(f.participantIds ?? []), e.id] : (f.participantIds ?? []).filter((id: number) => id !== e.id) }))} className="rounded" />
                      {e.name} <span className="text-xs text-muted-foreground">({e.division})</span>
                    </label>
                  ))}
                  {employees.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Tambah karyawan di menu Organisasi dulu</p>}
                </div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.name || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
