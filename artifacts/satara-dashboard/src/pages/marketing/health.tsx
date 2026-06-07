import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { Heart, TrendingUp, AlertTriangle } from "lucide-react";

const COMPONENTS = [
  { key: "branding", label: "Branding Score", bobot: 0.20, desc: "Media sosial & konten" },
  { key: "leads", label: "Lead Volume", bobot: 0.20, desc: "Jumlah lead bulan ini vs target" },
  { key: "cpl", label: "CPL Efisiensi", bobot: 0.15, desc: "Cost per lead vs benchmark" },
  { key: "survey", label: "Survey Rate", bobot: 0.15, desc: "Konversi lead ke survey" },
  { key: "booking", label: "Booking Rate", bobot: 0.20, desc: "Konversi survey ke booking" },
  { key: "berkas", label: "Berkas Rate", bobot: 0.10, desc: "Konversi booking ke berkas" },
];

function scoreColor(s: number) { return s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : "text-red-600"; }
function scoreBg(s: number) { return s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-red-500"; }
function scoreLabel(s: number) { return s >= 80 ? "Sangat Baik" : s >= 60 ? "Baik" : s >= 40 ? "Perlu Perhatian" : "Kritis"; }
function scoreBadge(s: number) { return s >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"; }

export default function MarketingHealthPage() {
  const { data: dashboard } = useQuery<any>({
    queryKey: ["marketing-dashboard"],
    queryFn: () => fetch("/api/marketing/dashboard").then(r => r.json()),
  });

  const { data: brandingKpis = [] } = useQuery<any[]>({
    queryKey: ["branding-kpi"],
    queryFn: () => fetch("/api/marketing/branding-kpi").then(r => r.json()),
  });

  const leads = dashboard?.totalLeads ?? 0;
  const cpl = dashboard?.cpl ?? 0;
  const branding = dashboard?.brandingScore ?? 0;
  const healthScore = dashboard?.healthScore ?? 0;

  const hasMarketingData = !!dashboard;
  const compScores = {
    branding: Math.min(100, Math.round(branding)),
    leads: Math.min(100, Math.round(leads / 20 * 100)),
    cpl: hasMarketingData && (dashboard?.totalCampaigns ?? 0) > 0
      ? Math.max(0, Math.round(100 - cpl / 250))
      : 0,
    survey: Math.round(dashboard?.surveyCount ? Math.min(dashboard.surveyCount / Math.max(leads, 1) * 100 * 5, 100) : 0),
    booking: Math.round(dashboard?.bookingCount ? Math.min(dashboard.bookingCount / Math.max(leads, 1) * 100 * 5, 100) : 0),
    berkas: Math.round(dashboard?.berkasCount ? Math.min(dashboard.berkasCount / Math.max(dashboard?.bookingCount ?? 1, 1) * 100, 100) : 0),
  };

  const lowestComp = COMPONENTS.reduce((min, c) => (compScores as any)[c.key] < (compScores as any)[min.key] ? c : min, COMPONENTS[0]);

  const trendMonths = [...new Set((brandingKpis as any[]).map(k => k.bulan))].sort().slice(-6);
  const trendData = trendMonths.map(m => {
    const rows = (brandingKpis as any[]).filter(k => k.bulan === m);
    const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + (r.brandingScore ?? 0), 0) / rows.length) : 0;
    return { bulan: m, "Health Score (est.)": avg };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Skor Kesehatan Marketing</h1>
        <p className="text-xs text-muted-foreground">Kesehatan keseluruhan aktivitas marketing berdasarkan 6 komponen berbobot</p>
      </div>

      <div className="flex gap-5 items-start">
        <Card className="flex-1">
          <CardContent className="pt-6 text-center">
            <Heart className={cn("size-8 mx-auto mb-3", scoreColor(healthScore))} />
            <div className={cn("text-5xl font-bold", scoreColor(healthScore))}>{healthScore}</div>
            <div className={cn("inline-block mt-2 text-xs px-3 py-1 rounded border font-medium", scoreBadge(healthScore))}>
              {scoreLabel(healthScore)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">dari 100 poin maksimum</p>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Breakdown per Komponen</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {COMPONENTS.map(c => {
              const score = (compScores as any)[c.key] ?? 0;
              const weighted = Math.round(score * c.bobot);
              return (
                <div key={c.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs">{c.label} <span className="text-muted-foreground">({(c.bobot * 100).toFixed(0)}%)</span></span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{weighted}pt</span>
                      <span className={cn("text-xs font-semibold", scoreColor(score))}>{score}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full">
                    <div className={cn("h-full rounded-full transition-all", scoreBg(score))} style={{ width: `${score}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {hasMarketingData && healthScore < 60 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-amber-700">Rekomendasi Otomatis: </span>
            <span className="text-amber-700">Komponen terendah adalah <strong>{lowestComp.label}</strong> (skor: {(compScores as any)[lowestComp.key]}). Fokuskan upaya marketing pada {lowestComp.desc.toLowerCase()} untuk meningkatkan health score secara keseluruhan.</span>
          </div>
        </div>
      )}

      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Tren Branding Score (Estimasi Health)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Health Score (est.)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Formula Kalkulasi</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {COMPONENTS.map(c => (
              <div key={c.key} className="text-xs bg-muted/40 rounded p-2">
                <span className="font-medium">{c.label}</span>
                <span className="text-muted-foreground ml-1">× {(c.bobot * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
