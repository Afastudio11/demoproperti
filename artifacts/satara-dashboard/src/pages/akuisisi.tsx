import { useState, useEffect, useRef } from "react";
import { useListLandProspects } from "@workspace/api-client-react";
import type { LandProspect } from "@workspace/api-client-react";
import {
  Plus, CheckCircle2, Map, LayoutList, X,
  FileText, ClipboardList, ArrowRight, BrainCircuit,
  Loader2,
  Building2, Radio, Download, Database, BarChart3,
} from "lucide-react";
import KompetitorPage from "./kompetitor";
import { DAFTAR_PERUMAHAN_SULSEL } from "@/data/perumahan-sulsel";
import { Button } from "@/components/ui/button";
import SulselAcquisitionMap from "@/components/sulsel-acquisition-map";
import type { PolygonReadyData } from "@/components/sulsel-acquisition-map";
import LandAssessmentModal from "@/components/land-assessment-modal";
import SLIS from "@/pages/slis";
import { cn } from "@/lib/utils";
import {
  generateProposalAkuisisi,
  generateSiteAnalysis,
  generateLegalChecking,
  generateEstimasiHPP,
  generatePKSMoU,
} from "@/lib/pdf-generator";

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
}

function normalizeKab(s: string): string {
  return s.toUpperCase().replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "").trim();
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

const STAGE_ORDER = ["prospek_baru", "survey", "analisis_kompetitor", "negosiasi", "legal_checking", "pks_mou"];

const KPI_TARGETS = [
  { label: "ROI Proyek",       target: ">25%" },
  { label: "Margin",           target: ">20%" },
  { label: "Lebar Jalan",      target: "Min. 5 m" },
  { label: "Legalitas",        target: "Clean & Clear" },
  { label: "Sengketa",         target: "Tidak Ada" },
  { label: "Market Potensial", target: "Tinggi" },
];

const STAGE_CHECKLISTS: Record<string, { key: string; label: string }[]> = {
  prospek_baru: [],
  survey: [
    { key: "akses_jalan_5m",      label: "Akses jalan minimal 5 meter" },
    { key: "dekat_fasilitas",     label: "Dekat market / fasilitas umum" },
    { key: "lingkungan_aman",     label: "Lingkungan aman" },
    { key: "potensi_pertumbuhan", label: "Potensi pertumbuhan wilayah" },
    { key: "utilitas_tersedia",   label: "Utilitas tersedia" },
  ],
  analisis_kompetitor: [
    { key: "harga_rumah_sekitar",   label: "Harga rumah sekitar" },
    { key: "tipe_rumah_sekitar",    label: "Tipe rumah sekitar" },
    { key: "kecepatan_penjualan",   label: "Kecepatan penjualan" },
    { key: "occupancy_rate",        label: "Occupancy rate" },
  ],
  negosiasi: [
    { key: "harga_tanah_m2",      label: "Harga tanah / m²" },
    { key: "sistem_pembayaran",   label: "Sistem pembayaran" },
    { key: "kerja_sama_lahan",    label: "Kerja sama lahan" },
    { key: "legalitas_pemilik",   label: "Legalitas pemilik" },
  ],
  legal_checking: [
    { key: "shm_alas_hak",          label: "SHM / alas hak" },
    { key: "bebas_sengketa",        label: "Bebas sengketa" },
    { key: "batas_tanah",           label: "Batas tanah jelas" },
    { key: "bphtb",                 label: "BPHTB" },
    { key: "status_pemilik_sekitar",label: "Status pemilik sekitar" },
    { key: "akses_jalan_legal",     label: "Akses jalan" },
    { key: "kelengkapan_berkas",    label: "Kelengkapan berkas" },
  ],
  pks_mou: [
    { key: "luas_lahan_teknis", label: "Luas lahan terukur" },
    { key: "topografi",         label: "Topografi" },
    { key: "kontur",            label: "Kontur" },
    { key: "utilitas_teknis",   label: "Utilitas" },
    { key: "peil_banjir",       label: "Peil banjir" },
  ],
  ditolak: [],
};

