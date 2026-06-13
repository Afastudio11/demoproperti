import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Package } from "lucide-react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const fmtPct = (n: number) => `${Math.round(n)}%`;
const fmtNum = (n: number, d = 1) => n.toLocaleString("id-ID", { maximumFractionDigits: d });

type Contract = { id: number; subkonName: string; stageCode: string | null; unitCount: number; contractValue: number; totalRetention: number; status: string; projectId: number };
type Payment = { id: number; contractId: number; terminNumber: number | null; progressCurrent: number; velocity: number | null; netPayment: number | null; status: string };

type MaterialItem = {
  materialId: number;
  materialName: string;
  category: string;
  satuan: string;
  standardPerUnit: number;
  actualPerUnit: number;
  totalActual: number;
  totalStandard: number;
  deviasiPct: number;
  selisihNilai: number;
  unitPrice: number;
  status: "SANGAT_EFISIEN" | "EFISIEN" | "PERLU_PERHATIAN" | "BOROS";
};

type MaterialComparison = {
  contractId: number;
  subkonName: string;
  projectId: number;
  stageCode: string | null;
  unitCount: number;
  unitsCompleted: number;
  efficiencyScore: number;
  totalSelisihNilai: number;
  overallStatus: "EFISIEN" | "CUKUP" | "PERLU_PERHATIAN" | "BOROS";
  materials: MaterialItem[];
};

const STATUS_COLOR: Record<string, string> = {
  SANGAT_EFISIEN: "text-emerald-500",
  EFISIEN: "text-blue-500",
  PERLU_PERHATIAN: "text-amber-500",
  BOROS: "text-red-500",
};

const STATUS_BG: Record<string, string> = {
  SANGAT_EFISIEN: "bg-emerald-500/10 text-emerald-600",
  EFISIEN: "bg-blue-500/10 text-blue-600",
  PERLU_PERHATIAN: "bg-amber-500/10 text-amber-600",
  BOROS: "bg-red-500/10 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  SANGAT_EFISIEN: "Sangat Efisien",
  EFISIEN: "Efisien",
  PERLU_PERHATIAN: "Perlu Perhatian",
  BOROS: "Boros",
  CUKUP: "Cukup",
};

const BAR_COLOR: Record<string, string> = {
  SANGAT_EFISIEN: "bg-emerald-500",
  EFISIEN: "bg-blue-500",
  PERLU_PERHATIAN: "bg-amber-500",
  BOROS: "bg-red-500",
};

