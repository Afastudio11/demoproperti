import { Router } from "express";
import { db } from "@workspace/db";
import {
  planningSiteplansTable,
  planningSiteplanShapesTable,
  planningLandBankTable,
  unitsTable,
  customersTable,
} from "@workspace/db/schema";
import { eq, like, and, ne, desc, inArray } from "drizzle-orm";

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

// Batch enrichment: 2 queries total regardless of shape count
async function enrichShapes(shapes: (typeof planningSiteplanShapesTable.$inferSelect)[]) {
  if (shapes.length === 0) return [];

  const unitIds = [...new Set(shapes.filter(s => s.unitId != null).map(s => s.unitId as number))];
  const customerIds = [...new Set(shapes.filter(s => s.customerId != null).map(s => s.customerId as number))];

  const [units, customers] = await Promise.all([
    unitIds.length > 0 ? db.select().from(unitsTable).where(inArray(unitsTable.id, unitIds)) : Promise.resolve([]),
    customerIds.length > 0 ? db.select().from(customersTable).where(inArray(customersTable.id, customerIds)) : Promise.resolve([]),
  ]);

  const unitMap = new Map(units.map(u => [u.id, u]));
  const customerMap = new Map(customers.map(c => [c.id, c]));

  return shapes.map(shape => {
    const unit = shape.unitId != null ? unitMap.get(shape.unitId) : undefined;
    const customer = shape.customerId != null ? customerMap.get(shape.customerId) : undefined;
    return {
      ...shape,
      progress: unit?.progress ?? shape.progress ?? 0,
      unitStatus: unit?.status ?? shape.unitStatus,
      customerName: customer?.nama ?? null,
      createdAt: shape.createdAt.toISOString(),
      updatedAt: shape.updatedAt.toISOString(),
    };
  });
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
  const byId = await db.select().from(planningLandBankTable).where(like(planningLandBankTable.notes, `%siteplan #${row.id}%`));
  if (byId.length > 0) {
    await db.update(planningLandBankTable).set(values).where(eq(planningLandBankTable.id, byId[0].id));
    const extras = await db.select().from(planningLandBankTable)
      .where(and(eq(planningLandBankTable.name, row.label), ne(planningLandBankTable.id, byId[0].id)));
    for (const extra of extras) {
      await db.delete(planningLandBankTable).where(eq(planningLandBankTable.id, extra.id));
    }
    return;
  }
  const byLabel = await db.select().from(planningLandBankTable).where(eq(planningLandBankTable.name, row.label));
  if (byLabel.length > 0) {
    await db.update(planningLandBankTable).set(values).where(eq(planningLandBankTable.id, byLabel[0].id));
    for (const extra of byLabel.slice(1)) {
      await db.delete(planningLandBankTable).where(eq(planningLandBankTable.id, extra.id));
    }
    return;
  }
  await db.insert(planningLandBankTable).values(values);
}

// Auto find-or-create unit for "unit" type shapes, returns unitId
async function autoLinkUnit(row: typeof planningSiteplanShapesTable.$inferSelect): Promise<number | null> {
  if (row.shapeType !== "unit") return null;
  if (row.unitId) {
    const [existing] = await db.select().from(unitsTable).where(eq(unitsTable.id, row.unitId));
    if (existing) return existing.id;
  }
  const { blok, nomor } = parseUnitLabel(row.label);
  const existingUnits = await db.select().from(unitsTable).where(eq(unitsTable.projectId, row.projectId));
  const found = existingUnits.find(u => u.blok.toLowerCase() === blok.toLowerCase() && u.nomor.toLowerCase() === nomor.toLowerCase());
  if (found) {
    // Sync status/progress from shape to unit
    const values: Record<string, unknown> = {};
    if (row.unitStatus) values.status = row.unitStatus;
    if (row.progress != null) values.progress = Number(row.progress);
    if (row.subkonName) values.subkonName = row.subkonName;
    if (row.blockCode) values.stageCode = row.blockCode;
    if (Object.keys(values).length > 0) {
      await db.update(unitsTable).set(values).where(eq(unitsTable.id, found.id));
    }
    return found.id;
  }
  const [created] = await db.insert(unitsTable).values({
    projectId: row.projectId,
    blok,
    nomor,
    tipe: row.unitType || "Tipe 36",
    harga: 0,
    status: row.unitStatus || "available",
    progress: Number(row.progress ?? 0),
    stageCode: row.blockCode || null,
    subkonName: row.subkonName || null,
  }).returning();
  return created.id;
}

