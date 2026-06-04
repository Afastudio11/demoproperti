import { Router } from "express";
import { db } from "@workspace/db";
import { planningMarketTable, planningCompetitorsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/planning/market", async (_req, res) => {
  const rows = await db.select().from(planningMarketTable).orderBy(planningMarketTable.id);
  res.json(rows);
});

router.get("/planning/market/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(planningMarketTable).where(eq(planningMarketTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  const competitors = await db.select().from(planningCompetitorsTable).where(eq(planningCompetitorsTable.marketId, id));
  res.json({ ...row, competitors });
});

router.post("/planning/market", async (req, res) => {
  const { competitors, ...data } = req.body;
  const [row] = await db.insert(planningMarketTable).values(data).returning();
  if (competitors?.length && row) {
    await db.insert(planningCompetitorsTable).values(competitors.map((c: Record<string, unknown>) => ({ ...c, marketId: row.id })));
  }
  res.status(201).json(row);
});

router.patch("/planning/market/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { competitors, ...data } = req.body;
  const [row] = await db.update(planningMarketTable).set(data).where(eq(planningMarketTable.id, id)).returning();
  if (competitors !== undefined && row) {
    await db.delete(planningCompetitorsTable).where(eq(planningCompetitorsTable.marketId, id));
    if (competitors.length > 0) {
      await db.insert(planningCompetitorsTable).values(competitors.map((c: Record<string, unknown>) => ({ ...c, marketId: id })));
    }
  }
  res.json(row);
});

router.delete("/planning/market/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningCompetitorsTable).where(eq(planningCompetitorsTable.marketId, id));
  await db.delete(planningMarketTable).where(eq(planningMarketTable.id, id));
  res.json({ ok: true });
});

export default router;
