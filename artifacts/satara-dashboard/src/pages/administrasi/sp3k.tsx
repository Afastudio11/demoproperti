import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import BankSelect from "@/components/bank-select";
import { CurrencyInput } from "@/components/ui/currency-input";
const SP3K_STATUS = ["pending", "approved", "revisi", "ditolak"];
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

function fmtRp(n: number | null) {
  if (!n) return "-";
  return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
}

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

export default function Sp3kPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: "", bank: "", sp3kDate: "", sp3kNumber: "", approvedAmount: "", plafonAmount: "", expiryDate: "", status: "approved", revisionNotes: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sp3k-records"],
    queryFn: () => fetch("/api/administrasi/sp3k").then(r => r.json()),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["administrasi-customers-all"],
    queryFn: () => fetch("/api/administrasi/customers/master").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => fetch("/api/administrasi/sp3k", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, customerId: parseInt(d.customerId) }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sp3k-records"] }); setShowForm(false); },
  });

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const records: any[] = data?.records ?? [];
  const expiringSoon = records.filter(r => r.expiringSoon);

  const STATUS_BADGE: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    revisi: "bg-amber-100 text-amber-700",
    ditolak: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SP3K Tracker</h1>
          <p className="text-sm text-muted-foreground">Surat Persetujuan Pemberian Kredit — SP3K rate: {data?.sp3kRate ?? 0}%</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Input SP3K
        </button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <strong>{expiringSoon.length} SP3K</strong> akan expired dalam &lt;14 hari tetapi belum ada akad:{" "}
            {expiringSoon.map((r: any, i: number) => <span key={r.id}>{i > 0 ? ", " : ""}{r.customerName} ({r.daysLeft} hari)</span>)}
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Customer", "Blok", "Bank", "No SP3K", "Tanggal", "Nilai KPR", "Masa Berlaku", "Hari Tersisa", "Status"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">Belum ada data SP3K.</td></tr>
              ) : records.map((r: any) => (
                <tr key={r.id} className={cn("border-b last:border-0 hover:bg-muted/20", r.expiringSoon ? "bg-orange-50/30" : "")}>
                  <td className="px-3 py-2.5 font-medium">{r.customerName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.unitBlock}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{r.bank}</td>
                  <td className="px-3 py-2.5 text-xs font-mono">{r.sp3kNumber ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{r.sp3kDate ? new Date(r.sp3kDate).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{fmtRp(r.approvedAmount)}</td>
                  <td className="px-3 py-2.5 text-xs">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-3 py-2.5">
                    {r.daysLeft !== null ? (
                      <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-md",
                        r.daysLeft < 0 ? "bg-zinc-100 text-zinc-500" : r.daysLeft < 14 ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                        {r.daysLeft < 0 ? "Expired" : `${r.daysLeft} hari`}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", STATUS_BADGE[r.status] ?? "bg-muted")}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <h3 className="font-semibold text-sm mb-4">Input SP3K</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer *</label>
            <select className={selectCls} value={form.customerId} onChange={set("customerId")} required>
              <option value="">-- Pilih Customer --</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.nama} — {c.unitBlock ?? c.id}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Bank</label><BankSelect value={form.bank} onChange={v => setForm(p => ({ ...p, bank: v }))} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Tanggal SP3K</label><input className={inputCls} type="date" value={form.sp3kDate} onChange={set("sp3kDate")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Nomor SP3K</label><input className={inputCls} value={form.sp3kNumber} onChange={set("sp3kNumber")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Nilai KPR Disetujui (Rp)</label><CurrencyInput className={inputCls} value={form.approvedAmount} onChange={raw => setForm(p => ({ ...p, approvedAmount: raw }))} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Plafon (Rp)</label><CurrencyInput className={inputCls} value={form.plafonAmount} onChange={raw => setForm(p => ({ ...p, plafonAmount: raw }))} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Masa Berlaku (Deadline Akad)</label><input className={inputCls} type="date" value={form.expiryDate} onChange={set("expiryDate")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Status</label><select className={selectCls} value={form.status} onChange={set("status")}>{SP3K_STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label className="text-xs font-medium text-muted-foreground">Catatan Revisi</label><textarea className={inputCls} rows={2} value={form.revisionNotes} onChange={set("revisionNotes")} /></div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={save.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">{save.isPending ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
