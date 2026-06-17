import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => n ? `Rp ${(n / 1_000_000).toFixed(1)} Jt` : "-";
const STATUS = ["belum_cair", "sebagian_cair", "cair_penuh"];

type LedgerEntry = {
  id: number; akadId: number; tanggalCair: string; nominalCair: number;
  bankDeduction: number; destinationAccount: string | null; notes: string | null;
  createdBy: string | null; createdAt: string;
};

function PencairanDialog({ akadId, akadAmount, nominalCair, isLocked }: { akadId: number; akadAmount: number; nominalCair: number; isLocked: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tanggalCair: "", nominalCair: "", bankDeduction: "0", destinationAccount: "", notes: "" });

  const { data: ledger = [], isLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["akad-pencairan", akadId],
    queryFn: () => fetch(`/api/finance/akad-cair/${akadId}/pencairan`).then(r => r.json()),
    enabled: open,
  });

  const tambah = useMutation({
    mutationFn: () => fetch(`/api/finance/akad-cair/${akadId}/pencairan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, nominalCair: form.nominalCair, bankDeduction: form.bankDeduction }),
    }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["akad-pencairan", akadId] });
      qc.invalidateQueries({ queryKey: ["finance-akad-cair"] });
      setForm({ tanggalCair: "", nominalCair: "", bankDeduction: "0", destinationAccount: "", notes: "" });
      toast({ title: "Pencairan berhasil ditambahkan" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const lock = useMutation({
    mutationFn: () => fetch(`/api/finance/akad-cair/${akadId}/lock`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockedBy: "Finance" }),
    }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-akad-cair"] });
      toast({ title: "Akad cair berhasil dikunci" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const sisa = Math.max(0, akadAmount - nominalCair);
  const canSubmit = form.tanggalCair && Number(form.nominalCair) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          <ChevronDown className="size-3" /> Pencairan ({ledger.length || "…"})
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Riwayat & Tambah Pencairan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4 text-xs">
            <span>Total Akad: <strong>{fmtRp(akadAmount)}</strong></span>
            <span>Sudah Cair: <strong className="text-emerald-600">{fmtRp(nominalCair)}</strong></span>
            <span>Sisa: <strong className={sisa > 0 ? "text-amber-600" : "text-emerald-600"}>{fmtRp(sisa)}</strong></span>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Memuat riwayat pencairan...</p>
          ) : ledger.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada riwayat pencairan</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b">
                  <tr>{["Tanggal", "Nominal Cair", "Potongan Bank", "Rekening Tujuan", "Catatan", "Oleh"].map(h =>
                    <th key={h} className="px-2 py-1.5 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(ledger as LedgerEntry[]).map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="px-2 py-1.5">{l.tanggalCair}</td>
                      <td className="px-2 py-1.5 font-medium text-emerald-700">{fmtRp(l.nominalCair)}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{l.bankDeduction ? fmtRp(l.bankDeduction) : "-"}</td>
                      <td className="px-2 py-1.5">{l.destinationAccount ?? "-"}</td>
                      <td className="px-2 py-1.5 max-w-40 truncate">{l.notes ?? "-"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{l.createdBy ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLocked && sisa > 0 && (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold">Tambah Pencairan Baru</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Cair *</Label>
                  <Input type="date" className="h-8 text-xs" value={form.tanggalCair} onChange={e => setForm(p => ({ ...p, tanggalCair: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nominal Cair *</Label>
                  <CurrencyInput className="h-8 text-xs border rounded-md px-2 w-full" value={form.nominalCair} onChange={v => setForm(p => ({ ...p, nominalCair: v }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Potongan Bank</Label>
                  <CurrencyInput className="h-8 text-xs border rounded-md px-2 w-full" value={form.bankDeduction} onChange={v => setForm(p => ({ ...p, bankDeduction: v }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rekening Tujuan</Label>
                  <Input className="h-8 text-xs" value={form.destinationAccount} onChange={e => setForm(p => ({ ...p, destinationAccount: e.target.value }))} placeholder="No. rekening / nama bank" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Catatan</Label>
                  <Input className="h-8 text-xs" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan opsional" />
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => tambah.mutate()} disabled={!canSubmit || tambah.isPending}>
                <Plus className="size-3.5" />{tambah.isPending ? "Menyimpan..." : "Tambah Pencairan"}
              </Button>
            </div>
          )}

          {!isLocked && sisa === 0 && nominalCair > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/20">
              <p className="text-xs text-emerald-700 font-medium">Akad sudah cair penuh. Kunci untuk finalisasi.</p>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs border-emerald-300 text-emerald-700" onClick={() => lock.mutate()} disabled={lock.isPending}>
                <Lock className="size-3" /> Kunci Akad Cair
              </Button>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Akad cair sudah dikunci — tidak ada perubahan lebih lanjut
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceAkadCair() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edits, setEdits] = useState<Record<number, any>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["finance-akad-cair"],
    queryFn: () => fetch("/api/finance/akad-cair").then(r => r.json()),
  });
  const save = useMutation({
    mutationFn: ({ akadId, body }: any) => fetch(`/api/finance/akad-cair/${akadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-akad-cair"] });
      toast({ title: "Disimpan" });
    },
  });

  const rows: any[] = data?.records ?? [];
  const totals = rows.reduce((acc, r) => ({ akad: acc.akad + (r.akadAmount ?? 0), cair: acc.cair + (r.nominalCair ?? 0), sisa: acc.sisa + (r.sisaBelumCair ?? 0) }), { akad: 0, cair: 0, sisa: 0 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Akad Cair Tracker</h1>
        <p className="text-sm text-muted-foreground">Mirror akad dari Administrasi, status cair & multi-pencairan dikelola Finance.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Nilai Akad</p><p className="text-xl font-bold">{fmtRp(totals.akad)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sudah Cair</p><p className="text-xl font-bold text-emerald-600">{fmtRp(totals.cair)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Belum Cair</p><p className="text-xl font-bold text-amber-600">{fmtRp(totals.sisa)}</p></CardContent></Card>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/30">
            {["Customer", "Unit", "Bank", "Nilai Akad", "Progress", "Status Cair", "Total Cair", "Sisa", "Pencairan", ""].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">Memuat...</td></tr> : rows.map(r => {
              const e = edits[r.id] ?? {};
              const status = e.statusCair ?? r.statusCair;
              const isLocked = !!r.finance?.lockedAt;
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
                    {isLocked ? (
                      <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground border-muted">
                        <Lock className="size-2.5" /> {status.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <Select value={status} onValueChange={v => setEdits(p => ({ ...p, [r.id]: { ...e, statusCair: v } }))}>
                        <SelectTrigger className={cn("h-7 w-32 text-xs", status === "cair_penuh" && "text-emerald-600")}><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-emerald-700">{fmtRp(r.nominalCair)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{fmtRp(r.sisaBelumCair)}</td>
                  <td className="px-3 py-2">
                    <PencairanDialog akadId={r.id} akadAmount={r.akadAmount ?? 0} nominalCair={r.nominalCair ?? 0} isLocked={isLocked} />
                  </td>
                  <td className="px-3 py-2">
                    {!isLocked && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => save.mutate({ akadId: r.id, body: { statusCair: status, ...e } })}>Simpan</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
