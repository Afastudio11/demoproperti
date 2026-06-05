import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { BarChart3, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

const fmtPct = (n: number) => `${Math.round(n)}%`;

type ProjectRow = { projectId: number; projectName: string; totalUnits: number; avgProgress: number; deviation: number; status: string; stages: { stageCode: string; unitCount: number; avgProgress: number; status: string }[] };

export default function ProgressProyek() {
  const { data, isLoading } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/progress/summary");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ProjectRow[]>;
    },
  });

  const statusIcon = (s: string) => s === "on_track" ? <TrendingUp className="size-3.5 text-emerald-500" /> : s === "warning" ? <Minus className="size-3.5 text-amber-500" /> : <TrendingDown className="size-3.5 text-red-500" />;
  const statusColor = (s: string) => s === "on_track" ? "text-emerald-600" : s === "warning" ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Progress Per Proyek</h1>
        <p className="text-sm text-muted-foreground">Ringkasan kemajuan konstruksi di level proyek dan tahap</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data proyek...</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Belum ada proyek aktif.</div>
      ) : (
        <div className="space-y-4">
          {data!.map(proj => (
            <Card key={proj.projectId}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(proj.status)}
                    <CardTitle className="text-sm">{proj.projectName}</CardTitle>
                    <span className={`text-xs ${statusColor(proj.status)}`}>
                      {proj.status === "on_track" ? "On Track" : proj.status === "warning" ? "Warning" : "Delayed"}
                    </span>
                  </div>
                  <Link href="/produksi/progress/tahap" className="text-xs text-muted-foreground flex items-center gap-0.5">Per Tahap <ChevronRight className="size-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${proj.avgProgress >= 95 ? "bg-emerald-500" : proj.avgProgress >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${proj.avgProgress}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-12 text-right">{fmtPct(proj.avgProgress)}</span>
                  <span className="text-xs text-muted-foreground w-24">{proj.totalUnits} unit</span>
                </div>

                {proj.stages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {proj.stages.map(stage => (
                      <div key={stage.stageCode} className="rounded-md bg-muted/40 px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{stage.stageCode}</span>
                          <span className="text-[10px] text-muted-foreground">{stage.unitCount} unit</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${stage.avgProgress >= 90 ? "bg-emerald-500" : stage.avgProgress >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${stage.avgProgress}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{fmtPct(stage.avgProgress)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
