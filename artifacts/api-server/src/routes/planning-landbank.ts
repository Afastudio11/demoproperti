import { Router } from "express";
import { db } from "@workspace/db";
import { planningLandBankTable, planningExpansionTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/landbank", async (_req, res) => {
  const rows = await db.select().from(planningLandBankTable).orderBy(planningLandBankTable.id);
  res.json(rows);
});

router.post("/planning/landbank", async (req, res) => {
  const [row] = await db.insert(planningLandBankTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/landbank/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningLandBankTable).set(req.body).where(eq(planningLandBankTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/landbank/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningLandBankTable).where(eq(planningLandBankTable.id, id));
  res.json({ ok: true });
});

router.get("/planning/expansion", async (_req, res) => {
  const rows = await db.select().from(planningExpansionTable).orderBy(planningExpansionTable.id);
  res.json(rows);
});

router.post("/planning/expansion", async (req, res) => {
  const [row] = await db.insert(planningExpansionTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/expansion/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningExpansionTable).set(req.body).where(eq(planningExpansionTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/expansion/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningExpansionTable).where(eq(planningExpansionTable.id, id));
  res.json({ ok: true });
});

export default router;
