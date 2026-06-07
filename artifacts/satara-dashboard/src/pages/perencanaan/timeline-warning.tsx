import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function daysDiff(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function statusInfo(days: number | null) {
  if (days === null) return { label: "Tidak ada target", color: "text-muted-foreground", bg: "", icon: null };
  if (days < 0) return { label: `Terlambat ${Math.abs(days)} hari`, color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertTriangle };
  if (days <= 7) return { label: `Jatuh tempo ${days} hari lagi`, color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: Clock };
  if (days <= 30) return { label: `${days} hari tersisa`, color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock };
  return { label: `${days} hari tersisa`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle };
}

export default function TimelineWarningPage() {
  const { data: milestones = [], isLoading } = useQuery<any[]>({
    queryKey: ["planning-milestones"],
    queryFn: () => fetch("/api/planning/milestones").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const warnings = (milestones as any[]).map(m => {
    const project = (projects as any[]).find(p => p.id === m.projectId);
    const days = daysDiff(m.targetDate);
    const info = statusInfo(days);
    return { ...m, projectName: project?.nama ?? "-", days, info };
  }).filter(m => m.days === null || m.days <= 30).sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const overdue = warnings.filter(w => (w.days ?? 0) < 0);
  const dueThisWeek = warnings.filter(w => w.days !== null && w.days >= 0 && w.days <= 7);
  const dueThisMonth = warnings.filter(w => w.days !== null && w.days > 7 && w.days <= 30);

  const allMilestones = (milestones as any[]).map(m => {
    const project = (projects as any[]).find(p => p.id === m.projectId);
    const days = daysDiff(m.targetDate);
    return { ...m, projectName: project?.nama ?? "-", days, info: statusInfo(days) };
  }).sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/perencanaan/timeline"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
        <div>
          <h1 className="text-lg font-semibold">Early Warning System</h1>
          <p className="text-xs text-muted-foreground">Milestone yang akan jatuh tempo atau sudah terlambat</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Terlambat", count: overdue.length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Jatuh Tempo 7 Hari", count: dueThisWeek.length, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          { label: "Jatuh Tempo 30 Hari", count: dueThisMonth.length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        ].map(({ label, count, color, bg }) => (
          <Card key={label} className={cn("border", count > 0 ? bg : "")}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-2xl font-bold mt-1", count > 0 ? color : "text-muted-foreground")}>{count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">milestone</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="size-4" />Milestone Terlambat ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-red-50/50">
                  {["Proyek","Milestone","Fase","Target","Keterlambatan","Status Terakhir"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-red-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdue.map(m => (
                  <tr key={m.id} className="border-b bg-red-50/30 hover:bg-red-50/50">
                    <td className="px-3 py-2 font-medium">{m.projectName}</td>
                    <td className="px-3 py-2">{m.milestone}</td>
                    <td className="px-3 py-2">{m.phase}</td>
                    <td className="px-3 py-2 text-red-600">{m.targetDate}</td>
                    <td className="px-3 py-2 font-semibold text-red-700">{Math.abs(m.days)} hari</td>
                    <td className="px-3 py-2">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {dueThisWeek.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
              <Clock className="size-4" />Jatuh Tempo Minggu Ini ({dueThisWeek.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Proyek","Milestone","Target","Sisa Hari","Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dueThisWeek.map(m => (
                  <tr key={m.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{m.projectName}</td>
                    <td className="px-3 py-2">{m.milestone}</td>
                    <td className="px-3 py-2">{m.targetDate}</td>
                    <td className="px-3 py-2 font-semibold text-orange-600">{m.days} hari</td>
                    <td className="px-3 py-2">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Semua Milestone (Diurutkan berdasarkan Urgensi)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-xs">Memuat...</div>
          ) : allMilestones.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">Belum ada milestone. Input di menu Timeline SPTIS.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Proyek","Milestone","Fase","Target","Status","Keterangan"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allMilestones.map(m => {
                  const { label, color, bg, icon: Icon } = m.info;
                  return (
                    <tr key={m.id} className={cn("border-b hover:bg-muted/30", bg ? bg + "/30" : "")}>
                      <td className="px-3 py-2 font-medium">{m.projectName}</td>
                      <td className="px-3 py-2">{m.milestone}</td>
                      <td className="px-3 py-2">{m.phase}</td>
                      <td className="px-3 py-2">{m.targetDate ?? "-"}</td>
                      <td className="px-3 py-2">{m.status}</td>
                      <td className="px-3 py-2">
                        <span className={cn("flex items-center gap-1 text-[10px] font-medium", color)}>
                          {Icon && <Icon className="size-3" />}
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
