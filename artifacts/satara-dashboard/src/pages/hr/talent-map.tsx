import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";

function getQuadrant(perf: number, pot: number) {
  if (perf >= 50 && pot >= 50) return { label: "Rising Star", color: "#10b981", bg: "bg-emerald-100 text-emerald-700" };
  if (perf >= 50 && pot < 50) return { label: "Solid Performer", color: "#3b82f6", bg: "bg-blue-100 text-blue-700" };
  if (perf < 50 && pot >= 50) return { label: "Needs Development", color: "#f59e0b", bg: "bg-amber-100 text-amber-700" };
  return { label: "Underperformer", color: "#ef4444", bg: "bg-red-100 text-red-700" };
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const q = getQuadrant(payload.performanceScore, payload.potentialScore);
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={q.color} stroke="#fff" strokeWidth={1.5} />
    </g>
  );
}

const DIVISIONS = ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"];

export default function TalentMap() {
  const [filterDiv, setFilterDiv] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: dashboard } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => fetch("/api/hr/dashboard").then(r => r.json()),
  });

  const allTalents: any[] = dashboard?.talentMap ?? [];
  const filtered = filterDiv ? allTalents.filter(t => t.division === filterDiv) : allTalents;

  const quadrantCounts = {
    risingStars: filtered.filter(t => t.performanceScore >= 50 && t.potentialScore >= 50).length,
    solidPerformers: filtered.filter(t => t.performanceScore >= 50 && t.potentialScore < 50).length,
    needsDevelopment: filtered.filter(t => t.performanceScore < 50 && t.potentialScore >= 50).length,
    underperformers: filtered.filter(t => t.performanceScore < 50 && t.potentialScore < 50).length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Talent Map</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pemetaan karyawan berdasarkan performance score vs potential score</p>
      </div>

      <div className="flex items-center gap-3">
        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Semua Divisi</option>
          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} karyawan dipetakan</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "⭐ Rising Star", val: quadrantCounts.risingStars, desc: "Perf ≥50 & Pot ≥50", color: "text-emerald-600 border-emerald-200" },
          { label: "💪 Solid Performer", val: quadrantCounts.solidPerformers, desc: "Perf ≥50 & Pot <50", color: "text-blue-600 border-blue-200" },
          { label: "🌱 Needs Dev.", val: quadrantCounts.needsDevelopment, desc: "Perf <50 & Pot ≥50", color: "text-amber-600 border-amber-200" },
          { label: "⚠ Underperformer", val: quadrantCounts.underperformers, desc: "Perf <50 & Pot <50", color: "text-red-600 border-red-200" },
        ].map(({ label, val, desc, color }) => (
          <div key={label} className={cn("bg-card border rounded-xl p-4", color.split(" ")[1])}>
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color.split(" ")[0])}>{val}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-2">Keterangan Kuadran</h3>
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div className="flex items-start gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0" /><div><strong>Rising Star (Kanan Atas):</strong> Kinerja tinggi, potensi tinggi → prioritas retensi & pengembangan cepat</div></div>
          <div className="flex items-start gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 mt-0.5 shrink-0" /><div><strong>Solid Performer (Kanan Bawah):</strong> Kinerja tinggi, potensi rendah → pertahankan & berdayakan</div></div>
          <div className="flex items-start gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 shrink-0" /><div><strong>Needs Development (Kiri Atas):</strong> Kinerja rendah, potensi tinggi → coaching & mentoring intensif</div></div>
          <div className="flex items-start gap-2"><div className="w-3 h-3 rounded-full bg-red-500 mt-0.5 shrink-0" /><div><strong>Underperformer (Kiri Bawah):</strong> Kinerja & potensi rendah → PIP atau evaluasi ulang</div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Belum ada data. Input KPI dan kompetensi karyawan terlebih dahulu.</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="performanceScore" domain={[0, 100]} name="Performance" label={{ value: "Performance Score (KPI Achievement)", position: "insideBottom", offset: -15, fontSize: 11 }} tick={{ fontSize: 10 }} />
              <YAxis type="number" dataKey="potentialScore" domain={[0, 100]} name="Potential" label={{ value: "Potential Score", angle: -90, position: "insideLeft", offset: 15, fontSize: 11 }} tick={{ fontSize: 10 }} />
              <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                const q = getQuadrant(d.performanceScore, d.potentialScore);
                return (
                  <div className="bg-white border rounded-lg shadow-lg p-3 text-xs max-w-48">
                    <div className="font-bold text-sm mb-1">{d.name}</div>
                    <div className="text-muted-foreground mb-1">{d.division} · {d.position}</div>
                    <div>Performance: <strong>{d.performanceScore}/100</strong></div>
                    <div>Potential: <strong>{d.potentialScore}/100</strong></div>
                    <div className="mt-1"><span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", q.bg)}>{q.label}</span></div>
                  </div>
                );
              }} />
              <Scatter data={filtered} shape={<CustomDot />} onClick={(data) => setSelected(data)} style={{ cursor: "pointer" }} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Talent List Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 text-sm font-medium">Daftar Karyawan</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left px-4 py-2 font-medium">Nama</th><th className="text-left px-3 py-2 font-medium">Divisi</th><th className="text-left px-3 py-2 font-medium">Jabatan</th><th className="text-center px-3 py-2 font-medium">Performance</th><th className="text-center px-3 py-2 font-medium">Potential</th><th className="text-left px-3 py-2 font-medium">Kuadran</th></tr></thead>
            <tbody>
              {filtered.sort((a, b) => (b.performanceScore + b.potentialScore) - (a.performanceScore + a.potentialScore)).map((t: any) => {
                const q = getQuadrant(t.performanceScore, t.potentialScore);
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(t)}>
                    <td className="px-4 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.division}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.position}</td>
                    <td className="text-center px-3 py-2 font-semibold">{t.performanceScore > 0 ? `${t.performanceScore}/100` : "—"}</td>
                    <td className="text-center px-3 py-2 font-semibold">{t.potentialScore > 0 ? `${t.potentialScore}/100` : "—"}</td>
                    <td className="px-3 py-2"><span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", q.bg)}>{q.label}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Belum ada data talent.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-background border rounded-xl shadow-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="font-bold text-lg mb-1">{selected.name}</div>
            <div className="text-sm text-muted-foreground mb-3">{selected.division} · {selected.position}</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Performance Score:</span><span className="font-semibold">{selected.performanceScore}/100</span></div>
              <div className="flex justify-between"><span>Potential Score:</span><span className="font-semibold">{selected.potentialScore}/100</span></div>
              <div className="flex justify-between"><span>Kategori:</span><span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", getQuadrant(selected.performanceScore, selected.potentialScore).bg)}>{getQuadrant(selected.performanceScore, selected.potentialScore).label}</span></div>
            </div>
            <button onClick={() => setSelected(null)} className="mt-4 w-full border rounded-lg py-2 text-sm hover:bg-muted">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
