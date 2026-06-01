import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { qcDefectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateQcDefectBody, UpdateQcDefectBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/qc/defects", async (req, res) => {
  try {
    let defects = await db.select().from(qcDefectsTable);
    if (req.query.unitId) {
      const uid = parseInt(req.query.unitId as string);
      defects = defects.filter(d => d.unitId === uid);
    }
    if (req.query.status) {
      defects = defects.filter(d => d.status === req.query.status);
    }
    res.json(defects.map(d => ({ ...d, verifiedBy: d.verifiedBy ?? null, createdAt: d.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list QC defects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/qc/defects", async (req, res) => {
  try {
    const body = CreateQcDefectBody.parse(req.body);
    const [defect] = await db.insert(qcDefectsTable).values(body).returning();
    res.status(201).json({ ...defect, verifiedBy: defect.verifiedBy ?? null, createdAt: defect.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create QC defect");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/qc/defects/:id", async (req, res) => {
  try {
    const body = UpdateQcDefectBody.parse(req.body);
    const [defect] = await db.update(qcDefectsTable).set(body).where(eq(qcDefectsTable.id, parseInt(req.params.id))).returning();
    if (!defect) return res.status(404).json({ error: "Not found" });
    res.json({ ...defect, verifiedBy: defect.verifiedBy ?? null, createdAt: defect.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update QC defect");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
