import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const PEKERJAAN_OPTIONS = ["PNS/ASN","TNI/Polri","BUMN","Swasta","Wiraswasta","Petani","Buruh","Pensiunan","Lainnya"];
const SOURCE_OPTIONS = ["Instagram","Facebook","TikTok","Google Ads","Referral","Walk-in","Pameran","Website","Lainnya"];
const BUDGET_OPTIONS = ["< 100 juta","100 - 150 juta","150 - 200 juta","200 - 300 juta","> 300 juta"];
const STATUS_OPTIONS = ["NEW_LEAD","CONTACTED","INTERESTED","SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN","BATAL","PENDING"];

export default function LeadNew() {
  const [, setLoc] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({
    nama: "", kontak: "", pekerjaan: "", alamat: "",
    source: "Instagram", namaKampanye: "", projectId: "",
    tahap: "", budget: "", picSales: "",
    status: "NEW_LEAD", alasanBatalPending: "", catatanFollowUp: "",
    tanggalSurveyDijadwalkan: "", tanggalBooking: "",
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const mut = useMutation({
    mutationFn: async () => {
      const body = { ...form, projectId: parseInt(form.projectId) };
      const r = await fetch("/api/marketing/leads", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { toast({ title: "Lead berhasil ditambahkan" }); setLoc("/marketing/lead"); },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const needsAlasan = ["BATAL","PENDING"].includes(form.status);

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-3">
        <Link href="/marketing/lead"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
        <div>
          <h1 className="text-lg font-semibold">Tambah Lead Baru</h1>
          <p className="text-xs text-muted-foreground">Isi data prospek calon pembeli</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Data Identitas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nama Lengkap *</Label>
              <Input className="h-8 text-xs" value={form.nama} onChange={e => set("nama", e.target.value)} placeholder="Nama calon pembeli" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">No. HP / WhatsApp *</Label>
              <Input className="h-8 text-xs" value={form.kontak} onChange={e => set("kontak", e.target.value)} placeholder="08xx..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pekerjaan</Label>
              <Select value={form.pekerjaan} onValueChange={v => set("pekerjaan", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
                <SelectContent>{PEKERJAAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alamat</Label>
              <Input className="h-8 text-xs" value={form.alamat} onChange={e => set("alamat", e.target.value)} placeholder="Alamat domisili" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Data Lead</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Sumber Lead *</Label>
              <Select value={form.source} onValueChange={v => set("source", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nama Campaign</Label>
              <Input className="h-8 text-xs" value={form.namaKampanye} onChange={e => set("namaKampanye", e.target.value)} placeholder="Nama campaign / iklan" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Proyek *</Label>
              <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                <SelectContent>{(projects as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipe Unit yang Diminati</Label>
              <Input className="h-8 text-xs" value={form.tahap} onChange={e => set("tahap", e.target.value)} placeholder="Tipe 36, Tipe 45, dll." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Budget Range</Label>
              <Select value={form.budget} onValueChange={v => set("budget", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih budget" /></SelectTrigger>
                <SelectContent>{BUDGET_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PIC Sales</Label>
              <Input className="h-8 text-xs" value={form.picSales} onChange={e => set("picSales", e.target.value)} placeholder="Nama sales" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Status & Tracking</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Survey Dijadwalkan</Label>
              <Input type="date" className="h-8 text-xs" value={form.tanggalSurveyDijadwalkan} onChange={e => set("tanggalSurveyDijadwalkan", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Booking</Label>
              <Input type="date" className="h-8 text-xs" value={form.tanggalBooking} onChange={e => set("tanggalBooking", e.target.value)} />
            </div>
            {needsAlasan && (
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Alasan Batal / Pending *</Label>
                <Input className="h-8 text-xs" value={form.alasanBatalPending} onChange={e => set("alasanBatalPending", e.target.value)} placeholder="Wajib diisi jika status Batal/Pending" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Catatan Follow Up</Label>
            <Textarea className="text-xs min-h-16" value={form.catatanFollowUp} onChange={e => set("catatanFollowUp", e.target.value)} placeholder="Catatan interaksi dan follow up" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" asChild><Link href="/marketing/lead">Batal</Link></Button>
        <Button size="sm" disabled={!form.nama || !form.kontak || !form.projectId || mut.isPending}
          onClick={() => mut.mutate()}>
          {mut.isPending ? "Menyimpan..." : "Simpan Lead"}
        </Button>
      </div>
    </div>
  );
}
