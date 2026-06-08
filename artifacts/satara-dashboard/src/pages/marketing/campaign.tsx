import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { CategorySelectShadcn } from "@/components/category-select";

const DEFAULT_PLATFORMS = ["Instagram","Facebook","TikTok","Google Ads","YouTube","Twitter/X","WhatsApp Blast"];
const CPL_ALERT = 25000;

function fmtRp(n: number) { return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n); }
function fmtNum(n: number) { return new Intl.NumberFormat("id-ID").format(n); }

const EMPTY_FORM = {
  nama: "", platform: "Instagram", tipeKonten: "", anggaran: "", spend: "",
  impresi: "", klik: "", leadsGenerated: "", tanggalMulai: "", tanggalSelesai: "", status: "aktif",
};

export default function CampaignPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, projectId: "" });

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["marketing-campaigns"],
    queryFn: () => fetch("/api/marketing/campaigns").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body: any = { ...form };
      if (form.projectId) body.projectId = parseInt(form.projectId);
      ["anggaran","spend","impresi","klik","leadsGenerated"].forEach(k => {
        if (body[k]) body[k] = Number(body[k]); else delete body[k];
      });
      const r = await fetch("/api/marketing/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-campaigns"] }); toast({ title: "Campaign ditambahkan" }); setOpen(false); setForm({ ...EMPTY_FORM, projectId: "" }); },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/marketing/campaigns/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-campaigns"] }); toast({ title: "Campaign dihapus" }); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const totalSpend = (campaigns as any[]).reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalLeads = (campaigns as any[]).reduce((s, c) => s + (c.leadsGenerated ?? 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const alertCampaigns = (campaigns as any[]).filter(c => c.cpl > CPL_ALERT);

  const chartData = (campaigns as any[]).map(c => ({
    nama: c.nama.length > 10 ? c.nama.slice(0,10)+"..." : c.nama,
    CPL: c.cpl ?? 0, Spend: c.spend ?? 0, Leads: c.leadsGenerated ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Campaign Digital</h1>
          <p className="text-xs text-muted-foreground">Monitor performa iklan digital per campaign</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-3.5 mr-1" />Tambah Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-sm">Tambah Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Nama Campaign *</Label>
                  <Input className="h-8 text-xs" value={form.nama} onChange={e => set("nama", e.target.value)} placeholder="Nama campaign" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Platform</Label>
                  <CategorySelectShadcn type="marketing_platform" defaults={DEFAULT_PLATFORMS} value={form.platform} onValueChange={v => set("platform", v)} triggerClassName="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Proyek</Label>
                  <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                    <SelectContent>{(projects as any[]).map((p:any) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipe Konten</Label>
                  <Input className="h-8 text-xs" value={form.tipeKonten} onChange={e => set("tipeKonten", e.target.value)} placeholder="Video, Foto, Carousel..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                      <SelectItem value="pause">Pause</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Anggaran (Rp)</Label>
                  <CurrencyInput className="h-8 text-xs" value={form.anggaran} onChange={raw => set("anggaran", raw)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Spend Aktual (Rp)</Label>
                  <CurrencyInput className="h-8 text-xs" value={form.spend} onChange={raw => set("spend", raw)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Impresi</Label>
                  <Input type="number" className="h-8 text-xs" value={form.impresi} onChange={e => set("impresi", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Klik</Label>
                  <Input type="number" className="h-8 text-xs" value={form.klik} onChange={e => set("klik", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Leads Generated</Label>
                  <Input type="number" className="h-8 text-xs" value={form.leadsGenerated} onChange={e => set("leadsGenerated", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Mulai</Label>
                  <Input type="date" className="h-8 text-xs" value={form.tanggalMulai} onChange={e => set("tanggalMulai", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Selesai</Label>
                  <Input type="date" className="h-8 text-xs" value={form.tanggalSelesai} onChange={e => set("tanggalSelesai", e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
                <Button size="sm" disabled={!form.nama || createMut.isPending} onClick={() => createMut.mutate()}>
                  {createMut.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alertCampaigns.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-red-700">{alertCampaigns.length} campaign CPL di atas Rp 25.000: </span>
            <span className="text-red-600">{alertCampaigns.map(c => c.nama).join(", ")}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Spend", value: fmtRp(totalSpend) },
          { label: "Total Leads", value: fmtNum(totalLeads) },
          { label: "Avg CPL", value: fmtRp(avgCpl), alert: avgCpl > CPL_ALERT },
        ].map(({ label, value, alert }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-xl font-semibold", alert ? "text-red-600" : "")}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Daftar Campaign</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Nama","Platform","Proyek","Anggaran","Spend","Impresi","Klik","Leads","CPL","CTR","CPM","Status","Aksi"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : (campaigns as any[]).length === 0 ? (
                  <tr><td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">Belum ada campaign. Klik "Tambah Campaign" untuk mulai.</td></tr>
                ) : (campaigns as any[]).map(c => (
                  <tr key={c.id} className={cn("border-b hover:bg-muted/30", c.cpl > CPL_ALERT ? "bg-red-50/40" : "")}>
                    <td className="px-3 py-2 font-medium">{c.nama}</td>
                    <td className="px-3 py-2">{c.platform}</td>
                    <td className="px-3 py-2">{(projects as any[]).find((p:any) => p.id === c.projectId)?.nama ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.anggaran ? fmtRp(c.anggaran) : "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.spend ? fmtRp(c.spend) : "-"}</td>
                    <td className="px-3 py-2">{fmtNum(c.impresi ?? 0)}</td>
                    <td className="px-3 py-2">{fmtNum(c.klik ?? 0)}</td>
                    <td className="px-3 py-2">{c.leadsGenerated ?? 0}</td>
                    <td className={cn("px-3 py-2 font-medium", c.cpl > CPL_ALERT ? "text-red-600" : "text-emerald-600")}>
                      {c.cpl ? fmtRp(c.cpl) : "-"}
                      {c.cpl > CPL_ALERT && <AlertTriangle className="size-3 inline ml-1 text-red-500" />}
                    </td>
                    <td className="px-3 py-2">{c.ctr ? `${c.ctr}%` : "-"}</td>
                    <td className="px-3 py-2">{c.cpm ? fmtRp(c.cpm) : "-"}</td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                        c.status === "aktif" ? "bg-emerald-50 text-emerald-700" : c.status === "selesai" ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-700")}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                        onClick={() => confirm("Hapus campaign ini?") && deleteMut.mutate(c.id)}>Hapus</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">CPL per Campaign (Rp)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="nama" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmtRp(v)} />
                <Bar dataKey="CPL" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