router.post("/planning/siteplan/sync-all-landbank", async (req, res) => {
  try {
    const allShapes = await db.select().from(planningSiteplanShapesTable);
    const bidangShapes = allShapes.filter(s => s.shapeType === "bidang");
    let synced = 0;
    for (const shape of bidangShapes) {
      try { await syncBidangToLandBank(shape); synced++; } catch {}
    }
    res.json({ synced, total: bidangShapes.length });
  } catch (err) {
    res.status(500).json({ error: "Sync gagal" });
  }
});

router.post("/planning/siteplan/sync-all-units", async (req, res) => {
  try {
    const allShapes = await db.select().from(planningSiteplanShapesTable);
    const unitShapes = allShapes.filter(s => s.shapeType === "unit");
    let synced = 0;
    for (const shape of unitShapes) {
      try {
        const unitId = await autoLinkUnit(shape);
        if (unitId && unitId !== shape.unitId) {
          await db.update(planningSiteplanShapesTable).set({ unitId }).where(eq(planningSiteplanShapesTable.id, shape.id));
        }
        synced++;
      } catch {}
    }
    res.json({ synced, total: unitShapes.length });
  } catch (err) {
    res.status(500).json({ error: "Sync units gagal" });
  }
});

// List siteplans — EXCLUDES imageDataUrl for performance (can be large base64)
router.get("/planning/siteplan", async (req, res) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const rows = projectId
      ? await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.projectId, projectId))
      : await db.select().from(planningSiteplansTable);
    res.json(rows.map(r => {
      const { imageDataUrl: _img, ...rest } = r as any;
      return { ...rest, hasImage: !!_img, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
    }));
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil daftar siteplan" });
  }
});

// Get single siteplan detail including imageDataUrl
router.get("/planning/siteplan/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Siteplan tidak ditemukan" });
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil siteplan" });
  }
});

router.post("/planning/siteplan", async (req, res) => {
  try {
    const { projectId } = req.body;
    const [row] = await db.insert(planningSiteplansTable).values(req.body).returning();

    if (row && projectId) {
      // 1. Copy shapes from the most recent previous siteplan
      const [latestPrevSiteplan] = await db.select()
        .from(planningSiteplansTable)
        .where(and(eq(planningSiteplansTable.projectId, projectId), ne(planningSiteplansTable.id, row.id)))
        .orderBy(desc(planningSiteplansTable.id))
        .limit(1);

      let copiedShapes: (typeof planningSiteplanShapesTable.$inferSelect)[] = [];
      if (latestPrevSiteplan) {
        const oldShapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, latestPrevSiteplan.id));
        if (oldShapes.length > 0) {
          const newShapes = oldShapes.map(s => {
            const { id, createdAt, updatedAt, ...rest } = s;
            return { ...rest, siteplanId: row.id };
          });
          copiedShapes = await db.insert(planningSiteplanShapesTable).values(newShapes).returning();
        }
      }

      // 2. Delete all older siteplans (shapes already migrated)
      const olderSiteplans = await db.select()
        .from(planningSiteplansTable)
        .where(and(eq(planningSiteplansTable.projectId, projectId), ne(planningSiteplansTable.id, row.id)));

      for (const oldPlan of olderSiteplans) {
        await db.delete(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, oldPlan.id));
        await db.delete(planningSiteplansTable).where(eq(planningSiteplansTable.id, oldPlan.id));
      }

      // 3. Re-sync bidang shapes after copy (IDs changed, update land bank references)
      const bidangCopied = copiedShapes.filter(s => s.shapeType === "bidang");
      for (const shape of bidangCopied) {
        syncBidangToLandBank(shape).catch(() => {});
      }
    }

    res.status(201).json({ ...row, hasImage: !!row.imageDataUrl, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat siteplan" });
  }
});

router.patch("/planning/siteplan/:id", async (req, res) => {
  try {
    req.log.info({ body: req.body }, "PATCH siteplan start");
    const { title, imageDataUrl, mainPolygon, imageTransform, isLocked } = req.body;

    const updateFields: Record<string, any> = {};
    if (title !== undefined) updateFields.title = title;
    if (imageDataUrl !== undefined) updateFields.imageDataUrl = imageDataUrl;
    if (mainPolygon !== undefined) updateFields.mainPolygon = mainPolygon;
    if (imageTransform !== undefined) updateFields.imageTransform = imageTransform;
    if (isLocked !== undefined) updateFields.isLocked = typeof isLocked === "boolean" ? (isLocked ? 1 : 0) : isLocked;

    const [row] = await db.update(planningSiteplansTable).set(updateFields).where(eq(planningSiteplansTable.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Siteplan tidak ditemukan" });
    req.log.info({ id: row.id }, "PATCH siteplan success");
    res.json({ ...row, hasImage: !!row.imageDataUrl, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Gagal update siteplan" });
  }
});

// GET shapes — clean, fast, no writes, no side effects
router.get("/planning/siteplan/:id/shapes", async (req, res) => {
  try {
    const siteplanId = Number(req.params.id);
    const shapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.siteplanId, siteplanId));
    res.json(await enrichShapes(shapes));
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil shapes" });
  }
});

router.get("/planning/siteplan-shapes", async (req, res) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const rows = projectId
      ? await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId))
      : await db.select().from(planningSiteplanShapesTable);
    res.json(await enrichShapes(rows));
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil shapes" });
  }
});

