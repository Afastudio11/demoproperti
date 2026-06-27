import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator, Map, Calendar, DollarSign,
  Users, ChevronRight, Building2, TrendingUp, AlertTriangle, CheckCircle2,
  Brain, Zap, XCircle, FolderOpen, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtPct } from "@/lib/planning-calc";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

const modules = [
  { name: "Analisis Pasar", path: "/perencanaan/pasar", icon: TrendingUp, desc: "Demografi, FLPP, kompetitor & demand score" },
  { name: "Analisis Lahan & Siteplan", path: "/perencanaan/lahan", icon: Building2, desc: "Gambar siteplan, bidang, blok, dan unit visual" },
  { name: "Rencana Tahapan", path: "/perencanaan/tahapan", icon: FolderOpen, desc: "Tarik unit siteplan, susun tahap, blok, subkon" },
  { name: "Feasibility Engine", path: "/perencanaan/feasibility", icon: Calculator, desc: "ROI, IRR, NPV, payback & CEO report" },
  { name: "Cashflow & KPP", path: "/perencanaan/cashflow", icon: DollarSign, desc: "Cashflow 3 skenario & kredit konstruksi" },
  { name: "Timeline SPTIS", path: "/perencanaan/timeline", icon: Calendar, desc: "Master schedule & milestone tracking" },
  { name: "SDM / Sumber Daya", path: "/perencanaan/sdm", icon: Users, desc: "Kapasitas SDM & alokasi tim proyek" },
  { name: "Early Warning", path: "/perencanaan/timeline/warning", icon: AlertTriangle, desc: "Risiko jadwal, biaya, dan readiness" },
  { name: "Land Bank", path: "/perencanaan/landbank", icon: Map, desc: "Portofolio lahan & ekspansi readiness" },
];

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-medium w-6 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

