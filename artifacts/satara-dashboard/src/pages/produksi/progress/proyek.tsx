import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart3, ChevronRight } from "lucide-react";

const fmtPct = (n: number) => `${Math.round(n)}%`;

type ProjectRow = {
  projectId: number;
  projectName: string;
  totalUnits: number;
  avgProgress: number;
  targetProgress: number;
  deviation: number;
  status: string;
  stages: { stageCode: string; unitCount: number; avgProgress: number; status: string }[];
};

const statusLabel = (s: string) => s === "on_track" ? "On Track" : s === "warning" ? "Warning" : "Delayed";
const statusIcon = (s: string) =>
  s === "on_track" ? <TrendingUp className="size-3.5 text-emerald-500" /> :
  s === "warning" ? <Minus className="size-3.5 text-amber-500" /> :
  <TrendingDown className="size-3.5 text-red-500" />;
const statusColor = (s: string) => s === "on_track" ? "text-emerald-600" : s === "warning" ? "text-amber-600" : "text-red-600";
const barColor = (s: string) => s === "on_track" ? "#10b981" : s === "warning" ? "#f59e0b" : "#ef4444";

export default function ProgressProyek() {
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"list" | "chart">("list");

  const { data, isLoading } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/progress/summary");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ProjectRow[]>;
    },
  });

  const all = data ?? [];
  const filtered = filterStatus === "all" ? all : all.filter(p => p.status === filterStatus);

  const chartData = filtered.map(p => ({
    name: p.projectName.length > 15 ? p.projectName.substring(0, 15) + "..." : p.projectName,
    aktual: p.avgProgress,
    target: 100,
    status: p.status,
  }));

  const onTrack = all.filter(p => p.status === "on_track").length;
  const warning = all.filter(p => p.status === "warning").length;
  const delayed = all.filter(p => p.status === "delayed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Progress Per Proyek</h1>
          <p className="text-sm text-muted-foreground">Ringkasan kemajuan konstruksi di level proyek dan tahap</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("list")} className={`text-xs px-3 py-1.5 rounded border transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Daftar</button>
          <button onClick={() => setView("chart")} className={`text-xs px-3 py-1.5 rounded border transition-colors ${view === "chart" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <BarChart3 className="size-3.5 inline mr-1" />Chart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20 cursor-pointer" onClick={() => setFilterStatus(filterStatus === "on_track" ? "all" : "on_track")}>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">On Track</p>
            <p className="text-2xl font-bold text-emerald-500">{onTrack}</p>
            <p className="text-[10px] text-muted-foreground">proyek</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 cursor-pointer" onClick={() => setFilterStatus(filterStatus === "warning" ? "all" : "warning")}>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Warning</p>
            <p className="text-2xl font-bold text-amber-500">{warning}</p>
            <p className="text-[10px] text-muted-foreground">proyek</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 cursor-pointer" onClick={() => setFilterStatus(filterStatus === "delayed" ? "all" : "delayed")}>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Delayed</p>
            <p className="text-2xl font-bold text-red-500">{delayed}</p>
            <p className="text-[10px] text-muted-foreground">proyek</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} proyek ditampilkan</span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data proyek...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Belum ada proyek atau tidak ada unit konstruksi aktif.</div>
      ) : view === "chart" ? (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Progress Aktual vs Target per Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, filtered.length * 50)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[0, 3, 3, 0]} />
                <Bar dataKey="aktual" name="Aktual" radius={[0, 3, 3, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={barColor(entry.status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(proj => (
            <Card 
              key={proj.projectId}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setLocation(`/produksi/progress/tahap?projectId=${proj.projectId}`)}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(proj.status)}
                    <CardTitle className="text-sm">{proj.projectName}</CardTitle>
                    <span className={`text-xs font-medium ${statusColor(proj.status)}`}>{statusLabel(proj.status)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{proj.totalUnits} unit</span>
                    <Link 
                      href={`/produksi/progress/tahap?projectId=${proj.projectId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                    >
                      Per Tahap <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress Aktual</span>
                    <span className="font-semibold">{fmtPct(proj.avgProgress)}</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20" style={{ width: "100%" }} />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${proj.avgProgress >= 95 ? "bg-emerald-500" : proj.avgProgress >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                      style={{ width: `${proj.avgProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Deviasi dari target: <span className={proj.deviation > 20 ? "text-red-500 font-medium" : proj.deviation > 5 ? "text-amber-500" : "text-emerald-500"}>-{proj.deviation}%</span></span>
                    <span>Target: 100%</span>
                  </div>
                </div>

                {proj.stages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                    {proj.stages.map(stage => (
                      <div 
                        key={stage.stageCode}
                        className={`rounded-md px-3 py-2 cursor-pointer hover:bg-muted/70 transition-colors ${stage.avgProgress >= 100 ? "bg-emerald-500/10 border border-emerald-500/20" : stage.avgProgress > 0 ? "bg-muted/40" : "bg-muted/20 border border-dashed"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/produksi/progress/unit?projectId=${proj.projectId}&stageCode=${stage.stageCode}`);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">{stage.stageCode}</span>
                          <span className="text-[10px] text-muted-foreground">{stage.unitCount} unit</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                          <div className={`h-full rounded-full ${stage.avgProgress >= 100 ? "bg-emerald-500" : stage.avgProgress >= 60 ? "bg-blue-500" : stage.avgProgress > 0 ? "bg-amber-500" : "bg-muted-foreground/20"}`} style={{ width: `${stage.avgProgress}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums font-medium">
                          {stage.avgProgress >= 100 ? "Selesai" : stage.avgProgress > 0 ? fmtPct(stage.avgProgress) : "Land Bank"}
                        </span>
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
