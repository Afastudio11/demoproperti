import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Activity, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function CashflowCenter() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-cashflow"],
    queryFn: () => fetch("/api/finance/cashflow").then(r => r.json()),
    refetchInterval: 60000,
  });

  const chart: any[] = data?.chart ?? [];
  const cashIn = data?.cashInBulanIni ?? 0;
  const cashOut = data?.cashOutBulanIni ?? 0;
  const net = data?.netCashflow ?? 0;
  const cats: Record<string, number> = data?.categories ?? {};

  const isEmpty = chart.every(c => c.cashIn === 0 && c.cashOut === 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Cashflow Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring arus kas masuk dan keluar per periode</p>
        </div>
        <Link href="/finance/upload">
          <button className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
            <Upload className="size-3.5" />
            Upload Cashflow
          </button>
        </Link>
      </div>

      {isEmpty && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data cashflow belum diupload</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file Excel cashflow terlebih dahulu di Upload Center</p>
          <Link href="/finance/upload"><button className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90">Ke Upload Center</button></Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Cash In Bulan Ini", value: cashIn, icon: TrendingUp, positive: true },
          { label: "Cash Out Bulan Ini", value: cashOut, icon: TrendingDown, positive: false },
          { label: "Net Cashflow", value: net, icon: Activity, positive: net >= 0 },
          { label: "Rata-rata Net 3 Bulan", value: chart.slice(-3).reduce((s, c) => s + c.net, 0) / 3 || 0, icon: Activity, positive: true },
        ].map(item => (
          <div key={item.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <item.icon className="size-3" />
              {item.label}
            </div>
            <div className={cn("text-lg font-semibold tabular-nums", isLoading ? "text-muted-foreground" : item.positive ? "text-emerald-600" : "text-red-500")}>
              {isLoading ? "..." : (item.value >= 0 && item.label === "Net Cashflow" ? "+" : "") + fmtRp(item.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Cash In vs Cash Out (12 Bulan)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}Jt`} />
              <Tooltip formatter={(v: number, name: string) => [fmtRp(v), name === "cashIn" ? "Cash In" : name === "cashOut" ? "Cash Out" : "Net"]} />
              <Legend formatter={v => v === "cashIn" ? "Cash In" : v === "cashOut" ? "Cash Out" : "Net"} />
              <Bar dataKey="cashIn" fill="#10b981" name="cashIn" />
              <Bar dataKey="cashOut" fill="#ef4444" name="cashOut" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Waterfall / breakdown bulan ini */}
      {!isEmpty && Object.keys(cats).length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Breakdown Kategori Bulan Ini</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Kategori</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cats).map(([cat, amt]) => (
                  <tr key={cat} className="border-b last:border-0">
                    <td className="py-2 capitalize">{cat.replace(/_/g, " ")}</td>
                    <td className={cn("py-2 text-right tabular-nums font-medium", amt >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cashflow table */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Cashflow Bulanan</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Bulan", "Cash In", "Cash Out", "Net Cashflow"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.map((row: any) => (
                  <tr key={row.month} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.month}</td>
                    <td className="px-4 py-2.5 text-emerald-600 tabular-nums">{fmtRp(row.cashIn)}</td>
                    <td className="px-4 py-2.5 text-red-500 tabular-nums">{fmtRp(row.cashOut)}</td>
                    <td className={cn("px-4 py-2.5 font-semibold tabular-nums", row.net >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {row.net >= 0 ? "+" : ""}{fmtRp(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
