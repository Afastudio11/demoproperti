import { Badge } from "@/components/ui/badge";
import {
  useGetDashboardSummary,
  useGetDashboardAlerts,
  useGetDashboardCashflow,
  useListLandProspects,
} from "@workspace/api-client-react";
import SulselAcquisitionMap from "@/components/sulsel-acquisition-map";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  Activity,
  FilePlus,
  UserPlus,
  MapPin,
  Search,
  Target,
  BarChart3,
  BrainCircuit,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KABUPATEN_DATA, getGradeLabel, getGradeBg, getGradeColor } from "@/data/slis-scoring";
import { Link } from "wouter";

const LEVEL_COLOR: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-400",
};

const STAGE_LABEL: Record<string, string> = {
  prospek_baru: "Prospek",
  survey: "Survey",
  analisis_kompetitor: "Analisis",
  negosiasi: "Negosiasi",
  legal_checking: "Legal",
  pks_mou: "PKS/MoU",
  ditolak: "Ditolak",
};

function StatCard({
  title, value, icon: Icon, trend, change, sub,
}: {
  title: string; value: string | number; icon: React.ElementType;
  trend?: "up" | "down"; change?: number; sub?: string;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{title}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl sm:text-3xl font-medium tracking-tight">{value ?? "-"}</span>
          <div className="flex items-center gap-3">
            <div className="h-9 w-px bg-border" />
            {trend && change !== undefined ? (
              <div className={cn("flex items-center gap-1.5", trend === "up" ? "text-green-400" : "text-pink-400")}
                style={{ textShadow: trend === "up" ? "0 1px 6px rgba(68,255,118,0.25)" : "0 1px 6px rgba(255,68,193,0.25)" }}>
                {trend === "up" ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                <span className="text-sm font-medium">{change}%</span>
              </div>
            ) : sub ? (
              <div className="text-sm font-medium text-muted-foreground">{sub}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-md p-3 shadow-lg text-xs">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="font-medium">Rp{entry.value?.toLocaleString("id-ID")}</span>
        </div>
      ))}
    </div>
  );
}

