import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Map, Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type UnitShape = {
  id: number;
  label: string;
  polygon: { x: number; y: number }[];
  shapeType: string;
  unitId?: number | null;
  progress?: number | null;
  unitStatus?: string | null;
  customerName?: string | null;
  stageCode?: string | null;
};

type UnitRow = {
  id: number;
  blok: string;
  nomor: string;
  tipe: string;
  stageCode: string | null;
  progress: number;
  weekStarted: number | null;
  subkonName: string | null;
  status?: string | null;
};

const BASELINE: Record<number, number> = { 1: 10, 2: 25, 3: 40, 4: 55, 5: 70, 6: 85, 7: 95, 8: 100 };

function unitFill(progress: number, unitStatus?: string | null): { rgb: [number, number, number]; label: string; css: string } {
  const raw = String(unitStatus ?? "").toLowerCase();
  if (raw.includes("akad") || raw.includes("terjual")) return { rgb: [59, 130, 246], label: "Terjual/Akad", css: "rgba(59,130,246,.42)" };
  if (progress >= 100 || raw.includes("selesai")) return { rgb: [34, 197, 94], label: "Selesai", css: "rgba(34,197,94,.42)" };
  if (progress > 0 || raw.includes("sedang")) return { rgb: [245, 158, 11], label: "Sedang Dibangun", css: "rgba(245,158,11,.42)" };
  if (raw.includes("akan")) return { rgb: [244, 114, 182], label: "Akan Dibangun", css: "rgba(244,114,182,.42)" };
  return { rgb: [168, 85, 247], label: "Belum Dibuka", css: "rgba(168,85,247,.42)" };
}

const LEGEND = [
  { label: "Selesai", css: "bg-emerald-500/40 border-emerald-500/50" },
  { label: "Sedang Dibangun", css: "bg-amber-400/40 border-amber-400/50" },
  { label: "Akan Dibangun", css: "bg-pink-400/40 border-pink-400/50" },
  { label: "Belum Dibuka", css: "bg-purple-500/40 border-purple-500/50" },
  { label: "Terjual/Akad", css: "bg-blue-500/40 border-blue-500/50" },
];

