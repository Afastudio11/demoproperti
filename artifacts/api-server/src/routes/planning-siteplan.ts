import { Router } from "express";
import { db } from "@workspace/db";
import {
  planningSiteplansTable,
  planningSiteplanShapesTable,
  planningLandBankTable,
  unitsTable,
  customersTable,
  constructionTasksTable,
  akadRecordsTable,
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

function validateUnitShapePayload(body: Record<string, unknown>) {
  const label = String(body.label ?? "").trim();
  if (body.shapeType === "unit") {
    if (!label.match(/^([A-Za-z]+)[-\s_]*(\d+[A-Za-z]?)$/)) return "Label unit wajib format blok-nomor, contoh A-01.";
  } else {
    if (!label) return "Label wajib diisi.";
  }
  if (!Array.isArray(body.polygon) || body.polygon.length < 3) {
    return "Polygon shape wajib memiliki minimal 3 titik koordinat.";
  }
  if (!String(body.unitType ?? "").trim()) body.unitType = "Tipe 36";
  return null;
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
      createdAt: shape.createdAt ? (typeof shape.createdAt === "string" ? shape.createdAt : shape.createdAt.toISOString?.() ?? String(shape.createdAt)) : new Date().toISOString(),
      updatedAt: shape.updatedAt ? (typeof shape.updatedAt === "string" ? shape.updatedAt : shape.updatedAt.toISOString?.() ?? String(shape.updatedAt)) : new Date().toISOString(),
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
  if (row.shapeType !== "unit" && row.shapeType !== "fasum") return null;
  const { blok, nomor } = parseUnitLabel(row.label);
  if (row.unitId) {
    const [existing] = await db.select().from(unitsTable).where(eq(unitsTable.id, row.unitId));
    if (
      existing &&
      existing.projectId === row.projectId &&
      existing.blok.toLowerCase() === blok.toLowerCase() &&
      existing.nomor.toLowerCase() === nomor.toLowerCase()
    ) {
      return existing.id;
    }
  }
  const existingUnits = await db.select().from(unitsTable).where(eq(unitsTable.projectId, row.projectId));
  const found = existingUnits.find(u => u.blok.toLowerCase() === blok.toLowerCase() && u.nomor.toLowerCase() === nomor.toLowerCase());
  if (found) {
    // Sync status/progress from shape to unit
    const values: Record<string, unknown> = {};
    if (row.unitStatus) values.status = row.unitStatus;
    if (row.progress != null) values.progress = Number(row.progress);
    if (row.subkonName) values.subkonName = row.subkonName;
    if (row.subkonId) values.subkonId = row.subkonId;
    if (row.stageCode || row.blockCode) {
      values.stageCode = row.stageCode || (/^T?\d+$/i.test(row.blockCode ?? "") ? row.blockCode : null);
    }
    if (Object.keys(values).length > 0) {
      await db.update(unitsTable).set(values).where(eq(unitsTable.id, found.id));
    }
    return found.id;
  }
  const [created] = await db.insert(unitsTable).values({
    projectId: row.projectId,
    blok,
    nomor,
    tipe: row.unitType || (row.shapeType === "fasum" ? "Fasum" : "Tipe 36"),
    harga: 0,
    status: row.unitStatus || "available",
    progress: Number(row.progress ?? 0),
    stageCode: row.stageCode || (/^T?\d+$/i.test(row.blockCode ?? "") ? row.blockCode : null),
    subkonId: row.subkonId || null,
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

    // Auto-link unit shapes so they automatically become units in unitsTable
    const unitShapes = rows.filter(s => String(s.shapeType ?? "").toLowerCase() === "unit");
    if (unitShapes.length > 0) {
      for (const shape of unitShapes) {
        try {
          const unitId = await autoLinkUnit(shape);
          if (unitId && unitId !== shape.unitId) {
            await db.update(planningSiteplanShapesTable).set({ unitId }).where(eq(planningSiteplanShapesTable.id, shape.id));
            (shape as any).unitId = unitId;
          }
        } catch {
          // ignore individual sync errors
        }
      }
    }

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

    // Clean up empty strings for numeric/integer fields to avoid PostgreSQL errors
    const numFields = ["landArea", "price", "plannedUnits", "unitId", "subkonId", "progress", "customerId", "sortOrder"];
    for (const field of numFields) {
      if (field in body) {
        if (body[field] === "" || body[field] === null || body[field] === "none") {
          body[field] = null;
        } else {
          const val = Number(body[field]);
          body[field] = isNaN(val) ? null : val;
        }
      }
    }

    const validationError = validateUnitShapePayload(body);
    if (validationError) return res.status(400).json({ error: validationError });

    if (body.label) {
      const dup = await db.select().from(planningSiteplanShapesTable)
        .where(and(eq(planningSiteplanShapesTable.siteplanId, siteplanId), eq(planningSiteplanShapesTable.label, String(body.label))));
      if (dup.length > 0) return res.status(409).json({ error: `Label "${body.label}" sudah ada di siteplan ini. Gunakan label lain.` });
    }

    const [row] = await db.insert(planningSiteplanShapesTable).values({ ...body, siteplanId, projectId: siteplan.projectId }).returning();

    // Auto-link unit for unit and fasum shapes
    if (row.shapeType === "unit" || row.shapeType === "fasum") {
      const unitId = await autoLinkUnit(row).catch(() => null);
      if (unitId && unitId !== row.unitId) {
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

    // Clean up empty strings for numeric/integer fields to avoid PostgreSQL errors
    const numFields = ["landArea", "price", "plannedUnits", "unitId", "subkonId", "progress", "customerId", "sortOrder"];
    for (const field of numFields) {
      if (field in body) {
        if (body[field] === "" || body[field] === null || body[field] === "none") {
          body[field] = null;
        } else {
          const val = Number(body[field]);
          body[field] = isNaN(val) ? null : val;
        }
      }
    }

    const [existingShape] = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
    if (!existingShape) return res.status(404).json({ error: "Shape tidak ditemukan" });
    const validationError = validateUnitShapePayload({ ...existingShape, ...body });
    if (validationError) return res.status(400).json({ error: validationError });

    if (body.label) {
      const dup = await db.select().from(planningSiteplanShapesTable)
        .where(and(eq(planningSiteplanShapesTable.siteplanId, existingShape.siteplanId), eq(planningSiteplanShapesTable.label, String(body.label)), ne(planningSiteplanShapesTable.id, shapeId)));
      if (dup.length > 0) return res.status(409).json({ error: `Label "${body.label}" sudah dipakai shape lain. Gunakan label yang berbeda.` });
    }

    const [row] = await db.update(planningSiteplanShapesTable).set(body).where(eq(planningSiteplanShapesTable.id, shapeId)).returning();
    if (!row) return res.status(404).json({ error: "Shape tidak ditemukan" });

    // Sync unit data
    if (row.shapeType === "unit") {
      const unitId = await autoLinkUnit(row).catch(() => null);
      if (unitId && unitId !== row.unitId) {
        await db.update(planningSiteplanShapesTable).set({ unitId }).where(eq(planningSiteplanShapesTable.id, row.id));
        (row as any).unitId = unitId;
      }
      if (unitId) {
        const values: Record<string, unknown> = {};
        if ("progress" in req.body) values.progress = Number(req.body.progress);
        if ("unitStatus" in req.body) values.status = req.body.unitStatus;
        if ("subkonName" in req.body) values.subkonName = req.body.subkonName;
        if ("subkonId" in req.body) values.subkonId = req.body.subkonId;
        if ("stageCode" in req.body || "blockCode" in req.body) values.stageCode = req.body.stageCode ?? req.body.blockCode;
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
    if (!shape) return res.status(404).json({ error: "Shape tidak ditemukan" });

    if (shape.shapeType === "unit") {
      let targetUnit: typeof unitsTable.$inferSelect | undefined;
      if (shape.unitId) {
        const [u] = await db.select().from(unitsTable).where(eq(unitsTable.id, shape.unitId));
        targetUnit = u;
      }
      if (!targetUnit && shape.label) {
        const { blok, nomor } = parseUnitLabel(shape.label);
        const existing = await db.select().from(unitsTable).where(
          and(
            eq(unitsTable.projectId, shape.projectId),
            eq(unitsTable.blok, blok),
            eq(unitsTable.nomor, nomor)
          )
        );
        targetUnit = existing[0];
      }

      if (targetUnit) {
        if (targetUnit.customerId) {
          const akads = await db.select().from(akadRecordsTable).where(eq(akadRecordsTable.customerId, targetUnit.customerId));
          if (akads.length > 0) {
            return res.status(409).json({
              error: `Unit ${targetUnit.blok}-${targetUnit.nomor} tidak dapat dihapus karena sudah ada data akad terkait.`,
              canArchive: false,
            });
          }
          return res.status(409).json({
            error: `Unit ${targetUnit.blok}-${targetUnit.nomor} tidak dapat dihapus karena sudah terikat dengan customer.`,
            canArchive: false,
          });
        }
        const protectedStatuses = ["selesai", "terjual_akad", "serah_terima", "akad"];
        if (protectedStatuses.includes(targetUnit.status ?? "")) {
          return res.status(409).json({
            error: `Unit ${targetUnit.blok}-${targetUnit.nomor} berstatus "${targetUnit.status}" dan tidak dapat dihapus dari siteplan. Arsipkan unit melalui modul Produksi jika tidak diperlukan lagi.`,
            canArchive: true,
          });
        }

        // Delete associated construction tasks and the production unit from unitsTable
        await db.delete(constructionTasksTable).where(eq(constructionTasksTable.unitId, targetUnit.id));
        await db.delete(unitsTable).where(eq(unitsTable.id, targetUnit.id));
      }
    }

    await db.delete(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.id, shapeId));
    if (shape.shapeType === "bidang") {
      await db.delete(planningLandBankTable).where(like(planningLandBankTable.notes, `%siteplan #${shapeId}%`));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus shape" });
  }
});

export default router;
