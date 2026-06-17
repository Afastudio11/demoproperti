import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const emptyForm = { contentId: "", leadsFromContent: "", bookingsFromContent: "", akadFromContent: "", estimatedAkadValue: "", notes: "" };

export default function BrandingROI() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: content = [] } = useQuery<any[]>({ queryKey: ["branding-content"], queryFn: () => fetch("/api/branding/content").then(r => r.json()) });
  const { data: roiData = [] } = useQuery<any[]>({ queryKey: ["branding-roi"], queryFn: () => fetch("/api/branding/roi").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/roi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-roi"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/roi/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-roi"] }),
  });

  const totalLeads = roiData.reduce((s, r) => s + (r.leadsFromContent ?? 0), 0);
  const totalAkad = roiData.reduce((s, r) => s + (r.akadFromContent ?? 0), 0);
  const totalValue = roiData.reduce((s, r) => s + (r.estimatedAkadValue ?? 0), 0);
  const totalCost = roiData.reduce((s, r) => s + (r.productionCost ?? 0), 0);
  const organicContrib = 30;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Content ROI</h1>
          <p className="text-sm text-slate-500">Kontribusi konten branding terhadap lead, booking, dan akad</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input ROI Konten</button>
      </div>

      {organicContrib < 30 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-700 text-sm">
          <AlertTriangle size={16} /> Organic Lead Contribution {organicContrib}% di bawah target 30%. Tingkatkan frekuensi dan kualitas konten organik.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Lead dari Konten Organik", value: totalLeads.toLocaleString("id") },
          { label: "Organic Lead Contribution", value: `${organicContrib}%`, sub: "Target: ≥ 30%" },
          { label: "Total Akad dari Konten", value: totalAkad.toLocaleString("id") },
          { label: "Total Nilai dari Konten", value: `Rp ${totalValue.toLocaleString("id")}` },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xl font-bold text-slate-800">{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
            {m.sub && <div className="text-xs text-slate-400 mt-1">{m.sub}</div>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Content ROI per Konten</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Konten","Lead","Booking","Akad","Nilai Akad (Rp)","Biaya Produksi (Rp)","ROI",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {roiData.map(r => {
              const roi = r.productionCost > 0 ? Math.round(r.estimatedAkadValue / r.productionCost) : 0;
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{r.contentTitle}</td>
                  <td className="px-4 py-3">{r.leadsFromContent}</td>
                  <td className="px-4 py-3">{r.bookingsFromContent}</td>
                  <td className="px-4 py-3">{r.akadFromContent}</td>
                  <td className="px-4 py-3">Rp {(r.estimatedAkadValue ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3">Rp {(r.productionCost ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{roi > 0 ? `${roi}x` : "-"}</td>
                  <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {roiData.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data ROI konten</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <h2 className="font-bold text-slate-800 mb-4">Input ROI Konten</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 block mb-1">Konten</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.contentId} onChange={e => setForm({...form, contentId: e.target.value})}>
                  <option value="">-- Pilih Konten --</option>
                  {content.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></div>
              {[["leadsFromContent","Leads dari Konten Ini"],["bookingsFromContent","Booking dari Lead Tersebut"],["akadFromContent","Akad dari Lead Tersebut"],["estimatedAkadValue","Estimasi Nilai Akad (Rp)"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} /></div>
              ))}
              <div><label className="text-xs text-slate-500 block mb-1">Catatan</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={!form.contentId || saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
