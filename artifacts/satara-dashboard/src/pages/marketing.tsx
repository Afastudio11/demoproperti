import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp, Users, Target, DollarSign, BarChart3, Eye,
  Megaphone, AlertTriangle, Clock, Package, Star, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtRp(n: number) { return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", notation:"compact", maximumFractionDigits:1 }).format(n); }

const FUNNEL_STAGES = [
  { key: "NEW_LEAD", label: "New Lead", color: "bg-blue-500" },
  { key: "CONTACTED", label: "Contacted", color: "bg-cyan-500" },
  { key: "INTERESTED", label: "Interested", color: "bg-purple-500" },
  { key: "SURVEY_DIJADWALKAN", label: "Survey Plan", color: "bg-amber-500" },
  { key: "SURVEY_DILAKUKAN", label: "Survey Done", color: "bg-yellow-500" },
  { key: "BOOKING", label: "Booking", color: "bg-emerald-500" },
  { key: "BERKAS_LENGKAP", label: "Berkas", color: "bg-green-600" },
];

const SCORE_COLOR = (s: number) => s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : "text-red-600";
const SCORE_BG = (s: number) => s >= 80 ? "bg-emerald-50 border-emerald-200" : s >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

export default function Marketing() {
  const [funnelFilter, setFunnelFilter] = useState("");

  const { data: dashboard, isLoading } = useQuery<any>({
    queryKey: ["marketing-dashboard"],
    queryFn: () => fetch("/api/marketing/dashboard").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const kpi11 = [
    { label: "Branding Score", value: dashboard?.brandingScore ?? 0, fmt: (v: number) => `${v}`, icon: Star, link: "/marketing/branding", desc: "Media sosial" },
    { label: "Leads Bulan Ini", value: dashboard?.totalLeads ?? 0, fmt: (v: number) => String(v), icon: Users, link: "/marketing/lead", desc: "lead baru" },
    { label: "Cost per Lead", value: dashboard?.cpl ?? 0, fmt: fmtRp, icon: DollarSign, link: "/marketing/campaign", desc: "per lead", alert: (dashboard?.cpl ?? 0) > 25000 },
    { label: "Survey", value: dashboard?.surveyCount ?? 0, fmt: (v: number) => String(v), icon: Eye, link: "/marketing/lead", desc: "lead survey" },
    { label: "Booking", value: dashboard?.bookingCount ?? 0, fmt: (v: number) => String(v), icon: Target, link: "/marketing/lead", desc: "lead booking" },
    { label: "Berkas", value: dashboard?.berkasCount ?? 0, fmt: (v: number) => String(v), icon: BarChart3, link: "/marketing/lead", desc: "berkas lengkap" },
    { label: "Absorption Rate", value: dashboard?.absorptionRate ?? 0, fmt: (v: number) => `${v}%`, icon: TrendingUp, link: "/marketing/absorption", desc: "unit terjual" },
    { label: "Demand Score", value: dashboard?.demandScore ?? 0, fmt: (v: number) => String(v), icon: BarChart3, link: "/marketing/demand-score", desc: "skor pasar" },
    { label: "Coverage Stok", value: dashboard?.coverageMonths ?? 0, fmt: (v: number) => `${v} bln`, icon: Package, link: "/marketing/stock", desc: "stok tersedia", alert: (dashboard?.coverageMonths ?? 0) < 3 },
    { label: "Forecast Bulan Depan", value: dashboard?.forecastNextMonth ?? 0, fmt: (v: number) => String(v), icon: Megaphone, link: "/marketing/forecast", desc: "prediksi booking" },
    { label: "Marketing Health", value: dashboard?.healthScore ?? 0, fmt: (v: number) => `${v}/100`, icon: Heart, link: "/marketing/health", desc: "kesehatan marketing" },
  ];

  const funnelData = dashboard?.funnel ?? FUNNEL_STAGES.map(s => ({ status: s.key, count: 0 }));
  const maxCount = Math.max(...funnelData.map((f: any) => f.count), 1);

  const topSales = dashboard?.topSales ?? [];
  const absorptionSummary = dashboard?.absorptionSummary ?? [];
  const alerts = dashboard?.alerts ?? {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Marketing Command Center</h1>
          <p className="text-xs text-muted-foreground">Dashboard operasional marketing real estate</p>
        </div>
      </div>

      {/* Alerts */}
      {(alerts.uncontacted > 0 || alerts.stagnan > 0 || alerts.lowCoverage) && (
        <div className="space-y-2">
          {alerts.uncontacted > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-600 shrink-0" />
              <span className="text-xs text-red-700">
                <strong>{alerts.uncontacted}</strong> lead baru belum dicontact lebih dari 10 menit
                <Link href="/marketing/lead?status=NEW_LEAD" className="ml-2 underline">Lihat sekarang</Link>
              </span>
            </div>
          )}
          {alerts.stagnan > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 flex items-center gap-2">
              <Clock className="size-4 text-yellow-600 shrink-0" />
              <span className="text-xs text-yellow-700">
                <strong>{alerts.stagnan}</strong> lead stagnan lebih dari 7 hari tanpa update
                <Link href="/marketing/lead" className="ml-2 underline">Tindak lanjuti</Link>
              </span>
            </div>
          )}
          {alerts.lowCoverage && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 flex items-center gap-2">
              <Package className="size-4 text-orange-600 shrink-0" />
              <span className="text-xs text-orange-700">
                Coverage stok &lt; 3 bulan — segera planning launching tahap berikutnya
                <Link href="/marketing/stock" className="ml-2 underline">Cek stok</Link>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 11 KPI Cards */}
      <div className="grid grid-cols-4 gap-3 xl:grid-cols-6">
        {kpi11.map(({ label, value, fmt, icon: Icon, link, desc, alert }) => (
          <Link key={label} href={link}>
            <div className={cn(
              "rounded-xl border p-3 bg-card cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all",
              alert ? "border-red-300 bg-red-50/40" : ""
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground leading-tight font-medium">{label}</span>
                <Icon className={cn("size-3.5 shrink-0", alert ? "text-red-500" : "text-muted-foreground")} />
              </div>
              <div className={cn("bg-muted/50 rounded-lg p-2")}>
                <div className={cn("text-lg font-semibold tracking-tight", alert ? "text-red-600" : "", label === "Marketing Health" ? SCORE_COLOR(value) : "")}>
                  {fmt(value)}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Lead Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Lead Funnel
              <Link href="/marketing/lead" className="text-[10px] text-primary hover:underline font-normal">Lihat semua</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FUNNEL_STAGES.map(stage => {
              const stageData = funnelData.find((f: any) => f.status === stage.key);
              const count = stageData?.count ?? 0;
              const pct = Math.round(count / maxCount * 100);
              return (
                <Link key={stage.key} href={`/marketing/lead?status=${stage.key}`}>
                  <div className="flex items-center gap-3 hover:bg-muted/30 rounded px-1 py-1 transition-colors cursor-pointer">
                    <div className="w-28 text-[10px] text-muted-foreground shrink-0">{stage.label}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full">
                      <div className={cn("h-full rounded-full", stage.color)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-xs font-semibold text-right">{count}</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Sales Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Top Sales Bulan Ini
              <Link href="/marketing/sales" className="text-[10px] text-primary hover:underline font-normal">Lihat semua</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSales.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Belum ada data PIC Sales di lead</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 text-left text-muted-foreground font-medium">Sales</th>
                    <th className="py-1.5 text-right text-muted-foreground font-medium">Leads</th>
                    <th className="py-1.5 text-right text-muted-foreground font-medium">Booking</th>
                    <th className="py-1.5 text-right text-muted-foreground font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topSales.map((s: any, i: number) => (
                    <tr key={s.nama} className="border-b last:border-0">
                      <td className="py-1.5 font-medium">{s.nama}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{s.leads}</td>
                      <td className="py-1.5 text-right font-semibold text-emerald-600">{s.booking}</td>
                      <td className="py-1.5 text-right">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium",
                          s.productivity >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          s.productivity >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-muted text-muted-foreground border-border")}>
                          {s.productivity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Absorption Summary */}
      {absorptionSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Project Absorption Summary
              <Link href="/marketing/absorption" className="text-[10px] text-primary hover:underline font-normal">Detail</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Proyek","Tahap","Total Unit","Terjual","Sisa","Absorption Rate","Coverage"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {absorptionSummary.map((a: any) => (
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{a.projectName}</td>
                    <td className="px-3 py-2">{a.tahap}</td>
                    <td className="px-3 py-2">{a.totalUnit}</td>
                    <td className="px-3 py-2">{a.unitTerjual}</td>
                    <td className="px-3 py-2">{a.sisa}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 bg-muted rounded-full">
                          <div className={cn("h-full rounded-full", (a.absorptionRate ?? 0) >= 70 ? "bg-emerald-500" : (a.absorptionRate ?? 0) >= 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${a.absorptionRate ?? 0}%` }} />
                        </div>
                        <span className={cn("font-medium", (a.absorptionRate ?? 0) >= 70 ? "text-emerald-600" : (a.absorptionRate ?? 0) >= 40 ? "text-amber-600" : "text-red-600")}>{a.absorptionRate}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border",
                        a.coverageMonths < 3 ? "bg-red-50 text-red-700 border-red-200" :
                        a.coverageMonths < 6 ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                        {a.coverageMonths} bulan
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="py-8 text-center text-muted-foreground text-sm">Memuat data marketing...</div>
      )}
    </div>
  );
}
