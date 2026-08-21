import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const emptyForm = { periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, newTestimonials: "", avgTestimonialScore: "", progressContentCount: "", avgResponseTimeMinutes: "", positiveSentimentPct: "", notes: "" };

function statusLabel(score: number) {
  if (score >= 80) return { label: "TINGGI", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (score >= 60) return { label: "SEDANG", color: "text-amber-600 bg-amber-50 border-amber-200" };
  return { label: "RENDAH", color: "text-red-600 bg-red-50 border-red-200" };
}

export default function BrandingTrust() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const { data = [] } = useQuery<any[]>({ queryKey: ["branding-trust"], queryFn: () => fetch("/api/branding/trust").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/trust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-trust"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/trust/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-trust"] }),
  });

  const latest = data[0];
  const score = latest ? Math.round(parseFloat(latest.trustScore?.toString() ?? "0")) : 0;
  const st = statusLabel(score);

  function calcBreakdown(r: any) {
    if (!r) return [];
    const testimonialComp = Math.round((parseFloat(r.avgTestimonialScore ?? 0) / 10) * 100 * 0.30);
    const progressComp = Math.round(Math.min(100, (parseFloat(r.progressContentCount ?? 0) / 8) * 100) * 0.20);
    const responseComp = Math.round(Math.min(100, r.avgResponseTimeMinutes > 0 ? (10 / parseFloat(r.avgResponseTimeMinutes)) * 100 : 100) * 0.25);
    const sentimentComp = Math.round(Math.min(100, (parseFloat(r.positiveSentimentPct ?? 0) / 80) * 100) * 0.25);
    return [
      { label: "Skor Testimoni", actual: `${r.avgTestimonialScore}/10`, contrib: testimonialComp, bobot: "30%" },
      { label: "Konten Progress Proyek", actual: `${r.progressContentCount}/8`, contrib: progressComp, bobot: "20%" },
      { label: "Response Time", actual: `${r.avgResponseTimeMinutes} menit`, contrib: responseComp, bobot: "25%" },
      { label: "Sentiment Positif", actual: `${r.positiveSentimentPct}%`, contrib: sentimentComp, bobot: "25%" },
    ];
  }

  const breakdown = calcBreakdown(latest);
  const worstComp = breakdown.length > 0 ? breakdown.reduce((a, b) => a.contrib < b.contrib ? a : b) : null;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trust Score</h1>
          <p className="text-sm text-slate-500">Tingkat kepercayaan pasar terhadap Property sebagai developer</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input Data Trust</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cn("bg-white rounded-xl border-2 p-8 flex flex-col items-center gap-3", st.color.split(" ").slice(1).join(" "))}>
          <div className={cn("text-7xl font-black", st.color.split(" ")[0])}>{score}</div>
          <div className="text-slate-500 text-sm">/ 100</div>
          <span className={cn("px-4 py-1.5 rounded-full text-sm font-bold border", st.color)}>{st.label}</span>
          <div className="text-xs text-slate-500 mt-1">Trust Score Terkini</div>
          {latest && <div className="text-xs text-slate-400">{MONTHS[(latest.periodMonth ?? 1) - 1]} {latest.periodYear}</div>}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Breakdown Komponen</h2>
          {breakdown.length > 0 ? (
            <div className="space-y-3">
              {breakdown.map(c => (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">{c.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{c.actual}</span>
                      <span className="font-semibold text-slate-700">{c.contrib} poin</span>
                      <span className="text-slate-400">({c.bobot})</span>
                    </div>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2">
                    <div className={cn("h-2 rounded-full", c.contrib >= 20 ? "bg-emerald-500" : c.contrib >= 12 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${Math.min(100, c.contrib * 3)}%` }} />
                  </div>
                </div>
              ))}
              {worstComp && (
                <div className="mt-3 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                  💡 Prioritas perbaikan: <strong>{worstComp.label}</strong> (kontribusi paling rendah: {worstComp.contrib} poin)
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-8 text-center">Belum ada data. Input data trust untuk melihat breakdown.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Riwayat Trust Score</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Periode","Testimoni","Avg Testimoni","Progress Konten","Response Time","Sentiment+","Trust Score",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {data.map(r => {
              const sc = Math.round(parseFloat(r.trustScore?.toString() ?? "0"));
              const s = statusLabel(sc);
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</td>
                  <td className="px-4 py-3">{r.newTestimonials}</td>
                  <td className="px-4 py-3">{r.avgTestimonialScore}/10</td>
                  <td className="px-4 py-3">{r.progressContentCount}</td>
                  <td className="px-4 py-3">{r.avgResponseTimeMinutes} mnt</td>
                  <td className="px-4 py-3">{r.positiveSentimentPct}%</td>
                  <td className="px-4 py-3"><span className={cn("font-bold", s.color.split(" ")[0])}>{sc}/100</span></td>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 my-4">
            <h2 className="font-bold text-slate-800 mb-4">Input Data Trust Score</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Tahun</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodYear} onChange={e => setForm({...form, periodYear: parseInt(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Bulan</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodMonth} onChange={e => setForm({...form, periodMonth: parseInt(e.target.value)})}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div>
              </div>
              {[["newTestimonials","Jumlah Testimoni Baru"],["avgTestimonialScore","Skor Testimoni Rata-rata (1-10)"],["progressContentCount","Konten Progress Proyek Diposting (target 8)"],["avgResponseTimeMinutes","Rata-rata Response Time (menit, target 10)"],["positiveSentimentPct","Komentar Positif (%)"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} /></div>
              ))}
              <div><label className="text-xs text-slate-500 block mb-1">Catatan</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan & Hitung</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
