import { Router, type IRouter } from "express";
import Groq from "groq-sdk";

const router: IRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPE_DEFAULTS = {
  subsidi: {
    label: "Subsidi (FLPP)",
    hargaJual: 166_000_000,
    biayaBangun: 95_000_000,
    kavling: 72, kavlingMin: 60, kavlingMax: 84,
  },
  komersial_kecil: {
    label: "Komersial Kecil",
    hargaJual: 385_000_000,
    biayaBangun: 175_000_000,
    kavling: 90, kavlingMin: 72, kavlingMax: 108,
  },
  komersial_menengah: {
    label: "Komersial Menengah",
    hargaJual: 650_000_000,
    biayaBangun: 300_000_000,
    kavling: 120, kavlingMin: 96, kavlingMax: 150,
  },
} as const;

type TipeRumah = keyof typeof TIPE_DEFAULTS;

const BENTUK_FAKTOR: Record<string, number> = {
  kotak: 0.04,
  persegi_panjang: 0.06,
  l_shape: 0.12,
  segitiga: 0.15,
  tidak_beraturan: 0.10,
};

const KONTUR_FAKTOR: Record<string, number> = {
  Datar: 0.04, Landai: 0.06, Miring: 0.12, Curam: 0.18,
};

const KONTUR_INFRA_MODIFIER: Record<string, number> = {
  Datar: 1.0, Landai: 1.08, Miring: 1.22, Curam: 1.45,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rp(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)} M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}

function classifyRisk(score: number): "Rendah" | "Sedang" | "Tinggi" {
  return score >= 70 ? "Rendah" : score >= 40 ? "Sedang" : "Tinggi";
}

// ─── Calculation Engine ───────────────────────────────────────────────────────
// Semua angka finansial, unit, skor dihitung di sini — AI tidak menghitung angka.

interface CalcInput {
  luas: number;
  hargaM2: number;
  aksesJalan: number;
  bentukLahan: string;
  statusKepemilikan: string;
  konturLabel: string;
  floodRiskLabel: string;
  targetTipeRumah: TipeRumah;
  hargaJualInput: number;
  biayaBangunInput: number;
  biayaInfrastrukturPct: number;
  biayaLegalPct: number;
  fasilitasCount: number;
  kondisiLingkungan: string;
  potensiPertumbuhan: string;
  hargaRumahSekitar: number;
  elevAvg: number | null;
  slopeAvgPct: number | null;
  konturSumber: string;
}

