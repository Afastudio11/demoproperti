import { useListHandovers } from "@workspace/api-client-react";
import { Key, Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const KPI_TARGETS = [
  { label: "Final QC", target: "Wajib" },
  { label: "Cleaning", target: "Wajib" },
  { label: "Checklist Serah Terima", target: "Lengkap" },
  { label: "BAST", target: "Generated" },
  { label: "Dokumentasi", target: "Wajib" },
];

export default function SerahTerima() {
  const { data: handovers } = useListHandovers({});

  const total = handovers?.length ?? 0;
  const bast = handovers?.filter((h) => h.bastGenerated).length ?? 0;
  const avgScore =
    handovers && handovers.length > 0
      ? (
          handovers.reduce((sum, h) => sum + (h.skorKepuasan ?? 0), 0) /
          handovers.length
        ).toFixed(1)
      : "-";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Serah Terima
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Final QC · Cleaning · BAST · Serah Kunci · Dokumentasi
        </p>
      </div>

      <div className="bg-card border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wider">TAHAP SERAH TERIMA (SOP)</span>
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
          { label: "Total Handover", value: total, color: "text-foreground", icon: Key },
          { label: "BAST Terbit", value: bast, color: "text-emerald-600", icon: CheckCircle2 },
          { label: "Rata-rata Kepuasan", value: avgScore !== "-" ? `${avgScore}/5` : "–", color: "text-amber-600", icon: Star },
        ].map(({ label, value, color, icon: Icon }) => (
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

      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <Key className="size-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Daftar Serah Terima</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Tanggal", "Unit ID", "Customer ID", "Status BAST", "Skor Kepuasan"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {handovers?.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    {new Date(h.tanggal).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{h.unitId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.customerId}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                        h.bastGenerated
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground border-border/50"
                      )}
                    >
                      {h.bastGenerated ? "Generated" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {h.skorKepuasan ? (
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{h.skorKepuasan} / 5</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {!handovers?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Belum ada data serah terima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
