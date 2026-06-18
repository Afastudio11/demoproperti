import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Landmark, Link2, Percent, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmtRp = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
};

const EMPTY = {
  facilityName: "",
  facilityType: "kredit",
  lenderName: "",
  projectId: "",
  stageCode: "",
  plafon: "",
  interestRateAnnual: "",
  tenorMonths: "",
  startDate: "",
  notes: "",
};

type Project = { id: number; nama: string };
type Unit = { id: number; projectId: number; blok: string; nomor: string; tipe: string; stageCode: string | null; customerId: number | null; progress: number };
type Facility = {
  id: number;
  facilityName: string;
  facilityType: string;
  lenderName: string;
  projectId: number;
  projectName: string;
  stageCode: string | null;
  plafon: number;
  outstandingPrincipal: number;
  interestRateAnnual: number;
  interestMonthly: number;
  status: string;
  allocatedUnitCount: number;
  akadCairUnitCount: number;
  totalAkadCair: number;
  allocationWarning: string | null;
  allocations: Array<{ id: number; unitId: number | null; stageCode: string | null; allocatedPrincipal: number; unit: Unit | null }>;
  transactions: Array<{ id: number; type: string; amount: number; transactionDate: string; notes: string | null }>;
};

export default function CreditInvestmentCenter() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [allocationTarget, setAllocationTarget] = useState<Facility | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [allocationStage, setAllocationStage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["finance-credit-facilities"],
    queryFn: () => fetch("/api/finance/credit-facilities").then(r => r.json()) as Promise<{ facilities: Facility[] }>,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()) as Promise<Project[]>,
  });
  const { data: units = [] } = useQuery({
    queryKey: ["units-list"],
    queryFn: () => fetch("/api/units").then(r => r.json()) as Promise<Unit[]>,
  });

  const facilities = data?.facilities ?? [];
  const totals = facilities.reduce((acc, f) => ({
    plafon: acc.plafon + f.plafon,
    outstanding: acc.outstanding + f.outstandingPrincipal,
    bunga: acc.bunga + f.interestMonthly,
    akadCair: acc.akadCair + f.totalAkadCair,
  }), { plafon: 0, outstanding: 0, bunga: 0, akadCair: 0 });

  const createFacility = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/finance/credit-facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          projectId: Number(form.projectId),
          plafon: Number(form.plafon || 0),
          outstandingPrincipal: Number(form.plafon || 0),
          interestRateAnnual: Number(form.interestRateAnnual || 0),
          tenorMonths: form.tenorMonths ? Number(form.tenorMonths) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal menyimpan fasilitas");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-credit-facilities"] });
      setShowForm(false);
      setForm(EMPTY);
    },
  });

  const saveAllocation = useMutation({
    mutationFn: async () => {
      if (!allocationTarget) return null;
      const res = await fetch(`/api/finance/credit-facilities/${allocationTarget.id}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitIds: selectedUnitIds, stageCode: allocationStage || allocationTarget.stageCode }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal menyimpan alokasi");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-credit-facilities"] });
      setAllocationTarget(null);
      setSelectedUnitIds([]);
      setAllocationStage("");
    },
  });

  const syncAkad = useMutation({
    mutationFn: async (facilityId: number) => {
      const res = await fetch(`/api/finance/credit-facilities/${facilityId}/sync-akad`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal sync akad");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-credit-facilities"] }),
  });

  const accrueInterest = useMutation({
    mutationFn: async () => {
      const period = new Date().toISOString().slice(0, 7);
      const res = await fetch(`/api/finance/credit-facilities/accrue-interest?period=${period}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal accrue bunga");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-credit-facilities"] }),
  });

  const targetUnits = useMemo(() => {
    if (!allocationTarget) return [];
    return units.filter(u => u.projectId === allocationTarget.projectId && (!allocationStage || u.stageCode === allocationStage));
  }, [allocationTarget, allocationStage, units]);

  function openAllocation(f: Facility) {
    setAllocationTarget(f);
    setSelectedUnitIds(f.allocations.map(a => a.unitId).filter((id): id is number => typeof id === "number"));
    setAllocationStage(f.stageCode ?? "");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Kredit & Investment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fasilitas bank/investor yang terhubung ke unit dan Akad Cair.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => accrueInterest.mutate()} disabled={accrueInterest.isPending}>
            <Percent className="size-4" /> Accrue Bunga
          </Button>
          <Button className="gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={() => setShowForm(true)}>
            <Plus className="size-4" /> Tambah Kredit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total Plafon" value={fmtRp(totals.plafon)} icon={Landmark} />
        <Metric label="Outstanding Pokok" value={fmtRp(totals.outstanding)} tone={totals.outstanding > 0 ? "warn" : "ok"} icon={AlertTriangle} />
        <Metric label="Akad Cair Terkait" value={fmtRp(totals.akadCair)} tone="ok" icon={Link2} />
        <Metric label="Bunga Bulanan" value={fmtRp(totals.bunga)} icon={Percent} />
      </div>

      {isLoading ? (
        <div className="py-10 text-sm text-muted-foreground text-center">Memuat kredit...</div>
      ) : facilities.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Landmark className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Belum ada fasilitas kredit/investment</p>
          <p className="text-xs text-muted-foreground mt-1">Tambahkan fasilitas, lalu link ke unit proyek agar Akad Cair bisa mengurangi pokok otomatis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {facilities.map(f => {
            const paidPct = f.plafon ? Math.round(((f.plafon - f.outstandingPrincipal) / f.plafon) * 100) : 0;
            return (
              <div key={f.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold">{f.facilityName}</h2>
                      <Badge variant={f.status === "closed" ? "secondary" : "outline"}>{f.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.lenderName} · {f.projectName}{f.stageCode ? ` · ${f.stageCode}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openAllocation(f)}>
                      <Link2 className="size-3.5" /> Alokasi Unit
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => syncAkad.mutate(f.id)} disabled={syncAkad.isPending}>
                      <RefreshCw className="size-3.5" /> Sync Akad
                    </Button>
                  </div>
                </div>
                {f.allocationWarning && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">{f.allocationWarning}</p>}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                  <Info label="Plafon" value={fmtRp(f.plafon)} />
                  <Info label="Sisa Pokok" value={fmtRp(f.outstandingPrincipal)} strong tone={f.outstandingPrincipal > 0 ? "warn" : "ok"} />
                  <Info label="Unit Dialokasikan" value={`${f.akadCairUnitCount}/${f.allocatedUnitCount}`} />
                  <Info label="Akad Cair" value={fmtRp(f.totalAkadCair)} tone="ok" />
                  <Info label="Bunga/Bulan" value={fmtRp(f.interestMonthly)} />
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, paidPct))}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground">{paidPct}% pokok tertutup dari akad cair / pembayaran pokok.</div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Kredit / Investment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama Fasilitas" value={form.facilityName} onChange={v => setForm(p => ({ ...p, facilityName: v }))} span />
            <Field label="Bank / Investor" value={form.lenderName} onChange={v => setForm(p => ({ ...p, lenderName: v }))} span />
            <div className="space-y-1">
              <Label className="text-xs">Proyek</Label>
              <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Tahap" value={form.stageCode} onChange={v => setForm(p => ({ ...p, stageCode: v.toUpperCase() }))} placeholder="T1" />
            <Field label="Plafon / Pokok" value={form.plafon} onChange={v => setForm(p => ({ ...p, plafon: v }))} type="number" />
            <Field label="Bunga % / Tahun" value={form.interestRateAnnual} onChange={v => setForm(p => ({ ...p, interestRateAnnual: v }))} type="number" />
            <Field label="Tenor Bulan" value={form.tenorMonths} onChange={v => setForm(p => ({ ...p, tenorMonths: v }))} type="number" />
            <Field label="Tanggal Mulai" value={form.startDate} onChange={v => setForm(p => ({ ...p, startDate: v }))} type="date" />
            <Field label="Catatan" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} span />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={() => createFacility.mutate()} disabled={!form.lenderName || !form.projectId || !form.plafon || createFacility.isPending}>
              {createFacility.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!allocationTarget} onOpenChange={open => !open && setAllocationTarget(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Alokasi Unit Kredit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pilih unit yang dibiayai oleh {allocationTarget?.facilityName}. Akad Cair dari unit ini akan mengurangi outstanding pokok otomatis.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Filter Tahap" value={allocationStage} onChange={v => setAllocationStage(v.toUpperCase())} placeholder="T1" />
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Unit dipilih</div>
                <div className="text-xl font-semibold">{selectedUnitIds.length}</div>
              </div>
            </div>
            <div className="rounded-lg border max-h-80 overflow-y-auto">
              {targetUnits.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">Tidak ada unit untuk filter ini.</div>
              ) : targetUnits.map(unit => {
                const checked = selectedUnitIds.includes(unit.id);
                return (
                  <label key={unit.id} className="flex items-center justify-between gap-3 px-3 py-2 border-b last:border-0 text-sm hover:bg-muted/30">
                    <span>
                      <span className="font-medium">{unit.blok}-{unit.nomor}</span>
                      <span className="text-muted-foreground"> · {unit.tipe} · {unit.stageCode ?? "-"}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setSelectedUnitIds(prev => e.target.checked ? [...prev, unit.id] : prev.filter(id => id !== unit.id))}
                    />
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocationTarget(null)}>Batal</Button>
            <Button onClick={() => saveAllocation.mutate()} disabled={saveAllocation.isPending}>
              {saveAllocation.isPending ? "Menyimpan..." : "Simpan Alokasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Icon className="size-3.5" />{label}</div>
      <div className={cn("text-xl font-bold", tone === "ok" && "text-emerald-600", tone === "warn" && "text-amber-600")}>{value}</div>
    </div>
  );
}

function Info({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm", strong ? "font-bold" : "font-medium", tone === "ok" && "text-emerald-600", tone === "warn" && "text-amber-600")}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, span }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; span?: boolean }) {
  return (
    <div className={cn("space-y-1", span && "col-span-2")}>
      <Label className="text-xs">{label}</Label>
      <Input className="h-8 text-sm" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