function calculateLandMetrics(inp: CalcInput) {
  const tipe = TIPE_DEFAULTS[inp.targetTipeRumah] ?? TIPE_DEFAULTS.subsidi;

  // ── 1. Alokasi Lahan ──────────────────────────────────────────────────────
  const PCT_JALAN  = 0.22;
  const PCT_FASUM  = 0.12;
  const bentukFaktor = BENTUK_FAKTOR[inp.bentukLahan] ?? 0.07;
  const konturFaktor = KONTUR_FAKTOR[inp.konturLabel] ?? 0.05;
  const pctTidakEfektif = Math.min(bentukFaktor + konturFaktor, 0.25);
  const pctEfektif = Math.max(1 - PCT_JALAN - PCT_FASUM - pctTidakEfektif, 0.35);

  const luasJalan        = Math.round(inp.luas * PCT_JALAN);
  const luasFasum        = Math.round(inp.luas * PCT_FASUM);
  const luasTidakEfektif = Math.round(inp.luas * pctTidakEfektif);
  const luasEfektif      = Math.round(inp.luas * pctEfektif);
  const efficiencyPct    = parseFloat((pctEfektif * 100).toFixed(1));

  // ── 2. Potensi Unit ───────────────────────────────────────────────────────
  const unitMin       = Math.max(1, Math.floor(luasEfektif / tipe.kavlingMax));
  const unitRealistis = Math.max(1, Math.floor(luasEfektif / tipe.kavling));
  const unitMax       = Math.max(1, Math.floor(luasEfektif / tipe.kavlingMin));

  // ── 3. Proyeksi Finansial ─────────────────────────────────────────────────
  const usingDefaultHargaJual   = inp.hargaJualInput <= 0;
  const usingDefaultBiayaBangun = inp.biayaBangunInput <= 0;
  const hargaJualFinal   = usingDefaultHargaJual   ? tipe.hargaJual   : inp.hargaJualInput;
  const biayaBangunFinal = usingDefaultBiayaBangun ? tipe.biayaBangun : inp.biayaBangunInput;

  const totalAkuisisi    = Math.round(inp.luas * inp.hargaM2);
  const konturMod        = KONTUR_INFRA_MODIFIER[inp.konturLabel] ?? 1.0;
  const biayaInfrastruktur = Math.round(totalAkuisisi * (inp.biayaInfrastrukturPct / 100) * konturMod);
  const biayaLegal         = Math.round(totalAkuisisi * (inp.biayaLegalPct / 100));
  const biayaKonstruksi    = Math.round(unitRealistis * biayaBangunFinal);
  const subtotal           = totalAkuisisi + biayaInfrastruktur + biayaLegal + biayaKonstruksi;
  const kontingensiBiaya   = Math.round(subtotal * 0.05);
  const totalHPP           = subtotal + kontingensiBiaya;

  const revenue     = Math.round(unitRealistis * hargaJualFinal);
  const profit      = revenue - totalHPP;
  const roi         = totalHPP > 0 ? parseFloat(((profit / totalHPP) * 100).toFixed(1)) : 0;
  const margin      = revenue > 0  ? parseFloat(((profit / revenue)  * 100).toFixed(1)) : 0;
  const paybackBulan = revenue > 0 ? Math.round(totalHPP / (revenue / 24)) : 0;

  // Per-unit breakdown
  const tanahPerUnit      = unitRealistis > 0 ? Math.round(totalAkuisisi / unitRealistis)    : 0;
  const infraPerUnit      = unitRealistis > 0 ? Math.round(biayaInfrastruktur / unitRealistis) : 0;
  const legalPerUnit      = unitRealistis > 0 ? Math.round(biayaLegal / unitRealistis)        : 0;
  const kontingensiPerUnit = unitRealistis > 0 ? Math.round(kontingensiBiaya / unitRealistis)  : 0;
  const hppPerUnit        = tanahPerUnit + infraPerUnit + biayaBangunFinal + legalPerUnit + kontingensiPerUnit;
  const marginPerUnit     = hargaJualFinal - hppPerUnit;
  const marginPerUnitPct  = hargaJualFinal > 0 ? parseFloat(((marginPerUnit / hargaJualFinal) * 100).toFixed(1)) : 0;

  // Harga maksimum akuisisi agar ROI ≥ 25%
  // totalHPP = (landCost + biayaKonstruksi) * (1+pctInfra*mod+pctLegal) * 1.05
  // landCost <= revenue/1.25 / ((1+pctInfra*mod+pctLegal)*1.05) - biayaKonstruksi
  const landCostFactor = (1 + (inp.biayaInfrastrukturPct / 100) * konturMod + inp.biayaLegalPct / 100) * 1.05;
  const maxTotalAkuisisi = (revenue / 1.25 - biayaKonstruksi * 1.05) / landCostFactor;
  const maxHargaM2       = inp.luas > 0 && maxTotalAkuisisi > 0 ? Math.round(maxTotalAkuisisi / inp.luas) : 0;
  const negotTargetM2    = Math.round(maxHargaM2 * 0.90);

  // ── 4. Penilaian Risiko ───────────────────────────────────────────────────
  const legalRiskScore = inp.statusKepemilikan.includes("SHM") ? 90
    : inp.statusKepemilikan.includes("HGB") || inp.statusKepemilikan.includes("SHGB") ? 70
    : inp.statusKepemilikan.includes("Girik") || inp.statusKepemilikan.includes("Adat") ? 40
    : inp.statusKepemilikan.includes("Letter") || inp.statusKepemilikan.includes("Sporadik") ? 30
    : 20;

  const aksesJalanNum  = inp.aksesJalan;
  const aksesRiskScore = aksesJalanNum >= 8 ? 100 : aksesJalanNum >= 6 ? 80 : aksesJalanNum >= 5 ? 60 : aksesJalanNum >= 4 ? 40 : 20;

  const konturRiskScore = { Datar: 100, Landai: 80, Miring: 50, Curam: 25 }[inp.konturLabel] ?? 60;

  const floodScoreMap: Record<string, number> = { AMAN: 100, WASPADA: 75, SEDANG: 50, TINGGI: 25 };
  const banjirRiskScore = floodScoreMap[inp.floodRiskLabel] ?? 80;

  const priceRatio   = maxHargaM2 > 0 ? inp.hargaM2 / maxHargaM2 : 1.2;
  const hargaRiskScore = priceRatio <= 0.70 ? 100 : priceRatio <= 0.85 ? 80 : priceRatio <= 1.0 ? 60 : priceRatio <= 1.15 ? 40 : 20;

  const marketRiskScore = roi >= 35 ? 90 : roi >= 25 ? 70 : roi >= 15 ? 50 : 30;

  const avgRiskScore = Math.round(
    [legalRiskScore, aksesRiskScore, konturRiskScore, banjirRiskScore, hargaRiskScore, marketRiskScore]
      .reduce((a, b) => a + b, 0) / 6
  );

  const risks = {
    legalRisk:   classifyRisk(legalRiskScore),
    aksesRisk:   classifyRisk(aksesRiskScore),
    konturRisk:  classifyRisk(konturRiskScore),
    banjirRisk:  classifyRisk(banjirRiskScore),
    hargaRisk:   classifyRisk(hargaRiskScore),
    marketRisk:  classifyRisk(marketRiskScore),
    overallRisk: classifyRisk(avgRiskScore),
    legalRiskScore, aksesRiskScore, konturRiskScore, banjirRiskScore, hargaRiskScore, marketRiskScore,
  };

  // ── 5. Scoring Kelayakan (Bobot per Spesifikasi) ──────────────────────────
  // Lokasi dan akses: 20%
  const aksesLokasiSc   = aksesJalanNum >= 8 ? 100 : aksesJalanNum >= 6 ? 80 : aksesJalanNum >= 5 ? 65 : aksesJalanNum >= 4 ? 45 : 25;
  const fasilitasSc     = Math.min(100, Math.round((inp.fasilitasCount / 8) * 100 + 25));
  const pertumbuhanSc   = ({ sangat_tinggi: 100, tinggi: 75, sedang: 50, rendah: 25 } as Record<string,number>)[inp.potensiPertumbuhan] ?? 50;
  const kondisiSc       = ({ sangat_aman: 100, aman: 80, cukup_aman: 60, kurang_aman: 30 } as Record<string,number>)[inp.kondisiLingkungan] ?? 65;
  const lokasiScore     = Math.round(aksesLokasiSc * 0.40 + fasilitasSc * 0.20 + pertumbuhanSc * 0.20 + kondisiSc * 0.20);

  // Harga tanah: 20%
  const hargaScore = priceRatio <= 0.70 ? 100 : priceRatio <= 0.85 ? 85 : priceRatio <= 1.0 ? 65 : priceRatio <= 1.15 ? 45 : 25;

  // Potensi unit: 15%
  const unitScore = efficiencyPct >= 55 ? 100 : efficiencyPct >= 50 ? 85 : efficiencyPct >= 45 ? 70 : efficiencyPct >= 40 ? 55 : 35;

  // Potensi profit/ROI: 20%
  const roiScore = roi >= 45 ? 100 : roi >= 35 ? 85 : roi >= 25 ? 65 : roi >= 15 ? 45 : 25;

  // Legalitas: 10%
  const legalScore = legalRiskScore;

  // Kompetitor & pasar: 10%
  let pasarScore: number;
  if (inp.hargaRumahSekitar > 0) {
    const pr = hargaJualFinal / inp.hargaRumahSekitar;
    pasarScore = pr <= 0.85 ? 100 : pr <= 1.0 ? 80 : pr <= 1.1 ? 60 : pr <= 1.2 ? 40 : 25;
  } else {
    pasarScore = ({ sangat_tinggi: 80, tinggi: 65, sedang: 50, rendah: 30 } as Record<string,number>)[inp.potensiPertumbuhan] ?? 50;
  }

  // Risiko teknis: 5%
  const teknisScore = Math.round((konturRiskScore + banjirRiskScore) / 2);

  const totalScore = Math.round(
    lokasiScore * 0.20 + hargaScore * 0.20 + unitScore * 0.15 +
    roiScore * 0.20 + legalScore * 0.10 + pasarScore * 0.10 + teknisScore * 0.05
  );

  const category = totalScore >= 85 ? "Sangat Direkomendasikan"
    : totalScore >= 70 ? "Direkomendasikan"
    : totalScore >= 55 ? "Perlu Review"
    : "Tidak Direkomendasikan";

  const decision: string = totalScore >= 85 ? "BELI"
    : totalScore >= 70 ? (priceRatio > 0.95 ? "BELI_DENGAN_NEGOSIASI" : "BELI")
    : totalScore >= 55 ? "HOLD"
    : "JANGAN_BELI";

  // ── 6. Asumsi yang Digunakan ──────────────────────────────────────────────
  const assumptions: string[] = [];
  if (usingDefaultHargaJual)   assumptions.push(`Harga jual per unit: asumsi default ${tipe.label} = ${rp(tipe.hargaJual)} (perlu validasi pasar)`);
  if (usingDefaultBiayaBangun) assumptions.push(`Biaya bangun per unit: asumsi default ${tipe.label} = ${rp(tipe.biayaBangun)} (perlu validasi RAB)`);
  if (!inp.hargaRumahSekitar)  assumptions.push("Data harga kompetitor tidak tersedia — skor pasar berdasarkan potensi pertumbuhan wilayah");
  if (inp.konturSumber === "Estimasi")  assumptions.push("Data topografi diperoleh dari estimasi geografis (tidak ada SRTM) — perlu survei lapangan");

  return {
    landAllocation: { luasTotal: inp.luas, pctJalan: PCT_JALAN, pctFasum: PCT_FASUM, pctTidakEfektif, pctEfektif, luasJalan, luasFasum, luasTidakEfektif, luasEfektif, efficiencyPct },
    unitPotential:  { tipeLabel: tipe.label, kavlingDefault: tipe.kavling, kavlingMin: tipe.kavlingMin, kavlingMax: tipe.kavlingMax, unitMin, unitRealistis, unitMax },
    financials: {
      usingDefaultHargaJual, usingDefaultBiayaBangun, hargaJualFinal, biayaBangunFinal,
      totalAkuisisi, biayaInfrastruktur, biayaLegal, biayaKonstruksi, kontingensiBiaya, totalHPP,
      revenue, profit, roi, margin, paybackBulan,
      maxHargaM2, negotTargetM2,
      tanahPerUnit, infraPerUnit, legalPerUnit, kontingensiPerUnit,
      hppPerUnit, marginPerUnit, marginPerUnitPct,
    },
    risks,
    scores: { lokasiScore, hargaScore, unitScore, roiScore, legalScore, pasarScore, teknisScore, total: totalScore, category, decision },
    assumptions,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post("/ai/land-assessment", async (req, res) => {
  const {
    lokasi, kelurahan, kecamatan, kabupaten,
    luas, hargaTanahM2, aksesJalan,
    fasilitasUmum, kondisiLingkungan, potensiPertumbuhan, utilitas,
    hargaRumahSekitar, statusKepemilikan, bentukLahan, catatan,
    targetTipeRumah, hargaJualPerUnit, biayaBangunPerUnit,
    biayaInfrastrukturPct, biayaLegalPct,
    elevMin, elevMax, elevAvg, slopeAvgPct, slopeMaxPct,
    waterwayType, waterwayName, waterwayDistM,
    portfolioComparables,
    competitors,
    competitorsKecamatan,
    checkedItems,
    checklistValues,
  } = req.body;

  const groq = new Groq({
    apiKey: process.env["GROQ_API_KEY"],
  });

  // ── Normalisasi Input ─────────────────────────────────────────────────────
  const luasNum      = parseFloat(luas)             || 0;
  const hargaM2Num   = parseFloat(hargaTanahM2)     || 0;
  const aksesNum     = parseFloat(aksesJalan)        || 0;
  const hargaJualIn  = parseFloat(hargaJualPerUnit)  || 0;
  const biayaBangunIn = parseFloat(biayaBangunPerUnit) || 0;
  const hargaRumahNum = parseFloat(hargaRumahSekitar) || 0;
  const infraPct     = parseFloat(biayaInfrastrukturPct) || 15;
  const legalPct     = parseFloat(biayaLegalPct)    || 5;
  const tipe: TipeRumah = (["subsidi","komersial_kecil","komersial_menengah"].includes(targetTipeRumah)
    ? targetTipeRumah : "subsidi") as TipeRumah;
  const fasilitasList = Array.isArray(fasilitasUmum) ? fasilitasUmum : [];

  const hasTerrainData = elevAvg != null && slopeAvgPct != null;
  const konturLabel = hasTerrainData
    ? (Number(slopeAvgPct) < 2 ? "Datar" : Number(slopeAvgPct) < 5 ? "Landai" : Number(slopeAvgPct) < 15 ? "Miring" : "Curam")
    : "Datar";
  const konturSumber = hasTerrainData ? "SRTM NASA" : "Estimasi";

  const waterwayDistNum = waterwayDistM != null ? Number(waterwayDistM) : null;
  const floodRiskLabel = waterwayDistNum == null ? "AMAN"
    : waterwayDistNum < 100 ? "TINGGI"
    : waterwayDistNum < 300 ? "SEDANG"
    : waterwayDistNum < 500 ? "WASPADA"
    : "AMAN";

  // ── Competitor & Checklist data dari frontend ─────────────────────────────
  interface CompItem { name: string; type: string; pengembang?: string; kecamatan?: string; kabupaten?: string; kelurahan?: string; totalUnit?: number; }
  const compList: CompItem[] = Array.isArray(competitors) ? competitors : [];
  const compListKec: CompItem[] = Array.isArray(competitorsKecamatan) ? competitorsKecamatan : [];
  const ciList: string[] = Array.isArray(checkedItems) ? checkedItems : [];
  const cVals = (checklistValues && typeof checklistValues === "object") ? checklistValues as Record<string, string> : {};
  const ci = (key: string) => ciList.includes(key);

  // ── Portfolio Comparables (data lahan lain di kabupaten yang sama) ────────
  interface PortfolioItem { hargaM2?: number; luas?: number; aiROI?: number; aiScore?: number; aiRisiko?: string; kecamatan?: string; stage?: string; lokasi?: string; }
  const compItems: PortfolioItem[] = Array.isArray(portfolioComparables) ? portfolioComparables : [];
  const withPrice = compItems.filter(c => (c.hargaM2 ?? 0) > 0);
  const avgHargaM2Portfolio = withPrice.length > 0
    ? Math.round(withPrice.reduce((s, c) => s + (c.hargaM2 ?? 0), 0) / withPrice.length) : 0;
  const withROI = compItems.filter(c => c.aiROI != null);
  const avgROIPortfolio = withROI.length > 0
    ? parseFloat((withROI.reduce((s, c) => s + (c.aiROI ?? 0), 0) / withROI.length).toFixed(1)) : null;
  const avgScorePortfolio = withROI.length > 0
    ? Math.round(withROI.reduce((s, c) => s + (c.aiScore ?? 0), 0) / withROI.length) : null;
  const priceVsAvg = avgHargaM2Portfolio > 0
    ? parseFloat(((hargaM2Num / avgHargaM2Portfolio - 1) * 100).toFixed(1)) : null;
  const minHargaM2 = withPrice.length > 0 ? Math.min(...withPrice.map(c => c.hargaM2 ?? Infinity)) : null;
  const maxHargaM2Port = withPrice.length > 0 ? Math.max(...withPrice.map(c => c.hargaM2 ?? 0)) : null;
  const stageDist = compItems.reduce<Record<string, number>>((acc, c) => {
    if (c.stage) acc[c.stage] = (acc[c.stage] ?? 0) + 1;
    return acc;
  }, {});
  const stageDistStr = Object.entries(stageDist).map(([s, n]) => `${s}: ${n}`).join(", ") || "—";

  // ── Calculation Engine (deterministic) ───────────────────────────────────
  const calc = calculateLandMetrics({
    luas: luasNum, hargaM2: hargaM2Num, aksesJalan: aksesNum,
    bentukLahan: bentukLahan ?? "kotak",
    statusKepemilikan: statusKepemilikan ?? "Belum diketahui",
    konturLabel, floodRiskLabel,
    targetTipeRumah: tipe,
    hargaJualInput: hargaJualIn, biayaBangunInput: biayaBangunIn,
    biayaInfrastrukturPct: infraPct, biayaLegalPct: legalPct,
    fasilitasCount: fasilitasList.length,
    kondisiLingkungan: kondisiLingkungan ?? "aman",
    potensiPertumbuhan: potensiPertumbuhan ?? "sedang",
    hargaRumahSekitar: hargaRumahNum,
    elevAvg: hasTerrainData ? Number(elevAvg) : null,
    slopeAvgPct: hasTerrainData ? Number(slopeAvgPct) : null,
    konturSumber,
  });

  const { financials: fin, scores: sc, risks, landAllocation: la, unitPotential: up } = calc;

  // ── Topografi summary ─────────────────────────────────────────────────────
  const topografi = {
    kategoriKontur: konturLabel,
    elevAvg: hasTerrainData ? Number(elevAvg).toFixed(0) : "—",
    slopeAvg: hasTerrainData ? Number(slopeAvgPct).toFixed(1) : "—",
    risikoBanjir: waterwayDistNum != null
      ? (waterwayDistNum < 100 ? "Tinggi" : waterwayDistNum < 300 ? "Sedang" : waterwayDistNum < 500 ? "Waspada" : "Rendah")
      : "Tidak terdeteksi",
    biayaMatangModifier: ({ Datar:"Normal", Landai:"+8%", Miring:"+22%", Curam:"+45%" } as Record<string,string>)[konturLabel] ?? "Normal",
    sumber: konturSumber,
    waterwayInfo: waterwayDistNum != null ? `${Math.round(waterwayDistNum)}m${waterwayName ? ` (${waterwayType} ${waterwayName})` : ""}` : null,
  };

  // ── AI Narrative Engine ───────────────────────────────────────────────────
  // AI hanya menulis narasi — semua angka sudah dihitung di atas.
  const decisionLabel = { BELI: "BELI", BELI_DENGAN_NEGOSIASI: "BELI DENGAN NEGOSIASI", HOLD: "HOLD / TINJAU ULANG", JANGAN_BELI: "JANGAN BELI" }[sc.decision] ?? sc.decision;

  const prompt = `Kamu adalah SLIS (Satara Land Intelligence System), analis properti senior untuk Satara Development.

PERHATIAN: Semua angka finansial sudah dihitung oleh Calculation Engine. JANGAN menghitung ulang, JANGAN mengubah angka, JANGAN membuat angka baru. Tugasmu HANYA menulis narasi analisis berdasarkan hasil perhitungan di bawah.

════════════════════════════════════════
DATA LAHAN
════════════════════════════════════════
Nama / Lokasi  : ${lokasi || "—"}${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ") ? ` (${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")})` : ""}
Luas           : ${luasNum.toLocaleString("id-ID")} m² (${(luasNum / 10000).toFixed(2)} Ha)
Harga tanah    : Rp ${hargaM2Num.toLocaleString("id-ID")}/m²
Akses jalan    : ${aksesNum}m ${aksesNum >= 5 ? "(memenuhi standar)" : "(di bawah standar 5m)"}
Status legal   : ${statusKepemilikan ?? "Belum diketahui"}
Bentuk lahan   : ${bentukLahan ?? "kotak"}
Tipe target    : ${up.tipeLabel}
Fasilitas      : ${fasilitasList.join(", ") || "Tidak ada data"}
Utilitas       : ${Array.isArray(utilitas) ? utilitas.join(", ") : (utilitas || "Tidak ada data")}
Pertumbuhan    : ${potensiPertumbuhan ?? "sedang"}
Harga rumah sekitar: ${hargaRumahNum > 0 ? `Rp ${hargaRumahNum.toLocaleString("id-ID")}` : "Tidak tersedia"}
Catatan        : ${catatan || "Tidak ada"}

════════════════════════════════════════
CHECKLIST LAPANGAN & VERIFIKASI
════════════════════════════════════════
Survey Lokasi:
- Akses jalan min. 5m     : ${ci("akses_jalan_5m") ? "TERPENUHI" : "BELUM DIVERIFIKASI"}
- Fasilitas umum dekat    : ${ci("dekat_fasilitas") ? "TERPENUHI" : "BELUM DIVERIFIKASI"}
- Lingkungan aman         : ${ci("lingkungan_aman") ? "TERPENUHI" : "BELUM DIVERIFIKASI"}
- Potensi pertumbuhan     : ${ci("potensi_pertumbuhan") ? "TERPENUHI" : "BELUM DIVERIFIKASI"}
- Utilitas tersedia       : ${ci("utilitas_tersedia") ? "TERPENUHI" : "BELUM DIVERIFIKASI"}
Survei Kompetitor:
- Harga jual sekitar      : ${ci("harga_rumah_sekitar") ? `Rp ${hargaRumahNum.toLocaleString("id-ID")} (${cVals.harga_rumah_sekitar || "—"})` : "Belum disurvei"}
- Tipe produk di pasar    : ${cVals.tipe_rumah_sekitar || "Belum disurvei"}
- Kecepatan penjualan     : ${cVals.kecepatan_penjualan || "Belum disurvei"}
- Occupancy rate area     : ${cVals.occupancy_rate ? cVals.occupancy_rate + "%" : "Belum disurvei"}
- Sistem pembayaran pasar : ${cVals.sistem_pembayaran || "Belum disurvei"}
Negosiasi & Legal:
- Kerja sama lahan        : ${ci("kerja_sama_lahan") ? "SETUJU" : "BELUM"}
- Legalitas pemilik       : ${ci("legalitas_pemilik") ? "CLEAR" : "BELUM"}
- SHM / Alas hak          : ${ci("shm_alas_hak") ? "CLEAR" : "BELUM DIVERIFIKASI"}
- Bebas sengketa          : ${ci("bebas_sengketa") ? "CLEAR" : "BELUM DIVERIFIKASI"}
- Batas tanah jelas       : ${ci("batas_tanah") ? "CLEAR" : "BELUM DIVERIFIKASI"}
- BPHTB                   : ${ci("bphtb") ? "CLEAR" : "BELUM DIVERIFIKASI"}
- Kelengkapan berkas      : ${ci("kelengkapan_berkas") ? "LENGKAP" : "BELUM DIVERIFIKASI"}
Pengumpulan Data Teknis:
- Luas lahan terukur      : ${ci("luas_lahan_teknis") ? "TERUKUR" : "BELUM"}
- Topografi               : ${ci("topografi") ? "SUDAH" : "BELUM"}
- Peil banjir             : ${ci("peil_banjir") ? "SUDAH" : "BELUM"}

════════════════════════════════════════
DATA KOMPETITOR PROPERTI — TINGKAT KECAMATAN (${compListKec.length} di Kec. ${kecamatan ?? "—"})
════════════════════════════════════════
${compListKec.length > 0 ? compListKec.slice(0, 15).map((c, i) => `${i + 1}. ${c.name} (${c.type}) — ${[c.kelurahan, c.kecamatan].filter(Boolean).join(", ")}${c.pengembang ? ` — Developer: ${c.pengembang}` : ""}${c.totalUnit ? ` — ${c.totalUnit} unit` : ""}`).join("\n") : `Tidak ada data kompetitor di database untuk Kec. ${kecamatan ?? "—"}. Ini bisa berarti peluang first-mover ATAU demand rendah — analisis harus mempertimbangkan kedua kemungkinan ini.`}

DATA KOMPETITOR PROPERTI — TINGKAT KABUPATEN (${compList.length} di ${kabupaten ?? "kabupaten ini"})
════════════════════════════════════════
${compList.length > 0 ? compList.slice(0, 20).map((c, i) => `${i + 1}. ${c.name} (${c.type}) — ${[c.kelurahan, c.kecamatan, c.kabupaten].filter(Boolean).join(", ")}${c.pengembang ? ` — Developer: ${c.pengembang}` : ""}${c.totalUnit ? ` — ${c.totalUnit} unit` : ""}`).join("\n") : `Tidak ada data kompetitor di database lokal untuk ${kabupaten ?? "area ini"}.`}

════════════════════════════════════════
DATA TOPOGRAFI (${konturSumber})
════════════════════════════════════════
Kategori kontur  : ${konturLabel}
Elevasi rata-rata: ${topografi.elevAvg}m
Kemiringan       : ${topografi.slopeAvg}%
Risiko banjir    : ${topografi.risikoBanjir}${topografi.waterwayInfo ? ` — sungai/saluran ${topografi.waterwayInfo}` : ""}
Modifier biaya   : ${topografi.biayaMatangModifier}

════════════════════════════════════════
HASIL CALCULATION ENGINE (SUDAH FINAL)
════════════════════════════════════════
SKOR KELAYAKAN : ${sc.total}/100 → ${sc.category}
KEPUTUSAN      : ${decisionLabel}

ALOKASI LAHAN:
- Luas efektif kavling: ${la.luasEfektif.toLocaleString("id-ID")} m² (${la.efficiencyPct}% dari total)
- Jalan internal     : ${la.luasJalan.toLocaleString("id-ID")} m²
- Fasum & RTH        : ${la.luasFasum.toLocaleString("id-ID")} m²
- Area tidak efektif : ${la.luasTidakEfektif.toLocaleString("id-ID")} m²

POTENSI UNIT:
- Minimum   : ${up.unitMin} unit (kavling ${up.kavlingMax}m²)
- Realistis : ${up.unitRealistis} unit (kavling ${up.kavlingDefault}m²)
- Maksimum  : ${up.unitMax} unit (kavling ${up.kavlingMin}m²)

PROYEKSI FINANSIAL (${up.unitRealistis} unit realistis):
- Total akuisisi     : ${rp(fin.totalAkuisisi)}
- Biaya infrastruktur: ${rp(fin.biayaInfrastruktur)} (${infraPct}% × kontur modifier ${KONTUR_INFRA_MODIFIER[konturLabel]?.toFixed(2)})
- Biaya legal & pajak: ${rp(fin.biayaLegal)} (${legalPct}%)
- Biaya konstruksi   : ${rp(fin.biayaKonstruksi)} (${up.unitRealistis} unit × ${rp(fin.biayaBangunFinal)})
- Kontingency 5%     : ${rp(fin.kontingensiBiaya)}
- TOTAL HPP          : ${rp(fin.totalHPP)}
- REVENUE            : ${rp(fin.revenue)} (${up.unitRealistis} × ${rp(fin.hargaJualFinal)})
- PROFIT             : ${rp(fin.profit)}
- ROI                : ${fin.roi}%
- MARGIN GROSS       : ${fin.margin}%
- PAYBACK PERIOD     : ${fin.paybackBulan} bulan
- Harga jual/unit    : ${rp(fin.hargaJualFinal)}${fin.usingDefaultHargaJual ? " (asumsi default)" : ""}
- Biaya bangun/unit  : ${rp(fin.biayaBangunFinal)}${fin.usingDefaultBiayaBangun ? " (asumsi default)" : ""}
- HPP / unit         : ${rp(fin.hppPerUnit)}
- Margin / unit      : ${rp(fin.marginPerUnit)} (${fin.marginPerUnitPct}%)
- HARGA MAKS AKUISISI: Rp ${fin.maxHargaM2.toLocaleString("id-ID")}/m² (agar ROI ≥ 25%)
- Target negosiasi   : Rp ${fin.negotTargetM2.toLocaleString("id-ID")}/m²

PENILAIAN RISIKO:
- Hukum/Legal  : ${risks.legalRisk} (skor ${risks.legalRiskScore})
- Akses jalan  : ${risks.aksesRisk} (skor ${risks.aksesRiskScore})
- Kontur lahan : ${risks.konturRisk} (skor ${risks.konturRiskScore})
- Banjir       : ${risks.banjirRisk} (skor ${risks.banjirRiskScore})
- Harga tanah  : ${risks.hargaRisk} (skor ${risks.hargaRiskScore})
- Pasar/Demand : ${risks.marketRisk} (skor ${risks.marketRiskScore})
- RISIKO OVERALL: ${risks.overallRisk}

BOBOT SKOR:
- Lokasi & akses   : ${sc.lokasiScore}/100 × 20% = ${(sc.lokasiScore * 0.20).toFixed(1)} pt
- Harga tanah      : ${sc.hargaScore}/100 × 20% = ${(sc.hargaScore * 0.20).toFixed(1)} pt
- Potensi unit     : ${sc.unitScore}/100 × 15% = ${(sc.unitScore * 0.15).toFixed(1)} pt
- Potensi ROI      : ${sc.roiScore}/100 × 20% = ${(sc.roiScore * 0.20).toFixed(1)} pt
- Legalitas        : ${sc.legalScore}/100 × 10% = ${(sc.legalScore * 0.10).toFixed(1)} pt
- Kompetitor/pasar : ${sc.pasarScore}/100 × 10% = ${(sc.pasarScore * 0.10).toFixed(1)} pt
- Risiko teknis    : ${sc.teknisScore}/100 × 5%  = ${(sc.teknisScore * 0.05).toFixed(1)} pt
- TOTAL SKOR       : ${sc.total}/100 → ${sc.category}

════════════════════════════════════════
BENCHMARK PORTOFOLIO INTERNAL (${compItems.length} prospek lain di ${kabupaten ?? "kabupaten ini"})
════════════════════════════════════════
${compItems.length > 0 ? `Harga tanah/m² portofolio (${withPrice.length} lahan dengan data harga):
- Rata-rata harga tanah/m²  : Rp ${avgHargaM2Portfolio.toLocaleString("id-ID")}/m²
- Range harga               : Rp ${(minHargaM2 ?? 0).toLocaleString("id-ID")} – Rp ${(maxHargaM2Port ?? 0).toLocaleString("id-ID")}/m²
- Lahan ini (${hargaM2Num.toLocaleString("id-ID")}/m²)  : ${priceVsAvg != null ? (priceVsAvg <= 0 ? `${Math.abs(priceVsAvg)}% LEBIH MURAH dari rata-rata portofolio (peluang akuisisi lebih baik)` : `${priceVsAvg}% LEBIH MAHAL dari rata-rata portofolio (perlu negosiasi lebih ketat)`) : "tidak dapat dibandingkan"}

Kinerja portofolio (${withROI.length} lahan sudah dianalisis AI):
- Rata-rata ROI portofolio   : ${avgROIPortfolio != null ? avgROIPortfolio + "%" : "Belum ada lahan yang dianalisis"}
- Rata-rata skor portofolio  : ${avgScorePortfolio ?? "—"}/100
- Lahan ini ROI ${fin.roi}%       : ${avgROIPortfolio != null ? (fin.roi >= avgROIPortfolio ? `+${(fin.roi - avgROIPortfolio).toFixed(1)}% DI ATAS rata-rata portofolio` : `${(fin.roi - avgROIPortfolio).toFixed(1)}% di bawah rata-rata portofolio`) : "—"}
- Pipeline stages            : ${stageDistStr}` : `PROSPEK PERTAMA di ${kabupaten ?? "kabupaten ini"} — belum ada data portofolio internal. Gunakan benchmark pasar eksternal sebagai referensi.`}

════════════════════════════════════════
INSTRUKSI WAJIB ANALISIS KOMPETITOR:
Kamu WAJIB mengisi analisisKompetitor dengan menyebutkan nama-nama kompetitor spesifik dari daftar di atas.
- Jika ada kompetitor di kecamatan ${kecamatan ?? "yang sama"}: sebutkan nama, pengembang, dan tipe produk mereka secara spesifik.
- Jika TIDAK ada kompetitor di kecamatan tersebut: jelaskan apakah ini peluang first-mover atau tanda demand rendah, dan bandingkan dengan kompetitor kabupaten terdekat.
- JANGAN isi dengan kalimat generik. Selalu referensikan data aktual dari daftar di atas.
════════════════════════════════════════

TUGASMU: Hasilkan HANYA JSON berikut, tanpa markdown, tanpa teks lain:
{
  "ringkasanEksekutif": "<3-4 paragraf (300-400 kata). Jelaskan mengapa lahan ini mendapat skor ${sc.total} dan kategori '${sc.category}'. Sebutkan kekuatan utama dan kelemahan utama berdasarkan data di atas. Kontekskan dengan strategi developer perumahan di ${kabupaten ?? "Sulawesi Selatan"}.>",
  "analisisLokasi": "<2-3 paragraf (200-300 kata). Analisis ${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ") || "lokasi ini"}: aksesibilitas, fasilitas terdekat, kondisi sekitar, potensi pertumbuhan, daya tarik bagi pembeli rumah.>",
  "analisisFisikLahan": "<2-3 paragraf (200-300 kata). Analisis bentuk lahan (${bentukLahan}), kontur (${konturLabel}), implikasi teknis, potensi hambatan, rekomendasi tata letak kavling dan posisi fasum.>",
  "analisisKompetitor": {
    "tingkatPersaingan": "<Tinggi/Sedang/Rendah — berdasarkan jumlah kompetitor di kecamatan dan kabupaten>",
    "kompetitorKecamatan": "<WAJIB 2-3 paragraf. Sebutkan nama-nama spesifik kompetitor di Kec. ${kecamatan ?? "—"} dari daftar di atas. Jika tidak ada: jelaskan implikasi pasar apakah peluang first-mover atau gap demand. Bandingkan dengan kecamatan terdekat yang ada kompetitornya.>",
    "kompetitorKabupaten": "<WAJIB 2 paragraf. Sebutkan 3-5 kompetitor terkuat di ${kabupaten ?? "kabupaten ini"} dari daftar, beserta developer, tipe produk, dan skala proyek. Jelaskan lanskap persaingan di level kabupaten.>",
    "posisiHarga": "<1-2 paragraf. Bandingkan target harga jual ${rp(fin.hargaJualFinal)} dengan harga pasar kompetitor di area (gunakan data harga rumah sekitar: ${hargaRumahNum > 0 ? "Rp " + hargaRumahNum.toLocaleString("id-ID") : "tidak tersedia"}). Rekomendasikan strategi harga konkret.>",
    "rekomendasiSegmen": "<1 paragraf. Segmen pembeli yang paling tepat dan strategi diferensiasi produk vs kompetitor yang ada.>"
  },
  "analisisRisiko": [
    { "risiko": "Risiko Hukum/Legal", "level": "${risks.legalRisk}", "deskripsi": "<1-2 kalimat menjelaskan kondisi legal dan implikasinya>", "mitigasi": "<langkah mitigasi konkret>" },
    { "risiko": "Risiko Akses Jalan", "level": "${risks.aksesRisk}", "deskripsi": "<kondisi akses dan dampaknya>", "mitigasi": "<tindakan konkret>" },
    { "risiko": "Risiko Kontur Lahan", "level": "${risks.konturRisk}", "deskripsi": "<kondisi topografi dan implikasi biaya>", "mitigasi": "<langkah teknis konkret>" },
    { "risiko": "Risiko Banjir", "level": "${risks.banjirRisk}", "deskripsi": "<kondisi hidrologi dan risiko>", "mitigasi": "<langkah mitigasi>" },
    { "risiko": "Risiko Harga Tanah", "level": "${risks.hargaRisk}", "deskripsi": "<apakah harga sesuai/overpriced vs potensi ROI>", "mitigasi": "<strategi negosiasi atau pengelolaan biaya>" },
    { "risiko": "Risiko Pasar/Permintaan", "level": "${risks.marketRisk}", "deskripsi": "<kondisi permintaan lokal dan daya serap>", "mitigasi": "<strategi marketing dan segmentasi>" }
  ],
  "rekomendasiNarasi": "<2-3 paragraf (200-300 kata). Jelaskan keputusan '${decisionLabel}' — mengapa, kondisi apa yang harus dipenuhi, dan apa langkah selanjutnya. Jika BELI DENGAN NEGOSIASI: sebutkan bahwa harga saat ini Rp ${hargaM2Num.toLocaleString("id-ID")}/m² vs target maksimum Rp ${fin.maxHargaM2.toLocaleString("id-ID")}/m² dan target negosiasi Rp ${fin.negotTargetM2.toLocaleString("id-ID")}/m².>",
  "legalChecklist": [
    { "item": "<tindakan legal spesifik 1 sesuai status ${statusKepemilikan ?? "Belum diketahui"}>", "prioritas": "tinggi" },
    { "item": "<tindakan legal spesifik 2>", "prioritas": "tinggi" },
    { "item": "<tindakan legal spesifik 3>", "prioritas": "sedang" },
    { "item": "<tindakan legal spesifik 4>", "prioritas": "sedang" },
    { "item": "<tindakan legal spesifik 5>", "prioritas": "sedang" },
    { "item": "<tindakan legal spesifik 6>", "prioritas": "rendah" },
    { "item": "<tindakan legal spesifik 7>", "prioritas": "rendah" }
  ],
  "draftMou": "<Draft MOU formal 400-500 kata. NOTA KESEPAHAMAN (MOU). Pasal 1 Identitas Para Pihak. Pasal 2 Objek Perjanjian (sebutkan ${lokasi || "lokasi lahan"}, ${luasNum.toLocaleString("id-ID")} m²). Pasal 3 Harga dan Cara Pembayaran (sebutkan Rp ${hargaM2Num.toLocaleString("id-ID")}/m², total Rp ${fin.totalAkuisisi.toLocaleString("id-ID")}). Pasal 4 Jangka Waktu. Pasal 5 Kewajiban Penjual. Pasal 6 Kondisi Penangguhan. Pasal 7 Penyelesaian Sengketa. Tanda tangan.>",
  "nextActions": [
    "<aksi prioritas 1 — konkret dengan timeline>",
    "<aksi prioritas 2>",
    "<aksi prioritas 3>",
    "<aksi prioritas 4>"
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      max_tokens: 6000,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log.error({ content }, "AI narrative response not valid JSON");
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }

    const aiNarrative = JSON.parse(jsonMatch[0]);

    // Portfolio benchmark data (dikembalikan ke frontend)
    const portfolioBenchmark = {
      totalInKabupaten: compItems.length,
      analyzedCount: withROI.length,
      withPriceCount: withPrice.length,
      avgHargaM2: avgHargaM2Portfolio,
      minHargaM2: minHargaM2 ?? null,
      maxHargaM2: maxHargaM2Port ?? null,
      priceVsAvg,
      avgROI: avgROIPortfolio,
      avgScore: avgScorePortfolio,
      roiVsAvg: avgROIPortfolio != null ? parseFloat((fin.roi - avgROIPortfolio).toFixed(1)) : null,
      scoreVsAvg: avgScorePortfolio != null ? sc.total - avgScorePortfolio : null,
    };

    res.json({
      // Calculated (deterministic)
      skor: sc.total,
      kategori: sc.category,
      decision: sc.decision,
      calc,
      topografi,
      portfolioBenchmark,

      // AI Narrative
      ai: aiNarrative,

      // Backward-compat aliases
      estimasi_hpp: {
        asumsi_unit: up.unitRealistis,
        luas_efektif_m2: la.luasEfektif,
        luas_fasum_m2: la.luasFasum,
        luas_jalan_m2: la.luasJalan,
        harga_tanah_total: fin.totalAkuisisi,
        harga_tanah_per_unit: fin.tanahPerUnit,
        biaya_matang_per_unit: fin.infraPerUnit,
        biaya_konstruksi_per_unit: fin.biayaBangunFinal,
        overhead_per_unit: fin.legalPerUnit + fin.kontingensiPerUnit,
        hpp_per_unit: fin.hppPerUnit,
        harga_jual_recommended: fin.hargaJualFinal,
        margin_pct: fin.marginPerUnitPct,
        total_revenue: fin.revenue,
        total_profit: fin.profit,
        roi_pct: fin.roi,
        irr_pct: Math.round(fin.roi * 0.75),
        npv: Math.round(fin.profit * 0.85),
        payback_bulan: fin.paybackBulan,
        risk_level: risks.overallRisk,
      },
      rekomendasi_harga_maks_m2: fin.maxHargaM2,
    });
  } catch (err) {
    req.log.error({ err }, "Land assessment AI failed");
    res.status(500).json({ error: "Gagal menghubungi layanan AI" });
  }
});

export default router;
