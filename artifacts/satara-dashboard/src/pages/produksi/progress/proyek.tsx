import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart3, ChevronRight, Map, Download, ChevronDown, ChevronUp, Settings, Plus, Trash2, Copy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtPct = (n: number) => `${Math.round(n)}%`;

type ProjectRow = {
  projectId: number;
  projectName: string;
  totalUnits: number;
  avgProgress: number;
  targetProgress: number;
  deviation: number;
  status: string;
  stages: { stageCode: string; unitCount: number; avgProgress: number; status: string }[];
};

type UnitRow = { id: number; blok: string; nomor: string; tipe: string; stageCode: string | null; progress: number; weekStarted: number | null; subkonName: string | null; status?: string | null };

const BASELINE: Record<number, number> = { 1: 10, 2: 25, 3: 40, 4: 55, 5: 70, 6: 85, 7: 95, 8: 100 };

const statusLabel = (s: string) => s === "on_track" ? "On Track" : s === "warning" ? "Warning" : "Delayed";
const statusIcon = (s: string) =>
  s === "on_track" ? <TrendingUp className="size-3.5 text-emerald-500" /> :
  s === "warning" ? <Minus className="size-3.5 text-amber-500" /> :
  <TrendingDown className="size-3.5 text-red-500" />;
const statusColor = (s: string) => s === "on_track" ? "text-emerald-600" : s === "warning" ? "text-amber-600" : "text-red-600";
const barColor = (s: string) => s === "on_track" ? "#10b981" : s === "warning" ? "#f59e0b" : "#ef4444";

function unitFill(progress: number, unitStatus?: string): { rgb: [number, number, number]; label: string; css: string } {
  const raw = String(unitStatus ?? "").toLowerCase();
  if (raw.includes("akad") || raw.includes("terjual")) return { rgb: [59, 130, 246], label: "Terjual/Akad", css: "rgba(59,130,246,.38)" };
  if (progress >= 100 || raw.includes("selesai")) return { rgb: [34, 197, 94], label: "Selesai", css: "rgba(34,197,94,.38)" };
  if (progress > 0 || raw.includes("sedang")) return { rgb: [245, 158, 11], label: "Sedang Dibangun", css: "rgba(245,158,11,.38)" };
  if (raw.includes("akan")) return { rgb: [244, 114, 182], label: "Akan Dibangun", css: "rgba(244,114,182,.38)" };
  return { rgb: [168, 85, 247], label: "Belum Dibuka", css: "rgba(168,85,247,.38)" };
}

function getUnitStatus(progress: number, weekStarted: number | null) {
  if (!weekStarted) return { label: "Belum Mulai", color: "text-muted-foreground" };
  const week = Math.min(8, weekStarted);
  const target = BASELINE[week] ?? 100;
  const dev = progress - target;
  if (dev >= 5) return { label: "Ahead", color: "text-emerald-600" };
  if (dev >= -5) return { label: "On Track", color: "text-blue-600" };
  if (dev >= -15) return { label: "Warning", color: "text-amber-600" };
  return { label: "Critical", color: "text-red-600" };
}

