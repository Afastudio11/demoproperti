import { useState, useEffect, useRef } from "react";
import { useListLandProspects } from "@workspace/api-client-react";
import type { LandProspect } from "@workspace/api-client-react";
import {
  Plus, CheckCircle2, Map, LayoutList, X,
  FileText, ClipboardList, ArrowRight, BrainCircuit,
  Loader2, ThumbsUp, AlertTriangle, ThumbsDown, RefreshCw,
  Building2, Radio, Search as SearchIcon, Download,
} from "lucide-react";
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
  distanceKm?: number;
}

async function fetchNearbyCompetitors(lat: number, lng: number, radiusKm = 3): Promise<string[]> {
  const details = await fetchCompetitorDetails(lat, lng, radiusKm);
  return details.map(d => d.name);
}

async function fetchCompetitorDetails(lat: number, lng: number, radiusKm = 3): Promise<CompetitorEntry[]> {
  const R = radiusKm * 1000;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=[out:json][timeout:25];(node["name"~"Perumahan|Griya|Bukit|Residence|Regency|Villa|Cluster|Perum|Taman|Garden|Park|Housing",i](around:${R},${lat},${lng});way["landuse"="residential"]["name"](around:${R},${lat},${lng});way["place"~"neighbourhood|suburb"]["name"](around:${R},${lat},${lng}););out center tags;`,
    });
    const data = await res.json();
    const seen = new Set<string>();
    const results: CompetitorEntry[] = [];
    for (const el of (data.elements ?? []) as { type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: { name?: string; landuse?: string; place?: string } }[]) {
      const name = el.tags?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      let distanceKm: number | undefined;
      if (elLat && elLon) {
        const dLat = (elLat - lat) * (Math.PI / 180);
        const dLon = (elLon - lng) * (Math.PI / 180);
        const a = Math.sin(dLat/2)**2 + Math.cos(lat * Math.PI/180) * Math.cos(elLat * Math.PI/180) * Math.sin(dLon/2)**2;
        distanceKm = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2));
      }
      results.push({ name, type: el.tags?.landuse ? "Kawasan Residensial" : el.tags?.place ? "Permukiman" : "Perumahan", distanceKm });
    }
    return results.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99)).slice(0, 20);
  } catch (e) {
    throw new Error("Gagal menghubungi OpenStreetMap: " + (e instanceof Error ? e.message : "network error"));
  }
}

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

function loadCompetitors(id: number): CompetitorEntry[] {
  try { return JSON.parse(localStorage.getItem(`satara_comp_${id}`) ?? "[]"); } catch { return []; }
}
function saveCompetitors(id: number, list: CompetitorEntry[]) {
  localStorage.setItem(`satara_comp_${id}`, JSON.stringify(list));
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
  checklists,
  terrainData,
  onClose,
  onToggleItem,
  onAdvanceStage,
  advancing,
  onRefetch,
}: {
  prospect: LandProspect;
  checklists: Record<number, string[]>;
  terrainData?: { elevMin?: number; elevMax?: number; elevAvg?: number; slopeAvgPct?: number; slopeMaxPct?: number; waterwayType?: string; waterwayName?: string; waterwayDistM?: number | null } | null;
  onClose: () => void;
  onToggleItem: (id: number, item: string) => void;
  onAdvanceStage: (id: number, nextStage: string) => void;
  advancing: boolean;
  onRefetch: () => void;
}) {
  const [aiResult, setAiResult] = useState<AiResult | null>(() => loadAiResult(prospect.id));
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyData>(() => loadSurvey(prospect.id));
  const [aksesJalanDraft, setAksesJalanDraft] = useState<number | null>(prospect.aksesJalan ?? null);
  const [catatanDraft, setCatatanDraft] = useState(prospect.catatan ?? "");
  const [competitorList, setCompetitorList] = useState<CompetitorEntry[]>(() => loadCompetitors(prospect.id));
  const [competitorRadius, setCompetitorRadius] = useState(3);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [competitorHasSearched, setCompetitorHasSearched] = useState(() => loadCompetitors(prospect.id).length > 0);
  const autoFetchedRef = useRef(false);
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

  // Auto-fetch kompetitor saat panel dibuka jika ada koordinat & belum ada cache
  useEffect(() => {
    if (autoFetchedRef.current) return;
    if (prospect.lat == null || prospect.lng == null) return;
    if (loadCompetitors(prospect.id).length > 0) return;
    autoFetchedRef.current = true;
    setCompetitorLoading(true);
    setCompetitorError(null);
    fetchCompetitorDetails(prospect.lat, prospect.lng, competitorRadius)
      .then((data) => {
        setCompetitorList(data);
        saveCompetitors(prospect.id, data);
        setCompetitorHasSearched(true);
      })
      .catch((e) => {
        setCompetitorError(e instanceof Error ? e.message : "Gagal mengambil data kompetitor");
      })
      .finally(() => setCompetitorLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function buildPayload() {
    return {
      prospect: { ...prospect, aksesJalan: aksesJalanDraft ?? prospect.aksesJalan, catatan: catatanDraft },
      checkedItems: checked,
      aiResult: aiResult ?? null,
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

  async function fetchCompetitors() {
    if (prospect.lat == null || prospect.lng == null) return;
    setCompetitorLoading(true);
    setCompetitorError(null);
    setCompetitorHasSearched(false);
    try {
      const data = await fetchCompetitorDetails(prospect.lat, prospect.lng, competitorRadius);
      setCompetitorList(data);
      saveCompetitors(prospect.id, data);
      setCompetitorHasSearched(true);
    } catch (e) {
      setCompetitorError(e instanceof Error ? e.message : "Gagal mengambil data dari OpenStreetMap");
    } finally {
      setCompetitorLoading(false);
    }
  }

  async function runAiAnalysis() {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const competitors = competitorList.map(c => c.name);

      const res = await fetch("/api/ai/analyze-land", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lokasi: prospect.lokasi,
          kelurahan: prospect.kelurahan,
          kecamatan: prospect.kecamatan,
          kabupaten: prospect.kabupaten,
          luas: prospect.luas,
          hargaM2: prospect.hargaM2,
          roi: prospect.roi,
          aksesJalan: aksesJalanDraft ?? prospect.aksesJalan,
          bentukLahan: survey.bentukLahan || undefined,
          statusLegal: survey.statusLegal || undefined,
          topografi: terrainData?.slopeAvgPct != null
            ? (terrainData.slopeAvgPct < 2 ? "Datar" : terrainData.slopeAvgPct < 5 ? "Landai" : terrainData.slopeAvgPct < 15 ? "Berbukit" : "Curam")
            : survey.topografi || undefined,
          kondisiJalan: survey.kondisiJalan || undefined,
          utilitas: survey.utilitas.length > 0 ? survey.utilitas.join(", ") : undefined,
          peilBanjir: survey.peilBanjir || undefined,
          namaPemilik: survey.namaPemilik || undefined,
          catatanLapangan: catatanDraft || undefined,
          currentStage: STAGES.find((s) => s.key === prospect.status)?.label,
          checkedItems: checked.length,
          competitors,
          lat: prospect.lat ?? undefined,
          lng: prospect.lng ?? undefined,
          ...(terrainData ?? {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Gagal menghubungi AI");
      }
      const data: AiResult = await res.json();
      setAiResult(data);
      saveAiResult(prospect.id, data);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setAiLoading(false);
    }
  }

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
                  <div className="p-2 space-y-1 flex-1">
                    {jStage.checklist.map((item) => {
                      const done = checked.includes(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={() => onToggleItem(prospect.id, item.key)}
                          className={cn(
                            "flex items-start gap-1.5 text-[10px] rounded px-1 py-0.5 transition-colors cursor-pointer group",
                            status === "pending"
                              ? "text-foreground/40 cursor-default"
                              : done
                              ? "text-emerald-600 hover:bg-muted/40"
                              : "text-foreground/80 hover:bg-muted/40"
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
                          <span className={cn("leading-tight", done && "line-through decoration-emerald-500/60")}>{item.label}</span>
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

      {/* ── Analisis AI ── */}
      <div className="border-t px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold">Analisis AI Kelayakan</span>
          </div>
          <button
            onClick={runAiAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-foreground hover:bg-foreground/90 text-background transition-colors disabled:opacity-60"
          >
            {aiLoading
              ? <><Loader2 className="size-3 animate-spin" /> Menganalisis...</>
              : aiResult
              ? <><RefreshCw className="size-3" /> Analisis Ulang</>
              : "Analisis dengan AI"
            }
          </button>
        </div>

        {aiLoading && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
            <Loader2 className="size-3.5 animate-spin shrink-0 text-muted-foreground" />
            <span>AI sedang menganalisis semua data: jobdesk, lahan, kontur, dan kompetitor yang sudah dicari...</span>
          </div>
        )}

        {aiError && (
          <div className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {aiResult && !aiLoading && (() => {
          const v = aiResult.verdict;
          const isSangat = v === "Sangat Direkomendasikan";
          const isDirek = v === "Direkomendasikan";
          const isPerlu = v === "Perlu Review";
          const isLayak = isSangat || isDirek;
          const borderCls = isSangat ? "bg-emerald-50 border-emerald-200" : isDirek ? "bg-teal-50 border-teal-200" : isPerlu ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
          const textCls = isSangat ? "text-emerald-700" : isDirek ? "text-teal-700" : isPerlu ? "text-amber-700" : "text-red-700";
          const barCls = isSangat ? "bg-emerald-500" : isDirek ? "bg-teal-500" : isPerlu ? "bg-amber-400" : "bg-red-500";
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <div className={cn("flex flex-col items-center justify-center rounded-xl px-4 py-3 border text-center min-w-[130px]", borderCls)}>
                  {isSangat ? <ThumbsUp className={cn("size-5 mb-1", textCls)} /> : isPerlu ? <AlertTriangle className={cn("size-5 mb-1", textCls)} /> : !isLayak ? <ThumbsDown className={cn("size-5 mb-1", textCls)} /> : <CheckCircle2 className={cn("size-5 mb-1", textCls)} />}
                  <div className={cn("text-[10px] font-bold leading-tight text-center", textCls)}>{v}</div>
                  <div className={cn("text-2xl font-black mt-1 leading-none", textCls)}>{aiResult.score}</div>
                  <div className="text-[9px] text-muted-foreground">/ 100</div>
                  <div className="w-full mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barCls)} style={{ width: `${aiResult.score}%` }} />
                  </div>
                  {aiResult.tingkatRisiko && (
                    <div className={cn("mt-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full",
                      aiResult.tingkatRisiko === "Rendah" ? "bg-emerald-100 text-emerald-700" :
                      aiResult.tingkatRisiko === "Sedang" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      Risiko: {aiResult.tingkatRisiko}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Primary metrics */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "Potensi Unit", value: aiResult.potensiUnit != null ? `${aiResult.potensiUnit} unit` : null, color: "text-blue-700" },
                      { label: "Harga Maks", value: aiResult.hargaMaksAkuisisi != null ? `Rp${(aiResult.hargaMaksAkuisisi/1000).toFixed(0)}rb/m²` : null, color: "text-foreground" },
                      { label: "ROI Estimasi", value: aiResult.roiEstimasi != null ? `${aiResult.roiEstimasi}%` : null, color: aiResult.roiEstimasi != null && aiResult.roiEstimasi >= 25 ? "text-emerald-700" : "text-amber-700" },
                      { label: "Payback", value: aiResult.paybackBulan != null ? `${aiResult.paybackBulan} bln` : null, color: "text-slate-700" },
                      { label: "IRR", value: aiResult.irr != null ? `${aiResult.irr}%` : null, color: "text-foreground" },
                      { label: "Luas Fasum", value: aiResult.luasFasum != null ? `${aiResult.luasFasum?.toLocaleString("id-ID")} m²` : null, color: "text-cyan-700" },
                      { label: "Luas Jalan", value: aiResult.luasJalan != null ? `${aiResult.luasJalan?.toLocaleString("id-ID")} m²` : null, color: "text-sky-700" },
                      { label: "Efektivitas", value: aiResult.efektivitasKavling != null ? `${aiResult.efektivitasKavling}%` : null, color: "text-teal-700" },
                    ].filter(m => m.value != null).slice(0, 8).map(({ label, value, color }) => (
                      <div key={label} className="bg-muted/40 border rounded-md px-2 py-1.5 text-center">
                        <div className="text-[9px] text-muted-foreground mb-0.5 leading-tight">{label}</div>
                        <div className={cn("text-[10px] font-bold", color)}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Financial summary */}
                  {(aiResult.potensiRevenue || aiResult.estimasiProfit) && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: "Potensi Revenue", value: aiResult.potensiRevenue, color: "text-emerald-700" },
                        { label: "Estimasi HPP", value: aiResult.estimasiHPP, color: "text-orange-700" },
                        { label: "Estimasi Profit", value: aiResult.estimasiProfit, color: "text-foreground" },
                      ].filter(m => m.value != null).map(({ label, value, color }) => (
                        <div key={label} className="bg-muted/40 border rounded-md px-2 py-1.5">
                          <div className="text-[9px] text-muted-foreground mb-0.5">{label}</div>
                          <div className={cn("text-[10px] font-bold", color)}>
                            Rp{((value ?? 0) / 1_000_000_000).toFixed(1)} M
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold text-muted-foreground tracking-wider">RINGKASAN</div>
                  <p className="text-[11px] leading-relaxed">{aiResult.ringkasan}</p>
                  <div className="text-[10px] font-semibold text-muted-foreground tracking-wider pt-0.5">REKOMENDASI</div>
                  <p className="text-[11px] leading-relaxed">{aiResult.rekomendasi}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-emerald-700 tracking-wider">KELEBIHAN</div>
                  {aiResult.kelebihan.map((k, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-red-600 tracking-wider">RISIKO</div>
                  {aiResult.risiko.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <AlertTriangle className="size-3 text-amber-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {!aiResult && !aiLoading && !aiError && (
          <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 text-center">
            Isi jobdesk checklist, bentuk lahan, status legal, dan cari data kompetitor di bawah. Setelah semua terisi, klik Analisis dengan AI — AI hanya generate 1x menggunakan semua data yang sudah ada.
          </div>
        )}
      </div>

      {/* ── Kompetitor ── */}
      {(prospect.lat != null && prospect.lng != null) && (
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-blue-500" />
              <span className="text-[11px] font-semibold text-blue-700">Kompetitor di Sekitar Lahan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Radius:</span>
              {[1, 3, 5, 10].map(r => (
                <button key={r} onClick={() => setCompetitorRadius(r)}
                  className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors",
                    competitorRadius === r ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border hover:bg-muted"
                  )}>{r} km</button>
              ))}
              <button
                onClick={fetchCompetitors}
                disabled={competitorLoading}
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 ml-1"
              >
                {competitorLoading ? <Loader2 className="size-2.5 animate-spin" /> : <SearchIcon className="size-2.5" />}
                {competitorLoading ? "Mencari..." : "Cari"}
              </button>
            </div>
          </div>

          {competitorLoading && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
              <Loader2 className="size-3 animate-spin text-blue-500" />
              Mengambil data perumahan dari OpenStreetMap radius {competitorRadius} km...
            </div>
          )}

          {competitorError && !competitorLoading && (
            <div className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="size-3 shrink-0" />
              <span>{competitorError}</span>
            </div>
          )}

          {competitorList.length > 0 && !competitorLoading && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-muted-foreground mb-2">
                Ditemukan <strong>{competitorList.length}</strong> perumahan/developer dalam radius {competitorRadius} km (sumber: OpenStreetMap)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {competitorList.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 border rounded-md px-2.5 py-2">
                    <div className="size-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[9px] font-bold">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium truncate">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">{c.type}</span>
                        {c.distanceKm != null && (
                          <span className="text-[9px] font-medium text-blue-600">±{c.distanceKm} km</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1.5 italic">
                * Data detail (developer, harga, jumlah unit, progres) memerlukan verifikasi lapangan
              </div>
            </div>
          )}

          {competitorList.length === 0 && !competitorLoading && !competitorError && !competitorHasSearched && (
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 text-center">
              Klik Cari untuk mendeteksi perumahan kompetitor dalam radius yang dipilih
            </div>
          )}

          {competitorList.length === 0 && !competitorLoading && !competitorError && competitorHasSearched && (
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 text-center">
              Tidak ditemukan perumahan kompetitor dalam radius {competitorRadius} km. Coba perbesar radius atau verifikasi koordinat lahan sudah benar.
            </div>
          )}
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
  const [advancing, setAdvancing] = useState(false);
  const [terrainData, setTerrainData] = useState<TerrainData>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);
  const [assessmentPolygon, setAssessmentPolygon] = useState<PolygonReadyData | null>(null);

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
    { key: "peta",     label: "Peta Sulsel",     icon: Map },
    { key: "pipeline", label: "Pipeline",          icon: LayoutList, badge: prospects?.length },
    { key: "slis",     label: "SLIS", icon: BrainCircuit },
  ] as const;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Akuisisi Lahan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Survey · Analisis Kompetitor · Negosiasi · Legal Checking · PKS/MoU
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-medium">
            {TABS.map(({ key, label, icon: Icon, badge }) => (
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
            ))}
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
              checklists={checklists}
              onClose={() => setSelectedId(null)}
              onToggleItem={toggleChecklistItem}
              onAdvanceStage={advanceStage}
              advancing={advancing}
              onRefetch={() => refetch()}
            />
          )}
        </div>
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
              checklists={checklists}
              terrainData={terrainData}
              onClose={() => { setSelectedId(null); setTerrainData(null); }}
              onToggleItem={toggleChecklistItem}
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
        />
      )}

    </div>
  );
}
