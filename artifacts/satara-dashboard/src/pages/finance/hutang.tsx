import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, ChevronDown, ChevronRight, Download, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import ProjectNameSelect from "@/components/project-name-select";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtPct(paid: number, total: number) {
  if (!total) return 0;
  return Math.round((paid / total) * 100);
}

const EMPTY = { creditorName: "", category: "kredit", totalAmount: "", paidAmount: "", dueDate: "", notes: "", projectName: "", stageInfo: "", collateral: "", interestRate: "", interestDueDay: "", akadDisbursementStatus: "belum_cair", manualReduction: "" };

export default function HutangCenter() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"proyek" | "daftar">("proyek");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["finance-hutang"],
    queryFn: () => fetch("/api/finance/hutang").then(r => r.json()),
    refetchInterval: 60000,
  });

  const byProject: Record<string, any> = data?.byProject ?? {};
  const records: any[] = data?.records ?? [];
  const totalAll = data?.total ?? 0;
  const totalPaid = data?.totalPaid ?? 0;
  const totalRemaining = data?.totalRemaining ?? 0;

  const addDebt = useMutation({
    mutationFn: (body: any) => fetch("/api/finance/hutang", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-hutang"] }); setShowForm(false); setForm(EMPTY); },
  });

  const updateDebt = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(`/api/finance/hutang/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-hutang"] }); setEditingRecord(null); },
  });

  const deleteDebt = useMutation({
    mutationFn: (id: number) => fetch(`/api/finance/hutang/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-hutang"] }); setDeletingId(null); },
  });

  function openEdit(r: any) {
    setEditingRecord(r);
    setEditForm({
      projectName: r.projectName ?? "",
      stageInfo: r.stageInfo ?? "",
      creditorName: r.creditorName ?? "",
      totalAmount: r.totalAmount ?? "",
      paidAmount: r.paidAmount ?? "",
      notes: r.notes ?? "",
      dueDate: r.dueDate ?? "",
      category: r.category ?? "supplier",
      collateral: r.metadata?.collateral ?? "",
      interestRate: r.metadata?.interestRate ?? "",
      interestDueDay: r.metadata?.interestDueDay ?? "",
      akadDisbursementStatus: r.metadata?.akadDisbursementStatus ?? "belum_cair",
      manualReduction: r.metadata?.manualReduction ?? "",
    });
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const projects = Object.keys(byProject).sort();
    const allDataRows: any[][] = [];
    allDataRows.push(["Tahap", "Nama Pemilik/Kreditur", "Nilai Awal", "Terbayar", "Sisa Kewajiban", "Status", "Keterangan"]);
    for (const proj of projects) {
      const pd = byProject[proj];
      for (const r of pd.items) {
        const remaining = Number(r.remainingAmount ?? 0);
        allDataRows.push([r.stageInfo || "", r.creditorName, Number(r.totalAmount), Number(r.paidAmount ?? 0), remaining, remaining <= 0 ? "Lunas" : "Belum Lunas", r.notes || ""]);
      }
      allDataRows.push(["", `GRAND TOTAL ${proj}`, pd.totalAmount, pd.paidAmount, pd.remainingAmount, pd.remainingAmount <= 0 ? "Lunas" : "Belum Lunas", ""]);
      allDataRows.push([`Subtotal ${proj}`, "", pd.totalAmount, pd.paidAmount, pd.remainingAmount, `${pd.items.filter((i: any) => i.status === "paid").length}/${pd.items.length} lunas`, ""]);
      allDataRows.push(["", "", "", "", "", "", ""]);
    }
    allDataRows.push(["TOTAL KESELURUHAN", "", totalAll, totalPaid, totalRemaining, `${fmtPct(totalPaid, totalAll)}% terbayar`, ""]);
    const ws = XLSX.utils.aoa_to_sheet(allDataRows);
    ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Hutang");
    XLSX.writeFile(wb, `LAPORAN_HUTANG_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  const isEmpty = records.length === 0;
  const projects = Object.keys(byProject).sort();

  function toggleProject(p: string) {
    setExpanded(prev => ({ ...prev, [p]: !prev[p] }));
  }

  const rowActions = (r: any) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5" title="Edit record">
        <Pencil className="size-3.5" />
      </button>
      <button onClick={() => setDeletingId(r.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5" title="Hapus record">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Kredit & Investment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring kredit, agunan, bunga, pengurangan akad, dan investment per proyek</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button onClick={exportExcel}
              className="flex items-center gap-2 border text-sm font-medium px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
              <Download className="size-3.5" />Export Excel
            </button>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
            <Plus className="size-3.5" />Tambah Kredit/Investment
          </button>
        </div>
      </div>

      {isEmpty && !isLoading ? (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <AlertTriangle className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Data kredit/investment belum tersedia</p>
          <p className="text-xs text-muted-foreground mt-1">Upload file atau tambah data manual</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1.5">Total Nilai Awal</div>
              <div className="text-xl font-bold tabular-nums">{fmtRp(totalAll)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{projects.length} proyek · {records.length} record</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500 inline-block" />Sudah Terbayar
              </div>
              <div className="text-xl font-bold tabular-nums text-emerald-500">{fmtRp(totalPaid)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{fmtPct(totalPaid, totalAll)}% dari total</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-500" />Sisa Kewajiban
              </div>
              <div className={cn("text-xl font-bold tabular-nums", totalRemaining > 0 ? "text-amber-500" : "text-emerald-500")}>
                {fmtRp(totalRemaining)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{fmtPct(totalRemaining, totalAll)}% belum terbayar</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tampilkan:</span>
            {(["proyek", "daftar"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors",
                  viewMode === m ? "bg-foreground text-background" : "hover:bg-muted")}>
                {m === "proyek" ? "Per Proyek" : "Daftar Lengkap"}
              </button>
            ))}
          </div>

          {viewMode === "proyek" && (
            <div className="space-y-3">
              {projects.map(proj => {
                const pd = byProject[proj];
                const pct = fmtPct(pd.paidAmount, pd.totalAmount);
                const isOpen = expanded[proj];
                return (
                  <div key={proj} className="rounded-xl border bg-card overflow-hidden">
                    <button onClick={() => toggleProject(proj)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left">
                      {isOpen ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{proj}</span>
                          <span className="text-xs text-muted-foreground">{pd.items.length} record</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{pct}% terbayar</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-xs text-muted-foreground">Nilai Awal</div>
                        <div className="text-sm font-semibold tabular-nums">{fmtRp(pd.totalAmount)}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-emerald-500 tabular-nums">{fmtRp(pd.paidAmount)} terbayar</span>
                          <span className={cn("text-[11px] tabular-nums", pd.remainingAmount > 0 ? "text-amber-500" : "text-emerald-500")}>{fmtRp(pd.remainingAmount)} sisa</span>
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              {["Tahap", "Kreditur/Investor", "Kategori", "Agunan", "Bunga", "Nilai Awal", "Terbayar", "Sisa", "Status", ""].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pd.items.map((r: any) => {
                              const remaining = Number(r.remainingAmount ?? 0);
                              return (
                                <tr key={r.id} className={cn("border-b last:border-0 group", remaining <= 0 && "bg-emerald-50/30 dark:bg-emerald-950/10")}>
                                  <td className="px-3 py-2 text-muted-foreground">{r.stageInfo || "-"}</td>
                                  <td className="px-3 py-2 font-medium max-w-[180px] truncate">{r.creditorName}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{r.category}</td>
                                  <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{r.metadata?.collateral || "-"}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{r.metadata?.interestRate ? `${r.metadata.interestRate}%/bln` : "-"}</td>
                                  <td className="px-3 py-2 tabular-nums">{fmtRp(Number(r.totalAmount))}</td>
                                  <td className="px-3 py-2 tabular-nums text-emerald-600 font-medium">{fmtRp(Number(r.paidAmount ?? 0))}</td>
                                  <td className={cn("px-3 py-2 tabular-nums font-medium", remaining > 0 ? "text-amber-500" : "text-emerald-500")}>{fmtRp(remaining)}</td>
                                  <td className="px-3 py-2">
                                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                                      r.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                                      {r.status === "paid" ? "Lunas" : "Belum Lunas"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{rowActions(r)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/30 font-semibold">
                              <td colSpan={5} className="px-3 py-2 text-xs">Subtotal {proj}</td>
                              <td className="px-3 py-2 tabular-nums text-xs">{fmtRp(pd.totalAmount)}</td>
                              <td className="px-3 py-2 tabular-nums text-xs text-emerald-600">{fmtRp(pd.paidAmount)}</td>
                              <td className={cn("px-3 py-2 tabular-nums text-xs", pd.remainingAmount > 0 ? "text-amber-500" : "text-emerald-500")}>{fmtRp(pd.remainingAmount)}</td>
                              <td colSpan={2} className="px-3 py-2 text-xs text-muted-foreground">{pd.items.filter((i: any) => i.status === "paid").length}/{pd.items.length} lunas</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "daftar" && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {["Proyek", "Tahap", "Kreditur/Investor", "Kategori", "Agunan", "Nilai Awal", "Terbayar", "Sisa", "Status", ""].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => {
                      const remaining = Number(r.remainingAmount ?? 0);
                      return (
                        <tr key={r.id} className="border-b last:border-0 text-xs group">
                          <td className="px-4 py-2 font-medium">{r.projectName || "-"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.stageInfo || "-"}</td>
                          <td className="px-4 py-2 max-w-[160px] truncate">{r.creditorName}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.category}</td>
                          <td className="px-4 py-2 text-muted-foreground max-w-[140px] truncate">{r.metadata?.collateral || "-"}</td>
                          <td className="px-4 py-2 tabular-nums">{fmtRp(Number(r.totalAmount))}</td>
                          <td className="px-4 py-2 tabular-nums text-emerald-600">{fmtRp(Number(r.paidAmount ?? 0))}</td>
                          <td className={cn("px-4 py-2 tabular-nums font-medium", remaining > 0 ? "text-amber-500" : "text-emerald-500")}>{fmtRp(remaining)}</td>
                          <td className="px-4 py-2">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                              r.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                              {r.status === "paid" ? "Lunas" : "Belum Lunas"}
                            </span>
                          </td>
                          <td className="px-4 py-2">{rowActions(r)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add form modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-semibold">Tambah Kredit / Investment</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Nama Proyek</label>
                <ProjectNameSelect
                  value={form.projectName}
                  onChange={value => setForm(p => ({ ...p, projectName: value }))}
                  className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background"
                  required
                />
              </div>
              {[
                { key: "stageInfo", label: "Tahap", type: "text", span: false },
                { key: "creditorName", label: "Nama Kreditur/Investor", type: "text", span: true },
                { key: "category", label: "Kategori (kredit/investment)", type: "text", span: false },
                { key: "totalAmount", label: "Plafon/Nilai Awal (Rp)", type: "number", span: false },
                { key: "paidAmount", label: "Pengurangan/Paid (Rp)", type: "number", span: false },
                { key: "collateral", label: "Agunan", type: "text", span: false },
                { key: "interestRate", label: "Bunga Bulanan (%)", type: "number", span: false },
                { key: "interestDueDay", label: "Tempo Bunga Tgl", type: "number", span: false },
                { key: "manualReduction", label: "Pengurangan Manual Akad", type: "number", span: false },
                { key: "akadDisbursementStatus", label: "Status Akad Cair", type: "text", span: false },
                { key: "dueDate", label: "Jatuh Tempo", type: "date", span: false },
              ].map(f => (
                <div key={f.key} className={f.span ? "col-span-2" : ""}>
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Keterangan</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => addDebt.mutate({ ...form, paidAmount: Number(form.paidAmount || 0) + Number(form.manualReduction || 0), metadata: { collateral: form.collateral, interestRate: form.interestRate, interestDueDay: form.interestDueDay, manualReduction: form.manualReduction, akadDisbursementStatus: form.akadDisbursementStatus } })} disabled={addDebt.isPending}
                className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">
                {addDebt.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────────── */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <Pencil className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Edit Kredit / Investment</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Nama Proyek</label>
                <ProjectNameSelect
                  value={editForm.projectName ?? ""}
                  onChange={value => setEditForm(p => ({ ...p, projectName: value }))}
                  className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background"
                  required
                />
              </div>
              {[
                { key: "stageInfo", label: "Tahap", type: "text", span: false },
                { key: "creditorName", label: "Nama Kreditur/Investor", type: "text", span: true },
                { key: "category", label: "Kategori", type: "text", span: false },
                { key: "totalAmount", label: "Plafon/Nilai Awal (Rp)", type: "number", span: false },
                { key: "paidAmount", label: "Pengurangan/Paid (Rp)", type: "number", span: false },
                { key: "collateral", label: "Agunan", type: "text", span: false },
                { key: "interestRate", label: "Bunga Bulanan (%)", type: "number", span: false },
                { key: "interestDueDay", label: "Tempo Bunga Tgl", type: "number", span: false },
                { key: "manualReduction", label: "Pengurangan Manual Akad", type: "number", span: false },
                { key: "akadDisbursementStatus", label: "Status Akad Cair", type: "text", span: false },
                { key: "dueDate", label: "Jatuh Tempo", type: "date", span: false },
              ].map(f => (
                <div key={f.key} className={f.span ? "col-span-2" : ""}>
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <input type={f.type} value={editForm[f.key] ?? ""}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Keterangan</label>
              <textarea value={editForm.notes ?? ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => updateDebt.mutate({ id: editingRecord.id, ...editForm, metadata: { collateral: editForm.collateral, interestRate: editForm.interestRate, interestDueDay: editForm.interestDueDay, manualReduction: editForm.manualReduction, akadDisbursementStatus: editForm.akadDisbursementStatus } })} disabled={updateDebt.isPending}
                className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">
                {updateDebt.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <button onClick={() => setEditingRecord(null)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────────────────────────────────── */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                <Trash2 className="size-4 text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Hapus Record Hutang</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Record ini akan dihapus permanen dari database.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => deleteDebt.mutate(deletingId)} disabled={deleteDebt.isPending}
                className="flex-1 bg-red-500 text-white text-sm py-2 rounded-md hover:bg-red-600 disabled:opacity-50">
                {deleteDebt.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button onClick={() => setDeletingId(null)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
