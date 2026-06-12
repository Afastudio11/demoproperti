import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

type Issue = { severity: "urgent" | "warning" | "info"; type: string; message: string; entityId?: number | string; module: string };

export default function FinanceDataQuality() {
  const { data, isLoading } = useQuery({
    queryKey: ["data-quality-mismatches"],
    queryFn: () => fetch("/api/data-quality/mismatches").then(r => r.json()) as Promise<{ total: number; urgent: number; warning: number; info: number; issues: Issue[] }>,
  });
  const issues = data?.issues ?? [];
  const icon = (severity: Issue["severity"]) => severity === "urgent" ? <ShieldAlert className="size-4 text-red-500" /> : severity === "warning" ? <AlertTriangle className="size-4 text-amber-500" /> : <Info className="size-4 text-blue-500" />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Data Quality Checker</h1>
        <p className="text-sm text-muted-foreground">Deteksi data yang belum sinkron antar Finance, Administrasi, Produksi, Material, dan Siteplan.</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Issue</p><p className="text-xl font-bold">{data?.total ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Urgent</p><p className="text-xl font-bold text-red-500">{data?.urgent ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Warning</p><p className="text-xl font-bold text-amber-500">{data?.warning ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Info</p><p className="text-xl font-bold text-blue-500">{data?.info ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">{["Level", "Module", "Tipe", "Entity", "Catatan"].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Memuat...</td></tr> : issues.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Tidak ada mismatch utama.</td></tr> : issues.map((issue, idx) => (
                <tr key={`${issue.type}-${issue.entityId ?? idx}`} className="border-b last:border-0">
                  <td className="px-3 py-2"><div className="flex items-center gap-2">{icon(issue.severity)}<span className="capitalize text-xs">{issue.severity}</span></div></td>
                  <td className="px-3 py-2 text-xs">{issue.module}</td>
                  <td className="px-3 py-2 text-xs">{issue.type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-xs">{issue.entityId ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
