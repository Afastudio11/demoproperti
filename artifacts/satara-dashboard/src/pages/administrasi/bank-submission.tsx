import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import BankSelect from "@/components/bank-select";

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

const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

export default function BankSubmissionPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: "", bank: "", submittedDate: "", bankOfficer: "", registrationNumber: "", notes: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bank-submissions"],
    queryFn: () => fetch("/api/administrasi/bank-submissions").then(r => r.json()),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["administrasi-customers-all"],
    queryFn: () => fetch("/api/administrasi/customers/master").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (data: typeof form) => fetch("/api/administrasi/bank-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, customerId: parseInt(data.customerId) }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-submissions"] }); setShowForm(false); setForm({ customerId: "", bank: "", submittedDate: "", bankOfficer: "", registrationNumber: "", notes: "" }); },
  });

  const submissions: any[] = data ?? [];
  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bank Submission Tracker</h1>
          <p className="text-sm text-muted-foreground">Tracking berkas yang sudah disetor ke bank</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90">
          <Plus className="size-3.5" /> Tambah Setor
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Customer", "Blok", "Bank", "Tanggal Setor", "Hari Berlalu", "Status Saat Ini", "Petugas Bank", "Reg. Bank"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Belum ada data setor bank.</td></tr>
              ) : submissions.map((s: any) => {
                const rowCls = s.aging > 60 ? "bg-red-50/50" : s.aging > 30 ? "bg-yellow-50/50" : "";
                return (
                  <tr key={s.id} className={cn("border-b last:border-0", rowCls)}>
                    <td className="px-3 py-2.5 font-medium">{s.customerName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{s.unitBlock}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{s.bank}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.submittedDate ? new Date(s.submittedDate).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-md",
                        s.aging > 60 ? "bg-red-100 text-red-700" : s.aging > 30 ? "bg-yellow-100 text-yellow-700" : "bg-muted text-muted-foreground")}>
                        {s.aging} hari
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{s.currentStatus ?? "-"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.bankOfficer ?? "-"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{s.registrationNumber ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <h3 className="font-semibold text-sm mb-4">Input Setor Bank</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer *</label>
            <select className={selectCls} value={form.customerId} onChange={set("customerId")} required>
              <option value="">-- Pilih Customer --</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.nama} — {c.unitBlock ?? c.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Bank *</label>
            <BankSelect value={form.bank} onChange={v => setForm(p => ({ ...p, bank: v }))} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tanggal Setor</label>
            <input className={inputCls} type="date" value={form.submittedDate} onChange={set("submittedDate")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Petugas Bank</label>
            <input className={inputCls} value={form.bankOfficer} onChange={set("bankOfficer")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nomor Registrasi Bank</label>
            <input className={inputCls} value={form.registrationNumber} onChange={set("registrationNumber")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Catatan</label>
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
