import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Eye, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const FINDING_LABELS: Record<string, string> = {
  duplikat: "Transaksi Duplikat",
  pembayaran_ganda: "Pembayaran Ganda",
  tidak_wajar: "Pengeluaran Tidak Wajar",
  selisih_bank: "Selisih Rekening Koran",
  selisih_kas: "Selisih Kas",
  tanpa_kategori: "Transaksi Tanpa Kategori",
  tanpa_referensi: "Pembayaran Tanpa Referensi",
};

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-red-100 text-red-700",
  ditinjau: "bg-amber-100 text-amber-700",
  diselesaikan: "bg-emerald-100 text-emerald-700",
  dieskalasi: "bg-purple-100 text-purple-700",
};

export default function AuditCenter() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ findingType: "duplikat", description: "", transactionDate: "", amount: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["finance-audit"],
    queryFn: () => fetch("/api/finance/audit").then(r => r.json()),
    refetchInterval: 30000,
  });

  const findings: any[] = data?.findings ?? [];
  const stats = data?.stats ?? { total: 0, baru: 0, belumSelesai: 0, totalNilai: 0 };

  const updateStatus = useMutation({
    mutationFn: ({ id, status, resolutionNotes, reviewedBy }: any) =>
      fetch(`/api/finance/audit/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolutionNotes, reviewedBy: "admin" }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-audit"] }); setSelected(null); },
  });

  const addFinding = useMutation({
    mutationFn: (body: any) => fetch("/api/finance/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-audit"] }); setShowAddForm(false); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Audit Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deteksi anomali dan potensi kesalahan dalam data keuangan</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
          <Shield className="size-3.5" />
          Tambah Temuan
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Temuan", value: stats.total, icon: Shield },
          { label: "Temuan Baru", value: stats.baru, icon: AlertTriangle, alert: stats.baru > 0 },
          { label: "Belum Diselesaikan", value: stats.belumSelesai, icon: Eye, alert: stats.belumSelesai > 0 },
          { label: "Nilai Transaksi Bermasalah", value: fmtRp(stats.totalNilai), icon: AlertTriangle, isText: true },
        ].map(item => (
          <div key={item.label} className={cn("rounded-xl border bg-card p-4", item.alert ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-700" : "")}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <item.icon className={cn("size-3", item.alert ? "text-amber-500" : "")} />
              {item.label}
            </div>
            <div className={cn("text-xl font-bold tabular-nums", item.alert ? "text-amber-600" : "")}>{item.isText ? item.value : item.value}</div>
          </div>
        ))}
      </div>

      {/* Jenis pemeriksaan */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Jenis Pemeriksaan Otomatis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(FINDING_LABELS).map(([key, label]) => {
            const count = findings.filter(f => f.findingType === key && f.status !== "diselesaikan").length;
            return (
              <div key={key} className={cn("rounded-lg border p-3 text-xs", count > 0 ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : "")}>
                <div className="font-medium mb-1">{label}</div>
                {count > 0 ? <div className="text-amber-600 font-semibold">{count} temuan aktif</div> : <div className="text-emerald-600">Tidak ada temuan</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Findings list */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b"><h2 className="text-sm font-semibold">Daftar Temuan</h2></div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Memuat...</div>
        ) : findings.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="size-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium">Tidak ada temuan audit</p>
            <p className="text-xs text-muted-foreground mt-1">Sistem tidak mendeteksi anomali dalam data keuangan</p>
          </div>
        ) : (
          <div className="divide-y">
            {findings.map((f: any) => (
              <div key={f.id} className={cn("p-4 hover:bg-muted/30 transition-colors", f.status === "baru" ? "border-l-4 border-red-400" : f.status === "ditinjau" ? "border-l-4 border-amber-400" : "")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{FINDING_LABELS[f.findingType] ?? f.findingType}</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[f.status])}>{f.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {f.transactionDate && <span>Tanggal: {f.transactionDate}</span>}
                      {f.amount && <span>Nilai: {fmtRp(Number(f.amount))}</span>}
                    </div>
                    {f.resolutionNotes && <p className="text-xs text-emerald-600 mt-1">Resolusi: {f.resolutionNotes}</p>}
                  </div>
                  {f.status !== "diselesaikan" && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => { setSelected(f); setNotes(""); }}
                        className="text-xs px-2.5 py-1 rounded-md border hover:bg-muted transition-colors">
                        Tindak Lanjut
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold">Tindak Lanjut Temuan</h2>
            <p className="text-xs text-muted-foreground">{selected.description}</p>
            <div>
              <label className="text-xs text-muted-foreground">Catatan Resolusi</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button onClick={() => updateStatus.mutate({ id: selected.id, status: "ditinjau", resolutionNotes: notes })} className="border text-sm py-2 rounded-md hover:bg-muted text-amber-600 border-amber-300">Tandai Sudah Ditinjau</button>
              <button onClick={() => updateStatus.mutate({ id: selected.id, status: "diselesaikan", resolutionNotes: notes })} className="bg-emerald-600 text-white text-sm py-2 rounded-md hover:bg-emerald-700">Tandai Diselesaikan</button>
              <button onClick={() => updateStatus.mutate({ id: selected.id, status: "dieskalasi", resolutionNotes: notes })} className="bg-purple-600 text-white text-sm py-2 rounded-md hover:bg-purple-700">Eskalasi ke CEO</button>
              <button onClick={() => setSelected(null)} className="border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Add finding form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold">Tambah Temuan Manual</h2>
            <div><label className="text-xs text-muted-foreground">Jenis Temuan</label>
              <select value={addForm.findingType} onChange={e => setAddForm(p => ({ ...p, findingType: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
                {Object.entries(FINDING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Deskripsi</label>
              <textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div><label className="text-xs text-muted-foreground">Tanggal Transaksi</label>
              <input type="date" value={addForm.transactionDate} onChange={e => setAddForm(p => ({ ...p, transactionDate: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
            </div>
            <div><label className="text-xs text-muted-foreground">Nilai (Rp)</label>
              <input type="number" value={addForm.amount} onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => addFinding.mutate(addForm)} disabled={addFinding.isPending} className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">Simpan</button>
              <button onClick={() => setShowAddForm(false)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
