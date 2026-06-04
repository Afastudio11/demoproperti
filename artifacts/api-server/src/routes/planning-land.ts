import { Router } from "express";
import { db } from "@workspace/db";
import { planningLandTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/land", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningLandTable).where(eq(planningLandTable.projectId, projectId))
    : await db.select().from(planningLandTable);
  res.json(rows);
});

router.post("/planning/land", async (req, res) => {
  const [row] = await db.insert(planningLandTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/land/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningLandTable).set(req.body).where(eq(planningLandTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/land/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningLandTable).where(eq(planningLandTable.id, id));
  res.json({ ok: true });
});

export default router;
