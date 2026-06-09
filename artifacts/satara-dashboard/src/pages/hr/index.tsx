import { apiJson } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, TrendingUp, AlertTriangle, DollarSign, Activity, Target, Star, UserX, Briefcase, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function pct(n: number) { return `${n.toFixed(1).replace(".", ",")}%`; }

function HCGauge({ score, status }: { score: number; status: string }) {
  const color = status === "SEHAT" ? "text-emerald-600" : status === "WASPADA" ? "text-amber-500" : "text-red-500";
  const bg = status === "SEHAT" ? "bg-emerald-50 border-emerald-200" : status === "WASPADA" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <div className={cn("rounded-xl border p-5 flex items-center gap-6", bg)}>
      <div className="text-center">
        <div className={cn("text-5xl font-bold tabular-nums", color)}>{score}</div>
        <div className="text-sm text-muted-foreground mt-1">/ 100</div>
      </div>
      <div>
        <span className={cn("text-lg font-semibold", color)}>{status}</span>
        <p className="text-xs text-muted-foreground mt-1">Human Resource Score</p>
      </div>
    </div>
  );
}

const QUADRANT_LABELS = [
  { x: 75, y: 75, label: "Rising Star", color: "#10b981" },
  { x: 75, y: 25, label: "Solid Performer", color: "#3b82f6" },
  { x: 25, y: 75, label: "Needs Dev.", color: "#f59e0b" },
  { x: 25, y: 25, label: "Underperformer", color: "#ef4444" },
];

const CustomDot = (props: any) => {
  const { cx, cy } = props;
  return <circle cx={cx} cy={cy} r={5} fill="#6366f1" stroke="#fff" strokeWidth={1.5} />;
};

