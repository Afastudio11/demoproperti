import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import BankSelect from "@/components/bank-select";
const OTS_STATUS = ["scheduled", "done", "reschedule", "gagal"];
const OTS_RESULT = ["lolos", "revisi", "ditolak"];
const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl p-5 w-full max-w-none shadow-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function OtsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: "", bank: "", scheduledDate: "", surveyorName: "", actualDate: "", status: "scheduled", result: "", notes: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ots-records"],
    queryFn: () => fetch("/api/administrasi/ots").then(r => r.json()),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["administrasi-customers-all"],
    queryFn: () => fetch("/api/administrasi/customers/master").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => fetch("/api/administrasi/ots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, customerId: parseInt(d.customerId) }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ots-records"] }); setShowForm(false); },
  });

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));
  const records: any[] = data?.records ?? [];
  const successRate = data?.successRate ?? 0;

  const RESULT_BADGE: Record<string, string> = { lolos: "bg-emerald-100 text-emerald-700", revisi: "bg-yellow-100 text-yellow-700", ditolak: "bg-red-100 text-red-700" };
  const STATUS_BADGE: Record<string, string> = { scheduled: "bg-blue-100 text-blue-700", done: "bg-emerald-100 text-emerald-700", reschedule: "bg-yellow-100 text-yellow-700", gagal: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">OTS Tracker</h1>
          <p className="text-sm text-muted-foreground">On The Spot Survey — tracking jadwal dan hasil survey bank</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Input OTS
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "OTS Dilakukan", value: data?.total ?? 0, color: "text-foreground" },
          { label: "OTS Lolos", value: data?.lolos ?? 0, color: "text-emerald-600" },
          { label: "Success Rate", value: `${successRate}%`, color: successRate >= 70 ? "text-emerald-600" : "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-xl font-semibold", color)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Customer", "Blok", "Bank", "Jadwal OTS", "Surveyor", "Status", "Hasil", "Catatan"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Belum ada data OTS.</td></tr>
              ) : records.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{r.customerName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.unitBlock}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{r.bank}</td>
                  <td className="px-3 py-2.5 text-xs">{r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.surveyorName ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", STATUS_BADGE[r.status] ?? "bg-muted text-muted-foreground")}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.result ? <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", RESULT_BADGE[r.result] ?? "bg-muted")}>{r.result}</span> : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-32 truncate">{r.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <h3 className="font-semibold text-sm mb-4">Input OTS</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer *</label>
            <select className={selectCls} value={form.customerId} onChange={set("customerId")} required>
              <option value="">-- Pilih Customer --</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.nama} — {c.unitBlock ?? c.id}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Bank</label>
            <BankSelect value={form.bank} onChange={v => setForm(p => ({ ...p, bank: v }))} />
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Jadwal OTS</label>
            <input className={inputCls} type="date" value={form.scheduledDate} onChange={set("scheduledDate")} />
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Nama Surveyor</label>
            <input className={inputCls} value={form.surveyorName} onChange={set("surveyorName")} />
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Tanggal OTS Aktual</label>
            <input className={inputCls} type="date" value={form.actualDate} onChange={set("actualDate")} />
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Status</label>
            <select className={selectCls} value={form.status} onChange={set("status")}>{OTS_STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Hasil OTS</label>
            <select className={selectCls} value={form.result} onChange={set("result")}>
              <option value="">-- Belum --</option>
              {OTS_RESULT.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Catatan</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={set("notes")} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-sm border rounded-md py-1.5">Batal</button>
            <button type="submit" disabled={save.isPending} className="flex-1 bg-foreground text-background text-sm font-medium rounded-md py-1.5 hover:opacity-90 disabled:opacity-50">
              {save.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
