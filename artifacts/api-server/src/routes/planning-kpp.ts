import { Router } from "express";
import { db } from "@workspace/db";
import { planningKppTable, planningHtTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/kpp", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningKppTable).where(eq(planningKppTable.projectId, projectId))
    : await db.select().from(planningKppTable);
  res.json(rows);
});

router.post("/planning/kpp", async (req, res) => {
  const [row] = await db.insert(planningKppTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/kpp/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningKppTable).set(req.body).where(eq(planningKppTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/kpp/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningKppTable).where(eq(planningKppTable.id, id));
  res.json({ ok: true });
});

router.get("/planning/ht", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningHtTable).where(eq(planningHtTable.projectId, projectId))
    : await db.select().from(planningHtTable);
  res.json(rows);
});

router.post("/planning/ht", async (req, res) => {
  const [row] = await db.insert(planningHtTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/ht/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningHtTable).set(req.body).where(eq(planningHtTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/ht/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningHtTable).where(eq(planningHtTable.id, id));
  res.json({ ok: true });
});

export default router;
