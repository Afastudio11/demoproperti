import { Router } from "express";
import { db } from "@workspace/db";
import { planningCashflowTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
type PlanningCashflowInsert = typeof planningCashflowTable.$inferInsert;

router.get("/planning/cashflow", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningCashflowTable).where(eq(planningCashflowTable.projectId, projectId)).orderBy(planningCashflowTable.monthNumber)
    : await db.select().from(planningCashflowTable).orderBy(planningCashflowTable.monthNumber);
  res.json(rows);
});

router.post("/planning/cashflow/bulk", async (req, res) => {
  const { projectId, entries } = req.body as { projectId: number; entries: Partial<PlanningCashflowInsert>[] };
  if (!Number.isFinite(Number(projectId))) {
    res.status(400).json({ error: "Project wajib dipilih" });
    return;
  }
  const rowsToInsert = entries.map((entry, index) => {
    const monthNumber = Number(entry.monthNumber ?? index + 1);
    if (!Number.isFinite(monthNumber) || monthNumber <= 0) {
      throw new Error("monthNumber wajib diisi untuk setiap cashflow");
    }
    return { ...entry, projectId: Number(projectId), monthNumber } satisfies PlanningCashflowInsert;
  });
  await db.delete(planningCashflowTable).where(eq(planningCashflowTable.projectId, projectId));
  const rows = rowsToInsert.length > 0
    ? await db.insert(planningCashflowTable).values(rowsToInsert).returning()
    : [];
  res.json(rows);
});

router.post("/planning/cashflow", async (req, res) => {
  const [row] = await db.insert(planningCashflowTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/planning/cashflow/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(planningCashflowTable).set(req.body).where(eq(planningCashflowTable.id, id)).returning();
  res.json(row);
});

export default router;
