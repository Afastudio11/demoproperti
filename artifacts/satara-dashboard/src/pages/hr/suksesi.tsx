import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const READINESS = ["siap", "6-12 bulan", "12-24 bulan", "belum siap"];
const READINESS_COLORS: Record<string, string> = { siap: "bg-emerald-100 text-emerald-700", "6-12 bulan": "bg-amber-100 text-amber-700", "12-24 bulan": "bg-orange-100 text-orange-700", "belum siap": "bg-red-100 text-red-700" };

const EMPTY = { criticalPosition: "", currentHolderId: null, backup1Id: null, backup1Readiness: "12-24 bulan", backup2Id: null, backup2Readiness: "12-24 bulan", notes: "" };

export default function Suksesi() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(r => r.json()) });
  const { data: plans = [] } = useQuery<any[]>({ queryKey: ["hr-succession"], queryFn: () => fetch("/api/hr/succession").then(r => r.json()) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/succession/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/hr/succession", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-succession"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/succession/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-succession"] }),
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(p: any) { setForm({ ...p }); setEditId(p.id); setShowForm(true); }
  function getEmpName(id: number | null) { if (!id) return "—"; return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }

  const readyCount = plans.filter(p => p.backup1Readiness === "siap" || p.backup2Readiness === "siap").length;
  const unprotected = plans.filter(p => !p.backup1Id && !p.backup2Id).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Succession Planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rencana penggantian posisi kritis untuk keberlangsungan organisasi</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Tambah Rencana</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Posisi Kritis", val: plans.length, color: "text-foreground" },
          { label: "Ada Backup Siap", val: readyCount, color: "text-emerald-600" },
          { label: "Tidak Ada Backup", val: unprotected, color: unprotected > 0 ? "text-red-500" : "text-emerald-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color)}>{val}</div>
          </div>
        ))}
      </div>

      {unprotected > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <Shield className="size-4 text-red-500 shrink-0" />
          <span>{unprotected} posisi kritis belum memiliki successor plan. Risiko operasional tinggi jika pemegang jabatan resign.</span>
        </div>
      )}

      <div className="space-y-3">
        {plans.length === 0 && <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">Belum ada rencana suksesi. Mulai dengan menambahkan posisi kritis.</div>}
        {plans.map((p: any) => (
          <div key={p.id} className={cn("bg-card border rounded-xl p-4", !p.backup1Id && !p.backup2Id ? "border-red-300" : "")}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">{p.criticalPosition}</div>
                <div className="text-xs text-muted-foreground">Pemegang: {getEmpName(p.currentHolderId)}</div>
              </div>
              <div className="flex items-center gap-2">
                {!p.backup1Id && !p.backup2Id && <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Tidak Ada Backup</span>}
                <button onClick={() => startEdit(p)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                <button onClick={() => { if (confirm("Hapus rencana suksesi ini?")) del.mutate(p.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[{ label: "Backup 1", id: p.backup1Id, readiness: p.backup1Readiness }, { label: "Backup 2", id: p.backup2Id, readiness: p.backup2Readiness }].map(({ label, id, readiness }) => (
                <div key={label} className={cn("border rounded-lg p-3", !id ? "border-dashed border-muted" : "")}>
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  {id ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{getEmpName(id)}</span>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", READINESS_COLORS[readiness] ?? "bg-gray-100 text-gray-600")}>{readiness}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Belum ditentukan</span>
                  )}
                </div>
              ))}
            </div>
            {p.notes && <div className="mt-2 text-xs text-muted-foreground">{p.notes}</div>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Tambah"} Rencana Suksesi</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Posisi Kritis *</label><input value={form.criticalPosition ?? ""} onChange={e => setForm((f: any) => ({ ...f, criticalPosition: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Contoh: Site Manager, Legal Officer" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Pemegang Jabatan Saat Ini</label><select value={form.currentHolderId ?? ""} onChange={e => setForm((f: any) => ({ ...f, currentHolderId: e.target.value ? Number(e.target.value) : null }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">— Pilih karyawan —</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Backup 1</label><select value={form.backup1Id ?? ""} onChange={e => setForm((f: any) => ({ ...f, backup1Id: e.target.value ? Number(e.target.value) : null }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">— Tidak ada —</option>{employees.filter((e: any) => e.id !== form.currentHolderId && e.id !== form.backup2Id).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kesiapan Backup 1</label><select value={form.backup1Readiness ?? "12-24 bulan"} onChange={e => setForm((f: any) => ({ ...f, backup1Readiness: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={!form.backup1Id}>{READINESS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Backup 2</label><select value={form.backup2Id ?? ""} onChange={e => setForm((f: any) => ({ ...f, backup2Id: e.target.value ? Number(e.target.value) : null }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">— Tidak ada —</option>{employees.filter((e: any) => e.id !== form.currentHolderId && e.id !== form.backup1Id).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kesiapan Backup 2</label><select value={form.backup2Readiness ?? "12-24 bulan"} onChange={e => setForm((f: any) => ({ ...f, backup2Readiness: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={!form.backup2Id}>{READINESS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.criticalPosition || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menyimpan..." : "Simpan"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
