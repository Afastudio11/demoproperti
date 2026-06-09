import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
function fmtPct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`; }

function StatusBadge({ pct }: { pct: number }) {
  if (pct <= -5) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Under Budget</span>;
  if (pct <= 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">On Budget</span>;
  if (pct <= 5) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Slight Over</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Over Budget</span>;
}

export default function RealisasiRab() {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-rab"],
    queryFn: () => fetch("/api/finance/rab").then(r => r.json()),
    refetchInterval: 60000,
  });

  const summary: any[] = data?.summary ?? [];
  const isEmpty = summary.length === 0;

  const activeData = summary.find(s => s.projectName === activeProject);
  const stages = activeData ? Object.entries(activeData.stages as Record<string, any[]>) : [];

  const totalRab = summary.reduce((s, p) => s + p.rab, 0);
  const totalReal = summary.reduce((s, p) => s + p.realisasi, 0);
  const totalDev = totalReal - totalRab;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Realisasi vs RAB</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analisis deviasi realisasi biaya terhadap RAB per proyek</p>
        </div>
        <Link href="/finance/upload">
          <button className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
            <Upload className="size-3.5" />
            Upload RAB
          </button>
        </Link>
      </div>

      {isEmpty && !isLoading && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data RAB belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file RAB di Upload Center untuk melihat analisis deviasi</p>
          <Link href="/finance/upload"><button className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90">Ke Upload Center</button></Link>
        </div>
      )}

      {/* Summary cards */}
      {!isEmpty && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1.5">Total RAB (semua proyek)</div>
            <div className="text-xl font-bold tabular-nums">{fmtRp(totalRab)}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1.5">Total Realisasi</div>
            <div className="text-xl font-bold tabular-nums">{fmtRp(totalReal)}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1.5">Deviasi Total</div>
            <div className={cn("text-xl font-bold tabular-nums", totalDev <= 0 ? "text-emerald-600" : "text-red-500")}>{fmtPct(totalRab > 0 ? (totalDev / totalRab) * 100 : 0)}</div>
          </div>
        </div>
      )}

      {/* Summary table by project */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Ringkasan per Proyek</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                {["Proyek","RAB","Realisasi","Deviasi (Rp)","Deviasi (%)","Status"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {summary.map((p: any) => (
                  <tr key={p.projectName} onClick={() => setActiveProject(p.projectName === activeProject ? null : p.projectName)}
                    className={cn("border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors",
                      activeProject === p.projectName ? "bg-muted/50" : "")}>
                    <td className="px-4 py-2.5 font-medium">{p.projectName}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtRp(p.rab)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtRp(p.realisasi)}</td>
                    <td className={cn("px-4 py-2.5 tabular-nums font-medium", p.deviasi <= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(Math.abs(p.deviasi))}</td>
                    <td className={cn("px-4 py-2.5 tabular-nums font-medium", p.deviasiPct <= 0 ? "text-emerald-600" : p.deviasiPct > 10 ? "text-red-500" : "text-amber-500")}>{fmtPct(p.deviasiPct)}</td>
                    <td className="px-4 py-2.5"><StatusBadge pct={p.deviasiPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeProject && <div className="px-4 py-2 text-xs text-muted-foreground border-t">Klik baris untuk melihat detail per tahap</div>}
        </div>
      )}

      {/* Detail per stage */}
      {activeProject && stages.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">{activeProject} — Detail per Tahap</h2>
          </div>
          <div className="p-4 flex gap-2 flex-wrap border-b">
            {stages.map(([stage]) => (
              <button key={stage} onClick={() => setActiveStage(stage === activeStage ? null : stage)}
                className={cn("text-xs px-2.5 py-1 rounded-md transition-colors",
                  activeStage === stage ? "bg-foreground text-background" : "border hover:bg-muted")}>
                {stage}
              </button>
            ))}
          </div>
          {activeStage && (() => {
            const items: any[] = stages.find(([s]) => s === activeStage)?.[1] ?? [];
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    {["Item Biaya","RAB","Realisasi","Deviasi (%)","Komentar AI"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className={cn("border-b last:border-0", item.deviasiPct > 10 ? "bg-red-50/50 dark:bg-red-950/10" : "")}>
                        <td className="px-4 py-2.5">{item.itemName}</td>
                        <td className="px-4 py-2.5 tabular-nums">{fmtRp(item.rab)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{fmtRp(item.realisasi)}</td>
                        <td className={cn("px-4 py-2.5 tabular-nums font-medium", item.deviasiPct <= 0 ? "text-emerald-600" : item.deviasiPct > 10 ? "text-red-500" : "text-amber-500")}>
                          {fmtPct(item.deviasiPct)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {item.deviasiPct > 10 ? `Over budget ${item.deviasiPct.toFixed(1)}%. Evaluasi penyebab.` : item.deviasiPct <= -5 ? "Efisiensi tercapai." : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
