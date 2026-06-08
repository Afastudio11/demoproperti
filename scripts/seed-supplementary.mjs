/**
 * Seed supplementary — lanjutan dari seed-all.mjs
 * Mengisi modul yang belum ada data:
 *   A. FIX construction tasks (null → omit fix)
 *   B. FIX materials, QC, subkon, handovers
 *   C. Planning extended (market, product, KPP, SDM, milestones, landbank, expansion)
 *   D. Legal extended (permits, land stages, SHM splits, legal issues)
 *   E. Marketing extended (branding KPI, competitors, absorpsi)
 *   F. Administrasi extended (bank-sub, OTS, SP3K, akad, HT, monthly-targets, complaints)
 *   G. Produksi extended (prod-material-master, in, out, fasum, unit QC init)
 *   H. HR module (employees, recruitment, KPI, competency, training, compensation, dst)
 * Jalankan: node scripts/seed-supplementary.mjs
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

async function put(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PUT ${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

function log(msg) { console.log(`[SEED] ${msg}`); }
function section(title) { console.log(`\n${"═".repeat(60)}\n  ${title}\n${"═".repeat(60)}`); }
function tryLog(msg) { console.log(`[SKIP] ${msg}`); }

async function tryPost(path, body, label) {
  try {
    const r = await post(path, body);
    return r;
  } catch (e) {
    tryLog(`${label}: ${e.message.slice(0, 80)}`);
    return null;
  }
}

async function main() {
  // ── Ambil data existing ─────────────────────────────────────
  const projects = await get("/projects");
  const p1 = projects.find(p => p.id === 1);
  const p2 = projects.find(p => p.id === 2);
  const p3 = projects.find(p => p.id === 3);
  if (!p1 || !p2 || !p3) throw new Error("Projects tidak ditemukan — jalankan seed-all.mjs dulu");

  const allUnits = await get("/units");
  const units1 = allUnits.filter(u => u.projectId === 1).sort((a, b) => a.id - b.id);
  const units2 = allUnits.filter(u => u.projectId === 2).sort((a, b) => a.id - b.id);

  const customers = await get("/administrasi/customers");
  const custP1 = customers.filter(c => c.projectId === 1).sort((a, b) => a.id - b.id);
  const custP2 = customers.filter(c => c.projectId === 2).sort((a, b) => a.id - b.id);

  log(`Loaded: ${projects.length} projects, ${allUnits.length} units, ${customers.length} customers`);

  // ════════════════════════════════════════════════════════════
  section("A. PRODUKSI - CONSTRUCTION TASKS (FIX: null→omit)");
  // ════════════════════════════════════════════════════════════
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

  let cumulative = [];
  let cum = 0;
  for (const t of TASK_ITEMS) { cum += t.bobot; cumulative.push(cum); }

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
        : undefined;
      const body = { unitId: unit.id, item: t.nama, bobot: t.bobot, status };
      if (tanggalMulai) body.tanggalMulai = tanggalMulai;
      await post("/construction/tasks", body);
      taskCount++;
    }
  }
  log(`${taskCount} construction tasks untuk ${seedUnits.length} unit P1`);

  // Also P2 — 18 units first 18
  const seedUnits2 = units2.slice(0, 18);
  let taskCount2 = 0;
  for (const unit of seedUnits2) {
    for (let i = 0; i < TASK_ITEMS.length; i++) {
      const t = TASK_ITEMS[i];
      const prevCum = i > 0 ? cumulative[i - 1] : 0;
      let status = "belum_mulai";
      if (unit.progress >= cumulative[i]) status = "selesai";
      else if (unit.progress > prevCum) status = "dalam_proses";
      const tanggalMulai = status !== "belum_mulai"
        ? `2024-${String(Math.min(Math.floor(i / 2) + 7, 12)).padStart(2, "0")}-01`
        : undefined;
      const body = { unitId: unit.id, item: t.nama, bobot: t.bobot, status };
      if (tanggalMulai) body.tanggalMulai = tanggalMulai;
      await post("/construction/tasks", body);
      taskCount2++;
    }
  }
  log(`${taskCount2} construction tasks untuk ${seedUnits2.length} unit P2`);

  // ════════════════════════════════════════════════════════════
  section("B. PRODUKSI - MATERIALS (LAMA)");
  // ════════════════════════════════════════════════════════════
  const materialsData = [
    { projectId: 1, nama: "Semen Portland 40kg (Tonasa)", satuan: "zak", kategori: "B - Struktur", stok: 850, minimumStock: 200, vendor: "Toko Bahan Bangunan Sumber Makmur Bantaeng", harga: 62000 },
    { projectId: 1, nama: "Pasir Beton", satuan: "m3", kategori: "B - Struktur", stok: 120, minimumStock: 30, vendor: "UD. Berkah Material", harga: 250000 },
    { projectId: 1, nama: "Batu Gunung / Kerikil", satuan: "m3", kategori: "B - Struktur", stok: 85, minimumStock: 25, vendor: "UD. Berkah Material", harga: 220000 },
    { projectId: 1, nama: "Besi Beton D10 (SNI)", satuan: "batang", kategori: "B - Struktur", stok: 450, minimumStock: 100, vendor: "CV. Besi Jaya Makassar", harga: 78000 },
    { projectId: 1, nama: "Besi Beton D8 (SNI)", satuan: "batang", kategori: "B - Struktur", stok: 380, minimumStock: 80, vendor: "CV. Besi Jaya Makassar", harga: 52000 },
    { projectId: 1, nama: "Bata Merah 5x11x22 cm", satuan: "buah", kategori: "B - Struktur", stok: 28000, minimumStock: 5000, vendor: "Pengrajin Bata Dg. Situru", harga: 800 },
    { projectId: 1, nama: "Rangka Baja Ringan C75", satuan: "batang", kategori: "C - Atap & Rangka", stok: 310, minimumStock: 50, vendor: "CV. Baja Mandiri Sulsel", harga: 95000 },
    { projectId: 1, nama: "Spandek 0.3mm Panjang 6m", satuan: "lembar", kategori: "C - Atap & Rangka", stok: 195, minimumStock: 40, vendor: "CV. Baja Mandiri Sulsel", harga: 145000 },
    { projectId: 1, nama: "Keramik Lantai 40x40 Roman", satuan: "dos", kategori: "D - Finishing", stok: 340, minimumStock: 60, vendor: "Toko Keramik Asia Bantaeng", harga: 85000 },
    { projectId: 1, nama: "Keramik Dinding 25x40 Kamar Mandi", satuan: "dos", kategori: "D - Finishing", stok: 85, minimumStock: 30, vendor: "Toko Keramik Asia Bantaeng", harga: 78000 },
    { projectId: 1, nama: "Cat Tembok Interior Dulux 5L", satuan: "kaleng", kategori: "D - Finishing", stok: 110, minimumStock: 40, vendor: "Toko Cat Maju Bantaeng", harga: 165000 },
    { projectId: 1, nama: "Cat Eksterior Weathershield 5L", satuan: "kaleng", kategori: "D - Finishing", stok: 65, minimumStock: 25, vendor: "Toko Cat Maju Bantaeng", harga: 195000 },
    { projectId: 1, nama: "Gypsum Board 9mm 1200x2400", satuan: "lembar", kategori: "D - Finishing", stok: 220, minimumStock: 50, vendor: "UD. Gypsum Jaya Sulsel", harga: 72000 },
    { projectId: 1, nama: "Kabel NYM 2x2.5mm Eterna", satuan: "meter", kategori: "E - Instalasi Listrik", stok: 2400, minimumStock: 500, vendor: "Toko Listrik Matahari", harga: 8500 },
    { projectId: 1, nama: "MCB 10A Schneider", satuan: "buah", kategori: "E - Instalasi Listrik", stok: 50, minimumStock: 15, vendor: "Toko Listrik Matahari", harga: 35000 },
    { projectId: 1, nama: "Pipa PVC 1/2 inch Rucika", satuan: "batang", kategori: "F - Instalasi Air", stok: 18, minimumStock: 50, vendor: "Toko Pipa Sari Bantaeng", harga: 22000 },
    { projectId: 1, nama: "Kloset Jongkok TOTO", satuan: "buah", kategori: "D - Finishing", stok: 5, minimumStock: 20, vendor: "Toko Sanitasi Makmur", harga: 450000 },
    { projectId: 1, nama: "Wastafel Meja ROCA", satuan: "buah", kategori: "D - Finishing", stok: 3, minimumStock: 15, vendor: "Toko Sanitasi Makmur", harga: 850000 },
    { projectId: 2, nama: "Semen Portland 40kg (Tonasa)", satuan: "zak", kategori: "B - Struktur", stok: 420, minimumStock: 100, vendor: "Toko Material Bulukumba", harga: 63000 },
    { projectId: 2, nama: "Pasir Beton", satuan: "m3", kategori: "B - Struktur", stok: 60, minimumStock: 20, vendor: "UD. Pasir Jaya Bulukumba", harga: 260000 },
    { projectId: 2, nama: "Besi Beton D10", satuan: "batang", kategori: "B - Struktur", stok: 220, minimumStock: 60, vendor: "CV. Besi Mandiri Makassar", harga: 79000 },
    { projectId: 2, nama: "Bata Merah Lokal Caile", satuan: "buah", kategori: "B - Struktur", stok: 12000, minimumStock: 3000, vendor: "Pengrajin Bata Caile Bulukumba", harga: 820 },
    { projectId: 2, nama: "Rangka Baja Ringan C75", satuan: "batang", kategori: "C - Atap & Rangka", stok: 12, minimumStock: 30, vendor: "CV. Baja Mandiri Sulsel", harga: 96000 },
  ];
  let matCount = 0;
  for (const m of materialsData) {
    await tryPost("/materials", m, `Material ${m.nama}`);
    matCount++;
  }
  log(`${matCount} material items`);

  // ════════════════════════════════════════════════════════════
  section("C. PRODUKSI - QC DEFECTS");
  // ════════════════════════════════════════════════════════════
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
    await tryPost("/qc/defects", qc, `QC unit ${qc.unitId}`);
  }
  log(`${qcData.length} QC defects`);

  // ════════════════════════════════════════════════════════════
  section("D. PRODUKSI - SUBKON CONTRACTS");
  // ════════════════════════════════════════════════════════════
  const subkonData = [
    { projectId: 1, stageCode: "B_struktur", subkonName: "CV. Bangun Setia Makassar", unitCount: 50, valuePerUnit: 45000000, retentionPerUnit: 4500000, maintenanceMonths: 3, startDate: "2024-02-01", targetEndDate: "2025-06-30", contractValue: 2250000000, totalRetention: 225000000, netPayableValue: 2025000000 },
    { projectId: 1, stageCode: "C_atap", subkonName: "UD. Atap Jaya Sulsel", unitCount: 50, valuePerUnit: 12000000, retentionPerUnit: 1200000, maintenanceMonths: 3, startDate: "2024-06-01", targetEndDate: "2025-03-31", contractValue: 600000000, totalRetention: 60000000, netPayableValue: 540000000 },
    { projectId: 1, stageCode: "D_finishing", subkonName: "CV. Finishing Prima Bantaeng", unitCount: 50, valuePerUnit: 18000000, retentionPerUnit: 1800000, maintenanceMonths: 6, startDate: "2024-09-01", targetEndDate: "2025-12-31", contractValue: 900000000, totalRetention: 90000000, netPayableValue: 810000000 },
    { projectId: 1, stageCode: "E_mep_listrik", subkonName: "PT. Elektrika Sulawesi", unitCount: 50, valuePerUnit: 8500000, retentionPerUnit: 850000, maintenanceMonths: 12, startDate: "2024-08-01", targetEndDate: "2025-10-31", contractValue: 425000000, totalRetention: 42500000, netPayableValue: 382500000 },
    { projectId: 1, stageCode: "F_mep_air", subkonName: "CV. Pipa Master Bantaeng", unitCount: 50, valuePerUnit: 5500000, retentionPerUnit: 550000, maintenanceMonths: 12, startDate: "2024-08-01", targetEndDate: "2025-10-31", contractValue: 275000000, totalRetention: 27500000, netPayableValue: 247500000 },
    { projectId: 2, stageCode: "B_struktur", subkonName: "CV. Kontraktor Bulukumba Bersama", unitCount: 36, valuePerUnit: 50000000, retentionPerUnit: 5000000, maintenanceMonths: 3, startDate: "2024-07-01", targetEndDate: "2026-06-30", contractValue: 1800000000, totalRetention: 180000000, netPayableValue: 1620000000 },
    { projectId: 2, stageCode: "D_finishing", subkonName: "UD. Finishing Bulukumba", unitCount: 36, valuePerUnit: 20000000, retentionPerUnit: 2000000, maintenanceMonths: 6, startDate: "2025-01-01", targetEndDate: "2026-12-31", contractValue: 720000000, totalRetention: 72000000, netPayableValue: 648000000 },
    { projectId: 2, stageCode: "C_atap", subkonName: "CV. Atap Baja Bulukumba", unitCount: 36, valuePerUnit: 13000000, retentionPerUnit: 1300000, maintenanceMonths: 3, startDate: "2024-10-01", targetEndDate: "2025-12-31", contractValue: 468000000, totalRetention: 46800000, netPayableValue: 421200000 },
  ];
  const createdSubkons = [];
  for (const sk of subkonData) {
    const r = await tryPost("/produksi/subkon/contracts", sk, `Subkon ${sk.subkonName}`);
    if (r) { createdSubkons.push(r); log(`  Subkon: ${r.subkonName} — Rp${(r.contractValue/1e9).toFixed(2)}M`); }
  }

  // ════════════════════════════════════════════════════════════
  section("E. SERAH TERIMA - HANDOVERS");
  // ════════════════════════════════════════════════════════════
  const handoverUnits = units1.filter(u => u.status === "serah_terima");
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
  let handoverCount = 0;
  for (let i = 0; i < handoverUnits.length; i++) {
    const unit = handoverUnits[i];
    try {
      await patch(`/units/${unit.id}`, { progress: 100, readyAkad: true });
      await post("/handovers", { unitId: unit.id, tanggalHandover: tanggalList[i] || "2025-04-30", skorKepuasan: skorList[i] || 5, catatan: catatanList[i] || "Serah terima berjalan lancar." });
      handoverCount++;
    } catch (e) { tryLog(`Handover unit ${unit.id}: ${e.message.slice(0,80)}`); }
  }
  log(`${handoverCount} handover berhasil`);

  // ════════════════════════════════════════════════════════════
  section("F. PERENCANAAN - MARKET ANALYSIS");
  // ════════════════════════════════════════════════════════════
  const markets = [];
  const marketData = [
    { projectId: 1, kabupaten: "Bantaeng", population: 182000, populationGrowth: 1.2, kkCount: 42500, kkGrowth: 1.5, density: 290, umk: 3200000, avgIncome: 4200000, asnCount: 3800, privateEmployees: 12000, umkmCount: 6500, unemploymentRate: 4.2, flppRealization: 85, activeDevelopers: 3, activeBanks: 6, targetPrice: 315000000, demandScore: 78, marketPotentialScore: 82, marketRecommendation: "Potensi tinggi, segmen PNS & guru dominan. Harga target Rp315-395jt sangat kompetitif." },
    { projectId: 2, kabupaten: "Bulukumba", population: 418000, populationGrowth: 1.4, kkCount: 98000, kkGrowth: 1.6, density: 235, umk: 3350000, avgIncome: 4800000, asnCount: 6200, privateEmployees: 28000, umkmCount: 14000, unemploymentRate: 5.1, flppRealization: 142, activeDevelopers: 5, activeBanks: 8, targetPrice: 415000000, demandScore: 85, marketPotentialScore: 88, marketRecommendation: "Pasar terbesar di Sulsel Tenggara, demand KPR sangat tinggi. Kompetitor masih terbatas di segmen Rp400-500jt." },
    { projectId: 3, kabupaten: "Gowa", population: 762000, populationGrowth: 2.1, kkCount: 178000, kkGrowth: 2.3, density: 410, umk: 3800000, avgIncome: 5600000, asnCount: 11200, privateEmployees: 65000, umkmCount: 24000, unemploymentRate: 6.8, flppRealization: 215, activeDevelopers: 12, activeBanks: 10, targetPrice: 285000000, demandScore: 72, marketPotentialScore: 75, marketRecommendation: "Persaingan ketat dari developer besar Makassar. Fokus segmen MBR subsidi BTN dengan harga Rp285jt." },
  ];
  for (const m of marketData) {
    const r = await tryPost("/planning/market", m, `Market ${m.kabupaten}`);
    if (r) { markets.push(r); log(`  Market: ${m.kabupaten} — Skor: ${m.marketPotentialScore}`); }
  }

  // Competitors per market
  const competitorsByMarket = [
    [
      { projectId: 1, namaKompetitor: "Perumahan Bumi Bantaeng Permai", lokasi: "Jl. Poros Bantaeng Km 5", jarak: 2.8, tipeUnit: "36/72", hargaMin: 290000000, hargaMax: 340000000, totalUnit: 40, unitTerjual: 32, progress: 80, kelebihan: "Harga lebih murah, sudah established" },
      { projectId: 1, namaKompetitor: "Cluster Green Hill Bantaeng", lokasi: "Jl. Masjid Raya Bantaeng", jarak: 4.2, tipeUnit: "45/90", hargaMin: 380000000, hargaMax: 450000000, totalUnit: 25, unitTerjual: 18, progress: 60, kelebihan: "Desain modern, dekat pusat kota" },
      { projectId: 1, namaKompetitor: "Perum Sinar Harapan BTN", lokasi: "Kelurahan Pallantikang", jarak: 5.5, tipeUnit: "21/60", hargaMin: 180000000, hargaMax: 200000000, totalUnit: 60, unitTerjual: 55, progress: 95, kelebihan: "Subsidi FLPP, harga paling murah" },
    ],
    [
      { projectId: 2, namaKompetitor: "Perumahan Bukit Indah Bulukumba", lokasi: "Jl. H. Andi Sulthan", jarak: 3.1, tipeUnit: "45/90", hargaMin: 390000000, hargaMax: 460000000, totalUnit: 50, unitTerjual: 38, progress: 75, kelebihan: "Brand sudah terkenal di Bulukumba" },
      { projectId: 2, namaKompetitor: "Griya Asri Caile", lokasi: "Jl. Dr. Wahidin Bulukumba", jarak: 1.8, tipeUnit: "36/72", hargaMin: 320000000, hargaMax: 360000000, totalUnit: 30, unitTerjual: 28, progress: 95, kelebihan: "Dekat RSUD, favorit tenaga medis" },
      { projectId: 2, namaKompetitor: "Cluster Premier Bulukumba", lokasi: "Jl. Kenari Raya Bulukumba", jarak: 4.8, tipeUnit: "54/108", hargaMin: 550000000, hargaMax: 680000000, totalUnit: 20, unitTerjual: 12, progress: 40, kelebihan: "Segmen premium, fasilitas lengkap" },
    ],
    [
      { projectId: 3, namaKompetitor: "Villa Malino Sejahtera", lokasi: "Jl. Poros Malino Km 10", jarak: 1.5, tipeUnit: "36/72", hargaMin: 260000000, hargaMax: 310000000, totalUnit: 35, unitTerjual: 25, progress: 70, kelebihan: "Lokasi lebih dekat pusat Malino, view lebih bagus" },
      { projectId: 3, namaKompetitor: "Perumahan Pegunungan Gowa", lokasi: "Kelurahan Malino", jarak: 3.2, tipeUnit: "21/60", hargaMin: 185000000, hargaMax: 220000000, totalUnit: 48, unitTerjual: 40, progress: 85, kelebihan: "Subsidi FLPP, harga terjangkau" },
    ],
  ];
  for (const comps of competitorsByMarket) {
    for (const c of comps) {
      await tryPost("/marketing/competitors", c, `Kompetitor ${c.namaKompetitor}`);
    }
  }
  log(`${competitorsByMarket.flat().length} kompetitor market`);

  // ════════════════════════════════════════════════════════════
  section("G. PERENCANAAN - PRODUK & KPP & SDM & MILESTONES");
  // ════════════════════════════════════════════════════════════

  // Planning Product
  const productData = [
    { projectId: 1, houseType: "Tipe 36/72", buildingArea: 36, kavlingArea: 72, sellingPrice: 315000000, unitCount: 33, targetSegment: "PNS, Guru, Karyawan Swasta", competitorPrice: 290000000 },
    { projectId: 1, houseType: "Tipe 45/90", buildingArea: 45, kavlingArea: 90, sellingPrice: 395000000, unitCount: 17, targetSegment: "PNS Senior, Wiraswasta, TNI/Polri", competitorPrice: 380000000 },
    { projectId: 2, houseType: "Tipe 45/90", buildingArea: 45, kavlingArea: 90, sellingPrice: 415000000, unitCount: 27, targetSegment: "PNS, Dokter, Karyawan BUMN", competitorPrice: 390000000 },
    { projectId: 2, houseType: "Tipe 54/108", buildingArea: 54, kavlingArea: 108, sellingPrice: 495000000, unitCount: 9, targetSegment: "Pengusaha, Dokter Spesialis", competitorPrice: 470000000 },
    { projectId: 3, houseType: "Tipe 36/60", buildingArea: 36, kavlingArea: 60, sellingPrice: 285000000, unitCount: 24, targetSegment: "MBR, Honorer, Karyawan Swasta", competitorPrice: 260000000 },
  ];
  for (const pd of productData) {
    await tryPost("/planning/product", pd, `Produk ${pd.houseType}`);
  }
  log(`${productData.length} planning product`);

  // Planning KPP (bank financing)
  const kppData = [
    { projectId: 1, bankName: "BTN Syariah", approvedAmount: 5000000000, disbDate1: "2024-03-01", disbDate2: "2024-09-01", disbDate3: "2025-03-01", interestRate: 5.0, tenureMonths: 180, adminFee: 3500000 },
    { projectId: 1, bankName: "BRI", approvedAmount: 3000000000, disbDate1: "2024-04-01", disbDate2: "2024-10-01", interestRate: 8.75, tenureMonths: 180, adminFee: 4000000 },
    { projectId: 2, bankName: "BTN", approvedAmount: 6000000000, disbDate1: "2024-08-01", disbDate2: "2025-02-01", disbDate3: "2025-08-01", interestRate: 5.0, tenureMonths: 180, adminFee: 3500000 },
    { projectId: 2, bankName: "BSI", approvedAmount: 2500000000, disbDate1: "2024-09-01", disbDate2: "2025-03-01", interestRate: 6.5, tenureMonths: 180, adminFee: 3000000 },
    { projectId: 3, bankName: "BTN", approvedAmount: 3500000000, disbDate1: "2025-06-01", interestRate: 5.0, tenureMonths: 180, adminFee: 3500000 },
  ];
  for (const k of kppData) {
    await tryPost("/planning/kpp", k, `KPP ${k.bankName} P${k.projectId}`);
  }
  log(`${kppData.length} planning KPP`);

  // Planning SDM
  for (const proj of [p1, p2, p3]) {
    const workers = proj.totalUnit * 3;
    const supervisors = Math.ceil(proj.totalUnit / 10);
    const siteManagers = Math.ceil(proj.totalUnit / 20);
    await tryPost("/planning/sdm", { projectId: proj.id, siteManagers, supervisors, workers, workersPerUnit: 3, unitsPerManager: 20 }, `SDM P${proj.id}`);
  }
  log("3 planning SDM");

  // Planning Milestones — per project
  const milestonesByProject = [
    // P1 BUILD — sudah di BUILD stage, milestones kebanyakan selesai
    [
      { projectId: 1, phase: "LAND", taskName: "Akuisisi Lahan Blok A", targetDate: "2023-06-30", actualDate: "2023-06-15", status: "selesai", progressPct: 100, notes: "SHM 12 bidang selesai balik nama" },
      { projectId: 1, phase: "LAND", taskName: "Akuisisi Lahan Blok B", targetDate: "2023-09-30", actualDate: "2023-09-20", status: "selesai", progressPct: 100, notes: "Proses balik nama selesai" },
      { projectId: 1, phase: "PLAN", taskName: "Studi Kelayakan & Feasibility", targetDate: "2023-08-31", actualDate: "2023-08-25", status: "selesai", progressPct: 100, notes: "ROI 38.5%, approved" },
      { projectId: 1, phase: "PLAN", taskName: "DED Arsitektur & Struktur", targetDate: "2023-10-31", actualDate: "2023-10-28", status: "selesai", progressPct: 100, notes: "50 unit Type 36/72 & 45/90" },
      { projectId: 1, phase: "LEGAL", taskName: "Pengurusan PKKPR", targetDate: "2023-11-30", actualDate: "2023-11-15", status: "selesai", progressPct: 100, notes: "KKPR No.001/KKPR/BTG/2023" },
      { projectId: 1, phase: "LEGAL", taskName: "Pengurusan PBG", targetDate: "2024-02-28", actualDate: null, status: "dalam_proses", progressPct: 65, notes: "Proses SIMBG, target terbit 2 bulan" },
      { projectId: 1, phase: "BUILD", taskName: "Pematangan Lahan & Cut Fill", targetDate: "2024-02-28", actualDate: "2024-02-20", status: "selesai", progressPct: 100, notes: "Timbunan selesai, kompaksi 95%" },
      { projectId: 1, phase: "BUILD", taskName: "Pembangunan Infrastruktur Jalan", targetDate: "2024-04-30", actualDate: "2024-04-25", status: "selesai", progressPct: 100, notes: "Jalan cor 6m lebar, paving blok selesai" },
      { projectId: 1, phase: "BUILD", taskName: "Pembangunan Unit Blok A (20 unit)", targetDate: "2024-12-31", actualDate: "2024-12-20", status: "selesai", progressPct: 100, notes: "20 unit selesai 100%" },
      { projectId: 1, phase: "BUILD", taskName: "Pembangunan Unit Blok B (18 unit)", targetDate: "2025-03-31", actualDate: "2025-03-28", status: "selesai", progressPct: 100, notes: "18 unit selesai, siap serah terima" },
      { projectId: 1, phase: "BUILD", taskName: "Pembangunan Unit Blok C (12 unit)", targetDate: "2025-06-30", actualDate: null, status: "dalam_proses", progressPct: 72, notes: "8 unit selesai, 4 unit masih dalam proses" },
      { projectId: 1, phase: "SELL", taskName: "Launching & Marketing Digital", targetDate: "2024-03-31", actualDate: "2024-03-15", status: "selesai", progressPct: 100, notes: "Soft launch, 25 leads dalam 2 minggu" },
      { projectId: 1, phase: "SELL", taskName: "Target 50 Unit Terjual", targetDate: "2025-06-30", actualDate: null, status: "dalam_proses", progressPct: 90, notes: "45/50 unit sudah booking/akad/serah terima" },
    ],
    // P2 SELL — sedang di SELL stage
    [
      { projectId: 2, phase: "LAND", taskName: "Akuisisi Lahan Caile", targetDate: "2024-03-31", actualDate: "2024-03-20", status: "selesai", progressPct: 100 },
      { projectId: 2, phase: "PLAN", taskName: "Feasibility Study", targetDate: "2024-04-30", actualDate: "2024-04-28", status: "selesai", progressPct: 100, notes: "ROI 32%, margin 24.5%, approved" },
      { projectId: 2, phase: "PLAN", taskName: "DED Arsitektur 36 unit", targetDate: "2024-05-31", actualDate: "2024-05-28", status: "selesai", progressPct: 100 },
      { projectId: 2, phase: "LEGAL", taskName: "Pengurusan PKKPR Bulukumba", targetDate: "2024-06-30", actualDate: "2024-06-25", status: "selesai", progressPct: 100 },
      { projectId: 2, phase: "LEGAL", taskName: "Pengurusan SPPL", targetDate: "2024-08-31", actualDate: null, status: "dalam_proses", progressPct: 70, notes: "Pending verifikasi Dinas LH" },
      { projectId: 2, phase: "LEGAL", taskName: "Pengurusan PBG", targetDate: "2024-11-30", actualDate: null, status: "belum_mulai", progressPct: 0, notes: "Menunggu SPPL selesai" },
      { projectId: 2, phase: "BUILD", taskName: "Pematangan Lahan", targetDate: "2024-08-31", actualDate: "2024-08-20", status: "selesai", progressPct: 100 },
      { projectId: 2, phase: "BUILD", taskName: "Infrastruktur & Utilitas", targetDate: "2024-10-31", actualDate: "2024-10-28", status: "selesai", progressPct: 100 },
      { projectId: 2, phase: "BUILD", taskName: "Konstruksi Blok A (18 unit)", targetDate: "2026-03-31", actualDate: null, status: "dalam_proses", progressPct: 55, notes: "10 unit selesai, 8 dalam proses" },
      { projectId: 2, phase: "BUILD", taskName: "Konstruksi Blok B (18 unit)", targetDate: "2026-09-30", actualDate: null, status: "belum_mulai", progressPct: 5, notes: "Pondasi mulai, target selesai Q3 2026" },
      { projectId: 2, phase: "SELL", taskName: "Launching Resmi Griya Bulukumba Asri", targetDate: "2024-09-01", actualDate: "2024-09-01", status: "selesai", progressPct: 100 },
      { projectId: 2, phase: "SELL", taskName: "Target 36 Unit Terjual", targetDate: "2026-12-31", actualDate: null, status: "dalam_proses", progressPct: 42, notes: "15/36 unit sudah booking/akad" },
    ],
    // P3 PLAN — baru di PLAN stage
    [
      { projectId: 3, phase: "LAND", taskName: "Survey Lokasi Bukit Malino", targetDate: "2025-03-31", actualDate: "2025-03-20", status: "selesai", progressPct: 100 },
      { projectId: 3, phase: "LAND", taskName: "Negosiasi & Akuisisi Lahan", targetDate: "2025-09-30", actualDate: null, status: "dalam_proses", progressPct: 60, notes: "Negosiasi harga sedang berlangsung" },
      { projectId: 3, phase: "PLAN", taskName: "Studi Kelayakan Pasar", targetDate: "2025-06-30", actualDate: "2025-06-28", status: "selesai", progressPct: 100, notes: "Potensi MBR kuat, ROI 40.2%" },
      { projectId: 3, phase: "PLAN", taskName: "DED Arsitektur 24 unit", targetDate: "2025-10-31", actualDate: null, status: "dalam_proses", progressPct: 30, notes: "Sketsa awal selesai, detail menyusul" },
      { projectId: 3, phase: "LEGAL", taskName: "Cek SHM & Legal Lahan", targetDate: "2025-08-31", actualDate: null, status: "dalam_proses", progressPct: 50, notes: "BPN sedang periksa 4 SHM" },
      { projectId: 3, phase: "LEGAL", taskName: "Pengurusan PKKPR Gowa", targetDate: "2025-12-31", actualDate: null, status: "belum_mulai", progressPct: 0, notes: "Menunggu SHM clear" },
    ],
  ];
  let msCount = 0;
  for (const milestones of milestonesByProject) {
    for (const ms of milestones) {
      const body = { ...ms };
      if (!body.actualDate) delete body.actualDate;
      await tryPost("/planning/milestones", body, `Milestone ${ms.taskName}`);
      msCount++;
    }
  }
  log(`${msCount} milestones`);

  // Planning Landbank
  const landbankData = [
    { projectId: null, name: "Lahan Jeneponto Kota", status: "land_bank", landArea: 8500, availableUnits: 60, acquisitionPrice: 2720000000, targetStartDate: "2026-01-01", notes: "Survey selesai, owners tunggal, SHM siap. ROI estimasi 42%" },
    { projectId: null, name: "Kawasan Takalar Barat", status: "land_bank", landArea: 12000, availableUnits: 85, acquisitionPrice: 3360000000, targetStartDate: "2026-07-01", notes: "Dekat kawasan industri, demand MBR tinggi. Perlu studi lebih lanjut." },
    { projectId: null, name: "Lahan Sinjai Utara", status: "identifikasi", landArea: 6000, availableUnits: 40, acquisitionPrice: 2100000000, targetStartDate: "2027-01-01", notes: "Masih tahap identifikasi, koordinasi dengan broker lokal" },
    { projectId: null, name: "Lahan Bone Kota Timur", status: "identifikasi", landArea: 7200, availableUnits: 50, acquisitionPrice: 2952000000, targetStartDate: "2027-06-01", notes: "Lokasi strategis pusat kota Bone, potensi tipe menengah" },
  ];
  for (const lb of landbankData) {
    const body = { ...lb };
    if (!body.projectId) delete body.projectId;
    await tryPost("/planning/landbank", body, `Landbank ${lb.name}`);
  }
  log(`${landbankData.length} landbank entries`);

  // Planning Expansion scenarios
  const expansionData = [
    { scenarioName: "Ekspansi Agresif 3 Proyek Serentak", description: "Akuisisi 3 lahan sekaligus: Jeneponto, Takalar, Sinjai. ROI gabungan 40%+. Butuh tambahan modal Rp15M.", estimatedRoi: 40, riskScore: 75, cashflowImpact: "Negatif 18 bulan, breakeven Q2 2027", sdmScore: 55, sopScore: 60, dashboardScore: 80 },
    { scenarioName: "Ekspansi Terukur 1 Proyek Prioritas", description: "Akuisisi Jeneponto saja, selesaikan Bulukumba dulu. ROI 42%. Modal dari cashflow internal P1+P2.", estimatedRoi: 42, riskScore: 35, cashflowImpact: "Netral, pendanaan mandiri dari cashflow P1 & P2", sdmScore: 85, sopScore: 80, dashboardScore: 90 },
    { scenarioName: "Hold & Optimize", description: "Fokus selesaikan P1 dan P2, optimasi SDM & SOP sebelum ekspansi. Target kesiapan Q4 2026.", estimatedRoi: 38, riskScore: 15, cashflowImpact: "Positif, kas sangat sehat Q2 2026", sdmScore: 95, sopScore: 90, dashboardScore: 92 },
  ];
  for (const exp of expansionData) {
    await tryPost("/planning/expansion", exp, `Ekspansi: ${exp.scenarioName}`);
  }
  log(`${expansionData.length} expansion scenarios`);

  // ════════════════════════════════════════════════════════════
  section("H. LEGAL EXTENDED — PERMITS, LAND STAGES, SHM, ISSUES");
  // ════════════════════════════════════════════════════════════

  // Permit Documents
  const permitDocs = [
    // P1 BUILD — advanced
    { projectId: 1, permitGroup: "perizinan_dasar", permitName: "PKKPR", institution: "Kementerian ATR/BPN", status: "selesai", submissionDate: "2023-09-01", targetDate: "2023-11-30", actualDate: "2023-11-15", documentNumber: "001/KKPR/BTG/2023", pic: "UMMU", notes: "KKPR berlaku 3 tahun" },
    { projectId: 1, permitGroup: "perizinan_dasar", permitName: "SPPL", institution: "Dinas LH Bantaeng", status: "selesai", submissionDate: "2023-10-01", targetDate: "2023-12-31", actualDate: "2023-12-10", documentNumber: "120/SPPL/LH-BTG/2023", pic: "HIKMAH", notes: "SPPL valid 3 tahun s/d 2026" },
    { projectId: 1, permitGroup: "perizinan_bangunan", permitName: "PBG", institution: "Dinas Pekerjaan Umum Bantaeng", status: "dalam_proses", submissionDate: "2024-01-15", targetDate: "2024-03-31", pic: "EKKY", notes: "Proses SIMBG, dokumen lengkap sudah diterima" },
    { projectId: 1, permitGroup: "perizinan_bangunan", permitName: "Rencana Tapak", institution: "Dinas PUPR Bantaeng", status: "selesai", submissionDate: "2023-11-01", actualDate: "2023-12-15", documentNumber: "RT/55/PUPR-BTG/2023", pic: "EKKY" },
    { projectId: 1, permitGroup: "izin_teknis", permitName: "Izin Penyambungan Listrik PLN", institution: "PLN UP3 Bantaeng", status: "selesai", submissionDate: "2024-03-01", actualDate: "2024-04-01", documentNumber: "PLN/IPL/BTG/0424/001", pic: "ANTI" },
    { projectId: 1, permitGroup: "izin_teknis", permitName: "Izin Penyambungan Air PDAM", institution: "PDAM Bantaeng", status: "selesai", submissionDate: "2024-03-01", actualDate: "2024-04-15", documentNumber: "PDAM/BTG/0424/055", pic: "ANTI" },
    // P2 SELL — sebagian berjalan
    { projectId: 2, permitGroup: "perizinan_dasar", permitName: "PKKPR", institution: "Kementerian ATR/BPN", status: "selesai", submissionDate: "2024-04-01", targetDate: "2024-06-30", actualDate: "2024-06-25", documentNumber: "002/KKPR/BLK/2024", pic: "UMMU" },
    { projectId: 2, permitGroup: "perizinan_dasar", permitName: "SPPL", institution: "Dinas LH Bulukumba", status: "dalam_proses", submissionDate: "2024-07-01", targetDate: "2024-09-30", pic: "HIKMAH", notes: "Pending verifikasi lapangan" },
    { projectId: 2, permitGroup: "perizinan_bangunan", permitName: "PBG", institution: "Dinas PUPR Bulukumba", status: "belum_diajukan", targetDate: "2024-12-31", pic: "EKKY", notes: "Menunggu SPPL terbit" },
    { projectId: 2, permitGroup: "izin_teknis", permitName: "Izin Lingkungan", institution: "DLH Bulukumba", status: "dalam_proses", submissionDate: "2024-08-01", targetDate: "2024-10-31", pic: "HIKMAH" },
    // P3 PLAN — baru mulai
    { projectId: 3, permitGroup: "perizinan_dasar", permitName: "PKKPR", institution: "Kementerian ATR/BPN", status: "belum_diajukan", targetDate: "2025-12-31", pic: "TAHIR", notes: "Menunggu SHM clear & akuisisi selesai" },
    { projectId: 3, permitGroup: "perizinan_dasar", permitName: "SPPL", institution: "Dinas LH Gowa", status: "belum_diajukan", targetDate: "2026-02-28", pic: "HIKMAH" },
  ];
  for (const pd of permitDocs) {
    await tryPost("/legal/permits", pd, `Permit ${pd.permitName} P${pd.projectId}`);
  }
  log(`${permitDocs.length} permit documents`);

  // Land Stages
  const landStages = [];
  const landStageData = [
    // P1 — T1 T2 selesai, T3 proses
    { projectId: 1, stageCode: "T1", stageIdentity: "Dg. Ari (8 bidang)", landArea: 4200, targetKavlings: 28, certificateNumber: "SHM-BPN-BTG/001-008/2022", stageStatus: "selesai", notes: "8 SHM selesai balik nama atas nama PT Satara" },
    { projectId: 1, stageCode: "T2", stageIdentity: "H. Ani (4 bidang)", landArea: 3800, targetKavlings: 22, certificateNumber: "SHM-BPN-BTG/009-012/2023", stageStatus: "selesai", notes: "4 SHM balik nama selesai Okt 2023" },
    { projectId: 1, stageCode: "T3", stageIdentity: "Pak Anas (3 bidang)", landArea: 3000, targetKavlings: 0, stageStatus: "pemecahan_shm", notes: "Proses pecah SHM 3 bidang menjadi 24 kavling" },
    // P2 — T1 T2 proses
    { projectId: 2, stageCode: "T1", stageIdentity: "H. Mappatoba (5 bidang)", landArea: 3200, targetKavlings: 20, stageStatus: "ajb", notes: "AJB selesai, proses balik nama di BPN Bulukumba" },
    { projectId: 2, stageCode: "T2", stageIdentity: "Dg. Nassa (4 bidang)", landArea: 2300, targetKavlings: 16, stageStatus: "negosiasi", notes: "Negosiasi harga masih berlangsung" },
    // P3 — T1 masih survey
    { projectId: 3, stageCode: "T1", stageIdentity: "Keluarga Kamaruddin (6 bidang)", landArea: 4200, targetKavlings: 24, stageStatus: "negosiasi", notes: "Negosiasi sedang berjalan, pemilik 3 ahli waris" },
  ];
  for (const ls of landStageData) {
    const r = await tryPost("/legal/land-stages", ls, `Land stage ${ls.stageCode} P${ls.projectId}`);
    if (r) { landStages.push(r); log(`  Land stage: ${r.stageCode} (${r.stageStatus})`); }
  }

  // SHM Splits
  const shmSplitData = [
    { projectId: 1, landStageId: landStages[0]?.id, stageCode: "T1", targetSplit: 28, realizedSplit: 28, lastUpdated: "2023-10-01", pic: "NIA", notes: "28 SHM kavling selesai dipecah" },
    { projectId: 1, landStageId: landStages[1]?.id, stageCode: "T2", targetSplit: 22, realizedSplit: 22, lastUpdated: "2024-01-15", pic: "NIA", notes: "22 SHM kavling selesai" },
    { projectId: 1, landStageId: landStages[2]?.id, stageCode: "T3", targetSplit: 24, realizedSplit: 0, pic: "NIA", notes: "Proses pemecahan, target selesai Q3 2024" },
    { projectId: 2, landStageId: landStages[3]?.id, stageCode: "T1", targetSplit: 20, realizedSplit: 0, pic: "TAHIR", notes: "Menunggu balik nama selesai" },
    { projectId: 3, stageCode: "T1", targetSplit: 24, realizedSplit: 0, pic: "UMMU", notes: "Belum mulai, menunggu akuisisi selesai" },
  ];
  for (const ss of shmSplitData) {
    const body = { ...ss };
    if (!body.landStageId) delete body.landStageId;
    await tryPost("/legal/shm-splits", body, `SHM split ${ss.stageCode} P${ss.projectId}`);
  }
  log(`${shmSplitData.length} SHM split records`);

  // Legal Issues
  const legalIssues = [
    { projectId: 1, title: "Klaim Kepemilikan Batas Utara Blok C", objectDescription: "Batas lahan Blok C (±120m) yang diklaim tetangga Dg. Rahman", category: "sengketa_batas", riskLevel: "medium", description: "Dg. Rahman mengklaim 120m² area perbatasan sebagai miliknya berdasarkan surat girik lama. Sudah ada mediasi 2x.", status: "mediasi", pic: "UMMU", startDate: "2024-11-01", targetResolution: "2025-03-31" },
    { projectId: 1, title: "Overlapping PBB Unit C07 & C08", objectDescription: "PBB unit C07 dan C08 masih tergabung dalam 1 SPPT", category: "masalah_shm", riskLevel: "low", description: "Saat pisah PBB terjadi error di sistem BPHTB, 2 unit masih terdaftar dalam 1 SPPT.", status: "aktif", pic: "DINDA", startDate: "2025-01-15", targetResolution: "2025-04-30" },
    { projectId: 2, title: "Sertifikat T1 Belum Selesai Balik Nama", objectDescription: "5 SHM dari T1 yang masih atas nama pemilik lama H. Mappatoba", category: "masalah_shm", riskLevel: "high", description: "Proses balik nama terhambat karena salah satu ahli waris tidak bisa hadir. Perlu surat kuasa autentik.", status: "aktif", pic: "TAHIR", startDate: "2024-08-01", targetResolution: "2025-06-30" },
    { projectId: 2, title: "Izin Lingkungan Terhambat Keluhan Warga", objectDescription: "SPPL Bulukumba ditolak sementara karena keluhan warga RT 03", category: "perizinan", riskLevel: "medium", description: "Warga RT 03 keberatan soal potensi banjir. Perlu audit drainase + sosialisasi ulang.", status: "mediasi", pic: "HIKMAH", startDate: "2024-09-15", targetResolution: "2025-02-28" },
    { projectId: 3, title: "Salah Satu Ahli Waris Tidak Setuju Harga", objectDescription: "1 dari 3 ahli waris keluarga Kamaruddin tidak sepakat harga Rp380rb/m2", category: "klaim_kepemilikan", riskLevel: "medium", description: "2 dari 3 ahli waris setuju, 1 orang minta Rp420rb/m2. Negosiasi masih berlangsung.", status: "aktif", pic: "UMMU", startDate: "2025-05-01", targetResolution: "2025-10-31" },
  ];
  for (const li of legalIssues) {
    await tryPost("/legal/issues", li, `Legal issue: ${li.title}`);
  }
  log(`${legalIssues.length} legal issues`);

  // ════════════════════════════════════════════════════════════
  section("I. MARKETING EXTENDED — BRANDING KPI & ABSORPSI");
  // ════════════════════════════════════════════════════════════

  const brandingKpiData = [
    { bulan: "Mar 2026", platform: "instagram", followers: 8250, reach: 42000, impresi: 128000, engagement: 3200, postCount: 18, targetFollowers: 8000, targetReach: 40000, targetEngagement: 3000, brandingScore: 85 },
    { bulan: "Apr 2026", platform: "instagram", followers: 9100, reach: 48500, impresi: 145000, engagement: 3750, postCount: 20, targetFollowers: 9000, targetReach: 45000, targetEngagement: 3500, brandingScore: 88 },
    { bulan: "Mei 2026", platform: "instagram", followers: 10200, reach: 55000, impresi: 168000, engagement: 4100, postCount: 22, targetFollowers: 10000, targetReach: 52000, targetEngagement: 4000, brandingScore: 91 },
    { bulan: "Mar 2026", platform: "facebook", followers: 5200, reach: 28000, impresi: 85000, engagement: 1800, postCount: 12, targetFollowers: 5000, targetReach: 25000, targetEngagement: 1600, brandingScore: 82 },
    { bulan: "Apr 2026", platform: "facebook", followers: 5600, reach: 31000, impresi: 94000, engagement: 2050, postCount: 14, targetFollowers: 5500, targetReach: 30000, targetEngagement: 2000, brandingScore: 84 },
    { bulan: "Mei 2026", platform: "facebook", followers: 6100, reach: 36000, impresi: 108000, engagement: 2380, postCount: 15, targetFollowers: 6000, targetReach: 35000, targetEngagement: 2300, brandingScore: 87 },
    { bulan: "Mar 2026", platform: "tiktok", followers: 3200, reach: 85000, impresi: 220000, engagement: 6500, postCount: 8, targetFollowers: 3000, targetReach: 80000, targetEngagement: 6000, brandingScore: 86 },
    { bulan: "Apr 2026", platform: "tiktok", followers: 4100, reach: 112000, impresi: 285000, engagement: 8200, postCount: 10, targetFollowers: 4000, targetReach: 100000, targetEngagement: 7500, brandingScore: 89 },
    { bulan: "Mei 2026", platform: "tiktok", followers: 5300, reach: 145000, impresi: 368000, engagement: 11000, postCount: 12, targetFollowers: 5000, targetReach: 140000, targetEngagement: 10000, brandingScore: 92 },
  ];
  for (const bk of brandingKpiData) {
    await tryPost("/marketing/branding-kpi", bk, `Branding ${bk.platform} ${bk.bulan}`);
  }
  log(`${brandingKpiData.length} branding KPI records`);

  // Marketing Absorpsi
  const absorpsiData = [
    { projectId: 1, tahap: "Tahap 1 (Blok A)", totalUnit: 20, unitTerjual: 20, tanggalLaunching: "2024-03-15", targetBulan: 6 },
    { projectId: 1, tahap: "Tahap 2 (Blok B)", totalUnit: 18, unitTerjual: 18, tanggalLaunching: "2024-08-01", targetBulan: 8 },
    { projectId: 1, tahap: "Tahap 3 (Blok C)", totalUnit: 12, unitTerjual: 7, tanggalLaunching: "2025-01-01", targetBulan: 6 },
    { projectId: 2, tahap: "Tahap 1 (Blok A)", totalUnit: 18, unitTerjual: 12, tanggalLaunching: "2024-09-01", targetBulan: 9 },
    { projectId: 2, tahap: "Tahap 2 (Blok B)", totalUnit: 18, unitTerjual: 3, tanggalLaunching: "2025-03-01", targetBulan: 12 },
    { projectId: 3, tahap: "Tahap 1 (Soft Launch)", totalUnit: 24, unitTerjual: 0, tanggalLaunching: "2026-06-01", targetBulan: 12 },
  ];
  for (const ab of absorpsiData) {
    await tryPost("/marketing/absorption", ab, `Absorpsi ${ab.tahap} P${ab.projectId}`);
  }
  log(`${absorpsiData.length} data absorpsi`);

  // ════════════════════════════════════════════════════════════
  section("J. ADMINISTRASI KPR EXTENDED — BANK SUB, OTS, SP3K, AKAD, HT");
  // ════════════════════════════════════════════════════════════

  // Monthly Targets
  const monthlyTargets = [];
  for (let m = 1; m <= 6; m++) {
    monthlyTargets.push({ projectId: 1, year: 2026, month: m, targetAkad: m <= 3 ? 4 : 3, targetBerkas: m <= 3 ? 6 : 5 });
    monthlyTargets.push({ projectId: 2, year: 2026, month: m, targetAkad: 3, targetBerkas: 5 });
  }
  for (const mt of monthlyTargets) {
    await tryPost("/administrasi/monthly-targets", mt, `Target ${mt.year}/${mt.month} P${mt.projectId}`);
  }
  log(`${monthlyTargets.length} monthly targets`);

  // Bank Submissions — for customers at SETOR_BANK / higher
  const submissionsData = [
    { customerId: custP1[4]?.id, bank: "Mandiri", submittedDate: "2024-12-05", bankOfficer: "Andi Hasrul", registrationNumber: "BTN/APP/2412/0445", notes: "Berkas lengkap diserahkan" },
    { customerId: custP1[5]?.id, bank: "BNI", submittedDate: "2025-01-10", bankOfficer: "Rini Sari", registrationNumber: "BNI/APP/2501/0112", notes: "BI checking dalam proses" },
    { customerId: custP2[3]?.id, bank: "BTN", submittedDate: "2026-06-05", bankOfficer: "Ahmad Fauzi", registrationNumber: "BTN/APP/2606/0089", notes: "Berkas lengkap, menunggu OTS" },
  ];
  for (const sub of submissionsData) {
    if (sub.customerId) await tryPost("/administrasi/bank-submissions", sub, `Bank submission c${sub.customerId}`);
  }
  log(`${submissionsData.filter(s => s.customerId).length} bank submissions`);

  // OTS Records
  const otsData = [
    { customerId: custP1[3]?.id, bank: "BTN", scheduledDate: "2024-11-20", surveyorName: "Hendra Putra (BTN Bantaeng)", actualDate: "2024-11-20", status: "completed", result: "layak", notes: "Nilai properti Rp320jt, plafon Rp267jt disetujui" },
    { customerId: custP2[2]?.id, bank: "Mandiri", scheduledDate: "2026-06-10", surveyorName: "Budi Santoso (Mandiri Bulukumba)", status: "scheduled", notes: "OTS terjadwal, surveyor sudah konfirmasi" },
  ];
  for (const ots of otsData) {
    if (ots.customerId) await tryPost("/administrasi/ots", ots, `OTS c${ots.customerId}`);
  }
  log(`${otsData.filter(o => o.customerId).length} OTS records`);

  // SP3K Records
  const sp3kData = [
    { customerId: custP1[2]?.id, bank: "BSI", sp3kDate: "2024-12-20", sp3kNumber: "BSI/SP3K/2412/0078", approvedAmount: 335750000, plafonAmount: 335750000, expiryDate: "2025-03-20", status: "aktif", notes: "SP3K aktif, akad dijadwalkan Januari 2025" },
    { customerId: custP2[1]?.id, bank: "BRI", sp3kDate: "2026-06-01", sp3kNumber: "BRI/SP3K/2606/0045", approvedAmount: 420750000, plafonAmount: 420750000, expiryDate: "2026-09-01", status: "aktif", notes: "SP3K diterima, proses akad" },
  ];
  for (const sp3k of sp3kData) {
    if (sp3k.customerId) await tryPost("/administrasi/sp3k", sp3k, `SP3K c${sp3k.customerId}`);
  }
  log(`${sp3kData.filter(s => s.customerId).length} SP3K records`);

  // Akad Records
  const akadData = [
    { customerId: custP1[1]?.id, bank: "BRI", akadDate: "2025-02-14", akadNumber: "AJB/BRI/0225/BTG/0042", notary: "Notaris Hj. Rasidah, S.H., M.Kn.", akadAmount: 267750000, estimatedHtDate: "2025-04-14", status: "selesai", notes: "Akad berjalan lancar" },
    { customerId: custP1[8]?.id, bank: "BTN", akadDate: "2024-12-15", akadNumber: "AJB/BTN/1224/BTG/0038", notary: "Notaris H. Amiruddin, S.H.", akadAmount: 335750000, estimatedHtDate: "2025-02-15", status: "selesai", notes: "Akad selesai, HT dalam proses" },
    { customerId: custP2[0]?.id, bank: "BTN", akadDate: "2026-06-05", akadNumber: "AJB/BTN/0626/BLK/0012", notary: "Notaris Dra. Yuliani, S.H., M.Kn.", akadAmount: 352750000, estimatedHtDate: "2026-08-05", status: "selesai", notes: "Akad selesai, jadwal HT Agustus 2026" },
  ];
  for (const ak of akadData) {
    if (ak.customerId) await tryPost("/administrasi/akad", ak, `Akad c${ak.customerId}`);
  }
  log(`${akadData.filter(a => a.customerId).length} akad records`);

  // HT Records
  const htData = [
    { customerId: custP1[0]?.id, bank: "BTN", htDate: "2025-03-15", htAmount: 267750000, accountNumber: "BTN-019-0124-00001", notes: "HT cair, dana masuk rekening operasional PT Satara" },
    { customerId: custP1[7]?.id, bank: "CASH", htDate: "2024-10-20", htAmount: 315000000, notes: "Pembayaran CASH penuh, langsung transfer rekening" },
  ];
  for (const ht of htData) {
    if (ht.customerId) await tryPost("/administrasi/ht", ht, `HT c${ht.customerId}`);
  }
  log(`${htData.filter(h => h.customerId).length} HT records`);

  // Customer Complaints
  const complaintsData = [
    { projectId: 1, unitBlock: `${units1[8].blok}${units1[8].nomor}`, customerId: custP1[0]?.id, complaint: "Retak rambut dinding kamar mandi masih terlihat setelah perbaikan", category: "konstruksi", severity: "ringan", pic: "ARYA", deadline: "2025-05-30", status: "selesai", completedDate: "2025-05-28", notes: "Dicat ulang, customer puas" },
    { projectId: 1, unitBlock: `${units1[9].blok}${units1[9].nomor}`, complaint: "Pompa air sering mati otomatis, tekanan air kurang", category: "plumbing", severity: "sedang", pic: "ANTI", deadline: "2025-06-15", status: "dalam_proses", notes: "Menunggu penggantian pressure switch pompa" },
    { projectId: 1, unitBlock: `${units1[10].blok}${units1[10].nomor}`, complaint: "Atap bocor saat hujan deras di area carport", category: "konstruksi", severity: "sedang", pic: "ARYA", deadline: "2025-04-30", status: "selesai", completedDate: "2025-04-28", notes: "Flashing carport diperbaiki & waterproofing diulang" },
    { projectId: 2, unitBlock: `${units2[0].blok}${units2[0].nomor}`, complaint: "Pintu kamar utama terasa kasar saat dibuka-tutup", category: "kusen_pintu", severity: "ringan", pic: "TAHIR", deadline: "2026-07-15", status: "belum", notes: "Terjadwal kunjungan teknisi minggu depan" },
  ];
  for (const c of complaintsData) {
    const body = { ...c };
    if (!body.customerId) delete body.customerId;
    await tryPost("/administrasi/complaints", body, `Complaint P${c.projectId}`);
  }
  log(`${complaintsData.length} customer complaints`);

  // ════════════════════════════════════════════════════════════
  section("K. PRODUKSI EXTENDED — MATERIAL MASTER, IN/OUT, FASUM, QC");
  // ════════════════════════════════════════════════════════════

  // Prod Material Master (standardized)
  const materialMasterData = [
    { name: "Semen Portland 40kg", category: "Struktur", satuan: "zak", standardPerUnit: 20, unitPrice: 62000, minimumStock: 200 },
    { name: "Pasir Beton", category: "Struktur", satuan: "m3", standardPerUnit: 1.5, unitPrice: 250000, minimumStock: 30 },
    { name: "Batu Gunung", category: "Struktur", satuan: "m3", standardPerUnit: 1.2, unitPrice: 220000, minimumStock: 25 },
    { name: "Besi Beton D10", category: "Struktur", satuan: "batang", standardPerUnit: 12, unitPrice: 78000, minimumStock: 100 },
    { name: "Besi Beton D8", category: "Struktur", satuan: "batang", standardPerUnit: 8, unitPrice: 52000, minimumStock: 80 },
    { name: "Bata Merah", category: "Struktur", satuan: "buah", standardPerUnit: 600, unitPrice: 800, minimumStock: 5000 },
    { name: "Rangka Baja Ringan C75", category: "Atap", satuan: "batang", standardPerUnit: 8, unitPrice: 95000, minimumStock: 50 },
    { name: "Spandek 0.3mm", category: "Atap", satuan: "lembar", standardPerUnit: 4, unitPrice: 145000, minimumStock: 40 },
    { name: "Keramik Lantai 40x40", category: "Finishing", satuan: "dos", standardPerUnit: 7, unitPrice: 85000, minimumStock: 60 },
    { name: "Keramik Dinding KM", category: "Finishing", satuan: "dos", standardPerUnit: 2, unitPrice: 78000, minimumStock: 30 },
    { name: "Cat Interior 5L", category: "Finishing", satuan: "kaleng", standardPerUnit: 2.5, unitPrice: 165000, minimumStock: 40 },
    { name: "Cat Eksterior 5L", category: "Finishing", satuan: "kaleng", standardPerUnit: 1.5, unitPrice: 195000, minimumStock: 25 },
    { name: "Gypsum Board 9mm", category: "Finishing", satuan: "lembar", standardPerUnit: 4, unitPrice: 72000, minimumStock: 50 },
    { name: "Kabel NYM 2x2.5mm", category: "Listrik", satuan: "meter", standardPerUnit: 50, unitPrice: 8500, minimumStock: 500 },
    { name: "MCB 10A", category: "Listrik", satuan: "buah", standardPerUnit: 1, unitPrice: 35000, minimumStock: 15 },
    { name: "Pipa PVC 1/2 inch", category: "Plumbing", satuan: "batang", standardPerUnit: 4, unitPrice: 22000, minimumStock: 50 },
    { name: "Pipa PVC 4 inch", category: "Plumbing", satuan: "batang", standardPerUnit: 2, unitPrice: 65000, minimumStock: 20 },
    { name: "Kloset Jongkok TOTO", category: "Sanitasi", satuan: "buah", standardPerUnit: 1, unitPrice: 450000, minimumStock: 20 },
    { name: "Wastafel ROCA", category: "Sanitasi", satuan: "buah", standardPerUnit: 1, unitPrice: 850000, minimumStock: 15 },
    { name: "Kawat Beton 1kg", category: "Struktur", satuan: "kg", standardPerUnit: 3, unitPrice: 18000, minimumStock: 50 },
  ];
  const createdMasterMaterials = [];
  for (const mm of materialMasterData) {
    const r = await tryPost("/produksi/material/master", mm, `MatMaster: ${mm.name}`);
    if (r) createdMasterMaterials.push(r);
  }
  log(`${createdMasterMaterials.length} material master records`);

  // Material In (penerimaan)
  if (createdMasterMaterials.length > 0) {
    const matInData = [
      { projectId: 1, stageCode: "B_struktur", materialId: createdMasterMaterials[0].id, quantity: 500, supplier: "Toko Sumber Makmur Bantaeng", documentNumber: "DO-SMB/0224/001", notes: "Pengiriman pertama semen Feb 2024", dateIn: "2024-02-15" },
      { projectId: 1, stageCode: "B_struktur", materialId: createdMasterMaterials[3].id, quantity: 200, supplier: "CV. Besi Jaya Makassar", documentNumber: "DO-BJM/0224/012", notes: "Besi D10 batch 1", dateIn: "2024-02-20" },
      { projectId: 1, stageCode: "B_struktur", materialId: createdMasterMaterials[5].id, quantity: 15000, supplier: "Pengrajin Bata Dg. Situru", documentNumber: "DO-BTA/0324/001", notes: "Bata 1000 pcs x 15 angkut", dateIn: "2024-03-10" },
      { projectId: 1, stageCode: "C_atap", materialId: createdMasterMaterials[6].id, quantity: 200, supplier: "CV. Baja Mandiri Sulsel", documentNumber: "DO-BMS/0624/008", notes: "Rangka baja ringan batch 1", dateIn: "2024-06-10" },
      { projectId: 1, stageCode: "C_atap", materialId: createdMasterMaterials[7].id, quantity: 150, supplier: "CV. Baja Mandiri Sulsel", documentNumber: "DO-BMS/0624/009", notes: "Spandek batch 1", dateIn: "2024-06-10" },
      { projectId: 1, stageCode: "D_finishing", materialId: createdMasterMaterials[8].id, quantity: 280, supplier: "Toko Keramik Asia", documentNumber: "DO-TKA/0924/001", notes: "Keramik lantai batch 1", dateIn: "2024-09-05" },
      { projectId: 2, stageCode: "B_struktur", materialId: createdMasterMaterials[0].id, quantity: 300, supplier: "Toko Material Bulukumba", documentNumber: "DO-TMB/0724/001", notes: "Semen untuk pondasi Blok A", dateIn: "2024-07-15" },
      { projectId: 2, stageCode: "B_struktur", materialId: createdMasterMaterials[5].id, quantity: 8000, supplier: "Pengrajin Bata Caile", documentNumber: "DO-BCA/0724/001", notes: "Bata Blok A", dateIn: "2024-07-20" },
    ];
    for (const mi of matInData) {
      await tryPost("/produksi/material/in", mi, `MatIn P${mi.projectId} ${mi.dateIn}`);
    }
    log(`${matInData.length} material in records`);

    // Material Out (pemakaian)
    const matOutData = [
      { projectId: 1, stageCode: "B_struktur", unitId: units1[0].id, materialId: createdMasterMaterials[0].id, quantity: 18, takenBy: "Mandor Hasan", subkonName: "CV. Bangun Setia", dateOut: "2024-02-25", notes: "Semen untuk unit A01" },
      { projectId: 1, stageCode: "B_struktur", unitId: units1[1].id, materialId: createdMasterMaterials[0].id, quantity: 20, takenBy: "Mandor Hasan", subkonName: "CV. Bangun Setia", dateOut: "2024-03-05", notes: "Semen untuk unit A02" },
      { projectId: 1, stageCode: "B_struktur", materialId: createdMasterMaterials[3].id, quantity: 12, takenBy: "Mandor Besi", subkonName: "CV. Bangun Setia", dateOut: "2024-02-28", notes: "Besi D10 untuk sloof A01-A03" },
      { projectId: 1, stageCode: "D_finishing", unitId: units1[0].id, materialId: createdMasterMaterials[8].id, quantity: 7, takenBy: "Tukang Keramik", subkonName: "CV. Finishing Prima", dateOut: "2024-10-01", notes: "Keramik lantai A01" },
      { projectId: 2, stageCode: "B_struktur", unitId: units2[0].id, materialId: createdMasterMaterials[0].id, quantity: 22, takenBy: "Mandor Amir", subkonName: "CV. Kontraktor BLK", dateOut: "2024-07-25", notes: "Semen pondasi A01 BLK" },
    ];
    for (const mo of matOutData) {
      const body = { ...mo };
      if (!body.unitId) delete body.unitId;
      await tryPost("/produksi/material/out", body, `MatOut P${mo.projectId}`);
    }
    log(`${matOutData.length} material out records`);
  }

  // Fasum Progress
  const fasumData = [
    { projectId: 1, stageCode: "T1", fasumType: "Jalan Utama Cor 6m", progressPercent: 100, notes: "Selesai, drainase kiri-kanan terpasang", updatedBy: "ARYA" },
    { projectId: 1, stageCode: "T1", fasumType: "Jalan Blok A & B (Paving)", progressPercent: 100, notes: "Paving blok selesai semua", updatedBy: "ARYA" },
    { projectId: 1, stageCode: "T3", fasumType: "Jalan Blok C (Paving)", progressPercent: 60, notes: "60% selesai, target selesai Juli 2025", updatedBy: "ARYA" },
    { projectId: 1, stageCode: null, fasumType: "Taman & RTH", progressPercent: 80, notes: "Tanaman sudah ditanam, instalasi lampu taman 80%", updatedBy: "ANTI" },
    { projectId: 1, stageCode: null, fasumType: "Drainase Utama", progressPercent: 95, notes: "Hampir selesai, tinggal sambungan Blok C", updatedBy: "ARYA" },
    { projectId: 1, stageCode: null, fasumType: "Musholla", progressPercent: 100, notes: "Musholla selesai, sudah digunakan warga", updatedBy: "ANTI" },
    { projectId: 1, stageCode: null, fasumType: "Gerbang & Pagar Komplek", progressPercent: 100, notes: "Gerbang otomatis + pagar bata keliling", updatedBy: "ARYA" },
    { projectId: 2, stageCode: null, fasumType: "Jalan Utama Cor 6m", progressPercent: 75, notes: "3/4 bagian selesai, target Agustus 2025", updatedBy: "TAHIR" },
    { projectId: 2, stageCode: null, fasumType: "Drainase Utama", progressPercent: 50, notes: "Sejajar jalan utama, 50% terpasang", updatedBy: "TAHIR" },
    { projectId: 2, stageCode: null, fasumType: "Taman & RTH", progressPercent: 20, notes: "Masih perencanaan, belum eksekusi", updatedBy: "TAHIR" },
    { projectId: 2, stageCode: null, fasumType: "Musholla", progressPercent: 40, notes: "Pondasi & dinding sudah, atap belum", updatedBy: "TAHIR" },
    { projectId: 3, stageCode: null, fasumType: "Jalan Akses Masuk", progressPercent: 0, notes: "Belum mulai, menunggu akuisisi lahan selesai", updatedBy: "EKKY" },
  ];
  for (const f of fasumData) {
    const body = { ...f };
    if (!body.stageCode) delete body.stageCode;
    await tryPost("/produksi/fasum", body, `Fasum P${f.projectId}: ${f.fasumType}`);
  }
  log(`${fasumData.length} fasum progress records`);

  // Unit QC Checklist Init — init untuk unit yang progress >= 80
  const qcReadyUnits = units1.filter(u => u.progress >= 80).slice(0, 15);
  let qcInitCount = 0;
  for (const unit of qcReadyUnits) {
    try {
      await post(`/produksi/qc/checklist/init/${unit.id}`, {});
      qcInitCount++;
    } catch (e) {
      tryLog(`QC init unit ${unit.id}: ${e.message.slice(0,60)}`);
    }
  }
  log(`${qcInitCount} unit QC checklist diinisialisasi`);

  // Reworks
  const reworksData = [
    { unitId: units1[0].id, subkonName: "CV. Bangun Setia Makassar", pekerjaanItem: "Pondasi Batu Gunung", description: "Pondasi retak di sudut NE unit A01", foundDate: "2024-04-10", targetCompletion: "2024-04-20", actualCompletion: "2024-04-18", status: "selesai" },
    { unitId: units1[5].id, subkonName: "CV. Finishing Prima Bantaeng", pekerjaanItem: "Plesteran & Acian", description: "Acian bergelombang di dinding ruang tamu", foundDate: "2024-11-15", targetCompletion: "2024-11-25", actualCompletion: "2024-11-23", status: "selesai" },
    { unitId: units1[12].id, subkonName: "UD. Atap Jaya Sulsel", pekerjaanItem: "Penutup Atap Spandek", description: "Spandek tidak rapat, menyebabkan bocor saat hujan", foundDate: "2025-01-20", targetCompletion: "2025-01-30", status: "open" },
    { unitId: units2[3].id, subkonName: "CV. Kontraktor Bulukumba Bersama", pekerjaanItem: "Dinding Bata", description: "Vertical crack pada dinding luar Blok A04", foundDate: "2025-08-05", targetCompletion: "2025-08-20", status: "open" },
  ];
  for (const rw of reworksData) {
    const body = { ...rw };
    if (!body.actualCompletion) delete body.actualCompletion;
    await tryPost("/produksi/qc/reworks", body, `Rework unit ${rw.unitId}`);
  }
  log(`${reworksData.length} rework records`);

  // ════════════════════════════════════════════════════════════
  section("L. HR MODULE — KARYAWAN, REKRUTMEN, KPI, DST");
  // ════════════════════════════════════════════════════════════

  // Employees
  const employeesData = [
    // Direktur / Manajemen
    { employeeCode: "SAT-001", name: "H. Ridwan Mappatoba, S.T.", division: "Manajemen", position: "Direktur Utama", employmentStatus: "aktif", joinDate: "2018-01-01", location: "Makassar", phone: "08111000001", email: "ridwan@satara.co.id" },
    { employeeCode: "SAT-002", name: "Ir. Hasanuddin Amin", division: "Manajemen", position: "Direktur Operasional", employmentStatus: "aktif", joinDate: "2018-03-01", location: "Makassar", phone: "08111000002", email: "hasanuddin@satara.co.id" },
    { employeeCode: "SAT-003", name: "Dra. Nurhayati Basri, M.M.", division: "Manajemen", position: "Direktur Keuangan", employmentStatus: "aktif", joinDate: "2019-06-01", location: "Makassar", phone: "08111000003", email: "nurhayati@satara.co.id" },
    // Legal & Perizinan
    { employeeCode: "SAT-010", name: "Ummu Kalsum, S.H.", division: "Legal", position: "Manager Legal", employmentStatus: "aktif", joinDate: "2020-01-15", location: "Bantaeng", phone: "08111000010", email: "ummu@satara.co.id" },
    { employeeCode: "SAT-011", name: "Dinda Pratiwi, S.H.", division: "Legal", position: "Staff Legal", employmentStatus: "aktif", joinDate: "2021-03-01", location: "Bantaeng", phone: "08111000011" },
    { employeeCode: "SAT-012", name: "Nia Kurniati, S.H.", division: "Legal", position: "Staff Legal & BPN", employmentStatus: "aktif", joinDate: "2022-02-01", location: "Bantaeng", phone: "08111000012" },
    // Marketing & Sales
    { employeeCode: "SAT-020", name: "Arya Darmawan, S.M.", division: "Marketing", position: "Manager Marketing & Sales", employmentStatus: "aktif", joinDate: "2019-09-01", location: "Bantaeng", phone: "08111000020", email: "arya@satara.co.id" },
    { employeeCode: "SAT-021", name: "Anti Handayani", division: "Marketing", position: "Sales Executive", employmentStatus: "aktif", joinDate: "2021-07-01", location: "Bantaeng", phone: "08111000021" },
    { employeeCode: "SAT-022", name: "Tahir Alamsyah", division: "Marketing", position: "Sales Executive Bulukumba", employmentStatus: "aktif", joinDate: "2022-04-01", location: "Bulukumba", phone: "08111000022" },
    // Administrasi KPR
    { employeeCode: "SAT-030", name: "Irda Mustika, S.E.", division: "Administrasi", position: "Manager Administrasi KPR", employmentStatus: "aktif", joinDate: "2020-06-01", location: "Bantaeng", phone: "08111000030", email: "irda@satara.co.id" },
    { employeeCode: "SAT-031", name: "Ekky Firdaus, S.E.", division: "Administrasi", position: "Staff Administrasi KPR", employmentStatus: "aktif", joinDate: "2022-08-01", location: "Bantaeng", phone: "08111000031" },
    // Produksi / Konstruksi
    { employeeCode: "SAT-040", name: "Ir. Ramli Dg. Sitaba", division: "Produksi", position: "Site Manager Bantaeng", employmentStatus: "aktif", joinDate: "2020-02-01", location: "Bantaeng", phone: "08111000040" },
    { employeeCode: "SAT-041", name: "Hendra Kusuma, S.T.", division: "Produksi", position: "Pengawas Lapangan (Supervisor)", employmentStatus: "aktif", joinDate: "2021-05-01", location: "Bantaeng", phone: "08111000041" },
    { employeeCode: "SAT-042", name: "Rahmat Hidayat", division: "Produksi", position: "Pengawas QC", employmentStatus: "aktif", joinDate: "2022-03-01", location: "Bantaeng", phone: "08111000042" },
    { employeeCode: "SAT-043", name: "Awaluddin Rasyid, S.T.", division: "Produksi", position: "Site Manager Bulukumba", employmentStatus: "aktif", joinDate: "2023-01-01", location: "Bulukumba", phone: "08111000043" },
    // Keuangan
    { employeeCode: "SAT-050", name: "Hikmah Maharani, S.E., Ak.", division: "Keuangan", position: "Manager Keuangan", employmentStatus: "aktif", joinDate: "2019-11-01", location: "Makassar", phone: "08111000050", email: "hikmah@satara.co.id" },
    { employeeCode: "SAT-051", name: "Syahrul Rambe, S.E.", division: "Keuangan", position: "Staff Akuntansi", employmentStatus: "aktif", joinDate: "2022-01-01", location: "Makassar", phone: "08111000051" },
    // HR & Umum
    { employeeCode: "SAT-060", name: "Nursia Kadir, S.Psi.", division: "HR & Umum", position: "Manager HR", employmentStatus: "aktif", joinDate: "2021-01-01", location: "Makassar", phone: "08111000060", email: "nursia@satara.co.id" },
    { employeeCode: "SAT-061", name: "Bagas Prasetyo", division: "HR & Umum", position: "Staff GA & Umum", employmentStatus: "aktif", joinDate: "2023-03-01", location: "Makassar", phone: "08111000061" },
    { employeeCode: "SAT-099", name: "Marlina Sari", division: "Marketing", position: "Digital Marketing Specialist", employmentStatus: "kontrak", joinDate: "2025-01-01", location: "Makassar", phone: "08111000099" },
  ];
  const createdEmployees = [];
  for (const emp of employeesData) {
    const r = await tryPost("/hr/employees", emp, `Karyawan ${emp.name}`);
    if (r) createdEmployees.push(r);
  }
  log(`${createdEmployees.length} karyawan`);

  const empByCode = {};
  for (const e of createdEmployees) empByCode[e.employeeCode] = e;

  // Recruitment Needs
  const recruitNeeds = [];
  const needsData = [
    { positionName: "Site Manager Gowa", division: "Produksi", location: "Gowa (Malino)", headcountNeeded: 1, headcountFilled: 0, targetHireDate: "2025-09-30", jobDescription: "Mengawasi seluruh proses konstruksi Proyek Bukit Indah Gowa", minimumQualification: "S1 Teknik Sipil, pengalaman min 3 tahun site management", picRecruiter: "SAT-060", status: "dibuka" },
    { positionName: "Pengawas QC Bulukumba", division: "Produksi", location: "Bulukumba", headcountNeeded: 1, headcountFilled: 0, targetHireDate: "2025-07-31", jobDescription: "QC checklist, defect tracking, rework approval Proyek Griya BLK", minimumQualification: "D3/S1 Teknik, pengalaman QC konstruksi min 2 tahun", picRecruiter: "SAT-060", status: "dibuka" },
    { positionName: "Sales Executive Gowa", division: "Marketing", location: "Gowa", headcountNeeded: 1, headcountFilled: 0, targetHireDate: "2025-10-31", jobDescription: "Marketing & penjualan Proyek Bukit Indah Gowa", minimumQualification: "S1 semua jurusan, pengalaman sales properti min 1 tahun", picRecruiter: "SAT-060", status: "dibuka" },
    { positionName: "Staff Administrasi KPR Bulukumba", division: "Administrasi", location: "Bulukumba", headcountNeeded: 1, headcountFilled: 0, targetHireDate: "2025-08-31", jobDescription: "Pengurusan berkas KPR, koordinasi bank, pipeline customer BLK", minimumQualification: "D3/S1 Akuntansi/Administrasi, mengerti proses KPR", picRecruiter: "SAT-060", status: "dibuka" },
    { positionName: "Drafter / CAD Operator", division: "Produksi", location: "Makassar (Remote)", headcountNeeded: 1, headcountFilled: 1, targetHireDate: "2025-06-30", jobDescription: "Membuat gambar DED, shop drawing, as-built untuk semua proyek", minimumQualification: "D3/S1 Teknik Sipil/Arsitektur, mahir AutoCAD", picRecruiter: "SAT-060", status: "terpenuhi" },
  ];
  for (const nd of needsData) {
    const r = await tryPost("/hr/recruitment/needs", nd, `Need: ${nd.positionName}`);
    if (r) recruitNeeds.push(r);
  }
  log(`${recruitNeeds.length} recruitment needs`);

  // Recruitment Candidates
  if (recruitNeeds.length > 0) {
    const candidatesData = [
      { needId: recruitNeeds[0]?.id, name: "Akbar Tanjung, S.T.", phone: "08234500001", source: "linkedin", stage: "wawancara_user", stageDate: "2025-07-15", recruiterNotes: "Pengalaman 4 tahun site manager di developer Makassar. Sangat relevan." },
      { needId: recruitNeeds[0]?.id, name: "Rizky Pratama", phone: "08234500002", source: "jobstreet", stage: "screening_cv", stageDate: "2025-07-01", recruiterNotes: "Pengalaman 2 tahun, perlu didalami lebih lanjut" },
      { needId: recruitNeeds[1]?.id, name: "Fadli Wahyuddin", phone: "08234500003", source: "referral", stage: "tes_tertulis", stageDate: "2025-07-10", recruiterNotes: "Referral dari Pak Ramli. Background QC konstruksi 3 tahun." },
      { needId: recruitNeeds[2]?.id, name: "Sartika Dewi", phone: "08234500004", source: "instagram", stage: "screening_cv", stageDate: "2025-07-05", recruiterNotes: "2 tahun sales properti, target oriented" },
      { needId: recruitNeeds[2]?.id, name: "Andi Mappasomba", phone: "08234500005", source: "referral", stage: "wawancara_hr", stageDate: "2025-07-08", recruiterNotes: "Rekomendasi Pak Arya. Mengenal market Gowa dengan baik." },
      { needId: recruitNeeds[3]?.id, name: "Yusriana Hadi", phone: "08234500006", source: "jobstreet", stage: "wawancara_user", stageDate: "2025-07-12", recruiterNotes: "Background admin KPR BTN 2 tahun. Sangat match." },
    ];
    for (const c of candidatesData) {
      if (c.needId) await tryPost("/hr/recruitment/candidates", c, `Kandidat: ${c.name}`);
    }
    log(`${candidatesData.filter(c => c.needId).length} recruitment candidates`);
  }

  // KPI Definitions
  const kpiDefs = [];
  const kpiDefData = [
    { position: "Site Manager", division: "Produksi", kpiName: "Progress Konstruksi Bulanan", description: "Persentase bobot pekerjaan yang selesai dalam bulan berjalan", unit: "%", monthlyTarget: "8", weight: "25", dataSource: "sistem", sourceModule: "produksi" },
    { position: "Site Manager", division: "Produksi", kpiName: "Zero Defect Rate", description: "Persentase unit yang lolos QC tanpa defect", unit: "%", monthlyTarget: "80", weight: "20", dataSource: "sistem", sourceModule: "produksi" },
    { position: "Sales Executive", division: "Marketing", kpiName: "Leads Baru per Bulan", description: "Jumlah leads baru yang masuk ke pipeline", unit: "leads", monthlyTarget: "15", weight: "20", dataSource: "sistem", sourceModule: "marketing" },
    { position: "Sales Executive", division: "Marketing", kpiName: "Booking per Bulan", description: "Jumlah unit berhasil dibooking", unit: "unit", monthlyTarget: "3", weight: "30", dataSource: "sistem", sourceModule: "marketing" },
    { position: "Sales Executive", division: "Marketing", kpiName: "Conversion Rate", description: "Persen leads yang jadi booking", unit: "%", monthlyTarget: "20", weight: "25", dataSource: "manual" },
    { position: "Manager Administrasi KPR", division: "Administrasi", kpiName: "Berkas Diserahkan ke Bank per Bulan", description: "Jumlah berkas KPR yang berhasil diserahkan ke bank", unit: "berkas", monthlyTarget: "5", weight: "30", dataSource: "sistem", sourceModule: "administrasi" },
    { position: "Manager Administrasi KPR", division: "Administrasi", kpiName: "SP3K Terbit per Bulan", description: "Jumlah SP3K yang berhasil diterbitkan bank", unit: "SP3K", monthlyTarget: "3", weight: "35", dataSource: "sistem", sourceModule: "administrasi" },
    { position: "Manager Legal", division: "Legal", kpiName: "Perizinan Selesai On-Time", description: "Jumlah dokumen perizinan yang selesai sesuai target", unit: "dokumen", monthlyTarget: "2", weight: "40", dataSource: "manual" },
    { position: "Manager Keuangan", division: "Keuangan", kpiName: "Akurasi Laporan Keuangan", description: "Laporan keuangan bulan ini selesai tepat waktu tanpa selisih", unit: "%", monthlyTarget: "100", weight: "30", dataSource: "manual" },
    { position: "Pengawas QC", division: "Produksi", kpiName: "Defect Resolution Rate", description: "Persentase defect yang diselesaikan dalam bulan berjalan", unit: "%", monthlyTarget: "90", weight: "35", dataSource: "sistem", sourceModule: "produksi" },
  ];
  for (const kd of kpiDefData) {
    const r = await tryPost("/hr/kpi/definitions", kd, `KPI def: ${kd.kpiName}`);
    if (r) kpiDefs.push(r);
  }
  log(`${kpiDefs.length} KPI definitions`);

  // KPI Records — Maret-Mei 2026 untuk beberapa karyawan
  if (kpiDefs.length > 0 && createdEmployees.length > 0) {
    const siteManager = createdEmployees.find(e => e.employeeCode === "SAT-040");
    const salesArya = createdEmployees.find(e => e.employeeCode === "SAT-020");
    const salesAnti = createdEmployees.find(e => e.employeeCode === "SAT-021");
    const adminIrda = createdEmployees.find(e => e.employeeCode === "SAT-030");

    const kpiRecordsData = [];
    const kpiSiteM = kpiDefs.find(k => k.kpiName === "Progress Konstruksi Bulanan");
    const kpiZeroD = kpiDefs.find(k => k.kpiName === "Zero Defect Rate");
    const kpiLeads = kpiDefs.find(k => k.kpiName === "Leads Baru per Bulan");
    const kpiBook = kpiDefs.find(k => k.kpiName === "Booking per Bulan");
    const kpiBerkas = kpiDefs.find(k => k.kpiName === "Berkas Diserahkan ke Bank per Bulan");

    if (siteManager && kpiSiteM) {
      for (const [mon, actual] of [[3,9.2],[4,7.8],[5,8.5]]) {
        kpiRecordsData.push({ employeeId: siteManager.id, kpiDefinitionId: kpiSiteM.id, periodYear: 2026, periodMonth: mon, target: "8", actual: String(actual), achievementPct: String((actual/8*100).toFixed(1)) });
      }
    }
    if (siteManager && kpiZeroD) {
      for (const [mon, actual] of [[3,82],[4,85],[5,88]]) {
        kpiRecordsData.push({ employeeId: siteManager.id, kpiDefinitionId: kpiZeroD.id, periodYear: 2026, periodMonth: mon, target: "80", actual: String(actual), achievementPct: String((actual/80*100).toFixed(1)) });
      }
    }
    if (salesArya && kpiLeads) {
      for (const [mon, actual] of [[3,18],[4,22],[5,19]]) {
        kpiRecordsData.push({ employeeId: salesArya.id, kpiDefinitionId: kpiLeads.id, periodYear: 2026, periodMonth: mon, target: "15", actual: String(actual), achievementPct: String((actual/15*100).toFixed(1)) });
      }
    }
    if (salesArya && kpiBook) {
      for (const [mon, actual] of [[3,4],[4,5],[5,3]]) {
        kpiRecordsData.push({ employeeId: salesArya.id, kpiDefinitionId: kpiBook.id, periodYear: 2026, periodMonth: mon, target: "3", actual: String(actual), achievementPct: String((actual/3*100).toFixed(1)) });
      }
    }
    if (salesAnti && kpiLeads) {
      for (const [mon, actual] of [[3,12],[4,15],[5,14]]) {
        kpiRecordsData.push({ employeeId: salesAnti.id, kpiDefinitionId: kpiLeads.id, periodYear: 2026, periodMonth: mon, target: "15", actual: String(actual), achievementPct: String((actual/15*100).toFixed(1)) });
      }
    }
    if (adminIrda && kpiBerkas) {
      for (const [mon, actual] of [[3,5],[4,6],[5,4]]) {
        kpiRecordsData.push({ employeeId: adminIrda.id, kpiDefinitionId: kpiBerkas.id, periodYear: 2026, periodMonth: mon, target: "5", actual: String(actual), achievementPct: String((actual/5*100).toFixed(1)) });
      }
    }
    for (const kr of kpiRecordsData) {
      await tryPost("/hr/kpi/records", kr, `KPI record e${kr.employeeId} m${kr.periodMonth}`);
    }
    log(`${kpiRecordsData.length} KPI records`);
  }

  // Competency Definitions
  const compDefs = [];
  const compDefData = [
    { position: "Site Manager", division: "Produksi", competencyName: "Manajemen Konstruksi", description: "Kemampuan merencanakan, mengawasi, dan mengendalikan pekerjaan konstruksi", targetScore: "85" },
    { position: "Site Manager", division: "Produksi", competencyName: "Kepemimpinan Tim Lapangan", description: "Kemampuan memimpin mandor, tukang, dan subkontraktor", targetScore: "80" },
    { position: "Sales Executive", division: "Marketing", competencyName: "Teknik Penjualan & Negosiasi", description: "Kemampuan presentasi produk, follow-up leads, negosiasi closing", targetScore: "80" },
    { position: "Sales Executive", division: "Marketing", competencyName: "Pemahaman Produk Properti", description: "Pengetahuan tentang spesifikasi unit, lokasi, KPR, dan legalitas", targetScore: "85" },
    { position: "Manager Legal", division: "Legal", competencyName: "Hukum Pertanahan & Properti", description: "Pemahaman SHM, AJB, PPJB, perizinan (PBG, PKKPR, SPPL)", targetScore: "90" },
    { position: "Manager Administrasi KPR", division: "Administrasi", competencyName: "Manajemen Pipeline KPR", description: "Kemampuan mengelola alur KPR dari booking hingga HT", targetScore: "85" },
    { position: "Semua Karyawan", division: "Umum", competencyName: "Disiplin & Kepatuhan SOP", description: "Tingkat kehadiran, ketepatan waktu, dan kepatuhan prosedur kerja", targetScore: "80" },
    { position: "Semua Karyawan", division: "Umum", competencyName: "Komunikasi & Kolaborasi", description: "Kemampuan berkomunikasi efektif antar divisi dan dengan eksternal", targetScore: "75" },
  ];
  for (const cd of compDefData) {
    const r = await tryPost("/hr/competency/definitions", cd, `Kompetensi: ${cd.competencyName}`);
    if (r) compDefs.push(r);
  }
  log(`${compDefs.length} competency definitions`);

  // Competency Scores — untuk beberapa karyawan
  if (compDefs.length > 0 && createdEmployees.length > 0) {
    const scoreTargets = [
      [0, "SAT-040", "88", "2026-03-15", "Direktur Operasional"],
      [1, "SAT-040", "82", "2026-03-15", "Direktur Operasional"],
      [2, "SAT-020", "85", "2026-04-01", "Manager Marketing"],
      [3, "SAT-020", "90", "2026-04-01", "Manager Marketing"],
      [2, "SAT-021", "78", "2026-04-01", "Manager Marketing"],
      [3, "SAT-021", "82", "2026-04-01", "Manager Marketing"],
      [4, "SAT-010", "92", "2026-03-20", "Direktur Operasional"],
      [5, "SAT-030", "88", "2026-03-25", "Direktur Operasional"],
      [6, "SAT-040", "85", "2026-03-15", "Direktur Operasional"],
      [6, "SAT-020", "88", "2026-04-01", "Manager Marketing"],
      [6, "SAT-010", "90", "2026-03-20", "Direktur Operasional"],
      [7, "SAT-040", "82", "2026-03-15", "Direktur Operasional"],
      [7, "SAT-020", "85", "2026-04-01", "Manager Marketing"],
    ];
    for (const [defIdx, code, score, date, assessor] of scoreTargets) {
      const emp = createdEmployees.find(e => e.employeeCode === code);
      const def = compDefs[defIdx];
      if (emp && def) await tryPost("/hr/competency/scores", { employeeId: emp.id, competencyDefinitionId: def.id, actualScore: score, assessmentDate: date, assessor }, `CompScore ${code}`);
    }
    log(`${scoreTargets.length} competency scores`);
  }

  // Training Programs
  const trainings = [];
  const trainingData = [
    { name: "Workshop Manajemen Konstruksi Modern", type: "teknis", trainingDate: "2026-04-15", durationHours: "16", organizer: "Ikatan Ahli Konstruksi Indonesia (IAKI)", cost: "3500000", status: "selesai", evaluationScore: "88", notes: "Pelatihan 2 hari di Makassar, materi lean construction" },
    { name: "Pelatihan Penjualan Properti & KPR", type: "fungsional", trainingDate: "2026-03-20", durationHours: "8", organizer: "REI Sulsel", cost: "1500000", status: "selesai", evaluationScore: "85", notes: "Materi: teknik closing, objection handling, simulasi KPR" },
    { name: "Sertifikasi Green Building Dasar", type: "sertifikasi", trainingDate: "2026-06-10", durationHours: "24", organizer: "Green Building Council Indonesia", cost: "5000000", status: "direncanakan", notes: "Persiapan untuk proyek Bukit Indah Gowa" },
    { name: "Training Hukum Pertanahan Terbaru", type: "teknis", trainingDate: "2026-05-05", durationHours: "8", organizer: "Ikatan Notaris Indonesia Sulsel", cost: "2000000", status: "selesai", evaluationScore: "92", notes: "Update regulasi PBG, PKKPR, dan PP 18/2021" },
    { name: "Pelatihan Leadership & Team Management", type: "soft_skill", trainingDate: "2026-07-15", durationHours: "12", organizer: "Prasetiya Mulya Executive Learning", cost: "4000000", status: "direncanakan", notes: "Untuk level Manager dan Site Manager" },
  ];
  for (const tr of trainingData) {
    const r = await tryPost("/hr/training/programs", tr, `Training: ${tr.name}`);
    if (r) trainings.push(r);
  }
  log(`${trainings.length} training programs`);

  // Training Participants
  if (trainings.length > 0 && createdEmployees.length > 0) {
    const participantData = [
      [0, ["SAT-040", "SAT-041", "SAT-042", "SAT-043"]],
      [1, ["SAT-020", "SAT-021", "SAT-022"]],
      [2, ["SAT-040", "SAT-043", "SAT-002"]],
      [3, ["SAT-010", "SAT-011", "SAT-012"]],
      [4, ["SAT-040", "SAT-020", "SAT-030", "SAT-010", "SAT-050"]],
    ];
    let partCount = 0;
    for (const [tIdx, codes] of participantData) {
      const training = trainings[tIdx];
      if (!training) continue;
      for (const code of codes) {
        const emp = createdEmployees.find(e => e.employeeCode === code);
        if (emp) {
          await tryPost("/hr/training/participants", { trainingId: training.id, employeeId: emp.id }, `Participant ${code}`);
          partCount++;
        }
      }
    }
    log(`${partCount} training participants`);
  }

  // Compensation Records — Mei 2026 per karyawan
  if (createdEmployees.length > 0) {
    const compStructure = {
      "SAT-001": { base: 25000000, fixed: 5000000, perf: 8000000, incentive: 15000000 },
      "SAT-002": { base: 18000000, fixed: 4000000, perf: 5000000, incentive: 8000000 },
      "SAT-003": { base: 18000000, fixed: 4000000, perf: 5000000, incentive: 0 },
      "SAT-010": { base: 8000000, fixed: 2000000, perf: 1500000, incentive: 0 },
      "SAT-011": { base: 4500000, fixed: 1000000, perf: 500000, incentive: 0 },
      "SAT-012": { base: 4500000, fixed: 1000000, perf: 500000, incentive: 0 },
      "SAT-020": { base: 8000000, fixed: 2000000, perf: 2000000, incentive: 5000000 },
      "SAT-021": { base: 5000000, fixed: 1000000, perf: 1000000, incentive: 3000000 },
      "SAT-022": { base: 5000000, fixed: 1000000, perf: 800000, incentive: 2000000 },
      "SAT-030": { base: 7500000, fixed: 1500000, perf: 1500000, incentive: 0 },
      "SAT-031": { base: 4500000, fixed: 800000, perf: 500000, incentive: 0 },
      "SAT-040": { base: 9000000, fixed: 2000000, perf: 2000000, incentive: 0 },
      "SAT-041": { base: 6000000, fixed: 1500000, perf: 1000000, incentive: 0 },
      "SAT-042": { base: 5500000, fixed: 1200000, perf: 800000, incentive: 0 },
      "SAT-043": { base: 7500000, fixed: 1500000, perf: 1500000, incentive: 0 },
      "SAT-050": { base: 9000000, fixed: 2000000, perf: 1500000, incentive: 0 },
      "SAT-051": { base: 5000000, fixed: 1000000, perf: 500000, incentive: 0 },
      "SAT-060": { base: 8000000, fixed: 1500000, perf: 1500000, incentive: 0 },
      "SAT-061": { base: 4000000, fixed: 800000, perf: 400000, incentive: 0 },
      "SAT-099": { base: 6000000, fixed: 1000000, perf: 800000, incentive: 1000000 },
    };
    let compCount = 0;
    for (const emp of createdEmployees) {
      const s = compStructure[emp.employeeCode] || { base: 4000000, fixed: 800000, perf: 400000, incentive: 0 };
      const deduction = Math.round(s.base * 0.02);
      const total = s.base + s.fixed + s.perf + s.incentive - deduction;
      await tryPost("/hr/compensation", {
        employeeId: emp.id, periodYear: 2026, periodMonth: 5,
        baseSalary: String(s.base), fixedAllowance: String(s.fixed),
        performanceBonus: String(s.perf), incentive: String(s.incentive),
        thr: "0", deduction: String(deduction), totalTakeHome: String(total),
      }, `Kompensasi ${emp.employeeCode}`);
      compCount++;
    }
    log(`${compCount} compensation records (Mei 2026)`);
  }

  // Culture Records — Mei 2026
  if (createdEmployees.length > 0) {
    const absenceData = {
      "SAT-001": [22,0,0,95,98], "SAT-002": [22,0,0,96,97],
      "SAT-010": [21,0,1,94,96], "SAT-020": [20,1,0,92,95],
      "SAT-021": [21,0,1,90,94], "SAT-022": [22,0,0,95,96],
      "SAT-030": [22,0,0,97,98], "SAT-040": [22,0,0,93,96],
      "SAT-041": [21,1,0,91,93], "SAT-042": [22,0,0,94,95],
      "SAT-043": [20,0,2,89,92],
    };
    let cultCount = 0;
    for (const emp of createdEmployees) {
      const d = absenceData[emp.employeeCode] || [21,0,1,88,90];
      await tryPost("/hr/culture", {
        employeeId: emp.id, periodYear: 2026, periodMonth: 5,
        daysPresent: d[0], workingDays: 22, lateCount: d[1],
        disciplineViolations: d[2], sopComplianceScore: String(d[3]),
        taskCompletionScore: String(d[4]),
      }, `Culture ${emp.employeeCode}`);
      cultCount++;
    }
    log(`${cultCount} culture records`);
  }

  // Workload Records — per divisi, Mei-Jun 2026
  const workloadData = [
    { division: "Produksi", periodYear: 2026, periodMonth: 5, capacity: "100", actualLoad: "115", loadDescription: "Overload: P1 blok C masih berjalan + P2 akselerasi Q2" },
    { division: "Produksi", periodYear: 2026, periodMonth: 6, capacity: "100", actualLoad: "108", loadDescription: "Masih over capacity, rekrutmen Site Manager Gowa urgent" },
    { division: "Marketing", periodYear: 2026, periodMonth: 5, capacity: "100", actualLoad: "95", loadDescription: "Normal, P2 aktif marketing + soft launch P3" },
    { division: "Marketing", periodYear: 2026, periodMonth: 6, capacity: "100", actualLoad: "110", loadDescription: "Overload minor: pameran properti + 3 proyek serentak" },
    { division: "Administrasi", periodYear: 2026, periodMonth: 5, capacity: "100", actualLoad: "105", loadDescription: "Sedikit overload: P2 pipeline akad meningkat" },
    { division: "Legal", periodYear: 2026, periodMonth: 5, capacity: "100", actualLoad: "90", loadDescription: "Normal, fokus permasalahan SHM P1 & SPPL P2" },
    { division: "Keuangan", periodYear: 2026, periodMonth: 5, capacity: "100", actualLoad: "85", loadDescription: "Normal, laporan bulanan & cash flow 3 proyek" },
    { division: "HR & Umum", periodYear: 2026, periodMonth: 5, capacity: "100", actualLoad: "98", loadDescription: "Normal, rekrutmen 4 posisi baru aktif berjalan" },
  ];
  for (const wl of workloadData) {
    await tryPost("/hr/workload", wl, `Workload ${wl.division} ${wl.periodMonth}/2026`);
  }
  log(`${workloadData.length} workload records`);

  // Succession Plans
  if (createdEmployees.length > 0) {
    const dirOp = createdEmployees.find(e => e.employeeCode === "SAT-002");
    const mgrMkt = createdEmployees.find(e => e.employeeCode === "SAT-020");
    const mgrLegal = createdEmployees.find(e => e.employeeCode === "SAT-010");
    const siteM1 = createdEmployees.find(e => e.employeeCode === "SAT-040");
    const siteSup = createdEmployees.find(e => e.employeeCode === "SAT-041");
    const siteM2 = createdEmployees.find(e => e.employeeCode === "SAT-043");
    const salesAnti = createdEmployees.find(e => e.employeeCode === "SAT-021");
    const salesTahir = createdEmployees.find(e => e.employeeCode === "SAT-022");

    const successionData = [
      { criticalPosition: "Direktur Operasional", currentHolderId: dirOp?.id, backup1Id: siteM1?.id, backup1Readiness: "siap_1-2_tahun", backup2Id: mgrLegal?.id, backup2Readiness: "siap_2-3_tahun", notes: "Pak Ramli perlu eksposur lebih ke level strategis" },
      { criticalPosition: "Site Manager Utama", currentHolderId: siteM1?.id, backup1Id: siteSup?.id, backup1Readiness: "siap_1_tahun", backup2Id: siteM2?.id, backup2Readiness: "siap_sekarang", notes: "Pak Awaluddin bisa ambil alih dengan cepat" },
      { criticalPosition: "Manager Marketing", currentHolderId: mgrMkt?.id, backup1Id: salesAnti?.id, backup1Readiness: "siap_2-3_tahun", backup2Id: salesTahir?.id, backup2Readiness: "siap_3_tahun", notes: "Anti masih perlu pengembangan di area strategi digital" },
      { criticalPosition: "Manager Legal", currentHolderId: mgrLegal?.id, backup1Id: createdEmployees.find(e=>e.employeeCode==="SAT-011")?.id, backup1Readiness: "siap_2-3_tahun", notes: "Dinda perlu lebih banyak eksposur ke urusan BPN" },
    ];
    for (const sp of successionData) {
      const body = { ...sp };
      if (!body.currentHolderId) delete body.currentHolderId;
      if (!body.backup1Id) delete body.backup1Id;
      if (!body.backup2Id) delete body.backup2Id;
      await tryPost("/hr/succession", body, `Succession: ${sp.criticalPosition}`);
    }
    log(`${successionData.length} succession plans`);
  }

  // Productivity Records — Jan-Mei 2026
  const productivityData = [
    { periodYear: 2026, periodMonth: 1, totalRevenue: "2850000000", totalProfit: "798000000", totalUnitsSold: 6 },
    { periodYear: 2026, periodMonth: 2, totalRevenue: "3150000000", totalProfit: "882000000", totalUnitsSold: 7 },
    { periodYear: 2026, periodMonth: 3, totalRevenue: "4200000000", totalProfit: "1176000000", totalUnitsSold: 9 },
    { periodYear: 2026, periodMonth: 4, totalRevenue: "3800000000", totalProfit: "1064000000", totalUnitsSold: 8 },
    { periodYear: 2026, periodMonth: 5, totalRevenue: "5100000000", totalProfit: "1428000000", totalUnitsSold: 11 },
  ];
  for (const pr of productivityData) {
    await tryPost("/hr/productivity", pr, `Productivity ${pr.periodMonth}/2026`);
  }
  log(`${productivityData.length} productivity records`);

  // Flight Risk Records
  if (createdEmployees.length > 0) {
    const flightRiskData = [
      { employeeId: createdEmployees.find(e=>e.employeeCode==="SAT-021")?.id, periodYear: 2026, periodQuarter: 1, monthsWithoutPromotion: 18, salaryMarketGapPct: "15", jobSatisfactionScore: "6", hasExternalOffer: "tidak", riskLevel: "medium", notes: "Anti mulai menunjukkan tanda jenuh, perlu promosi atau bonus" },
      { employeeId: createdEmployees.find(e=>e.employeeCode==="SAT-042")?.id, periodYear: 2026, periodQuarter: 1, monthsWithoutPromotion: 24, salaryMarketGapPct: "20", jobSatisfactionScore: "5", hasExternalOffer: "ya", riskLevel: "high", notes: "Rahmat ada offer dari developer Makassar, gaji 30% lebih tinggi. URGENT." },
      { employeeId: createdEmployees.find(e=>e.employeeCode==="SAT-040")?.id, periodYear: 2026, periodQuarter: 1, monthsWithoutPromotion: 36, salaryMarketGapPct: "5", jobSatisfactionScore: "8", hasExternalOffer: "tidak", riskLevel: "low", notes: "Pak Ramli loyal, puas dengan posisi. Perlu dijaga melalui benefit non-finansial." },
    ];
    let frCount = 0;
    for (const fr of flightRiskData) {
      if (fr.employeeId) {
        await tryPost("/hr/flight-risk", fr, `Flight risk e${fr.employeeId}`);
        frCount++;
      }
    }
    log(`${frCount} flight risk records`);
  }

  // Career Paths
  const careerPathData = [
    { division: "Marketing", level: 1, positionName: "Sales Executive", previousPosition: null, minTenureMonths: 0, minKpiAchievement: "70", minCompetencyScore: "65" },
    { division: "Marketing", level: 2, positionName: "Senior Sales Executive", previousPosition: "Sales Executive", minTenureMonths: 18, minKpiAchievement: "85", minCompetencyScore: "75" },
    { division: "Marketing", level: 3, positionName: "Manager Marketing & Sales", previousPosition: "Senior Sales Executive", minTenureMonths: 36, minKpiAchievement: "90", minCompetencyScore: "82" },
    { division: "Produksi", level: 1, positionName: "Pengawas QC", previousPosition: null, minTenureMonths: 0, minKpiAchievement: "75", minCompetencyScore: "70" },
    { division: "Produksi", level: 2, positionName: "Supervisor Lapangan", previousPosition: "Pengawas QC", minTenureMonths: 24, minKpiAchievement: "85", minCompetencyScore: "78" },
    { division: "Produksi", level: 3, positionName: "Site Manager", previousPosition: "Supervisor Lapangan", minTenureMonths: 36, minKpiAchievement: "88", minCompetencyScore: "82" },
    { division: "Administrasi", level: 1, positionName: "Staff Administrasi KPR", previousPosition: null, minTenureMonths: 0, minKpiAchievement: "70", minCompetencyScore: "65" },
    { division: "Administrasi", level: 2, positionName: "Manager Administrasi KPR", previousPosition: "Staff Administrasi KPR", minTenureMonths: 24, minKpiAchievement: "85", minCompetencyScore: "80" },
  ];
  for (const cp of careerPathData) {
    const body = { ...cp };
    if (!body.previousPosition) delete body.previousPosition;
    await tryPost("/hr/career-paths", body, `Career ${cp.division} L${cp.level}`);
  }
  log(`${careerPathData.length} career paths`);

  // Expansion Needs (HR)
  const hrExpansionData = [
    { projectName: "Bukit Indah Gowa", positionName: "Site Manager", headcount: 1, minCompetencyScore: "78", minKpiAchievement: "82" },
    { projectName: "Bukit Indah Gowa", positionName: "Pengawas QC", headcount: 1, minCompetencyScore: "72", minKpiAchievement: "78" },
    { projectName: "Bukit Indah Gowa", positionName: "Sales Executive", headcount: 1, minCompetencyScore: "70", minKpiAchievement: "75" },
    { projectName: "Ekspansi Jeneponto", positionName: "Site Manager", headcount: 1, minCompetencyScore: "80", minKpiAchievement: "85" },
    { projectName: "Ekspansi Jeneponto", positionName: "Manager Marketing", headcount: 1, minCompetencyScore: "80", minKpiAchievement: "85" },
  ];
  for (const en of hrExpansionData) {
    await tryPost("/hr/expansion", en, `HR Expansion: ${en.positionName} - ${en.projectName}`);
  }
  log(`${hrExpansionData.length} HR expansion needs`);

  // ════════════════════════════════════════════════════════════
  section("SEED SUPPLEMENTARY SELESAI — RINGKASAN");
  // ════════════════════════════════════════════════════════════
  console.log("");
  console.log(`  Construction Tasks   : P1 (${seedUnits.length * TASK_ITEMS.length} tasks) + P2 (${seedUnits2.length * TASK_ITEMS.length} tasks)`);
  console.log(`  Materials (lama)     : ${matCount} items`);
  console.log(`  QC Defects           : ${qcData.length} defects`);
  console.log(`  Subkon Contracts     : ${createdSubkons.length} kontrak`);
  console.log(`  Handovers            : ${handoverCount} handover`);
  console.log(`  Planning Market      : ${markets.length} kabupaten`);
  console.log(`  Planning Product     : ${productData.length} tipe produk`);
  console.log(`  Planning KPP         : ${kppData.length} bank`);
  console.log(`  Planning SDM         : 3 proyek`);
  console.log(`  Planning Milestones  : ${milestonesByProject.flat().length} milestones`);
  console.log(`  Planning Landbank    : ${landbankData.length} entries`);
  console.log(`  Planning Expansion   : ${expansionData.length} skenario`);
  console.log(`  Permit Documents     : ${permitDocs.length} dokumen`);
  console.log(`  Land Stages          : ${landStages.length} stages`);
  console.log(`  SHM Splits           : ${shmSplitData.length} records`);
  console.log(`  Legal Issues         : ${legalIssues.length} issues`);
  console.log(`  Branding KPI         : ${brandingKpiData.length} records`);
  console.log(`  Kompetitor Market    : ${competitorsByMarket.flat().length} kompetitor`);
  console.log(`  Absorpsi             : ${absorpsiData.length} tahap`);
  console.log(`  Monthly Targets      : ${monthlyTargets.length} targets`);
  console.log(`  Bank Submissions     : ${submissionsData.filter(s => s.customerId).length}`);
  console.log(`  OTS Records          : ${otsData.filter(o => o.customerId).length}`);
  console.log(`  SP3K Records         : ${sp3kData.filter(s => s.customerId).length}`);
  console.log(`  Akad Records         : ${akadData.filter(a => a.customerId).length}`);
  console.log(`  HT Records           : ${htData.filter(h => h.customerId).length}`);
  console.log(`  Customer Complaints  : ${complaintsData.length}`);
  console.log(`  Prod Material Master : ${createdMasterMaterials.length}`);
  console.log(`  Fasum Progress       : ${fasumData.length}`);
  console.log(`  Unit QC Init         : ${qcInitCount}`);
  console.log(`  Reworks              : ${reworksData.length}`);
  console.log(`  Karyawan (HR)        : ${createdEmployees.length}`);
  console.log(`  Recruitment Needs    : ${recruitNeeds.length}`);
  console.log(`  KPI Definitions      : ${kpiDefs.length}`);
  console.log(`  Competency Defs      : ${compDefs.length}`);
  console.log(`  Training Programs    : ${trainings.length}`);
  console.log(`  Workload Records     : ${workloadData.length}`);
  console.log(`  Productivity Records : ${productivityData.length}`);
  console.log(`  Career Paths         : ${careerPathData.length}`);
  console.log("");
}

main().catch(err => {
  console.error("\n❌ SEED GAGAL:", err.message);
  process.exit(1);
});
