import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LandProspect } from "@workspace/api-client-react";

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const NAVY   = [10, 22, 45]   as [number, number, number];
const GOLD   = [192, 148, 30] as [number, number, number];
const BLACK  = [15, 15, 15]   as [number, number, number];
const GRAY   = [95, 95, 95]   as [number, number, number];
const LGRAY  = [185, 185, 185] as [number, number, number];
const BGLIGHT = [246, 247, 248] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const GREEN  = [22, 130, 80]  as [number, number, number];
const RED    = [190, 40, 40]  as [number, number, number];
const AMBER  = [180, 110, 20] as [number, number, number];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiResult {
  verdict: string;
  score: number;
  ringkasan: string;
  kelebihan: string[];
  risiko: string[];
  rekomendasi: string;
  potensiUnit?: number;
  hargaMaksAkuisisi?: number;
  roiEstimasi?: number;
  paybackBulan?: number;
  potensiRevenue?: number;
  estimasiHPP?: number;
  estimasiProfit?: number;
  irr?: number;
  efektivitasKavling?: number;
  luasFasum?: number;
  luasJalan?: number;
  tingkatRisiko?: string;
}

export interface TerrainData {
  elevMin?: number;
  elevMax?: number;
  elevAvg?: number;
  slopeAvgPct?: number;
  slopeMaxPct?: number;
  waterwayType?: string;
  waterwayName?: string;
  waterwayDistM?: number | null;
}

export interface CompetitorEntry {
  name: string;
  type: string;
  distanceKm?: number;
}

