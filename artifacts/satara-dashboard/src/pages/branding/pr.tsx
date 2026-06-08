import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PR_TYPES = ["Media Coverage","Komunitas","Pemerintah","Event","Sponsorship","CSR"];
const TYPE_COLORS: Record<string, string> = { "Media Coverage": "bg-blue-100 text-blue-700", "Komunitas": "bg-emerald-100 text-emerald-700", "Pemerintah": "bg-purple-100 text-purple-700", "Event": "bg-amber-100 text-amber-700", "Sponsorship": "bg-orange-100 text-orange-700", "CSR": "bg-pink-100 text-pink-700" };

const emptyForm = { title: "", type: "Media Coverage", partyName: "", activityDate: "", description: "", estimatedReach: "", cost: "", result: "", documentationUrl: "", prScore: "", notes: "" };

export default function BrandingPR() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data = [] } = useQuery<any[]>({ queryKey: ["branding-pr"], queryFn: () => fetch("/api/branding/pr").then(r => r.json()) });
  const { data: mediaData = [] } = useQuery<any[]>({ queryKey: ["branding-media"], queryFn: () => fetch("/api/branding/media-exposure").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/branding/pr/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
      : fetch("/api/branding/pr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-pr"] }); setShowForm(false); setEditId(null); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/pr/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-pr"] }),
  });

  const now = new Date();
  const thisMonth = data.filter(r => {
    if (!r.activityDate) return false;
    const d = new Date(r.activityDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalReach = thisMonth.reduce((s, r) => s + (r.estimatedReach ?? 0), 0);
  const avgScore = thisMonth.length > 0 ? (thisMonth.reduce((s, r) => s + (r.prScore ?? 0), 0) / thisMonth.length).toFixed(1) : "0";
  const totalCost = thisMonth.reduce((s, r) => s + (r.cost ?? 0), 0);

  function openEdit(r: any) { setEditId(r.id); setForm({ title: r.title, type: r.type, partyName: r.partyName ?? "", activityDate: r.activityDate ?? "", description: r.description ?? "", estimatedReach: r.estimatedReach ?? "", cost: r.cost ?? "", result: r.result ?? "", documentationUrl: r.documentationUrl ?? "", prScore: r.prScore ?? "", notes: r.notes ?? "" }); setShowForm(true); }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Public Relations</h1>
          <p className="text-sm text-slate-500">Tracking aktivitas PR: media, komunitas, pemerintah, dan event</p>
        </div>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Tambah Kegiatan PR</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Kegiatan Bulan Ini", value: thisMonth.length.toLocaleString("id") },
          { label: "Total Reach PR", value: totalReach.toLocaleString("id") },
          { label: "Rata-rata PR Score", value: `${avgScore}/10` },
          { label: "Total Biaya PR", value: `Rp ${totalCost.toLocaleString("id")}` },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-800">{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Semua Kegiatan PR</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Judul","Jenis","Pihak / Media","Tanggal","Reach","PR Score","Biaya",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(r)}>
                <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{r.title}</td>
                <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", TYPE_COLORS[r.type] ?? "bg-slate-100 text-slate-600")}>{r.type}</span></td>
                <td className="px-4 py-3 text-slate-600">{r.partyName}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.activityDate}</td>
                <td className="px-4 py-3">{(r.estimatedReach ?? 0).toLocaleString("id")}</td>
                <td className="px-4 py-3 font-semibold">{r.prScore ?? "-"}/10</td>
                <td className="px-4 py-3 text-slate-600">Rp {(r.cost ?? 0).toLocaleString("id")}</td>
                <td className="px-4 py-3" onClick={e => { e.stopPropagation(); deleteMut.mutate(r.id); }}><Trash2 size={14} className="text-red-400 hover:text-red-600" /></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data kegiatan PR</td></tr>}
          </tbody>
        </table>
      </div>

      {mediaData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Media Exposure (dari Founder & PR)</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Media","Jenis","Judul","Tanggal","Reach"].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {mediaData.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.mediaName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.type}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.publishDate}</td>
                  <td className="px-4 py-3">{(r.estimatedReach ?? 0).toLocaleString("id")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 my-4">
            <h2 className="font-bold text-slate-800 mb-4">{editId ? "Edit" : "Tambah"} Kegiatan PR</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 block mb-1">Judul Kegiatan</label><input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Jenis</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>{PR_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 block mb-1">Tanggal</label><input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.activityDate} onChange={e => setForm({...form, activityDate: e.target.value})} /></div>
              </div>
              <div><label className="text-xs text-slate-500 block mb-1">Nama Pihak / Media / Instansi</label><input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.partyName} onChange={e => setForm({...form, partyName: e.target.value})} /></div>
              <div><label className="text-xs text-slate-500 block mb-1">Deskripsi</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Estimasi Reach</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.estimatedReach} onChange={e => setForm({...form, estimatedReach: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Biaya (Rp)</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">PR Score (1-10)</label><input type="number" min="1" max="10" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.prScore} onChange={e => setForm({...form, prScore: e.target.value})} /></div>
              </div>
              <div><label className="text-xs text-slate-500 block mb-1">Output / Hasil</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.result} onChange={e => setForm({...form, result: e.target.value})} /></div>
              <div><label className="text-xs text-slate-500 block mb-1">Link / Dokumentasi</label><input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.documentationUrl} onChange={e => setForm({...form, documentationUrl: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={!form.title || saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
