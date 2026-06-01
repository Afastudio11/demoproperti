import { useListLeads, useGetMarketingKpi } from "@workspace/api-client-react";
import { Plus, TrendingUp, Users, DollarSign, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAGES: { key: string; label: string }[] = [
  { key: "lead_masuk", label: "Lead Masuk" },
  { key: "qualified", label: "Qualified" },
  { key: "survey", label: "Survey" },
  { key: "booking", label: "Booking" },
  { key: "berkas_kpr", label: "Berkas KPR" },
  { key: "akad", label: "Akad" },
  { key: "batal", label: "Batal" },
];

const KPI_TARGETS = [
  { label: "CPL", target: "Sesuai Target" },
  { label: "Lead Conversion", target: ">10%" },
  { label: "Booking → Akad", target: ">70%" },
  { label: "Respons Admin", target: "<5 Menit" },
  { label: "Survey Rate", target: "Tinggi" },
];

export default function Marketing() {
  const { data: leads } = useListLeads({});
  const { data: kpi } = useGetMarketingKpi({});

  const convOk = (kpi?.conversionRate ?? 0) >= 10;
  const b2aOk = (kpi?.bookingToAkadRate ?? 0) >= 70;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Marketing Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lead tracker, KPI marketing, dan pipeline akad
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Tambah Lead</span>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Leads",
            value: kpi?.totalLeads ?? 0,
            icon: Users,
            fmt: (v: number) => String(v),
            ok: null,
          },
          {
            label: "Cost per Lead",
            value: kpi?.cpl ?? 0,
            icon: DollarSign,
            fmt: (v: number) => `Rp${(v / 1e3).toFixed(0)}rb`,
            ok: null,
          },
          {
            label: "Conversion Rate",
            value: kpi?.conversionRate ?? 0,
            icon: TrendingUp,
            fmt: (v: number) => `${v}%`,
            ok: convOk,
            target: "target >10%",
          },
          {
            label: "Booking to Akad",
            value: kpi?.bookingToAkadRate ?? 0,
            icon: Target,
            fmt: (v: number) => `${v}%`,
            ok: b2aOk,
            target: "target >70%",
          },
        ].map(({ label, value, icon: Icon, fmt, ok, target }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 border rounded-lg p-3">
              <span className={cn(
                "text-xl font-semibold tracking-tight",
                ok === true ? "text-emerald-600" : ok === false ? "text-red-500" : ""
              )}>
                {fmt(value)}
              </span>
              {target && (
                <div className={cn("text-[10px] mt-1", ok ? "text-emerald-600" : "text-muted-foreground")}>
                  {ok ? "✓ " : ""}{target}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = leads?.filter((l) => l.status === stage.key) || [];
          return (
            <div
              key={stage.key}
              className="w-64 flex-shrink-0 flex flex-col bg-card rounded-xl border"
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                <h3 className="text-sm font-medium">{stage.label}</h3>
                <span className="flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {cards.length}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {cards.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-background rounded-lg border border-border/50 p-3 cursor-pointer hover:border-foreground/20 transition-colors"
                  >
                    <div className="font-medium text-sm mb-1 line-clamp-1">
                      {lead.nama}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {lead.kontak}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {lead.source.replace("_", " ")}
                      </span>
                      {lead.assignedTo && (
                        <span className="text-[10px] text-muted-foreground">
                          {lead.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {!cards.length && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Tidak ada lead
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
