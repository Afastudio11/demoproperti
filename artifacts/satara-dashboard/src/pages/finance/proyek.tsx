import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Upload, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function ProjectFinance() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-rab"],
    queryFn: () => fetch("/api/finance/rab").then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: cfData } = useQuery({
    queryKey: ["finance-profitabilitas"],
    queryFn: () => fetch("/api/finance/profitabilitas").then(r => r.json()),
    refetchInterval: 60000,
  });

  const summary: any[] = data?.summary ?? [];
  const projects: any[] = cfData?.projects ?? [];
  const isEmpty = summary.length === 0 && projects.length === 0;

  const merged = (() => {
    const all = new Set([...summary.map(s => s.projectName), ...projects.map(p => p.projectName)]);
    return Array.from(all).map(name => {
      const rab = summary.find(s => s.projectName === name);
      const cf = projects.find(p => p.projectName === name);
      return {
        name,
        rab: rab?.rab ?? 0,
        realisasi: rab?.realisasi ?? 0,
        deviasiPct: rab?.deviasiPct ?? 0,
        pendapatan: cf?.pendapatan ?? 0,
        biaya: cf?.biaya ?? 0,
        profit: cf?.profit ?? 0,
        margin: cf?.margin ?? 0,
      };
    });
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Project Finance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring keuangan per proyek: RAB, realisasi, deviasi, dan estimasi profit</p>
        </div>
        <Link href="/finance/upload">
          <button className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
            <Upload className="size-3.5" />
            Upload Data
          </button>
        </Link>
      </div>

      {isEmpty && !isLoading && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data proyek belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Upload file RAB dan Cashflow untuk melihat keuangan per proyek</p>
          <Link href="/finance/upload"><button className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90">Ke Upload Center</button></Link>
        </div>
      )}

      {!isEmpty && merged.map(p => {
        const isOverBudget = p.deviasiPct > 10;
        return (
          <div key={p.name} className={cn("rounded-xl border bg-card p-5", isOverBudget ? "border-red-300 dark:border-red-700" : "")}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  {p.name}
                  {isOverBudget && <AlertTriangle className="size-3.5 text-red-500" />}
                </div>
                {isOverBudget && <div className="text-xs text-red-500 mt-0.5">Realisasi melebihi RAB lebih dari 10%</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Total RAB</div>
                <div className="text-sm font-semibold tabular-nums">{fmtRp(p.rab)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Total Realisasi Biaya</div>
                <div className="text-sm font-semibold tabular-nums">{fmtRp(p.realisasi)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Deviasi</div>
                <div className={cn("text-sm font-bold tabular-nums", p.deviasiPct <= 0 ? "text-emerald-600" : p.deviasiPct > 10 ? "text-red-500" : "text-amber-500")}>
                  {p.deviasiPct >= 0 ? "+" : ""}{p.deviasiPct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Estimasi Profit</div>
                <div className={cn("text-sm font-bold tabular-nums", p.profit >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtRp(p.profit)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Pendapatan</div>
                <div className="text-sm font-semibold tabular-nums text-emerald-600">{fmtRp(p.pendapatan)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Total Biaya</div>
                <div className="text-sm font-semibold tabular-nums text-red-500">{fmtRp(p.biaya)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Margin Estimasi</div>
                <div className={cn("text-sm font-bold tabular-nums", p.margin >= 15 ? "text-emerald-600" : p.margin >= 5 ? "text-amber-500" : "text-red-500")}>
                  {p.margin.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Status</div>
                <div className={cn("text-sm font-medium", p.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {p.profit >= 0 ? "Menguntungkan" : "Rugi"}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
