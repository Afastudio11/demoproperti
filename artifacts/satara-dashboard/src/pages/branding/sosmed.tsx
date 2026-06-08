import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = ["Instagram","Facebook","TikTok","YouTube","Website"];
const MONTHS = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
const TARGETS = { reach: 100000, engagementRate: 5, newFollowers: 500, contentCount: 30 };

const emptyForm = { periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, platform: "Instagram", reach: "", impression: "", engagement: "", saves: "", shares: "", newFollowers: "", totalFollowers: "", contentCount: "", notes: "" };

export default function BrandingSosmed() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const { data = [] } = useQuery<any[]>({ queryKey: ["branding-social-media"], queryFn: () => fetch("/api/branding/social-media").then(r => r.json()) });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/social-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-social-media"] }); setShowForm(false); setForm(emptyForm); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/branding/social-media/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branding-social-media"] }),
  });

  const currentData = data.filter(r => r.periodYear === filterYear && r.periodMonth === filterMonth);
  const byPlatform: Record<string, any> = Object.fromEntries(currentData.map(r => [r.platform, r]));

  const totalReach = currentData.reduce((s, r) => s + (r.reach ?? 0), 0);
  const totalEng = currentData.reduce((s, r) => s + (r.engagement ?? 0), 0);
  const totalFollowers = currentData.reduce((s, r) => s + (r.newFollowers ?? 0), 0);
  const totalContent = currentData.reduce((s, r) => s + (r.contentCount ?? 0), 0);
  const overallEngRate = totalReach > 0 ? ((totalEng / totalReach) * 100) : 0;

  function getBest(field: string) {
    let best = -Infinity, bestPlatform = "";
    for (const r of currentData) { if ((r[field] ?? 0) > best) { best = r[field] ?? 0; bestPlatform = r.platform; } }
    return bestPlatform;
  }
  const bestReach = getBest("reach");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Social Media Performance</h1>
          <p className="text-sm text-slate-500">KPI semua platform media sosial brand Satara</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Input KPI Platform</button>
      </div>

      <div className="flex items-center gap-3">
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
          {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Reach", value: totalReach.toLocaleString("id"), target: TARGETS.reach.toLocaleString("id"), ok: totalReach >= TARGETS.reach },
          { label: "Engagement Rate", value: `${overallEngRate.toFixed(1)}%`, target: `${TARGETS.engagementRate}%`, ok: overallEngRate >= TARGETS.engagementRate },
          { label: "Followers Baru", value: totalFollowers.toLocaleString("id"), target: TARGETS.newFollowers.toLocaleString("id"), ok: totalFollowers >= TARGETS.newFollowers },
          { label: "Total Konten", value: totalContent.toLocaleString("id"), target: TARGETS.contentCount.toLocaleString("id"), ok: totalContent >= TARGETS.contentCount },
        ].map(m => (
          <div key={m.label} className={cn("bg-white rounded-xl border p-4", m.ok ? "border-emerald-200" : "border-amber-200")}>
            <div className={cn("text-2xl font-bold", m.ok ? "text-emerald-600" : "text-amber-500")}>{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
            <div className="text-xs text-slate-400 mt-1">Target: {m.target}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Perbandingan Platform — {MONTHS[filterMonth-1]} {filterYear}</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Platform","Reach","Impression","Engagement","Eng. Rate","Followers Baru","Total Followers","Konten"].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {PLATFORMS.map(platform => {
              const r = byPlatform[platform];
              const engRate = r && r.reach > 0 ? ((r.engagement / r.reach) * 100).toFixed(1) : "-";
              const lowEng = r && r.reach > 0 && (r.engagement / r.reach) * 100 < TARGETS.engagementRate;
              return (
                <tr key={platform} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{platform}</td>
                  <td className={cn("px-4 py-3", r?.platform === bestReach && "text-emerald-600 font-semibold")}>{r ? r.reach.toLocaleString("id") : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{r ? r.impression.toLocaleString("id") : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{r ? r.engagement.toLocaleString("id") : "-"}</td>
                  <td className={cn("px-4 py-3 font-medium", lowEng ? "text-red-500" : r ? "text-emerald-600" : "")}>{engRate !== "-" ? `${engRate}%` : "-"}</td>
                  <td className="px-4 py-3">{r ? r.newFollowers.toLocaleString("id") : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{r ? r.totalFollowers.toLocaleString("id") : "-"}</td>
                  <td className="px-4 py-3">{r ? r.contentCount : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-slate-400 italic">Merah = Engagement Rate di bawah target 5% · Hijau = nilai tertinggi per kolom</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Riwayat Input</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Periode","Platform","Reach","Eng. Rate","Followers Baru","Konten",""].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {data.map(r => {
              const er = r.reach > 0 ? `${((r.engagement / r.reach) * 100).toFixed(1)}%` : "-";
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{MONTHS[(r.periodMonth ?? 1) - 1]} {r.periodYear}</td>
                  <td className="px-4 py-3 font-medium">{r.platform}</td>
                  <td className="px-4 py-3">{(r.reach ?? 0).toLocaleString("id")}</td>
                  <td className="px-4 py-3">{er}</td>
                  <td className="px-4 py-3">{r.newFollowers}</td>
                  <td className="px-4 py-3">{r.contentCount}</td>
                  <td className="px-4 py-3"><button onClick={() => deleteMut.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {data.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada data</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 my-4">
            <h2 className="font-bold text-slate-800 mb-4">Input KPI Platform</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Tahun</label><input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodYear} onChange={e => setForm({...form, periodYear: parseInt(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Bulan</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.periodMonth} onChange={e => setForm({...form, periodMonth: parseInt(e.target.value)})}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 block mb-1">Platform</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></div>
              </div>
              {[["reach","Reach"],["impression","Impression"],["engagement","Engagement (likes+komen+share+save)"],["saves","Save"],["shares","Share"],["newFollowers","Followers Baru"],["totalFollowers","Total Followers"],["contentCount","Jumlah Konten Publish"]].map(([k,l]) => (
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
    </div>
  );
}
