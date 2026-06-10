import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function ForecastCenter() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-forecast"],
    queryFn: () => fetch("/api/finance/forecast").then(r => r.json()),
    refetchInterval: 60000,
  });

  const forecastMonths: any[] = data?.forecastMonths ?? [];
  const hasNegative = data?.hasNegative ?? false;

  const totalForecastIn = forecastMonths.reduce((s, m) => s + m.forecastIn, 0);
  const totalForecastOut = forecastMonths.reduce((s, m) => s + m.forecastOut, 0);
  const totalForecastNet = totalForecastIn - totalForecastOut;
  const lastCumulative = forecastMonths[forecastMonths.length - 1]?.cumulative ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Forecast Cashflow</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Proyeksi cashflow 6 bulan ke depan berbasis data aktual</p>
      </div>

      {/* Status badge */}
      <div className={cn("rounded-xl border p-4 flex items-center gap-3",
        hasNegative ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800")}>
        {hasNegative
          ? <AlertTriangle className="size-5 text-red-500 shrink-0" />
          : <CheckCircle className="size-5 text-emerald-500 shrink-0" />}
        <div>
          <div className={cn("text-sm font-semibold", hasNegative ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300")}>
            {hasNegative ? "Peringatan: Ada proyeksi cashflow negatif" : "Cashflow diproyeksikan positif selama 6 bulan ke depan"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {hasNegative ? "Identifikasi bulan dengan proyeksi negatif dan rencanakan mitigasi." : "Kondisi keuangan dalam trajectory yang sehat."}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">Total Forecast Cash In (6 bln)</div>
          <div className="text-xl font-bold tabular-nums text-emerald-600">{fmtRp(totalForecastIn)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5">Total Forecast Cash Out (6 bln)</div>
          <div className="text-xl font-bold tabular-nums text-red-500">{fmtRp(totalForecastOut)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><TrendingUp className="size-3" />Kumulatif Akhir</div>
          <div className={cn("text-xl font-bold tabular-nums", lastCumulative >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(lastCumulative)}</div>
        </div>
      </div>

      {/* Chart */}
      {forecastMonths.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Proyeksi Net Cashflow per Bulan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastMonths}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-10" />
              <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}Jt`} />
              <Tooltip formatter={(v: number, k: string) => [fmtRp(v), k === "net" ? "Net Cashflow" : k === "cumulative" ? "Kumulatif" : k === "forecastIn" ? "Cash In" : "Cash Out"]} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="forecastIn" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 3" name="forecastIn" />
              <Line type="monotone" dataKey="forecastOut" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 3" name="forecastOut" />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="net" />
              <Line type="monotone" dataKey="cumulative" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" name="cumulative" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-emerald-500" />Cash In</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-red-500" />Cash Out</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-blue-500" />Net</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-purple-500" />Kumulatif</span>
          </div>
        </div>
      )}

      {/* Forecast table */}
      {forecastMonths.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Tabel Forecast 6 Bulan</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                {["Bulan","Forecast Cash In","Forecast Cash Out","Forecast Net","Kumulatif"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {forecastMonths.map((m: any) => (
                  <tr key={m.bulan} className={cn("border-b last:border-0", m.net < 0 ? "bg-red-50/50 dark:bg-red-950/10" : "")}>
                    <td className="px-4 py-2.5 font-medium">{m.bulan}{m.net < 0 && <AlertTriangle className="inline size-3 text-red-500 ml-1.5" />}</td>
                    <td className="px-4 py-2.5 tabular-nums text-emerald-600">{fmtRp(m.forecastIn)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-red-500">{fmtRp(m.forecastOut)}</td>
                    <td className={cn("px-4 py-2.5 tabular-nums font-semibold", m.net >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {m.net >= 0 ? "+" : ""}{fmtRp(m.net)}
                    </td>
                    <td className={cn("px-4 py-2.5 tabular-nums", m.cumulative >= 0 ? "text-blue-600" : "text-red-500")}>{fmtRp(m.cumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {forecastMonths.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <TrendingUp className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data untuk forecast belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1">Upload data piutang dan hutang untuk mendapatkan proyeksi cashflow</p>
        </div>
      )}
    </div>
  );
}
