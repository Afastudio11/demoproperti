import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckSquare, Square, ChevronDown, ChevronUp, RefreshCw, Search, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubkonSelect from "@/components/subkon-select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BASELINE: Record<number, number> = { 1: 10, 2: 25, 3: 40, 4: 55, 5: 70, 6: 85, 7: 95, 8: 100 };
const TIPE_OPTIONS = ["Tipe 36", "Tipe 45", "Tipe 54", "Tipe 60", "Tipe 72", "Tipe 90"];
const STAGE_OPTIONS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

function getStatus(progress: number, weekStarted: number | null): { label: string; color: string } {
  if (!weekStarted) return { label: "Belum Mulai", color: "text-muted-foreground" };
  const week = Math.min(8, weekStarted);
  const target = BASELINE[week] ?? 100;
  const dev = progress - target;
  if (dev >= 5) return { label: "Ahead", color: "text-emerald-600" };
  if (dev >= -5) return { label: "On Track", color: "text-blue-600" };
  if (dev >= -15) return { label: "Warning", color: "text-amber-600" };
  return { label: "Critical", color: "text-red-600" };
}

type Task = { id: number; item: string; bobot: number; status: string; tanggalSelesai: string | null; verifiedBy: string | null };
type UnitRow = { id: number; blok: string; nomor: string; tipe: string; stageCode: string | null; progress: number; weekStarted: number | null; subkonName: string | null; tasks: Task[]; projectId: number };
type ProjectRow = { projectId: number; projectName: string; totalUnits: number; avgProgress: number; units: UnitRow[] };
type Project = { id: number; nama: string };
type SiteplanTransform = { opacity: number; scale: number; x: number; y: number; locked: boolean };
const defaultSiteplanTransform: SiteplanTransform = { opacity: 0.86, scale: 1, x: 0, y: 0, locked: true };

const fmtPct = (n: number) => `${Math.round(n)}%`;
const statusColor = (progress: number, status?: string) => {
  const raw = String(status ?? "").toLowerCase();
  if (raw.includes("akad") || raw.includes("terjual")) return { fill: [59, 130, 246] as [number, number, number], label: "Terjual/Akad" };
  if (progress >= 100 || raw.includes("selesai")) return { fill: [34, 197, 94] as [number, number, number], label: "Selesai" };
  if (progress > 0 || raw.includes("sedang")) return { fill: [245, 158, 11] as [number, number, number], label: "Sedang Dibangun" };
  if (raw.includes("akan")) return { fill: [244, 114, 182] as [number, number, number], label: "Akan Dibangun" };
  return { fill: [168, 85, 247] as [number, number, number], label: "Belum Dibuka" };
};

