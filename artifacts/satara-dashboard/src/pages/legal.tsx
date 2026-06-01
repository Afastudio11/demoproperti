import { useListLegalDocuments } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { FileText, Shield, CheckCircle2 } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const KPI_TARGETS = [
  { label: "SHM Clean", target: "Wajib" },
  { label: "Izin Lengkap", target: "Wajib" },
  { label: "Bank Ready", target: "Wajib" },
  { label: "Tidak Sengketa", target: "Wajib" },
  { label: "Bisa Upload Sikumbang", target: "Wajib" },
];

const PERIZINAN = [
  { item: "PKKPR", estimasi: "±Rp5 jt" },
  { item: "SPPL (<1 ha)", estimasi: "±Rp10 jt" },
  { item: "UKL UPL (<5 ha)", estimasi: "±Rp30–40 jt" },
  { item: "AMDAL (>5 ha)", estimasi: "±Rp100–200 jt" },
  { item: "PBG", estimasi: "±Rp325 rb" },
  { item: "SLF", estimasi: "±Rp100 rb" },
];

export default function Legal() {
  const { data: documents } = useListLegalDocuments({});

  const approved = documents?.filter((d) => d.status === "approved").length ?? 0;
  const pending = documents?.filter((d) => d.status === "pending").length ?? 0;
  const total = documents?.length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Legalitas & Perizinan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dokumen legal, status izin, dan bankable tracker
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

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Dokumen", value: total, color: "text-foreground", icon: FileText },
          { label: "Approved", value: approved, color: "text-emerald-600", icon: CheckCircle2 },
          { label: "Pending", value: pending, color: "text-amber-600", icon: Shield },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <FileText className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Dokumen Tracker</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["Tipe Dokumen", "Project ID", "Status", "PIC", "Expiry"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents?.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-sm">{doc.tipeDokumen}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.projectId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                          STATUS_STYLE[doc.status] ??
                            "bg-muted text-muted-foreground border-border/50"
                        )}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.pic || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.expiry || "-"}</td>
                  </tr>
                ))}
                {!documents?.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada dokumen.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <Shield className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Estimasi Biaya Perizinan</h3>
          </div>
          <div className="p-4 space-y-2">
            {PERIZINAN.map((p) => (
              <div key={p.item} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{p.item}</span>
                <span className="text-xs font-semibold text-foreground">{p.estimasi}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
