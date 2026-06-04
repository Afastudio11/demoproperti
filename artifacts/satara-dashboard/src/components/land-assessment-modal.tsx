import { useState, useMemo, useEffect, type ReactNode } from "react";
import { DAFTAR_PERUMAHAN_SULSEL } from "@/data/perumahan-sulsel";
import { JOBDESK_STAGES, CHECKLIST_INPUT_TYPES } from "@/data/akuisisi-config";
import {
  X, Brain, Loader2, FileText,
  BarChart3, Scale, Building2, ScrollText, AlertTriangle,
  TrendingUp, MapPin, Layers, Shield, ChevronRight,
  CheckCircle2, XCircle, Info, Calculator, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssessmentPolygon {
  luas: number;
  center: [number, number];
  lokasi: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  geoStr?: string;
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

interface LandAllocation {
  luasTotal: number; pctJalan: number; pctFasum: number;
  pctTidakEfektif: number; pctEfektif: number;
  luasJalan: number; luasFasum: number; luasTidakEfektif: number;
  luasEfektif: number; efficiencyPct: number;
}

interface UnitPotential {
  tipeLabel: string; kavlingDefault: number; kavlingMin: number; kavlingMax: number;
  unitMin: number; unitRealistis: number; unitMax: number;
}

interface Financials {
  usingDefaultHargaJual: boolean; usingDefaultBiayaBangun: boolean;
  hargaJualFinal: number; biayaBangunFinal: number;
  totalAkuisisi: number; biayaInfrastruktur: number; biayaLegal: number;
  biayaKonstruksi: number; kontingensiBiaya: number; totalHPP: number;
  revenue: number; profit: number; roi: number; margin: number; paybackBulan: number;
  maxHargaM2: number; negotTargetM2: number;
  tanahPerUnit: number; infraPerUnit: number; legalPerUnit: number; kontingensiPerUnit: number;
  hppPerUnit: number; marginPerUnit: number; marginPerUnitPct: number;
}

interface Risks {
  legalRisk: string; aksesRisk: string; konturRisk: string; banjirRisk: string;
  hargaRisk: string; marketRisk: string; overallRisk: string;
  legalRiskScore: number; aksesRiskScore: number; konturRiskScore: number;
  banjirRiskScore: number; hargaRiskScore: number; marketRiskScore: number;
}

interface Scores {
  lokasiScore: number; hargaScore: number; unitScore: number; roiScore: number;
  legalScore: number; pasarScore: number; teknisScore: number;
  total: number; category: string; decision: string;
}

interface Calc {
  landAllocation: LandAllocation;
  unitPotential: UnitPotential;
  financials: Financials;
  risks: Risks;
  scores: Scores;
  assumptions: string[];
}

interface AnalisisKompetitor {
  tingkatPersaingan: string;
  kompetitorKecamatan: string;
  kompetitorKabupaten: string;
  posisiHarga: string;
  rekomendasiSegmen: string;
}

interface AiNarrative {
  ringkasanEksekutif: string;
  analisisLokasi: string;
  analisisFisikLahan: string;
  analisisKompetitor?: AnalisisKompetitor;
  analisisRisiko: { risiko: string; level: string; deskripsi: string; mitigasi: string }[];
  rekomendasiNarasi: string;
  legalChecklist: { item: string; prioritas: string }[];
  draftMou: string;
  nextActions: string[];
}

interface AssessmentResult {
  skor: number;
  kategori: string;
  decision: string;
  calc: Calc;
  ai: AiNarrative;
  topografi: {
    kategoriKontur: string; elevAvg: string; slopeAvg: string;
    risikoBanjir: string; biayaMatangModifier: string; sumber: string; waterwayInfo: string | null;
  };
}

interface Props {
  polygon: AssessmentPolygon;
  terrainData: TerrainData | null;
  terrainLoading?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// ─── Konstanta ────────────────────────────────────────────────────────────────

const FASILITAS_OPTIONS = [
  "Sekolah/Madrasah", "Rumah Sakit/Klinik", "Pasar Tradisional",
  "Mall/Pusat Perbelanjaan", "Masjid/Mushola", "SPBU",
  "Bank/ATM", "Perkantoran/Industri",
];

const UTILITAS_OPTIONS = [
  "Listrik PLN", "Air PDAM", "Internet Fiber/4G", "Saluran Drainase", "Gas Kota",
];

const TIPE_RUMAH_OPTIONS = [
  { value: "subsidi",           label: "Subsidi (FLPP)",   sub: "Harga ≤ Rp 200 Jt, kavling 72m²" },
  { value: "komersial_kecil",   label: "Komersial Kecil",  sub: "Rp 300-500 Jt, kavling 90m²"      },
  { value: "komersial_menengah",label: "Komersial Menengah",sub: "Rp 500 Jt+, kavling 120m²"        },
];

const PERTUMBUHAN_OPTIONS = [
  { value: "sangat_tinggi", label: "Sangat Tinggi", sub: "kawasan berkembang pesat" },
  { value: "tinggi",        label: "Tinggi",        sub: "ada rencana pembangunan besar" },
  { value: "sedang",        label: "Sedang",         sub: "pertumbuhan stabil" },
  { value: "rendah",        label: "Rendah",         sub: "daerah stagnan" },
];

const LINGKUNGAN_OPTIONS = [
  { value: "sangat_aman", label: "Sangat Aman" },
  { value: "aman",        label: "Aman"         },
  { value: "cukup_aman",  label: "Cukup Aman"   },
  { value: "kurang_aman", label: "Kurang Aman"   },
];

const STATUS_KPM_OPTIONS = [
  "SHM (Sertifikat Hak Milik)", "HGB (Hak Guna Bangunan)", "SHGB",
  "Girik/Adat", "Letter C/Sporadik", "Belum diketahui",
];

const BENTUK_OPTIONS = [
  { value: "kotak",           label: "Kotak"          },
  { value: "persegi_panjang", label: "Persegi Panjang" },
  { value: "l_shape",         label: "L-Shape"         },
  { value: "segitiga",        label: "Segitiga"        },
  { value: "tidak_beraturan", label: "Tidak Beraturan" },
];

const RESULT_TABS = [
  { key: "overview"  as const, label: "Overview",         icon: BarChart3  },
  { key: "finansial" as const, label: "Finansial",        icon: TrendingUp },
  { key: "tapak"     as const, label: "Tapak & Lokasi",   icon: MapPin     },
  { key: "risiko"    as const, label: "Risiko",           icon: AlertTriangle },
  { key: "dokumen"   as const, label: "Dokumen",          icon: FileText   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRp(v: number) {
  if (!v || isNaN(v)) return "—";
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)} M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}

function formatRpInput(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("id-ID");
}

function parseRpInput(formatted: string): string {
  return formatted.replace(/\./g, "").replace(/\D/g, "");
}

function cleanAiText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .trim();
}

function riskColor(level: string) {
  return level === "Rendah" ? "text-emerald-600 bg-emerald-50 border-emerald-200"
       : level === "Sedang" ? "text-amber-600 bg-amber-50 border-amber-200"
       : "text-red-600 bg-red-50 border-red-200";
}

function riskDot(level: string) {
  return level === "Rendah" ? "bg-emerald-500"
       : level === "Sedang" ? "bg-amber-500"
       : "bg-red-500";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-all",
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

function MetricCard({ label, value, sub, variant = "default" }: {
  label: string; value: string; sub?: string;
  variant?: "default" | "dark" | "good" | "warn" | "bad";
}) {
  const bg = variant === "dark" ? "bg-foreground text-background"
           : variant === "good" ? "bg-emerald-50 border-emerald-200"
           : variant === "warn" ? "bg-amber-50 border-amber-200"
           : variant === "bad"  ? "bg-red-50 border-red-200"
           : "bg-card";
  const labelCls = variant === "dark" ? "text-background/60"
                 : variant === "good" ? "text-emerald-700"
                 : variant === "warn" ? "text-amber-700"
                 : variant === "bad"  ? "text-red-700"
                 : "text-muted-foreground";
  const valueCls = variant === "good" ? "text-emerald-700"
                 : variant === "warn" ? "text-amber-700"
                 : variant === "bad"  ? "text-red-700" : "";
  return (
    <div className={cn("rounded-xl border p-3 flex flex-col gap-0.5", bg)}>
      <div className={cn("text-[10px]", labelCls)}>{label}</div>
      <div className={cn("text-[15px] font-bold leading-tight", valueCls)}>{value}</div>
      {sub && <div className={cn("text-[9px]", variant === "dark" ? "text-background/50" : "text-muted-foreground")}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2">{children}</p>
  );
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const pts = +(score * weight).toFixed(1);
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label} ({(weight * 100).toFixed(0)}%)</span>
        <span className="font-semibold">{score}/100 → <span className="text-foreground">{pts} pt</span></span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ScoreGauge({ skor, kategori, decision }: { skor: number; kategori: string; decision: string }) {
  const color = skor >= 85 ? "#10b981" : skor >= 70 ? "#3b82f6" : skor >= 55 ? "#f59e0b" : "#ef4444";
  const badge = skor >= 85 ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : skor >= 70 ? "bg-blue-50 text-blue-800 border-blue-200"
    : skor >= 55 ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-red-50 text-red-800 border-red-200";
  const decisionBadge = decision === "BELI" ? "bg-emerald-600 text-white"
    : decision === "BELI_DENGAN_NEGOSIASI" ? "bg-blue-600 text-white"
    : decision === "HOLD" ? "bg-amber-500 text-white"
    : "bg-red-600 text-white";
  const decisionLabel = { BELI: "BELI", BELI_DENGAN_NEGOSIASI: "BELI — NEGOSIASI", HOLD: "HOLD / TINJAU ULANG", JANGAN_BELI: "JANGAN BELI" }[decision] ?? decision;

  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(skor, 100) / 100) * circ;

  return (
    <div className="bg-muted/30 border rounded-xl p-3 flex items-center gap-4">
      <div className="relative shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="7" />
          <circle cx="44" cy="44" r={r} fill="none"
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
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="text-[10px] text-muted-foreground">Skor Kelayakan Lahan</div>
        <span className={cn("inline-flex items-center text-[11px] font-semibold border rounded-full px-2.5 py-0.5", badge)}>
          {kategori}
        </span>
        <div>
          <span className={cn("inline-flex items-center text-[11px] font-bold rounded-full px-2.5 py-0.5", decisionBadge)}>
            Keputusan: {decisionLabel}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${skor}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandAssessmentModal({ polygon, terrainData, terrainLoading, onClose, onSaved }: Props) {
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hargaTanahM2: "",
    aksesJalan: "",
    targetTipeRumah: "subsidi",
    hargaJualPerUnit: "",
    biayaBangunPerUnit: "",
    biayaInfrastrukturPct: "15",
    biayaLegalPct: "5",
    fasilitasUmum: [] as string[],
    kondisiLingkungan: "aman",
    potensiPertumbuhan: "sedang",
    utilitas: [] as string[],
    hargaRumahSekitar: "",
    statusKepemilikan: "SHM (Sertifikat Hak Milik)",
    bentukLahan: "kotak",
    catatan: "",
    kecamatan: polygon.kecamatan,
    kabupaten: polygon.kabupaten,
    kelurahan: polygon.kelurahan,
  });
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({});
  // Apakah user sedang mengedit lokasi secara manual
  const [editingLocation, setEditingLocation] = useState(
    !polygon.kecamatan || !polygon.kabupaten
  );

  // Auto-fill Data Teknis (pks_mou) dari terrain data
  useEffect(() => {
    if (!terrainData) return;
    const fills: Record<string, string> = {};
    if (polygon.luas) fills.luas_lahan_teknis = `${polygon.luas.toLocaleString("id-ID")} m²`;
    const slope = terrainData.slopeAvgPct;
    if (slope != null) {
      const lbl = slope < 2 ? "Datar" : slope < 5 ? "Landai" : slope < 15 ? "Berbukit" : "Curam";
      fills.topografi = lbl;
      fills.kontur = `${lbl} — ${slope.toFixed(1)}% kemiringan rata-rata`;
    }
    if (terrainData.waterwayDistM != null) {
      const dist = terrainData.waterwayDistM;
      const r = dist < 100 ? "Sangat Rawan" : dist < 300 ? "Rawan" : dist < 500 ? "Waspada" : "Aman";
      fills.peil_banjir = `${r} — ${Math.round(dist)}m dari badan air`;
    }
    if (Object.keys(fills).length === 0) return;
    setChecklistValues(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(fills)) {
        if (!next[k]) next[k] = v;
      }
      return next;
    });
    setCheckedItems(prev => {
      const missing = Object.keys(fills).filter(k => !prev.includes(k));
      return missing.length ? [...prev, ...missing] : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainData, polygon.luas]);

  // Auto-geocode kecamatan/kabupaten jika kosong tapi koordinat tersedia
  useEffect(() => {
    const needsGeocode = (!polygon.kecamatan || !polygon.kabupaten) && polygon.center[0] && polygon.center[1];
    if (!needsGeocode) return;

    const [lat, lng] = polygon.center;

    function stripKec(s: string) { return s.replace(/^(kecamatan|kec\.?)\s+/i, "").trim(); }
    function stripKab(s: string) { return s.replace(/^(kabupaten|kota|kab\.?)\s+/i, "").trim(); }

    Promise.all([
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, { headers: { "Accept-Language": "id" } }),
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=13&addressdetails=1`, { headers: { "Accept-Language": "id" } }),
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, { headers: { "Accept-Language": "id" } }),
    ])
      .then(([r16, r13, r10]) => Promise.all([r16.json(), r13.json(), r10.json()]))
      .then(([a16, a13, a10]) => {
        const kelurahan = a16.address?.village || a16.address?.hamlet || a16.address?.suburb || a16.address?.neighbourhood
          || a13.address?.village || a13.address?.hamlet || a13.address?.suburb || a13.address?.neighbourhood || "";
        const kecRaw = a16.address?.city_district || a16.address?.district
          || a13.address?.city_district || a13.address?.district
          || a10.address?.city_district || a10.address?.district || "";
        const kecamatan = stripKec(kecRaw);
        const kabRaw = a10.address?.county || a10.address?.state_district || a10.address?.municipality || a10.address?.city
          || a13.address?.county || a13.address?.state_district || a13.address?.municipality || a13.address?.city
          || a16.address?.county || a16.address?.state_district || "";
        const kabupaten = stripKab(kabRaw);
        setForm(f => ({
          ...f,
          kelurahan: f.kelurahan || kelurahan,
          kecamatan: f.kecamatan || kecamatan,
          kabupaten: f.kabupaten || kabupaten,
        }));
        if (kecamatan && kabupaten) setEditingLocation(false);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: normalisasi nama kabupaten untuk matching (strip prefix + kata "DAN")
  function normKab(s: string) {
    return s.toUpperCase()
      .replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "")
      .replace(/\s+DAN\s+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Data kompetitor dari DAFTAR_PERUMAHAN_SULSEL berdasarkan kecamatan/kabupaten yang sedang aktif di form
  const competitorDataKab = useMemo(() => {
    if (!form.kabupaten) return [];
    const kabNorm = normKab(form.kabupaten);
    return DAFTAR_PERUMAHAN_SULSEL.filter(p => {
      const pk = normKab(p.kabupaten);
      return pk === kabNorm || pk.includes(kabNorm) || kabNorm.includes(pk);
    }).map(p => ({ name: p.nama, type: p.jenis ?? "Perumahan", pengembang: p.pengembang, kecamatan: p.kecamatan, kabupaten: p.kabupaten, kelurahan: p.kelurahan, totalUnit: (p.totalUnit || 0) + (p.unitKomersil || 0) }));
  }, [form.kabupaten]);

  const competitorDataKec = useMemo(() => {
    if (!form.kecamatan) return competitorDataKab;
    const kecNorm = form.kecamatan.toUpperCase().trim();
    return competitorDataKab.filter(p => (p.kecamatan ?? "").toUpperCase().trim() === kecNorm);
  }, [form.kecamatan, competitorDataKab]);

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<typeof RESULT_TABS[number]["key"]>("overview");

  function toggleChip(field: "fasilitasUmum" | "utilitas", value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter(x => x !== value) : [...f[field], value],
    }));
  }

  async function handleSaveTopipeline() {
    setSaving(true);
    try {
      const r = await fetch("/api/land-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "prospek_baru",
          lokasi: polygon.lokasi || polygon.kecamatan || polygon.kabupaten,
          luas: polygon.luas,
          hargaM2: parseFloat(form.hargaTanahM2) || 0,
          roi: result?.calc.financials.roi || 0,
          aksesJalan: parseFloat(form.aksesJalan) || undefined,
          lat: polygon.center[0],
          lng: polygon.center[1],
          kelurahan: polygon.kelurahan,
          kecamatan: polygon.kecamatan,
          kabupaten: polygon.kabupaten,
          polygonCoords: polygon.geoStr,
        }),
      });
      if (r.ok) {
        try {
          const saved = await r.json();
          const pid: number | undefined = saved?.id;
          if (pid) {
            // ── Map & pre-fill DATA LAPANGAN survey data ──
            const bentukMap: Record<string, string> = {
              kotak: "Kotak", persegi_panjang: "Persegi Panjang",
              l_shape: "L", segitiga: "Segitiga", tidak_beraturan: "Kotak",
            };
            const legalMap: Record<string, string> = {
              "SHM (Sertifikat Hak Milik)": "SHM",
              "HGB (Hak Guna Bangunan)": "HGB",
              "SHGB": "HGB",
              "Girik/Adat": "Girik",
              "Letter C/Sporadik": "Girik",
            };
            const utilitasMap: Record<string, string> = {
              "Listrik PLN": "PLN", "Air PDAM": "PDAM",
              "Internet Fiber/4G": "Internet", "Gas Kota": "Gas PGN",
            };
            const slope = terrainData?.slopeAvgPct;
            const topoVal = slope != null ? (slope < 5 ? "Datar" : slope < 15 ? "Berbukit" : "Curam") : "";
            const dist = terrainData?.waterwayDistM;
            const banjirVal = dist != null ? (dist < 100 ? "Sangat Rawan" : dist < 300 ? "Rawan" : "Aman") : "";

            const surveyData = {
              bentukLahan: bentukMap[form.bentukLahan] ?? "Kotak",
              statusLegal: legalMap[form.statusKepemilikan] ?? "",
              topografi: topoVal,
              kondisiJalan: checklistValues["kondisi_jalan"] || "",
              utilitas: form.utilitas.map(u => utilitasMap[u] ?? "").filter(Boolean),
              peilBanjir: banjirVal,
              namaPemilik: "",
              kontakPemilik: "",
            };
            localStorage.setItem(`satara_survey_${pid}`, JSON.stringify(surveyData));

            // ── Auto-fill checklist values dari data form modal ──
            const tipeRumahLabel: Record<string, string> = {
              subsidi: "subsidi",
              komersial_kecil: "komersial",
              komersial_menengah: "menengah",
            };
            const newChecklistVals: Record<string, string> = {};
            if (form.hargaTanahM2)     newChecklistVals.harga_tanah_m2      = form.hargaTanahM2;
            if (form.hargaRumahSekitar) newChecklistVals.harga_rumah_sekitar  = form.hargaRumahSekitar;
            if (form.targetTipeRumah)   newChecklistVals.tipe_rumah_sekitar   = tipeRumahLabel[form.targetTipeRumah] ?? form.targetTipeRumah;
            if (form.aksesJalan)        newChecklistVals.sistem_pembayaran    = "";

            const autoChecked: string[] = [];
            if (parseFloat(form.aksesJalan) >= 5)                                     autoChecked.push("akses_jalan_5m");
            if (form.fasilitasUmum.length > 0)                                        autoChecked.push("dekat_fasilitas");
            if (["aman","sangat_aman"].includes(form.kondisiLingkungan))               autoChecked.push("lingkungan_aman");
            if (["tinggi","sangat_tinggi"].includes(form.potensiPertumbuhan))          autoChecked.push("potensi_pertumbuhan");
            if (form.utilitas.length > 0)                                             autoChecked.push("utilitas_tersedia");
            if (form.hargaRumahSekitar)                                               autoChecked.push("harga_rumah_sekitar");
            if (form.targetTipeRumah)                                                 autoChecked.push("tipe_rumah_sekitar");
            if (form.hargaTanahM2)                                                    autoChecked.push("harga_tanah_m2");
            if (form.statusKepemilikan.includes("SHM") || form.statusKepemilikan.includes("HGB")) {
              autoChecked.push("shm_alas_hak");
            }
            if (parseFloat(form.aksesJalan) >= 5)                                     autoChecked.push("akses_jalan_legal");

            const existingVals = (() => { try { return JSON.parse(localStorage.getItem("satara_checklist_vals") ?? "{}"); } catch { return {}; } })() as Record<string, unknown>;
            existingVals[pid] = newChecklistVals;
            localStorage.setItem("satara_checklist_vals", JSON.stringify(existingVals));

            const existingChecked = (() => { try { return JSON.parse(localStorage.getItem("satara_acq_checklist") ?? "{}"); } catch { return {}; } })() as Record<string, unknown>;
            const prevChecked: string[] = Array.isArray(existingChecked[pid]) ? (existingChecked[pid] as string[]) : [];
            const mergedChecked = [...new Set([...prevChecked, ...autoChecked])];
            existingChecked[pid] = mergedChecked;
            localStorage.setItem("satara_acq_checklist", JSON.stringify(existingChecked));

            // Sync ke DB
            fetch(`/api/land-prospects/${pid}/acquisition`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checklistItems: mergedChecked, checklistValues: newChecklistVals }),
            }).catch(() => {});

            // ── Map & save AI analysis result ──
            if (result) {
              const decisionMap: Record<string, string> = {
                BELI: "Sangat Direkomendasikan",
                BELI_DENGAN_NEGOSIASI: "Direkomendasikan",
                HOLD: "Perlu Review",
                JANGAN_BELI: "Tidak Direkomendasikan",
              };
              const aiResult = {
                verdict: decisionMap[result.decision] ?? "Perlu Review",
                kategori: result.kategori,
                score: result.skor,
                ringkasan: result.ai?.ringkasanEksekutif ?? "",
                kelebihan: (result.ai?.nextActions ?? []).slice(0, 5),
                risiko: (result.ai?.analisisRisiko ?? []).slice(0, 5).map(
                  (item: { risiko: string; deskripsi: string }) => `${item.risiko}: ${item.deskripsi}`
                ),
                rekomendasi: result.ai?.rekomendasiNarasi ?? "",
                potensiUnit: result.calc?.unitPotential?.unitRealistis,
                hargaMaksAkuisisi: result.calc?.financials?.maxHargaM2,
                roiEstimasi: result.calc?.financials?.roi,
                paybackBulan: result.calc?.financials?.paybackBulan,
                potensiRevenue: result.calc?.financials?.revenue,
                estimasiHPP: result.calc?.financials?.totalHPP,
                estimasiProfit: result.calc?.financials?.profit,
                tingkatRisiko: result.calc?.risks?.overallRisk,
              };
              localStorage.setItem(`satara_ai_${pid}`, JSON.stringify(aiResult));
              localStorage.setItem(`satara_full_ai_${pid}`, JSON.stringify(result));
            }
          }
        } catch { /* ignore — prospect tetap tersimpan ke pipeline */ }
        onSaved?.();
        onClose();
      }
    } finally {
      setSaving(false);
    }
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
      kelurahan: form.kelurahan || polygon.kelurahan,
      kecamatan: form.kecamatan || polygon.kecamatan,
      kabupaten: form.kabupaten || polygon.kabupaten,
      luas: polygon.luas,
      hargaTanahM2: parseFloat(form.hargaTanahM2),
      aksesJalan: parseFloat(form.aksesJalan),
      targetTipeRumah: form.targetTipeRumah,
      hargaJualPerUnit: parseFloat(form.hargaJualPerUnit) || 0,
      biayaBangunPerUnit: parseFloat(form.biayaBangunPerUnit) || 0,
      biayaInfrastrukturPct: parseFloat(form.biayaInfrastrukturPct) || 15,
      biayaLegalPct: parseFloat(form.biayaLegalPct) || 5,
      fasilitasUmum: form.fasilitasUmum,
      kondisiLingkungan: form.kondisiLingkungan,
      potensiPertumbuhan: form.potensiPertumbuhan,
      utilitas: form.utilitas,
      hargaRumahSekitar: parseFloat(form.hargaRumahSekitar) || 0,
      statusKepemilikan: form.statusKepemilikan,
      bentukLahan: form.bentukLahan,
      catatan: form.catatan,
      checkedItems,
      checklistValues,
      ...(terrainData ?? {}),
      // Data kompetitor dari database SLIS
      competitors: competitorDataKab,
      competitorsKecamatan: competitorDataKec,
    };

    try {
      const res = await fetch("/api/ai/land-assessment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setPhase("result");
      setActiveTab("overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungi AI. Coba lagi.");
      setPhase("form");
    }
  }

  const slopeAvg    = terrainData?.slopeAvgPct;
  const slopeLabel  = slopeAvg != null ? (slopeAvg < 2 ? "Datar" : slopeAvg < 5 ? "Landai" : slopeAvg < 15 ? "Miring" : "Curam") : null;
  const waterwayDist = terrainData?.waterwayDistM;
  const floodLabel  = waterwayDist != null ? (waterwayDist < 100 ? "Tinggi" : waterwayDist < 300 ? "Sedang" : waterwayDist < 500 ? "Waspada" : "Rendah") : "N/A";
  const floodColor  = waterwayDist != null ? (waterwayDist < 100 ? "text-red-600" : waterwayDist < 300 ? "text-orange-500" : waterwayDist < 500 ? "text-amber-500" : "text-emerald-600") : "text-muted-foreground";

  const previewUnit = Math.floor(polygon.luas * 0.6 / 100);

  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={phase === "form" ? onClose : undefined} />

      <div className="relative z-10 w-full max-w-[600px] h-full bg-background border-l shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm">Penilaian Lahan</h2>
              <span className="text-[9px] bg-muted text-foreground border border-border rounded-full px-1.5 py-0.5 font-medium flex items-center gap-0.5">
                <Calculator className="size-2.5" /> Calc Engine
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {polygon.lokasi}{polygon.kabupaten ? ` · ${polygon.kabupaten}` : ""}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] bg-muted border rounded px-1.5 py-0.5 font-medium">{polygon.luas.toLocaleString("id-ID")} m²</span>
              <span className="text-[10px] bg-muted border rounded px-1.5 py-0.5 font-medium">~{previewUnit} unit est.</span>
              {slopeLabel && (
                <span className={cn("text-[10px] rounded px-1.5 py-0.5 font-medium border",
                  slopeLabel === "Datar" || slopeLabel === "Landai" ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-amber-50 border-amber-200 text-amber-700"
                )}>{slopeLabel}</span>
              )}
              {waterwayDist != null && (
                <span className={cn("text-[10px] rounded px-1.5 py-0.5 font-medium border",
                  waterwayDist < 100 ? "bg-red-50 border-red-200 text-red-700" :
                  waterwayDist < 300 ? "bg-orange-50 border-orange-200 text-orange-700" :
                  "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>Banjir: {floodLabel}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* ── FORM PHASE ── */}
        {phase === "form" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5">

              {/* Lokasi Administratif */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Lokasi Administratif</h3>
                  {!editingLocation && form.kecamatan && form.kabupaten && (
                    <button
                      type="button"
                      onClick={() => setEditingLocation(true)}
                      className="text-[9px] text-foreground/50 hover:text-foreground border border-border/60 px-2 py-0.5 rounded transition-colors"
                    >
                      Koreksi
                    </button>
                  )}
                </div>

                {/* Mode terkonfirmasi — tampilkan sebagai tags */}
                {!editingLocation && form.kecamatan && form.kabupaten ? (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="size-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="size-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-emerald-700 font-medium mb-1">Lokasi terdeteksi otomatis</div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.kelurahan && (
                          <span className="text-[10px] font-medium bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                            {form.kelurahan}
                          </span>
                        )}
                        <span className="text-[10px] font-medium bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                          Kec. {form.kecamatan}
                        </span>
                        <span className="text-[10px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded">
                          {form.kabupaten}
                        </span>
                      </div>
                      {form.kabupaten && (
                        <div className="text-[9px] mt-1.5 text-emerald-700">
                          {competitorDataKab.length > 0
                            ? `${competitorDataKec.length} kompetitor di kec. ini · ${competitorDataKab.length} di kab. ini`
                            : "Tidak ada data kompetitor lokal — AI pakai pengetahuan pasar umum"}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Mode edit */
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Kelurahan/Desa</label>
                        <input
                          type="text"
                          value={form.kelurahan}
                          onChange={e => setForm(f => ({ ...f, kelurahan: e.target.value }))}
                          placeholder="Nama kelurahan"
                          className="w-full text-[11px] rounded border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-foreground/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Kecamatan <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={form.kecamatan}
                          onChange={e => setForm(f => ({ ...f, kecamatan: e.target.value }))}
                          placeholder="Nama kecamatan"
                          className={cn(
                            "w-full text-[11px] rounded border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-foreground/30",
                            !form.kecamatan && "border-amber-400"
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Kabupaten/Kota <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={form.kabupaten}
                          onChange={e => setForm(f => ({ ...f, kabupaten: e.target.value }))}
                          placeholder="Nama kabupaten"
                          className={cn(
                            "w-full text-[11px] rounded border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-foreground/30",
                            !form.kabupaten && "border-amber-400"
                          )}
                        />
                      </div>
                    </div>
                    {form.kecamatan && form.kabupaten && (
                      <button
                        type="button"
                        onClick={() => setEditingLocation(false)}
                        className="text-[9px] text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Konfirmasi lokasi
                      </button>
                    )}
                    {form.kabupaten && (
                      <div className="text-[9px] text-muted-foreground">
                        <span className={competitorDataKab.length > 0 ? "text-emerald-600" : "text-amber-600"}>
                          {competitorDataKab.length > 0
                            ? `${competitorDataKec.length} kompetitor di Kec. ${form.kecamatan || "—"} · ${competitorDataKab.length} di Kab. ${form.kabupaten}`
                            : `Tidak ada data kompetitor untuk ${form.kabupaten}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Tipe Rumah Target */}
              <section className="space-y-2">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Tipe Pengembangan Target</h3>
                <div className="grid grid-cols-3 gap-2">
                  {TIPE_RUMAH_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, targetTipeRumah: opt.value }))}
                      className={cn(
                        "text-left px-2.5 py-2 rounded-lg border transition-all",
                        form.targetTipeRumah === opt.value
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      <div className={cn("text-[11px] font-semibold", form.targetTipeRumah === opt.value ? "text-background" : "")}>{opt.label}</div>
                      <div className={cn("text-[9px] mt-0.5 leading-tight", form.targetTipeRumah === opt.value ? "text-background/70" : "text-muted-foreground")}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Data Lahan Utama */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Data Lahan</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Harga Tanah (Rp/m²) <span className="text-red-500">*</span>
                    </label>
                    <input type="text" inputMode="numeric" placeholder="contoh: 1.500.000"
                      value={formatRpInput(form.hargaTanahM2)}
                      onChange={e => setForm(f => ({ ...f, hargaTanahM2: parseRpInput(e.target.value) }))}
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
                    <input type="number" placeholder="contoh: 6"
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

                {/* Harga Jual & Biaya Bangun */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Harga Jual Target/Unit (Rp)
                      <span className="text-[9px] text-muted-foreground ml-1 font-normal">opsional</span>
                    </label>
                    <input type="text" inputMode="numeric" placeholder={form.targetTipeRumah === "subsidi" ? "200.000.000" : form.targetTipeRumah === "komersial_kecil" ? "385.000.000" : "650.000.000"}
                      value={formatRpInput(form.hargaJualPerUnit)}
                      onChange={e => setForm(f => ({ ...f, hargaJualPerUnit: parseRpInput(e.target.value) }))}
                      className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                    {!form.hargaJualPerUnit && <p className="text-[9px] text-amber-600 mt-0.5">Gunakan asumsi default jika kosong</p>}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Biaya Bangun/Unit (Rp)
                      <span className="text-[9px] text-muted-foreground ml-1 font-normal">opsional</span>
                    </label>
                    <input type="text" inputMode="numeric" placeholder={form.targetTipeRumah === "subsidi" ? "95.000.000" : form.targetTipeRumah === "komersial_kecil" ? "175.000.000" : "300.000.000"}
                      value={formatRpInput(form.biayaBangunPerUnit)}
                      onChange={e => setForm(f => ({ ...f, biayaBangunPerUnit: parseRpInput(e.target.value) }))}
                      className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                    {!form.biayaBangunPerUnit && <p className="text-[9px] text-amber-600 mt-0.5">Gunakan asumsi default jika kosong</p>}
                  </div>
                </div>

                {/* Biaya % */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Biaya Infrastruktur (% dari tanah)
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="5" max="40" step="1"
                        value={form.biayaInfrastrukturPct}
                        onChange={e => setForm(f => ({ ...f, biayaInfrastrukturPct: e.target.value }))}
                        className="w-20 text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                      />
                      <span className="text-[11px] text-muted-foreground">% <span className="text-[9px]">(default: 15%)</span></span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5">
                      Biaya Legal & Pajak (% dari tanah)
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="2" max="15" step="0.5"
                        value={form.biayaLegalPct}
                        onChange={e => setForm(f => ({ ...f, biayaLegalPct: e.target.value }))}
                        className="w-20 text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30"
                      />
                      <span className="text-[11px] text-muted-foreground">% <span className="text-[9px]">(default: 5%)</span></span>
                    </div>
                  </div>
                </div>

                {/* Harga rumah sekitar */}
                <div>
                  <label className="text-[11px] font-medium block mb-1.5">Harga Rumah Existing di Sekitar (Rp)</label>
                  <input type="text" inputMode="numeric" placeholder="contoh: 350.000.000"
                    value={formatRpInput(form.hargaRumahSekitar)}
                    onChange={e => setForm(f => ({ ...f, hargaRumahSekitar: parseRpInput(e.target.value) }))}
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
                    <button key={opt} type="button"
                      onClick={() => setForm(f => ({ ...f, statusKepemilikan: opt }))}
                      className={cn("text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                        form.statusKepemilikan === opt
                          ? "bg-foreground text-background border-foreground font-medium"
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                      )}
                    >{opt}</button>
                  ))}
                </div>
              </section>

              {/* Bentuk Lahan */}
              <section className="space-y-2">
                <label className="text-[11px] font-medium block">Bentuk Lahan</label>
                <div className="flex flex-wrap gap-1.5">
                  {BENTUK_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, bentukLahan: opt.value }))}
                      className={cn("text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                        form.bentukLahan === opt.value
                          ? "bg-foreground text-background border-foreground font-medium"
                          : "bg-background border-border text-muted-foreground hover:border-foreground/40"
                      )}
                    >{opt.label}</button>
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
                        <RadioOption key={opt.value} value={opt.value} label={opt.label}
                          selected={form.kondisiLingkungan === opt.value}
                          onSelect={() => setForm(f => ({ ...f, kondisiLingkungan: opt.value }))} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-2">Potensi Pertumbuhan</label>
                    <div className="space-y-2">
                      {PERTUMBUHAN_OPTIONS.map(opt => (
                        <RadioOption key={opt.value} value={opt.value} label={opt.label} sub={opt.sub}
                          selected={form.potensiPertumbuhan === opt.value}
                          onSelect={() => setForm(f => ({ ...f, potensiPertumbuhan: opt.value }))} />
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

              {/* Terrain summary */}
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
                    <p className="text-[10px] font-semibold text-sky-700">Data Topografi SRTM NASA — otomatis disertakan dalam analisis</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Elevasi avg</div>
                      <div className="text-[13px] font-semibold">{terrainData.elevAvg?.toFixed(0) ?? "—"}m</div>
                    </div>
                    <div className="text-center bg-white/80 rounded-lg p-2 border border-sky-100">
                      <div className="text-[9px] text-muted-foreground">Kemiringan</div>
                      <div className={cn("text-[13px] font-semibold", slopeLabel === "Curam" || slopeLabel === "Miring" ? "text-amber-600" : "")}>
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
                  <span className="text-[11px] text-muted-foreground">Tidak ada data SRTM. AI akan mengestimasi topografi berdasarkan lokasi geografis.</span>
                </div>
              )}

              {/* ── JOBDESK 5 Fase Akuisisi ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Jobdesk Akuisisi — 5 Fase</h3>
                  <span className="text-[9px] text-muted-foreground">
                    {checkedItems.length}/{JOBDESK_STAGES.reduce((s, f) => s + f.checklist.length, 0)} item
                  </span>
                </div>
                <div className="space-y-2">
                  {JOBDESK_STAGES.map((jStage) => {
                    const stageChecked = jStage.checklist.filter(c => checkedItems.includes(c.key)).length;
                    const allDone = stageChecked === jStage.checklist.length && jStage.checklist.length > 0;
                    return (
                      <div key={jStage.key} className={cn("rounded-lg border overflow-hidden", jStage.color)}>
                        {/* Header */}
                        <div className={cn("flex items-center gap-2 px-3 py-2", jStage.headerColor)}>
                          <div className={cn(
                            "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                            allDone ? "bg-emerald-500 border-emerald-500" : "border-current bg-transparent"
                          )}>
                            {allDone && <CheckCircle2 className="size-3 text-white" strokeWidth={3} />}
                            {!allDone && <div className="size-1.5 rounded-full bg-current opacity-60" />}
                          </div>
                          <span className="text-[11px] font-bold flex-1">{jStage.no}. {jStage.label}</span>
                          <span className="text-[10px] opacity-70">{stageChecked}/{jStage.checklist.length}</span>
                        </div>
                        {/* Items */}
                        <div className="px-3 py-2 space-y-1.5">
                          {jStage.checklist.map((item) => {
                            const done = checkedItems.includes(item.key);
                            const inputDef = CHECKLIST_INPUT_TYPES[item.key];
                            const currentVal = checklistValues[item.key] ?? "";
                            const formAutoFill =
                              item.key === "harga_tanah_m2" && form.hargaTanahM2 ? form.hargaTanahM2
                              : item.key === "harga_rumah_sekitar" && form.hargaRumahSekitar ? form.hargaRumahSekitar
                              : "";
                            const displayVal = currentVal || formAutoFill;
                            const TERRAIN_ITEM_KEYS = new Set(["topografi","kontur","peil_banjir","luas_lahan_teknis","utilitas_teknis"]);
                            const isTerrainItem = TERRAIN_ITEM_KEYS.has(item.key);
                            return (
                              <div key={item.key} className="space-y-0.5">
                                <div
                                  onClick={() => setCheckedItems(prev =>
                                    prev.includes(item.key) ? prev.filter(k => k !== item.key) : [...prev, item.key]
                                  )}
                                  className={cn(
                                    "flex items-start gap-1.5 text-[11px] rounded px-1 py-0.5 cursor-pointer hover:bg-black/5 transition-colors select-none",
                                    done ? "text-emerald-700" : "text-foreground/80"
                                  )}
                                >
                                  {done
                                    ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-[1px]" strokeWidth={2.5} />
                                    : <div className="size-3.5 rounded-full border border-foreground/30 shrink-0 mt-[1px]" />
                                  }
                                  <span className={cn("leading-tight flex-1", done && !inputDef && "line-through decoration-emerald-500/60")}>
                                    {item.label}
                                  </span>
                                  {isTerrainItem && done && (
                                    <span className="text-[8px] font-medium text-blue-500 bg-blue-50 px-1 rounded shrink-0 ml-1">AI</span>
                                  )}
                                  {inputDef && displayVal && done && !isTerrainItem && (
                                    <span className="text-[9px] font-medium text-foreground/50 shrink-0 ml-1 truncate max-w-[60px]">
                                      {displayVal.slice(0, 10)}
                                    </span>
                                  )}
                                </div>
                                {inputDef && (done || isTerrainItem) && (
                                  <div className="ml-5 mt-0.5">
                                    <div className="flex items-center gap-1">
                                      {inputDef.type === "rp" && <span className="text-[10px] text-muted-foreground font-medium shrink-0">Rp</span>}
                                      <input
                                        type={inputDef.type === "pct" ? "number" : "text"}
                                        inputMode={inputDef.type !== "text" ? "numeric" : "text"}
                                        value={displayVal}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setChecklistValues(prev => ({ ...prev, [item.key]: v }));
                                        }}
                                        placeholder={inputDef.placeholder}
                                        className="flex-1 text-[11px] px-2 py-0.5 border border-amber-300 rounded bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-0 placeholder:text-muted-foreground/50"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      {inputDef.type === "pct" && <span className="text-[10px] text-muted-foreground shrink-0">%</span>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {/* Tandai semua button */}
                          <button
                            type="button"
                            onClick={() => {
                              const keys = jStage.checklist.map(c => c.key);
                              const allChecked = keys.every(k => checkedItems.includes(k));
                              if (allChecked) {
                                setCheckedItems(prev => prev.filter(k => !keys.includes(k)));
                              } else {
                                setCheckedItems(prev => [...new Set([...prev, ...keys])]);
                              }
                            }}
                            className="w-full text-[9px] text-foreground/50 hover:text-foreground py-0.5 border border-border/50 rounded hover:bg-black/5 transition-colors mt-0.5"
                          >
                            {jStage.checklist.every(c => checkedItems.includes(c.key)) ? "Batal semua" : "Tandai semua"}
                          </button>
                        </div>
                        {/* Progress bar */}
                        <div className="px-3 pb-2">
                          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", allDone ? "bg-emerald-500" : "bg-amber-400")}
                              style={{ width: `${jStage.checklist.length > 0 ? (stageChecked / jStage.checklist.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Catatan */}
              <section className="space-y-1.5">
                <label className="text-[11px] font-medium block">Catatan / Informasi Tambahan</label>
                <textarea rows={3} placeholder="Informasi lapangan tambahan, kondisi khusus, kendala, atau potensi yang relevan..."
                  value={form.catatan}
                  onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  className="w-full text-[12px] rounded-lg border bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
                />
              </section>

              {error && (
                <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOADING PHASE ── */}
        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="size-16 rounded-full bg-muted border border-border flex items-center justify-center">
              <Brain className="size-7 text-foreground animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Sedang menganalisis lahan...</h3>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed max-w-xs">
                Menghitung semua angka finansial secara deterministik, lalu AI menulis narasi analisis
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
              {[
                "Calculation Engine: alokasi lahan, unit, finansial, skor...",
                "AI Narrative Engine: analisis lokasi & tapak...",
                "AI menyusun risiko, rekomendasi, dan dokumen...",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && result && (() => {
          const { calc, ai, topografi: topo } = result;
          const fin = calc.financials;
          const up  = calc.unitPotential;
          const la  = calc.landAllocation;
          const ri  = calc.risks;
          const sc  = calc.scores;

          return (
            <>
              {/* Tab bar */}
              <div className="flex border-b bg-muted/20 overflow-x-auto shrink-0">
                {RESULT_TABS.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                      activeTab === key
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* ── OVERVIEW TAB ── */}
                {activeTab === "overview" && (
                  <>
                    <ScoreGauge skor={result.skor} kategori={result.kategori} decision={result.decision} />

                    {/* Key metrics grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <MetricCard label="Unit Realistis" value={`${up.unitRealistis} unit`} sub={`${up.kavlingDefault}m² / unit`} variant="dark" />
                      <MetricCard label="ROI" value={`${fin.roi}%`}
                        variant={fin.roi >= 35 ? "good" : fin.roi >= 25 ? "warn" : "bad"}
                        sub={fin.roi >= 35 ? "Sangat Bagus" : fin.roi >= 25 ? "Layak" : "Di bawah target"}
                      />
                      <MetricCard label="Payback" value={`${fin.paybackBulan} bln`} sub="estimasi waktu BEP" />
                      <MetricCard label="Total Profit" value={formatRp(fin.profit)}
                        variant={fin.profit > 0 ? "good" : "bad"} sub={`Margin ${fin.margin}%`} />
                      <MetricCard label="Harga Maks" value={`Rp ${fin.maxHargaM2.toLocaleString("id-ID")}/m²`}
                        sub={`Agar ROI ≥ 25%`}
                        variant={fin.maxHargaM2 > 0 ? (parseFloat(form.hargaTanahM2) <= fin.maxHargaM2 ? "good" : "bad") : "default"}
                      />
                      <MetricCard label="Risiko Overall" value={ri.overallRisk}
                        variant={ri.overallRisk === "Rendah" ? "good" : ri.overallRisk === "Sedang" ? "warn" : "bad"} />
                    </div>

                    {/* Score breakdown */}
                    <div className="bg-muted/30 border rounded-xl p-3 space-y-2">
                      <SectionLabel>Breakdown Skor Kelayakan</SectionLabel>
                      <ScoreBar label="Lokasi & Akses"    score={sc.lokasiScore} weight={0.20} />
                      <ScoreBar label="Harga Tanah"        score={sc.hargaScore}  weight={0.20} />
                      <ScoreBar label="Potensi ROI"        score={sc.roiScore}    weight={0.20} />
                      <ScoreBar label="Potensi Unit"       score={sc.unitScore}   weight={0.15} />
                      <ScoreBar label="Legalitas"          score={sc.legalScore}  weight={0.10} />
                      <ScoreBar label="Pasar & Kompetitor" score={sc.pasarScore}  weight={0.10} />
                      <ScoreBar label="Risiko Teknis"      score={sc.teknisScore} weight={0.05} />
                      <div className="flex justify-between text-[12px] font-bold border-t border-border pt-2 mt-1">
                        <span>Total Skor</span>
                        <span>{sc.total}/100 — {sc.category}</span>
                      </div>
                    </div>

                    {/* Assumptions notice */}
                    {calc.assumptions.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Info className="size-3.5 text-amber-600 shrink-0" />
                          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">Asumsi Analisis</span>
                        </div>
                        <ul className="space-y-0.5">
                          {calc.assumptions.map((a, i) => (
                            <li key={i} className="text-[11px] text-amber-900 flex items-start gap-1.5">
                              <ChevronRight className="size-3 shrink-0 mt-0.5 text-amber-600" /> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Ringkasan Eksekutif */}
                    {ai.ringkasanEksekutif && (
                      <div className="bg-muted/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <SectionLabel>Ringkasan Eksekutif</SectionLabel>
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap">{cleanAiText(ai.ringkasanEksekutif)}</div>
                      </div>
                    )}

                    {/* Next actions */}
                    {ai.nextActions?.length > 0 && (
                      <div className="bg-foreground text-background rounded-xl p-3">
                        <SectionLabel>Langkah Selanjutnya</SectionLabel>
                        <ol className="space-y-1.5">
                          {ai.nextActions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px]">
                              <span className="size-4 rounded-full bg-background/20 flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5">{i + 1}</span>
                              {cleanAiText(a)}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </>
                )}

                {/* ── FINANSIAL TAB ── */}
                {activeTab === "finansial" && (
                  <>
                    {/* Unit scenarios */}
                    <div className="grid grid-cols-3 gap-2">
                      <MetricCard label="Unit Minimum" value={`${up.unitMin}`} sub={`kavling ${up.kavlingMax}m²`} />
                      <MetricCard label="Unit Realistis" value={`${up.unitRealistis}`} sub={`kavling ${up.kavlingDefault}m²`} variant="dark" />
                      <MetricCard label="Unit Maksimum" value={`${up.unitMax}`} sub={`kavling ${up.kavlingMin}m²`} />
                    </div>

                    {/* Alokasi Lahan */}
                    <div className="bg-muted/30 border rounded-xl p-3">
                      <SectionLabel>Alokasi Lahan ({la.efficiencyPct}% efektif)</SectionLabel>
                      {[
                        { label: `Kavling Efektif (${(la.pctEfektif * 100).toFixed(0)}%)`, value: la.luasEfektif, color: "bg-emerald-500" },
                        { label: `Jalan Internal (${(la.pctJalan * 100).toFixed(0)}%)`,    value: la.luasJalan, color: "bg-blue-500" },
                        { label: `Fasum & RTH (${(la.pctFasum * 100).toFixed(0)}%)`,       value: la.luasFasum, color: "bg-slate-500" },
                        { label: `Area Tidak Efektif (${(la.pctTidakEfektif * 100).toFixed(0)}%)`, value: la.luasTidakEfektif, color: "bg-amber-500" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="space-y-0.5 mb-2">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{value.toLocaleString("id-ID")} m²</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", color)} style={{ width: `${(value / la.luasTotal) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total cost breakdown */}
                    <div className="bg-muted/30 border rounded-xl p-3 space-y-1.5">
                      <SectionLabel>Komponen Biaya Total (HPP)</SectionLabel>
                      {[
                        { label: "Akuisisi Tanah", value: fin.totalAkuisisi },
                        { label: "Biaya Infrastruktur & Matang", value: fin.biayaInfrastruktur },
                        { label: "Biaya Legal & Pajak", value: fin.biayaLegal },
                        { label: `Biaya Konstruksi (${up.unitRealistis} unit)`, value: fin.biayaKonstruksi },
                        { label: "Kontingency (5%)", value: fin.kontingensiBiaya },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{formatRp(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-[12px] font-bold border-t border-border pt-2 mt-1">
                        <span>TOTAL HPP</span>
                        <span>{formatRp(fin.totalHPP)}</span>
                      </div>
                    </div>

                    {/* P&L */}
                    <div className="bg-muted/30 border rounded-xl p-3 space-y-1.5">
                      <SectionLabel>Proyeksi Laba Rugi</SectionLabel>
                      <div className="flex justify-between items-center text-[12px] font-bold text-emerald-700">
                        <span>Total Revenue ({up.unitRealistis} unit)</span>
                        <span>{formatRp(fin.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">Total HPP</span>
                        <span className="font-medium text-red-600">({formatRp(fin.totalHPP)})</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px] font-bold border-t border-border pt-2 mt-1">
                        <span>GROSS PROFIT</span>
                        <span className={fin.profit > 0 ? "text-emerald-700" : "text-red-600"}>{formatRp(fin.profit)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <MetricCard label="ROI" value={`${fin.roi}%`}
                          variant={fin.roi >= 35 ? "good" : fin.roi >= 25 ? "warn" : "bad"} />
                        <MetricCard label="Margin Gross" value={`${fin.margin}%`}
                          variant={fin.margin >= 20 ? "good" : fin.margin >= 15 ? "warn" : "bad"} />
                        <MetricCard label="Payback" value={`${fin.paybackBulan} bln`} />
                      </div>
                    </div>

                    {/* Per unit breakdown */}
                    <div className="bg-muted/30 border rounded-xl p-3 space-y-1.5">
                      <SectionLabel>Breakdown HPP per Unit</SectionLabel>
                      {[
                        { label: "Alokasi Tanah / Unit", value: fin.tanahPerUnit },
                        { label: "Infrastruktur & Matang / Unit", value: fin.infraPerUnit },
                        { label: `Biaya Konstruksi${fin.usingDefaultBiayaBangun ? " (estimasi)" : ""}`, value: fin.biayaBangunFinal },
                        { label: "Legal & Pajak / Unit", value: fin.legalPerUnit },
                        { label: "Kontingency / Unit", value: fin.kontingensiPerUnit },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{formatRp(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-[12px] font-bold border-t border-border pt-2 mt-1">
                        <span>Total HPP / Unit</span>
                        <span>{formatRp(fin.hppPerUnit)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px] font-bold text-emerald-700">
                        <span>Harga Jual / Unit{fin.usingDefaultHargaJual ? " (estimasi)" : ""}</span>
                        <span>{formatRp(fin.hargaJualFinal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                        <span>Margin / Unit</span>
                        <span className={cn("font-semibold", fin.marginPerUnitPct >= 20 ? "text-emerald-600" : "text-red-500")}>
                          {formatRp(fin.marginPerUnit)} ({fin.marginPerUnitPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Max price analysis */}
                    <div className={cn("border rounded-xl p-3 space-y-1.5",
                      parseFloat(form.hargaTanahM2) <= fin.maxHargaM2 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    )}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target className={cn("size-3.5 shrink-0", parseFloat(form.hargaTanahM2) <= fin.maxHargaM2 ? "text-emerald-600" : "text-red-600")} />
                        <SectionLabel>Analisis Harga Akuisisi</SectionLabel>
                      </div>
                      {[
                        { label: "Harga saat ini", value: `Rp ${parseFloat(form.hargaTanahM2).toLocaleString("id-ID")}/m²` },
                        { label: "Harga maks layak (ROI ≥ 25%)", value: `Rp ${fin.maxHargaM2.toLocaleString("id-ID")}/m²` },
                        { label: "Target negosiasi (10% di bawah maks)", value: `Rp ${fin.negotTargetM2.toLocaleString("id-ID")}/m²` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                      <div className={cn("text-[11px] font-semibold pt-1 border-t",
                        parseFloat(form.hargaTanahM2) <= fin.maxHargaM2 ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700"
                      )}>
                        {parseFloat(form.hargaTanahM2) <= fin.maxHargaM2
                          ? `Harga saat ini Rp ${(fin.maxHargaM2 - parseFloat(form.hargaTanahM2)).toLocaleString("id-ID")}/m² di bawah batas maksimum — masih layak`
                          : `Harga saat ini MELEBIHI batas maksimum sebesar Rp ${(parseFloat(form.hargaTanahM2) - fin.maxHargaM2).toLocaleString("id-ID")}/m² — perlu negosiasi`}
                      </div>
                    </div>
                  </>
                )}

                {/* ── TAPAK & LOKASI TAB ── */}
                {activeTab === "tapak" && (
                  <>
                    {/* Topografi card */}
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-3">
                        <MapPin className="size-3.5 text-sky-600 shrink-0" />
                        <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wide">
                          Data Topografi <span className="font-normal normal-case text-sky-600">({topo.sumber})</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        {[
                          { label: "Kategori Kontur",  value: topo.kategoriKontur },
                          { label: "Elevasi Rata-rata", value: `${topo.elevAvg}m` },
                          { label: "Kemiringan",        value: `${topo.slopeAvg}%` },
                          { label: "Risiko Banjir",     value: topo.risikoBanjir },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-white/80 rounded-lg p-2 border border-sky-100">
                            <div className="text-[9px] text-muted-foreground">{label}</div>
                            <div className="text-[12px] font-semibold">{value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 border border-sky-100">
                        <div className="text-[9px] text-muted-foreground mb-0.5">Modifier Biaya Matang/Infrastruktur</div>
                        <div className="text-[12px] font-semibold text-sky-800">{topo.biayaMatangModifier}</div>
                      </div>
                      {topo.waterwayInfo && (
                        <p className="text-[10px] text-sky-700 mt-2">Sungai/saluran terdekat: {topo.waterwayInfo}</p>
                      )}
                    </div>

                    {/* Efisiensi lahan */}
                    <div className="bg-muted/30 border rounded-xl p-3">
                      <SectionLabel>Efisiensi Lahan: {la.efficiencyPct}%</SectionLabel>
                      <p className="text-[11px] text-muted-foreground">
                        Berdasarkan bentuk lahan dan kontur: {(la.pctTidakEfektif * 100).toFixed(0)}% area tidak efektif.
                        {la.efficiencyPct >= 55 ? " Efisiensi baik." : la.efficiencyPct >= 45 ? " Efisiensi cukup." : " Efisiensi rendah — pertimbangkan desain kavling yang lebih fleksibel."}
                      </p>
                    </div>

                    {/* AI analisis lokasi */}
                    {ai.analisisLokasi && (
                      <div className="bg-muted/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <SectionLabel>Analisis Lokasi</SectionLabel>
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap">{cleanAiText(ai.analisisLokasi)}</div>
                      </div>
                    )}

                    {/* AI analisis fisik */}
                    {ai.analisisFisikLahan && (
                      <div className="bg-muted/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                          <SectionLabel>Analisis Fisik Lahan</SectionLabel>
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap">{cleanAiText(ai.analisisFisikLahan)}</div>
                      </div>
                    )}
                  </>
                )}

                {/* ── RISIKO TAB ── */}
                {activeTab === "risiko" && (
                  <>
                    {/* Risk overview */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Risiko Overall",  level: ri.overallRisk },
                        { label: "Hukum/Legal",     level: ri.legalRisk   },
                        { label: "Akses Jalan",     level: ri.aksesRisk   },
                        { label: "Kontur Lahan",    level: ri.konturRisk  },
                        { label: "Risiko Banjir",   level: ri.banjirRisk  },
                        { label: "Harga Tanah",     level: ri.hargaRisk   },
                        { label: "Pasar/Demand",    level: ri.marketRisk  },
                      ].map(({ label, level }) => (
                        <div key={label} className={cn("rounded-xl border p-2.5 flex items-center justify-between", riskColor(level))}>
                          <span className="text-[10px] font-medium">{label}</span>
                          <span className="text-[10px] font-bold">{level}</span>
                        </div>
                      ))}
                    </div>

                    {/* AI analisis risiko dengan mitigasi */}
                    {ai.analisisRisiko?.length > 0 && (
                      <div className="space-y-2">
                        <SectionLabel>Detail Risiko & Mitigasi</SectionLabel>
                        {ai.analisisRisiko.map((r, i) => (
                          <div key={i} className="border rounded-xl p-3 space-y-1.5 bg-card">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-semibold">{r.risiko}</span>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", riskColor(r.level))}>
                                {r.level}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{cleanAiText(r.deskripsi)}</p>
                            <div className="flex items-start gap-1.5 bg-muted/40 rounded-lg px-2 py-1.5">
                              <Shield className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                              <p className="text-[11px]"><span className="font-medium">Mitigasi: </span>{cleanAiText(r.mitigasi)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI rekomendasi */}
                    {ai.rekomendasiNarasi && (
                      <div className={cn("border rounded-xl p-3",
                        result.decision === "BELI" ? "bg-emerald-50 border-emerald-200" :
                        result.decision === "BELI_DENGAN_NEGOSIASI" ? "bg-blue-50 border-blue-200" :
                        result.decision === "HOLD" ? "bg-amber-50 border-amber-200" :
                        "bg-red-50 border-red-200"
                      )}>
                        <div className="flex items-center gap-1.5 mb-2">
                          {result.decision === "BELI" || result.decision === "BELI_DENGAN_NEGOSIASI"
                            ? <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            : result.decision === "HOLD"
                            ? <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                            : <XCircle className="size-3.5 text-red-600 shrink-0" />
                          }
                          <SectionLabel>Rekomendasi Keputusan</SectionLabel>
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap">{cleanAiText(ai.rekomendasiNarasi)}</div>
                      </div>
                    )}
                  </>
                )}

                {/* ── DOKUMEN TAB ── */}
                {activeTab === "dokumen" && (
                  <>
                    {/* Legal checklist */}
                    {ai.legalChecklist?.length > 0 && (
                      <>
                        <p className="text-[11px] text-muted-foreground">Dokumen dan tindakan legal yang perlu disiapkan sebelum akuisisi:</p>
                        <div className="space-y-2">
                          {ai.legalChecklist.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-card border rounded-lg px-3 py-2.5">
                              <div className={cn(
                                "size-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold",
                                item.prioritas === "tinggi" ? "bg-red-100 text-red-700 border border-red-200"
                                  : item.prioritas === "rendah" ? "bg-muted text-muted-foreground border border-border"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              )}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[12px] leading-snug">{item.item}</span>
                              </div>
                              <span className={cn(
                                "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 uppercase tracking-wide",
                                item.prioritas === "tinggi" ? "bg-red-50 text-red-700 border-red-200"
                                  : item.prioritas === "rendah" ? "bg-muted text-muted-foreground border-border"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {item.prioritas}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Draft MOU */}
                    {ai.draftMou && (
                      <div className="bg-muted/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-3">
                          <Shield className="size-3.5 text-muted-foreground" />
                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Draft Nota Kesepahaman (MOU)</span>
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono">{cleanAiText(ai.draftMou)}</div>
                      </div>
                    )}
                  </>
                )}

              </div>
            </>
          );
        })()}

        {/* ── Footer ── */}
        <div className="shrink-0 border-t px-4 py-3 bg-muted/20 flex items-center justify-between gap-2">
          {phase === "form" && (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="text-[12px]">Batal</Button>
              <Button size="sm" onClick={handleSubmit} className="text-[12px] gap-1.5">
                Analisis Lahan
              </Button>
            </>
          )}
          {phase === "result" && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setPhase("form"); setResult(null); }} className="text-[12px]">
                Edit &amp; Generate Ulang
              </Button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={onClose} className="text-[12px]">Tutup</Button>
                <Button size="sm" onClick={handleSaveTopipeline} disabled={saving} className="text-[12px]">
                  {saving ? "Menyimpan..." : "Simpan ke Pipeline"}
                </Button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
