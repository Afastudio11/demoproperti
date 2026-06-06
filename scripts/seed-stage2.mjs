/**
 * Satara Dashboard — Seed Stage 2
 * Melanjutkan seed: Construction Tasks, QC Defects, Materials, Handovers
 * Data projects/units/customers sudah ada dari seed tahap 1
 */

const BASE = "http://localhost:8080/api";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function log(msg) { console.log(`  ${msg}`); }
function section(title) { console.log(`\n${"─".repeat(50)}\n  ${title}\n${"─".repeat(50)}`); }

const CONSTRUCTION_ITEMS = [
  { item: "Galian Pondasi", bobot: 3 },
  { item: "Pondasi Batu Kali / Cor", bobot: 5 },
  { item: "Sloof", bobot: 4 },
  { item: "Dinding Bata", bobot: 8 },
  { item: "Kolom Praktis", bobot: 4 },
  { item: "Balok Lintel", bobot: 3 },
  { item: "Ring Balok", bobot: 4 },
  { item: "Plat Lantai / Cor", bobot: 5 },
  { item: "Rangka Atap", bobot: 5 },
  { item: "Penutup Atap", bobot: 4 },
  { item: "Plafon", bobot: 3 },
  { item: "Plesteran & Acian", bobot: 6 },
  { item: "Cat Dinding", bobot: 4 },
  { item: "Pintu & Jendela", bobot: 5 },
  { item: "Instalasi Listrik", bobot: 5 },
  { item: "Instalasi Air Bersih", bobot: 4 },
  { item: "Sanitasi & Septictank", bobot: 4 },
  { item: "Keramik Lantai", bobot: 4 },
  { item: "Keramik Dinding KM", bobot: 3 },
  { item: "Kusen Aluminium", bobot: 2 },
  { item: "Pagar Depan", bobot: 2 },
  { item: "Carport / Teras", bobot: 3 },
  { item: "Landscaping", bobot: 2 },
  { item: "Finishing & Touch-up", bobot: 3 },
];

