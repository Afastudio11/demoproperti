import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Landmark, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(num) >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

type ScenarioType = "kpp_baru" | "proyek_baru";

const VERDICT_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  "AMAN": { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-300" },
  "LAYAK": { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-300" },
  "PERLU PERHATIAN": { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-300" },
  "BERISIKO": { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-300" },
  "TIDAK DISARANKAN": { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-300" },
  "TIDAK LAYAK": { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-300" },
};

const KPP_FORM = { projectName: "", nilaiKpp: "", tenorBulan: "", bankTarget: "" };
const PROYEK_FORM = { namaProyek: "", totalInvestasi: "", pendapatanPerTahun: "", biayaPerTahun: "" };

export default function InvestmentExpansion() {
  const qc = useQueryClient();
  const [scenarioType, setScenarioType] = useState<ScenarioType>("kpp_baru");
  const [kppForm, setKppForm] = useState(KPP_FORM);
  const [proyekForm, setProyekForm] = useState(PROYEK_FORM);
  const [scenarioName, setScenarioName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["finance-ekspansi"],
    queryFn: () => fetch("/api/finance/ekspansi").then(r => r.json()),
  });

  async function runAnalysis() {
    setAnalyzing(true);
    setResult(null);
    try {
      const inputData = scenarioType === "kpp_baru" ? kppForm : proyekForm;
      const res = await fetch("/api/finance/ekspansi/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioName: scenarioName || `Skenario ${new Date().toLocaleDateString("id-ID")}`, scenarioType, inputData }),
      });
      const data = await res.json();
      setResult(data);
      qc.invalidateQueries({ queryKey: ["finance-ekspansi"] });
    } finally { setAnalyzing(false); }
  }

  const verdictCfg = result?.aiVerdict ? (VERDICT_CONFIG[result.aiVerdict] ?? VERDICT_CONFIG["PERLU PERHATIAN"]) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Analisis Investasi & Ekspansi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analisis kelayakan keuangan untuk keputusan ekspansi dan investasi baru berbasis AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input panel */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Skenario Analisis</h2>

          {/* Scenario type */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">Jenis Skenario</label>
            <div className="flex gap-2">
              {([
                { key: "kpp_baru", label: "KPP Baru", icon: Landmark },
                { key: "proyek_baru", label: "Proyek Baru", icon: TrendingUp },
              ] as { key: ScenarioType; label: string; icon: any }[]).map(s => {
                const Icon = s.icon;
                return (
                  <button key={s.key} onClick={() => setScenarioType(s.key)}
                    className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors",
                      scenarioType === s.key ? "border-foreground bg-foreground/5 font-medium" : "hover:bg-muted/50")}>
                    <Icon className="size-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenario name */}
          <div>
            <label className="text-xs text-muted-foreground">Nama Skenario</label>
            <input value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="Contoh: KPP Baru SN5 - Juli 2026"
              className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
          </div>

          {/* KPP Baru form */}
          {scenarioType === "kpp_baru" && (
            <div className="space-y-3">
              {[
                { key: "projectName", label: "Proyek yang Akan Didanai", type: "text", placeholder: "SN Residence 5" },
                { key: "nilaiKpp", label: "Nilai KPP yang Diajukan (Rp)", type: "number", placeholder: "5000000000" },
                { key: "tenorBulan", label: "Estimasi Jangka Waktu (bulan)", type: "number", placeholder: "24" },
                { key: "bankTarget", label: "Bank yang Dituju", type: "text", placeholder: "Bank BTN" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <input type={f.type} value={(kppForm as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setKppForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
                </div>
              ))}
            </div>
          )}

          {/* Proyek Baru form */}
          {scenarioType === "proyek_baru" && (
            <div className="space-y-3">
              {[
                { key: "namaProyek", label: "Nama Proyek Baru", type: "text", placeholder: "Roemah Warga Makassar" },
                { key: "totalInvestasi", label: "Estimasi Total Investasi (Rp)", type: "number", placeholder: "10000000000" },
                { key: "pendapatanPerTahun", label: "Estimasi Pendapatan per Tahun (Rp)", type: "number", placeholder: "8000000000" },
                { key: "biayaPerTahun", label: "Estimasi Biaya Operasional per Tahun (Rp)", type: "number", placeholder: "5000000000" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <input type={f.type} value={(proyekForm as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setProyekForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
                </div>
              ))}
            </div>
          )}

          <button onClick={runAnalysis} disabled={analyzing}
            className="w-full bg-foreground text-background text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {analyzing ? (
              <><Clock className="size-4 animate-spin" />Menganalisis dengan AI...</>
            ) : (
              <><TrendingUp className="size-4" />Jalankan Analisis AI</>
            )}
          </button>
        </div>

        {/* Result panel */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Hasil Analisis AI</h2>
          {analyzing && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 10}%` }} />)}
            </div>
          )}
          {!analyzing && !result && (
            <div className="text-center py-12">
              <TrendingUp className="size-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Isi form skenario di sebelah kiri dan klik "Jalankan Analisis AI" untuk mendapatkan rekomendasi strategis berbasis data keuangan terkini.</p>
            </div>
          )}
          {!analyzing && result && verdictCfg && (
            <div className="space-y-4">
              <div className={cn("rounded-xl border p-4 flex items-center gap-3", verdictCfg.bg, verdictCfg.border)}>
                <verdictCfg.icon className={cn("size-8 shrink-0", verdictCfg.color)} />
                <div>
                  <div className={cn("text-2xl font-bold", verdictCfg.color)}>{result.aiVerdict}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Verdict AI untuk skenario ini</div>
                </div>
              </div>
              <div className="space-y-2">
                {(result.aiOutput ?? "").split("\n").filter((l: string) => l.trim() && !["AMAN","LAYAK","TIDAK DISARANKAN","TIDAK LAYAK","PERLU PERHATIAN","BERISIKO"].some(v => l.trim().toUpperCase() === v)).map((line: string, i: number) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className={cn("shrink-0 mt-0.5", verdictCfg.color)}>•</span>
                    <span>{line.replace(/^[-•*\d.]+\s*/, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {analyses.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Riwayat Skenario</h2></div>
          <div className="divide-y">
            {analyses.map((a: any) => {
              const cfg = a.aiVerdict ? (VERDICT_CONFIG[a.aiVerdict] ?? VERDICT_CONFIG["PERLU PERHATIAN"]) : null;
              return (
                <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                  {cfg && <cfg.icon className={cn("size-4 shrink-0 mt-0.5", cfg.color)} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{a.scenarioName}</span>
                      {a.aiVerdict && <span className={cn("text-[10px] font-semibold", cfg?.color)}>{a.aiVerdict}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.scenarioType === "kpp_baru" ? "KPP Baru" : "Proyek Baru"} · {new Date(a.createdAt).toLocaleDateString("id-ID")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
