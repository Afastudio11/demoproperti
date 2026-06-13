import { Router } from "express";
import { db } from "@workspace/db";
import {
  planningSiteplansTable,
  planningSiteplanShapesTable,
  planningLandBankTable,
  unitsTable,
  customersTable,
} from "@workspace/db/schema";
import { eq, like, and, ne, desc } from "drizzle-orm";

const router = Router();

const PURCHASE_TO_LB_STATUS: Record<string, string> = {
  belum_dibeli: "on_hold",
  proses_nego: "in_progress",
  dp: "in_progress",
  lunas: "land_bank",
  sudah_dibeli: "land_bank",
  milik_sendiri: "land_bank",
};

function parseUnitLabel(label: string) {
  const trimmed = String(label ?? "").trim();
  const match = trimmed.match(/^([A-Za-z]+)[-\s_]*(\d+[A-Za-z]?)$/);
  if (!match) return { blok: trimmed.split(/[-\s_]/)[0] || "A", nomor: trimmed.split(/[-\s_]/).slice(1).join("-") || trimmed || "1" };
  return { blok: match[1].toUpperCase(), nomor: match[2] };
}

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

async function syncBidangToLandBank(row: typeof planningSiteplanShapesTable.$inferSelect) {
  if (row.shapeType !== "bidang") return;
  const lbStatus = PURCHASE_TO_LB_STATUS[String(row.purchaseStatus ?? "")] ?? "on_hold";
  const notes = `Auto-sync dari bidang siteplan #${row.id}${row.ownerName ? ` (${row.ownerName})` : ""}`;
  const values = {
    projectId: row.projectId,
    name: row.label,
    status: lbStatus,
    landArea: row.landArea ?? null,
    ownerName: row.ownerName ?? null,
    availableUnits: row.plannedUnits ?? null,
    acquisitionPrice: row.price ?? null,
    notes,
  };
  // Find by shape ID (canonical key) first
  const byId = await db.select().from(planningLandBankTable).where(like(planningLandBankTable.notes, `%siteplan #${row.id}%`));
  if (byId.length > 0) {
    await db.update(planningLandBankTable).set(values).where(eq(planningLandBankTable.id, byId[0].id));
    // Delete any extra LB rows with same label that don't belong to this shape
    const extras = await db.select().from(planningLandBankTable)
      .where(and(eq(planningLandBankTable.name, row.label), ne(planningLandBankTable.id, byId[0].id)));
    for (const extra of extras) {
      await db.delete(planningLandBankTable).where(eq(planningLandBankTable.id, extra.id));
    }
    return;
  }
  // Find by label as fallback (merges orphan entries from deleted/renamed shapes)
  const byLabel = await db.select().from(planningLandBankTable).where(eq(planningLandBankTable.name, row.label));
  if (byLabel.length > 0) {
    await db.update(planningLandBankTable).set(values).where(eq(planningLandBankTable.id, byLabel[0].id));
    // Delete extras with same label
    for (const extra of byLabel.slice(1)) {
      await db.delete(planningLandBankTable).where(eq(planningLandBankTable.id, extra.id));
    }
    return;
  }
  await db.insert(planningLandBankTable).values(values);
}

router.post("/planning/siteplan/sync-all-landbank", async (req, res) => {
  const allShapes = await db.select().from(planningSiteplanShapesTable);
  const bidangShapes = allShapes.filter(s => s.shapeType === "bidang");
  let synced = 0;
  for (const shape of bidangShapes) {
    try { await syncBidangToLandBank(shape); synced++; } catch {}
  }
  res.json({ synced, total: bidangShapes.length });
});