export default function HRDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => fetch("/api/hr/dashboard").then(apiJson),
    refetchInterval: 30000,
  });

  const hcScore = data?.hcScore ?? 0;
  const hcStatus = data?.hcStatus ?? "KRITIS";
  const bd = data?.hcBreakdown ?? {};
  const talentMap: any[] = data?.talentMap ?? [];
  const workloads: any[] = data?.workloads ?? [];
  const expansion: any[] = data?.expansionByProject ?? [];
  const flightRisks: any[] = data?.flightRiskAlerts ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">HR — Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Satara Human Resource Management System</p>
        </div>
        <Link href="/hr/organisasi">
          <button className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Users className="size-3.5" />
            Data Karyawan
          </button>
        </Link>
      </div>

      {/* HC Score */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          {isLoading ? <div className="h-24 rounded-xl border bg-muted/30 animate-pulse" /> : <HCGauge score={hcScore} status={hcStatus} />}
        </div>
        <div className="sm:col-span-2 grid grid-cols-5 gap-2">
          {[
            { label: "KPI Achievement", key: "kpiAchievement", bobot: "30%" },
            { label: "Produktivitas", key: "productivity", bobot: "20%" },
            { label: "Kompetensi", key: "competency", bobot: "20%" },
            { label: "Kultur", key: "culture", bobot: "15%" },
            { label: "Rekrutmen", key: "recruitment", bobot: "15%" },
          ].map(({ label, key, bobot }) => (
            <div key={key} className="bg-card border rounded-xl p-3 flex flex-col justify-between">
              <div className="text-[10px] text-muted-foreground font-medium">{label}</div>
              <div className="text-xl font-bold tabular-nums">{isLoading ? "-" : `${(bd[key] ?? 0).toFixed(0)}`}<span className="text-xs font-normal">/100</span></div>
              <div className="text-[10px] text-muted-foreground">bobot {bobot}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Karyawan Aktif", val: isLoading ? "-" : data?.totalActive ?? 0, icon: Users, color: "text-foreground" },
          { label: "KPI Rata-rata", val: isLoading ? "-" : pct(data?.avgKpiAchievement ?? 0), icon: Target, color: "text-blue-600" },
          { label: "Top Performer", val: isLoading ? "-" : data?.topPerformer?.name ?? "-", icon: Star, color: "text-emerald-600", sub: data?.topPerformer ? `${data.topPerformer.score}/100` : "" },
          { label: "Bottom Performer", val: isLoading ? "-" : data?.bottomPerformer?.name ?? "-", icon: UserX, color: "text-red-500", sub: data?.bottomPerformer ? `${data.bottomPerformer.score}/100` : "" },
          { label: "Posisi Lowong", val: isLoading ? "-" : data?.openPositions ?? 0, icon: Briefcase, color: (data?.openPositions ?? 0) > 0 ? "text-amber-500" : "text-emerald-600" },
          { label: "Total Payroll", val: isLoading ? "-" : fmtRp(data?.totalPayroll ?? 0), icon: DollarSign, color: "text-foreground" },
          { label: "Revenue/Karyawan", val: isLoading ? "-" : fmtRp(data?.revenuePerEmployee ?? 0), icon: TrendingUp, color: "text-blue-600" },
          { label: "Ekspansi Siap", val: isLoading ? "-" : pct(data?.expansionReadiness ?? 0), icon: ArrowUpRight, color: "text-emerald-600" },
        ].map(({ label, val, icon: Icon, color, sub }: any) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 border rounded-lg px-2 py-1.5">
              <span className={cn("text-sm font-semibold", color)}>{val}</span>
            </div>
            {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Talent Map */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Talent Map</h3>
          </div>
          <Link href="/hr/talent-map"><span className="text-xs text-blue-600 hover:underline cursor-pointer">Lihat Penuh →</span></Link>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mb-2">
          {QUADRANT_LABELS.map(q => (
            <div key={q.label} className="flex items-center gap-1">
              <span className="size-2 rounded-full inline-block" style={{ background: q.color }} />
              {q.label}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" dataKey="performanceScore" domain={[0, 100]} name="Performance" label={{ value: "Performance Score", position: "insideBottom", offset: -5, fontSize: 10 }} tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="potentialScore" domain={[0, 100]} name="Potential" label={{ value: "Potential", angle: -90, position: "insideLeft", fontSize: 10 }} tick={{ fontSize: 10 }} />
            <ReferenceLine x={50} stroke="#e5e7eb" strokeDasharray="4 4" />
            <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border rounded-lg shadow p-2 text-xs">
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-muted-foreground">{d.division}</div>
                  <div>Performance: {d.performanceScore}</div>
                  <div>Potential: {d.potentialScore}</div>
                </div>
              );
            }} />
            <Scatter data={talentMap} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Workload + Expansion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workload Summary */}
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Workload Summary</h3>
            <Link href="/hr/workload"><span className="ml-auto text-xs text-blue-600 hover:underline cursor-pointer">Detail →</span></Link>
          </div>
          {workloads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada data workload bulan ini</p>
          ) : (
            <div className="space-y-2">
              {workloads.map((w: any) => {
                const ratio = Number(w.capacity) > 0 ? (Number(w.actualLoad) / Number(w.capacity)) * 100 : 0;
                const status = ratio > 120 ? "Critical" : ratio > 100 ? "Overloaded" : ratio >= 80 ? "Normal" : "Underloaded";
                const barColor = ratio > 120 ? "bg-red-500" : ratio > 100 ? "bg-amber-500" : ratio >= 80 ? "bg-emerald-500" : "bg-blue-400";
                return (
                  <div key={w.id} className={cn("rounded-lg border p-2", ratio > 120 ? "border-red-200 bg-red-50" : ratio > 100 ? "border-amber-200 bg-amber-50" : "")}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{w.division}</span>
                      <span className={cn("font-semibold", ratio > 120 ? "text-red-600" : ratio > 100 ? "text-amber-600" : "text-muted-foreground")}>{ratio.toFixed(0)}% — {status}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(ratio, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expansion Readiness */}
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Expansion Readiness per Proyek</h3>
            <Link href="/hr/ekspansi"><span className="ml-auto text-xs text-blue-600 hover:underline cursor-pointer">Detail →</span></Link>
          </div>
          {expansion.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada data kebutuhan ekspansi</p>
          ) : (
            <div className="space-y-2">
              {expansion.map((e: any) => (
                <div key={e.project} className="flex items-center justify-between text-xs border rounded-lg p-2">
                  <span className="font-medium">{e.project}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{e.available}/{e.needed} posisi siap</span>
                    <span className={cn("font-semibold px-2 py-0.5 rounded-full text-[11px]", e.readinessPct >= 80 ? "bg-emerald-100 text-emerald-700" : e.readinessPct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{e.readinessPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flight Risk Alerts */}
      {flightRisks.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="font-medium text-sm">Flight Risk Alerts</h3>
            <Link href="/hr/flight-risk"><span className="ml-auto text-xs text-blue-600 hover:underline cursor-pointer">Lihat Semua →</span></Link>
          </div>
          <div className="space-y-2">
            {flightRisks.map((f: any) => (
              <div key={f.id} className={cn("flex items-center justify-between text-xs border rounded-lg p-2", f.riskLevel === "high" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                <div>
                  <span className="font-semibold">{f.employeeName}</span>
                  <span className="text-muted-foreground ml-2">{f.employeeDivision}</span>
                </div>
                <span className={cn("font-semibold px-2 py-0.5 rounded-full", f.riskLevel === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{f.riskLevel === "high" ? "High Risk" : "Medium Risk"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-3">Menu Cepat</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
          {[
            { label: "Organisasi", path: "/hr/organisasi" },
            { label: "Rekrutmen", path: "/hr/rekrutmen" },
            { label: "KPI", path: "/hr/kpi/definisi" },
            { label: "Performance", path: "/hr/performance" },
            { label: "Kompetensi", path: "/hr/kompetensi" },
            { label: "Training", path: "/hr/training" },
            { label: "Karir", path: "/hr/karir" },
            { label: "Kompensasi", path: "/hr/kompensasi" },
            { label: "Produktivitas", path: "/hr/produktivitas" },
            { label: "Suksesi", path: "/hr/suksesi" },
            { label: "Kultur", path: "/hr/kultur" },
            { label: "Workload", path: "/hr/workload" },
            { label: "Ekspansi", path: "/hr/ekspansi" },
            { label: "Talent Map", path: "/hr/talent-map" },
            { label: "Flight Risk", path: "/hr/flight-risk" },
            { label: "HC Score", path: "/hr/hc-score" },
            { label: "Absensi", path: "/hr/absensi" },
            { label: "Lembur", path: "/hr/lembur" },
            { label: "Masalah Individu", path: "/hr/masalah" },
          ].map(({ label, path }) => (
            <Link key={path} href={path}>
              <div className="flex items-center justify-center p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer text-xs font-medium text-center leading-tight h-10">{label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
