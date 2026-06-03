import { useState, useRef } from "react";
import {
  KABUPATEN_DATA, getGradeColor, getGradeLabel, getGradeBg,
  KAB_WEIGHTS,
  type KabupatenScore, type KecamatanScore, type DesaScore, type Grade,
} from "@/data/slis-scoring";
import { useListLandProspects } from "@workspace/api-client-react";
import {
  ChevronRight, ChevronLeft, Brain, Loader2, AlertTriangle, BarChart3,
  TrendingUp, MapPin, Target, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SLISCompetitorMap } from "@/components/slis-competitor-map";

// ─── Scoring helpers ─────────────────────────────────────────────────────────

function scoreBar(score: number, max = 100) {
  const pct = (score / max) * 100;
  const color = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-400" : score >= 50 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-8 text-right">{score}</span>
    </div>
  );
}

function GradeDot({ grade }: { grade: Grade }) {
  const colors: Record<Grade, string> = {
    sangat_potensial: "bg-emerald-500",
    potensial: "bg-amber-400",
    sedang: "bg-orange-500",
    tidak_direkomendasikan: "bg-red-500",
  };
  return <span className={cn("inline-block size-2 rounded-full shrink-0", colors[grade])} />;
}

// ─── Scoring factor tables ────────────────────────────────────────────────

const KAB_FACTOR_LABELS: { key: keyof typeof KAB_WEIGHTS; label: string }[] = [
  { key: "pertumbuhanPenduduk", label: "Pertumbuhan Penduduk" },
  { key: "rumahTanggaBaru", label: "Rumah Tangga Baru" },
  { key: "realisasiFLPP", label: "Realisasi FLPP" },
  { key: "pertumbuhanEkonomi", label: "Pertumbuhan Ekonomi" },
  { key: "pdrbPerKapita", label: "PDRB Per Kapita" },
  { key: "tingkatUrbanisasi", label: "Tingkat Urbanisasi" },
  { key: "tingkatPengangguran", label: "Tingkat Pengangguran" },
  { key: "infrastrukturStrategis", label: "Infrastruktur Strategis" },
  { key: "jumlahKompetitor", label: "Kompetitor (bobot pasar)" },
  { key: "hargaTanahScore", label: "Harga Tanah" },
];

const KEC_FACTOR_LABELS: { key: keyof KecamatanScore; label: string }[] = [
  { key: "jarakPusatKota", label: "Jarak dari Pusat Kota" },
  { key: "jalanNasional", label: "Kedekatan Jalan Nasional" },
  { key: "kawasanIndustri", label: "Kawasan Industri" },
  { key: "pasar", label: "Kedekatan Pasar" },
  { key: "perkantoran", label: "Kedekatan Perkantoran" },
  { key: "sekolah", label: "Kedekatan Sekolah" },
  { key: "rumahSakit", label: "Kedekatan Rumah Sakit" },
  { key: "kompetitor", label: "Kompetitor" },
  { key: "hargaTanah", label: "Harga Tanah" },
  { key: "topografi", label: "Topografi" },
];

const DESA_FACTOR_LABELS: { key: keyof DesaScore; label: string }[] = [
  { key: "kepadatanPenduduk", label: "Kepadatan Penduduk" },
  { key: "pertumbuhanPenduduk", label: "Pertumbuhan Penduduk" },
  { key: "hargaTanah", label: "Harga Tanah" },
  { key: "aksesJalan", label: "Akses Jalan" },
  { key: "pln", label: "PLN" },
  { key: "pdam", label: "PDAM" },
  { key: "internetFiber", label: "Internet Fiber" },
  { key: "kompetitor", label: "Kompetitor" },
  { key: "potensiUnit", label: "Potensi Unit" },
];

// ─── Detail panels ────────────────────────────────────────────────────────

