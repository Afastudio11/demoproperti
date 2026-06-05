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
  Newspaper, Building2, Zap, X, ArrowRight, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// ─── Dropdown navigator hierarkis ────────────────────────────────────────

function WilayahDropdownNav({
  selectedKab, selectedKec, selectedDesa,
  onSelectKab, onSelectKec, onSelectDesa, onReset,
}: {
  selectedKab: KabupatenScore | null;
  selectedKec: KecamatanScore | null;
  selectedDesa: DesaScore | null;
  onSelectKab: (k: KabupatenScore) => void;
  onSelectKec: (k: KecamatanScore) => void;
  onSelectDesa: (d: DesaScore) => void;
  onReset: () => void;
}) {
  const selectCls = cn(
    "h-8 rounded-lg border border-border/60 bg-muted/30 px-2.5 text-[11px] font-medium",
    "focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30",
    "text-foreground cursor-pointer transition-colors hover:border-foreground/30",
    "min-w-[160px]"
  );
  return (
    <div className="bg-card border rounded-xl px-4 py-3 flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground shrink-0">
        <MapPin className="size-3.5" />
        Pilih Wilayah:
      </div>

      {/* Kabupaten */}
      <select
        className={selectCls}
        value={selectedKab?.id ?? ""}
        onChange={(e) => {
          const kab = SORTED_KAB.find(k => k.id === e.target.value);
          if (kab) onSelectKab(kab);
        }}
      >
        <option value="">-- Kabupaten/Kota --</option>
        {SORTED_KAB.map(k => (
          <option key={k.id} value={k.id}>{k.name} ({k.score})</option>
        ))}
      </select>

      {/* Kecamatan */}
      {selectedKab && (
        <>
          <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
          <select
            className={selectCls}
            value={selectedKec?.id ?? ""}
            onChange={(e) => {
              const kec = selectedKab.kecamatan.find(k => k.id === e.target.value);
              if (kec) onSelectKec(kec);
            }}
          >
            <option value="">-- Pilih Kecamatan --</option>
            {[...selectedKab.kecamatan].sort((a, b) => b.score - a.score).map(k => (
              <option key={k.id} value={k.id}>{k.name} ({k.score})</option>
            ))}
          </select>
        </>
      )}

      {/* Desa */}
      {selectedKec && (
        <>
          <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
          <select
            className={selectCls}
            value={selectedDesa?.id ?? ""}
            onChange={(e) => {
              const desa = selectedKec.desa.find(d => d.id === e.target.value);
              if (desa) onSelectDesa(desa);
            }}
          >
            <option value="">-- Pilih Desa/Kel. --</option>
            {[...selectedKec.desa].sort((a, b) => b.score - a.score).map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.score}) — {d.hargaTanahEst}</option>
            ))}
          </select>
        </>
      )}

      {selectedKab && (
        <button
          onClick={onReset}
          className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 rounded-lg px-2 py-1 hover:border-foreground/30 transition-colors"
        >
          <X className="size-2.5" />Reset
        </button>
      )}

      {/* Breadcrumb aktif */}
      {selectedKab && (
        <div className="ml-auto text-[10px] text-muted-foreground/70 font-medium">
          {selectedKab.name}
          {selectedKec ? ` › ${selectedKec.name}` : ""}
          {selectedDesa ? ` › ${selectedDesa.name}` : ""}
        </div>
      )}
    </div>
  );
}

// ─── Kabupaten Insight (AI berita + sinkronisasi lahan) ──────────────────

interface KabInsight {
  situasi_terkini: string;
  perkembangan_infrastruktur: string;
  dinamika_pasar: string;
  peluang_spesifik: string[];
  risiko_aktual: string[];
  sinkronisasi_lahan: string;
  rekomendasi_keputusan: string[];
  skor_urgensi: number;
  alasan_urgensi: string;
}

const KAB_INSIGHT_CACHE_PREFIX = "satara_kab_insight_";
function loadInsightCache(kabupaten: string): KabInsight | null {
  try { return JSON.parse(localStorage.getItem(KAB_INSIGHT_CACHE_PREFIX + kabupaten.toLowerCase()) ?? "null"); }
  catch { return null; }
}
function saveInsightCache(kabupaten: string, data: KabInsight): void {
  localStorage.setItem(KAB_INSIGHT_CACHE_PREFIX + kabupaten.toLowerCase(), JSON.stringify(data));
}

// Normalize kabupaten name to match against prospect.kabupaten field
function normKabName(s: string): string {
  return (s ?? "").toLowerCase().replace(/^kab\.?\s+|^kota\s+|^kabupaten\s+/i, "").trim();
}

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

