import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

const CATEGORIES = ["edukasi","progress_proyek","testimoni","csr","company_culture","founder_story","behind_the_scene"];
const CAT_LABELS: Record<string, string> = { edukasi: "Edukasi", progress_proyek: "Progress Proyek", testimoni: "Testimoni", csr: "CSR", company_culture: "Company Culture", founder_story: "Founder Story", behind_the_scene: "Behind The Scene" };
const PROJECTS = ["SN1","SN2","SN3","SN4","Barru","Loka Resort","Satara Group","Tidak Spesifik"];
const PLATFORMS = ["Instagram","Facebook","TikTok","YouTube","Website"];
const FORMATS = ["Foto","Video Pendek","Video Panjang","Reels","Story","Carousel","Blog Post"];
const PICS = ["Content Creator","Graphic Designer","Videographer","Copywriter"];
const STATUSES = ["idea","script","shooting","editing","review","approved","posted"];

const empty = { title: "", category: "edukasi", projectRelated: "Tidak Spesifik", platforms: [] as string[], format: "Foto", pic: "Content Creator", productionDeadline: "", scheduledPostDate: "", actualPostDate: "", productionStatus: "idea", caption: "", contentUrl: "", productionCost: "", notes: "" };

export default function BrandingKontenNew() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });

  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/branding/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, platforms: body.platforms.join(", ") }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-content"] }); navigate("/branding/konten"); },
  });

  function togglePlatform(p: string) {
    setForm(f => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p] }));
  }

  return (
    <div className="p-6 w-full">
      <button onClick={() => navigate("/branding/konten")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"><ChevronLeft size={16} /> Kembali</button>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Tambah Konten Baru</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div><label className="text-xs font-medium text-slate-500 block mb-1">Judul Konten *</label>
          <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Judul konten..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Kategori</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Proyek Terkait</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.projectRelated} onChange={e => setForm({...form, projectRelated: e.target.value})}>
              {PROJECTS.map(p => <option key={p}>{p}</option>)}
            </select></div>
        </div>

        <div><label className="text-xs font-medium text-slate-500 block mb-2">Platform (pilih semua yang berlaku)</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button key={p} type="button" onClick={() => togglePlatform(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${form.platforms.includes(p) ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{p}</button>
            ))}
          </div></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Format</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.format} onChange={e => setForm({...form, format: e.target.value})}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1">PIC Produksi</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.pic} onChange={e => setForm({...form, pic: e.target.value})}>
              {PICS.map(p => <option key={p}>{p}</option>)}
            </select></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Deadline Produksi</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.productionDeadline} onChange={e => setForm({...form, productionDeadline: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Rencana Posting</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.scheduledPostDate} onChange={e => setForm({...form, scheduledPostDate: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Aktual Posting</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.actualPostDate} onChange={e => setForm({...form, actualPostDate: e.target.value})} /></div>
        </div>

        <div><label className="text-xs font-medium text-slate-500 block mb-1">Status Produksi</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.productionStatus} onChange={e => setForm({...form, productionStatus: e.target.value})}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select></div>

        <div><label className="text-xs font-medium text-slate-500 block mb-1">Caption / Script</label>
          <textarea rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.caption} onChange={e => setForm({...form, caption: e.target.value})} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Link Konten (URL)</label>
            <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.contentUrl} onChange={e => setForm({...form, contentUrl: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-slate-500 block mb-1">Biaya Produksi (Rp)</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.productionCost} onChange={e => setForm({...form, productionCost: e.target.value})} /></div>
        </div>

        <div><label className="text-xs font-medium text-slate-500 block mb-1">Catatan</label>
          <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => navigate("/branding/konten")} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
          <button onClick={() => saveMut.mutate(form)} disabled={!form.title || saveMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {saveMut.isPending ? "Menyimpan..." : "Simpan Konten"}
          </button>
        </div>
      </div>
    </div>
  );
}
