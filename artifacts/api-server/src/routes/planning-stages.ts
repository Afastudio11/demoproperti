import { Router } from "express";
import { db } from "@workspace/db";
import {
  planningStageBlocksTable,
  planningStagesTable,
  planningSiteplanShapesTable,
  projectsTable,
  subkonContractsTable,
  unitsTable,
  constructionTasksTable,
  qcDefectsTable,
  reworksTable,
  prodMaterialOutTable,
  handoversTable,
  customersTable,
  subkonPaymentsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { normalizeSubkonName, resolveSubkonMaster } from "../lib/subkon-master";

const router = Router();

type BlockInput = {
  id?: number;
  blockCode: string;
  unitCount: number;
  unitType: string;
  pricePerUnit: number;
  subkonId?: number | null;
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

function cleanStageCode(value: unknown, fallback: string) {
  const code = cleanCode(value, fallback);
  return /^\d+$/.test(code) ? `T${code}` : code;
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

function parseUnitRef(shape: typeof planningSiteplanShapesTable.$inferSelect) {
  const label = cleanText(shape.label);
  const match = label.match(/^([A-Za-z]+)[-\s_]*(\d+[A-Za-z]?)$/);
  const fallbackBlock = cleanText(shape.blockCode);
  const legacyStage = /^T?\d+$/i.test(fallbackBlock) ? fallbackBlock : "";
  const explicitStage = cleanText(shape.stageCode);
  return {
    stageCode: cleanStageCode(explicitStage || legacyStage, ""),
    blockCode: (match?.[1] ?? (legacyStage ? "" : fallbackBlock) ?? "").toUpperCase(),
    nomor: match?.[2] ?? "",
    unitType: cleanText(shape.unitType, "Tipe 36"),
    subkonId: shape.subkonId ?? null,
    subkonName: normalizeSubkonName(shape.subkonName) || "",
    terminGroup: cleanText(shape.terminGroup),
  };
}

async function getSiteplanBaseline(projectId: number) {
  const shapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId));
  const counts = new Map<string, number>();
  const labels = new Set<string>();
  const duplicateLabels = new Set<string>();
  const invalidLabels: string[] = [];
  const unallocatedUnitLabels: string[] = [];
  const unitShapes = shapes.filter(shape => shape.shapeType === "unit");
  for (const shape of shapes) {
    if (shape.shapeType !== "unit") continue;
    const ref = parseUnitRef(shape);
    const normalizedLabel = cleanText(shape.label).toUpperCase();
    if (!ref.blockCode || !ref.nomor) invalidLabels.push(cleanText(shape.label));
    if (labels.has(normalizedLabel)) duplicateLabels.add(cleanText(shape.label));
    labels.add(normalizedLabel);
    if (!ref.stageCode) unallocatedUnitLabels.push(cleanText(shape.label));
    const stageCode = ref.stageCode;
    const blockCode = ref.blockCode || parseBlockFromLabel(shape.label);
    if (stageCode) {
      const key = `${stageCode}::${blockCode}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    } else {
      const key = `::${blockCode}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return {
    shapes,
    unitShapes,
    counts,
    totalUnitShapes: unitShapes.length,
    duplicateLabels: Array.from(duplicateLabels),
    invalidLabels,
    unallocatedUnitLabels,
  };
}

async function getSiteplanCounts(projectId: number) {
  return (await getSiteplanBaseline(projectId)).counts;
}

async function assignUnallocatedShapesToStage(projectId: number, stageCode: string, blockCode: string) {
  const shapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, projectId));
  for (const shape of shapes) {
    if (shape.shapeType !== "unit" || cleanText(shape.stageCode)) continue;
    const ref = parseUnitRef(shape);
    if (ref.blockCode === blockCode) {
      await db.update(planningSiteplanShapesTable).set({ stageCode }).where(eq(planningSiteplanShapesTable.id, shape.id));
    }
  }
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
  subkonId?: number | null;
  subkonName: string;
  unitCount: number;
  valuePerUnit: number;
  targetStart?: string | null;
  targetEnd?: string | null;
}) {
  const master = await resolveSubkonMaster({ subkonId: input.subkonId, subkonName: input.subkonName, allowCreate: true });
  if (!master) return null;
  const subkonName = master.name;

  const contracts = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.projectId, input.projectId));
  const existing = contracts.find(contract =>
    contract.status === "aktif"
    && String(contract.stageCode ?? "") === input.stageCode
    && (contract.subkonId === master.id || normalizeSubkonName(contract.subkonName).toLowerCase() === subkonName.toLowerCase())
  );
  const contractValue = input.unitCount * input.valuePerUnit;
  const retentionPerUnit = existing?.retentionPerUnit ?? master.defaultRetentionPerUnit ?? 500000;
  const totalRetention = input.unitCount * retentionPerUnit;
  const values = {
    projectId: input.projectId,
    stageCode: input.stageCode,
    subkonId: master.id,
    subkonName,
    unitCount: input.unitCount,
    valuePerUnit: input.valuePerUnit,
    contractValue,
    retentionPerUnit,
    totalRetention,
    netPayableValue: Math.max(0, contractValue - totalRetention),
    maintenanceMonths: existing?.maintenanceMonths ?? master.defaultMaintenanceMonths ?? 3,
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
        subkonId: block.subkonId,
        subkonName: block.subkonName,
        unitCount: block.unitCount,
        valuePerUnit: block.subkonValuePerUnit,
        targetStart: block.targetStart,
        targetEnd: block.targetEnd,
      })
    : null;

  const existingUnits = await db.select().from(unitsTable).where(eq(unitsTable.projectId, block.projectId));
  const unitShapes = await db.select().from(planningSiteplanShapesTable).where(eq(planningSiteplanShapesTable.projectId, block.projectId));
  for (let i = 1; i <= block.unitCount; i++) {
    const nomor = String(i).padStart(2, "0");
    const existing = existingUnits.find(unit =>
      unit.blok.toUpperCase() === block.blockCode.toUpperCase()
      && unit.nomor.toLowerCase() === nomor.toLowerCase()
    );
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
      subkonId: block.subkonId ?? null,
      subkonName: block.subkonName ?? null,
    };
    let unitId = existing?.id ?? null;
    if (existing) {
      const [updated] = await db.update(unitsTable).set(values).where(eq(unitsTable.id, existing.id)).returning();
      unitId = updated.id;
    } else {
      const [created] = await db.insert(unitsTable).values(values).returning();
      unitId = created.id;
    }
    const matchingShape = unitShapes.find(shape => {
      if (shape.shapeType !== "unit") return false;
      const ref = parseUnitRef(shape);
      return ref.blockCode === block.blockCode.toUpperCase() && ref.nomor.toLowerCase() === nomor.toLowerCase();
    });
    if (matchingShape && unitId) {
      await db.update(planningSiteplanShapesTable)
        .set({
          unitId,
          stageCode: block.stageCode,
          blockCode: block.blockCode,
          unitType: block.unitType,
          subkonId: block.subkonId ?? null,
          subkonName: block.subkonName ?? null,
        })
        .where(eq(planningSiteplanShapesTable.id, matchingShape.id));
    }
  }
  return contract?.id ?? null;
}

