import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  if (n === 0) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function BestBadge() {
  return <span className="ml-1 text-[9px] font-bold bg-emerald-500 text-white px-1 py-0.5 rounded">TERBAIK</span>;
}

export default function BankPerformancePage() {
  const { data: performance = [], isLoading } = useQuery({
    queryKey: ["bank-performance"],
    queryFn: () => fetch("/api/administrasi/bank-performance").then(r => r.json()),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-8 text-center">Memuat...</div>;

  const banks: any[] = performance;
  const bestOts = Math.max(...banks.map(b => b.otsSuccess), 0);
  const bestSp3k = Math.max(...banks.map(b => b.sp3kRate), 0);
  const bestAkad = Math.max(...banks.map(b => b.akadRate), 0);
  const bestHt = Math.max(...banks.map(b => b.totalHt), 0);
  const bestLag = banks.length > 0 ? Math.min(...banks.filter(b => b.avgLag > 0).map(b => b.avgLag), 999) : 999;

  const COLS = [
    { label: "Bank", render: (b: any) => <span className="font-semibold">{b.bank}</span> },
    { label: "Total Setor", render: (b: any) => b.totalSetor },
    { label: "OTS Done", render: (b: any) => b.totalOts },
    { label: "OTS Success %", render: (b: any) => (
      <span className={cn("font-semibold", b.otsSuccess === bestOts && bestOts > 0 ? "text-emerald-600" : "")}>
        {b.otsSuccess}%{b.otsSuccess === bestOts && bestOts > 0 && <BestBadge />}
      </span>
    )},
    { label: "SP3K Approved", render: (b: any) => b.totalSp3k },
    { label: "SP3K Rate %", render: (b: any) => (
      <span className={cn("font-semibold", b.sp3kRate === bestSp3k && bestSp3k > 0 ? "text-emerald-600" : "")}>
        {b.sp3kRate}%{b.sp3kRate === bestSp3k && bestSp3k > 0 && <BestBadge />}
      </span>
    )},
    { label: "Total Akad", render: (b: any) => b.totalAkad },
    { label: "Akad Rate %", render: (b: any) => (
      <span className={cn("font-semibold", b.akadRate === bestAkad && bestAkad > 0 ? "text-emerald-600" : "")}>
        {b.akadRate}%{b.akadRate === bestAkad && bestAkad > 0 && <BestBadge />}
      </span>
    )},
    { label: "Total HT (Rp)", render: (b: any) => (
      <span className={cn("font-semibold", b.totalHt === bestHt && bestHt > 0 ? "text-emerald-600" : "")}>
        {fmtRp(b.totalHt)}{b.totalHt === bestHt && bestHt > 0 && <BestBadge />}
      </span>
    )},
    { label: "Avg Lag (hari)", render: (b: any) => (
      <span className={cn("font-semibold", b.avgLag > 0 && b.avgLag === bestLag ? "text-emerald-600" : "")}>
        {b.avgLag > 0 ? `${b.avgLag} hr` : "-"}{b.avgLag > 0 && b.avgLag === bestLag && <BestBadge />}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bank Performance</h1>
        <p className="text-sm text-muted-foreground">Evaluasi performa masing-masing bank mitra — data otomatis dari semua modul</p>
      </div>

      {banks.length === 0 ? (
        <div className="bg-card border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Belum ada data. Isi data Bank Submission, OTS, SP3K, Akad, dan HT terlebih dahulu.
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {COLS.map(c => (
                    <th key={c.label} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {banks.map((b: any) => (
                  <tr key={b.bank} className="border-b last:border-0 hover:bg-muted/20">
                    {COLS.map(c => (
                      <td key={c.label} className="px-3 py-3">{c.render(b)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rekomendasi</div>
        {banks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data untuk analisis.</p>
        ) : (() => {
          const topBank = banks.reduce((a, b) => {
            const scoreA = (a.sp3kRate ?? 0) + (a.akadRate ?? 0) - (a.avgLag ?? 0) / 10;
            const scoreB = (b.sp3kRate ?? 0) + (b.akadRate ?? 0) - (b.avgLag ?? 0) / 10;
            return scoreB > scoreA ? b : a;
          }, banks[0]);
          return (
            <p className="text-sm">
              Berdasarkan SP3K rate, akad rate, dan kecepatan proses, bank terbaik saat ini adalah{" "}
              <strong className="text-emerald-600">{topBank.bank}</strong> dengan SP3K rate {topBank.sp3kRate}% dan akad rate {topBank.akadRate}%.
              Prioritaskan customer ke bank ini untuk hasil terbaik.
            </p>
          );
        })()}
      </div>
    </div>
  );
}