router.get("/planning/siteplan", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.projectId, projectId))
    : await db.select().from(planningSiteplansTable);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/planning/siteplan", async (req, res) => {
  const { projectId } = req.body;
  const [row] = await db.insert(planningSiteplansTable).values(req.body).returning();
  
  if (row && projectId) {
    // 1. Copy shapes from the most recent previous siteplan
    const [latestPrevSiteplan] = await db.select()
      .from(planningSiteplansTable)
      .where(and(eq(planningSiteplansTable.projectId, projectId), ne(planningSiteplansTable.id, row.id)))
      .orderBy(desc(planningSiteplansTable.id))
      .limit(1);
      
    if (latestPrevSiteplan) {
      const oldShapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, latestPrevSiteplan.id));
      if (oldShapes.length > 0) {
        const newShapes = oldShapes.map(s => {
          const { id, createdAt, updatedAt, ...rest } = s;
          return {
            ...rest,
            siteplanId: row.id,
          };
        });
        await db.insert(planningSiteplanShapesTable).values(newShapes);
      }
    }

    // 2. Delete all older siteplans of this project (and their shapes) to prevent duplicate database size ballooning
    const olderSiteplans = await db.select()
      .from(planningSiteplansTable)
      .where(and(eq(planningSiteplansTable.projectId, projectId), ne(planningSiteplansTable.id, row.id)));
      
    for (const oldPlan of olderSiteplans) {
      await db.delete(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, oldPlan.id));
      await db.delete(planningSiteplansTable).where(eq(planningSiteplansTable.id, oldPlan.id));
    }
  }

  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.patch("/planning/siteplan/:id", async (req, res) => {
  req.log.info({ body: req.body }, "PATCH siteplan start");
  const { title, imageDataUrl, mainPolygon, imageTransform, isLocked } = req.body;
  
  const updateFields: Record<string, any> = {};
  if (title !== undefined) updateFields.title = title;
  if (imageDataUrl !== undefined) updateFields.imageDataUrl = imageDataUrl;
  if (mainPolygon !== undefined) updateFields.mainPolygon = mainPolygon;
  if (imageTransform !== undefined) updateFields.imageTransform = imageTransform;
  if (isLocked !== undefined) updateFields.isLocked = typeof isLocked === "boolean" ? (isLocked ? 1 : 0) : isLocked;

  const [row] = await db.update(planningSiteplansTable).set(updateFields).where(eq(planningSiteplansTable.id, Number(req.params.id))).returning();
  req.log.info({ row }, "PATCH siteplan success");
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.get("/planning/siteplan/:id/shapes", async (req, res) => {
  const siteplanId = Number(req.params.id);
  const [currentSiteplan] = await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.id, siteplanId));
  
  let currentShapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, siteplanId));

  if (currentSiteplan) {
    const projectId = currentSiteplan.projectId;
    // Find all older/other siteplans of this project, ordered by ID descending
    const otherPlans = await db.select()
      .from(planningSiteplansTable)
      .where(and(eq(planningSiteplansTable.projectId, projectId), ne(planningSiteplansTable.id, siteplanId)))
      .orderBy(desc(planningSiteplansTable.id));
      
    // We will collect shapes to copy
    const toCopy: any[] = [];
    const existingKeys = new Set(currentShapes.map(s => `${s.shapeType}:${s.label}`));
    
    // Look at older plans to find shapes to clone
    for (const plan of otherPlans) {
      const oldShapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, plan.id));
      for (const oldShape of oldShapes) {
        const key = `${oldShape.shapeType}:${oldShape.label}`;
        if (!existingKeys.has(key)) {
          const { id, createdAt, updatedAt, ...rest } = oldShape;
          toCopy.push({
            ...rest,
            siteplanId,
          });
          // Add to set to prevent duplicate copying if there are multiple older versions
          existingKeys.add(key);
        }
      }
    }
    
    if (toCopy.length > 0) {
      const inserted = await db.insert(planningSiteplanShapesTable).values(toCopy).returning();
      currentShapes.push(...inserted);
    }
  }

  // Background auto-sync: all bidang shapes → Land Bank (non-blocking)
  currentShapes.filter(r => r.shapeType === "bidang").forEach(r => syncBidangToLandBank(r).catch(() => {}));
  res.json(await Promise.all(currentShapes.map(enrichShape)));
});

router.get("/planning/siteplan-shapes", async (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const rows = projectId
    ? await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId))
    : await db.select().from(planningSiteplanShapesTable);
  res.json(await Promise.all(rows.map(enrichShape)));
});

