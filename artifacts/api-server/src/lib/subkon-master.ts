import { db, subkonContractsTable, subkonMasterTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type SubkonMasterOption = {
  id: number;
  name: string;
  normalizedName: string;
  type: string;
  picName: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  defaultValuePerUnit: number;
  defaultRetentionPerUnit: number;
  defaultMaintenanceMonths: number;
  contractCount: number;
  activeContractCount: number;
  projectIds: number[];
};

export function normalizeSubkonName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function subkonKey(value: string): string {
  return normalizeSubkonName(value).toLowerCase();
}

export function normalizedSubkonKey(value: unknown): string {
  return subkonKey(normalizeSubkonName(value));
}

export async function listSubkonMaster(projectId?: number): Promise<SubkonMasterOption[]> {
  const [masters, contracts] = await Promise.all([
    db.select().from(subkonMasterTable),
    db.select().from(subkonContractsTable),
  ]);
  const filtered = Number.isFinite(projectId)
    ? contracts.filter((contract) => contract.projectId === projectId)
    : contracts;

  const stats = new Map<string, Pick<SubkonMasterOption, "contractCount" | "activeContractCount" | "projectIds">>();

  for (const contract of filtered) {
    const name = normalizeSubkonName(contract.subkonName);
    if (!name) continue;

    const key = subkonKey(name);
    const current = stats.get(key) ?? {
      contractCount: 0,
      activeContractCount: 0,
      projectIds: [],
    };

    current.contractCount += 1;
    if (contract.status === "aktif") current.activeContractCount += 1;
    if (!current.projectIds.includes(contract.projectId)) {
      current.projectIds.push(contract.projectId);
    }
    stats.set(key, current);
  }

  const masterRows = masters.map((master) => {
    const key = master.normalizedName || subkonKey(master.name);
    const stat = stats.get(key) ?? { contractCount: 0, activeContractCount: 0, projectIds: [] };
    return {
      id: master.id,
      name: master.name,
      normalizedName: key,
      type: master.type,
      picName: master.picName,
      phone: master.phone,
      address: master.address,
      status: master.status,
      defaultValuePerUnit: master.defaultValuePerUnit,
      defaultRetentionPerUnit: master.defaultRetentionPerUnit,
      defaultMaintenanceMonths: master.defaultMaintenanceMonths,
      ...stat,
    };
  });

  if (Number.isFinite(projectId)) {
    return masterRows
      .filter(row => row.status === "active" || row.projectIds.includes(projectId as number))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return masterRows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findSubkonMasterById(value: unknown) {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [row] = await db.select().from(subkonMasterTable).where(eq(subkonMasterTable.id, id));
  return row ?? null;
}

export async function findSubkonMasterByName(value: unknown) {
  const name = normalizeSubkonName(value);
  if (!name) return null;
  const key = subkonKey(name);
  const rows = await db.select().from(subkonMasterTable);
  return rows.find(row => row.normalizedName === key || subkonKey(row.name) === key) ?? null;
}

export async function createOrGetSubkonMaster(input: {
  name: unknown;
  type?: unknown;
  picName?: unknown;
  phone?: unknown;
  address?: unknown;
  defaultValuePerUnit?: unknown;
  defaultRetentionPerUnit?: unknown;
  defaultMaintenanceMonths?: unknown;
  notes?: unknown;
}) {
  const name = normalizeSubkonName(input.name);
  if (!name) {
    const err = new Error("Nama subkon wajib diisi");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  const existing = await findSubkonMasterByName(name);
  if (existing) return existing;
  const [created] = await db.insert(subkonMasterTable).values({
    name,
    normalizedName: subkonKey(name),
    type: typeof input.type === "string" && input.type.trim() ? input.type.trim() : "subkon",
    picName: typeof input.picName === "string" && input.picName.trim() ? input.picName.trim() : null,
    phone: typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null,
    address: typeof input.address === "string" && input.address.trim() ? input.address.trim() : null,
    defaultValuePerUnit: Number(input.defaultValuePerUnit ?? 0) || 0,
    defaultRetentionPerUnit: Number(input.defaultRetentionPerUnit ?? 500000) || 500000,
    defaultMaintenanceMonths: Number(input.defaultMaintenanceMonths ?? 3) || 3,
    notes: typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null,
    status: "active",
  }).returning();
  return created;
}

export async function resolveKnownSubkonName(value: unknown): Promise<string | null> {
  const name = normalizeSubkonName(value);
  if (!name) return null;

  const match = await findSubkonMasterByName(name);
  if (!match) {
    const err = new Error("Subkon belum ada di Master Subkon");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  return match.name;
}

export async function resolveSubkonMaster(input: { subkonId?: unknown; subkonName?: unknown; allowCreate?: boolean }) {
  const byId = await findSubkonMasterById(input.subkonId);
  if (byId) return byId;
  const byName = await findSubkonMasterByName(input.subkonName);
  if (byName) return byName;
  if (input.allowCreate && normalizeSubkonName(input.subkonName)) {
    return createOrGetSubkonMaster({ name: input.subkonName });
  }
  if (!normalizeSubkonName(input.subkonName) && !input.subkonId) return null;
  const err = new Error("Subkon belum ada di Master Subkon");
  (err as Error & { statusCode?: number }).statusCode = 400;
  throw err;
}