function KabupatenDetail({ kab, onSelectKec }: { kab: KabupatenScore; onSelectKec: (k: KecamatanScore) => void }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={cn("rounded-lg border p-3", getGradeBg(kab.grade))}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">{kab.name}</div>
            <div className="text-[11px] mt-0.5">{getGradeLabel(kab.grade)}</div>
          </div>
          <div className="text-3xl font-black">{kab.score}</div>
        </div>
        <div className="mt-2 h-2 bg-white/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-current transition-all" style={{ width: `${kab.score}%` }} />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {[
          { l: "Populasi", v: kab.populasi },
          { l: "Pertumbuhan", v: `+${kab.pertumbuhanPct}%/thn` },
          { l: "Harga Tanah", v: kab.hargaTanahRange },
          { l: "Kompetitor", v: `${kab.kompetitorCount} developer` },
        ].map(({ l, v }) => (
          <div key={l} className="bg-muted/40 border rounded-md px-2.5 py-1.5">
            <div className="text-[10px] text-muted-foreground">{l}</div>
            <div className="font-semibold mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      {/* Infrastruktur */}
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5">INFRASTRUKTUR STRATEGIS</div>
        <div className="flex flex-wrap gap-1">
          {kab.infrastruktur.map((i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded">{i}</span>
          ))}
        </div>
      </div>

      {/* Potensi pasar */}
      <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2.5 leading-relaxed">
        {kab.potensiPasar}
      </div>

      {/* Factor scores */}
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">SCORING FAKTOR (Modul 1)</div>
        <div className="space-y-1.5">
          {KAB_FACTOR_LABELS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-[10px] text-muted-foreground truncate">{label}</div>
              <div className="w-28">{scoreBar(kab[key as keyof KabupatenScore] as number)}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 text-right">
          Bobot: 15%/10%/15%/10%/10%/5%/5%/10%/10%/10%
        </div>
      </div>

      {/* Kecamatan */}
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">KECAMATAN (Modul 2)</div>
        <div className="space-y-1">
          {[...kab.kecamatan].sort((a, b) => b.score - a.score).map((kec, i) => (
            <button
              key={kec.id}
              onClick={() => onSelectKec(kec)}
              className="w-full flex items-center gap-2 p-2 rounded-lg border hover:border-foreground/30 hover:bg-muted/30 transition-colors text-left group"
            >
              <span className="text-[10px] text-muted-foreground w-4">#{i + 1}</span>
              <GradeDot grade={kec.score >= 80 ? "sangat_potensial" : kec.score >= 65 ? "potensial" : kec.score >= 50 ? "sedang" : "tidak_direkomendasikan"} />
              <span className="flex-1 text-[11px] font-medium">{kec.name}</span>
              <span className="text-[11px] font-bold">{kec.score}</span>
              <ChevronRight className="size-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KecamatanDetail({ kec, kabName, onSelectDesa, onBack }: { kec: KecamatanScore; kabName: string; onSelectDesa: (d: DesaScore) => void; onBack: () => void }) {
  const kecGrade: Grade = kec.score >= 80 ? "sangat_potensial" : kec.score >= 65 ? "potensial" : kec.score >= 50 ? "sedang" : "tidak_direkomendasikan";
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="size-3.5" /> Kembali ke {kabName}
      </button>
      <div className={cn("rounded-lg border p-3", getGradeBg(kecGrade))}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] opacity-70">{kabName}</div>
            <div className="font-bold text-sm">{kec.name}</div>
            <div className="text-[11px] mt-0.5">{getGradeLabel(kecGrade)}</div>
          </div>
          <div className="text-3xl font-black">{kec.score}</div>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">SCORING FAKTOR (Modul 2)</div>
        <div className="space-y-1.5">
          {KEC_FACTOR_LABELS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-[10px] text-muted-foreground truncate">{label}</div>
              <div className="w-28">{scoreBar(kec[key as keyof KecamatanScore] as number)}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 text-right">
          Bobot: 15%/10%/10%/10%/5%/5%/5%/15%/15%/10%
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">DESA (Modul 3)</div>
        <div className="space-y-1">
          {[...kec.desa].sort((a, b) => b.score - a.score).map((d, i) => (
            <button
              key={d.id}
              onClick={() => onSelectDesa(d)}
              className="w-full flex items-center gap-2 p-2 rounded-lg border hover:border-foreground/30 hover:bg-muted/30 transition-colors text-left group"
            >
              <span className="text-[10px] text-muted-foreground w-4">#{i + 1}</span>
              <GradeDot grade={d.score >= 80 ? "sangat_potensial" : d.score >= 65 ? "potensial" : d.score >= 50 ? "sedang" : "tidak_direkomendasikan"} />
              <span className="flex-1 text-[11px] font-medium">{d.name}</span>
              <span className="text-[10px] text-muted-foreground">{d.hargaTanahEst}</span>
              <span className="text-[11px] font-bold ml-1">{d.score}</span>
              <ChevronRight className="size-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesaDetail({ desa, kecName, kabName, onBack }: { desa: DesaScore; kecName: string; kabName: string; onBack: () => void }) {
  const desaGrade: Grade = desa.score >= 80 ? "sangat_potensial" : desa.score >= 65 ? "potensial" : desa.score >= 50 ? "sedang" : "tidak_direkomendasikan";
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="size-3.5" /> Kembali ke {kecName}
      </button>
      <div className={cn("rounded-lg border p-3", getGradeBg(desaGrade))}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] opacity-70">{kecName}, {kabName}</div>
            <div className="font-bold text-sm">{desa.name}</div>
            <div className="text-[11px] mt-0.5">{getGradeLabel(desaGrade)}</div>
          </div>
          <div className="text-3xl font-black">{desa.score}</div>
        </div>
      </div>

      <div className="bg-muted/30 border rounded-md p-2.5 text-[11px]">
        <span className="text-muted-foreground">Estimasi harga tanah: </span>
        <span className="font-semibold">{desa.hargaTanahEst}</span>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">SCORING FAKTOR (Modul 3)</div>
        <div className="space-y-1.5">
          {DESA_FACTOR_LABELS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-[10px] text-muted-foreground truncate">{label}</div>
              <div className="w-28">{scoreBar(desa[key as keyof DesaScore] as number)}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 text-right">
          Bobot: 10%/10%/20%/15%/5%/5%/5%/15%/15%
        </div>
      </div>
    </div>
  );
}

// ─── Sorted kabupaten list ────────────────────────────────────────────────

const SORTED_KAB = [...KABUPATEN_DATA].sort((a, b) => b.score - a.score);

// ─── Roadmap AI Panel ─────────────────────────────────────────────────────

interface RoadmapResult {
  ringkasan_strategi: string;
  roadmap: { tahun: number; kabupaten: string; kecamatan_prioritas: string[]; alasan: string; target_unit: number; estimasi_investasi: string; risiko_utama: string }[];
  kabupaten_prioritas: { rank: number; name: string; alasan_singkat: string }[];
  rekomendasi_segera: string;
  peringatan: string;
}

function RoadmapPanel({ prospects }: { prospects: { lokasi: string; kabupaten?: string | null; luas: number; hargaM2: number; roi: number; status: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/expansion-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kabupatenRanking: SORTED_KAB.map(k => ({
            name: k.name, score: k.score, grade: getGradeLabel(k.grade),
            hargaTanahRange: k.hargaTanahRange, kompetitorCount: k.kompetitorCount, potensiPasar: k.potensiPasar,
          })),
          prospects: (prospects ?? []).map(p => ({
            lokasi: p.lokasi, kabupaten: p.kabupaten, luas: p.luas, hargaM2: p.hargaM2, roi: p.roi, status: p.status,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menghubungi AI");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const YEAR_COLORS = ["bg-emerald-600", "bg-blue-600", "bg-slate-600", "bg-amber-600", "bg-orange-600"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Expansion Roadmap AI</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            AI menentukan kabupaten, kecamatan, dan lahan prioritas ekspansi 5 tahun
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background transition-colors disabled:opacity-60"
        >
          {loading ? <><Loader2 className="size-3.5 animate-spin" /> Generating...</>
            : result ? <><RefreshCw className="size-3.5" /> Regenerate</>
            : <><Brain className="size-3.5" /> Generate Roadmap</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertTriangle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          AI sedang menganalisis data 24 kabupaten + pipeline prospek...
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Ringkasan strategi */}
          <div className="bg-muted/30 border border-border rounded-lg p-3">
            <div className="text-[10px] font-semibold text-foreground tracking-wider mb-1.5">STRATEGI EKSPANSI</div>
            <p className="text-[11px] leading-relaxed">{result.ringkasan_strategi}</p>
          </div>

          {/* Roadmap timeline */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">ROADMAP 5 TAHUN</div>
            <div className="space-y-2">
              {result.roadmap.map((item, i) => (
                <div key={item.tahun} className="flex gap-3 items-start">
                  <div className={cn("text-[10px] font-black text-white px-2 py-1 rounded-md shrink-0 mt-0.5", YEAR_COLORS[i % 5])}>
                    {item.tahun}
                  </div>
                  <div className="flex-1 bg-card border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-[12px]">{item.kabupaten}</div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{item.target_unit} unit</span>
                        <span className="font-semibold text-foreground">{item.estimasi_investasi}</span>
                      </div>
                    </div>
                    {item.kecamatan_prioritas?.length > 0 && (
                      <div className="flex gap-1 mb-1.5">
                        {item.kecamatan_prioritas.map(k => (
                          <span key={k} className="text-[9px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded">{k}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{item.alasan}</p>
                    {item.risiko_utama && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-700">
                        <AlertTriangle className="size-2.5 shrink-0" />
                        {item.risiko_utama}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kabupaten prioritas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">PRIORITAS KABUPATEN</div>
              <div className="space-y-1">
                {result.kabupaten_prioritas.map(k => (
                  <div key={k.rank} className="flex items-start gap-2 text-[11px]">
                    <span className="text-[10px] text-muted-foreground w-5 shrink-0">#{k.rank}</span>
                    <div>
                      <span className="font-medium">{k.name}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{k.alasan_singkat}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] font-semibold text-emerald-700 tracking-wider mb-1">REKOMENDASI SEGERA</div>
                <p className="text-[11px] leading-relaxed">{result.rekomendasi_segera}</p>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-amber-700 tracking-wider mb-1">PERINGATAN</div>
                <p className="text-[11px] leading-relaxed text-amber-700">{result.peringatan}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="text-center py-12 text-[11px] text-muted-foreground">
          <Target className="size-8 mx-auto mb-3 text-muted-foreground/30" />
          <p>Klik <strong>Generate Roadmap</strong> untuk mendapatkan rekomendasi ekspansi berbasis AI</p>
          <p className="mt-1">AI akan menganalisis scoring 24 kabupaten + pipeline prospek aktif</p>
        </div>
      )}
    </div>
  );
}

// ─── Main SLIS Page ───────────────────────────────────────────────────────

type Panel = "list" | "kab" | "kec" | "desa";

export default function SLIS() {
  const { data: prospects } = useListLandProspects({});
  const [activeTab, setActiveTab] = useState<"heatmap" | "ranking" | "roadmap">("heatmap");
  const [panel, setPanel] = useState<Panel>("list");
  const [selectedKab, setSelectedKab] = useState<KabupatenScore | null>(null);
  const [selectedKec, setSelectedKec] = useState<KecamatanScore | null>(null);
  const [selectedDesa, setSelectedDesa] = useState<DesaScore | null>(null);
  const [filterGrade, setFilterGrade] = useState<Grade | "all">("all");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  function selectKab(kab: KabupatenScore) {
    setSelectedKab(kab);
    setSelectedKec(null);
    setSelectedDesa(null);
    setPanel("kab");
    setFlyTo({ lat: kab.lat, lng: kab.lng });
    sidebarRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectKec(kec: KecamatanScore) {
    setSelectedKec(kec);
    setSelectedDesa(null);
    setPanel("kec");
    if (kec.lat && kec.lng) setFlyTo({ lat: kec.lat, lng: kec.lng });
    sidebarRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectDesa(desa: DesaScore) {
    setSelectedDesa(desa);
    setPanel("desa");
    sidebarRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filteredKab = filterGrade === "all" ? SORTED_KAB : SORTED_KAB.filter(k => k.grade === filterGrade);

  const TABS = [
    { key: "heatmap" as const, label: "Heatmap Sulsel", icon: MapPin },
    { key: "ranking" as const, label: "Ranking", icon: BarChart3 },
    { key: "roadmap" as const, label: "Roadmap AI", icon: TrendingUp },
  ];

  const GRADE_FILTERS: { key: Grade | "all"; label: string; color: string }[] = [
    { key: "all", label: "Semua", color: "border-border" },
    { key: "sangat_potensial", label: "🟢 Sangat Potensial", color: "border-emerald-500 text-emerald-700" },
    { key: "potensial", label: "🟡 Potensial", color: "border-amber-400 text-amber-700" },
    { key: "sedang", label: "🟠 Sedang", color: "border-orange-500 text-orange-700" },
    { key: "tidak_direkomendasikan", label: "🔴 Tidak Rek.", color: "border-red-500 text-red-700" },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center size-7 rounded-md bg-foreground text-background text-xs font-black">S</span>
            SLIS
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kabupaten · Kecamatan · Desa Scoring Engine — Sulawesi Selatan
          </p>
        </div>
        <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-medium">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors",
                activeTab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── HEATMAP TAB ── */}
      {activeTab === "heatmap" && (
        <div className="flex gap-3 min-h-0 flex-1" style={{ height: "calc(100vh - 200px)", minHeight: 560 }}>
          {/* LEFT: Sidebar with ranked list or detail */}
          <div ref={sidebarRef} className="w-80 shrink-0 bg-card border rounded-xl overflow-y-auto p-3 space-y-2">
            {panel === "list" && (
              <>
                <div className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                  RANKING KABUPATEN — {SORTED_KAB.length} Kabupaten/Kota
                </div>
                <div className="flex flex-wrap gap-1">
                  {GRADE_FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilterGrade(f.key)}
                      className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                        filterGrade === f.key ? cn("bg-foreground text-background border-foreground") : cn("bg-background", f.color, "hover:bg-muted")
                      )}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  {filteredKab.map((kab, i) => (
                    <button key={kab.id} onClick={() => selectKab(kab)}
                      className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border hover:border-foreground/30 hover:bg-muted/30 transition-colors text-left group",
                        selectedKab?.id === kab.id ? "border-foreground/30 bg-muted/30" : "border-transparent"
                      )}>
                      <span className="text-[10px] text-muted-foreground w-5 shrink-0">#{SORTED_KAB.indexOf(kab) + 1}</span>
                      <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: getGradeColor(kab.grade) }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate">{kab.name}</div>
                        <div className="text-[9px] text-muted-foreground">{getGradeLabel(kab.grade)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] font-black">{kab.score}</div>
                      </div>
                      <ChevronRight className="size-3 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {panel === "kab" && selectedKab && (
              <>
                <button onClick={() => { setPanel("list"); setSelectedKab(null); }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1">
                  <ChevronLeft className="size-3.5" /> Semua Kabupaten
                </button>
                <KabupatenDetail kab={selectedKab} onSelectKec={selectKec} />
              </>
            )}

            {panel === "kec" && selectedKec && selectedKab && (
              <KecamatanDetail
                kec={selectedKec}
                kabName={selectedKab.name}
                onSelectDesa={selectDesa}
                onBack={() => { setPanel("kab"); setSelectedKec(null); }}
              />
            )}

            {panel === "desa" && selectedDesa && selectedKec && selectedKab && (
              <DesaDetail
                desa={selectedDesa}
                kecName={selectedKec.name}
                kabName={selectedKab.name}
                onBack={() => { setPanel("kec"); setSelectedDesa(null); }}
              />
            )}
          </div>

          {/* RIGHT: Competitor Distribution Map */}
          <SLISCompetitorMap
            selectedKab={selectedKab}
            onKabSelect={selectKab}
            flyTo={flyTo}
          />
        </div>
      )}

      {/* ── RANKING TAB ── */}
      {activeTab === "ranking" && (
        <div className="space-y-4">
          {/* Grade summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { grade: "sangat_potensial" as Grade, label: "Sangat Potensial", icon: "🟢" },
              { grade: "potensial" as Grade, label: "Potensial", icon: "🟡" },
              { grade: "sedang" as Grade, label: "Sedang", icon: "🟠" },
              { grade: "tidak_direkomendasikan" as Grade, label: "Tidak Direk.", icon: "🔴" },
            ].map(({ grade, label, icon }) => {
              const count = KABUPATEN_DATA.filter(k => k.grade === grade).length;
              return (
                <div key={grade} className={cn("rounded-xl border p-3", getGradeBg(grade))}>
                  <div className="text-lg">{icon}</div>
                  <div className="font-bold text-xl">{count}</div>
                  <div className="text-[11px] font-medium mt-0.5">{label}</div>
                </div>
              );
            })}
          </div>

          {/* Full ranking table */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Ranking Kabupaten — Modul 1</h3>
              <span className="text-[11px] text-muted-foreground">24 Kabupaten/Kota Sulawesi Selatan</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-10">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Kabupaten / Kota</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Skor</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Grade</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Populasi</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Harga Tanah</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Kompetitor</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground w-32">Score Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {SORTED_KAB.map((kab, i) => (
                    <tr key={kab.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => { setActiveTab("heatmap"); selectKab(kab); }}>
                      <td className="px-4 py-2.5 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{kab.name}</td>
                      <td className="px-3 py-2.5 text-center font-black">{kab.score}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-medium", getGradeBg(kab.grade))}>
                          {getGradeLabel(kab.grade)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{kab.populasi}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{kab.hargaTanahRange}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{kab.kompetitorCount}</td>
                      <td className="px-3 py-2.5 w-32">{scoreBar(kab.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bobot scoring notice */}
          <div className="bg-muted/30 border rounded-xl p-4 text-[11px] text-muted-foreground">
            <div className="font-semibold text-foreground mb-1.5">Bobot Scoring Kabupaten (Modul 1)</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {KAB_FACTOR_LABELS.map(({ key, label }) => (
                <span key={key}><strong>{KAB_WEIGHTS[key as keyof typeof KAB_WEIGHTS]}%</strong> {label}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ROADMAP AI TAB ── */}
      {activeTab === "roadmap" && (
        <div className="bg-card border rounded-xl p-4">
          <RoadmapPanel prospects={(prospects ?? []).map(p => ({
            lokasi: p.lokasi,
            kabupaten: p.kabupaten,
            luas: p.luas,
            hargaM2: p.hargaM2,
            roi: p.roi,
            status: p.status,
          }))} />
        </div>
      )}
    </div>
  );
}
