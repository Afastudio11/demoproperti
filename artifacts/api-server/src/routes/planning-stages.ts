import { Router } from "express";
import { db } from "@workspace/db";
import {
  planningStageBlocksTable,
  planningStagesTable,
  planningSiteplanShapesTable,
  projectsTable,
  subkonContractsTable,
  unitsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { normalizeSubkonName } from "../lib/subkon-master";

const router = Router();

type BlockInput = {
  id?: number;
  blockCode: string;
  unitCount: number;
  unitType: string;
  pricePerUnit: number;
  subkonName?: string | null;
  subkonValuePerUnit?: number;
  targetStart?: string | null;
  targetEnd?: string | null;
  notes?: string | null;
};

type StageInput = {
  id?: number;
  stageCode: string;
  stageName: string;
  targetStart?: string | null;
  targetEnd?: string | null;
  notes?: string | null;
  blocks: BlockInput[];
};

function cleanCode(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).toUpperCase();
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseBlockFromLabel(label: string) {
  const text = String(label ?? "").trim();
  const match = text.match(/^([A-Za-z]+)[-\s_]*(\d+[A-Za-z]?)$/);
  return match ? match[1].toUpperCase() : text.split(/[-\s_]/)[0]?.toUpperCase() || "";
}

async function getSiteplanCounts(projectId: number) {
  const shapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId));
  const counts = new Map<string, number>();
  for (const shape of shapes) {
    if (shape.shapeType !== "unit") continue;
    const stageCode = cleanCode(shape.blockCode, cleanText(shape.blockCode, ""));
    const blockCode = parseBlockFromLabel(shape.label);
    const keys = [
      `${stageCode}::${blockCode}`,
      `::${blockCode}`,
    ];
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function validationStatus(planned: number, drawn: number) {
  if (drawn <= 0) return "belum_digambar";
  if (drawn === planned) return "sesuai";
  return drawn < planned ? "kurang_shape" : "lebih_shape";
}

async function enrichStages(projectId: number) {
  const [stages, blocks, siteplanCounts] = await Promise.all([
    db.select().from(planningStagesTable).where(eq(planningStagesTable.projectId, projectId)),
    db.select().from(planningStageBlocksTable).where(eq(planningStageBlocksTable.projectId, projectId)),
    getSiteplanCounts(projectId),
  ]);

  return stages
    .sort((a, b) => a.stageCode.localeCompare(b.stageCode, undefined, { numeric: true }))
    .map(stage => {
      const stageBlocks = blocks
        .filter(block => block.stageId === stage.id)
        .sort((a, b) => a.blockCode.localeCompare(b.blockCode, undefined, { numeric: true }))
        .map(block => {
          const drawn = siteplanCounts.get(`${stage.stageCode}::${block.blockCode}`) ?? siteplanCounts.get(`::${block.blockCode}`) ?? 0;
          return {
            ...block,
            siteplanUnitCount: drawn,
            validationStatus: validationStatus(block.unitCount, drawn),
            createdAt: block.createdAt.toISOString(),
            updatedAt: block.updatedAt.toISOString(),
          };
        });
      return {
        ...stage,
        blocks: stageBlocks,
        createdAt: stage.createdAt.toISOString(),
        updatedAt: stage.updatedAt.toISOString(),
      };
    });
}

async function findOrCreateContract(input: {
  projectId: number;
  stageCode: string;
  subkonName: string;
  unitCount: number;
  valuePerUnit: number;
  targetStart?: string | null;
  targetEnd?: string | null;
}) {
  const subkonName = normalizeSubkonName(input.subkonName);
  if (!subkonName) return null;

  const contracts = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.projectId, input.projectId));
  const existing = contracts.find(contract =>
    contract.status === "aktif"
    && String(contract.stageCode ?? "") === input.stageCode
    && normalizeSubkonName(contract.subkonName).toLowerCase() === subkonName.toLowerCase()
  );
  const contractValue = input.unitCount * input.valuePerUnit;
  const retentionPerUnit = existing?.retentionPerUnit ?? 500000;
  const totalRetention = input.unitCount * retentionPerUnit;
  const values = {
    projectId: input.projectId,
    stageCode: input.stageCode,
    subkonName,
    unitCount: input.unitCount,
    valuePerUnit: input.valuePerUnit,
    contractValue,
    retentionPerUnit,
    totalRetention,
    netPayableValue: Math.max(0, contractValue - totalRetention),
    maintenanceMonths: existing?.maintenanceMonths ?? 3,
    startDate: input.targetStart ?? existing?.startDate ?? null,
    targetEndDate: input.targetEnd ?? existing?.targetEndDate ?? null,
    retentionStatus: existing?.retentionStatus ?? "ditahan",
    status: "aktif",
  };
  if (existing) {
    const [updated] = await db.update(subkonContractsTable).set(values).where(eq(subkonContractsTable.id, existing.id)).returning();
    return updated;
  }
  const [created] = await db.insert(subkonContractsTable).values(values).returning();
  return created;
}

