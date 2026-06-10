import { db, subkonContractsTable } from "@workspace/db";

export type SubkonMasterOption = {
  name: string;
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

export async function listSubkonMaster(projectId?: number): Promise<SubkonMasterOption[]> {
  const contracts = await db.select().from(subkonContractsTable);
  const filtered = Number.isFinite(projectId)
    ? contracts.filter((contract) => contract.projectId === projectId)
    : contracts;

  const byName = new Map<string, SubkonMasterOption>();

  for (const contract of filtered) {
    const name = normalizeSubkonName(contract.subkonName);
    if (!name) continue;

    const key = subkonKey(name);
    const current = byName.get(key) ?? {
      name,
      contractCount: 0,
      activeContractCount: 0,
      projectIds: [],
    };

    current.contractCount += 1;
    if (contract.status === "aktif") current.activeContractCount += 1;
    if (!current.projectIds.includes(contract.projectId)) {
      current.projectIds.push(contract.projectId);
    }
    byName.set(key, current);
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveKnownSubkonName(value: unknown): Promise<string | null> {
  const name = normalizeSubkonName(value);
  if (!name) return null;

  const options = await listSubkonMaster();
  const match = options.find((option) => subkonKey(option.name) === subkonKey(name));
  if (!match) {
    const err = new Error("Subkon belum ada di Kontrak Subkon");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  return match.name;
}
