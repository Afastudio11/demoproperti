import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Upload, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function Row({ label, value, indent = false, bold = false, positive }: { label: string; value: number; indent?: boolean; bold?: boolean; positive?: boolean }) {
  const color = positive !== undefined ? (positive ? "text-emerald-600" : value >= 0 ? "text-emerald-600" : "text-red-500") : "";
  return (
    <tr className={cn("border-b last:border-0", bold ? "bg-muted/30" : "")}>
      <td className={cn("py-2 text-sm", indent ? "pl-8" : "pl-4 font-medium", bold ? "font-semibold" : "")}>{label}</td>
      <td className={cn("py-2 pr-4 text-right tabular-nums text-sm", bold ? "font-bold" : "", color)}>{fmtRp(value)}</td>
    </tr>
  );
}

type Tab = "labarugi" | "neraca" | "aruskas";

export default function AccountingCenter() {
  const [tab, setTab] = useState<Tab>("labarugi");
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["finance-accounting", year],
    queryFn: () => fetch(`/api/finance/accounting?year=${year}`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const lr = data?.labaRugi;
  const neraca = data?.neraca;
  const arusKas = data?.arusKas;
  const isEmpty = !lr && !isLoading;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Accounting Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Laporan keuangan standar dari data General Ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border rounded-md px-2 py-1.5 bg-background">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Link href="/finance/upload">
            <button className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              <Upload className="size-3.5" />
              Upload GL
            </button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
        {([
          { key: "labarugi", label: "Laba Rugi" },
          { key: "neraca", label: "Neraca" },
          { key: "aruskas", label: "Arus Kas" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("text-sm px-4 py-1.5 rounded-md transition-colors",
              tab === t.key ? "bg-background shadow-sm font-medium" : "hover:bg-background/50 text-muted-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {isEmpty && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data General Ledger belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file GL untuk menghasilkan laporan keuangan otomatis</p>
          <Link href="/finance/upload"><button className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90">Ke Upload Center</button></Link>
        </div>
      )}

      {isLoading && <div className="h-96 rounded-xl border bg-muted/30 animate-pulse" />}

      {/* Laporan Laba Rugi */}
      {tab === "labarugi" && lr && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <FileText className="size-4" />
            <h2 className="text-sm font-semibold">Laporan Laba Rugi — Tahun {year}</h2>
          </div>
          <table className="w-full">
            <tbody>
              <Row label="PENDAPATAN" value={lr.pendapatan} bold />
              <Row label="Pendapatan Penjualan" value={lr.pendapatan} indent />
              <Row label="HARGA POKOK PENJUALAN" value={lr.hpp} bold positive={false} />
              <tr className="border-b bg-muted/50">
                <td className="pl-4 py-2 text-sm font-bold">LABA KOTOR</td>
                <td className={cn("pr-4 py-2 text-right tabular-nums text-sm font-bold", lr.labaKotor >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(lr.labaKotor)}</td>
              </tr>
              <Row label="BEBAN OPERASIONAL" value={lr.bebanOps} bold positive={false} />
              <Row label="Beban Gaji & SDM" value={lr.bebanOps * 0.4} indent />
              <Row label="Beban Marketing" value={lr.bebanOps * 0.2} indent />
              <Row label="Beban Operasional Lain" value={lr.bebanOps * 0.4} indent />
              <tr className="border-b bg-muted/50">
                <td className="pl-4 py-2 text-sm font-bold">LABA OPERASIONAL</td>
                <td className={cn("pr-4 py-2 text-right tabular-nums text-sm font-bold", lr.labaOps >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(lr.labaOps)}</td>
              </tr>
              <Row label="Pajak (25%)" value={lr.pajak} indent positive={false} />
              <tr className="bg-emerald-50 dark:bg-emerald-950/20">
                <td className="pl-4 py-3 text-sm font-bold">LABA BERSIH</td>
                <td className={cn("pr-4 py-3 text-right tabular-nums text-base font-bold", lr.labaBersih >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(lr.labaBersih)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Neraca */}
      {tab === "neraca" && neraca && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b"><h2 className="text-sm font-semibold">Aset</h2></div>
            <table className="w-full">
              <tbody>
                <tr className="border-b bg-muted/30"><td className="pl-4 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}>Aset Lancar</td></tr>
                <Row label="Kas & Bank" value={neraca.kasBank} indent />
                <Row label="Piutang Usaha" value={neraca.piutang} indent />
                <Row label="Total Aset" value={neraca.totalAset} bold />
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b"><h2 className="text-sm font-semibold">Kewajiban & Ekuitas</h2></div>
            <table className="w-full">
              <tbody>
                <tr className="border-b bg-muted/30"><td className="pl-4 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}>Kewajiban</td></tr>
                <Row label="Kewajiban Lancar" value={neraca.kewajibanLancar} indent />
                <tr className="border-b bg-muted/30"><td className="pl-4 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}>Ekuitas</td></tr>
                <Row label="Ekuitas" value={neraca.ekuitas} indent positive={neraca.ekuitas >= 0} />
                <Row label="Total Kewajiban & Ekuitas" value={neraca.kewajibanLancar + neraca.ekuitas} bold />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Arus Kas */}
      {tab === "aruskas" && arusKas && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <FileText className="size-4" />
            <h2 className="text-sm font-semibold">Laporan Arus Kas — Tahun {year}</h2>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b bg-muted/30"><td className="pl-4 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}>Aktivitas Operasional</td></tr>
              <Row label="Arus Kas dari Operasional" value={arusKas.operasional} indent positive={arusKas.operasional >= 0} />
              <tr className="border-b bg-muted/30"><td className="pl-4 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}>Aktivitas Investasi</td></tr>
              <Row label="Arus Kas dari Investasi" value={arusKas.investasi} indent />
              <tr className="border-b bg-muted/30"><td className="pl-4 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}>Aktivitas Pendanaan</td></tr>
              <Row label="Arus Kas dari Pendanaan" value={arusKas.pendanaan} indent />
              <tr className="bg-emerald-50 dark:bg-emerald-950/20">
                <td className="pl-4 py-3 text-sm font-bold">KENAIKAN / PENURUNAN KAS BERSIH</td>
                <td className={cn("pr-4 py-3 text-right tabular-nums text-base font-bold", arusKas.netKas >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(arusKas.netKas)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
