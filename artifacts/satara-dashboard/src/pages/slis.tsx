import { useState, useRef, useEffect } from "react";
import {
  KABUPATEN_DATA, getGradeColor, getGradeLabel, getGradeBg,
  KAB_WEIGHTS,
  type KabupatenScore, type KecamatanScore, type DesaScore, type Grade,
} from "@/data/slis-scoring";
import { useListLandProspects } from "@workspace/api-client-react";
import {
  ChevronRight, ChevronLeft, Brain, Loader2, AlertTriangle, BarChart3,
  TrendingUp, MapPin, Target, RefreshCw, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SLISCompetitorMap } from "@/components/slis-competitor-map";
import { SlisAiChat } from "@/components/slis-ai-chat";

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

const KAB_FACTOR_LABELS: { key: keyof typeof KAB_WEIGHTS; label: string; bobot: number }[] = [
  { key: "pertumbuhanPenduduk", label: "Pertumbuhan Penduduk", bobot: 15 },
  { key: "rumahTanggaBaru", label: "Rumah Tangga Baru", bobot: 10 },
  { key: "realisasiFLPP", label: "Realisasi FLPP", bobot: 15 },
  { key: "pertumbuhanEkonomi", label: "Pertumbuhan Ekonomi", bobot: 10 },
  { key: "pdrbPerKapita", label: "PDRB Per Kapita", bobot: 10 },
  { key: "tingkatUrbanisasi", label: "Tingkat Urbanisasi", bobot: 5 },
  { key: "tingkatPengangguran", label: "Tingkat Pengangguran", bobot: 5 },
  { key: "infrastrukturStrategis", label: "Infrastruktur Strategis", bobot: 10 },
  { key: "jumlahKompetitor", label: "Peluang Pasar (Kompetitor)", bobot: 10 },
  { key: "hargaTanahScore", label: "Harga Tanah", bobot: 10 },
];

const KEC_FACTOR_BOBOT: Record<string, number> = {
  jarakPusatKota: 15, jalanNasional: 10, kawasanIndustri: 10, pasar: 10,
  perkantoran: 5, sekolah: 5, rumahSakit: 5, kompetitor: 15, hargaTanah: 15, topografi: 10,
};
const DESA_FACTOR_BOBOT: Record<string, number> = {
  kepadatanPenduduk: 10, pertumbuhanPenduduk: 10, hargaTanah: 20, aksesJalan: 15,
  pln: 5, pdam: 5, internetFiber: 5, kompetitor: 15, potensiUnit: 15,
};

// ─── Rekomendasi builder ────────────────────────────────────────────────────

function buildKabRekomendasi(kab: KabupatenScore): { verdict: string; verdictColor: string; kekuatan: string[]; kelemahan: string[]; kesimpulan: string } {
  const factors = KAB_FACTOR_LABELS.map(f => ({
    label: f.label,
    score: kab[f.key as keyof KabupatenScore] as number,
    bobot: f.bobot,
  }));
  const sorted = [...factors].sort((a, b) => b.score - a.score);
  const kekuatan = sorted.filter(f => f.score >= 75).slice(0, 3).map(f => `${f.label} (${f.score})`);
  const kelemahan = [...factors].sort((a, b) => a.score - b.score).filter(f => f.score < 65).slice(0, 3).map(f => `${f.label} (${f.score})`);

  let verdict: string;
  let verdictColor: string;
  let kesimpulan: string;

  if (kab.grade === "sangat_potensial") {
    verdict = "REKOMENDASIKAN — Masuk Sekarang";
    verdictColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    kesimpulan = `${kab.name} menunjukkan kombinasi permintaan perumahan kuat dan kondisi pasar yang mendukung. Skor ${kab.score}/100 mencerminkan peluang investasi properti yang menarik. Segera lakukan survei lapangan dan amankan lahan di kecamatan-kecamatan prioritas sebelum kompetitor bergerak.`;
  } else if (kab.grade === "potensial") {
    verdict = "POTENSIAL — Entry dengan Seleksi Ketat";
    verdictColor = "text-amber-600 bg-amber-50 border-amber-200";
    kesimpulan = `${kab.name} memiliki potensi dengan catatan. Skor ${kab.score}/100 menunjukkan beberapa faktor perlu diperkuat. Fokus pada kecamatan dengan nilai tertinggi, hindari area dengan kelemahan ganda. Due diligence lokasi spesifik sangat penting.`;
  } else if (kab.grade === "sedang") {
    verdict = "TAHAN — Butuh Analisis Lebih Dalam";
    verdictColor = "text-orange-600 bg-orange-50 border-orange-200";
    kesimpulan = `${kab.name} berada di zona sedang (skor ${kab.score}/100). Beberapa faktor fundamental masih di bawah threshold ideal untuk pengembangan perumahan. Tidak disarankan masuk skala besar — jika ada, pilih proyek kecil di kecamatan paling potensial sebagai pilot.`;
  } else {
    verdict = "TIDAK DIREKOMENDASIKAN — Risiko Tinggi";
    verdictColor = "text-red-600 bg-red-50 border-red-200";
    kesimpulan = `${kab.name} saat ini tidak memenuhi threshold minimum pengembangan perumahan Satara (skor ${kab.score}/100). Kombinasi kelemahan di beberapa faktor kunci menciptakan risiko bisnis yang signifikan. Alokasikan sumber daya ke kabupaten dengan skor lebih tinggi.`;
  }

  return { verdict, verdictColor, kekuatan, kelemahan, kesimpulan };
}

