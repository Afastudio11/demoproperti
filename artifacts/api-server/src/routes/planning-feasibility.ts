import { Router } from "express";
import { db } from "@workspace/db";
import { planningFeasibilityTable, planningSiteplanShapesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
type PlanningFeasibilityInsert = typeof planningFeasibilityTable.$inferInsert;

async function applySiteplanUnitBaseline(body: PlanningFeasibilityInsert): Promise<PlanningFeasibilityInsert> {
  const projectId = Number(body.projectId);
  if (!Number.isFinite(projectId)) return body;
  const shapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId));
  const totalUnits = shapes.filter(shape => shape.shapeType === "unit").length;
  return totalUnits > 0 ? { ...body, totalUnits } : body;
}

router.get("/planning/feasibility", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningFeasibilityTable).where(eq(planningFeasibilityTable.projectId, projectId))
    : await db.select().from(planningFeasibilityTable);
  res.json(rows);
});

router.post("/planning/feasibility", async (req, res) => {
  const body = await applySiteplanUnitBaseline(req.body as PlanningFeasibilityInsert);
  const [row] = await db.insert(planningFeasibilityTable).values(body).returning();
  res.status(201).json(row);
});

router.patch("/planning/feasibility/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(planningFeasibilityTable).where(eq(planningFeasibilityTable.id, id));
  const body = await applySiteplanUnitBaseline({ ...existing, ...req.body } as PlanningFeasibilityInsert);
  const [row] = await db.update(planningFeasibilityTable).set(body).where(eq(planningFeasibilityTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/feasibility/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningFeasibilityTable).where(eq(planningFeasibilityTable.id, id));
  res.json({ ok: true });
});

export default router;
