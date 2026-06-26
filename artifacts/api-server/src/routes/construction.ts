import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { constructionTasksTable, qcDefectsTable, unitsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateConstructionTaskBody, UpdateConstructionTaskBody } from "@workspace/api-zod";
import { recalculateUnitProductionState } from "../lib/production-relations";

const router: IRouter = Router();

router.get("/construction/tasks", async (req, res) => {
  try {
    const rawProjects = await db.select({ id: projectsTable.id, status: projectsTable.status, fase: projectsTable.fase }).from(projectsTable);
    const activeProjectIds = new Set(
      rawProjects.filter(p => p.status !== "archived" && p.fase !== "SCALE" && p.fase !== "KANTOR").map(p => p.id)
    );

    const rawUnits = await db.select({ id: unitsTable.id, projectId: unitsTable.projectId }).from(unitsTable);
    const activeUnitIds = new Set(rawUnits.filter(u => activeProjectIds.has(u.projectId)).map(u => u.id));

    let tasks = await db.select().from(constructionTasksTable);
    tasks = tasks.filter(t => activeUnitIds.has(t.unitId));

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

    await recalculateUnitProductionState(task.unitId);

    res.json({ ...task, tanggalMulai: task.tanggalMulai ?? null, tanggalSelesai: task.tanggalSelesai ?? null, catatan: task.catatan ?? null, createdAt: task.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update construction task");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/construction/progress-summary", async (req, res) => {
  try {
    const rawProjects = await db.select({ id: projectsTable.id, status: projectsTable.status, fase: projectsTable.fase }).from(projectsTable);
    const activeProjectIds = new Set(
      rawProjects.filter(p => p.status !== "archived" && p.fase !== "SCALE" && p.fase !== "KANTOR").map(p => p.id)
    );

    let units = await db.select().from(unitsTable);
    units = units.filter(u => activeProjectIds.has(u.projectId));

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
