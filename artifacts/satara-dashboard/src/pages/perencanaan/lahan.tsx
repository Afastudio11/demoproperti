import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { calcLandAnalysis, calcMaxUnits, fmtCurrency } from "@/lib/planning-calc";
import { Copy, Hand, MousePointer2, Move, Redo2, Save, Square, Download, MapPin, Plus, Trash2, Undo2, Upload, ZoomIn, ZoomOut, Lock, Unlock, RefreshCw } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function num(v: string) { return parseFloat(v) || 0; }

type CanvasPoint = { x: number; y: number };
type SiteplanTransform = { opacity: number; scale: number; x: number; y: number; locked: boolean };
type DrawTool = "select" | "pan" | "polygon" | "unit_box" | "delete";
type BoxDraft = { width: number; height: number; rotation: number; gap: number; count: number; direction: "right" | "left" | "down" | "up" };
type DragState =
  | { mode: "shape" | "pan"; lastX: number; lastY: number }
  | { mode: "draw-box"; start: CanvasPoint; last: CanvasPoint }
  | { mode: "marquee"; start: CanvasPoint; current: CanvasPoint }
  | { mode: "corner"; index: number }
  | { mode: "edge"; edge: "top" | "right" | "bottom" | "left" }
  | { mode: "rotate"; center: CanvasPoint; startAngle: number; startPoints: CanvasPoint[] };

const defaultTransform: SiteplanTransform = { opacity: 0.86, scale: 1, x: 0, y: 0, locked: true };
const defaultBoxDraft: BoxDraft = { width: 4, height: 7, rotation: 0, gap: 0.6, count: 1, direction: "right" };

function normalizePolygon(coords: Array<[number, number]>): CanvasPoint[] {
  const points = coords
    .filter(point => Array.isArray(point) && point.length >= 2)
    .map(([a, b]) => {
      const looksLatLng = Math.abs(a) <= 90 && Math.abs(b) > 90;
      return { rawX: looksLatLng ? b : a, rawY: looksLatLng ? a : b };
    });
  if (points.length < 3) return [];
  const xs = points.map(p => p.rawX);
  const ys = points.map(p => p.rawY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(0.000001, maxX - minX);
  const rangeY = Math.max(0.000001, maxY - minY);
  return points.map(p => ({
    x: Math.round((8 + ((p.rawX - minX) / rangeX) * 84) * 10) / 10,
    y: Math.round((8 + ((maxY - p.rawY) / rangeY) * 84) * 10) / 10,
  }));
}

function parseAcquisitionPolygon(raw: unknown): CanvasPoint[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (Array.isArray(parsed[0]) && typeof parsed[0][0] === "number") {
      return normalizePolygon(parsed as Array<[number, number]>);
    }
    if (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
      return normalizePolygon(parsed[0] as Array<[number, number]>);
    }
  } catch {
    return [];
  }
  return [];
}

function polygonPoints(points: unknown) {
  return Array.isArray(points) ? points.map((p: any) => `${p.x},${p.y}`).join(" ") : "";
}

function distance(a: CanvasPoint, b: CanvasPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rectanglePoints(cx: number, cy: number, width: number, height: number, rotation: number): CanvasPoint[] {
  const rad = (rotation * Math.PI) / 180;
  const corners = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];
  return corners.map(point => ({
    x: Math.round(Math.max(0, Math.min(100, cx + point.x * Math.cos(rad) - point.y * Math.sin(rad))) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(100, cy + point.x * Math.sin(rad) + point.y * Math.cos(rad))) * 10) / 10,
  }));
}

function polygonCenter(points: CanvasPoint[]) {
  if (points.length === 0) return { x: 50, y: 50 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function polygonBounds(points: CanvasPoint[]) {
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(0.5, Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10),
    height: Math.max(0.5, Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10),
  };
}

function normalizedBounds(a: CanvasPoint, b: CanvasPoint) {
  return {
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxY: Math.max(a.y, b.y),
  };
}

function boundsOverlap(a: ReturnType<typeof normalizedBounds>, b: ReturnType<typeof normalizedBounds>) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function pointInPolygon(point: CanvasPoint, polygon: CanvasPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = ((pi.y > point.y) !== (pj.y > point.y))
      && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || 0.000001) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function boxFromCorners(a: CanvasPoint, b: CanvasPoint) {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

function resizeBox(points: CanvasPoint[], edgeOrCorner: string | number, target: CanvasPoint) {
  if (points.length !== 4) return points;
  const box = polygonBounds(points);
  let { minX, maxX, minY, maxY } = box;
  if (edgeOrCorner === 0 || edgeOrCorner === "left") minX = Math.min(target.x, maxX - 0.5);
  if (edgeOrCorner === 1 || edgeOrCorner === "right") maxX = Math.max(target.x, minX + 0.5);
  if (edgeOrCorner === 2 || edgeOrCorner === "right") maxX = Math.max(target.x, minX + 0.5);
  if (edgeOrCorner === 3 || edgeOrCorner === "left") minX = Math.min(target.x, maxX - 0.5);
  if (edgeOrCorner === 0 || edgeOrCorner === "top") minY = Math.min(target.y, maxY - 0.5);
  if (edgeOrCorner === 1 || edgeOrCorner === "top") minY = Math.min(target.y, maxY - 0.5);
  if (edgeOrCorner === 2 || edgeOrCorner === "bottom") maxY = Math.max(target.y, minY + 0.5);
  if (edgeOrCorner === 3 || edgeOrCorner === "bottom") maxY = Math.max(target.y, minY + 0.5);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ].map(point => ({ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 }));
}

function isUnitRectangleDraft(shapeType: string, points: CanvasPoint[]) {
  return shapeType === "unit" && points.length === 4;
}

function rotateAround(points: CanvasPoint[], center: CanvasPoint, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return points.map(point => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: Math.round(Math.max(0, Math.min(100, center.x + dx * Math.cos(rad) - dy * Math.sin(rad))) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(100, center.y + dx * Math.sin(rad) + dy * Math.cos(rad))) * 10) / 10,
    };
  });
}

function offsetPoints(points: CanvasPoint[], dx: number, dy: number) {
  return points.map(point => ({
    x: Math.round(Math.max(0, Math.min(100, point.x + dx)) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(100, point.y + dy)) * 10) / 10,
  }));
}

function shapeColor(shape: Record<string, any>, isEditing: boolean) {
  if (isEditing) return { fill: "rgba(245,158,11,.32)", stroke: "#f59e0b" };
  if (shape.shapeType === "bidang") return { fill: "rgba(16,185,129,.22)", stroke: "#059669" };
  if (shape.shapeType === "blok") return { fill: "rgba(99,102,241,.18)", stroke: "#4f46e5" };
  if (shape.shapeType === "fasum") return { fill: "rgba(148,163,184,.22)", stroke: "#64748b" };
  const status = String(shape.unitStatus ?? "");
  const progress = Number(shape.progress ?? 0);
  if (status.includes("rework") || status.includes("bermasalah")) return { fill: "rgba(239,68,68,.3)", stroke: "#dc2626" };
  if (status === "terjual_akad") return { fill: "rgba(124,58,237,.28)", stroke: "#7c3aed" };
  if (status === "selesai" || progress >= 100) return { fill: "rgba(34,197,94,.34)", stroke: "#16a34a" };
  if (status === "sedang_dibangun" || progress > 0) return { fill: "rgba(245,158,11,.3)", stroke: "#d97706" };
  if (status === "akan_dibangun") return { fill: "rgba(59,130,246,.26)", stroke: "#2563eb" };
  return { fill: "rgba(203,213,225,.32)", stroke: "#64748b" };
}

function nextLabel(label: string, index: number) {
  const match = label.match(/^(.*?)(\d+)$/);
  if (!match) return index === 0 ? label : `${label}-${index + 1}`;
  const prefix = match[1];
  const numberText = match[2];
  const value = Number(numberText) + index;
  return `${prefix}${String(value).padStart(numberText.length, "0")}`;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Gagal membaca file siteplan"));
    reader.readAsDataURL(file);
  });
}

async function compressSiteplanImage(file: File) {
  const originalSizeMb = file.size / 1024 / 1024;
  if (file.type === "image/svg+xml") {
    const dataUrl = await fileToDataUrl(file);
    return { dataUrl, originalSizeMb, uploadSizeMb: dataUrl.length / 1024 / 1024 };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Format gambar siteplan tidak bisa dibaca"));
      img.src = objectUrl;
    });
    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak bisa memproses gambar siteplan");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return { dataUrl, originalSizeMb, uploadSizeMb: dataUrl.length / 1024 / 1024 };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const defaultForm = {
  projectId: 0,
  landArea: 0,
  landPriceTotal: 0,
  landShape: "",
  contour: "",
  roadWidth: 0,
  legalStatus: "",
  notes: "",
  kavlingArea: 0,
};