const KEC_FACTOR_LABELS: { key: keyof KecamatanScore; label: string; bobot: number }[] = [
  { key: "jarakPusatKota", label: "Jarak dari Pusat Kota", bobot: 15 },
  { key: "jalanNasional", label: "Kedekatan Jalan Nasional", bobot: 10 },
  { key: "kawasanIndustri", label: "Kawasan Industri", bobot: 10 },
  { key: "pasar", label: "Kedekatan Pasar", bobot: 10 },
  { key: "perkantoran", label: "Kedekatan Perkantoran", bobot: 5 },
  { key: "sekolah", label: "Kedekatan Sekolah", bobot: 5 },
  { key: "rumahSakit", label: "Kedekatan Rumah Sakit", bobot: 5 },
  { key: "kompetitor", label: "Peluang Pasar (Kompetitor)", bobot: 15 },
  { key: "hargaTanah", label: "Harga Tanah", bobot: 15 },
  { key: "topografi", label: "Topografi", bobot: 10 },
];

const DESA_FACTOR_LABELS: { key: keyof DesaScore; label: string; bobot: number }[] = [
  { key: "kepadatanPenduduk", label: "Kepadatan Penduduk", bobot: 10 },
  { key: "pertumbuhanPenduduk", label: "Pertumbuhan Penduduk", bobot: 10 },
  { key: "hargaTanah", label: "Harga Tanah", bobot: 20 },
  { key: "aksesJalan", label: "Akses Jalan", bobot: 15 },
  { key: "pln", label: "PLN", bobot: 5 },
  { key: "pdam", label: "PDAM", bobot: 5 },
  { key: "internetFiber", label: "Internet Fiber", bobot: 5 },
  { key: "kompetitor", label: "Peluang Pasar (Kompetitor)", bobot: 15 },
  { key: "potensiUnit", label: "Potensi Unit", bobot: 15 },
];

// ─── Detail panels ────────────────────────────────────────────────────────

