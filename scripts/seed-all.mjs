/**
 * Seed script lengkap untuk semua modul Satara Dashboard
 * Jalankan: node scripts/seed-all.mjs
 */

const BASE = "http://localhost:8080/api";

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`POST ${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PATCH ${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

async function del(path) {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE ${path} → ${r.status}`);
  return r.json();
}

function log(msg) { console.log(`[SEED] ${msg}`); }
function section(title) { console.log(`\n${"═".repeat(60)}\n  ${title}\n${"═".repeat(60)}`); }

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {

  // Cek DB existing
  const existingProjects = await get("/projects");
  if (existingProjects.length > 0) {
    log(`Ada ${existingProjects.length} proyek existing — lanjut tambah data di atas data yang ada.`);
  }

  section("1. PROJECTS");

  const p1 = await post("/projects", {
    nama: "Pesona Bantaeng Residence",
    lokasi: "Jl. Poros Bantaeng–Bulukumba Km 3, Bantaeng",
    provinsi: "Sulawesi Selatan",
    kabupaten: "Bantaeng",
    kecamatan: "Bissappu",
    desa: "Bonto Sunggu",
    luas: 15000,
    totalUnit: 50,
    fase: "BUILD",
    status: "active",
    targetStart: "2024-01-15",
    targetEnd: "2026-06-30",
    lat: -5.5321,
    lng: 119.9639,
  });
  log(`Project 1: ${p1.nama} (id=${p1.id}) — fase: BUILD`);

  const p2 = await post("/projects", {
    nama: "Griya Bulukumba Asri",
    lokasi: "Jl. Poros Bulukumba–Sinjai Km 7, Bulukumba",
    provinsi: "Sulawesi Selatan",
    kabupaten: "Bulukumba",
    kecamatan: "Ujung Bulu",
    desa: "Caile",
    luas: 9500,
    totalUnit: 36,
    fase: "SELL",
    status: "active",
    targetStart: "2024-06-01",
    targetEnd: "2026-12-31",
    lat: -5.5643,
    lng: 120.1939,
  });
  log(`Project 2: ${p2.nama} (id=${p2.id}) — fase: SELL`);

  const p3 = await post("/projects", {
    nama: "Bukit Indah Gowa",
    lokasi: "Jl. Poros Malino Km 12, Gowa",
    provinsi: "Sulawesi Selatan",
    kabupaten: "Gowa",
    kecamatan: "Tinggimoncong",
    desa: "Malino",
    luas: 7200,
    totalUnit: 24,
    fase: "PLAN",
    status: "active",
    targetStart: "2025-01-01",
    targetEnd: "2027-06-30",
    lat: -5.2198,
    lng: 119.8723,
  });
  log(`Project 3: ${p3.nama} (id=${p3.id}) — fase: PLAN`);

  // ─── 2. AKUISISI LAHAN ────────────────────────────────────
  section("2. AKUISISI LAHAN (Pipeline 7 Stage)");

  const landData = [
    // P1 — sudah PKS/MOU (lahan aktif)
    { projectId: p1.id, lokasi: "Lahan Bonto Sunggu Blok A", luas: 8000, hargaM2: 450000, status: "pks_mou", roi: 38, margin: 28, aksesJalan: 8, kabupaten: "Bantaeng", kecamatan: "Bissappu", lat: -5.5315, lng: 119.9630, catatan: "SHM 12 bidang, legal clean, akses jalan cor beton 6m" },
    { projectId: p1.id, lokasi: "Lahan Bonto Sunggu Blok B", luas: 7000, hargaM2: 420000, status: "pks_mou", roi: 35, margin: 26, aksesJalan: 7, kabupaten: "Bantaeng", kecamatan: "Bissappu", lat: -5.5330, lng: 119.9645, catatan: "SHM 10 bidang, proses balik nama selesai" },
    // P2 — negosiasi & legal checking
    { projectId: p2.id, lokasi: "Lahan Caile Sektor Timur", luas: 5500, hargaM2: 520000, status: "negosiasi", roi: 32, margin: 24, aksesJalan: 7, kabupaten: "Bulukumba", kecamatan: "Ujung Bulu", lat: -5.5648, lng: 120.1925, catatan: "Harga tawar Rp490rb/m2, pemilik 3 orang, sedang proses kesepakatan" },
    { projectId: p2.id, lokasi: "Lahan Caile Sektor Barat", luas: 4000, hargaM2: 500000, status: "legal_checking", roi: 33, margin: 25, aksesJalan: 8, kabupaten: "Bulukumba", kecamatan: "Ujung Bulu", lat: -5.5655, lng: 120.1910, catatan: "PPAT sedang cek SHM, 1 sertifikat belum dipecah" },
    // P3 — pipeline awal
    { projectId: p3.id, lokasi: "Bukit Malino Kavling Utara", luas: 4200, hargaM2: 380000, status: "analisis_kompetitor", roi: 40, margin: 30, aksesJalan: 6, kabupaten: "Gowa", kecamatan: "Tinggimoncong", lat: -5.2190, lng: 119.8710, catatan: "View pegunungan, akses jalan 4m perlu ditingkatkan" },
    { projectId: p3.id, lokasi: "Bukit Malino Kavling Selatan", luas: 3000, hargaM2: 360000, status: "survey", roi: 37, margin: 28, aksesJalan: 5, kabupaten: "Gowa", kecamatan: "Tinggimoncong", lat: -5.2210, lng: 119.8735, catatan: "Kontur sedikit berbukit, perlu timbunan ±1.5m" },
    // Prospek mandiri (belum terikat proyek)
    { lokasi: "Lahan Jeneponto Sentral", luas: 6000, hargaM2: 320000, status: "prospek_baru", roi: 42, margin: 32, aksesJalan: 7, kabupaten: "Jeneponto", kecamatan: "Binamu", lat: -5.6842, lng: 119.7490, catatan: "Info dari broker, pemilik tunggal, SHM siap" },
    { lokasi: "Kawasan Takalar Barat", luas: 8500, hargaM2: 280000, status: "survey", roi: 45, margin: 34, aksesJalan: 8, kabupaten: "Takalar", kecamatan: "Mappakasunggu", lat: -5.4325, lng: 119.3810, catatan: "Dekat kawasan industri, potensi MBR tinggi" },
    { lokasi: "Lahan Sinjai Timur", luas: 5000, hargaM2: 350000, status: "analisis_kompetitor", roi: 36, margin: 27, aksesJalan: 6, kabupaten: "Sinjai", kecamatan: "Sinjai Timur", lat: -5.1264, lng: 120.2569, catatan: "Kompetitor aktif di radius 2km" },
    { lokasi: "Lahan Bone Kota", luas: 9000, hargaM2: 410000, status: "negosiasi", roi: 34, margin: 25, aksesJalan: 8, kabupaten: "Bone", kecamatan: "Tanete Riattang", lat: -4.5374, lng: 120.3421, catatan: "Lokasi strategis pusat kota Bone" },
  ];

  const lands = [];
  for (const l of landData) {
    const land = await post("/land-prospects", l);
    lands.push(land);
    log(`  Lahan: ${land.lokasi} (${land.status}, ROI ${land.roi}%)`);
  }

  // ─── 3. PERENCANAAN — DATA LAHAN ─────────────────────────
  section("3. PERENCANAAN - DATA LAHAN");

  const planningLandData = [
    { projectId: p1.id, landArea: 8000, effectiveArea: 5200, fasumArea: 1800, roadArea: 1000, landPriceTotal: 3600000000, landPricePerUnit: 72000000, maxUnits: 50, roadWidth: 6, legalStatus: "SHM Balik Nama Selesai", contour: "Datar", landShape: "Persegi Panjang", notes: "Lahan matang, cut & fill selesai, siap bangun" },
    { projectId: p1.id, landArea: 7000, effectiveArea: 4600, fasumArea: 1500, roadArea: 900, landPriceTotal: 2940000000, landPricePerUnit: 58800000, maxUnits: 0, roadWidth: 5, legalStatus: "SHM Proses Balik Nama", contour: "Datar-Bergelombang", landShape: "Trapesium", notes: "Jalan dalam kavling 60% selesai" },
    { projectId: p2.id, landArea: 5500, effectiveArea: 3600, fasumArea: 1200, roadArea: 700, landPriceTotal: 2860000000, landPricePerUnit: 79400000, maxUnits: 36, roadWidth: 6, legalStatus: "SHM Legal Checking", contour: "Datar", landShape: "Persegi Panjang", notes: "Proses matang lahan, target Q2 2025" },
    { projectId: p3.id, landArea: 4200, effectiveArea: 2800, fasumArea: 900, roadArea: 500, landPriceTotal: 1596000000, landPricePerUnit: 66500000, maxUnits: 24, roadWidth: 4, legalStatus: "SHM Pemeriksaan BPN", contour: "Berbukit Ringan", landShape: "Tidak Beraturan", notes: "Perencanaan awal, view pegunungan, perlu timbunan" },
  ];

  for (const pl of planningLandData) {
    const r = await post("/planning/land", pl);
    log(`  Planning Land: project ${r.projectId} — Luas ${r.landArea}m2`);
  }

  // ─── 4. FEASIBILITY STUDY ─────────────────────────────────
  section("4. PERENCANAAN - FEASIBILITY STUDY");

  const fs1 = await post("/feasibility", {
    projectId: p1.id,
    hpp: 285000000,
    roi: 38.5,
    margin: 28.2,
    cashflow: 4800000000,
    bep: 28,
    rab: 12500000000,
    catatan: "HPP per unit type 36/72 termasuk infrastruktur. BEP 28 dari 50 unit.",
  });
  await patch(`/feasibility/${fs1.id}`, { isApproved: true });
  log(`  FS P1 (BUILD): ROI ${fs1.roi}%, Margin ${fs1.margin}% → APPROVED`);

  const fs2 = await post("/feasibility", {
    projectId: p2.id,
    hpp: 310000000,
    roi: 32.0,
    margin: 24.5,
    cashflow: 3200000000,
    bep: 20,
    rab: 9800000000,
    catatan: "Type 45/90 segmen menengah. Estimasi penjualan 24 bulan.",
  });
  await patch(`/feasibility/${fs2.id}`, { isApproved: true });
  log(`  FS P2 (SELL): ROI ${fs2.roi}%, Margin ${fs2.margin}% → APPROVED`);

  const fs3 = await post("/feasibility", {
    projectId: p3.id,
    hpp: 265000000,
    roi: 40.2,
    margin: 30.1,
    cashflow: 2100000000,
    bep: 14,
    rab: 6200000000,
    catatan: "Type 36/60 segmen MBR, potensi subsidi BTN. Draft awal.",
  });
  log(`  FS P3 (PLAN): ROI ${fs3.roi}%, Margin ${fs3.margin}% → DRAFT`);

  // ─── 5. PERENCANAAN CASHFLOW ───────────────────────────────
  section("5. PERENCANAAN - CASHFLOW BULANAN");

  // P1 — 24 bulan (Jan 2024 - Des 2025)
  const p1CashflowMonths = [
    { month: 1, label: "Jan 2024", landOut: 6540000000, consOut: 0, mktOut: 0, opOut: 50000000, bookIn: 0, htIn: 0, dpIn: 0, kppIn: 0, con: 0, mod: 0, agg: 0 },
    { month: 2, label: "Feb 2024", landOut: 0, consOut: 1250000000, mktOut: 15000000, opOut: 60000000, bookIn: 0, htIn: 0, dpIn: 0, kppIn: 0, con: 2, mod: 3, agg: 5 },
    { month: 3, label: "Mar 2024", landOut: 0, consOut: 980000000, mktOut: 18000000, opOut: 65000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 0, con: 3, mod: 5, agg: 7 },
    { month: 4, label: "Apr 2024", landOut: 0, consOut: 1100000000, mktOut: 22000000, opOut: 70000000, bookIn: 135000000, htIn: 0, dpIn: 425000000, kppIn: 0, con: 4, mod: 6, agg: 8 },
    { month: 5, label: "Mei 2024", landOut: 0, consOut: 850000000, mktOut: 20000000, opOut: 70000000, bookIn: 180000000, htIn: 0, dpIn: 630000000, kppIn: 0, con: 5, mod: 7, agg: 9 },
    { month: 6, label: "Jun 2024", landOut: 0, consOut: 890000000, mktOut: 25000000, opOut: 75000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 0, con: 4, mod: 6, agg: 8 },
    { month: 7, label: "Jul 2024", landOut: 0, consOut: 720000000, mktOut: 18000000, opOut: 75000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 2520000000, con: 5, mod: 7, agg: 10 },
    { month: 8, label: "Agt 2024", landOut: 0, consOut: 680000000, mktOut: 15000000, opOut: 80000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 1890000000, con: 5, mod: 7, agg: 9 },
    { month: 9, label: "Sep 2024", landOut: 0, consOut: 600000000, mktOut: 28000000, opOut: 80000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 0, con: 4, mod: 6, agg: 8 },
    { month: 10, label: "Okt 2024", landOut: 0, consOut: 580000000, mktOut: 20000000, opOut: 80000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 3150000000, con: 5, mod: 8, agg: 10 },
    { month: 11, label: "Nov 2024", landOut: 0, consOut: 750000000, mktOut: 15000000, opOut: 85000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 0, con: 3, mod: 5, agg: 7 },
    { month: 12, label: "Des 2024", landOut: 0, consOut: 520000000, mktOut: 12000000, opOut: 85000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 2205000000, con: 4, mod: 6, agg: 8 },
    { month: 13, label: "Jan 2025", landOut: 0, consOut: 420000000, mktOut: 10000000, opOut: 85000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 945000000, con: 3, mod: 5, agg: 7 },
    { month: 14, label: "Feb 2025", landOut: 0, consOut: 350000000, mktOut: 8000000, opOut: 85000000, bookIn: 0, htIn: 1890000000, dpIn: 0, kppIn: 630000000, con: 2, mod: 4, agg: 6 },
    { month: 15, label: "Mar 2025", landOut: 0, consOut: 280000000, mktOut: 8000000, opOut: 85000000, bookIn: 0, htIn: 945000000, dpIn: 0, kppIn: 315000000, con: 1, mod: 3, agg: 5 },
    { month: 16, label: "Apr 2025", landOut: 0, consOut: 200000000, mktOut: 5000000, opOut: 85000000, bookIn: 0, htIn: 630000000, dpIn: 0, kppIn: 0, con: 0, mod: 2, agg: 4 },
    { month: 17, label: "Mei 2025", landOut: 0, consOut: 150000000, mktOut: 5000000, opOut: 85000000, bookIn: 0, htIn: 945000000, dpIn: 0, kppIn: 0, con: 0, mod: 1, agg: 3 },
    { month: 18, label: "Jun 2025", landOut: 0, consOut: 100000000, mktOut: 3000000, opOut: 85000000, bookIn: 0, htIn: 630000000, dpIn: 0, kppIn: 0, con: 0, mod: 1, agg: 2 },
  ];

  for (const m of p1CashflowMonths) {
    await post("/planning/cashflow", {
      projectId: p1.id,
      monthNumber: m.month,
      monthLabel: m.label,
      landCostOut: m.landOut,
      constructionCostOut: m.consOut,
      marketingCostOut: m.mktOut,
      operationalCostOut: m.opOut,
      bookingFeeIn: m.bookIn,
      htKprIn: m.htIn,
      downPaymentIn: m.dpIn,
      kppDisbursementIn: m.kppIn,
      conservativeUnits: m.con,
      moderateUnits: m.mod,
      aggressiveUnits: m.agg,
    });
  }
  log(`  ${p1CashflowMonths.length} bulan cashflow Project 1 (Build)`);

  // P2 — 18 bulan
  const p2CashflowMonths = [
    { month: 1, label: "Jun 2024", landOut: 4750000000, consOut: 0, mktOut: 0, opOut: 40000000, bookIn: 0, htIn: 0, dpIn: 0, kppIn: 0, con: 0, mod: 0, agg: 0 },
    { month: 2, label: "Jul 2024", landOut: 0, consOut: 500000000, mktOut: 10000000, opOut: 45000000, bookIn: 0, htIn: 0, dpIn: 0, kppIn: 0, con: 1, mod: 2, agg: 3 },
    { month: 3, label: "Agt 2024", landOut: 0, consOut: 850000000, mktOut: 12000000, opOut: 45000000, bookIn: 0, htIn: 0, dpIn: 0, kppIn: 0, con: 1, mod: 2, agg: 4 },
    { month: 4, label: "Sep 2024", landOut: 0, consOut: 750000000, mktOut: 15000000, opOut: 50000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 0, con: 2, mod: 3, agg: 5 },
    { month: 5, label: "Okt 2024", landOut: 0, consOut: 1000000000, mktOut: 18000000, opOut: 50000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 0, con: 2, mod: 4, agg: 6 },
    { month: 6, label: "Nov 2024", landOut: 0, consOut: 900000000, mktOut: 18000000, opOut: 55000000, bookIn: 90000000, htIn: 0, dpIn: 350000000, kppIn: 0, con: 2, mod: 4, agg: 6 },
    { month: 7, label: "Des 2024", landOut: 0, consOut: 800000000, mktOut: 15000000, opOut: 55000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 0, con: 2, mod: 3, agg: 5 },
    { month: 8, label: "Jan 2025", landOut: 0, consOut: 850000000, mktOut: 15000000, opOut: 60000000, bookIn: 45000000, htIn: 0, dpIn: 0, kppIn: 0, con: 2, mod: 3, agg: 5 },
    { month: 9, label: "Feb 2025", landOut: 0, consOut: 920000000, mktOut: 18000000, opOut: 60000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 0, con: 3, mod: 4, agg: 6 },
    { month: 10, label: "Mar 2025", landOut: 0, consOut: 1000000000, mktOut: 20000000, opOut: 65000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 0, con: 3, mod: 5, agg: 7 },
    { month: 11, label: "Apr 2025", landOut: 0, consOut: 1100000000, mktOut: 22000000, opOut: 65000000, bookIn: 135000000, htIn: 0, dpIn: 0, kppIn: 0, con: 3, mod: 5, agg: 7 },
    { month: 12, label: "Mei 2025", landOut: 0, consOut: 1200000000, mktOut: 25000000, opOut: 70000000, bookIn: 180000000, htIn: 0, dpIn: 0, kppIn: 0, con: 4, mod: 6, agg: 8 },
    { month: 13, label: "Jun 2025", landOut: 0, consOut: 1000000000, mktOut: 25000000, opOut: 70000000, bookIn: 135000000, htIn: 0, dpIn: 0, kppIn: 0, con: 3, mod: 5, agg: 7 },
    { month: 14, label: "Mei 2026", landOut: 0, consOut: 500000000, mktOut: 54000000, opOut: 70000000, bookIn: 135000000, htIn: 0, dpIn: 560000000, kppIn: 0, con: 4, mod: 6, agg: 9 },
    { month: 15, label: "Jun 2026", landOut: 0, consOut: 400000000, mktOut: 45000000, opOut: 70000000, bookIn: 135000000, htIn: 0, dpIn: 0, kppIn: 1660000000, con: 4, mod: 6, agg: 9 },
    { month: 16, label: "Jul 2026", landOut: 0, consOut: 350000000, mktOut: 35000000, opOut: 70000000, bookIn: 90000000, htIn: 0, dpIn: 0, kppIn: 2490000000, con: 4, mod: 6, agg: 8 },
  ];

  for (const m of p2CashflowMonths) {
    await post("/planning/cashflow", {
      projectId: p2.id,
      monthNumber: m.month,
      monthLabel: m.label,
      landCostOut: m.landOut,
      constructionCostOut: m.consOut,
      marketingCostOut: m.mktOut,
      operationalCostOut: m.opOut,
      bookingFeeIn: m.bookIn,
      htKprIn: m.htIn,
      downPaymentIn: m.dpIn,
      kppDisbursementIn: m.kppIn,
      conservativeUnits: m.con,
      moderateUnits: m.mod,
      aggressiveUnits: m.agg,
    });
  }
  log(`  ${p2CashflowMonths.length} bulan cashflow Project 2 (Sell)`);

  // ─── 6. LEGAL & PERIZINAN ─────────────────────────────────
  section("6. LEGAL & PERIZINAN");

  const legalDocs = [
    // P1 BUILD — hampir semua approved
    { projectId: p1.id, tipeDokumen: "SHM", status: "approved", pic: "UMMU", catatan: "22 SHM selesai balik nama atas nama PT Satara" },
    { projectId: p1.id, tipeDokumen: "AJB", status: "approved", pic: "DINDA", catatan: "AJB notaris PPAT Bantaeng, tanggal 20 Maret 2023" },
    { projectId: p1.id, tipeDokumen: "balik_nama", status: "approved", pic: "NIA", catatan: "Selesai di BPN Bantaeng, Oktober 2023" },
    { projectId: p1.id, tipeDokumen: "PKKPR", status: "approved", pic: "UMMU", catatan: "KKPR terbit No.001/KKPR/BTG/2023" },
    { projectId: p1.id, tipeDokumen: "SPPL", status: "approved", pic: "HIKMAH", catatan: "SPPL terbit Dinas LH Bantaeng, valid 3 tahun" },
    { projectId: p1.id, tipeDokumen: "PBG", status: "in_progress", pic: "EKKY", catatan: "Proses SIMBG, target terbit 2 bulan lagi" },
    { projectId: p1.id, tipeDokumen: "bank_ready", status: "approved", pic: "IRDA", catatan: "Bankable — MOU aktif dengan BTN & BRI" },
    { projectId: p1.id, tipeDokumen: "sikumbang", status: "in_progress", pic: "ANTI", catatan: "Pengajuan Kementerian PUPR sedang diproses" },
    { projectId: p1.id, tipeDokumen: "split", status: "approved", pic: "NIA", catatan: "Pecah SHM per kavling selesai 50 bidang" },
    { projectId: p1.id, tipeDokumen: "PBB", status: "approved", pic: "DINDA", catatan: "Pisah PBB per unit sudah diurus" },
    // P2 SELL — sedang berjalan
    { projectId: p2.id, tipeDokumen: "SHM", status: "approved", pic: "TAHIR", catatan: "15 SHM aktif, 6 masih proses balik nama" },
    { projectId: p2.id, tipeDokumen: "AJB", status: "approved", pic: "ARYA", catatan: "AJB selesai untuk 3 blok Caile" },
    { projectId: p2.id, tipeDokumen: "balik_nama", status: "in_progress", pic: "NIA", catatan: "6 sertifikat dalam proses di BPN Bulukumba" },
    { projectId: p2.id, tipeDokumen: "PKKPR", status: "approved", pic: "UMMU", catatan: "KKPR Bulukumba terbit, valid 3 tahun" },
    { projectId: p2.id, tipeDokumen: "SPPL", status: "in_progress", pic: "HIKMAH", catatan: "Pending verifikasi Dinas LH Bulukumba" },
    { projectId: p2.id, tipeDokumen: "PBG", status: "pending", pic: "EKKY", catatan: "Menunggu SPPL terbit dahulu" },
    { projectId: p2.id, tipeDokumen: "bank_ready", status: "pending", pic: "IRDA", catatan: "Belum bisa proses, tunggu PBG keluar" },
    // P3 PLAN — baru mulai
    { projectId: p3.id, tipeDokumen: "SHM", status: "in_progress", pic: "UMMU", catatan: "Proses akuisisi, SHM dalam pemeriksaan BPN" },
    { projectId: p3.id, tipeDokumen: "PKKPR", status: "pending", pic: "TAHIR", catatan: "Akan diajukan setelah SHM clear" },
    { projectId: p3.id, tipeDokumen: "AJB", status: "pending", pic: "DINDA", catatan: "Menunggu selesai negosiasi harga" },
  ];

  for (const doc of legalDocs) {
    const r = await post("/legal", doc);
    log(`  Legal: [${r.projectId}] ${r.tipeDokumen} → ${r.status} (PIC: ${r.pic})`);
  }

  // ─── 7. UNITS ─────────────────────────────────────────────
  section("7. UNITS");

  // P1 — 50 unit, various statuses (fase BUILD, banyak yang sudah serah_terima & akad)
  const p1UnitStatuses = [
    ...Array(8).fill("serah_terima"),   // 8 unit sudah serah terima
    ...Array(12).fill("akad"),           // 12 unit sudah akad
    ...Array(10).fill("ready_akad"),     // 10 unit ready akad
    ...Array(8).fill("kpr_process"),     // 8 unit KPR process
    ...Array(7).fill("booked"),          // 7 unit booked
    ...Array(5).fill("available"),       // 5 unit available
  ];

  const units1 = [];
  for (let i = 0; i < 50; i++) {
    const blok = i < 20 ? "A" : i < 38 ? "B" : "C";
    const nomor = String(i + 1).padStart(2, "0");
    const tipe = i % 3 === 0 ? "45/90" : "36/72";
    const harga = tipe === "45/90" ? 395000000 : 315000000;
    const status = p1UnitStatuses[i];
    const progress =
      status === "serah_terima" || status === "akad" || status === "ready_akad" ? 100
      : status === "kpr_process" ? 65 + (i % 5) * 5
      : status === "booked" ? 30 + (i % 4) * 8
      : 5 + (i % 3) * 5;
    const readyAkad = progress >= 100;
    const u = await post("/units", { projectId: p1.id, blok, nomor, tipe, harga, status, progress, readyAkad });
    units1.push(u);
  }
  log(`  ${units1.length} unit dibuat untuk P1 (BUILD)`);

  // P2 — 36 unit, fase SELL (lebih banyak available & booked)
  const p2UnitStatuses = [
    ...Array(6).fill("akad"),
    ...Array(8).fill("kpr_process"),
    ...Array(10).fill("booked"),
    ...Array(12).fill("available"),
  ];

  const units2 = [];
  for (let i = 0; i < 36; i++) {
    const blok = i < 18 ? "A" : "B";
    const nomor = String(i + 1).padStart(2, "0");
    const tipe = i % 4 === 0 ? "54/108" : "45/90";
    const harga = tipe === "54/108" ? 495000000 : 415000000;
    const status = p2UnitStatuses[i];
    const progress =
      status === "akad" ? 100
      : status === "kpr_process" ? 50 + (i % 5) * 8
      : status === "booked" ? 15 + (i % 4) * 5
      : 0;
    const readyAkad = progress >= 100;
    const u = await post("/units", { projectId: p2.id, blok, nomor, tipe, harga, status, progress, readyAkad });
    units2.push(u);
  }
  log(`  ${units2.length} unit dibuat untuk P2 (SELL)`);

  // P3 — 24 unit, semua available (fase PLAN)
  const units3 = [];
  for (let i = 0; i < 24; i++) {
    const blok = i < 12 ? "A" : "B";
    const nomor = String(i + 1).padStart(2, "0");
    const u = await post("/units", { projectId: p3.id, blok, nomor, tipe: "36/60", harga: 285000000, status: "available", progress: 0, readyAkad: false });
    units3.push(u);
  }
  log(`  ${units3.length} unit dibuat untuk P3 (PLAN)`);

  // ─── 8. MARKETING LEADS ───────────────────────────────────
  section("8. MARKETING LEADS (Pipeline 9 Stage)");

  const leadsData = [
    // P1 — mostly sudah booking/berkas (fase BUILD sudah jauh)
    { nama: "Andi Fauzan Arif", kontak: "08114231001", source: "referral", status: "BOOKING", picSales: "ARYA", namaKampanye: "Referral Q1 2024", projectId: p1.id, pekerjaan: "PNS Dinas Pendidikan", budget: "Rp300-350jt", tanggalBooking: "2024-09-15", catatanFollowUp: "Berminat type 36/72 blok A" },
    { nama: "Sitti Rahma Dewi", kontak: "08114231002", source: "instagram", status: "BERKAS_LENGKAP", picSales: "ANTI", namaKampanye: "IG Ads Sept 2024", projectId: p1.id, pekerjaan: "Guru SD Negeri", budget: "Rp280-320jt", tanggalBerkasMasuk: "2024-10-01", catatanFollowUp: "Berkas sudah 100% lengkap" },
    { nama: "Muhammad Hasan", kontak: "08114231003", source: "walk_in", status: "DISERAHKAN_ADMIN", picSales: "ARYA", projectId: p1.id, pekerjaan: "Wiraswasta", budget: "Rp350-400jt", tanggalBooking: "2024-10-10" },
    { nama: "Nurlina Basri", kontak: "08114231004", source: "referral", status: "SURVEY_DILAKUKAN", picSales: "ANTI", projectId: p1.id, pekerjaan: "Bidan Puskesmas", tanggalSurveyDilakukan: "2024-11-05", catatanFollowUp: "Suka lokasi, minta cicilan ringan" },
    { nama: "Irwan Sanjaya", kontak: "08114231005", source: "facebook", status: "INTERESTED", picSales: "ARYA", namaKampanye: "FB Ads Okt 2024", projectId: p1.id, pekerjaan: "Kontraktor", budget: "Rp400jt", catatanFollowUp: "Nanya soal spec bangunan" },
    { nama: "Jumriani Latif", kontak: "08114231006", source: "whatsapp_blast", status: "CONTACTED", picSales: "ANTI", projectId: p1.id, pekerjaan: "Perawat RS", budget: "Rp300jt" },
    { nama: "Kamaruddin Musa", kontak: "08114231007", source: "referral", status: "NEW_LEAD", picSales: "ARYA", projectId: p1.id, budget: "Rp250jt" },
    { nama: "Sri Wahyuni", kontak: "08114231008", source: "pameran", status: "BATAL", picSales: "ANTI", projectId: p1.id, alasanBatal: "Budget tidak mencukupi, cari yang lebih murah" },
    // P2 — aktif marketing semua stage
    { nama: "Hasanuddin Mappatoba", kontak: "08122341001", source: "instagram", status: "NEW_LEAD", picSales: "TAHIR", namaKampanye: "IG Ads Bulukumba Mei 2026", projectId: p2.id, pekerjaan: "PNS Pemda", budget: "Rp400-450jt" },
    { nama: "Rahmawati Usman", kontak: "08122341002", source: "referral", status: "CONTACTED", picSales: "TAHIR", projectId: p2.id, pekerjaan: "Dokter Spesialis", budget: "Rp500jt", catatanFollowUp: "Sedang cek KPR di BTN" },
    { nama: "Faisal Akbar", kontak: "08122341003", source: "facebook", status: "INTERESTED", picSales: "TAHIR", namaKampanye: "FB Lead Gen Mei 2026", projectId: p2.id, pekerjaan: "TNI AD", budget: "Rp400jt", catatanFollowUp: "Minta brosur type 45/90" },
    { nama: "Nur Azizah", kontak: "08122341004", source: "walk_in", status: "SURVEY_DIJADWALKAN", picSales: "TAHIR", projectId: p2.id, pekerjaan: "Apoteker", budget: "Rp450jt", tanggalSurveyDijadwalkan: "2026-06-20" },
    { nama: "Rizal Amiruddin", kontak: "08122341005", source: "instagram", status: "SURVEY_DILAKUKAN", picSales: "TAHIR", projectId: p2.id, pekerjaan: "Pengacara", tanggalSurveyDilakukan: "2026-06-05", catatanFollowUp: "Puas dengan lokasi, tinggal keputusan keluarga" },
    { nama: "Marlina Hadi", kontak: "08122341006", source: "referral", status: "BOOKING", picSales: "TAHIR", projectId: p2.id, pekerjaan: "Bidan", budget: "Rp415jt", tanggalBooking: "2026-05-20" },
    { nama: "Syahrul Gunawan", kontak: "08122341007", source: "google_ads", status: "BOOKING", picSales: "TAHIR", namaKampanye: "Google Ads Perumahan BLK", projectId: p2.id, pekerjaan: "Karyawan BUMN", tanggalBooking: "2026-05-28" },
    { nama: "Indah Lestari", kontak: "08122341008", source: "instagram", status: "BERKAS_LENGKAP", picSales: "TAHIR", namaKampanye: "IG Ads Bulukumba Mei 2026", projectId: p2.id, pekerjaan: "Guru SMA", tanggalBerkasMasuk: "2026-06-01", catatanFollowUp: "Berkas lengkap, siap diserahkan" },
    { nama: "Baharuddin Ramli", kontak: "08122341009", source: "referral", status: "DISERAHKAN_ADMIN", picSales: "TAHIR", projectId: p2.id, pekerjaan: "Pengusaha Kuliner", tanggalBooking: "2026-05-10" },
    { nama: "Salmah Kadir", kontak: "08122341010", source: "whatsapp_blast", status: "BATAL", picSales: "TAHIR", projectId: p2.id, alasanBatal: "KPR ditolak bank, skoring BI checking jelek" },
    { nama: "Hendra Wijaya", kontak: "08122341011", source: "pameran", status: "PENDING", picSales: "TAHIR", projectId: p2.id, pekerjaan: "Swasta", alasanBatalPending: "Menunggu keputusan bersama keluarga" },
    { nama: "Dewi Sartika Lolo", kontak: "08122341012", source: "google_ads", status: "NEW_LEAD", picSales: "TAHIR", namaKampanye: "Google Ads Perumahan BLK", projectId: p2.id, budget: "Rp415jt" },
    { nama: "Eko Prasetyo", kontak: "08122341013", source: "instagram", status: "INTERESTED", picSales: "TAHIR", namaKampanye: "IG Ads Bulukumba Jun 2026", projectId: p2.id, pekerjaan: "Karyawan Swasta", budget: "Rp400jt", catatanFollowUp: "Tanya cicilan per bulan" },
  ];

  const createdLeads = [];
  for (const l of leadsData) {
    const lead = await post("/marketing/leads", l);
    createdLeads.push(lead);
    log(`  Lead: ${lead.nama} — ${lead.status} (${lead.source})`);
  }

  // ─── 9. MARKETING CAMPAIGNS ────────────────────────────────
  section("9. MARKETING - CAMPAIGNS");

  const campaignsData = [
    { projectId: p1.id, nama: "IG Ads Bantaeng Q4 2024", platform: "instagram", anggaran: 15000000, spend: 13500000, impresi: 185000, klik: 3200, leadsGenerated: 42, tanggalMulai: "2024-10-01", tanggalSelesai: "2024-12-31", status: "selesai" },
    { projectId: p1.id, nama: "FB Lead Gen Bantaeng Q4 2024", platform: "facebook", anggaran: 12000000, spend: 11200000, impresi: 142000, klik: 2800, leadsGenerated: 38, tanggalMulai: "2024-10-15", tanggalSelesai: "2024-12-31", status: "selesai" },
    { projectId: p1.id, nama: "Program Referral Q1 2025", platform: "lainnya", anggaran: 5000000, spend: 3800000, impresi: 0, klik: 0, leadsGenerated: 18, tanggalMulai: "2025-01-01", tanggalSelesai: "2025-03-31", status: "selesai" },
    { projectId: p1.id, nama: "WhatsApp Blast Eksisting Customer", platform: "lainnya", anggaran: 2000000, spend: 1800000, impresi: 0, klik: 0, leadsGenerated: 12, tanggalMulai: "2025-02-01", tanggalSelesai: "2025-02-28", status: "selesai" },
    { projectId: p2.id, nama: "IG Ads Bulukumba Mei 2026", platform: "instagram", anggaran: 20000000, spend: 15600000, impresi: 210000, klik: 4100, leadsGenerated: 28, tanggalMulai: "2026-05-01", tanggalSelesai: "2026-06-30", status: "aktif" },
    { projectId: p2.id, nama: "Google Ads Perumahan Bulukumba", platform: "google_ads", anggaran: 25000000, spend: 18900000, impresi: 98000, klik: 5200, leadsGenerated: 22, tanggalMulai: "2026-05-15", tanggalSelesai: "2026-07-31", status: "aktif" },
    { projectId: p2.id, nama: "Pameran Properti Makassar 2026", platform: "pameran", anggaran: 18000000, spend: 18000000, impresi: 0, klik: 0, leadsGenerated: 35, tanggalMulai: "2026-05-20", tanggalSelesai: "2026-05-22", status: "selesai" },
    { projectId: p2.id, nama: "FB Lead Gen Bulukumba Mei 2026", platform: "facebook", anggaran: 15000000, spend: 10200000, impresi: 125000, klik: 2900, leadsGenerated: 18, tanggalMulai: "2026-05-10", tanggalSelesai: "2026-06-30", status: "aktif" },
    { projectId: p3.id, nama: "Soft Launch Digital Bukit Indah Gowa", platform: "instagram", anggaran: 8000000, spend: 5200000, impresi: 65000, klik: 1200, leadsGenerated: 8, tanggalMulai: "2026-06-01", tanggalSelesai: "2026-07-31", status: "aktif" },
  ];

  for (const c of campaignsData) {
    try {
      const r = await post("/marketing/campaigns", c);
      log(`  Campaign: ${r.nama} — ${r.leadsGenerated} leads (${r.platform})`);
    } catch (e) {
      log(`  Campaign SKIP: ${e.message.slice(0, 80)}`);
    }
  }

  // ─── 10. ADMINISTRASI KPR — CUSTOMERS ─────────────────────
  section("10. ADMINISTRASI KPR - CUSTOMERS (Pipeline HT)");

  const customersData = [
    // P1 — sudah HT Cair / Akad (BUILD advanced)
    { nama: "Andi Fauzan Arif", nik: "7302011204890001", kontak: "08114231001", phone: "08114231001", pekerjaan: "PNS Dinas Pendidikan Bantaeng", bank: "BTN", projectId: p1.id, unitId: units1[0].id, unitBlock: `${units1[0].blok}${units1[0].nomor}`, pipelineStatus: "HT_CAIR", statusKpr: "disetujui", berkasLengkap: true, dpAmount: "47250000", loanAmount: "267750000", unitPrice: "315000000", bookingDate: "2024-09-15", akadDate: "2025-01-10", htDate: "2025-03-15", paymentType: "KPR", picAdmin: "IRDA", referralSource: "referral" },
    { nama: "Sitti Rahma Dewi", nik: "7302014508900002", kontak: "08114231002", phone: "08114231002", pekerjaan: "Guru SD Negeri 2 Bantaeng", bank: "BRI", projectId: p1.id, unitId: units1[1].id, unitBlock: `${units1[1].blok}${units1[1].nomor}`, pipelineStatus: "AKAD", statusKpr: "disetujui", berkasLengkap: true, dpAmount: "47250000", loanAmount: "267750000", unitPrice: "315000000", bookingDate: "2024-10-01", akadDate: "2025-02-14", paymentType: "KPR", picAdmin: "ANTI", referralSource: "instagram" },
    { nama: "Muhammad Hasan", nik: "7302011506850003", kontak: "08114231003", phone: "08114231003", pekerjaan: "Wiraswasta (Toko Material)", bank: "BSI", projectId: p1.id, unitId: units1[2].id, unitBlock: `${units1[2].blok}${units1[2].nomor}`, pipelineStatus: "SP3K", statusKpr: "disetujui", berkasLengkap: true, dpAmount: "59250000", loanAmount: "335750000", unitPrice: "395000000", bookingDate: "2024-10-10", paymentType: "KPR", picAdmin: "IRDA", referralSource: "walk_in" },
    { nama: "Nurlina Basri", nik: "7302016703920004", kontak: "08114231004", phone: "08114231004", pekerjaan: "Bidan Puskesmas Bissappu", bank: "BTN", projectId: p1.id, unitId: units1[3].id, unitBlock: `${units1[3].blok}${units1[3].nomor}`, pipelineStatus: "OTS", statusKpr: "bi_checking", berkasLengkap: true, dpAmount: "47250000", loanAmount: "267750000", unitPrice: "315000000", bookingDate: "2024-11-05", paymentType: "KPR", picAdmin: "ANTI" },
    { nama: "Irwan Sanjaya", nik: "7302011802880005", kontak: "08114231005", phone: "08114231005", pekerjaan: "Kontraktor CV Sanjaya", bank: "Mandiri", projectId: p1.id, unitId: units1[4].id, unitBlock: `${units1[4].blok}${units1[4].nomor}`, pipelineStatus: "SETOR_BANK", statusKpr: "bi_checking", berkasLengkap: true, dpAmount: "59250000", loanAmount: "335750000", unitPrice: "395000000", bookingDate: "2024-11-20", paymentType: "KPR", picAdmin: "IRDA" },
    { nama: "Rosmawati Dg Nambung", nik: "7302012209750006", kontak: "08114231006", phone: "08114231006", pekerjaan: "Pedagang Pasar", bank: "BNI", projectId: p1.id, unitId: units1[5].id, unitBlock: `${units1[5].blok}${units1[5].nomor}`, pipelineStatus: "BERKAS_LENGKAP", statusKpr: "bi_checking", berkasLengkap: true, dpAmount: "47250000", loanAmount: "267750000", unitPrice: "315000000", bookingDate: "2024-12-01", paymentType: "KPR", picAdmin: "ANTI" },
    { nama: "Kamaruddin Dg Siala", nik: "7302011407800007", kontak: "08114231007", phone: "08114231007", pekerjaan: "Pedagang Ikan", bank: "BSI", projectId: p1.id, unitId: units1[6].id, unitBlock: `${units1[6].blok}${units1[6].nomor}`, pipelineStatus: "PROSES_BERKAS", statusKpr: "bi_checking", berkasLengkap: false, dpAmount: "47250000", loanAmount: "267750000", unitPrice: "315000000", bookingDate: "2025-01-10", paymentType: "KPR", picAdmin: "IRDA" },
    { nama: "Hj. Rosmiati", nik: "7302016805680008", kontak: "08114231008", phone: "08114231008", pekerjaan: "Pensiunan PNS Dinkes", bank: "CASH", projectId: p1.id, unitId: units1[7].id, unitBlock: `${units1[7].blok}${units1[7].nomor}`, pipelineStatus: "HT_CAIR", statusKpr: "disetujui", berkasLengkap: true, unitPrice: "315000000", bookingDate: "2024-08-01", akadDate: "2024-10-20", paymentType: "CASH", picAdmin: "ANTI" },
    { nama: "Drs. Ahmad Zubair", nik: "7302011203650009", kontak: "08114231009", phone: "08114231009", pekerjaan: "Kepala Sekolah SMAN", bank: "BTN", projectId: p1.id, unitId: units1[8].id, unitBlock: `${units1[8].blok}${units1[8].nomor}`, pipelineStatus: "AKAD", statusKpr: "disetujui", berkasLengkap: true, dpAmount: "59250000", loanAmount: "335750000", unitPrice: "395000000", bookingDate: "2024-09-20", akadDate: "2024-12-15", paymentType: "KPR", picAdmin: "IRDA" },
    { nama: "Nur Hayati Dg Baji", nik: "7302015007780010", kontak: "08114231010", phone: "08114231010", pekerjaan: "Honorer Pemda", bank: "BRI", projectId: p1.id, unitId: units1[9].id, unitBlock: `${units1[9].blok}${units1[9].nomor}`, pipelineStatus: "MINAT", statusKpr: "bi_checking", berkasLengkap: false, unitPrice: "315000000", paymentType: "KPR", picAdmin: "ANTI" },
    // P2 — akad & proses (SELL)
    { nama: "Marlina Hadi", nik: "7305016203850011", kontak: "08122341006", phone: "08122341006", pekerjaan: "Bidan Puskesmas Caile", bank: "BTN", projectId: p2.id, unitId: units2[0].id, unitBlock: `${units2[0].blok}${units2[0].nomor}`, pipelineStatus: "AKAD", statusKpr: "disetujui", berkasLengkap: true, dpAmount: "62250000", loanAmount: "352750000", unitPrice: "415000000", bookingDate: "2026-05-20", akadDate: "2026-06-05", paymentType: "KPR", picAdmin: "NIA" },
    { nama: "Baharuddin Ramli", nik: "7305011501870012", kontak: "08122341009", phone: "08122341009", pekerjaan: "Pengusaha Kuliner", bank: "BRI", projectId: p2.id, unitId: units2[1].id, unitBlock: `${units2[1].blok}${units2[1].nomor}`, pipelineStatus: "SP3K", statusKpr: "disetujui", berkasLengkap: true, dpAmount: "74250000", loanAmount: "420750000", unitPrice: "495000000", bookingDate: "2026-05-10", paymentType: "KPR", picAdmin: "NIA" },
    { nama: "Rizal Amiruddin", nik: "7305012803910013", kontak: "08122341005", phone: "08122341005", pekerjaan: "Pengacara", bank: "Mandiri", projectId: p2.id, unitId: units2[2].id, unitBlock: `${units2[2].blok}${units2[2].nomor}`, pipelineStatus: "OTS", statusKpr: "bi_checking", berkasLengkap: true, dpAmount: "62250000", loanAmount: "352750000", unitPrice: "415000000", bookingDate: "2026-06-01", paymentType: "KPR", picAdmin: "NIA" },
    { nama: "Indah Lestari", nik: "7305012207930014", kontak: "08122341008", phone: "08122341008", pekerjaan: "Guru SMA Negeri", bank: "BTN", projectId: p2.id, unitId: units2[3].id, unitBlock: `${units2[3].blok}${units2[3].nomor}`, pipelineStatus: "SETOR_BANK", statusKpr: "bi_checking", berkasLengkap: true, dpAmount: "62250000", loanAmount: "352750000", unitPrice: "415000000", bookingDate: "2026-05-28", paymentType: "KPR", picAdmin: "NIA" },
    { nama: "Nur Azizah", nik: "7305014407900015", kontak: "08122341004", phone: "08122341004", pekerjaan: "Apoteker RS Umum Bulukumba", bank: "BSI", projectId: p2.id, unitId: units2[4].id, unitBlock: `${units2[4].blok}${units2[4].nomor}`, pipelineStatus: "BERKAS_LENGKAP", statusKpr: "bi_checking", berkasLengkap: true, dpAmount: "62250000", loanAmount: "352750000", unitPrice: "415000000", bookingDate: "2026-06-03", paymentType: "KPR", picAdmin: "NIA" },
    { nama: "Faisal Akbar", nik: "7305011308870016", kontak: "08122341003", phone: "08122341003", pekerjaan: "TNI AD Koramil Bulukumba", bank: "BRI", projectId: p2.id, unitId: units2[5].id, unitBlock: `${units2[5].blok}${units2[5].nomor}`, pipelineStatus: "PROSES_BERKAS", statusKpr: "bi_checking", berkasLengkap: false, dpAmount: "62250000", loanAmount: "352750000", unitPrice: "415000000", bookingDate: "2026-06-05", paymentType: "KPR", picAdmin: "NIA" },
    { nama: "Syahrul Gunawan", nik: "7305011212900017", kontak: "08122341007", phone: "08122341007", pekerjaan: "Karyawan BUMN PLN", bank: "Mandiri", projectId: p2.id, unitId: units2[6].id, unitBlock: `${units2[6].blok}${units2[6].nomor}`, pipelineStatus: "MINAT", statusKpr: "bi_checking", berkasLengkap: false, unitPrice: "415000000", paymentType: "KPR", picAdmin: "NIA" },
  ];

  const createdCustomers = [];
  for (const c of customersData) {
    const customer = await post("/administrasi/customers", c);
    createdCustomers.push(customer);
    log(`  Customer: ${customer.nama} — ${customer.pipelineStatus} | Bank: ${customer.bank || "-"}`);
  }

  // ─── 11. CONSTRUCTION TASKS ────────────────────────────────
  section("11. PRODUKSI - CONSTRUCTION TASKS");

  const TASK_ITEMS = [
    { nama: "Pekerjaan Pendahuluan", bobot: 2 },
    { nama: "Timbunan & Compaction", bobot: 3 },
    { nama: "Pondasi Batu Gunung", bobot: 6 },
    { nama: "Sloof Beton Bertulang", bobot: 5 },
    { nama: "Dinding Bata Merah", bobot: 8 },
    { nama: "Kolom Beton Bertulang", bobot: 7 },
    { nama: "Ring Balok & Plat Dak", bobot: 6 },
    { nama: "Rangka Atap Baja Ringan", bobot: 5 },
    { nama: "Penutup Atap Spandek", bobot: 5 },
    { nama: "Plesteran & Acian Dinding", bobot: 6 },
    { nama: "Pemasangan Keramik Lantai", bobot: 5 },
    { nama: "Pemasangan Keramik Dinding", bobot: 4 },
    { nama: "Plafon Gypsum", bobot: 4 },
    { nama: "Instalasi Listrik", bobot: 5 },
    { nama: "Instalasi Air Bersih", bobot: 4 },
    { nama: "Instalasi Air Kotor & Septictank", bobot: 4 },
    { nama: "Kusen Pintu & Jendela", bobot: 4 },
    { nama: "Pengecatan Interior", bobot: 4 },
    { nama: "Pengecatan Eksterior", bobot: 4 },
    { nama: "Sanitasi & Kloset", bobot: 3 },
    { nama: "Finishing & Pembersihan", bobot: 3 },
    { nama: "QC Checklist Internal", bobot: 2 },
    { nama: "Perbaikan Punch List", bobot: 2 },
    { nama: "Serah Terima Internal", bobot: 5 },
  ];

  // Hitung bobot kumulatif
  let cumulative = [];
  let cum = 0;
  for (const t of TASK_ITEMS) { cum += t.bobot; cumulative.push(cum); }

  // Seed 30 unit P1 (20 unit pertama + 10 unit berikutnya)
  const seedUnits = units1.slice(0, 30);
  let taskCount = 0;

  for (const unit of seedUnits) {
    for (let i = 0; i < TASK_ITEMS.length; i++) {
      const t = TASK_ITEMS[i];
      const prevCum = i > 0 ? cumulative[i - 1] : 0;
      let status = "belum_mulai";
      if (unit.progress >= cumulative[i]) status = "selesai";
      else if (unit.progress > prevCum) status = "dalam_proses";

      const tanggalMulai = status !== "belum_mulai"
        ? `2024-${String(Math.min(Math.floor(i / 2) + 2, 12)).padStart(2, "0")}-01`
        : null;

      await post("/construction/tasks", { unitId: unit.id, item: t.nama, bobot: t.bobot, status, tanggalMulai });
      taskCount++;
    }
  }
  log(`  ${taskCount} construction tasks untuk ${seedUnits.length} unit P1`);

  // ─── 12. MATERIALS ─────────────────────────────────────────
  section("12. PRODUKSI - MASTER MATERIAL & STOK");

  const materialsData = [
    { projectId: p1.id, nama: "Semen Portland 40kg (Tonasa)", satuan: "zak", kategori: "B - Struktur", stok: 850, minimumStock: 200, vendor: "Toko Bahan Bangunan Sumber Makmur Bantaeng", harga: 62000 },
    { projectId: p1.id, nama: "Pasir Beton", satuan: "m3", kategori: "B - Struktur", stok: 120, minimumStock: 30, vendor: "UD. Berkah Material", harga: 250000 },
    { projectId: p1.id, nama: "Batu Gunung / Kerikil", satuan: "m3", kategori: "B - Struktur", stok: 85, minimumStock: 25, vendor: "UD. Berkah Material", harga: 220000 },
    { projectId: p1.id, nama: "Besi Beton D10 (SNI)", satuan: "batang", kategori: "B - Struktur", stok: 450, minimumStock: 100, vendor: "CV. Besi Jaya Makassar", harga: 78000 },
    { projectId: p1.id, nama: "Besi Beton D8 (SNI)", satuan: "batang", kategori: "B - Struktur", stok: 380, minimumStock: 80, vendor: "CV. Besi Jaya Makassar", harga: 52000 },
    { projectId: p1.id, nama: "Bata Merah 5x11x22 cm", satuan: "buah", kategori: "B - Struktur", stok: 28000, minimumStock: 5000, vendor: "Pengrajin Bata Dg. Situru", harga: 800 },
    { projectId: p1.id, nama: "Rangka Baja Ringan C75", satuan: "batang", kategori: "C - Atap & Rangka", stok: 310, minimumStock: 50, vendor: "CV. Baja Mandiri Sulsel", harga: 95000 },
    { projectId: p1.id, nama: "Spandek 0.3mm Panjang 6m", satuan: "lembar", kategori: "C - Atap & Rangka", stok: 195, minimumStock: 40, vendor: "CV. Baja Mandiri Sulsel", harga: 145000 },
    { projectId: p1.id, nama: "Keramik Lantai 40x40 Roman", satuan: "dos", kategori: "D - Finishing", stok: 340, minimumStock: 60, vendor: "Toko Keramik Asia Bantaeng", harga: 85000 },
    { projectId: p1.id, nama: "Keramik Dinding 25x40 Kamar Mandi", satuan: "dos", kategori: "D - Finishing", stok: 85, minimumStock: 30, vendor: "Toko Keramik Asia Bantaeng", harga: 78000 },
    { projectId: p1.id, nama: "Cat Tembok Interior Dulux 5L", satuan: "kaleng", kategori: "D - Finishing", stok: 110, minimumStock: 40, vendor: "Toko Cat Maju Bantaeng", harga: 165000 },
    { projectId: p1.id, nama: "Cat Eksterior Weathershield 5L", satuan: "kaleng", kategori: "D - Finishing", stok: 65, minimumStock: 25, vendor: "Toko Cat Maju Bantaeng", harga: 195000 },
    { projectId: p1.id, nama: "Gypsum Board 9mm 1200x2400", satuan: "lembar", kategori: "D - Finishing", stok: 220, minimumStock: 50, vendor: "UD. Gypsum Jaya Sulsel", harga: 72000 },
    { projectId: p1.id, nama: "Kabel NYM 2x2.5mm Eterna", satuan: "meter", kategori: "E - Instalasi Listrik", stok: 2400, minimumStock: 500, vendor: "Toko Listrik Matahari", harga: 8500 },
    { projectId: p1.id, nama: "MCB 10A Schneider", satuan: "buah", kategori: "E - Instalasi Listrik", stok: 50, minimumStock: 15, vendor: "Toko Listrik Matahari", harga: 35000 },
    // Stok RENDAH — trigger alert
    { projectId: p1.id, nama: "Pipa PVC 1/2 inch Rucika", satuan: "batang", kategori: "F - Instalasi Air", stok: 18, minimumStock: 50, vendor: "Toko Pipa Sari Bantaeng", harga: 22000 },
    { projectId: p1.id, nama: "Kloset Jongkok TOTO", satuan: "buah", kategori: "D - Finishing", stok: 5, minimumStock: 20, vendor: "Toko Sanitasi Makmur", harga: 450000 },
    { projectId: p1.id, nama: "Wastafel Meja ROCA", satuan: "buah", kategori: "D - Finishing", stok: 3, minimumStock: 15, vendor: "Toko Sanitasi Makmur", harga: 850000 },
    // P2 materials
    { projectId: p2.id, nama: "Semen Portland 40kg (Tonasa)", satuan: "zak", kategori: "B - Struktur", stok: 420, minimumStock: 100, vendor: "Toko Material Bulukumba", harga: 63000 },
    { projectId: p2.id, nama: "Pasir Beton", satuan: "m3", kategori: "B - Struktur", stok: 60, minimumStock: 20, vendor: "UD. Pasir Jaya Bulukumba", harga: 260000 },
    { projectId: p2.id, nama: "Besi Beton D10", satuan: "batang", kategori: "B - Struktur", stok: 220, minimumStock: 60, vendor: "CV. Besi Mandiri Makassar", harga: 79000 },
    { projectId: p2.id, nama: "Bata Merah Lokal Caile", satuan: "buah", kategori: "B - Struktur", stok: 12000, minimumStock: 3000, vendor: "Pengrajin Bata Caile Bulukumba", harga: 820 },
    { projectId: p2.id, nama: "Rangka Baja Ringan C75", satuan: "batang", kategori: "C - Atap & Rangka", stok: 12, minimumStock: 30, vendor: "CV. Baja Mandiri Sulsel", harga: 96000 },
  ];

  for (const m of materialsData) {
    const mat = await post("/materials", m);
    const alert = mat.isBelowMinimum ? " ⚠ STOK RENDAH" : "";
    log(`  Material: ${mat.nama} (${mat.stok} ${mat.satuan})${alert}`);
  }

  // ─── 13. QC DEFECTS ────────────────────────────────────────
  section("13. PRODUKSI - QC DEFECTS");

  const qcData = [
    { unitId: units1[8].id, item: "Retak rambut pada dinding kamar tidur utama", kategori: "dinding", status: "fixed", verifiedBy: "ARYA", catatan: "Cat ulang + plester ulang bagian yang retak" },
    { unitId: units1[9].id, item: "Nat keramik kamar mandi tidak rata, ada yang copot", kategori: "keramik", status: "open", catatan: "Perlu diperbaiki sebelum serah terima" },
    { unitId: units1[10].id, item: "Engsel pintu kamar mandi longgar", kategori: "kusen_pintu", status: "in_repair", catatan: "Menunggu tukang kayu" },
    { unitId: units1[11].id, item: "Cat plafon belang — 2 warna berbeda di ruang tamu", kategori: "cat", status: "open", catatan: "Cat ulang seluruh plafon ruang tamu" },
    { unitId: units1[12].id, item: "Kebocoran atap di sudut barat saat hujan deras", kategori: "atap", status: "fixed", verifiedBy: "ARYA", catatan: "Tambah sealant dan kencangkan baut spandek" },
    { unitId: units1[13].id, item: "Stop kontak dapur tidak berfungsi", kategori: "listrik", status: "in_repair", catatan: "Kabel sambungan terputus, menunggu teknisi" },
    { unitId: units1[14].id, item: "Air tidak mengalir ke WC belakang", kategori: "plumbing", status: "open", catatan: "Ada penyumbatan di pipa 2.5 inch" },
    { unitId: units1[15].id, item: "Jendela kamar tidur susah dibuka & dikunci", kategori: "kusen_pintu", status: "fixed", verifiedBy: "ARYA", catatan: "Rel jendela dilumasi dan disetel ulang" },
    { unitId: units1[16].id, item: "Lantai keramik dapur bunyi nyaring saat diinjak", kategori: "keramik", status: "open", catatan: "Rongga di bawah keramik, perlu dibongkar & pasang ulang" },
    { unitId: units1[17].id, item: "Saklar lampu teras tidak responsif", kategori: "listrik", status: "fixed", verifiedBy: "ARYA", catatan: "Saklar diganti baru" },
    { unitId: units1[18].id, item: "Pintu kamar utama tidak bisa dikunci dari dalam", kategori: "kusen_pintu", status: "in_repair", catatan: "Kunci pintu aus, perlu diganti" },
    { unitId: units1[19].id, item: "Plafon kamar mandi turun / melendung", kategori: "plafon", status: "open", catatan: "Kemungkinan ada rembesan air dari atap" },
  ];

  for (const qc of qcData) {
    const r = await post("/qc/defects", qc);
    log(`  QC: Unit ${r.unitId} — ${r.item.slice(0, 50)} (${r.status})`);
  }

  // ─── 14. SUBKON CONTRACTS ─────────────────────────────────
  section("14. PRODUKSI - SUBKON CONTRACTS");

  const subkonData = [
    { projectId: p1.id, stageCode: "B_struktur", subkonName: "CV. Bangun Setia Makassar", unitCount: 50, valuePerUnit: 45000000, retentionPerUnit: 4500000, maintenanceMonths: 3, startDate: "2024-02-01", targetEndDate: "2025-06-30" },
    { projectId: p1.id, stageCode: "C_atap", subkonName: "UD. Atap Jaya Sulsel", unitCount: 50, valuePerUnit: 12000000, retentionPerUnit: 1200000, maintenanceMonths: 3, startDate: "2024-06-01", targetEndDate: "2025-03-31" },
    { projectId: p1.id, stageCode: "D_finishing", subkonName: "CV. Finishing Prima Bantaeng", unitCount: 50, valuePerUnit: 18000000, retentionPerUnit: 1800000, maintenanceMonths: 6, startDate: "2024-09-01", targetEndDate: "2025-12-31" },
    { projectId: p1.id, stageCode: "E_mep_listrik", subkonName: "PT. Elektrika Sulawesi", unitCount: 50, valuePerUnit: 8500000, retentionPerUnit: 850000, maintenanceMonths: 12, startDate: "2024-08-01", targetEndDate: "2025-10-31" },
    { projectId: p1.id, stageCode: "F_mep_air", subkonName: "CV. Pipa Master Bantaeng", unitCount: 50, valuePerUnit: 5500000, retentionPerUnit: 550000, maintenanceMonths: 12, startDate: "2024-08-01", targetEndDate: "2025-10-31" },
    { projectId: p2.id, stageCode: "B_struktur", subkonName: "CV. Kontraktor Bulukumba Bersama", unitCount: 36, valuePerUnit: 50000000, retentionPerUnit: 5000000, maintenanceMonths: 3, startDate: "2024-07-01", targetEndDate: "2026-06-30" },
    { projectId: p2.id, stageCode: "D_finishing", subkonName: "UD. Finishing Bulukumba", unitCount: 36, valuePerUnit: 20000000, retentionPerUnit: 2000000, maintenanceMonths: 6, startDate: "2025-01-01", targetEndDate: "2026-12-31" },
    { projectId: p2.id, stageCode: "C_atap", subkonName: "CV. Atap Baja Bulukumba", unitCount: 36, valuePerUnit: 13000000, retentionPerUnit: 1300000, maintenanceMonths: 3, startDate: "2024-10-01", targetEndDate: "2025-12-31" },
  ];

  for (const sk of subkonData) {
    const r = await post("/produksi/subkon/contracts", sk);
    log(`  Subkon: ${r.subkonName} — Rp ${(r.contractValue / 1e9).toFixed(2)}M | Stage: ${r.stageCode}`);
  }

  // ─── 15. SERAH TERIMA — HANDOVERS ─────────────────────────
  section("15. SERAH TERIMA - HANDOVERS");

  // Update unit serah_terima jadi progress=100 & readyAkad=true dulu, lalu buat handover
  const handoverUnits = units1.filter(u => u.status === "serah_terima");
  let handoverCount = 0;
  const skorList = [5, 5, 4, 5, 4, 5, 5, 4];
  const tanggalList = ["2025-02-10", "2025-02-15", "2025-03-01", "2025-03-05", "2025-03-20", "2025-04-02", "2025-04-10", "2025-04-25"];
  const catatanList = [
    "Serah terima lancar, semua punch list beres. Customer puas.",
    "Beberapa minor issue diselesaikan H-1. BAST ditandatangani.",
    "Ada retouch cat, diselesaikan sebelum serah terima.",
    "Serah terima tepat waktu sesuai jadwal akad.",
    "Customer memuji kualitas finishing kamar mandi.",
    "Kunci diserahkan, foto unit dilakukan bersama.",
    "Infrastruktur jalan depan rumah masih dalam proses.",
    "Customer langsung huni, sangat puas dengan lokasi.",
  ];

  for (let i = 0; i < handoverUnits.length; i++) {
    const unit = handoverUnits[i];
    try {
      await patch(`/units/${unit.id}`, { progress: 100, readyAkad: true });
      const h = await post("/handovers", {
        unitId: unit.id,
        tanggalHandover: tanggalList[i] || "2025-04-30",
        skorKepuasan: skorList[i] || 5,
        catatan: catatanList[i] || "Serah terima berjalan lancar.",
      });
      handoverCount++;
      log(`  Handover: Unit ${unit.blok}${unit.nomor} — ${h.tanggalHandover} | Skor: ${h.skorKepuasan}/5`);
    } catch (e) {
      log(`  Handover unit ${unit.blok}${unit.nomor} GAGAL: ${e.message.slice(0, 80)}`);
    }
  }
  log(`  Total ${handoverCount} handover berhasil`);

  // ─── RINGKASAN ────────────────────────────────────────────
  section("SEED SELESAI — RINGKASAN");
  console.log("");
  console.log(`  ✅ Projects          : 3 (BUILD / SELL / PLAN)`);
  console.log(`  ✅ Akuisisi Lahan    : ${lands.length} prospek (7 stage pipeline)`);
  console.log(`  ✅ Planning Lahan    : 4 records`);
  console.log(`  ✅ Feasibility Study : 3 (2 approved, 1 draft)`);
  console.log(`  ✅ Cashflow Bulanan  : ${p1CashflowMonths.length + p2CashflowMonths.length} bulan (2 proyek)`);
  console.log(`  ✅ Legal Dokumen     : ${legalDocs.length} dokumen (semua tipe)`);
  console.log(`  ✅ Units             : ${units1.length + units2.length + units3.length} total (50+36+24)`);
  console.log(`  ✅ Marketing Leads   : ${createdLeads.length} leads (pipeline lengkap)`);
  console.log(`  ✅ Marketing Campaigns: ${campaignsData.length} kampanye`);
  console.log(`  ✅ Customers Admin   : ${createdCustomers.length} (pipeline HT)`);
  console.log(`  ✅ Construction Tasks: ${taskCount} tasks (30 unit P1)`);
  console.log(`  ✅ Materials & Stok  : ${materialsData.length} item (3 stok rendah)`);
  console.log(`  ✅ QC Defects        : ${qcData.length} defek (open/in_repair/fixed)`);
  console.log(`  ✅ Subkon Contracts  : ${subkonData.length} kontrak`);
  console.log(`  ✅ Serah Terima      : ${handoverCount} handover berhasil`);
  console.log("");
}

main().catch(err => {
  console.error("\n❌ SEED GAGAL:", err.message);
  process.exit(1);
});
