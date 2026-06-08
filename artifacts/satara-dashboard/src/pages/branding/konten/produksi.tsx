import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["idea","script","shooting","editing","review","posted"] as const;
type Stage = typeof STAGES[number];
const STAGE_LABELS: Record<Stage, string> = { idea: "Idea", script: "Script", shooting: "Shooting", editing: "Editing", review: "Review", posted: "Posted" };
const STAGE_COLORS: Record<Stage, string> = { idea: "bg-slate-100 border-slate-200", script: "bg-sky-50 border-sky-200", shooting: "bg-blue-50 border-blue-200", editing: "bg-yellow-50 border-yellow-200", review: "bg-orange-50 border-orange-200", posted: "bg-emerald-50 border-emerald-200" };
const STAGE_HEADER: Record<Stage, string> = { idea: "bg-slate-200 text-slate-700", script: "bg-sky-200 text-sky-800", shooting: "bg-blue-200 text-blue-800", editing: "bg-yellow-200 text-yellow-800", review: "bg-orange-200 text-orange-800", posted: "bg-emerald-200 text-emerald-800" };
const CAT_COLORS: Record<string, string> = { edukasi: "bg-blue-100 text-blue-700", progress_proyek: "bg-emerald-100 text-emerald-700", testimoni: "bg-yellow-100 text-yellow-700", csr: "bg-pink-100 text-pink-700", company_culture: "bg-purple-100 text-purple-700", founder_story: "bg-orange-100 text-orange-700", behind_the_scene: "bg-slate-100 text-slate-600" };
const CAT_LABELS: Record<string, string> = { edukasi: "Edukasi", progress_proyek: "Progress Proyek", testimoni: "Testimoni", csr: "CSR", company_culture: "Company Culture", founder_story: "Founder Story", behind_the_scene: "Behind The Scene" };
const NEXT_STAGE: Record<Stage, Stage | null> = { idea: "script", script: "shooting", shooting: "editing", editing: "review", review: "posted", posted: null };

export default function BrandingProduksi() {
  const qc = useQueryClient();
  const [confirmCard, setConfirmCard] = useState<{ id: number; from: Stage; to: Stage; title: string } | null>(null);
  const [view, setView] = useState<"kanban"|"table">("kanban");

  const { data: content = [], isLoading } = useQuery<any[]>({ queryKey: ["branding-content"], queryFn: () => fetch("/api/branding/content").then(r => r.json()) });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => fetch(`/api/branding/content/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productionStatus: status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-content"] }); setConfirmCard(null); },
  });

  const byStage: Record<Stage, any[]> = { idea: [], script: [], shooting: [], editing: [], review: [], posted: [] };
  for (const c of content) {
    const s = c.productionStatus as Stage;
    if (byStage[s]) byStage[s].push(c);
  }

  const now = new Date();
  function isOverdue(c: any) { return c.productionStatus !== "posted" && c.productionDeadline && new Date(c.productionDeadline) < now; }

  return (
    <div className="p-6 space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Content Production Tracker</h1>
          <p className="text-sm text-slate-500">Kanban board tahap produksi konten</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-sm">
            <button onClick={() => setView("kanban")} className={cn("px-3 py-1.5", view === "kanban" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>Kanban</button>
            <button onClick={() => setView("table")} className={cn("px-3 py-1.5", view === "table" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>Tabel</button>
          </div>
          <Link href="/branding/konten/new">
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={14} /> Tambah</button>
          </Link>
        </div>
      </div>

      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => (
              <div key={stage} className={cn("w-56 rounded-xl border", STAGE_COLORS[stage])}>
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-t-xl", STAGE_HEADER[stage])}>
                  <span className="font-semibold text-sm">{STAGE_LABELS[stage]}</span>
                  <span className="text-xs font-bold">{byStage[stage].length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {byStage[stage].map((c: any) => {
                    const overdue = isOverdue(c);
                    const nextStage = NEXT_STAGE[stage];
                    return (
                      <div key={c.id} className={cn("bg-white rounded-lg p-2.5 shadow-sm border", overdue ? "border-red-300" : "border-slate-100")}>
                        {overdue && <div className="text-red-500 text-[10px] font-bold mb-1">⚠ TERLAMBAT</div>}
                        <div className="font-medium text-slate-800 text-xs leading-snug mb-1.5">{c.title}</div>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px]", CAT_COLORS[c.category] ?? "bg-slate-100 text-slate-600")}>{CAT_LABELS[c.category] ?? c.category}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{c.platforms} · {c.pic}</div>
                        {c.productionDeadline && <div className="text-[10px] text-slate-400 mt-0.5">Deadline: {c.productionDeadline}</div>}
                        {nextStage && (
                          <button onClick={() => setConfirmCard({ id: c.id, from: stage, to: nextStage, title: c.title })} className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium transition">
                            Pindah ke {STAGE_LABELS[nextStage]} <ArrowRight size={9} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Konten","Kategori","Platform","PIC","Deadline","Status","Aging"].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {content.map((c: any) => {
                const overdue = isOverdue(c);
                const aging = c.productionDeadline && c.productionStatus !== "posted" ? Math.floor((new Date().getTime() - new Date(c.productionDeadline).getTime()) / 86400000) : null;
                return (
                  <tr key={c.id} className={cn("border-b border-slate-50 hover:bg-slate-50", overdue && "bg-red-50")}>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{c.title}</td>
                    <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", CAT_COLORS[c.category] ?? "bg-slate-100")}>{CAT_LABELS[c.category] ?? c.category}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.platforms}</td>
                    <td className="px-4 py-3 text-slate-600">{c.pic}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.productionDeadline}</td>
                    <td className="px-4 py-3">
                      <select value={c.productionStatus} onChange={e => updateMut.mutate({ id: c.id, status: e.target.value })} className="text-xs border border-slate-200 rounded px-2 py-1">
                        {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs">{aging !== null && aging > 0 ? <span className="text-red-600 font-medium">{aging}h</span> : "-"}</td>
                  </tr>
                );
              })}
              {content.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada konten</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {confirmCard && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-2">Konfirmasi Perubahan Status</h3>
            <p className="text-sm text-slate-600 mb-4">Pindahkan <span className="font-medium">"{confirmCard.title}"</span> dari <b>{STAGE_LABELS[confirmCard.from]}</b> → <b>{STAGE_LABELS[confirmCard.to]}</b>?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCard(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Batal</button>
              <button onClick={() => updateMut.mutate({ id: confirmCard.id, status: confirmCard.to })} disabled={updateMut.isPending} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">Ya, Pindahkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
