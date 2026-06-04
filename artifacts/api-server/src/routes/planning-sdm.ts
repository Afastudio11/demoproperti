import { Router } from "express";
import { db } from "@workspace/db";
import { planningSDMTable } from "@workspace/db/schema";

const router = Router();

router.get("/planning/sdm", async (_req, res) => {
  const rows = await db.select().from(planningSDMTable);
  res.json(rows[0] ?? null);
});

router.post("/planning/sdm", async (req, res) => {
  const existing = await db.select().from(planningSDMTable);
  if (existing.length > 0) {
    const [row] = await db.update(planningSDMTable).set(req.body).returning();
    return res.json(row);
  }
  const [row] = await db.insert(planningSDMTable).values(req.body).returning();
  res.status(201).json(row);
});

export default router;
