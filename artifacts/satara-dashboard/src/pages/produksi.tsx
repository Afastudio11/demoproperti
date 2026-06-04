import {
  useListQcDefects,
  useListMaterials,
} from "@workspace/api-client-react";
import { AlertTriangle, Package, Shield, CheckCircle2, FolderOpen, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

const DEFECT_STATUS: Record<string, string> = {
  open: "bg-red-50 text-red-600 border-red-200",
  in_repair: "bg-amber-50 text-amber-600 border-amber-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const KPI_TARGETS = [
  { label: "Progress", target: "Sesuai Timeline" },
  { label: "Defect Minor", target: "<5%" },
  { label: "Kerapian Proyek", target: "Wajib" },
  { label: "Ketepatan Material", target: "Wajib" },
  { label: "Ready Akad", target: "Tepat Waktu" },
];

const PROGRESS_STAGES = [
  { pekerjaan: "Galian", pct: 3 },
  { pekerjaan: "Pondasi", pct: 8 },
  { pekerjaan: "Slof", pct: 6 },
  { pekerjaan: "Kolom", pct: 5 },
  { pekerjaan: "Pasangan Bata", pct: 12 },
  { pekerjaan: "Ring Balk", pct: 5 },
  { pekerjaan: "Kuda-kuda", pct: 5 },
  { pekerjaan: "Rangka Atap", pct: 4 },
  { pekerjaan: "Pemasangan Spandek", pct: 5 },
  { pekerjaan: "Plaster & Aplus", pct: 14 },
  { pekerjaan: "Keramik", pct: 9 },
  { pekerjaan: "Cat", pct: 5 },
  { pekerjaan: "Instalasi Listrik & Air", pct: 7 },
  { pekerjaan: "Finishing", pct: 7 },
];

export default function Produksi() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const urlProjectId = searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : null;

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
    enabled: !!urlProjectId,
  });
  const activeProject = urlProjectId && Array.isArray(projects)
    ? (projects as Record<string, unknown>[]).find(p => p.id === urlProjectId) as Record<string, string> | undefined
    : undefined;

  const { data: defects } = useListQcDefects({});
  const { data: materials } = useListMaterials({});

  const criticalMaterials = materials?.filter((m) => m.isBelowMinimum) ?? [];
  const openDefects = defects?.filter((d) => d.status === "open").length ?? 0;
  const defectOk = openDefects === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Produksi & Konstruksi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Progress pembangunan, QC, stok material — Standar subsidi 36 m² / lahan 60–72 m²
          </p>
        </div>
        {urlProjectId && (
          <Link href="/projects" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" />
            Daftar Proyek
          </Link>
        )}
      </div>

      {activeProject && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <FolderOpen className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Proyek: </span>
            <span className="text-sm font-semibold text-primary">{activeProject.nama}</span>
            {activeProject.lokasi && <span className="text-xs text-muted-foreground ml-2">— {activeProject.lokasi}</span>}
          </div>
          {activeProject.kabupaten && (
            <span className="text-[10px] font-medium text-muted-foreground border rounded px-1.5 py-0.5">{activeProject.kabupaten}</span>
          )}
        </div>
      )}

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Material Kritis",
            value: criticalMaterials.length,
            icon: AlertTriangle,
            color: criticalMaterials.length > 0 ? "text-red-500" : "text-emerald-600",
          },
          {
            label: "Total Material",
            value: materials?.length ?? 0,
            icon: Package,
            color: "text-foreground",
          },
          {
            label: "Defect Open",
            value: openDefects,
            icon: Shield,
            color: defectOk ? "text-emerald-600" : "text-red-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 border rounded-lg p-3">
              <span className={cn("text-2xl font-semibold tracking-tight", color)}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="font-medium text-sm">Material Stock Alert</h3>
            {criticalMaterials.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                {criticalMaterials.length} kritis
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {criticalMaterials.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center rounded-lg border border-border/50 p-3 bg-muted/30"
              >
                <div>
                  <div className="font-medium text-sm">{m.item}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Vendor: {m.vendor || "-"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-500 text-sm">
                    {m.stok} {m.satuan}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Min: {m.minimumStock}
                  </div>
                </div>
              </div>
            ))}
            {!criticalMaterials.length && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Semua stok aman.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <Shield className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">QC & Defect Tracker</h3>
          </div>
          <div className="p-4 space-y-3">
            {defects?.map((defect) => (
              <div
                key={defect.id}
                className="flex justify-between items-start rounded-lg border border-border/50 p-3 bg-muted/30"
              >
                <div className="min-w-0 mr-3">
                  <div className="font-medium text-sm line-clamp-1">
                    {defect.deskripsi}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {defect.kategori} &bull; Unit {defect.unitId}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0",
                    DEFECT_STATUS[defect.status] ??
                      "bg-muted text-muted-foreground border-border/50"
                  )}
                >
                  {defect.status.replace("_", " ")}
                </span>
              </div>
            ))}
            {!defects?.length && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Tidak ada defect tercatat.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <Package className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Standar Progress Pembangunan</h3>
          </div>
          <div className="p-3 space-y-1 overflow-y-auto max-h-72">
            {PROGRESS_STAGES.map((s) => (
              <div key={s.pekerjaan} className="flex items-center justify-between gap-3 py-1">
                <span className="text-xs text-muted-foreground flex-1">{s.pekerjaan}</span>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/40 rounded-full"
                    style={{ width: `${(s.pct / 14) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-6 text-right">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