// ─── Sub-component: Project Siteplan Panel ────────────────────────────────────
function ProjectSiteplanPanel({
  projectId,
  projectName,
  proj,
  units,
}: {
  projectId: number;
  projectName: string;
  proj: ProjectRow;
  units: UnitRow[];
}) {
  const { data: siteplans = [] } = useQuery({
    queryKey: ["planning-siteplan", String(projectId)],
    queryFn: () => fetch(`/api/planning/siteplan?projectId=${projectId}`).then(r => r.json()),
  });
  const activeSiteplan = (siteplans as any[])[0] ?? null;
  const siteplanId = activeSiteplan?.id;
  const { data: shapes = [] } = useQuery<any[]>({
    queryKey: ["planning-siteplan-shapes", siteplanId],
    queryFn: () => fetch(`/api/planning/siteplan/${siteplanId}/shapes`).then(r => r.json()),
    enabled: !!siteplanId,
  });
  const { data: fullSiteplan } = useQuery({
    queryKey: ["planning-siteplan-full", siteplanId],
    queryFn: () => fetch(`/api/planning/siteplan/${siteplanId}`).then(r => r.json()),
    enabled: !!siteplanId,
  });

  const unitShapes = shapes.filter((s: any) => s.shapeType === "unit");
  const bidangShapes = shapes.filter((s: any) => s.shapeType === "bidang");
  const imageData = (fullSiteplan as any)?.imageDataUrl ?? activeSiteplan?.imageDataUrl ?? null;
  const transform = (activeSiteplan?.imageTransform ?? {}) as { opacity?: number; scale?: number; x?: number; y?: number };
  const opacity = transform.opacity ?? 0.86;
  const scale = transform.scale ?? 1;
  const tx = transform.x ?? 0;
  const ty = transform.y ?? 0;

  function findUnit(shape: any) {
    const byId = units.find(u => u.id === shape.unitId);
    if (byId) return byId;
    return units.find(u => `${u.blok}-${u.nomor}`.toLowerCase() === String(shape.label ?? "").toLowerCase());
  }

  async function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;
    const date = new Date().toLocaleDateString("id-ID");
    const docNo = `SPP-${String(projectName).replace(/[^A-Z0-9]/gi, "").slice(0, 12).toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    // ── Hal 1: Cover + Siteplan ────────────────────────────────────────────────
    // Header bar
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text("LAPORAN PROGRESS KONSTRUKSI", 14, 11);
    doc.setFontSize(8.5);
    doc.text(`${projectName}  ·  Tgl: ${date}  ·  No: ${docNo}`, 14, 16);
    doc.setTextColor(0, 0, 0);

    // KPI strip
    const kpis = [
      ["Total Unit", String(proj.totalUnits)],
      ["Avg Progress", fmtPct(proj.avgProgress)],
      ["Status", statusLabel(proj.status)],
      ["Tahap Aktif", String(proj.stages.filter(s => s.avgProgress > 0 && s.avgProgress < 100).length)],
      ["Selesai", String(proj.stages.filter(s => s.avgProgress >= 100).length) + " tahap"],
    ];
    kpis.forEach(([label, value], i) => {
      const bx = 14 + i * 55, by = 20;
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(bx, by, 50, 14, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(label, bx + 3, by + 5);
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(value, bx + 3, by + 11);
    });
    doc.setTextColor(0, 0, 0);

    // Siteplan map area
    const mapX = 14, mapY = 38, mapW = 180, mapH = 110;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(mapX, mapY, mapW, mapH, 2, 2, "F");

    // Fetch full image if not yet loaded
    let imgData = imageData;
    if (!imgData && siteplanId) {
      try {
        const r = await fetch(`/api/planning/siteplan/${siteplanId}`);
        const json = await r.json();
        imgData = json.imageDataUrl ?? null;
      } catch { /* no image */ }
    }

    if (imgData) {
      const fmt = String(imgData).startsWith("data:image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(imgData, fmt, mapX + (mapW * tx) / 100, mapY + (mapH * ty) / 100, mapW * scale, mapH * scale, undefined, "FAST");
      } catch { /* skip bad image */ }
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Siteplan tidak tersedia", mapX + mapW / 2, mapY + mapH / 2, { align: "center" });
      doc.setTextColor(0);
    }

    // Draw bidang outlines
    bidangShapes.forEach((shape: any) => {
      const pts = Array.isArray(shape.polygon) ? shape.polygon : [];
      if (pts.length < 3) return;
      doc.setDrawColor(100, 100, 100);
      doc.setFillColor(200, 200, 200);
      doc.lines(pts.slice(1).map((p: any, i: number) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "D", true);
    });

    // Draw unit polygons with progress color
    unitShapes.forEach((shape: any) => {
      const unit = findUnit(shape);
      const progress = unit?.progress ?? shape.progress ?? 0;
      const fill = unitFill(progress, shape.unitStatus ?? unit?.status ?? undefined);
      const pts = Array.isArray(shape.polygon) ? shape.polygon : [];
      if (pts.length < 3) return;
      doc.setFillColor(fill.rgb[0], fill.rgb[1], fill.rgb[2]);
      doc.setDrawColor(17, 24, 39);
      doc.setLineWidth(0.15);
      doc.lines(pts.slice(1).map((p: any, i: number) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "FD", true);
      doc.setFontSize(5);
      doc.setTextColor(17, 24, 39);
      const cx = pts.reduce((s: number, p: any) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s: number, p: any) => s + p.y, 0) / pts.length;
      doc.text(`${shape.label}\n${Math.round(progress)}%`, mapX + (cx / 100) * mapW, mapY + (cy / 100) * mapH, { align: "center" });
    });
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.2);

    // Legenda
    const legendItems = [
      { label: "Selesai", rgb: [34, 197, 94] as [number, number, number] },
      { label: "Sedang Dibangun", rgb: [245, 158, 11] as [number, number, number] },
      { label: "Akan Dibangun", rgb: [244, 114, 182] as [number, number, number] },
      { label: "Belum Dibuka", rgb: [168, 85, 247] as [number, number, number] },
      { label: "Terjual/Akad", rgb: [59, 130, 246] as [number, number, number] },
    ];
    let lx = mapX + mapW + 6, ly = mapY;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Legenda", lx, ly + 4);
    doc.setFont("helvetica", "normal");
    legendItems.forEach((item, i) => {
      const iy = ly + 10 + i * 8;
      doc.setFillColor(item.rgb[0], item.rgb[1], item.rgb[2]);
      doc.roundedRect(lx, iy, 5, 4, 1, 1, "F");
      doc.setFontSize(7);
      doc.text(item.label, lx + 7, iy + 3.2);
    });

    // Ringkasan tahap
    autoTable(doc, {
      startY: mapY + 52,
      margin: { left: mapX + mapW + 4 },
      tableWidth: 88,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.4 },
      headStyles: { fillColor: [17, 24, 39] },
      head: [["Tahap", "Unit", "Progress", "Status"]],
      body: proj.stages.map(s => [
        s.stageCode,
        String(s.unitCount),
        fmtPct(s.avgProgress),
        s.avgProgress >= 100 ? "Selesai" : s.avgProgress > 0 ? "Aktif" : "Belum Mulai",
      ]),
    });

    // ── Hal 2: Tabel Unit Detail ───────────────────────────────────────────────
    doc.addPage("a4", "landscape");
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("DETAIL PROGRESS UNIT", 14, 9);
    doc.setFontSize(8);
    doc.text(`${projectName}  ·  ${date}  ·  ${docNo}`, 14, 13);
    doc.setTextColor(0, 0, 0);

    const unitTableBody = units.map(u => {
      const st = getUnitStatus(u.progress, u.weekStarted);
      const target = u.weekStarted ? (BASELINE[Math.min(8, u.weekStarted)] ?? 100) : null;
      const dev = target !== null ? u.progress - target : null;
      return [
        `${u.blok}-${u.nomor}`,
        u.tipe,
        u.stageCode ?? "-",
        u.subkonName ?? "-",
        u.weekStarted ? `M${u.weekStarted}` : "-",
        target !== null ? `${target}%` : "-",
        `${Math.round(u.progress)}%`,
        dev !== null ? `${dev >= 0 ? "+" : ""}${Math.round(dev)}%` : "-",
        st.label,
      ];
    });

    autoTable(doc, {
      startY: 18,
      head: [["Unit", "Tipe", "Tahap", "Subkon", "Minggu", "Target", "Aktual", "Deviasi", "Status"]],
      body: unitTableBody,
      styles: { fontSize: 7.5, cellPadding: 1.6 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 7) {
          const v = String(data.cell.text[0] ?? "");
          const n = parseFloat(v);
          if (v.startsWith("+")) data.cell.styles.textColor = [22, 163, 74];
          else if (!isNaN(n) && n < -10) data.cell.styles.textColor = [220, 38, 38];
          else if (!isNaN(n)) data.cell.styles.textColor = [217, 119, 6];
        }
        if (data.section === "body" && data.column.index === 8) {
          const v = String(data.cell.text[0] ?? "");
          if (v === "Critical") data.cell.styles.textColor = [220, 38, 38];
          else if (v === "Warning") data.cell.styles.textColor = [217, 119, 6];
          else if (v === "Ahead") data.cell.styles.textColor = [22, 163, 74];
        }
      },
    });

    // ── Hal 2: Tanda tangan ───────────────────────────────────────────────────
    const ySign = 190;
    doc.setFontSize(8);
    doc.text("Dibuat oleh Supervisor", 14, ySign);
    doc.text("Diperiksa Kepala Produksi", 100, ySign);
    doc.text("Disetujui Project Manager", 185, ySign);
    [14, 100, 185].forEach(x => {
      doc.line(x, ySign + 8, x + 70, ySign + 8);
    });

    doc.save(`${docNo}.pdf`);
  }

  if (!activeSiteplan) {
    return (
      <div className="mt-3 border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Map className="size-3.5" />
        Belum ada siteplan yang diunggah untuk proyek ini. Buat di halaman
        <Link href={`/perencanaan/lahan?projectId=${projectId}`} className="text-primary underline">Siteplan Perencanaan</Link>.
      </div>
    );
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Map className="size-3.5" />Monitoring Siteplan</span>
        <button
          onClick={exportPdf}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted transition-colors"
        >
          <Download className="size-3" /> Export PDF Laporan
        </button>
      </div>

      <div className="relative overflow-hidden rounded-lg border bg-muted aspect-video max-h-72">
        {imageData ? (
          <img
            src={imageData}
            alt="Siteplan"
            className="w-full h-full object-contain select-none"
            style={{ opacity, transform: `translate(${tx}%, ${ty}%) scale(${scale})`, transformOrigin: "center" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Memuat gambar siteplan...
          </div>
        )}

        {/* Unit overlays */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {bidangShapes.map((shape: any) => (
            <polygon
              key={`bidang-${shape.id}`}
              points={(shape.polygon ?? []).map((p: any) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="rgba(100,100,100,0.5)"
              strokeWidth="0.3"
            />
          ))}
          {unitShapes.map((shape: any) => {
            const unit = findUnit(shape);
            const progress = unit?.progress ?? shape.progress ?? 0;
            const fill = unitFill(progress, shape.unitStatus ?? unit?.status ?? undefined);
            return (
              <polygon
                key={`unit-${shape.id}`}
                points={(shape.polygon ?? []).map((p: any) => `${p.x},${p.y}`).join(" ")}
                fill={fill.css}
                stroke="#111827"
                strokeWidth="0.25"
              />
            );
          })}
        </svg>

        {/* Unit labels */}
        {unitShapes.map((shape: any) => {
          const pts = shape.polygon ?? [];
          if (pts.length < 3) return null;
          const cx = pts.reduce((s: number, p: any) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s: number, p: any) => s + p.y, 0) / pts.length;
          const unit = findUnit(shape);
          const progress = unit?.progress ?? shape.progress ?? 0;
          return (
            <div
              key={`label-${shape.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-background/85 px-1 text-[9px] font-semibold shadow-sm pointer-events-none"
              style={{ left: `${cx}%`, top: `${cy}%` }}
            >
              {shape.label} · {Math.round(progress)}%
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Selesai", css: "bg-emerald-500/40 border-emerald-500/50" },
          { label: "Sedang Dibangun", css: "bg-amber-400/40 border-amber-400/50" },
          { label: "Akan Dibangun", css: "bg-pink-400/40 border-pink-400/50" },
          { label: "Belum Dibuka", css: "bg-purple-500/40 border-purple-500/50" },
          { label: "Terjual/Akad", css: "bg-blue-500/40 border-blue-500/50" },
        ].map(item => (
          <span key={item.label} className={`inline-flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 border ${item.css}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProgressProyek() {
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"list" | "chart">("list");
  const [expandedSiteplan, setExpandedSiteplan] = useState<number | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Template Modal State
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [activeTemplateProjectId, setActiveTemplateProjectId] = useState<string>("");
  const [templateItems, setTemplateItems] = useState<{ item: string; bobot: number }[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [copyFromProject, setCopyFromProject] = useState("");

  const { data: templateData } = useQuery({
    queryKey: ["project-task-template", activeTemplateProjectId],
    queryFn: async () => {
      if (!activeTemplateProjectId) return null;
      const res = await fetch(`/api/produksi/project-templates/${activeTemplateProjectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ projectId: number; items: any[]; isCustom: boolean; defaults: { item: string; bobot: number }[] }>;
    },
    enabled: !!activeTemplateProjectId,
  });

  const loadTemplateForProject = async (projId: string) => {
    const res = await fetch(`/api/produksi/project-templates/${projId}`);
    if (!res.ok) throw new Error("Gagal memuat template proyek");
    const data = await res.json();
    qc.setQueryData(["project-task-template", projId], data);
    setTemplateItems(
      data.isCustom && data.items.length > 0
        ? data.items.map((t: any) => ({ item: t.item, bobot: t.bobot }))
        : (data.defaults ?? []),
    );
    return data;
  };

  const openTemplateDialog = async (projId: string) => {
    setActiveTemplateProjectId(projId);
    setCopyFromProject("");
    setShowTemplateDialog(true);
    try {
      await loadTemplateForProject(projId);
    } catch (err: any) {
      toast({ title: err.message || "Gagal memuat template proyek", variant: "destructive" });
    }
  };

  const handleSelectTemplateProject = async (projId: string) => {
    setActiveTemplateProjectId(projId);
    setCopyFromProject("");
    try {
      await loadTemplateForProject(projId);
    } catch (err: any) {
      toast({ title: err.message || "Gagal memuat template proyek", variant: "destructive" });
    }
  };

  const saveTemplate = async () => {
    const projectId = activeTemplateProjectId;
    if (!projectId) return;
    setTemplateSaving(true);
    try {
      const res = await fetch(`/api/produksi/project-templates/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: templateItems }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }
      const data = await res.json();
      qc.setQueryData(["project-task-template", projectId], data);
      toast({ title: "Template pekerjaan berhasil disimpan" });
      await qc.invalidateQueries({ queryKey: ["project-task-template", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      setShowTemplateDialog(false);
    } catch (err: any) {
      toast({ title: err.message || "Gagal menyimpan template", variant: "destructive" });
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetTemplateToDefault = async () => {
    const projectId = activeTemplateProjectId;
    if (!projectId) return;
    try {
      const res = await fetch(`/api/produksi/project-templates/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal reset template");
      }
      toast({ title: "Template dikembalikan ke standar" });
      await qc.invalidateQueries({ queryKey: ["project-task-template", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      setShowTemplateDialog(false);
    } catch (err: any) {
      toast({ title: err.message || "Gagal reset template", variant: "destructive" });
    }
  };

  const copyTemplateFrom = async (sourceId: string) => {
    const projectId = activeTemplateProjectId;
    if (!projectId || !sourceId) return;
    try {
      const res = await fetch(`/api/produksi/project-templates/${projectId}/copy-from/${sourceId}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyalin");
      }
      const data = await res.json();
      setTemplateItems(data.items.map((t: any) => ({ item: t.item, bobot: t.bobot })));
      qc.setQueryData(["project-task-template", projectId], { ...data, isCustom: true, defaults: templateData?.defaults ?? [] });
      setCopyFromProject("");
      toast({ title: "Template berhasil disalin dari proyek lain" });
      await qc.invalidateQueries({ queryKey: ["project-task-template", projectId] });
    } catch (err: any) {
      toast({ title: err.message || "Gagal menyalin template", variant: "destructive" });
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/progress/summary");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<(ProjectRow & { units?: UnitRow[] })[]>;
    },
  });

  const all = data ?? [];
  const filtered = filterStatus === "all" ? all : all.filter(p => p.status === filterStatus);

  const chartData = filtered.map(p => ({
    name: p.projectName.length > 15 ? p.projectName.substring(0, 15) + "..." : p.projectName,
    aktual: p.avgProgress,
    target: 100,
    status: p.status,
  }));

  const onTrack = all.filter(p => p.status === "on_track").length;
  const warning = all.filter(p => p.status === "warning").length;
  const delayed = all.filter(p => p.status === "delayed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Progress Per Proyek</h1>
          <p className="text-sm text-muted-foreground">Ringkasan kemajuan konstruksi di level proyek dan tahap</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("list")} className={`text-xs px-3 py-1.5 rounded border transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Daftar</button>
          <button onClick={() => setView("chart")} className={`text-xs px-3 py-1.5 rounded border transition-colors ${view === "chart" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <BarChart3 className="size-3.5 inline mr-1" />Chart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20 cursor-pointer" onClick={() => setFilterStatus(filterStatus === "on_track" ? "all" : "on_track")}>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">On Track</p>
            <p className="text-2xl font-bold text-emerald-500">{onTrack}</p>
            <p className="text-[10px] text-muted-foreground">proyek</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 cursor-pointer" onClick={() => setFilterStatus(filterStatus === "warning" ? "all" : "warning")}>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Warning</p>
            <p className="text-2xl font-bold text-amber-500">{warning}</p>
            <p className="text-[10px] text-muted-foreground">proyek</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 cursor-pointer" onClick={() => setFilterStatus(filterStatus === "delayed" ? "all" : "delayed")}>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Delayed</p>
            <p className="text-2xl font-bold text-red-500">{delayed}</p>
            <p className="text-[10px] text-muted-foreground">proyek</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} proyek ditampilkan</span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data proyek...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Belum ada proyek atau tidak ada unit konstruksi aktif.</div>
      ) : view === "chart" ? (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Progress Aktual vs Target per Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, filtered.length * 50)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[0, 3, 3, 0]} />
                <Bar dataKey="aktual" name="Aktual" radius={[0, 3, 3, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={barColor(entry.status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(proj => {
            const isSiteplanOpen = expandedSiteplan === proj.projectId;
            return (
              <Card key={proj.projectId}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLocation(`/produksi/progress/tahap?projectId=${proj.projectId}`)}
                    >
                      {statusIcon(proj.status)}
                      <CardTitle className="text-sm">{proj.projectName}</CardTitle>
                      <span className={`text-xs font-medium ${statusColor(proj.status)}`}>{statusLabel(proj.status)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{proj.totalUnits} unit</span>
                      <button
                        onClick={() => openTemplateDialog(String(proj.projectId))}
                        className="text-xs flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors"
                      >
                        <Settings className="size-3" />
                        Template Bobot
                      </button>
                      <button
                        onClick={() => setExpandedSiteplan(isSiteplanOpen ? null : proj.projectId)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors ${isSiteplanOpen ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <Map className="size-3" />
                        Siteplan
                        {isSiteplanOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                      <Link
                        href={`/produksi/progress/tahap?projectId=${proj.projectId}`}
                        className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                      >
                        Per Tahap <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress Aktual</span>
                      <span className="font-semibold">{fmtPct(proj.avgProgress)}</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20" style={{ width: "100%" }} />
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${proj.avgProgress >= 95 ? "bg-emerald-500" : proj.avgProgress >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${proj.avgProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Deviasi dari target: <span className={proj.deviation > 20 ? "text-red-500 font-medium" : proj.deviation > 5 ? "text-amber-500" : "text-emerald-500"}>-{proj.deviation}%</span></span>
                      <span>Target: 100%</span>
                    </div>
                  </div>

                  {proj.stages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                      {proj.stages.map(stage => (
                        <div
                          key={stage.stageCode}
                          className={`rounded-md px-3 py-2 cursor-pointer hover:bg-muted/70 transition-colors ${stage.avgProgress >= 100 ? "bg-emerald-500/10 border border-emerald-500/20" : stage.avgProgress > 0 ? "bg-muted/40" : "bg-muted/20 border border-dashed"}`}
                          onClick={() => setLocation(`/produksi/progress/unit?projectId=${proj.projectId}&stageCode=${stage.stageCode}`)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">{stage.stageCode}</span>
                            <span className="text-[10px] text-muted-foreground">{stage.unitCount} unit</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                            <div className={`h-full rounded-full ${stage.avgProgress >= 100 ? "bg-emerald-500" : stage.avgProgress >= 60 ? "bg-blue-500" : stage.avgProgress > 0 ? "bg-amber-500" : "bg-muted-foreground/20"}`} style={{ width: `${stage.avgProgress}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums font-medium">
                            {stage.avgProgress >= 100 ? "Selesai" : stage.avgProgress > 0 ? fmtPct(stage.avgProgress) : "Land Bank"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Siteplan mirror panel */}
                  {isSiteplanOpen && (
                    <ProjectSiteplanPanel
                      projectId={proj.projectId}
                      projectName={proj.projectName}
                      proj={proj}
                      units={proj.units ?? []}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Pekerjaan Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex flex-wrap items-center justify-between gap-2 pr-6">
              <span className="flex items-center gap-2">
                <Settings className="size-4 text-emerald-600" /> Template Bobot Pekerjaan
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-muted-foreground">Proyek:</span>
                <Select value={activeTemplateProjectId} onValueChange={handleSelectTemplateProject}>
                  <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="Pilih Proyek..." /></SelectTrigger>
                  <SelectContent>
                    {all.map(p => (
                      <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Copy from project */}
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-muted/40 border border-dashed">
              <div className="flex-1 min-w-48 space-y-1">
                <Label className="text-xs">Salin template dari proyek lain</Label>
                <Select value={copyFromProject} onValueChange={setCopyFromProject}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih proyek sumber..." /></SelectTrigger>
                  <SelectContent>
                    {all.filter(p => String(p.projectId) !== activeTemplateProjectId).map(p => (
                      <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={!copyFromProject} onClick={() => copyTemplateFrom(copyFromProject)}>
                <Copy className="size-3" /> Salin
              </Button>
            </div>

            {/* Items table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Item Pekerjaan</span>
                <span className={`text-xs font-semibold ${
                  (() => { const total = templateItems.reduce((s, i) => s + i.bobot, 0); return total >= 95 && total <= 105 ? "text-emerald-600" : "text-red-500"; })()
                }`}>
                  Total: {templateItems.reduce((s, i) => s + i.bobot, 0)}%
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr,80px,40px] gap-0 bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                  <span>Nama Pekerjaan</span>
                  <span className="text-center">Bobot %</span>
                  <span></span>
                </div>
                {templateItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr,80px,40px] gap-0 items-center px-3 py-1 border-t hover:bg-muted/20">
                    <Input
                      className="h-7 text-xs border-0 shadow-none px-0 focus-visible:ring-0"
                      value={item.item}
                      onChange={e => {
                        const next = [...templateItems];
                        next[idx] = { ...next[idx], item: e.target.value };
                        setTemplateItems(next);
                      }}
                    />
                    <Input
                      className="h-7 text-xs text-center border-0 shadow-none focus-visible:ring-0"
                      type="number"
                      min={0}
                      max={100}
                      value={item.bobot}
                      onChange={e => {
                        const next = [...templateItems];
                        next[idx] = { ...next[idx], bobot: Number(e.target.value) || 0 };
                        setTemplateItems(next);
                      }}
                    />
                    <Button
                      variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => setTemplateItems(templateItems.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-3 text-muted-foreground hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline" size="sm" className="w-full h-7 text-xs gap-1 mt-1"
                onClick={() => setTemplateItems([...templateItems, { item: "", bobot: 0 }])}
              >
                <Plus className="size-3" /> Tambah Item
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={resetTemplateToDefault}>
                <RotateCcw className="size-3" /> Reset ke Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowTemplateDialog(false)}>Batal</Button>
                <Button
                  size="sm" className="h-8 text-xs"
                  disabled={templateSaving || templateItems.length === 0 || templateItems.some(i => !i.item.trim())}
                  onClick={saveTemplate}
                >
                  {templateSaving ? "Menyimpan..." : "Simpan Template"}
                </Button>
              </div>
            </div>

            {templateData?.isCustom && (
              <p className="text-[10px] text-muted-foreground text-center">
                ⚡ Proyek ini menggunakan template kustom ({templateData.items.length} item). Unit baru akan menggunakan template ini.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
