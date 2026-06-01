import { useListCustomers, useGetKprPipeline } from "@workspace/api-client-react";
import { Users, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const KPR_STATUS: Record<string, string> = {
  pengajuan: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  verifikasi_berkas: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  appraisal: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  sp3k: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  akad_kredit: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  realisasi: "bg-lime-500/15 text-lime-400 border-lime-500/30",
  ditolak: "bg-red-500/15 text-red-400 border-red-500/30",
  batal: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export default function Administrasi() {
  const { data: customers } = useListCustomers({});
  const { data: pipeline } = useGetKprPipeline({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Administrasi KPR
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customer database dan KPR pipeline tracker
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Customer KPR", value: pipeline?.total ?? 0, icon: Users, color: "text-foreground" },
          { label: "Reject Rate", value: `${pipeline?.rejectRate ?? 0}%`, icon: XCircle, color: "text-pink-400" },
          { label: "Avg. Approval", value: `${pipeline?.avgDuration ?? 0} Hari`, icon: Clock, color: "text-cyan-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3">
              <span className={cn("text-2xl font-semibold tracking-tight", color)}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <Users className="size-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Customer Database</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Nama", "Unit ID", "Kontak", "Bank", "Status KPR", "Berkas"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers?.map((c) => (
                <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.nama}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.unitId ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.kontak}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.bank ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize",
                      KPR_STATUS[c.statusKpr] ?? "bg-muted text-muted-foreground border-border/50"
                    )}>
                      {c.statusKpr.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                      c.berkasLengkap
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border/50"
                    )}>
                      {c.berkasLengkap ? "Lengkap" : "Incomplete"}
                    </span>
                  </td>
                </tr>
              ))}
              {!customers?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Tidak ada customer.
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