async function main() {
  console.log("\n🌱 Satara Seed — Stage 2 (Construction, QC, Materials, Handover)");
  console.log("=".repeat(60));

  // Ambil data dari database
  section("Mengambil data existing dari API...");
  const projects = await get("/projects");
  const units = await get("/units");
  const customers = await get("/customers");
  log(`${projects.length} proyek, ${units.length} unit, ${customers.length} customer ditemukan`);

  if (projects.length < 4) {
    console.error("FATAL: Butuh minimal 4 proyek. Jalankan seed.mjs dulu.");
    process.exit(1);
  }

  // Map proyek berdasarkan fase
  const p1 = projects.find(p => p.fase === "BUILD");     // Bantaeng
  const p2 = projects.find(p => p.fase === "SELL");      // Gowa
  const p4 = projects.find(p => p.fase === "HANDOVER");  // Takalar

  log(`P1 (BUILD): ${p1?.nama} (ID: ${p1?.id})`);
  log(`P2 (SELL): ${p2?.nama} (ID: ${p2?.id})`);
  log(`P4 (HANDOVER): ${p4?.nama} (ID: ${p4?.id})`);

  // Filter unit per proyek
  const unitsP1 = units.filter(u => u.projectId === p1.id).sort((a, b) => a.id - b.id);
  const unitsP4 = units.filter(u => u.projectId === p4.id).sort((a, b) => a.id - b.id);

  // Filter customers per proyek
  const customersP4 = customers.filter(c => c.projectId === p4.id).sort((a, b) => a.id - b.id);
  const customersP1 = customers.filter(c => c.projectId === p1.id).sort((a, b) => a.id - b.id);

  log(`Unit P1: ${unitsP1.length}, Unit P4: ${unitsP4.length}`);
  log(`Customer P1: ${customersP1.length}, Customer P4: ${customersP4.length}`);

  // ─── 8. CONSTRUCTION TASKS ────────────────────────────────────────────────

  section("8. Pekerjaan Konstruksi");

  const unitStatusMap = {};
  for (const u of unitsP1) unitStatusMap[u.id] = u.status;

  // 6 unit pertama proyek BUILD
  const buildUnits = unitsP1.slice(0, 6);
  for (const unit of buildUnits) {
    const doneCount = unit.status === "serah_terima" ? 24
      : unit.status === "akad" ? 20
      : unit.status === "kpr_process" ? 14
      : unit.status === "booked" ? 8
      : 0;

    for (let ci = 0; ci < CONSTRUCTION_ITEMS.length; ci++) {
      const item = CONSTRUCTION_ITEMS[ci];
      const taskStatus = ci < doneCount ? "selesai" : ci < doneCount + 3 ? "dalam_proses" : "belum_mulai";
      await post("/construction/tasks", {
        unitId: unit.id,
        item: item.item,
        bobot: item.bobot,
        status: taskStatus,
        ...(taskStatus !== "belum_mulai" ? { tanggalMulai: "2024-06-01" } : {}),
      });
    }
    log(`Unit ${unit.id} (${unit.blok}${unit.nomor}, ${unit.status}): ${doneCount}/24 selesai`);
  }

  // 5 unit pertama Proyek HANDOVER - semua selesai
  const handoverBuildUnits = unitsP4.slice(0, 5);
  for (const unit of handoverBuildUnits) {
    for (const item of CONSTRUCTION_ITEMS) {
      await post("/construction/tasks", {
        unitId: unit.id,
        item: item.item,
        bobot: item.bobot,
        status: "selesai",
        tanggalMulai: "2023-01-01",
      });
    }
  }
  log(`5 unit Proyek Takalar: semua 24 item selesai`);

  // ─── 9. QC DEFECTS ────────────────────────────────────────────────────────

  section("9. QC Defect");

  const qcUnit1 = unitsP1[2]?.id;
  const qcUnit2 = unitsP1[3]?.id;
  const qcUnit3 = unitsP1[5]?.id;
  const qcUnit4 = unitsP4[0]?.id;
  const qcUnit5 = unitsP4[1]?.id;

  const qcDefs = [
    { unitId: qcUnit1, kategori: "Plester & Cat", deskripsi: "Retakan halus di dinding kamar tidur utama. Perlu acian ulang." },
    { unitId: qcUnit1, kategori: "Sanitasi", deskripsi: "Kran kamar mandi tetap menetes saat ditutup penuh." },
    { unitId: qcUnit2, kategori: "Pintu & Jendela", deskripsi: "Kusen pintu depan tidak rata, pintu sulit menutup sempurna." },
    { unitId: qcUnit2, kategori: "Keramik", deskripsi: "2 buah keramik dapur retak, perlu diganti." },
    { unitId: qcUnit3, kategori: "Listrik", deskripsi: "Stop kontak di ruang tamu tidak berfungsi." },
    { unitId: qcUnit3, kategori: "Atap", deskripsi: "Ada rembesan air di plafon pojok kamar anak saat hujan deras." },
    { unitId: qcUnit4, kategori: "Cat", deskripsi: "Cat eksterior kusam di sisi kanan bangunan." },
    { unitId: qcUnit5, kategori: "Plumbing", deskripsi: "Pipa saluran air kotor bocor di bawah wastafel." },
  ].filter(d => d.unitId); // Hanya yang ada unitId-nya

  const qcCreated = [];
  for (const def of qcDefs) {
    const qc = await post("/qc/defects", def);
    qcCreated.push(qc);
    log(`QC: Unit ${def.unitId} — ${def.kategori}`);
  }

  // Update status beberapa defect
  if (qcCreated[0]) await patch(`/qc/defects/${qcCreated[0].id}`, { status: "in_repair" });
  if (qcCreated[1]) await patch(`/qc/defects/${qcCreated[1].id}`, { status: "verified", verifiedBy: "QC Budi Santoso" });
  if (qcCreated[6]) await patch(`/qc/defects/${qcCreated[6].id}`, { status: "closed", verifiedBy: "QC Andi Rahman" });
  log(`Status QC diupdate (in_repair, verified, closed)`);

  // ─── 10. MATERIALS ────────────────────────────────────────────────────────

  section("10. Stok Material");

  const materialDefs = [
    // Proyek BUILD (Bantaeng) — beberapa di bawah minimum
    { projectId: p1.id, item: "Besi Beton D13", stok: 2400, satuan: "batang", vendor: "UD Besi Jaya Bantaeng", harga: 95000, minimumStock: 1000 },
    { projectId: p1.id, item: "Semen Tonasa 50kg", stok: 180, satuan: "sak", vendor: "Toko Bangunan Maju", harga: 68000, minimumStock: 200 },
    { projectId: p1.id, item: "Bata Merah", stok: 45000, satuan: "buah", vendor: "Pabrik Bata Bantaeng", harga: 1200, minimumStock: 20000 },
    { projectId: p1.id, item: "Pasir Bangunan", stok: 30, satuan: "m³", vendor: "UD Pasir Bantaeng", harga: 250000, minimumStock: 15 },
    { projectId: p1.id, item: "Koral / Batu Pecah", stok: 12, satuan: "m³", vendor: "UD Quarry Loka", harga: 280000, minimumStock: 20 },
    { projectId: p1.id, item: "Cat Dulux Interior", stok: 45, satuan: "kaleng", vendor: "Toko Cat Setia", harga: 185000, minimumStock: 50 },
    { projectId: p1.id, item: "Genteng Keramik Jatiwangi", stok: 3800, satuan: "buah", vendor: "Distributor Bahan Bangunan Makassar", harga: 9500, minimumStock: 2000 },
    { projectId: p1.id, item: "Kayu Kaso 5/7", stok: 380, satuan: "batang", vendor: "UD Kayu Makmur", harga: 45000, minimumStock: 150 },
    // Proyek SELL (Gowa) — stok lebih lengkap
    { projectId: p2.id, item: "Besi Beton D16", stok: 5500, satuan: "batang", vendor: "PT Baja Makassar", harga: 145000, minimumStock: 2000 },
    { projectId: p2.id, item: "Semen Tiga Roda 50kg", stok: 350, satuan: "sak", vendor: "Distributor Gowa Makmur", harga: 72000, minimumStock: 300 },
    { projectId: p2.id, item: "Keramik Platinum 60x60", stok: 2200, satuan: "dus", vendor: "Griya Keramik Makassar", harga: 125000, minimumStock: 1000 },
    { projectId: p2.id, item: "Kabel NYM 2.5mm", stok: 180, satuan: "roll", vendor: "Toko Listrik Jaya Makassar", harga: 350000, minimumStock: 100 },
    { projectId: p2.id, item: "Pipa PVC 4 inch", stok: 85, satuan: "batang", vendor: "Wavin Distributor Sulsel", harga: 65000, minimumStock: 200 },
    { projectId: p2.id, item: "Cat Weathershield Eksterior", stok: 22, satuan: "kaleng", vendor: "Toko Cat Modern Gowa", harga: 320000, minimumStock: 30 },
    // Proyek HANDOVER (Takalar) — hampir habis
    { projectId: p4.id, item: "Cat Finishing Touch-up", stok: 8, satuan: "kaleng", vendor: "Toko Bangunan Takalar", harga: 95000, minimumStock: 10 },
    { projectId: p4.id, item: "Semen Tonasa 50kg", stok: 18, satuan: "sak", vendor: "Distributor Takalar", harga: 68000, minimumStock: 30 },
    { projectId: p4.id, item: "Keramik 40x40 Putih", stok: 45, satuan: "dus", vendor: "Toko Keramik Takalar", harga: 85000, minimumStock: 20 },
  ];

  for (const def of materialDefs) {
    const m = await post("/materials", def);
    const alert = m.isBelowMinimum ? " ⚠ STOK RENDAH" : "";
    log(`Material: ${def.item} — ${def.stok} ${def.satuan} (min: ${def.minimumStock})${alert}`);
  }

  // ─── 11. HANDOVERS ────────────────────────────────────────────────────────

  section("11. Serah Terima (BAST)");

  // Pasangkan unit serah_terima dengan customer yang ada
  const stUnits = unitsP4.filter(u => u.status === "serah_terima");
  const stCustomers = customersP4.filter(c => c.statusKpr === "selesai");

  const handoverDefs = [
    { unitId: stUnits[0]?.id, customerId: stCustomers[0]?.id, tanggal: "2025-03-15", skorKepuasan: 5, catatan: "Puas, rumah rapi dan sesuai spek. Terima kasih Satara!" },
    { unitId: stUnits[1]?.id, customerId: stCustomers[1]?.id, tanggal: "2025-01-20", skorKepuasan: 4, catatan: "Bagus, hanya ada 1 retakan kecil sudah ditangani." },
    { unitId: stUnits[2]?.id, customerId: stCustomers[2]?.id, tanggal: "2025-02-10", skorKepuasan: 5, catatan: "Sangat puas. Proses serah terima cepat dan profesional." },
    { unitId: stUnits[3]?.id, customerId: stCustomers[3]?.id, tanggal: "2025-02-25", skorKepuasan: 4, catatan: "Hampir sempurna. Semoga tahap 2 segera dibuka." },
    { unitId: stUnits[4]?.id, customerId: stCustomers[4]?.id, tanggal: "2023-12-18", skorKepuasan: 5, catatan: "Unit pertama yang diserahterimakan. Senang sekali!" },
  ].filter(h => h.unitId && h.customerId);

  // Juga unit serah_terima dari Proyek 1 (Bantaeng)
  const stUnitsP1 = unitsP1.filter(u => u.status === "serah_terima");
  const stCustP1 = customersP1.filter(c => c.statusKpr === "selesai");
  if (stUnitsP1[0] && stCustP1[0]) {
    handoverDefs.push({
      unitId: stUnitsP1[0].id,
      customerId: stCustP1[0].id,
      tanggal: "2025-04-05",
      skorKepuasan: 4,
      catatan: "Lokasi bagus, dekat sekolah. Puas dengan hasilnya.",
    });
  }

  // Handover butuh readyAkad=true dulu di unit
  for (const def of handoverDefs) {
    await patch(`/units/${def.unitId}`, { readyAkad: true });
  }
  log(`${handoverDefs.length} unit ditandai readyAkad`);

  for (const def of handoverDefs) {
    await post("/handovers", def);
    log(`BAST: Unit ${def.unitId} → Customer ${def.customerId} (Skor ${def.skorKepuasan}/5)`);
  }

  // ─── SELESAI ──────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("  Stage 2 SELESAI!");
  console.log(`  - ${buildUnits.length * 24 + handoverBuildUnits.length * 24} item konstruksi`);
  console.log(`  - ${qcDefs.length} QC defect (3 diupdate statusnya)`);
  console.log(`  - ${materialDefs.length} material stok`);
  console.log(`  - ${handoverDefs.length} serah terima (BAST)`);
  console.log("=".repeat(60) + "\n");
}

main().catch(err => {
  console.error("\nFATAL ERROR:", err.message);
  process.exit(1);
});
