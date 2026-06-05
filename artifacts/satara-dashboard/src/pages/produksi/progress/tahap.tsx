import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

const fmtPct = (n: number) => `${Math.round(n)}%`;
const BASELINE: Record<number, number> = { 1: 10, 2: 25, 3: 40, 4: 55, 5: 70, 6: 85, 7: 95, 8: 100 };

type Unit = { id: number; blok: string; nomor: string; tipe: string; progress: number; stageCode: string | null; weekStarted: number | null };
type ProjectRow = { projectId: number; projectName: string; units: Unit[] };

export default function ProgressTahap() {
  const [selectedProject, setSelectedProject] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/progress/summary");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ProjectRow[]>;
    },
  });

  const projects = data ?? [];
  const filtered = selectedProject === "all" ? projects : projects.filter(p => String(p.projectId) === selectedProject);

  const byStage = new Map<string, { units: (Unit & { projectName: string })[] }>();
  filtered.forEach(proj => {
    proj.units.forEach(u => {
      const key = u.stageCode ?? "Tanpa Tahap";
      const existing = byStage.get(key) ?? { units: [] };
      byStage.set(key, { units: [...existing.units, { ...u, projectName: proj.projectName }] });
    });
  });

  const stages = Array.from(byStage.entries()).sort(([a], [b]) => a.localeCompare(b));

  const getDeviation = (u: Unit) => {
    if (!u.weekStarted) return 0;
    const target = BASELINE[Math.min(8, u.weekStarted)] ?? 100;
    return Math.round(u.progress - target);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Progress Per Tahap</h1>
          <p className="text-sm text-muted-foreground">Kemajuan konstruksi dikelompokkan per tahap (T1, T2, T3...)</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projects.map(p => <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data...</div>
      ) : stages.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data tahap. Unit belum dikategorikan per tahap.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map(([stageCode, data]) => {
            const avg = data.units.reduce((s, u) => s + u.progress, 0) / data.units.length;
            const ahead = data.units.filter(u => getDeviation(u) >= 5).length;
            const critical = data.units.filter(u => getDeviation(u) <= -15).length;
            return (
              <Card key={stageCode}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{stageCode}</CardTitle>
                    <span className="text-xs text-muted-foreground">{data.units.length} unit</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Avg Progress</span>
                      <span className="font-semibold">{fmtPct(avg)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${avg >= 90 ? "bg-emerald-500" : avg >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${avg}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-emerald-500/10 rounded p-1.5">
                      <div className="font-bold text-emerald-600">{ahead}</div>
                      <div className="text-muted-foreground text-[10px]">Ahead</div>
                    </div>
                    <div className="bg-blue-500/10 rounded p-1.5">
                      <div className="font-bold text-blue-600">{data.units.length - ahead - critical}</div>
                      <div className="text-muted-foreground text-[10px]">On Track</div>
                    </div>
                    <div className="bg-red-500/10 rounded p-1.5">
                      <div className="font-bold text-red-600">{critical}</div>
                      <div className="text-muted-foreground text-[10px]">Critical</div>
                    </div>
                  </div>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {data.units.map(u => {
                      const dev = getDeviation(u);
                      return (
                        <div key={u.id} className="flex items-center gap-2 text-xs">
                          <Link href="/produksi/progress/unit" className="hover:underline">Blok {u.blok}-{u.nomor}</Link>
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${u.progress >= 90 ? "bg-emerald-500" : u.progress >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${u.progress}%` }} />
                          </div>
                          <span className="w-10 text-right tabular-nums">{fmtPct(u.progress)}</span>
                          <span className={`w-12 text-right tabular-nums text-[10px] ${dev >= 0 ? "text-emerald-500" : dev >= -5 ? "text-muted-foreground" : "text-red-500"}`}>
                            {dev >= 0 ? "+" : ""}{dev}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
