import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const now = new Date();

function getCategory(score: number) {
  if (score >= 90) return { label: "Excellent", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 75) return { label: "Good", color: "bg-amber-100 text-amber-700" };
  if (score >= 60) return { label: "Needs Improvement", color: "bg-orange-100 text-orange-700" };
  return { label: "Poor", color: "bg-red-100 text-red-700" };
}

export default function Performance() {
  const [filterDiv, setFilterDiv] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(r => r.json()) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-records"], queryFn: () => fetch("/api/hr/kpi/records").then(r => r.json()) });
  const { data: defs = [] } = useQuery<any[]>({ queryKey: ["hr-kpi-defs"], queryFn: () => fetch("/api/hr/kpi/definitions").then(r => r.json()) });

  const periodRecords = records.filter((r: any) => r.periodYear === filterYear && r.periodMonth === filterMonth);

  const empPerf = employees.map((e: any) => {
    const empRecs = periodRecords.filter((r: any) => r.employeeId === e.id);
    const empDefs = defs.filter((d: any) => d.position === e.position || d.division === e.division);
    const totalWeight = empDefs.reduce((s: number, d: any) => s + Number(d.weight), 0);
    let weightedScore = 0;
    for (const r of empRecs) {
      const def = defs.find((d: any) => d.id === r.kpiDefinitionId);
      if (def && totalWeight > 0) {
        weightedScore += (Number(r.achievementPct) * Number(def.weight)) / totalWeight;
      }
    }
    const avgScore = empRecs.length > 0 ? (totalWeight > 0 ? weightedScore : empRecs.reduce((s: number, r: any) => s + Number(r.achievementPct), 0) / empRecs.length) : 0;
    return { ...e, kpiAchievement: Math.round(avgScore * 10) / 10, performanceScore: Math.round(avgScore * 10) / 10, recordCount: empRecs.length };
  }).sort((a, b) => b.performanceScore - a.performanceScore);

  const filtered = empPerf
    .filter(e => !filterDiv || e.division === filterDiv)
    .filter(e => !filterCat || getCategory(e.performanceScore).label === filterCat);

  const divisions = [...new Set(employees.map((e: any) => e.division))];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Performance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kinerja individual karyawan berdasarkan KPI Achievement</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Semua Divisi</option>
          {divisions.map((d: any) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Semua Kategori</option>
          {["Excellent", "Good", "Needs Improvement", "Poor"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Ranking Chart */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-4">Ranking Performance Score</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={filtered.slice(0, 15)} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: any) => [`${v}/100`, "Score"]} />
            <Bar dataKey="performanceScore" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-3 py-3 font-medium">Divisi</th>
                <th className="text-left px-3 py-3 font-medium">Jabatan</th>
                <th className="text-center px-3 py-3 font-medium">KPI Achievement</th>
                <th className="text-center px-3 py-3 font-medium">Performance Score</th>
                <th className="text-center px-3 py-3 font-medium">Kategori</th>
                <th className="text-center px-3 py-3 font-medium">Data KPI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const cat = getCategory(e.performanceScore);
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold">{e.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{e.division}</td>
                    <td className="px-3 py-3 text-muted-foreground">{e.position}</td>
                    <td className="px-3 py-3 text-center font-medium">{e.kpiAchievement > 0 ? `${e.kpiAchievement}%` : "—"}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("font-bold", e.performanceScore >= 90 ? "text-emerald-600" : e.performanceScore >= 75 ? "text-amber-600" : e.performanceScore > 0 ? "text-red-500" : "text-muted-foreground")}>
                        {e.performanceScore > 0 ? `${e.performanceScore}/100` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {e.performanceScore > 0 ? <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", cat.color)}>{cat.label}</span> : <span className="text-xs text-muted-foreground">Belum ada data</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-muted-foreground">{e.recordCount} KPI</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Belum ada data performance untuk periode ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