export interface DocPayload {
  prospect: LandProspect;
  checkedItems: string[];
  aiResult?: AiResult | null;
  fullAiResult?: Record<string, unknown> | null;
  terrain?: TerrainData | null;
  competitors?: CompetitorEntry[];
  bentukLahan?: string;
  statusLegal?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("id-ID");
}
function fmtRp(n?: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
function today() {
  return new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
function address(p: LandProspect) {
  return [p.kelurahan, p.kecamatan, p.kabupaten].filter(Boolean).join(", ");
}

// ─── Shared Header/Footer ─────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const W = doc.internal.pageSize.getWidth();

  // Navy bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 28, "F");

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text("SATARA DEVELOPMENT", 14, 11);

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(14, 14, 60, 1, "F");

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  doc.text("Internal Operations Dashboard — Strictly Confidential", 14, 21);

  // Doc type badge (right side)
  doc.setFillColor(...GOLD);
  const badgeW = Math.min(90, doc.getTextWidth(title) + 14);
  doc.roundedRect(W - badgeW - 10, 6, badgeW, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(title, W - badgeW - 10 + badgeW / 2, 16, { align: "center" });

  // Subtitle bar
  doc.setFillColor(...BGLIGHT);
  doc.rect(0, 28, W, 10, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(subtitle, 14, 35);
  doc.text(`Dicetak: ${today()}`, W - 14, 35, { align: "right" });
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 10, W, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("Dokumen ini bersifat rahasia dan hanya untuk penggunaan internal Satara Development.", 14, H - 3.5);
  doc.text(`Hal. ${pageNum} / ${totalPages}`, W - 14, H - 3.5, { align: "right" });
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(14, y, W - 28, 8, "F");
  doc.setFillColor(...GOLD);
  doc.rect(14, y, 3, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(text.toUpperCase(), 20, y + 5.5);
  return y + 12;
}

function kv(doc: jsPDF, label: string, value: string, x: number, y: number, halfW: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(value, x + halfW, y);
}

// ─── 1. PROPOSAL AKUISISI ─────────────────────────────────────────────────────

export function generateProposalAkuisisi(payload: DocPayload) {
  const { prospect, aiResult, bentukLahan, statusLegal } = payload;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 42;

  drawHeader(doc, "PROPOSAL AKUISISI", `Proposal Pengambilalihan Lahan — ${prospect.lokasi}`);

  // Identitas lahan
  y = sectionTitle(doc, "01  Identitas Lahan", y);
  const halfW = (W - 28) / 2;
  const rows1 = [
    ["Nama Lokasi", prospect.lokasi, "Kabupaten", prospect.kabupaten ?? "—"],
    ["Kecamatan",   prospect.kecamatan ?? "—", "Kelurahan", prospect.kelurahan ?? "—"],
    ["Luas Lahan",  `${fmt(prospect.luas)} m²`, "Harga / m²", `Rp ${fmt(prospect.hargaM2)}`],
    ["Total Harga", fmtRp(prospect.luas * prospect.hargaM2), "Status Pipeline", prospect.status.replace(/_/g, " ").toUpperCase()],
    ["Bentuk Lahan", bentukLahan || "—", "Status Legal", statusLegal || "—"],
  ];
  rows1.forEach(([l1, v1, l2, v2]) => {
    kv(doc, l1, v1, 14, y, halfW / 2.2);
    kv(doc, l2, v2, 14 + halfW, y, halfW / 2.2);
    y += 6;
  });

  y += 4;

  // Financial snapshot
  y = sectionTitle(doc, "02  Proyeksi Finansial", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Parameter", "Nilai", "Parameter", "Nilai"]],
    body: [
      ["Potensi Unit",    aiResult?.potensiUnit ? `${aiResult.potensiUnit} unit` : "Belum dianalisis",
       "ROI Estimasi",    aiResult?.roiEstimasi ? `${aiResult.roiEstimasi}%` : `${prospect.roi}% (input)`],
      ["Harga Maks Akuisisi", fmtRp(aiResult?.hargaMaksAkuisisi),
       "Payback Period",  aiResult?.paybackBulan ? `${aiResult.paybackBulan} bulan` : "—"],
      ["Potensi Revenue",  fmtRp(aiResult?.potensiRevenue),
       "Estimasi HPP",    fmtRp(aiResult?.estimasiHPP)],
      ["Estimasi Profit",  fmtRp(aiResult?.estimasiProfit),
       "IRR",             aiResult?.irr ? `${aiResult.irr}%` : "—"],
    ],
    styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: { 0: { textColor: GRAY, fontStyle: "normal" }, 2: { textColor: GRAY, fontStyle: "normal" } },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // AI Analysis
  if (aiResult) {
    y = sectionTitle(doc, "03  Analisis AI", y);

    // Verdict box
    const verdictColor = aiResult.score >= 75 ? GREEN : aiResult.score >= 55 ? AMBER : RED;
    doc.setFillColor(...BGLIGHT);
    doc.setDrawColor(...verdictColor);
    doc.roundedRect(14, y, W - 28, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...verdictColor);
    doc.text(`${aiResult.score}`, 26, y + 12);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("/100", 36, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...verdictColor);
    doc.text(aiResult.verdict, 50, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Tingkat Risiko: ${aiResult.tingkatRisiko ?? "—"}`, 50, y + 13);
    y += 23;

    // Ringkasan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text("RINGKASAN EKSEKUTIF", 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(aiResult.ringkasan, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 4;

    // Kelebihan & Risiko table
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Kelebihan / Potensi", "Risiko / Catatan"]],
      body: Array.from({ length: Math.max(aiResult.kelebihan.length, aiResult.risiko.length) }, (_, i) => [
        aiResult.kelebihan[i] ?? "",
        aiResult.risiko[i] ?? "",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
      columnStyles: { 0: { textColor: [22, 130, 80] as [number,number,number] }, 1: { textColor: RED } },
      tableLineColor: LGRAY,
      tableLineWidth: 0.1,
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // Rekomendasi
    y = sectionTitle(doc, "04  Rekomendasi", y);
    doc.setFillColor(...BGLIGHT);
    doc.setDrawColor(...GOLD);
    doc.roundedRect(14, y, W - 28, 2 + doc.splitTextToSize(aiResult.rekomendasi, W - 36).length * 4.5 + 4, 2, 2, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    const rekLines = doc.splitTextToSize(aiResult.rekomendasi, W - 36);
    doc.text(rekLines, 18, y + 5);
    y += rekLines.length * 4.5 + 10;
  } else {
    y = sectionTitle(doc, "03  Analisis AI", y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("Analisis AI belum dijalankan untuk lahan ini. Jalankan analisis dari dashboard akuisisi.", 14, y + 6);
    y += 16;
  }

  // Sign-off
  y = sectionTitle(doc, "05  Persetujuan & Tanda Tangan", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Disiapkan Oleh", "Direview Oleh", "Disetujui Oleh"]],
    body: [["\n\n\n_____________________\nLand Acquisition Team", "\n\n\n_____________________\nProject Manager", "\n\n\n_____________________\nDirektur"]],
    styles: { fontSize: 8.5, cellPadding: 4, halign: "center", textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });

  // Footer all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`Proposal_Akuisisi_${prospect.lokasi.replace(/\s+/g, "_")}.pdf`);
}

// ─── 2. SITE ANALYSIS ─────────────────────────────────────────────────────────

export function generateSiteAnalysis(payload: DocPayload) {
  const { prospect, terrain, competitors } = payload;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 42;

  drawHeader(doc, "SITE ANALYSIS", `Analisis Lokasi — ${prospect.lokasi}`);

  // Identitas
  y = sectionTitle(doc, "01  Identitas Lokasi", y);
  const cols: [string, string][] = [
    ["Nama Lokasi",   prospect.lokasi],
    ["Alamat",        address(prospect) || "—"],
    ["Koordinat",     prospect.lat != null ? `${prospect.lat?.toFixed(6)}, ${prospect.lng?.toFixed(6)}` : "—"],
    ["Luas Lahan",    `${fmt(prospect.luas)} m²  (${(prospect.luas / 10000).toFixed(3)} Ha)`],
    ["Harga Tanah",   `Rp ${fmt(prospect.hargaM2)} / m²  —  Total: ${fmtRp(prospect.luas * prospect.hargaM2)}`],
  ];
  cols.forEach(([l, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(l + " :", 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(v, 55, y);
    y += 6;
  });
  y += 2;

  // Terrain data
  y = sectionTitle(doc, "02  Data Topografi & Kontur", y);
  if (terrain && (terrain.elevAvg != null || terrain.slopeAvgPct != null)) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Parameter Topografi", "Nilai", "Catatan"]],
      body: [
        ["Elevasi Minimum",  terrain.elevMin != null ? `${terrain.elevMin} mdpl` : "—", ""],
        ["Elevasi Maksimum", terrain.elevMax != null ? `${terrain.elevMax} mdpl` : "—", ""],
        ["Elevasi Rata-rata", terrain.elevAvg != null ? `${terrain.elevAvg} mdpl` : "—",
          terrain.elevAvg != null && terrain.elevAvg < 100 ? "Dataran rendah, cocok untuk perumahan" :
          terrain.elevAvg != null && terrain.elevAvg < 500 ? "Dataran sedang, perlu cut & fill minimal" : "Dataran tinggi, biaya cut & fill tinggi"],
        ["Slope Rata-rata", terrain.slopeAvgPct != null ? `${terrain.slopeAvgPct}%` : "—",
          terrain.slopeAvgPct != null && terrain.slopeAvgPct < 8 ? "Flat — ideal pengembangan" :
          terrain.slopeAvgPct != null && terrain.slopeAvgPct < 15 ? "Landai — perlu cut & fill ringan" : "Curam — cut & fill signifikan"],
        ["Slope Maksimum",  terrain.slopeMaxPct != null ? `${terrain.slopeMaxPct}%` : "—", ""],
        ["Badan Air Terdekat", terrain.waterwayName ?? terrain.waterwayType ?? "—",
          terrain.waterwayDistM != null ? `Jarak: ${terrain.waterwayDistM} m` : ""],
      ],
      styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: BGLIGHT },
      columnStyles: { 2: { textColor: GRAY, fontStyle: "italic" } },
      tableLineColor: LGRAY,
      tableLineWidth: 0.1,
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text("Data topografi belum tersedia. Pastikan lahan memiliki koordinat yang valid.", 14, y + 5);
    y += 14;
  }

  // Competitor analysis
  y = sectionTitle(doc, "03  Analisis Kompetitor", y);
  if (competitors && competitors.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["No", "Nama Pengembangan", "Tipe", "Jarak (km)"]],
      body: competitors.slice(0, 15).map((c, i) => [
        `${i + 1}`,
        c.name,
        c.type,
        c.distanceKm != null ? `${c.distanceKm} km` : "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: BGLIGHT },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 3: { halign: "center" } },
      tableLineColor: LGRAY,
      tableLineWidth: 0.1,
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Total ${competitors.length} kompetitor teridentifikasi dalam radius survei. Sumber: OpenStreetMap.`, 14, y);
    y += 8;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text("Data kompetitor belum dimuat. Jalankan pencarian kompetitor dari panel akuisisi.", 14, y + 5);
    y += 14;
  }

  // Checklist survey
  y = sectionTitle(doc, "04  Checklist Survey Lapangan", y);
  const surveyItems = [
    { key: "akses_jalan_5m",      label: "Akses jalan minimal 5 meter" },
    { key: "dekat_fasilitas",     label: "Dekat market / fasilitas umum" },
    { key: "lingkungan_aman",     label: "Lingkungan aman" },
    { key: "potensi_pertumbuhan", label: "Potensi pertumbuhan wilayah" },
    { key: "utilitas_tersedia",   label: "Utilitas tersedia" },
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Item Survey", "Status"]],
    body: surveyItems.map(item => [
      item.label,
      payload.checkedItems.includes(item.key) ? "TERPENUHI" : "Belum Diverifikasi",
    ]),
    styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      1: {
        halign: "center",
        fontStyle: "bold",
      },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === "body") {
        const val = data.cell.text[0];
        if (val === "TERPENUHI") data.cell.styles.textColor = GREEN;
        else data.cell.styles.textColor = AMBER;
      }
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });

  // ── 05  Analisis AI — Kelayakan Investasi ────────────────────────────────
  const ar = payload.aiResult;
  const far = payload.fullAiResult;
  const calcFin = far?.calc ? ((far.calc as Record<string, unknown>).financials as Record<string, number> | undefined) : undefined;
  const aiNarr = far?.ai as Record<string, unknown> | undefined;
  const aiRisikos = aiNarr?.analisisRisiko as Array<{ risiko: string; level: string; deskripsi: string; mitigasi: string }> | undefined;
  const farDecision = far?.decision as string | undefined;

  // Helper: ensure enough space or add new page
  function ensureSpace(neededMm: number) {
    if (y + neededMm > doc.internal.pageSize.getHeight() - 16) {
      doc.addPage();
      drawHeader(doc, "SITE ANALYSIS", `Analisis Lokasi — ${prospect.lokasi}`);
      y = 42;
    }
  }

  if (ar) {
    ensureSpace(50);
    y = sectionTitle(doc, "05  Analisis AI — Kelayakan Investasi", y);

    // Verdict box
    const verdictColor = ar.score >= 75 ? GREEN : ar.score >= 55 ? AMBER : RED;
    doc.setFillColor(...BGLIGHT);
    doc.setDrawColor(...verdictColor);
    doc.roundedRect(14, y, W - 28, 22, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...verdictColor);
    doc.text(`${ar.score}`, 28, y + 15);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("/100", 42, y + 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...verdictColor);
    doc.text(ar.verdict, 56, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Tingkat Risiko: ${ar.tingkatRisiko ?? "—"}`, 56, y + 16);
    if (farDecision) {
      const decLabel = farDecision.replace(/_/g, " ");
      doc.setFillColor(...verdictColor);
      doc.roundedRect(W - 58, y + 5, 44, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...WHITE);
      doc.text(decLabel, W - 36, y + 13, { align: "center" });
    }
    y += 28;

    // Financial metrics table
    ensureSpace(30);
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Metrik Finansial", "Nilai", "Metrik Finansial", "Nilai"]],
      body: [
        ["Estimasi HPP",     fmtRp(calcFin?.hpp ?? ar.estimasiHPP),
         "Potensi Revenue",  fmtRp(calcFin?.revenue ?? ar.potensiRevenue)],
        ["Estimasi Profit",  fmtRp(calcFin?.profit ?? ar.estimasiProfit),
         "ROI Estimasi",     calcFin?.roi != null ? `${(calcFin.roi as number).toFixed(1)}%` : ar.roiEstimasi ? `${ar.roiEstimasi}%` : "—"],
        ["Margin",           calcFin?.margin != null ? `${(calcFin.margin as number).toFixed(1)}%` : "—",
         "Payback Period",   calcFin?.paybackBulan != null ? `${calcFin.paybackBulan} bulan` : ar.paybackBulan ? `${ar.paybackBulan} bulan` : "—"],
        ["Potensi Unit",     ar.potensiUnit ? `${ar.potensiUnit} unit` : "—",
         "Harga Maks Akuisisi", fmtRp(ar.hargaMaksAkuisisi)],
      ],
      styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: BGLIGHT },
      columnStyles: { 0: { textColor: GRAY }, 2: { textColor: GRAY } },
      tableLineColor: LGRAY,
      tableLineWidth: 0.1,
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // Ringkasan eksekutif
    const ringkasan = (aiNarr?.ringkasanEksekutif as string | undefined) ?? ar.ringkasan;
    if (ringkasan) {
      const lines = doc.splitTextToSize(ringkasan, W - 28);
      ensureSpace(12 + lines.length * 4.2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text("RINGKASAN EKSEKUTIF", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      // Split into chunks to handle page breaks mid-text
      const H = doc.internal.pageSize.getHeight();
      let lineIdx = 0;
      while (lineIdx < lines.length) {
        const remaining = Math.floor((H - 16 - y) / 4.2);
        const chunk = lines.slice(lineIdx, lineIdx + Math.max(1, remaining));
        doc.text(chunk, 14, y);
        y += chunk.length * 4.2;
        lineIdx += chunk.length;
        if (lineIdx < lines.length) {
          doc.addPage();
          drawHeader(doc, "SITE ANALYSIS", `Analisis Lokasi — ${prospect.lokasi}`);
          y = 42;
        }
      }
      y += 6;
    }

    // Risiko detail table (dari fullAiResult) atau fallback ke simple list
    if (aiRisikos && aiRisikos.length > 0) {
      ensureSpace(30);
      y = sectionTitle(doc, "06  Analisis Risiko Detail", y);
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [["Risiko", "Level", "Deskripsi", "Mitigasi"]],
        body: aiRisikos.map(r => [r.risiko ?? "", r.level ?? "", r.deskripsi ?? "", r.mitigasi ?? ""]),
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: BLACK, overflow: "linebreak" },
        headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
        alternateRowStyles: { fillColor: BGLIGHT },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { halign: "center", cellWidth: 20, fontStyle: "bold" },
          2: { cellWidth: 50 },
        },
        didParseCell: (data) => {
          if (data.column.index === 1 && data.section === "body") {
            const lv = (data.cell.text[0] ?? "").toLowerCase();
            data.cell.styles.textColor = lv.includes("tinggi") ? RED : lv.includes("sedang") ? AMBER : GREEN;
          }
        },
        tableLineColor: LGRAY,
        tableLineWidth: 0.1,
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    } else if (ar.kelebihan.length > 0 || ar.risiko.length > 0) {
      ensureSpace(20);
      y = sectionTitle(doc, "06  Kelebihan & Risiko", y);
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [["Kelebihan / Potensi", "Risiko / Catatan"]],
        body: Array.from({ length: Math.max(ar.kelebihan.length, ar.risiko.length) }, (_, i) => [
          ar.kelebihan[i] ?? "", ar.risiko[i] ?? "",
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: BLACK },
        headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
        columnStyles: { 0: { textColor: [22, 130, 80] as [number,number,number] }, 1: { textColor: RED } },
        tableLineColor: LGRAY,
        tableLineWidth: 0.1,
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // Rekomendasi strategis
    const rek = (aiNarr?.rekomendasiStrategis as string | undefined) ?? ar.rekomendasi;
    if (rek) {
      const rekLines = doc.splitTextToSize(rek, W - 36);
      ensureSpace(14 + rekLines.length * 4.2);
      const rekSectionNum = (aiRisikos && aiRisikos.length > 0) || ar.kelebihan.length > 0 ? "07" : "06";
      y = sectionTitle(doc, `${rekSectionNum}  Rekomendasi Strategis`, y);
      doc.setFillColor(...BGLIGHT);
      doc.setDrawColor(...GOLD);
      doc.roundedRect(14, y, W - 28, 4 + rekLines.length * 4.5 + 4, 2, 2, "FD");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      doc.text(rekLines, 18, y + 6);
      y += rekLines.length * 4.5 + 12;
    }
  } else {
    ensureSpace(20);
    y = sectionTitle(doc, "05  Analisis AI — Kelayakan Investasi", y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text("Analisis AI belum dijalankan. Klik 'Analisis Ulang' dari panel akuisisi untuk menghasilkan penilaian kelayakan investasi.", 14, y + 6);
    y += 16;
  }

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`Site_Analysis_${prospect.lokasi.replace(/\s+/g, "_")}.pdf`);
}

// ─── 3. LEGAL CHECKING ────────────────────────────────────────────────────────

export function generateLegalChecking(payload: DocPayload) {
  const { prospect, checkedItems } = payload;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 42;

  drawHeader(doc, "LEGAL CHECKING", `Pemeriksaan Dokumen Legal — ${prospect.lokasi}`);

  // Identitas
  y = sectionTitle(doc, "01  Identitas Lahan", y);
  const info: [string, string][] = [
    ["Lokasi",       prospect.lokasi],
    ["Alamat",       address(prospect) || "—"],
    ["Luas",         `${fmt(prospect.luas)} m²`],
    ["Nilai Tanah",  fmtRp(prospect.luas * prospect.hargaM2)],
    ["Status Legal", payload.statusLegal || "Belum ditentukan"],
  ];
  info.forEach(([l, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(l + " :", 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(v, 55, y);
    y += 6;
  });
  y += 2;

  // Legal checklist
  y = sectionTitle(doc, "02  Checklist Pemeriksaan Legal", y);
  const legalItems = [
    { key: "shm_alas_hak",           label: "SHM / Alas Hak", critical: true },
    { key: "bebas_sengketa",          label: "Bebas Sengketa", critical: true },
    { key: "batas_tanah",             label: "Batas Tanah Jelas", critical: true },
    { key: "bphtb",                   label: "BPHTB", critical: false },
    { key: "status_pemilik_sekitar",  label: "Status Pemilik Sekitar", critical: false },
    { key: "akses_jalan_legal",       label: "Akses Jalan (Legal)", critical: false },
    { key: "kelengkapan_berkas",      label: "Kelengkapan Berkas", critical: false },
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["No", "Item Pemeriksaan", "Kritis", "Status", "Keterangan"]],
    body: legalItems.map((item, i) => [
      `${i + 1}`,
      item.label,
      item.critical ? "Ya" : "—",
      checkedItems.includes(item.key) ? "CLEAR" : "PERLU VERIFIKASI",
      checkedItems.includes(item.key) ? "Dokumen telah diverifikasi" : "Perlu pemeriksaan lebih lanjut",
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "center", cellWidth: 36, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.column.index === 2 && data.section === "body") {
        if (data.cell.text[0] === "Ya") data.cell.styles.textColor = RED;
      }
      if (data.column.index === 3 && data.section === "body") {
        if (data.cell.text[0] === "CLEAR") data.cell.styles.textColor = GREEN;
        else data.cell.styles.textColor = AMBER;
      }
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Summary
  const totalLegal = legalItems.length;
  const clearedLegal = legalItems.filter(i => checkedItems.includes(i.key)).length;
  const criticalCleared = legalItems.filter(i => i.critical && checkedItems.includes(i.key)).length;
  const criticalTotal = legalItems.filter(i => i.critical).length;

  y = sectionTitle(doc, "03  Ringkasan Status Legal", y);
  doc.setFillColor(...BGLIGHT);
  doc.setDrawColor(...LGRAY);
  doc.roundedRect(14, y, (W - 28) / 3 - 3, 22, 2, 2, "FD");
  doc.roundedRect(14 + (W - 28) / 3, y, (W - 28) / 3 - 3, 22, 2, 2, "FD");
  doc.roundedRect(14 + 2 * (W - 28) / 3, y, (W - 28) / 3, 22, 2, 2, "FD");

  const boxes = [
    { label: "Item Selesai", value: `${clearedLegal} / ${totalLegal}`, color: clearedLegal === totalLegal ? GREEN : AMBER },
    { label: "Item Kritis Clear", value: `${criticalCleared} / ${criticalTotal}`, color: criticalCleared === criticalTotal ? GREEN : RED },
    { label: "Persentase Selesai", value: `${Math.round((clearedLegal / totalLegal) * 100)}%`, color: clearedLegal === totalLegal ? GREEN : AMBER },
  ];
  boxes.forEach((box, i) => {
    const bx = 14 + i * ((W - 28) / 3) + (i > 0 ? i * -3 : 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(box.label, bx + (W - 28) / 6 - (i === 2 ? 1.5 : 0), y + 7, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...box.color);
    doc.text(box.value, bx + (W - 28) / 6 - (i === 2 ? 1.5 : 0), y + 17, { align: "center" });
  });
  y += 28;

  // Catatan
  y = sectionTitle(doc, "04  Catatan & Tindak Lanjut", y);
  const note = criticalCleared < criticalTotal
    ? "Terdapat item kritis yang belum diverifikasi. Proses akuisisi TIDAK DAPAT dilanjutkan ke tahap PKS/MoU sebelum seluruh item kritis dinyatakan CLEAR oleh tim legal."
    : clearedLegal < totalLegal
    ? "Semua item kritis sudah CLEAR. Beberapa item non-kritis masih perlu diselesaikan. Proses dapat dilanjutkan dengan catatan bahwa item tersebut diselesaikan sebelum akad."
    : "Semua item legal telah CLEAR. Lahan siap untuk dilanjutkan ke tahap PKS/MoU dan proses akuisisi selanjutnya.";
  const noteLines = doc.splitTextToSize(note, W - 28);
  doc.setFillColor(...BGLIGHT);
  doc.setDrawColor(...GOLD);
  doc.roundedRect(14, y, W - 28, noteLines.length * 5 + 8, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(noteLines, 18, y + 6);
  y += noteLines.length * 5 + 14;

  // Sign-off
  y = sectionTitle(doc, "05  Verifikasi", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Diperiksa Oleh", "Tanggal Pemeriksaan", "Tanda Tangan"]],
    body: [["Tim Legal Satara Development", today(), "\n\n_____________________"]],
    styles: { fontSize: 8.5, cellPadding: 4, halign: "center", textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`Legal_Checking_${prospect.lokasi.replace(/\s+/g, "_")}.pdf`);
}

// ─── 4. ESTIMASI HPP TANAH ────────────────────────────────────────────────────

export function generateEstimasiHPP(payload: DocPayload) {
  const { prospect, aiResult } = payload;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 42;

  drawHeader(doc, "ESTIMASI HPP TANAH", `Analisis Biaya Pokok Pengembangan — ${prospect.lokasi}`);

  // Dasar kalkulasi
  y = sectionTitle(doc, "01  Dasar Kalkulasi", y);
  const luasTanah      = prospect.luas;
  const hargaM2        = prospect.hargaM2;
  const totalHargaTanah = luasTanah * hargaM2;

  const efektivitas  = aiResult?.efektivitasKavling ?? 60;
  const luasEfektif  = luasTanah * (efektivitas / 100);
  const potensiUnit  = aiResult?.potensiUnit ?? Math.floor(luasEfektif / 100);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Parameter Dasar", "Nilai", "Keterangan"]],
    body: [
      ["Luas Total Lahan",      `${fmt(luasTanah)} m²`,        ""],
      ["Harga Tanah per m²",    `Rp ${fmt(hargaM2)}`,          "Harga akuisisi"],
      ["Total Nilai Tanah",     fmtRp(totalHargaTanah),         "Biaya pembelian lahan"],
      ["Efektivitas Kavling",   `${efektivitas}%`,              "Asumsi standar 60–70%"],
      ["Luas Kavling Efektif",  `${fmt(luasEfektif)} m²`,       "Setelah fasum, jalan, dsb"],
      ["Estimasi Unit",         `${potensiUnit} unit`,          aiResult?.potensiUnit ? "Output AI" : "Estimasi @100 m² / kavling"],
    ],
    styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      1: { fontStyle: "bold" },
      2: { textColor: GRAY, fontStyle: "italic" },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Alokasi lahan
  y = sectionTitle(doc, "02  Alokasi Penggunaan Lahan", y);
  const luasJalan  = aiResult?.luasJalan  ?? Math.round(luasTanah * 0.15);
  const luasFasum  = aiResult?.luasFasum  ?? Math.round(luasTanah * 0.08);
  const luasTidakEfektif = luasTanah - luasEfektif - luasJalan - luasFasum;
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Alokasi", "Luas (m²)", "Persentase", "Keterangan"]],
    body: [
      ["Kavling Efektif (dijual)",  fmt(luasEfektif),          `${efektivitas}%`,                    "Area produktif / unit dijual"],
      ["Jalan Internal",            fmt(luasJalan),             `${((luasJalan / luasTanah) * 100).toFixed(1)}%`, "Jalan akses lingkungan"],
      ["Fasum & RTH",               fmt(luasFasum),             `${((luasFasum / luasTanah) * 100).toFixed(1)}%`, "Taman, drainase, fasilitas"],
      ["Area Tidak Efektif",        fmt(Math.max(0, luasTidakEfektif)), `${((Math.max(0, luasTidakEfektif) / luasTanah) * 100).toFixed(1)}%`, "Sempadan, tebing, dsb"],
      ["TOTAL",                     fmt(luasTanah),             "100%",                               ""],
    ],
    styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      2: { halign: "center" },
      3: { textColor: GRAY, fontStyle: "italic" },
    },
    bodyStyles: {},
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 4) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // HPP Breakdown
  y = sectionTitle(doc, "03  Struktur HPP per Unit", y);
  const hppTanah    = potensiUnit > 0 ? totalHargaTanah / potensiUnit : 0;
  const biayaPrasarana = hppTanah * 0.15;
  const biayaKonstruksi = hppTanah * 1.8;
  const biayaOverhead   = (hppTanah + biayaPrasarana + biayaKonstruksi) * 0.08;
  const totalHPP    = hppTanah + biayaPrasarana + biayaKonstruksi + biayaOverhead;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Komponen HPP", "Nilai per Unit", "% dari Total HPP", "Catatan"]],
    body: [
      ["Biaya Tanah per Unit",     fmtRp(hppTanah),          `${((hppTanah / totalHPP) * 100).toFixed(1)}%`, "Alokasi dari harga akuisisi"],
      ["Prasarana & Infrastruktur", fmtRp(biayaPrasarana),   `${((biayaPrasarana / totalHPP) * 100).toFixed(1)}%`, "Jalan, drainase, listrik, air"],
      ["Biaya Konstruksi",          fmtRp(biayaKonstruksi),  `${((biayaKonstruksi / totalHPP) * 100).toFixed(1)}%`, "Bangunan + finishing tipe 36/45"],
      ["Overhead & Perizinan",      fmtRp(biayaOverhead),    `${((biayaOverhead / totalHPP) * 100).toFixed(1)}%`, "IMB, BPHTB, marketing, dsb"],
      ["TOTAL HPP per Unit",        fmtRp(totalHPP),         "100%",                                          ""],
    ],
    styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      1: { fontStyle: "bold" },
      2: { halign: "center" },
      3: { textColor: GRAY, fontStyle: "italic" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 4) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Proyeksi Revenue & Profit
  y = sectionTitle(doc, "04  Proyeksi Revenue & Profitabilitas", y);
  const potensiRevenue  = aiResult?.potensiRevenue  ?? (totalHPP * 1.3 * potensiUnit);
  const estimasiProfit  = aiResult?.estimasiProfit  ?? (potensiRevenue - totalHPP * potensiUnit);
  const roi             = aiResult?.roiEstimasi     ?? prospect.roi;
  const irr             = aiResult?.irr;
  const payback         = aiResult?.paybackBulan;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Metrik Keuangan", "Nilai", "Benchmark", "Status"]],
    body: [
      ["Total HPP (semua unit)",   fmtRp(totalHPP * potensiUnit),  "—",      ""],
      ["Potensi Revenue",          fmtRp(potensiRevenue),           "—",      ""],
      ["Estimasi Gross Profit",    fmtRp(estimasiProfit),           "—",      ""],
      ["Gross Margin",             potensiRevenue > 0 ? `${((estimasiProfit / potensiRevenue) * 100).toFixed(1)}%` : "—", ">20%",
        potensiRevenue > 0 && (estimasiProfit / potensiRevenue) >= 0.2 ? "LAYAK" : "PERLU REVIEW"],
      ["ROI Proyek",               `${roi}%`,                       ">25%",   roi >= 25 ? "LAYAK" : "PERLU REVIEW"],
      ["IRR",                      irr ? `${irr}%` : "—",           ">20%",   irr ? (irr >= 20 ? "LAYAK" : "PERLU REVIEW") : "—"],
      ["Payback Period",           payback ? `${payback} bulan` : "—", "<36 bulan", payback ? (payback <= 36 ? "LAYAK" : "PERLU REVIEW") : "—"],
    ],
    styles: { fontSize: 8, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      1: { fontStyle: "bold" },
      2: { halign: "center", textColor: GRAY },
      3: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === "body") {
        if (data.cell.text[0] === "LAYAK") data.cell.styles.textColor = GREEN;
        else if (data.cell.text[0] === "PERLU REVIEW") data.cell.styles.textColor = AMBER;
      }
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Disclaimer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const disc = "* Estimasi ini bersifat indikatif berdasarkan data yang tersedia. Biaya aktual dapat berbeda tergantung kondisi lapangan, peraturan daerah, dan negosiasi akhir. Dokumen ini bukan merupakan penawaran atau komitmen finansial.";
  const discLines = doc.splitTextToSize(disc, W - 28);
  doc.text(discLines, 14, y);

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`Estimasi_HPP_${prospect.lokasi.replace(/\s+/g, "_")}.pdf`);
}

// ─── 5. PKS / MoU ────────────────────────────────────────────────────────────

export function generatePKSMoU(payload: DocPayload) {
  const { prospect } = payload;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 42;

  drawHeader(doc, "DRAFT PKS / MoU", `Draft Perjanjian Kerja Sama / MoU — ${prospect.lokasi}`);

  // Intro note
  doc.setFillColor(255, 251, 230);
  doc.setDrawColor(...GOLD);
  doc.roundedRect(14, y, W - 28, 10, 2, 2, "FD");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 90, 0);
  doc.text("DRAFT — Dokumen ini merupakan template awal. Harus dikaji dan disahkan oleh tim hukum sebelum penandatanganan.", 17, y + 6.5);
  y += 16;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("PERJANJIAN KERJA SAMA PENGEMBANGAN LAHAN", W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.text(`No. PKS-${today().replace(/ /g, "")}-${prospect.id}`, W / 2, y, { align: "center" });
  y += 10;

  // Pembukaan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const pembukaan = `Pada hari ini, ${today()}, yang bertanda tangan di bawah ini telah sepakat untuk mengadakan Perjanjian Kerja Sama Pengembangan Lahan ("Perjanjian") dengan ketentuan-ketentuan sebagai berikut:`;
  const pembukaanLines = doc.splitTextToSize(pembukaan, W - 28);
  doc.text(pembukaanLines, 14, y);
  y += pembukaanLines.length * 5 + 6;

  // Pasal 1: Para Pihak
  y = sectionTitle(doc, "PASAL 1 — PARA PIHAK", y);
  const paraLines = [
    "PIHAK PERTAMA  :  PT. SATARA DEVELOPMENT (selanjutnya disebut \"Pengembang\")",
    "                            beralamat di: ____________________________________________",
    "                            diwakili oleh: _____________________ selaku Direktur",
    "",
    "PIHAK KEDUA    :  _____________________________________________________ (selanjutnya disebut \"Pemilik Lahan\")",
    "                            beralamat di: ____________________________________________",
    "                            NIK / Identitas: ______________________________________________",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  paraLines.forEach(line => {
    if (line === "") { y += 2; return; }
    doc.text(line, 14, y);
    y += 5;
  });
  y += 4;

  // Pasal 2: Objek
  y = sectionTitle(doc, "PASAL 2 — OBJEK PERJANJIAN", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Spesifikasi Lahan", "Keterangan"]],
    body: [
      ["Lokasi / Nama",          prospect.lokasi],
      ["Alamat Lengkap",         address(prospect) || "____________________________________________"],
      ["Luas Lahan",             `${fmt(prospect.luas)} m² (${(prospect.luas / 10000).toFixed(4)} Ha)`],
      ["Status Sertifikat",      payload.statusLegal || "____________________________________________"],
      ["Nomor SHM / AJB",        "____________________________________________"],
      ["Batas Utara",            "____________________________________________"],
      ["Batas Selatan",          "____________________________________________"],
      ["Batas Timur",            "____________________________________________"],
      ["Batas Barat",            "____________________________________________"],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55, textColor: GRAY } },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Pasal 3: Harga
  y = sectionTitle(doc, "PASAL 3 — HARGA DAN MEKANISME PEMBAYARAN", y);
  const totalNilai = prospect.luas * prospect.hargaM2;
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Rincian Pembayaran", "Nilai", "Keterangan"]],
    body: [
      ["Harga per m²",           `Rp ${fmt(prospect.hargaM2)}`,  "Harga yang disepakati"],
      ["Luas Total",             `${fmt(prospect.luas)} m²`,       "Hasil pengukuran"],
      ["Total Nilai Transaksi",  fmtRp(totalNilai),                "Harga pokok transaksi"],
      ["Uang Muka (DP)",         fmtRp(totalNilai * 0.3),          "30% dari total nilai"],
      ["Pelunasan",              fmtRp(totalNilai * 0.7),          "70% pada saat penandatanganan AJB"],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BGLIGHT },
    columnStyles: {
      1: { fontStyle: "bold" },
      2: { textColor: GRAY, fontStyle: "italic" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Pasal 4 & 5
  y = sectionTitle(doc, "PASAL 4 — HAK DAN KEWAJIBAN PARA PIHAK", y);
  const ps4 = [
    "1.  PIHAK PERTAMA berhak mengembangkan lahan yang menjadi objek perjanjian ini untuk keperluan perumahan sesuai ketentuan yang berlaku.",
    "2.  PIHAK PERTAMA berkewajiban melakukan pembayaran sesuai jadwal yang telah disepakati.",
    "3.  PIHAK KEDUA berkewajiban menyerahkan seluruh dokumen lahan yang diperlukan dalam waktu 14 (empat belas) hari kerja sejak penandatanganan perjanjian ini.",
    "4.  PIHAK KEDUA berkewajiban menjamin bahwa lahan bebas dari sengketa, klaim pihak ketiga, dan beban-beban lainnya.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  ps4.forEach(line => {
    const lines2 = doc.splitTextToSize(line, W - 28);
    doc.text(lines2, 14, y);
    y += lines2.length * 5 + 1;
  });
  y += 6;

  y = sectionTitle(doc, "PASAL 5 — PENYELESAIAN PERSELISIHAN", y);
  const ps5 = "Apabila terjadi perselisihan dalam pelaksanaan perjanjian ini, para pihak sepakat untuk menyelesaikannya secara musyawarah mufakat. Jika tidak tercapai kesepakatan, perselisihan akan diselesaikan melalui Pengadilan Negeri yang berwenang sesuai domisili hukum yang disepakati.";
  const ps5Lines = doc.splitTextToSize(ps5, W - 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(ps5Lines, 14, y);
  y += ps5Lines.length * 5 + 10;

  // Sign-off
  y = sectionTitle(doc, "PENANDATANGANAN", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(`Demikian perjanjian ini dibuat dan ditandatangani pada: ${today()}`, 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["PIHAK PERTAMA", "PIHAK KEDUA"]],
    body: [[
      "PT. Satara Development\n\n\n\n\n_____________________________\nDirektur\nMaterai Rp 10.000",
      `Pemilik Lahan — ${prospect.lokasi}\n\n\n\n\n_____________________________\nNama & Tanda Tangan\nMaterai Rp 10.000`,
    ]],
    styles: { fontSize: 9, cellPadding: 5, halign: "center", textColor: BLACK },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    tableLineColor: LGRAY,
    tableLineWidth: 0.1,
  });

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`PKS_MoU_${prospect.lokasi.replace(/\s+/g, "_")}.pdf`);
}
