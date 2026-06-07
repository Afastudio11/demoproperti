import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUP_LABEL: Record<string, string> = {
  perizinan_dasar: "Perizinan Dasar",
  perizinan_bangunan: "Perizinan Bangunan",
  izin_teknis: "Izin Teknis",
};

const STATUS_BADGE: Record<string, string> = {
  belum_diajukan: "bg-zinc-100 text-zinc-600",
  dalam_proses: "bg-blue-50 text-blue-700",
  selesai: "bg-emerald-50 text-emerald-700",
  tidak_diperlukan: "bg-zinc-50 text-zinc-400",
};

const STATUS_LABEL: Record<string, string> = {
  belum_diajukan: "Belum Diajukan",
  dalam_proses: "Dalam Proses",
  selesai: "Selesai",
  tidak_diperlukan: "Tidak Diperlukan",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function LegalArsip() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: permitsData, isLoading: loadingPermits } = useQuery({
    queryKey: ["permits-all"],
    queryFn: () => fetch("/api/legal/permits").then(r => r.json()),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const { data: issues = [] } = useQuery<any[]>({
    queryKey: ["legal-issues"],
    queryFn: () => fetch("/api/legal/issues").then(r => r.json()),
  });

  const allPermits: any[] = permitsData?.permits ?? [];

  // Gabungkan semua dokumen dengan file
  const docs = [
    ...allPermits.filter(p => p.documentNumber || p.fileUrl).map(p => {
      const proj = projects.find((pr: any) => pr.id === p.projectId);
      return {
        id: `permit-${p.id}`, type: "Izin", subtype: GROUP_LABEL[p.permitGroup] ?? p.permitGroup,
        name: p.permitName, project: proj?.nama ?? "-", number: p.documentNumber,
        date: p.actualDate ?? p.submissionDate, pic: p.pic, status: p.status, statusLabel: STATUS_LABEL[p.status], fileUrl: p.fileUrl,
      };
    }),
    ...allPermits.filter(p => !p.documentNumber && !p.fileUrl).map(p => {
      const proj = projects.find((pr: any) => pr.id === p.projectId);
      return {
        id: `permit-nd-${p.id}`, type: "Izin", subtype: GROUP_LABEL[p.permitGroup] ?? p.permitGroup,
        name: p.permitName, project: proj?.nama ?? "-", number: p.documentNumber,
        date: p.actualDate ?? p.submissionDate, pic: p.pic, status: p.status, statusLabel: STATUS_LABEL[p.status], fileUrl: p.fileUrl,
      };
    }),
  ];

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    if (q && !d.name.toLowerCase().includes(q) && !d.number?.toLowerCase().includes(q) && !d.project.toLowerCase().includes(q) && !d.pic?.toLowerCase().includes(q)) return false;
    if (filterType && d.type !== filterType) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Legal Document Archive</h1>
        <p className="text-sm text-muted-foreground">Repositori terpusat semua dokumen legal dari seluruh modul</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Cari nama dokumen, nomor, proyek, PIC..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Jenis", "Nama Dokumen", "Proyek", "Nomor", "Tanggal", "PIC", "Status", "File"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingPermits ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  <FileText className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  Tidak ada dokumen ditemukan.
                </td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <div className="text-xs font-semibold">{d.type}</div>
                    <div className="text-[10px] text-muted-foreground">{d.subtype}</div>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-xs">{d.name}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.project}</td>
                  <td className="px-3 py-2.5 text-xs font-mono">{d.number ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(d.date)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.pic ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", STATUS_BADGE[d.status] ?? "bg-muted")}>{d.statusLabel}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {d.fileUrl ? (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Download</a>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
