import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function statusLabel(score: number, hasData = true) {
  if (!hasData) return { label: "BELUM ADA DATA", color: "text-slate-400", bg: "bg-slate-50 border-slate-200", bar: "bg-slate-300" };
  if (score >= 80) return { label: "SEHAT", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500" };
  if (score >= 60) return { label: "WASPADA", color: "text-amber-500", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-400" };
  return { label: "KRITIS", color: "text-red-500", bg: "bg-red-50 border-red-200", bar: "bg-red-400" };
}

const COMPONENTS = [
  { key: "reachScore", label: "Reach", target: "100.000 / bulan", bobot: "20%" },
  { key: "engScore", label: "Engagement Rate", target: "5%", bobot: "20%" },
  { key: "contentCompletion", label: "Content Consistency", target: "30 konten / bulan", bobot: "20%" },
  { key: "sentimentComp", label: "Sentiment", target: "80% komentar positif", bobot: "20%" },
  { key: "organicLeadContrib", label: "Organic Lead Contribution", target: "30% dari total lead", bobot: "20%" },
];

export default function BrandingHealth() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["branding-dashboard"],
    queryFn: () => fetch("/api/branding/dashboard").then(r => r.json()),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-slate-400">Memuat data...</div>;

  const d = data ?? {};
  const health = d.healthComponents ?? {};
  const score = d.brandHealthScore ?? 0;
  const st = statusLabel(score, d.hasData);

  const components = COMPONENTS.map(c => ({
    ...c,
    score: Math.round(health[c.key] ?? 0),
  }));

  const worst = components.reduce((a, b) => a.score < b.score ? a : b);

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Brand Health Score</h1>
          <p className="text-sm text-slate-500">Skor kesehatan brand keseluruhan untuk CEO & Head of Branding</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cn("rounded-xl border-2 p-8 flex flex-col items-center gap-3", st.bg)}>
          <div className={cn("text-8xl font-black", st.color)}>{d.hasData ? score : "N/A"}</div>
          <div className="text-slate-400 text-sm">/ 100</div>
          <span className={cn("px-5 py-2 rounded-full text-base font-bold border-2", st.bg, st.color)}>{st.label}</span>
          <div className="text-xs text-slate-500 text-center mt-2">Brand Health Score<br /><span className="text-slate-400">Data bulan berjalan</span></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Breakdown per Komponen</h2>
          <div className="space-y-4">
            {components.map(c => {
              const cst = statusLabel(c.score, d.hasData);
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div>
                      <span className="font-medium text-slate-700">{c.label}</span>
                      <span className="text-slate-400 ml-2">({c.bobot})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Target: {c.target}</span>
                      <span className={cn("font-bold text-sm", cst.color)}>{d.hasData ? c.score : "-"}</span>
                    </div>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2.5">
                    <div className={cn("h-2.5 rounded-full transition-all", cst.bar)} style={{ width: `${d.hasData ? c.score : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {d.hasData ? (
            <div className={cn("mt-5 rounded-lg px-4 py-3 border text-sm", statusLabel(worst.score).bg)}>
              <div className="font-semibold mb-0.5">💡 Prioritas Perbaikan Bulan Ini</div>
              <div className={cn("text-sm", statusLabel(worst.score).color)}>
                <strong>{worst.label}</strong> — skor terendah ({worst.score}/100). Target: {worst.target}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg px-4 py-3 border text-sm bg-slate-50 border-slate-200 text-slate-500">
              <div className="font-semibold mb-0.5">💡 Informasi</div>
              <div>Belum ada data bulanan berjalan untuk dianalisis.</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Kalkulasi & Metodologi</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-slate-500 text-xs">{["Komponen","Bobot","Kalkulasi","Skor","Status"].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {components.map(c => {
                const cst = statusLabel(c.score, d.hasData);
                const calcs: Record<string, string> = {
                  reachScore: `Total Reach ÷ 100.000 × 100`,
                  engScore: `Engagement Rate ÷ 5% × 100`,
                  contentCompletion: `Konten Posted ÷ 30 × 100`,
                  sentimentComp: `% Positif ÷ 80% × 100`,
                  organicLeadContrib: `Organic Lead ÷ Total Lead × 100`,
                };
                return (
                  <tr key={c.key} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{c.label}</td>
                    <td className="px-4 py-3 text-slate-500">{c.bobot}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{calcs[c.key]}</td>
                    <td className={cn("px-4 py-3 font-bold", cst.color)}>{d.hasData ? `${c.score}/100` : "-"}</td>
                    <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs font-medium border", cst.bg, cst.color)}>{cst.label}</span></td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-800" colSpan={3}>Brand Health Score (rata-rata berbobot)</td>
                <td className={cn("px-4 py-3 font-black text-lg", st.color)}>{d.hasData ? `${score}/100` : "-"}</td>
                <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs font-bold border", st.bg, st.color)}>{st.label}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-3 italic">Skor per komponen = (realisasi ÷ target) × 100, maksimum 100. Status: ≥80 SEHAT · 60–80 WASPADA · &lt;60 KRITIS</p>
      </div>
    </div>
  );
}