export default function Perencanaan() {
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeProjectId = searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : null;

  const { data: feasibilities } = useQuery({
    queryKey: ["planning-feasibility"],
    queryFn: () => fetch("/api/planning/feasibility").then(r => r.json()),
  });
  const { data: milestones } = useQuery({
    queryKey: ["planning-milestones"],
    queryFn: () => fetch("/api/planning/milestones").then(r => r.json()),
  });
  const { data: markets } = useQuery({
    queryKey: ["planning-market"],
    queryFn: () => fetch("/api/planning/market").then(r => r.json()),
  });
  const { data: cashflowEntries } = useQuery({
    queryKey: ["planning-cashflow-all"],
    queryFn: () => fetch("/api/planning/cashflow").then(r => r.json()),
  });
  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const feasArr = Array.isArray(feasibilities) ? feasibilities : [];
  const msArr = Array.isArray(milestones) ? milestones : [];
  const mktArr = Array.isArray(markets) ? markets : [];
  const cfArr = Array.isArray(cashflowEntries) ? cashflowEntries : [];
  const projArr = Array.isArray(projects) ? projects : [];

  const goCount = feasArr.filter((f: Record<string, number>) => (f.roi ?? 0) >= 35 && (f.irr ?? 0) >= 20 && (f.margin ?? 0) >= 25).length;
  const reviewCount = feasArr.filter((f: Record<string, number>) => !((f.roi ?? 0) >= 35 && (f.irr ?? 0) >= 20) && ((f.roi ?? 0) >= 20 || (f.irr ?? 0) >= 15)).length;
  const overdueCount = msArr.filter((m: Record<string, string>) => m.status === "terlambat").length;
  const totalRevenue = feasArr.reduce((s: number, f: Record<string, number>) => s + (f.totalRevenue ?? 0), 0);
  const totalUnits = feasArr.reduce((s: number, f: Record<string, number>) => s + (f.totalUnits ?? 0), 0);
  const totalProfit = feasArr.reduce((s: number, f: Record<string, number>) => s + (f.grossProfit ?? 0), 0);

  // Build 12-month cashflow forecast from all cashflow entries
  const cashflowForecast: { month: number; masuk: number; keluar: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthEntries = cfArr.filter((e: Record<string, number>) => e.monthNumber === m);
    const masuk = monthEntries.reduce((s: number, e: Record<string, number>) =>
      s + (e.bookingFeeIn ?? 0) + (e.htKprIn ?? 0) + (e.downPaymentIn ?? 0) + (e.kppDisbursementIn ?? 0), 0);
    const keluar = monthEntries.reduce((s: number, e: Record<string, number>) =>
      s + (e.landCostOut ?? 0) + (e.constructionCostOut ?? 0) + (e.marketingCostOut ?? 0) + (e.operationalCostOut ?? 0) + (e.kppInstallmentOut ?? 0), 0);
    cashflowForecast.push({ month: m, masuk: masuk / 1_000_000, keluar: keluar / 1_000_000 });
  }
  const hasCashflowData = cashflowForecast.some(d => d.masuk > 0 || d.keluar > 0);

  // Early warnings
  const warnings: { type: string; project: string; detail: string; severity: "red" | "amber" }[] = [];
  msArr.filter((m: Record<string, unknown>) => m.status === "terlambat").forEach((m: Record<string, unknown>) => {
    const proj = projArr.find((p: Record<string, unknown>) => p.id === m.projectId);
    const target = m.targetDate ? new Date(m.targetDate as string) : null;
    const now = new Date();
    const delay = target ? Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    warnings.push({
      type: "DELAY",
      project: (proj as Record<string, string>)?.nama ?? `Proyek #${m.projectId}`,
      detail: `${m.taskName} — terlambat ${delay > 0 ? delay + " hari" : ""}`,
      severity: delay > 30 ? "red" : "amber",
    });
  });
  feasArr.forEach((f: Record<string, number>) => {
    if ((f.roi ?? 0) > 0 && (f.roi ?? 0) < 25) {
      const proj = projArr.find((p: Record<string, number>) => p.id === f.projectId);
      warnings.push({
        type: "FINANSIAL",
        project: (proj as Record<string, string>)?.nama ?? `Proyek #${f.projectId}`,
        detail: `ROI ${(f.roi ?? 0).toFixed(1)}% — di bawah standar minimum Satara 25%`,
        severity: (f.roi ?? 0) < 15 ? "red" : "amber",
      });
    }
    if ((f.paybackPeriod ?? 0) > 30) {
      const proj = projArr.find((p: Record<string, number>) => p.id === f.projectId);
      warnings.push({
        type: "PAYBACK",
        project: (proj as Record<string, string>)?.nama ?? `Proyek #${f.projectId}`,
        detail: `Payback period ${f.paybackPeriod} bulan — melebihi standar 24 bulan`,
        severity: "amber",
      });
    }
  });

  // Project health scores per project (from feasibility + milestones)
  const projectHealthScores = projArr.slice(0, 5).map((p: Record<string, unknown>) => {
    const pFeas = feasArr.find((f: Record<string, unknown>) => f.projectId === p.id) as Record<string, number> | undefined;
    const pMilestones = msArr.filter((m: Record<string, unknown>) => m.projectId === p.id);
    const pMarket = mktArr.find((m: Record<string, unknown>) => m.projectId === p.id) as Record<string, number> | undefined;

    const finScore = pFeas
      ? Math.round(
          (Math.min((pFeas.roi ?? 0) / 35, 1) * 30) +
          (Math.min((pFeas.irr ?? 0) / 20, 1) * 30) +
          (Math.min((pFeas.margin ?? 0) / 25, 1) * 20) +
          ((pFeas.paybackPeriod ?? 99) <= 24 ? 20 : 10)
        )
      : 0;

    const totalMs = pMilestones.length;
    const onTrackMs = pMilestones.filter((m: Record<string, string>) => m.status === "on_track" || m.status === "selesai").length;
    const timelineScore = totalMs > 0 ? Math.round((onTrackMs / totalMs) * 100) : 50;

    const marketScore = pMarket ? Math.min(Math.round((pMarket.demandScore ?? 0)), 100) : 50;

    const legalMs = pMilestones.filter((m: Record<string, string>) => m.phase === "LEGAL");
    const legalDone = legalMs.filter((m: Record<string, string>) => m.status === "selesai").length;
    const legalScore = legalMs.length > 0 ? Math.round((legalDone / legalMs.length) * 100) : 50;

    const sellMs = pMilestones.filter((m: Record<string, string>) => m.phase === "SELL" || m.phase === "AKAD");
    const sellDone = sellMs.filter((m: Record<string, string>) => m.status === "selesai" || m.status === "on_track").length;
    const marketingScore = sellMs.length > 0 ? Math.round((sellDone / sellMs.length) * 100) : 50;

    const overallScore = pFeas
      ? Math.round((finScore + timelineScore + marketScore + legalScore + marketingScore) / 5)
      : 0;

    return {
      id: p.id,
      nama: p.nama as string,
      finScore,
      timelineScore,
      marketScore,
      legalScore,
      marketingScore,
      overallScore,
      hasData: !!pFeas,
    };
  });

  const fetchAiInsight = async () => {
    if (feasArr.length === 0) return;
    setAiLoading(true);
    setAiText("");
    const best = feasArr[0] as Record<string, number>;
    const proj = projArr.find((p: Record<string, number>) => p.id === best.projectId) as Record<string, string> | undefined;
    try {
      const resp = await fetch("/api/ai/planning-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: proj?.nama ?? "Portofolio Satara",
          roi: best.roi, irr: best.irr, margin: best.margin,
          paybackPeriod: best.paybackPeriod, npv: best.npv,
          totalRevenue: best.totalRevenue, totalCost: best.totalCost,
          grossProfit: best.grossProfit, bepUnits: best.bepUnits,
          totalUnits: best.totalUnits, peakFunding: best.peakFunding,
          discountRate: 12, salesPerMonth: best.salesPerMonth,
          kprPct: best.kprPct, sellingPricePerUnit: best.sellingPricePerUnit,
          passROI: (best.roi ?? 0) >= 35, passIRR: (best.irr ?? 0) >= 20,
          passMargin: (best.margin ?? 0) >= 25, passPayback: (best.paybackPeriod ?? 99) <= 24,
        }),
      });
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiText(prev => prev + decoder.decode(value));
      }
    } catch {
      setAiText("Gagal memuat analisis AI. Pastikan DEEPSEEK_API_KEY sudah dikonfigurasi.");
    } finally {
      setAiLoading(false);
    }
  };

  const activeProject = activeProjectId ? projArr.find((p: Record<string, unknown>) => p.id === activeProjectId) as Record<string, string> | undefined : undefined;

  const [isEditingProjName, setIsEditingProjName] = useState(false);
  const [projNameInput, setProjNameInput] = useState("");

  useEffect(() => {
    if (activeProject) {
      setProjNameInput(activeProject.nama);
    }
    setIsEditingProjName(false);
  }, [activeProject?.id, activeProject?.nama]);

  function moduleHref(path: string) {
    return activeProjectId ? `${path}?projectId=${activeProjectId}` : path;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Perencanaan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Flow kerja dari pasar, siteplan, tahapan, kelayakan, cashflow, sampai siap publish ke Produksi</p>
      </div>

      {activeProject && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <FolderOpen className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground mr-1">Proyek aktif: </span>
            {isEditingProjName ? (
              <input
                type="text"
                value={projNameInput}
                onChange={(e) => setProjNameInput(e.target.value)}
                onBlur={async () => {
                  setIsEditingProjName(false);
                  if (projNameInput.trim() && projNameInput !== activeProject.nama) {
                    try {
                      const resp = await fetch(`/api/projects/${activeProject.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nama: projNameInput.trim() }),
                      });
                      if (resp.ok) {
                        refetchProjects();
                      }
                    } catch (err) {
                      console.error("Gagal mengubah nama proyek:", err);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === "Escape") {
                    setProjNameInput(activeProject.nama);
                    setIsEditingProjName(false);
                  }
                }}
                className="text-sm font-semibold text-primary bg-transparent border-b border-primary/50 focus:outline-none py-0.5"
                autoFocus
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 group">
                <span className="text-sm font-semibold text-primary">{activeProject.nama}</span>
                <button
                  onClick={() => setIsEditingProjName(true)}
                  className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary/80 transition-opacity p-0.5 rounded cursor-pointer"
                  title="Ubah nama proyek"
                >
                  <Pencil className="size-3" />
                </button>
              </span>
            )}
            {activeProject.lokasi && <span className="text-xs text-muted-foreground ml-2">— {activeProject.lokasi}</span>}
          </div>
          <Link href="/projects" className="text-[10px] text-muted-foreground hover:text-foreground shrink-0">Ganti Proyek</Link>
        </div>
      )}

      {/* AI CEO Recommendation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              CEO AI Recommendation
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={fetchAiInsight} disabled={aiLoading || feasArr.length === 0}>
              <Zap className="size-3" />
              {aiLoading ? "Menganalisis..." : "Generate Analisis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiText ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{aiText}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {feasArr.length === 0
                ? "Tambahkan data feasibility terlebih dahulu untuk mengaktifkan analisis AI"
                : "Klik \"Generate Analisis\" untuk mendapatkan rekomendasi AI berbasis data feasibility proyek aktif"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Module Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Alur Perencanaan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {modules.map((mod, index) => (
            <Link key={mod.path} href={moduleHref(mod.path)}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center relative">
                      <mod.icon className="size-4 text-primary" />
                    </div>
                    <span className="text-[10px] rounded-full border px-1.5 py-0.5 text-muted-foreground">{index + 1}</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{mod.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Feasibility summary table */}
      {feasArr.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Ringkasan Feasibility</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Proyek", "ROI", "IRR", "Margin", "Payback", "Status"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feasArr.slice(0, 8).map((f: Record<string, number | string>) => {
                  const proj = projArr.find((p: Record<string, unknown>) => p.id === f.projectId) as Record<string, string> | undefined;
                  const pass = (f.roi as number ?? 0) >= 35 && (f.irr as number ?? 0) >= 20 && (f.margin as number ?? 0) >= 25;
                  const review = !pass && ((f.roi as number ?? 0) >= 20 || (f.irr as number ?? 0) >= 15);
                  return (
                    <tr key={f.id as number} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-medium">{proj?.nama ?? `Proyek #${f.projectId}`}</td>
                      <td className={`px-3 py-2 font-medium ${(f.roi as number ?? 0) >= 35 ? "text-emerald-600" : "text-red-600"}`}>{((f.roi as number) ?? 0).toFixed(1)}%</td>
                      <td className={`px-3 py-2 ${(f.irr as number ?? 0) >= 20 ? "text-emerald-600" : "text-red-600"}`}>{((f.irr as number) ?? 0).toFixed(1)}%</td>
                      <td className={`px-3 py-2 ${(f.margin as number ?? 0) >= 25 ? "text-emerald-600" : "text-red-600"}`}>{((f.margin as number) ?? 0).toFixed(1)}%</td>
                      <td className={`px-3 py-2 ${(f.paybackPeriod as number ?? 99) <= 24 ? "text-emerald-600" : "text-red-600"}`}>{f.paybackPeriod ?? "-"} bln</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={pass ? "text-emerald-600 border-emerald-200" : review ? "text-amber-600 border-amber-200" : "text-red-600 border-red-200"}>
                          {pass ? "GO" : review ? "REVIEW" : "NO-GO"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
