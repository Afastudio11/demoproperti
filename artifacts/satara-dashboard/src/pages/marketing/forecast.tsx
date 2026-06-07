import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

const ADJUSTMENTS = [
  { label: "Ada Campaign Besar", value: 0.20 },
  { label: "Ada Promo / Diskon", value: 0.10 },
  { label: "Masa Lebaran (turun)", value: -0.15 },
  { label: "Akhir Tahun (naik)", value: 0.10 },
  { label: "Kondisi Normal", value: 0 },
];

export default function ForecastPage() {
  const [selectedAdj, setSelectedAdj] = useState(4);
  const [manualAdj, setManualAdj] = useState("0");

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["marketing-leads"],
    queryFn: () => fetch("/api/marketing/leads").then(r => r.json()),
  });

  const bookings = (leads as any[]).filter(l => l.status === "BOOKING");
  const grouped: Record<string, number> = {};
  bookings.forEach(l => {
    const month = l.createdAt?.slice(0, 7) ?? "";
    grouped[month] = (grouped[month] ?? 0) + 1;
  });

  const months = Object.keys(grouped).sort();
  const aktualData = months.map(m => ({ bulan: m, aktual: grouped[m], forecast: null as number | null }));

  const avgBooking = months.length > 0
    ? Math.round(months.reduce((s, m) => s + grouped[m], 0) / months.length)
    : 5;

  const adjFactor = 1 + ADJUSTMENTS[selectedAdj].value + parseFloat(manualAdj || "0") / 100;
  const forecastBase = Math.max(1, Math.round(avgBooking * adjFactor));

  const now = new Date();
  const forecastMonths: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    forecastMonths.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  const forecast = forecastBase;
  const forecastData = forecastMonths.map((m, i) => ({
    bulan: m, aktual: null as number | null, forecast: Math.round(forecast * (1 + i * 0.02)),
  }));

  const chartData = [...aktualData, ...forecastData];
  const splitIdx = aktualData.length > 0 ? aktualData[aktualData.length - 1].bulan : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Demand Forecast</h1>
        <p className="text-xs text-muted-foreground">Proyeksi booking berdasarkan tren historis dengan faktor penyesuaian</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg Booking / Bulan (Historis)", value: avgBooking, unit: "unit" },
          { label: "Faktor Penyesuaian", value: `${((adjFactor - 1) * 100).toFixed(0)}%`, unit: "" },
          { label: "Forecast Bulan Depan", value: forecastBase, unit: "unit", highlight: true },
        ].map(({ label, value, unit, highlight }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}<span className="text-xs text-muted-foreground ml-1">{unit}</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Faktor Penyesuaian</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-2 block">Pilih Faktor</Label>
              <div className="space-y-1.5">
                {ADJUSTMENTS.map((adj, i) => (
                  <button key={i} onClick={() => setSelectedAdj(i)}
                    className={`w-full text-left text-xs px-3 py-1.5 rounded border transition-colors ${selectedAdj === i ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted"}`}>
                    {adj.label} ({adj.value >= 0 ? "+" : ""}{(adj.value * 100).toFixed(0)}%)
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Penyesuaian Manual (%)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-8 text-xs w-24" value={manualAdj} onChange={e => setManualAdj(e.target.value)} placeholder="0" />
                <span className="text-xs text-muted-foreground">% (positif/negatif)</span>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Rata-rata historis</p>
                <p className="text-2xl font-bold mt-1">{avgBooking} <span className="text-sm font-normal">unit/bulan</span></p>
                <p className="text-xs text-muted-foreground mt-1">x {adjFactor.toFixed(2)} = <span className="font-semibold text-foreground">{forecastBase} unit forecast</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Aktual vs Forecast Booking (Bulanan)</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Belum ada data booking untuk ditampilkan</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {splitIdx && <ReferenceLine x={splitIdx} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 2" label={{ value: "Sekarang", fontSize: 9 }} />}
                <Line type="monotone" dataKey="aktual" name="Aktual" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" connectNulls={false} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