const JOBDESK_STAGES = [
  { key: "survey",              no: 1, label: "Survey Lokasi",
    desc: "Verifikasi kondisi fisik & sosial lokasi lahan",
    color: "border-blue-200 bg-blue-50", headerColor: "text-blue-700 bg-blue-100",
    checklist: STAGE_CHECKLISTS.survey },
  { key: "analisis_kompetitor", no: 2, label: "Analisis Kompetitor",
    desc: "Riset pasar properti di sekitar lokasi",
    color: "border-border bg-muted/30", headerColor: "text-foreground bg-muted",
    checklist: STAGE_CHECKLISTS.analisis_kompetitor },
  { key: "negosiasi",           no: 3, label: "Negosiasi Lahan",
    desc: "Proses tawar-menawar & kesepakatan harga",
    color: "border-amber-200 bg-amber-50", headerColor: "text-amber-700 bg-amber-100",
    checklist: STAGE_CHECKLISTS.negosiasi },
  { key: "legal_checking",      no: 4, label: "Legal Checking",
    desc: "Verifikasi dokumen & status hukum lahan",
    color: "border-orange-200 bg-orange-50", headerColor: "text-orange-700 bg-orange-100",
    checklist: STAGE_CHECKLISTS.legal_checking },
  { key: "pks_mou",             no: 5, label: "Pengumpulan Data Teknis",
    desc: "Pengukuran & data teknis lapangan sebelum PKS/MoU",
    color: "border-emerald-200 bg-emerald-50", headerColor: "text-emerald-700 bg-emerald-100",
    checklist: STAGE_CHECKLISTS.pks_mou },
];

