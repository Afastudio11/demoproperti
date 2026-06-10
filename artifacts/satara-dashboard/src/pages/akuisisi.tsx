import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useListLandProspects } from "@workspace/api-client-react";
import type { LandProspect } from "@workspace/api-client-react";
import {
  CheckCircle2, Map, X,
  FileText, ClipboardList, BrainCircuit,
  Loader2, Search,
  Building2, Radio, Download, Database, BarChart3, ArrowRight,
} from "lucide-react";
import KompetitorPage from "./kompetitor";
import { DAFTAR_PERUMAHAN_SULSEL } from "@/data/perumahan-sulsel";
import SulselAcquisitionMap from "@/components/sulsel-acquisition-map";
import type { PolygonReadyData, DrillState } from "@/components/sulsel-acquisition-map";
import LandAssessmentModal from "@/components/land-assessment-modal";
import SLIS from "@/pages/slis";
import { KABUPATEN_DATA, getGradeLabel, type KabupatenScore } from "@/data/slis-scoring";
import { cn } from "@/lib/utils";
import { isOwnCompany } from "@/lib/own-company";
import {
  generateProposalAkuisisi,
  generateSiteAnalysis,
  generateLegalChecking,
  generateEstimasiHPP,
  generatePKSMoU,
  preloadPdfAssets,
} from "@/lib/pdf-generator";
import { STAGE_CHECKLISTS, JOBDESK_STAGES, CHECKLIST_INPUT_TYPES, STAGE_ORDER as STAGE_ORDER_CONFIG } from "@/data/akuisisi-config";

// ─── AI Types ─────────────────────────────────────────────────────────────────

type AiVerdict = "Sangat Direkomendasikan" | "Direkomendasikan" | "Perlu Review" | "Tidak Direkomendasikan";

interface AiResult {
  verdict: AiVerdict;
  kategori?: AiVerdict;
  score: number;
  ringkasan: string;
  kelebihan: string[];
  risiko: string[];
  rekomendasi: string;
  potensiUnit?: number;
  hargaMaksAkuisisi?: number;
  roiEstimasi?: number;
  paybackBulan?: number;
  potensiRevenue?: number;
  estimasiHPP?: number;
  estimasiProfit?: number;
  irr?: number;
  npv?: number;
  efektivitasKavling?: number;
  luasFasum?: number;
  luasJalan?: number;
  tingkatRisiko?: "Rendah" | "Sedang" | "Tinggi";
}

interface CompetitorEntry {
  name: string;
  type: string;
  pengembang?: string;
  kecamatan?: string;
  kabupaten?: string;
  kelurahan?: string;
  totalUnit?: number;
  hargaMin?: number;
  hargaMax?: number;
  progress?: number;
  unitTerjual?: number;
  jarak?: number;
  kelebihan?: string;
  isFromDb?: boolean;
}

function normalizeKab(s: string): string {
  return s.toUpperCase()
    .replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "")
    .replace(/\s+DAN\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCompetitorsFromData(
  kabupaten: string | null | undefined,
  kecamatan: string | null | undefined,
  scope: "kecamatan" | "kabupaten"
): CompetitorEntry[] {
  if (!kabupaten) return [];
  const kabNorm = normalizeKab(kabupaten);
  return DAFTAR_PERUMAHAN_SULSEL
    .filter(p => {
      const kabMatch = normalizeKab(p.kabupaten) === kabNorm ||
        normalizeKab(p.kabupaten).includes(kabNorm) ||
        kabNorm.includes(normalizeKab(p.kabupaten));
      if (!kabMatch) return false;
      if (scope === "kecamatan" && kecamatan) {
        return p.kecamatan.toUpperCase() === kecamatan.toUpperCase();
      }
      return true;
    })
    .map(p => ({
      name: p.nama,
      type: p.jenis,
      pengembang: p.pengembang,
      kecamatan: p.kecamatan,
      kabupaten: p.kabupaten,
      kelurahan: p.kelurahan,
      totalUnit: (p.totalUnit || 0) + (p.unitKomersil || 0),
    }));
}

function getDistanceTier(
  prospectKec: string | null | undefined,
  prospectKab: string | null | undefined,
  compKec: string | undefined,
  compKab: string | undefined
): 1 | 2 | 3 {
  const pk = (prospectKec ?? "").toUpperCase().trim();
  const pb = normalizeKab(prospectKab ?? "");
  const ck = (compKec ?? "").toUpperCase().trim();
  const cb = normalizeKab(compKab ?? "");
  if (pk && ck && pk === ck) return 1;
  if (pb && cb && pb === cb) return 2;
  return 3;
}

const DISTANCE_TIER_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "Kec. Sama",  cls: "bg-red-100 text-red-700 border-red-200" },
  2: { label: "Kab. Sama",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  3: { label: "Beda Kab.",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "prospek_baru",        label: "Prospek Baru",        color: "text-slate-500" },
  { key: "survey",              label: "Survey Lokasi",        color: "text-blue-600" },
  { key: "analisis_kompetitor", label: "Analisis Kompetitor",  color: "text-foreground" },
  { key: "negosiasi",           label: "Negosiasi Lahan",      color: "text-amber-600" },
  { key: "legal_checking",      label: "Legal Checking",       color: "text-orange-600" },
  { key: "pks_mou",             label: "PKS / MoU",            color: "text-emerald-600" },
  { key: "ditolak",             label: "Ditolak",              color: "text-red-500" },
];

const STAGE_ORDER = STAGE_ORDER_CONFIG;

const KPI_TARGETS = [
  { label: "ROI Proyek",       target: ">25%" },
  { label: "Margin",           target: ">20%" },
  { label: "Lebar Jalan",      target: "Min. 5 m" },
  { label: "Legalitas",        target: "Clean & Clear" },
  { label: "Sengketa",         target: "Tidak Ada" },
  { label: "Market Potensial", target: "Tinggi" },
];


const OUTPUT_ITEMS = [
  { key: "proposal_akuisisi", label: "Proposal Akuisisi",  icon: FileText },
  { key: "site_analysis",     label: "Site Analysis",       icon: Map },
  { key: "legal_checking_doc",label: "Legal Checking",      icon: CheckCircle2 },
  { key: "estimasi_hpp",      label: "Estimasi HPP Tanah",  icon: ClipboardList },
  { key: "pks_mou_doc",       label: "PKS / MoU",           icon: FileText },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const CHECKLIST_KEY = "satara_acq_checklist";

function loadChecklist(): Record<number, string[]> {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "{}"); } catch { return {}; }
}
function saveChecklist(s: Record<number, string[]>) {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(s));
}

function loadAiResult(id: number): AiResult | null {
  try { return JSON.parse(localStorage.getItem(`satara_ai_${id}`) ?? "null"); } catch { return null; }
}
function saveAiResult(id: number, r: AiResult | null) {
  if (r) localStorage.setItem(`satara_ai_${id}`, JSON.stringify(r));
  else localStorage.removeItem(`satara_ai_${id}`);
}

const CHECKLIST_VALS_KEY = "satara_checklist_vals";
function loadChecklistValues(): Record<number, Record<string, string>> {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_VALS_KEY) ?? "{}"); } catch { return {}; }
}
function saveChecklistValues(s: Record<number, Record<string, string>>) {
  localStorage.setItem(CHECKLIST_VALS_KEY, JSON.stringify(s));
}

function loadFullAiResult(id: number): Record<string, unknown> | null {
  try { return JSON.parse(localStorage.getItem(`satara_full_ai_${id}`) ?? "null"); } catch { return null; }
}
function saveFullAiResult(id: number, r: Record<string, unknown> | null) {
  if (r) localStorage.setItem(`satara_full_ai_${id}`, JSON.stringify(r));
  else localStorage.removeItem(`satara_full_ai_${id}`);
}


interface SurveyData {
  bentukLahan: string;
  statusLegal: string;
  topografi: string;
  kondisiJalan: string;
  utilitas: string[];
  peilBanjir: string;
  namaPemilik: string;
  kontakPemilik: string;
}

const SURVEY_DEFAULTS: SurveyData = { bentukLahan: "", statusLegal: "", topografi: "", kondisiJalan: "", utilitas: [], peilBanjir: "", namaPemilik: "", kontakPemilik: "" };

