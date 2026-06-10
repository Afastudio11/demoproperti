import { Router } from "express";
import { db } from "@workspace/db";
import { planningMilestonesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
type PlanningMilestoneInsert = typeof planningMilestonesTable.$inferInsert;

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
  const { projectId, milestones } = req.body as { projectId: number; milestones: Partial<PlanningMilestoneInsert>[] };
  if (!Number.isFinite(Number(projectId))) {
    res.status(400).json({ error: "Project wajib dipilih" });
    return;
  }
  const rowsToInsert = milestones.map((milestone) => {
    if (!milestone.phase || !milestone.taskName) {
      throw new Error("phase dan taskName wajib diisi untuk setiap milestone");
    }
    return { ...milestone, projectId: Number(projectId), phase: milestone.phase, taskName: milestone.taskName } satisfies PlanningMilestoneInsert;
  });
  await db.delete(planningMilestonesTable).where(eq(planningMilestonesTable.projectId, projectId));
  const rows = rowsToInsert.length > 0
    ? await db.insert(planningMilestonesTable).values(rowsToInsert).returning()
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
