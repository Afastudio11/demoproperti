import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STATUSES = [
  { key: "", label: "Semua" },
  { key: "MINAT", label: "Minat" },
  { key: "PROSES_BERKAS", label: "Proses Berkas" },
  { key: "BERKAS_LENGKAP", label: "Berkas Lengkap" },
  { key: "SETOR_BANK", label: "Setor Bank" },
  { key: "OTS", label: "OTS" },
  { key: "REVISI", label: "Revisi" },
  { key: "SP3K", label: "SP3K" },
  { key: "AKAD", label: "Akad" },
  { key: "HT_CAIR", label: "HT Cair" },
  { key: "DTBO", label: "DTBO" },
  { key: "BATAL", label: "Batal" },
];

const STATUS_BADGE: Record<string, string> = {
  MINAT: "bg-blue-50 text-blue-700 border-blue-200",
  PROSES_BERKAS: "bg-blue-100 text-blue-800 border-blue-300",
  BERKAS_LENGKAP: "bg-cyan-50 text-cyan-700 border-cyan-200",
  SETOR_BANK: "bg-yellow-50 text-yellow-700 border-yellow-200",
  OTS: "bg-amber-50 text-amber-700 border-amber-200",
  REVISI: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SP3K: "bg-orange-50 text-orange-700 border-orange-200",
  AKAD: "bg-emerald-50 text-emerald-700 border-emerald-200",
  HT_CAIR: "bg-green-100 text-green-800 border-green-300",
  CASH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DTBO: "bg-red-50 text-red-600 border-red-200",
  BATAL: "bg-zinc-100 text-zinc-600 border-zinc-200",
  BELUM_LAKU: "bg-zinc-100 text-zinc-500 border-zinc-200",
  FOR_SALE: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const AGING_ROW: Record<string, string> = {
  normal: "",
  warning: "bg-yellow-50/50",
  oranye: "bg-orange-50/50",
  kritis: "bg-red-50/50",
};

function agingColor(days: number) {
  if (days < 7) return "bg-emerald-100 text-emerald-700";
  if (days < 14) return "bg-yellow-100 text-yellow-700";
  if (days < 30) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function AgingBadge({ days }: { days: number }) {
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", agingColor(days))}>
      {days}h
    </span>
  );
}

const ALL_STATUS_OPTIONS = [
  "MINAT", "PROSES_BERKAS", "BERKAS_LENGKAP", "SETOR_BANK", "OTS", "REVISI",
  "SP3K", "AKAD", "HT_CAIR", "CASH", "DTBO", "BATAL", "BELUM_LAKU", "FOR_SALE"
];
const STATUS_LABELS: Record<string, string> = {
  MINAT: "Minat", PROSES_BERKAS: "Proses Berkas", BERKAS_LENGKAP: "Berkas Lengkap",
  SETOR_BANK: "Setor Bank", OTS: "OTS", REVISI: "Revisi", SP3K: "SP3K",
  AKAD: "Akad", HT_CAIR: "HT Cair", CASH: "Cash", DTBO: "DTBO",
  BATAL: "Batal", BELUM_LAKU: "Belum Laku", FOR_SALE: "For Sale",
};

function exportCsv(customers: any[]) {
  const headers = ["No", "Blok/Unit", "Nama", "Pekerjaan", "Bank", "PIC", "Status", "Progress Rumah", "Tanggal Status", "Aging (hari)", "Telepon"];
  const rows = customers.map((c, i) => [
    i + 1,
    c.unitBlock ?? "",
    c.nama ?? "",
    c.pekerjaan ?? "",
    c.bank ?? "",
    c.picAdmin ?? "",
    STATUS_LABELS[c.pipelineStatus ?? ""] ?? c.pipelineStatus ?? "",
    c.progressRumah == null ? "" : `${Math.round(c.progressRumah)}%`,
    c.statusUpdatedAt ? new Date(c.statusUpdatedAt).toLocaleDateString("id-ID") : "",
    c.aging ?? 0,
    c.phone ?? "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customer-kpr-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CustomerList() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const qc = useQueryClient();

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (search) params.set("search", search);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["administrasi-customers", filterStatus, search],
    queryFn: () => fetch(`/api/administrasi/customers?${params}`).then(r => r.json()),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/administrasi/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStatus: status }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["administrasi-customers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/administrasi/customers/${id}`, {
        method: "DELETE",
      }).then(r => {
        if (!r.ok) throw new Error("Gagal menghapus customer");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["administrasi-customers"] });
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus customer "${name}"? Semua data terkait (dokumen, komplain, akad, dll.) juga akan ikut terhapus.`)) {
      deleteMutation.mutate(id);
    }
  };

  const QUICK_FILTERS = ["", "MINAT", "PROSES_BERKAS", "SETOR_BANK", "OTS", "REVISI", "SP3K", "AKAD", "HT_CAIR", "DTBO", "BATAL"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Daftar Customer</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customer ditemukan</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCsv(customers)}
            className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
          <Link href="/administrasi/customer/new">
            <button className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
              <Plus className="size-3.5" />
              Tambah Customer
            </button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Cari nama, blok, telepon, PIC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          {PIPELINE_STATUSES.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filterStatus === s ? "bg-foreground text-background border-foreground" : "bg-muted hover:bg-muted/80"
            )}
          >
            {s === "" ? "Semua" : STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["No", "Blok/Unit", "Nama", "Pekerjaan", "Bank", "PIC", "Status", "Progress Rumah", "Aging", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">Tidak ada customer.</td></tr>
              ) : customers.map((c: any, i: number) => (
                <tr key={c.id} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", AGING_ROW[c.agingLevel ?? "normal"])}>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium">{c.unitBlock ?? c.unitId ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/administrasi/customer/${c.id}`}>
                      <span className="font-medium hover:underline cursor-pointer">{c.nama}</span>
                    </Link>
                    {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.pekerjaan ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-medium">{c.bank ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.picAdmin ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <select
                      value={c.pipelineStatus ?? "MINAT"}
                      onChange={e => updateStatus.mutate({ id: c.id, status: e.target.value })}
                      className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none",
                        STATUS_BADGE[c.pipelineStatus ?? "MINAT"] ?? "bg-muted")}
                    >
                      {ALL_STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 min-w-32">
                    {c.progressRumah == null ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, c.progressRumah))}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{Math.round(c.progressRumah)}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <AgingBadge days={c.aging ?? 0} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/administrasi/customer/${c.id}`}>
                        <button className="text-xs text-muted-foreground hover:text-foreground underline">Detail</button>
                      </Link>
                      <Link href={`/administrasi/customer/${c.id}/edit`}>
                        <button className="text-xs text-blue-600 hover:text-blue-700 underline">Edit</button>
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id, c.nama)}
                        className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