function KabupatenDetail({ kab, onSelectKec }: { kab: KabupatenScore; onSelectKec: (k: KecamatanScore) => void }) {
  const rek = buildKabRekomendasi(kab);
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
      {kab.infrastruktur.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5">INFRASTRUKTUR STRATEGIS</div>
          <div className="flex flex-wrap gap-1">
            {kab.infrastruktur.map((i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded">{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rekomendasi */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider">REKOMENDASI SATARA</div>
        <div className={cn("rounded-md border px-2.5 py-1.5 text-[11px] font-semibold", rek.verdictColor)}>
          {rek.verdict}
        </div>
        <div className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-2.5">
          {rek.kesimpulan}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rek.kekuatan.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2">
              <div className="text-[9px] font-bold text-emerald-700 tracking-wider mb-1">KEKUATAN</div>
              {rek.kekuatan.map(k => (
                <div key={k} className="text-[10px] text-emerald-800 flex items-start gap-1">
                  <span className="mt-0.5 shrink-0">+</span><span>{k}</span>
                </div>
              ))}
            </div>
          )}
          {rek.kelemahan.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2">
              <div className="text-[9px] font-bold text-red-700 tracking-wider mb-1">KELEMAHAN</div>
              {rek.kelemahan.map(k => (
                <div key={k} className="text-[10px] text-red-800 flex items-start gap-1">
                  <span className="mt-0.5 shrink-0">-</span><span>{k}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Potensi pasar */}
      <div className="text-[10px] italic text-muted-foreground/70 border-l-2 border-muted pl-2">
        {kab.potensiPasar}
      </div>

      {/* Factor scores */}
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">SCORING FAKTOR (Modul 1)</div>
        <div className="space-y-1.5">
          {KAB_FACTOR_LABELS.map(({ key, label, bobot }) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-[10px] text-muted-foreground truncate">
                {label} <span className="text-muted-foreground/50">({bobot}%)</span>
              </div>
              <div className="w-28">{scoreBar(kab[key as keyof KabupatenScore] as number)}</div>
            </div>
          ))}
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
          {KEC_FACTOR_LABELS.map(({ key, label, bobot }) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-[10px] text-muted-foreground truncate">
                {label} <span className="text-muted-foreground/50">({bobot}%)</span>
              </div>
              <div className="w-28">{scoreBar(kec[key as keyof KecamatanScore] as number)}</div>
            </div>
          ))}
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
          {DESA_FACTOR_LABELS.map(({ key, label, bobot }) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="text-[10px] text-muted-foreground truncate">
                {label} <span className="text-muted-foreground/50">({bobot}%)</span>
              </div>
              <div className="w-28">{scoreBar(desa[key as keyof DesaScore] as number)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sorted kabupaten list ────────────────────────────────────────────────

const SORTED_KAB = [...KABUPATEN_DATA].sort((a, b) => b.score - a.score);

// ─── Roadmap AI Panel ─────────────────────────────────────────────────────

interface RoadmapItem {
  tahun: number; kabupaten: string; kecamatan_prioritas: string[];
  alasan: string; target_unit: number; estimasi_investasi: string;
  estimasi_revenue?: string; risiko_utama: string; mitigasi_risiko?: string; strategi_masuk?: string;
}
interface KabPrioritas {
  rank: number; name: string; skor?: number; alasan: string;
  kecamatan_terbaik?: string; harga_tanah_range?: string;
  estimasi_unit_potensi?: number; timeline_masuk?: string;
  alasan_singkat?: string;
}
interface MilestoneItem { periode: string; target: string; }
interface RoadmapResult {
  ringkasan_strategi: string;
  analisis_pasar?: string;
  analisis_kompetitor?: string;
  roadmap: RoadmapItem[];
  kabupaten_prioritas: KabPrioritas[];
  rekomendasi_segera: string | string[];
  peringatan: string | string[];
  strategi_finansial?: string;
  milestone_kunci?: MilestoneItem[];
}

const SORTED_KAB_WITH_KEC = SORTED_KAB.map(k => ({
  name: k.name, score: k.score, grade: getGradeLabel(k.grade),
  hargaTanahRange: k.hargaTanahRange, kompetitorCount: k.kompetitorCount, potensiPasar: k.potensiPasar,
  kecamatanTeratas: k.kecamatan?.slice(0, 3).map((kec: KecamatanScore) => kec.name) ?? [],
}));

function RoadmapPanel({ prospects }: { prospects: { lokasi: string; kabupaten?: string | null; luas: number; hargaM2: number; roi: number; status: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generated = useRef(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/expansion-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kabupatenRanking: SORTED_KAB_WITH_KEC,
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

  useEffect(() => {
    if (!generated.current) { generated.current = true; generate(); }
  }, []);

  const YEAR_COLORS = ["bg-emerald-600", "bg-blue-600", "bg-slate-600", "bg-amber-600", "bg-orange-600"];
  const toArr = (v: string | string[] | undefined) =>
    !v ? [] : Array.isArray(v) ? v : [v];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Analisis Ekspansi Komprehensif</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Roadmap 5 tahun · Prioritas kabupaten · Strategi finansial · Milestone kunci
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background transition-colors disabled:opacity-60"
        >
          {loading ? <><Loader2 className="size-3.5 animate-spin" /> Generating...</>
            : result ? <><RefreshCw className="size-3.5" /> Regenerate</>
            : <><Brain className="size-3.5" /> Generate</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertTriangle className="size-3.5 shrink-0" />
          {error}
          <button onClick={generate} className="ml-auto underline font-medium">Coba lagi</button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-[11px] text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <div className="text-center">
            <div className="font-medium">Sedang menganalisis...</div>
            <div className="mt-1 text-muted-foreground/70">Scoring 24 kabupaten · Pipeline prospek aktif · Kondisi pasar Sulsel</div>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">

          {/* Ringkasan + Pasar + Kompetitor — 3 card sejajar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-muted/30 border border-border rounded-lg p-3">
              <div className="text-[10px] font-semibold text-foreground tracking-wider mb-1.5">STRATEGI EKSPANSI</div>
              <p className="text-[11px] leading-relaxed">{result.ringkasan_strategi}</p>
            </div>
            {result.analisis_pasar && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-[10px] font-semibold text-blue-800 tracking-wider mb-1.5">ANALISIS PASAR</div>
                <p className="text-[11px] leading-relaxed text-blue-900">{result.analisis_pasar}</p>
              </div>
            )}
            {result.analisis_kompetitor && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <div className="text-[10px] font-semibold text-violet-800 tracking-wider mb-1.5">POSISI KOMPETITOR</div>
                <p className="text-[11px] leading-relaxed text-violet-900">{result.analisis_kompetitor}</p>
              </div>
            )}
          </div>

          {/* Roadmap 5 tahun */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">ROADMAP EKSPANSI 5 TAHUN (2026–2030)</div>
            <div className="space-y-2">
              {result.roadmap.map((item, i) => (
                <div key={item.tahun} className="flex gap-3 items-start">
                  <div className={cn("text-[10px] font-black text-white px-2 py-1.5 rounded-lg shrink-0 mt-0.5 min-w-[42px] text-center", YEAR_COLORS[i % 5])}>
                    {item.tahun}
                  </div>
                  <div className="flex-1 bg-card border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="font-semibold text-[12px]">{item.kabupaten}</div>
                      <div className="flex items-center gap-3 text-[10px] shrink-0">
                        <span className="text-muted-foreground">{item.target_unit} unit</span>
                        <span className="font-semibold text-foreground">{item.estimasi_investasi}</span>
                        {item.estimasi_revenue && (
                          <span className="text-emerald-700 font-semibold">{item.estimasi_revenue}</span>
                        )}
                      </div>
                    </div>
                    {item.kecamatan_prioritas?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {item.kecamatan_prioritas.map(k => (
                          <span key={k} className="text-[9px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded">{k}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{item.alasan}</p>
                    {item.strategi_masuk && (
                      <p className="text-[10px] text-foreground/70 mt-1 italic">{item.strategi_masuk}</p>
                    )}
                    <div className="flex gap-3 mt-1.5">
                      {item.risiko_utama && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700">
                          <AlertTriangle className="size-2.5 shrink-0" />{item.risiko_utama}
                        </div>
                      )}
                      {item.mitigasi_risiko && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700">
                          <Target className="size-2.5 shrink-0" />{item.mitigasi_risiko}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kabupaten prioritas + Rekomendasi + Peringatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">PRIORITAS KABUPATEN (TOP 5)</div>
              <div className="space-y-2">
                {result.kabupaten_prioritas.map(k => (
                  <div key={k.rank} className="bg-card border rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-muted-foreground font-bold shrink-0 w-5">#{k.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[11px]">{k.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {k.skor && <span className="text-[10px] font-black">{k.skor}</span>}
                            {k.timeline_masuk && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{k.timeline_masuk}</span>}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{k.alasan ?? k.alasan_singkat}</p>
                        {(k.kecamatan_terbaik || k.harga_tanah_range || k.estimasi_unit_potensi) && (
                          <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground/70">
                            {k.kecamatan_terbaik && <span>Kec: {k.kecamatan_terbaik}</span>}
                            {k.harga_tanah_range && <span>· {k.harga_tanah_range}</span>}
                            {k.estimasi_unit_potensi && <span>· ~{k.estimasi_unit_potensi} unit</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {/* Rekomendasi segera */}
              <div>
                <div className="text-[10px] font-semibold text-emerald-700 tracking-wider mb-1.5">REKOMENDASI SEGERA</div>
                <div className="space-y-1.5">
                  {toArr(result.rekomendasi_segera).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <span className="size-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peringatan */}
              <div>
                <div className="text-[10px] font-semibold text-amber-700 tracking-wider mb-1.5">PERINGATAN RISIKO</div>
                <div className="space-y-1.5">
                  {toArr(result.peringatan).map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-amber-800">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span className="leading-relaxed">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategi finansial */}
              {result.strategi_finansial && (
                <div className="bg-muted/40 border rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-foreground tracking-wider mb-1">STRATEGI FINANSIAL</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{result.strategi_finansial}</p>
                </div>
              )}
            </div>
          </div>

          {/* Milestone kunci */}
          {result.milestone_kunci && result.milestone_kunci.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">MILESTONE KUNCI</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {result.milestone_kunci.map((m, i) => (
                  <div key={i} className="bg-card border rounded-lg p-2.5">
                    <div className="text-[9px] font-bold text-muted-foreground mb-1">{m.periode}</div>
                    <p className="text-[11px] font-medium leading-tight">{m.target}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Main SLIS Page ───────────────────────────────────────────────────────

type Panel = "list" | "kab" | "kec" | "desa";

export default function SLIS() {
  const { data: prospects } = useListLandProspects({});
  const [activeTab, setActiveTab] = useState<"heatmap" | "ranking" | "roadmap" | "tanya-ai">("heatmap");
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
    { key: "tanya-ai" as const, label: "Tanya AI", icon: MessageSquare },
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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            SLIS — Scoring Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kabupaten · Kecamatan · Desa — Sulawesi Selatan
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

      {/* ── TANYA AI TAB ── */}
      {activeTab === "tanya-ai" && (
        <div className="bg-card border rounded-xl overflow-hidden flex-1">
          <SlisAiChat />
        </div>
      )}
    </div>
  );
}
