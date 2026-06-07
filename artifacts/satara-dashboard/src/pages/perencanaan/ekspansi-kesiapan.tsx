import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const READINESS_COMPONENTS = [
  { key: "cashflow", label: "Cashflow Tersedia", bobot: 25, desc: "Saldo kas dan kredit yang tersedia untuk ekspansi" },
  { key: "landbank", label: "Land Bank Ready", bobot: 20, desc: "Lahan yang siap untuk dikembangkan" },
  { key: "tim", label: "Kapasitas Tim", bobot: 20, desc: "SDM dan organisasi siap menangani proyek baru" },
  { key: "legal", label: "Legal & Perizinan", bobot: 20, desc: "Dokumen legal area ekspansi sudah disiapkan" },
  { key: "pasar", label: "Demand Pasar", bobot: 15, desc: "Analisis pasar area ekspansi menunjukkan demand positif" },
];

function scoreColor(s: number) { return s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600"; }
function readinessLabel(s: number) { return s >= 80 ? "Siap Ekspansi" : s >= 60 ? "Persiapan" : s >= 40 ? "Belum Siap" : "Kritis"; }

export default function EkspansiKesiapanPage() {
  const { data: expansionTargets = [] } = useQuery<any[]>({
    queryKey: ["expansion-targets"],
    queryFn: () => fetch("/api/expansion-targets").then(r => r.json()).catch(() => []),
  });

  const { data: cashflowData } = useQuery<any[]>({
    queryKey: ["planning-cashflow-all"],
    queryFn: () => fetch("/api/planning/cashflow").then(r => r.ok ? r.json() : []).catch(() => []),
  });

  const { data: landbank } = useQuery<any[]>({
    queryKey: ["planning-landbank"],
    queryFn: () => fetch("/api/planning/landbank").then(r => r.ok ? r.json() : []).catch(() => []),
  });

  const { data: sdm } = useQuery<any[]>({
    queryKey: ["planning-sdm"],
    queryFn: () => fetch("/api/planning/sdm").then(r => r.ok ? r.json() : []).catch(() => []),
  });

  const cashflowArr = Array.isArray(cashflowData) ? cashflowData : [];
  const landbankArr = Array.isArray(landbank) ? landbank : [];
  const sdmArr = Array.isArray(sdm) ? sdm : [];

  const cashflowScore = Math.min(100, cashflowArr.length * 15);
  const landbankScore = Math.min(100, landbankArr.filter((l: any) => l.status === "tersedia").length * 25);
  const timScore = Math.min(100, sdmArr.length * 20);
  const legalScore = 60;
  const pasarScore = 70;

  const scores = {
    cashflow: cashflowScore,
    landbank: landbankScore,
    tim: timScore,
    legal: legalScore,
    pasar: pasarScore,
  };

  const readinessScore = Math.round(
    READINESS_COMPONENTS.reduce((s, c) => s + ((scores as any)[c.key] ?? 0) * c.bobot / 100, 0)
  );

  const radarData = READINESS_COMPONENTS.map(c => ({
    component: c.label,
    Score: (scores as any)[c.key] ?? 0,
  }));

  const blockers = READINESS_COMPONENTS.filter(c => (scores as any)[c.key] < 50);
  const ready = READINESS_COMPONENTS.filter(c => (scores as any)[c.key] >= 70);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/perencanaan"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
        <div>
          <h1 className="text-lg font-semibold">Expansion Readiness Score</h1>
          <p className="text-xs text-muted-foreground">Kesiapan Satara Development untuk ekspansi ke proyek baru</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="flex flex-col items-center justify-center py-8">
          <p className="text-xs text-muted-foreground mb-2">Readiness Score</p>
          <div className={cn("text-6xl font-bold", scoreColor(readinessScore))}>{readinessScore}</div>
          <div className={cn("mt-3 text-sm font-medium px-4 py-1.5 rounded-full border",
            readinessScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            readinessScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-red-50 text-red-700 border-red-200")}>
            {readinessLabel(readinessScore)}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center px-4">Dari 100 poin — berdasarkan 5 komponen kesiapan ekspansi</p>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Radar Kesiapan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="component" tick={{ fontSize: 9 }} />
                <Radar dataKey="Score" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={1.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Breakdown Komponen Kesiapan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {READINESS_COMPONENTS.map(c => {
            const score = (scores as any)[c.key] ?? 0;
            return (
              <div key={c.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-medium">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">bobot {c.bobot}%</span>
                  </div>
                  <span className={cn("text-sm font-bold", scoreColor(score))}>{score}</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className={cn("h-full rounded-full", score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${score}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {blockers.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700 flex items-center gap-2"><XCircle className="size-4" />Perlu Diperkuat</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {blockers.map(b => (
                <div key={b.key} className="flex items-start gap-2">
                  <AlertTriangle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-700">{b.label}</p>
                    <p className="text-[10px] text-red-600/70">{b.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {ready.length > 0 && (
          <Card className="border-emerald-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="size-4" />Sudah Siap</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ready.map(r => (
                <div key={r.key} className="flex items-start gap-2">
                  <CheckCircle className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-emerald-700">{r.label}</p>
                    <p className="text-[10px] text-emerald-600/70">{r.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end">
        <Link href="/perencanaan/ekspansi/skenario">
          <Button size="sm">Lihat Skenario Ekspansi</Button>
        </Link>
      </div>
    </div>
  );
}
