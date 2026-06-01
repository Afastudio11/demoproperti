import { useListFeasibilityStudies, useListProjects } from "@workspace/api-client-react";
import { TrendingUp, DollarSign, Clock, BarChart3 } from "lucide-react";

export default function Perencanaan() {
  const { data: studies } = useListFeasibilityStudies({});
  const { data: projects } = useListProjects();

  const projectMap = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p.nama])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Perencanaan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Feasibility study dan kalkulasi ROI
        </p>
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
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
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
                  color: "text-emerald-400",
                },
                {
                  label: "Margin",
                  value: `${study.margin}%`,
                  icon: BarChart3,
                  color: "text-pink-400",
                },
                {
                  label: "BEP",
                  value: `${study.bep} Bln`,
                  icon: Clock,
                  color: "text-cyan-400",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3"
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
