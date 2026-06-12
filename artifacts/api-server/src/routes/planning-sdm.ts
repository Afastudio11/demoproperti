import { Router } from "express";
import { db } from "@workspace/db";
import { planningSDMTable, projectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function aggregateSDM(rows: Array<typeof planningSDMTable.$inferSelect>) {
  if (rows.length === 0) return null;
  const siteManagers = rows.reduce((sum, row) => sum + Number(row.siteManagers ?? 0), 0);
  const supervisors = rows.reduce((sum, row) => sum + Number(row.supervisors ?? 0), 0);
  const workers = rows.reduce((sum, row) => sum + Number(row.workers ?? 0), 0);
  const workersPerUnitWeighted = rows.reduce((sum, row) => sum + Number(row.workersPerUnit ?? 0) * Number(row.workers ?? 0), 0);
  const managerCapacityWeighted = rows.reduce((sum, row) => sum + Number(row.unitsPerManager ?? 0) * Number(row.siteManagers ?? 0), 0);
  return {
    id: null,
    projectId: null,
    isAggregate: true,
    projectCount: rows.filter(row => row.projectId != null).length,
    siteManagers,
    supervisors,
    workers,
    workersPerUnit: workers > 0 ? Math.round((workersPerUnitWeighted / workers) * 100) / 100 : 3,
    unitsPerManager: siteManagers > 0 ? Math.round(managerCapacityWeighted / siteManagers) : 20,
    updatedAt: rows.reduce<Date | null>((latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest, null)?.toISOString() ?? null,
  };
}

router.get("/planning/sdm", async (req, res) => {
  const projectQuery = req.query.projectId;
  if (projectQuery && projectQuery !== "all" && projectQuery !== "global") {
    const projectId = Number(projectQuery);
    if (!Number.isFinite(projectId)) return res.status(400).json({ error: "Project ID tidak valid" });
    const rows = await db.select().from(planningSDMTable).where(eq(planningSDMTable.projectId, projectId));
    return res.json(rows[0] ?? null);
  }

  const rows = await db.select().from(planningSDMTable);
  res.json(aggregateSDM(rows.filter(row => row.projectId != null)));
});

router.get("/planning/sdm/global", async (_req, res) => {
  const rows = await db.select().from(planningSDMTable);
  res.json(aggregateSDM(rows.filter(row => row.projectId != null)));
});

router.get("/planning/sdm/project/:projectId", async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isFinite(projectId)) return res.status(400).json({ error: "Project ID tidak valid" });
  const rows = await db.select().from(planningSDMTable).where(eq(planningSDMTable.projectId, projectId));
  res.json(rows[0] ?? null);
});

router.post("/planning/sdm", async (req, res) => {
  const projectId = req.body.projectId == null ? null : Number(req.body.projectId);
  if (!projectId) {
    return res.status(400).json({ error: "SDM Global adalah agregasi semua proyek. Simpan data di masing-masing proyek." });
  }
  const existing = await db.select().from(planningSDMTable).where(eq(planningSDMTable.projectId, projectId));

  if (existing.length > 0) {
    const [row] = await db
      .update(planningSDMTable)
      .set({ ...req.body, projectId })
      .where(eq(planningSDMTable.id, existing[0].id))
      .returning();
    return res.json(row);
  }

  const [row] = await db.insert(planningSDMTable).values({ ...req.body, projectId }).returning();
  res.status(201).json(row);
});

router.get("/planning/sdm/all", async (_req, res) => {
  const rows = await db
    .select({
      id: planningSDMTable.id,
      projectId: planningSDMTable.projectId,
      projectNama: projectsTable.nama,
      siteManagers: planningSDMTable.siteManagers,
      supervisors: planningSDMTable.supervisors,
      workers: planningSDMTable.workers,
      workersPerUnit: planningSDMTable.workersPerUnit,
      unitsPerManager: planningSDMTable.unitsPerManager,
      updatedAt: planningSDMTable.updatedAt,
    })
    .from(planningSDMTable)
    .leftJoin(projectsTable, eq(planningSDMTable.projectId, projectsTable.id));
  res.json(rows);
});

export default router;
