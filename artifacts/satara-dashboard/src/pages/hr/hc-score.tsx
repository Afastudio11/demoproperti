import { apiJson } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

function ScoreBar({ label, score, weight, path }: { label: string; score: number; weight: string; path: string }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500";
  return (
    <Link href={path}>
      <div className="cursor-pointer hover:bg-muted/30 rounded-lg p-3 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground ml-2">bobot {weight}</span>
          </div>
          <span className={cn("text-sm font-bold", textColor)}>{score.toFixed(1)}/100</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {score >= 80 ? "✓ Excellent" : score >= 70 ? "✓ Good" : score >= 60 ? "⚠ Needs Improvement" : "✗ Poor"}
        </div>
      </div>
    </Link>
  );
}

function HCGaugeLarge({ score, status }: { score: number; status: string }) {
  const color = status === "SEHAT" ? "text-emerald-600" : status === "WASPADA" ? "text-amber-500" : "text-red-500";
  const bg = status === "SEHAT" ? "bg-emerald-50 border-emerald-200" : status === "WASPADA" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const pct = Math.min(score, 100);
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (pct / 100) * circumference;
  const strokeColor = status === "SEHAT" ? "#10b981" : status === "WASPADA" ? "#f59e0b" : "#ef4444";
  return (
    <div className={cn("rounded-xl border p-6 flex flex-col items-center justify-center gap-4", bg)}>
      <svg width={140} height={140} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={strokeColor} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 60 60)" />
        <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="bold" fill={strokeColor}>{score.toFixed(0)}</text>
        <text x="60" y="78" textAnchor="middle" fontSize="10" fill="#94a3b8">/100</text>
      </svg>
      <div className="text-center">
        <div className={cn("text-2xl font-bold", color)}>{status}</div>
        <div className="text-sm text-muted-foreground">Human Resource Score</div>
        <div className="text-xs text-muted-foreground mt-1">
          {status === "SEHAT" ? "Organisasi berjalan dengan SDM yang optimal" : status === "WASPADA" ? "Perlu perhatian pada beberapa dimensi HC" : "Intervensi mendesak dibutuhkan pada SDM"}
        </div>
      </div>
    </div>
  );
}

export default function HCScore() {
  const { data, isLoading } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => fetch("/api/hr/dashboard").then(apiJson),
    refetchInterval: 30000,
  });

  const hcScore = data?.hcScore ?? 0;
  const hcStatus = data?.hcStatus ?? "KRITIS";
  const bd = data?.hcBreakdown ?? {};

  const radarData = [
    { axis: "KPI", value: bd.kpiAchievement ?? 0 },
    { axis: "Produktivitas", value: bd.productivity ?? 0 },
    { axis: "Kompetensi", value: bd.competency ?? 0 },
    { axis: "Kultur", value: bd.culture ?? 0 },
    { axis: "Rekrutmen", value: bd.recruitment ?? 0 },
  ];

  const scoreItems = [
    { label: "KPI Achievement", score: bd.kpiAchievement ?? 0, weight: "30%", path: "/hr/performance" },
    { label: "Produktivitas Karyawan", score: bd.productivity ?? 0, weight: "20%", path: "/hr/produktivitas" },
    { label: "Kompetensi", score: bd.competency ?? 0, weight: "20%", path: "/hr/kompetensi" },
    { label: "Kultur & Disiplin", score: bd.culture ?? 0, weight: "15%", path: "/hr/kultur" },
    { label: "Rekrutmen & Headcount", score: bd.recruitment ?? 0, weight: "15%", path: "/hr/rekrutmen" },
  ];

  const recommendations: { level: string; text: string; path: string }[] = [];
  if ((bd.kpiAchievement ?? 0) < 70) recommendations.push({ level: "high", text: "KPI achievement rendah. Review target dan coaching karyawan.", path: "/hr/kpi/input" });
  if ((bd.productivity ?? 0) < 60) recommendations.push({ level: "high", text: "Produktivitas perlu ditingkatkan. Review proses kerja dan alokasi tugas.", path: "/hr/produktivitas" });
  if ((bd.competency ?? 0) < 70) recommendations.push({ level: "medium", text: "Gap kompetensi terdeteksi. Jadwalkan program training.", path: "/hr/training" });
  if ((bd.culture ?? 0) < 75) recommendations.push({ level: "medium", text: "Kultur dan disiplin kerja perlu penguatan.", path: "/hr/kultur" });
  if ((bd.recruitment ?? 0) < 80) recommendations.push({ level: "low", text: "Kebutuhan rekrutmen belum terpenuhi. Percepat proses hiring.", path: "/hr/rekrutmen" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Human Resource Score</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Skor komposit kesehatan SDM organisasi Satara Development</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* HC Score Gauge */}
        <div className="lg:col-span-1">
          {isLoading ? <div className="h-64 rounded-xl border bg-muted/30 animate-pulse" /> : <HCGaugeLarge score={hcScore} status={hcStatus} />}
        </div>

        {/* Radar Chart */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-4">
          <h3 className="font-medium text-sm mb-4">Profil HC Score per Dimensi</h3>
          {!isLoading && (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
                <Radar name="HC Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-4">Breakdown Skor per Dimensi</h3>
        <div className="space-y-1">
          {scoreItems.map(item => <ScoreBar key={item.label} {...item} />)}
        </div>
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Human Resource Score (Weighted)</span>
          <span className={cn("text-xl font-bold", hcScore >= 80 ? "text-emerald-600" : hcScore >= 60 ? "text-amber-600" : "text-red-500")}>{hcScore.toFixed(1)}/100</span>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-medium text-sm mb-3">Rekomendasi Intervensi</h3>
          <div className="space-y-2">
            {recommendations.map((r, i) => (
              <Link key={i} href={r.path}>
                <div className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:opacity-90", r.level === "high" ? "bg-red-50 border-red-200" : r.level === "medium" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200")}>
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5", r.level === "high" ? "bg-red-100 text-red-700" : r.level === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>{r.level === "high" ? "URGENT" : r.level === "medium" ? "PENTING" : "INFO"}</span>
                  <span className="text-sm">{r.text} <span className="text-xs text-muted-foreground ml-1">→ Lihat detail</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recommendations.length === 0 && !isLoading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 text-center">
          ✓ Semua dimensi Human Resource dalam kondisi baik. Pertahankan dan tingkatkan!
        </div>
      )}

      {/* Formula Explanation */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-3">Formula Human Resource Score</h3>
        <div className="text-sm font-mono bg-muted/50 rounded-lg p-3 text-center">HC Score = (KPI × 30%) + (Produktivitas × 20%) + (Kompetensi × 20%) + (Kultur × 15%) + (Rekrutmen × 15%)</div>
        <div className="grid grid-cols-5 gap-2 mt-3 text-xs text-center text-muted-foreground">
          {scoreItems.map(item => (
            <div key={item.label} className="border rounded-lg p-2">
              <div className={cn("text-lg font-bold mb-0.5", (bd[item.label.split(" ")[0].toLowerCase() as keyof typeof bd] as number) >= 80 ? "text-emerald-600" : "text-amber-600")}>{item.score.toFixed(0)}</div>
              <div className="leading-tight">{item.label}</div>
              <div className="text-blue-600 font-semibold mt-0.5">{item.weight}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
