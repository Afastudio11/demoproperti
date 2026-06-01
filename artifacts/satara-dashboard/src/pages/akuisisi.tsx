import { useListLandProspects } from "@workspace/api-client-react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Akuisisi Lahan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pipeline prospek lahan — Survey · Analisis · Negosiasi · Legal Checking · PKS/MoU
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Prospek Baru</span>
        </Button>
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
                    <div className="text-xs text-muted-foreground mb-2">
                      {prospect.luas} m² &bull;{" "}
                      Rp{prospect.hargaM2.toLocaleString("id-ID")}/m²
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-emerald-600">
                        ROI: {prospect.roi}%
                      </span>
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
    </div>
  );
}