router.post("/planning/siteplan/:id/shapes", async (req, res) => {
  const siteplanId = Number(req.params.id);
  const [siteplan] = await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.id, siteplanId));
  if (!siteplan) return res.status(404).json({ error: "Siteplan tidak ditemukan" });
  const body = { ...req.body };
  if (typeof body.isLocked === "boolean") body.isLocked = body.isLocked ? 1 : 0;
  // Cek label duplikat dalam siteplan yang sama
  if (body.label) {
    const dup = await db.select().from(planningSiteplanShapesTable)
      .where(and(eq(planningSiteplanShapesTable.siteplanId, siteplanId), eq(planningSiteplanShapesTable.label, String(body.label))));
    if (dup.length > 0) return res.status(409).json({ error: `Label "${body.label}" sudah ada di siteplan ini. Gunakan label lain.` });
  }
  const [row] = await db.insert(planningSiteplanShapesTable).values({ ...body, siteplanId, projectId: siteplan.projectId }).returning();
  try { await syncBidangToLandBank(row); } catch {}
  res.status(201).json(await enrichShape(row));
});

router.patch("/planning/siteplan/shapes/:shapeId", async (req, res) => {
  const shapeId = Number(req.params.shapeId);
  const body = { ...req.body };
  if (typeof body.isLocked === "boolean") body.isLocked = body.isLocked ? 1 : 0;
  // Cek label duplikat jika label diubah
  if (body.label) {
    const [current] = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
    if (current) {
      const dup = await db.select().from(planningSiteplanShapesTable)
        .where(and(eq(planningSiteplanShapesTable.siteplanId, current.siteplanId), eq(planningSiteplanShapesTable.label, String(body.label)), ne(planningSiteplanShapesTable.id, shapeId)));
      if (dup.length > 0) return res.status(409).json({ error: `Label "${body.label}" sudah dipakai shape lain. Gunakan label yang berbeda.` });
    }
  }
  const [row] = await db.update(planningSiteplanShapesTable).set(body).where(eq(planningSiteplanShapesTable.id, shapeId)).returning();
  if (!row) return res.status(404).json({ error: "Shape tidak ditemukan" });
  if (row.shapeType === "unit" && row.unitId) {
    const values: Record<string, unknown> = {};
    if ("progress" in req.body) values.progress = Number(req.body.progress);
    if ("unitStatus" in req.body) values.status = req.body.unitStatus;
    if ("subkonName" in req.body) values.subkonName = req.body.subkonName;
    if (Object.keys(values).length > 0) await db.update(unitsTable).set(values).where(eq(unitsTable.id, row.unitId));
  }
  try { await syncBidangToLandBank(row); } catch {}
  res.json(await enrichShape(row));
});

router.post("/planning/siteplan/shapes/:shapeId/create-unit", async (req, res) => {
  const [shape] = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, Number(req.params.shapeId)));
  if (!shape) return res.status(404).json({ error: "Shape tidak ditemukan" });
  if (shape.shapeType !== "unit") return res.status(400).json({ error: "Shape bukan unit rumah" });
  if (shape.unitId) {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, shape.unitId));
    if (unit) return res.json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  }

  const { blok, nomor } = parseUnitLabel(shape.label);
  const existingUnits = await db.select().from(unitsTable).where(eq(unitsTable.projectId, shape.projectId));
  const existing = existingUnits.find(unit => unit.blok.toLowerCase() === blok.toLowerCase() && unit.nomor.toLowerCase() === nomor.toLowerCase());
  const unit = existing ?? (await db.insert(unitsTable).values({
    projectId: shape.projectId,
    blok,
    nomor,
    tipe: shape.unitType || "Tipe 36",
    harga: 0,
    status: shape.unitStatus || "available",
    progress: Number(shape.progress ?? 0),
    stageCode: shape.blockCode || null,
    subkonName: shape.subkonName || null,
  }).returning())[0];

  await db.update(planningSiteplanShapesTable).set({ unitId: unit.id }).where(eq(planningSiteplanShapesTable.id, shape.id));
  res.status(existing ? 200 : 201).json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
});

router.delete("/planning/siteplan/shapes/:shapeId", async (req, res) => {
  const shapeId = Number(req.params.shapeId);
  const [shape] = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
  await db.delete(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
  if (shape?.shapeType === "bidang") {
    await db.delete(planningLandBankTable).where(like(planningLandBankTable.notes, `%siteplan #${shapeId}%`));
  }
  res.json({ ok: true });
});

export default router;
