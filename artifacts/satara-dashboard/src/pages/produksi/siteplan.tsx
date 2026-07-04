import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Map, Download, ExternalLink, ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";
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
const MAP_H = 540;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;

function unitFill(progress: number, unitStatus?: string | null): { rgb: [number, number, number]; label: string; css: string } {
  const raw = String(unitStatus ?? "").toLowerCase();
  if (raw.includes("akad") || raw.includes("terjual")) return { rgb: [59, 130, 246], label: "Terjual/Akad", css: "rgba(59,130,246,.46)" };
  if (progress >= 100 || raw.includes("selesai")) return { rgb: [34, 197, 94], label: "Selesai", css: "rgba(34,197,94,.46)" };
  if (progress > 0 || raw.includes("sedang")) return { rgb: [245, 158, 11], label: "Sedang Dibangun", css: "rgba(245,158,11,.46)" };
  if (raw.includes("akan")) return { rgb: [244, 114, 182], label: "Akan Dibangun", css: "rgba(244,114,182,.46)" };
  return { rgb: [168, 85, 247], label: "Belum Dibuka", css: "rgba(168,85,247,.46)" };
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
  const [hoveredShape, setHoveredShape] = useState<UnitShape | null>(null);

  // ── Pan + zoom state ─────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef({ x: panX, y: panY });

  // keep refs in sync so event handlers don't capture stale values
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = { x: panX, y: panY }; }, [panX, panY]);

  // ── Data queries ─────────────────────────────────────────────────────────────
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

  const imgTransform = (fullSiteplan?.imageTransform ?? activeSiteplan?.imageTransform ?? {}) as { opacity?: number; scale?: number; x?: number; y?: number };
  const imgOpacity = imgTransform.opacity ?? 0.86;
  const imgScale = imgTransform.scale ?? 1;
  const imgTx = imgTransform.x ?? 0;
  const imgTy = imgTransform.y ?? 0;
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

  const projectName = (projects as any[]).find(p => String(p.id) === projectId)?.nama ?? "Proyek";

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
    ? Math.round(unitShapes.reduce((s, sh) => { const u = findUnit(sh); return s + (u?.progress ?? sh.progress ?? 0); }, 0) / unitShapes.length)
    : 0;

  // ── Pan + zoom handlers ──────────────────────────────────────────────────────
  const resetView = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const changeZoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pivotX = cx ?? rect.width / 2;
    const pivotY = cy ?? rect.height / 2;
    setZoom(prev => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor));
      const wx = (pivotX - panRef.current.x) / prev;
      const wy = (pivotY - panRef.current.y) / prev;
      setPanX(pivotX - wx * next);
      setPanY(pivotY - wy * next);
      return next;
    });
  }, []);

  // Use native non-passive wheel listener so preventDefault() actually works
  // and the browser page doesn't zoom when siteplan zoom hits min/max.
  // Depend on siteplanId so the effect re-runs when the canvas mounts/unmounts.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const rect = el.getBoundingClientRect();
      changeZoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    const preventGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("wheel", handler, { passive: false });
    el.addEventListener("gesturestart", preventGesture, { passive: false });
    el.addEventListener("gesturechange", preventGesture, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      el.removeEventListener("gesturestart", preventGesture);
      el.removeEventListener("gesturechange", preventGesture);
    };
  }, [changeZoomAt, siteplanId]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setPanX(x => x + dx);
    setPanY(y => y + dy);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  // reset when project changes
  useEffect(() => { resetView(); }, [projectId, resetView]);

  // ── PDF export ───────────────────────────────────────────────────────────────
  async function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;
    const date = new Date().toLocaleDateString("id-ID");
    const docNo = `SMON-${String(projectName).replace(/[^A-Z0-9]/gi, "").slice(0, 12).toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text("MONITORING SITEPLAN PRODUKSI", 14, 11);
    doc.setFontSize(8.5);
    doc.text(`${projectName}  ·  Tgl: ${date}  ·  No: ${docNo}`, 14, 16);
    doc.setTextColor(0, 0, 0);

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
      doc.setFontSize(7); doc.setTextColor(100, 100, 100);
      doc.text(label, bx + 3, by + 5);
      doc.setFontSize(11); doc.setTextColor(17, 24, 39);
      doc.text(value, bx + 3, by + 11);
    });
    doc.setTextColor(0, 0, 0);

    const maxW = 185, maxH = 135;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, 38, maxW, maxH, 2, 2, "F");

    let imgData = imageData;
    if (!imgData && siteplanId) {
      try { const r = await fetch(`/api/planning/siteplan/${siteplanId}`); imgData = (await r.json()).imageDataUrl ?? null; } catch { /* skip */ }
    }

    const getImgSize = (src: string): Promise<{ w: number; h: number }> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 100, h: 100 });
        img.src = src;
      });
    };

    let ar = maxW / maxH; // fallback aspect ratio
    if (imgData) {
      try {
        const size = await getImgSize(imgData);
        if (size.w && size.h) ar = size.w / size.h;
      } catch {}
    }

    let mapW = maxW;
    let mapH = maxW / ar;
    if (mapH > maxH) {
      mapH = maxH;
      mapW = maxH * ar;
    }
    const mapX = 14 + (maxW - mapW) / 2;
    const mapY = 38 + (maxH - mapH) / 2;

    if (imgData) {
      const fmt = String(imgData).startsWith("data:image/png") ? "PNG" : "JPEG";
      try { doc.addImage(imgData, fmt, mapX + (mapW * imgTx) / 100, mapY + (mapH * imgTy) / 100, mapW * imgScale, mapH * imgScale, undefined, "FAST"); } catch { /* skip */ }
    }

    const drawShapes = (shapesArr: UnitShape[], fillColor: [number, number, number] | null, strokeColor: [number, number, number], lw = 0.15, filled = false) => {
      shapesArr.forEach(shape => {
        const pts = shape.polygon ?? [];
        if (pts.length < 3) return;
        if (fillColor) doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
        doc.setLineWidth(lw);
        doc.lines(pts.slice(1).map((p, i) => [((p.x - pts[i].x) / 100) * mapW, ((p.y - pts[i].y) / 100) * mapH]),
          mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], filled ? "FD" : "D", true);
      });
    };

    drawShapes(bidangShapes, null, [100, 100, 100], 0.2, false);
    drawShapes(blokShapes, [200, 230, 200], [80, 130, 80], 0.15, true);
    drawShapes(fasumShapes, [190, 220, 240], [60, 100, 180], 0.15, true);

    unitShapes.forEach(shape => {
      const unit = findUnit(shape);
      const progress = unit?.progress ?? shape.progress ?? 0;
      const fill = unitFill(progress, shape.unitStatus ?? unit?.status);
      const pts = shape.polygon ?? [];
      if (pts.length < 3) return;
      doc.setFillColor(fill.rgb[0], fill.rgb[1], fill.rgb[2]);
      doc.setDrawColor(17, 24, 39); doc.setLineWidth(0.15);
      doc.lines(pts.slice(1).map((p, i) => [((p.x - pts[i].x) / 100) * mapW, ((p.y - pts[i].y) / 100) * mapH]),
        mapX + (pts[0].x / 100) * mapW, mapY + (pts[0].y / 100) * mapH, [1, 1], "FD", true);
      doc.setFontSize(4.5); doc.setTextColor(17, 24, 39);
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      doc.text(`${shape.label}\n${Math.round(progress)}%`, mapX + (cx / 100) * mapW, mapY + (cy / 100) * mapH, { align: "center" });
    });
    doc.setTextColor(0, 0, 0); doc.setLineWidth(0.2);

    const legendItems = [
      { label: "Selesai", rgb: [34, 197, 94] as [number, number, number] },
      { label: "Sedang Dibangun", rgb: [245, 158, 11] as [number, number, number] },
      { label: "Akan Dibangun", rgb: [244, 114, 182] as [number, number, number] },
      { label: "Belum Dibuka", rgb: [168, 85, 247] as [number, number, number] },
      { label: "Terjual/Akad", rgb: [59, 130, 246] as [number, number, number] },
      { label: "Fasum", rgb: [190, 220, 240] as [number, number, number] },
    ];
    let lx = 14 + 185 + 6, ly = 38;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.text("Legenda", lx, ly + 4);
    doc.setFont("helvetica", "normal");
    legendItems.forEach((item, i) => {
      const iy = ly + 10 + i * 8;
      doc.setFillColor(item.rgb[0], item.rgb[1], item.rgb[2]);
      doc.roundedRect(lx, iy, 5, 4, 1, 1, "F");
      doc.setFontSize(7); doc.text(item.label, lx + 7, iy + 3.2);
    });
    const statsY = ly + 10 + legendItems.length * 8 + 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text("Statistik Unit", lx, statsY);
    doc.setFont("helvetica", "normal");
    [["Total Unit", String(unitStats.total)], ["Selesai", String(unitStats.selesai)], ["Sedang Dibangun", String(unitStats.sedang)],
     ["Belum Mulai", String(unitStats.belum)], ["Terjual/Akad", String(unitStats.terjual)], ["Avg Progress", `${avgProgress}%`]
    ].forEach(([label, value], i) => {
      const ry = statsY + 6 + i * 6;
      doc.setFontSize(6.5); doc.setTextColor(100, 100, 100); doc.text(label, lx, ry);
      doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "bold"); doc.text(value, lx + 60, ry, { align: "right" });
      doc.setFont("helvetica", "normal");
    });

    doc.addPage("a4", "landscape");
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.text("DETAIL PROGRESS PER UNIT", 14, 9);
    doc.setFontSize(8); doc.text(`${projectName}  ·  ${date}  ·  ${docNo}`, 14, 13);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 18,
      head: [["Unit", "Tipe", "Tahap", "Subkon", "Minggu", "Target", "Aktual", "Deviasi", "Status"]],
      body: unitShapes.map(shape => {
        const unit = findUnit(shape);
        const progress = unit?.progress ?? shape.progress ?? 0;
        const fill = unitFill(progress, shape.unitStatus ?? unit?.status);
        const target = unit?.weekStarted ? (BASELINE[Math.min(8, unit.weekStarted)] ?? 100) : null;
        const dev = target !== null ? progress - target : null;
        return [shape.label, unit?.tipe ?? "-", shape.stageCode ?? unit?.stageCode ?? "-", unit?.subkonName ?? "-",
          unit?.weekStarted ? `M${unit.weekStarted}` : "-", target !== null ? `${target}%` : "-",
          `${Math.round(progress)}%`, dev !== null ? `${dev >= 0 ? "+" : ""}${Math.round(dev)}%` : "-", fill.label];
      }),
      styles: { fontSize: 7.5, cellPadding: 1.6 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 7) {
          const v = String(data.cell.text[0] ?? ""), n = parseFloat(v);
          if (v.startsWith("+")) data.cell.styles.textColor = [22, 163, 74];
          else if (!isNaN(n) && n < -10) data.cell.styles.textColor = [220, 38, 38];
          else if (!isNaN(n)) data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });

    const ySign = 192;
    doc.setFontSize(8);
    doc.text("Dibuat oleh Supervisor", 14, ySign);
    doc.text("Diperiksa Kepala Produksi", 100, ySign);
    doc.text("Disetujui Project Manager", 185, ySign);
    [14, 100, 185].forEach(x => doc.line(x, ySign + 8, x + 70, ySign + 8));

    doc.save(`${docNo}.pdf`);
  }

  // ── JSX ─────────────────────────────────────────────────────────────────────
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
        {siteplanId && (
          <button
            onClick={exportPdf}
            className="flex items-center gap-1.5 text-sm border border-blue-600 text-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-colors">
            <Download className="size-3.5" /> Download PDF
          </button>
        )}
      </div>

      {/* Filter proyek */}
      <div className="flex items-center gap-3">
        <Select value={projectId} onValueChange={v => setProjectId(v)}>
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
                <span className="text-xs font-medium" style={{ color: `rgb(${fill.rgb.join(",")})` }}>{fill.label}</span>
                <span className="font-bold">{Math.round(progress)}%</span>
                {hoveredShape.customerName && (
                  <span className="text-xs text-muted-foreground">Pembeli: {hoveredShape.customerName}</span>
                )}
              </div>
            );
          })()}

          {/* ── Interactive map canvas ── */}
          <div className="rounded-xl border overflow-hidden bg-muted/20 select-none">
            {/* Canvas viewport */}
            <div
              ref={containerRef}
              className="relative overflow-hidden bg-neutral-900"
              style={{ height: MAP_H, cursor: dragRef.current.active ? "grabbing" : "grab" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}>

              {/* World container — pan+zoom applied here */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}>

                {/* Siteplan background image */}
                {imageData ? (
                  <img
                    src={imageData}
                    alt="Siteplan"
                    draggable={false}
                    className="w-full select-none pointer-events-none origin-center block"
                    style={{
                      opacity: imgOpacity,
                      transform: `translate(${imgTx}%, ${imgTy}%) scale(${imgScale})`,
                      transformOrigin: "center",
                    }}
                  />
                ) : (
                  <div className="h-[520px] flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                    Memuat gambar siteplan...
                  </div>
                )}

                {/* SVG overlay — all shapes + labels */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none">

                  {bidangShapes.map(shape => (
                    <polygon key={`bidang-${shape.id}`}
                      points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                      fill="rgba(16,185,129,.12)" stroke="#059669" strokeWidth={0.28 / zoom} />
                  ))}
                  {blokShapes.map(shape => (
                    <polygon key={`blok-${shape.id}`}
                      points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                      fill="rgba(99,102,241,.14)" stroke="#4f46e5" strokeWidth={0.25 / zoom} />
                  ))}
                  {fasumShapes.map(shape => (
                    <polygon key={`fasum-${shape.id}`}
                      points={(shape.polygon ?? []).map(p => `${p.x},${p.y}`).join(" ")}
                      fill="rgba(148,163,184,.22)" stroke="#64748b" strokeWidth={0.25 / zoom} />
                  ))}
                  {unitShapes.map(shape => {
                    const unit = findUnit(shape);
                    const progress = unit?.progress ?? shape.progress ?? 0;
                    const fill = unitFill(progress, shape.unitStatus ?? unit?.status);
                    const pts = shape.polygon ?? [];
                    if (pts.length < 3) return null;
                    const xs = pts.map(p => p.x);
                    const ys = pts.map(p => p.y);
                    const bounds = {
                      minX: Math.min(...xs),
                      maxX: Math.max(...xs),
                      minY: Math.min(...ys),
                      maxY: Math.max(...ys),
                      width: Math.max(...xs) - Math.min(...xs),
                    };
                    const cx = (bounds.minX + bounds.maxX) / 2;
                    const cy = (bounds.minY + bounds.maxY) / 2;
                    const sw = 1 / zoom;
                    const labelText = String(shape.label ?? "").trim();

                    let fontSize = 1.6;
                    let strokeWidth = 0.15;
                    if (labelText) {
                      // Set a uniform base size of 1.25 so all unit labels have the exact same font size
                      const baseSize = 1.25;
                      // Damped scaling so text gets larger when zoomed in but not excessively huge
                      fontSize = baseSize / Math.sqrt(zoom);
                      // Keep outline stroke thin but highly readable (increased multiplier for slightly thicker look)
                      strokeWidth = (baseSize * 0.24) / zoom;
                    }

                    return (
                      <g key={`unit-${shape.id}`}>
                        <polygon
                          points={pts.map(p => `${p.x},${p.y}`).join(" ")}
                          fill={fill.css}
                          stroke={`rgb(${fill.rgb.join(",")})`}
                          strokeWidth={0.3 * sw}
                          style={{ pointerEvents: "all", cursor: "pointer" }}
                          onMouseEnter={() => setHoveredShape(shape)}
                          onMouseLeave={() => setHoveredShape(null)}
                        />
                        {labelText && (
                          <g style={{ pointerEvents: "none" }}>
                            {/* Outline stroke text */}
                            <text
                              x={cx}
                              y={cy - (0.55 * fontSize)}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={fontSize}
                              fontWeight={700}
                              fill="#ffffff"
                              stroke="#000000"
                              strokeWidth={strokeWidth}
                              paintOrder="stroke"
                              style={{ userSelect: "none" }}
                            >
                              {labelText}
                            </text>
                            <text
                              x={cx}
                              y={cy + (0.65 * fontSize)}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={fontSize * 0.8}
                              fontWeight={600}
                              fill="rgba(255,255,255,0.92)"
                              stroke="#000000"
                              strokeWidth={strokeWidth * 0.8}
                              paintOrder="stroke"
                              style={{ userSelect: "none" }}
                            >
                              {Math.round(progress)}%
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Zoom level badge (top-right, inside canvas) */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-[11px] font-mono rounded px-2 py-0.5 pointer-events-none">
                {Math.round(zoom * 100)}%
              </div>

              {/* Hint */}
              {panX === 0 && panY === 0 && zoom === 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[11px] rounded-full px-3 py-1 pointer-events-none flex items-center gap-1.5">
                  <Move className="size-3" />
                  Drag untuk geser · Scroll untuk zoom
                </div>
              )}
            </div>

            {/* ── Controls toolbar BAWAH map ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/40">
              {/* Left: legend */}
              <div className="flex flex-wrap gap-1.5">
                {LEGEND.map(item => (
                  <span key={item.label} className={`inline-flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 border ${item.css}`}>
                    {item.label}
                  </span>
                ))}
              </div>

              {/* Right: zoom controls */}
              <div className="flex items-center gap-1 shrink-0 ml-4">
                <button
                  onClick={() => changeZoomAt(1 / 1.25)}
                  className="w-8 h-8 flex items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                  title="Zoom out (-)">
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="text-xs font-mono text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => changeZoomAt(1.25)}
                  className="w-8 h-8 flex items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                  title="Zoom in (+)">
                  <ZoomIn className="size-3.5" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  onClick={resetView}
                  className="h-8 flex items-center gap-1.5 text-xs rounded border bg-background hover:bg-muted transition-colors px-2.5"
                  title="Reset tampilan">
                  <Maximize2 className="size-3" /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Tabel unit ringkas */}
          {unitsRaw.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
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
                                <div className="h-full rounded-full"
                                  style={{ width: `${u.progress}%`, backgroundColor: `rgb(${fill.rgb.join(",")})` }} />
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
