import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = ["Instagram","Facebook","TikTok","Google Review","WhatsApp","Lainnya"];
const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];

const emptyForm = { periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, platform: "Instagram", totalAnalyzed: "", positiveCount: "", neutralCount: "", negativeCount: "", positiveThemes: "", negativeThemes: "", notes: "" };

function DonutChart({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative;
  if (total === 0) return <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">Belum ada data</div>;
  const pPct = (positive / total) * 100;
  const nPct = (neutral / total) * 100;
  const negPct = (negative / total) * 100;
  const pDeg = (pPct / 100) * 360;
  const nDeg = (nPct / 100) * 360;
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.8" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.8"
            strokeDasharray={`${pPct} ${100 - pPct}`} strokeDashoffset="0" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#94a3b8" strokeWidth="3.8"
            strokeDasharray={`${nPct} ${100 - nPct}`} strokeDashoffset={`${-pPct}`} />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3.8"
            strokeDasharray={`${negPct} ${100 - negPct}`} strokeDashoffset={`${-(pPct + nPct)}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-emerald-600">{Math.round(pPct)}%</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-slate-600">Positif <strong>{Math.round(pPct)}%</strong></span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400" /><span className="text-slate-600">Netral <strong>{Math.round(nPct)}%</strong></span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-slate-600">Negatif <strong>{Math.round(negPct)}%</strong></span></div>
      </div>
    </div>
  );
}

export default function BrandingSentimen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const { data = [] } = useQuery<any[]>({ queryKey: ["branding-sentiment"], queryFn: () => fetch("/api/branding/sentiment").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/sentiment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-sentiment"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/sentiment/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-sentiment"] }),
  });

  const currentData = data.filter(r => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const totalAnalyzed = currentData.reduce((s, r) => s + (r.totalAnalyzed ?? 0), 0);
  const totalPositive = currentData.reduce((s, r) => s + (r.positiveCount ?? 0), 0);
  const totalNeutral = currentData.reduce((s, r) => s + (r.neutralCount ?? 0), 0);
  const totalNegative = currentData.reduce((s, r) => s + (r.negativeCount ?? 0), 0);
  const sentimentScore = totalAnalyzed > 0 ? Math.round((totalPositive / totalAnalyzed) * 100) : 0;
  const negPct = totalAnalyzed > 0 ? (totalNegative / totalAnalyzed) * 100 : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Brand Sentiment Analysis</h1>
          <p className="text-sm text-slate-500">Mengukur sentimen pasar terhadap brand Satara dari komentar publik</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input Data Sentimen</button>
      </div>

      {negPct > 20 && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-start gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Sentimen negatif mencapai {negPct.toFixed(1)}% — evaluasi tema negatif dan buat respons konten yang menangani isu tersebut.</span>
        </div>
      )}
      {negPct > 10 && negPct <= 20 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-700 text-sm">
          <AlertTriangle size={16} /> Sentimen negatif {negPct.toFixed(1)}% — perlu diperhatikan.
        </div>
      )}

      <div className="flex items-center gap-3">
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
          {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Distribusi Sentimen — {MONTHS[filterMonth-1]} {filterYear}</h2>
          <DonutChart positive={totalPositive} neutral={totalNeutral} negative={totalNegative} />
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div><div className="text-2xl font-bold text-emerald-600">{sentimentScore}%</div><div className="text-xs text-slate-500">Sentiment Score</div><div className="text-xs text-slate-400">Target: ≥ 80%</div></div>
            <div><div className="text-2xl font-bold text-slate-800">{totalAnalyzed.toLocaleString("id")}</div><div className="text-xs text-slate-500">Total Dianalisis</div></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Tema per Platform</h2>
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {currentData.map(r => (
              <div key={r.id} className="border border-slate-100 rounded-lg p-3">
                <div className="font-medium text-slate-700 text-sm mb-2">{r.platform}</div>
                {r.positiveThemes && <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mb-1"><strong>Positif:</strong> {r.positiveThemes}</div>}
                {r.negativeThemes && <div className="text-xs text-red-700 bg-red-50 rounded px-2 py-1"><strong>Negatif:</strong> {r.negativeThemes}</div>}
              </div>
            ))}
            {currentData.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Belum ada data bulan ini</div>}
          </div>
          <p className="text-xs text-slate-400 italic mt-4">* Input manual. Integrasi API platform akan tersedia di versi berikutnya.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Riwayat Input Sentimen</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Periode","Platform","Total","Positif","Netral","Negatif","Sentiment Score",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {data.map(r => {
              const score = r.totalAnalyzed > 0 ? Math.round((r.positiveCount / r.totalAnalyzed) * 100) : 0;
              const neg = r.totalAnalyzed > 0 ? Math.round((r.negativeCount / r.totalAnalyzed) * 100) : 0;
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</td>
                  <td className="px-4 py-3 font-medium">{r.platform}</td>
                  <td className="px-4 py-3">{(r.totalAnalyzed ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{r.positiveCount}</td>
                  <td className="px-4 py-3 text-slate-500">{r.neutralCount}</td>
                  <td className="px-4 py-3 text-red-500">{r.negativeCount}</td>
                  <td className="px-4 py-3"><span className={cn("font-bold", score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500")}>{score}%</span></td>
                  <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {data.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 my-4">
            <h2 className="font-bold text-slate-800 mb-4">Input Data Sentimen</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Tahun</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodYear} onChange={e => setForm({...form, periodYear: parseInt(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Bulan</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodMonth} onChange={e => setForm({...form, periodMonth: parseInt(e.target.value)})}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 block mb-1">Platform</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></div>
              </div>
              {[["totalAnalyzed","Total Komentar / Ulasan Dianalisis"],["positiveCount","Komentar Positif"],["neutralCount","Komentar Netral"],["negativeCount","Komentar Negatif"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} /></div>
              ))}
              <div><label className="text-xs text-slate-500 block mb-1">Tema Positif Utama</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="contoh: progress cepat, admin responsif..." value={form.positiveThemes} onChange={e => setForm({...form, positiveThemes: e.target.value})} /></div>
              <div><label className="text-xs text-slate-500 block mb-1">Tema Negatif Utama</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="contoh: respons lambat, proses akad lama..." value={form.negativeThemes} onChange={e => setForm({...form, negativeThemes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