const TOP_KAB = [...KABUPATEN_DATA].sort((a, b) => b.score - a.score).slice(0, 8);

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: alerts } = useGetDashboardAlerts();
  const { data: cashflow } = useGetDashboardCashflow();
  const { data: prospects } = useListLandProspects({});

  const totalSurvey = (prospects ?? []).filter(p => p.status !== "prospek_baru").length;
  const totalProspek = (prospects ?? []).filter(p => ["analisis_kompetitor", "negosiasi"].includes(p.status)).length;
  const totalAkuisisi = (prospects ?? []).filter(p => p.status === "pks_mou").length;
  const totalProspects = (prospects ?? []).length;

  const pipelineGroups = Object.entries(STAGE_LABEL)
    .filter(([k]) => k !== "ditolak")
    .map(([key, label]) => ({
      key, label,
      count: (prospects ?? []).filter(p => p.status === key).length,
    }));

  const maxCount = Math.max(...pipelineGroups.map(g => g.count), 1);

  return (
    <div className="space-y-6">
      {/* ── Section 1: Operational KPIs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan operasional Satara Development</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-1.5 bg-card hover:bg-card/80 border-border/50">
            <FilePlus className="size-4" />
            <span className="hidden sm:inline">Proyek Baru</span>
          </Button>
          <Button className="h-9 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50">
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Tambah Lead</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Proyek" value={summary?.totalProjects ?? "-"} icon={Building} trend="up" change={5} />
        <StatCard title="Total Leads" value={summary?.totalLeads ?? "-"} icon={Users} trend="up" change={12} />
        <StatCard title="Overall Progress" value={summary?.overallProgress ? `${Math.round(summary.overallProgress)}%` : "-"} icon={Activity} sub="Konstruksi" />
        <StatCard title="Projects at Risk" value={summary?.projectsAtRisk ?? 0} icon={AlertCircle} trend="down" change={2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="font-medium text-sm sm:text-base">Peta Sulawesi Selatan</h3>
          </div>
          <div className="px-3 pb-3 pt-2" style={{ height: 420 }}>
            <SulselAcquisitionMap readOnly />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card text-card-foreground rounded-xl border">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-medium text-sm sm:text-base">Risk & Eskalasi</h3>
              <AlertCircle className="size-4 text-muted-foreground" />
            </div>
            <div className="p-4 space-y-4">
              {alerts?.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3">
                  <div className={cn("size-2 rounded-full mt-1.5 shrink-0", LEVEL_COLOR[alert.level] ?? "bg-muted-foreground")} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{alert.projectName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</div>
                  </div>
                </div>
              ))}
              {!alerts?.length && <p className="text-sm text-muted-foreground text-center py-4">Tidak ada risiko aktif</p>}
            </div>
          </div>

          <div className="bg-card text-card-foreground rounded-xl border flex-1">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-medium text-sm sm:text-base">Cashflow Forecast</h3>
            </div>
            <div className="p-4">
              <div className="h-[180px]">
                {cashflow?.forecast && cashflow.forecast.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashflow.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "oklch(0.708 0 0)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
                        tickFormatter={(v) => v >= 1e9 ? `${(v / 1e9).toFixed(0)}M` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : String(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="income" stroke="#ec4899" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
                      <Area type="monotone" dataKey="expense" stroke="#06b6d4" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Memuat data...</div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-pink-500" /><span className="text-xs text-muted-foreground">Pendapatan</span></div>
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-400" /><span className="text-xs text-muted-foreground">Pengeluaran</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: MODUL 7 — CEO Dashboard Land Intelligence ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-foreground" />
            <h2 className="text-base font-semibold">CEO Land Intelligence — Modul 7</h2>
          </div>
          <Link href="/slis">
            <button className="flex items-center gap-1 text-[11px] text-foreground hover:text-foreground/70 font-medium transition-colors">
              Lihat SLIS Intelligence <span className="ml-0.5">→</span>
            </button>
          </Link>
        </div>

        {/* Land KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total Lahan Tersurvey", value: totalSurvey, icon: Search, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Total Lahan Prospek", value: totalProspek, icon: Target, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Total Lahan Akuisisi", value: totalAkuisisi, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Total Prospek Aktif", value: totalProspects, icon: BarChart3, color: "text-foreground", bg: "bg-muted/30 border-border" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={cn("rounded-xl border p-3", bg)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                <Icon className={cn("size-4", color)} />
              </div>
              <div className={cn("text-2xl font-black", color)}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kabupaten Ranking (SLIS Modul 1 Top 8) */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <h3 className="font-medium text-sm">Ranking Kabupaten Sulsel</h3>
              <span className="text-[10px] text-muted-foreground">Modul 1 — Top 8</span>
            </div>
            <div className="p-3 space-y-1.5">
              {TOP_KAB.map((kab, i) => (
                <div key={kab.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: getGradeColor(kab.grade) }} />
                  <span className="flex-1 text-[11px] font-medium truncate">{kab.name}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", getGradeBg(kab.grade))}>
                    {getGradeLabel(kab.grade)}
                  </span>
                  <span className="text-[12px] font-black w-8 text-right">{kab.score}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${kab.score}%`, backgroundColor: getGradeColor(kab.grade) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Akuisisi */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <h3 className="font-medium text-sm">Pipeline Akuisisi</h3>
              <span className="text-[10px] text-muted-foreground">{totalProspects} prospek total</span>
            </div>
            <div className="p-3 space-y-2">
              {pipelineGroups.map(({ key, label, count }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-24 shrink-0 truncate">{label}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className={cn("h-full rounded transition-all flex items-center px-1.5",
                        key === "pks_mou" ? "bg-emerald-500" :
                        key === "legal_checking" ? "bg-orange-500" :
                        key === "negosiasi" ? "bg-amber-400" :
                        key === "analisis_kompetitor" ? "bg-slate-500" :
                        key === "survey" ? "bg-blue-500" : "bg-slate-400"
                      )}
                      style={{ width: count > 0 ? `${Math.max((count / maxCount) * 100, 8)}%` : "0%" }}
                    >
                      {count > 0 && <span className="text-[9px] font-bold text-white">{count}</span>}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold w-4 text-right">{count}</span>
                </div>
              ))}
              {totalProspects === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">
                  Belum ada data prospek
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
