import { useQuery } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useGetDashboardAlerts,
  useGetDashboardCashflow,
  useListLandProspects,
  useListLegalDocuments,
  useListHandovers,
} from "@workspace/api-client-react";
import SulselAcquisitionMap from "@/components/sulsel-acquisition-map";
import {
  AlertCircle, TrendingUp, TrendingDown, Users, Building, Activity,
  FilePlus, UserPlus, MapPin, Search, Target, BarChart3, DollarSign,
  HardHat, Package, Shield, FileText, Handshake, Brain, ChevronRight,
  AlertTriangle, CheckCircle2, Star, UserX, Landmark, Key, Clock,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KABUPATEN_DATA, getGradeLabel, getGradeBg, getGradeColor } from "@/data/slis-scoring";
import { fmtCurrency } from "@/lib/planning-calc";

/* ─── helpers ─── */
const fmtRp = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};
const fmtPct = (n: number) => `${Math.round(n)}%`;

const LEVEL_COLOR: Record<string, string> = {
  red: "bg-red-500", yellow: "bg-amber-400", green: "bg-emerald-400",
  kritis: "bg-red-500", warning: "bg-amber-400",
};

const STAGE_LABEL: Record<string, string> = {
  prospek_baru: "Prospek", survey: "Survey", analisis_kompetitor: "Analisis",
  negosiasi: "Negosiasi", legal_checking: "Legal", pks_mou: "PKS/MoU", ditolak: "Ditolak",
};

const TOP_KAB = [...KABUPATEN_DATA].sort((a, b) => b.score - a.score).slice(0, 8);

