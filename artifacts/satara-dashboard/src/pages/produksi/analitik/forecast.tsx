import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Link } from "wouter";

const ANALITIK_TABS = [
  { name: "Velocity", path: "/produksi/analitik/velocity" },
  { name: "Baseline", path: "/produksi/analitik/baseline" },
  { name: "Cost to Complete", path: "/produksi/analitik/cost-to-complete" },
  { name: "Cashflow Impact", path: "/produksi/analitik/cashflow-impact" },
  { name: "Produktivitas", path: "/produksi/analitik/produktivitas" },
  { name: "Eligibilitas", path: "/produksi/analitik/eligibilitas" },
  { name: "Forecast", path: "/produksi/analitik/forecast" },
];

const BASELINE: Record<number, number> = { 1: 10, 2: 25, 3: 40, 4: 55, 5: 70, 6: 85, 7: 95, 8: 100 };

type Unit = { id: number; progress: number; weekStarted: number | null };

export default function AnalitikForecast() {
  const { data: units } = useQuery({ queryKey: ["units-list"], queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; } });

  const activeUnits = (units ?? []).filter(u => u.weekStarted != null && u.progress < 100);
  const avgVelocityPerWeek = activeUnits.length > 0
    ? activeUnits.reduce((s, u) => {
        const w = u.weekStarted ?? 1;
        const target = BASELINE[Math.min(8, w)] ?? 100;
        const behind = Math.max(0, target - u.progress);
        return s + behind / 8;
      }, 0) / activeUnits.length
    : 15;

  const currentAvgProgress = activeUnits.length > 0 ? activeUnits.reduce((s, u) => s + u.progress, 0) / activeUnits.length : 0;

  const forecastData = Array.from({ length: 12 }, (_, i) => {
    const week = i + 1;
    const forecasted = Math.min(100, Math.round(currentAvgProgress + avgVelocityPerWeek * week));
    return { week: `+${week}W`, baseline: Math.min(100, BASELINE[Math.min(8, week)] ?? 100), forecast: forecasted, target: 100 };
  });

  const weeksToComplete = avgVelocityPerWeek > 0 ? Math.ceil((100 - currentAvgProgress) / avgVelocityPerWeek) : null;

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => <Link key={t.path} href={t.path}><button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/forecast" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button></Link>)}
      </div>
      <div><h2 className="text-base font-semibold mb-1">Production Forecast</h2><p className="text-sm text-muted-foreground">Proyeksi penyelesaian konstruksi berdasarkan velocity rata-rata</p></div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Progress Saat Ini</p><p className="text-xl font-bold">{Math.round(currentAvgProgress)}%</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Est. Velocity</p><p className="text-xl font-bold">{Math.round(avgVelocityPerWeek * 10) / 10}%/minggu</p></CardContent></Card>
        <Card className="border-primary/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Forecast Selesai</p><p className="text-xl font-bold text-primary">{weeksToComplete ? `+${weeksToComplete} minggu` : "N/A"}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Proyeksi Progress 12 Minggu ke Depan</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastData}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="forecast" stroke="#e2a838" strokeWidth={2} name="Forecast" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="baseline" stroke="#6b7280" strokeDasharray="4 4" name="Baseline" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
