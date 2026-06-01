import { useListCustomers, useGetKprPipeline } from "@workspace/api-client-react";
import { Users, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const KPR_STATUS: Record<string, string> = {
  pengajuan: "bg-amber-50 text-amber-700 border-amber-200",
  verifikasi_berkas: "bg-blue-50 text-blue-700 border-blue-200",
  appraisal: "bg-violet-50 text-violet-700 border-violet-200",
  sp3k: "bg-cyan-50 text-cyan-700 border-cyan-200",
  akad_kredit: "bg-emerald-50 text-emerald-700 border-emerald-200",
  realisasi: "bg-lime-50 text-lime-700 border-lime-200",
  ditolak: "bg-red-50 text-red-600 border-red-200",
  batal: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const KPI_TARGETS = [
  { label: "Kelengkapan Berkas", target: "100%" },
  { label: "Speed Proses", target: "Cepat" },
  { label: "Reject Rate", target: "Rendah" },
  { label: "Pipeline Update", target: "Harian" },
];

export default function Administrasi() {
  const { data: customers } = useListCustomers({});
  const { data: pipeline } = useGetKprPipeline({});

  const berkasLengkap = customers?.filter((c) => c.berkasLengkap).length ?? 0;
  const totalCustomers = customers?.length ?? 1;
  const berkasRate = Math.round((berkasLengkap / totalCustomers) * 100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Administrasi KPR
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customer database, kelengkapan berkas, dan KPR pipeline tracker
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
              <span className="text-xs font-semibold text-foreground">{k.target}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Customer KPR",
            value: pipeline?.total ?? 0,
            icon: Users,
            color: "text-foreground",
            note: null,
          },
          {
            label: "Berkas Lengkap",
            value: `${berkasRate}%`,
            icon: CheckCircle2,
            color: berkasRate === 100 ? "text-emerald-600" : "text-amber-600",
            note: "target 100%",
          },
          {
            label: "Reject Rate",
            value: `${pipeline?.rejectRate ?? 0}%`,
            icon: XCircle,
            color: (pipeline?.rejectRate ?? 0) > 20 ? "text-red-500" : "text-foreground",
            note: "target rendah",
          },
          {
            label: "Avg. Approval",
            value: `${pipeline?.avgDuration ?? 0} Hari`,
            icon: Clock,
            color: "text-cyan-600",
            note: null,
          },
        ].map(({ label, value, icon: Icon, color, note }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 border rounded-lg p-3">
              <span className={cn("text-2xl font-semibold tracking-tight", color)}>{value}</span>
              {note && <div className="text-[10px] text-muted-foreground mt-1">{note}</div>}
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
                      {c.statusKpr.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                      c.berkasLengkap
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200"
                    )}>
                      {c.berkasLengkap ? "Lengkap" : "Kurang"}
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
