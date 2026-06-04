import { Router } from "express";
import { db } from "@workspace/db";
import { planningMilestonesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/milestones", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningMilestonesTable).where(eq(planningMilestonesTable.projectId, projectId))
    : await db.select().from(planningMilestonesTable).orderBy(planningMilestonesTable.projectId);
  res.json(rows);
});

router.post("/planning/milestones", async (req, res) => {
  const [row] = await db.insert(planningMilestonesTable).values(req.body).returning();
  res.status(201).json(row);
});

router.post("/planning/milestones/bulk", async (req, res) => {
  const { projectId, milestones } = req.body as { projectId: number; milestones: Record<string, unknown>[] };
  await db.delete(planningMilestonesTable).where(eq(planningMilestonesTable.projectId, projectId));
  const rows = milestones.length > 0
    ? await db.insert(planningMilestonesTable).values(milestones.map(m => ({ ...m, projectId }))).returning()
    : [];
  res.json(rows);
});

router.patch("/planning/milestones/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningMilestonesTable).set(req.body).where(eq(planningMilestonesTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/milestones/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningMilestonesTable).where(eq(planningMilestonesTable.id, id));
  res.json({ ok: true });
});

export default router;
