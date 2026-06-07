import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FileCheck, FileX, Clock, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DOCUMENT_TEMPLATES = [
  { documentName: "KTP Pemohon", category: "Identitas", isRequired: true },
  { documentName: "KTP Pasangan", category: "Identitas", isRequired: false },
  { documentName: "Kartu Keluarga", category: "Identitas", isRequired: true },
  { documentName: "Surat Nikah / Cerai", category: "Identitas", isRequired: false },
  { documentName: "NPWP", category: "Identitas", isRequired: true },
  { documentName: "Slip Gaji 3 Bulan Terakhir", category: "Penghasilan", isRequired: true },
  { documentName: "SK Pengangkatan / Kontrak Kerja", category: "Penghasilan", isRequired: true },
  { documentName: "Rekening Koran 3 Bulan Terakhir", category: "Penghasilan", isRequired: true },
  { documentName: "SPT Tahunan", category: "Pajak", isRequired: false },
  { documentName: "SIUP / NIB (Wiraswasta)", category: "Usaha", isRequired: false },
  { documentName: "Laporan Keuangan Usaha", category: "Usaha", isRequired: false },
  { documentName: "Surat Keterangan Kerja", category: "Pekerjaan", isRequired: false },
  { documentName: "Foto 4x6 Background Merah", category: "Foto", isRequired: true },
  { documentName: "Formulir KPR Bank", category: "Permohonan", isRequired: true },
  { documentName: "Surat Permohonan Kredit", category: "Permohonan", isRequired: true },
  { documentName: "Bukti Pembayaran Booking Fee", category: "Pembayaran", isRequired: true },
];

const STATUS_OPTIONS = [
  { key: "belum_ada", label: "Belum Ada", icon: FileX, color: "text-red-600 bg-red-50 border-red-200" },
  { key: "sudah_ada", label: "Sudah Ada", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "terverifikasi", label: "Terverifikasi", icon: FileCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const CATEGORIES = [...new Set(DOCUMENT_TEMPLATES.map(d => d.category))];

export default function DokumenPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = parseInt(params.customerId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterCat, setFilterCat] = useState("all");
  const [openInit, setOpenInit] = useState(false);

  const { data: customer } = useQuery<any>({
    queryKey: ["customer", customerId],
    queryFn: () => fetch(`/api/customers/${customerId}`).then(r => r.json()),
    enabled: !!customerId,
  });

  const { data: docs = [], isLoading } = useQuery<any[]>({
    queryKey: ["customer-documents", customerId],
    queryFn: () => fetch(`/api/administrasi/customers/${customerId}/documents`).then(r => r.json()),
    enabled: !!customerId,
  });

  const initMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/administrasi/customers/${customerId}/documents`);
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-documents", customerId] }); toast({ title: "Checklist diinisialisasi" }); setOpenInit(false); },
    onError: () => toast({ title: "Gagal menginisialisasi", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/administrasi/documents/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-documents", customerId] }),
  });

  const filtered = filterCat === "all" ? docs : (docs as any[]).filter(d => d.category === filterCat);
  const totalRequired = (docs as any[]).filter(d => d.isRequired).length;
  const totalVerified = (docs as any[]).filter(d => d.isRequired && d.status === "terverifikasi").length;
  const completionPct = totalRequired > 0 ? Math.round(totalVerified / totalRequired * 100) : 0;

  const catGroups = CATEGORIES.map(cat => {
    const catDocs = (filtered as any[]).filter(d => d.category === cat);
    if (catDocs.length === 0) return null;
    return { cat, docs: catDocs };
  }).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/administrasi/customer"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
          <div>
            <h1 className="text-lg font-semibold">Checklist Dokumen KPR</h1>
            <p className="text-xs text-muted-foreground">{customer?.nama ?? `Customer #${customerId}`}</p>
          </div>
        </div>
        {docs.length === 0 && (
          <Button size="sm" onClick={() => initMut.mutate()} disabled={initMut.isPending}>
            <Plus className="size-3.5 mr-1" />{initMut.isPending ? "..." : "Inisialisasi Checklist"}
          </Button>
        )}
      </div>

      {docs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Kelengkapan Wajib</p>
              <p className="text-xl font-semibold mt-1">{completionPct}%</p>
              <div className="h-1.5 bg-muted rounded-full mt-2">
                <div className={cn("h-full rounded-full", completionPct >= 80 ? "bg-emerald-500" : completionPct >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${completionPct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{totalVerified}/{totalRequired} dokumen wajib terverifikasi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Dokumen</p>
              <p className="text-xl font-semibold mt-1">{(docs as any[]).length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{(docs as any[]).filter(d => d.isRequired).length} wajib, {(docs as any[]).filter(d => !d.isRequired).length} opsional</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={cn("text-xl font-semibold mt-1", completionPct >= 80 ? "text-emerald-600" : completionPct >= 50 ? "text-amber-600" : "text-red-600")}>
                {completionPct >= 100 ? "Berkas Lengkap" : completionPct >= 50 ? "Dalam Proses" : "Belum Lengkap"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex gap-2">
          {["all", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                filterCat === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}>
              {cat === "all" ? "Semua" : cat}
            </button>
          ))}
        </div>
      )}

      {isLoading && <div className="py-8 text-center text-muted-foreground text-sm">Memuat...</div>}

      {!isLoading && docs.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Belum ada checklist dokumen. Klik "Inisialisasi Checklist" untuk membuat daftar dokumen standar KPR.
        </div>
      )}

      {catGroups.map((group: any) => (
        <Card key={group.cat}>
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{group.cat}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <tbody>
                {(group.docs as any[]).map((doc: any) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.documentName}</span>
                        {doc.isRequired && <span className="text-[9px] bg-red-50 text-red-600 px-1 rounded border border-red-200">Wajib</span>}
                      </div>
                      {doc.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{doc.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5 w-44">
                      <Select value={doc.status} onValueChange={v => updateMut.mutate({ id: doc.id, status: v })}>
                        <SelectTrigger className={cn("h-7 text-xs border",
                          doc.status === "terverifikasi" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                          doc.status === "sudah_ada" ? "bg-amber-50 border-amber-200 text-amber-700" :
                          "bg-red-50 border-red-200 text-red-700")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
