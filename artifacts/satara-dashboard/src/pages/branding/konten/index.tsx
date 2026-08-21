import { Link } from "wouter";
import { Calendar, Kanban, Plus, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const STAGE_COLORS: Record<string, string> = { idea: "bg-slate-100 text-slate-600", script: "bg-sky-100 text-sky-700", shooting: "bg-blue-100 text-blue-700", editing: "bg-yellow-100 text-yellow-700", review: "bg-orange-100 text-orange-700", approved: "bg-green-100 text-green-700", posted: "bg-emerald-100 text-emerald-700" };
const CAT_COLORS: Record<string, string> = { edukasi: "bg-blue-100 text-blue-700", progress_proyek: "bg-emerald-100 text-emerald-700", testimoni: "bg-yellow-100 text-yellow-700", csr: "bg-pink-100 text-pink-700", company_culture: "bg-purple-100 text-purple-700", founder_story: "bg-orange-100 text-orange-700", behind_the_scene: "bg-slate-100 text-slate-600" };
const CAT_LABELS: Record<string, string> = { edukasi: "Edukasi", progress_proyek: "Progress Proyek", testimoni: "Testimoni", csr: "CSR", company_culture: "Company Culture", founder_story: "Founder Story", behind_the_scene: "Behind The Scene" };
const STAGES = ["idea","script","shooting","editing","review","approved","posted"];

export default function BrandingKonten() {
  const { data: content = [] } = useQuery<any[]>({ queryKey: ["branding-content"], queryFn: () => fetch("/api/branding/content").then(r => r.json()) });

  const pipeline: Record<string, number> = {};
  for (const s of STAGES) pipeline[s] = content.filter((c: any) => c.productionStatus === s).length;

  const targets: Record<string, number> = { edukasi: 8, progress_proyek: 8, testimoni: 4, csr: 2, company_culture: 4, founder_story: 2, behind_the_scene: 2 };
  const posted = content.filter((c: any) => c.productionStatus === "posted");
  const postedByCategory: Record<string, number> = {};
  for (const c of posted) { postedByCategory[c.category] = (postedByCategory[c.category] ?? 0) + 1; }

  const now = new Date();
  const overdueCount = content.filter((c: any) => {
    if (c.productionStatus === "posted") return false;
    if (!c.productionDeadline) return false;
    return new Date(c.productionDeadline) < now;
  }).length;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Content Management</h1>
          <p className="text-sm text-slate-500">Perencanaan, produksi, dan tracking seluruh konten brand</p>
        </div>
        <Link href="/branding/konten/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Tambah Konten</button>
        </Link>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm font-medium">
          ⚠ {overdueCount} konten melewati deadline produksi dan belum berstatus Posted
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/branding/konten/kalender">
          <div className="bg-white rounded-xl border-2 border-blue-200 hover:bg-blue-50 p-5 cursor-pointer transition group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Calendar size={20} /></div>
              <h3 className="font-semibold text-slate-800">Kalender Konten</h3>
            </div>
            <p className="text-xs text-slate-500">Tampilan kalender bulanan dengan jadwal posting tiap konten</p>
            <div className="mt-3 flex items-center gap-1 text-blue-600 text-xs font-medium group-hover:gap-2 transition-all">Buka Kalender <ArrowRight size={12} /></div>
          </div>
        </Link>
        <Link href="/branding/konten/produksi">
          <div className="bg-white rounded-xl border-2 border-purple-200 hover:bg-purple-50 p-5 cursor-pointer transition group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Kanban size={20} /></div>
              <h3 className="font-semibold text-slate-800">Production Tracker</h3>
            </div>
            <p className="text-xs text-slate-500">Kanban board 6 kolom tahap produksi konten</p>
            <div className="mt-3 flex items-center gap-1 text-purple-600 text-xs font-medium group-hover:gap-2 transition-all">Buka Kanban <ArrowRight size={12} /></div>
          </div>
        </Link>
        <Link href="/branding/konten/new">
          <div className="bg-white rounded-xl border-2 border-emerald-200 hover:bg-emerald-50 p-5 cursor-pointer transition group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Plus size={20} /></div>
              <h3 className="font-semibold text-slate-800">Tambah Konten</h3>
            </div>
            <p className="text-xs text-slate-500">Form input konten baru dengan semua detail produksi</p>
            <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-medium group-hover:gap-2 transition-all">Buat Konten <ArrowRight size={12} /></div>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Pipeline Summary</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {STAGES.map(s => (
            <div key={s} className={cn("rounded-lg px-4 py-3 text-center min-w-[90px]", STAGE_COLORS[s])}>
              <div className="text-2xl font-bold">{pipeline[s] ?? 0}</div>
              <div className="text-xs mt-0.5 capitalize font-medium">{s}</div>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Content Completion Rate bulan ini</span>
            <span className={cn("font-bold", (pipeline.posted ?? 0) >= 30 ? "text-emerald-600" : "text-amber-500")}>{pipeline.posted ?? 0} / 30 ({Math.round(((pipeline.posted ?? 0) / 30) * 100)}%)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Target per Kategori Bulan Ini</h2>
        <div className="space-y-2">
          {Object.entries(targets).map(([cat, target]) => {
            const actual = postedByCategory[cat] ?? 0;
            const pct = Math.min(100, Math.round((actual / target) * 100));
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium w-32 shrink-0 text-center", CAT_COLORS[cat])}>{CAT_LABELS[cat]}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className={cn("h-2 rounded-full", pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-600 w-16 text-right">{actual}/{target}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Semua Konten</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Judul","Kategori","Platform","PIC","Posting","Status","Aging"].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {content.map((c: any) => {
              const isOverdue = c.productionStatus !== "posted" && c.productionDeadline && new Date(c.productionDeadline) < new Date();
              const agingDays = c.productionDeadline && c.productionStatus !== "posted" ? Math.floor((new Date().getTime() - new Date(c.productionDeadline).getTime()) / 86400000) : null;
              return (
                <tr key={c.id} className={cn("border-b border-slate-50 hover:bg-slate-50", isOverdue && "bg-red-50")}>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">{c.title}</td>
                  <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", CAT_COLORS[c.category] ?? "bg-slate-100 text-slate-600")}>{CAT_LABELS[c.category] ?? c.category}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.platforms}</td>
                  <td className="px-4 py-3 text-slate-600">{c.pic}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.scheduledPostDate}</td>
                  <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs font-medium", STAGE_COLORS[c.productionStatus] ?? "bg-slate-100")}>{c.productionStatus}</span></td>
                  <td className="px-4 py-3 text-xs">{agingDays !== null && agingDays > 0 ? <span className="text-red-600 font-medium">{agingDays}h telat</span> : "-"}</td>
                </tr>
              );
            })}
            {content.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">Belum ada konten. <Link href="/branding/konten/new"><span className="text-blue-500 hover:underline cursor-pointer">Tambah konten pertama</span></Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
