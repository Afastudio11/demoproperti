import { useState } from "react";
import {
  X, Sparkles, Loader2, FileText,
  BarChart3, Scale, Building2, ScrollText, AlertTriangle,
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

interface HppData {
  asumsi_unit: number;
  harga_tanah_total: number;
  matang_per_unit: number;
  overhead_per_unit: number;
  hpp_per_unit: number;
  harga_jual_recommended: number;
  margin_pct: number;
  total_revenue: number;
  total_profit: number;
  roi_pct: number;
  payback_bulan: number;
}

interface AssessmentResult {
  proposal_akuisisi: string;
  site_analysis: string;
  legal_checklist: string[];
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
  { value: "sangat_aman",   label: "Sangat Aman" },
  { value: "aman",          label: "Aman" },
  { value: "cukup_aman",    label: "Cukup Aman" },
  { value: "kurang_aman",   label: "Kurang Aman" },
];

const PERTUMBUHAN_OPTIONS = [
  { value: "sangat_tinggi", label: "Sangat Tinggi", sub: "kawasan berkembang pesat" },
  { value: "tinggi",        label: "Tinggi",        sub: "ada rencana pembangunan besar" },
  { value: "sedang",        label: "Sedang",         sub: "pertumbuhan stabil" },
  { value: "rendah",        label: "Rendah",         sub: "daerah stagnan" },
];

const STATUS_KPM_OPTIONS = [
  "SHM (Sertifikat Hak Milik)",
  "HGB (Hak Guna Bangunan)",
  "SHGB",
  "Girik/Adat",
  "Letter C/Sporadik",
  "Belum diketahui",
];

const RESULT_TABS = [
  { key: "proposal" as const, label: "Proposal",       icon: ScrollText },
  { key: "site"     as const, label: "Site Analysis",  icon: Building2  },
  { key: "legal"    as const, label: "Legal Checklist",icon: Scale       },
  { key: "hpp"      as const, label: "Estimasi HPP",   icon: BarChart3   },
  { key: "mou"      as const, label: "Draft MOU",      icon: FileText    },
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

  const slopeAvg = terrainData?.slopeAvgPct;
  const slopeLabel = slopeAvg != null
    ? (slopeAvg < 2 ? "Datar" : slopeAvg < 5 ? "Landai" : slopeAvg < 15 ? "Miring" : "Curam")
    : null;
  const waterwayDist = terrainData?.waterwayDistM;
  const floodLabel = waterwayDist != null
    ? (waterwayDist < 100 ? "Tinggi" : waterwayDist < 300 ? "Sedang" : waterwayDist < 500 ? "Waspada" : "Aman")
    : "N/A";
  const floodColor = waterwayDist != null
    ? (waterwayDist < 100 ? "text-red-600" : waterwayDist < 300 ? "text-orange-600" : waterwayDist < 500 ? "text-amber-600" : "text-emerald-600")
    : "text-muted-foreground";

  const estimasiUnit = Math.floor(polygon.luas * 0.6 / 100);

  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={phase === "form" ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-[560px] h-full bg-background border-l shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded bg-foreground flex items-center justify-center shrink-0">
                <Sparkles className="size-3 text-background" />
              </div>
              <h2 className="font-semibold text-sm">Penilaian Lahan</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {polygon.lokasi}
              {polygon.kabupaten ? ` · ${polygon.kabupaten}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-muted border rounded px-1.5 py-0.5 font-medium">
                {polygon.luas.toLocaleString("id-ID")} m²
              </span>
              <span className="text-[10px] bg-muted border rounded px-1.5 py-0.5 font-medium">
                ~{estimasiUnit} unit
              </span>
              {slopeLabel && (
                <span className="text-[10px] bg-sky-50 border border-sky-200 text-sky-700 rounded px-1.5 py-0.5 font-medium">
                  {slopeLabel}
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

              {/* Harga & Akses */}
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
                        Total akuisisi: {formatRp(parseFloat(form.hargaTanahM2) * polygon.luas)}
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

              {/* Kondisi Wilayah */}
              <section className="space-y-2.5">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Kondisi Wilayah</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium block mb-2">Keamanan Lingkungan</label>
                    <div className="space-y-2">
                      {LINGKUNGAN_OPTIONS.map(opt => (
                        <RadioOption
                          key={opt.value}
                          value={opt.value}
                          label={opt.label}
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
                          key={opt.value}
                          value={opt.value}
                          label={opt.label}
                          sub={opt.sub}
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
                    <ToggleChip
                      key={opt}
                      label={opt}
                      selected={form.fasilitasUmum.includes(opt)}
                      onToggle={() => toggleChip("fasilitasUmum", opt)}
                    />
                  ))}
                </div>
              </section>

              {/* Utilitas */}
              <section className="space-y-2">
                <label className="text-[11px] font-medium block">Utilitas Tersedia</label>
                <div className="flex flex-wrap gap-1.5">
                  {UTILITAS_OPTIONS.map(opt => (
                    <ToggleChip
                      key={opt}
                      label={opt}
                      selected={form.utilitas.includes(opt)}
                      onToggle={() => toggleChip("utilitas", opt)}
                    />
                  ))}
                </div>
              </section>

              {/* Harga Rumah Sekitar */}
              <section className="space-y-1.5">
                <label className="text-[11px] font-medium block">Harga Rumah Existing di Sekitar (Rp)</label>
                <input
                  type="number"
                  placeholder="contoh: 350000000"
                  value={form.hargaRumahSekitar}
                  onChange={e => setForm(f => ({ ...f, hargaRumahSekitar: e.target.value }))}
                  className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                />
                {form.hargaRumahSekitar && !isNaN(parseFloat(form.hargaRumahSekitar)) && (
                  <p className="text-[9px] text-muted-foreground">{formatRp(parseFloat(form.hargaRumahSekitar))}</p>
                )}
              </section>

              {/* Terrain Data Summary */}
              {terrainLoading && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-sky-500 shrink-0" />
                  <span className="text-[11px] text-sky-700">Menganalisis kontur & risiko banjir...</span>
                </div>
              )}
              {terrainData && !terrainLoading && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-sky-700 mb-2">Data Kontur (SRTM NASA) — Otomatis disertakan dalam analisis AI</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Elevasi avg</div>
                      <div className="text-[12px] font-semibold">{terrainData.elevAvg?.toFixed(0) ?? "—"}m</div>
                    </div>
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Kemiringan</div>
                      <div className="text-[12px] font-semibold">{slopeLabel ?? "—"}</div>
                    </div>
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Risiko banjir</div>
                      <div className={cn("text-[12px] font-semibold", floodColor)}>{floodLabel}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan */}
              <section className="space-y-1.5">
                <label className="text-[11px] font-medium block">Catatan / Informasi Tambahan</label>
                <textarea
                  rows={3}
                  placeholder="Informasi tambahan yang relevan untuk penilaian lahan ini..."
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
              <h3 className="font-semibold text-base">AI sedang menyusun dokumen...</h3>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed max-w-xs">
                Membuat proposal akuisisi, analisis tapak, legal checklist, estimasi HPP, dan draft MOU
              </p>
            </div>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && result && (
          <>
            <div className="flex border-b bg-muted/20 overflow-x-auto shrink-0">
              {RESULT_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors",
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

            <div className="flex-1 overflow-y-auto p-4">

              {activeTab === "proposal" && (
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {result.proposal_akuisisi}
                </div>
              )}

              {activeTab === "site" && (
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {result.site_analysis}
                </div>
              )}

              {activeTab === "legal" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Dokumen dan tindakan legal yang perlu disiapkan sebelum akuisisi:
                  </p>
                  {result.legal_checklist.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-muted/30 rounded-lg px-3 py-2.5">
                      <div className="size-5 rounded border border-border bg-background flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] text-muted-foreground font-medium">{i + 1}</span>
                      </div>
                      <span className="text-[12px] leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "hpp" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Estimasi Unit", value: `${result.estimasi_hpp.asumsi_unit} unit`, dark: true },
                      { label: "Payback Period", value: `${result.estimasi_hpp.payback_bulan} bulan` },
                      { label: "HPP / Unit", value: formatRp(result.estimasi_hpp.hpp_per_unit) },
                      { label: "Harga Jual Target", value: formatRp(result.estimasi_hpp.harga_jual_recommended), dark: true },
                      {
                        label: "Margin",
                        value: `${result.estimasi_hpp.margin_pct}%`,
                        good: result.estimasi_hpp.margin_pct >= 20,
                        bad: result.estimasi_hpp.margin_pct < 15,
                      },
                      {
                        label: "ROI",
                        value: `${result.estimasi_hpp.roi_pct}%`,
                        good: result.estimasi_hpp.roi_pct >= 25,
                        bad: result.estimasi_hpp.roi_pct < 15,
                      },
                      { label: "Total Revenue", value: formatRp(result.estimasi_hpp.total_revenue) },
                      { label: "Total Profit", value: formatRp(result.estimasi_hpp.total_profit), good: true },
                    ].map(({ label, value, dark, good, bad }) => (
                      <div
                        key={label}
                        className={cn(
                          "rounded-xl border p-3",
                          dark ? "bg-foreground text-background" : "bg-card"
                        )}
                      >
                        <div className={cn("text-[10px] mb-1", dark ? "text-background/60" : "text-muted-foreground")}>
                          {label}
                        </div>
                        <div className={cn(
                          "text-base font-bold",
                          dark ? "" : good ? "text-emerald-700" : bad ? "text-red-600" : ""
                        )}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/30 border rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Breakdown HPP / Unit
                    </p>
                    {[
                      {
                        label: "Harga Tanah (alokasi/unit)",
                        value: result.estimasi_hpp.asumsi_unit > 0
                          ? Math.round(result.estimasi_hpp.harga_tanah_total / result.estimasi_hpp.asumsi_unit)
                          : 0,
                      },
                      { label: "Biaya Matang & Infrastruktur", value: result.estimasi_hpp.matang_per_unit },
                      { label: "Overhead & Perizinan", value: result.estimasi_hpp.overhead_per_unit },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{formatRp(value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-[12px] font-bold border-t border-border pt-2 mt-1">
                      <span>Total HPP / Unit</span>
                      <span>{formatRp(result.estimasi_hpp.hpp_per_unit)}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "mou" && (
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {result.draft_mou}
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
                Analisis dengan AI
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
