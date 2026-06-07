import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Edit, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PIPELINE_STEPS = [
  "NEW_LEAD","CONTACTED","INTERESTED","SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP",
];

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD:"New Lead", CONTACTED:"Contacted", INTERESTED:"Interested",
  SURVEY_DIJADWALKAN:"Survey Dijadwalkan", SURVEY_DILAKUKAN:"Survey Dilakukan",
  BOOKING:"Booking", BERKAS_LENGKAP:"Berkas Lengkap", DISERAHKAN_ADMIN:"Diserahkan Admin",
  BATAL:"Batal", PENDING:"Pending",
};

const STATUS_COLOR: Record<string, string> = {
  NEW_LEAD: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  INTERESTED: "bg-purple-50 text-purple-700 border-purple-200",
  SURVEY_DIJADWALKAN: "bg-amber-50 text-amber-700 border-amber-200",
  SURVEY_DILAKUKAN: "bg-yellow-50 text-yellow-700 border-yellow-200",
  BOOKING: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BERKAS_LENGKAP: "bg-green-100 text-green-800 border-green-300",
  DISERAHKAN_ADMIN: "bg-teal-50 text-teal-700 border-teal-200",
  BATAL: "bg-zinc-100 text-zinc-600 border-zinc-200",
  PENDING: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState("");

  const { data: lead, isLoading } = useQuery<any>({
    queryKey: ["marketing-lead", id],
    queryFn: () => fetch(`/api/marketing/leads/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const updateStatusMut = useMutation({
    mutationFn: (status: string) => fetch(`/api/marketing/leads/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-lead", id] });
      qc.invalidateQueries({ queryKey: ["marketing-leads"] });
      toast({ title: "Status diperbarui" });
      setNewStatus("");
    },
  });

  if (isLoading) return <div className="py-16 text-center text-muted-foreground text-sm">Memuat...</div>;
  if (!lead || lead.error) return <div className="py-16 text-center text-muted-foreground text-sm">Lead tidak ditemukan</div>;

  const stepIdx = PIPELINE_STEPS.indexOf(lead.status);
  const project = (projects as any[]).find((p: any) => p.id === lead.projectId);

  const fields = [
    { label: "Nama", value: lead.nama },
    { label: "Kontak", value: lead.kontak },
    { label: "Pekerjaan", value: lead.pekerjaan },
    { label: "Alamat", value: lead.alamat },
    { label: "Sumber Lead", value: lead.source },
    { label: "Campaign", value: lead.namaKampanye ?? lead.campaign },
    { label: "Proyek", value: project?.nama },
    { label: "Tipe Unit Diminati", value: lead.tahap },
    { label: "Budget", value: lead.budget },
    { label: "PIC Sales", value: lead.picSales ?? lead.assignedTo },
    { label: "Tanggal Survey Dijadwalkan", value: lead.tanggalSurveyDijadwalkan },
    { label: "Tanggal Booking", value: lead.tanggalBooking },
    { label: "Catatan Follow Up", value: lead.catatanFollowUp },
    { label: "Alasan Batal/Pending", value: lead.alasanBatalPending ?? lead.alasanBatal },
  ].filter(f => f.value);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/marketing/lead">
            <Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{lead.nama}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", STATUS_COLOR[lead.status] ?? "bg-muted text-muted-foreground border-border")}>
                {STATUS_LABELS[lead.status] ?? lead.status}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />Aging: {lead.agingDays}h
              </span>
            </div>
          </div>
        </div>
        <Link href={`/marketing/lead/${id}/edit`}>
          <Button size="sm" variant="outline"><Edit className="size-3.5 mr-1" />Edit</Button>
        </Link>
      </div>

      {PIPELINE_STEPS.indexOf(lead.status) >= 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Pipeline Progress</p>
            <div className="flex items-center gap-1">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = i === stepIdx;
                const isDone = i < stepIdx;
                return (
                  <div key={step} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cn("h-1.5 w-full rounded-full", isDone || isActive ? "bg-primary" : "bg-muted")} />
                    <span className={cn("text-[9px] text-center leading-tight",
                      isActive ? "text-primary font-semibold" : isDone ? "text-muted-foreground" : "text-muted-foreground/50")}>
                      {STATUS_LABELS[step]?.replace(" ", "\n")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Update Status Cepat</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Pilih status baru..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!newStatus || updateStatusMut.isPending}
              onClick={() => newStatus && updateStatusMut.mutate(newStatus)}>
              {updateStatusMut.isPending ? "..." : "Update"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Data</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {fields.map(f => (
              <div key={f.label}>
                <p className="text-[10px] text-muted-foreground">{f.label}</p>
                <p className="text-xs font-medium">{f.value}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] text-muted-foreground">Tanggal Masuk</p>
              <p className="text-xs font-medium">{lead.createdAt?.slice(0,10)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