export default function ProduksiSiteplan() {
  const [projectId, setProjectId] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [hoveredShape, setHoveredShape] = useState<UnitShape | null>(null);

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const { data: siteplans = [] } = useQuery<any[]>({
    queryKey: ["planning-siteplan", projectId],
    queryFn: () => fetch(`/api/planning/siteplan?projectId=${projectId}`).then(r => r.json()),
    enabled: !!projectId,
  });

  const activeSiteplan = siteplans[0] ?? null;
  const siteplanId = activeSiteplan?.id;

  const { data: shapes = [] } = useQuery<UnitShape[]>({
    queryKey: ["planning-siteplan-shapes", siteplanId],
    queryFn: () => fetch(`/api/planning/siteplan/${siteplanId}/shapes`).then(r => r.json()),
    enabled: !!siteplanId,
  });

  const { data: fullSiteplan } = useQuery<any>({
    queryKey: ["planning-siteplan-full", siteplanId],
    queryFn: () => fetch(`/api/planning/siteplan/${siteplanId}`).then(r => r.json()),
    enabled: !!siteplanId,
  });

  const { data: unitsRaw = [] } = useQuery<UnitRow[]>({
    queryKey: ["units", projectId],
    queryFn: () => fetch(`/api/units?projectId=${projectId}`).then(r => r.json()),
    enabled: !!projectId,
  });

  const transform = (activeSiteplan?.imageTransform ?? {}) as { opacity?: number; scale?: number; x?: number; y?: number };
  const opacity = transform.opacity ?? 0.86;
  const scale = transform.scale ?? 1;
  const tx = transform.x ?? 0;
  const ty = transform.y ?? 0;
  const imageData = fullSiteplan?.imageDataUrl ?? activeSiteplan?.imageDataUrl ?? null;

  const unitShapes = shapes.filter(s => s.shapeType === "unit");
  const bidangShapes = shapes.filter(s => s.shapeType === "bidang");
  const blokShapes = shapes.filter(s => s.shapeType === "blok");
  const fasumShapes = shapes.filter(s => s.shapeType === "fasum");

  function findUnit(shape: UnitShape): UnitRow | undefined {
    const byId = unitsRaw.find(u => u.id === shape.unitId);
    if (byId) return byId;
    return unitsRaw.find(u =>
      `${u.blok}-${u.nomor}`.toLowerCase() === String(shape.label ?? "").toLowerCase()
    );
  }

  const projectName = projects.find((p: any) => String(p.id) === projectId)?.nama ?? "Proyek";

  const unitStats = {
    total: unitShapes.length,
    selesai: unitShapes.filter(s => { const u = findUnit(s); return (u?.progress ?? s.progress ?? 0) >= 100; }).length,
    sedang: unitShapes.filter(s => { const u = findUnit(s); const p = u?.progress ?? s.progress ?? 0; return p > 0 && p < 100; }).length,
    belum: unitShapes.filter(s => { const u = findUnit(s); return (u?.progress ?? s.progress ?? 0) === 0; }).length,
    terjual: unitShapes.filter(s => {
      const u = findUnit(s);
      const st = u?.status ?? s.unitStatus ?? "";
      return st.toLowerCase().includes("akad") || st.toLowerCase().includes("terjual");
    }).length,
  };
  const avgProgress = unitShapes.length > 0
    ? Math.round(unitShapes.reduce((s, sh) => {
        const u = findUnit(sh);
        return s + (u?.progress ?? sh.progress ?? 0);
      }, 0) / unitShapes.length)
    : 0;

  async function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;
    const date = new Date().toLocaleDateString("id-ID");
    const docNo = `SMON-${String(projectName).replace(/[^A-Z0-9]/gi, "").slice(0, 12).toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    // ── Halaman 1: Siteplan Map ─────────────────────────────────────────────────
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text("MONITORING SITEPLAN PRODUKSI", 14, 11);
    doc.setFontSize(8.5);
    doc.text(`${projectName}  ·  Tgl: ${date}  ·  No: ${docNo}`, 14, 16);
    doc.setTextColor(0, 0, 0);

    // KPI strip
    const kpis: [string, string][] = [
      ["Total Unit", String(unitStats.total)],
      ["Avg Progress", `${avgProgress}%`],
      ["Selesai", String(unitStats.selesai)],
      ["Sedang Bangun", String(unitStats.sedang)],
      ["Terjual/Akad", String(unitStats.terjual)],
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
    const mapX = 14, mapY = 38, mapW = 185, mapH = 135;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(mapX, mapY, mapW, mapH, 2, 2, "F");

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
        doc.addImage(imgData, fmt,
          mapX + (mapW * tx) / 100, mapY + (mapH * ty) / 100,
          mapW * scale, mapH * scale, undefined, "FAST");
      } catch { /* skip */ }
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Siteplan tidak tersedia", mapX + mapW / 2, mapY + mapH / 2, { align: "center" });
      doc.setTextColor(0);
    }

    // Draw bidang outlines
    bidangShapes.forEach(shape => {
      const pts = shape.polygon ?? [];
      if (pts.length < 3) return;
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);
      doc.lines(pts.slice(1).map((p, i) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "D", true);
    });

    // Draw blok fills
    blokShapes.forEach(shape => {
      const pts = shape.polygon ?? [];
      if (pts.length < 3) return;
      doc.setFillColor(200, 220, 200);
      doc.setDrawColor(80, 120, 80);
      doc.setLineWidth(0.15);
      doc.lines(pts.slice(1).map((p, i) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "FD", true);
    });

    // Draw fasum fills
    fasumShapes.forEach(shape => {
      const pts = shape.polygon ?? [];
      if (pts.length < 3) return;
      doc.setFillColor(190, 220, 240);
      doc.setDrawColor(60, 100, 160);
      doc.setLineWidth(0.15);
      doc.lines(pts.slice(1).map((p, i) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "FD", true);
    });

    // Draw unit polygons with color by progress/status
    unitShapes.forEach(shape => {
      const unit = findUnit(shape);
      const progress = unit?.progress ?? shape.progress ?? 0;
      const fill = unitFill(progress, shape.unitStatus ?? unit?.status);
      const pts = shape.polygon ?? [];
      if (pts.length < 3) return;
      doc.setFillColor(fill.rgb[0], fill.rgb[1], fill.rgb[2]);
      doc.setDrawColor(17, 24, 39);
      doc.setLineWidth(0.15);
      doc.lines(pts.slice(1).map((p, i) => [
        ((p.x - pts[i].x) / 100) * mapW,
        ((p.y - pts[i].y) / 100) * mapH,
      ]), mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "FD", true);
      // Label
      doc.setFontSize(4.5);
      doc.setTextColor(17, 24, 39);
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      doc.text(
        `${shape.label}\n${Math.round(progress)}%`,
        mapX + (cx / 100) * mapW,
        mapY + (cy / 100) * mapH,
        { align: "center" }
      );
    });
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.2);

    // Legenda (kanan peta)
    const legendItems = [
      { label: "Selesai", rgb: [34, 197, 94] as [number, number, number] },
      { label: "Sedang Dibangun", rgb: [245, 158, 11] as [number, number, number] },
      { label: "Akan Dibangun", rgb: [244, 114, 182] as [number, number, number] },
      { label: "Belum Dibuka", rgb: [168, 85, 247] as [number, number, number] },
      { label: "Terjual/Akad", rgb: [59, 130, 246] as [number, number, number] },
      { label: "Fasum", rgb: [190, 220, 240] as [number, number, number] },
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

    // Statistik unit (di bawah legenda)
    const statsY = ly + 10 + legendItems.length * 8 + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Statistik Unit", lx, statsY);
    doc.setFont("helvetica", "normal");
    const statsRows = [
      ["Total Unit", String(unitStats.total)],
      ["Selesai", String(unitStats.selesai)],
      ["Sedang Dibangun", String(unitStats.sedang)],
      ["Belum Mulai", String(unitStats.belum)],
      ["Terjual/Akad", String(unitStats.terjual)],
      ["Avg Progress", `${avgProgress}%`],
    ];
    statsRows.forEach(([label, value], i) => {
      const ry = statsY + 6 + i * 6;
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(label, lx, ry);
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.text(value, lx + 60, ry, { align: "right" });
      doc.setFont("helvetica", "normal");
    });

    // ── Halaman 2: Tabel unit detail ──────────────────────────────────────────
    doc.addPage("a4", "landscape");
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("DETAIL PROGRESS PER UNIT", 14, 9);
    doc.setFontSize(8);
    doc.text(`${projectName}  ·  ${date}  ·  ${docNo}`, 14, 13);
    doc.setTextColor(0, 0, 0);

    const tableRows = unitShapes.map(shape => {
      const unit = findUnit(shape);
      const progress = unit?.progress ?? shape.progress ?? 0;
      const fill = unitFill(progress, shape.unitStatus ?? unit?.status);
      const target = unit?.weekStarted ? (BASELINE[Math.min(8, unit.weekStarted)] ?? 100) : null;
      const dev = target !== null ? progress - target : null;
      const statusLabel = fill.label;
      return [
        shape.label,
        unit?.tipe ?? "-",
        shape.stageCode ?? unit?.stageCode ?? "-",
        unit?.subkonName ?? "-",
        unit?.weekStarted ? `M${unit.weekStarted}` : "-",
        target !== null ? `${target}%` : "-",
        `${Math.round(progress)}%`,
        dev !== null ? `${dev >= 0 ? "+" : ""}${Math.round(dev)}%` : "-",
        statusLabel,
      ];
    });

    autoTable(doc, {
      startY: 18,
      head: [["Unit", "Tipe", "Tahap", "Subkon", "Minggu", "Target", "Aktual", "Deviasi", "Status"]],
      body: tableRows,
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
          if (v === "Selesai") data.cell.styles.textColor = [22, 163, 74];
          else if (v === "Sedang Dibangun") data.cell.styles.textColor = [217, 119, 6];
          else if (v === "Terjual/Akad") data.cell.styles.textColor = [37, 99, 235];
        }
      },
    });

    // Tanda tangan
    const ySign = 192;
    doc.setFontSize(8);
    doc.text("Dibuat oleh Supervisor", 14, ySign);
    doc.text("Diperiksa Kepala Produksi", 100, ySign);
    doc.text("Disetujui Project Manager", 185, ySign);
    [14, 100, 185].forEach(x => {
      doc.line(x, ySign + 8, x + 70, ySign + 8);
    });

    doc.save(`${docNo}.pdf`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">Monitoring Siteplan Produksi</h1>
          <p className="text-sm text-muted-foreground">
            Tampilan siteplan dari perencanaan dengan overlay progress konstruksi real-time
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {siteplanId && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded border hover:bg-muted transition-colors"
                title="Zoom out">
                <ZoomOut className="size-4" />
              </button>
              <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-1.5 rounded border hover:bg-muted transition-colors"
                title="Zoom in">
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 rounded border hover:bg-muted transition-colors"
                title="Reset zoom">
                <RotateCcw className="size-3.5" />
              </button>
              <button
                onClick={exportPdf}
                className="flex items-center gap-1.5 text-sm border border-blue-600 text-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-colors">
                <Download className="size-3.5" /> Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter proyek */}
      <div className="flex items-center gap-3">
        <Select value={projectId} onValueChange={v => { setProjectId(v); setZoom(1); }}>
          <SelectTrigger className="h-9 w-72 text-sm">
            <SelectValue placeholder="Pilih proyek..." />
          </SelectTrigger>
          <SelectContent>
            {(projects as any[]).map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {projectId && !siteplanId && siteplans !== undefined && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Map className="size-3.5" />
            Belum ada siteplan —&nbsp;
            <Link href={`/perencanaan/lahan?projectId=${projectId}`} className="text-primary underline">
              Buat di Perencanaan
            </Link>
          </span>
        )}
      </div>

      {/* Stats unit */}
      {siteplanId && unitShapes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Unit", value: unitStats.total, color: "text-foreground" },
            { label: "Selesai", value: unitStats.selesai, color: "text-emerald-600" },
            { label: "Sedang Dibangun", value: unitStats.sedang, color: "text-amber-600" },
            { label: "Belum Mulai", value: unitStats.belum, color: "text-purple-600" },
            { label: "Avg Progress", value: `${avgProgress}%`, color: avgProgress >= 70 ? "text-emerald-600" : avgProgress >= 40 ? "text-amber-600" : "text-muted-foreground" },
          ].map(item => (
            <div key={item.label} className="rounded-xl border bg-card p-3">
              <div className="text-[11px] text-muted-foreground mb-1">{item.label}</div>
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Siteplan canvas */}
      {!projectId ? (
        <div className="border rounded-xl p-16 text-center">
          <Map className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Pilih proyek untuk menampilkan siteplan</p>
        </div>
      ) : !siteplanId ? (
        <div className="border rounded-xl p-16 text-center">
          <Map className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Siteplan belum tersedia untuk proyek ini</p>
          <Link href={`/perencanaan/lahan?projectId=${projectId}`}>
            <button className="mt-3 text-xs flex items-center gap-1 mx-auto text-primary underline">
              <ExternalLink className="size-3" /> Buat Siteplan di Perencanaan
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tooltip hover */}
          {hoveredShape && (() => {
            const unit = findUnit(hoveredShape);
            const progress = unit?.progress ?? hoveredShape.progress ?? 0;
            const fill = unitFill(progress, hoveredShape.unitStatus ?? unit?.status);
            return (
              <div className="border rounded-xl p-3 bg-card text-sm flex items-center gap-6 flex-wrap">
                <span className="font-semibold">{hoveredShape.label}</span>
                <span className="text-muted-foreground text-xs">{unit?.tipe ?? "-"}</span>
                <span className="text-muted-foreground text-xs">Tahap: {hoveredShape.stageCode ?? unit?.stageCode ?? "-"}</span>
                <span className="text-muted-foreground text-xs">Subkon: {unit?.subkonName ?? "-"}</span>
                <span className="text-xs font-medium" style={{ color: `rgb(${unitFill(progress, hoveredShape.unitStatus ?? unit?.status).rgb.join(",")})` }}>
                  {fill.label}
                </span>
                <span className="font-bold">{Math.round(progress)}%</span>
                {hoveredShape.customerName && (
                  <span className="text-xs text-muted-foreground">Pembeli: {hoveredShape.customerName}</span>
                )}
              </div>
            );
          })()}

          {/* Map canvas */}
          <div
            className="relative overflow-hidden rounded-xl border bg-muted"
            style={{ minHeight: 480, maxHeight: 700 }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: 480,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                transition: "transform 0.15s ease",
              }}>
              {/* Background image */}
              {imageData ? (
                <img
                  src={imageData}
                  alt="Siteplan"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain select-none"
                  style={{ opacity, transform: `translate(${tx}%, ${ty}%) scale(${scale})`, transformOrigin: "center" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Memuat gambar siteplan...
                </div>
              )}

              {/* SVG overlay untuk semua shapes */}
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ minHeight: 480 }}>

                {/* Bidang (plot) outline saja */}
                {bidangShapes.map(shape => (
                  <polygon
                    key={`bidang-${shape.id}`}
                    points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="rgba(100,100,100,0.4)"
                    strokeWidth="0.25"
                  />
                ))}

                {/* Blok fill */}
                {blokShapes.map(shape => (
                  <polygon
                    key={`blok-${shape.id}`}
                    points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(200,230,200,0.25)"
                    stroke="rgba(80,150,80,0.5)"
                    strokeWidth="0.2"
                  />
                ))}

                {/* Fasum fill */}
                {fasumShapes.map(shape => (
                  <polygon
                    key={`fasum-${shape.id}`}
                    points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(190,220,240,0.35)"
                    stroke="rgba(60,100,200,0.5)"
                    strokeWidth="0.2"
                  />
                ))}

                {/* Unit shapes dengan warna progress */}
                {unitShapes.map(shape => {
                  const unit = findUnit(shape);
                  const progress = unit?.progress ?? shape.progress ?? 0;
                  const fill = unitFill(progress, shape.unitStatus ?? unit?.status);
                  return (
                    <polygon
                      key={`unit-${shape.id}`}
                      points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                      fill={fill.css}
                      stroke="#111827"
                      strokeWidth="0.2"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredShape(shape)}
                      onMouseLeave={() => setHoveredShape(null)}
                    />
                  );
                })}
              </svg>

              {/* Unit label overlays */}
              {unitShapes.map(shape => {
                const pts = shape.polygon ?? [];
                if (pts.length < 3) return null;
                const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                const unit = findUnit(shape);
                const progress = unit?.progress ?? shape.progress ?? 0;
                return (
                  <div
                    key={`label-${shape.id}`}
                    className="absolute pointer-events-none select-none"
                    style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}>
                    <div className="rounded bg-background/90 px-0.5 text-[8px] font-semibold shadow-sm whitespace-nowrap leading-tight text-center">
                      <div>{shape.label}</div>
                      <div className="text-[7px] font-normal">{Math.round(progress)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-2">
            {LEGEND.map(item => (
              <span key={item.label} className={`inline-flex items-center gap-1.5 text-[11px] rounded px-2 py-1 border ${item.css}`}>
                {item.label}
              </span>
            ))}
          </div>

          {/* Tabel unit ringkas */}
          {unitsRaw.length > 0 && (
            <div className="border rounded-xl overflow-hidden mt-2">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                <span className="text-sm font-medium">Progress Per Unit</span>
                <span className="text-xs text-muted-foreground">{unitsRaw.length} unit</span>
              </div>
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs min-w-max">
                  <thead className="sticky top-0 bg-muted/90">
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 font-medium">Unit</th>
                      <th className="text-left px-3 py-2 font-medium">Tipe</th>
                      <th className="text-left px-3 py-2 font-medium">Tahap</th>
                      <th className="text-left px-3 py-2 font-medium">Subkon</th>
                      <th className="text-center px-3 py-2 font-medium">Minggu</th>
                      <th className="text-center px-3 py-2 font-medium">Progress</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitsRaw.map(u => {
                      const target = u.weekStarted ? (BASELINE[Math.min(8, u.weekStarted)] ?? 100) : null;
                      const dev = target !== null ? u.progress - target : null;
                      const fill = unitFill(u.progress, u.status);
                      return (
                        <tr key={u.id} className="border-b hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-medium">{u.blok}-{u.nomor}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{u.tipe}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{u.stageCode ?? "-"}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{u.subkonName ?? "-"}</td>
                          <td className="px-3 py-1.5 text-center">{u.weekStarted ? `M${u.weekStarted}` : "-"}</td>
                          <td className="px-3 py-1.5 text-center">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[48px]">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${u.progress}%`, backgroundColor: `rgb(${fill.rgb.join(",")})` }}
                                />
                              </div>
                              <span className="font-semibold w-8 text-right">{Math.round(u.progress)}%</span>
                              {dev !== null && (
                                <span className={`text-[10px] w-8 text-right ${dev >= 0 ? "text-emerald-600" : dev < -10 ? "text-red-600" : "text-amber-600"}`}>
                                  {dev >= 0 ? "+" : ""}{Math.round(dev)}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="text-[10px] font-medium" style={{ color: `rgb(${fill.rgb.join(",")})` }}>
                              {fill.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
