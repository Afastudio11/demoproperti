import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { planningSiteplanShapesTable, unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUnitBody, UpdateUnitBody } from "@workspace/api-zod";
import { resolveSubkonMaster } from "../lib/subkon-master";
import { findSubkonContract } from "../lib/production-relations";

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
    const master = await resolveSubkonMaster({
      subkonId: (req.body as { subkonId?: unknown }).subkonId,
      subkonName: (req.body as { subkonName?: unknown }).subkonName,
      allowCreate: false,
    });
    const subkonName = master?.name ?? null;
    const stageCode = typeof req.body.stageCode === "string" ? req.body.stageCode || null : null;
    const contract = await findSubkonContract({
      contractId: (req.body as { contractId?: unknown }).contractId,
      projectId: body.projectId,
      stageCode,
      subkonName,
    });
    const [unit] = await db.insert(unitsTable).values({
      ...body,
      contractId: contract?.id ?? null,
      stageCode,
      subkonId: master?.id ?? null,
      subkonName,
    }).returning();
    res.status(201).json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create unit");
    res.status((err as { statusCode?: number }).statusCode ?? 400).json({ error: (err as Error).message ?? "Invalid request" });
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
    const raw = req.body as { adminStatus?: unknown; htValue?: unknown; stageCode?: unknown; contractId?: unknown; subkonId?: unknown; subkonName?: unknown };
    const rawSubkonName = (req.body as { subkonName?: unknown }).subkonName;
    const [existing] = await db.select().from(unitsTable).where(eq(unitsTable.id, parseInt(req.params.id)));
    if (!existing) return res.status(404).json({ error: "Not found" });
    let values: Record<string, unknown> = { ...body };
    if (typeof raw.adminStatus === "string") values.adminStatus = raw.adminStatus;
    if (raw.htValue !== undefined) values.htValue = raw.htValue === null ? null : Number(raw.htValue);
    if (typeof raw.stageCode === "string") values.stageCode = raw.stageCode || null;

    if (Object.prototype.hasOwnProperty.call(req.body, "subkonName") || Object.prototype.hasOwnProperty.call(req.body, "subkonId") || Object.prototype.hasOwnProperty.call(req.body, "contractId") || Object.prototype.hasOwnProperty.call(req.body, "stageCode")) {
      const master = Object.prototype.hasOwnProperty.call(req.body, "subkonName") || Object.prototype.hasOwnProperty.call(req.body, "subkonId")
        ? await resolveSubkonMaster({ subkonId: raw.subkonId, subkonName: rawSubkonName, allowCreate: false })
        : null;
      const subkonName = master?.name ?? existing.subkonName;
      const contract = await findSubkonContract({
        contractId: raw.contractId ?? existing.contractId,
        projectId: existing.projectId,
        stageCode: typeof raw.stageCode === "string" ? raw.stageCode || null : existing.stageCode,
        subkonName,
      });
      values = { ...values, contractId: contract?.id ?? null, subkonId: contract?.subkonId ?? master?.id ?? existing.subkonId ?? null, subkonName: contract?.subkonName ?? subkonName };
    }
    const [unit] = await db.update(unitsTable).set(values).where(eq(unitsTable.id, parseInt(req.params.id))).returning();
    if (!unit) return res.status(404).json({ error: "Not found" });
    const shapeValues: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(values, "progress")) shapeValues.progress = values.progress;
    if (Object.prototype.hasOwnProperty.call(values, "status")) shapeValues.unitStatus = values.status;
    if (Object.prototype.hasOwnProperty.call(values, "subkonName")) shapeValues.subkonName = values.subkonName;
    if (Object.prototype.hasOwnProperty.call(values, "subkonId")) shapeValues.subkonId = values.subkonId;
    if (Object.prototype.hasOwnProperty.call(values, "stageCode")) shapeValues.blockCode = values.stageCode;
    if (Object.keys(shapeValues).length > 0) {
      await db.update(planningSiteplanShapesTable).set(shapeValues).where(eq(planningSiteplanShapesTable.unitId, unit.id));
    }
    res.json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update unit");
    res.status((err as { statusCode?: number }).statusCode ?? 400).json({ error: (err as Error).message ?? "Invalid request" });
  }
});

export default router;
