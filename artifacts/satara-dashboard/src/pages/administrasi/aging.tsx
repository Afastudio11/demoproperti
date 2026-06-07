import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  MINAT: "Minat", PROSES_BERKAS: "Proses Berkas", BERKAS_LENGKAP: "Berkas Lengkap",
  SETOR_BANK: "Setor Bank", OTS: "OTS", REVISI: "Revisi", SP3K: "SP3K", AKAD: "Akad",
};

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function agingDayColor(days: number) {
  if (days < 7) return "bg-emerald-100 text-emerald-700";
  if (days < 14) return "bg-yellow-100 text-yellow-700";
  if (days < 30) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function AgingPage() {
  const [filter, setFilter] = useState<"all" | "warning" | "oranye" | "kritis">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["aging-pipeline"],
    queryFn: () => fetch("/api/administrasi/aging").then(r => r.json()),
    refetchInterval: 60000,
  });

  const all: any[] = data?.customers ?? [];
  const filtered = filter === "all" ? all : all.filter(c => c.agingLevel === filter);

  const AGING_ROW: Record<string, string> = {
    normal: "",
    warning: "bg-yellow-50/60 border-l-2 border-l-yellow-400",
    oranye: "bg-orange-50/60 border-l-2 border-l-orange-400",
    kritis: "bg-red-50/60 border-l-2 border-l-red-500",
  };

  const AGING_BADGE: Record<string, string> = {
    normal: "bg-emerald-100 text-emerald-700",
    warning: "bg-yellow-100 text-yellow-700",
    oranye: "bg-orange-100 text-orange-700",
    kritis: "bg-red-100 text-red-700",
  };

  const AGING_LABEL: Record<string, string> = {
    normal: "Normal",
    warning: "Warning",
    oranye: "Waspada",
    kritis: "Kritis",
  };

  const totalOranye = all.filter(c => c.agingLevel === "oranye").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Aging Pipeline</h1>
          <p className="text-sm text-muted-foreground">Deteksi customer yang macet di satu status terlalu lama</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Warning", value: data?.totalWarning ?? 0, color: "text-yellow-600", desc: "macet 7–14 hari" },
          { label: "Waspada", value: totalOranye, color: "text-orange-600", desc: "macet 14–30 hari" },
          { label: "Kritis", value: data?.totalKritis ?? 0, color: "text-red-600", desc: "macet >30 hari" },
          { label: "HT Tertahan", value: fmtRp(data?.totalHtTertahan ?? 0), color: "text-amber-600", desc: "total nilai HT macet" },
        ].map(({ label, value, color, desc }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className={cn("text-xl font-bold", color)}>{value}</div>
            <div className="text-[10px] text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted-foreground">Warna aging:</span>
        {[
          { color: "bg-emerald-100 text-emerald-700", label: "Hijau: <7 hari" },
          { color: "bg-yellow-100 text-yellow-700", label: "Kuning: 7–14 hari" },
          { color: "bg-orange-100 text-orange-700", label: "Oranye: 14–30 hari" },
          { color: "bg-red-100 text-red-700", label: "Merah: >30 hari" },
        ].map(({ color, label }) => (
          <span key={label} className={cn("px-2 py-0.5 rounded-md font-medium", color)}>{label}</span>
        ))}
      </div>

      <div className="flex gap-2">
        {(["all", "warning", "oranye", "kritis"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              filter === f ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
            )}
          >
            {f === "all" ? "Semua" : f === "warning" ? "Warning" : f === "oranye" ? "Waspada" : "Kritis"}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Customer", "Blok", "Bank", "PIC", "Status Saat Ini", "Masuk Status", "Hari di Status", "Level", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">Tidak ada customer dalam pipeline aktif.</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", AGING_ROW[c.agingLevel ?? "normal"])}>
                  <td className="px-3 py-2.5 font-medium text-sm">{c.nama}</td>
                  <td className="px-3 py-2.5 text-xs font-mono">{c.unitBlock ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{c.bank ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.picAdmin ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{STATUS_LABELS[c.pipelineStatus ?? ""] ?? c.pipelineStatus}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {c.statusUpdatedAt ? new Date(c.statusUpdatedAt).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-md", agingDayColor(c.aging ?? 0))}>
                      {c.aging ?? 0} hari
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", AGING_BADGE[c.agingLevel ?? "normal"])}>
                      {AGING_LABEL[c.agingLevel ?? "normal"]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <a href={`/administrasi/customer/${c.id}`} className="text-xs text-blue-600 hover:underline">Detail</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
