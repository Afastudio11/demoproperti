import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, DollarSign, Landmark, Calendar, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtRp(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const EMPTY_KPP = { projectName: "", bankName: "", plafon: "", firstDisbursementDate: "", tenorMonths: "", interestRate: "", scheduleNotes: "" };
const EMPTY_PAY = { paymentDate: "", principalPaid: "", interestPaid: "", notes: "" };

export default function KppTracker() {
  const qc = useQueryClient();
  const [showKppForm, setShowKppForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState<number | null>(null);
  const [kppForm, setKppForm] = useState(EMPTY_KPP);
  const [payForm, setPayForm] = useState(EMPTY_PAY);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-kpp"],
    queryFn: () => fetch("/api/finance/kpp").then(r => r.json()),
    refetchInterval: 30000,
  });

  const facilities: any[] = data?.facilities ?? [];
  const recentPayments: any[] = data?.recentPayments ?? [];

  const addKpp = useMutation({
    mutationFn: (body: any) => fetch("/api/finance/kpp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-kpp"] }); setShowKppForm(false); setKppForm(EMPTY_KPP); },
  });

  const addPayment = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(`/api/finance/kpp/${id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-kpp"] }); setShowPayForm(null); setPayForm(EMPTY_PAY); },
  });

  const totalOutstanding = facilities.reduce((s, f) => s + f.outstanding, 0);
  const totalPlafon = facilities.reduce((s, f) => s + f.plafon, 0);

  // Build projection chart (6 months)
  const projectionData: { bulan: string; outstanding: number }[] = [];
  if (facilities.length > 0) {
    const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    let outstanding = totalOutstanding;
    const today = new Date();
    for (let i = 0; i <= 6; i++) {
      const d = new Date(today); d.setMonth(today.getMonth() + i);
      const estimatedPayment = outstanding > 0 ? Math.min(outstanding, totalOutstanding / Math.max(1, facilities[0]?.tenorMonths ?? 12)) : 0;
      projectionData.push({ bulan: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, outstanding: Math.max(0, outstanding) });
      outstanding -= estimatedPayment;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">KPP Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kredit Pemilikan Proyek — tracking dan proyeksi pelunasan</p>
        </div>
        <button onClick={() => setShowKppForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
          <Plus className="size-3.5" />
          Tambah KPP
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5"><Landmark className="size-3" />Total Plafon KPP</div>
          <div className="text-xl font-bold tabular-nums">{fmtRp(totalPlafon)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5"><AlertTriangle className="size-3" />Outstanding KPP</div>
          <div className={cn("text-xl font-bold tabular-nums", totalOutstanding > 3e9 ? "text-red-500" : totalOutstanding > 1e9 ? "text-amber-500" : "text-emerald-600")}>{fmtRp(totalOutstanding)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5"><Calendar className="size-3" />Jumlah KPP Aktif</div>
          <div className="text-xl font-bold tabular-nums">{facilities.length}</div>
        </div>
      </div>

      {/* Proyeksi Outstanding Chart */}
      {projectionData.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-1">Proyeksi Outstanding KPP</h2>
          <p className="text-xs text-muted-foreground mb-4">Estimasi saldo outstanding berdasarkan jadwal angsuran</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-10" />
              <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => [fmtRp(v), "Outstanding"]} />
              <Line type="monotone" dataKey="outstanding" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* KPP list */}
      <div className="space-y-3">
        {isLoading ? <div className="h-32 rounded-xl border bg-muted/30 animate-pulse" /> :
        facilities.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-8 text-center">
            <Landmark className="size-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada data KPP</p>
            <p className="text-xs text-muted-foreground mt-1">Klik "Tambah KPP" untuk memasukkan data KPP</p>
          </div>
        ) : facilities.map((f: any) => {
          const pct = f.plafon > 0 ? ((f.plafon - f.outstanding) / f.plafon) * 100 : 0;
          return (
            <div key={f.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold">{f.projectName}</div>
                  <div className="text-xs text-muted-foreground">{f.bankName} · {f.tenorMonths} bulan · {Number(f.interestRate).toFixed(1)}% p.a.</div>
                </div>
                <button onClick={() => setShowPayForm(f.id)} className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors shrink-0">
                  + Bayar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><div className="text-[10px] text-muted-foreground">Plafon</div><div className="text-sm font-medium tabular-nums">{fmtRp(f.plafon)}</div></div>
                <div><div className="text-[10px] text-muted-foreground">Sudah Dibayar</div><div className="text-sm font-medium text-emerald-600 tabular-nums">{fmtRp(f.totalPrincipalPaid)}</div></div>
                <div><div className="text-[10px] text-muted-foreground">Outstanding</div><div className={cn("text-sm font-bold tabular-nums", f.outstanding > 2e9 ? "text-red-500" : "text-amber-500")}>{fmtRp(f.outstanding)}</div></div>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(1)}% terlunasi</div>
            </div>
          );
        })}
      </div>

      {/* Riwayat Pembayaran */}
      {recentPayments.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold">Riwayat Pembayaran Terbaru</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">{["Tanggal","KPP","Pokok","Bunga","Catatan"].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {recentPayments.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-xs">{p.paymentDate}</td>
                    <td className="px-4 py-2 text-xs">{facilities.find((f: any) => f.id === p.kppId)?.projectName ?? p.kppId}</td>
                    <td className="px-4 py-2 text-xs text-emerald-600 tabular-nums">{fmtRp(Number(p.principalPaid))}</td>
                    <td className="px-4 py-2 text-xs text-amber-500 tabular-nums">{fmtRp(Number(p.interestPaid))}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Tambah KPP */}
      {showKppForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-semibold">Tambah KPP Baru</h2>
            {[
              { key: "projectName", label: "Nama Proyek", type: "text" },
              { key: "bankName", label: "Bank Pemberi KPP", type: "text" },
              { key: "plafon", label: "Plafon KPP (Rp)", type: "number" },
              { key: "firstDisbursementDate", label: "Tanggal Pencairan Pertama", type: "date" },
              { key: "tenorMonths", label: "Jangka Waktu (bulan)", type: "number" },
              { key: "interestRate", label: "Suku Bunga (% per tahun)", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <input type={f.type} value={(kppForm as any)[f.key]}
                  onChange={e => setKppForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground">Jadwal Angsuran</label>
              <textarea value={kppForm.scheduleNotes} onChange={e => setKppForm(p => ({ ...p, scheduleNotes: e.target.value }))}
                rows={3} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => addKpp.mutate(kppForm)} disabled={addKpp.isPending} className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">
                {addKpp.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowKppForm(false)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Bayar KPP */}
      {showPayForm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold">Input Pembayaran KPP</h2>
            <div className="text-xs text-muted-foreground">{facilities.find(f => f.id === showPayForm)?.projectName}</div>
            {[
              { key: "paymentDate", label: "Tanggal Pembayaran", type: "date" },
              { key: "principalPaid", label: "Pokok yang Dibayar (Rp)", type: "number" },
              { key: "interestPaid", label: "Bunga yang Dibayar (Rp)", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <input type={f.type} value={(payForm as any)[f.key]}
                  onChange={e => setPayForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground">Catatan</label>
              <textarea value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => addPayment.mutate({ id: showPayForm, ...payForm })} disabled={addPayment.isPending} className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">
                {addPayment.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowPayForm(null)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
