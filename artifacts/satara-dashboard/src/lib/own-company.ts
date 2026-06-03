export const OWN_COMPANY_NAMES = [
  "PT BERKAH BINTANG PRATAMA",
  "BERKAH BINTANG PRATAMA",
  "BERKAH BINTANG",
  "SATARA DEVELOPMENT",
];

export function isOwnCompany(pengembang?: string | null): boolean {
  if (!pengembang) return false;
  return OWN_COMPANY_NAMES.some((n) =>
    pengembang.toUpperCase().includes(n.toUpperCase())
  );
}
