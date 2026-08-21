import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Compass, Brain, Zap, Search, ChevronRight, TrendingUp,
  MapPin, AlertTriangle, CheckCircle2, Star, BarChart3, X,
  Loader2, RefreshCw, Target, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type ExpansionTarget = {
  id: number;
  kabupaten: string;
  hargaPinggirMin: number | null;
  hargaPinggirMax: number | null;
  hargaPusatMin: number | null;
  hargaPusatMax: number | null;
  catatan: string | null;
  flppSuitable: number | null;
  tier: string;
  heuristicScore: number;
  aiScore: number | null;
  aiRationale: string | null;
  aiKeunggulan: string | null;
  aiRisiko: string | null;
  aiRekomendasiLangkah: string | null;
  lastAiAnalysis: string | null;
};

type AiDetail = {
  expansionScore?: number;
  tier?: string;
  ringkasan?: string;
  keunggulan?: string[];
  risiko?: string[];
  kecamatanPrioritas?: string[];
  hargaTargetAcquisition?: string;
  rekomendasiLangkah?: string[];
  segmenProduk?: string;
  kompetitorUtama?: string;
  alasanTier?: string;
};

const TIER_CONFIG = {
  tier1: { label: "Tier 1 — Prioritas", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500", scoreColor: "from-emerald-500 to-emerald-400" },
  tier2: { label: "Tier 2 — Pipeline", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", dot: "bg-amber-500", scoreColor: "from-amber-500 to-amber-400" },
  tier3: { label: "Tier 3 — Watchlist", color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30", dot: "bg-zinc-400", scoreColor: "from-zinc-500 to-zinc-400" },
};

function fmtHarga(n: number | null | undefined) {
  if (!n) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} jt`;
  return `${(n / 1_000).toFixed(0)} rb`;
}

function ScoreBar({ score, tier }: { score: number; tier: string }) {
  const cfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.tier2;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all", cfg.scoreColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right">{score}</span>
    </div>
  );
}

function KabupatenCard({
  row,
  onAnalyze,
  analyzing,
  onSelect,
  selected,
}: {
  row: ExpansionTarget;
  onAnalyze: (id: number) => void;
  analyzing: boolean;
  onSelect: (row: ExpansionTarget) => void;
  selected: boolean;
}) {
  const score = row.aiScore ?? row.heuristicScore;
  const tierCfg = TIER_CONFIG[row.tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.tier2;
  const keunggulan = row.aiKeunggulan ? (JSON.parse(row.aiKeunggulan) as string[]) : [];
  const risiko = row.aiRisiko ? (JSON.parse(row.aiRisiko) as string[]) : [];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        selected && "border-primary ring-1 ring-primary/30"
      )}
      onClick={() => onSelect(row)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{row.kabupaten}</div>
            {row.catatan && <div className="text-[11px] text-muted-foreground mt-0.5">{row.catatan}</div>}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tierCfg.color)}>
              {row.tier === "tier1" ? "T1" : row.tier === "tier2" ? "T2" : "T3"}
            </Badge>
            {row.aiScore && (
              <span className="text-[9px] text-emerald-600 font-semibold">AI</span>
            )}
          </div>
        </div>

        <ScoreBar score={score} tier={row.tier} />

        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-muted rounded px-2 py-1">
            <div className="text-[9px] text-muted-foreground">Pinggir Kota</div>
            <div className="text-[11px] font-semibold">{fmtHarga(row.hargaPinggirMin)}–{fmtHarga(row.hargaPinggirMax)}/m²</div>
          </div>
          <div className="bg-muted rounded px-2 py-1">
            <div className="text-[9px] text-muted-foreground">Pusat Kota</div>
            <div className="text-[11px] font-semibold">{fmtHarga(row.hargaPusatMin)}–{fmtHarga(row.hargaPusatMax)}/m²</div>
          </div>
        </div>

        {row.flppSuitable === 1 && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <CheckCircle2 className="size-3" />
            <span>Layak FLPP</span>
          </div>
        )}

        {keunggulan.length > 0 && (
          <div className="space-y-1">
            {keunggulan.slice(0, 2).map((k, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex gap-1">
                <span className="text-emerald-500 shrink-0">+</span>
                <span>{k}</span>
              </div>
            ))}
            {risiko.slice(0, 1).map((r, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex gap-1">
                <span className="text-amber-500 shrink-0">!</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); onAnalyze(row.id); }}
          disabled={analyzing}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold px-2 py-1.5 rounded-md transition-colors border",
            row.lastAiAnalysis
              ? "border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {analyzing ? <Loader2 className="size-3 animate-spin" /> : <Brain className="size-3" />}
          {analyzing ? "Menganalisis..." : row.lastAiAnalysis ? "Perbarui Analisis AI" : "Analisis dengan AI"}
        </button>
      </CardContent>
    </Card>
  );
}

function DetailPanel({ row, onClose, onAnalyze, analyzing }: {
  row: ExpansionTarget;
  onClose: () => void;
  onAnalyze: (id: number) => void;
  analyzing: boolean;
}) {
  const score = row.aiScore ?? row.heuristicScore;
  const tierCfg = TIER_CONFIG[row.tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.tier2;
  const keunggulan = row.aiKeunggulan ? (JSON.parse(row.aiKeunggulan) as string[]) : [];
  const risiko = row.aiRisiko ? (JSON.parse(row.aiRisiko) as string[]) : [];
  const langkah = row.aiRekomendasiLangkah ? (JSON.parse(row.aiRekomendasiLangkah) as string[]) : [];
  const hasAi = !!row.lastAiAnalysis;

  return (
    <div className="border-l border-border h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-background z-10">
        <div>
          <div className="text-base font-semibold">{row.kabupaten}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{row.catatan}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="size-4" />
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Score */}
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-full border-2 border-primary/30 flex items-center justify-center">
            <span className="text-xl font-bold">{score}</span>
          </div>
          <div>
            <Badge variant="outline" className={cn("text-[11px] mb-1", tierCfg.color)}>
              {tierCfg.label}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {hasAi ? "Skor AI terverifikasi" : "Skor heuristik — belum dianalisis AI"}
            </div>
          </div>
        </div>

        {/* Harga referensi */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">REFERENSI HARGA LAHAN</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground mb-1">Pinggir Kota</div>
              <div className="text-sm font-bold">{fmtHarga(row.hargaPinggirMin)} – {fmtHarga(row.hargaPinggirMax)}</div>
              <div className="text-[9px] text-muted-foreground">per m²</div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground mb-1">Pusat Kota</div>
              <div className="text-sm font-bold">{fmtHarga(row.hargaPusatMin)} – {fmtHarga(row.hargaPusatMax)}</div>
              <div className="text-[9px] text-muted-foreground">per m²</div>
            </div>
          </div>
          <div className="mt-2 p-2 rounded bg-muted/50 text-[11px] text-muted-foreground">
            <span className="font-semibold">Biaya lahan/kavling 72m²: </span>
            {fmtHarga((row.hargaPinggirMin ?? 0) * 72)} – {fmtHarga((row.hargaPinggirMax ?? 0) * 72)}
          </div>
        </div>

        {/* FLPP feasibility */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          row.flppSuitable === 1 ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700" : "bg-amber-500/10 border border-amber-500/20 text-amber-700"
        )}>
          {row.flppSuitable === 1
            ? <><CheckCircle2 className="size-4 shrink-0" /><span className="text-xs">Harga lahan feasible untuk produk FLPP (HPP &lt;Rp 166jt, kavling 60–72m²)</span></>
            : <><AlertTriangle className="size-4 shrink-0" /><span className="text-xs">Harga lahan terlalu tinggi untuk margin FLPP standar</span></>
          }
        </div>

        {/* AI Rationale */}
        {hasAi && row.aiRationale && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">ANALISIS AI</div>
            <p className="text-xs leading-relaxed text-foreground/80">{row.aiRationale}</p>
          </div>
        )}

        {/* Keunggulan */}
        {keunggulan.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">KEUNGGULAN</div>
            <div className="space-y-1.5">
              {keunggulan.map((k, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{k}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risiko */}
        {risiko.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">RISIKO</div>
            <div className="space-y-1.5">
              {risiko.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Langkah */}
        {langkah.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">REKOMENDASI LANGKAH</div>
            <div className="space-y-2">
              {langkah.map((l, i) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <div className="size-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAi && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
            <Brain className="size-6 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">Belum ada analisis AI untuk {row.kabupaten}</div>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => onAnalyze(row.id)} disabled={analyzing}>
              {analyzing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
              {analyzing ? "Menganalisis..." : "Analisis Sekarang"}
            </Button>
          </div>
        )}

        {hasAi && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => onAnalyze(row.id)}
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {analyzing ? "Memperbarui..." : "Perbarui Analisis AI"}
          </Button>
        )}

        {hasAi && (
          <div className="text-[10px] text-muted-foreground text-center">
            Terakhir dianalisis: {new Date(row.lastAiAnalysis!).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Ekspansi() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "tier1" | "tier2" | "tier3">("all");
  const [selected, setSelected] = useState<ExpansionTarget | null>(null);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "chart">("grid");

  const { data: rawData, isLoading } = useQuery<ExpansionTarget[]>({
    queryKey: ["expansion"],
    queryFn: () => fetch("/api/expansion").then(r => r.json()),
  });

  const data = rawData ?? [];

  const filtered = useMemo(() => {
    return data
      .filter(r => tierFilter === "all" || r.tier === tierFilter)
      .filter(r => !search || r.kabupaten.toLowerCase().includes(search.toLowerCase()) || (r.catatan ?? "").toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.aiScore ?? b.heuristicScore) - (a.aiScore ?? a.heuristicScore));
  }, [data, tierFilter, search]);

  const tier1 = data.filter(d => d.tier === "tier1").length;
  const tier2 = data.filter(d => d.tier === "tier2").length;
  const tier3 = data.filter(d => d.tier === "tier3").length;
  const analyzed = data.filter(d => d.lastAiAnalysis).length;
  const flppReady = data.filter(d => d.flppSuitable === 1).length;
  const topKab = [...data].sort((a, b) => (b.aiScore ?? b.heuristicScore) - (a.aiScore ?? a.heuristicScore))[0];

  const chartData = useMemo(() =>
    [...data]
      .sort((a, b) => (b.aiScore ?? b.heuristicScore) - (a.aiScore ?? a.heuristicScore))
      .map(d => ({ name: d.kabupaten, score: d.aiScore ?? d.heuristicScore, tier: d.tier })),
    [data]
  );

  const analyze = async (id: number) => {
    setAnalyzing(id);
    try {
      const result = await fetch(`/api/expansion/${id}/analyze`, { method: "POST" }).then(r => r.json()) as ExpansionTarget & { aiDetail: AiDetail };
      await qc.invalidateQueries({ queryKey: ["expansion"] });
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, ...result } : null);
      }
    } catch { /* silent */ } finally {
      setAnalyzing(null);
    }
  };

  const TIER_COLORS: Record<string, string> = { tier1: "#22c55e", tier2: "#f59e0b", tier3: "#71717a" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            Potensi Ekspansi Sulsel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scoring & analisis AI 24 kabupaten/kota Sulawesi Selatan untuk ekspansi Property Development
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "grid" ? "default" : "outline"} size="sm" className="gap-1.5 text-xs" onClick={() => setView("grid")}>
            <Building2 className="size-3" /> Kartu
          </Button>
          <Button variant={view === "chart" ? "default" : "outline"} size="sm" className="gap-1.5 text-xs" onClick={() => setView("chart")}>
            <BarChart3 className="size-3" /> Grafik
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Kabupaten", value: data.length, icon: MapPin, color: "text-foreground" },
          { label: "Tier 1 — Prioritas", value: tier1, icon: Star, color: "text-emerald-600" },
          { label: "Tier 2 — Pipeline", value: tier2, icon: TrendingUp, color: "text-amber-600" },
          { label: "Layak FLPP", value: flppReady, icon: CheckCircle2, color: "text-sky-600" },
          { label: "Teranalisis AI", value: `${analyzed}/${data.length}`, icon: Brain, color: "text-violet-600" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={cn("size-3.5", kpi.color)} />
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
              </div>
              <div className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top peluang banner */}
      {topKab && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <Target className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Peluang terbaik saat ini: </span>
            <span className="text-sm font-semibold text-emerald-700">{topKab.kabupaten}</span>
            <span className="text-xs text-muted-foreground ml-2">— Skor {topKab.aiScore ?? topKab.heuristicScore}/100 · {topKab.catatan}</span>
          </div>
          <button className="text-xs text-emerald-700 flex items-center gap-1 hover:underline shrink-0" onClick={() => setSelected(topKab)}>
            Lihat Detail <ChevronRight className="size-3" />
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari kabupaten..."
            className="h-8 pl-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(["all", "tier1", "tier2", "tier3"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              tierFilter === t
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "all" ? "Semua" : t === "tier1" ? "Tier 1" : t === "tier2" ? "Tier 2" : "Tier 3"}
            {t !== "all" && <span className="ml-1 text-[9px]">({t === "tier1" ? tier1 : t === "tier2" ? tier2 : tier3})</span>}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className={cn("flex gap-4", selected && "items-start")}>
        {/* Left: grid or chart */}
        <div className={cn("min-w-0", selected ? "flex-1 max-w-none lg:max-w-[60%]" : "flex-1")}>
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : view === "grid" ? (
            <div className={cn(
              "grid gap-3",
              selected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
              {filtered.map(row => (
                <KabupatenCard
                  key={row.id}
                  row={row}
                  onAnalyze={analyze}
                  analyzing={analyzing === row.id}
                  onSelect={setSelected}
                  selected={selected?.id === row.id}
                />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                  Tidak ada hasil untuk filter ini
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Ranking Skor Ekspansi — 24 Kabupaten/Kota Sulsel</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={520}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as { name: string; score: number; tier: string };
                        return (
                          <div className="bg-background border rounded-lg px-3 py-2 shadow-lg text-xs">
                            <div className="font-semibold">{d.name}</div>
                            <div className="text-muted-foreground">Skor: <span className="font-bold text-foreground">{d.score}</span></div>
                            <div className="text-muted-foreground">{d.tier === "tier1" ? "Tier 1 — Prioritas" : d.tier === "tier2" ? "Tier 2 — Pipeline" : "Tier 3 — Watchlist"}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={TIER_COLORS[entry.tier] ?? "#71717a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  {Object.entries(TIER_COLORS).map(([tier, color]) => (
                    <div key={tier} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
                      {tier === "tier1" ? "Prioritas" : tier === "tier2" ? "Pipeline" : "Watchlist"}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-[calc(100vh-12rem)] sticky top-4 rounded-xl border border-border overflow-hidden">
            <DetailPanel
              key={selected.id}
              row={selected}
              onClose={() => setSelected(null)}
              onAnalyze={analyze}
              analyzing={analyzing === selected.id}
            />
          </div>
        )}
      </div>

      {/* Mobile detail panel */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l" onClick={e => e.stopPropagation()}>
            <DetailPanel
              key={selected.id}
              row={selected}
              onClose={() => setSelected(null)}
              onAnalyze={analyze}
              analyzing={analyzing === selected.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