async function publishBlock(block: typeof planningStageBlocksTable.$inferSelect) {
  const contract = block.subkonName
    ? await findOrCreateContract({
        projectId: block.projectId,
        stageCode: block.stageCode,
        subkonName: block.subkonName,
        unitCount: block.unitCount,
        valuePerUnit: block.subkonValuePerUnit,
        targetStart: block.targetStart,
        targetEnd: block.targetEnd,
      })
    : null;

  const existingUnits = await db.select().from(unitsTable).where(eq(unitsTable.projectId, block.projectId));
  const matchingUnits = existingUnits.filter(unit =>
    String(unit.stageCode ?? "") === block.stageCode
    && unit.blok.toUpperCase() === block.blockCode.toUpperCase()
  );
  for (let i = 1; i <= block.unitCount; i++) {
    const nomor = String(i).padStart(2, "0");
    const existing = matchingUnits.find(unit => unit.nomor === nomor);
    const values = {
      projectId: block.projectId,
      contractId: contract?.id ?? null,
      blok: block.blockCode,
      nomor,
      tipe: block.unitType,
      harga: block.pricePerUnit,
      status: existing?.status ?? "available",
      progress: existing?.progress ?? 0,
      readyAkad: existing?.readyAkad ?? false,
      stageCode: block.stageCode,
      subkonName: block.subkonName ?? null,
    };
    if (existing) {
      await db.update(unitsTable).set(values).where(eq(unitsTable.id, existing.id));
    } else {
      await db.insert(unitsTable).values(values);
    }
  }
  return contract?.id ?? null;
}

router.get("/planning/stages", async (req, res) => {
  try {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId) || projectId <= 0) return res.status(400).json({ error: "projectId wajib diisi" });
    res.json(await enrichStages(projectId));
  } catch (err) {
    req.log.error({ err }, "Failed to list planning stages");
    res.status(500).json({ error: "Gagal mengambil rencana tahapan" });
  }
});