async function cleanupDeletedPlanningData(projectId: number) {
  // 1. Get all active stage blocks for this project
  const activeBlocks = await db
    .select()
    .from(planningStageBlocksTable)
    .where(eq(planningStageBlocksTable.projectId, projectId));

  // Create a set of active stageCode::blockCode combinations
  const activeKeys = new Set(
    activeBlocks.map(b => `${String(b.stageCode ?? "").toUpperCase()}::${String(b.blockCode ?? "").toUpperCase()}`)
  );

  // 2. Get all units for this project in production
  const projectUnits = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.projectId, projectId));

  // Identify units whose stage/block combinations are no longer active
  const unitsToDelete = projectUnits.filter(u => {
    const key = `${String(u.stageCode ?? "").toUpperCase()}::${String(u.blok ?? "").toUpperCase()}`;
    return !activeKeys.has(key);
  });

  if (unitsToDelete.length > 0) {
    const unitIds = unitsToDelete.map(u => u.id);

    // Clear matching shapes in planningSiteplanShapesTable
    await db
      .update(planningSiteplanShapesTable)
      .set({
        unitId: null,
        stageCode: "",
        blockCode: "",
        unitType: "",
        subkonId: null,
        subkonName: null,
      })
      .where(
        and(
          eq(planningSiteplanShapesTable.projectId, projectId),
          inArray(planningSiteplanShapesTable.unitId, unitIds)
        )
      );

    // Delete related records from other production tables
    await db.delete(constructionTasksTable).where(inArray(constructionTasksTable.unitId, unitIds));
    await db.delete(qcDefectsTable).where(inArray(qcDefectsTable.unitId, unitIds));
    await db.delete(reworksTable).where(inArray(reworksTable.unitId, unitIds));
    await db.delete(prodMaterialOutTable).where(inArray(prodMaterialOutTable.unitId, unitIds));
    await db.delete(handoversTable).where(inArray(handoversTable.unitId, unitIds));
    await db.update(customersTable).set({ unitId: null }).where(inArray(customersTable.unitId, unitIds));

    // Finally, delete the units
    await db.delete(unitsTable).where(inArray(unitsTable.id, unitIds));
  }

  // 3. Cleanup contracts that are no longer referenced by any remaining block
  const activeContractIds = activeBlocks
    .map(b => b.contractId)
    .filter((id): id is number => Number(id) > 0);

  const projectContracts = await db
    .select()
    .from(subkonContractsTable)
    .where(eq(subkonContractsTable.projectId, projectId));

  const contractsToDelete = projectContracts.filter(c => !activeContractIds.includes(c.id));

  if (contractsToDelete.length > 0) {
    const contractIds = contractsToDelete.map(c => c.id);
    // Delete payments first (to avoid foreign key constraint errors)
    await db.delete(subkonPaymentsTable).where(inArray(subkonPaymentsTable.contractId, contractIds));
    // Then delete the contracts
    await db.delete(subkonContractsTable).where(inArray(subkonContractsTable.id, contractIds));
  }
}

