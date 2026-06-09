import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Upload, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 20) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Sangat Baik</span>;
  if (margin >= 10) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Baik</span>;
  if (margin >= 5) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Cukup</span>;
  if (margin >= 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Rendah</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Rugi</span>;
}

export default function ProfitabilityCenter() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-profitabilitas"],
    queryFn: () => fetch("/api/finance/profitabilitas").then(r => r.json()),
    refetchInterval: 60000,
  });

  const projects: any[] = data?.projects ?? [];
  const isEmpty = projects.length === 0;

  const totalProfit = projects.reduce((s, p) => s + p.profit, 0);
  const totalPendapatan = projects.reduce((s, p) => s + p.pendapatan, 0);
  const avgMargin = totalPendapatan > 0 ? (totalProfit / totalPendapatan) * 100 : 0;
  const topProject = [...projects].sort((a, b) => b.profit - a.profit)[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Profitability Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analisis profitabilitas per proyek dan unit bisnis</p>
        </div>
        <Link href="/finance/upload">
          <button className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
            <Upload className="size-3.5" />
            Upload Data
          </button>
        </Link>
      </div>

      {isEmpty && !isLoading && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data profitabilitas belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file cashflow untuk menghitung profitabilitas per proyek</p>
          <Link href="/finance/upload"><button className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90">Ke Upload Center</button></Link>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1.5">Total Profit (semua proyek)</div>
              <div className={cn("text-xl font-bold tabular-nums", totalProfit >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(totalProfit)}</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1.5">Rata-rata Margin</div>
              <div className={cn("text-xl font-bold tabular-nums", avgMargin >= 15 ? "text-emerald-600" : avgMargin >= 5 ? "text-amber-500" : "text-red-500")}>
                {avgMargin.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><TrendingUp className="size-3" />Proyek Terbaik</div>
              <div className="text-sm font-bold">{topProject?.projectName ?? "-"}</div>
              {topProject && <div className="text-xs text-emerald-600">{fmtRp(topProject.profit)}</div>}
            </div>
          </div>

          {/* Profit chart */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-4">Profit per Proyek</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projects} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-10" />
                <XAxis dataKey="projectName" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}Jt`} />
                <Tooltip formatter={(v: number) => [fmtRp(v), "Profit"]} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b"><h2 className="text-sm font-semibold">Detail Profitabilitas per Proyek</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  {["Proyek","Pendapatan","Biaya","Profit","Margin (%)","Status"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
                </tr></thead>
                <tbody>
                  {projects.map((p: any, i: number) => (
                    <tr key={p.projectName} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">
                        {i === 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mr-1.5">#1</span>}
                        {p.projectName}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-emerald-600">{fmtRp(p.pendapatan)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-red-500">{fmtRp(p.biaya)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-semibold", p.profit >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(p.profit)}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums", p.margin >= 15 ? "text-emerald-600" : p.margin >= 5 ? "text-amber-500" : "text-red-500")}>{p.margin.toFixed(1)}%</td>
                      <td className="px-4 py-2.5"><MarginBadge margin={p.margin} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
