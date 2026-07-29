import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  unitsTable, constructionTasksTable, subkonContractsTable, subkonPaymentsTable,
  fasumProgressTable, prodMaterialMasterTable, prodMaterialInTable, prodMaterialOutTable,
  unitQcTable, reworksTable, projectsTable, projectTaskTemplatesTable
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

const parseProjectId = (value: string | undefined) => {
  const projectId = Number(value);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
};

type ResolvedProjectId = { projectId: number };
type RouteError = { status: number; error: string };
type TemplateItemInput = { item: string; bobot: number };

async function resolveProjectId(value: string | undefined): Promise<ResolvedProjectId | RouteError> {
  const projectId = parseProjectId(value);
  if (!projectId) return { status: 400, error: "Project id tidak valid" };

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) return { status: 404, error: "Proyek tidak ditemukan" };
  return { projectId };
}

function normalizeTemplateItems(items: unknown): { items: TemplateItemInput[] } | { error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Items array wajib diisi" };
  }

  const normalized: TemplateItemInput[] = [];
  for (const [idx, raw] of items.entries()) {
    const value = raw as { item?: unknown; bobot?: unknown };
    const item = String(value.item ?? "").trim();
    const bobot = Number(value.bobot);
    if (!item) return { error: `Nama pekerjaan baris ${idx + 1} wajib diisi` };
    if (!Number.isFinite(bobot) || bobot < 0) return { error: `Bobot baris ${idx + 1} tidak valid` };
    normalized.push({ item, bobot });
  }

  const totalBobot = normalized.reduce((sum, item) => sum + item.bobot, 0);
  if (totalBobot < 95 || totalBobot > 105) {
    return { error: `Total bobot harus mendekati 100% (sekarang: ${totalBobot}%)` };
  }

  return { items: normalized };
}

