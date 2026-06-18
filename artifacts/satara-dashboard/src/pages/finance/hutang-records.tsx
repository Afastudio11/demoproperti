import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertCircle, ArrowUpRight, ChevronDown, ChevronRight,
  Filter, Pencil, Upload, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const fmtRp = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
};

const fmtDate = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const CATEGORY_LABEL: Record<string, string> = {
  kpp: "KPP / Bank",
  vendor: "Vendor",
  supplier: "Supplier",
  internal: "Internal",
  project: "Proyek",
};

const DAYS_UNTIL_DUE = (due: string | null) => {
  if (!due) return null;
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
};

type DebtRecord = {
  id: number;
  creditorName: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: string;
  projectName: string | null;
  stageInfo: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
};

type HutangData = {
  records: DebtRecord[];
  byProject: Record<string, { totalAmount: number; paidAmount: number; remainingAmount: number; items: DebtRecord[] }>;
  byCategory: Record<string, { total: number; lt30: number; d30_60: number; gt60: number }>;
  total: number;
  totalPaid: number;
  totalRemaining: number;
};

const EMPTY_EDIT = {
  creditorName: "",
  category: "supplier",
  totalAmount: "",
  paidAmount: "",
  projectName: "",
  stageInfo: "",
  dueDate: "",
  notes: "",
};

