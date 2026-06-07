import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign } from "lucide-react";
import BankSelect from "@/components/bank-select";
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl p-5 w-full max-w-md shadow-lg">
        {children}
      </div>
    </div>
  );
}

export default function HtPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: "", bank: "", htDate: "", htAmount: "", accountNumber: "", notes: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ht-records"],
    queryFn: () => fetch("/api/administrasi/ht").then(r => r.json()),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["administrasi-customers-all"],
    queryFn: () => fetch("/api/administrasi/customers").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => fetch("/api/administrasi/ht", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, customerId: parseInt(d.customerId) }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ht-records"] }); setShowForm(false); },
  });

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const records: any[] = data?.records ?? [];
  const bankTotals: Record<string, number> = data?.bankTotals ?? {};
  const bankEntries = Object.entries(bankTotals).sort((a, b) => b[1] - a[1]);
  const totalBankHt = bankEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">HT Tracker</h1>
          <p className="text-sm text-muted-foreground">Hak Tanggungan — pencairan dana ke developer</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Input HT Cair
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "HT Bulan Ini", value: fmtRp(data?.htBulanIni ?? 0), sub: `${data?.unitBulanIni ?? 0} unit`, color: "text-emerald-600" },
          { label: "HT Tahun Ini", value: fmtRp(data?.htTahunIni ?? 0), sub: `${data?.unitTahunIni ?? 0} unit`, color: "text-emerald-600" },
          { label: "Avg. Lag Akad→HT", value: `${data?.avgLag ?? 0} hari`, sub: "rata-rata waktu cair", color: "text-blue-600" },
          { label: "Total Unit HT", value: records.length, sub: "semua waktu", color: "text-foreground" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={`text-lg font-semibold ${color}`}>{value}</div>
            <div className="text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {bankEntries.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">HT per Bank</div>
          <div className="space-y-2">
            {bankEntries.map(([bank, total]) => (
              <div key={bank} className="flex items-center gap-3">
                <span className="text-xs font-semibold w-20 shrink-0">{bank}</span>
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalBankHt > 0 ? (total / totalBankHt) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">{fmtRp(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Customer", "Blok", "Bank", "Tgl Akad", "Tgl HT Cair", "Nilai HT", "Lag (hari)", "No Rek"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Belum ada data HT cair.</td></tr>
              ) : records.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{r.customerName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.unitBlock}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{r.bank}</td>
                  <td className="px-3 py-2.5 text-xs">{r.akadDate ? new Date(r.akadDate).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{r.htDate ? new Date(r.htDate).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-emerald-700">{r.htAmount ? fmtRp(r.htAmount) : "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{r.lag !== null ? `${r.lag} hari` : "-"}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{r.accountNumber ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <h3 className="font-semibold text-sm mb-4">Input HT Cair</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Customer *</label>
            <select className={selectCls} value={form.customerId} onChange={set("customerId")} required>
              <option value="">-- Pilih Customer --</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.nama} — {c.unitBlock ?? c.id}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Bank</label><BankSelect value={form.bank} onChange={v => setForm(p => ({ ...p, bank: v }))} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Tanggal HT Cair</label><input className={inputCls} type="date" value={form.htDate} onChange={set("htDate")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Nilai HT Diterima (Rp)</label><input className={inputCls} type="number" value={form.htAmount} onChange={set("htAmount")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Nomor Rekening Tujuan</label><input className={inputCls} value={form.accountNumber} onChange={set("accountNumber")} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Keterangan</label><textarea className={inputCls} rows={2} value={form.notes} onChange={set("notes")} /></div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={save.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">{save.isPending ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
