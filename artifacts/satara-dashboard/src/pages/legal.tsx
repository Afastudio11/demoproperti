import { useListLegalDocuments } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { FileText, Shield } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export default function Legal() {
  const { data: documents } = useListLegalDocuments({});

  const approved = documents?.filter((d) => d.status === "approved").length ?? 0;
  const pending = documents?.filter((d) => d.status === "pending").length ?? 0;
  const total = documents?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Legal & Perizinan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dokumen tracker dan bankable status
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Dokumen", value: total, color: "text-foreground" },
          { label: "Approved", value: approved, color: "text-emerald-400" },
          { label: "Pending", value: pending, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card text-card-foreground rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{label}</span>
              <Shield className="size-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3">
              <span className={cn("text-2xl font-semibold tracking-tight", color)}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
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
    </div>
  );
}
