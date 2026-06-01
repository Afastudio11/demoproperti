import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { constructionTasksTable, unitsTable, qcDefectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateConstructionTaskBody, UpdateConstructionTaskBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/construction/tasks", async (req, res) => {
  try {
    let tasks = await db.select().from(constructionTasksTable);
    if (req.query.unitId) {
      const uid = parseInt(req.query.unitId as string);
      tasks = tasks.filter(t => t.unitId === uid);
    }
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      const units = await db.select().from(unitsTable).where(eq(unitsTable.projectId, pid));
      const unitIds = new Set(units.map(u => u.id));
      tasks = tasks.filter(t => unitIds.has(t.unitId));
    }
    res.json(tasks.map(t => ({
      ...t,
      tanggalMulai: t.tanggalMulai ?? null,
      tanggalSelesai: t.tanggalSelesai ?? null,
      catatan: t.catatan ?? null,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list construction tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/construction/tasks", async (req, res) => {
  try {
    const body = CreateConstructionTaskBody.parse(req.body);
    const [task] = await db.insert(constructionTasksTable).values(body).returning();
    res.status(201).json({ ...task, tanggalMulai: task.tanggalMulai ?? null, tanggalSelesai: task.tanggalSelesai ?? null, catatan: task.catatan ?? null, createdAt: task.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create construction task");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/construction/tasks/:id", async (req, res) => {
  try {
    const body = UpdateConstructionTaskBody.parse(req.body);
    const [task] = await db.update(constructionTasksTable).set(body).where(eq(constructionTasksTable.id, parseInt(req.params.id))).returning();
    if (!task) return res.status(404).json({ error: "Not found" });

    // Recalculate unit progress
    const allTasks = await db.select().from(constructionTasksTable).where(eq(constructionTasksTable.unitId, task.unitId));
    const progress = allTasks.reduce((sum, t) => sum + (t.status === "selesai" ? (t.bobot || 0) : 0), 0);
    const openDefects = await db.select().from(qcDefectsTable).where(eq(qcDefectsTable.unitId, task.unitId));
    const hasOpenDefects = openDefects.some(d => d.status === "open" || d.status === "in_repair");
    const readyAkad = progress >= 100 && !hasOpenDefects;
    await db.update(unitsTable).set({ progress, readyAkad }).where(eq(unitsTable.id, task.unitId));

    res.json({ ...task, tanggalMulai: task.tanggalMulai ?? null, tanggalSelesai: task.tanggalSelesai ?? null, catatan: task.catatan ?? null, createdAt: task.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update construction task");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/construction/progress-summary", async (req, res) => {
  try {
    let units = await db.select().from(unitsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      units = units.filter(u => u.projectId === pid);
    }

    const summaries = await Promise.all(units.map(async (unit) => {
      const tasks = await db.select().from(constructionTasksTable).where(eq(constructionTasksTable.unitId, unit.id));
      const defects = await db.select().from(qcDefectsTable).where(eq(qcDefectsTable.unitId, unit.id));
      const openDefects = defects.filter(d => d.status === "open" || d.status === "in_repair").length;
      return {
        unitId: unit.id,
        unitLabel: `Blok ${unit.blok}-${unit.nomor}`,
        progress: unit.progress || 0,
        deviation: Math.max(0, tasks.length > 0 ? (100 - (unit.progress || 0)) * 0.05 : 0),
        readyAkad: unit.readyAkad,
        openDefects,
      };
    }));

    res.json(summaries);
  } catch (err) {
    req.log.error({ err }, "Failed to get progress summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
