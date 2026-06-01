import { useListFeasibilityStudies, useListProjects } from "@workspace/api-client-react";
import { TrendingUp, DollarSign, Clock, BarChart3, CheckCircle2 } from "lucide-react";

const KPI_TARGETS = [
  { label: "ROI", target: ">25%", color: "text-emerald-600" },
  { label: "Margin", target: ">20%", color: "text-pink-600" },
  { label: "Cashflow", target: "Positif", color: "text-blue-600" },
  { label: "HPP", target: "Sesuai Target", color: "text-foreground" },
  { label: "Durasi Build", target: "≤90 Hari", color: "text-amber-600" },
  { label: "Target Akad", target: "Sesuai Timeline", color: "text-foreground" },
];

export default function Perencanaan() {
  const { data: studies } = useListFeasibilityStudies({});
  const { data: projects } = useListProjects();

  const projectMap = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p.nama])
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Perencanaan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Feasibility study, RAB, siteplan, dan cashflow projection
        </p>
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
              <span className={`text-xs font-semibold ${k.color}`}>{k.target}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {studies?.map((study) => (
          <div
            key={study.id}
            className="bg-card text-card-foreground rounded-xl border p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-medium text-sm">
                  {projectMap[study.projectId] ?? `Proyek #${study.projectId}`}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Feasibility Study
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  study.isApproved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-muted text-muted-foreground border-border/50"
                }`}
              >
                {study.isApproved ? "Approved" : "Draft"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "HPP",
                  value: `Rp${(study.hpp / 1e6).toFixed(0)}jt`,
                  icon: DollarSign,
                  color: "text-foreground",
                },
                {
                  label: "ROI",
                  value: `${study.roi}%`,
                  icon: TrendingUp,
                  color: study.roi >= 25 ? "text-emerald-600" : "text-red-500",
                  note: study.roi >= 25 ? "✓ Target" : "↓ Bawah Target",
                },
                {
                  label: "Margin",
                  value: `${study.margin}%`,
                  icon: BarChart3,
                  color: study.margin >= 20 ? "text-pink-600" : "text-red-500",
                  note: study.margin >= 20 ? "✓ Target" : "↓ Bawah Target",
                },
                {
                  label: "BEP",
                  value: `${study.bep} Bln`,
                  icon: Clock,
                  color: "text-amber-600",
                },
              ].map(({ label, value, icon: Icon, color, note }) => (
                <div
                  key={label}
                  className="bg-muted/50 border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {label}
                    </span>
                    <Icon className={`size-3.5 ${color}`} />
                  </div>
                  <div className={`text-lg font-semibold tracking-tight ${color}`}>
                    {value}
                  </div>
                  {note && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!studies?.length && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Belum ada feasibility study.
          </div>
        )}
      </div>
    </div>
  );
}