router.get("/planning/stages/siteplan-summary", async (req, res) => {
  try {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId) || projectId <= 0) return res.status(400).json({ error: "projectId wajib diisi" });

    const baseline = await getSiteplanBaseline(projectId);
    const blocks = new Map<string, {
      stageCode: string;
      blockCode: string;
      unitCount: number;
      unitType: string;
      subkonId: number | null;
      subkonName: string;
      terminGroups: string[];
      labels: string[];
    }>();
    for (const shape of baseline.unitShapes) {
      if (shape.shapeType !== "unit") continue;
      const ref = parseUnitRef(shape);
      if (!ref.blockCode) continue;
      const stageCode = ref.stageCode || "T1";
      const key = `${stageCode}::${ref.blockCode}`;
      const current = blocks.get(key) ?? {
        stageCode,
        blockCode: ref.blockCode,
        unitCount: 0,
        unitType: ref.unitType,
        subkonId: ref.subkonId,
        subkonName: ref.subkonName,
        terminGroups: [],
        labels: [],
      };
      current.unitCount += 1;
      current.labels.push(cleanText(shape.label));
      if (!current.subkonId && ref.subkonId) current.subkonId = ref.subkonId;
      if (!current.subkonName && ref.subkonName) current.subkonName = ref.subkonName;
      if ((!current.unitType || current.unitType === "Tipe 36") && ref.unitType) current.unitType = ref.unitType;
      if (ref.terminGroup && !current.terminGroups.includes(ref.terminGroup)) current.terminGroups.push(ref.terminGroup);
      blocks.set(key, current);
    }
    const blockList = Array.from(blocks.values()).sort((a, b) =>
      a.stageCode.localeCompare(b.stageCode, undefined, { numeric: true })
      || a.blockCode.localeCompare(b.blockCode, undefined, { numeric: true })
    );
    const stages = Array.from(blockList.reduce((map, block) => {
      const current = map.get(block.stageCode) ?? [];
      current.push(block);
      map.set(block.stageCode, current);
      return map;
    }, new Map<string, typeof blockList>()).entries()).map(([stageCode, stageBlocks]) => ({
      stageCode,
      stageName: `Tahap ${stageCode.replace(/^T/i, "") || stageCode}`,
      blocks: stageBlocks,
      totalUnits: stageBlocks.reduce((sum, block) => sum + block.unitCount, 0),
    }));

    res.json({
      projectId,
      totalUnitShapes: baseline.totalUnitShapes,
      duplicateLabels: baseline.duplicateLabels,
      invalidLabels: baseline.invalidLabels,
      unallocatedUnitLabels: baseline.unallocatedUnitLabels,
      blocks: blockList,
      stages,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to summarize siteplan for planning stages");
    res.status(500).json({ error: "Gagal membaca ringkasan Analisis Lahan" });
  }
});

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
    const lockedStages = existing.filter(stage => stage.lockedAt);
    const lockedKeys = new Set(lockedStages.map(stage => cleanStageCode(stage.stageCode, "").toUpperCase()));

    // 1. First pre-processing pass: auto-assign all unallocated shapes of any defined stage/block
    for (const [stageIndex, stage] of inputStages.entries()) {
      const stageCode = cleanStageCode(stage.stageCode, `T${stageIndex + 1}`);
      if (lockedKeys.has(stageCode)) continue;
      const blocks = (stage.blocks ?? []).filter(block => cleanText(block.blockCode));
      for (const block of blocks) {
        const blockCode = cleanCode(block.blockCode, "A");
        await assignUnallocatedShapesToStage(projectId, stageCode, blockCode);
      }
    }

    // 2. Fetch baseline summary after auto-assigning so all shapes are correctly mapped
    const baseline = await getSiteplanBaseline(projectId);
    if (baseline.totalUnitShapes <= 0) return res.status(400).json({ error: "Belum ada unit rumah di siteplan. Gambar unit di Analisis Lahan dulu." });
    if (baseline.duplicateLabels.length) return res.status(409).json({ error: `Label unit siteplan duplikat: ${baseline.duplicateLabels.join(", ")}` });
    if (baseline.invalidLabels.length) return res.status(409).json({ error: `Label unit belum valid: ${baseline.invalidLabels.join(", ")}. Gunakan format seperti A-01.` });

    for (const stage of existing) {
      if (stage.lockedAt) continue;
      await db.delete(planningStageBlocksTable).where(eq(planningStageBlocksTable.stageId, stage.id));
      await db.delete(planningStagesTable).where(eq(planningStagesTable.id, stage.id));
    }

    for (const [stageIndex, stage] of inputStages.entries()) {
      const stageCode = cleanStageCode(stage.stageCode, `T${stageIndex + 1}`);
      if (lockedKeys.has(stageCode)) continue;
      const blocks = (stage.blocks ?? []).filter(block => cleanText(block.blockCode));
      const blockUnitCount = (block: BlockInput) => {
        const blockCode = cleanCode(block.blockCode, "A");
        return baseline.counts.get(`${stageCode}::${blockCode}`) ?? baseline.counts.get(`::${blockCode}`) ?? 0;
      };
      const totalUnits = blocks.reduce((sum, block) => sum + blockUnitCount(block), 0);
      const totalSalesValue = blocks.reduce((sum, block) => sum + blockUnitCount(block) * numberValue(block.pricePerUnit), 0);
      const totalSubkonValue = blocks.reduce((sum, block) => sum + blockUnitCount(block) * numberValue(block.subkonValuePerUnit), 0);
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
        const blockRows = [];
        for (const block of blocks) {
          const blockCode = cleanCode(block.blockCode, "A");
          const unitCount = baseline.counts.get(`${stageCode}::${blockCode}`) ?? baseline.counts.get(`::${blockCode}`) ?? 0;
          const pricePerUnit = numberValue(block.pricePerUnit);
          const subkonValuePerUnit = numberValue(block.subkonValuePerUnit);
          const master = await resolveSubkonMaster({ subkonId: block.subkonId, subkonName: block.subkonName, allowCreate: true });
          blockRows.push({
            stageId: createdStage.id,
            projectId,
            stageCode,
            blockCode,
            unitCount,
            unitType: cleanText(block.unitType, "Tipe 36"),
            pricePerUnit,
            salesValue: unitCount * pricePerUnit,
            subkonId: master?.id ?? null,
            subkonName: master?.name ?? (normalizeSubkonName(block.subkonName) || null),
            subkonValuePerUnit,
            subkonContractValue: unitCount * subkonValuePerUnit,
            targetStart: block.targetStart || null,
            targetEnd: block.targetEnd || null,
            notes: block.notes || null,
          });
        }
        await db.insert(planningStageBlocksTable).values(blockRows);
      }
    }

    await cleanupDeletedPlanningData(projectId);
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
    const baseline = await getSiteplanBaseline(projectId);
    if (baseline.totalUnitShapes <= 0) return res.status(400).json({ error: "Belum ada unit rumah di siteplan. Publish dibatalkan." });
    if (baseline.duplicateLabels.length) return res.status(409).json({ error: `Label unit siteplan duplikat: ${baseline.duplicateLabels.join(", ")}` });
    if (baseline.invalidLabels.length) return res.status(409).json({ error: `Label unit belum valid: ${baseline.invalidLabels.join(", ")}` });
    if (baseline.unallocatedUnitLabels.length) return res.status(409).json({ error: `Unit siteplan belum masuk tahap: ${baseline.unallocatedUnitLabels.join(", ")}` });
    const totalPlanned = blocks.reduce((sum, block) => sum + block.unitCount, 0);
    if (totalPlanned !== baseline.totalUnitShapes) {
      return res.status(409).json({ error: `Total rencana (${totalPlanned} unit) harus sama dengan siteplan (${baseline.totalUnitShapes} unit). Sinkron ulang dari Analisis Lahan.` });
    }
    for (const block of blocks) {
      const drawn = baseline.counts.get(`${block.stageCode}::${block.blockCode}`) ?? 0;
      if (drawn !== block.unitCount) {
        return res.status(409).json({ error: `${block.stageCode} Blok ${block.blockCode} tidak sinkron siteplan: ${drawn}/${block.unitCount} unit.` });
      }
    }

    const requestedStageCodes = Array.isArray(req.body.stageCodes)
      ? new Set(req.body.stageCodes.map((code: unknown) => cleanStageCode(code, "")))
      : null;
    const draftStages = stages.filter(stage => !stage.lockedAt && (!requestedStageCodes || requestedStageCodes.has(cleanStageCode(stage.stageCode, ""))));
    if (!draftStages.length) return res.status(400).json({ error: "Tidak ada tahap draft yang perlu dipublish." });
    const draftStageIds = new Set(draftStages.map(stage => stage.id));
    const draftBlocks = blocks.filter(block => draftStageIds.has(block.stageId));

    let syncedUnits = 0;
    for (const block of draftBlocks) {
      const contractId = await publishBlock(block);
      if (contractId !== block.contractId) {
        await db.update(planningStageBlocksTable).set({ contractId }).where(eq(planningStageBlocksTable.id, block.id));
      }
      syncedUnits += block.unitCount;
    }

    const now = new Date();
    for (const stage of draftStages) {
      await db.update(planningStagesTable)
        .set({ status: "published", publishedAt: now.toISOString().split("T")[0], lockedAt: now })
        .where(eq(planningStagesTable.id, stage.id));
    }
    await db.update(projectsTable).set({ totalUnit: totalPlanned }).where(eq(projectsTable.id, projectId));

    await cleanupDeletedPlanningData(projectId);
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
