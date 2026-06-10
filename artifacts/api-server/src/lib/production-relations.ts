import {
  constructionTasksTable,
  db,
  qcDefectsTable,
  reworksTable,
  subkonContractsTable,
  unitQcTable,
  unitsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { normalizeSubkonName } from "./subkon-master";

type HttpError = Error & { statusCode?: number };

function httpError(message: string, statusCode = 400): HttpError {
  const err = new Error(message) as HttpError;
  err.statusCode = statusCode;
  return err;
}

function sameStage(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? "") === (right ?? "");
}

export async function findSubkonContract(input: {
  contractId?: unknown;
  projectId?: unknown;
  stageCode?: unknown;
  subkonName?: unknown;
  requireActive?: boolean;
}) {
  const contracts = await db.select().from(subkonContractsTable);
  const requireActive = input.requireActive ?? true;
  const contractId = typeof input.contractId === "number" ? input.contractId : Number(input.contractId);

  if (Number.isFinite(contractId) && contractId > 0) {
    const contract = contracts.find((row) => row.id === contractId);
    if (!contract) throw httpError("Kontrak subkon tidak ditemukan", 404);
    if (requireActive && contract.status !== "aktif") throw httpError("Kontrak subkon tidak aktif");
    const projectId = typeof input.projectId === "number" ? input.projectId : Number(input.projectId);
    const stageCode = typeof input.stageCode === "string" ? input.stageCode || null : null;
    const subkonName = normalizeSubkonName(input.subkonName);
    if (Number.isFinite(projectId) && contract.projectId !== projectId) {
      throw httpError("Kontrak subkon tidak sesuai dengan proyek");
    }
    if (input.stageCode !== undefined && !sameStage(contract.stageCode, stageCode)) {
      throw httpError("Kontrak subkon tidak sesuai dengan tahap");
    }
    if (subkonName && normalizeSubkonName(contract.subkonName).toLowerCase() !== subkonName.toLowerCase()) {
      throw httpError("Kontrak subkon tidak sesuai dengan nama subkon");
    }
    return contract;
  }

  const projectId = typeof input.projectId === "number" ? input.projectId : Number(input.projectId);
  const stageCode = typeof input.stageCode === "string" ? input.stageCode || null : null;
  const subkonName = normalizeSubkonName(input.subkonName);
  if (!Number.isFinite(projectId) || !subkonName) return null;

  const matches = contracts.filter((contract) =>
    contract.projectId === projectId
    && normalizeSubkonName(contract.subkonName).toLowerCase() === subkonName.toLowerCase()
    && sameStage(contract.stageCode, stageCode)
    && (!requireActive || contract.status === "aktif")
  );

  if (matches.length === 0) {
    throw httpError("Subkon belum punya kontrak aktif untuk proyek/tahap ini");
  }
  if (matches.length > 1) {
    throw httpError("Ada lebih dari satu kontrak aktif yang cocok. Pilih kontrak secara eksplisit.");
  }

  return matches[0];
}

export async function getUnitsForContract(contractId: number) {
  const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, contractId));
  if (!contract) throw httpError("Kontrak subkon tidak ditemukan", 404);

  const units = await db.select().from(unitsTable);
  const contractName = normalizeSubkonName(contract.subkonName).toLowerCase();

  return units.filter((unit) => {
    if (unit.contractId === contract.id) return true;
    return unit.projectId === contract.projectId
      && sameStage(unit.stageCode, contract.stageCode)
      && normalizeSubkonName(unit.subkonName).toLowerCase() === contractName;
  });
}

export async function getContractFieldProgress(contractId: number): Promise<number> {
  const units = await getUnitsForContract(contractId);
  if (units.length === 0) {
    throw httpError("Belum ada unit yang terhubung ke kontrak subkon ini");
  }

  const totalProgress = units.reduce((sum, unit) => sum + (unit.progress ?? 0), 0);
  return Math.round((totalProgress / units.length) * 10) / 10;
}

export async function recalculateUnitProductionState(unitId: number) {
  const allTasks = await db.select().from(constructionTasksTable).where(eq(constructionTasksTable.unitId, unitId));
  const progress = allTasks.reduce((sum, task) => sum + (task.status === "selesai" ? (task.bobot || 0) : 0), 0);

  const defects = await db.select().from(qcDefectsTable).where(eq(qcDefectsTable.unitId, unitId));
  const hasOpenDefects = defects.some((defect) => defect.status === "open" || defect.status === "in_repair");

  const reworks = await db.select().from(reworksTable).where(eq(reworksTable.unitId, unitId));
  const hasOpenReworks = reworks.some((rework) => rework.status === "open" || rework.status === "in_progress");

  const qcItems = await db.select().from(unitQcTable).where(eq(unitQcTable.unitId, unitId));
  const qcScore = qcItems.length > 0
    ? Math.round((qcItems.filter((item) => item.isPass).length / qcItems.length) * 100)
    : 0;
  const qcPassed = qcItems.length > 0 && qcScore >= 90;

  const readyAkad = progress >= 100 && !hasOpenDefects && !hasOpenReworks && qcPassed;
  await db.update(unitsTable).set({ progress, readyAkad }).where(eq(unitsTable.id, unitId));

  return { progress, readyAkad, qcScore, hasOpenDefects, hasOpenReworks };
}
