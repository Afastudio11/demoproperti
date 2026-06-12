import { useQuery, useMutation } from "@tanstack/react-query";
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
  const color = status === "SEHAT" ? "text-emerald-600" : status === "WASPADA" ? "text-amber-500" : "text-red-500";
  const bg = status === "SEHAT" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : status === "WASPADA" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
  const pct = (score / 100) * 180;
  return (
    <div className={cn("rounded-xl border p-5 flex items-center gap-6", bg)}>
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
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1.5">
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
  const status = score >= 80 ? "SEHAT" : score >= 60 ? "WASPADA" : "KRITIS";
  const alerts: any[] = data?.alerts ?? [];

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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Finance & Accounting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Satara Finance & Accounting Intelligence System (SFAIS)</p>
        </div>
        <Link href="/finance/upload">
          <button className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Upload className="size-3.5" />
            Upload Data
          </button>
        </Link>
      </div>

      {/* Row 4 — AI Recommendation */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
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
          <p className="text-sm text-muted-foreground">Klik "Refresh Analisis" untuk mendapatkan rekomendasi AI berdasarkan kondisi keuangan terkini.</p>
        )}
      </div>

      {/* Row 5 — Early Warning Alerts */}
      <div className="rounded-xl border bg-card p-4">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Cashflow Center", path: "/finance/cashflow" },
          { label: "KPP Tracker", path: "/finance/kpp" },
          { label: "Kredit & Investment", path: "/finance/hutang" },
          { label: "Approval Subkon", path: "/finance/approval" },
          { label: "Akad Cair", path: "/finance/akad-cair" },
          { label: "Audit Center", path: "/finance/audit" },
        ].map(item => (
          <Link key={item.path} href={item.path}>
            <div className="rounded-lg border bg-card p-3 text-center text-sm hover:bg-muted/50 transition-colors cursor-pointer">
              {item.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