export default function LahanPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [autoImported, setAutoImported] = useState(false);
  const [activeSiteplanId, setActiveSiteplanId] = useState<number | null>(null);
  const [isUploadingSiteplan, setIsUploadingSiteplan] = useState(false);
  const [siteplanTransform, setSiteplanTransform] = useState<SiteplanTransform>(defaultTransform);
  const [drawTool, setDrawTool] = useState<DrawTool>("select");
  const [polygonClosed, setPolygonClosed] = useState(false);
  const [boxDraft, setBoxDraft] = useState<BoxDraft>(defaultBoxDraft);
  const [serialCopy, setSerialCopy] = useState({ startLabel: "", count: 3, direction: "right" as BoxDraft["direction"], gap: 0.3 });
  const [copiedDraft, setCopiedDraft] = useState<CanvasPoint[] | null>(null);
  const [copiedShapes, setCopiedShapes] = useState<any[]>([]);
  const [shapeDraft, setShapeDraft] = useState({ shapeType: "unit", label: "", ownerName: "", landArea: 0, price: 0, legalStatus: "", purchaseStatus: "belum_dibeli", plannedUnits: 1, blockCode: "", unitType: "", subkonName: "", unitStatus: "belum_dibuka", unitId: "", progress: 0, notes: "", isLocked: false });
  const [draftPoints, setDraftPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [editingShapeId, setEditingShapeId] = useState<number | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<number[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ start: CanvasPoint; current: CanvasPoint } | null>(null);
  const [draftHistory, setDraftHistory] = useState<CanvasPoint[][]>([]);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const draftPointsRef = useRef<CanvasPoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justLoadedEditingRef = useRef<number | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    draftPointsRef.current = draftPoints;
  }, [draftPoints]);

  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const urlProjectId = searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : null;
  const urlProspectId = searchParams.get("prospectId") ? parseInt(searchParams.get("prospectId")!) : null;

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });
  const { data: units = [] } = useQuery({
    queryKey: ["units", form.projectId],
    queryFn: () => fetch(`/api/units?projectId=${form.projectId}`).then(r => r.json()),
    enabled: !!form.projectId,
  });
  const { data: prospects } = useQuery({
    queryKey: ["land-prospects"],
    queryFn: () => fetch("/api/land-prospects").then(r => r.json()),
    enabled: showImport || !!urlProspectId,
  });
  const { data: siteplans = [], refetch: refetchSiteplans } = useQuery({
    queryKey: ["planning-siteplan", form.projectId],
    queryFn: () => fetch(`/api/planning/siteplan?projectId=${form.projectId}&_t=${Date.now()}`).then(r => r.json()),
    enabled: !!form.projectId,
  });
  const selectedSiteplan = (siteplans as any[]).find(s => s.id === activeSiteplanId) ?? (siteplans as any[])[0] ?? null;
  const { data: siteplanShapes = [], refetch: refetchShapes } = useQuery({
    queryKey: ["planning-siteplan-shapes", selectedSiteplan?.id],
    queryFn: () => fetch(`/api/planning/siteplan/${selectedSiteplan.id}/shapes`).then(r => r.json()),
    enabled: !!selectedSiteplan?.id,
  });

  // Lazy-load the full siteplan including imageDataUrl (can be large — fetched separately)
  const { data: selectedSiteplanDetail, refetch: refetchSiteplanDetail } = useQuery({
    queryKey: ["planning-siteplan-detail", selectedSiteplan?.id],
    queryFn: () => fetch(`/api/planning/siteplan/${selectedSiteplan!.id}`).then(r => r.json()),
    enabled: !!selectedSiteplan?.id,
    staleTime: 10 * 60 * 1000,
  });
  const siteplanImageUrl: string | null = selectedSiteplanDetail?.imageDataUrl ?? null;

  useEffect(() => {
    const transform = selectedSiteplan?.imageTransform as Partial<SiteplanTransform> | undefined;
    setSiteplanTransform({ ...defaultTransform, ...(transform ?? {}) });
  }, [selectedSiteplan?.id, selectedSiteplan?.imageTransform]);

  const selectProject = async (id: number) => {
    setForm(prev => ({ ...prev, projectId: id }));
    const rows = await fetch("/api/planning/land?projectId=" + id).then(r => r.json());
    if (rows.length > 0) {
      setForm({ ...defaultForm, ...rows[0] });
      setSavedId(rows[0].id);
    } else {
      setSavedId(null);
    }
  };

  useEffect(() => {
    if (!urlProjectId || autoImported) return;
    setAutoImported(true);
    selectProject(urlProjectId).then(async () => {
      if (urlProspectId) {
        const resp = await fetch(`/api/land-prospects/${urlProspectId}`).then(r => r.json());
        if (!resp) return;
        const surveyData = resp.surveyData || {};
        const ai = resp.fullAiResult || {};
        const alloc = ai.landAllocation || {};
        setForm(prev => ({
          ...prev,
          projectId: urlProjectId,
          landArea: resp.luas || prev.landArea,
          landPriceTotal: (resp.hargaM2 || 0) * (resp.luas || 0) || prev.landPriceTotal,
          roadWidth: resp.aksesJalan || prev.roadWidth,
          legalStatus: resp.statusKepemilikan || surveyData.statusLegal || prev.legalStatus,
          landShape: surveyData.bentukLahan || prev.landShape,
          contour: surveyData.kontur || prev.contour,
          notes: [resp.lokasi || "", resp.kelurahan ? `Kel. ${resp.kelurahan}` : "", resp.kecamatan ? `Kec. ${resp.kecamatan}` : "", resp.kabupaten || ""].filter(Boolean).join(", ") || prev.notes,
          kavlingArea: (alloc as Record<string, number>).kavlingArea || prev.kavlingArea,
        }));
        try {
          const siteplan = await syncProspectToSiteplan(resp, urlProjectId);
          if (siteplan) toast({ title: "Boundary Akuisisi masuk ke Perencanaan" });
        } catch {
          toast({ title: "Data lahan masuk, tapi polygon Akuisisi belum bisa dipakai", variant: "destructive" });
        }
        toast({ title: "Data lahan diimpor dari Akuisisi Lahan" });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectId, urlProspectId]);

  const setF = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: typeof v === "string" ? (parseFloat(v) || v) : v }));

  async function syncProspectToSiteplan(resp: Record<string, any>, projectId: number) {
    const mainPolygon = parseAcquisitionPolygon(resp.polygonCoords);
    if (mainPolygon.length < 3) return null;
    const body = {
      projectId,
      landProspectId: resp.id,
      title: selectedSiteplan?.title ?? `Boundary Akuisisi - ${resp.lokasi ?? `Prospek #${resp.id}`}`,
      mainPolygon,
      source: "akuisisi",
    };
    const targetId = selectedSiteplan?.id;
    const response = await fetch(targetId ? `/api/planning/siteplan/${targetId}` : "/api/planning/siteplan", {
      method: targetId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const row = await response.json().catch(() => null);
    if (!response.ok) throw new Error(row?.error ?? "Gagal membuat workspace siteplan dari Akuisisi");
    setActiveSiteplanId(row.id);
    await refetchSiteplans();
    return row;
  }

  const importFromProspect = async (prospectId: number) => {
    const resp = await fetch(`/api/land-prospects/${prospectId}`).then(r => r.json());
    if (!resp) return;
    const surveyData = resp.surveyData || {};
    const ai = resp.fullAiResult || {};
    const alloc = ai.landAllocation || {};

    setForm(prev => ({
      ...prev,
      landArea: resp.luas || prev.landArea,
      landPriceTotal: (resp.hargaM2 || 0) * (resp.luas || 0) || prev.landPriceTotal,
      roadWidth: resp.aksesJalan || prev.roadWidth,
      legalStatus: resp.statusKepemilikan || surveyData.statusLegal || prev.legalStatus,
      landShape: surveyData.bentukLahan || prev.landShape,
      contour: surveyData.kontur || prev.contour,
      notes: [
        resp.lokasi || "",
        resp.kelurahan ? `Kel. ${resp.kelurahan}` : "",
        resp.kecamatan ? `Kec. ${resp.kecamatan}` : "",
        resp.kabupaten || "",
      ].filter(Boolean).join(", ") || prev.notes,
    }));
    const projectId = form.projectId || resp.projectId;
    if (projectId) {
      try {
        const siteplan = await syncProspectToSiteplan(resp, projectId);
        if (siteplan) toast({ title: "Boundary Akuisisi masuk ke Perencanaan", description: "Lahan utama sudah siap dipakai untuk pembagian bidang dan tracing siteplan." });
      } catch (err) {
        toast({ title: "Boundary Akuisisi belum masuk", description: err instanceof Error ? err.message : "Polygon Akuisisi tidak bisa diproses.", variant: "destructive" });
      }
    }
    setShowImport(false);
    toast({ title: "Data lahan diimpor dari Akuisisi Lahan" });
  };

  const { roadArea, fasumArea, effectiveArea } = calcLandAnalysis(form.landArea);
  const maxUnits = calcMaxUnits(effectiveArea, form.kavlingArea);
  const landPricePerUnit = maxUnits > 0 ? form.landPriceTotal / maxUnits : 0;
  const landPricePerM2 = form.landArea > 0 ? form.landPriceTotal / form.landArea : 0;

  const chartData = [
    { name: "Jalan (18%)", area: Number(roadArea ?? 0), fill: "#f59e0b" },
    { name: "Fasum (12%)", area: Number(fasumArea ?? 0), fill: "#3b82f6" },
    { name: "Efektif (70%)", area: Number(effectiveArea ?? 0), fill: "#10b981" },
  ];

  const save = async () => {
    if (!form.projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const payload = {
      ...form,
      roadArea, fasumArea, effectiveArea, maxUnits,
      landPricePerUnit: Math.round(landPricePerUnit),
    };
    const url = savedId ? `/api/planning/land/${savedId}` : "/api/planning/land";
    const method = savedId ? "PATCH" : "POST";
    const resp = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!resp.ok) { toast({ title: "Gagal simpan", variant: "destructive" }); return; }
    const d = await resp.json();
    setSavedId(d.id);
    if (selectedSiteplan?.id) await saveSiteplanTransform(siteplanTransform, true);
    await qc.invalidateQueries({ queryKey: ["planning-land"] });
    toast({ title: "Analisis lahan tersimpan" });
  };

  async function uploadSiteplan(file: File) {
    if (!form.projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    setIsUploadingSiteplan(true);
    try {
      const image = await compressSiteplanImage(file);
      const resp = await fetch("/api/planning/siteplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: form.projectId,
          landProspectId: selectedSiteplan?.landProspectId ?? null,
          title: file.name,
          imageDataUrl: image.dataUrl,
          mainPolygon: selectedSiteplan?.mainPolygon ?? null,
          imageTransform: defaultTransform,
          source: selectedSiteplan?.mainPolygon ? "siteplan_revisi" : "upload",
        }),
      });
      const row = await resp.json().catch(() => null);
      if (!resp.ok) {
        const suffix = `Ukuran upload ${image.uploadSizeMb.toFixed(1)} MB dari file asli ${image.originalSizeMb.toFixed(1)} MB.`;
        throw new Error(row?.error ? `${row.error}. ${suffix}` : `Server menolak upload siteplan. ${suffix}`);
      }
      setActiveSiteplanId(row.id);
      await refetchSiteplans();
      toast({
        title: "Siteplan berhasil diupload",
        description: `${file.name} (${image.originalSizeMb.toFixed(1)} MB -> ${image.uploadSizeMb.toFixed(1)} MB)`,
      });
    } catch (err) {
      toast({ title: "Gagal upload siteplan", description: err instanceof Error ? err.message : "Terjadi kesalahan saat upload.", variant: "destructive" });
    } finally {
      setIsUploadingSiteplan(false);
    }
  }

  function canvasPoint(e: React.PointerEvent | React.MouseEvent): CanvasPoint | null {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    // Account for canvas zoom & pan: inner content is translate(panX, panY) scale(zoom) from origin 0,0
    const innerX = (e.clientX - rect.left - canvasPan.x) / canvasZoom;
    const innerY = (e.clientY - rect.top - canvasPan.y) / canvasZoom;
    return {
      x: Math.round(Math.max(0, Math.min(100, (innerX / rect.width) * 100)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(100, (innerY / rect.height) * 100)) * 10) / 10,
    };
  }

  function handleCanvasWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
    const newZoom = Math.max(0.25, Math.min(10, canvasZoom * factor));
    // Keep the canvas point under cursor fixed while zooming
    const newPanX = mouseX - (mouseX - canvasPan.x) * (newZoom / canvasZoom);
    const newPanY = mouseY - (mouseY - canvasPan.y) * (newZoom / canvasZoom);
    setCanvasZoom(newZoom);
    setCanvasPan({ x: newPanX, y: newPanY });
  }

  function rememberDraft() {
    setDraftHistory(prev => draftPoints.length >= 3 ? [...prev.slice(-24), draftPoints] : prev);
  }

  function nextUnitLabel() {
    const existing = shapeList.map(shape => String(shape.label ?? ""));
    let index = 1;
    while (existing.includes(`A-${String(index).padStart(2, "0")}`)) index += 1;
    return `A-${String(index).padStart(2, "0")}`;
  }

  async function autoSaveNewShape(points: CanvasPoint[], labelOverride?: string): Promise<any | null> {
    if (!selectedSiteplan || points.length < 3) return null;
    const finalLabel = (labelOverride || shapeDraft.label.trim() || nextUnitLabel());
    const isBox = isUnitRectangleDraft(shapeDraft.shapeType, points);
    const payload = {
      ...shapeDraft,
      label: finalLabel,
      unitId: shapeDraft.unitId ? Number(shapeDraft.unitId) : null,
      polygon: points,
      notes: isBox
        ? [shapeDraft.notes, `box:${boxDraft.width}x${boxDraft.height},rot:${boxDraft.rotation}`].filter(Boolean).join(" | ")
        : shapeDraft.notes,
    };
    setIsSaving(true);
    try {
      const resp = await fetch(`/api/planning/siteplan/${selectedSiteplan.id}/shapes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) return null;
      const saved = await resp.json();
      setShapeDraft(p => ({ ...p, label: finalLabel }));
      await refetchShapes();
      return saved;
    } catch {
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function autoPatchShape(id: number, fields: Record<string, unknown>) {
    setIsSaving(true);
    try {
      const resp = await fetch(`/api/planning/siteplan/shapes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (resp.ok) await refetchShapes();
    } finally {
      setIsSaving(false);
    }
  }

  async function batchCopyShapes() {
    if (!selectedSiteplan || draftPoints.length !== 4 || boxDraft.count <= 1) return;
    const dx = boxDraft.direction === "right" ? boxDraft.width + boxDraft.gap : boxDraft.direction === "left" ? -(boxDraft.width + boxDraft.gap) : 0;
    const dy = boxDraft.direction === "down" ? boxDraft.height + boxDraft.gap : boxDraft.direction === "up" ? -(boxDraft.height + boxDraft.gap) : 0;
    setIsSaving(true);
    try {
      for (let i = 1; i <= boxDraft.count; i++) {
        const payload = {
          ...shapeDraft,
          label: nextLabel(shapeDraft.label, i),
          unitId: null,
          polygon: offsetPoints(draftPoints, dx * i, dy * i),
          notes: [shapeDraft.notes, `box:${boxDraft.width}x${boxDraft.height},rot:${boxDraft.rotation}`].filter(Boolean).join(" | "),
        };
        await fetch(`/api/planning/siteplan/${selectedSiteplan.id}/shapes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await refetchShapes();
      toast({ title: `${boxDraft.count} salinan unit dibuat` });
    } catch {
      toast({ title: "Gagal membuat salinan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  function shapeAtPoint(point: CanvasPoint) {
    // Check editing shape using live draftPoints (not stale DB polygon that may have moved)
    if (editingShapeId && draftPoints.length >= 3 && pointInPolygon(point, draftPoints)) {
      return shapeList.find(s => s.id === editingShapeId) ?? null;
    }
    for (let i = shapeList.length - 1; i >= 0; i -= 1) {
      const shape = shapeList[i];
      if (shape.id === editingShapeId) continue; // already handled above with live draftPoints
      const polygon = Array.isArray(shape.polygon) ? shape.polygon as CanvasPoint[] : [];
      if (polygon.length >= 3 && pointInPolygon(point, polygon)) return shape;
    }
    return null;
  }

  function activateTool(tool: DrawTool, shapeType?: string) {
    setDrawTool(tool);
    if (tool === "unit_box") {
      setShapeDraft(p => ({ ...p, shapeType: "unit", label: p.label || nextUnitLabel(), unitStatus: p.unitStatus || "akan_dibangun" }));
      // Don't reset draftPoints if user already has an active box draft
      if (draftPoints.length !== 4) setPolygonClosed(true);
    } else if (tool === "polygon") {
      setShapeDraft(p => ({ ...p, shapeType: shapeType ?? p.shapeType }));
      // When switching to polygon, clear unsaved draft but keep saved shape being edited
      if (!editingShapeId) {
        setDraftPoints([]);
        setPolygonClosed(false);
      }
    }
    // Note: intentionally NOT clearing selectedShapeIds — Miro-like: tool change doesn't lose selection
  }

  function addPoint(e: React.MouseEvent<HTMLDivElement>) {
    if (!selectedSiteplan) return;
    if (drawTool !== "polygon") return;
    const point = canvasPoint(e);
    if (!point || polygonClosed) return;
    setDraftPoints(points => {
      if (points.length >= 3 && distance(point, points[0]) <= 2.5) {
        setPolygonClosed(true);
        return points;
      }
      return [...points, point];
    });
  }

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!selectedSiteplan) return;
    const point = canvasPoint(e);
    if (!point) return;

    if (drawTool === "delete") {
      const shape = shapeAtPoint(point);
      if (shape) deleteShape(shape.id);
      return;
    }

    if (drawTool === "pan") {
      startPan(e);
      return;
    }

    if (drawTool === "select") {
      // ── Body drag for active draft (Miro-like: grab the box body, not just handles) ──
      if (draftPoints.length >= 3 && pointInPolygon(point, draftPoints)) {
        if (!shapeDraft.isLocked) {
          rememberDraft();
          dragRef.current = { mode: "shape", lastX: e.clientX, lastY: e.clientY };
          imageRef.current?.setPointerCapture(e.pointerId);
        }
        return;
      }
      // ── Marquee selection (Ctrl/Shift drag) ──
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        setSelectedShapeIds([]);
        setSelectionBox({ start: point, current: point });
        dragRef.current = { mode: "marquee", start: point, current: point };
        imageRef.current?.setPointerCapture(e.pointerId);
        return;
      }
      // ── Click on background: deselect active shape ──
      const hitShape = shapeAtPoint(point);
      if (!hitShape) {
        resetDraft();
      }
      return;
    }

    if (drawTool === "unit_box") {
      rememberDraft();
      setShapeDraft(p => ({ ...p, shapeType: "unit", label: p.label || nextUnitLabel() }));
      setPolygonClosed(true);
      dragRef.current = { mode: "draw-box", start: point, last: point };
      imageRef.current?.setPointerCapture(e.pointerId);
      const next = rectanglePoints(point.x, point.y, boxDraft.width, boxDraft.height, boxDraft.rotation);
      draftPointsRef.current = next;
      setDraftPoints(next);
      return;
    }
  }

  function startDraftBodyDrag(e: React.PointerEvent<SVGPolygonElement>) {
    if (drawTool !== "select" || draftPoints.length < 3 || shapeDraft.isLocked) return;
    e.stopPropagation();
    rememberDraft();
    dragRef.current = { mode: "shape", lastX: e.clientX, lastY: e.clientY };
    imageRef.current?.setPointerCapture(e.pointerId);
  }

  function startShapeDrag(e: React.PointerEvent<SVGPolygonElement>, shape: any) {
    if (drawTool !== "select") return;
    e.stopPropagation();
    rememberDraft();
    setSelectedShapeIds([shape.id]);
    startEditShape(shape);
    if (shape.isLocked) return;
    dragRef.current = { mode: "shape", lastX: e.clientX, lastY: e.clientY };
    imageRef.current?.setPointerCapture(e.pointerId);
  }

  function startPan(e: React.PointerEvent<HTMLDivElement>) {
    if (drawTool !== "pan") return;
    dragRef.current = { mode: "pan", lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!imageRef.current || !dragRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const drag = dragRef.current;
    const point = canvasPoint(e);
    if (!point) return;
    if (drag.mode === "draw-box") {
      dragRef.current = { ...drag, last: point };
      const width = Math.abs(point.x - drag.start.x);
      const height = Math.abs(point.y - drag.start.y);
      const next = width >= 0.5 && height >= 0.5 ? boxFromCorners(drag.start, point) : rectanglePoints(point.x, point.y, boxDraft.width, boxDraft.height, boxDraft.rotation);
      draftPointsRef.current = next;
      setDraftPoints(next);
      return;
    }
    if (drag.mode === "corner") {
      setDraftPoints(points => {
        if (!isUnitRectangleDraft(shapeDraft.shapeType, points)) {
          const next = points.map((p, i) => i === drag.index ? point : p);
          draftPointsRef.current = next;
          return next;
        }
        const next = resizeBox(points, drag.index, point);
        const bounds = polygonBounds(next);
        setBoxDraft(prev => ({ ...prev, width: bounds.width, height: bounds.height }));
        draftPointsRef.current = next;
        return next;
      });
      return;
    }
    if (drag.mode === "edge") {
      setDraftPoints(points => {
        const next = resizeBox(points, drag.edge, point);
        const bounds = polygonBounds(next);
        setBoxDraft(prev => ({ ...prev, width: bounds.width, height: bounds.height }));
        draftPointsRef.current = next;
        return next;
      });
      return;
    }
    if (drag.mode === "rotate") {
      const currentAngle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x) * 180 / Math.PI;
      const angle = currentAngle - drag.startAngle;
      const next = rotateAround(drag.startPoints, drag.center, e.shiftKey ? Math.round(angle / 15) * 15 : angle);
      draftPointsRef.current = next;
      setDraftPoints(next);
      return;
    }
    if (drag.mode === "marquee") {
      dragRef.current = { ...drag, current: point };
      setSelectionBox({ start: drag.start, current: point });
      return;
    }
    const clientDx = e.clientX - drag.lastX;
    const clientDy = e.clientY - drag.lastY;
    // Divide by canvasZoom so drag distance matches visual movement at all zoom levels
    const dx = (clientDx / rect.width) * 100 / canvasZoom;
    const dy = (clientDy / rect.height) * 100 / canvasZoom;
    dragRef.current = { ...drag, lastX: e.clientX, lastY: e.clientY };
    if (drag.mode === "shape") {
      setDraftPoints(points => {
        const next = offsetPoints(points, dx, dy);
        draftPointsRef.current = next;
        return next;
      });
    } else if (drag.mode === "pan") {
      // Pan mode moves the canvas viewport (in pixel space, before zoom adjustment)
      setCanvasPan(prev => ({ x: prev.x + clientDx, y: prev.y + clientDy }));
    }
  }

  function stopCanvasDrag() {
    const drag = dragRef.current;
    dragRef.current = null;

    if (drag?.mode === "draw-box") {
      const width = Math.abs(drag.last.x - drag.start.x);
      const height = Math.abs(drag.last.y - drag.start.y);
      const finalPoints = width >= 0.5 && height >= 0.5 ? boxFromCorners(drag.start, drag.last) : rectanglePoints(drag.start.x, drag.start.y, boxDraft.width, boxDraft.height, boxDraft.rotation);
      draftPointsRef.current = finalPoints;
      const bounds = polygonBounds(finalPoints);
      setBoxDraft(prev => ({ ...prev, width: bounds.width, height: bounds.height, count: 1, rotation: 0 }));
      setDrawTool("select");
      // Auto-save immediately — no Simpan button needed
      const autoLabel = shapeDraft.label.trim() || nextUnitLabel();
      autoSaveNewShape(finalPoints, autoLabel).then(saved => {
        if (saved) {
          setDraftPoints([]);
          setPolygonClosed(false);
          justLoadedEditingRef.current = saved.id;
          setEditingShapeId(saved.id);
          const shapePoints = Array.isArray(saved.polygon) ? saved.polygon : [];
          const isUnitBox = saved.shapeType === "unit" && shapePoints.length === 4;
          if (isUnitBox) {
            const b = polygonBounds(shapePoints);
            setBoxDraft(prev => ({ ...prev, width: b.width, height: b.height, count: 1 }));
          }
          setShapeDraft({
            shapeType: saved.shapeType ?? "unit",
            label: saved.label ?? autoLabel,
            ownerName: saved.ownerName ?? "",
            landArea: Number(saved.landArea ?? 0),
            price: Number(saved.price ?? 0),
            legalStatus: saved.legalStatus ?? "",
            purchaseStatus: saved.purchaseStatus ?? "belum_dibeli",
            plannedUnits: Number(saved.plannedUnits ?? 1),
            blockCode: saved.blockCode ?? "",
            unitType: saved.unitType ?? "",
            subkonName: saved.subkonName ?? "",
            unitStatus: saved.unitStatus ?? "belum_dibuka",
            unitId: saved.unitId ? String(saved.unitId) : "",
            progress: Number(saved.progress ?? 0),
            notes: saved.notes ?? "",
            isLocked: saved.isLocked ?? false,
          });
          setDraftPoints(shapePoints);
          setPolygonClosed(true);
        } else {
          setDraftPoints(finalPoints);
        }
      });
      return;
    }

    // Auto-patch polygon when dragging/resizing a saved shape
    if ((drag?.mode === "shape" || drag?.mode === "corner" || drag?.mode === "edge" || drag?.mode === "rotate") && editingShapeId) {
      autoPatchShape(editingShapeId, { polygon: draftPointsRef.current });
      return;
    }

    if (drag?.mode === "marquee") {
      const selection = normalizedBounds(drag.start, drag.current);
      const selected = shapeList
        .filter(shape => {
          const polygon = Array.isArray(shape.polygon) ? shape.polygon as CanvasPoint[] : [];
          return polygon.length >= 3 && boundsOverlap(polygonBounds(polygon), selection);
        })
        .map(shape => shape.id);
      setSelectedShapeIds(selected);
      setSelectionBox(null);
      if (selected.length > 0) resetDraft();
    }
  }

  async function saveShape() {
    const currentPoints = draftPointsRef.current.length >= 3 ? draftPointsRef.current : draftPoints;
    if (!selectedSiteplan || currentPoints.length < 3 || !shapeDraft.label) {
      toast({ title: "Isi label dan minimal 3 titik polygon", variant: "destructive" });
      return;
    }
    const isBoxDraft = isUnitRectangleDraft(shapeDraft.shapeType, currentPoints);
    if (!isBoxDraft && !polygonClosed) {
      toast({ title: "Tutup polygon dulu sebelum simpan", variant: "destructive" });
      return;
    }
    const isBoxBatch = isBoxDraft && !editingShapeId && boxDraft.count > 1;
    try {
      if (isBoxBatch) {
        const dx = boxDraft.direction === "right" ? boxDraft.width + boxDraft.gap : boxDraft.direction === "left" ? -(boxDraft.width + boxDraft.gap) : 0;
        const dy = boxDraft.direction === "down" ? boxDraft.height + boxDraft.gap : boxDraft.direction === "up" ? -(boxDraft.height + boxDraft.gap) : 0;
        for (let i = 0; i < boxDraft.count; i += 1) {
          const payload = {
            ...shapeDraft,
            label: nextLabel(shapeDraft.label, i),
            unitId: null,
            polygon: offsetPoints(currentPoints, dx * i, dy * i),
            notes: [shapeDraft.notes, `box:${boxDraft.width}x${boxDraft.height},rot:${boxDraft.rotation}`].filter(Boolean).join(" | "),
          };
          const resp = await fetch(`/api/planning/siteplan/${selectedSiteplan.id}/shapes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error((await resp.json().catch(() => null))?.error ?? "Gagal menyimpan unit rumah");
        }
      } else {
        const payload = {
          ...shapeDraft,
          unitId: shapeDraft.unitId ? Number(shapeDraft.unitId) : null,
          polygon: currentPoints,
          notes: isBoxDraft
            ? [shapeDraft.notes, `box:${boxDraft.width}x${boxDraft.height},rot:${boxDraft.rotation}`].filter(Boolean).join(" | ")
            : shapeDraft.notes,
        };
        const resp = await fetch(editingShapeId ? `/api/planning/siteplan/shapes/${editingShapeId}` : `/api/planning/siteplan/${selectedSiteplan.id}/shapes`, {
          method: editingShapeId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error((await resp.json().catch(() => null))?.error ?? "Gagal menyimpan shape siteplan");
      }
    } catch (err) {
      toast({ title: "Gagal simpan shape", description: err instanceof Error ? err.message : "Coba ulangi lagi.", variant: "destructive" });
      return;
    }
    draftPointsRef.current = [];
    setDraftPoints([]);
    setPolygonClosed(false);
    setEditingShapeId(null);
    setDrawTool("select");
    setShapeDraft(p => ({ ...p, label: "", ownerName: "", blockCode: "", notes: "", unitId: "", progress: 0 }));
    await refetchShapes();
    toast({ title: editingShapeId ? "Shape siteplan diperbarui" : isBoxBatch ? `${boxDraft.count} unit kotak disimpan` : "Shape siteplan disimpan" });
  }

  function startEditShape(shape: any) {
    const shapePoints = Array.isArray(shape.polygon) ? shape.polygon : [];
    const isUnitBox = shape.shapeType === "unit" && shapePoints.length === 4;
    if (isUnitBox) {
      const bounds = polygonBounds(shapePoints);
      setBoxDraft(prev => ({ ...prev, width: bounds.width, height: bounds.height, count: 1 }));
    }
    setSerialCopy(prev => ({ ...prev, startLabel: nextLabel(String(shape.label ?? "A-01"), 1) }));
    justLoadedEditingRef.current = shape.id;
    setEditingShapeId(shape.id);
    setShapeDraft({
      shapeType: shape.shapeType ?? "unit",
      label: shape.label ?? "",
      ownerName: shape.ownerName ?? "",
      landArea: Number(shape.landArea ?? 0),
      price: Number(shape.price ?? 0),
      legalStatus: shape.legalStatus ?? "",
      purchaseStatus: shape.purchaseStatus ?? "belum_dibeli",
      plannedUnits: Number(shape.plannedUnits ?? 1),
      blockCode: shape.blockCode ?? "",
      unitType: shape.unitType ?? "",
      subkonName: shape.subkonName ?? "",
      unitStatus: shape.unitStatus ?? "belum_dibuka",
      unitId: shape.unitId ? String(shape.unitId) : "",
      progress: Number(shape.progress ?? 0),
      notes: shape.notes ?? "",
      isLocked: !!shape.isLocked,
    });
    draftPointsRef.current = shapePoints;
    setDraftPoints(shapePoints);
    setPolygonClosed(true);
    setDrawTool("select");
  }

  function moveDraft(dx: number, dy: number) {
    setDraftPoints(points => {
      const next = points.map(p => ({
        x: Math.max(0, Math.min(100, Math.round((p.x + dx) * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round((p.y + dy) * 10) / 10)),
      }));
      draftPointsRef.current = next;
      return next;
    });
  }

  function updateBoxDraft(next: Partial<BoxDraft>) {
    setBoxDraft(prev => {
      const updated = { ...prev, ...next };
      if (isUnitRectangleDraft(shapeDraft.shapeType, draftPoints)) {
        const center = polygonCenter(draftPoints);
        const nextPoints = rectanglePoints(center.x, center.y, updated.width, updated.height, updated.rotation);
        draftPointsRef.current = nextPoints;
        setDraftPoints(nextPoints);
        setPolygonClosed(true);
      }
      return updated;
    });
  }

  function startDraftCornerDrag(e: React.PointerEvent, index: number) {
    e.stopPropagation();
    rememberDraft();
    dragRef.current = { mode: "corner", index };
    imageRef.current?.setPointerCapture(e.pointerId);
  }

  function startDraftEdgeDrag(e: React.PointerEvent, edge: "top" | "right" | "bottom" | "left") {
    e.stopPropagation();
    rememberDraft();
    dragRef.current = { mode: "edge", edge };
    imageRef.current?.setPointerCapture(e.pointerId);
  }

  function startDraftRotate(e: React.PointerEvent) {
    e.stopPropagation();
    if (draftPoints.length !== 4) return;
    const point = canvasPoint(e);
    if (!point) return;
    rememberDraft();
    const center = polygonCenter(draftPoints);
    dragRef.current = {
      mode: "rotate",
      center,
      startAngle: Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI,
      startPoints: draftPoints,
    };
    imageRef.current?.setPointerCapture(e.pointerId);
  }

  function undoDraft() {
    setDraftHistory(prev => {
      const last = prev.at(-1);
      if (!last) return prev;
      draftPointsRef.current = last;
      setDraftPoints(last);
      setPolygonClosed(true);
      return prev.slice(0, -1);
    });
  }

  function deleteCurrentShape() {
    if (selectedShapeIds.length > 0) {
      deleteSelectedShapes();
      return;
    }
    if (editingShapeId) {
      deleteShape(editingShapeId);
      resetDraft();
      return;
    }
    resetDraft();
  }

  function resetDraft() {
    draftPointsRef.current = [];
    setDraftPoints([]);
    setPolygonClosed(false);
    setEditingShapeId(null);
    setSelectedShapeIds([]);
    setSelectionBox(null);
  }

  function closePolygon() {
    if (draftPoints.length < 3) {
      toast({ title: "Minimal 3 titik untuk menutup polygon", variant: "destructive" });
      return;
    }
    setPolygonClosed(true);
  }

  function copyDraft() {
    if (selectedShapeIds.length > 1) {
      const shapes = shapeList.filter(s => selectedShapeIds.includes(s.id));
      if (shapes.length === 0) return;
      setCopiedShapes(shapes);
      setCopiedDraft(null);
      toast({ title: `${shapes.length} shape dicopy` });
    } else if (draftPoints.length >= 3) {
      setCopiedDraft(draftPoints);
      setCopiedShapes([]);
      toast({ title: "Shape dicopy" });
    } else {
      toast({ title: "Pilih shape atau gunakan Shift-drag untuk pilih banyak", variant: "destructive" });
    }
  }

  // Post shape with auto-retry on duplicate label (409)
  async function postShapeUnique(siteplanId: number, payload: Record<string, unknown>, startLabel: string): Promise<any> {
    let label = startLabel;
    for (let attempt = 0; attempt < 20; attempt++) {
      const resp = await fetch(`/api/planning/siteplan/${siteplanId}/shapes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, label }),
      });
      if (resp.ok) return resp.json();
      if (resp.status === 409) { label = nextLabel(label, 1); continue; }
      throw new Error((await resp.json().catch(() => null))?.error ?? "Gagal menyimpan shape");
    }
    throw new Error(`Tidak bisa menemukan label unik setelah "${startLabel}"`);
  }

  async function pasteDraft() {
    if (!selectedSiteplan) return;
    if (copiedShapes.length > 1) {
      // Multi-paste
      const allPoints = copiedShapes.flatMap(s => Array.isArray(s.polygon) ? s.polygon as CanvasPoint[] : []);
      const groupBounds = polygonBounds(allPoints.length >= 3 ? allPoints : copiedShapes[0].polygon);
      const offsetX = groupBounds.width + 0.5;
      setIsSaving(true);
      try {
        const newIds: number[] = [];
        for (const cs of copiedShapes) {
          const poly = Array.isArray(cs.polygon) ? cs.polygon as CanvasPoint[] : [];
          const startLabel = nextLabel(cs.label || "A-01", copiedShapes.length);
          const saved = await postShapeUnique(selectedSiteplan.id, { ...cs, id: undefined, siteplanId: undefined, createdAt: undefined, updatedAt: undefined, unitId: null, polygon: offsetPoints(poly, offsetX, 0), isLocked: 0 }, startLabel);
          newIds.push(saved.id);
        }
        await refetchShapes();
        setSelectedShapeIds(newIds);
        resetDraft();
        toast({ title: `${copiedShapes.length} shape ditempel` });
      } catch (err) {
        toast({ title: "Gagal paste", description: err instanceof Error ? err.message : "Coba ulangi lagi.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    } else if (copiedDraft) {
      // Single paste
      const bounds = polygonBounds(copiedDraft);
      const newPoints = offsetPoints(copiedDraft, bounds.width + 0.3, 0);
      const startLabel = nextLabel(shapeDraft.label || "A-01", 1);
      setIsSaving(true);
      try {
        const saved = await postShapeUnique(selectedSiteplan.id, { ...shapeDraft, unitId: null, polygon: newPoints, isLocked: 0 }, startLabel);
        await refetchShapes();
        startEditShape(saved);
        toast({ title: `Shape ${saved.label} ditempel di sebelah kanan` });
      } catch (err) {
        toast({ title: "Gagal paste shape", description: err instanceof Error ? err.message : "Coba ulangi lagi.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    } else {
      toast({ title: "Belum ada shape yang dicopy", variant: "destructive" });
    }
  }

  async function batchSerialCopy() {
    if (!selectedSiteplan || !editingShapeId || draftPoints.length < 3 || !serialCopy.startLabel) return;
    const bounds = polygonBounds(draftPoints);
    const dx = serialCopy.direction === "right" ? bounds.width + serialCopy.gap : serialCopy.direction === "left" ? -(bounds.width + serialCopy.gap) : 0;
    const dy = serialCopy.direction === "down" ? bounds.height + serialCopy.gap : serialCopy.direction === "up" ? -(bounds.height + serialCopy.gap) : 0;
    setIsSaving(true);
    try {
      for (let i = 0; i < serialCopy.count; i++) {
        const payload = {
          ...shapeDraft,
          label: nextLabel(serialCopy.startLabel, i),
          unitId: null,
          polygon: offsetPoints(draftPoints, dx * (i + 1), dy * (i + 1)),
        };
        const resp = await fetch(`/api/planning/siteplan/${selectedSiteplan.id}/shapes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error((await resp.json().catch(() => null))?.error ?? "Gagal membuat salinan");
      }
      await refetchShapes();
      toast({ title: `${serialCopy.count} salinan dibuat (${serialCopy.startLabel} – ${nextLabel(serialCopy.startLabel, serialCopy.count - 1)})` });
      setSerialCopy(prev => ({ ...prev, startLabel: nextLabel(serialCopy.startLabel, serialCopy.count) }));
    } catch {
      toast({ title: "Gagal membuat salinan serial", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteShape(id: number) {
    const resp = await fetch(`/api/planning/siteplan/shapes/${id}`, { method: "DELETE" });
    if (!resp.ok) {
      toast({ title: "Gagal hapus shape", variant: "destructive" });
      return;
    }
    if (editingShapeId === id) resetDraft();
    setSelectedShapeIds(prev => prev.filter(shapeId => shapeId !== id));
    await refetchShapes();
  }

  async function deleteSelectedShapes() {
    if (selectedShapeIds.length === 0) return;
    const count = selectedShapeIds.length;
    const results = await Promise.all(selectedShapeIds.map(id => fetch(`/api/planning/siteplan/shapes/${id}`, { method: "DELETE" })));
    const failed = results.some(resp => !resp.ok);
    if (failed) {
      toast({ title: "Sebagian shape gagal dihapus", variant: "destructive" });
    } else {
      toast({ title: `${count} shape dihapus` });
    }
    setSelectedShapeIds([]);
    resetDraft();
    await refetchShapes();
  }

  async function saveSiteplanTransform(next = siteplanTransform, silent = false) {
    if (!selectedSiteplan?.id) return;
    const resp = await fetch(`/api/planning/siteplan/${selectedSiteplan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageTransform: next }),
    });
    if (!resp.ok) {
      toast({ title: "Gagal simpan kalibrasi siteplan", variant: "destructive" });
      return;
    }
    await refetchSiteplans();
    if (!silent) toast({ title: "Kalibrasi siteplan tersimpan" });
  }

  async function syncAllUnits() {
    try {
      const r = await fetch("/api/planning/siteplan/sync-all-units", { method: "POST" });
      const d = await r.json();
      await refetchShapes();
      toast({ title: `Sync selesai: ${d.synced} unit shape disinkron ke database` });
    } catch {
      toast({ title: "Gagal sync unit", variant: "destructive" });
    }
  }

  const projectList = Array.isArray(projects) ? projects : [];
  const prospectList = Array.isArray(prospects) ? prospects : [];
  const shapeList = Array.isArray(siteplanShapes) ? siteplanShapes as any[] : [];
  const bidangShapes = shapeList.filter(shape => shape.shapeType === "bidang");
  const unitShapes = shapeList.filter(shape => shape.shapeType === "unit");
  const totalBidangArea = bidangShapes.reduce((sum, shape) => sum + Number(shape.landArea ?? 0), 0);
  const totalPlannedUnits = bidangShapes.reduce((sum, shape) => sum + Number(shape.plannedUnits ?? 0), 0);
  const remainingLandArea = Math.max(0, Number(form.landArea || 0) - totalBidangArea);
  const density = totalBidangArea > 0 ? (totalPlannedUnits / totalBidangArea) * 1000 : 0;
  const hasMainPolygon = Array.isArray(selectedSiteplan?.mainPolygon) && selectedSiteplan.mainPolygon.length >= 3;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.getAttribute("role") === "combobox";
      if (isTyping) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoDraft();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyDraft();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteDraft();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteCurrentShape();
      } else if (e.key === "Escape") {
        resetDraft();
        setDrawTool("select");
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setCanvasZoom(z => Math.min(10, z * 1.2));
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        setCanvasZoom(z => Math.max(0.25, z / 1.2));
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        setCanvasZoom(1);
        setCanvasPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Auto-save when polygon is closed (polygon tool)
  useEffect(() => {
    if (!polygonClosed || editingShapeId || draftPoints.length < 3) return;
    if (isUnitRectangleDraft(shapeDraft.shapeType, draftPoints)) return; // handled by draw-box
    const autoLabel = shapeDraft.label.trim() || nextUnitLabel();
    autoSaveNewShape(draftPoints, autoLabel).then(saved => {
      if (saved) {
        setDraftPoints([]);
        setPolygonClosed(false);
        justLoadedEditingRef.current = saved.id;
        setEditingShapeId(saved.id);
        setShapeDraft({
          shapeType: saved.shapeType ?? shapeDraft.shapeType,
          label: saved.label ?? autoLabel,
          ownerName: saved.ownerName ?? "",
          landArea: Number(saved.landArea ?? 0),
          price: Number(saved.price ?? 0),
          legalStatus: saved.legalStatus ?? "",
          purchaseStatus: saved.purchaseStatus ?? "belum_dibeli",
          plannedUnits: Number(saved.plannedUnits ?? 1),
          blockCode: saved.blockCode ?? "",
          unitType: saved.unitType ?? "",
          subkonName: saved.subkonName ?? "",
          unitStatus: saved.unitStatus ?? "belum_dibuka",
          unitId: saved.unitId ? String(saved.unitId) : "",
          progress: Number(saved.progress ?? 0),
          notes: saved.notes ?? "",
          isLocked: saved.isLocked ?? false,
        });
        const shapePoints = Array.isArray(saved.polygon) ? saved.polygon : draftPoints;
        setDraftPoints(shapePoints);
        setPolygonClosed(true);
        setDrawTool("select");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygonClosed]);

  // Debounced auto-patch when editing existing shape metadata
  useEffect(() => {
    if (!editingShapeId) return;
    // Skip the first fire after loading a shape (shapeDraft was just populated from startEditShape)
    if (justLoadedEditingRef.current === editingShapeId) {
      justLoadedEditingRef.current = null;
      return;
    }
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      autoPatchShape(editingShapeId, {
        ...shapeDraft,
        unitId: shapeDraft.unitId ? Number(shapeDraft.unitId) : null,
        isLocked: shapeDraft.isLocked ? 1 : 0,
      });
    }, 700);
    return () => {
      if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeDraft]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Analisis Lahan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kavling split 18/12/70, luas efektif, dan estimasi unit</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(!showImport)} className="gap-1.5">
            <Download className="size-3.5" />Import dari Akuisisi
          </Button>
          <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
        </div>
      </div>

      {/* Import from Akuisisi */}
      {showImport && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="size-3.5 text-primary" />
              Import Data dari Akuisisi Lahan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {prospectList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada data prospek di menu Akuisisi Lahan.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">Pilih prospek untuk mengisi otomatis data lahan (luas, harga, akses jalan, status legal, bentuk, kontur):</p>
                {prospectList.slice(0, 10).map((p: Record<string, unknown>) => (
                  <div key={p.id as number} className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:border-primary/50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.lokasi as string || `Prospek #${p.id}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.kelurahan, p.kecamatan, p.kabupaten].filter(Boolean).join(", ")}
                        {p.luas ? ` · ${Number(p.luas ?? 0).toLocaleString("id-ID")} m²` : ""}
                        {p.hargaM2 ? ` · Rp ${Number(p.hargaM2 ?? 0).toLocaleString("id-ID")}/m²` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{p.status as string}</Badge>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => importFromProspect(p.id as number)}>
                        Import
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {urlProjectId && autoImported && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <MapPin className="size-3.5 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Proyek:</span>
          <span className="text-xs font-semibold text-primary">
            {(projectList.find((p: Record<string, unknown>) => p.id === urlProjectId) as Record<string, string> | undefined)?.nama ?? `Proyek #${urlProjectId}`}
          </span>
          {urlProspectId && <span className="text-[10px] text-emerald-600 ml-auto">Data lahan diimpor dari Akuisisi</span>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select value={form.projectId ? String(form.projectId) : ""} onValueChange={v => selectProject(parseInt(v))}>
          <SelectTrigger className="h-8 w-64">
            <SelectValue placeholder="Pilih proyek..." />
          </SelectTrigger>
          <SelectContent>
            {projectList.map((p: Record<string, unknown>) => (
              <SelectItem key={p.id as number} value={String(p.id)}>{p.nama as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Data Lahan</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Total Luas Lahan (m²)</Label>
              <NumericInput className="h-8 text-sm" decimals={1} value={form.landArea} onChange={v => setF("landArea", v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Harga Lahan (Rp)</Label>
              <CurrencyInput className="h-8 text-sm" value={form.landPriceTotal} onChange={raw => setF("landPriceTotal", raw ? Number(raw) : 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lebar Jalan Utama (m)</Label>
              <NumericInput className="h-8 text-sm" decimals={1} value={form.roadWidth} onChange={v => setF("roadWidth", v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Luas Kavling/Unit (m²)</Label>
              <NumericInput className="h-8 text-sm" decimals={1} value={form.kavlingArea} onChange={v => setF("kavlingArea", v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bentuk Lahan</Label>
              <Select value={form.landShape} onValueChange={v => setF("landShape", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["Reguler", "Tidak Reguler", "L-Shape", "T-Shape"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kontur</Label>
              <Select value={form.contour} onValueChange={v => setF("contour", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["Datar", "Bergelombang", "Miring", "Curam"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status Legal</Label>
              <Select value={form.legalStatus} onValueChange={v => setF("legalStatus", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["SHM", "HGB", "Girik", "AJB", "SHSRS", "Lainnya"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Catatan</Label>
              <Textarea className="text-sm resize-none" rows={2} value={form.notes} onChange={e => setF("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Hasil Perhitungan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Area Jalan (18%)", val: `${(roadArea ?? 0).toLocaleString("id-ID")} m²`, color: "text-amber-500" },
                  { label: "Fasum/RTH (12%)", val: `${(fasumArea ?? 0).toLocaleString("id-ID")} m²`, color: "text-blue-500" },
                  { label: "Area Efektif (70%)", val: `${(effectiveArea ?? 0).toLocaleString("id-ID")} m²`, color: "text-emerald-500" },
                  { label: "Harga/m²", val: fmtCurrency(landPricePerM2), color: "text-foreground" },
                ].map(item => (
                  <div key={item.label} className="p-2 rounded-md bg-muted/30 space-y-0.5">
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    <div className={`font-semibold text-sm ${item.color}`}>{item.val}</div>
                  </div>
                ))}
              </div>

              {form.kavlingArea > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Estimasi Maksimum Unit</span>
                    <Badge className="text-base px-3">{(maxUnits ?? 0).toLocaleString("id-ID")} unit</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Porsi lahan per unit</span>
                    <span className="font-medium">{fmtCurrency(landPricePerUnit)}/unit</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Efisiensi lahan</span>
                    <span className="font-medium">70% (standar Satara)</span>
                  </div>
                </div>
              )}

              {form.landArea > 0 && form.landPriceTotal > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium mb-2">Auto-fill ke Feasibility Engine</div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div>• Total Unit: <span className="font-medium text-foreground">{maxUnits} unit</span></div>
                    <div>• Biaya Lahan: <span className="font-medium text-foreground">{fmtCurrency(form.landPriceTotal)}</span></div>
                    <div>• HPP Lahan/Unit: <span className="font-medium text-foreground">{fmtCurrency(landPricePerUnit)}</span></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {form.landArea > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribusi Lahan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <XAxis type="number" fontSize={10} tickFormatter={v => `${(v ?? 0).toLocaleString("id-ID")}`} />
                    <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                    <Tooltip formatter={(v: number) => [`${(v ?? 0).toLocaleString("id-ID")} m²`, "Luas"]} />
                    <Bar dataKey="area" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Siteplan & Pembagian Blok/Unit</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {selectedSiteplan?.id && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Total Bidang", value: `${(totalBidangArea ?? 0).toLocaleString("id-ID")} m²` },
                { label: "Sisa Lahan", value: `${(remainingLandArea ?? 0).toLocaleString("id-ID")} m²` },
                { label: "Rencana Unit", value: `${(totalPlannedUnits ?? 0).toLocaleString("id-ID")} unit` },
                { label: "Kepadatan", value: `${density.toFixed(1)} unit/1.000 m²` },
              ].map(item => (
                <div key={item.label} className="rounded-md border bg-muted/20 p-2">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {(selectedSiteplan?.hasImage || siteplanImageUrl) && (
            <div className="grid md:grid-cols-5 gap-2 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Opacity Gambar</Label>
                <Input type="range" min={0.25} max={1} step={0.05} value={siteplanTransform.opacity} onChange={e => setSiteplanTransform(p => ({ ...p, opacity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Zoom</Label>
                <Input type="range" min={0.75} max={1.8} step={0.05} value={siteplanTransform.scale} onChange={e => setSiteplanTransform(p => ({ ...p, scale: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Geser X</Label>
                <Input type="range" min={-20} max={20} step={0.5} value={siteplanTransform.x} onChange={e => setSiteplanTransform(p => ({ ...p, x: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Geser Y</Label>
                <Input type="range" min={-20} max={20} step={0.5} value={siteplanTransform.y} onChange={e => setSiteplanTransform(p => ({ ...p, y: Number(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" size="sm" variant={siteplanTransform.locked ? "default" : "outline"} className="h-8 flex-1" onClick={() => setSiteplanTransform(p => ({ ...p, locked: !p.locked }))}>
                  {siteplanTransform.locked ? "Background Locked" : "Background Free"}
                </Button>
              </div>
            </div>
          )}

          {selectedSiteplan?.id && (selectedSiteplan?.hasImage || siteplanImageUrl || hasMainPolygon) ? (
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <div className="relative rounded-xl border bg-slate-100 p-12 overflow-hidden">
                <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,.18)_1px,transparent_0)] bg-[size:24px_24px]" />
                <div
                  ref={imageRef}
                  onClick={addPoint}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopCanvasDrag}
                  onPointerCancel={stopCanvasDrag}
                  onPointerLeave={stopCanvasDrag}
                  onWheel={handleCanvasWheel}
                  className={cn("relative overflow-hidden rounded-lg border bg-background shadow-sm touch-none", drawTool === "unit_box" || drawTool === "polygon" ? "cursor-crosshair" : drawTool === "pan" ? "cursor-grab" : drawTool === "delete" ? "cursor-not-allowed" : "cursor-default")}
                >
                {/* Zoom/pan content wrapper — position:relative so SVG absolute inset-0 anchors here; height driven by img */}
                <div style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`, transformOrigin: "0 0", position: "relative", width: "100%" }}>
                {siteplanImageUrl ? (
                  <img
                    src={siteplanImageUrl}
                    alt="Siteplan"
                    className="w-full select-none pointer-events-none origin-center block"
                    style={{
                      opacity: siteplanTransform.opacity,
                      transform: `translate(${siteplanTransform.x}%, ${siteplanTransform.y}%) scale(${siteplanTransform.scale})`,
                    }}
                  />
                ) : selectedSiteplan?.hasImage ? (
                  <div className="h-[520px] flex items-center justify-center text-xs text-muted-foreground bg-muted/30">Memuat gambar siteplan...</div>
                ) : (
                  <div className="h-[520px] bg-[linear-gradient(to_right,rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
                )}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* handle scale factor — keeps handles same visual size at all zoom levels */}
                  {(() => { const hs = 1 / canvasZoom; const sw = 1 / canvasZoom; return (
                  <>
                  {hasMainPolygon && <polygon points={polygonPoints(selectedSiteplan.mainPolygon)} fill="rgba(15,23,42,.06)" stroke="#0f172a" strokeWidth={0.45 * sw} strokeDasharray={`${1.4 * sw} ${sw}`} />}
                  {shapeList.map(shape => {
                    if (shape.id === editingShapeId) return null;
                    const isSelected = selectedShapeIds.includes(shape.id);
                    const isLocked = !!shape.isLocked;
                    const color = shapeColor(shape, shape.id === editingShapeId || isSelected);
                    const poly = Array.isArray(shape.polygon) ? shape.polygon as CanvasPoint[] : [];
                    const center = poly.length >= 3 ? polygonCenter(poly) : null;
                    return (
                      <g key={shape.id}>
                        <polygon
                          points={polygonPoints(shape.polygon)}
                          fill={isLocked ? color.fill.replace(/,[^,)]+\)$/, ",0.35)") : color.fill}
                          stroke={isLocked ? "#d97706" : color.stroke}
                          strokeWidth={isSelected ? 0.55 * sw : 0.3 * sw}
                          strokeDasharray={isLocked ? `${1.8 * sw} ${0.8 * sw}` : isSelected ? `${1.1 * sw} ${0.7 * sw}` : undefined}
                          onPointerDown={(e) => startShapeDrag(e, shape)}
                          className={drawTool === "select" ? (isLocked ? "cursor-not-allowed" : "cursor-move") : drawTool === "delete" ? "cursor-not-allowed" : ""}
                        />
                        {isLocked && center && (
                          <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="middle" fontSize={1.8 * hs} fill="#d97706" style={{ pointerEvents: "none", userSelect: "none" }}>⚿</text>
                        )}
                      </g>
                    );
                  })}
                  {selectionBox && (() => {
                    const bounds = normalizedBounds(selectionBox.start, selectionBox.current);
                    return (
                      <rect
                        x={bounds.minX} y={bounds.minY}
                        width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY}
                        fill="rgba(59,130,246,.12)" stroke="#2563eb"
                        strokeWidth={0.25 * sw} strokeDasharray={`${0.8 * sw} ${0.5 * sw}`}
                      />
                    );
                  })()}
                  {draftPoints.length > 0 && (polygonClosed || isUnitRectangleDraft(shapeDraft.shapeType, draftPoints) ? (
                    <polygon
                      points={polygonPoints(draftPoints)}
                      fill="rgba(245,158,11,.25)"
                      stroke="#f59e0b"
                      strokeWidth={0.45 * sw}
                      strokeDasharray={`${1.1 * sw} ${0.65 * sw}`}
                      className={drawTool === "select" ? (shapeDraft.isLocked ? "cursor-not-allowed" : "cursor-move") : ""}
                      onPointerDown={startDraftBodyDrag}
                    />
                  ) : (
                    <polyline points={draftPoints.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#f59e0b" strokeWidth={0.45 * sw} style={{ pointerEvents: "none" }} />
                  ))}
                  {isUnitRectangleDraft(shapeDraft.shapeType, draftPoints) && (() => {
                    const bounds = polygonBounds(draftPoints);
                    const center = polygonCenter(draftPoints);
                    const edgeHandles = [
                      { edge: "top" as const, x: center.x, y: bounds.minY },
                      { edge: "right" as const, x: bounds.maxX, y: center.y },
                      { edge: "bottom" as const, x: center.x, y: bounds.maxY },
                      { edge: "left" as const, x: bounds.minX, y: center.y },
                    ];
                    return (
                      <g>
                        <line x1={center.x} y1={bounds.minY} x2={center.x} y2={Math.max(0, bounds.minY - 4 * hs)} stroke="#6366f1" strokeWidth={0.25 * sw} />
                        <circle cx={center.x} cy={Math.max(0, bounds.minY - 5 * hs)} r={hs} fill="#fff" stroke="#6366f1" strokeWidth={0.35 * sw} className="cursor-grab" onPointerDown={startDraftRotate} />
                        {draftPoints.map((point, index) => (
                          <rect
                            key={`corner-${index}`}
                            x={point.x - 0.65 * hs} y={point.y - 0.65 * hs}
                            width={1.3 * hs} height={1.3 * hs} rx={0.18 * hs}
                            fill="#fff" stroke="#f59e0b" strokeWidth={0.3 * sw}
                            className="cursor-nwse-resize"
                            onPointerDown={(e) => startDraftCornerDrag(e, index)}
                          />
                        ))}
                        {edgeHandles.map(handle => (
                          <rect
                            key={handle.edge}
                            x={handle.x - 0.55 * hs} y={handle.y - 0.55 * hs}
                            width={1.1 * hs} height={1.1 * hs} rx={0.18 * hs}
                            fill="#fff" stroke="#2563eb" strokeWidth={0.28 * sw}
                            className={handle.edge === "top" || handle.edge === "bottom" ? "cursor-ns-resize" : "cursor-ew-resize"}
                            onPointerDown={(e) => startDraftEdgeDrag(e, handle.edge)}
                          />
                        ))}
                      </g>
                    );
                  })()}
                  {!isUnitRectangleDraft(shapeDraft.shapeType, draftPoints) && draftPoints.map((p, i) => (
                    <circle
                      key={i} cx={p.x} cy={p.y}
                      r={i === 0 && !polygonClosed && draftPoints.length >= 3 ? 1.2 * hs : 0.9 * hs}
                      fill={i === 0 && !polygonClosed && draftPoints.length >= 3 ? "#0f172a" : "#fff"}
                      stroke="#f59e0b" strokeWidth={0.35 * sw}
                      className="cursor-move"
                      onPointerDown={(e) => startDraftCornerDrag(e, i)}
                      onDoubleClick={(e) => { e.stopPropagation(); setDraftPoints(points => points.filter((_, idx) => idx !== i)); setPolygonClosed(false); }}
                      onClick={(e) => { e.stopPropagation(); if (i === 0 && draftPoints.length >= 3 && !polygonClosed) setPolygonClosed(true); }}
                    />
                  ))}
                  </>); })()}
                </svg>
                {shapeList.map(shape => {
                  if (shape.id === editingShapeId) return null;
                  const center = polygonCenter(Array.isArray(shape.polygon) ? shape.polygon : []);
                  return (
                    <div
                      key={`label-${shape.id}`}
                      className="absolute text-[9px] font-bold px-1 py-0.5 rounded select-none"
                      style={{
                        left: `${center.x}%`,
                        top: `${center.y}%`,
                        transform: "translate(-50%, -50%)",
                        background: "rgba(0,0,0,0.58)",
                        color: "#fff",
                        pointerEvents: "none",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        fontSize: `${9 / canvasZoom}px`,
                      }}
                    >
                      {shape.label}
                    </div>
                  );
                })}
                </div>
                {/* Zoom controls — outside zoom wrapper so they stay fixed size */}
                <div
                  className="absolute bottom-2 right-2 z-20 flex items-center gap-0.5 rounded-lg border bg-background/90 shadow-sm px-1.5 py-1 select-none"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                    onClick={() => { setCanvasZoom(z => Math.max(0.25, z / 1.2)); }}
                    title="Perkecil (Ctrl -)"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono text-[10px] text-muted-foreground">{Math.round(canvasZoom * 100)}%</span>
                  <button
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                    onClick={() => { setCanvasZoom(z => Math.min(10, z * 1.2)); }}
                    title="Perbesar (Ctrl +)"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                  <div className="w-px h-3 bg-border mx-0.5" />
                  <button
                    className="px-1 py-0.5 rounded hover:bg-muted transition-colors text-[9px] font-mono text-muted-foreground"
                    onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); }}
                    title="Reset zoom (Ctrl 0)"
                  >
                    1:1
                  </button>
                </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <Label className="text-xs font-semibold">Siteplan</Label>
                  <label className={cn("inline-flex w-full items-center justify-center gap-1.5 h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted bg-background", isUploadingSiteplan && "opacity-60 pointer-events-none")}>
                    <Upload className="size-3.5" /> {isUploadingSiteplan ? "Mengupload..." : "Upload Siteplan"}
                    <input type="file" accept="image/*" className="hidden" disabled={isUploadingSiteplan} onChange={e => { const f = e.target.files?.[0]; if (f) uploadSiteplan(f); e.currentTarget.value = ""; }} />
                  </label>
                  {siteplans.length > 0 && (
                    <Select value={String(selectedSiteplan?.id ?? "")} onValueChange={v => setActiveSiteplanId(Number(v))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{(siteplans as any[]).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {hasMainPolygon && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 text-red-600 border-red-200/60 hover:bg-red-50 hover:text-red-700"
                      onClick={async () => {
                        if (!confirm("Apakah Anda yakin ingin menghapus gambar boundary hasil akuisisi lahan ini?")) return;
                        try {
                          const resp = await fetch(`/api/planning/siteplan/${selectedSiteplan.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ mainPolygon: [] }),
                          });
                          if (!resp.ok) throw new Error();
                          await qc.invalidateQueries({ queryKey: ["planning-siteplan", form.projectId] });
                          await refetchSiteplans();
                          toast({ title: "Boundary Akuisisi berhasil dihapus" });
                        } catch {
                          toast({ title: "Gagal menghapus Boundary Akuisisi", variant: "destructive" });
                        }
                      }}
                    >
                      <Trash2 className="size-3" /> Hapus Boundary Akuisisi
                    </Button>
                  )}
                  <Button
                    type="button" variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/planning/siteplan/sync-all-landbank", { method: "POST" });
                        const d = await r.json();
                        toast({ title: `Sync selesai: ${d.synced} bidang disinkron ke Land Bank` });
                      } catch {
                        toast({ title: "Gagal sync Land Bank", variant: "destructive" });
                      }
                    }}
                  >
                    <RefreshCw className="size-3" /> Sync ke Land Bank
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
                    onClick={syncAllUnits}
                  >
                    <RefreshCw className="size-3" /> Sync ke Unit
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Data lahan dan kalibrasi siteplan ikut tersimpan lewat tombol Simpan di header.</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Tools Siteplan</Label>
                    <span className="text-[10px] text-muted-foreground">{drawTool === "unit_box" ? "Rectangle" : drawTool === "polygon" ? "Polygon" : drawTool === "pan" ? "Geser" : drawTool === "delete" ? "Hapus" : "Select"}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <Button type="button" variant={drawTool === "select" ? "default" : "outline"} size="sm" className="h-12 flex-col gap-1 text-[10px]" onClick={() => activateTool("select")}>
                      <MousePointer2 className="size-4" /> Kursor
                    </Button>
                    <Button type="button" variant={drawTool === "pan" ? "default" : "outline"} size="sm" className="h-12 flex-col gap-1 text-[10px]" onClick={() => activateTool("pan")}>
                      <Hand className="size-4" /> Geser
                    </Button>
                    <Button type="button" variant={drawTool === "unit_box" ? "default" : "outline"} size="sm" className="h-12 flex-col gap-1 text-[10px]" onClick={() => activateTool("unit_box")}>
                      <Square className="size-4" /> Kotak
                    </Button>
                    <Button type="button" variant={drawTool === "polygon" ? "default" : "outline"} size="sm" className="h-12 flex-col gap-1 text-[10px]" onClick={() => activateTool("polygon", "bidang")}>
                      <Move className="size-4" /> Polygon
                    </Button>
                    <Button type="button" variant={drawTool === "delete" ? "destructive" : "outline"} size="sm" className="h-12 flex-col gap-1 text-[10px]" onClick={() => activateTool("delete")}>
                      <Trash2 className="size-4" /> Hapus
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={copyDraft} disabled={draftPoints.length < 3 && selectedShapeIds.length === 0} title="Salin (juga mendukung multi-select)">
                      <Copy className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={pasteDraft} disabled={!copiedDraft && copiedShapes.length === 0} title="Tempel">
                      <Redo2 className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={undoDraft} disabled={draftHistory.length === 0} title="Undo">
                      <Undo2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={shapeDraft.isLocked ? "default" : "outline"}
                      size="sm"
                      className={cn("h-9 px-2", shapeDraft.isLocked ? "bg-amber-600 hover:bg-amber-700 border-amber-600" : "")}
                      onClick={() => setShapeDraft(p => ({ ...p, isLocked: !p.isLocked }))}
                      disabled={!editingShapeId}
                      title={shapeDraft.isLocked ? "Kunci aktif — klik untuk buka kunci" : "Kunci shape"}
                    >
                      {shapeDraft.isLocked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2 text-red-600" onClick={deleteCurrentShape} disabled={!editingShapeId && draftPoints.length === 0 && selectedShapeIds.length === 0} title="Hapus">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">Shift/Cmd-drag untuk pilih banyak shape, lalu salin atau hapus sekaligus.</p>
                  {selectedShapeIds.length > 0 && (
                    <div className="rounded-md border bg-background p-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{selectedShapeIds.length} shape dipilih</span>
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={copyDraft}><Copy className="size-3" />Salin</Button>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedShapeIds([])}>Batal</Button>
                        <Button type="button" variant="destructive" size="sm" className="h-7 text-xs" onClick={deleteSelectedShapes}>Hapus</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Tipe Shape</Label><Select value={shapeDraft.shapeType} onValueChange={v => setShapeDraft(p => ({ ...p, shapeType: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unit">Unit Rumah</SelectItem><SelectItem value="bidang">Bidang Lahan</SelectItem><SelectItem value="blok">Blok/Cluster</SelectItem><SelectItem value="fasum">Jalan/Fasum</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label className="text-xs">Label</Label><Input className="h-8 text-sm" value={shapeDraft.label} onChange={e => setShapeDraft(p => ({ ...p, label: e.target.value }))} placeholder="A-01 / Bidang 1" /></div>
                  {shapeDraft.shapeType !== "unit" && (
                    <>
                      <div className="space-y-1"><Label className="text-xs">Pemilik</Label><Input className="h-8 text-sm" value={shapeDraft.ownerName} onChange={e => setShapeDraft(p => ({ ...p, ownerName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Status Beli</Label><Select value={shapeDraft.purchaseStatus} onValueChange={v => setShapeDraft(p => ({ ...p, purchaseStatus: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{["belum_dibeli", "proses_nego", "dp", "lunas", "sudah_dibeli", "milik_sendiri"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-xs">Luas</Label><NumericInput className="h-8 text-sm" value={shapeDraft.landArea} onChange={v => setShapeDraft(p => ({ ...p, landArea: v }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Rencana Unit</Label><NumericInput className="h-8 text-sm" value={shapeDraft.plannedUnits} onChange={v => setShapeDraft(p => ({ ...p, plannedUnits: Math.round(v) }))} /></div>
                    </>
                  )}
                  {shapeDraft.shapeType === "unit" && (
                    <>
                      <div className="space-y-1"><Label className="text-xs">Lebar Kotak (%)</Label><NumericInput className="h-8 text-sm" decimals={1} value={boxDraft.width} onChange={v => updateBoxDraft({ width: Math.max(0.5, v) })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Tinggi Kotak (%)</Label><NumericInput className="h-8 text-sm" decimals={1} value={boxDraft.height} onChange={v => updateBoxDraft({ height: Math.max(0.5, v) })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Rotasi</Label><NumericInput className="h-8 text-sm" decimals={0} value={boxDraft.rotation} onChange={v => updateBoxDraft({ rotation: v })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Jumlah Copy</Label><NumericInput className="h-8 text-sm" decimals={0} value={boxDraft.count} onChange={v => updateBoxDraft({ count: Math.max(1, Math.round(v)) })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Jarak Copy (%)</Label><NumericInput className="h-8 text-sm" decimals={1} value={boxDraft.gap} onChange={v => updateBoxDraft({ gap: Math.max(0, v) })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Arah Copy</Label><Select value={boxDraft.direction} onValueChange={v => updateBoxDraft({ direction: v as BoxDraft["direction"] })}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="right">Kanan</SelectItem><SelectItem value="left">Kiri</SelectItem><SelectItem value="down">Bawah</SelectItem><SelectItem value="up">Atas</SelectItem></SelectContent></Select></div>
                    </>
                  )}
                  <div className="space-y-1"><Label className="text-xs">Tipe Rumah</Label><Input className="h-8 text-sm" value={shapeDraft.unitType} onChange={e => setShapeDraft(p => ({ ...p, unitType: e.target.value }))} /></div>
                          <div className="space-y-1"><Label className="text-xs">Status Unit</Label><Select value={shapeDraft.unitStatus} onValueChange={v => setShapeDraft(p => ({ ...p, unitStatus: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{["belum_dibuka", "akan_dibangun", "sedang_dibangun", "selesai", "terjual_akad", "bermasalah_rework"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-1 col-span-2"><Label className="text-xs">Link Unit Produksi</Label><Select value={shapeDraft.unitId || "none"} onValueChange={v => {
                            const unit = (units as any[]).find(u => String(u.id) === v);
                            setShapeDraft(p => ({ ...p, unitId: v === "none" ? "" : v, label: unit ? `${unit.blok}-${unit.nomor}` : p.label, unitType: unit?.tipe ?? p.unitType, subkonName: unit?.subkonName ?? p.subkonName, progress: unit?.progress ?? p.progress }));
                          }}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Belum link</SelectItem>{(units as any[]).map(u => <SelectItem key={u.id} value={String(u.id)}>{u.blok}-{u.nomor} · {u.tipe}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        {editingShapeId && (
                          <div className="grid grid-cols-4 gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveDraft(0, -1)}>Atas</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveDraft(-1, 0)}>Kiri</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveDraft(1, 0)}>Kanan</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveDraft(0, 1)}>Bawah</Button>
                          </div>
                )}
                        {/* Auto-save indicator */}
                        <div className="flex items-center justify-between gap-2">
                          {isSaving ? (
                            <span className="text-[10px] text-amber-500 animate-pulse">Menyimpan...</span>
                          ) : editingShapeId ? (
                            <span className="text-[10px] text-emerald-600">Tersimpan otomatis</span>
                          ) : drawTool === "polygon" && draftPoints.length >= 3 && !polygonClosed ? (
                            <Button size="sm" variant="outline" onClick={closePolygon} className="h-7 text-xs flex-1">Tutup Polygon (auto-simpan)</Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Gambar kotak atau polygon untuk mulai</span>
                          )}
                          {/* Batch copy button — only shown when editing a box shape with count > 1 */}
                          {editingShapeId && isUnitRectangleDraft(shapeDraft.shapeType, draftPoints) && boxDraft.count > 1 && (
                            <Button size="sm" variant="outline" onClick={batchCopyShapes} disabled={isSaving} className="h-7 text-xs shrink-0">
                              Buat {boxDraft.count} Salinan
                            </Button>
                          )}
                        </div>
                        {/* Serial Copy — shown when a shape is being edited */}
                        {editingShapeId && draftPoints.length >= 3 && (
                          <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                            <Label className="text-xs font-semibold">Salin Serial</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Label Mulai</Label>
                                <Input
                                  className="h-7 text-xs font-mono"
                                  value={serialCopy.startLabel}
                                  onChange={e => setSerialCopy(p => ({ ...p, startLabel: e.target.value }))}
                                  placeholder="A-04"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Jumlah Salinan</Label>
                                <NumericInput
                                  className="h-7 text-xs"
                                  decimals={0}
                                  value={serialCopy.count}
                                  onChange={v => setSerialCopy(p => ({ ...p, count: Math.max(1, Math.round(v)) }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Arah</Label>
                                <Select value={serialCopy.direction} onValueChange={v => setSerialCopy(p => ({ ...p, direction: v as BoxDraft["direction"] }))}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="right">Kanan</SelectItem>
                                    <SelectItem value="left">Kiri</SelectItem>
                                    <SelectItem value="down">Bawah</SelectItem>
                                    <SelectItem value="up">Atas</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Jarak (%)</Label>
                                <NumericInput
                                  className="h-7 text-xs"
                                  decimals={1}
                                  value={serialCopy.gap}
                                  onChange={v => setSerialCopy(p => ({ ...p, gap: Math.max(0, v) }))}
                                />
                              </div>
                            </div>
                            {serialCopy.startLabel && (
                              <p className="text-[9px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-1">
                                {Array.from({ length: Math.min(serialCopy.count, 6) }, (_, i) => nextLabel(serialCopy.startLabel, i)).join(" · ")}
                                {serialCopy.count > 6 ? ` · ... (+${serialCopy.count - 6})` : ""}
                              </p>
                            )}
                            <Button
                              size="sm"
                              className="w-full h-7 text-xs"
                              onClick={batchSerialCopy}
                              disabled={isSaving || !serialCopy.startLabel || serialCopy.count < 1}
                            >
                              Buat {serialCopy.count} Salinan Serial
                            </Button>
                          </div>
                        )}
                <div className="rounded-md border divide-y max-h-56 overflow-auto">
                  {shapeList.length === 0 ? <p className="p-3 text-xs text-muted-foreground">Belum ada shape.</p> : shapeList.map(shape => (
                    <div key={shape.id} className="flex items-center justify-between gap-2 p-2">
                              <button className="text-left" onClick={() => startEditShape(shape)}><p className="text-xs font-medium">{shape.label}</p><p className="text-[10px] text-muted-foreground">{shape.shapeType} · {shape.purchaseStatus ?? shape.unitStatus}{shape.unitId ? " · linked" : " · belum link"}</p></button>
                              <button className="text-red-500" onClick={() => deleteShape(shape.id)}><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-3">
              <p>Upload gambar siteplan untuk mulai menggambar ulang bidang, blok, dan unit rumah.</p>
              <label className={cn("inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted bg-background text-foreground", isUploadingSiteplan && "opacity-60 pointer-events-none")}>
                <Upload className="size-3.5" /> {isUploadingSiteplan ? "Mengupload..." : "Upload Siteplan"}
                <input type="file" accept="image/*" className="hidden" disabled={isUploadingSiteplan} onChange={e => { const f = e.target.files?.[0]; if (f) uploadSiteplan(f); e.currentTarget.value = ""; }} />
              </label>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
