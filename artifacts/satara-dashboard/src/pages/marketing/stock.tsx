import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function coverageColor(m: number) {
  if (m < 3) return "text-red-600";
  if (m < 6) return "text-amber-600";
  return "text-emerald-600";
}

function coverageBg(m: number) {
  if (m < 3) return "border-red-200 bg-red-50";
  if (m < 6) return "border-amber-200 bg-amber-50";
  return "border-emerald-200 bg-emerald-50";
}

export default function StokCoveragePage() {
  const { data: dashboard } = useQuery<any>({
    queryKey: ["marketing-dashboard"],
    queryFn: () => fetch("/api/marketing/dashboard").then(r => r.json()),
  });

  const { data: absorptions = [] } = useQuery<any[]>({
    queryKey: ["marketing-absorption"],
    queryFn: () => fetch("/api/marketing/absorption").then(r => r.json()),
  });

  const totalSisa = (absorptions as any[]).reduce((s, a) => s + (a.sisa ?? 0), 0);
  const avgBookingPerBulan = dashboard?.forecastNextMonth ?? 1;
  const avgCoverage = dashboard?.coverageMonths ?? 0;
  const lowStock = (absorptions as any[]).filter(a => (a.coverageMonths ?? 0) < 3);
  const midStock = (absorptions as any[]).filter(a => (a.coverageMonths ?? 0) >= 3 && (a.coverageMonths ?? 0) < 6);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Stok & Sales Coverage</h1>
        <p className="text-xs text-muted-foreground">Berapa bulan stok unit yang tersisa berdasarkan laju penjualan</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className={cn("border-2", coverageBg(avgCoverage))}>
          <CardContent className="pt-5 text-center">
            <Package className={cn("size-6 mx-auto mb-2", coverageColor(avgCoverage))} />
            <p className="text-xs text-muted-foreground">Total Stok Sisa</p>
            <p className={cn("text-3xl font-bold mt-1", coverageColor(avgCoverage))}>{totalSisa}</p>
            <p className="text-[10px] text-muted-foreground mt-1">unit tersedia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <TrendingDown className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg Booking / Bulan</p>
            <p className="text-3xl font-bold mt-1">{dashboard?.bookingCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">unit</p>
          </CardContent>
        </Card>
        <Card className={cn("border-2", coverageBg(avgCoverage))}>
          <CardContent className="pt-5 text-center">
            <Clock className={cn("size-6 mx-auto mb-2", coverageColor(avgCoverage))} />
            <p className="text-xs text-muted-foreground">Coverage Rata-rata</p>
            <p className={cn("text-3xl font-bold mt-1", coverageColor(avgCoverage))}>{avgCoverage}</p>
            <p className="text-[10px] text-muted-foreground mt-1">bulan</p>
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-red-600 shrink-0" />
            <span className="text-xs font-semibold text-red-700">Alert Kritis — Coverage &lt; 3 Bulan</span>
          </div>
          {lowStock.map((a: any) => (
            <div key={a.id} className="text-xs text-red-600 ml-6">
              {a.projectName} {a.tahap}: {a.sisa} unit sisa, {a.coverageMonths} bulan coverage
            </div>
          ))}
        </div>
      )}

      {midStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-700">Perhatian — Coverage 3-6 Bulan</span>
          </div>
          {midStock.map((a: any) => (
            <div key={a.id} className="text-xs text-amber-700 ml-6">
              {a.projectName} {a.tahap}: {a.sisa} unit sisa, {a.coverageMonths} bulan coverage
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Stok & Coverage per Proyek/Tahap</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Proyek","Tahap","Total Unit","Terjual","Sisa","Booking/Bln","Coverage (Bulan)","Status"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(absorptions as any[]).length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Belum ada data absorpsi. Input di menu Absorpsi Proyek.</td></tr>
              ) : (absorptions as any[]).map((a: any) => {
                const months = a.coverageMonths ?? 0;
                return (
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{a.projectName}</td>
                    <td className="px-3 py-2">{a.tahap}</td>
                    <td className="px-3 py-2">{a.totalUnit}</td>
                    <td className="px-3 py-2">{a.unitTerjual}</td>
                    <td className="px-3 py-2 font-semibold">{a.sisa}</td>
                    <td className="px-3 py-2">{dashboard?.bookingCount ?? 0}</td>
                    <td className={cn("px-3 py-2 font-semibold", coverageColor(months))}>{months}</td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border",
                        months < 3 ? "bg-red-50 text-red-700 border-red-200" :
                        months < 6 ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                        {months < 3 ? "Kritis" : months < 6 ? "Sedang" : "Aman"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {avgCoverage < 3 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold">Rekomendasi AI:</p>
          <p className="text-xs text-muted-foreground">Coverage stok &lt; 3 bulan. Segera percepat akuisisi lahan atau jadwalkan launching tahap berikutnya untuk menghindari gap penjualan. Pertimbangkan program referral intensif untuk mempercepat absorpsi stok yang tersisa.</p>
        </div>
      )}
    </div>
  );
}
