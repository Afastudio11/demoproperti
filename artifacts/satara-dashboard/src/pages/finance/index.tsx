import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Landmark, Upload, ArrowUpRight, ArrowDownRight, Activity, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  if (Math.abs(n) >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function FinanceGauge({ score, status }: { score: number; status: string }) {
  const color = status === "SEHAT" ? "text-emerald-600" : status === "WASPADA" ? "text-amber-500" : status === "BELUM ADA DATA" ? "text-muted-foreground" : "text-red-500";
  const bg = status === "SEHAT" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : status === "WASPADA" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" : status === "BELUM ADA DATA" ? "bg-muted/30 border-border" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
  const pct = (score / 100) * 180;
  return (
    <div className={cn("rounded-lg border p-4 sm:p-5 flex items-center gap-5", bg)}>
      <div className="relative w-28 h-16 shrink-0">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-muted-foreground/20" />
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(pct / 180) * 125.6} 125.6`}
            className={color} />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <span className={cn("text-2xl font-bold tabular-nums", color)}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div>
        <span className={cn("text-xl font-bold", color)}>{status}</span>
        <p className="text-xs text-muted-foreground mt-0.5">Finance Health Score</p>
        <div className="flex flex-col gap-0.5 mt-2 text-xs text-muted-foreground">
          <span>Likuiditas · Hutang · Cashflow</span>
          <span>Profitabilitas · Kinerja Proyek</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, positive, icon: Icon }: { label: string; value: string; sub?: string; positive?: boolean; icon?: any }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" />}
        {label}
      </div>
      <div className={cn("text-lg font-semibold tabular-nums", positive === true ? "text-emerald-600" : positive === false ? "text-red-500" : "")}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

type ActionTone = "default" | "warning" | "success";

function ActionCard({ title, desc, href, icon: Icon, tone = "default" }: { title: string; desc: string; href: string; icon: any; tone?: ActionTone }) {
  return (
    <Link href={href}>
      <div className={cn(
        "rounded-lg border bg-card p-4 h-full cursor-pointer transition-colors hover:bg-muted/50",
        tone === "warning" && "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
        tone === "success" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold">{title}</div>
            <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
          </div>
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

export default function FinanceDashboard() {
  const [aiRec, setAiRec] = useState<string[] | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: () => fetch("/api/finance/dashboard").then(r => r.json()),
    refetchInterval: 60000,
  });

  const cashIn = data?.cashIn ?? 0;
  const cashOut = data?.cashOut ?? 0;
  const net = data?.netCashflow ?? 0;
  const kpp = data?.outstandingKpp ?? 0;
  const hutangJT = data?.hutangJatuhTempo ?? 0;
  const piutangJT = data?.piutangJatuhTempo ?? 0;
  const score = aiScore ?? data?.financeScore ?? 0;
  const hasFinanceData = cashIn > 0 || cashOut > 0 || kpp > 0 || hutangJT > 0 || piutangJT > 0;
  const status = !hasFinanceData ? "BELUM ADA DATA" : (data?.financeStatus ?? (score >= 80 ? "SEHAT" : score >= 60 ? "WASPADA" : "KRITIS"));
  const alerts: any[] = data?.alerts ?? [];
  const cashRatio = cashOut > 0 ? cashIn / cashOut : cashIn > 0 ? 99 : 0;
  const dueGap = piutangJT - hutangJT;
  const priorityLabel = !hasFinanceData
    ? "Mulai dari upload data cashflow, hutang, piutang, dan RAB."
    : net < 0
      ? "Cash out bulan ini lebih besar dari cash in. Cek kategori pengeluaran dan jadwal tagihan."
      : hutangJT > piutangJT
        ? "Hutang jatuh tempo lebih besar dari piutang tertagih. Prioritaskan rencana pembayaran."
        : "Kondisi kas bulan ini cukup terkendali. Pantau KPP, RAB, dan alert aktif.";
  const actionCards: Array<{ title: string; desc: string; href: string; icon: any; tone: ActionTone }> = [
    { title: "Cashflow", desc: "Lihat arus masuk, keluar, net, dan kategori pengeluaran.", href: "/finance/cashflow", icon: TrendingUp, tone: net >= 0 ? "success" : "warning" },
    { title: "Hutang & KPP", desc: "Pantau kewajiban bank, investor, dan jadwal pelunasan.", href: "/finance/hutang", icon: Landmark, tone: hutangJT > piutangJT ? "warning" : "default" },
    { title: "Approval Subkon", desc: "Validasi pembayaran termin sebelum uang keluar.", href: "/finance/approval", icon: Shield, tone: "default" },
    { title: "Audit & Data Quality", desc: "Cari anomali, data bolong, dan transaksi yang perlu dikoreksi.", href: "/finance/data-quality", icon: AlertTriangle, tone: alerts.length > 0 ? "warning" : "default" },
    { title: "RAB Proyek", desc: "Bandingkan anggaran, realisasi, dan deviasi per proyek.", href: "/finance/rab", icon: Activity, tone: "default" },
    { title: "Piutang", desc: "Lacak tagihan tertagih, belum tertagih, dan jatuh tempo.", href: "/finance/piutang", icon: ArrowDownRight, tone: piutangJT >= hutangJT ? "success" : "default" },
    { title: "Forecast", desc: "Proyeksi kas dan tekanan likuiditas beberapa bulan ke depan.", href: "/finance/forecast", icon: TrendingDown, tone: "default" },
    { title: "Ekspansi", desc: "Uji kelayakan finansial sebelum menambah proyek baru.", href: "/finance/ekspansi", icon: ArrowUpRight, tone: "default" },
  ];

  async function getAiRecommendation() {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/ai-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ netCashflow: net, outstandingKpp: kpp, totalHutang: hutangJT, piutangMacet: 0, marginProyek: 15 }),
      });
      const d = await res.json();
      setAiScore(d.score);
      setAiRec(d.recommendations);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Finance Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kas, kewajiban, piutang, RAB, dan approval dalam satu ruang keputusan.</p>
        </div>
        <Link href="/finance/upload">
          <button className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Upload className="size-3.5" />
            Upload Data
          </button>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(320px,0.9fr)_1.6fr]">
        <FinanceGauge score={isLoading ? 0 : score} status={isLoading ? "BELUM ADA DATA" : status} />
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prioritas Hari Ini</div>
              <p className="mt-1 text-sm font-medium leading-relaxed">{isLoading ? "Memuat ringkasan finance..." : priorityLabel}</p>
            </div>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-[11px] text-muted-foreground">Rasio masuk/keluar</div>
              <div className={cn("mt-1 text-sm font-semibold tabular-nums", cashRatio >= 1 ? "text-emerald-600" : "text-red-500")}>
                {isLoading ? "..." : cashOut > 0 ? `${cashRatio.toFixed(2)}x` : cashIn > 0 ? "Ada cash in" : "Belum ada"}
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-[11px] text-muted-foreground">Selisih piutang - hutang</div>
              <div className={cn("mt-1 text-sm font-semibold tabular-nums", dueGap >= 0 ? "text-emerald-600" : "text-red-500")}>
                {isLoading ? "..." : fmtRp(dueGap)}
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-[11px] text-muted-foreground">Alert aktif</div>
              <div className={cn("mt-1 text-sm font-semibold tabular-nums", alerts.length > 0 ? "text-amber-600" : "text-emerald-600")}>
                {isLoading ? "..." : `${alerts.length} item`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard label="Cash In Bulan Ini" value={isLoading ? "..." : fmtRp(cashIn)} sub="Dana masuk terposting" positive icon={ArrowDownRight} />
        <MetricCard label="Cash Out Bulan Ini" value={isLoading ? "..." : fmtRp(cashOut)} sub="Dana keluar terposting" positive={false} icon={ArrowUpRight} />
        <MetricCard label="Net Cashflow" value={isLoading ? "..." : `${net >= 0 ? "+" : ""}${fmtRp(net)}`} sub="Selisih kas bulan ini" positive={net >= 0} icon={DollarSign} />
        <MetricCard label="KPP Outstanding" value={isLoading ? "..." : fmtRp(kpp)} sub="Fasilitas aktif belum lunas" icon={Landmark} />
        <MetricCard label="Jatuh Tempo 30 Hari" value={isLoading ? "..." : fmtRp(hutangJT)} sub={`Piutang tertagih ${fmtRp(piutangJT)}`} positive={hutangJT <= piutangJT} icon={AlertTriangle} />
      </div>

      {/* AI Recommendation */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold">Rekomendasi AI</h2>
          <button onClick={getAiRecommendation} disabled={loading} className="text-xs px-3 py-1 rounded-md border hover:bg-muted transition-colors disabled:opacity-50">
            {loading ? "Menganalisis..." : "Refresh Analisis"}
          </button>
        </div>
        {aiRec ? (
          <div className="space-y-2">
            {aiRec.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-emerald-600 shrink-0">•</span>
                <span>{r.replace(/^[-•*\d.]+\s*/, "")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{hasFinanceData ? "Klik Refresh Analisis untuk membaca risiko dari kas, KPP, hutang, dan piutang terkini." : "Upload data finance dulu supaya rekomendasi AI tidak sekadar menebak."}</p>
        )}
      </div>

      {/* Early Warning Alerts */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Early Warning Aktif</h2>
          <Link href="/finance/warning">
            <span className="text-xs text-muted-foreground hover:underline">Lihat semua</span>
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Tidak ada peringatan aktif saat ini.</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a: any) => (
              <div key={a.id} className={cn("flex items-start gap-2 rounded-lg p-2.5 text-sm border",
                a.level === "kritis" ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" :
                a.level === "warning" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" :
                "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
              )}>
                <AlertTriangle className={cn("size-3.5 shrink-0 mt-0.5",
                  a.level === "kritis" ? "text-red-500" : a.level === "warning" ? "text-amber-500" : "text-blue-500")} />
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actionCards.map(item => (
          <ActionCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
