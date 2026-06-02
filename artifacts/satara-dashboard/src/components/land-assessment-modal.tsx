import { useState } from "react";
import {
  X, Sparkles, Loader2, FileText,
  BarChart3, Scale, Building2, ScrollText, AlertTriangle,
  TrendingUp, MapPin, Layers, Zap, Shield, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AssessmentPolygon {
  luas: number;
  center: [number, number];
  lokasi: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
}

interface TerrainData {
  elevMin?: number;
  elevMax?: number;
  elevAvg?: number;
  slopeAvgPct?: number;
  slopeMaxPct?: number;
  waterwayType?: string;
  waterwayName?: string;
  waterwayDistM?: number | null;
}

interface TopografiData {
  kategori_kontur: string;
  elevasi_avg_m: number;
  kemiringan_avg_pct: number;
  risiko_banjir: string;
  biaya_matang_modifier: string;
  sumber: string;
  catatan_tapak: string;
}

interface LegalItem {
  item: string;
  prioritas: "tinggi" | "sedang" | "rendah";
}

interface HppData {
  asumsi_unit: number;
  luas_efektif_m2: number;
  luas_fasum_m2: number;
  luas_jalan_m2: number;
  harga_tanah_total: number;
  harga_tanah_per_unit: number;
  biaya_matang_per_unit: number;
  biaya_konstruksi_per_unit: number;
  overhead_per_unit: number;
  hpp_per_unit: number;
  harga_jual_recommended: number;
  margin_pct: number;
  total_revenue: number;
  total_profit: number;
  roi_pct: number;
  irr_pct: number;
  npv: number;
  payback_bulan: number;
  risk_level: string;
}

interface AssessmentResult {
  skor: number;
  kategori: string;
  rekomendasi_harga_maks_m2: number;
  proposal_akuisisi: string;
  topografi: TopografiData;
  site_analysis: string;
  risiko_utama: string[];
  legal_checklist: LegalItem[] | string[];
  estimasi_hpp: HppData;
  draft_mou: string;
}

interface Props {
  polygon: AssessmentPolygon;
  terrainData: TerrainData | null;
  terrainLoading?: boolean;
  onClose: () => void;
}

// ─── Konstanta ─────────────────────────────────────────────────────────────

const FASILITAS_OPTIONS = [
  "Sekolah/Madrasah", "Rumah Sakit/Klinik", "Pasar Tradisional",
  "Mall/Pusat Perbelanjaan", "Masjid/Mushola", "SPBU",
  "Bank/ATM", "Perkantoran/Industri",
];

const UTILITAS_OPTIONS = [
  "Listrik PLN", "Air PDAM", "Internet Fiber/4G",
  "Saluran Drainase", "Gas Kota",
];

const LINGKUNGAN_OPTIONS = [
  { value: "sangat_aman",  label: "Sangat Aman"  },
  { value: "aman",         label: "Aman"          },
  { value: "cukup_aman",   label: "Cukup Aman"    },
  { value: "kurang_aman",  label: "Kurang Aman"   },
];

const PERTUMBUHAN_OPTIONS = [
  { value: "sangat_tinggi", label: "Sangat Tinggi", sub: "kawasan berkembang pesat" },
  { value: "tinggi",        label: "Tinggi",         sub: "ada rencana pembangunan besar" },
  { value: "sedang",        label: "Sedang",          sub: "pertumbuhan stabil" },
  { value: "rendah",        label: "Rendah",          sub: "daerah stagnan" },
];

const STATUS_KPM_OPTIONS = [
  "SHM (Sertifikat Hak Milik)",
  "HGB (Hak Guna Bangunan)",
  "SHGB",
  "Girik/Adat",
  "Letter C/Sporadik",
  "Belum diketahui",
];

const BENTUK_OPTIONS = [
  { value: "kotak",          label: "Kotak"          },
  { value: "persegi_panjang",label: "Persegi Panjang" },
  { value: "l_shape",        label: "L-Shape"         },
  { value: "segitiga",       label: "Segitiga"        },
  { value: "tidak_beraturan",label: "Tidak Beraturan" },
];

const RESULT_TABS = [
  { key: "proposal" as const, label: "Proposal",        icon: ScrollText },
  { key: "site"     as const, label: "Site Analysis",   icon: Building2  },
  { key: "legal"    as const, label: "Legal Checklist", icon: Scale      },
  { key: "hpp"      as const, label: "Estimasi HPP",    icon: BarChart3  },
  { key: "mou"      as const, label: "Draft MOU",       icon: FileText   },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatRp(v: number) {
  if (!v || isNaN(v)) return "—";
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)} M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "text-[11px] px-2.5 py-1 rounded-full border transition-all",
        selected
          ? "bg-foreground text-background border-foreground font-medium"
          : "bg-background border-border text-muted-foreground hover:border-foreground/50"
      )}
    >
      {label}
    </button>
  );
}

