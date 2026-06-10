import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Shield, CheckCircle2, TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function readinessCls(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

function readinessBg(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function readinessBadge(pct: number) {
  if (pct >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-600 border-red-200";
}

const PERMIT_NAMES = ["KKPR", "SPPL/UKL-UPL/AMDAL", "Persetujuan Siteplan", "PBG", "SLF", "Sikumbang", "Andalalin", "SIPA"];

const STATUS_DOT: Record<string, string> = {
  selesai: "bg-emerald-500",
  dalam_proses: "bg-blue-400",
  belum_diajukan: "bg-zinc-300",
  tidak_diperlukan: "bg-zinc-200",
};

const RISK_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STAGE_STATUS_BADGE: Record<string, string> = {
  belum_mulai: "bg-zinc-100 text-zinc-500",
  negosiasi: "bg-blue-50 text-blue-700",
  ajb: "bg-yellow-50 text-yellow-700",
  balik_nama: "bg-yellow-100 text-yellow-800",
  pemecahan_shm: "bg-orange-50 text-orange-700",
  pisah_pbb: "bg-orange-100 text-orange-800",
  siap_bangun: "bg-emerald-50 text-emerald-700",
  selesai: "bg-emerald-100 text-emerald-800",
};

const STAGE_STATUS_LABEL: Record<string, string> = {
  belum_mulai: "Belum Mulai", negosiasi: "Negosiasi", ajb: "AJB",
  balik_nama: "Balik Nama", pemecahan_shm: "Pemecahan SHM",
  pisah_pbb: "Pisah PBB", siap_bangun: "Siap Bangun", selesai: "Selesai",
};

export default function LegalDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["legal-dashboard"],
    queryFn: () => fetch("/api/legal/dashboard").then(r => r.json()),
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Memuat dashboard legal...</div>;

  const { metrics, projectReadiness = [], permitMatrix = {}, projects = [], landReadinessByStage = [], shmByProject = {}, alerts = [], issuesSummary = [] } = data ?? {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Legal & Perizinan</h1>
        <p className="text-sm text-muted-foreground">Legalitas, perizinan, dan SHM seluruh proyek Satara</p>
      </div>

      {/* Panel F — Alerts */}
      {alerts.length > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bottleneck Alerts</span>
          </div>
          {alerts.map((a: any, i: number) => (
            <div key={i} className={cn("flex items-start gap-2 text-xs p-2 rounded-lg",
              a.level === "kritis" ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-800 border border-yellow-200")}>
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Panel A — Legal Readiness per Proyek */}
      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Legal Readiness per Proyek</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {projectReadiness.map((p: any) => (
            <div key={p.projectId} className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold truncate">{p.projectName}</div>
              <div className="flex items-end justify-between">
                <span className={cn("text-xl font-bold", readinessCls(p.legalReadiness))}>{p.legalReadiness}%</span>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", RISK_BADGE[p.riskLevel])}>
                  {p.riskLevel === "high" ? "High Risk" : p.riskLevel === "medium" ? "Medium" : "Low Risk"}
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", readinessBg(p.legalReadiness))} style={{ width: `${p.legalReadiness}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                <span>Izin: {p.permitReadiness}%</span>
                <span>Lahan: {p.landReadiness}%</span>
                <span>SHM: {p.shmReadiness}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel C — Permit Readiness Matrix */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permit Readiness Matrix</span>
          <Link href="/legal/permit"><button className="text-xs text-blue-600 hover:underline flex items-center gap-1">Permit Tracker <ChevronRight className="size-3" /></button></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Izin</th>
                {projects.map((p: any) => <th key={p.id} className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">{p.name.replace("SN Residence", "SN").replace("SN Hills", "Hills")}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMIT_NAMES.map(name => (
                <tr key={name} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-medium">{name}</td>
                  {projects.map((p: any) => {
                    const status = permitMatrix[name]?.[p.id] ?? "belum_diajukan";
                    return (
                      <td key={p.id} className="px-3 py-2 text-center">
                        <span title={status} className={cn("inline-block size-2.5 rounded-full", STATUS_DOT[status] ?? "bg-zinc-300")} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 p-3 border-t text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500 inline-block"/> Selesai</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-blue-400 inline-block"/> Dalam Proses</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-300 inline-block"/> Belum Diajukan</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-200 inline-block"/> Tidak Diperlukan</span>
          </div>
        </div>
      </div>

      {/* Panel D — Land Readiness per Tahap */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Land Readiness per Tahap</span>
          <Link href="/legal/lahan"><button className="text-xs text-blue-600 hover:underline flex items-center gap-1">Land Legal Tracker <ChevronRight className="size-3" /></button></Link>
        </div>
        {landReadinessByStage.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada data tahap lahan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Proyek", "Tahap", "Identitas", "Status", "Progress", "Bottleneck"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {landReadinessByStage.map((s: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs">{s.projectName}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{s.stageCode}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.stageIdentity ?? "-"}</td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", STAGE_STATUS_BADGE[s.stageStatus] ?? "bg-muted")}>{STAGE_STATUS_LABEL[s.stageStatus] ?? s.stageStatus}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", readinessBg(s.progress))} style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className={cn("text-xs font-semibold", readinessCls(s.progress))}>{s.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.bottleneck ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel E — SHM Split Summary */}
      {Object.keys(shmByProject).length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SHM Split Summary</span>
            <Link href="/legal/shm"><button className="text-xs text-blue-600 hover:underline flex items-center gap-1">SHM Tracker <ChevronRight className="size-3" /></button></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Proyek", "Tahap", "Target", "Realisasi", "Sisa", "Progress"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p: any) => {
                  const pd = shmByProject[p.id];
                  if (!pd || pd.stages.length === 0) return null;
                  return pd.stages.map((s: any, i: number) => (
                    <tr key={`${p.id}-${s.stageCode}`} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs">{i === 0 ? p.name : ""}</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{s.stageCode}</td>
                      <td className="px-3 py-2 text-xs">{s.targetSplit}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-emerald-700">{s.realizedSplit}</td>
                      <td className="px-3 py-2 text-xs text-red-600">{s.sisa}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", readinessBg(s.progress))} style={{ width: `${s.progress}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{s.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel G — Legal Risk Summary */}
      {issuesSummary.filter((s: any) => s.issueCount > 0).length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal Risk Summary</span>
            <Link href="/legal/issue"><button className="text-xs text-blue-600 hover:underline flex items-center gap-1">Issue Tracker <ChevronRight className="size-3" /></button></Link>
          </div>
          <div className="space-y-2">
            {issuesSummary.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{s.projectName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.issueCount} isu aktif</span>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", RISK_BADGE[s.riskLevel])}>{s.riskLevel === "high" ? "High" : s.riskLevel === "medium" ? "Medium" : "Low"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
