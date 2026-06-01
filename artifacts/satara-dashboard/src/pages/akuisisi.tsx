import { useState } from "react";
import { useListLandProspects } from "@workspace/api-client-react";
import type { LandProspect } from "@workspace/api-client-react";
import {
  Plus, CheckCircle2, Map, LayoutList, BookOpen, X,
  ChevronRight, FileText, ClipboardList, ArrowRight, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SulselAcquisitionMap from "@/components/sulsel-acquisition-map";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "prospek_baru",        label: "Prospek Baru",        color: "text-slate-500" },
  { key: "survey",              label: "Survey Lokasi",        color: "text-blue-600" },
  { key: "analisis_kompetitor", label: "Analisis Kompetitor",  color: "text-violet-600" },
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
    color: "border-violet-200 bg-violet-50", headerColor: "text-violet-700 bg-violet-100",
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
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{checked}/{total}</span>
    </div>
  );
}

// ─── Prospect Detail Panel ────────────────────────────────────────────────────

function ProspectDetailPanel({
  prospect,
  checklists,
  onClose,
  onToggleItem,
  onAdvanceStage,
  advancing,
}: {
  prospect: LandProspect;
  checklists: Record<number, string[]>;
  onClose: () => void;
  onToggleItem: (id: number, item: string) => void;
  onAdvanceStage: (id: number, nextStage: string) => void;
  advancing: boolean;
}) {
  const stage = STAGES.find((s) => s.key === prospect.status);
  const checklist = STAGE_CHECKLISTS[prospect.status] ?? [];
  const checked = (checklists[prospect.id] ?? []);
  const nextStageIdx = STAGE_ORDER.indexOf(prospect.status) + 1;
  const nextStage = nextStageIdx < STAGE_ORDER.length ? STAGE_ORDER[nextStageIdx] : null;
  const nextStageLabel = STAGES.find((s) => s.key === nextStage)?.label;

  return (
    <div className="w-72 shrink-0 bg-card border rounded-xl flex flex-col self-start max-h-[calc(100vh-220px)] overflow-y-auto">
      <div className="flex items-start justify-between gap-2 p-3 border-b sticky top-0 bg-card z-10">
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-snug line-clamp-2">{prospect.lokasi}</div>
          {(prospect.kelurahan || prospect.kecamatan) && (
            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {[prospect.kelurahan, prospect.kecamatan, prospect.kabupaten].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
          <X className="size-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          {[
            { l: "Luas",      v: formatLuas(prospect.luas) },
            { l: "Harga/m²",  v: `Rp${prospect.hargaM2.toLocaleString("id-ID")}` },
            { l: "ROI",       v: `${prospect.roi}%`, hi: prospect.roi >= 25 },
            { l: "Status",    v: stage?.label ?? prospect.status },
          ].map(({ l, v, hi }) => (
            <div key={l} className="bg-muted rounded-md px-2 py-1.5">
              <div className="text-muted-foreground">{l}</div>
              <div className={cn("font-semibold", hi && "text-emerald-600")}>{v}</div>
            </div>
          ))}
        </div>

        {checklist.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                CHECKLIST — {stage?.label?.toUpperCase()}
              </span>
            </div>
            <CheckProgress checked={checked.filter(k => checklist.some(c => c.key === k)).length} total={checklist.length} />
            <div className="space-y-1 mt-2">
              {checklist.map((item) => {
                const done = checked.includes(item.key);
                return (
                  <label
                    key={item.key}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[11px] transition-colors",
                      done ? "bg-emerald-50 text-emerald-800" : "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      done ? "bg-emerald-500 border-emerald-500" : "border-border bg-background"
                    )}>
                      {done && <CheckCircle2 className="size-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={cn(done && "line-through text-emerald-600")}>{item.label}</span>
                  </label>
                );
              })}
            </div>
            <button
              className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground py-1 border rounded-md hover:bg-muted transition-colors"
              onClick={() => {
                const allKeys = checklist.map((c) => c.key);
                const allDone = allKeys.every((k) => checked.includes(k));
                allKeys.forEach((k) => {
                  if (allDone ? checked.includes(k) : !checked.includes(k))
                    onToggleItem(prospect.id, k);
                });
              }}
            >
              {checklist.every((c) => checked.includes(c.key)) ? "Batal semua" : "Tandai semua selesai"}
            </button>
          </div>
        )}

        {checklist.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-2 bg-muted rounded-md">
            {prospect.status === "prospek_baru"
              ? "Pindahkan ke stage Survey untuk mulai checklist"
              : "Tidak ada checklist di stage ini"}
          </div>
        )}

        {nextStage && nextStage !== "ditolak" && (
          <button
            disabled={advancing}
            onClick={() => onAdvanceStage(prospect.id, nextStage)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="size-3.5" />
            Naikan ke {nextStageLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Jobdesk View ─────────────────────────────────────────────────────────────

function JobdeskView() {
  return (
    <div className="space-y-4 pb-4">
      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-1 tracking-wider">TUJUAN DIVISI</div>
        <p className="text-sm text-foreground">
          Mencari dan mengamankan lahan potensial yang layak secara{" "}
          <span className="font-medium">market, legal, akses, profit,</span> dan{" "}
          <span className="font-medium">cashflow</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {JOBDESK_STAGES.map((stage) => (
          <div key={stage.key} className={cn("border rounded-xl overflow-hidden", stage.color)}>
            <div className={cn("px-3 py-2 flex items-center gap-2", stage.headerColor)}>
              <span className="text-[10px] font-bold opacity-60">#{stage.no}</span>
              <span className="text-xs font-semibold flex-1">{stage.label}</span>
              <span className="text-[10px] font-medium bg-white/50 rounded-full px-2 py-0.5">
                {stage.checklist.length} poin
              </span>
            </div>
            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] text-muted-foreground mb-2">{stage.desc}</p>
              <div className="space-y-1">
                {stage.checklist.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-[11px] py-0.5">
                    <div className="size-3.5 rounded border border-current opacity-40 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wider">OUTPUT DIVISI AKUISISI</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {OUTPUT_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex flex-col items-center gap-2 bg-muted rounded-xl p-3 text-center"
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Akuisisi() {
  const { data: prospects, refetch } = useListLandProspects({});
  const [tab, setTab] = useState<"peta" | "pipeline" | "jobdesk">("peta");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checklists, setChecklists] = useState<Record<number, string[]>>(loadChecklist);
  const [advancing, setAdvancing] = useState(false);

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
    { key: "peta",     label: "Peta Sulsel",  icon: Map },
    { key: "pipeline", label: "Pipeline",      icon: LayoutList, badge: prospects?.length },
    { key: "jobdesk",  label: "Jobdesk",       icon: BookOpen },
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

      <div className="bg-card border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wider">INDIKATOR KEBERHASILAN</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {KPI_TARGETS.map((k) => (
            <div key={k.label} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1">
              <span className="text-xs text-muted-foreground">{k.label}:</span>
              <span className="text-xs font-semibold text-foreground">{k.target}</span>
            </div>
          ))}
        </div>
      </div>

      {tab === "peta" && (
        <div className="flex-1 min-h-0">
          <SulselAcquisitionMap />
        </div>
      )}

      {tab === "pipeline" && (
        <div className="flex flex-1 gap-3 min-h-0 overflow-hidden">
          <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
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
                    {cards.map((prospect) => {
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
            />
          )}
        </div>
      )}

      {tab === "jobdesk" && (
        <div className="flex-1 overflow-y-auto">
          <JobdeskView />
        </div>
      )}
    </div>
  );
}