router.post("/planning/stages/bulk", async (req, res) => {
  try {
    const projectId = Number(req.body.projectId);
    const inputStages = Array.isArray(req.body.stages) ? req.body.stages as StageInput[] : [];
    if (!Number.isFinite(projectId) || projectId <= 0) return res.status(400).json({ error: "projectId wajib diisi" });

    const existing = await db.select().from(planningStagesTable).where(eq(planningStagesTable.projectId, projectId));
    if (existing.some(stage => stage.lockedAt)) return res.status(409).json({ error: "Rencana sudah locked. Buat revisi sebelum mengubah baseline." });

    await db.delete(planningStageBlocksTable).where(eq(planningStageBlocksTable.projectId, projectId));
    await db.delete(planningStagesTable).where(eq(planningStagesTable.projectId, projectId));

    for (const [stageIndex, stage] of inputStages.entries()) {
      const stageCode = cleanCode(stage.stageCode, `T${stageIndex + 1}`);
      const blocks = (stage.blocks ?? []).filter(block => cleanText(block.blockCode));
      const totalUnits = blocks.reduce((sum, block) => sum + Math.max(0, Math.round(numberValue(block.unitCount))), 0);
      const totalSalesValue = blocks.reduce((sum, block) => sum + Math.max(0, Math.round(numberValue(block.unitCount))) * numberValue(block.pricePerUnit), 0);
      const totalSubkonValue = blocks.reduce((sum, block) => sum + Math.max(0, Math.round(numberValue(block.unitCount))) * numberValue(block.subkonValuePerUnit), 0);
      const [createdStage] = await db.insert(planningStagesTable).values({
        projectId,
        stageCode,
        stageName: cleanText(stage.stageName, `Tahap ${stageIndex + 1}`),
        targetStart: stage.targetStart || null,
        targetEnd: stage.targetEnd || null,
        status: "draft",
        totalUnits,
        totalSalesValue,
        totalSubkonValue,
        notes: stage.notes || null,
      }).returning();

      if (blocks.length) {
        await db.insert(planningStageBlocksTable).values(blocks.map(block => {
          const unitCount = Math.max(0, Math.round(numberValue(block.unitCount)));
          const pricePerUnit = numberValue(block.pricePerUnit);
          const subkonValuePerUnit = numberValue(block.subkonValuePerUnit);
          return {
            stageId: createdStage.id,
            projectId,
            stageCode,
            blockCode: cleanCode(block.blockCode, "A"),
            unitCount,
            unitType: cleanText(block.unitType, "Tipe 36"),
            pricePerUnit,
            salesValue: unitCount * pricePerUnit,
            subkonName: normalizeSubkonName(block.subkonName) || null,
            subkonValuePerUnit,
            subkonContractValue: unitCount * subkonValuePerUnit,
            targetStart: block.targetStart || null,
            targetEnd: block.targetEnd || null,
            notes: block.notes || null,
          };
        }));
      }
    }

    res.json(await enrichStages(projectId));
  } catch (err) {
    req.log.error({ err }, "Failed to save planning stages");
    res.status(500).json({ error: "Gagal menyimpan rencana tahapan" });
  }
});

router.post("/planning/stages/publish", async (req, res) => {
  try {
    const projectId = Number(req.body.projectId);
    if (!Number.isFinite(projectId) || projectId <= 0) return res.status(400).json({ error: "projectId wajib diisi" });
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) return res.status(404).json({ error: "Proyek tidak ditemukan" });

    const stages = await db.select().from(planningStagesTable).where(eq(planningStagesTable.projectId, projectId));
    const blocks = await db.select().from(planningStageBlocksTable).where(eq(planningStageBlocksTable.projectId, projectId));
    if (!stages.length || !blocks.length) return res.status(400).json({ error: "Rencana tahap dan blok belum tersedia" });

    let syncedUnits = 0;
    for (const block of blocks) {
      const contractId = await publishBlock(block);
      if (contractId !== block.contractId) {
        await db.update(planningStageBlocksTable).set({ contractId }).where(eq(planningStageBlocksTable.id, block.id));
      }
      syncedUnits += block.unitCount;
    }

    const now = new Date();
    for (const stage of stages) {
      await db.update(planningStagesTable)
        .set({ status: "published", publishedAt: now.toISOString().split("T")[0], lockedAt: now })
        .where(eq(planningStagesTable.id, stage.id));
    }
    await db.update(projectsTable).set({ totalUnit: syncedUnits }).where(eq(projectsTable.id, projectId));

    res.json({ ok: true, syncedUnits, stages: await enrichStages(projectId) });
  } catch (err) {
    req.log.error({ err }, "Failed to publish planning stages");
    res.status(500).json({ error: "Gagal publish rencana ke Produksi" });
  }
});

router.post("/planning/stages/revision", async (req, res) => {
  try {
    const projectId = Number(req.body.projectId);
    if (!Number.isFinite(projectId) || projectId <= 0) return res.status(400).json({ error: "projectId wajib diisi" });
    await db.update(planningStagesTable)
      .set({ status: "draft", lockedAt: null, publishedAt: null })
      .where(and(eq(planningStagesTable.projectId, projectId), eq(planningStagesTable.status, "published")));
    res.json(await enrichStages(projectId));
  } catch (err) {
    req.log.error({ err }, "Failed to create planning revision");
    res.status(500).json({ error: "Gagal membuat revisi rencana" });
  }
});

export default router;