function loadSurvey(id: number): SurveyData {
  try { return { ...SURVEY_DEFAULTS, ...JSON.parse(localStorage.getItem(`satara_survey_${id}`) ?? "{}") }; } catch { return { ...SURVEY_DEFAULTS }; }
}
function saveSurvey(id: number, s: SurveyData) {
  localStorage.setItem(`satara_survey_${id}`, JSON.stringify(s));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLuas(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(2)} Ha` : `${n.toLocaleString("id-ID")} m²`;
}

// ─── Checklist Progress ───────────────────────────────────────────────────────

function CheckProgress({ checked, total }: { checked: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((checked / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-amber-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-foreground/70 whitespace-nowrap">{checked}/{total}</span>
    </div>
  );
}

// ─── Prospect Detail Panel (full-width, below map) ───────────────────────────

const TUJUAN_ITEMS = ["Market", "Legal", "Akses", "Profit", "Cashflow"];

const STAGE_STYLE: Record<string, { border: string; bg: string; header: string; dot: string; badge: string }> = {
  survey:              { border: "border-blue-200",   bg: "bg-blue-50",   header: "text-blue-700",   dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
  analisis_kompetitor: { border: "border-border", bg: "bg-muted/20", header: "text-foreground", dot: "bg-slate-500", badge: "bg-muted text-foreground" },
  negosiasi:           { border: "border-amber-200",  bg: "bg-amber-50",  header: "text-amber-700",  dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700" },
  legal_checking:      { border: "border-orange-200", bg: "bg-orange-50", header: "text-orange-700", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  pks_mou:             { border: "border-emerald-200",bg: "bg-emerald-50",header: "text-emerald-700",dot: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700" },
};

function ProspectDetailPanel({
  prospect,
  allProspects,
  checklists,
  checklistValues,
  terrainData,
  onClose,
  onToggleItem,
  onSetChecklistValue,
  onAdvanceStage,
  advancing,
  onRefetch,
}: {
  prospect: LandProspect;
  allProspects?: LandProspect[];
  checklists: Record<number, string[]>;
  checklistValues: Record<number, Record<string, string>>;
  terrainData?: { elevMin?: number; elevMax?: number; elevAvg?: number; slopeAvgPct?: number; slopeMaxPct?: number; waterwayType?: string; waterwayName?: string; waterwayDistM?: number | null } | null;
  onClose: () => void;
  onToggleItem: (id: number, item: string) => void;
  onSetChecklistValue: (id: number, key: string, value: string) => void;
  onAdvanceStage: (id: number, nextStage: string) => void;
  advancing: boolean;
  onRefetch: () => void;
}) {
  const [aiResult, setAiResult] = useState<AiResult | null>(() => loadAiResult(prospect.id));
  const [fullAiResult, setFullAiResult] = useState<Record<string, unknown> | null>(() => loadFullAiResult(prospect.id));
  const [aiLoading, setAiLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [, navigate] = useLocation();
  const [aiTab, setAiTab] = useState<"ringkasan" | "lokasi" | "risiko" | "finansial" | "kompetitor" | "rekomendasi" | "simulasi">("ringkasan");

  const SIM_KEY = `satara_sim_${prospect.id}`;
  const [simInputs, setSimInputs] = useState<{ modalAwal: string; hargaJual: string; biayaPerUnit: string; reinvestPct: string; maxUnitLahan: string }>(() => {
    try { const s = localStorage.getItem(SIM_KEY); if (s) return { maxUnitLahan: "", ...JSON.parse(s) }; } catch {}
    return { modalAwal: "", hargaJual: "", biayaPerUnit: "", reinvestPct: "100", maxUnitLahan: "" };
  });

  const [survey, setSurvey] = useState<SurveyData>(() => loadSurvey(prospect.id));
  const [aksesJalanDraft, setAksesJalanDraft] = useState<number | null>(prospect.aksesJalan ?? null);
  const [catatanDraft, setCatatanDraft] = useState(prospect.catatan ?? "");
  const [competitorScope, setCompetitorScope] = useState<"kecamatan" | "kabupaten">(
    prospect.kecamatan ? "kecamatan" : "kabupaten"
  );
  const [dbCompetitors, setDbCompetitors] = useState<CompetitorEntry[]>([]);

  useEffect(() => {
    fetch("/api/marketing/competitors")
      .then(r => r.json())
      .then((data: Array<{ id: number; namaKompetitor: string; lokasi?: string; tipeUnit?: string; totalUnit?: number; hargaMin?: number; hargaMax?: number; unitTerjual?: number; progress?: number; jarak?: number; kelebihan?: string }>) => {
        if (!Array.isArray(data)) return;
        setDbCompetitors(data.map(c => ({
          name: c.namaKompetitor,
          type: c.tipeUnit ?? "—",
          pengembang: c.namaKompetitor,
          kabupaten: c.lokasi,
          totalUnit: c.totalUnit,
          hargaMin: c.hargaMin,
          hargaMax: c.hargaMax,
          progress: c.progress,
          unitTerjual: c.unitTerjual,
          jarak: c.jarak,
          kelebihan: c.kelebihan,
          isFromDb: true,
        })));
      })
      .catch(() => {});
  }, []);

  // Selalu ambil di level kabupaten agar data kompetitor tidak kosong
  const staticCompetitorList = (() => {
    const byKec = getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, "kecamatan");
    const byKab = getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, "kabupaten");
    return byKab.length > 0 ? byKab : byKec;
  })();

  // Merge: DB competitors (real, entered by marketing team) first, then static regional data
  const competitorList = [...dbCompetitors, ...staticCompetitorList];
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surveyDbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbLoadedRef = useRef(false);

  // Load survey + AI dari DB saat pertama buka prospect
  useEffect(() => {
    dbLoadedRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/land-prospects/${prospect.id}/acquisition`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as {
          surveyData?: Record<string, unknown> | null;
          aiResult?: Record<string, unknown> | null;
          fullAiResult?: Record<string, unknown> | null;
        };
        if (data.surveyData) {
          const s = { ...SURVEY_DEFAULTS, ...data.surveyData } as SurveyData;
          setSurvey(s);
          saveSurvey(prospect.id, s);
        }
        if (data.aiResult) {
          const r = data.aiResult as unknown as AiResult;
          setAiResult(r);
          saveAiResult(prospect.id, r);
        }
        if (data.fullAiResult) {
          const f = data.fullAiResult as Record<string, unknown>;
          setFullAiResult(f);
          saveFullAiResult(prospect.id, f);
        }
      } catch { /* silent */ }
      finally { if (!cancelled) dbLoadedRef.current = true; }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.id]);

  function updateSurvey<K extends keyof SurveyData>(key: K, value: SurveyData[K]) {
    setSurvey(prev => {
      const next = { ...prev, [key]: value };
      saveSurvey(prospect.id, next);
      // Debounced save ke DB
      if (surveyDbTimerRef.current) clearTimeout(surveyDbTimerRef.current);
      surveyDbTimerRef.current = setTimeout(async () => {
        if (!dbLoadedRef.current) return;
        try {
          await fetch(`/api/land-prospects/${prospect.id}/acquisition`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ surveyData: next }),
          });
        } catch { /* silent */ }
      }, 1000);
      return next;
    });
  }

  // ── Auto-fill Data Teknis (pks_mou) dari terrain + prospect data ──
  const terrainFillApplied = useRef(false);
  useEffect(() => {
    if (terrainFillApplied.current) return;

    const fills: Record<string, string> = {};

    if (prospect.luas) {
      fills.luas_lahan_teknis = `${prospect.luas.toLocaleString("id-ID")} m²`;
    }
    if (terrainData) {
      const slope = terrainData.slopeAvgPct;
      if (slope != null) {
        const lbl = slope < 2 ? "Datar" : slope < 5 ? "Landai" : slope < 15 ? "Berbukit" : "Curam";
        fills.topografi = lbl;
        fills.kontur = `${lbl} — rata-rata ${slope.toFixed(1)}% kemiringan`;
      }
      if (terrainData.waterwayDistM != null) {
        const dist = terrainData.waterwayDistM;
        const r = dist < 100 ? "Sangat Rawan" : dist < 300 ? "Rawan" : dist < 500 ? "Waspada" : "Aman";
        fills.peil_banjir = `${r} — ${Math.round(dist)}m dari badan air`;
      }
    }
    if (survey.utilitas?.length > 0) {
      fills.utilitas_teknis = survey.utilitas.join(", ");
    }

    if (Object.keys(fills).length === 0) return;
    terrainFillApplied.current = true;

    const currentChecked = checklists[prospect.id] ?? [];
    const currentVals = checklistValues[prospect.id] ?? {};

    Object.entries(fills).forEach(([key, val]) => {
      if (!currentVals[key]) onSetChecklistValue(prospect.id, key, val);
      if (!currentChecked.includes(key)) onToggleItem(prospect.id, key);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainData, survey.utilitas, prospect.luas, prospect.id]);

  // Debounced PATCH aksesJalan + catatan ke DB
  useEffect(() => {
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(async () => {
      const body: Record<string, unknown> = {};
      if (aksesJalanDraft !== (prospect.aksesJalan ?? null)) body.aksesJalan = aksesJalanDraft;
      if (catatanDraft !== (prospect.catatan ?? "")) body.catatan = catatanDraft;
      if (Object.keys(body).length === 0) return;
      try {
        await fetch(`/api/land-prospects/${prospect.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        onRefetch();
      } catch { /* silent */ }
    }, 800);
    return () => { if (patchTimerRef.current) clearTimeout(patchTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aksesJalanDraft, catatanDraft]);


  const stage = STAGES.find((s) => s.key === prospect.status);
  const checked = checklists[prospect.id] ?? [];
  const currentStageIdx = STAGE_ORDER.indexOf(prospect.status);
  const nextStage = currentStageIdx >= 0 && currentStageIdx + 1 < STAGE_ORDER.length
    ? STAGE_ORDER[currentStageIdx + 1] : null;
  const nextStageLabel = STAGES.find((s) => s.key === nextStage)?.label;

  const totalItems = JOBDESK_STAGES.reduce((sum, s) => {
    return STAGE_ORDER.indexOf(s.key) <= currentStageIdx ? sum + s.checklist.length : sum;
  }, 0);
  const totalChecked = JOBDESK_STAGES.reduce((sum, s) => {
    if (STAGE_ORDER.indexOf(s.key) > currentStageIdx) return sum;
    return sum + s.checklist.filter((c) => checked.includes(c.key)).length;
  }, 0);
  const allChecklistsDone = totalItems > 0 && totalChecked === totalItems;

  async function runAiAnalysis() {
    setAiLoading(true);
    try {
      const vals = checklistValues[prospect.id] ?? {};
      const hargaRumahStr = (vals.harga_rumah_sekitar ?? "").replace(/\./g, "").replace(/\D/g, "");

      // Bangun portfolio comparables — semua lahan lain di kabupaten yang sama
      const portfolioComparables = (allProspects ?? [])
        .filter(p => p.id !== prospect.id && p.kabupaten === prospect.kabupaten)
        .map(p => {
          const pAi = loadAiResult(p.id);
          return {
            id: p.id,
            lokasi: p.lokasi,
            kecamatan: p.kecamatan ?? "",
            luas: p.luas ?? 0,
            hargaM2: p.hargaM2 ?? 0,
            stage: p.status ?? "",
            aiScore: pAi?.score ?? null,
            aiROI: pAi?.roiEstimasi ?? null,
            aiRisiko: pAi?.tingkatRisiko ?? null,
          };
        });

      // Derive actual values from checklist state (bukan hardcoded)
      const hargaTanahFromInput = vals.harga_tanah_m2
        ? parseInt((vals.harga_tanah_m2 as string).replace(/\./g, "").replace(/\D/g, ""), 10) : 0;

      // Derivasi tipe rumah dari data survei kompetitor yang sudah diisi
      const tipeRumahSekitar = (vals.tipe_rumah_sekitar as string ?? "").toLowerCase();
      const derivedTipeRumah = tipeRumahSekitar.includes("menengah") || tipeRumahSekitar.includes("mewah") || tipeRumahSekitar.includes("cluster")
        ? "komersial_menengah"
        : tipeRumahSekitar.includes("komersial") || tipeRumahSekitar.includes("kecil") || tipeRumahSekitar.includes("300") || tipeRumahSekitar.includes("500")
        ? "komersial_kecil"
        : "subsidi";

      // Derivasi kondisi lingkungan dari semua checklist survei
      const lingkunganItems = ["lingkungan_aman", "dekat_fasilitas", "akses_jalan_5m", "utilitas_tersedia"];
      const lingkunganDone = lingkunganItems.filter(k => checked.includes(k)).length;
      const derivedKondisiLingkungan = lingkunganDone >= 4 ? "sangat_aman"
        : lingkunganDone >= 3 ? "aman"
        : lingkunganDone >= 2 ? "cukup_aman"
        : "kurang_aman";

      // Derivasi potensi pertumbuhan
      const derivedPertumbuhan = checked.includes("potensi_pertumbuhan")
        ? (checked.includes("dekat_fasilitas") && checked.includes("utilitas_tersedia") ? "sangat_tinggi" : "tinggi")
        : (checked.includes("dekat_fasilitas") ? "sedang" : "rendah");

      // Kompetitor kecamatan (lebih spesifik — untuk AI analisis pasar lokal)
      const competitorListKecamatan = getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, "kecamatan");

      const body = {
        lokasi: prospect.lokasi,
        kelurahan: prospect.kelurahan,
        kecamatan: prospect.kecamatan,
        kabupaten: prospect.kabupaten,
        luas: prospect.luas,
        hargaTanahM2: hargaTanahFromInput || (prospect.hargaM2 ?? 0),
        aksesJalan: aksesJalanDraft ?? prospect.aksesJalan ?? 0,
        targetTipeRumah: derivedTipeRumah,
        hargaRumahSekitar: hargaRumahStr ? parseInt(hargaRumahStr, 10) : 0,
        statusKepemilikan: survey.statusLegal || "Belum diketahui",
        bentukLahan: survey.bentukLahan || "kotak",
        // Derived dari seluruh checklist yang sudah diisi user
        kondisiLingkungan: derivedKondisiLingkungan,
        potensiPertumbuhan: derivedPertumbuhan,
        utilitas: checked.includes("utilitas_tersedia")
          ? (survey.utilitas?.length ? survey.utilitas : ["PLN", "PDAM", "Air Bersih"])
          : (survey.utilitas ?? []),
        fasilitasUmum: [
          checked.includes("dekat_fasilitas") ? "Pasar/Fasilitas Umum" : null,
          checked.includes("akses_jalan_5m") ? "Akses Jalan Baik" : null,
          checked.includes("utilitas_tersedia") ? "Utilitas Lengkap" : null,
          checked.includes("lingkungan_aman") ? "Lingkungan Aman" : null,
        ].filter(Boolean),
        catatan: catatanDraft || "",
        // Semua data checklist — dikirim lengkap ke API
        checkedItems: checked,
        checklistValues: vals,
        competitors: competitorList,
        competitorsKecamatan: competitorListKecamatan,
        // Live competitor data dari tim Marketing (dengan harga, progress, jarak nyata)
        liveCompetitors: dbCompetitors.map(c => ({
          nama: c.name,
          tipe: c.type,
          lokasi: c.kabupaten,
          hargaMin: c.hargaMin,
          hargaMax: c.hargaMax,
          totalUnit: c.totalUnit,
          unitTerjual: c.unitTerjual,
          progress: c.progress,
          jarak: c.jarak,
          kelebihan: c.kelebihan,
        })),
        portfolioComparables,
        ...(terrainData ?? {}),
      };
      const res = await fetch("/api/ai/land-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as Record<string, unknown>;
      saveFullAiResult(prospect.id, data);
      setFullAiResult(data);
      const calc = data.calc as Record<string, unknown> | undefined;
      const ai = data.ai as Record<string, unknown> | undefined;
      const calcFin = calc?.financials as Record<string, unknown> | undefined;
      const calcUnit = calc?.unitPotential as Record<string, unknown> | undefined;
      const calcRisk = calc?.risks as Record<string, unknown> | undefined;
      const analisisRisiko = (ai?.analisisRisiko as { deskripsi: string }[] | undefined) ?? [];
      const aiR: AiResult = {
        verdict: (data.kategori as AiVerdict) ?? "Perlu Review",
        kategori: (data.kategori as AiVerdict) ?? "Perlu Review",
        score: (data.skor as number) ?? 0,
        ringkasan: (ai?.ringkasanEksekutif as string) ?? "",
        kelebihan: (ai?.nextActions as string[]) ?? [],
        risiko: analisisRisiko.map((r) => r.deskripsi),
        rekomendasi: (ai?.rekomendasiNarasi as string) ?? "",
        roiEstimasi: calcFin?.roi as number | undefined,
        potensiUnit: calcUnit?.unitRealistis as number | undefined,
        tingkatRisiko: calcRisk?.overallRisk as "Rendah" | "Sedang" | "Tinggi" | undefined,
      };
      saveAiResult(prospect.id, aiR);
      setAiResult(aiR);
      setAiTab("finansial");
      // Simpan ke DB
      fetch(`/api/land-prospects/${prospect.id}/acquisition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiResult: aiR as unknown as Record<string, unknown>, fullAiResult: data }),
      }).catch(() => { /* silent */ });
    } catch (err) {
      console.error("AI analysis failed:", err);
    } finally {
      setAiLoading(false);
    }
  }

  function buildPayload() {
    const vals = checklistValues[prospect.id] ?? {};
    return {
      prospect: { ...prospect, aksesJalan: aksesJalanDraft ?? prospect.aksesJalan, catatan: catatanDraft },
      checkedItems: checked,
      checklistValues: vals as Record<string, string>,
      aiResult: aiResult ?? null,
      fullAiResult: fullAiResult ?? null,
      terrain: terrainData ?? null,
      competitors: competitorList,
      bentukLahan: survey.bentukLahan,
      statusLegal: survey.statusLegal,
      survey,
      simInputs: (() => {
        try {
          const s = localStorage.getItem(SIM_KEY);
          if (s) {
            const p = JSON.parse(s) as Record<string, string>;
            const modal = parseFloat(p.modalAwal) || 0;
            const jual = parseFloat(p.hargaJual) || 0;
            const biaya = parseFloat(p.biayaPerUnit) || 0;
            if (modal > 0 && jual > 0 && biaya > 0) {
              return { modalAwal: modal, hargaJual: jual, biayaPerUnit: biaya, reinvestPct: parseFloat(p.reinvestPct) || 100 };
            }
          }
        } catch {}
        return null;
      })(),
    };
  }

  const OUTPUT_GENERATORS: Record<string, (p: ReturnType<typeof buildPayload>) => void> = {
    proposal_akuisisi:  generateProposalAkuisisi,
    site_analysis:      generateSiteAnalysis,
    legal_checking_doc: generateLegalChecking,
    estimasi_hpp:       generateEstimasiHPP,
    pks_mou_doc:        generatePKSMoU,
  };


  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-snug">{prospect.lokasi}</div>
          {(prospect.kelurahan || prospect.kecamatan) && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {[prospect.kelurahan, prospect.kecamatan, prospect.kabupaten].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            STAGE_STYLE[prospect.status]?.badge ?? "bg-muted text-muted-foreground border-border"
          )}>
            {stage?.label ?? prospect.status}
          </span>
          {/* Stats */}
          {[
            { l: "Luas", v: formatLuas(prospect.luas) },
            { l: "Harga/m²", v: `Rp${prospect.hargaM2.toLocaleString("id-ID")}` },
            { l: "ROI", v: `${prospect.roi}%`, hi: prospect.roi >= 25 },
          ].map(({ l, v, hi }) => (
            <div key={l} className="bg-background border rounded-md px-2.5 py-1 text-center">
              <div className="text-[9px] text-muted-foreground leading-none mb-0.5">{l}</div>
              <div className={cn("text-[11px] font-semibold", hi && "text-emerald-600")}>{v}</div>
            </div>
          ))}
          {/* Progress */}
          {totalItems > 0 && (
            <div className="bg-background border rounded-md px-2.5 py-1 text-center min-w-[56px]">
              <div className="text-[9px] text-muted-foreground leading-none mb-0.5">Progress</div>
              <div className="text-[11px] font-semibold">{Math.round((totalChecked / totalItems) * 100)}%</div>
            </div>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Body: 2-column layout ── */}
      <div className="grid grid-cols-[200px_1fr] divide-x">

        {/* Col 1: TUJUAN + INDIKATOR + OUTPUT */}
        <div className="p-3 space-y-3">
          {/* TUJUAN */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">TUJUAN</div>
            <div className="space-y-1">
              {TUJUAN_ITEMS.map((t) => (
                <div key={t} className="flex items-center gap-2 text-[11px]">
                  <div className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* INDIKATOR KEBERHASILAN */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">INDIKATOR</div>
            <div className="space-y-1">
              {KPI_TARGETS.map((k) => {
                const pass =
                  (k.label === "ROI Proyek" && prospect.roi >= 25) ||
                  (k.label === "Margin" && prospect.roi >= 20) ||
                  false;
                return (
                  <div key={k.label} className="flex justify-between items-center text-[10px] py-0.5 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground">{k.label}</span>
                    <span className={cn("font-semibold", pass ? "text-emerald-600" : "text-foreground")}>{k.target}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OUTPUT */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">OUTPUT</div>
            <div className="space-y-1">
              {OUTPUT_ITEMS.map(({ key, label, icon: Icon }) => {
                const generator = OUTPUT_GENERATORS[key];
                return (
                  <div key={key} className="flex items-center gap-1.5 text-[11px] px-1 py-0.5 rounded-md group">
                    <Icon className="size-3 shrink-0 text-foreground/50" />
                    <span className="flex-1 leading-tight">{label}</span>
                    <button
                      onClick={async () => { await preloadPdfAssets(); generator?.(buildPayload()); }}
                      title={`Download ${label}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border border-foreground/25 hover:bg-foreground hover:text-background hover:border-foreground transition-colors shrink-0"
                    >
                      <Download className="size-2.5" />
                      PDF
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LANJUTKAN KE PERENCANAAN */}
          <div className="pt-2 border-t border-border/50">
            <button
              onClick={async () => {
                setPromoting(true);
                try {
                  const resp = await fetch(`/api/land-prospects/${prospect.id}/promote`, { method: "POST" });
                  if (!resp.ok) throw new Error("Gagal");
                  const data = await resp.json() as { projectId: number; isNew: boolean };
                  navigate(`/perencanaan/lahan?projectId=${data.projectId}&prospectId=${prospect.id}`);
                } catch { /* silent */ } finally { setPromoting(false); }
              }}
              disabled={promoting}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold px-2 py-2 rounded-md bg-foreground hover:bg-foreground/90 text-background transition-colors disabled:opacity-50"
            >
              {promoting
                ? <Loader2 className="size-3 animate-spin" />
                : <ArrowRight className="size-3" />}
              {promoting ? "Menyiapkan proyek..." : "Lanjut ke Perencanaan"}
            </button>
          </div>
        </div>

        {/* Col 2: JOBDESK 5 stages horizontal */}
        <div className="p-3">
          <div className="text-[10px] font-semibold text-foreground tracking-wider mb-3">JOBDESK</div>
          <div className="grid grid-cols-5 gap-2">
            {JOBDESK_STAGES.map((jStage) => {
              const sIdx = STAGE_ORDER.indexOf(jStage.key);
              const status: "done" | "active" | "pending" =
                sIdx < currentStageIdx ? "done" :
                sIdx === currentStageIdx ? "active" : "pending";
              const stageCheckedCount = jStage.checklist.filter((c) => checked.includes(c.key)).length;
              const allDone = jStage.checklist.every((c) => checked.includes(c.key));

              return (
                <div
                  key={jStage.key}
                  className="border border-border rounded-lg flex flex-col bg-background"
                >
                  {/* Stage header */}
                  <div className="px-2.5 py-2 border-b border-border flex items-center gap-1.5">
                    <div className={cn(
                      "size-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                      status === "done"   ? "bg-emerald-500 border-emerald-500" :
                      status === "active" ? "border-foreground bg-background" :
                                           "border-foreground/30 bg-background"
                    )}>
                      {status === "done" && <CheckCircle2 className="size-2.5 text-white" strokeWidth={3} />}
                      {status === "active" && <div className="size-1.5 rounded-full bg-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "text-[10px] font-bold leading-tight truncate",
                        status === "pending" ? "text-foreground/50" : "text-foreground"
                      )}>
                        {jStage.no}. {jStage.label}
                      </div>
                    </div>
                  </div>

                  {/* Checklist items */}
                  <div className="p-2 space-y-1.5 flex-1">
                    {jStage.checklist.map((item) => {
                      const done = checked.includes(item.key);
                      const inputDef = CHECKLIST_INPUT_TYPES[item.key];
                      const savedVals = checklistValues[prospect.id] ?? {};
                      const currentVal = savedVals[item.key] ?? "";
                      // Badge: apakah nilai ini berasal dari data terrain/AI?
                      const TERRAIN_KEYS = new Set(["topografi", "kontur", "peil_banjir", "luas_lahan_teknis", "utilitas_teknis"]);
                      const isAutoVal = TERRAIN_KEYS.has(item.key) && !!currentVal;
                      return (
                        <div key={item.key} className="space-y-0.5">
                          <div
                            onClick={() => status !== "pending" && onToggleItem(prospect.id, item.key)}
                            className={cn(
                              "flex items-start gap-1.5 text-[10px] rounded px-1 py-0.5 transition-colors",
                              status === "pending" ? "text-foreground/40 cursor-default" : "cursor-pointer hover:bg-muted/40",
                              done ? "text-emerald-600" : "text-foreground/80"
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-[0.5px]" strokeWidth={2.5} />
                            ) : (
                              <div className={cn(
                                "size-3.5 rounded-full border shrink-0 mt-[0.5px]",
                                status === "pending" ? "border-foreground/20" : "border-foreground/40"
                              )} />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={cn("leading-tight break-words", done && !inputDef && "line-through decoration-emerald-500/60")}>{item.label}</div>
                              {done && (isAutoVal || (inputDef && currentVal)) && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {isAutoVal && <span className="text-[8px] font-medium text-blue-500 bg-blue-50 px-1 rounded shrink-0">AI</span>}
                                  {currentVal && (
                                    <span className="text-[8px] text-foreground/50 truncate max-w-[80px]">
                                      {inputDef?.type === "rp" ? "✓" : inputDef?.type === "pct" ? currentVal + "%" : currentVal.slice(0, 14)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {inputDef && status !== "pending" && (
                            <div className="ml-5 mt-1 mb-1" onClick={(e) => e.stopPropagation()}>
                              <div className="text-[9px] text-muted-foreground mb-0.5 font-medium">Isi nilai:</div>
                              <div className="flex items-center gap-1">
                                {inputDef.type === "rp" && <span className="text-[10px] text-muted-foreground shrink-0 font-medium">Rp</span>}
                                <input
                                  type={inputDef.type === "pct" ? "number" : "text"}
                                  inputMode={inputDef.type !== "text" ? "numeric" : "text"}
                                  value={currentVal}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    onSetChecklistValue(prospect.id, item.key, v);
                                    if (v && !done) onToggleItem(prospect.id, item.key);
                                  }}
                                  placeholder={inputDef.placeholder}
                                  className="flex-1 text-xs px-2 py-1 border-2 border-amber-300 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 min-w-0 font-medium placeholder:text-muted-foreground/50 placeholder:font-normal"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {inputDef.type === "pct" && <span className="text-[10px] text-muted-foreground shrink-0 font-medium">%</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer progress */}
                  {jStage.checklist.length > 0 && (
                    <div className="px-2 pb-2 pt-1.5 border-t border-border">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", stageCheckedCount === jStage.checklist.length ? "bg-emerald-500" : "bg-amber-400")}
                            style={{ width: `${Math.round((stageCheckedCount / jStage.checklist.length) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-foreground/60 whitespace-nowrap tabular-nums">
                          {stageCheckedCount}/{jStage.checklist.length}
                        </span>
                      </div>
                      <button
                        className="w-full text-[9px] text-foreground/60 hover:text-foreground py-0.5 border border-border rounded hover:bg-muted/40 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allKeys = jStage.checklist.map((c) => c.key);
                          allKeys.forEach((k) => {
                            if (allDone ? checked.includes(k) : !checked.includes(k))
                              onToggleItem(prospect.id, k);
                          });
                        }}
                      >
                        {allDone ? "Batal semua" : "Tandai semua"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Analisis AI (SLIS) ── */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="size-3.5 text-foreground/70" />
            <span className="text-[11px] font-semibold">Analisis AI (SLIS)</span>
            {aiResult && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">dari Penilaian Lahan</span>}
          </div>
          {(allChecklistsDone || !!aiResult || (prospect.luas != null && prospect.hargaM2 != null)) && (
            <button
              onClick={runAiAnalysis}
              disabled={aiLoading}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-lg border transition-colors",
                aiLoading ? "opacity-60 cursor-not-allowed bg-muted border-border"
                : aiResult ? "bg-background border-border hover:bg-muted"
                : "bg-foreground text-background border-foreground hover:bg-foreground/90"
              )}
            >
              {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <BrainCircuit className="size-3.5" />}
              {aiLoading ? "Menganalisis..." : aiResult ? "Analisis Ulang" : "Mulai Analisis AI"}
            </button>
          )}
        </div>

        {!allChecklistsDone && !aiResult && (
          <div className="bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">
              Lengkapi semua checklist ({totalChecked}/{totalItems}) untuk mengaktifkan Analisis AI
            </div>
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden mx-8">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${totalItems > 0 ? (totalChecked / totalItems) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {aiResult && (() => {
          const fa = fullAiResult;
          const ai = fa?.ai as Record<string, unknown> | undefined;
          const calc = fa?.calc as Record<string, unknown> | undefined;
          const fin = calc?.financials as Record<string, unknown> | undefined;
          const la = calc?.landAllocation as Record<string, unknown> | undefined;
          const up = calc?.unitPotential as Record<string, unknown> | undefined;
          const rk = calc?.risks as Record<string, unknown> | undefined;
          const sc = calc?.scores as Record<string, unknown> | undefined;
          const assumptions = calc?.assumptions as string[] | undefined;
          const analisisRisiko = (ai?.analisisRisiko as { risiko: string; level: string; deskripsi: string; mitigasi: string }[] | undefined) ?? [];
          const nextActions = (ai?.nextActions as string[] | undefined) ?? [];
          const pb = fa?.portfolioBenchmark as {
            totalInKabupaten: number; analyzedCount: number; withPriceCount: number;
            avgHargaM2: number; minHargaM2: number | null; maxHargaM2: number | null;
            priceVsAvg: number | null; avgROI: number | null; avgScore: number | null;
            roiVsAvg: number | null; scoreVsAvg: number | null;
          } | undefined;
          const decisionLabel: Record<string, { label: string; cls: string }> = {
            BELI: { label: "BELI", cls: "bg-emerald-600 text-white" },
            BELI_DENGAN_NEGOSIASI: { label: "BELI + NEGOSIASI", cls: "bg-teal-600 text-white" },
            HOLD: { label: "HOLD / TINJAU", cls: "bg-amber-500 text-white" },
            JANGAN_BELI: { label: "JANGAN BELI", cls: "bg-red-600 text-white" },
          };
          const dec = decisionLabel[String(sc?.decision ?? "")] ?? { label: String(sc?.decision ?? ""), cls: "bg-muted text-foreground" };
          const riskBadge = (level: string) =>
            level === "Rendah" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : level === "Sedang" ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-red-100 text-red-700 border-red-200";
          const fmtRp = (n: unknown) => {
            const v = Number(n);
            if (isNaN(v)) return "—";
            if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)} M`;
            if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
            return `Rp ${v.toLocaleString("id-ID")}`;
          };
          const scoreItems = [
            { label: "Lokasi & Akses", score: sc?.lokasiScore as number, weight: "20%" },
            { label: "Harga Tanah", score: sc?.hargaScore as number, weight: "20%" },
            { label: "Potensi ROI", score: sc?.roiScore as number, weight: "20%" },
            { label: "Potensi Unit", score: sc?.unitScore as number, weight: "15%" },
            { label: "Legalitas", score: sc?.legalScore as number, weight: "10%" },
            { label: "Kompetitor/Pasar", score: sc?.pasarScore as number, weight: "10%" },
            { label: "Risiko Teknis", score: sc?.teknisScore as number, weight: "5%" },
          ];
          const riskRows = [
            { label: "Hukum/Legal", score: rk?.legalRiskScore as number, level: rk?.legalRisk as string },
            { label: "Akses Jalan", score: rk?.aksesRiskScore as number, level: rk?.aksesRisk as string },
            { label: "Kontur Lahan", score: rk?.konturRiskScore as number, level: rk?.konturRisk as string },
            { label: "Banjir", score: rk?.banjirRiskScore as number, level: rk?.banjirRisk as string },
            { label: "Harga Tanah", score: rk?.hargaRiskScore as number, level: rk?.hargaRisk as string },
            { label: "Pasar/Demand", score: rk?.marketRiskScore as number, level: rk?.marketRisk as string },
          ];
          const AI_TABS = [
            { key: "ringkasan" as const, label: "Ringkasan" },
            { key: "lokasi" as const, label: "Lokasi & Fisik" },
            { key: "risiko" as const, label: "Risiko" },
            { key: "finansial" as const, label: "Finansial" },
            { key: "kompetitor" as const, label: "Kompetitor" },
            { key: "rekomendasi" as const, label: "Rekomendasi" },
            { key: "simulasi" as const, label: "Simulasi" },
          ];
          return (
            <div className="space-y-2.5">
              {/* Score header */}
              <div className="flex items-center gap-3 bg-muted/30 border rounded-xl p-3">
                <div className="relative shrink-0">
                  {(() => {
                    const r = 28; const circ = 2 * Math.PI * r;
                    const color = aiResult.score >= 85 ? "#10b981" : aiResult.score >= 70 ? "#3b82f6" : aiResult.score >= 55 ? "#f59e0b" : "#ef4444";
                    return (
                      <svg width="70" height="70" viewBox="0 0 70 70">
                        <circle cx="35" cy="35" r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="6" />
                        <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="6"
                          strokeDasharray={`${(aiResult.score / 100) * circ} ${circ}`}
                          strokeLinecap="round" transform="rotate(-90 35 35)" />
                        <text x="35" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{aiResult.score}</text>
                      </svg>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("inline-flex text-[11px] font-semibold rounded-full px-2.5 py-0.5 border",
                      aiResult.score >= 85 ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : aiResult.score >= 70 ? "bg-blue-50 text-blue-800 border-blue-200"
                      : aiResult.score >= 55 ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-red-50 text-red-800 border-red-200"
                    )}>{aiResult.kategori ?? aiResult.verdict}</span>
                    <span className={cn("inline-flex text-[10px] font-bold rounded px-2 py-0.5", dec.cls)}>{dec.label}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {aiResult.tingkatRisiko && (
                      <span className={cn("text-[10px] font-medium rounded px-1.5 py-0.5",
                        aiResult.tingkatRisiko === "Rendah" ? "bg-emerald-100 text-emerald-700"
                        : aiResult.tingkatRisiko === "Sedang" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}>Risiko: {aiResult.tingkatRisiko}</span>
                    )}
                    {aiResult.roiEstimasi != null && <span className="text-[10px] bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">ROI {aiResult.roiEstimasi.toFixed(1)}%</span>}
                    {aiResult.potensiUnit != null && <span className="text-[10px] bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">{aiResult.potensiUnit} unit est.</span>}
                  </div>
                  {/* Score breakdown mini */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {scoreItems.slice(0, 4).map(({ label, score, weight }) => (
                      <div key={label} className="text-center">
                        <div className={cn("text-[11px] font-bold",
                          score >= 80 ? "text-emerald-600" : score >= 60 ? "text-blue-600" : score >= 40 ? "text-amber-600" : "text-red-600"
                        )}>{score ?? "—"}</div>
                        <div className="text-[8px] text-muted-foreground leading-tight">{label}</div>
                        <div className="text-[8px] text-muted-foreground/60">{weight}</div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>

            {/* ── Ringkasan Finansial langsung terlihat ── */}
            {fin && (
              <div className="bg-muted/40 border rounded-xl px-3 py-2.5 space-y-2">
                <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Proyeksi Finansial</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total HPP", value: fmtRp(fin.totalHPP), highlight: false },
                    { label: "Revenue", value: fmtRp(fin.revenue), highlight: false },
                    { label: "Profit Bersih", value: fmtRp(fin.profit), highlight: true },
                    { label: "HPP / Unit", value: fmtRp(fin.hppPerUnit), highlight: false },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className={cn("rounded-lg px-2.5 py-1.5 border",
                      highlight ? "bg-emerald-50 border-emerald-200" : "bg-background border-border"
                    )}>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                      <div className={cn("text-[12px] font-bold mt-0.5 leading-tight",
                        highlight ? "text-emerald-700" : "text-foreground"
                      )}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "ROI", value: `${fin.roi}%`, good: Number(fin.roi) >= 25 },
                    { label: "Margin", value: `${fin.margin}%`, good: Number(fin.margin) >= 20 },
                    { label: "Payback", value: `${fin.paybackBulan} bln`, good: Number(fin.paybackBulan) <= 30 },
                  ].map(({ label, value, good }) => (
                    <div key={label} className={cn("border rounded-lg px-2 py-1.5 text-center",
                      good ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    )}>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                      <div className={cn("text-[13px] font-bold mt-0.5",
                        good ? "text-emerald-700" : "text-red-600"
                      )}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <span className="text-muted-foreground">Harga maks akuisisi</span>
                  <span className="font-semibold">Rp {Number(fin.maxHargaM2).toLocaleString("id-ID")}/m²</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Target negosiasi</span>
                  <span className="font-semibold text-blue-600">Rp {Number(fin.negotTargetM2).toLocaleString("id-ID")}/m²</span>
                </div>
              </div>
            )}

            {/* ── Benchmark vs Portofolio ── */}
            {pb && pb.totalInKabupaten > 0 && (
              <div className="border rounded-xl px-3 py-2.5 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">
                    Benchmark — {pb.totalInKabupaten} lahan lain di {prospect.kabupaten}
                  </div>
                  {pb.analyzedCount > 0 && (
                    <span className="text-[9px] text-muted-foreground">{pb.analyzedCount} sudah dianalisis AI</span>
                  )}
                </div>

                {/* Price benchmark bar */}
                {pb.withPriceCount > 0 && pb.avgHargaM2 > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Harga lahan ini vs rata-rata portofolio</span>
                      <span className={cn("font-bold",
                        (pb.priceVsAvg ?? 0) <= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {(pb.priceVsAvg ?? 0) >= 0 ? "+" : ""}{pb.priceVsAvg ?? "—"}%
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className="absolute left-1/2 top-0 h-full w-px bg-foreground/20 z-10" />
                      {pb.priceVsAvg != null && (
                        <div className={cn("absolute top-0 h-full rounded-full",
                          pb.priceVsAvg <= 0 ? "bg-emerald-400 right-1/2" : "bg-red-400 left-1/2"
                        )} style={{ width: `${Math.min(Math.abs(pb.priceVsAvg) * 1.5, 50)}%` }} />
                      )}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                      <span>Rp {(pb.minHargaM2 ?? 0).toLocaleString("id-ID")}/m² (terendah)</span>
                      <span>Avg Rp {pb.avgHargaM2.toLocaleString("id-ID")}/m²</span>
                      <span>Rp {(pb.maxHargaM2 ?? 0).toLocaleString("id-ID")}/m² (tertinggi)</span>
                    </div>
                  </div>
                )}

                {/* ROI & Score comparison */}
                {pb.analyzedCount > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border rounded-lg px-2 py-1.5 bg-background">
                      <div className="text-[9px] text-muted-foreground">ROI lahan ini vs avg</div>
                      <div className="flex items-end gap-1 mt-0.5">
                        <span className="text-[13px] font-bold">{pb.roiVsAvg != null ? (pb.roiVsAvg >= 0 ? "+" : "") + pb.roiVsAvg + "%" : "—"}</span>
                        <span className="text-[9px] text-muted-foreground mb-0.5">vs avg {pb.avgROI}%</span>
                      </div>
                      <div className={cn("text-[9px] font-medium mt-0.5",
                        (pb.roiVsAvg ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {(pb.roiVsAvg ?? 0) >= 0 ? "Di atas rata-rata portofolio" : "Di bawah rata-rata portofolio"}
                      </div>
                    </div>
                    <div className="border rounded-lg px-2 py-1.5 bg-background">
                      <div className="text-[9px] text-muted-foreground">Skor vs avg portofolio</div>
                      <div className="flex items-end gap-1 mt-0.5">
                        <span className="text-[13px] font-bold">{pb.scoreVsAvg != null ? (pb.scoreVsAvg >= 0 ? "+" : "") + pb.scoreVsAvg : "—"}</span>
                        <span className="text-[9px] text-muted-foreground mb-0.5">vs avg {pb.avgScore}/100</span>
                      </div>
                      <div className={cn("text-[9px] font-medium mt-0.5",
                        (pb.scoreVsAvg ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {(pb.scoreVsAvg ?? 0) >= 0 ? "Di atas rata-rata portofolio" : "Di bawah rata-rata portofolio"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* AI Tabs */}
              <div className="flex rounded-lg border bg-muted/30 p-0.5 text-[10px] font-medium gap-0.5">
                {AI_TABS.map(({ key, label }) => (
                  <button key={key} onClick={() => setAiTab(key)}
                    className={cn("flex-1 px-1.5 py-1 rounded-md transition-colors whitespace-nowrap",
                      aiTab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Ringkasan */}
              {aiTab === "ringkasan" && (
                <div className="space-y-2">
                  {ai?.ringkasanEksekutif ? (
                    <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-1.5">Ringkasan Eksekutif</div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{String(ai.ringkasanEksekutif)}</p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-foreground/80 leading-relaxed">{aiResult.ringkasan}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Lokasi & Fisik */}
              {aiTab === "lokasi" && (
                <div className="space-y-2">
                  {!!ai?.analisisLokasi && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Analisis Lokasi</div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{String(ai.analisisLokasi)}</p>
                    </div>
                  )}
                  {!!ai?.analisisFisikLahan && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Analisis Fisik Lahan</div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{String(ai.analisisFisikLahan)}</p>
                    </div>
                  )}
                  {la && (
                    <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-2">Alokasi Lahan</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[
                          { l: "Luas Total", v: `${Number(la.luasTotal).toLocaleString("id-ID")} m²` },
                          { l: "Luas Efektif Kavling", v: `${Number(la.luasEfektif).toLocaleString("id-ID")} m² (${la.efficiencyPct}%)` },
                          { l: "Jalan Internal", v: `${Number(la.luasJalan).toLocaleString("id-ID")} m²` },
                          { l: "Fasum & RTH", v: `${Number(la.luasFasum).toLocaleString("id-ID")} m²` },
                          { l: "Area Tidak Efektif", v: `${Number(la.luasTidakEfektif).toLocaleString("id-ID")} m²` },
                          { l: "Tipe Target", v: String(up?.tipeLabel ?? "—") },
                          { l: "Unit Min / Realistis / Max", v: `${up?.unitMin} / ${up?.unitRealistis} / ${up?.unitMax}` },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex justify-between text-[10px] border-b border-border/30 py-0.5 last:border-0 col-span-1">
                            <span className="text-muted-foreground">{l}</span>
                            <span className="font-medium text-right">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Risiko */}
              {aiTab === "risiko" && (
                <div className="space-y-2">
                  {analisisRisiko.length > 0 && analisisRisiko.map((item, i) => (
                    <div key={i} className={cn("border rounded-lg px-3 py-2.5", riskBadge(item.level).replace("text-", "border-").replace("bg-", ""))}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", riskBadge(item.level))}>{item.level}</span>
                        <span className="text-[11px] font-semibold">{item.risiko}</span>
                      </div>
                      <p className="text-[10px] text-foreground/75 leading-relaxed mb-1">{item.deskripsi}</p>
                      {item.mitigasi && (
                        <div className="flex gap-1 text-[10px] text-blue-700">
                          <span className="shrink-0 font-medium">Mitigasi:</span>
                          <span className="leading-relaxed">{item.mitigasi}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Skor risiko grid */}
                  <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                    <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-2">Skor Risiko per Kategori</div>
                    <div className="space-y-1.5">
                      {riskRows.map(({ label, score, level }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-24 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all",
                              score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-400" : score >= 40 ? "bg-amber-400" : "bg-red-400"
                            )} style={{ width: `${score ?? 0}%` }} />
                          </div>
                          <span className="text-[10px] font-bold w-6 text-right">{score ?? "—"}</span>
                          <span className={cn("text-[8px] font-medium px-1 py-0.5 rounded border shrink-0", riskBadge(level))}>{level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Finansial */}
              {aiTab === "finansial" && fin && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total Akuisisi", value: fmtRp(fin.totalAkuisisi), highlight: false },
                      { label: "Biaya Infrastruktur", value: fmtRp(fin.biayaInfrastruktur), highlight: false },
                      { label: "Biaya Legal & Pajak", value: fmtRp(fin.biayaLegal), highlight: false },
                      { label: "Biaya Konstruksi", value: fmtRp(fin.biayaKonstruksi), highlight: false },
                      { label: "Kontingency (5%)", value: fmtRp(fin.kontingensiBiaya), highlight: false },
                      { label: "Total HPP", value: fmtRp(fin.totalHPP), highlight: true },
                      { label: "Revenue", value: fmtRp(fin.revenue), highlight: true },
                      { label: "Profit Bersih", value: fmtRp(fin.profit), highlight: true },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} className={cn("border rounded-lg px-2.5 py-2", highlight ? "bg-muted/50" : "")}>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                        <div className={cn("text-[12px] font-bold mt-0.5", highlight ? "text-foreground" : "text-foreground/80")}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "ROI", value: `${fin.roi}%`, good: Number(fin.roi) >= 25 },
                      { label: "Margin Gross", value: `${fin.margin}%`, good: Number(fin.margin) >= 20 },
                      { label: "Payback Period", value: `${fin.paybackBulan} bln`, good: Number(fin.paybackBulan) <= 30 },
                    ].map(({ label, value, good }) => (
                      <div key={label} className={cn("border rounded-lg px-2.5 py-2 text-center",
                        good ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                      )}>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                        <div className={cn("text-sm font-bold mt-0.5", good ? "text-emerald-700" : "text-red-700")}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                    <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-2">Breakdown per Unit ({String(up?.tipeLabel ?? "")})</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {[
                        { l: "Harga Jual/Unit", v: fmtRp(fin.hargaJualFinal) + (fin.usingDefaultHargaJual ? " (default)" : "") },
                        { l: "HPP/Unit", v: fmtRp(fin.hppPerUnit) },
                        { l: "Biaya Bangun/Unit", v: fmtRp(fin.biayaBangunFinal) + (fin.usingDefaultBiayaBangun ? " (default)" : "") },
                        { l: "Margin/Unit", v: `${fmtRp(fin.marginPerUnit)} (${fin.marginPerUnitPct}%)` },
                        { l: "Harga Maks Akuisisi", v: `Rp ${Number(fin.maxHargaM2).toLocaleString("id-ID")}/m²` },
                        { l: "Target Negosiasi", v: `Rp ${Number(fin.negotTargetM2).toLocaleString("id-ID")}/m²` },
                      ].map(({ l, v }) => (
                        <div key={l} className="flex justify-between text-[10px] border-b border-border/30 py-0.5 last:border-0">
                          <span className="text-muted-foreground">{l}</span>
                          <span className="font-medium text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {assumptions && assumptions.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Asumsi yang Digunakan</div>
                      {assumptions.map((a, i) => (
                        <div key={i} className="text-[10px] text-amber-800 flex gap-1 mb-0.5">
                          <span className="shrink-0">*</span><span className="leading-snug">{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Kompetitor */}
              {aiTab === "kompetitor" && (() => {
                const ak = ai?.analisisKompetitor as Record<string, string> | undefined;
                const kecAll = getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, "kecamatan");
                const kabAll = getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, "kabupaten");
                const kecLen = kecAll.filter(c => !isOwnCompany(c.pengembang)).length;
                const kabLen = kabAll.filter(c => !isOwnCompany(c.pengembang)).length;
                return (
                  <div className="space-y-2">
                    {/* Level summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="border rounded-lg px-2.5 py-2 bg-background">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Data Live Marketing</div>
                        <div className="flex items-end gap-1.5 mt-0.5">
                          <span className="text-[15px] font-bold text-emerald-600">{dbCompetitors.length}</span>
                        </div>
                        <div className="text-[9px] text-emerald-600 font-medium">Monitor Kompetitor</div>
                      </div>
                      <div className="border rounded-lg px-2.5 py-2 bg-background">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Dok. Kecamatan</div>
                        <div className="flex items-end gap-1.5 mt-0.5">
                          <span className="text-[15px] font-bold">{kecLen}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">{prospect.kecamatan ?? "—"}</div>
                      </div>
                      <div className="border rounded-lg px-2.5 py-2 bg-background">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Dok. Kabupaten</div>
                        <div className="flex items-end gap-1.5 mt-0.5">
                          <span className="text-[15px] font-bold">{kabLen}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">{prospect.kabupaten ?? "—"}</div>
                      </div>
                    </div>
                    {/* Live DB competitor quick summary */}
                    {dbCompetitors.length > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">
                          Kompetitor Live dari Tim Marketing
                        </div>
                        <div className="space-y-1">
                          {dbCompetitors.slice(0, 5).map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5 border-b border-emerald-100 last:border-0">
                              <span className="font-medium flex-1 truncate">{c.name}</span>
                              {c.hargaMin != null && <span className="text-foreground/70 shrink-0">Rp{(c.hargaMin/1_000_000).toFixed(0)}jt</span>}
                              {c.progress != null && <span className={cn("shrink-0 px-1 py-0.5 rounded text-[8px] font-bold border",
                                c.progress >= 70 ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                              )}>{c.progress}%</span>}
                            </div>
                          ))}
                          {dbCompetitors.length > 5 && <div className="text-[9px] text-muted-foreground">+{dbCompetitors.length - 5} lainnya</div>}
                        </div>
                      </div>
                    )}

                    {ak?.tingkatPersaingan && (
                      <div className={cn("border rounded-lg px-2.5 py-2 text-center",
                        ak.tingkatPersaingan === "Tinggi" ? "bg-red-50 border-red-200" :
                        ak.tingkatPersaingan === "Sedang" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
                      )}>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Tingkat Persaingan</div>
                        <div className={cn("text-[13px] font-bold mt-0.5",
                          ak.tingkatPersaingan === "Tinggi" ? "text-red-700" :
                          ak.tingkatPersaingan === "Sedang" ? "text-amber-700" : "text-emerald-700"
                        )}>{ak.tingkatPersaingan}</div>
                      </div>
                    )}
                    {ak?.kompetitorKecamatan && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1.5">
                          Kompetitor di Kec. {prospect.kecamatan ?? "—"}
                        </div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{ak.kompetitorKecamatan}</p>
                      </div>
                    )}
                    {ak?.kompetitorKabupaten && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">
                          Lanskap Kompetitor di {prospect.kabupaten ?? "—"}
                        </div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{ak.kompetitorKabupaten}</p>
                      </div>
                    )}
                    {ak?.posisiHarga && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Posisi Harga vs Kompetitor</div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{ak.posisiHarga}</p>
                      </div>
                    )}
                    {ak?.rekomendasiSegmen && (
                      <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-1.5">Rekomendasi Segmen & Diferensiasi</div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{ak.rekomendasiSegmen}</p>
                      </div>
                    )}
                    {!ak && (
                      <div className="bg-muted/30 border rounded-lg px-3 py-2.5 text-center">
                        <p className="text-[11px] text-muted-foreground">Analisis kompetitor belum tersedia. Jalankan ulang Analisis AI untuk mendapatkan rekomendasi kompetitor.</p>
                      </div>
                    )}
                    {/* Daftar kompetitor dari data */}
                    {kabLen > 0 && (
                      <div className="bg-muted/20 border rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-2">
                          Data Kompetitor ({kabLen} di {prospect.kabupaten})
                        </div>
                        <div className="space-y-1">
                          {getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, "kabupaten").slice(0, 10).map((c, i) => {
                            const isKec = c.kecamatan?.toUpperCase() === (prospect.kecamatan ?? "").toUpperCase();
                            return (
                              <div key={i} className="flex items-center gap-2 text-[10px] py-0.5 border-b border-border/30 last:border-0">
                                <span className={cn("shrink-0 px-1 py-0.5 rounded text-[8px] font-bold border",
                                  isKec ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                )}>{isKec ? "Kec." : "Kab."}</span>
                                <span className="font-medium flex-1 truncate">{c.name}</span>
                                <span className="text-muted-foreground shrink-0">{c.type}</span>
                                {c.totalUnit ? <span className="text-muted-foreground shrink-0">{c.totalUnit} unit</span> : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tab: Rekomendasi */}
              {aiTab === "rekomendasi" && (
                <div className="space-y-2">
                  {!!ai?.rekomendasiNarasi && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Rekomendasi</div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{String(ai.rekomendasiNarasi)}</p>
                    </div>
                  )}
                  {nextActions.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Langkah Selanjutnya</div>
                      <div className="space-y-1.5">
                        {nextActions.map((action, i) => (
                          <div key={i} className="flex gap-2 text-[10px] text-emerald-800">
                            <span className="size-4 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0 text-[9px]">{i + 1}</span>
                            <span className="leading-relaxed">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!ai?.rekomendasiNarasi && nextActions.length === 0) && (
                    <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-foreground/80 leading-relaxed">{aiResult.rekomendasi}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Simulasi */}
              {aiTab === "simulasi" && (() => {
                const finSim = fin as Record<string, number> | undefined;
                const modalVal = parseFloat(simInputs.modalAwal) || 0;
                const hargaVal = parseFloat(simInputs.hargaJual) || 0;
                const biayaVal = parseFloat(simInputs.biayaPerUnit) || 0;
                const reinvestVal = parseFloat(simInputs.reinvestPct) || 100;

                const fmtSimRp = (n: number) => {
                  if (!n) return "—";
                  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
                  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
                  return `Rp ${n.toLocaleString("id-ID")}`;
                };

                const maxUnitVal = parseInt(simInputs.maxUnitLahan) || 0;

                const phases: { capital: number; units: number; revenue: number; cost: number; profit: number; reinvest: number; unusedCap: number }[] = [];
                let cap = modalVal;
                let totalBuilt = 0;
                for (let i = 0; i < 20; i++) {
                  if (biayaVal <= 0 || cap < biayaVal) break;
                  const remaining = maxUnitVal > 0 ? maxUnitVal - totalBuilt : Infinity;
                  if (remaining <= 0) break;
                  const unitsFromCap = Math.floor(cap / biayaVal);
                  const units = maxUnitVal > 0 ? Math.min(unitsFromCap, remaining) : unitsFromCap;
                  if (units <= 0) break;
                  const usedCap = units * biayaVal;
                  const unusedCap = cap - usedCap;
                  const revenue = units * hargaVal;
                  const cost = usedCap;
                  const profit = revenue - cost;
                  const reinvest = Math.round(profit * reinvestVal / 100) + unusedCap;
                  totalBuilt += units;
                  phases.push({ capital: cap, units, revenue, cost, profit, reinvest, unusedCap });
                  cap = reinvest;
                }

                const totalUnits = phases.reduce((s, p) => s + p.units, 0);
                const totalRevenue = phases.reduce((s, p) => s + p.revenue, 0);
                const totalProfit = phases.reduce((s, p) => s + p.profit, 0);
                const landFull = maxUnitVal > 0 && totalBuilt >= maxUnitVal;

                const updateSim = (key: keyof typeof simInputs, val: string) => {
                  setSimInputs(prev => {
                    const next = { ...prev, [key]: val };
                    try { localStorage.setItem(SIM_KEY, JSON.stringify(next)); } catch {}
                    return next;
                  });
                };

                return (
                  <div className="space-y-3">
                    {/* Inputs */}
                    <div className="border rounded-lg px-3 py-2.5 bg-muted/20 space-y-2.5">
                      <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Parameter Simulasi</div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <div className="text-[9px] text-muted-foreground mb-1">Modal Awal (Rp)</div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground shrink-0">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={simInputs.modalAwal ? parseInt(simInputs.modalAwal).toLocaleString("id-ID") : ""}
                              onChange={e => updateSim("modalAwal", e.target.value.replace(/\D/g, ""))}
                              placeholder={`${Math.round(prospect.luas * prospect.hargaM2).toLocaleString("id-ID")}`}
                              className="flex-1 text-[11px] px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 min-w-0"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground mb-1">
                            Harga Jual / Unit (Rp)
                            {finSim?.hargaJualFinal && !simInputs.hargaJual && (
                              <button className="ml-1 text-[8px] text-blue-600 underline" onClick={() => updateSim("hargaJual", String(Math.round(finSim.hargaJualFinal)))}>
                                AI: {fmtSimRp(finSim.hargaJualFinal)}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground shrink-0">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={simInputs.hargaJual ? parseInt(simInputs.hargaJual).toLocaleString("id-ID") : ""}
                              onChange={e => updateSim("hargaJual", e.target.value.replace(/\D/g, ""))}
                              placeholder="200.000.000"
                              className="flex-1 text-[11px] px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 min-w-0"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground mb-1">
                            Biaya Konstruksi / Unit (Rp)
                            {finSim?.hppPerUnit && !simInputs.biayaPerUnit && (
                              <button className="ml-1 text-[8px] text-blue-600 underline" onClick={() => updateSim("biayaPerUnit", String(Math.round(finSim.hppPerUnit)))}>
                                AI: {fmtSimRp(finSim.hppPerUnit)}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground shrink-0">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={simInputs.biayaPerUnit ? parseInt(simInputs.biayaPerUnit).toLocaleString("id-ID") : ""}
                              onChange={e => updateSim("biayaPerUnit", e.target.value.replace(/\D/g, ""))}
                              placeholder="130.000.000"
                              className="flex-1 text-[11px] px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 min-w-0"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground mb-1">% Profit Direinvestasi</div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={simInputs.reinvestPct}
                              onChange={e => updateSim("reinvestPct", e.target.value)}
                              className="w-16 text-[11px] px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                            />
                            <span className="text-[10px] text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>
                      {/* Kapasitas lahan */}
                      <div className="border-t border-border/40 pt-2">
                        <div className="text-[9px] text-muted-foreground mb-1.5">
                          Kapasitas Lahan (maks unit yang bisa dibangun)
                          {up?.unitMax && !simInputs.maxUnitLahan && (
                            <button className="ml-1 text-[8px] text-blue-600 underline" onClick={() => updateSim("maxUnitLahan", String(up.unitMax))}>
                              Dari AI: {String(up.unitMax)} unit
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={simInputs.maxUnitLahan}
                            onChange={e => updateSim("maxUnitLahan", e.target.value.replace(/\D/g, ""))}
                            placeholder={up?.unitMax ? String(up.unitMax) : "contoh: 500"}
                            className="w-24 text-[11px] px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                          />
                          <span className="text-[10px] text-muted-foreground">unit</span>
                          {simInputs.maxUnitLahan && (
                            <button className="text-[9px] text-muted-foreground underline" onClick={() => updateSim("maxUnitLahan", "")}>hapus batas</button>
                          )}
                        </div>
                        {!simInputs.maxUnitLahan && (
                          <div className="text-[9px] text-amber-600 mt-1">Tanpa batas kapasitas — unit dihitung dari modal saja</div>
                        )}
                      </div>
                      {finSim?.hargaJualFinal && (!simInputs.modalAwal || !simInputs.hargaJual || !simInputs.biayaPerUnit) && (
                        <button
                          className="text-[10px] text-blue-600 underline"
                          onClick={() => setSimInputs(prev => {
                            const next = {
                              ...prev,
                              modalAwal: prev.modalAwal || String(Math.round(prospect.luas * prospect.hargaM2)),
                              hargaJual: prev.hargaJual || String(Math.round(finSim.hargaJualFinal)),
                              biayaPerUnit: prev.biayaPerUnit || String(Math.round(finSim.hppPerUnit ?? finSim.biayaBangunFinal ?? 0)),
                              maxUnitLahan: prev.maxUnitLahan || (up?.unitMax ? String(up.unitMax) : ""),
                            };
                            try { localStorage.setItem(SIM_KEY, JSON.stringify(next)); } catch {}
                            return next;
                          })}
                        >
                          Auto-isi dari analisis AI
                        </button>
                      )}
                    </div>

                    {/* Results */}
                    {phases.length > 0 ? (
                      <div className="space-y-1.5">
                        {/* Progress bar kapasitas lahan */}
                        {maxUnitVal > 0 && (
                          <div className="border rounded-lg px-3 py-2 bg-background">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[9px] text-muted-foreground">Utilisasi Kapasitas Lahan</div>
                              <div className={cn("text-[9px] font-semibold", landFull ? "text-emerald-600" : "text-blue-600")}>
                                {totalUnits} / {maxUnitVal} unit {landFull ? "— Lahan Penuh" : ""}
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", landFull ? "bg-emerald-500" : "bg-blue-500")}
                                style={{ width: `${Math.min((totalUnits / maxUnitVal) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">
                              {Math.round((totalUnits / maxUnitVal) * 100)}% lahan terisi dalam {phases.length} tahap
                            </div>
                          </div>
                        )}
                        {phases.map((p, i) => (
                          <div key={i} className="border rounded-lg px-3 py-2 bg-background space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-bold">Tahap {i + 1}</div>
                              <div className="text-[10px] font-semibold text-emerald-600">{p.units} unit dibangun</div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { l: "Modal Masuk", v: fmtSimRp(p.capital) },
                                { l: "Revenue", v: fmtSimRp(p.revenue) },
                                { l: "Profit", v: fmtSimRp(p.profit) },
                                { l: "Lanjut ke Tahap", v: fmtSimRp(p.reinvest) },
                              ].map(({ l, v }) => (
                                <div key={l}>
                                  <div className="text-[8px] text-muted-foreground">{l}</div>
                                  <div className="text-[10px] font-medium">{v}</div>
                                </div>
                              ))}
                            </div>
                            {p.unusedCap > 0 && (
                              <div className="text-[8px] text-amber-600">
                                Sisa modal tidak terpakai: {fmtSimRp(p.unusedCap)} (dibawa ke tahap berikutnya)
                              </div>
                            )}
                            {i < phases.length - 1 && p.unusedCap === 0 && (
                              <div className="text-[8px] text-blue-600">
                                Modal tahap {i + 2}: {fmtSimRp(p.reinvest)} → {Math.floor(p.reinvest / biayaVal)} unit potensial
                              </div>
                            )}
                          </div>
                        ))}
                        {landFull && (
                          <div className="border border-emerald-200 rounded-lg px-3 py-2 bg-emerald-50 text-center text-[10px] text-emerald-700 font-semibold">
                            Seluruh kapasitas lahan ({maxUnitVal} unit) terisi dalam {phases.length} tahap
                          </div>
                        )}
                        <div className="border rounded-lg px-3 py-2 bg-muted/30">
                          <div className="text-[10px] font-bold mb-1.5">Total {phases.length} Tahap</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { l: "Total Unit", v: `${totalUnits.toLocaleString("id-ID")} unit` },
                              { l: "Total Revenue", v: fmtSimRp(totalRevenue) },
                              { l: "Total Profit", v: fmtSimRp(totalProfit) },
                            ].map(({ l, v }) => (
                              <div key={l} className="border rounded px-2 py-1.5 bg-background text-center">
                                <div className="text-[8px] text-muted-foreground">{l}</div>
                                <div className="text-[11px] font-bold">{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg px-3 py-5 bg-muted/20 text-center">
                        <div className="text-[11px] text-muted-foreground">Isi modal awal, harga jual, dan biaya per unit untuk menghitung simulasi</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>

      {/* ── DATA LAPANGAN ── */}
      <div className="border-t px-4 py-4">
        <div className="text-[10px] font-semibold text-foreground tracking-wider mb-3">DATA LAPANGAN</div>
        <div className="grid grid-cols-4 gap-x-5 gap-y-4">

          {/* Akses Jalan */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">AKSES JALAN</div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={aksesJalanDraft ?? ""}
                onChange={(e) => setAksesJalanDraft(e.target.value === "" ? null : parseFloat(e.target.value))}
                placeholder="0"
                min={0}
                step={0.5}
                className="w-16 text-[11px] px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
              <span className="text-[11px] text-muted-foreground">m</span>
              {aksesJalanDraft != null && (
                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded",
                  aksesJalanDraft >= 5 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {aksesJalanDraft >= 5 ? "OK" : "< 5m"}
                </span>
              )}
            </div>
            <div className="text-[9px] text-foreground/50 mt-1">min. 5 meter</div>
          </div>

          {/* Bentuk Lahan */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">BENTUK LAHAN</div>
            <div className="flex gap-1 flex-wrap">
              {["Kotak", "Persegi Panjang", "L", "Segitiga"].map(b => (
                <button key={b} onClick={() => updateSurvey("bentukLahan", survey.bentukLahan === b ? "" : b)}
                  className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                    survey.bentukLahan === b ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"
                  )}>{b}</button>
              ))}
            </div>
          </div>

          {/* Status Legal */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">STATUS LEGAL</div>
            <div className="flex gap-1 flex-wrap">
              {["SHM", "AJB", "PPJB", "HGB", "Girik"].map(s => (
                <button key={s} onClick={() => updateSurvey("statusLegal", survey.statusLegal === s ? "" : s)}
                  className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                    survey.statusLegal === s
                      ? s === "SHM" ? "bg-emerald-600 text-white border-emerald-600"
                        : s === "AJB" || s === "PPJB" ? "bg-teal-600 text-white border-teal-600"
                        : s === "HGB" ? "bg-sky-600 text-white border-sky-600"
                        : "bg-orange-500 text-white border-orange-500"
                      : "bg-background border-border hover:bg-muted"
                  )}>{s}</button>
              ))}
            </div>
          </div>

          {/* Topografi — auto dari terrain data */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">TOPOGRAFI</div>
            {terrainData?.slopeAvgPct != null ? (
              <div className="space-y-1">
                <div className={cn("inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded border",
                  terrainData.slopeAvgPct < 2 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : terrainData.slopeAvgPct < 5 ? "bg-teal-50 border-teal-200 text-teal-700"
                    : terrainData.slopeAvgPct < 15 ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-red-50 border-red-200 text-red-700"
                )}>
                  {terrainData.slopeAvgPct < 2 ? "Datar"
                    : terrainData.slopeAvgPct < 5 ? "Landai"
                    : terrainData.slopeAvgPct < 15 ? "Berbukit"
                    : "Curam"}
                </div>
                <div className="text-[9px] text-foreground/50">{terrainData.slopeAvgPct.toFixed(1)}% kemiringan · SRTM</div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex gap-1 flex-wrap">
                  {["Datar", "Berbukit", "Curam"].map(t => (
                    <button key={t} onClick={() => updateSurvey("topografi", survey.topografi === t ? "" : t)}
                      className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                        survey.topografi === t ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"
                      )}>{t}</button>
                  ))}
                </div>
                <div className="text-[9px] text-foreground/40">Buka tab Peta untuk data SRTM otomatis</div>
              </div>
            )}
          </div>

          {/* Kondisi Jalan */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">KONDISI JALAN</div>
            <div className="flex gap-1 flex-wrap">
              {["Aspal", "Beton", "Batu", "Tanah"].map(k => (
                <button key={k} onClick={() => updateSurvey("kondisiJalan", survey.kondisiJalan === k ? "" : k)}
                  className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                    survey.kondisiJalan === k ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"
                  )}>{k}</button>
              ))}
            </div>
          </div>

          {/* Peil Banjir */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">PEIL BANJIR</div>
            <div className="flex gap-1 flex-wrap">
              {["Aman", "Rawan", "Sangat Rawan"].map(p => (
                <button key={p} onClick={() => updateSurvey("peilBanjir", survey.peilBanjir === p ? "" : p)}
                  className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                    survey.peilBanjir === p
                      ? p === "Aman" ? "bg-emerald-600 text-white border-emerald-600"
                        : p === "Rawan" ? "bg-amber-500 text-white border-amber-500"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-background border-border hover:bg-muted"
                  )}>{p}</button>
              ))}
            </div>
          </div>

          {/* Utilitas */}
          <div className="col-span-2">
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">UTILITAS TERSEDIA</div>
            <div className="flex gap-1.5 flex-wrap">
              {["PLN", "PDAM", "Gas PGN", "Internet"].map(u => {
                const on = survey.utilitas.includes(u);
                return (
                  <button key={u} onClick={() => updateSurvey("utilitas", on ? survey.utilitas.filter(x => x !== u) : [...survey.utilitas, u])}
                    className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                      on ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"
                    )}>{u}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Nama + Kontak Pemilik */}
        <div className="grid grid-cols-2 gap-x-5 mt-4">
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">NAMA PEMILIK</div>
            <input type="text"
              value={survey.namaPemilik}
              onChange={(e) => updateSurvey("namaPemilik", e.target.value)}
              placeholder="Nama pemilik lahan"
              className="w-full text-[11px] px-2.5 py-1.5 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">KONTAK PEMILIK</div>
            <input type="text"
              value={survey.kontakPemilik}
              onChange={(e) => updateSurvey("kontakPemilik", e.target.value)}
              placeholder="No. HP / WhatsApp"
              className="w-full text-[11px] px-2.5 py-1.5 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>
        </div>

        {/* Catatan Lapangan */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold text-foreground/70 tracking-wider mb-1.5">CATATAN LAPANGAN</div>
          <textarea
            value={catatanDraft}
            onChange={(e) => setCatatanDraft(e.target.value)}
            placeholder="Temuan survey lapangan, kondisi sekitar, potensi masalah, dll."
            rows={3}
            className="w-full text-[11px] px-2.5 py-1.5 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
          />
        </div>
      </div>

      {/* ── Kompetitor ── */}
      {(prospect.kabupaten || dbCompetitors.length > 0) && (
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-foreground/70" />
              <span className="text-[11px] font-semibold">Kompetitor — {prospect.kabupaten}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border text-muted-foreground flex items-center gap-1">
                <Database className="size-2.5" />
                Dokumen resmi
              </span>
              {dbCompetitors.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                  {dbCompetitors.length} live data
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground mr-0.5">Lingkup:</span>
              {(["kecamatan", "kabupaten"] as const).map(s => (
                <button key={s} onClick={() => setCompetitorScope(s)}
                  className={cn("text-[10px] px-2.5 py-0.5 rounded border transition-colors capitalize",
                    competitorScope === s ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"
                  )}>
                  {s === "kecamatan" ? `Kec. ${prospect.kecamatan ?? "—"}` : "Seluruh Kab/Kota"}
                </button>
              ))}
            </div>
          </div>

          {/* DB Competitors (live data from Marketing team) */}
          {dbCompetitors.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                Data Live dari Tim Marketing ({dbCompetitors.length})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {dbCompetitors.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 border border-emerald-200 rounded-md px-2.5 py-2 bg-emerald-50/50">
                    <div className="size-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-[9px] font-bold text-emerald-700 mt-0.5">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium leading-tight">{c.name}</span>
                        <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">Live</span>
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{c.type}{c.kabupaten ? ` · ${c.kabupaten}` : ""}{c.jarak ? ` · ${c.jarak}km` : ""}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {c.hargaMin != null && (
                          <span className="text-[9px] font-medium text-foreground/70">
                            Rp{(c.hargaMin / 1_000_000).toFixed(0)}jt{c.hargaMax ? `–${(c.hargaMax / 1_000_000).toFixed(0)}jt` : ""}
                          </span>
                        )}
                        {c.totalUnit != null && (
                          <span className="text-[9px] text-muted-foreground">{c.totalUnit} unit</span>
                        )}
                        {c.progress != null && (
                          <span className={cn("text-[8px] font-medium px-1 py-0.5 rounded border",
                            c.progress >= 70 ? "bg-red-50 text-red-700 border-red-200" :
                            c.progress >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-muted text-muted-foreground border-border"
                          )}>{c.progress}% progres</span>
                        )}
                      </div>
                      {c.kelebihan && (
                        <div className="text-[9px] text-muted-foreground mt-0.5 italic truncate" title={c.kelebihan}>{c.kelebihan}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Static regional data */}
          {(() => {
            const sorted = [...staticCompetitorList].sort((a, b) =>
              getDistanceTier(prospect.kecamatan, prospect.kabupaten, a.kecamatan, a.kabupaten) -
              getDistanceTier(prospect.kecamatan, prospect.kabupaten, b.kecamatan, b.kabupaten)
            );
            return sorted.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground/60 uppercase tracking-wider text-[9px]">Data Dokumen Resmi</span>
                  <span><strong>{sorted.length}</strong> perumahan di{" "}{competitorScope === "kecamatan" ? `Kec. ${prospect.kecamatan}` : prospect.kabupaten}</span>
                  {sorted.length > 40 && <span className="text-amber-600 font-medium">(40 pertama)</span>}
                  <span className="text-foreground/40">— terdekat ke terjauh</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {sorted.slice(0, 40).map((c, i) => {
                    const tier = getDistanceTier(prospect.kecamatan, prospect.kabupaten, c.kecamatan, c.kabupaten);
                    const { label: tierLabel, cls: tierCls } = DISTANCE_TIER_LABELS[tier];
                    const ownProject = isOwnCompany(c.pengembang);
                    return (
                      <div key={i} className={cn(
                        "flex items-start gap-2 border rounded-md px-2.5 py-2",
                        ownProject ? "bg-blue-50 border-blue-200" : "bg-muted/30"
                      )}>
                        <div className="size-5 rounded-full bg-muted border flex items-center justify-center shrink-0 text-[9px] font-bold text-foreground/60 mt-0.5">{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium leading-tight">{c.name}</span>
                            {ownProject && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">Sendiri</span>
                            )}
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{c.pengembang}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {!ownProject && (
                              <span className={cn("text-[8px] font-medium px-1.5 py-0.5 rounded-full border", tierCls)}>{tierLabel}</span>
                            )}
                            {(c.totalUnit ?? 0) > 0 && (
                              <span className="text-[9px] font-medium text-foreground/70">{c.totalUnit} unit</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : dbCompetitors.length === 0 ? (
              <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 text-center">
                {competitorScope === "kecamatan" && !prospect.kecamatan
                  ? "Isi kecamatan di data prospek untuk filter per kecamatan"
                  : `Tidak ada perumahan terdaftar di ${competitorScope === "kecamatan" ? `Kec. ${prospect.kecamatan}` : prospect.kabupaten}`}
              </div>
            ) : null;
          })()}
        </div>
      )}

    </div>
  );
}

// ─── Map Nav Search ───────────────────────────────────────────────────────────

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

function MapNavSearch({ onFly }: { onFly: (target: [number, number, number]) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + " Sulawesi Selatan")}&format=json&limit=7&countrycodes=id&addressdetails=1&bounded=1&viewbox=118.0,-1.0,123.5,-7.5`,
          { headers: { "Accept-Language": "id" } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { /* ignore */ }
      setLoading(false);
    }, 400);
  }, []);

  const handleSelect = useCallback((s: NominatimResult) => {
    setQuery(s.display_name.split(",")[0]);
    setOpen(false);
    const zoom = s.type === "village" || s.type === "suburb" || s.type === "hamlet" ? 14
      : s.type === "city" || s.type === "town" ? 12
      : 11;
    onFly([parseFloat(s.lat), parseFloat(s.lon), zoom]);
  }, [onFly]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1.5 h-8 border rounded-lg bg-card px-2.5 focus-within:ring-1 focus-within:ring-primary/50">
        {loading
          ? <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
          : <Search className="size-3.5 text-muted-foreground shrink-0" />
        }
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Cari kota, kecamatan, desa di Sulsel..."
          className="text-xs bg-transparent outline-none w-56 placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-background border rounded-lg shadow-lg z-[2000] py-1 max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => {
            const parts = s.display_name.split(",");
            const title = parts[0].trim();
            const subtitle = parts.slice(1, 4).join(",").trim();
            return (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-0 border-border/50"
              >
                <div className="font-medium text-foreground truncate">{title}</div>
                {subtitle && <div className="text-muted-foreground text-[10px] truncate mt-0.5">{subtitle}</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Wilayah Detail Panel ─────────────────────────────────────────────────────

const ALL_SLIS_FACTORS: { key: keyof KabupatenScore; label: string; bobot: number }[] = [
  { key: "realisasiFLPP",         label: "Realisasi FLPP",            bobot: 15 },
  { key: "pertumbuhanPenduduk",   label: "Pertumbuhan Penduduk",       bobot: 15 },
  { key: "infrastrukturStrategis",label: "Infrastruktur Strategis",    bobot: 10 },
  { key: "rumahTanggaBaru",       label: "Rumah Tangga Baru",          bobot: 10 },
  { key: "pertumbuhanEkonomi",    label: "Pertumbuhan Ekonomi",        bobot: 10 },
  { key: "hargaTanahScore",       label: "Harga Tanah",                bobot: 10 },
  { key: "jumlahKompetitor",      label: "Peluang Pasar (Kompetitor)", bobot: 10 },
  { key: "pdrbPerKapita",         label: "PDRB Per Kapita",            bobot: 10 },
  { key: "tingkatUrbanisasi",     label: "Tingkat Urbanisasi",         bobot: 5  },
  { key: "tingkatPengangguran",   label: "Tingkat Pengangguran",       bobot: 5  },
];

const WILAYAH_STATUS_LABELS: Record<string, string> = {
  prospek_baru: "Prospek Baru",
  survey: "Survey Lokasi",
  analisis_kompetitor: "Analisis Kompetitor",
  negosiasi: "Negosiasi",
  legal_checking: "Legal Checking",
  pks_mou: "PKS / MoU",
  ditolak: "Ditolak",
};

const WILAYAH_STATUS_COLOR: Record<string, string> = {
  prospek_baru: "bg-blue-50 text-blue-700 border-blue-200",
  survey: "bg-amber-50 text-amber-700 border-amber-200",
  analisis_kompetitor: "bg-purple-50 text-purple-700 border-purple-200",
  negosiasi: "bg-orange-50 text-orange-700 border-orange-200",
  legal_checking: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pks_mou: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ditolak: "bg-red-50 text-red-700 border-red-200",
};

function normKabForMatch(s: string): string {
  return s.toUpperCase()
    .replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "")
    .replace(/\s+DAN\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ScoreBar({ score, height = "h-1.5" }: { score: number; height?: string }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-400" : score >= 50 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className={cn("flex-1 bg-muted rounded-full overflow-hidden", height)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
    </div>
  );
}

function fmtRpShort(n: number): string {
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function WilayahDetailPanel({ drillState, allProspects }: {
  drillState: DrillState;
  allProspects: LandProspect[];
}) {
  const kabNormGeo = normKabForMatch(drillState.kab ?? "");
  const kecNorm = (drillState.kec ?? "").toUpperCase().trim();

  const slisKab = KABUPATEN_DATA.find(k => normKabForMatch(k.name) === kabNormGeo);

  const competitors = DAFTAR_PERUMAHAN_SULSEL.filter(p => {
    const kabMatch = normKabForMatch(p.kabupaten) === kabNormGeo;
    if (!kabMatch) return false;
    if (drillState.kec) return p.kecamatan.toUpperCase().trim() === kecNorm;
    return true;
  }).sort((a, b) => ((b.totalUnit || 0) + (b.unitKomersil || 0)) - ((a.totalUnit || 0) + (a.unitKomersil || 0)));

  const activeProspects = allProspects.filter(p =>
    p.kabupaten && normKabForMatch(p.kabupaten) === kabNormGeo
  );

  const scoreColor = slisKab
    ? slisKab.score >= 80 ? "text-emerald-500" : slisKab.score >= 65 ? "text-amber-500" : slisKab.score >= 50 ? "text-orange-500" : "text-red-500"
    : "text-muted-foreground";

  const verdict = slisKab
    ? slisKab.grade === "sangat_potensial" ? "REKOMENDASIKAN — Masuk Sekarang"
    : slisKab.grade === "potensial" ? "POTENSIAL — Entry dengan Seleksi Ketat"
    : slisKab.grade === "sedang" ? "TAHAN — Butuh Analisis Lebih Dalam"
    : "TIDAK DIREKOMENDASIKAN — Risiko Tinggi"
    : null;

  const verdictColor = slisKab
    ? slisKab.grade === "sangat_potensial" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : slisKab.grade === "potensial" ? "text-amber-700 bg-amber-50 border-amber-200"
    : slisKab.grade === "sedang" ? "text-orange-700 bg-orange-50 border-orange-200"
    : "text-red-700 bg-red-50 border-red-200"
    : "";

  const displayName = drillState.kec ? `${drillState.kec}` : drillState.kab ?? "";
  const parentName = drillState.kec ? drillState.kab : null;

  const faktors = slisKab ? ALL_SLIS_FACTORS.map(f => ({
    ...f,
    score: slisKab[f.key] as number,
  })) : [];
  const kekuatan = faktors.filter(f => f.score >= 80).sort((a, b) => b.score - a.score).slice(0, 3);
  const kelemahan = faktors.filter(f => f.score < 65).sort((a, b) => a.score - b.score).slice(0, 3);

  const jenisMap: Record<string, number> = {};
  for (const p of competitors) {
    jenisMap[p.jenis] = (jenisMap[p.jenis] ?? 0) + 1;
  }
  const jenisSorted = Object.entries(jenisMap).sort((a, b) => b[1] - a[1]);

  // ── Derived stats for competitors ────────────────────────────────────────
  const totalUnitKompetitor = competitors.reduce((s, p) => s + (p.totalUnit || 0) + (p.unitKomersil || 0), 0);
  const avgUnitPerDev = competitors.length > 0 ? Math.round(totalUnitKompetitor / competitors.length) : 0;

  const asosiasiMap: Record<string, number> = {};
  for (const p of competitors) {
    if (p.asosiasi) asosiasiMap[p.asosiasi] = (asosiasiMap[p.asosiasi] ?? 0) + 1;
  }
  const asosiasiSorted = Object.entries(asosiasiMap).sort((a, b) => b[1] - a[1]);

  // kecamatan distribution
  const kecDistMap: Record<string, { dev: number; unit: number }> = {};
  for (const p of competitors) {
    const kec = p.kecamatan || "—";
    if (!kecDistMap[kec]) kecDistMap[kec] = { dev: 0, unit: 0 };
    kecDistMap[kec].dev += 1;
    kecDistMap[kec].unit += (p.totalUnit || 0) + (p.unitKomersil || 0);
  }
  const kecDistSorted = Object.entries(kecDistMap).sort((a, b) => b[1].unit - a[1].unit);

  // top kecamatan from SLIS data
  const topKecamatan = slisKab?.kecamatan
    ? [...slisKab.kecamatan].sort((a, b) => b.score - a.score).slice(0, 5)
    : [];

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/20">
        <Building2 className="size-4 text-muted-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-[13px] font-bold">{displayName}</span>
          {parentName && <span className="text-[11px] text-muted-foreground">· {parentName}</span>}
          {slisKab && verdict && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded border font-semibold shrink-0", verdictColor)}>
              Skor SLIS {slisKab.score} · {getGradeLabel(slisKab.grade)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
          <span><span className="font-semibold text-foreground">{competitors.length}</span> developer</span>
          <span><span className="font-semibold text-foreground">{totalUnitKompetitor.toLocaleString("id-ID")}</span> unit</span>
          <span><span className="font-semibold text-foreground">{activeProspects.length}</span> prospek Satara</span>
        </div>
      </div>

      {/* ── Body: 2 kolom utama ── */}
      <div className="flex divide-x min-h-0">

        {/* ─── Kolom Kiri: Analisis SLIS (38%) ─── */}
        <div className="w-[38%] shrink-0 p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 540 }}>
          <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Analisis SLIS</div>

          {slisKab ? (
            <>
              {/* Score hero */}
              <div className="flex items-center gap-4">
                <div className={cn("text-5xl font-black tabular-nums leading-none", scoreColor)}>{slisKab.score}</div>
                <div className="flex-1 space-y-1.5">
                  <div className="text-[12px] font-semibold">{getGradeLabel(slisKab.grade)}</div>
                  <ScoreBar score={slisKab.score} height="h-2" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span>{slisKab.populasi} jiwa</span>
                    <span>+{slisKab.pertumbuhanPct}%/thn</span>
                    <span>{slisKab.hargaTanahRange}</span>
                    <span>{slisKab.kompetitorCount} developer</span>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              {verdict && (
                <div className={cn("rounded-lg border px-3 py-2 text-[11px] font-semibold", verdictColor)}>
                  {verdict}
                </div>
              )}

              {/* Potensi pasar narrative */}
              {slisKab.potensiPasar && (
                <div className="bg-muted/30 border rounded-lg px-3 py-2.5">
                  <div className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-1">Potensi Pasar</div>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{slisKab.potensiPasar}</p>
                </div>
              )}

              {/* Key metrics grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { l: "FLPP Score",     v: slisKab.realisasiFLPP,        unit: "" },
                  { l: "Pertumb. Ekonomi", v: slisKab.pertumbuhanEkonomi,  unit: "" },
                  { l: "PDRB/Kapita",    v: slisKab.pdrbPerKapita,        unit: "" },
                  { l: "Urbanisasi",     v: slisKab.tingkatUrbanisasi,    unit: "" },
                  { l: "RTB / thn",      v: slisKab.rumahTanggaBaru,      unit: "" },
                  { l: "Pengangguran",   v: slisKab.tingkatPengangguran,  unit: "" },
                ].map(({ l, v }) => {
                  const score = v as number;
                  const color = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                    : score >= 65 ? "text-amber-600 bg-amber-50 border-amber-200"
                    : score >= 50 ? "text-orange-600 bg-orange-50 border-orange-200"
                    : "text-red-600 bg-red-50 border-red-200";
                  return (
                    <div key={l} className={cn("border rounded-lg px-2 py-1.5 flex items-center justify-between gap-1.5", color)}>
                      <span className="text-[9px] font-medium leading-tight">{l}</span>
                      <span className="text-[11px] font-bold tabular-nums">{score}</span>
                    </div>
                  );
                })}
              </div>

              {/* All scoring factors */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Scoring Faktor (10 Variabel)</div>
                {faktors.map(({ key, label, bobot, score }) => {
                  const dotColor = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-400" : "bg-red-400";
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
                      <div className="text-[10px] text-muted-foreground flex-1 truncate">
                        {label}
                        <span className="text-muted-foreground/50 ml-1">({bobot}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 w-24 shrink-0">
                        <ScoreBar score={score} height="h-1" />
                        <span className="text-[10px] font-bold tabular-nums w-6 text-right">{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kekuatan & Kelemahan */}
              {(kekuatan.length > 0 || kelemahan.length > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {kekuatan.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                      <div className="text-[9px] font-bold text-emerald-700 tracking-wider mb-1.5">KEKUATAN</div>
                      {kekuatan.map(f => (
                        <div key={f.key} className="text-[10px] text-emerald-800 flex items-start gap-1 mb-0.5">
                          <span className="shrink-0 mt-px font-bold">+</span>
                          <span>{f.label} ({f.score})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {kelemahan.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                      <div className="text-[9px] font-bold text-red-700 tracking-wider mb-1.5">KELEMAHAN</div>
                      {kelemahan.map(f => (
                        <div key={f.key} className="text-[10px] text-red-800 flex items-start gap-1 mb-0.5">
                          <span className="shrink-0 mt-px font-bold">-</span>
                          <span>{f.label} ({f.score})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Infrastructure */}
              {slisKab.infrastruktur && slisKab.infrastruktur.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5">Infrastruktur Strategis</div>
                  <div className="flex flex-wrap gap-1">
                    {slisKab.infrastruktur.map((inf: string) => (
                      <span key={inf} className="text-[9px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded">{inf}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Kecamatan */}
              {topKecamatan.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5">Kecamatan Teratas (SLIS)</div>
                  <div className="space-y-1">
                    {topKecamatan.map((kec, i) => (
                      <div key={kec.id} className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground tabular-nums w-3 shrink-0">{i + 1}.</span>
                        <span className="text-[10px] flex-1 truncate font-medium">{kec.name}</span>
                        <div className="flex items-center gap-1.5 w-20 shrink-0">
                          <ScoreBar score={kec.score} height="h-1" />
                          <span className="text-[10px] font-bold tabular-nums w-6 text-right">{kec.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground py-6 text-center">Data SLIS belum tersedia untuk wilayah ini.</div>
          )}
        </div>

        {/* ─── Kolom Kanan: Kompetitor + Prospek (62%) ─── */}
        <div className="flex-1 flex flex-col divide-y min-w-0">

          {/* Bagian atas: Daftar Kompetitor */}
          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 380 }}>
            {/* Header + summary stats */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Daftar Developer / Kompetitor</div>
              <div className="flex items-center gap-1.5">
                {jenisSorted.slice(0, 3).map(([jenis, count]) => (
                  <span key={jenis} className="text-[9px] px-1.5 py-px bg-muted border rounded text-muted-foreground">
                    {jenis} ({count})
                  </span>
                ))}
              </div>
            </div>

            {/* Stats bar */}
            {competitors.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <div className="border rounded-lg px-2.5 py-2 bg-muted/20">
                  <div className="text-[9px] text-muted-foreground">Developer</div>
                  <div className="text-[15px] font-black tabular-nums">{competitors.length}</div>
                </div>
                <div className="border rounded-lg px-2.5 py-2 bg-muted/20">
                  <div className="text-[9px] text-muted-foreground">Total Unit</div>
                  <div className="text-[15px] font-black tabular-nums">{totalUnitKompetitor.toLocaleString("id-ID")}</div>
                </div>
                <div className="border rounded-lg px-2.5 py-2 bg-muted/20">
                  <div className="text-[9px] text-muted-foreground">Rata-rata/Dev</div>
                  <div className="text-[15px] font-black tabular-nums">{avgUnitPerDev}</div>
                </div>
              </div>
            )}

            {/* Asosiasi breakdown */}
            {asosiasiSorted.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {asosiasiSorted.map(([asosiasi, count]) => (
                  <span key={asosiasi} className="text-[9px] px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-medium">
                    {asosiasi} · {count}
                  </span>
                ))}
                <span className="text-[9px] px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-full">
                  Non-asosiasi · {competitors.filter(p => !p.asosiasi).length}
                </span>
              </div>
            )}

            {/* Kecamatan distribution bar */}
            {kecDistSorted.length > 0 && (
              <div>
                <div className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5">Sebaran per Kecamatan</div>
                <div className="space-y-1">
                  {kecDistSorted.slice(0, 5).map(([kec, data]) => {
                    const pct = totalUnitKompetitor > 0 ? Math.round((data.unit / totalUnitKompetitor) * 100) : 0;
                    return (
                      <div key={kec} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 shrink-0 truncate">{kec}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground tabular-nums w-8 text-right">{data.dev}dev</span>
                        <span className="text-[9px] font-semibold tabular-nums w-14 text-right">{data.unit.toLocaleString("id-ID")} u</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Competitor list */}
            {competitors.length === 0 ? (
              <div className="text-[11px] text-muted-foreground py-6 text-center">Belum ada data perumahan terdaftar di wilayah ini.</div>
            ) : (
              <div className="space-y-0.5">
                {competitors.map((p, i) => {
                  const totalU = (p.totalUnit || 0) + (p.unitKomersil || 0);
                  const pctOfTotal = totalUnitKompetitor > 0 ? Math.round((totalU / totalUnitKompetitor) * 100) : 0;
                  return (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
                      <span className="text-[10px] text-muted-foreground tabular-nums w-5 shrink-0 pt-px text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold leading-tight truncate">{p.nama}</div>
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">{p.pengembang}</div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            {totalU > 0 ? (
                              <>
                                <div className="text-[12px] font-bold tabular-nums">{totalU.toLocaleString("id-ID")}</div>
                                <div className="text-[9px] text-muted-foreground">unit · {pctOfTotal}%</div>
                              </>
                            ) : <div className="text-[9px] text-muted-foreground/50">—</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] px-1.5 py-px bg-muted border rounded text-muted-foreground">{p.kecamatan}</span>
                          <span className="text-[9px] px-1.5 py-px bg-muted border rounded text-muted-foreground">{p.jenis}</span>
                          {p.asosiasi && (
                            <span className="text-[9px] px-1.5 py-px bg-blue-50 border border-blue-100 rounded text-blue-700 font-medium">{p.asosiasi}</span>
                          )}
                          {totalU > 0 && (
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden min-w-[40px] max-w-[60px]">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pctOfTotal}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bagian bawah: Prospek Aktif + Referensi Pasar */}
          <div className="grid grid-cols-2 divide-x" style={{ minHeight: 160 }}>
            {/* Prospek Aktif */}
            <div className="p-4 space-y-2.5 overflow-y-auto" style={{ maxHeight: 220 }}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Prospek Aktif Satara</div>
                {activeProspects.length > 0 && (
                  <span className="text-[9px] font-bold text-foreground bg-muted border rounded px-1.5 py-px">{activeProspects.length}</span>
                )}
              </div>
              {activeProspects.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">Belum ada prospek lahan di wilayah ini.</div>
              ) : (
                <div className="space-y-2">
                  {activeProspects.map(p => (
                    <div key={p.id} className="border rounded-lg p-2.5 bg-muted/10 space-y-1.5 hover:border-foreground/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-semibold leading-tight flex-1">{p.lokasi}</div>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0",
                          WILAYAH_STATUS_COLOR[p.status] ?? "bg-muted text-muted-foreground border-border"
                        )}>
                          {WILAYAH_STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
                        {p.luas ? <span>{(p.luas / 10000).toFixed(2)} ha</span> : <span>—</span>}
                        {p.hargaM2 ? <span>Rp {p.hargaM2.toLocaleString("id-ID")}/m²</span> : <span>—</span>}
                        {p.kecamatan ? <span className="truncate">{p.kecamatan}</span> : null}
                        {p.luas && p.hargaM2 ? (
                          <span className="font-semibold text-foreground">
                            {fmtRpShort(p.luas * p.hargaM2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referensi Pasar */}
            <div className="p-4 space-y-2.5 overflow-y-auto" style={{ maxHeight: 220 }}>
              <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Referensi Pasar</div>
              {slisKab ? (
                <div className="space-y-0">
                  {[
                    { l: "Harga Tanah",      v: slisKab.hargaTanahRange,                    hi: false },
                    { l: "Pertumb. Populasi", v: `+${slisKab.pertumbuhanPct}%/tahun`,        hi: false },
                    { l: "Total Developer",  v: `${competitors.length} terdaftar`,            hi: false },
                    { l: "Total Unit Pasar", v: `${totalUnitKompetitor.toLocaleString("id-ID")} unit`, hi: true },
                    { l: "Avg Unit/Dev",     v: `${avgUnitPerDev} unit`,                     hi: false },
                    { l: "Developer Aktif",  v: `${slisKab.kompetitorCount} developer`,      hi: false },
                    { l: "Populasi",         v: `${slisKab.populasi} jiwa`,                  hi: false },
                    { l: "FLPP Score",       v: `${slisKab.realisasiFLPP}/100`,              hi: false },
                    { l: "PDRB/Kapita",      v: `${slisKab.pdrbPerKapita}/100`,              hi: false },
                    { l: "Urbanisasi",       v: `${slisKab.tingkatUrbanisasi}/100`,          hi: false },
                    { l: "Pengangguran",     v: `${slisKab.tingkatPengangguran}/100`,        hi: false },
                  ].map(({ l, v, hi }) => (
                    <div key={l} className={cn("flex items-center justify-between text-[11px] py-1 border-b border-border/25 last:border-0",
                      hi ? "font-semibold" : ""
                    )}>
                      <span className="text-muted-foreground">{l}</span>
                      <span className={hi ? "text-foreground" : "font-medium"}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">Tidak ada data referensi.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TerrainData = { elevMin?: number; elevMax?: number; elevAvg?: number; slopeAvgPct?: number; slopeMaxPct?: number; waterwayType?: string; waterwayName?: string; waterwayDistM?: number | null } | null;

export default function Akuisisi() {
  const { data: prospects, refetch } = useListLandProspects({});
  const [tab, setTab] = useState<"peta" | "slis" | "kompetitor">("peta");
  const [drillState, setDrillState] = useState<DrillState>({ level: 0, kab: null, kec: null });
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checklists, setChecklists] = useState<Record<number, string[]>>(loadChecklist);
  const [checklistValues, setChecklistValues] = useState<Record<number, Record<string, string>>>(loadChecklistValues);
  const [advancing, setAdvancing] = useState(false);
  const [terrainData, setTerrainData] = useState<TerrainData>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);
  const [assessmentPolygon, setAssessmentPolygon] = useState<PolygonReadyData | null>(null);
  const [mapClearKey, setMapClearKey] = useState(0);

  const selectedProspect = selectedId ? (prospects ?? []).find((p) => p.id === selectedId) : null;

  // ─── DB sync helpers for checklist ───────────────────────────────────────────
  const checklistDbTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function scheduleChecklistDbSave(
    prospectId: number,
    nextItems: Record<number, string[]>,
    nextVals: Record<number, Record<string, string>>,
  ) {
    if (checklistDbTimers.current[prospectId]) clearTimeout(checklistDbTimers.current[prospectId]);
    checklistDbTimers.current[prospectId] = setTimeout(async () => {
      try {
        await fetch(`/api/land-prospects/${prospectId}/acquisition`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistItems: nextItems[prospectId] ?? [],
            checklistValues: nextVals[prospectId] ?? {},
          }),
        });
      } catch { /* silent */ }
    }, 1200);
  }

  // Load acquisition data dari DB saat prospect dipilih
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/land-prospects/${selectedId}/acquisition`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as {
          checklistItems?: string[] | null;
          checklistValues?: Record<string, string> | null;
        };
        if (data.checklistItems != null) {
          setChecklists(prev => {
            const existing = prev[selectedId] ?? [];
            // Preferensikan data lokal jika lebih banyak (cegah race condition debounce DB save)
            if (existing.length > data.checklistItems!.length) return prev;
            const updated = { ...prev, [selectedId]: data.checklistItems! };
            saveChecklist(updated);
            return updated;
          });
        }
        if (data.checklistValues != null) {
          setChecklistValues(prev => {
            const existing = prev[selectedId] ?? {};
            // Preferensikan data lokal jika lebih banyak key
            if (Object.keys(existing).length > Object.keys(data.checklistValues!).length) return prev;
            const updated = { ...prev, [selectedId]: data.checklistValues! };
            saveChecklistValues(updated);
            return updated;
          });
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  function toggleChecklistItem(prospectId: number, itemKey: string) {
    setChecklists((prev) => {
      const current = prev[prospectId] ?? [];
      const next = current.includes(itemKey)
        ? current.filter((k) => k !== itemKey)
        : [...current, itemKey];
      const updated = { ...prev, [prospectId]: next };
      saveChecklist(updated);
      scheduleChecklistDbSave(prospectId, updated, checklistValues);
      return updated;
    });
  }

  function setChecklistValue(prospectId: number, key: string, value: string) {
    setChecklistValues((prev) => {
      const next = { ...prev, [prospectId]: { ...(prev[prospectId] ?? {}), [key]: value } };
      saveChecklistValues(next);
      scheduleChecklistDbSave(prospectId, checklists, next);
      return next;
    });
  }

  async function advanceStage(prospectId: number, nextStage: string) {
    setAdvancing(true);
    try {
      await fetch(`/api/land-prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStage }),
      });
      await refetch();
    } finally {
      setAdvancing(false);
    }
  }

  const TABS = [
    { key: "peta" as const,       label: "Peta Sulsel", icon: Map },
    { key: "kompetitor" as const, label: "Kompetitor",  icon: BarChart3 },
    { key: "slis" as const,       label: "SLIS",        icon: BrainCircuit },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {tab === "peta" ? <MapNavSearch onFly={setMapFlyTarget} /> : <div />}
        <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-medium">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors",
                tab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {tab === "peta" && (
        <div className="flex flex-col gap-3">
          <div className="min-h-0" style={{ height: "620px" }}>
            <SulselAcquisitionMap
              onSelectProspect={(id) => { setSelectedId(id); if (!id) setTerrainData(null); }}
              onTerrainData={(d) => { setTerrainData(d as TerrainData); setTerrainLoading(false); }}
              onPolygonReady={(poly) => {
                setAssessmentPolygon(poly);
                setTerrainData(null);
                setTerrainLoading(true);
              }}
              onDrillChange={setDrillState}
              clearKey={mapClearKey}
              externalFlyTarget={mapFlyTarget}
            />
          </div>
          {drillState.kab && (
            <WilayahDetailPanel drillState={drillState} allProspects={prospects ?? []} />
          )}
        </div>
      )}

      {tab === "kompetitor" && <KompetitorPage />}
      {tab === "slis" && <SLIS />}

      {selectedProspect && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[5000]" onClick={() => { setSelectedId(null); setTerrainData(null); }} />
          <div className="fixed inset-y-0 right-0 z-[5001] w-[960px] max-w-full overflow-y-auto shadow-2xl border-l bg-background">
            <ProspectDetailPanel
              prospect={selectedProspect}
              allProspects={prospects ?? []}
              checklists={checklists}
              checklistValues={checklistValues}
              terrainData={terrainData}
              onClose={() => { setSelectedId(null); setTerrainData(null); }}
              onToggleItem={toggleChecklistItem}
              onSetChecklistValue={setChecklistValue}
              onAdvanceStage={advanceStage}
              advancing={advancing}
              onRefetch={() => refetch()}
            />
          </div>
        </>
      )}

      {assessmentPolygon && (
        <LandAssessmentModal
          polygon={assessmentPolygon}
          terrainData={terrainData}
          terrainLoading={terrainLoading}
          onClose={() => {
            setAssessmentPolygon(null);
            setTerrainData(null);
            setTerrainLoading(false);
          }}
          onSaved={() => {
            setAssessmentPolygon(null);
            setTerrainData(null);
            setTerrainLoading(false);
            setMapClearKey(k => k + 1);
            refetch();
          }}
        />
      )}

    </div>
  );
}