export default function HutangRecordsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [filterProject, setFilterProject] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("outstanding");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editRow, setEditRow] = useState<DebtRecord | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const { data, isLoading } = useQuery<HutangData>({
    queryKey: ["finance-hutang"],
    queryFn: () => fetch("/api/finance/hutang").then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/finance/hutang/${editRow!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Gagal menyimpan"); });
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-hutang"] });
      toast({ title: "Tersimpan", description: "Data hutang diperbarui." });
      setEditRow(null);
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const allProjects = useMemo(
    () => Object.keys(data?.byProject ?? {}),
    [data]
  );

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    return data.records.filter((r) => {
      if (filterProject !== "all" && r.projectName !== filterProject) return false;
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [data, filterProject, filterCategory, filterStatus]);

  const groupedFiltered = useMemo(() => {
    const map: Record<string, DebtRecord[]> = {};
    for (const r of filteredRecords) {
      const key = r.projectName ?? "Lainnya";
      (map[key] ??= []).push(r);
    }
    return map;
  }, [filteredRecords]);

  const toggleProject = (proj: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(proj)) next.delete(proj); else next.add(proj);
      return next;
    });
  };

  const openEdit = (r: DebtRecord) => {
    setEditRow(r);
    setEditForm({
      creditorName: r.creditorName,
      category: r.category,
      totalAmount: String(r.totalAmount),
      paidAmount: String(r.paidAmount),
      projectName: r.projectName ?? "",
      stageInfo: r.stageInfo ?? "",
      dueDate: r.dueDate ?? "",
      notes: r.notes ?? "",
    });
  };

  const submitEdit = () => {
    const orig = Number(editForm.totalAmount);
    const paid = Number(editForm.paidAmount);
    if (isNaN(orig) || orig <= 0) {
      toast({ title: "Validasi", description: "Jumlah total tidak valid.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      creditorName: editForm.creditorName,
      category: editForm.category,
      totalAmount: orig,
      paidAmount: paid,
      projectName: editForm.projectName || null,
      stageInfo: editForm.stageInfo || null,
      dueDate: editForm.dueDate || null,
      notes: editForm.notes || "",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-muted-foreground text-sm">Memuat data hutang...</div>
    );
  }

  const summary = {
    total: data?.total ?? 0,
    paid: data?.totalPaid ?? 0,
    remaining: data?.totalRemaining ?? 0,
  };

  const paidPct = summary.total > 0 ? Math.min(100, Math.round((summary.paid / summary.total) * 100)) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hutang</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rekap seluruh kewajiban non-bank — vendor, supplier, dan internal. Data berasal dari Upload Center.
          </p>
        </div>
        <Link href="/finance/upload">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Upload className="h-3.5 w-3.5" />
            Upload Data Baru
            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Hutang</p>
          <p className="text-xl font-bold">{fmtRp(summary.total)}</p>
          <p className="text-xs text-muted-foreground">{data?.records.length ?? 0} kreditur</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Sudah Dibayar</p>
          <p className="text-xl font-bold text-emerald-500">{fmtRp(summary.paid)}</p>
          <p className="text-xs text-muted-foreground">{paidPct}% dari total</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Sisa Kewajiban</p>
          <p className="text-xl font-bold text-amber-500">{fmtRp(summary.remaining)}</p>
          <p className="text-xs text-muted-foreground">
            {data?.records.filter((r) => r.status === "outstanding").length ?? 0} outstanding
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress Pelunasan</span>
          <span>{paidPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      {/* Aging summary */}
      {data && Object.keys(data.byCategory).length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">Aging Kewajiban per Kategori</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-2 text-left">Kategori</th>
                  <th className="px-4 py-2 text-right">Total Sisa</th>
                  <th className="px-4 py-2 text-right text-red-500">Jatuh Tempo &lt;30h</th>
                  <th className="px-4 py-2 text-right text-amber-500">30–60 Hari</th>
                  <th className="px-4 py-2 text-right text-muted-foreground">&gt;60 Hari</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byCategory).map(([cat, v]) => (
                  <tr key={cat} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{CATEGORY_LABEL[cat] ?? cat}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmtRp(v.total)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-500">{v.lt30 > 0 ? fmtRp(v.lt30) : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-500">{v.d30_60 > 0 ? fmtRp(v.d30_60) : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{v.gt60 > 0 ? fmtRp(v.gt60) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Semua Proyek" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {allProjects.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="outstanding">Outstanding</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>
        {(filterProject !== "all" || filterCategory !== "all" || filterStatus !== "outstanding") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => {
            setFilterProject("all"); setFilterCategory("all"); setFilterStatus("outstanding");
          }}>
            <X className="h-3 w-3" /> Reset
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filteredRecords.length} entri ditampilkan</span>
      </div>

      {/* Empty state */}
      {filteredRecords.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/20 py-16 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada data hutang</p>
          <p className="text-xs text-muted-foreground">
            Upload file Excel hutang melalui Upload Center untuk menambahkan data.
          </p>
          <Link href="/finance/upload">
            <Button variant="outline" size="sm" className="gap-1.5 mt-2">
              <Upload className="h-3.5 w-3.5" /> Buka Upload Center
            </Button>
          </Link>
        </div>
      )}

      {/* Grouped table by project */}
      {Object.entries(groupedFiltered).map(([proj, items]) => {
        const projTotal = items.reduce((s, r) => s + r.totalAmount, 0);
        const projRemaining = items.reduce((s, r) => s + r.remainingAmount, 0);
        const isOpen = expandedProjects.has(proj);
        return (
          <div key={proj} className="rounded-lg border overflow-hidden">
            {/* Project header row */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              onClick={() => toggleProject(proj)}
            >
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold text-sm flex-1">{proj}</span>
              <span className="text-xs text-muted-foreground">{items.length} kreditur</span>
              <span className="text-sm font-mono">{fmtRp(projRemaining)}</span>
              <span className="text-xs text-muted-foreground">/ {fmtRp(projTotal)}</span>
            </button>

            {/* Records table */}
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 text-muted-foreground text-xs uppercase border-t">
                      <th className="px-4 py-2 text-left">Kreditur</th>
                      <th className="px-4 py-2 text-left">Kategori</th>
                      <th className="px-4 py-2 text-left">Tahap</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Dibayar</th>
                      <th className="px-4 py-2 text-right">Sisa</th>
                      <th className="px-4 py-2 text-center">Jatuh Tempo</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => {
                      const daysLeft = DAYS_UNTIL_DUE(r.dueDate);
                      const isOverdue = daysLeft !== null && daysLeft < 0;
                      const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                      return (
                        <tr key={r.id} className="border-t hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium max-w-[180px] truncate">{r.creditorName}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABEL[r.category] ?? r.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">
                            {r.stageInfo ?? "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtRp(r.totalAmount)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-500">
                            {r.paidAmount > 0 ? fmtRp(r.paidAmount) : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                            {fmtRp(r.remainingAmount)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs">
                            {r.dueDate ? (
                              <span className={cn(
                                "inline-block rounded px-1.5 py-0.5",
                                isOverdue && "bg-red-500/10 text-red-500",
                                isUrgent && !isOverdue && "bg-amber-500/10 text-amber-500",
                                !isOverdue && !isUrgent && "text-muted-foreground",
                              )}>
                                {fmtDate(r.dueDate)}
                                {isOverdue && " (terlambat)"}
                                {isUrgent && !isOverdue && ` (${daysLeft}h lagi)`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {r.status === "paid" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs gap-1">
                                <Check className="h-2.5 w-2.5" /> Lunas
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                                Outstanding
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold text-xs">
                      <td colSpan={3} className="px-4 py-2 text-muted-foreground">
                        Subtotal {proj}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{fmtRp(projTotal)}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-500">
                        {fmtRp(items.reduce((s, r) => s + r.paidAmount, 0))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{fmtRp(projRemaining)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => { if (!o) setEditRow(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Data Hutang</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nama Kreditur</Label>
              <Input
                value={editForm.creditorName}
                onChange={(e) => setEditForm((p) => ({ ...p, creditorName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Proyek</Label>
              <Input
                value={editForm.projectName}
                onChange={(e) => setEditForm((p) => ({ ...p, projectName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total Hutang (Rp)</Label>
              <Input
                type="number"
                value={editForm.totalAmount}
                onChange={(e) => setEditForm((p) => ({ ...p, totalAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sudah Dibayar (Rp)</Label>
              <Input
                type="number"
                value={editForm.paidAmount}
                onChange={(e) => setEditForm((p) => ({ ...p, paidAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jatuh Tempo</Label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Info Tahap</Label>
              <Input
                value={editForm.stageInfo}
                onChange={(e) => setEditForm((p) => ({ ...p, stageInfo: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Catatan</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            {editForm.paidAmount && Number(editForm.paidAmount) > 0 && (
              <div className="col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Sisa kewajiban:{" "}
                <span className="font-semibold text-foreground">
                  {fmtRp(Math.max(0, Number(editForm.totalAmount) - Number(editForm.paidAmount)))}
                </span>
                {Number(editForm.paidAmount) >= Number(editForm.totalAmount) && (
                  <span className="ml-2 text-emerald-500 font-semibold">Akan ditandai Lunas</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Batal</Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