/* ─── sub-components ─── */
function StatCard({ title, value, icon: Icon, trend, change, sub, color }: {
  title: string; value: string | number; icon: React.ElementType;
  trend?: "up" | "down"; change?: number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{title}</span>
        <Icon className={cn("size-4", color ?? "text-muted-foreground")} />
      </div>
      <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className={cn("text-2xl sm:text-3xl font-medium tracking-tight", color)}>{value ?? "-"}</span>
          <div className="flex items-center gap-3">
            <div className="h-9 w-px bg-border" />
            {trend && change !== undefined ? (
              <div className={cn("flex items-center gap-1.5", trend === "up" ? "text-green-400" : "text-pink-400")}>
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

function ModuleCard({ title, icon: Icon, href, children, badge }: {
  title: string; icon: React.ElementType; href: string; children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{title}</h3>
          {badge && <Badge className="text-[10px] h-4 px-1.5 bg-red-100 text-red-700 border-red-200">{badge}</Badge>}
        </div>
        <Link href={href}>
          <span className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
            Detail <ChevronRight className="size-3" />
          </span>
        </Link>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-base font-bold", color ?? "text-foreground")}>{value}</span>
    </div>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;
  return (
    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
      <div className={cn("h-full rounded transition-all flex items-center px-1", color)} style={{ width: `${pct}%` }}>
        {value > 0 && <span className="text-[9px] font-bold text-white">{value}</span>}
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
          <span className="font-medium">{typeof entry.value === "number" && entry.value > 1_000_000
            ? fmtRp(entry.value)
            : entry.value?.toLocaleString("id-ID")}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreChip({ score, label }: { score: number; label?: string }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold", color)}>
      {score}{label ?? ""}
    </span>
  );
}

/* ─── MAIN PAGE ─── */
export default function Dashboard() {
  const [, navigate] = useLocation();

  /* Existing queries */
  const { data: summary } = useGetDashboardSummary();
  const { data: alerts } = useGetDashboardAlerts();
  const { data: cashflow } = useGetDashboardCashflow();
  const { data: prospects } = useListLandProspects({});
  const { data: legalDocs } = useListLegalDocuments({});
  const { data: handovers } = useListHandovers({});

  /* Module dashboards */
  const { data: adminData } = useQuery({
    queryKey: ["administrasi-dashboard"],
    queryFn: () => fetch("/api/administrasi/dashboard").then(r => r.json()),
    refetchInterval: 60000,
  });
  const { data: prodData } = useQuery({
    queryKey: ["produksi-dashboard"],
    queryFn: () => fetch("/api/produksi/dashboard").then(r => r.json()),
    refetchInterval: 60000,
  });
  const { data: hrData } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => fetch("/api/hr/dashboard").then(r => r.json()),
    refetchInterval: 60000,
  });
  const { data: finData } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: () => fetch("/api/finance/dashboard").then(r => r.json()),
    refetchInterval: 60000,
  });
  const { data: feasibilities } = useQuery({
    queryKey: ["planning-feasibility"],
    queryFn: () => fetch("/api/planning/feasibility").then(r => r.json()),
  });
  const { data: milestones } = useQuery({
    queryKey: ["planning-milestones"],
    queryFn: () => fetch("/api/planning/milestones").then(r => r.json()),
  });
  const { data: mktLeads } = useQuery({
    queryKey: ["marketing-leads"],
    queryFn: () => fetch("/api/marketing/leads").then(r => r.json()),
  });
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  /* ── Derived data ── */

  // Land / Akuisisi
  const prospectsArr = prospects ?? [];
  const totalSurvey = prospectsArr.filter((p: any) => p.status !== "prospek_baru").length;
  const totalAkuisisi = prospectsArr.filter((p: any) => p.status === "pks_mou").length;
  const pipelineGroups = Object.entries(STAGE_LABEL)
    .filter(([k]) => k !== "ditolak")
    .map(([key, label]) => ({
      key, label,
      count: prospectsArr.filter((p: any) => p.status === key).length,
    }));
  const maxPipeCount = Math.max(...pipelineGroups.map(g => g.count), 1);

  // Planning / Perencanaan
  const feasArr = Array.isArray(feasibilities) ? feasibilities : [];
  const msArr = Array.isArray(milestones) ? milestones : [];
  const projArr = Array.isArray(projects) ? projects : [];
  const goCount = feasArr.filter((f: any) => (f.roi ?? 0) >= 35 && (f.irr ?? 0) >= 20 && (f.margin ?? 0) >= 25).length;
  const totalRevenue = feasArr.reduce((s: number, f: any) => s + (f.totalRevenue ?? 0), 0);
  const totalPlanUnits = feasArr.reduce((s: number, f: any) => s + (f.totalUnits ?? 0), 0);
  const totalProfit = feasArr.reduce((s: number, f: any) => s + (f.grossProfit ?? 0), 0);
  const overdueMs = msArr.filter((m: any) => m.status === "terlambat").length;
  const planWarnings: { project: string; detail: string; severity: "red" | "amber" }[] = [];
  msArr.filter((m: any) => m.status === "terlambat").forEach((m: any) => {
    const proj = projArr.find((p: any) => p.id === m.projectId);
    planWarnings.push({ project: proj?.nama ?? `Proyek #${m.projectId}`, detail: `${m.taskName} terlambat`, severity: "amber" });
  });
  feasArr.forEach((f: any) => {
    if ((f.roi ?? 0) > 0 && (f.roi ?? 0) < 25) {
      const proj = projArr.find((p: any) => p.id === f.projectId);
      planWarnings.push({ project: proj?.nama ?? `Proyek #${f.projectId}`, detail: `ROI ${f.roi?.toFixed(1)}% — di bawah 25%`, severity: (f.roi ?? 0) < 15 ? "red" : "amber" });
    }
  });

  // Marketing
  const leadsArr = Array.isArray(mktLeads) ? mktLeads : [];
  const LEAD_FUNNEL = [
    { key: "NEW_LEAD", label: "Lead Baru", color: "bg-slate-400" },
    { key: "CONTACTED", label: "Dihubungi", color: "bg-blue-400" },
    { key: "INTERESTED", label: "Minat", color: "bg-cyan-500" },
    { key: "SURVEY_DILAKUKAN", label: "Survey", color: "bg-amber-400" },
    { key: "BOOKING", label: "Booking", color: "bg-orange-500" },
    { key: "BERKAS_LENGKAP", label: "Berkas", color: "bg-emerald-500" },
  ];
  const maxLeadCount = Math.max(...LEAD_FUNNEL.map(s => leadsArr.filter((l: any) => l.status === s.key).length), 1);
  const bookingCount = leadsArr.filter((l: any) => l.status === "BOOKING" || l.status === "BERKAS_LENGKAP" || l.status === "DISERAHKAN_ADMIN").length;
  const convRate = leadsArr.length > 0 ? Math.round((bookingCount / leadsArr.length) * 100) : 0;
  const stagnanCount = leadsArr.filter((l: any) => l.flag === "stagnan").length;

  // Administrasi KPR
  const PIPE_STAGES = [
    { key: "MINAT", label: "Minat", color: "bg-blue-400" },
    { key: "PROSES_BERKAS", label: "Berkas", color: "bg-cyan-400" },
    { key: "SETOR_BANK", label: "Bank", color: "bg-yellow-400" },
    { key: "OTS", label: "OTS", color: "bg-amber-400" },
    { key: "SP3K", label: "SP3K", color: "bg-orange-400" },
    { key: "AKAD", label: "Akad", color: "bg-emerald-500" },
    { key: "HT_CAIR", label: "HT Cair", color: "bg-green-500" },
  ];
  const pipeCounts: Record<string, number> = adminData?.pipelineCounts ?? {};
  const maxPipeAdmin = Math.max(...PIPE_STAGES.map(s => pipeCounts[s.key] ?? 0), 1);

  // Produksi
  const prod = prodData?.summary ?? {};
  const critMat: any[] = prodData?.criticalMaterials ?? [];
  const prodAlerts: any[] = prodData?.alerts ?? [];

  // Finance
  const fin = finData ?? {};
  const finScore = fin.financeScore ?? 0;
  const finStatus = finScore >= 80 ? "SEHAT" : finScore >= 60 ? "WASPADA" : "KRITIS";
  const finAlerts: any[] = fin.alerts ?? [];

  // HR
  const hcScore = hrData?.hcScore ?? 0;
  const hcStatus = hrData?.hcStatus ?? "KRITIS";
  const flightRisks: any[] = hrData?.flightRiskAlerts ?? [];

  // Legal
  const legalArr = legalDocs ?? [];
  const legalApproved = legalArr.filter((d: any) => d.status === "approved").length;
  const legalPending = legalArr.filter((d: any) => d.status === "pending" || d.status === "in_progress").length;

  // Serah Terima
  const handoverArr = handovers ?? [];
  const bastCount = handoverArr.filter((h: any) => h.bastGenerated).length;
  const avgKepuasan = handoverArr.length > 0
    ? (handoverArr.reduce((s: number, h: any) => s + (h.skorKepuasan ?? 0), 0) / handoverArr.length).toFixed(1)
    : "—";

  /* ── Health scores for top strip ── */
  const moduleHealths = [
    { label: "Finance", score: finScore, href: "/finance" },
    { label: "Produksi", score: prod.healthScore ?? 0, href: "/produksi" },
    { label: "Admin KPR", score: adminData?.healthScore ?? 0, href: "/administrasi" },
    { label: "HR", score: hcScore, href: "/hr" },
    { label: "Marketing", score: leadsArr.length > 0 ? Math.min(100, Math.round(convRate * 5)) : 0, href: "/marketing" },
    { label: "Legal", score: legalArr.length > 0 ? Math.round((legalApproved / legalArr.length) * 100) : 0, href: "/legal" },
    { label: "Perencanaan", score: goCount > 0 ? Math.round((goCount / Math.max(feasArr.length, 1)) * 100) : 0, href: "/perencanaan" },
    { label: "Serah Terima", score: handoverArr.length > 0 ? Math.round((bastCount / handoverArr.length) * 100) : 0, href: "/serah-terima" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan operasional seluruh divisi Satara Development</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-1.5 bg-card hover:bg-card/80 border-border/50" onClick={() => navigate("/projects")}>
            <FilePlus className="size-4" />
            <span className="hidden sm:inline">Proyek Baru</span>
          </Button>
          <Button className="h-9 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50" onClick={() => navigate("/marketing/lead/new")}>
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Tambah Lead</span>
          </Button>
        </div>
      </div>

      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Proyek" value={summary?.totalProjects ?? "-"} icon={Building} />
        <StatCard title="Total Leads" value={summary?.totalLeads ?? "-"} icon={Users} />
        <StatCard title="Overall Progress" value={summary?.overallProgress ? `${Math.round(summary.overallProgress)}%` : "-"} icon={Activity} sub="Konstruksi" />
        <StatCard title="Projects at Risk" value={summary?.projectsAtRisk ?? 0} icon={AlertCircle}
          color={(summary?.projectsAtRisk ?? 0) > 0 ? "text-red-500" : undefined} />
      </div>

      {/* ── Module Health Strip ── */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Health Score per Divisi</h3>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {moduleHealths.map(({ label, score, href }) => {
            const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500";
            const bar = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-red-500";
            return (
              <Link key={label} href={href}>
                <div className="flex flex-col gap-1 cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                    <span className={cn("text-xs font-bold", color)}>{score || "—"}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${score}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Map + Alerts + Cashflow ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="font-medium text-sm">Peta Sulawesi Selatan — Sebaran Proyek & Prospek Lahan</h3>
          </div>
          <div className="px-3 pb-3 pt-2" style={{ height: 400 }}>
            <SulselAcquisitionMap readOnly />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-card text-card-foreground rounded-xl border">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-medium text-sm">Risk & Eskalasi</h3>
              <AlertCircle className="size-4 text-muted-foreground" />
            </div>
            <div className="p-4 space-y-3">
              {alerts?.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3">
                  <div className={cn("size-2 rounded-full mt-1.5 shrink-0", LEVEL_COLOR[alert.level] ?? "bg-muted-foreground")} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{alert.projectName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</div>
                  </div>
                </div>
              ))}
              {!alerts?.length && <p className="text-sm text-muted-foreground text-center py-2">Tidak ada risiko aktif</p>}
            </div>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border flex-1">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-medium text-sm">Cashflow Forecast</h3>
            </div>
            <div className="p-4">
              <div className="h-[160px]">
                {cashflow?.forecast?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashflow.forecast} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "oklch(0.708 0 0)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
                        tickFormatter={(v) => v >= 1e9 ? `${(v / 1e9).toFixed(0)}M` : `${(v / 1e6).toFixed(0)}jt`} />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} /><stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="income" stroke="#ec4899" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
                      <Area type="monotone" dataKey="expense" stroke="#06b6d4" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Memuat data...</div>}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-pink-500" /><span className="text-xs text-muted-foreground">Pendapatan</span></div>
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-400" /><span className="text-xs text-muted-foreground">Pengeluaran</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Module Command Centers ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="size-5" />
          <h2 className="text-base font-semibold">Command Center — Semua Divisi</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── PERENCANAAN ── */}
          <ModuleCard title="Perencanaan & Feasibility" icon={BarChart3} href="/perencanaan"
            badge={planWarnings.length > 0 ? `${planWarnings.length} warning` : undefined}>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniKpi label="Proyek Aktif" value={projArr.length} />
              <MiniKpi label="Total Unit" value={totalPlanUnits || "—"} />
              <MiniKpi label="Revenue Pipeline" value={totalRevenue > 0 ? fmtRp(totalRevenue) : "—"} color="text-emerald-600" />
              <MiniKpi label="Feasibility GO" value={goCount} color={goCount > 0 ? "text-emerald-600" : "text-muted-foreground"} />
            </div>
            {planWarnings.length > 0 ? (
              <div className="space-y-1.5">
                {planWarnings.slice(0, 3).map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={cn("size-1.5 rounded-full mt-1.5 shrink-0", w.severity === "red" ? "bg-red-500" : "bg-amber-400")} />
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium">{w.project}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">— {w.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                <span className="text-xs font-medium">Semua proyek on track</span>
              </div>
            )}
          </ModuleCard>

          {/* ── MARKETING ── */}
          <ModuleCard title="Marketing & Sales" icon={TrendingUp} href="/marketing"
            badge={stagnanCount > 0 ? `${stagnanCount} stagnan` : undefined}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniKpi label="Total Leads" value={leadsArr.length} />
              <MiniKpi label="Booking" value={bookingCount} color="text-orange-500" />
              <MiniKpi label="Konversi" value={`${convRate}%`} color={convRate >= 10 ? "text-emerald-600" : "text-amber-500"} />
            </div>
            <div className="space-y-1.5">
              {LEAD_FUNNEL.map(({ key, label, color }) => {
                const cnt = leadsArr.filter((l: any) => l.status === key).length;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-16 shrink-0">{label}</span>
                    <MiniBar value={cnt} max={maxLeadCount} color={color} />
                    <span className="text-[11px] font-semibold w-4 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </ModuleCard>

          {/* ── ADMINISTRASI KPR ── */}
          <ModuleCard title="Administrasi KPR" icon={FileText} href="/administrasi"
            badge={(adminData?.agingKritis ?? 0) > 0 ? `${adminData.agingKritis} kritis` : undefined}>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniKpi label="Total Aktif" value={adminData?.totalAktif ?? "—"} />
              <MiniKpi label="HT Bulan Ini" value={adminData?.htBulanIni ? fmtRp(adminData.htBulanIni) : "—"} color="text-emerald-600" />
              <MiniKpi label="Aging Warning" value={adminData?.agingWarning ?? "—"} color={(adminData?.agingWarning ?? 0) > 0 ? "text-amber-500" : undefined} />
              <MiniKpi label="Health" value={adminData?.healthScore ? `${adminData.healthScore}/100` : "—"}
                color={(adminData?.healthScore ?? 100) >= 70 ? "text-emerald-600" : "text-red-500"} />
            </div>
            <div className="space-y-1.5">
              {PIPE_STAGES.map(({ key, label, color }) => {
                const cnt = pipeCounts[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">{label}</span>
                    <MiniBar value={cnt} max={maxPipeAdmin} color={color} />
                    <span className="text-[11px] font-semibold w-4 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </ModuleCard>

          {/* ── PRODUKSI ── */}
          <ModuleCard title="Produksi & Konstruksi" icon={HardHat} href="/produksi"
            badge={prodAlerts.filter((a: any) => a.severity === "kritis").length > 0
              ? `${prodAlerts.filter((a: any) => a.severity === "kritis").length} kritis` : undefined}>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniKpi label="Avg Progress" value={fmtPct(prod.avgProgress ?? 0)} />
              <MiniKpi label="Fasum" value={fmtPct(prod.fasumAvg ?? 0)} color="text-blue-500" />
              <MiniKpi label="HT Tertahan" value={prodData?.htTertahan ? fmtRp(prodData.htTertahan) : "—"} color="text-red-500" />
              <MiniKpi label="Health" value={prod.healthScore ?? "—"}
                color={(prod.healthScore ?? 0) >= 80 ? "text-emerald-600" : (prod.healthScore ?? 0) >= 60 ? "text-amber-500" : "text-red-500"} />
            </div>
            {critMat.length > 0 ? (
              <div>
                <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Material Stok Kritis:</p>
                <div className="space-y-1">
                  {critMat.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <Package className="size-3 text-red-500 shrink-0" />
                      <span className="text-[11px] flex-1 truncate">{m.name}</span>
                      <span className="text-[10px] text-red-500 font-medium">{m.stokAktual} {m.satuan}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                <span className="text-xs font-medium">Semua stok material aman</span>
              </div>
            )}
            {prodAlerts.slice(0, 2).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2 mt-2">
                <div className={cn("size-1.5 rounded-full mt-1.5 shrink-0", LEVEL_COLOR[a.severity] ?? "bg-muted-foreground")} />
                <span className="text-[11px] text-muted-foreground line-clamp-1">{a.message}</span>
              </div>
            ))}
          </ModuleCard>

          {/* ── FINANCE ── */}
          <ModuleCard title="Finance & Accounting" icon={DollarSign} href="/finance"
            badge={finAlerts.filter((a: any) => a.level === "kritis").length > 0
              ? `${finAlerts.filter((a: any) => a.level === "kritis").length} kritis` : undefined}>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniKpi label="Finance Score"
                value={finScore ? `${finScore}/100` : "—"}
                color={finScore >= 80 ? "text-emerald-600" : finScore >= 60 ? "text-amber-500" : "text-red-500"} />
              <MiniKpi label="Net Cashflow"
                value={fin.netCashflow ? fmtRp(fin.netCashflow) : "—"}
                color={(fin.netCashflow ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"} />
              <MiniKpi label="Hutang JT"
                value={fin.hutangJatuhTempo ? fmtRp(fin.hutangJatuhTempo) : "—"}
                color={(fin.hutangJatuhTempo ?? 0) > 0 ? "text-red-500" : undefined} />
              <MiniKpi label="Outstanding KPP"
                value={fin.outstandingKpp ? fmtRp(fin.outstandingKpp) : "—"} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                finStatus === "SEHAT" ? "bg-emerald-100 text-emerald-700"
                : finStatus === "WASPADA" ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700")}>{finStatus}</span>
              <span className="text-xs text-muted-foreground">Status Keuangan</span>
            </div>
            {finAlerts.slice(0, 2).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2 mt-1.5">
                <div className={cn("size-1.5 rounded-full mt-1.5 shrink-0", a.level === "kritis" ? "bg-red-500" : "bg-amber-400")} />
                <span className="text-[11px] text-muted-foreground line-clamp-1">{a.message}</span>
              </div>
            ))}
            {finAlerts.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                <span className="text-xs font-medium">Tidak ada early warning aktif</span>
              </div>
            )}
          </ModuleCard>

          {/* ── HR ── */}
          <ModuleCard title="HR — Human Capital" icon={Users} href="/hr"
            badge={flightRisks.length > 0 ? `${flightRisks.length} flight risk` : undefined}>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniKpi label="HC Score"
                value={hcScore || "—"}
                color={hcScore >= 80 ? "text-emerald-600" : hcScore >= 60 ? "text-amber-500" : "text-red-500"} />
              <MiniKpi label="Karyawan Aktif" value={hrData?.totalActive ?? "—"} />
              <MiniKpi label="KPI Rata-rata" value={hrData?.avgKpiAchievement ? `${Math.round(hrData.avgKpiAchievement)}%` : "—"}
                color={(hrData?.avgKpiAchievement ?? 0) >= 80 ? "text-emerald-600" : "text-amber-500"} />
              <MiniKpi label="Eks. Readiness" value={hrData?.expansionReadiness ? `${Math.round(hrData.expansionReadiness)}%` : "—"} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                hcStatus === "SEHAT" ? "bg-emerald-100 text-emerald-700"
                : hcStatus === "WASPADA" ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700")}>{hcStatus}</span>
              <span className="text-xs text-muted-foreground">HR Status</span>
            </div>
            {flightRisks.length > 0 ? (
              <div>
                <p className="text-[10px] text-muted-foreground font-medium mb-1">Flight Risk Karyawan:</p>
                {flightRisks.slice(0, 2).map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mt-1">
                    <UserX className="size-3 text-red-500 shrink-0" />
                    <span className="text-[11px] truncate">{f.name ?? f.employeeName}</span>
                    <Badge className="text-[9px] h-3.5 px-1 bg-red-100 text-red-700 ml-auto shrink-0">Risiko Tinggi</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                <span className="text-xs font-medium">Tidak ada flight risk aktif</span>
              </div>
            )}
          </ModuleCard>

          {/* ── LEGAL ── */}
          <ModuleCard title="Legal & Perizinan" icon={Shield} href="/legal">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniKpi label="Total Dokumen" value={legalArr.length} />
              <MiniKpi label="Approved" value={legalApproved} color="text-emerald-600" />
              <MiniKpi label="Pending/Proses" value={legalPending} color={legalPending > 0 ? "text-amber-500" : undefined} />
            </div>
            {legalArr.length > 0 ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Legal Readiness</span>
                    <span>{legalArr.length > 0 ? Math.round((legalApproved / legalArr.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${legalArr.length > 0 ? (legalApproved / legalArr.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {legalArr.slice(0, 3).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <div className={cn("size-1.5 rounded-full shrink-0",
                        d.status === "approved" ? "bg-emerald-500" : d.status === "rejected" ? "bg-red-500" : "bg-amber-400")} />
                      <span className="text-[11px] flex-1 truncate">{d.docType ?? d.documentType ?? d.name}</span>
                      <span className="text-[10px] text-muted-foreground">{d.status}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Belum ada dokumen legal</p>
            )}
          </ModuleCard>

          {/* ── SERAH TERIMA ── */}
          <ModuleCard title="Serah Terima — BAST" icon={Handshake} href="/serah-terima">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniKpi label="Total Handover" value={handoverArr.length} />
              <MiniKpi label="BAST Terbit" value={bastCount} color="text-emerald-600" />
              <MiniKpi label="Rata-rata Kepuasan" value={`${avgKepuasan}/5`}
                color={Number(avgKepuasan) >= 4 ? "text-emerald-600" : "text-amber-500"} />
            </div>
            {handoverArr.length > 0 ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>BAST Completion</span>
                    <span>{handoverArr.length > 0 ? Math.round((bastCount / handoverArr.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${handoverArr.length > 0 ? (bastCount / handoverArr.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {handoverArr.slice(0, 3).map((h: any) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <div className={cn("size-1.5 rounded-full shrink-0", h.bastGenerated ? "bg-emerald-500" : "bg-muted-foreground")} />
                      <span className="text-[11px] flex-1 truncate">{h.unitCode ?? h.unitId}</span>
                      <span className="text-[10px] text-muted-foreground">{h.bastGenerated ? "BAST Terbit" : "Menunggu"}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
                Belum ada data serah terima
              </div>
            )}
          </ModuleCard>

        </div>
      </div>

      {/* ── CEO Land Intelligence — Modul 7 ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-5" />
            <h2 className="text-base font-semibold">CEO Land Intelligence — Modul 7</h2>
          </div>
          <Link href="/slis">
            <button className="flex items-center gap-1 text-[11px] text-foreground hover:text-foreground/70 font-medium transition-colors">
              Lihat SLIS Intelligence <span className="ml-0.5">→</span>
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Lahan Tersurvey", value: totalSurvey, icon: Search, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Lahan Akuisisi", value: totalAkuisisi, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Total Prospek Aktif", value: prospectsArr.length, icon: BarChart3, color: "text-foreground", bg: "bg-muted/30 border-border" },
            { label: "Prospek Negosiasi", value: prospectsArr.filter((p: any) => p.status === "negosiasi").length, icon: Target, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
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
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <h3 className="font-medium text-sm">Ranking Kabupaten Sulsel</h3>
              <span className="text-[10px] text-muted-foreground">SLIS — Top 8</span>
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
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <h3 className="font-medium text-sm">Pipeline Akuisisi</h3>
              <span className="text-[10px] text-muted-foreground">{prospectsArr.length} prospek total</span>
            </div>
            <div className="p-3 space-y-2">
              {pipelineGroups.map(({ key, label, count }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-24 shrink-0 truncate">{label}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className={cn("h-full rounded transition-all flex items-center px-1.5",
                        key === "pks_mou" ? "bg-emerald-500" : key === "legal_checking" ? "bg-orange-500"
                        : key === "negosiasi" ? "bg-amber-400" : key === "analisis_kompetitor" ? "bg-slate-500"
                        : key === "survey" ? "bg-blue-500" : "bg-slate-400")}
                      style={{ width: count > 0 ? `${Math.max((count / maxPipeCount) * 100, 8)}%` : "0%" }}>
                      {count > 0 && <span className="text-[9px] font-bold text-white">{count}</span>}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold w-4 text-right">{count}</span>
                </div>
              ))}
              {prospectsArr.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">Belum ada data prospek</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
