/**
 * Format angka kuantitas — bulatkan floating point, hapus desimal berlebih.
 * Contoh: 1048.000000000001 → "1.048", 12.6999999 → "12,7"
 */
export function fmtQty(n: number, maxDecimals = 2): string {
  if (n === null || n === undefined || !isFinite(n)) return "0";
  const rounded = parseFloat(n.toFixed(maxDecimals));
  return rounded.toLocaleString("id-ID");
}

/**
 * Format Rupiah — otomatis pilih satuan berdasarkan besaran:
 * >= 1 Triliun → "X,X T"
 * >= 1 Miliar  → "X,X M"
 * >= 1 Juta    → "X,X Jt"
 * < 1 Juta     → "Rp X.XXX"
 */
export function fmtRupiah(n: number, prefix = "Rp "): string {
  if (n === null || n === undefined || !isFinite(n)) return `${prefix}0`;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) {
    const val = abs / 1_000_000_000_000;
    return `${sign}${prefix}${parseFloat(val.toFixed(2)).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  }
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return `${sign}${prefix}${parseFloat(val.toFixed(2)).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}${prefix}${parseFloat(val.toFixed(1)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
  }
  return `${sign}${prefix}${Math.round(abs).toLocaleString("id-ID")}`;
}

/**
 * Format angka besar dengan pemisah ribuan (tanpa satuan Rupiah).
 * Contoh: 168000 → "168.000", 1500000 → "1.500.000"
 */
export function fmtNumber(n: number, maxDecimals = 0): string {
  if (n === null || n === undefined || !isFinite(n)) return "0";
  const rounded = parseFloat(n.toFixed(maxDecimals));
  return rounded.toLocaleString("id-ID", { maximumFractionDigits: maxDecimals });
}

/**
 * Format persentase.
 * Contoh: 0.18 → "18,0%" atau 18 → "18,0%"
 */
export function fmtPct(n: number, decimals = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return "0%";
  return `${parseFloat(n.toFixed(decimals)).toLocaleString("id-ID", { maximumFractionDigits: decimals })}%`;
}
