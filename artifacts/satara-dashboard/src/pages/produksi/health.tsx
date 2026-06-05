import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

type DashboardData = {
  summary: { avgProgress: number; fasumAvg: number; pendingTotal: number; healthScore: number };
  subkonSnapshot: { progressAktual: number; velocity: number }[];
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "SEHAT" : score >= 60 ? "PERLU PERHATIAN" : "KRITIS";
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <div className="relative size-32">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 314} 314`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function ProduksiHealth() {
  const { data, isLoading } = useQuery({
    queryKey: ["produksi-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<DashboardData>;
    },
  });

  const s = data?.summary;
  const avgVelocity = (data?.subkonSnapshot?.length ?? 0) > 0
    ? data!.subkonSnapshot.reduce((sum, s) => sum + s.velocity, 0) / data!.subkonSnapshot.length
    : 0;

  const dims = [
    { name: "Progress Konstruksi", score: Math.round(s?.avgProgress ?? 0), bobot: "25%", desc: "Rata-rata progress semua unit", target: 100 },
    { name: "QC Score", score: 75, bobot: "20%", desc: "Rata-rata skor QC checklist", target: 90 },
    { name: "Fasum", score: Math.round(s?.fasumAvg ?? 0), bobot: "10%", desc: "Progress fasilitas umum", target: 100 },
    { name: "Termin Lancar", score: (s?.pendingTotal ?? 0) > 0 ? 70 : 95, bobot: "10%", desc: "Kelancaran pembayaran subkon", target: 95 },
    { name: "Material Siap", score: 80, bobot: "20%", desc: "Kesiapan material logistik", target: 90 },
    { name: "Subkon Performa", score: Math.min(100, Math.round(avgVelocity * 5)), bobot: "15%", desc: "Kinerja subkontraktor", target: 85 },
  ];

  const radarData = dims.map(d => ({ dimension: d.name.split(" ").slice(-1)[0], value: d.score, target: d.target }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Construction Health Score</h1>
        <p className="text-sm text-muted-foreground">Skor komprehensif kesehatan konstruksi dari 6 dimensi</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Menghitung health score...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Overall Health Score</CardTitle></CardHeader>
            <CardContent>
              <ScoreRing score={s?.healthScore ?? 0} />
              <div className="text-center text-xs text-muted-foreground mt-2">
                Dihitung dari 6 dimensi operasional produksi
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Radar Dimensi</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                  <Radar name="Aktual" dataKey="value" stroke="#e2a838" fill="#e2a838" fillOpacity={0.3} />
                  <Radar name="Target" dataKey="target" stroke="#6b7280" fill="transparent" strokeDasharray="3 3" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dims.map(d => {
              const gap = d.score - d.target;
              const color = d.score >= d.target * 0.9 ? "text-emerald-500" : d.score >= d.target * 0.7 ? "text-amber-500" : "text-red-500";
              return (
                <Card key={d.name}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{d.name}</span>
                      <span className="text-[10px] text-muted-foreground">{d.bobot}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xl font-bold ${color}`}>{d.score}</span>
                      <span className="text-xs text-muted-foreground">/ {d.target}</span>
                      {gap >= 0 ? <TrendingUp className="size-3.5 text-emerald-500 ml-auto" /> : gap >= -10 ? <Minus className="size-3.5 text-amber-500 ml-auto" /> : <TrendingDown className="size-3.5 text-red-500 ml-auto" />}
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${d.score >= d.target * 0.9 ? "bg-emerald-500" : d.score >= d.target * 0.7 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${d.score}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{d.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
