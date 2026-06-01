import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUnitBody, UpdateUnitBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/units", async (req, res) => {
  try {
    let units = await db.select().from(unitsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      units = units.filter(u => u.projectId === pid);
    }
    if (req.query.status) {
      units = units.filter(u => u.status === req.query.status);
    }
    res.json(units.map(u => ({ ...u, customerId: u.customerId ?? null, createdAt: u.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list units");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/units", async (req, res) => {
  try {
    const body = CreateUnitBody.parse(req.body);
    const [unit] = await db.insert(unitsTable).values(body).returning();
    res.status(201).json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create unit");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/units/:id", async (req, res) => {
  try {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, parseInt(req.params.id)));
    if (!unit) return res.status(404).json({ error: "Not found" });
    res.json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get unit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/units/:id", async (req, res) => {
  try {
    const body = UpdateUnitBody.parse(req.body);
    const [unit] = await db.update(unitsTable).set(body).where(eq(unitsTable.id, parseInt(req.params.id))).returning();
    if (!unit) return res.status(404).json({ error: "Not found" });
    res.json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update unit");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
