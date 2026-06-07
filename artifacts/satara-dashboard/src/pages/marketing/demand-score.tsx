import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

function scoreColor(s: number) { return s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600"; }
function scoreBg(s: number) { return s >= 70 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-red-500"; }
function scoreLabel(s: number) { return s >= 70 ? "Tinggi" : s >= 50 ? "Sedang" : "Rendah"; }

export default function DemandScorePage() {
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["marketing-leads"],
    queryFn: () => fetch("/api/marketing/leads").then(r => r.json()),
  });

  const { data: absorptions = [] } = useQuery<any[]>({
    queryKey: ["marketing-absorption"],
    queryFn: () => fetch("/api/marketing/absorption").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const scores = (absorptions as any[]).map((a: any) => {
    const projLeads = (leads as any[]).filter(l => l.projectId === a.projectId);
    const total = projLeads.length;
    const survey = projLeads.filter(l => ["SURVEY_DILAKUKAN","SURVEY_DIJADWALKAN","BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)).length;
    const booking = projLeads.filter(l => l.status === "BOOKING").length;
    const berkas = projLeads.filter(l => ["BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)).length;
    const marketResponse = total > 0 ? Math.min(total / 20 * 100, 100) : 0;
    const surveyRate = total > 0 ? survey / total * 100 : 0;
    const bookingRate = survey > 0 ? booking / survey * 100 : 0;
    const berkasRate = booking > 0 ? berkas / booking * 100 : 0;
    const absorptionScore = a.absorptionRate ?? 0;
    const demandScore = Math.round(
      surveyRate * 0.20 +
      bookingRate * 0.20 +
      absorptionScore * 0.20 +
      marketResponse * 0.20 +
      berkasRate * 0.20
    );
    return {
      id: a.id, projectId: a.projectId, tahap: a.tahap,
      projectName: a.projectName,
      komponen: { leads: total, surveyRate: Math.round(surveyRate), bookingRate: Math.round(bookingRate), berkasRate: Math.round(berkasRate), marketResponse: Math.round(marketResponse), absorptionScore },
      demandScore,
    };
  });

  const chartData = scores.map(s => ({
    nama: `${s.projectName} ${s.tahap}`,
    Score: s.demandScore,
  }));

  const COMPONENTS = [
    { key: "surveyRate", label: "Lead → Survey", bobot: "20%" },
    { key: "bookingRate", label: "Survey → Booking", bobot: "20%" },
    { key: "absorptionScore", label: "Absorption Rate", bobot: "20%" },
    { key: "marketResponse", label: "Market Response", bobot: "20%" },
    { key: "berkasRate", label: "Booking → Berkas", bobot: "20%" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Project Demand Score</h1>
        <p className="text-xs text-muted-foreground">Skor permintaan pasar per proyek berdasarkan 5 komponen berbobot</p>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <strong>Formula:</strong> Survey Rate (20%) + Booking Rate (20%) + Absorption Rate (20%) + Market Response (20%) + Berkas Rate (20%)
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Proyek</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tahap</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Leads</th>
                {COMPONENTS.map(c => (
                  <th key={c.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {c.label} <span className="text-muted-foreground/60">({c.bobot})</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Demand Score</th>
              </tr>
            </thead>
            <tbody>
              {scores.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Input data absorpsi terlebih dahulu di menu Absorpsi Proyek</td></tr>
              ) : scores.map(s => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{s.projectName}</td>
                  <td className="px-3 py-2">{s.tahap}</td>
                  <td className="px-3 py-2">{s.komponen.leads}</td>
                  {COMPONENTS.map(c => (
                    <td key={c.key} className="px-3 py-2">
                      <span className={scoreColor((s.komponen as any)[c.key])}>{(s.komponen as any)[c.key]}%</span>
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", scoreColor(s.demandScore))}>{s.demandScore}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium",
                        s.demandScore >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        s.demandScore >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200")}>
                        {scoreLabel(s.demandScore)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Demand Score per Proyek</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="nama" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="Score" radius={[2,2,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.Score >= 70 ? "#10b981" : entry.Score >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
