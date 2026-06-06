import { Router } from "express";
import { db } from "@workspace/db";
import { planningSDMTable, projectsTable } from "@workspace/db/schema";
import { eq, isNull } from "drizzle-orm";

const router = Router();

router.get("/planning/sdm", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;
  let rows;
  if (projectId) {
    rows = await db.select().from(planningSDMTable).where(eq(planningSDMTable.projectId, projectId));
  } else {
    rows = await db.select().from(planningSDMTable).where(isNull(planningSDMTable.projectId));
  }
  res.json(rows[0] ?? null);
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

router.post("/planning/sdm", async (req, res) => {
  const projectId = req.body.projectId ?? null;
  let existing;
  if (projectId) {
    existing = await db.select().from(planningSDMTable).where(eq(planningSDMTable.projectId, projectId));
  } else {
    existing = await db.select().from(planningSDMTable).where(isNull(planningSDMTable.projectId));
  }

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

export default router;
