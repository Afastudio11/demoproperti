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

type Unit = { id: number; blok: string; nomor: string; progress: number; weekStarted: number | null };

export default function AnalitikBaseline() {
  const { data: units } = useQuery({ queryKey: ["units-list"], queryFn: async () => { const r = await fetch("/api/units"); return r.json() as Promise<Unit[]>; } });

  const chartData = Array.from({ length: 8 }, (_, i) => {
    const week = i + 1;
    const activeUnits = (units ?? []).filter(u => u.weekStarted != null && u.weekStarted <= week);
    const avgProgress = activeUnits.length > 0 ? activeUnits.reduce((s, u) => s + u.progress, 0) / activeUnits.length : null;
    return { week: `Mgg ${week}`, baseline: BASELINE[week], actual: avgProgress != null ? Math.round(avgProgress) : null, count: activeUnits.length };
  });

  const unitsAhead = (units ?? []).filter(u => { if (!u.weekStarted) return false; const t = BASELINE[Math.min(8, u.weekStarted)] ?? 100; return u.progress >= t + 5; }).length;
  const unitsCritical = (units ?? []).filter(u => { if (!u.weekStarted) return false; const t = BASELINE[Math.min(8, u.weekStarted)] ?? 100; return u.progress <= t - 15; }).length;

  return (
    <div className="space-y-5">
      <div><h1 className="text-lg font-bold">Analitik Produksi</h1></div>
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {ANALITIK_TABS.map(t => (
          <Link key={t.path} href={t.path}>
            <button className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${t.path === "/produksi/analitik/baseline" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.name}</button>
          </Link>
        ))}
      </div>
      <div>
        <h2 className="text-base font-semibold mb-1">Baseline Tracker (8 Minggu)</h2>
        <p className="text-sm text-muted-foreground">Progress aktual vs kurva S baseline 8 minggu standar</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Ahead</p><p className="text-xl font-bold text-emerald-500">{unitsAhead} unit</p></CardContent></Card>
        <Card className="border-red-500/20"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Critical</p><p className="text-xl font-bold text-red-500">{unitsCritical} unit</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total Unit</p><p className="text-xl font-bold">{units?.length ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Kurva S — Baseline vs Aktual</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="baseline" stroke="#6b7280" strokeDasharray="5 5" name="Baseline Target" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#e2a838" strokeWidth={2} name="Aktual" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
