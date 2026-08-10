/**
 * The unit identity shared by Siteplan, Produksi, Administrasi, and Finance.
 * Numeric unit numbers always use two digits, so G-1 and G-01 are one unit.
 */
export type UnitIdentity = {
  blok: string;
  nomor: string;
  label: string;
};

export function normalizeUnitNumber(value: unknown): string | null {
  const match = String(value ?? "").trim().toUpperCase().match(/^0*(\d+)([A-Z]?)$/);
  if (!match) return null;

  const numericPart = String(Number(match[1]));
  return `${numericPart.padStart(2, "0")}${match[2]}`;
}

export function normalizeUnitIdentity(blokValue: unknown, nomorValue: unknown): UnitIdentity | null {
  const blok = String(blokValue ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const nomor = normalizeUnitNumber(nomorValue);
  if (!/^[A-Z]+$/.test(blok) || !nomor) return null;
  return { blok, nomor, label: `${blok}-${nomor}` };
}

export function normalizeUnitLabel(value: unknown): UnitIdentity | null {
  const match = String(value ?? "").trim().match(/^([A-Za-z]+)[\s._-]*(\d+[A-Za-z]?)$/);
  return match ? normalizeUnitIdentity(match[1], match[2]) : null;
}

export function unitIdentityKey(projectId: unknown, blokValue: unknown, nomorValue: unknown): string | null {
  const identity = normalizeUnitIdentity(blokValue, nomorValue);
  const project = Number(projectId);
  if (!identity || !Number.isInteger(project) || project <= 0) return null;
  return `${project}:${identity.label}`;
}

export function sameUnitIdentity(
  left: { projectId: unknown; blok: unknown; nomor: unknown },
  right: { projectId: unknown; blok: unknown; nomor: unknown },
): boolean {
  const leftKey = unitIdentityKey(left.projectId, left.blok, left.nomor);
  return leftKey !== null && leftKey === unitIdentityKey(right.projectId, right.blok, right.nomor);
}
