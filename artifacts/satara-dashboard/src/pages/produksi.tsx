import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HardHat, TrendingUp, Package, DollarSign, Activity, AlertTriangle,
  CheckSquare, Building2, ChevronRight, Users, BarChart3, Shield, Key
} from "lucide-react";

const fmtRp = (n: number) => `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
const fmtPct = (n: number) => `${Math.round(n)}%`;

function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function KpiCard({ title, value, sub, icon: Icon, color = "text-primary", linkTo }: {
  title: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; color?: string; linkTo?: string;
}) {
  const inner = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold mt-0.5 leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-md bg-muted/50 ${color}`}><Icon className="size-4" /></div>
        </div>
      </CardContent>
    </Card>
  );
  return linkTo ? <Link href={linkTo}>{inner}</Link> : inner;
}

export default function Produksi() {
  const { data, isLoading } = useQuery({
    queryKey: ["produksi-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        summary: { avgProgress: number; activeUnits: number; totalUnits: number; fasumAvg: number; pendingTotal: number; totalMatOut: number; healthScore: number };
        subkonSnapshot: { id: number; subkonName: string; unitCount: number; progressAktual: number; velocity: number; status: string }[];
        criticalMaterials: { id: number; name: string; stokAktual: number; minimumStock: number; satuan: string }[];
        alerts: { type: string; message: string; severity: string }[];
        htTertahan: number; sp3kCount: number;
      }>;
    },
    refetchInterval: 30000,
  });

  const s = data?.summary;
  const healthScore = s?.healthScore ?? 0;
  const healthColor = healthScore >= 80 ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" : healthScore >= 60 ? "text-amber-500 border-amber-500/30 bg-amber-500/5" : "text-red-500 border-red-500/30 bg-red-500/5";

  const quickLinks = [
    { name: "Progress Unit", path: "/produksi/progress/unit", icon: CheckSquare },
    { name: "Termin Bayar", path: "/produksi/subkon/termin", icon: DollarSign },
    { name: "Stok Material", path: "/produksi/material/stok", icon: Package },
    { name: "QC Checklist", path: "/produksi/qc/checklist", icon: Shield },
    { name: "Ready Akad", path: "/produksi/ready-akad", icon: Key },
    { name: "Fasum", path: "/produksi/fasum", icon: Building2 },
    { name: "Analitik", path: "/produksi/analitik/velocity", icon: BarChart3 },
    { name: "Health Score", path: "/produksi/health", icon: Activity },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Produksi</h1>
        <p className="text-sm text-muted-foreground">Monitoring konstruksi, subkon, material, dan QC secara real-time</p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {quickLinks.map(ql => (
          <Link key={ql.path} href={ql.path}>
            <div className="rounded-md border p-2.5 flex flex-col items-center gap-1.5 hover:bg-muted/50 transition-colors cursor-pointer text-center">
              <ql.icon className="size-4 text-primary" />
              <span className="text-[10px] leading-tight text-muted-foreground">{ql.name}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Snapshot Subkon</CardTitle>
              <Link href="/produksi/subkon/performa" className="text-xs text-muted-foreground flex items-center gap-0.5">Lihat semua <ChevronRight className="size-3" /></Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Memuat...</div>
            ) : (data?.subkonSnapshot?.length ?? 0) === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">
                Belum ada kontrak. <Link href="/produksi/subkon/kontrak" className="underline">Tambah kontrak</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data!.subkonSnapshot.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3">
                    <div className="w-24 truncate text-xs font-medium">{sub.subkonName}</div>
                    <div className="flex-1"><ProgressBar value={sub.progressAktual} color={sub.progressAktual >= 95 ? "bg-emerald-500" : sub.progressAktual >= 70 ? "bg-amber-500" : "bg-red-500"} /></div>
                    <span className="text-xs tabular-nums w-10 text-right">{fmtPct(sub.progressAktual)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub.status === "selesai" ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"}`}>{sub.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Alert & Eskalasi</CardTitle></CardHeader>
            <CardContent>
              {(data?.alerts?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Tidak ada alert aktif</p>
              ) : (
                <div>
                  {data!.alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                      <AlertTriangle className={`size-3.5 shrink-0 mt-0.5 ${a.severity === "error" ? "text-red-500" : a.severity === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                      <span className="text-xs">{a.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Material Kritis</CardTitle>
                <Link href="/produksi/material/stok" className="text-xs text-muted-foreground flex items-center gap-0.5">Detail <ChevronRight className="size-3" /></Link>
              </div>
            </CardHeader>
            <CardContent>
              {(data?.criticalMaterials?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Stok aman</p>
              ) : (
                <div className="space-y-1.5">
                  {data!.criticalMaterials.map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{m.name}</span>
                      <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">{m.stokAktual}/{m.minimumStock} {m.satuan}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
