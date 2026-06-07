import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Trophy, Users, TrendingUp } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function SalesPerformancePage() {
  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ["marketing-sales-performance"],
    queryFn: () => fetch("/api/marketing/sales-performance").then(r => r.json()),
  });

  const topSales = (sales as any[])[0];
  const totalBooking = (sales as any[]).reduce((s, r) => s + r.booking, 0);
  const totalLeads = (sales as any[]).reduce((s, r) => s + r.leads, 0);

  const chartData = (sales as any[]).slice(0, 10).map(s => ({ nama: s.nama.split(" ")[0], Booking: s.booking, Survey: s.survey, Berkas: s.berkas }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Sales Performance</h1>
        <p className="text-xs text-muted-foreground">Performa tim sales dari data lead management</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Sales Aktif", value: (sales as any[]).length, icon: Users },
          { label: "Total Booking", value: totalBooking, icon: Trophy },
          { label: "Total Leads Ditangani", value: totalLeads, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {topSales && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex items-center gap-3">
          <Trophy className="size-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-700">Top Sales: {topSales.nama}</span>
            <span className="text-amber-600 ml-2">{topSales.booking} booking | Productivity Score: {topSales.productivity}</span>
          </div>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Rank","PIC Sales","Leads","Survey","Booking","Berkas","Survey Rate","Booking Rate","Berkas Rate","Productivity Score"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Memuat data dari lead management...</td></tr>
              ) : (sales as any[]).length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Belum ada data lead dengan PIC Sales terisi</td></tr>
              ) : (sales as any[]).map((s, i) => (
                <tr key={s.nama} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <span className={cn("font-bold", i === 0 ? "text-amber-600" : i === 1 ? "text-zinc-500" : i === 2 ? "text-orange-600" : "text-muted-foreground")}>
                      #{i+1}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{s.nama}</td>
                  <td className="px-3 py-2">{s.leads}</td>
                  <td className="px-3 py-2">{s.survey}</td>
                  <td className="px-3 py-2 font-semibold">{s.booking}</td>
                  <td className="px-3 py-2">{s.berkas}</td>
                  <td className="px-3 py-2">{s.surveyRate}%</td>
                  <td className="px-3 py-2">{s.bookingRate}%</td>
                  <td className="px-3 py-2">{s.berkasRate}%</td>
                  <td className="px-3 py-2">
                    <span className={cn("font-semibold px-2 py-0.5 rounded border text-[10px]", scoreBg(s.productivity), scoreColor(s.productivity))}>
                      {s.productivity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ranking Booking per Sales</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="nama" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="Booking" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
                <Bar dataKey="Survey" fill="hsl(var(--muted-foreground))" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
