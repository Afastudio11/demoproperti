import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const PROJECTS = ["SN Residence 3","SN Residence 4","Barru","Loka Resort","Satara Group","Sekala Industry"];

const emptyForm = { projectName: "SN Residence 3", periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, awarenessScore: "", engagementScore: "", inquiryScore: "", sentimentScore: "", notes: "" };

function statusColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", label: "Sehat" };
  if (score >= 60) return { bg: "bg-amber-100 text-amber-700 border-amber-200", bar: "bg-amber-400", label: "Waspada" };
  return { bg: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-400", label: "Kritis" };
}

export default function BrandingProyek() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const { data = [] } = useQuery<any[]>({ queryKey: ["branding-project-scores"], queryFn: () => fetch("/api/branding/project-scores").then(r => r.json()) });
  const { data: contentAll = [] } = useQuery<any[]>({ queryKey: ["branding-content"], queryFn: () => fetch("/api/branding/content").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/project-scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-project-scores"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/project-scores/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-project-scores"] }),
  });

  const currentData = data.filter(r => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const latestByProject: Record<string, any> = {};
  for (const r of data) {
    const ex = latestByProject[r.projectName];
    if (!ex || r.periodYear > ex.periodYear || (r.periodYear === ex.periodYear && r.periodMonth > ex.periodMonth)) latestByProject[r.projectName] = r;
  }

  const totalContent = contentAll.length || 1;
  const contentByProject: Record<string, number> = {};
  for (const c of contentAll) { if (c.projectRelated) contentByProject[c.projectRelated] = (contentByProject[c.projectRelated] ?? 0) + 1; }

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Branding Score</h1>
          <p className="text-sm text-slate-500">Skor brand awareness & engagement khusus per proyek</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input Score</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROJECTS.map(project => {
          const r = latestByProject[project];
          const score = r?.totalScore ?? 0;
          const st = statusColor(score);
          const exposure = Math.round((contentByProject[project] ?? 0) / totalContent * 100);
          return (
            <div key={project} className={cn("bg-white rounded-xl border-2 p-5", st.bg.split(" ")[0] + " border-" + (score >= 80 ? "emerald" : score >= 60 ? "amber" : "red") + "-200")}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-800">{project}</span>
                {r && <span className={cn("text-xs px-2 py-0.5 rounded font-medium border", st.bg)}>{st.label}</span>}
              </div>
              {r ? (
                <>
                  <div className={cn("text-4xl font-black mb-2", score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500")}>{score}<span className="text-lg font-normal text-slate-400">/100</span></div>
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                    {[["Awareness", r.awarenessScore],["Engagement", r.engagementScore],["Inquiry", r.inquiryScore],["Sentiment", r.sentimentScore]].map(([l,v]) => (
                      <div key={l} className="flex items-center gap-2">
                        <span className="w-20 shrink-0">{l}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5"><div className={cn("h-1.5 rounded-full", st.bar)} style={{ width: `${Math.min(100, parseFloat(String(v ?? 0)))}%` }} /></div>
                        <span className="w-6 text-right font-medium">{v ?? 0}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-500 mb-1"><span>Exposure Score (konten)</span><span className="font-semibold text-slate-700">{exposure}%</span></div>
                    {exposure < 20 && contentByProject[project] !== undefined && (
                      <div className="bg-amber-50 text-amber-700 text-xs px-2 py-1.5 rounded mt-1">💡 Exposure rendah — pertimbangkan lebih banyak konten untuk proyek ini</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 py-4 text-center">Belum ada data skor</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
          {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Proyek","Awareness","Engagement","Inquiry","Sentiment","Total Score","Status",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {data.map(r => {
              const st = statusColor(r.totalScore ?? 0);
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.projectName}</td>
                  <td className="px-4 py-3">{r.awarenessScore}</td>
                  <td className="px-4 py-3">{r.engagementScore}</td>
                  <td className="px-4 py-3">{r.inquiryScore}</td>
                  <td className="px-4 py-3">{r.sentimentScore}</td>
                  <td className="px-4 py-3 font-bold">{r.totalScore ?? "-"}</td>
                  <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs border", st.bg)}>{st.label}</span></td>
                  <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {data.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <h2 className="font-bold text-slate-800 mb-4">Input Project Branding Score</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 block mb-1">Proyek</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})}>
                  {PROJECTS.map(p => <option key={p}>{p}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Tahun</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodYear} onChange={e => setForm({...form, periodYear: parseInt(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Bulan</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodMonth} onChange={e => setForm({...form, periodMonth: parseInt(e.target.value)})}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div>
              </div>
              {[["awarenessScore","Awareness Score (1-100)"],["engagementScore","Engagement Score (1-100)"],["inquiryScore","Inquiry Score (1-100)"],["sentimentScore","Sentiment Score (1-100)"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type="number" min="1" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} /></div>
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
