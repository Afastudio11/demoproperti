import { useParams } from "wouter";
import { useGetProject, useGetProjectHealth, getGetProjectQueryKey } from "@workspace/api-client-react";
import { MapPin, ArrowLeft, Activity, ShoppingBag, FileSignature, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const RISK_STYLE: Record<string, string> = {
  green: "text-emerald-400",
  yellow: "text-amber-400",
  red: "text-red-400",
};

const FASE_COLORS: Record<string, string> = {
  LAND: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  PLAN: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  LEGAL: "bg-muted text-muted-foreground border-border",
  SELL: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  BUILD: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  AKAD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  HANDOVER: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  SCALE: "bg-lime-500/20 text-lime-300 border-lime-500/30",
};

export default function ProjectDetail() {
  const params = useParams();
  const projectId = Number(params.id);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: health } = useGetProjectHealth(projectId, {
    query: { enabled: !!projectId, queryKey: ["projectHealth", projectId] },
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Memuat data proyek...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Proyek tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/projects"
            className="mt-0.5 p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              {project.nama}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <MapPin className="size-3.5" />
              <span className="text-sm">{project.lokasi}</span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-md border shrink-0 mt-1",
            FASE_COLORS[project.fase] ?? "bg-muted text-muted-foreground border-border/50"
          )}
        >
          {project.fase}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Risk Level",
            value: health?.riskLevel?.toUpperCase() ?? "N/A",
            icon: AlertTriangle,
            className: RISK_STYLE[health?.riskLevel ?? ""] ?? "text-muted-foreground",
          },
          {
            label: "Sales Progress",
            value: `${health?.salesProgress ?? 0}%`,
            icon: ShoppingBag,
            className: "text-pink-400",
            progress: health?.salesProgress ?? 0,
          },
          {
            label: "Konstruksi",
            value: `${health?.constructionProgress ?? 0}%`,
            icon: Activity,
            className: "text-cyan-400",
            progress: health?.constructionProgress ?? 0,
          },
          {
            label: "Akad Progress",
            value: `${health?.akadProgress ?? 0}%`,
            icon: FileSignature,
            className: "text-emerald-400",
            progress: health?.akadProgress ?? 0,
          },
        ].map(({ label, value, icon: Icon, className, progress }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3">
              <span className={cn("text-xl font-semibold tracking-tight", className)}>
                {value}
              </span>
              {progress !== undefined && (
                <Progress value={progress} className="h-1.5 mt-2" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <h3 className="font-medium text-sm mb-4">Informasi Proyek</h3>
          <div className="space-y-3">
            {[
              { label: "Total Unit", value: project.totalUnit },
              { label: "Status", value: project.status },
              { label: "Luas", value: project.luas ? `${project.luas?.toLocaleString("id-ID")} m²` : "-" },
              { label: "Koordinat", value: project.lat && project.lng ? `${project.lat}, ${project.lng}` : "-" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <h3 className="font-medium text-sm mb-4">Workflow Fase</h3>
          <div className="flex flex-wrap gap-2">
            {["LAND", "PLAN", "LEGAL", "SELL", "BUILD", "AKAD", "HANDOVER", "SCALE"].map(
              (fase) => {
                const phases = ["LAND", "PLAN", "LEGAL", "SELL", "BUILD", "AKAD", "HANDOVER", "SCALE"];
                const currentIdx = phases.indexOf(project.fase);
                const faseIdx = phases.indexOf(fase);
                const isDone = faseIdx < currentIdx;
                const isCurrent = fase === project.fase;

                return (
                  <span
                    key={fase}
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-md border",
                      isCurrent
                        ? FASE_COLORS[fase] ?? "bg-muted text-muted-foreground border-border/50"
                        : isDone
                        ? "bg-emerald-500/10 text-emerald-400/60 border-emerald-500/20"
                        : "bg-muted/30 text-muted-foreground/40 border-border/30"
                    )}
                  >
                    {fase}
                  </span>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
