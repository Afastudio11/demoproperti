import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background border rounded-xl p-5 w-full max-w-xl shadow-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function TargetPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: "", year: String(now.getFullYear()), month: String(now.getMonth() + 1), targetAkad: "", targetBerkas: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["target-realisasi", selectedYear, selectedMonth],
    queryFn: () => fetch(`/api/administrasi/target-realisasi?year=${selectedYear}&month=${selectedMonth}`).then(r => r.json()),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => fetch("/api/administrasi/monthly-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, projectId: d.projectId ? parseInt(d.projectId) : null, year: parseInt(d.year), month: parseInt(d.month), targetAkad: parseInt(d.targetAkad || "0"), targetBerkas: parseInt(d.targetBerkas || "0") }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["target-realisasi"] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (targetIds: number[]) => {
      await Promise.all(
        targetIds.map(id =>
          fetch(`/api/administrasi/targets/${id}`, {
            method: "DELETE",
          }).then(r => {
            if (!r.ok) throw new Error("Gagal menghapus target");
            return r.json();
          })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["target-realisasi"] });
    },
  });

  const handleDelete = (targetIds: number[]) => {
    if (confirm("Apakah Anda yakin ingin menghapus target ini?")) {
      deleteMutation.mutate(targetIds);
    }
  };

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const targetBreakdown = data?.targetBreakdown ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Target & Realisasi</h1>
          <p className="text-sm text-muted-foreground">Tracking progress terhadap target bulanan dan tahunan</p>
        </div>
        <button
          onClick={() => {
            setForm(p => ({ ...p, year: String(selectedYear), month: String(selectedMonth) }));
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"
        >
          <Plus className="size-3.5" /> Set Target
        </button>
      </div>

      <div className="flex gap-3">
        <select className="text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select className="text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Target Akad", value: data?.totalTargetAkad ?? 0, color: "text-foreground" },
          { label: "Realisasi Akad", value: data?.totalAkad ?? 0, pct: data?.akadRate ?? 0, color: (data?.akadRate ?? 0) >= 100 ? "text-emerald-600" : "text-blue-600" },
          { label: "SP3K Bulan Ini", value: data?.totalSp3k ?? 0, pct: data?.sp3kRate ?? 0, color: "text-amber-600" },
          { label: "Pipeline Aktif", value: "-", pct: data?.pipelineRate ?? 0, color: "text-foreground" },
        ].map(({ label, value, pct, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-semibold", color)}>{value}</div>
            {pct !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>vs target</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500")}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Target Breakdown */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Target className="size-3.5" />
              <span>Rincian Target per Proyek</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Komposisi angka target {MONTHS[selectedMonth - 1]} {selectedYear} yang muncul di kartu utama.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">Total target berkas</div>
            <div className="text-sm font-semibold">{data?.totalTargetBerkas ?? 0}</div>
          </div>
        </div>
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Memuat rincian target...</div>
        ) : targetBreakdown.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada target untuk periode ini. Klik Set Target untuk mulai mengisi per proyek.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b">
                  {["Proyek", "Target Akad", "Target Berkas", "Realisasi Akad", "SP3K", "Pipeline", "Progress Akad", "Aksi"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targetBreakdown.map((row: any) => (
                  <tr key={row.projectId ?? "all"} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold">{row.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.projectId ? `ID Proyek ${row.projectId}` : "Target global"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold">{row.targetAkad}</td>
                    <td className="px-3 py-2.5">{row.targetBerkas}</td>
                    <td className="px-3 py-2.5 text-emerald-600 font-semibold">{row.akad}</td>
                    <td className="px-3 py-2.5 text-blue-600 font-semibold">{row.sp3k}</td>
                    <td className="px-3 py-2.5">{row.pipeline}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", row.akadRate >= 100 ? "bg-emerald-500" : row.akadRate >= 50 ? "bg-blue-500" : "bg-amber-500")}
                            style={{ width: `${Math.min(row.akadRate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium">{row.akadRate}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {Array.isArray(row.targetIds) && row.targetIds.length > 0 ? (
                        <button
                          onClick={() => handleDelete(row.targetIds)}
                          className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rasio Table */}
      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rasio Konversi Pipeline</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Akad / Target", value: `${data?.akadRate ?? 0}%` },
            { label: "(Akad + SP3K) / Target", value: `${Math.min(((data?.totalAkad ?? 0) + (data?.totalSp3k ?? 0)) / Math.max(data?.totalTargetAkad ?? 1, 1) * 100, 999).toFixed(0)}%` },
            { label: "Pipeline / Target", value: `${data?.pipelineRate ?? 0}%` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-lg font-semibold mt-1">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PIC Performance */}
      {(data?.picPerforma ?? []).length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <span className="text-xs font-semibold">Performa PIC Admin</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["PIC Admin", "Customer Ditangani", "Akad Bulan Ini", "SP3K Bulan Ini", "Conversion Rate"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.picPerforma.map((p: any) => (
                <tr key={p.nama} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-semibold">{p.nama}</td>
                  <td className="px-3 py-2.5">{p.total}</td>
                  <td className="px-3 py-2.5 text-emerald-600 font-semibold">{p.akad}</td>
                  <td className="px-3 py-2.5 text-blue-600 font-semibold">{p.sp3k}</td>
                  <td className="px-3 py-2.5">{p.total > 0 ? `${Math.round((p.akad / p.total) * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <h3 className="font-semibold text-sm mb-4">Set Target Bulanan</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          {targetBreakdown.length > 0 && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-semibold mb-2">Target yang sudah tersimpan</div>
              <div className="space-y-1.5">
                {targetBreakdown.map((row: any) => (
                  <div key={row.projectId ?? "all"} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-muted-foreground">{row.projectName}</span>
                    <span className="font-semibold whitespace-nowrap">{row.targetAkad} akad / {row.targetBerkas} berkas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div><label className="text-xs font-medium text-muted-foreground">Proyek</label>
            <select className={selectCls} value={form.projectId} onChange={set("projectId")}>
              <option value="">-- Semua Proyek --</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.nama ?? p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Tahun</label>
              <input className={inputCls} type="number" value={form.year} onChange={set("year")} />
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Bulan</label>
              <select className={selectCls} value={form.month} onChange={set("month")}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Target Akad</label>
            <input className={inputCls} type="number" value={form.targetAkad} onChange={set("targetAkad")} />
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Target Berkas</label>
            <input className={inputCls} type="number" value={form.targetBerkas} onChange={set("targetBerkas")} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={save.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">{save.isPending ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