router.get("/produksi/dashboard", async (req, res) => {
  try {
    const rawProjects = await db.select().from(projectsTable);
    const projects = rawProjects.filter(p => p.status !== "archived" && p.fase !== "SCALE" && p.fase !== "KANTOR");
    const activeProjectIds = new Set(projects.map(p => p.id));

    const rawUnits = await db.select().from(unitsTable);
    const units = rawUnits.filter(u => activeProjectIds.has(u.projectId));
    const activeUnitIds = new Set(units.map(u => u.id));

    const rawTasks = await db.select().from(constructionTasksTable);
    const tasks = rawTasks.filter(t => activeUnitIds.has(t.unitId));

    const rawContracts = await db.select().from(subkonContractsTable);
    const contracts = rawContracts.filter(c => activeProjectIds.has(c.projectId));
    const activeContractIds = new Set(contracts.map(c => c.id));

    const rawPayments = await db.select().from(subkonPaymentsTable);
    const payments = rawPayments.filter(p => activeContractIds.has(p.contractId));

    const rawFasums = await db.select().from(fasumProgressTable);
    const fasums = rawFasums.filter(f => activeProjectIds.has(f.projectId));

    const masters = await db.select().from(prodMaterialMasterTable);

    const rawMatIn = await db.select().from(prodMaterialInTable);
    const matIn = rawMatIn.filter(m => activeProjectIds.has(m.projectId));

    const rawMatOut = await db.select().from(prodMaterialOutTable);
    const matOut = rawMatOut.filter(m => activeProjectIds.has(m.projectId));

    const rawQcItems = await db.select().from(unitQcTable);
    const qcItems = rawQcItems.filter(q => activeUnitIds.has(q.unitId));

    const activeUnits = units.filter(u => u.progress > 0 && u.progress < 100);
    const avgProgress = units.length > 0 ? Math.round(units.reduce((s, u) => s + u.progress, 0) / units.length) : 0;

    const fasumAvg = fasums.length > 0 ? Math.round(fasums.reduce((s, f) => s + f.progressPercent, 0) / fasums.length) : 0;

    const pendingPayments = payments.filter(p => p.status === "pending_approval" || p.status === "approved");
    const pendingTotal = pendingPayments.reduce((s, p) => s + (p.netPayment ?? 0), 0);

    const totalMatOut = matOut.reduce((s, m) => {
      const master = masters.find(mm => mm.id === m.materialId);
      return s + m.quantity * (master?.unitPrice ?? 0);
    }, 0);

    const criticalMaterials = masters.map(m => {
      const totalIn = matIn.filter(r => r.materialId === m.id).reduce((s, r) => s + r.quantity, 0);
      const totalOut = matOut.filter(r => r.materialId === m.id).reduce((s, r) => s + r.quantity, 0);
      return { ...m, stokAktual: totalIn - totalOut };
    }).filter(m => m.stokAktual < m.minimumStock);

    const sp3kUnits = units.filter(u => u.adminStatus === "SP3K" && u.progress < 100);
    const htTertahan = sp3kUnits.reduce((s, u) => s + (u.htValue ?? 0), 0);

    const subkonSnapshot = contracts.map(c => {
      const cp = payments.filter(p => p.contractId === c.id && p.status === "paid");
      const lastPayment = cp.sort((a, b) => b.terminNumber! - a.terminNumber!)[0];
      const velocity = lastPayment?.velocity ?? 0;
      const contractUnits = units.filter(u =>
        u.contractId === c.id
        || (u.projectId === c.projectId && (u.stageCode ?? "") === (c.stageCode ?? "") && (u.subkonName ?? "") === c.subkonName)
      );
      const progressAktual = contractUnits.length > 0
        ? Math.round(contractUnits.reduce((sum, u) => sum + (u.progress ?? 0), 0) / contractUnits.length)
        : 0;
      return {
        id: c.id,
        subkonName: c.subkonName,
        unitCount: c.unitCount,
        progressAktual,
        velocity,
        status: c.status,
      };
    });

    const qcByUnit = new Map<number, { pass: number; total: number }>();
    qcItems.forEach(q => {
      const existing = qcByUnit.get(q.unitId) ?? { pass: 0, total: 0 };
      qcByUnit.set(q.unitId, { pass: existing.pass + (q.isPass ? 1 : 0), total: existing.total + 1 });
    });
    const avgQcScore = qcByUnit.size > 0
      ? Math.round(Array.from(qcByUnit.values()).reduce((s, v) => s + (v.total > 0 ? (v.pass / v.total) * 100 : 0), 0) / qcByUnit.size)
      : 0;

    const progressScore = Math.min(100, avgProgress);
    const qcScore = avgQcScore;
    const fasumScore = fasumAvg;
    const paymentScore = pendingPayments.length === 0 ? 100 : Math.max(0, 100 - pendingPayments.length * 5);

    // Schedule adherence: persentase task yang on-time atau selesai
    const completedTasks = tasks.filter(t => t.status === "selesai").length;
    const scheduleAdherence = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Safety/Compliance: 100 jika tidak ada issue, turun per critical material/alert
    const safetyScore = Math.max(0, 100 - criticalMaterials.length * 10);

    const hasProductionData = units.length > 0;
    const healthScore = !hasProductionData ? 0 : Math.round(
      progressScore * 0.25 + qcScore * 0.20 + fasumScore * 0.10 + paymentScore * 0.10 + scheduleAdherence * 0.20 + safetyScore * 0.15
    );

    const alerts = [];
    if (sp3kUnits.length > 0) alerts.push({ type: "ht_tertahan", message: `${sp3kUnits.length} unit SP3K belum ready akad, HT tertahan Rp ${htTertahan.toLocaleString("id")}`, severity: "warning" });
    if (pendingPayments.length > 0) alerts.push({ type: "tagihan_pending", message: `${pendingPayments.length} tagihan subkon menunggu approval`, severity: "info" });
    if (criticalMaterials.length > 0) alerts.push({ type: "material_kritis", message: `${criticalMaterials.length} material kritis 14 hari ke depan`, severity: "error" });

    res.json({
      summary: {
        avgProgress,
        activeUnits: activeUnits.length,
        totalUnits: units.length,
        fasumAvg,
        pendingTotal,
        totalMatOut,
        healthScore,
      },
      subkonSnapshot,
      criticalMaterials: criticalMaterials.slice(0, 5),
      alerts,
      htTertahan,
      sp3kCount: sp3kUnits.length,
      projects: projects.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get production dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/produksi/progress/summary", async (req, res) => {
  try {
    const rawUnits = await db.select().from(unitsTable);
    const rawTasks = await db.select().from(constructionTasksTable);
    const rawProjects = await db.select().from(projectsTable);

    const projects = rawProjects.filter(p => p.status !== "archived" && p.fase !== "SCALE" && p.fase !== "KANTOR");
    const activeProjectIds = new Set(projects.map(p => p.id));
    const units = rawUnits.filter(u => activeProjectIds.has(u.projectId));
    const activeUnitIds = new Set(units.map(u => u.id));
    const tasks = rawTasks.filter(t => activeUnitIds.has(t.unitId));

    const byProject = projects.map(proj => {
      const projUnits = units.filter(u => u.projectId === proj.id);
      projUnits.sort((a, b) => {
        const aBlok = a.blok || "";
        const bBlok = b.blok || "";
        const blokCompare = aBlok.localeCompare(bBlok);
        if (blokCompare !== 0) return blokCompare;
        const aNum = parseInt(a.nomor, 10);
        const bNum = parseInt(b.nomor, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return (a.nomor || "").localeCompare(b.nomor || "");
      });
      const avgProgress = projUnits.length > 0 ? projUnits.reduce((s, u) => s + u.progress, 0) / projUnits.length : 0;
      const byStage = new Map<string, { unitCount: number; progress: number; units: typeof projUnits }>();
      projUnits.forEach(u => {
        const stage = u.stageCode ?? "T?";
        const existing = byStage.get(stage) ?? { unitCount: 0, progress: 0, units: [] };
        byStage.set(stage, { unitCount: existing.unitCount + 1, progress: existing.progress + u.progress, units: [...existing.units, u] });
      });
      const stages = Array.from(byStage.entries()).map(([code, data]) => ({
        stageCode: code,
        unitCount: data.unitCount,
        avgProgress: Math.round(data.progress / data.unitCount),
        status: data.progress / data.unitCount >= 100 ? "selesai" : data.progress / data.unitCount > 0 ? "aktif" : "land_bank",
      })).sort((a, b) => a.stageCode.localeCompare(b.stageCode));
      return {
        projectId: proj.id,
        projectName: proj.nama,
        totalUnits: projUnits.length,
        avgProgress: Math.round(avgProgress),
        targetProgress: 100,
        deviation: Math.round(100 - avgProgress),
        status: avgProgress >= 95 ? "on_track" : avgProgress >= 70 ? "warning" : "delayed",
        stages,
        units: projUnits.map(u => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
          tasks: tasks.filter(t => t.unitId === u.id).map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
        })),
      };
    });

    res.json(byProject);
  } catch (err) {
    req.log.error({ err }, "Failed to get progress summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Standard tasks fallback (used when project has no custom template) ───
const STANDARD_TASKS = [
  { item: "Galian", bobot: 3 },
  { item: "Pondasi", bobot: 6 },
  { item: "Sloof", bobot: 5 },
  { item: "Kolom", bobot: 5 },
  { item: "Pasangan Dinding Bata/Hebel", bobot: 12 },
  { item: "Ring Balk (Balok Atas)", bobot: 5 },
  { item: "Rangka Atap (Baja Ringan)", bobot: 4 },
  { item: "Penutup Atap (Genteng Metal/Spandek)", bobot: 5 },
  { item: "Cor Plat Teras", bobot: 4 },
  { item: "Cor Plat WC", bobot: 4 },
  { item: "Topi-topi", bobot: 2 },
  { item: "Kuda-Kuda", bobot: 4 },
  { item: "Plaster", bobot: 7 },
  { item: "Aplus", bobot: 6 },
  { item: "Kusen Pintu", bobot: 1 },
  { item: "Kusen Jendela", bobot: 1 },
  { item: "Kusen L", bobot: 1 },
  { item: "Instalasi Pipa", bobot: 1 },
  { item: "Pemasangan Keramik 40x40", bobot: 5 },
  { item: "Pemasangan Keramik 25x40", bobot: 2 },
  { item: "Pemasangan Keramik 25x25", bobot: 1 },
  { item: "Pemasangan Closet dll", bobot: 1 },
  { item: "Cat", bobot: 7 },
  { item: "Pemasangan Rangka Plafon", bobot: 3 },
  { item: "Pemasangan Gypsum", bobot: 2 },
  { item: "Floor Teras", bobot: 3 },
];

router.post("/produksi/units/seed-tasks/:unitId", async (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId);
    const existing = await db.select().from(constructionTasksTable).where(eq(constructionTasksTable.unitId, unitId));
    if (existing.length > 0) return res.json({ message: "Tasks already exist", count: existing.length });

    // Find project for this unit to check for custom template
    const [unit] = await db.select({ projectId: unitsTable.projectId }).from(unitsTable).where(eq(unitsTable.id, unitId));
    let tasksToSeed = STANDARD_TASKS;

    if (unit) {
      const templates = await db.select().from(projectTaskTemplatesTable)
        .where(eq(projectTaskTemplatesTable.projectId, unit.projectId))
        .orderBy(projectTaskTemplatesTable.urutan);
      if (templates.length > 0) {
        tasksToSeed = templates.map(t => ({ item: t.item, bobot: t.bobot }));
      }
    }

    await db.insert(constructionTasksTable).values(tasksToSeed.map(t => ({ ...t, unitId, status: "belum_mulai" })));
    res.status(201).json({ message: "Tasks seeded", count: tasksToSeed.length, source: tasksToSeed === STANDARD_TASKS ? "default" : "custom" });
  } catch (err) {
    req.log.error({ err }, "Failed to seed tasks");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── Project Task Template CRUD ──────────────────────────────────────────────

// Get template for a project (returns items or empty array if using default)
router.get("/produksi/project-templates/:projectId", async (req, res) => {
  try {
    const resolved = await resolveProjectId(req.params.projectId);
    if ("error" in resolved) return res.status(resolved.status).json({ error: resolved.error });
    const { projectId } = resolved;

    const templates = await db.select().from(projectTaskTemplatesTable)
      .where(eq(projectTaskTemplatesTable.projectId, projectId))
      .orderBy(projectTaskTemplatesTable.urutan);
    res.json({ projectId, items: templates, isCustom: templates.length > 0, defaults: STANDARD_TASKS });
  } catch (err) {
    req.log.error({ err }, "Failed to get project templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save/replace template for a project
router.put("/produksi/project-templates/:projectId", async (req, res) => {
  try {
    const resolved = await resolveProjectId(req.params.projectId);
    if ("error" in resolved) return res.status(resolved.status).json({ error: resolved.error });
    const { projectId } = resolved;

    const normalized = normalizeTemplateItems((req.body as { items?: unknown }).items);
    if ("error" in normalized) return res.status(400).json({ error: normalized.error });

    // Delete existing then insert new
    await db.delete(projectTaskTemplatesTable).where(eq(projectTaskTemplatesTable.projectId, projectId));
    const values = normalized.items.map((item, idx) => ({
      projectId,
      item: item.item,
      bobot: item.bobot,
      urutan: idx,
    }));
    await db.insert(projectTaskTemplatesTable).values(values);

    const saved = await db.select().from(projectTaskTemplatesTable)
      .where(eq(projectTaskTemplatesTable.projectId, projectId))
      .orderBy(projectTaskTemplatesTable.urutan);
    res.json({ projectId, items: saved, isCustom: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save project templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Copy template from another project
router.post("/produksi/project-templates/:projectId/copy-from/:sourceProjectId", async (req, res) => {
  try {
    const target = await resolveProjectId(req.params.projectId);
    if ("error" in target) return res.status(target.status).json({ error: target.error });
    const source = await resolveProjectId(req.params.sourceProjectId);
    if ("error" in source) return res.status(source.status).json({ error: source.error });
    const { projectId } = target;
    const sourceProjectId = source.projectId;

    const sourceTemplates = await db.select().from(projectTaskTemplatesTable)
      .where(eq(projectTaskTemplatesTable.projectId, sourceProjectId))
      .orderBy(projectTaskTemplatesTable.urutan);

    if (sourceTemplates.length === 0) {
      return res.status(404).json({ error: "Proyek sumber belum memiliki template kustom" });
    }

    // Delete existing then copy
    await db.delete(projectTaskTemplatesTable).where(eq(projectTaskTemplatesTable.projectId, projectId));
    const values = sourceTemplates.map((t, idx) => ({
      projectId,
      item: t.item,
      bobot: t.bobot,
      urutan: idx,
    }));
    await db.insert(projectTaskTemplatesTable).values(values);

    const saved = await db.select().from(projectTaskTemplatesTable)
      .where(eq(projectTaskTemplatesTable.projectId, projectId))
      .orderBy(projectTaskTemplatesTable.urutan);
    res.json({ projectId, items: saved, copiedFrom: sourceProjectId });
  } catch (err) {
    req.log.error({ err }, "Failed to copy project templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete custom template (revert to default)
router.delete("/produksi/project-templates/:projectId", async (req, res) => {
  try {
    const resolved = await resolveProjectId(req.params.projectId);
    if ("error" in resolved) return res.status(resolved.status).json({ error: resolved.error });
    const { projectId } = resolved;

    await db.delete(projectTaskTemplatesTable).where(eq(projectTaskTemplatesTable.projectId, projectId));
    res.json({ projectId, isCustom: false, message: "Template dikembalikan ke default" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Initialize template from defaults (for easy editing)
router.post("/produksi/project-templates/:projectId/init-defaults", async (req, res) => {
  try {
    const resolved = await resolveProjectId(req.params.projectId);
    if ("error" in resolved) return res.status(resolved.status).json({ error: resolved.error });
    const { projectId } = resolved;

    const existing = await db.select().from(projectTaskTemplatesTable)
      .where(eq(projectTaskTemplatesTable.projectId, projectId));
    if (existing.length > 0) {
      return res.json({ projectId, items: existing, isCustom: true, message: "Template sudah ada" });
    }

    const values = STANDARD_TASKS.map((t, idx) => ({
      projectId,
      item: t.item,
      bobot: t.bobot,
      urutan: idx,
    }));
    await db.insert(projectTaskTemplatesTable).values(values);

    const saved = await db.select().from(projectTaskTemplatesTable)
      .where(eq(projectTaskTemplatesTable.projectId, projectId))
      .orderBy(projectTaskTemplatesTable.urutan);
    res.status(201).json({ projectId, items: saved, isCustom: true });
  } catch (err) {
    req.log.error({ err }, "Failed to init default templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