const ROADMAP_CACHE_KEY = "satara_expansion_roadmap";
function loadRoadmapCache(): RoadmapResult | null {
  try { return JSON.parse(localStorage.getItem(ROADMAP_CACHE_KEY) ?? "null"); } catch { return null; }
}
function saveRoadmapCache(r: RoadmapResult): void { localStorage.setItem(ROADMAP_CACHE_KEY, JSON.stringify(r)); }

// ─── KabDetailPanel ──────────────────────────────────────────────────────────

function UrgencyBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 60 ? "bg-amber-500" : score >= 40 ? "bg-blue-500" : "bg-gray-400";
  const label = score >= 80 ? "Sangat Urgent" : score >= 60 ? "Urgent" : score >= 40 ? "Normal" : "Rendah";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-20 text-right">{score}/100 — {label}</span>
    </div>
  );
}

function KabDetailPanel({
  item, prospects, insight, insightLoading, insightError,
  onLoadInsight, onRefreshInsight, onClose,
}: {
  item: RoadmapItem;
  prospects: { lokasi: string; luas: number; hargaM2: number; roi: number; status: string }[];
  insight: KabInsight | null;
  insightLoading: boolean;
  insightError: string | null;
  onLoadInsight: () => void;
  onRefreshInsight: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"insight" | "lahan">("insight");

  return (
    <div className="ml-[54px] mt-1 border border-foreground/20 rounded-xl bg-muted/10 overflow-hidden">
      {/* Header panel */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-semibold text-[12px]">{item.kabupaten}</span>
          <span className="text-[10px] text-muted-foreground">— Detail & Analisis AI</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Tab switcher */}
          <div className="flex rounded-md border bg-background text-[10px] font-medium overflow-hidden">
            <button
              onClick={() => setTab("insight")}
              className={cn("flex items-center gap-1 px-2.5 py-1 transition-colors", tab === "insight" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Globe className="size-2.5" />Analisis AI
            </button>
            <button
              onClick={() => setTab("lahan")}
              className={cn("flex items-center gap-1 px-2.5 py-1 transition-colors", tab === "lahan" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Building2 className="size-2.5" />Data Lahan
              {prospects.length > 0 && (
                <span className="ml-0.5 bg-emerald-500 text-white rounded-full px-1 text-[8px] font-bold leading-none py-0.5">{prospects.length}</span>
              )}
            </button>
          </div>
          <button onClick={onClose} className="ml-1 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* ── TAB: Analisis AI ── */}
        {tab === "insight" && (
          <div className="space-y-4">
            {/* Belum ada insight — tampilkan tombol */}
            {!insight && !insightLoading && !insightError && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                  <Newspaper className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Analisis AI Belum Dimuat</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    AI akan menganalisis kondisi terkini {item.kabupaten}, sinkronisasi lahan existing, dan memberikan rekomendasi keputusan.
                  </p>
                </div>
                <button
                  onClick={onLoadInsight}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold hover:bg-foreground/90 transition-colors"
                >
                  <Brain className="size-3.5" />
                  Muat Analisis & Berita Terbaru
                </button>
              </div>
            )}

            {/* Loading */}
            {insightLoading && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-[11px] text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <div className="font-medium">Menganalisis {item.kabupaten}...</div>
                <div className="text-muted-foreground/60">Kondisi pasar · Infrastruktur · Sinkronisasi lahan</div>
              </div>
            )}

            {/* Error */}
            {insightError && !insightLoading && (
              <div className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertTriangle className="size-3.5 shrink-0" />{insightError}
                <button onClick={onLoadInsight} className="ml-auto underline font-medium">Coba lagi</button>
              </div>
            )}

            {/* Insight tersedia */}
            {insight && !insightLoading && (
              <div className="space-y-3">
                {/* Skor urgensi */}
                <div className="bg-card border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-500" />
                      <span className="text-[10px] font-semibold tracking-wider">SKOR URGENSI MASUK</span>
                    </div>
                    <button
                      onClick={onRefreshInsight}
                      className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="size-2.5" />Perbarui
                    </button>
                  </div>
                  <UrgencyBar score={insight.skor_urgensi} />
                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">{insight.alasan_urgensi}</p>
                </div>

                {/* 3 card info baris atas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Globe className="size-3 text-blue-500" />
                      <span className="text-[9px] font-semibold text-blue-700 tracking-wider">SITUASI TERKINI</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">{insight.situasi_terkini}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Building2 className="size-3 text-violet-500" />
                      <span className="text-[9px] font-semibold text-violet-700 tracking-wider">INFRASTRUKTUR</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">{insight.perkembangan_infrastruktur}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1.5">
                      <BarChart3 className="size-3 text-emerald-500" />
                      <span className="text-[9px] font-semibold text-emerald-700 tracking-wider">DINAMIKA PASAR</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">{insight.dinamika_pasar}</p>
                  </div>
                </div>

                {/* Sinkronisasi lahan */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-1.5">
                    <MapPin className="size-3 text-amber-600" />
                    <span className="text-[9px] font-semibold text-amber-700 tracking-wider">SINKRONISASI DATA LAHAN</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-amber-900">{insight.sinkronisasi_lahan}</p>
                </div>

                {/* Peluang + Risiko */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="text-[9px] font-semibold text-emerald-700 tracking-wider mb-2">PELUANG SPESIFIK</div>
                    <div className="space-y-1.5">
                      {(insight.peluang_spesifik ?? []).map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-emerald-900">
                          <span className="size-3.5 rounded-full bg-emerald-200 text-emerald-800 text-[8px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <span className="leading-relaxed">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-[9px] font-semibold text-red-700 tracking-wider mb-2">RISIKO AKTUAL</div>
                    <div className="space-y-1.5">
                      {(insight.risiko_aktual ?? []).map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-900">
                          <AlertTriangle className="size-3 text-red-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rekomendasi keputusan */}
                <div className="bg-card border rounded-lg p-3">
                  <div className="text-[9px] font-semibold text-foreground tracking-wider mb-2">REKOMENDASI KEPUTUSAN</div>
                  <div className="space-y-1.5">
                    {(insight.rekomendasi_keputusan ?? []).map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className="size-4 rounded-full bg-foreground text-background text-[8px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span className="leading-relaxed">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Data Lahan Existing ── */}
        {tab === "lahan" && (
          <div className="space-y-3">
            {prospects.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-[11px] text-muted-foreground">
                <Building2 className="size-6 opacity-40" />
                <div className="font-medium">Belum Ada Data Lahan</div>
                <p className="text-muted-foreground/70 max-w-xs">Belum ada prospek lahan yang tercatat untuk {item.kabupaten} di sistem. Tambahkan prospek via modul Akuisisi Lahan.</p>
              </div>
            ) : (
              <>
                <div className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                  {prospects.length} PROSPEK LAHAN DI {item.kabupaten.toUpperCase()}
                </div>
                <div className="space-y-2">
                  {prospects.map((p, i) => {
                    const statusColor = p.status === "completed" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : p.status === "prospect" ? "bg-blue-100 text-blue-700 border-blue-200"
                      : p.status === "negotiation" ? "bg-amber-100 text-amber-700 border-amber-200"
                      : p.status === "due_diligence" ? "bg-violet-100 text-violet-700 border-violet-200"
                      : "bg-muted text-muted-foreground border";
                    const statusLabel = p.status === "completed" ? "Acquired"
                      : p.status === "prospect" ? "Prospek"
                      : p.status === "negotiation" ? "Negosiasi"
                      : p.status === "due_diligence" ? "Due Diligence"
                      : p.status;
                    return (
                      <div key={i} className="bg-card border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[11px] truncate">{p.lokasi}</div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span>{(p.luas / 10000).toFixed(2)} Ha</span>
                              <span>Rp{p.hargaM2.toLocaleString("id-ID")}/m²</span>
                              <span className="text-emerald-700 font-semibold">ROI {p.roi}%</span>
                            </div>
                          </div>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0", statusColor)}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[9px] text-muted-foreground/60 italic pt-1">
                  Data dari modul Akuisisi Lahan · Klik Analisis AI untuk sinkronisasi rekomendasi
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoadmapPanel({ prospects, result, onResult }: {
  prospects: { lokasi: string; kabupaten?: string | null; luas: number; hargaM2: number; roi: number; status: string }[];
  result: RoadmapResult | null;
  onResult: (r: RoadmapResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [insightCache, setInsightCache] = useState<Record<string, KabInsight>>({});
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  async function loadInsight(item: RoadmapItem) {
    const cached = loadInsightCache(item.kabupaten) ?? insightCache[item.kabupaten];
    if (cached) {
      setInsightCache(prev => ({ ...prev, [item.kabupaten]: cached }));
      return;
    }
    setInsightLoading(true);
    setInsightError(null);
    const kabProspects = prospects.filter(p => {
      const n = normKabName(p.kabupaten ?? "");
      const k = normKabName(item.kabupaten);
      return n === k || n.includes(k) || k.includes(n);
    });
    const slisData = KABUPATEN_DATA.find(k => normKabName(k.name) === normKabName(item.kabupaten));
    try {
      const res = await fetch("/api/ai/kabupaten-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kabupaten: item.kabupaten,
          roadmapItem: item,
          prospects: kabProspects.map(p => ({ lokasi: p.lokasi, luas: p.luas, hargaM2: p.hargaM2, roi: p.roi, status: p.status })),
          slisScore: slisData ? {
            score: slisData.score, grade: String(slisData.grade),
            hargaTanahRange: slisData.hargaTanahRange, kompetitorCount: slisData.kompetitorCount, potensiPasar: slisData.potensiPasar,
          } : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menghubungi AI");
      const data = await res.json() as KabInsight;
      setInsightCache(prev => ({ ...prev, [item.kabupaten]: data }));
      saveInsightCache(item.kabupaten, data);
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setInsightLoading(false);
    }
  }

  function handleCardClick(item: RoadmapItem) {
    if (selectedItem?.kabupaten === item.kabupaten) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
      setInsightError(null);
      const cached = loadInsightCache(item.kabupaten);
      if (cached) setInsightCache(prev => ({ ...prev, [item.kabupaten]: cached }));
    }
  }

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
      const data = await res.json() as RoadmapResult;
      onResult(data);
      saveRoadmapCache(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate hanya jika belum ada hasil (cache habis)
  useEffect(() => {
    if (!result) generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-muted-foreground tracking-wider">ROADMAP EKSPANSI 5 TAHUN (2026–2030)</div>
              <div className="text-[9px] text-muted-foreground/60 italic">Klik kartu untuk lihat detail & analisis AI terbaru</div>
            </div>
            <div className="space-y-2">
              {result.roadmap.map((item, i) => {
                const isSelected = selectedItem?.kabupaten === item.kabupaten;
                const insight = insightCache[item.kabupaten];
                const kabProspects = prospects.filter(p => {
                  const n = normKabName(p.kabupaten ?? "");
                  const k = normKabName(item.kabupaten);
                  return n === k || n.includes(k) || k.includes(n);
                });
                return (
                  <div key={item.tahun}>
                    {/* Kartu utama — clickable */}
                    <button
                      className={cn(
                        "w-full flex gap-3 items-start text-left rounded-lg transition-all",
                        isSelected && "ring-2 ring-foreground/30"
                      )}
                      onClick={() => handleCardClick(item)}
                    >
                      <div className={cn("text-[10px] font-black text-white px-2 py-1.5 rounded-lg shrink-0 mt-0.5 min-w-[42px] text-center", YEAR_COLORS[i % 5])}>
                        {item.tahun}
                      </div>
                      <div className={cn(
                        "flex-1 bg-card border rounded-lg p-3 hover:border-foreground/30 transition-colors",
                        isSelected && "border-foreground/40 bg-muted/20"
                      )}>
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[12px]">{item.kabupaten}</span>
                            {kabProspects.length > 0 && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                {kabProspects.length} lahan
                              </span>
                            )}
                            {insight && (
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-bold",
                                insight.skor_urgensi >= 80 ? "bg-red-100 text-red-700 border border-red-200" :
                                insight.skor_urgensi >= 60 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                                "bg-muted text-muted-foreground border"
                              )}>
                                Urgensi {insight.skor_urgensi}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] shrink-0">
                            <span className="text-muted-foreground">{item.target_unit} unit</span>
                            <span className="font-semibold text-foreground">{item.estimasi_investasi}</span>
                            {item.estimasi_revenue && (
                              <span className="text-emerald-700 font-semibold">{item.estimasi_revenue}</span>
                            )}
                            <ArrowRight className={cn("size-3 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
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
                    </button>

                    {/* Detail panel — muncul di bawah kartu yang dipilih */}
                    {isSelected && (
                      <KabDetailPanel
                        item={item}
                        prospects={kabProspects}
                        insight={insight ?? null}
                        insightLoading={insightLoading}
                        insightError={insightError}
                        onLoadInsight={() => loadInsight(item)}
                        onRefreshInsight={() => {
                          localStorage.removeItem(KAB_INSIGHT_CACHE_PREFIX + item.kabupaten.toLowerCase());
                          setInsightCache(prev => { const n = { ...prev }; delete n[item.kabupaten]; return n; });
                          loadInsight(item);
                        }}
                        onClose={() => setSelectedItem(null)}
                      />
                    )}
                  </div>
                );
              })}
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
  const [roadmapResult, setRoadmapResult] = useState<RoadmapResult | null>(loadRoadmapCache);
  const [activeTab, setActiveTab] = useState<"ranking" | "roadmap" | "tanya-ai">("ranking");
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
    { key: "ranking" as const,  label: "Ranking",    icon: BarChart3 },
    { key: "roadmap" as const,  label: "Roadmap AI", icon: TrendingUp },
    { key: "tanya-ai" as const, label: "Tanya AI",   icon: MessageSquare },
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
      <div className="flex items-start justify-end gap-3 flex-wrap">
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

          {/* Dropdown navigator hierarkis */}
          <WilayahDropdownNav
            selectedKab={selectedKab}
            selectedKec={selectedKec}
            selectedDesa={selectedDesa}
            onSelectKab={selectKab}
            onSelectKec={selectKec}
            onSelectDesa={selectDesa}
            onReset={() => { setPanel("list"); setSelectedKab(null); setSelectedKec(null); setSelectedDesa(null); }}
          />

          {/* Detail panel — ditampilkan ketika ada pilihan aktif */}
          {panel === "kab" && selectedKab && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GradeDot grade={selectedKab.grade} />
                  <span className="font-semibold text-[13px]">{selectedKab.name}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", getGradeBg(selectedKab.grade))}>{getGradeLabel(selectedKab.grade)}</span>
                </div>
                <button onClick={() => { setPanel("list"); setSelectedKab(null); setSelectedKec(null); setSelectedDesa(null); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border/50 rounded-lg px-2 py-1 hover:border-foreground/30 transition-colors">
                  <X className="size-3" />Tutup
                </button>
              </div>
              <div className="p-4">
                <KabupatenDetail kab={selectedKab} onSelectKec={selectKec} />
              </div>
            </div>
          )}
          {panel === "kec" && selectedKec && selectedKab && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <button onClick={() => { setPanel("kab"); setSelectedKec(null); setSelectedDesa(null); }} className="hover:text-foreground transition-colors font-medium">{selectedKab.name}</button>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground font-semibold text-[13px]">{selectedKec.name}</span>
                </div>
                <button onClick={() => { setPanel("list"); setSelectedKab(null); setSelectedKec(null); setSelectedDesa(null); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border/50 rounded-lg px-2 py-1 hover:border-foreground/30 transition-colors">
                  <X className="size-3" />Tutup
                </button>
              </div>
              <div className="p-4">
                <KecamatanDetail kec={selectedKec} kabName={selectedKab.name} onSelectDesa={selectDesa} onBack={() => { setPanel("kab"); setSelectedKec(null); setSelectedDesa(null); }} />
              </div>
            </div>
          )}
          {panel === "desa" && selectedDesa && selectedKec && selectedKab && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <button onClick={() => { setPanel("kab"); setSelectedKec(null); setSelectedDesa(null); }} className="hover:text-foreground transition-colors font-medium">{selectedKab.name}</button>
                  <ChevronRight className="size-3" />
                  <button onClick={() => { setPanel("kec"); setSelectedDesa(null); }} className="hover:text-foreground transition-colors font-medium">{selectedKec.name}</button>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground font-semibold text-[13px]">{selectedDesa.name}</span>
                </div>
                <button onClick={() => { setPanel("list"); setSelectedKab(null); setSelectedKec(null); setSelectedDesa(null); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border/50 rounded-lg px-2 py-1 hover:border-foreground/30 transition-colors">
                  <X className="size-3" />Tutup
                </button>
              </div>
              <div className="p-4">
                <DesaDetail desa={selectedDesa} kecName={selectedKec.name} kabName={selectedKab.name} onBack={() => { setPanel("kec"); setSelectedDesa(null); }} />
              </div>
            </div>
          )}

          {/* Full ranking table */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Ranking Kabupaten — Modul 1</h3>
              <span className="text-[11px] text-muted-foreground">24 Kabupaten/Kota Sulawesi Selatan · klik baris untuk detail</span>
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
                      className={cn(
                        "border-b last:border-0 cursor-pointer transition-colors",
                        selectedKab?.id === kab.id
                          ? "bg-foreground/5 border-l-2 border-l-foreground"
                          : "hover:bg-muted/30"
                      )}
                      onClick={() => selectKab(kab)}>
                      <td className="px-4 py-2.5 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium flex items-center gap-1.5">
                        <GradeDot grade={kab.grade} />
                        {kab.name}
                      </td>
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
          <RoadmapPanel
            result={roadmapResult}
            onResult={setRoadmapResult}
            prospects={(prospects ?? []).map((p: { lokasi: string; kabupaten?: string | null; luas: number; hargaM2: number; roi: number; status: string }) => ({
              lokasi: p.lokasi,
              kabupaten: p.kabupaten,
              luas: p.luas,
              hargaM2: p.hargaM2,
              roi: p.roi,
              status: p.status,
            }))}
          />
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
