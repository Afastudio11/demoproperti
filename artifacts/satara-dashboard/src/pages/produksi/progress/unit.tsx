import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckSquare, Square, ChevronDown, ChevronUp, RefreshCw, Search, Plus, Download, Settings, Trash2, Copy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubkonSelect from "@/components/subkon-select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Link, useLocation } from "wouter";

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
type UnitRow = { id: number; blok: string; nomor: string; tipe: string; stageCode: string | null; progress: number; weekStarted: number | null; subkonName: string | null; tasks: Task[]; projectId: number; status?: string | null; isPlanningUnit?: boolean; sourceShapeId?: number };
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

function parseUnitLabel(label: string) {
  const trimmed = String(label ?? "").trim();
  const match = trimmed.match(/^([A-Za-z]+)[-\s_]*(\d+[A-Za-z]?)$/);
  if (!match) {
    const [blok, ...rest] = trimmed.split(/[-\s_]/).filter(Boolean);
    return { blok: (blok || "A").toUpperCase(), nomor: rest.join("-") || trimmed || "1" };
  }
  return { blok: match[1].toUpperCase(), nomor: match[2] };
}

export default function ProgressUnit() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("projectId") || "all";
  });
  const [filterStage, setFilterStage] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("stageCode") || "all";
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("status") || "all";
  });
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [showTambahUnit, setShowTambahUnit] = useState(false);
  const [form, setForm] = useState({ projectId: "", stageCode: "T1", blok: "", nomor: "", tipe: "Tipe 36", subkonId: "", subkonName: "", weekStarted: "" });
  const [quickProgress, setQuickProgress] = useState<Record<number, number>>({});
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateItems, setTemplateItems] = useState<{ item: string; bobot: number }[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [copyFromProject, setCopyFromProject] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const proj = searchParams.get("projectId") || "all";
    const stage = searchParams.get("stageCode") || "all";
    const stat = searchParams.get("status") || "all";
    setFilterProject(proj);
    setFilterStage(stage);
    setFilterStatus(stat);
  }, [location]);

  const updateQueryParams = (proj: string, stage: string, stat: string) => {
    const params = new URLSearchParams();
    if (proj !== "all") params.set("projectId", proj);
    if (stage !== "all") params.set("stageCode", stage);
    if (stat !== "all") params.set("status", stat);
    
    const newSearch = params.toString();
    const newUrl = newSearch ? `/produksi/progress/unit?${newSearch}` : "/produksi/progress/unit";
    window.history.replaceState(null, "", newUrl);
  };

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
  const { data: allSiteplanShapes = [] } = useQuery({
    queryKey: ["planning-siteplan-unit-shapes", filterProject],
    queryFn: () => {
      const suffix = filterProject !== "all" ? `?projectId=${filterProject}` : "";
      return fetch(`/api/planning/siteplan-shapes${suffix}`).then(r => r.json());
    },
  });

  // Template data for current project
  const [selectedTemplateProjectId, setSelectedTemplateProjectId] = useState<string>("");
  const activeTemplateProjectId = selectedTemplateProjectId || (filterProject !== "all" ? filterProject : (projects && projects[0] ? String(projects[0].id) : ""));

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

  const openTemplateDialog = async (projId?: string) => {
    const targetProjId = projId || (filterProject !== "all" ? filterProject : (projects && projects[0] ? String(projects[0].id) : ""));
    setSelectedTemplateProjectId(targetProjId);
    setCopyFromProject("");
    setShowTemplateDialog(true);
    
    if (targetProjId) {
      try {
        await loadTemplateForProject(targetProjId);
      } catch (err: any) {
        toast({ title: err.message || "Gagal memuat template proyek", variant: "destructive" });
      }
    }
  };

  const handleSelectTemplateProject = async (projId: string) => {
    setSelectedTemplateProjectId(projId);
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


  async function ensureProductionUnit(unitId: number) {
    if (unitId > 0) return unitId;
    const shapeId = Math.abs(unitId);
    const res = await fetch(`/api/planning/siteplan/shapes/${shapeId}/create-unit`, { method: "POST" });
    if (!res.ok) throw new Error("Gagal membuat unit produksi dari siteplan");
    const unit = await res.json();
    qc.invalidateQueries({ queryKey: ["planning-siteplan-unit-shapes"] });
    qc.invalidateQueries({ queryKey: ["planning-siteplan-shapes"] });
    return Number(unit.id);
  }

  const tambahUnitMutation = useMutation({
    mutationFn: async () => {
      const body = {
        projectId: parseInt(form.projectId),
        stageCode: form.stageCode || null,
        blok: form.blok,
        nomor: form.nomor,
        tipe: form.tipe,
        harga: 0,
        subkonId: form.subkonId ? Number(form.subkonId) : null,
        subkonName: form.subkonName || null,
        weekStarted: form.weekStarted ? parseInt(form.weekStarted) : null,
      };
      const res = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || "Gagal menambahkan unit");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      toast({ title: `Unit Blok ${form.blok}-${form.nomor} berhasil ditambahkan` });
      setForm(p => ({ ...p, nomor: "" }));
    },
    onError: (err: Error) => toast({ title: err.message || "Gagal menambahkan unit", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const realUnitId = await ensureProductionUnit(unitId);
      const res = await fetch(`/api/produksi/units/seed-tasks/${realUnitId}`, { method: "POST" });
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
      const realUnitId = await ensureProductionUnit(unitId);
      const res = await fetch(`/api/units/${realUnitId}`, {
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
      const realUnitId = await ensureProductionUnit(unitId);
      const res = await fetch(`/api/units/${realUnitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(progress !== undefined ? { progress } : {}), ...(status ? { status } : {}) }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      qc.invalidateQueries({ queryKey: ["planning-siteplan-unit-shapes"] });
      qc.invalidateQueries({ queryKey: ["planning-siteplan-shapes"] });
      toast({ title: "Progress unit diperbarui" });
    },
  });

  const cleanupOrphanedUnitsMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch("/api/planning/siteplan/cleanup-orphaned-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId === "all" ? {} : { projectId: Number(projectId) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus unit tidak sinkron");
      return result as { deleted: number; skipped: string[]; projectId: number | null };
    },
    onSuccess: (result) => {
      setExpandedUnit(null);
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      qc.invalidateQueries({ queryKey: ["units"] });
      qc.invalidateQueries({ queryKey: ["units-list"] });
      qc.invalidateQueries({ queryKey: ["planning-siteplan-unit-shapes"] });
      qc.invalidateQueries({ queryKey: ["planning-siteplan-shapes"] });
      const skippedNote = result.skipped.length > 0 ? ` ${result.skipped.length} unit dilindungi dan tidak dihapus.` : "";
      toast({ title: `${result.deleted} unit tidak sinkron dihapus.`, description: skippedNote.trim() || undefined });
    },
    onError: (err: Error) => toast({ title: err.message || "Gagal menghapus unit tidak sinkron", variant: "destructive" }),
  });

  const realUnits: (UnitRow & { projectName: string })[] = (data ?? []).flatMap(p => p.units.map(u => ({ ...u, projectName: p.projectName })));
  const realUnitIds = new Set(realUnits.map(u => u.id));
  const realUnitKeys = new Set(realUnits.map(u => `${u.projectId}:${u.blok}-${u.nomor}`.toLowerCase()));
  const shapesList = Array.isArray(allSiteplanShapes) ? allSiteplanShapes : [];
  const planningUnits: (UnitRow & { projectName: string })[] = shapesList
    .filter(shape => String(shape.shapeType ?? "").toLowerCase() === "unit")
    .filter(shape => !shape.unitId || !realUnitIds.has(shape.unitId))
    .map(shape => {
      const parsed = parseUnitLabel(shape.label);
      const projectName = (data ?? []).find(project => project.projectId === shape.projectId)?.projectName
        ?? (projects ?? []).find(project => project.id === shape.projectId)?.nama
        ?? `Project #${shape.projectId}`;
      return {
        id: shape.unitId ? Number(shape.unitId) : -Number(shape.id),
        projectId: Number(shape.projectId),
        projectName,
        blok: parsed.blok,
        nomor: parsed.nomor,
        tipe: shape.unitType || "Tipe 36",
        stageCode: shape.stageCode || shape.blockCode || null,
        progress: Number(shape.progress ?? 0),
        weekStarted: null,
        subkonName: shape.subkonName ?? null,
        status: shape.unitStatus ?? "belum_dibuka",
        tasks: [],
        isPlanningUnit: true,
        sourceShapeId: Number(shape.id),
      };
    })
    .filter(unit => !realUnitKeys.has(`${unit.projectId}:${unit.blok}-${unit.nomor}`.toLowerCase()));
  const allUnits: (UnitRow & { projectName: string })[] = [...realUnits, ...planningUnits];
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
    if (filterStage !== "all" && u.stageCode !== filterStage) return false;
    const st = getStatus(u.progress, u.weekStarted);
    if (filterStatus !== "all" && st.label.toLowerCase() !== filterStatus.toLowerCase()) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const cleanQ = q.replace(/[-\s_]/g, "");
      const fullLabel = `${u.blok}-${u.nomor}`.toLowerCase();
      const cleanLabel = `${u.blok}${u.nomor}`.toLowerCase();
      const tipeStr = String(u.tipe ?? "").toLowerCase();
      const subkonStr = String(u.subkonName ?? "").toLowerCase();
      const projectStr = String(u.projectName ?? "").toLowerCase();
      const stageStr = String(u.stageCode ?? "").toLowerCase();

      const matches =
        fullLabel.includes(q) ||
        cleanLabel.includes(cleanQ) ||
        u.nomor.toLowerCase().includes(q) ||
        u.blok.toLowerCase() === q ||
        tipeStr.includes(q) ||
        subkonStr.includes(q) ||
        projectStr.includes(q) ||
        stageStr.includes(q);

      if (!matches) return false;
    }
    return true;
  });

  const projectList = data ?? [];
  const canSubmit = form.projectId && form.blok && form.nomor && form.tipe;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Progress Unit — Checklist {templateData?.isCustom ? "Kustom" : "Standar"}</h1>
          <p className="text-sm text-muted-foreground">Klik unit untuk lihat dan update progress pekerjaan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openTemplateDialog()} className="gap-1.5 h-8">
            <Settings className="size-3.5" /> Template Bobot
          </Button>
          <Dialog open={showTambahUnit} onOpenChange={setShowTambahUnit}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8">
                <Plus className="size-3.5" /> Tambah Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto">
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
                    <SubkonSelect
                      valueMode="id"
                      allowCreate
                      value={form.subkonId}
                      onValueChange={v => setForm(p => ({ ...p, subkonId: v }))}
                      onOptionChange={option => setForm(p => ({ ...p, subkonName: option?.name ?? "" }))}
                      projectId={form.projectId}
                    />
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={cleanupOrphanedUnitsMutation.isPending}
            onClick={() => {
              const scope = filterProject === "all" ? "seluruh proyek" : "proyek yang sedang dipilih";
              const confirmed = window.confirm(
                `Hapus semua unit yang tidak terhubung ke shape unit pada Siteplan untuk ${scope}?\n\nUnit yang sudah terikat customer atau berstatus selesai/akad tidak akan dihapus.`
              );
              if (confirmed) cleanupOrphanedUnitsMutation.mutate(filterProject);
            }}
          >
            <Trash2 className="size-3.5" />
            {cleanupOrphanedUnitsMutation.isPending ? "Menghapus..." : "Hapus tidak sinkron"}
          </Button>
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
        <Select 
          value={filterProject} 
          onValueChange={(val) => {
            setFilterProject(val);
            updateQueryParams(val, filterStage, filterStatus);
          }}
        >
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Semua proyek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projectList.map(p => <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select 
          value={filterStage} 
          onValueChange={(val) => {
            setFilterStage(val);
            updateQueryParams(filterProject, val, filterStatus);
          }}
        >
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue placeholder="Semua Tahap" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahap</SelectItem>
            {STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select 
          value={filterStatus} 
          onValueChange={(val) => {
            setFilterStatus(val);
            updateQueryParams(filterProject, filterStage, val);
          }}
        >
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
                    {(projects ?? []).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
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
                    {(projects ?? []).filter(p => String(p.id) !== activeTemplateProjectId).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
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

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data unit...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {allUnits.length === 0
              ? "Belum ada unit. Unit dari Perencanaan akan otomatis muncul di sini setelah siteplan/unit rumah disimpan."
              : "Unit tidak ditemukan dengan filter ini."}
          </p>
          {allUnits.length === 0 && (
            <div className="flex justify-center gap-2">
              <Link href={`/perencanaan/tahapan${filterProject !== "all" ? `?projectId=${filterProject}` : ""}`}>
                <Button size="sm" className="gap-1.5">
                  <RefreshCw className="size-3.5" /> Publish dari Rencana Tahapan
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setShowTambahUnit(true)} className="gap-1.5">
                <Plus className="size-3.5" /> Tambah Manual
              </Button>
            </div>
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
              <Card key={unit.id} className={`transition-colors ${isExpanded ? "ring-1 ring-primary/30" : ""}`}>
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
                      {unit.isPlanningUnit && <Badge variant="outline" className="h-5 text-[10px]">dari perencanaan</Badge>}
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
                          <div className="py-3 text-center space-y-2">
                            {unit.isPlanningUnit && <p className="text-xs text-muted-foreground">Unit ini mirror dari Perencanaan. Mulai checklist akan membuat unit produksi dan link ke siteplan.</p>}
                            <Button size="sm" variant="outline" onClick={() => seedMutation.mutate(unit.id)} className="h-7 text-xs gap-1.5">
                              <Plus className="size-3" /> Inisialisasi Checklist {templateData?.isCustom ? `${templateData.items.length} Item (Kustom)` : "26 Item"}
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Checklist Pekerjaan ({unit.tasks.length} Item)</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openTemplateDialog(String(unit.projectId)); }}
                                  className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                                >
                                  <Settings className="size-3" /> Edit Template Bobot
                                </button>
                              </div>
                              <span className="text-xs font-semibold">{fmtPct(unit.progress)} selesai</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                              {[...unit.tasks].sort((a, b) => a.id - b.id).map(task => (
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
