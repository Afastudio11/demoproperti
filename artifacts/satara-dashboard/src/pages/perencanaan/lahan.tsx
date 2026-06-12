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
import { Save, Download, MapPin, Plus, Trash2, Upload } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function num(v: string) { return parseFloat(v) || 0; }

type CanvasPoint = { x: number; y: number };
type SiteplanTransform = { opacity: number; scale: number; x: number; y: number; locked: boolean };

const defaultTransform: SiteplanTransform = { opacity: 0.86, scale: 1, x: 0, y: 0, locked: true };

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
  const [shapeDraft, setShapeDraft] = useState({ shapeType: "unit", label: "", ownerName: "", landArea: 0, price: 0, legalStatus: "", purchaseStatus: "belum_dibeli", plannedUnits: 1, blockCode: "", unitType: "", subkonName: "", unitStatus: "belum_dibuka", unitId: "", progress: 0, notes: "" });
  const [draftPoints, setDraftPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [editingShapeId, setEditingShapeId] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

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
    queryFn: () => fetch(`/api/planning/siteplan?projectId=${form.projectId}`).then(r => r.json()),
    enabled: !!form.projectId,
  });
  const selectedSiteplan = (siteplans as any[]).find(s => s.id === activeSiteplanId) ?? (siteplans as any[])[0] ?? null;
  const { data: siteplanShapes = [], refetch: refetchShapes } = useQuery({
    queryKey: ["planning-siteplan-shapes", selectedSiteplan?.id],
    queryFn: () => fetch(`/api/planning/siteplan/${selectedSiteplan.id}/shapes`).then(r => r.json()),
    enabled: !!selectedSiteplan?.id,
  });

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
    { name: "Jalan (18%)", area: roadArea, fill: "#f59e0b" },
    { name: "Fasum (12%)", area: fasumArea, fill: "#3b82f6" },
    { name: "Efektif (70%)", area: effectiveArea, fill: "#10b981" },
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

  function addPoint(e: React.MouseEvent<HTMLDivElement>) {
    if (!imageRef.current || !selectedSiteplan) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setDraftPoints(p => [...p, { x, y }]);
  }

  async function saveShape() {
    if (!selectedSiteplan || draftPoints.length < 3 || !shapeDraft.label) {
      toast({ title: "Isi label dan minimal 3 titik polygon", variant: "destructive" });
      return;
    }
    const payload = { ...shapeDraft, unitId: shapeDraft.unitId ? Number(shapeDraft.unitId) : null, polygon: draftPoints };
    await fetch(editingShapeId ? `/api/planning/siteplan/shapes/${editingShapeId}` : `/api/planning/siteplan/${selectedSiteplan.id}/shapes`, {
      method: editingShapeId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setDraftPoints([]);
    setEditingShapeId(null);
    setShapeDraft(p => ({ ...p, label: "", ownerName: "", blockCode: "", notes: "", unitId: "", progress: 0 }));
    await refetchShapes();
    toast({ title: editingShapeId ? "Shape siteplan diperbarui" : "Shape siteplan disimpan" });
  }

  function startEditShape(shape: any) {
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
    });
    setDraftPoints(Array.isArray(shape.polygon) ? shape.polygon : []);
  }

  function moveDraft(dx: number, dy: number) {
    setDraftPoints(points => points.map(p => ({
      x: Math.max(0, Math.min(100, Math.round((p.x + dx) * 10) / 10)),
      y: Math.max(0, Math.min(100, Math.round((p.y + dy) * 10) / 10)),
    })));
  }

  async function deleteShape(id: number) {
    await fetch(`/api/planning/siteplan/shapes/${id}`, { method: "DELETE" });
    await refetchShapes();
  }

  async function saveSiteplanTransform(next = siteplanTransform) {
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
    toast({ title: "Kalibrasi siteplan tersimpan" });
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
                        {p.luas ? ` · ${(p.luas as number).toLocaleString("id-ID")} m²` : ""}
                        {p.hargaM2 ? ` · Rp ${(p.hargaM2 as number).toLocaleString("id-ID")}/m²` : ""}
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
                  { label: "Area Jalan (18%)", val: `${roadArea.toLocaleString("id-ID")} m²`, color: "text-amber-500" },
                  { label: "Fasum/RTH (12%)", val: `${fasumArea.toLocaleString("id-ID")} m²`, color: "text-blue-500" },
                  { label: "Area Efektif (70%)", val: `${effectiveArea.toLocaleString("id-ID")} m²`, color: "text-emerald-500" },
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
                    <Badge className="text-base px-3">{maxUnits.toLocaleString("id-ID")} unit</Badge>
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
                    <XAxis type="number" fontSize={10} tickFormatter={v => `${v.toLocaleString("id-ID")}`} />
                    <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString("id-ID")} m²`, "Luas"]} />
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
          <div className="flex flex-wrap items-center gap-2">
            <label className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted", isUploadingSiteplan && "opacity-60 pointer-events-none")}>
              <Upload className="size-3.5" /> {isUploadingSiteplan ? "Mengupload..." : "Upload Siteplan"}
              <input type="file" accept="image/*" className="hidden" disabled={isUploadingSiteplan} onChange={e => { const f = e.target.files?.[0]; if (f) uploadSiteplan(f); e.currentTarget.value = ""; }} />
            </label>
            {siteplans.length > 0 && (
              <Select value={String(selectedSiteplan?.id ?? "")} onValueChange={v => setActiveSiteplanId(Number(v))}>
                <SelectTrigger className="h-8 w-64 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{(siteplans as any[]).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setDraftPoints([]); setEditingShapeId(null); }}>Reset Titik</Button>
            {selectedSiteplan?.id && <Button size="sm" variant="outline" className="h-8" onClick={() => saveSiteplanTransform()}>Simpan Kalibrasi</Button>}
          </div>

          {selectedSiteplan?.id && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Total Bidang", value: `${totalBidangArea.toLocaleString("id-ID")} m²` },
                { label: "Sisa Lahan", value: `${remainingLandArea.toLocaleString("id-ID")} m²` },
                { label: "Rencana Unit", value: `${totalPlannedUnits.toLocaleString("id-ID")} unit` },
                { label: "Kepadatan", value: `${density.toFixed(1)} unit/1.000 m²` },
              ].map(item => (
                <div key={item.label} className="rounded-md border bg-muted/20 p-2">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {selectedSiteplan?.imageDataUrl && (
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

          {selectedSiteplan?.id && (selectedSiteplan?.imageDataUrl || hasMainPolygon) ? (
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <div ref={imageRef} onClick={addPoint} className="relative overflow-hidden rounded-lg border bg-muted cursor-crosshair">
                {selectedSiteplan.imageDataUrl ? (
                  <img
                    src={selectedSiteplan.imageDataUrl}
                    alt="Siteplan"
                    className="w-full select-none pointer-events-none origin-center"
                    style={{
                      opacity: siteplanTransform.opacity,
                      transform: `translate(${siteplanTransform.x}%, ${siteplanTransform.y}%) scale(${siteplanTransform.scale})`,
                    }}
                  />
                ) : (
                  <div className="h-[520px] bg-[linear-gradient(to_right,rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
                )}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {hasMainPolygon && <polygon points={polygonPoints(selectedSiteplan.mainPolygon)} fill="rgba(15,23,42,.06)" stroke="#0f172a" strokeWidth="0.45" strokeDasharray="1.4 1" />}
	                  {shapeList.map(shape => (
	                    <polygon key={shape.id} points={polygonPoints(shape.polygon)} fill={shape.id === editingShapeId ? "rgba(245,158,11,.3)" : shape.shapeType === "unit" ? "rgba(59,130,246,.25)" : shape.shapeType === "bidang" ? "rgba(16,185,129,.22)" : "rgba(148,163,184,.2)"} stroke={shape.id === editingShapeId ? "#f59e0b" : shape.shapeType === "unit" ? "#2563eb" : shape.shapeType === "bidang" ? "#059669" : "#64748b"} strokeWidth="0.3" />
	                  ))}
                  {draftPoints.length > 0 && <polyline points={draftPoints.map(p => `${p.x},${p.y}`).join(" ")} fill="rgba(245,158,11,.25)" stroke="#f59e0b" strokeWidth="0.4" />}
                  {draftPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#f59e0b" onClick={(e) => { e.stopPropagation(); setDraftPoints(points => points.filter((_, idx) => idx !== i)); }} />)}
                </svg>
                {shapeList.map(shape => {
                  const first = shape.polygon?.[0];
                  if (!first) return null;
	                  return <button key={`label-${shape.id}`} type="button" onClick={(e) => { e.stopPropagation(); startEditShape(shape); }} className="absolute text-[10px] font-bold bg-background/80 px-1 rounded" style={{ left: `${first.x}%`, top: `${first.y}%` }}>{shape.label}</button>;
	                })}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Tipe Shape</Label><Select value={shapeDraft.shapeType} onValueChange={v => setShapeDraft(p => ({ ...p, shapeType: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unit">Unit Rumah</SelectItem><SelectItem value="bidang">Bidang Lahan</SelectItem><SelectItem value="blok">Blok/Cluster</SelectItem><SelectItem value="fasum">Jalan/Fasum</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label className="text-xs">Label</Label><Input className="h-8 text-sm" value={shapeDraft.label} onChange={e => setShapeDraft(p => ({ ...p, label: e.target.value }))} placeholder="A-01 / Bidang 1" /></div>
                  <div className="space-y-1"><Label className="text-xs">Pemilik</Label><Input className="h-8 text-sm" value={shapeDraft.ownerName} onChange={e => setShapeDraft(p => ({ ...p, ownerName: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Status Beli</Label><Select value={shapeDraft.purchaseStatus} onValueChange={v => setShapeDraft(p => ({ ...p, purchaseStatus: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{["belum_dibeli", "proses_nego", "dp", "lunas", "sudah_dibeli", "milik_sendiri"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1"><Label className="text-xs">Luas</Label><NumericInput className="h-8 text-sm" value={shapeDraft.landArea} onChange={v => setShapeDraft(p => ({ ...p, landArea: v }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Rencana Unit</Label><NumericInput className="h-8 text-sm" value={shapeDraft.plannedUnits} onChange={v => setShapeDraft(p => ({ ...p, plannedUnits: Math.round(v) }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Tipe Rumah</Label><Input className="h-8 text-sm" value={shapeDraft.unitType} onChange={e => setShapeDraft(p => ({ ...p, unitType: e.target.value }))} /></div>
	                  <div className="space-y-1"><Label className="text-xs">Status Unit</Label><Select value={shapeDraft.unitStatus} onValueChange={v => setShapeDraft(p => ({ ...p, unitStatus: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{["belum_dibuka", "akan_dibangun", "sedang_dibangun", "selesai", "terjual_akad"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
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
	                <Button size="sm" onClick={saveShape} disabled={draftPoints.length < 3 || !shapeDraft.label} className="w-full"><Plus className="size-3.5 mr-1" /> {editingShapeId ? "Update Shape" : "Simpan Shape"} ({draftPoints.length} titik)</Button>
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
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Upload gambar siteplan untuk mulai menggambar ulang bidang, blok, dan unit rumah.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
