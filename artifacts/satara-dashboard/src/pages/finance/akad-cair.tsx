import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const fmtRp = (n: number) => n ? `Rp ${(n / 1_000_000).toFixed(0)} Jt` : "-";
const STATUS = ["belum_cair", "sebagian_cair", "cair_penuh"];

export default function FinanceAkadCair() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<number, any>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["finance-akad-cair"],
    queryFn: () => fetch("/api/finance/akad-cair").then(r => r.json()),
  });
  const rows: any[] = data?.records ?? [];
  const save = useMutation({
    mutationFn: ({ akadId, body }: any) => fetch(`/api/finance/akad-cair/${akadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-akad-cair"] }),
  });
  const totals = rows.reduce((acc, r) => ({ akad: acc.akad + (r.akadAmount ?? 0), cair: acc.cair + (r.nominalCair ?? 0), sisa: acc.sisa + (r.sisaBelumCair ?? 0) }), { akad: 0, cair: 0, sisa: 0 });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Akad Cair Tracker</h1>
        <p className="text-sm text-muted-foreground">Mirror akad dari Administrasi, status cair dikelola Finance.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Nilai Akad</p><p className="text-xl font-bold">{fmtRp(totals.akad)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sudah Cair</p><p className="text-xl font-bold text-emerald-600">{fmtRp(totals.cair)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Belum Cair</p><p className="text-xl font-bold text-amber-600">{fmtRp(totals.sisa)}</p></CardContent></Card>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/30">
            {["Customer", "Unit", "Bank", "Nilai Akad", "Progress Rumah", "Status Cair", "Tanggal", "Nominal Cair", "Potongan", "Rekening", "Bukti", "Sisa", "Catatan", ""].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={14} className="py-10 text-center text-muted-foreground">Memuat...</td></tr> : rows.map(r => {
              const e = edits[r.id] ?? {};
              const status = e.statusCair ?? r.statusCair;
              const nominal = e.nominalCair ?? String(r.nominalCair ?? 0);
              const bankDeduction = e.bankDeduction ?? String(r.finance?.bankDeduction ?? 0);
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{r.customerName}</td>
                  <td className="px-3 py-2">{r.unitBlock}</td>
                  <td className="px-3 py-2">{r.bank}</td>
                  <td className="px-3 py-2">{fmtRp(r.akadAmount)}</td>
                  <td className="px-3 py-2 min-w-32">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${r.progressRumah ?? 0}%` }} /></div>
                    <span className="text-[10px] text-muted-foreground">{Math.round(r.progressRumah ?? 0)}%</span>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={status} onValueChange={v => setEdits(p => ({ ...p, [r.id]: { ...e, statusCair: v } }))}>
                      <SelectTrigger className={cn("h-7 w-32 text-xs", status === "cair_penuh" && "text-emerald-600")}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2"><Input type="date" className="h-7 w-32 text-xs" value={e.tanggalCair ?? r.finance?.tanggalCair ?? ""} onChange={ev => setEdits(p => ({ ...p, [r.id]: { ...e, tanggalCair: ev.target.value } }))} /></td>
                  <td className="px-3 py-2"><CurrencyInput className="h-7 w-32 text-xs border rounded-md px-2" value={nominal} onChange={raw => setEdits(p => ({ ...p, [r.id]: { ...e, nominalCair: raw } }))} /></td>
                  <td className="px-3 py-2"><CurrencyInput className="h-7 w-28 text-xs border rounded-md px-2" value={bankDeduction} onChange={raw => setEdits(p => ({ ...p, [r.id]: { ...e, bankDeduction: raw } }))} /></td>
                  <td className="px-3 py-2"><Input className="h-7 w-36 text-xs" value={e.destinationAccount ?? r.finance?.destinationAccount ?? ""} onChange={ev => setEdits(p => ({ ...p, [r.id]: { ...e, destinationAccount: ev.target.value } }))} /></td>
                  <td className="px-3 py-2"><Input className="h-7 w-36 text-xs" value={e.proofUrl ?? r.finance?.proofUrl ?? ""} onChange={ev => setEdits(p => ({ ...p, [r.id]: { ...e, proofUrl: ev.target.value } }))} placeholder="URL bukti" /></td>
                  <td className="px-3 py-2">{fmtRp(Math.max(0, (r.akadAmount ?? 0) - Number(nominal || 0)))}</td>
                  <td className="px-3 py-2"><Input className="h-7 w-36 text-xs" value={e.notes ?? r.finance?.notes ?? ""} onChange={ev => setEdits(p => ({ ...p, [r.id]: { ...e, notes: ev.target.value } }))} /></td>
                  <td className="px-3 py-2"><Button size="sm" className="h-7 text-xs" onClick={() => save.mutate({ akadId: r.id, body: { statusCair: status, nominalCair: nominal, bankDeduction, destinationAccount: e.destinationAccount ?? r.finance?.destinationAccount, proofUrl: e.proofUrl ?? r.finance?.proofUrl, tanggalCair: e.tanggalCair ?? r.finance?.tanggalCair, notes: e.notes ?? r.finance?.notes } })}>Simpan</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
