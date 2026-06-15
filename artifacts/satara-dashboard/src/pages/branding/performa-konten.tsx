import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Trophy, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = ["Instagram","Facebook","TikTok","YouTube","Website"];

const emptyForm = { contentId: "", platform: "Instagram", reach: "", impression: "", engagement: "", saves: "", shares: "", comments: "", notes: "" };

export default function BrandingPerformaKonten() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: content = [] } = useQuery<any[]>({ queryKey: ["branding-content"], queryFn: () => fetch("/api/branding/content?status=posted").then(r => r.json()) });
  const { data: perf = [] } = useQuery<any[]>({ queryKey: ["branding-content-perf"], queryFn: () => fetch("/api/branding/content-performance").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/content-performance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-content-perf"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/content-performance/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-content-perf"] }),
  });

  const contentMap = Object.fromEntries(content.map((c: any) => [c.id, c]));
  const allPosted = [...content];

  const avgReach = perf.length > 0 ? perf.reduce((s, r) => s + (r.reach ?? 0), 0) / perf.length : 0;

  function getLabel(r: any) {
    if (r.contentScore >= 85) return { label: "Top Content", color: "bg-emerald-100 text-emerald-700", icon: Trophy };
    if (avgReach > 0 && r.reach >= avgReach * 3) return { label: "Viral", color: "bg-purple-100 text-purple-700", icon: Zap };
    if (r.contentScore < 50) return { label: "Worst", color: "bg-red-100 text-red-700", icon: AlertTriangle };
    return { label: "Normal", color: "bg-slate-100 text-slate-600", icon: null };
  }

  const sorted = [...perf].sort((a, b) => (b.contentScore ?? 0) - (a.contentScore ?? 0));

  const catScores: Record<string, { total: number; count: number }> = {};
  for (const p of perf) {
    const c = contentMap[p.contentId];
    if (c?.category) {
      if (!catScores[c.category]) catScores[c.category] = { total: 0, count: 0 };
      catScores[c.category].total += p.contentScore ?? 0;
      catScores[c.category].count += 1;
    }
  }
  const catAvg = Object.entries(catScores).map(([cat, v]) => ({ cat, avg: Math.round(v.total / v.count) })).sort((a, b) => b.avg - a.avg);

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Content Performance</h1>
          <p className="text-sm text-slate-500">Performa setiap konten yang sudah diposting</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input Performa</button>
      </div>

      {catAvg.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-blue-800 mb-2">💡 Rekomendasi Fokus Konten</div>
          <div className="text-sm text-blue-700">
            Kategori dengan rata-rata score tertinggi: <strong>{catAvg[0]?.cat}</strong> ({catAvg[0]?.avg}/100).
            Prioritaskan lebih banyak konten kategori ini bulan depan.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Ranking Konten (diurutkan berdasarkan Content Score)</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Konten","Platform","Reach","Engagement","Eng. Rate","Save","Share","Score","Label",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {sorted.map((r, idx) => {
              const c = contentMap[r.contentId];
              const engRate = r.reach > 0 ? ((r.engagement / r.reach) * 100).toFixed(1) : "0,0";
              const lbl = getLabel(r);
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold w-5", idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : "text-slate-300")}>#{idx+1}</span>
                      <span className="font-medium text-slate-800 max-w-[160px] truncate">{c?.title ?? `Konten #${r.contentId}`}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.platform}</td>
                  <td className="px-4 py-3">{(r.reach ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3">{(r.engagement ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3 font-medium">{engRate}%</td>
                  <td className="px-4 py-3">{r.saves ?? 0}</td>
                  <td className="px-4 py-3">{r.shares ?? 0}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{r.contentScore ?? 0}</td>
                  <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs font-medium", lbl.color)}>{lbl.label}</span></td>
                  <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data performa konten.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-none p-6 my-4">
            <h2 className="font-bold text-slate-800 mb-4">Input Performa Konten</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 block mb-1">Konten (status Posted)</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.contentId} onChange={e => setForm({...form, contentId: e.target.value})}>
                  <option value="">-- Pilih Konten --</option>
                  {allPosted.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></div>
              <div><label className="text-xs text-slate-500 block mb-1">Platform</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select></div>
              {[["reach","Reach"],["impression","Impression"],["engagement","Engagement Total"],["saves","Save"],["shares","Share"],["comments","Komentar"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} /></div>
              ))}
              <div><label className="text-xs text-slate-500 block mb-1">Catatan</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={!form.contentId || saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan & Hitung Score</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
