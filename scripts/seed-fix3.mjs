/**
 * Fix3 — perbaiki sisa yang belum beres:
 * 1. Patch unit progress berdasarkan status
 * 2. Handovers (setelah patch readyAkad)
 * 3. Training participants (fix "No values to set" dgn pass notes)
 * 4. Unit QC checklist init (setelah progress dipatch)
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
    throw new Error(`${method} ${path} → ${r.status}: ${text.slice(0, 300)}`);
  }
  return r.json();
}
const post = (p, b) => api("POST", p, b);
const patch = (p, b) => api("PATCH", p, b);
const put = (p, b) => api("PUT", p, b);
const get = (p) => api("GET", p);

function log(msg) { console.log(`[FIX3] ${msg}`); }
function skip(msg) { console.log(`[SKIP] ${msg}`); }

async function main() {
  const allUnits = await get("/units");
  const units1 = allUnits.filter(u => u.projectId === 1).sort((a, b) => a.id - b.id);
  const units2 = allUnits.filter(u => u.projectId === 2).sort((a, b) => a.id - b.id);
  const customers = await get("/administrasi/customers");

  // ─── 1. PATCH UNIT PROGRESS & readyAkad ──────────────────
  console.log("\n=== 1. PATCH UNIT PROGRESS ===");

  // P1: 50 units — distribusi realistik BUILD stage
  // Blok A (20 unit): selesai semua
  // Blok B (18 unit): selesai
  // Blok C (12 unit): campuran
  const progressMapP1 = [];
  // A01-A20 → selesai semua, status serah_terima / akad
  for (let i = 0; i < Math.min(20, units1.length); i++) {
    const unit = units1[i];
    const status = unit.status; // keep existing status
    const progress = 100;
    const readyAkad = true;
    progressMapP1.push({ id: unit.id, progress, readyAkad });
  }
  // B01-B18 → selesai, status akad / serah terima
  for (let i = 20; i < Math.min(38, units1.length); i++) {
    progressMapP1.push({ id: units1[i].id, progress: 100, readyAkad: true });
  }
  // C01-C12 → campuran progress
  const cProgressValues = [85, 90, 72, 65, 55, 48, 38, 30, 22, 15, 10, 5];
  for (let i = 38; i < units1.length; i++) {
    const idx = i - 38;
    const prog = cProgressValues[idx] || 5;
    const readyAkad = prog >= 90;
    progressMapP1.push({ id: units1[i].id, progress: prog, readyAkad });
  }

  // P2: 36 units — SELL stage, sebagian dalam konstruksi
  const progressMapP2 = [];
  // Blok A (18 unit): berbagai progress
  const a2ProgressValues = [100, 100, 100, 95, 90, 85, 78, 72, 65, 58, 50, 42, 35, 28, 20, 12, 8, 5];
  for (let i = 0; i < Math.min(18, units2.length); i++) {
    const prog = a2ProgressValues[i] || 5;
    progressMapP2.push({ id: units2[i].id, progress: prog, readyAkad: prog >= 95 });
  }
  // Blok B (18 unit): awal konstruksi
  const b2ProgressValues = [8, 5, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 18; i < units2.length; i++) {
    const prog = b2ProgressValues[i-18] || 0;
    progressMapP2.push({ id: units2[i].id, progress: prog, readyAkad: false });
  }

  let patchOk = 0;
  for (const { id, progress, readyAkad } of [...progressMapP1, ...progressMapP2]) {
    try {
      await patch(`/units/${id}`, { progress, readyAkad });
      patchOk++;
    } catch (e) { skip(`Patch unit ${id}: ${e.message.slice(0,60)}`); }
  }
  log(`${patchOk} units dipatch progress & readyAkad`);

  // ─── 2. HANDOVERS ────────────────────────────────────────
  console.log("\n=== 2. HANDOVERS ===");
  // Ambil ulang units setelah patch
  const freshUnits = await get("/units");
  const freshUnits1 = freshUnits.filter(u => u.projectId === 1).sort((a, b) => a.id - b.id);
  const custP1 = customers.filter(c => c.projectId === 1).sort((a, b) => a.id - b.id);

  // Existing handovers check
  let existingHandovers = [];
  try { existingHandovers = await get("/handovers"); } catch {}
  const handoveredUnitIds = new Set(existingHandovers.map(h => h.unitId));

  // Ambil units readyAkad=true yang belum di handover
  const readyForHandover = freshUnits1.filter(u => u.readyAkad && !handoveredUnitIds.has(u.id));
  log(`Units ready untuk handover: ${readyForHandover.length}`);

  const tanggalList = ["2025-02-10","2025-02-15","2025-03-01","2025-03-05","2025-03-20","2025-04-02","2025-04-10","2025-04-25","2025-05-05","2025-05-12"];
  const skorList = [5,5,4,5,4,5,5,4,4,5];
  const notaList = [
    "Serah terima lancar, semua punch list beres. Customer sangat puas.",
    "BAST ditandatangani, unit bersih dan siap dihuni.",
    "Beberapa minor issue diselesaikan H-1. Akad berjalan lancar.",
    "Serah terima tepat waktu, customer datang dengan keluarga.",
    "Customer memuji kualitas finishing kamar mandi.",
    "Kunci diserahkan, foto unit dilakukan bersama customer.",
    "Infrastruktur jalan depan masih dalam proses, customer maklum.",
    "Customer langsung huni hari yang sama, sangat puas.",
    "Unit dalam kondisi sangat baik, tidak ada punch list.",
    "Serah terima formal dengan notaris, semua dokumen lengkap.",
  ];

  let hvOk = 0;
  for (let i = 0; i < Math.min(readyForHandover.length, 10); i++) {
    const unit = readyForHandover[i];
    // Cari customer yang linked ke unit ini
    let cust = customers.find(c => c.unitId === unit.id);
    if (!cust) {
      // fallback: cust yang belum punya handover
      cust = custP1[i % custP1.length];
    }
    if (!cust) { skip(`No customer for unit ${unit.id}`); continue; }
    try {
      await post("/handovers", {
        unitId: unit.id,
        customerId: cust.id,
        tanggal: tanggalList[i] || "2025-05-30",
        skorKepuasan: skorList[i] || 5,
        catatan: notaList[i] || "Serah terima berjalan lancar.",
      });
      hvOk++;
      log(`  Handover OK: unit ${unit.id} (${unit.blok}${unit.nomor}) → customer ${cust.id} (${cust.nama})`);
    } catch (e) {
      skip(`Handover unit ${unit.id}: ${e.message.slice(0, 100)}`);
    }
  }
  log(`${hvOk} handovers berhasil`);

  // ─── 3. TRAINING PARTICIPANTS (fix: pass notes to avoid empty body) ─
  console.log("\n=== 3. TRAINING PARTICIPANTS ===");
  const trainings = await get("/hr/training/programs");
  const employees = await get("/hr/employees");
  const empByCode = {};
  for (const e of employees) empByCode[e.employeeCode] = e;

  const participantMap = [
    // index berdasarkan order dari GET /hr/training/programs (descending createdAt atau ordered)
    // programs: id 1-5 dengan training[0] = id terbesar (Kepemimpinan), training[4] = id terkecil (Workshop Konstruksi)
    ["SAT-040","SAT-041","SAT-042","SAT-043"],   // Workshop Manajemen Konstruksi
    ["SAT-020","SAT-021","SAT-022"],              // Pelatihan Penjualan
    ["SAT-040","SAT-043","SAT-002"],              // Sertifikasi Green Building
    ["SAT-010","SAT-011","SAT-012"],              // Training Hukum Pertanahan
    ["SAT-040","SAT-020","SAT-030","SAT-010","SAT-050"],  // Leadership
  ];
  let partTotal = 0;

  // Trainings ordered by createdAt: the first POST was Workshop Konstruksi (id=1), dst
  // GET /hr/training/programs returns in some order — let's match by name
  const trainingByName = {};
  for (const t of trainings) trainingByName[t.name] = t;

  const namedParticipantMap = [
    ["Workshop Manajemen Konstruksi Modern", ["SAT-040","SAT-041","SAT-042","SAT-043"]],
    ["Pelatihan Penjualan Properti & KPR", ["SAT-020","SAT-021","SAT-022"]],
    ["Sertifikasi Green Building Dasar", ["SAT-040","SAT-043","SAT-002"]],
    ["Training Hukum Pertanahan Terbaru", ["SAT-010","SAT-011","SAT-012"]],
    ["Pelatihan Leadership & Team Management", ["SAT-040","SAT-020","SAT-030","SAT-010","SAT-050"]],
  ];

  for (const [name, codes] of namedParticipantMap) {
    const training = trainingByName[name];
    if (!training) { skip(`Training not found: ${name}`); continue; }
    const participantIds = codes.map(c => empByCode[c]?.id).filter(Boolean);
    try {
      // Pass notes alongside participantIds so body is not empty
      await put(`/hr/training/programs/${training.id}`, { notes: training.notes || "", participantIds });
      partTotal += participantIds.length;
      log(`  ${name}: ${participantIds.length} peserta`);
    } catch (e) {
      skip(`Training PUT ${training.id}: ${e.message.slice(0,100)}`);
    }
  }
  log(`${partTotal} training participants berhasil`);

  // ─── 4. UNIT QC CHECKLIST INIT ───────────────────────────
  console.log("\n=== 4. UNIT QC CHECKLIST INIT ===");
  const freshAgain = await get("/units");
  const highProgressUnits = freshAgain.filter(u => u.projectId === 1 && u.progress >= 80).slice(0, 25);
  log(`Units progress>=80 (P1): ${highProgressUnits.length}`);
  let qcOk = 0;
  for (const unit of highProgressUnits) {
    try {
      await post(`/produksi/qc/checklist/init/${unit.id}`, {});
      qcOk++;
    } catch (e) {
      skip(`QC init unit ${unit.id}: ${e.message.slice(0,60)}`);
    }
  }
  log(`${qcOk}/${highProgressUnits.length} unit QC checklist diinisialisasi`);

  // ─── RINGKASAN ────────────────────────────────────────────
  console.log("\n=== RINGKASAN FIX3 ===");
  console.log(`Units progress patch  : ${patchOk}`);
  console.log(`Handovers             : ${hvOk}`);
  console.log(`Training participants : ${partTotal}`);
  console.log(`Unit QC init          : ${qcOk}`);
  console.log("\n✅ FIX3 SELESAI");
}

main().catch(err => { console.error("\n❌ FIX3 GAGAL:", err.message); process.exit(1); });
