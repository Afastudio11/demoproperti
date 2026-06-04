import { Router } from "express";
import { db } from "@workspace/db";
import { planningProductTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/product", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningProductTable).where(eq(planningProductTable.projectId, projectId))
    : await db.select().from(planningProductTable);
  res.json(rows);
});

router.post("/planning/product", async (req, res) => {
  const [row] = await db.insert(planningProductTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/product/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningProductTable).set(req.body).where(eq(planningProductTable.id, id)).returning();
  res.json(row);
});

router.delete("/planning/product/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningProductTable).where(eq(planningProductTable.id, id));
  res.json({ ok: true });
});

export default router;
