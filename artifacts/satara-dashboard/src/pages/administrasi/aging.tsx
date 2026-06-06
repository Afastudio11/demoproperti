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

export default function AgingPage() {
  const [filter, setFilter] = useState<"all" | "warning" | "kritis">("all");

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
    kritis: "bg-red-50/60 border-l-2 border-l-red-500",
  };

  const AGING_BADGE: Record<string, string> = {
    normal: "bg-emerald-100 text-emerald-700",
    warning: "bg-yellow-100 text-yellow-700",
    kritis: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Aging Pipeline</h1>
          <p className="text-sm text-muted-foreground">Deteksi customer yang macet di satu status terlalu lama</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Warning", value: data?.totalWarning ?? 0, color: "text-yellow-600", desc: "macet 7–30 hari" },
          { label: "Kritis", value: data?.totalKritis ?? 0, color: "text-red-600", desc: "macet >30 hari" },
          { label: "HT Tertahan", value: fmtRp(data?.totalHtTertahan ?? 0), color: "text-amber-600", desc: "total nilai HT macet" },
        ].map(({ label, value, color, desc }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className={cn("text-xl font-semibold", color)}>{value}</div>
            <div className="text-[10px] text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {[
          { key: "all", label: "Semua" },
          { key: "warning", label: "Warning" },
          { key: "kritis", label: "Kritis" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
              filter === f.key ? "bg-foreground text-background border-foreground" : "bg-muted hover:bg-muted/80")}>
            {f.label}
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
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  {filter === "all" ? "Tidak ada customer dalam pipeline aktif." : `Tidak ada customer dengan level ${filter}.`}
                </td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className={cn("border-b last:border-0", AGING_ROW[c.agingLevel ?? "normal"])}>
                  <td className="px-3 py-2.5 font-medium">{c.nama}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{c.unitBlock ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{c.bank ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.picAdmin ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{STATUS_LABELS[c.pipelineStatus ?? ""] ?? c.pipelineStatus ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {c.statusUpdatedAt ? new Date(c.statusUpdatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{c.aging} hari</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase", AGING_BADGE[c.agingLevel ?? "normal"])}>
                      {c.agingLevel}
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
