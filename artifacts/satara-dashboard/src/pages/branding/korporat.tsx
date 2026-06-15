import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const BRANDS = ["Satara Group", "SN Residence", "Sekala Industry", "Loka Resort", "Proyek Baru"];
const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];

const emptyForm = { brandName: "Satara Group", periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, awarenessScore: "", consistencyScore: "", totalReach: "", notes: "" };

export default function BrandingKorporat() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["branding-corporate"],
    queryFn: () => fetch("/api/branding/corporate").then(r => r.json()),
  });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/corporate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-corporate"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/corporate/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-corporate"] }),
  });

  const latestByBrand: Record<string, any> = {};
  for (const r of data) {
    const existing = latestByBrand[r.brandName];
    if (!existing || r.periodYear > existing.periodYear || (r.periodYear === existing.periodYear && r.periodMonth > existing.periodMonth)) {
      latestByBrand[r.brandName] = r;
    }
  }

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Corporate Branding</h1>
          <p className="text-sm text-slate-500">Tracking kesehatan brand setiap entitas Satara Group</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">
          <Plus size={15} /> Input Data Brand
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BRANDS.map(brand => {
          const r = latestByBrand[brand];
          const awareness = r?.awarenessScore ?? null;
          const consistency = r?.consistencyScore ?? null;
          const lowConsistency = consistency !== null && consistency < 70;
          return (
            <div key={brand} className={cn("bg-white rounded-xl border p-5", lowConsistency ? "border-amber-300" : "border-slate-200")}>
              {lowConsistency && <div className="flex items-center gap-1 text-amber-600 text-xs mb-2 font-medium"><AlertTriangle size={12} /> Konsistensi rendah</div>}
              <div className="font-semibold text-slate-800 mb-3">{brand}</div>
              {r ? (
                <>
                  <div className="text-xs text-slate-500 mb-2">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Awareness Score</span>
                      <span className={cn("text-sm font-bold", awareness >= 80 ? "text-emerald-600" : awareness >= 60 ? "text-amber-500" : "text-red-500")}>{awareness ?? "-"}/100</span>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className={cn("h-1.5 rounded-full", awareness >= 80 ? "bg-emerald-500" : awareness >= 60 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${Math.min(100, awareness ?? 0)}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Consistency Score</span>
                      <span className={cn("text-sm font-bold", consistency >= 70 ? "text-emerald-600" : "text-amber-500")}>{consistency ?? "-"}/100</span>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className={cn("h-1.5 rounded-full", consistency >= 70 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${Math.min(100, consistency ?? 0)}%` }} />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Total Reach</span>
                      <span className="text-sm font-semibold text-slate-700">{(r.totalReach ?? 0).toLocaleString("id")}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 py-4 text-center">Belum ada data</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Riwayat Input Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Brand","Periode","Awareness","Consistency","Reach",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.brandName}</td>
                  <td className="px-4 py-3 text-slate-600">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</td>
                  <td className="px-4 py-3"><span className={cn("font-semibold", r.awarenessScore >= 80 ? "text-emerald-600" : r.awarenessScore >= 60 ? "text-amber-500" : "text-red-500")}>{r.awarenessScore ?? "-"}</span></td>
                  <td className="px-4 py-3"><span className={cn("font-semibold", r.consistencyScore >= 70 ? "text-emerald-600" : "text-amber-500")}>{r.consistencyScore ?? "-"}</span></td>
                  <td className="px-4 py-3 text-slate-600">{(r.totalReach ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data. Klik "Input Data Brand" untuk mulai.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-none p-6">
            <h2 className="font-bold text-slate-800 mb-4">Input Data Brand</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 block mb-1">Brand</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })}>
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Tahun</label>
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodYear} onChange={e => setForm({ ...form, periodYear: parseInt(e.target.value) })} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Bulan</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodMonth} onChange={e => setForm({ ...form, periodMonth: parseInt(e.target.value) })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select></div>
              </div>
              <div><label className="text-xs text-slate-500 block mb-1">Brand Awareness Score (1-100)</label>
                <input type="number" min="1" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.awarenessScore} onChange={e => setForm({ ...form, awarenessScore: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 block mb-1">Brand Consistency Score (1-100)</label>
                <input type="number" min="1" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.consistencyScore} onChange={e => setForm({ ...form, consistencyScore: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 block mb-1">Total Brand Reach</label>
                <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.totalReach} onChange={e => setForm({ ...form, totalReach: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 block mb-1">Catatan</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
