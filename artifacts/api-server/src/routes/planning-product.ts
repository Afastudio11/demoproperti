import { Router } from "express";
import { db } from "@workspace/db";
import { planningProductTable, planningSiteplanShapesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
type PlanningProductInsert = typeof planningProductTable.$inferInsert;

async function applySiteplanTypeBaseline(body: PlanningProductInsert): Promise<PlanningProductInsert> {
  const projectId = Number(body.projectId);
  const houseType = String(body.houseType ?? "");
  if (!Number.isFinite(projectId) || !houseType) return body;
  const shapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId));
  const unitShapes = shapes.filter(shape => shape.shapeType === "unit");
  if (!unitShapes.length) return body;
  const count = unitShapes.filter(shape => String(shape.unitType || "Tipe 36") === houseType).length;
  if (count <= 0) {
    const available = [...new Set(unitShapes.map(shape => String(shape.unitType || "Tipe 36")))].join(", ");
    const err = new Error(`Tipe "${houseType}" tidak ada di siteplan. Tipe tersedia: ${available}`);
    (err as { statusCode?: number }).statusCode = 409;
    throw err;
  }
  return { ...body, unitCount: count };
}

router.get("/planning/product", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningProductTable).where(eq(planningProductTable.projectId, projectId))
    : await db.select().from(planningProductTable);
  res.json(rows);
});

router.post("/planning/product", async (req, res) => {
  try {
    const body = await applySiteplanTypeBaseline(req.body as PlanningProductInsert);
    const [row] = await db.insert(planningProductTable).values(body).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status((err as { statusCode?: number }).statusCode ?? 500).json({ error: (err as Error).message });
  }
});

router.patch("/planning/product/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(planningProductTable).where(eq(planningProductTable.id, id));
    const body = await applySiteplanTypeBaseline({ ...existing, ...req.body } as PlanningProductInsert);
    const [row] = await db.update(planningProductTable).set(body).where(eq(planningProductTable.id, id)).returning();
    res.json(row);
  } catch (err) {
    res.status((err as { statusCode?: number }).statusCode ?? 500).json({ error: (err as Error).message });
  }
});

router.delete("/planning/product/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(planningProductTable).where(eq(planningProductTable.id, id));
  res.json({ ok: true });
});

export default router;