function RadioOption({ value, label, sub, selected, onSelect }: {
  value: string; label: string; sub?: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <div className="flex items-start gap-2 cursor-pointer group" onClick={onSelect}>
      <div className={cn(
        "size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
        selected ? "border-foreground bg-foreground" : "border-border group-hover:border-foreground/50"
      )}>
        {selected && <div className="size-1.5 rounded-full bg-background" />}
      </div>
      <div>
        <span className="text-[11px] font-medium leading-tight">{label}</span>
        {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MetricCard({
  label, value, sub, variant = "default",
}: {
  label: string; value: string; sub?: string;
  variant?: "default" | "dark" | "good" | "warn" | "bad";
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 flex flex-col gap-0.5",
      variant === "dark" ? "bg-foreground text-background" :
      variant === "good" ? "bg-emerald-50 border-emerald-200" :
      variant === "warn" ? "bg-amber-50 border-amber-200" :
      variant === "bad"  ? "bg-red-50 border-red-200" :
      "bg-card"
    )}>
      <div className={cn("text-[10px]",
        variant === "dark" ? "text-background/60" :
        variant === "good" ? "text-emerald-700" :
        variant === "warn" ? "text-amber-700" :
        variant === "bad"  ? "text-red-700" :
        "text-muted-foreground"
      )}>
        {label}
      </div>
      <div className={cn("text-[15px] font-bold leading-tight",
        variant === "good" ? "text-emerald-700" :
        variant === "warn" ? "text-amber-700" :
        variant === "bad"  ? "text-red-700" : ""
      )}>
        {value}
      </div>
      {sub && (
        <div className={cn("text-[9px]",
          variant === "dark" ? "text-background/50" : "text-muted-foreground"
        )}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ skor, kategori }: { skor: number; kategori: string }) {
  const pct = Math.min(100, Math.max(0, skor));
  const color = skor >= 80 ? "#10b981" : skor >= 65 ? "#3b82f6" : skor >= 50 ? "#f59e0b" : "#ef4444";
  const badge = skor >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : skor >= 65 ? "bg-blue-100 text-blue-800 border-blue-200"
    : skor >= 50 ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-red-100 text-red-800 border-red-200";

  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex items-center gap-4 bg-muted/30 border rounded-xl p-3">
      <div className="relative shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="7" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold leading-none" style={{ color }}>{skor}</span>
          <span className="text-[9px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground mb-1">Skor Kelayakan Lahan</div>
        <span className={cn("inline-flex items-center text-[11px] font-semibold border rounded-full px-2.5 py-0.5", badge)}>
          {kategori}
        </span>
        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LandAssessmentModal({ polygon, terrainData, terrainLoading, onClose }: Props) {
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [form, setForm] = useState({
    hargaTanahM2: "",
    aksesJalan: "",
    fasilitasUmum: [] as string[],
    kondisiLingkungan: "aman",
    potensiPertumbuhan: "sedang",
    utilitas: [] as string[],
    hargaRumahSekitar: "",
    statusKepemilikan: "SHM (Sertifikat Hak Milik)",
    bentukLahan: "kotak",
    catatan: "",
  });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<typeof RESULT_TABS[number]["key"]>("proposal");

  function toggleChip(field: "fasilitasUmum" | "utilitas", value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(x => x !== value)
        : [...f[field], value],
    }));
  }

  async function handleSubmit() {
    if (!form.hargaTanahM2 || !form.aksesJalan) {
      setError("Harga tanah dan lebar akses jalan wajib diisi.");
      return;
    }
    setError(null);
    setPhase("loading");

    const body = {
      lokasi: polygon.lokasi,
      kelurahan: polygon.kelurahan,
      kecamatan: polygon.kecamatan,
      kabupaten: polygon.kabupaten,
      luas: polygon.luas,
      hargaTanahM2: parseFloat(form.hargaTanahM2),
      aksesJalan: parseFloat(form.aksesJalan),
      fasilitasUmum: form.fasilitasUmum,
      kondisiLingkungan: form.kondisiLingkungan,
      potensiPertumbuhan: form.potensiPertumbuhan,
      utilitas: form.utilitas,
      hargaRumahSekitar: parseFloat(form.hargaRumahSekitar) || 0,
      statusKepemilikan: form.statusKepemilikan,
      bentukLahan: BENTUK_OPTIONS.find(b => b.value === form.bentukLahan)?.label ?? form.bentukLahan,
      catatan: form.catatan,
      ...(terrainData ?? {}),
    };

    try {
      const res = await fetch("/api/ai/land-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const data = await res.json();
      setResult(data);
      setPhase("result");
      setActiveTab("proposal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungi AI. Coba lagi.");
      setPhase("form");
    }
  }

  const slopeAvg   = terrainData?.slopeAvgPct;
  const slopeLabel = slopeAvg != null
    ? (slopeAvg < 2 ? "Datar" : slopeAvg < 5 ? "Landai" : slopeAvg < 15 ? "Miring" : "Curam")
    : null;
  const waterwayDist = terrainData?.waterwayDistM;
  const floodLabel = waterwayDist != null
    ? (waterwayDist < 100 ? "Tinggi" : waterwayDist < 300 ? "Sedang" : waterwayDist < 500 ? "Waspada" : "Aman")
    : "N/A";
  const floodColor = waterwayDist != null
    ? (waterwayDist < 100 ? "text-red-600" : waterwayDist < 300 ? "text-orange-500" : waterwayDist < 500 ? "text-amber-500" : "text-emerald-600")
    : "text-muted-foreground";

  const estimasiUnit = Math.floor(polygon.luas * 0.6 / 100);

  // Normalize legal_checklist: support both string[] and {item, prioritas}[]
  const legalItems: LegalItem[] = result?.legal_checklist
    ? (result.legal_checklist as Array<string | LegalItem>).map(x =>
        typeof x === "string" ? { item: x, prioritas: "sedang" as const } : x
      )
    : [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={phase === "form" ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-[580px] h-full bg-background border-l shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded bg-foreground flex items-center justify-center shrink-0">
                <Sparkles className="size-3 text-background" />
              </div>
              <h2 className="font-semibold text-sm">Penilaian Lahan</h2>
              <span className="text-[9px] bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-1.5 py-0.5 font-medium">SLIS</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {polygon.lokasi}
              {polygon.kabupaten ? ` · ${polygon.kabupaten}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] bg-muted border rounded px-1.5 py-0.5 font-medium">
                {polygon.luas.toLocaleString("id-ID")} m²
              </span>
              <span className="text-[10px] bg-muted border rounded px-1.5 py-0.5 font-medium">
                ~{estimasiUnit} unit
              </span>
              {slopeLabel && (
                <span className={cn(
                  "text-[10px] rounded px-1.5 py-0.5 font-medium border",
                  slopeLabel === "Datar" || slopeLabel === "Landai"
                    ? "bg-sky-50 border-sky-200 text-sky-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                )}>
                  {slopeLabel}
                </span>
              )}
              {waterwayDist != null && (
                <span className={cn("text-[10px] rounded px-1.5 py-0.5 font-medium border",
                  waterwayDist < 100 ? "bg-red-50 border-red-200 text-red-700" :
                  waterwayDist < 300 ? "bg-orange-50 border-orange-200 text-orange-700" :
                  "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>
                  Banjir: {floodLabel}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── FORM PHASE ── */}
        {phase === "form" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5">

              {/* Data Lahan */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Data Lahan</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Harga Tanah (Rp/m²) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="contoh: 1500000"
                      value={form.hargaTanahM2}
                      onChange={e => setForm(f => ({ ...f, hargaTanahM2: e.target.value }))}
                      className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                    {form.hargaTanahM2 && !isNaN(parseFloat(form.hargaTanahM2)) && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Total: {formatRp(parseFloat(form.hargaTanahM2) * polygon.luas)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Lebar Akses Jalan (m) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="contoh: 6"
                      value={form.aksesJalan}
                      onChange={e => setForm(f => ({ ...f, aksesJalan: e.target.value }))}
                      className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                    {form.aksesJalan && !isNaN(parseFloat(form.aksesJalan)) && (
                      <p className={cn("text-[9px] mt-0.5", parseFloat(form.aksesJalan) >= 5 ? "text-emerald-600" : "text-red-500")}>
                        {parseFloat(form.aksesJalan) >= 5 ? "Memenuhi standar min 5m" : "Di bawah standar min 5m"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Harga Rumah Sekitar */}
                <div>
                  <label className="text-[11px] font-medium block mb-1.5">Harga Rumah Existing di Sekitar (Rp)</label>
                  <input
                    type="number"
                    placeholder="contoh: 350000000"
                    value={form.hargaRumahSekitar}
                    onChange={e => setForm(f => ({ ...f, hargaRumahSekitar: e.target.value }))}
                    className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                  {form.hargaRumahSekitar && !isNaN(parseFloat(form.hargaRumahSekitar)) && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">{formatRp(parseFloat(form.hargaRumahSekitar))}</p>
                  )}
                </div>
              </section>

              {/* Status Kepemilikan */}
              <section className="space-y-2">
                <label className="text-[11px] font-medium block">Status Kepemilikan Tanah</label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_KPM_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, statusKepemilikan: opt }))}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                        form.statusKepemilikan === opt
                          ? "bg-foreground text-background border-foreground font-medium"
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </section>

              {/* Bentuk Lahan */}
              <section className="space-y-2">
                <label className="text-[11px] font-medium block">Bentuk Lahan</label>
                <div className="flex flex-wrap gap-1.5">
                  {BENTUK_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, bentukLahan: opt.value }))}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                        form.bentukLahan === opt.value
                          ? "bg-foreground text-background border-foreground font-medium"
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Kondisi Wilayah */}
              <section className="space-y-2.5">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Kondisi Wilayah</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium block mb-2">Keamanan Lingkungan</label>
                    <div className="space-y-2">
                      {LINGKUNGAN_OPTIONS.map(opt => (
                        <RadioOption
                          key={opt.value} value={opt.value} label={opt.label}
                          selected={form.kondisiLingkungan === opt.value}
                          onSelect={() => setForm(f => ({ ...f, kondisiLingkungan: opt.value }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-2">Potensi Pertumbuhan</label>
                    <div className="space-y-2">
                      {PERTUMBUHAN_OPTIONS.map(opt => (
                        <RadioOption
                          key={opt.value} value={opt.value} label={opt.label} sub={opt.sub}
                          selected={form.potensiPertumbuhan === opt.value}
                          onSelect={() => setForm(f => ({ ...f, potensiPertumbuhan: opt.value }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Fasilitas Umum */}
              <section className="space-y-2">
                <label className="text-[11px] font-medium block">Fasilitas Umum Terdekat</label>
                <div className="flex flex-wrap gap-1.5">
                  {FASILITAS_OPTIONS.map(opt => (
                    <ToggleChip key={opt} label={opt} selected={form.fasilitasUmum.includes(opt)} onToggle={() => toggleChip("fasilitasUmum", opt)} />
                  ))}
                </div>
              </section>

              {/* Utilitas */}
              <section className="space-y-2">
                <label className="text-[11px] font-medium block">Utilitas Tersedia</label>
                <div className="flex flex-wrap gap-1.5">
                  {UTILITAS_OPTIONS.map(opt => (
                    <ToggleChip key={opt} label={opt} selected={form.utilitas.includes(opt)} onToggle={() => toggleChip("utilitas", opt)} />
                  ))}
                </div>
              </section>

              {/* Terrain Data Summary */}
              {terrainLoading && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-sky-500 shrink-0" />
                  <span className="text-[11px] text-sky-700">Menganalisis kontur & risiko banjir dari SRTM NASA...</span>
                </div>
              )}
              {terrainData && !terrainLoading && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Layers className="size-3.5 text-sky-600 shrink-0" />
                    <p className="text-[10px] font-semibold text-sky-700">Data Topografi SRTM NASA — otomatis disertakan dalam analisis AI</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Elevasi avg</div>
                      <div className="text-[13px] font-semibold">{terrainData.elevAvg?.toFixed(0) ?? "—"}m</div>
                    </div>
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Kemiringan</div>
                      <div className={cn("text-[13px] font-semibold",
                        slopeLabel === "Curam" || slopeLabel === "Miring" ? "text-amber-600" : ""
                      )}>
                        {slopeLabel ?? "—"}
                      </div>
                      {slopeAvg != null && <div className="text-[9px] text-muted-foreground">{slopeAvg.toFixed(1)}%</div>}
                    </div>
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Risiko banjir</div>
                      <div className={cn("text-[13px] font-semibold", floodColor)}>{floodLabel}</div>
                      {waterwayDist != null && <div className="text-[9px] text-muted-foreground">{Math.round(waterwayDist)}m</div>}
                    </div>
                  </div>
                </div>
              )}
              {!terrainData && !terrainLoading && (
                <div className="bg-muted/40 border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <Layers className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">
                    Tidak ada data SRTM. AI akan mengestimasi topografi berdasarkan lokasi geografis.
                  </span>
                </div>
              )}

              {/* Catatan */}
              <section className="space-y-1.5">
                <label className="text-[11px] font-medium block">Catatan / Informasi Tambahan</label>
                <textarea
                  rows={3}
                  placeholder="Informasi lapangan tambahan, kondisi khusus, kendala, atau potensi yang relevan..."
                  value={form.catatan}
                  onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
                />
              </section>

              {error && (
                <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOADING PHASE ── */}
        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="size-16 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center">
              <Sparkles className="size-7 text-violet-500 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-base">SLIS sedang menganalisis lahan...</h3>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed max-w-xs">
                Menghitung skor kelayakan, topografi, estimasi HPP, IRR, NPV, dan menyusun dokumen akuisisi
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
              {[
                "Analisis topografi & risiko lokasi...",
                "Menghitung HPP, ROI, IRR, NPV...",
                "Menyusun proposal & draft MOU...",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && result && (
          <>
            {/* Tab bar */}
            <div className="flex border-b bg-muted/20 overflow-x-auto shrink-0">
              {RESULT_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                    activeTab === key
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* ── PROPOSAL TAB ── */}
              {activeTab === "proposal" && (
                <>
                  <ScoreGauge skor={result.skor ?? 0} kategori={result.kategori ?? "—"} />

                  {/* Key metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      label="Estimasi Unit" value={`${result.estimasi_hpp?.asumsi_unit ?? estimasiUnit} unit`}
                      sub="60% lahan efektif, kavling 10×10m" variant="dark"
                    />
                    <MetricCard
                      label="Harga Maks Akuisisi" value={`Rp ${(result.rekomendasi_harga_maks_m2 ?? 0).toLocaleString("id-ID")}/m²`}
                      sub="rekomendasi AI" variant="default"
                    />
                    <MetricCard
                      label="ROI" value={`${result.estimasi_hpp?.roi_pct ?? "—"}%`}
                      variant={(result.estimasi_hpp?.roi_pct ?? 0) >= 25 ? "good" : (result.estimasi_hpp?.roi_pct ?? 0) >= 15 ? "warn" : "bad"}
                    />
                    <MetricCard
                      label="IRR" value={`${result.estimasi_hpp?.irr_pct ?? "—"}%`}
                      variant={(result.estimasi_hpp?.irr_pct ?? 0) >= 20 ? "good" : "warn"}
                    />
                    <MetricCard
                      label="Payback Period" value={`${result.estimasi_hpp?.payback_bulan ?? "—"} bulan`}
                      sub="estimasi waktu balik modal"
                    />
                    <MetricCard
                      label="Total Profit" value={formatRp(result.estimasi_hpp?.total_profit ?? 0)}
                      variant="good"
                    />
                  </div>

                  {/* Risiko utama */}
                  {result.risiko_utama?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                        <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">Risiko Utama</span>
                      </div>
                      <ul className="space-y-1">
                        {result.risiko_utama.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-amber-900">
                            <ChevronRight className="size-3 shrink-0 mt-0.5 text-amber-600" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Proposal text */}
                  <div className="bg-muted/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2">Proposal Akuisisi</p>
                    <div className="text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {result.proposal_akuisisi}
                    </div>
                  </div>
                </>
              )}

              {/* ── SITE ANALYSIS TAB ── */}
              {activeTab === "site" && (
                <>
                  {/* Topografi card */}
                  {result.topografi && (
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-3">
                        <MapPin className="size-3.5 text-sky-600 shrink-0" />
                        <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wide">
                          Data Topografi
                          <span className="ml-1.5 font-normal text-sky-600 normal-case">({result.topografi.sumber})</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        {[
                          { label: "Kategori Kontur", value: result.topografi.kategori_kontur },
                          { label: "Elevasi Rata-rata", value: `${result.topografi.elevasi_avg_m}m` },
                          { label: "Kemiringan", value: `${Number(result.topografi.kemiringan_avg_pct).toFixed(1)}%` },
                          { label: "Risiko Banjir", value: result.topografi.risiko_banjir },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-white/80 rounded-lg p-2 border border-sky-100">
                            <div className="text-[9px] text-muted-foreground">{label}</div>
                            <div className="text-[12px] font-semibold">{value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 border border-sky-100">
                        <div className="text-[9px] text-muted-foreground mb-0.5">Modifier Biaya Matang</div>
                        <div className="text-[12px] font-semibold text-sky-800">{result.topografi.biaya_matang_modifier}</div>
                      </div>
                      {result.topografi.catatan_tapak && (
                        <p className="text-[11px] text-sky-900 mt-2 leading-relaxed">{result.topografi.catatan_tapak}</p>
                      )}
                    </div>
                  )}
                  {/* Site analysis narrative */}
                  <div className="bg-muted/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2">Analisis Tapak Teknis</p>
                    <div className="text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {result.site_analysis}
                    </div>
                  </div>
                </>
              )}

              {/* ── LEGAL CHECKLIST TAB ── */}
              {activeTab === "legal" && (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    Dokumen dan tindakan legal yang perlu disiapkan sebelum akuisisi:
                  </p>
                  <div className="space-y-2">
                    {legalItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-card border rounded-lg px-3 py-2.5">
                        <div className={cn(
                          "size-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold",
                          item.prioritas === "tinggi"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : item.prioritas === "rendah"
                            ? "bg-muted text-muted-foreground border border-border"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] leading-snug">{item.item}</span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 uppercase tracking-wide",
                          item.prioritas === "tinggi"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : item.prioritas === "rendah"
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {item.prioritas}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── HPP TAB ── */}
              {activeTab === "hpp" && result.estimasi_hpp && (
                <>
                  {/* Financial metrics grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard label="Estimasi Unit" value={`${result.estimasi_hpp.asumsi_unit} unit`} variant="dark" />
                    <MetricCard
                      label="Tingkat Risiko" value={result.estimasi_hpp.risk_level ?? "—"}
                      variant={result.estimasi_hpp.risk_level === "Rendah" ? "good" : result.estimasi_hpp.risk_level === "Sedang" ? "warn" : "bad"}
                    />
                    <MetricCard
                      label="ROI" value={`${result.estimasi_hpp.roi_pct}%`}
                      sub="Return on Investment"
                      variant={result.estimasi_hpp.roi_pct >= 25 ? "good" : result.estimasi_hpp.roi_pct >= 15 ? "warn" : "bad"}
                    />
                    <MetricCard
                      label="IRR" value={`${result.estimasi_hpp.irr_pct ?? "—"}%`}
                      sub="Internal Rate of Return"
                      variant={(result.estimasi_hpp.irr_pct ?? 0) >= 20 ? "good" : "warn"}
                    />
                    <MetricCard
                      label="NPV" value={formatRp(result.estimasi_hpp.npv ?? 0)}
                      sub="Net Present Value (disc. 12%)"
                      variant={(result.estimasi_hpp.npv ?? 0) > 0 ? "good" : "bad"}
                    />
                    <MetricCard
                      label="Payback Period" value={`${result.estimasi_hpp.payback_bulan} bulan`}
                    />
                    <MetricCard label="Total Revenue" value={formatRp(result.estimasi_hpp.total_revenue)} />
                    <MetricCard label="Total Profit" value={formatRp(result.estimasi_hpp.total_profit)} variant="good" />
                  </div>

                  {/* Luas breakdown */}
                  <div className="bg-muted/30 border rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alokasi Lahan</p>
                    {[
                      { label: "Kavling Efektif (60%)", value: result.estimasi_hpp.luas_efektif_m2 },
                      { label: "Fasum & RTH (20%)", value: result.estimasi_hpp.luas_fasum_m2 },
                      { label: "Jalan Internal (20%)", value: result.estimasi_hpp.luas_jalan_m2 },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{(value ?? 0).toLocaleString("id-ID")} m²</span>
                      </div>
                    ))}
                  </div>

                  {/* HPP breakdown per unit */}
                  <div className="bg-muted/30 border rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Breakdown HPP / Unit</p>
                    {[
                      { label: "Alokasi Tanah / Unit", value: result.estimasi_hpp.harga_tanah_per_unit },
                      { label: "Biaya Matang & Infrastruktur", value: result.estimasi_hpp.biaya_matang_per_unit },
                      { label: "Overhead & Perizinan", value: result.estimasi_hpp.overhead_per_unit },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{formatRp(value ?? 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-[12px] font-bold border-t border-border pt-2 mt-1">
                      <span>Total HPP / Unit</span>
                      <span>{formatRp(result.estimasi_hpp.hpp_per_unit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] font-bold text-emerald-700">
                      <span>Harga Jual Target / Unit</span>
                      <span>{formatRp(result.estimasi_hpp.harga_jual_recommended)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                      <span>Margin Gross</span>
                      <span className={cn("font-semibold", result.estimasi_hpp.margin_pct >= 20 ? "text-emerald-600" : "text-red-500")}>
                        {result.estimasi_hpp.margin_pct}%
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ── MOU TAB ── */}
              {activeTab === "mou" && (
                <div className="bg-muted/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Shield className="size-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Draft Nota Kesepahaman (MOU)</span>
                  </div>
                  <div className="text-[12px] leading-relaxed text-foreground whitespace-pre-wrap font-mono">
                    {result.draft_mou}
                  </div>
                </div>
              )}

            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div className="shrink-0 border-t px-4 py-3 bg-muted/20 flex items-center justify-between gap-2">
          {phase === "form" && (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="text-[12px]">
                Batal
              </Button>
              <Button size="sm" onClick={handleSubmit} className="text-[12px] gap-1.5">
                <Sparkles className="size-3.5" />
                Analisis dengan SLIS AI
              </Button>
            </>
          )}
          {phase === "result" && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setPhase("form"); setResult(null); }} className="text-[12px]">
                Edit &amp; Generate Ulang
              </Button>
              <Button size="sm" variant="outline" onClick={onClose} className="text-[12px]">
                Selesai
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
