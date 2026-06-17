import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = ["instagram_arya", "facebook_arya", "linkedin_arya", "media_exposure"];
const PLATFORM_LABELS: Record<string, string> = { instagram_arya: "Instagram Arya", facebook_arya: "Facebook Arya", linkedin_arya: "LinkedIn Arya", media_exposure: "Media Exposure" };
const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const MEDIA_TYPES = ["Artikel","Wawancara","Feature","Podcast","Radio"];

const emptyFounder = { periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, platform: "instagram_arya", reach: "", impression: "", engagement: "", newFollowers: "", totalFollowers: "", contentCount: "", leadsFromFounder: "", bookingsFromFounder: "", notes: "" };
const emptyMedia = { mediaName: "", type: "Artikel", title: "", publishDate: "", url: "", estimatedReach: "", notes: "" };

export default function BrandingFounder() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"kpi"|"media">("kpi");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyFounder);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaForm, setMediaForm] = useState<any>(emptyMedia);

  const { data: founderData = [] } = useQuery<any[]>({ queryKey: ["branding-founder"], queryFn: () => fetch("/api/branding/founder").then(r => r.json()) });
  const { data: mediaData = [] } = useQuery<any[]>({ queryKey: ["branding-media"], queryFn: () => fetch("/api/branding/media-exposure").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/founder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-founder"] }); setShowForm(false); setForm(emptyFounder); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/founder/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-founder"] }),
  });

  const saveMediaMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/media-exposure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-media"] }); setShowMediaForm(false); setMediaForm(emptyMedia); },
  });

  const deleteMediaMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/media-exposure/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-media"] }),
  });

  const latestData = founderData.slice(0, 10);
  const totalReach = latestData.reduce((s: number, r: any) => s + (r.reach ?? 0), 0);
  const totalEng = latestData.reduce((s: number, r: any) => s + (r.engagement ?? 0), 0);
  const totalLeads = latestData.reduce((s: number, r: any) => s + (r.leadsFromFounder ?? 0), 0);
  const totalFollowers = latestData.reduce((s: number, r: any) => s + (r.newFollowers ?? 0), 0);
  const engRate = totalReach > 0 ? ((totalEng / totalReach) * 100).toFixed(1) : "0,0";
  const influenceScore = Math.min(100, Math.round(
    (Math.min(100, (totalReach / 50000) * 100) * 0.25) +
    (Math.min(100, (parseFloat(engRate) / 5) * 100) * 0.25) +
    50 * 0.5
  ));

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Personal Branding Founder</h1>
          <p className="text-sm text-slate-500">Tracking KPI personal branding CEO Arya di semua platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMediaForm(true)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"><Newspaper size={14} /> Liputan Media</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input KPI</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Reach Total", value: totalReach.toLocaleString("id") },
          { label: "Engagement Rate", value: `${engRate}%` },
          { label: "Followers Baru", value: totalFollowers.toLocaleString("id") },
          { label: "Leads dari Founder", value: totalLeads.toLocaleString("id") },
          { label: "Influence Score", value: `${influenceScore}/100` },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xl font-bold text-slate-800">{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(["kpi","media"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition", tab === t ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700")}>
            {t === "kpi" ? "KPI per Platform" : "Liputan Media"}
          </button>
        ))}
      </div>

      {tab === "kpi" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Periode","Platform","Reach","Engagement","Eng. Rate","Followers Baru","Leads","Bookings",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {founderData.map((r: any) => {
                const engR = r.reach > 0 ? ((r.engagement / r.reach) * 100).toFixed(1) : "0,0";
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</td>
                    <td className="px-4 py-3 font-medium">{PLATFORM_LABELS[r.platform] ?? r.platform}</td>
                    <td className="px-4 py-3">{(r.reach ?? 0).toLocaleString("id")}</td>
                    <td className="px-4 py-3">{(r.engagement ?? 0).toLocaleString("id")}</td>
                    <td className="px-4 py-3">{engR}%</td>
                    <td className="px-4 py-3">{(r.newFollowers ?? 0).toLocaleString("id")}</td>
                    <td className="px-4 py-3">{r.leadsFromFounder ?? 0}</td>
                    <td className="px-4 py-3">{r.bookingsFromFounder ?? 0}</td>
                    <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
              {founderData.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data KPI founder.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "media" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Media","Jenis","Judul","Tanggal","Reach","URL",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {mediaData.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.mediaName}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{r.type}</span></td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-slate-500">{r.publishDate}</td>
                  <td className="px-4 py-3">{(r.estimatedReach ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">Buka ↗</a> : "-"}</td>
                  <td className="px-4 py-3"><button onClick={() => deleteMediaMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {mediaData.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data liputan media.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 my-4">
            <h2 className="font-bold text-slate-800 mb-4">Input KPI Founder</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Tahun</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodYear} onChange={e => setForm({...form, periodYear: parseInt(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Bulan</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodMonth} onChange={e => setForm({...form, periodMonth: parseInt(e.target.value)})}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 block mb-1">Platform</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>{PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}</select></div>
              </div>
              {[["reach","Reach"],["impression","Impression"],["engagement","Engagement"],["newFollowers","Followers Baru"],["totalFollowers","Total Followers"],["contentCount","Jumlah Konten"],["leadsFromFounder","Leads dari Founder"],["bookingsFromFounder","Booking dari Founder"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} /></div>
              ))}
              <div><label className="text-xs text-slate-500 block mb-1">Catatan</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showMediaForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <h2 className="font-bold text-slate-800 mb-4">Input Liputan Media</h2>
            <div className="space-y-3">
              {[["mediaName","Nama Media","text"],["title","Judul / Topik","text"],["publishDate","Tanggal Tayang","date"],["url","URL / Link","text"],["estimatedReach","Estimasi Reach","number"]].map(([k,l,t]) => (
                <div key={k}><label className="text-xs text-slate-500 block mb-1">{l}</label><input type={t} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={mediaForm[k]} onChange={e => setMediaForm({...mediaForm, [k]: e.target.value})} /></div>
              ))}
              <div><label className="text-xs text-slate-500 block mb-1">Jenis</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={mediaForm.type} onChange={e => setMediaForm({...mediaForm, type: e.target.value})}>{MEDIA_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="text-xs text-slate-500 block mb-1">Catatan</label><textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={mediaForm.notes} onChange={e => setMediaForm({...mediaForm, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowMediaForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => saveMediaMut.mutate(mediaForm)} disabled={saveMediaMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