export default function ProgressUnit() {
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [showTambahUnit, setShowTambahUnit] = useState(false);
  const [form, setForm] = useState({ projectId: "", stageCode: "T1", blok: "", nomor: "", tipe: "Tipe 36", subkonName: "", weekStarted: "" });
  const [quickProgress, setQuickProgress] = useState<Record<number, number>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/progress/summary");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ProjectRow[]>;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Project[]>;
    },
  });
  const siteplanProjectId = filterProject !== "all" ? filterProject : "";
  const { data: siteplans = [] } = useQuery({
    queryKey: ["planning-siteplan", siteplanProjectId],
    queryFn: () => fetch(`/api/planning/siteplan?projectId=${siteplanProjectId}`).then(r => r.json()),
    enabled: !!siteplanProjectId,
  });
  const activeSiteplan = (siteplans as any[])[0] ?? null;
  const siteplanTransform = { ...defaultSiteplanTransform, ...((activeSiteplan?.imageTransform as Partial<SiteplanTransform> | undefined) ?? {}) };
  const { data: siteplanShapes = [] } = useQuery({
    queryKey: ["planning-siteplan-shapes", activeSiteplan?.id],
    queryFn: () => fetch(`/api/planning/siteplan/${activeSiteplan.id}/shapes`).then(r => r.json()),
    enabled: !!activeSiteplan?.id,
  });

  const tambahUnitMutation = useMutation({
    mutationFn: async () => {
      const body = {
        projectId: parseInt(form.projectId),
        stageCode: form.stageCode || null,
        blok: form.blok,
        nomor: form.nomor,
        tipe: form.tipe,
        harga: 0,
        subkonName: form.subkonName || null,
        weekStarted: form.weekStarted ? parseInt(form.weekStarted) : null,
      };
      const res = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      toast({ title: `Unit Blok ${form.blok}-${form.nomor} berhasil ditambahkan` });
      setForm(p => ({ ...p, nomor: "" }));
    },
    onError: () => toast({ title: "Gagal menambahkan unit", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const res = await fetch(`/api/produksi/units/seed-tasks/${unitId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["progress-summary"] }); },
  });

  const taskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/construction/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, tanggalSelesai: status === "selesai" ? new Date().toISOString().split("T")[0] : null }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      toast({ title: "Item diperbarui" });
    },
  });

  const weekMutation = useMutation({
    mutationFn: async ({ unitId, weekStarted }: { unitId: number; weekStarted: number | null }) => {
      const res = await fetch(`/api/units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStarted }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      toast({ title: "Minggu konstruksi disimpan" });
    },
  });
  const quickMutation = useMutation({
    mutationFn: async ({ unitId, progress, status }: { unitId: number; progress?: number; status?: string }) => {
      const res = await fetch(`/api/units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(progress !== undefined ? { progress } : {}), ...(status ? { status } : {}) }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      qc.invalidateQueries({ queryKey: ["planning-siteplan-shapes"] });
      toast({ title: "Progress unit diperbarui" });
    },
  });

  const allUnits: (UnitRow & { projectName: string })[] = (data ?? []).flatMap(p => p.units.map(u => ({ ...u, projectName: p.projectName })));
  const unitShapes = (siteplanShapes as any[]).filter(s => s.shapeType === "unit");

  function exportSiteplanPdf() {
    if (!activeSiteplan?.imageDataUrl) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const projectName = projectList.find(p => String(p.projectId) === siteplanProjectId)?.projectName ?? "Semua Proyek";
    const date = new Date().toLocaleDateString("id-ID");
    const docNo = `SPP-BANK-${String(projectName).replace(/[^A-Z0-9]/gi, "").slice(0, 12).toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const completed = filtered.filter(u => u.progress >= 100).length;
    const active = filtered.filter(u => u.progress > 0 && u.progress < 100).length;
    const avg = filtered.length ? Math.round(filtered.reduce((s, u) => s + u.progress, 0) / filtered.length) : 0;

    doc.setFontSize(15);
    doc.text("Laporan Progress Siteplan", 12, 14);
    doc.setFontSize(9);
    doc.text(`Proyek: ${projectName}`, 12, 21);
    doc.text(`Tanggal Export: ${date}`, 12, 26);
    doc.text(`No Dokumen: ${docNo}`, 200, 21);
    doc.text("Template: Ringkas Bank", 200, 26);

    const mapX = 12;
    const mapY = 33;
    const mapW = 178;
    const mapH = 105;
    const imageFormat = String(activeSiteplan.imageDataUrl).startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(
      activeSiteplan.imageDataUrl,
      imageFormat,
      mapX + (mapW * siteplanTransform.x) / 100,
      mapY + (mapH * siteplanTransform.y) / 100,
      mapW * siteplanTransform.scale,
      mapH * siteplanTransform.scale,
      undefined,
      "FAST",
    );
    unitShapes.forEach(shape => {
      const unit = allUnits.find(u => shape.unitId ? u.id === shape.unitId : `${u.blok}-${u.nomor}`.toLowerCase() === String(shape.label).toLowerCase());
      const progress = unit?.progress ?? shape.progress ?? 0;
      const style = statusColor(progress, shape.unitStatus);
      const pts = Array.isArray(shape.polygon) ? shape.polygon : [];
      if (pts.length < 3) return;
      doc.setFillColor(style.fill[0], style.fill[1], style.fill[2]);
      doc.setDrawColor(17, 24, 39);
      doc.lines(pts.slice(1).map((p: any, i: number) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "FD", true);
      doc.setFontSize(5.5);
      doc.text(`${shape.label} ${Math.round(progress)}%`, mapX + (pts[0].x / 100) * mapW + 1, mapY + (pts[0].y / 100) * mapH + 3);
    });

    autoTable(doc, {
      startY: 34,
      margin: { left: 198 },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.6 },
      head: [["Ringkasan", "Nilai"]],
      body: [
        ["Total Unit", String(filtered.length)],
        ["Selesai", String(completed)],
        ["Sedang Dibangun", String(active)],
        ["Belum Mulai", String(Math.max(0, filtered.length - completed - active))],
        ["Rata-rata Progress", `${avg}%`],
      ],
    });
    autoTable(doc, {
      startY: 78,
      margin: { left: 198 },
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.4 },
      head: [["Legenda", "Status"]],
      body: [
        ["Hijau", "Selesai"],
        ["Kuning", "Sedang Dibangun"],
        ["Pink", "Akan Dibangun"],
        ["Ungu", "Belum Dibuka"],
        ["Biru", "Terjual/Akad"],
      ],
    });

    autoTable(doc, {
      startY: 146,
      head: [["Unit", "Tipe", "Subkon", "Progress", "Minggu", "Checklist", "Status"]],
      body: filtered.map(u => {
        const done = u.tasks.filter(t => t.status === "selesai").length;
        return [`${u.blok}-${u.nomor}`, u.tipe, u.subkonName ?? "-", `${Math.round(u.progress)}%`, u.weekStarted ? `M${u.weekStarted}` : "-", `${done}/${u.tasks.length}`, getStatus(u.progress, u.weekStarted).label];
      }),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: 12, right: 12 },
    });

    doc.setFontSize(8);
    doc.text("Dibuat oleh Supervisor", 12, 198);
    doc.text("Diperiksa Produksi", 80, 198);
    doc.text("Disetujui Manager", 145, 198);
    doc.save(`${docNo}.pdf`);
  }

  const filtered = allUnits.filter(u => {
    if (filterProject !== "all" && String(u.projectId) !== filterProject) return false;
    const st = getStatus(u.progress, u.weekStarted);
    if (filterStatus !== "all" && st.label.toLowerCase() !== filterStatus.toLowerCase()) return false;
    const q = search.toLowerCase();
    if (q && !`${u.blok}${u.nomor}${u.tipe}${u.subkonName ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const projectList = data ?? [];
  const canSubmit = form.projectId && form.blok && form.nomor && form.tipe;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Progress Unit — Checklist 26 Item</h1>
          <p className="text-sm text-muted-foreground">Klik unit untuk lihat dan update progress pekerjaan</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTambahUnit} onOpenChange={setShowTambahUnit}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8">
                <Plus className="size-3.5" /> Tambah Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Tambah Unit ke Proyek</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Proyek</Label>
                  <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
                    <SelectContent>{(projects ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tahap</Label>
                    <Select value={form.stageCode} onValueChange={v => setForm(p => ({ ...p, stageCode: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipe Rumah</Label>
                    <Select value={form.tipe} onValueChange={v => setForm(p => ({ ...p, tipe: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Blok</Label>
                    <Input value={form.blok} onChange={e => setForm(p => ({ ...p, blok: e.target.value.toUpperCase() }))} placeholder="A, B, C..." className="h-8 text-sm" maxLength={5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nomor Unit</Label>
                    <Input value={form.nomor} onChange={e => setForm(p => ({ ...p, nomor: e.target.value }))} placeholder="1, 2, 3..." className="h-8 text-sm" maxLength={6} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nama Subkon</Label>
                    <SubkonSelect value={form.subkonName} onValueChange={v => setForm(p => ({ ...p, subkonName: v }))} projectId={form.projectId} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mulai Minggu ke-</Label>
                    <Select value={form.weekStarted} onValueChange={v => setForm(p => ({ ...p, weekStarted: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(w => <SelectItem key={w} value={String(w)}>Minggu {w} (target {BASELINE[w]}%)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => tambahUnitMutation.mutate()}
                    disabled={!canSubmit || tambahUnitMutation.isPending}
                  >
                    {tambahUnitMutation.isPending ? "Menyimpan..." : "Tambah Unit"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setShowTambahUnit(false)}>Selesai</Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Klik "Tambah Unit" untuk simpan dan langsung tambah unit berikutnya</p>
              </div>
            </DialogContent>
          </Dialog>
          {activeSiteplan?.imageDataUrl && (
            <Button variant="outline" size="sm" onClick={exportSiteplanPdf} className="gap-1.5 h-8">
              <Download className="size-3.5" /> Export PDF Bank
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari unit, blok, subkon..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Semua proyek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projectList.map(p => <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="ahead">Ahead</SelectItem>
            <SelectItem value="on track">On Track</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data unit...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {allUnits.length === 0
              ? "Belum ada unit. Klik \"Tambah Unit\" untuk mulai menginput progress."
              : "Unit tidak ditemukan dengan filter ini."}
          </p>
          {allUnits.length === 0 && (
            <Button size="sm" onClick={() => setShowTambahUnit(true)} className="gap-1.5">
              <Plus className="size-3.5" /> Tambah Unit Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {activeSiteplan?.imageDataUrl && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Monitoring Siteplan</CardTitle></CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={activeSiteplan.imageDataUrl}
                    alt="Siteplan"
                    className="w-full select-none origin-center"
                    style={{
                      opacity: siteplanTransform.opacity,
                      transform: `translate(${siteplanTransform.x}%, ${siteplanTransform.y}%) scale(${siteplanTransform.scale})`,
                    }}
                  />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {unitShapes.map(shape => {
                      const unit = allUnits.find(u => shape.unitId ? u.id === shape.unitId : `${u.blok}-${u.nomor}`.toLowerCase() === String(shape.label).toLowerCase());
                      const progress = unit?.progress ?? shape.progress ?? 0;
                      const style = statusColor(progress, shape.unitStatus);
                      const fill = `rgba(${style.fill[0]},${style.fill[1]},${style.fill[2]},.35)`;
                      return <polygon key={shape.id} points={(shape.polygon ?? []).map((p: any) => `${p.x},${p.y}`).join(" ")} fill={fill} stroke="#111827" strokeWidth="0.25" />;
                    })}
                  </svg>
                  {unitShapes.map(shape => {
                    const first = shape.polygon?.[0];
                    if (!first) return null;
                    const unit = allUnits.find(u => shape.unitId ? u.id === shape.unitId : `${u.blok}-${u.nomor}`.toLowerCase() === String(shape.label).toLowerCase());
                    return (
                      <button key={shape.id} className="absolute rounded bg-background/85 px-1 text-[10px] font-semibold shadow-sm" style={{ left: `${first.x}%`, top: `${first.y}%` }} onClick={() => unit && setExpandedUnit(unit.id)}>
                        {shape.label} · {Math.round(unit?.progress ?? shape.progress ?? 0)}%
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-1.5">
          {filtered.map((unit) => {
            const st = getStatus(unit.progress, unit.weekStarted);
            const isExpanded = expandedUnit === unit.id;
            const completedTasks = unit.tasks.filter(t => t.status === "selesai").length;
            const hasNoTasks = unit.tasks.length === 0;
            const targetProgress = unit.weekStarted ? BASELINE[Math.min(8, unit.weekStarted)] ?? 100 : null;

            return (
              <Card key={unit.id} className={`transition-all ${isExpanded ? "ring-1 ring-primary/30" : ""}`}>
                <div
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    setExpandedUnit(isExpanded ? null : unit.id);
                    if (!isExpanded && hasNoTasks) seedMutation.mutate(unit.id);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">Blok {unit.blok}-{unit.nomor}</span>
                      {unit.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{unit.stageCode}</span>}
                      <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>
                      {unit.subkonName && <span className="text-[10px] text-muted-foreground">{unit.subkonName}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${unit.progress >= 100 ? "bg-emerald-500" : unit.progress >= 70 ? "bg-blue-500" : unit.progress >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${unit.progress}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-10 shrink-0">{fmtPct(unit.progress)}</span>
                      {targetProgress !== null && (
                        <span className="text-[10px] text-muted-foreground shrink-0">target {targetProgress}%</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{unit.tipe}</div>
                    {!hasNoTasks && <div className="text-[10px] text-muted-foreground">{completedTasks}/{unit.tasks.length} item</div>}
                  </div>
                  {isExpanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-3 pt-2">
                    <div className="flex items-center gap-3 mb-2 pb-2 border-b">
                      <span className="text-xs text-muted-foreground">Minggu konstruksi:</span>
                      <Select
                        value={unit.weekStarted ? String(unit.weekStarted) : ""}
                        onValueChange={v => weekMutation.mutate({ unitId: unit.id, weekStarted: v ? parseInt(v) : null })}
                      >
                        <SelectTrigger className="h-6 w-44 text-xs"><SelectValue placeholder="Set minggu mulai..." /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(w => <SelectItem key={w} value={String(w)}>Minggu {w} — target {BASELINE[w]}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {unit.subkonName && <span className="text-[10px] text-muted-foreground ml-auto">Subkon: {unit.subkonName}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3 rounded-md bg-muted/30 p-2">
                      <span className="text-xs text-muted-foreground">Update cepat progress</span>
                      <Input className="h-7 w-20 text-xs" type="number" min={0} max={100} value={quickProgress[unit.id] ?? unit.progress} onChange={e => setQuickProgress(p => ({ ...p, [unit.id]: Number(e.target.value) }))} />
                      <Button size="sm" className="h-7 text-xs" onClick={() => quickMutation.mutate({ unitId: unit.id, progress: quickProgress[unit.id] ?? unit.progress })}>Simpan %</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickMutation.mutate({ unitId: unit.id, progress: 100, status: "akad" })}>Tandai Selesai</Button>
                    </div>

                    {(seedMutation.isPending && hasNoTasks) ? (
                      <div className="text-xs text-muted-foreground py-2 text-center">Menginisialisasi checklist 26 item...</div>
                    ) : (
                      <>
                        {unit.tasks.length === 0 ? (
                          <div className="py-3 text-center">
                            <Button size="sm" variant="outline" onClick={() => seedMutation.mutate(unit.id)} className="h-7 text-xs gap-1.5">
                              <Plus className="size-3" /> Inisialisasi Checklist 26 Item
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">Checklist Pekerjaan Standar (26 Item)</span>
                              <span className="text-xs font-semibold">{fmtPct(unit.progress)} selesai</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                              {unit.tasks.map(task => (
                                <div
                                  key={task.id}
                                  onClick={() => taskMutation.mutate({ id: task.id, status: task.status === "selesai" ? "belum_mulai" : "selesai" })}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-muted/50`}
                                >
                                  {task.status === "selesai" ? (
                                    <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Square className="size-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className={`text-xs flex-1 ${task.status === "selesai" ? "line-through text-muted-foreground" : ""}`}>{task.item}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{task.bobot}%</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
