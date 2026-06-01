import { useState } from "react";
import { useListLandProspects } from "@workspace/api-client-react";
import { Plus, CheckCircle2, Map, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import SulselAcquisitionMap from "@/components/sulsel-acquisition-map";

const STAGES: { key: string; label: string }[] = [
  { key: "prospek_baru", label: "Prospek Baru" },
  { key: "survey", label: "Survey Lokasi" },
  { key: "analisis_kompetitor", label: "Analisis Kompetitor" },
  { key: "negosiasi", label: "Negosiasi Lahan" },
  { key: "legal_checking", label: "Legal Checking" },
  { key: "pks_mou", label: "PKS / MoU" },
  { key: "ditolak", label: "Ditolak" },
];

const KPI_TARGETS = [
  { label: "ROI Proyek", target: ">25%" },
  { label: "Margin", target: ">20%" },
  { label: "Lebar Jalan", target: "Min. 5 m" },
  { label: "Legalitas", target: "Clean & Clear" },
  { label: "Sengketa", target: "Tidak Ada" },
  { label: "Market Potensial", target: "Tinggi" },
];

export default function Akuisisi() {
  const { data: prospects } = useListLandProspects({});
  const [tab, setTab] = useState<"peta" | "pipeline">("peta");

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Akuisisi Lahan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Survey · Analisis Kompetitor · Negosiasi · Legal Checking · PKS/MoU
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-medium">
            <button
              onClick={() => setTab("peta")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                tab === "peta"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="size-3.5" />
              Peta Sulsel
            </button>
            <button
              onClick={() => setTab("pipeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                tab === "pipeline"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="size-3.5" />
              Pipeline
              {(prospects?.length ?? 0) > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  {prospects?.length}
                </span>
              )}
            </button>
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
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const cards = prospects?.filter((p) => p.status === stage.key) || [];
            return (
              <div
                key={stage.key}
                className="w-72 flex-shrink-0 flex flex-col bg-card rounded-xl border"
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                  <h3 className="text-sm font-medium">{stage.label}</h3>
                  <span className="flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {cards.length}
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {cards.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="bg-background rounded-lg border border-border/50 p-3 cursor-pointer hover:border-foreground/20 transition-colors"
                    >
                      <div className="font-medium text-sm mb-1 line-clamp-1">
                        {prospect.lokasi}
                      </div>
                      {(prospect.kelurahan || prospect.kecamatan || prospect.kabupaten) && (
                        <div className="text-[11px] text-muted-foreground mb-1 line-clamp-1">
                          {[prospect.kelurahan, prospect.kecamatan, prospect.kabupaten].filter(Boolean).join(", ")}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mb-2">
                        {prospect.luas >= 10000
                          ? `${(prospect.luas / 10000).toFixed(2)} Ha`
                          : `${prospect.luas.toLocaleString("id-ID")} m²`}{" "}
                        &bull; Rp{prospect.hargaM2.toLocaleString("id-ID")}/m²
                      </div>
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-semibold ${
                            prospect.roi >= 25 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          ROI: {prospect.roi}%
                        </span>
                        <div className="flex items-center gap-1.5">
                          {prospect.lat != null && (
                            <span className="text-[10px] text-blue-500 font-medium">📍</span>
                          )}
                          <span
                            className={`size-2 rounded-full ${
                              prospect.riskLevel === "red"
                                ? "bg-red-500"
                                : prospect.riskLevel === "yellow"
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!cards.length && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Tidak ada item
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
