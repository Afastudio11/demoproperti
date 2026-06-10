import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { qcDefectsTable, unitQcTable, reworksTable, unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resolveKnownSubkonName } from "../lib/subkon-master";
import { findSubkonContract, recalculateUnitProductionState } from "../lib/production-relations";

const router: IRouter = Router();

const QC_ITEMS = [
  "Struktur (kolom, sloof, ring balok)",
  "Dinding (plesteran rata, tidak retak)",
  "Atap (tidak bocor, rangka kuat)",
  "Keramik (terpasang rata, tidak hollow)",
  "Cat (merata, tidak luntur)",
  "Instalasi Listrik (fungsi semua titik)",
  "Instalasi Air (tidak bocor, tekanan cukup)",
  "Kusen & Pintu (buka-tutup lancar)",
  "Plafon (terpasang rapi, tidak turun)",
];

// ─── UNIT QC ──────────────────────────────────────────────────────────────────

router.get("/produksi/qc/checklist", async (req, res) => {
  try {
    let items = await db.select().from(unitQcTable).orderBy(unitQcTable.unitId);
    if (req.query.unitId) {
      const uid = parseInt(req.query.unitId as string);
      items = items.filter(i => i.unitId === uid);
    }
    const passCount = items.filter(i => i.isPass).length;
    const qcScore = items.length > 0 ? Math.round((passCount / items.length) * 100) : 0;
    res.json({ items: items.map(i => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() })), qcItems: QC_ITEMS, qcScore });
  } catch (err) {
    req.log.error({ err }, "Failed to list QC items");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/qc/checklist/init/:unitId", async (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId);
    const existing = await db.select().from(unitQcTable).where(eq(unitQcTable.unitId, unitId));
    if (existing.length > 0) return res.json({ message: "Already initialized", count: existing.length });
    const values = QC_ITEMS.map(item => ({ unitId, qcItem: item, isPass: false }));
    await db.insert(unitQcTable).values(values);
    res.status(201).json({ message: "QC checklist initialized", count: QC_ITEMS.length });
  } catch (err) {
    req.log.error({ err }, "Failed to init QC");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/produksi/qc/checklist/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.update(unitQcTable).set(req.body).where(eq(unitQcTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    const defects = await db.select().from(qcDefectsTable).where(eq(qcDefectsTable.unitId, row.unitId));
    const linkedDefects = defects.filter(d => d.kategori === row.qcItem && (d.status === "open" || d.status === "in_repair"));
    if (row.isPass) {
      await Promise.all(linkedDefects.map(d => db.update(qcDefectsTable).set({
        status: "closed",
        verifiedBy: row.inspectedBy ?? d.verifiedBy,
      }).where(eq(qcDefectsTable.id, d.id))));
    } else if (linkedDefects.length === 0) {
      await db.insert(qcDefectsTable).values({
        unitId: row.unitId,
        kategori: row.qcItem,
        deskripsi: `Tidak lulus QC: ${row.qcItem}`,
        status: "open",
        verifiedBy: row.inspectedBy ?? null,
      });
    }
    const allItems = await db.select().from(unitQcTable).where(eq(unitQcTable.unitId, row.unitId));
    const passCount = allItems.filter(i => i.isPass).length;
    const qcScore = Math.round((passCount / allItems.length) * 100);
    await recalculateUnitProductionState(row.unitId);
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), qcScore });
  } catch (err) {
    req.log.error({ err }, "Failed to update QC item");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── REWORKS ──────────────────────────────────────────────────────────────────

router.get("/produksi/qc/reworks", async (req, res) => {
  try {
    const rows = await db.select().from(reworksTable).orderBy(reworksTable.createdAt);
    const units = await db.select().from(unitsTable);
    const enriched = rows.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      unit: units.find(u => u.id === r.unitId) ?? null,
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list reworks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/qc/reworks", async (req, res) => {
  try {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, Number(req.body.unitId)));
    if (!unit) return res.status(404).json({ error: "Unit tidak ditemukan" });
    const subkonName = await resolveKnownSubkonName(req.body.subkonName ?? unit.subkonName);
    const contract = await findSubkonContract({
      contractId: req.body.contractId ?? unit.contractId,
      projectId: unit.projectId,
      stageCode: unit.stageCode,
      subkonName,
    });
    const [row] = await db.insert(reworksTable).values({
      ...req.body,
      contractId: contract?.id ?? null,
      subkonName: contract?.subkonName ?? subkonName,
    }).returning();
    await recalculateUnitProductionState(row.unitId);
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create rework");
    res.status((err as { statusCode?: number }).statusCode ?? 400).json({ error: (err as Error).message ?? "Invalid request" });
  }
});

router.patch("/produksi/qc/reworks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = "subkonName" in req.body
      ? { ...req.body, subkonName: await resolveKnownSubkonName(req.body.subkonName) }
      : req.body;
    const [row] = await db.update(reworksTable).set(body).where(eq(reworksTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    await recalculateUnitProductionState(row.unitId);
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update rework");
    res.status((err as { statusCode?: number }).statusCode ?? 400).json({ error: (err as Error).message ?? "Invalid request" });
  }
});

export default router;
