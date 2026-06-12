import { Router } from "express";
import { db } from "@workspace/db";
import {
  planningSiteplansTable,
  planningSiteplanShapesTable,
  planningLandBankTable,
  unitsTable,
  customersTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const BOUGHT = new Set(["lunas", "sudah_dibeli", "milik_sendiri"]);

async function enrichShape(shape: typeof planningSiteplanShapesTable.$inferSelect) {
  const [unit] = shape.unitId ? await db.select().from(unitsTable).where(eq(unitsTable.id, shape.unitId)) : [];
  const [customer] = shape.customerId ? await db.select().from(customersTable).where(eq(customersTable.id, shape.customerId)) : [];
  return {
    ...shape,
    progress: unit?.progress ?? shape.progress ?? 0,
    unitStatus: unit?.status ?? shape.unitStatus,
    customerName: customer?.nama ?? null,
    createdAt: shape.createdAt.toISOString(),
    updatedAt: shape.updatedAt.toISOString(),
  };
}

async function syncBoughtShapeToLandBank(row: typeof planningSiteplanShapesTable.$inferSelect) {
  if (row.shapeType !== "bidang" || !BOUGHT.has(String(row.purchaseStatus ?? ""))) return;
  const notes = `Auto-sync dari bidang siteplan #${row.id}${row.ownerName ? ` (${row.ownerName})` : ""}`;
  const existingRows = await db.select().from(planningLandBankTable).where(eq(planningLandBankTable.projectId, row.projectId));
  const existing = existingRows.find(item => String(item.notes ?? "").includes(`siteplan #${row.id}`));
  const values = {
    projectId: row.projectId,
    name: row.label,
    status: "land_bank",
    landArea: row.landArea ?? null,
    availableUnits: row.plannedUnits ?? null,
    acquisitionPrice: row.price ?? null,
    notes,
  };
  if (existing) {
    await db.update(planningLandBankTable).set(values).where(eq(planningLandBankTable.id, existing.id));
    return;
  }
  await db.insert(planningLandBankTable).values(values);
}

router.get("/planning/siteplan", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.projectId, projectId))
    : await db.select().from(planningSiteplansTable);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/planning/siteplan", async (req, res) => {
  const [row] = await db.insert(planningSiteplansTable).values(req.body).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.patch("/planning/siteplan/:id", async (req, res) => {
  const [row] = await db.update(planningSiteplansTable).set(req.body).where(eq(planningSiteplansTable.id, Number(req.params.id))).returning();
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.get("/planning/siteplan/:id/shapes", async (req, res) => {
  const rows = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, Number(req.params.id)));
  res.json(await Promise.all(rows.map(enrichShape)));
});

router.post("/planning/siteplan/:id/shapes", async (req, res) => {
  const siteplanId = Number(req.params.id);
  const [siteplan] = await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.id, siteplanId));
  if (!siteplan) return res.status(404).json({ error: "Siteplan tidak ditemukan" });
  const [row] = await db.insert(planningSiteplanShapesTable).values({ ...req.body, siteplanId, projectId: siteplan.projectId }).returning();
  await syncBoughtShapeToLandBank(row);
  res.status(201).json(await enrichShape(row));
});

router.patch("/planning/siteplan/shapes/:shapeId", async (req, res) => {
  const [row] = await db.update(planningSiteplanShapesTable).set(req.body).where(eq(planningSiteplanShapesTable.id, Number(req.params.shapeId))).returning();
  if (!row) return res.status(404).json({ error: "Shape tidak ditemukan" });
  if (row.shapeType === "unit" && row.unitId) {
    const values: Record<string, unknown> = {};
    if ("progress" in req.body) values.progress = Number(req.body.progress);
    if ("unitStatus" in req.body) values.status = req.body.unitStatus;
    if ("subkonName" in req.body) values.subkonName = req.body.subkonName;
    if (Object.keys(values).length > 0) await db.update(unitsTable).set(values).where(eq(unitsTable.id, row.unitId));
  }
  await syncBoughtShapeToLandBank(row);
  res.json(await enrichShape(row));
});

router.delete("/planning/siteplan/shapes/:shapeId", async (req, res) => {
  await db.delete(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, Number(req.params.shapeId)));
  res.json({ ok: true });
});

export default router;