router.post("/planning/siteplan/:id/shapes", async (req, res) => {
  try {
    const siteplanId = Number(req.params.id);
    const [siteplan] = await db.select().from(planningSiteplansTable).where(eq(planningSiteplansTable.id, siteplanId));
    if (!siteplan) return res.status(404).json({ error: "Siteplan tidak ditemukan" });

    const body = { ...req.body };
    if (typeof body.isLocked === "boolean") body.isLocked = body.isLocked ? 1 : 0;

    if (body.label) {
      const dup = await db.select().from(planningSiteplanShapesTable)
        .where(and(eq(planningSiteplanShapesTable.siteplanId, siteplanId), eq(planningSiteplanShapesTable.label, String(body.label))));
      if (dup.length > 0) return res.status(409).json({ error: `Label "${body.label}" sudah ada di siteplan ini. Gunakan label lain.` });
    }

    const [row] = await db.insert(planningSiteplanShapesTable).values({ ...body, siteplanId, projectId: siteplan.projectId }).returning();

    // Auto-link unit for unit shapes
    if (row.shapeType === "unit" && !row.unitId) {
      const unitId = await autoLinkUnit(row).catch(() => null);
      if (unitId) {
        await db.update(planningSiteplanShapesTable).set({ unitId }).where(eq(planningSiteplanShapesTable.id, row.id));
        (row as any).unitId = unitId;
      }
    }

    syncBidangToLandBank(row).catch(() => {});
    const [enriched] = await enrichShapes([row]);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Gagal menyimpan shape" });
  }
});

router.patch("/planning/siteplan/shapes/:shapeId", async (req, res) => {
  try {
    const shapeId = Number(req.params.shapeId);
    const body = { ...req.body };
    if (typeof body.isLocked === "boolean") body.isLocked = body.isLocked ? 1 : 0;

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

    // Sync unit data
    if (row.shapeType === "unit") {
      let unitId = row.unitId;
      if (!unitId) {
        // Auto-link if not yet linked
        unitId = await autoLinkUnit(row).catch(() => null);
        if (unitId) {
          await db.update(planningSiteplanShapesTable).set({ unitId }).where(eq(planningSiteplanShapesTable.id, row.id));
          (row as any).unitId = unitId;
        }
      }
      if (unitId) {
        const values: Record<string, unknown> = {};
        if ("progress" in req.body) values.progress = Number(req.body.progress);
        if ("unitStatus" in req.body) values.status = req.body.unitStatus;
        if ("subkonName" in req.body) values.subkonName = req.body.subkonName;
        if ("blockCode" in req.body) values.stageCode = req.body.blockCode;
        if (Object.keys(values).length > 0) {
          await db.update(unitsTable).set(values).where(eq(unitsTable.id, unitId));
        }
      }
    }

    syncBidangToLandBank(row).catch(() => {});
    const [enriched] = await enrichShapes([row]);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Gagal update shape" });
  }
});

router.post("/planning/siteplan/shapes/:shapeId/create-unit", async (req, res) => {
  try {
    const [shape] = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, Number(req.params.shapeId)));
    if (!shape) return res.status(404).json({ error: "Shape tidak ditemukan" });
    if (shape.shapeType !== "unit") return res.status(400).json({ error: "Shape bukan unit rumah" });

    if (shape.unitId) {
      const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, shape.unitId));
      if (unit) return res.json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
    }

    const unitId = await autoLinkUnit(shape);
    if (!unitId) return res.status(500).json({ error: "Gagal membuat unit" });

    await db.update(planningSiteplanShapesTable).set({ unitId }).where(eq(planningSiteplanShapesTable.id, shape.id));
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, unitId));
    res.status(201).json({ ...unit, customerId: unit.customerId ?? null, createdAt: unit.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat unit" });
  }
});

router.delete("/planning/siteplan/shapes/:shapeId", async (req, res) => {
  try {
    const shapeId = Number(req.params.shapeId);
    const [shape] = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
    await db.delete(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
    if (shape?.shapeType === "bidang") {
      await db.delete(planningLandBankTable).where(like(planningLandBankTable.notes, `%siteplan #${shapeId}%`));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus shape" });
  }
});

export default router;
