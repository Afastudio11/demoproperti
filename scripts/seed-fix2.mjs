/**
 * Fix script — perbaiki 5 hal yang gagal di seed-supplementary:
 * 1. Materials (field: item bukan nama, tanpa kategori)
 * 2. QC Defects (field: deskripsi bukan item)
 * 3. Handovers (field: tanggal bukan tanggalHandover, butuh customerId, butuh readyAkad)
 * 4. Training participants (via PUT /hr/training/programs/:id)
 * 5. Unit QC checklist init (patch readyAkad dulu, lalu init)
 */
const BASE = "http://localhost:8080/api";

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${method} ${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}
const post = (p, b) => api("POST", p, b);
const patch = (p, b) => api("PATCH", p, b);
const put = (p, b) => api("PUT", p, b);
const get = (p) => api("GET", p);

function log(msg) { console.log(`[FIX] ${msg}`); }
function skip(msg) { console.log(`[SKIP] ${msg}`); }

async function tryPost(path, body, label) {
  try { return await post(path, body); }
  catch (e) { skip(`${label}: ${e.message.slice(0, 80)}`); return null; }
}

async function main() {
  const allUnits = await get("/units");
  const units1 = allUnits.filter(u => u.projectId === 1).sort((a, b) => a.id - b.id);
  const units2 = allUnits.filter(u => u.projectId === 2).sort((a, b) => a.id - b.id);
  const customers = await get("/administrasi/customers");

  // ─── 1. MATERIALS ────────────────────────────────────────
  console.log("\n=== 1. MATERIALS ===");
  const materialsData = [
    { projectId: 1, item: "Semen Portland 40kg (Tonasa)", satuan: "zak", stok: 850, minimumStock: 200, vendor: "Toko Sumber Makmur Bantaeng", harga: 62000 },
    { projectId: 1, item: "Pasir Beton", satuan: "m3", stok: 120, minimumStock: 30, vendor: "UD. Berkah Material", harga: 250000 },
    { projectId: 1, item: "Batu Gunung / Kerikil", satuan: "m3", stok: 85, minimumStock: 25, vendor: "UD. Berkah Material", harga: 220000 },
    { projectId: 1, item: "Besi Beton D10 SNI", satuan: "batang", stok: 450, minimumStock: 100, vendor: "CV. Besi Jaya Makassar", harga: 78000 },
    { projectId: 1, item: "Besi Beton D8 SNI", satuan: "batang", stok: 380, minimumStock: 80, vendor: "CV. Besi Jaya Makassar", harga: 52000 },
    { projectId: 1, item: "Bata Merah 5x11x22", satuan: "buah", stok: 28000, minimumStock: 5000, vendor: "Pengrajin Bata Dg. Situru", harga: 800 },
    { projectId: 1, item: "Rangka Baja Ringan C75", satuan: "batang", stok: 310, minimumStock: 50, vendor: "CV. Baja Mandiri Sulsel", harga: 95000 },
    { projectId: 1, item: "Spandek 0.3mm 6m", satuan: "lembar", stok: 195, minimumStock: 40, vendor: "CV. Baja Mandiri Sulsel", harga: 145000 },
    { projectId: 1, item: "Keramik Lantai 40x40 Roman", satuan: "dos", stok: 340, minimumStock: 60, vendor: "Toko Keramik Asia Bantaeng", harga: 85000 },
    { projectId: 1, item: "Keramik Dinding KM 25x40", satuan: "dos", stok: 85, minimumStock: 30, vendor: "Toko Keramik Asia Bantaeng", harga: 78000 },
    { projectId: 1, item: "Cat Interior Dulux 5L", satuan: "kaleng", stok: 110, minimumStock: 40, vendor: "Toko Cat Maju Bantaeng", harga: 165000 },
    { projectId: 1, item: "Cat Eksterior Weathershield 5L", satuan: "kaleng", stok: 65, minimumStock: 25, vendor: "Toko Cat Maju Bantaeng", harga: 195000 },
    { projectId: 1, item: "Gypsum Board 9mm", satuan: "lembar", stok: 220, minimumStock: 50, vendor: "UD. Gypsum Jaya Sulsel", harga: 72000 },
    { projectId: 1, item: "Kabel NYM 2x2.5mm", satuan: "meter", stok: 2400, minimumStock: 500, vendor: "Toko Listrik Matahari", harga: 8500 },
    { projectId: 1, item: "MCB 10A Schneider", satuan: "buah", stok: 50, minimumStock: 15, vendor: "Toko Listrik Matahari", harga: 35000 },
    { projectId: 1, item: "Pipa PVC 1/2 inch Rucika", satuan: "batang", stok: 18, minimumStock: 50, vendor: "Toko Pipa Sari Bantaeng", harga: 22000 },
    { projectId: 1, item: "Kloset Jongkok TOTO", satuan: "buah", stok: 5, minimumStock: 20, vendor: "Toko Sanitasi Makmur", harga: 450000 },
    { projectId: 1, item: "Wastafel Meja ROCA", satuan: "buah", stok: 3, minimumStock: 15, vendor: "Toko Sanitasi Makmur", harga: 850000 },
    { projectId: 2, item: "Semen Portland 40kg (Tonasa) BLK", satuan: "zak", stok: 420, minimumStock: 100, vendor: "Toko Material Bulukumba", harga: 63000 },
    { projectId: 2, item: "Pasir Beton Bulukumba", satuan: "m3", stok: 60, minimumStock: 20, vendor: "UD. Pasir Jaya Bulukumba", harga: 260000 },
    { projectId: 2, item: "Besi Beton D10 BLK", satuan: "batang", stok: 220, minimumStock: 60, vendor: "CV. Besi Mandiri Makassar", harga: 79000 },
    { projectId: 2, item: "Bata Merah Caile", satuan: "buah", stok: 12000, minimumStock: 3000, vendor: "Pengrajin Bata Caile Bulukumba", harga: 820 },
    { projectId: 2, item: "Rangka Baja Ringan BLK", satuan: "batang", stok: 12, minimumStock: 30, vendor: "CV. Baja Mandiri Sulsel", harga: 96000 },
  ];
  let matOk = 0;
  for (const m of materialsData) {
    const r = await tryPost("/materials", m, `Mat ${m.item.slice(0,20)}`);
    if (r) matOk++;
  }
  log(`${matOk}/${materialsData.length} materials berhasil`);

  // ─── 2. QC DEFECTS ───────────────────────────────────────
  console.log("\n=== 2. QC DEFECTS ===");
  const qcItems = [
    { unitId: units1[8]?.id, kategori: "dinding", deskripsi: "Retak rambut pada dinding kamar tidur utama" },
    { unitId: units1[9]?.id, kategori: "keramik", deskripsi: "Nat keramik kamar mandi tidak rata, ada yang copot" },
    { unitId: units1[10]?.id, kategori: "kusen_pintu", deskripsi: "Engsel pintu kamar mandi longgar" },
    { unitId: units1[11]?.id, kategori: "cat", deskripsi: "Cat plafon belang — 2 warna berbeda di ruang tamu" },
    { unitId: units1[12]?.id, kategori: "atap", deskripsi: "Kebocoran atap di sudut barat saat hujan deras" },
    { unitId: units1[13]?.id, kategori: "listrik", deskripsi: "Stop kontak dapur tidak berfungsi" },
    { unitId: units1[14]?.id, kategori: "plumbing", deskripsi: "Air tidak mengalir ke WC belakang, ada penyumbatan" },
    { unitId: units1[15]?.id, kategori: "kusen_pintu", deskripsi: "Jendela kamar tidur susah dibuka dan dikunci" },
    { unitId: units1[16]?.id, kategori: "keramik", deskripsi: "Lantai keramik dapur bunyi nyaring saat diinjak" },
    { unitId: units1[17]?.id, kategori: "listrik", deskripsi: "Saklar lampu teras tidak responsif" },
    { unitId: units1[18]?.id, kategori: "kusen_pintu", deskripsi: "Pintu kamar utama tidak bisa dikunci dari dalam" },
    { unitId: units1[19]?.id, kategori: "plafon", deskripsi: "Plafon kamar mandi turun / melendung, kemungkinan rembes" },
  ];
  let qcOk = 0;
  for (const qc of qcItems) {
    if (!qc.unitId) { skip(`QC skip: unitId undefined`); continue; }
    const r = await tryPost("/qc/defects", qc, `QC unit ${qc.unitId}`);
    if (r) qcOk++;
  }
  log(`${qcOk}/${qcItems.length} QC defects berhasil`);

  // ─── 3. HANDOVERS ────────────────────────────────────────
  console.log("\n=== 3. HANDOVERS ===");
  // Cek existing handovers
  let existingHandovers = [];
  try { existingHandovers = await get("/handovers"); } catch {}
  const handoveredUnitIds = new Set(existingHandovers.map(h => h.unitId));
  log(`Existing handovers: ${existingHandovers.length}`);

  // Ambil unit yang belum serah terima + customer yang match
  const custP1 = customers.filter(c => c.projectId === 1).sort((a, b) => a.id - b.id);
  const custWithUnit = customers.filter(c => c.unitId != null);

  // Patch unit readyAkad + buat handover
  // Ambil unit dengan progress 100 dan belum di handover
  const readyUnits = allUnits.filter(u => u.progress >= 95 && !handoveredUnitIds.has(u.id)).slice(0, 8);
  const tanggalList = ["2025-02-10","2025-02-15","2025-03-01","2025-03-05","2025-03-20","2025-04-02","2025-04-10","2025-04-25"];
  const skorList = [5,5,4,5,4,5,5,4];
  const notaList = ["Serah terima lancar, semua punch list beres.","BAST ditandatangani, unit bersih.","Beberapa minor issue diselesaikan H-1.","Serah terima tepat waktu sesuai jadwal akad.","Customer memuji kualitas finishing.","Kunci diserahkan, foto unit dilakukan bersama.","Infrastruktur jalan depan masih proses.","Customer langsung huni, sangat puas."];
  let hvOk = 0;
  for (let i = 0; i < readyUnits.length; i++) {
    const unit = readyUnits[i];
    // Cari customer untuk unit ini
    let cust = custWithUnit.find(c => c.unitId === unit.id);
    if (!cust) cust = custP1[i % custP1.length]; // fallback
    if (!cust) continue;
    try {
      // Pastikan unit readyAkad = true
      if (!unit.readyAkad) await patch(`/units/${unit.id}`, { readyAkad: true });
      // Buat handover
      await post("/handovers", { unitId: unit.id, customerId: cust.id, tanggal: tanggalList[i] || "2025-04-30", skorKepuasan: skorList[i] || 5, catatan: notaList[i] || "Serah terima berjalan lancar." });
      hvOk++;
      log(`  Handover OK: unit ${unit.id} (${unit.blok}${unit.nomor}) → customer ${cust.id}`);
    } catch (e) {
      skip(`Handover unit ${unit.id}: ${e.message.slice(0, 80)}`);
    }
  }
  log(`${hvOk} handovers berhasil`);

  // ─── 4. TRAINING PARTICIPANTS ────────────────────────────
  console.log("\n=== 4. TRAINING PARTICIPANTS ===");
  const trainings = await get("/hr/training/programs");
  const employees = await get("/hr/employees");
  const empByCode = {};
  for (const e of employees) empByCode[e.employeeCode] = e;

  const participantMap = [
    [0, ["SAT-040","SAT-041","SAT-042","SAT-043"]],
    [1, ["SAT-020","SAT-021","SAT-022"]],
    [2, ["SAT-040","SAT-043","SAT-002"]],
    [3, ["SAT-010","SAT-011","SAT-012"]],
    [4, ["SAT-040","SAT-020","SAT-030","SAT-010","SAT-050"]],
  ];
  let partTotal = 0;
  for (const [tIdx, codes] of participantMap) {
    const training = trainings[tIdx];
    if (!training) continue;
    const participantIds = codes.map(c => empByCode[c]?.id).filter(Boolean);
    try {
      await put(`/hr/training/programs/${training.id}`, { participantIds });
      partTotal += participantIds.length;
      log(`  Training ${training.id}: ${participantIds.length} peserta`);
    } catch (e) {
      skip(`Training PUT ${training.id}: ${e.message.slice(0,80)}`);
    }
  }
  log(`${partTotal} training participants`);

  // ─── 5. UNIT QC CHECKLIST INIT ───────────────────────────
  console.log("\n=== 5. UNIT QC CHECKLIST INIT ===");
  // Units P1 dengan progress >= 80, pastikan readyAkad=true dulu
  const qcReadyUnits = units1.filter(u => u.progress >= 80).slice(0, 20);
  let qcInitOk = 0;
  for (const unit of qcReadyUnits) {
    try {
      if (!unit.readyAkad) await patch(`/units/${unit.id}`, { readyAkad: true });
      const r = await post(`/produksi/qc/checklist/init/${unit.id}`, {});
      qcInitOk++;
    } catch (e) {
      skip(`QC init unit ${unit.id}: ${e.message.slice(0,60)}`);
    }
  }
  log(`${qcInitOk}/${qcReadyUnits.length} unit QC checklist diinisialisasi`);

  console.log("\n✅ FIX SELESAI");
}

main().catch(err => { console.error("\n❌ FIX GAGAL:", err.message); process.exit(1); });
