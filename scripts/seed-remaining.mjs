/**
 * Seed sisa data: construction tasks, materials, QC, subkon, handovers
 * Untuk proyek yang sudah dibuat di seed-all.mjs sebelumnya
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

function log(msg) { console.log(`[SEED] ${msg}`); }
function section(title) { console.log(`\n${"═".repeat(60)}\n  ${title}\n${"═".repeat(60)}`); }

async function main() {
  // Ambil data yang sudah ada
  const projects = await get("/projects");
  log(`Found ${projects.length} projects`);

  // Identifikasi proyek berdasarkan nama
  const p1 = projects.find(p => p.nama === "Pesona Bantaeng Residence");
  const p2 = projects.find(p => p.nama === "Griya Bulukumba Asri");
  const p3 = projects.find(p => p.nama === "Bukit Indah Gowa");

  if (!p1 || !p2 || !p3) {
    throw new Error(`Proyek tidak ditemukan! Run seed-all.mjs dulu.\nFound: ${projects.map(p => p.nama).join(', ')}`);
  }
  log(`P1: id=${p1.id} (${p1.fase}), P2: id=${p2.id} (${p2.fase}), P3: id=${p3.id} (${p3.fase})`);

  // Ambil semua units
  const allUnits = await get("/units");
  const units1 = allUnits.filter(u => u.projectId === p1.id).sort((a, b) => a.id - b.id);
  const units2 = allUnits.filter(u => u.projectId === p2.id).sort((a, b) => a.id - b.id);
  log(`Units P1: ${units1.length}, Units P2: ${units2.length}`);

  // ─── CONSTRUCTION TASKS ────────────────────────────────────
  section("1. PRODUKSI - CONSTRUCTION TASKS (30 unit P1)");

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

  const seedUnits = units1.slice(0, 30);
  let taskCount = 0;

  for (const unit of seedUnits) {
    for (let i = 0; i < TASK_ITEMS.length; i++) {
      const t = TASK_ITEMS[i];
      const prevCum = i > 0 ? cumulative[i - 1] : 0;
      let status = "belum_mulai";
      if (unit.progress >= cumulative[i]) status = "selesai";
      else if (unit.progress > prevCum) status = "dalam_proses";

      const payload = { unitId: unit.id, item: t.nama, bobot: t.bobot, status };
      if (status !== "belum_mulai") {
        payload.tanggalMulai = `2024-${String(Math.min(Math.floor(i / 2) + 2, 12)).padStart(2, "0")}-01`;
      }

      await post("/construction/tasks", payload);
      taskCount++;
    }
  }
  log(`  ${taskCount} construction tasks untuk ${seedUnits.length} unit`);

  // ─── MATERIALS ─────────────────────────────────────────────
  section("2. PRODUKSI - MATERIALS & STOK");

  const materialsData = [
    { projectId: p1.id, item: "Semen Portland 40kg (Tonasa)", satuan: "zak", stok: 850, minimumStock: 200, vendor: "Toko Bahan Bangunan Sumber Makmur", harga: 62000 },
    { projectId: p1.id, item: "Pasir Beton", satuan: "m3", stok: 120, minimumStock: 30, vendor: "UD. Berkah Material", harga: 250000 },
    { projectId: p1.id, item: "Batu Gunung / Kerikil", satuan: "m3", stok: 85, minimumStock: 25, vendor: "UD. Berkah Material", harga: 220000 },
    { projectId: p1.id, item: "Besi Beton D10 (SNI)", satuan: "batang", stok: 450, minimumStock: 100, vendor: "CV. Besi Jaya Makassar", harga: 78000 },
    { projectId: p1.id, item: "Besi Beton D8 (SNI)", satuan: "batang", stok: 380, minimumStock: 80, vendor: "CV. Besi Jaya Makassar", harga: 52000 },
    { projectId: p1.id, item: "Bata Merah 5x11x22 cm", satuan: "buah", stok: 28000, minimumStock: 5000, vendor: "Pengrajin Bata Dg. Situru", harga: 800 },
    { projectId: p1.id, item: "Rangka Baja Ringan C75", satuan: "batang", stok: 310, minimumStock: 50, vendor: "CV. Baja Mandiri Sulsel", harga: 95000 },
    { projectId: p1.id, item: "Spandek 0.3mm Panjang 6m", satuan: "lembar", stok: 195, minimumStock: 40, vendor: "CV. Baja Mandiri Sulsel", harga: 145000 },
    { projectId: p1.id, item: "Keramik Lantai 40x40 Roman", satuan: "dos", stok: 340, minimumStock: 60, vendor: "Toko Keramik Asia Bantaeng", harga: 85000 },
    { projectId: p1.id, item: "Keramik Dinding 25x40 KM", satuan: "dos", stok: 85, minimumStock: 30, vendor: "Toko Keramik Asia Bantaeng", harga: 78000 },
    { projectId: p1.id, item: "Cat Tembok Interior Dulux 5L", satuan: "kaleng", stok: 110, minimumStock: 40, vendor: "Toko Cat Maju Bantaeng", harga: 165000 },
    { projectId: p1.id, item: "Cat Eksterior Weathershield 5L", satuan: "kaleng", stok: 65, minimumStock: 25, vendor: "Toko Cat Maju Bantaeng", harga: 195000 },
    { projectId: p1.id, item: "Gypsum Board 9mm 1200x2400", satuan: "lembar", stok: 220, minimumStock: 50, vendor: "UD. Gypsum Jaya Sulsel", harga: 72000 },
    { projectId: p1.id, item: "Kabel NYM 2x2.5mm Eterna", satuan: "meter", stok: 2400, minimumStock: 500, vendor: "Toko Listrik Matahari", harga: 8500 },
    { projectId: p1.id, item: "MCB 10A Schneider", satuan: "buah", stok: 50, minimumStock: 15, vendor: "Toko Listrik Matahari", harga: 35000 },
    { projectId: p1.id, item: "Pipa PVC 1/2 inch Rucika", satuan: "batang", stok: 18, minimumStock: 50, vendor: "Toko Pipa Sari Bantaeng", harga: 22000 },
    { projectId: p1.id, item: "Kloset Jongkok TOTO", satuan: "buah", stok: 5, minimumStock: 20, vendor: "Toko Sanitasi Makmur", harga: 450000 },
    { projectId: p1.id, item: "Wastafel Meja ROCA", satuan: "buah", stok: 3, minimumStock: 15, vendor: "Toko Sanitasi Makmur", harga: 850000 },
    { projectId: p2.id, item: "Semen Portland 40kg (Tonasa)", satuan: "zak", stok: 420, minimumStock: 100, vendor: "Toko Material Bulukumba", harga: 63000 },
    { projectId: p2.id, item: "Pasir Beton", satuan: "m3", stok: 60, minimumStock: 20, vendor: "UD. Pasir Jaya Bulukumba", harga: 260000 },
    { projectId: p2.id, item: "Besi Beton D10", satuan: "batang", stok: 220, minimumStock: 60, vendor: "CV. Besi Mandiri Makassar", harga: 79000 },
    { projectId: p2.id, item: "Bata Merah Lokal Caile", satuan: "buah", stok: 12000, minimumStock: 3000, vendor: "Pengrajin Bata Caile Bulukumba", harga: 820 },
    { projectId: p2.id, item: "Rangka Baja Ringan C75", satuan: "batang", stok: 12, minimumStock: 30, vendor: "CV. Baja Mandiri Sulsel", harga: 96000 },
  ];

  for (const m of materialsData) {
    const mat = await post("/materials", m);
    const alert = mat.isBelowMinimum ? " [STOK RENDAH]" : "";
    log(`  Material: ${mat.item} (${mat.stok} ${mat.satuan})${alert}`);
  }

  // ─── QC DEFECTS ────────────────────────────────────────────
  section("3. PRODUKSI - QC DEFECTS");

  // CreateQcDefectBody: { unitId, kategori, deskripsi }
  // Status diupdate via PATCH setelah create
  const qcUnits = units1.slice(5, 17);
  const qcData = [
    { unit: qcUnits[0], deskripsi: "Retak rambut pada dinding kamar tidur utama", kategori: "dinding", newStatus: "verified" },
    { unit: qcUnits[1], deskripsi: "Nat keramik kamar mandi tidak rata, ada yang copot", kategori: "keramik", newStatus: "open" },
    { unit: qcUnits[2], deskripsi: "Engsel pintu kamar mandi longgar, tidak bisa dikunci", kategori: "kusen_pintu", newStatus: "in_repair" },
    { unit: qcUnits[3], deskripsi: "Cat plafon belang, 2 warna berbeda di ruang tamu", kategori: "cat", newStatus: "open" },
    { unit: qcUnits[4], deskripsi: "Kebocoran atap di sudut barat saat hujan deras", kategori: "atap", newStatus: "closed" },
    { unit: qcUnits[5], deskripsi: "Stop kontak dapur tidak berfungsi", kategori: "listrik", newStatus: "in_repair" },
    { unit: qcUnits[6], deskripsi: "Air tidak mengalir ke WC belakang, pipa tersumbat", kategori: "plumbing", newStatus: "open" },
    { unit: qcUnits[7], deskripsi: "Jendela kamar tidur susah dibuka dan dikunci", kategori: "kusen_pintu", newStatus: "closed" },
    { unit: qcUnits[8], deskripsi: "Lantai keramik dapur bunyi nyaring saat diinjak", kategori: "keramik", newStatus: "open" },
    { unit: qcUnits[9], deskripsi: "Saklar lampu teras tidak responsif", kategori: "listrik", newStatus: "closed" },
    { unit: qcUnits[10], deskripsi: "Pintu kamar utama tidak bisa dikunci dari dalam", kategori: "kusen_pintu", newStatus: "in_repair" },
    { unit: qcUnits[11], deskripsi: "Plafon kamar mandi turun / melendung, ada rembesan", kategori: "plafon", newStatus: "open" },
  ];

  for (const qc of qcData) {
    if (!qc.unit) { log(`  QC SKIP: unit tidak ada`); continue; }
    const r = await post("/qc/defects", { unitId: qc.unit.id, kategori: qc.kategori, deskripsi: qc.deskripsi });
    // Update status jika bukan open (default)
    if (qc.newStatus !== "open") {
      await patch(`/qc/defects/${r.id}`, { status: qc.newStatus });
    }
    log(`  QC: Unit ${qc.unit.blok}${qc.unit.nomor} — ${qc.deskripsi.slice(0, 45)} (${qc.newStatus})`);
  }

  // ─── SUBKON CONTRACTS ─────────────────────────────────────
  section("4. PRODUKSI - SUBKON CONTRACTS");

  const subkonData = [
    { projectId: p1.id, stageCode: "B_struktur", subkonName: "CV. Bangun Setia Makassar", unitCount: 50, valuePerUnit: 45000000, retentionPerUnit: 4500000, maintenanceMonths: 3, startDate: "2024-02-01", targetEndDate: "2025-06-30" },
    { projectId: p1.id, stageCode: "C_atap", subkonName: "UD. Atap Jaya Sulsel", unitCount: 50, valuePerUnit: 12000000, retentionPerUnit: 1200000, maintenanceMonths: 3, startDate: "2024-06-01", targetEndDate: "2025-03-31" },
    { projectId: p1.id, stageCode: "D_finishing", subkonName: "CV. Finishing Prima Bantaeng", unitCount: 50, valuePerUnit: 18000000, retentionPerUnit: 1800000, maintenanceMonths: 6, startDate: "2024-09-01", targetEndDate: "2025-12-31" },
    { projectId: p1.id, stageCode: "E_mep_listrik", subkonName: "PT. Elektrika Sulawesi", unitCount: 50, valuePerUnit: 8500000, retentionPerUnit: 850000, maintenanceMonths: 12, startDate: "2024-08-01", targetEndDate: "2025-10-31" },
    { projectId: p1.id, stageCode: "F_mep_air", subkonName: "CV. Pipa Master Bantaeng", unitCount: 50, valuePerUnit: 5500000, retentionPerUnit: 550000, maintenanceMonths: 12, startDate: "2024-08-01", targetEndDate: "2025-10-31" },
    { projectId: p2.id, stageCode: "B_struktur", subkonName: "CV. Kontraktor Bulukumba Bersama", unitCount: 36, valuePerUnit: 50000000, retentionPerUnit: 5000000, maintenanceMonths: 3, startDate: "2024-07-01", targetEndDate: "2026-06-30" },
    { projectId: p2.id, stageCode: "C_atap", subkonName: "CV. Atap Baja Bulukumba", unitCount: 36, valuePerUnit: 13000000, retentionPerUnit: 1300000, maintenanceMonths: 3, startDate: "2024-10-01", targetEndDate: "2025-12-31" },
    { projectId: p2.id, stageCode: "D_finishing", subkonName: "UD. Finishing Bulukumba", unitCount: 36, valuePerUnit: 20000000, retentionPerUnit: 2000000, maintenanceMonths: 6, startDate: "2025-01-01", targetEndDate: "2026-12-31" },
  ];

  for (const sk of subkonData) {
    const r = await post("/produksi/subkon/contracts", sk);
    log(`  Subkon: ${r.subkonName} — Rp${(r.contractValue / 1e9).toFixed(2)}M | ${r.stageCode}`);
  }

  // ─── HANDOVERS ─────────────────────────────────────────────
  section("5. SERAH TERIMA - HANDOVERS");

  // Ambil customers yang memiliki unitId (sudah linked ke unit)
  const customers = await get("/administrasi/customers");
  log(`  ${customers.length} customer ditemukan`);

  // Ambil units yang belum punya handover dan sudah ada customer linked
  // Kita pilih 10 unit P1 yang ada customer-nya
  const customerByUnitId = {};
  for (const c of customers) {
    if (c.unitId) customerByUnitId[c.unitId] = c;
  }
  log(`  ${Object.keys(customerByUnitId).length} unit sudah linked ke customer`);

  const skorList    = [5, 5, 4, 5, 4, 5, 5, 4, 5, 4];
  const tanggalList = ["2025-02-10","2025-02-15","2025-03-01","2025-03-05","2025-03-20","2025-04-02","2025-04-10","2025-04-25","2025-05-05","2025-05-15"];
  const catatanList = [
    "Serah terima lancar, semua punch list beres. Customer puas.",
    "Beberapa minor issue diselesaikan H-1 sebelum BAST ditandatangani.",
    "Ada retouch cat, diselesaikan sebelum serah terima. Customer OK.",
    "Serah terima tepat waktu sesuai jadwal akad, kunci langsung diserahkan.",
    "Customer memuji kualitas finishing kamar mandi. Sangat puas.",
    "Kunci diserahkan, foto unit dilakukan bersama customer.",
    "Customer langsung huni hari itu juga. Puas dengan lokasi.",
    "Ada permintaan tambahan kran, diurus via nota tambah subkon.",
    "Serah terima berjalan smooth, semua item checklist OK.",
    "Customer hadir bersama keluarga, puas dengan kondisi unit.",
  ];

  // Pilih unit-unit P1 yang linked ke customer
  const handoverCandidates = units1.filter(u => customerByUnitId[u.id]).slice(0, 10);
  log(`  ${handoverCandidates.length} unit kandidat untuk handover`);

  let handoverCount = 0;
  for (let i = 0; i < handoverCandidates.length; i++) {
    const unit = handoverCandidates[i];
    const customer = customerByUnitId[unit.id];
    try {
      // Set readyAkad = true dan progress = 100
      await patch(`/units/${unit.id}`, { progress: 100, readyAkad: true });
      const h = await post("/handovers", {
        unitId: unit.id,
        customerId: customer.id,
        tanggal: tanggalList[i] || "2025-05-30",
        skorKepuasan: skorList[i] || 5,
        catatan: catatanList[i] || "Serah terima berjalan lancar.",
      });
      handoverCount++;
      log(`  Handover: Unit ${unit.blok}${unit.nomor} / ${customer.nama} — ${h.tanggal} | Skor: ${h.skorKepuasan}/5`);
    } catch (e) {
      log(`  Handover unit ${unit.blok}${unit.nomor} GAGAL: ${e.message.slice(0, 100)}`);
    }
  }

  // ─── RINGKASAN ─────────────────────────────────────────────
  section("SELESAI");
  console.log(`\n  ✅ Construction Tasks : ${taskCount} tasks`);
  console.log(`  ✅ Materials & Stok   : ${materialsData.length} item`);
  console.log(`  ✅ QC Defects         : ${qcData.length} defek`);
  console.log(`  ✅ Subkon Contracts   : ${subkonData.length} kontrak`);
  console.log(`  ✅ Serah Terima       : ${handoverCount} handover`);
  console.log("");
}

main().catch(err => {
  console.error("\n❌ SEED GAGAL:", err.message);
  process.exit(1);
});