export default function SubkonPerforma() {
  const [tab, setTab] = useState<"kinerja" | "material">("kinerja");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [expandedSubkon, setExpandedSubkon] = useState<string | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const r = await fetch("/api/projects"); return r.json() as Promise<{ id: number; nama: string }[]>; },
  });
  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.nama]));

  const { data: contracts, isLoading: loadingC } = useQuery({
    queryKey: ["subkon-contracts"],
    queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; },
  });

  const { data: payments } = useQuery({
    queryKey: ["subkon-payments"],
    queryFn: async () => { const r = await fetch("/api/produksi/subkon/payments"); return r.json() as Promise<Payment[]>; },
  });

  const { data: materialComparison, isLoading: loadingMat } = useQuery({
    queryKey: ["subkon-material-comparison", projectFilter],
    queryFn: async () => {
      const url = projectFilter
        ? `/api/produksi/subkon/material-comparison?projectId=${projectFilter}`
        : "/api/produksi/subkon/material-comparison";
      const r = await fetch(url);
      return r.json() as Promise<MaterialComparison[]>;
    },
  });

  const performa = (contracts ?? []).map(c => {
    const cp = (payments ?? []).filter(p => p.contractId === c.id);
    const paidPayments = cp.filter(p => p.status === "paid");
    const lastPayment = paidPayments.sort((a, b) => (b.terminNumber ?? 0) - (a.terminNumber ?? 0))[0];
    const progressAktual = lastPayment?.progressCurrent ?? 0;
    const velocity = lastPayment?.velocity ?? 0;
    const totalPaid = paidPayments.reduce((s, p) => s + (p.netPayment ?? 0), 0);
    const pendingCount = cp.filter(p => p.status === "pending_approval").length;
    const eligibilityScore = Math.min(100, progressAktual + (pendingCount === 0 ? 10 : 0));
    return { ...c, progressAktual, velocity, totalPaid, pendingCount, terminCount: paidPayments.length, eligibilityScore };
  }).sort((a, b) => b.eligibilityScore - a.eligibilityScore);

  // Unique project IDs dari contracts
  const projectIds = [...new Set((contracts ?? []).map(c => c.projectId))].sort();

  // Material comparison: group per subkon name (merge across contracts if same subkon diff project)
  const matBySubkon = (materialComparison ?? []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Performa & Konsumsi Subkon</h1>
          <p className="text-sm text-muted-foreground">Kinerja kontrak, termin, dan konsumsi material subkon dalam satu halaman</p>
        </div>
        {/* Tab toggle */}
        <div className="flex gap-1 rounded-lg border p-1">
          <button
            onClick={() => setTab("kinerja")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${tab === "kinerja" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Kinerja Kontrak
          </button>
          <button
            onClick={() => setTab("material")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${tab === "material" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Konsumsi Material
          </button>
        </div>
      </div>

      {/* ── TAB: KINERJA KONTRAK ── */}
      {tab === "kinerja" && (
        loadingC ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Memuat data...</div>
        ) : performa.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Belum ada kontrak. <Link href="/produksi/subkon/kontrak" className="underline">Tambah kontrak</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {performa.map(c => (
              <Card key={c.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{c.subkonName}</span>
                        {c.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.stageCode}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === "aktif" ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600"}`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${c.progressAktual >= 90 ? "bg-emerald-500" : c.progressAktual >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${c.progressAktual}%` }} />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">{fmtPct(c.progressAktual)}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div><span className="text-muted-foreground block">Unit</span><span className="font-medium">{c.unitCount}</span></div>
                        <div><span className="text-muted-foreground block">Velocity</span>
                          <span className={`font-medium flex items-center gap-0.5 ${c.velocity >= 10 ? "text-emerald-600" : c.velocity >= 5 ? "text-blue-600" : "text-amber-600"}`}>
                            {c.velocity >= 10 ? <TrendingUp className="size-3" /> : c.velocity >= 5 ? <Minus className="size-3" /> : <TrendingDown className="size-3" />}
                            {fmtPct(c.velocity)}/termin
                          </span>
                        </div>
                        <div><span className="text-muted-foreground block">Termin Dibayar</span><span className="font-medium">{c.terminCount}x</span></div>
                        <div><span className="text-muted-foreground block">Total Dibayar</span><span className="font-medium">{fmtRp(c.totalPaid)}</span></div>
                        <div><span className="text-muted-foreground block">Nilai Kontrak</span><span className="font-medium">{fmtRp(c.contractValue)}</span></div>
                      </div>
                      {c.pendingCount > 0 && <p className="text-[10px] text-amber-500 mt-1">{c.pendingCount} tagihan menunggu approval</p>}
                    </div>
                    <div className="text-center shrink-0">
                      <div className={`text-2xl font-bold ${c.eligibilityScore >= 80 ? "text-emerald-500" : c.eligibilityScore >= 60 ? "text-amber-500" : "text-red-500"}`}>{c.eligibilityScore}</div>
                      <div className="text-[10px] text-muted-foreground">Skor</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── TAB: EFISIENSI MATERIAL ── */}
      {tab === "material" && (
        <div className="space-y-4">
          {/* Filter project */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Filter Proyek:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setProjectFilter(null)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${projectFilter === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                Semua
              </button>
              {projectIds.map(pid => (
                <button
                  key={pid}
                  onClick={() => setProjectFilter(pid)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${projectFilter === pid ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {projectMap[pid] ?? `Proyek ${pid}`}
                </button>
              ))}
            </div>
          </div>

          {/* Penjelasan */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            Perbandingan pemakaian material aktual vs standar per satu unit rumah. Deviasi positif = penggunaan melebihi standar (boros), deviasi negatif = lebih hemat dari standar.
          </div>

          {loadingMat ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Menghitung efisiensi material...</div>
          ) : matBySubkon.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Belum ada data pemakaian material yang terhubung ke subkon.</div>
          ) : (
            <div className="space-y-3">
              {matBySubkon.map(s => {
                const key = `${s.subkonName}__${s.projectId}`;
                const isExpanded = expandedSubkon === key;
                return (
                  <Card key={key} className={`transition-colors ${s.overallStatus === "BOROS" ? "border-red-500/30" : s.overallStatus === "PERLU_PERHATIAN" ? "border-amber-500/30" : ""}`}>
                    {/* Header row */}
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedSubkon(isExpanded ? null : key)}
                    >
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-medium text-sm">{s.subkonName}</span>
                              {s.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{s.stageCode}</span>}
                              <span className="text-[10px] text-muted-foreground">{projectMap[s.projectId] ?? `Proyek ${s.projectId}`}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BG[s.overallStatus]}`}>
                                {STATUS_LABEL[s.overallStatus]}
                              </span>
                            </div>

                            {/* Mini bar chart per material */}
                            <div className="flex items-end gap-1 h-8 mb-1">
                              {s.materials.slice(0, 8).map(m => {
                                const maxDev = Math.max(...s.materials.map(x => Math.abs(x.deviasiPct)), 20);
                                const barH = Math.min(100, Math.abs(m.deviasiPct) / maxDev * 100);
                                return (
                                  <div key={m.materialId} className="flex flex-col items-center gap-0.5 flex-1" title={`${m.materialName}: ${m.deviasiPct > 0 ? "+" : ""}${m.deviasiPct}%`}>
                                    <div className="w-full flex flex-col justify-end" style={{ height: "28px" }}>
                                      <div
                                        className={`w-full rounded-sm ${BAR_COLOR[m.status]}`}
                                        style={{ height: `${Math.max(4, barH * 0.28)}px` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              <span className="text-muted-foreground">{s.materials.length} material</span>
                              {(() => {
                                const borosN = s.materials.filter(m => m.deviasiPct > 15).length;
                                const efisienN = s.materials.filter(m => m.deviasiPct <= 5).length;
                                return (
                                  <>
                                    {borosN > 0 && <span className="text-red-500">{borosN} boros</span>}
                                    {efisienN > 0 && <span className="text-emerald-500">{efisienN} efisien</span>}
                                  </>
                                );
                              })()}
                              <span className="text-muted-foreground">{s.unitsCompleted}/{s.unitCount} unit</span>
                              {s.totalSelisihNilai !== 0 && (
                                <span className={s.totalSelisihNilai > 0 ? "text-red-500" : "text-emerald-500"}>
                                  {s.totalSelisihNilai > 0 ? "+" : ""}{fmtRp(s.totalSelisihNilai)} vs standar
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Skor efisiensi */}
                          <div className="text-center shrink-0 w-14">
                            <div className={`text-2xl font-bold ${s.efficiencyScore >= 90 ? "text-emerald-500" : s.efficiencyScore >= 75 ? "text-blue-500" : s.efficiencyScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
                              {s.efficiencyScore}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Efisiensi</div>
                          </div>

                          {/* Expand icon */}
                          <div className="text-muted-foreground shrink-0">
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </div>
                        </div>
                      </CardContent>
                    </button>

                    {/* Detail material per subkon */}
                    {isExpanded && (
                      <div className="border-t">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Material</th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Standar/Unit</th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Aktual/Unit</th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Deviasi</th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Selisih Nilai</th>
                                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.materials.map(m => (
                                <tr key={m.materialId} className="border-b last:border-0 hover:bg-muted/20">
                                  <td className="px-4 py-2">
                                    <div className="font-medium">{m.materialName}</div>
                                    <div className="text-muted-foreground text-[10px]">{m.satuan}</div>
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {fmtNum(m.standardPerUnit)} {m.satuan}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                                    {fmtNum(m.actualPerUnit)} {m.satuan}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {/* Bar deviasi — skala relatif terhadap deviasi terbesar di grup ini */}
                                    <div className="flex items-center justify-end gap-1.5">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${m.deviasiPct > 0 ? "bg-red-400" : "bg-emerald-400"}`}
                                          style={{ width: `${Math.min(100, Math.abs(m.deviasiPct) / Math.max(...s.materials.map(x => Math.abs(x.deviasiPct)), 1) * 100)}%` }}
                                        />
                                      </div>
                                      <span className={`font-semibold ${m.deviasiPct > 0 ? "text-red-500" : "text-emerald-500"}`}>
                                        {m.deviasiPct > 0 ? "+" : ""}{m.deviasiPct}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    <span className={m.selisihNilai > 0 ? "text-red-500" : m.selisihNilai < 0 ? "text-emerald-500" : "text-muted-foreground"}>
                                      {m.selisihNilai > 0 ? "+" : ""}{fmtRp(m.selisihNilai)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BG[m.status]}`}>
                                      {STATUS_LABEL[m.status]}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {/* Footer total */}
                            <tfoot>
                              <tr className="bg-muted/20">
                                <td className="px-4 py-2 font-medium" colSpan={4}>Total Selisih Biaya Material</td>
                                <td className="px-3 py-2 text-right font-bold tabular-nums" colSpan={2}>
                                  <span className={s.totalSelisihNilai > 0 ? "text-red-500" : "text-emerald-500"}>
                                    {s.totalSelisihNilai > 0 ? "+" : ""}{fmtRp(s.totalSelisihNilai)}
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
