import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { handoversTable, unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateHandoverBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/handovers", async (req, res) => {
  try {
    let handovers = await db.select().from(handoversTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      const units = await db.select().from(unitsTable).where(eq(unitsTable.projectId, pid));
      const unitIds = new Set(units.map(u => u.id));
      handovers = handovers.filter(h => unitIds.has(h.unitId));
    }
    res.json(handovers.map(h => ({ ...h, skorKepuasan: h.skorKepuasan ?? null, catatan: h.catatan ?? null, createdAt: h.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list handovers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/handovers", async (req, res) => {
  try {
    const body = CreateHandoverBody.parse(req.body);
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, body.unitId));
    if (!unit) return res.status(404).json({ error: "Unit not found" });
    if (!unit.readyAkad) return res.status(400).json({ error: "Unit belum ready akad" });

    const [handover] = await db.insert(handoversTable).values({ ...body, bastGenerated: true }).returning();
    await db.update(unitsTable).set({ status: "serah_terima" }).where(eq(unitsTable.id, body.unitId));
    res.status(201).json({ ...handover, skorKepuasan: handover.skorKepuasan ?? null, catatan: handover.catatan ?? null, createdAt: handover.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create handover");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/handovers/:id", async (req, res) => {
  try {
    const [handover] = await db.select().from(handoversTable).where(eq(handoversTable.id, parseInt(req.params.id)));
    if (!handover) return res.status(404).json({ error: "Not found" });
    res.json({ ...handover, skorKepuasan: handover.skorKepuasan ?? null, catatan: handover.catatan ?? null, createdAt: handover.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get handover");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
