import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { TrendingUp, TrendingDown, Activity, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const THIS_MONTH = new Date().getMonth(); // 0-indexed

export default function CashflowCenter() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-cashflow", year],
    queryFn: () => fetch(`/api/finance/cashflow?year=${year}`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const chart: any[] = data?.chart ?? [];
  const isEmpty = chart.every((c: any) => c.cashIn === 0 && c.cashOut === 0);

  // Use selected month or default to "Bulan Ini" for the current year, otherwise last month with data
  const activeMIdx = selectedMonthIdx !== null
    ? selectedMonthIdx
    : year === currentYear
      ? THIS_MONTH
      : chart.reduce((best, c, i) => (c.cashIn > 0 || c.cashOut > 0 ? i : best), 0);

  const activeRow = chart[activeMIdx] ?? { cashIn: 0, cashOut: 0, net: 0 };
  const cats: Record<string, number> = year === currentYear && selectedMonthIdx === null
    ? (data?.categories ?? {})
    : {};

  const avg3Net = chart.slice(-3).reduce((s: number, c: any) => s + c.net, 0) / 3 || 0;

  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Cashflow Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring arus kas masuk dan keluar per periode</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
            <Button
              variant="ghost" size="icon"
              className="h-5 w-5"
              onClick={() => { setYear(y => y - 1); setSelectedMonthIdx(null); }}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="font-semibold w-10 text-center tabular-nums">{year}</span>
            <Button
              variant="ghost" size="icon"
              className="h-5 w-5"
              onClick={() => { setYear(y => y + 1); setSelectedMonthIdx(null); }}
              disabled={year >= currentYear}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <Link href="/finance/upload">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Upload className="h-3 w-3" /> Upload
            </Button>
          </Link>
        </div>
      </div>

      {isEmpty && !isLoading && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data cashflow {year} belum diupload</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file Excel cashflow di Upload Center</p>
          <Link href="/finance/upload">
            <Button size="sm">Ke Upload Center</Button>
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `Cash In — ${MONTHS_ID[activeMIdx]}`, value: activeRow.cashIn, icon: TrendingUp, positive: true },
          { label: `Cash Out — ${MONTHS_ID[activeMIdx]}`, value: activeRow.cashOut, icon: TrendingDown, positive: false },
          { label: `Net — ${MONTHS_ID[activeMIdx]}`, value: activeRow.net, icon: Activity, positive: activeRow.net >= 0 },
          { label: "Rata-rata Net 3 Bulan", value: avg3Net, icon: Activity, positive: avg3Net >= 0 },
        ].map(item => (
          <div key={item.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <item.icon className="size-3" />
              {item.label}
            </div>
            <div className={cn(
              "text-lg font-semibold tabular-nums",
              isLoading ? "text-muted-foreground" : item.positive ? "text-emerald-600" : "text-red-500"
            )}>
              {isLoading ? "..." : fmtRp(item.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Month picker strip */}
      {!isEmpty && (
        <div className="flex gap-1 flex-wrap">
          {MONTHS_ID.map((m, i) => {
            const row = chart[i] ?? { cashIn: 0, cashOut: 0 };
            const hasData = row.cashIn > 0 || row.cashOut > 0;
            const isActive = i === activeMIdx;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonthIdx(i === activeMIdx && selectedMonthIdx !== null ? null : i)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : hasData
                      ? "bg-muted hover:bg-muted/80"
                      : "text-muted-foreground/40 cursor-default pointer-events-none",
                )}
                disabled={!hasData}
                title={hasData ? `${m}: In ${fmtRp(row.cashIn)} | Out ${fmtRp(row.cashOut)}` : "Tidak ada data"}
              >
                {m}
              </button>
            );
          })}
          {selectedMonthIdx !== null && (
            <button
              type="button"
              onClick={() => setSelectedMonthIdx(null)}
              className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Bar chart */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">
            Cash In vs Cash Out — {year}
            {selectedMonthIdx !== null && ` (${MONTHS_ID[selectedMonthIdx]} dipilih)`}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} barSize={16} onClick={({ activeTooltipIndex }) => {
              if (activeTooltipIndex !== undefined) {
                setSelectedMonthIdx(prev => prev === activeTooltipIndex ? null : activeTooltipIndex ?? null);
              }
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}Jt`} />
              <Tooltip formatter={(v: number, name: string) => [fmtRp(v), name === "cashIn" ? "Cash In" : name === "cashOut" ? "Cash Out" : "Net"]} />
              <Legend formatter={v => v === "cashIn" ? "Cash In" : v === "cashOut" ? "Cash Out" : "Net"} />
              <Bar dataKey="cashIn" name="cashIn">
                {chart.map((_: any, i: number) => (
                  <Cell key={i} fill={i === activeMIdx ? "#059669" : "#10b981"} opacity={selectedMonthIdx !== null && i !== activeMIdx ? 0.4 : 1} />
                ))}
              </Bar>
              <Bar dataKey="cashOut" name="cashOut">
                {chart.map((_: any, i: number) => (
                  <Cell key={i} fill={i === activeMIdx ? "#dc2626" : "#ef4444"} opacity={selectedMonthIdx !== null && i !== activeMIdx ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2 text-center">Klik bulan di chart atau strip atas untuk melihat detail bulan tersebut</p>
        </div>
      )}

      {/* Kategori bulan terpilih */}
      {!isEmpty && Object.keys(cats).length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">
            Breakdown Kategori — {MONTHS_ID[activeMIdx]}
          </h2>
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
                    <td className={cn("py-2 text-right tabular-nums font-medium", (amt as number) >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {fmtRp(amt as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabel bulanan — semua 12 bulan */}
      {!isEmpty && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cashflow Bulanan — {year}</h2>
            <span className="text-xs text-muted-foreground">
              Total In: <span className="font-semibold text-emerald-600">{fmtRp(chart.reduce((s: number, c: any) => s + c.cashIn, 0))}</span>
              {" · "}
              Total Out: <span className="font-semibold text-red-500">{fmtRp(chart.reduce((s: number, c: any) => s + c.cashOut, 0))}</span>
            </span>
          </div>
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
                {chart.map((row: any, i: number) => (
                  <tr
                    key={row.month}
                    className={cn(
                      "border-b last:border-0 cursor-pointer transition-colors",
                      i === activeMIdx ? "bg-primary/5" : "hover:bg-muted/30",
                    )}
                    onClick={() => setSelectedMonthIdx(prev => prev === i ? null : i)}
                  >
                    <td className={cn("px-4 py-2.5 font-medium", i === activeMIdx && "text-primary")}>
                      {row.month} {i === activeMIdx && <span className="text-xs ml-1 opacity-60">(dipilih)</span>}
                    </td>
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
