import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { key: "", label: "Semua Status" },
  { key: "NEW_LEAD", label: "New Lead" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "INTERESTED", label: "Interested" },
  { key: "SURVEY_DIJADWALKAN", label: "Survey Dijadwalkan" },
  { key: "SURVEY_DILAKUKAN", label: "Survey Dilakukan" },
  { key: "BOOKING", label: "Booking" },
  { key: "BERKAS_LENGKAP", label: "Berkas Lengkap" },
  { key: "DISERAHKAN_ADMIN", label: "Diserahkan Admin" },
  { key: "BATAL", label: "Batal" },
  { key: "PENDING", label: "Pending" },
];

const QUICK_FILTERS = [
  { key: "", label: "Semua" },
  { key: "NEW_LEAD", label: "New Lead" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "INTERESTED", label: "Interested" },
  { key: "SURVEY_DIJADWALKAN", label: "Survey" },
  { key: "BOOKING", label: "Booking" },
  { key: "BERKAS_LENGKAP", label: "Berkas" },
];

const SOURCES = [
  "", "Instagram", "Facebook", "TikTok", "Google Ads",
  "Referral", "Walk-in", "Pameran", "Website", "Lainnya",
];

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

function agingClass(days: number, status: string) {
  if (["BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN","BATAL"].includes(status)) return "";
  if (days > 14) return "bg-red-50/60";
  if (days > 7) return "bg-yellow-50/50";
  return "";
}

function AgingBadge({ days, status }: { days: number; status: string }) {
  if (["BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN","BATAL"].includes(status)) {
    return <span className="text-[10px] text-muted-foreground">{days}h</span>;
  }
  const cls = days > 14 ? "bg-red-100 text-red-700" : days > 7 ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700";
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", cls)}>{days}h</span>;
}

export default function DaftarLead() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useQuery<any[]>({
    queryKey: ["marketing-leads", filterStatus, filterSource, filterProject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSource) params.set("source", filterSource);
      if (filterProject !== "all") params.set("projectId", filterProject);
      const r = await fetch(`/api/marketing/leads?${params}`);
      return r.json();
    },
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/marketing/leads/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing-leads"] }); toast({ title: "Lead dihapus" }); },
  });

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.nama?.toLowerCase().includes(q) || l.kontak?.toLowerCase().includes(q);
  });

  function exportCsv() {
    const hdr = ["No","Nama","Kontak","Sumber","Proyek","Tahap","PIC Sales","Status","Tanggal Masuk","Aging (hari)","Flag"];
    const rows = filtered.map((l, i) => [
      i+1, l.nama, l.kontak, l.source, projects.find((p:any) => p.id === l.projectId)?.nama ?? "-",
      l.tahap ?? "-", l.picSales ?? l.assignedTo ?? "-", l.status,
      l.createdAt?.slice(0,10), l.agingDays, l.flag ?? "-",
    ]);
    const csv = [hdr, ...rows].map(r => r.map(String).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "daftar_lead.csv"; a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Daftar Lead</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} lead ditemukan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-3.5 mr-1" />Export CSV
          </Button>
          <Button size="sm" asChild>
            <Link href="/marketing/lead/new"><Plus className="size-3.5 mr-1" />Tambah Lead</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
              filterStatus === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Cari nama atau kontak..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Semua Proyek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {(projects as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Sumber Lead" /></SelectTrigger>
          <SelectContent>
            {SOURCES.map(s => <SelectItem key={s} value={s || "__all__"}>{s || "Semua Sumber"}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {["No","Nama","Kontak","Sumber","Proyek","Tahap","PIC Sales","Status","Masuk","Aging","Aksi"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data</td></tr>
              ) : filtered.map((l, i) => (
                <tr key={l.id} className={cn("border-b hover:bg-muted/30 transition-colors", agingClass(l.agingDays, l.status))}>
                  <td className="px-3 py-2 text-muted-foreground">{i+1}</td>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/marketing/lead/${l.id}`} className="hover:text-primary transition-colors">{l.nama}</Link>
                    {l.flag === "stagnan" && <span className="ml-1 text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">Stagnan</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{l.kontak}</td>
                  <td className="px-3 py-2">{l.source}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{(projects as any[]).find((p:any) => p.id === l.projectId)?.nama ?? "-"}</td>
                  <td className="px-3 py-2">{l.tahap ?? "-"}</td>
                  <td className="px-3 py-2">{l.picSales ?? l.assignedTo ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", STATUS_COLOR[l.status] ?? "bg-muted text-muted-foreground border-border")}>
                      {STATUSES.find(s => s.key === l.status)?.label ?? l.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{l.createdAt?.slice(0,10)}</td>
                  <td className="px-3 py-2"><AgingBadge days={l.agingDays ?? 0} status={l.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Link href={`/marketing/lead/${l.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">Edit</Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Hapus lead ini?")) deleteMut.mutate(l.id); }}>
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