// Items checklist yang memerlukan input nilai aktual
const CHECKLIST_INPUT_TYPES: Record<string, { type: "rp" | "text" | "pct"; placeholder: string }> = {
  harga_rumah_sekitar: { type: "rp",   placeholder: "harga, cth: 450.000.000" },
  tipe_rumah_sekitar:  { type: "text", placeholder: "cth: 36/72 subsidi" },
  kecepatan_penjualan: { type: "text", placeholder: "cth: 3-6 bulan" },
  occupancy_rate:      { type: "pct",  placeholder: "% hunian, cth: 85" },
  harga_tanah_m2:      { type: "rp",   placeholder: "harga/m², cth: 280.000" },
  sistem_pembayaran:   { type: "text", placeholder: "cth: cash bertahap 12 bln" },
};

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
  const [aiTab, setAiTab] = useState<"ringkasan" | "lokasi" | "risiko" | "finansial" | "rekomendasi">("ringkasan");

  const [survey, setSurvey] = useState<SurveyData>(() => loadSurvey(prospect.id));
  const [aksesJalanDraft, setAksesJalanDraft] = useState<number | null>(prospect.aksesJalan ?? null);
  const [catatanDraft, setCatatanDraft] = useState(prospect.catatan ?? "");
  const [competitorScope, setCompetitorScope] = useState<"kecamatan" | "kabupaten">(
    prospect.kecamatan ? "kecamatan" : "kabupaten"
  );
  const competitorList = getCompetitorsFromData(prospect.kabupaten, prospect.kecamatan, competitorScope);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateSurvey<K extends keyof SurveyData>(key: K, value: SurveyData[K]) {
    setSurvey(prev => {
      const next = { ...prev, [key]: value };
      saveSurvey(prospect.id, next);
      return next;
    });
  }

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

      const body = {
        lokasi: prospect.lokasi,
        kelurahan: prospect.kelurahan,
        kecamatan: prospect.kecamatan,
        kabupaten: prospect.kabupaten,
        luas: prospect.luas,
        hargaTanahM2: prospect.hargaM2 ?? 0,
        aksesJalan: aksesJalanDraft ?? prospect.aksesJalan ?? 0,
        targetTipeRumah: "subsidi",
        hargaRumahSekitar: hargaRumahStr ? parseInt(hargaRumahStr, 10) : 0,
        statusKepemilikan: survey.statusLegal || "Belum diketahui",
        bentukLahan: survey.bentukLahan || "kotak",
        kondisiLingkungan: "aman",
        potensiPertumbuhan: "sedang",
        utilitas: survey.utilitas,
        fasilitasUmum: [],
        catatan: [
          catatanDraft,
          vals.tipe_rumah_sekitar ? `Tipe rumah sekitar: ${vals.tipe_rumah_sekitar}` : "",
          vals.kecepatan_penjualan ? `Kecepatan penjualan: ${vals.kecepatan_penjualan}` : "",
          vals.occupancy_rate ? `Occupancy rate: ${vals.occupancy_rate}%` : "",
          vals.sistem_pembayaran ? `Sistem pembayaran: ${vals.sistem_pembayaran}` : "",
          vals.harga_tanah_m2 ? `Harga tanah/m² input: Rp${vals.harga_tanah_m2}` : "",
        ].filter(Boolean).join(". "),
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
    } catch (err) {
      console.error("AI analysis failed:", err);
    } finally {
      setAiLoading(false);
    }
  }

  function buildPayload() {
    return {
      prospect: { ...prospect, aksesJalan: aksesJalanDraft ?? prospect.aksesJalan, catatan: catatanDraft },
      checkedItems: checked,
      aiResult: aiResult ?? null,
      fullAiResult: fullAiResult ?? null,
      terrain: terrainData ?? null,
      competitors: competitorList,
      bentukLahan: survey.bentukLahan,
      statusLegal: survey.statusLegal,
      survey,
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
          {nextStage && nextStage !== "ditolak" && (
            <button
              disabled={advancing}
              onClick={() => onAdvanceStage(prospect.id, nextStage)}
              className="flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 shrink-0"
            >
              <ArrowRight className="size-3.5" />
              Naikan ke {nextStageLabel}
            </button>
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
                      onClick={() => generator?.(buildPayload())}
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
                      // Auto-populate dari data prospek yang sudah tersimpan di DB
                      const prospectAutoFill: Record<string, string> = {
                        harga_tanah_m2: prospect.hargaM2 ? String(prospect.hargaM2) : "",
                        luas_lahan: prospect.luas ? String(prospect.luas) : "",
                      };
                      const savedVals = checklistValues[prospect.id] ?? {};
                      const currentVal = savedVals[item.key] !== undefined
                        ? savedVals[item.key]
                        : (prospectAutoFill[item.key] ?? "");
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
                            <span className={cn("leading-tight flex-1", done && !inputDef && "line-through decoration-emerald-500/60")}>{item.label}</span>
                            {inputDef && currentVal && done && (
                              <span className="text-[8px] font-medium text-foreground/50 shrink-0 ml-1">
                                {inputDef.type === "rp" ? "v" : inputDef.type === "pct" ? currentVal + "%" : currentVal.slice(0, 8)}
                              </span>
                            )}
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
            { key: "rekomendasi" as const, label: "Rekomendasi" },
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
                  {ai?.analisisLokasi && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Analisis Lokasi</div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">{String(ai.analisisLokasi)}</p>
                    </div>
                  )}
                  {ai?.analisisFisikLahan && (
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
                    <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider mb-2">Breakdown per Unit ({up?.tipeLabel})</div>
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

              {/* Tab: Rekomendasi */}
              {aiTab === "rekomendasi" && (
                <div className="space-y-2">
                  {ai?.rekomendasiNarasi && (
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
      {prospect.kabupaten && (
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-foreground/70" />
              <span className="text-[11px] font-semibold">Kompetitor — {prospect.kabupaten}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border text-muted-foreground flex items-center gap-1">
                <Database className="size-2.5" />
                Dokumen resmi
              </span>
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

          {(() => {
            const sorted = [...competitorList].sort((a, b) =>
              getDistanceTier(prospect.kecamatan, prospect.kabupaten, a.kecamatan, a.kabupaten) -
              getDistanceTier(prospect.kecamatan, prospect.kabupaten, b.kecamatan, b.kabupaten)
            );
            return sorted.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                  <span><strong>{sorted.length}</strong> perumahan di{" "}{competitorScope === "kecamatan" ? `Kec. ${prospect.kecamatan}` : prospect.kabupaten}</span>
                  {sorted.length > 40 && <span className="text-amber-600 font-medium">(40 pertama)</span>}
                  <span className="text-foreground/40">— terdekat ke terjauh</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {sorted.slice(0, 40).map((c, i) => {
                    const tier = getDistanceTier(prospect.kecamatan, prospect.kabupaten, c.kecamatan, c.kabupaten);
                    const { label: tierLabel, cls: tierCls } = DISTANCE_TIER_LABELS[tier];
                    return (
                      <div key={i} className="flex items-start gap-2 bg-muted/30 border rounded-md px-2.5 py-2">
                        <div className="size-5 rounded-full bg-muted border flex items-center justify-center shrink-0 text-[9px] font-bold text-foreground/60 mt-0.5">{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium leading-tight">{c.name}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{c.pengembang}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={cn("text-[8px] font-medium px-1.5 py-0.5 rounded-full border", tierCls)}>{tierLabel}</span>
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
            ) : (
              <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 text-center">
                {competitorScope === "kecamatan" && !prospect.kecamatan
                  ? "Isi kecamatan di data prospek untuk filter per kecamatan"
                  : `Tidak ada perumahan terdaftar di ${competitorScope === "kecamatan" ? `Kec. ${prospect.kecamatan}` : prospect.kabupaten}`}
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TerrainData = { elevMin?: number; elevMax?: number; elevAvg?: number; slopeAvgPct?: number; slopeMaxPct?: number; waterwayType?: string; waterwayName?: string; waterwayDistM?: number | null } | null;

export default function Akuisisi() {
  const { data: prospects, refetch } = useListLandProspects({});
  const [tab, setTab] = useState<"peta" | "pipeline" | "slis">("peta");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checklists, setChecklists] = useState<Record<number, string[]>>(loadChecklist);
  const [checklistValues, setChecklistValues] = useState<Record<number, Record<string, string>>>(loadChecklistValues);
  const [advancing, setAdvancing] = useState(false);
  const [terrainData, setTerrainData] = useState<TerrainData>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);
  const [assessmentPolygon, setAssessmentPolygon] = useState<PolygonReadyData | null>(null);
  const [mapClearKey, setMapClearKey] = useState(0);

  const selectedProspect = selectedId ? (prospects ?? []).find((p) => p.id === selectedId) : null;

  function toggleChecklistItem(prospectId: number, itemKey: string) {
    setChecklists((prev) => {
      const current = prev[prospectId] ?? [];
      const next = current.includes(itemKey)
        ? current.filter((k) => k !== itemKey)
        : [...current, itemKey];
      const updated = { ...prev, [prospectId]: next };
      saveChecklist(updated);
      return updated;
    });
  }

  function setChecklistValue(prospectId: number, key: string, value: string) {
    setChecklistValues((prev) => {
      const next = { ...prev, [prospectId]: { ...(prev[prospectId] ?? {}), [key]: value } };
      saveChecklistValues(next);
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
    { key: "peta",        label: "Peta Sulsel", icon: Map },
    { key: "pipeline",    label: "Pipeline",    icon: LayoutList, badge: prospects?.length },
    { key: "kompetitor",  label: "Kompetitor",  icon: BarChart3 },
    { key: "slis",        label: "SLIS",        icon: BrainCircuit },
  ] as const;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Akuisisi Lahan</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-medium">
            {TABS.map(({ key, label, icon: Icon, ...rest }) => { const badge = "badge" in rest ? (rest as { badge?: number }).badge : undefined; return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors",
                  tab === key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {badge != null && badge > 0 && (
                  <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    {badge}
                  </span>
                )}
              </button>
            ); })}
          </div>
          {tab === "pipeline" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Prospek Baru</span>
            </Button>
          )}
        </div>
      </div>

      {tab === "peta" && (
        <div className="flex flex-col gap-3">
          <div className="min-h-0" style={{ height: "640px" }}>
            <SulselAcquisitionMap
              onSelectProspect={(id) => { setSelectedId(id); if (!id) setTerrainData(null); }}
              onTerrainData={(d) => { setTerrainData(d as TerrainData); setTerrainLoading(false); }}
              onPolygonReady={(poly) => {
                setAssessmentPolygon(poly);
                setTerrainData(null);
                setTerrainLoading(true);
              }}
              clearKey={mapClearKey}
            />
          </div>
        </div>
      )}

      {tab === "pipeline" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ minHeight: 280 }}>
            {STAGES.map((stage) => {
              const cards = (prospects ?? []).filter((p) => p.status === stage.key);
              const stageChecklist = STAGE_CHECKLISTS[stage.key] ?? [];
              return (
                <div
                  key={stage.key}
                  className="w-64 flex-shrink-0 flex flex-col bg-card rounded-xl border"
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                    <h3 className={cn("text-xs font-semibold", stage.color)}>{stage.label}</h3>
                    <div className="flex items-center gap-1.5">
                      {stageChecklist.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{stageChecklist.length} poin</span>
                      )}
                      <span className="flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {cards.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {cards.map((prospect: LandProspect) => {
                      const checklist = STAGE_CHECKLISTS[prospect.status] ?? [];
                      const checkedItems = (checklists[prospect.id] ?? []).filter(
                        (k) => checklist.some((c) => c.key === k)
                      );
                      const isSelected = selectedId === prospect.id;
                      return (
                        <div
                          key={prospect.id}
                          onClick={() => setSelectedId(isSelected ? null : prospect.id)}
                          className={cn(
                            "bg-background rounded-lg border border-border/50 p-3 cursor-pointer transition-colors",
                            isSelected
                              ? "border-foreground/30 ring-1 ring-foreground/10"
                              : "hover:border-foreground/20"
                          )}
                        >
                          <div className="font-medium text-xs mb-0.5 line-clamp-1">
                            {prospect.lokasi}
                          </div>
                          {(prospect.kelurahan || prospect.kecamatan) && (
                            <div className="text-[10px] text-muted-foreground mb-1.5 line-clamp-1">
                              {[prospect.kelurahan, prospect.kecamatan].filter(Boolean).join(", ")}
                            </div>
                          )}
                          <div className="text-[11px] text-muted-foreground mb-2">
                            {formatLuas(prospect.luas)} &bull; Rp{prospect.hargaM2.toLocaleString("id-ID")}/m²
                          </div>
                          {checklist.length > 0 && (
                            <div className="mb-2">
                              <CheckProgress checked={checkedItems.length} total={checklist.length} />
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className={cn(
                              "text-[11px] font-semibold",
                              prospect.roi >= 25 ? "text-emerald-600" : "text-amber-600"
                            )}>
                              ROI {prospect.roi}%
                            </span>
                            <div className="flex items-center gap-1">
                              {prospect.lat != null && (
                                <span className="text-[10px] text-blue-500">📍</span>
                              )}
                              <span className={cn(
                                "size-2 rounded-full",
                                prospect.riskLevel === "red" ? "bg-red-500"
                                  : prospect.riskLevel === "yellow" ? "bg-amber-400"
                                  : "bg-emerald-500"
                              )} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!cards.length && (
                      <div className="text-center py-6 text-[11px] text-muted-foreground">
                        Tidak ada item
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedProspect && (
            <ProspectDetailPanel
              prospect={selectedProspect}
              allProspects={prospects ?? []}
              checklists={checklists}
              checklistValues={checklistValues}
              onClose={() => setSelectedId(null)}
              onToggleItem={toggleChecklistItem}
              onSetChecklistValue={setChecklistValue}
              onAdvanceStage={advanceStage}
              advancing={advancing}
              onRefetch={() => refetch()}
            />
          )}
        </div>
      )}

      {tab === "kompetitor" && (
        <KompetitorPage />
      )}

      {tab === "slis" && (
        <SLIS />
      )}

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
