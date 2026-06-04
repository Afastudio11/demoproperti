import { Router } from "express";
import { db } from "@workspace/db";
import { planningFeasibilityTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/feasibility", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningFeasibilityTable).where(eq(planningFeasibilityTable.projectId, projectId))
    : await db.select().from(planningFeasibilityTable);
  res.json(rows);
});

router.post("/planning/feasibility", async (req, res) => {
  const [row] = await db.insert(planningFeasibilityTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/feasibility/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningFeasibilityTable).set(req.body).where(eq(planningFeasibilityTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/feasibility/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningFeasibilityTable).where(eq(planningFeasibilityTable.id, id));
  res.json({ ok: true });
});

export default router;
