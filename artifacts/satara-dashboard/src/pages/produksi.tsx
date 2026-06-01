import {
  useListQcDefects,
  useListMaterials,
} from "@workspace/api-client-react";
import { AlertTriangle, Package, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFECT_STATUS: Record<string, string> = {
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  in_repair: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  closed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function Produksi() {
  const { data: defects } = useListQcDefects({});
  const { data: materials } = useListMaterials({});

  const criticalMaterials = materials?.filter((m) => m.isBelowMinimum) ?? [];
  const openDefects = defects?.filter((d) => d.status === "open").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Produksi & Konstruksi
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Progress pembangunan, QC, dan stok material
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Material Kritis",
            value: criticalMaterials.length,
            icon: AlertTriangle,
            color: "text-pink-400",
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
            color: openDefects > 0 ? "text-red-400" : "text-emerald-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3">
              <span className={cn("text-2xl font-semibold tracking-tight", color)}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <AlertTriangle className="size-4 text-pink-400" />
            <h3 className="font-medium text-sm">Material Stock Alert</h3>
            {criticalMaterials.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30">
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
                  <div className="font-semibold text-pink-400 text-sm">
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
      </div>
    </div>
  );
}
