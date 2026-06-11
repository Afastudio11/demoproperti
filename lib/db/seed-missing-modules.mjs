/**
 * Seed data untuk semua sub-menu yang masih kosong:
 * - QC Defects & Reworks
 * - HR Attendance, Overtime, Individual Issues
 * - HR Competency Definitions & Scores
 * - HR Training Programs & Participants
 * - HR Expansion Needs
 * - Produksi Fasum
 * - Customer Complaints
 *
 * Jalankan dari: cd lib/db && node seed-missing-modules.mjs
 */
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = (q, p = []) => pool.query(q, p);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dateStr = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

// ─────────────────────────────────────────────────────────────────────────────
// DATA REFERENSI
// ─────────────────────────────────────────────────────────────────────────────
const PROJECTS = [
  { id: 1, name: "Gowa Residence" },
  { id: 2, name: "Maros Permai" },
  { id: 3, name: "Takalar Indah" },
  { id: 4, name: "Pangkep Sejahtera" },
  { id: 5, name: "Watampone City" },
];

const EMPLOYEES = [
  { id: 1,  name: "H. Mukhtar Salim, SE",    division: "Manajemen",           position: "Direktur Utama" },
  { id: 2,  name: "Ir. Ruslan Mappasanda",    division: "Manajemen",           position: "Direktur Teknik" },
  { id: 3,  name: "Dra. Andi Nurmiati",       division: "Manajemen",           position: "Direktur Keuangan" },
  { id: 4,  name: "Ahmad Fauzi Kadir",        division: "Sales & Marketing",   position: "Manajer Marketing" },
  { id: 5,  name: "Rahmat Saleh Dg Ngemba",   division: "Sales & Marketing",   position: "Supervisor Sales" },
  { id: 6,  name: "Dewi Sartika Arifin",      division: "Sales & Marketing",   position: "Agen Properti Senior" },
  { id: 7,  name: "Irfan Gunawan",            division: "Sales & Marketing",   position: "Agen Properti" },
  { id: 8,  name: "Nurul Aisyah",             division: "Sales & Marketing",   position: "Agen Properti" },
  { id: 9,  name: "Faisal Akbar",             division: "Sales & Marketing",   position: "Agen Properti" },
  { id: 10, name: "Sulaiman Yahya",           division: "Sales & Marketing",   position: "Digital Marketing" },
  { id: 11, name: "Siti Rahmah, SE, Ak",      division: "Keuangan & Akuntansi",position: "Manajer Keuangan" },
  { id: 12, name: "Kartini Budi",             division: "Keuangan & Akuntansi",position: "Staff Akuntansi Senior" },
  { id: 13, name: "Murniati Latif",           division: "Keuangan & Akuntansi",position: "Staff Keuangan" },
  { id: 14, name: "Andi Wijaya, SH",          division: "Legal & Perizinan",   position: "Kepala Legal" },
  { id: 15, name: "Zulkifli Rahman, SH",      division: "Legal & Perizinan",   position: "Staff Legal Senior" },
  { id: 16, name: "Budi Santoso, ST",         division: "Teknik & Konstruksi", position: "Manajer Proyek" },
  { id: 17, name: "Yusuf Prasetyo, ST",       division: "Teknik & Konstruksi", position: "Site Engineer Gowa" },
  { id: 18, name: "Syahrul Ramadhan, ST",     division: "Teknik & Konstruksi", position: "Quality Control" },
  { id: 19, name: "Hamzah Patta, ST",         division: "Teknik & Konstruksi", position: "Site Engineer Maros" },
  { id: 20, name: "Burhanuddin Ahmad",        division: "Teknik & Konstruksi", position: "Logistik Material" },
  { id: 21, name: "Nur Hidayah Ramli",        division: "Administrasi KPR",    position: "Kepala Admin KPR" },
  { id: 22, name: "Hasna Wati",               division: "Administrasi KPR",    position: "Staff Admin KPR Senior" },
  { id: 23, name: "Aminah Boru",              division: "Administrasi KPR",    position: "Staff Admin KPR" },
  { id: 24, name: "Maryam Salim, SE",         division: "Human Resources",     position: "Manajer HR" },
  { id: 25, name: "Sahruni Ambo",             division: "Human Resources",     position: "Staff HR & GA" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. QC DEFECTS
// ─────────────────────────────────────────────────────────────────────────────
async function seedQcDefects() {
  await sql("DELETE FROM qc_defects");
  const kategoriList = ["Struktur", "Finishing", "Elektrikal", "Plumbing", "Atap & Rangka"];
  const deskripsiByKat = {
    "Struktur": ["Retak rambut pada dinding", "Kolom tidak vertikal", "Plat lantai bergelombang", "Pondasi miring", "Sloof retak"],
    "Finishing": ["Cat mengelupas", "Nat keramik tidak rata", "Pintu tidak bisa menutup rapat", "Jendela macet", "Plafon gypsum berlubang"],
    "Elektrikal": ["Stop kontak mati", "MCB sering trip", "Kabel tidak tertanam rapi", "Fitting lampu longgar", "Saklar tidak berfungsi"],
    "Plumbing": ["Pipa bocor", "Kloset mampet", "Wastafel tidak drainase", "Kran air bocor", "Shower tidak berfungsi"],
    "Atap & Rangka": ["Atap bocor saat hujan", "Rangka baja ringan miring", "Spandek lepas", "Genteng bergeser", "Talang air mampet"],
  };
  const statusList = ["open", "in-progress", "closed"];
  const verifiers = ["Syahrul Ramadhan, ST", "Budi Santoso, ST", "Yusuf Prasetyo, ST", "Hamzah Patta, ST"];

  let inserted = 0;
  for (const proj of PROJECTS) {
    // ~30% defect rate = ~60 units dari 200 punya defect, rata-rata 2 defect per unit
    const defectUnitCount = rand(50, 80);
    for (let i = 0; i < defectUnitCount; i++) {
      const unitId = (proj.id - 1) * 200 + rand(1, 200);
      const defectCount = rand(1, 3);
      for (let d = 0; d < defectCount; d++) {
        const kat = pick(kategoriList);
        const deskrip = pick(deskripsiByKat[kat]);
        const status = pick([...statusList, "open", "open"]); // lebih banyak open
        const foundDate = dateStr(2025, rand(10, 12), rand(1, 28));
        await sql(
          `INSERT INTO qc_defects (unit_id, kategori, deskripsi, status, verified_by) VALUES ($1,$2,$3,$4,$5)`,
          [unitId, kat, deskrip, status, status === "closed" ? pick(verifiers) : null]
        );
        inserted++;
      }
    }
  }
  console.log(`QC Defects: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REWORKS (produksi/qc/reworks)
// ─────────────────────────────────────────────────────────────────────────────
async function seedReworks() {
  await sql("DELETE FROM reworks");
  const subkons = [
    "CV Bangunan Jaya Sulsel", "CV Mitra Finishing Makassar",
    "UD Listrik Andalan Sulsel", "CV Plumbing Prima Sulsel", "CV Atap Kuda-Kuda Makassar"
  ];
  const pekerjaanItems = [
    "Plesteran dinding", "Pengecatan", "Pasang keramik", "Instalasi listrik",
    "Instalasi air bersih", "Pasang atap", "Cor sloof", "Pasang pintu/jendela",
    "Pasang plafon", "Pasang sanitasi"
  ];
  const statusList = ["open", "in_progress", "done"];

  let inserted = 0;
  for (const proj of PROJECTS) {
    const reworkCount = rand(20, 40);
    for (let i = 0; i < reworkCount; i++) {
      const unitId = (proj.id - 1) * 200 + rand(1, 200);
      const subkon = pick(subkons);
      const status = pick([...statusList, "open"]);
      const foundDate = dateStr(2025, rand(10, 12), rand(1, 28));
      const target = dateStr(2026, rand(1, 3), rand(1, 28));
      const actual = status === "done" ? dateStr(2026, rand(1, 4), rand(1, 28)) : null;
      await sql(
        `INSERT INTO reworks (unit_id, subkon_name, pekerjaan_item, description, found_date, target_completion, actual_completion, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [unitId, subkon, pick(pekerjaanItems), `Perbaikan ${pick(pekerjaanItems).toLowerCase()} tidak memenuhi standar QC`, foundDate, target, actual, status]
      );
      inserted++;
    }
  }
  console.log(`Reworks: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HR ATTENDANCE RECORDS
// ─────────────────────────────────────────────────────────────────────────────
async function seedAttendance() {
  await sql("DELETE FROM hr_attendance_records");
  const statusList = ["hadir", "hadir", "hadir", "hadir", "izin", "sakit", "alpha", "cuti"];
  const projectNames = ["Gowa Residence", "Maros Permai", "Takalar Indah", "Pangkep Sejahtera", "Watampone City"];
  const months = [
    { year: 2026, month: "Maret", m: 3, days: 21 },
    { year: 2026, month: "April", m: 4, days: 22 },
    { year: 2026, month: "Mei",   m: 5, days: 21 },
    { year: 2026, month: "Juni",  m: 6, days: 10 }, // partial
  ];

  const records = [];
  for (const emp of EMPLOYEES) {
    const project = emp.division === "Teknik & Konstruksi"
      ? pick(projectNames) : null;
    for (const { year, month, m, days } of months) {
      for (let day = 1; day <= days; day++) {
        records.push({ employeeName: emp.name, project, month, year, day, status: pick(statusList) });
      }
    }
  }

  // Insert in batches
  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    for (const r of batch) {
      await sql(
        `INSERT INTO hr_attendance_records (employee_name, project, month, year, day, status) VALUES ($1,$2,$3,$4,$5,$6)`,
        [r.employeeName, r.project, r.month, r.year, r.day, r.status]
      );
      inserted++;
    }
  }
  console.log(`HR Attendance: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HR OVERTIME RECORDS
// ─────────────────────────────────────────────────────────────────────────────
async function seedOvertime() {
  await sql("DELETE FROM hr_overtime_records");
  const months = [
    { year: 2026, month: "April", m: 4 },
    { year: 2026, month: "Mei",   m: 5 },
    { year: 2026, month: "Juni",  m: 6 },
  ];
  const projectNames = ["Gowa Residence", "Maros Permai", "Takalar Indah"];

  let inserted = 0;
  // Teknik & konstruksi lebih sering lembur
  for (const emp of EMPLOYEES) {
    const hasDailyData = rand(0, 10) < 7; // 70% karyawan punya data
    if (!hasDailyData) continue;
    const project = emp.division === "Teknik & Konstruksi" ? pick(projectNames) : null;

    for (const { year, month } of months) {
      const overtimeDays = rand(0, 8);
      const lateDays = rand(0, 6);
      const daysSet = new Set();

      for (let i = 0; i < overtimeDays + lateDays; i++) {
        daysSet.add(rand(1, 22));
      }

      for (const day of daysSet) {
        const isOvertime = rand(0, 1) === 1;
        const terlambat = isOvertime ? 0 : rand(5, 45);
        const lembur = isOvertime ? (rand(1, 4) + rand(0, 1) * 0.5).toString() : "0";
        await sql(
          `INSERT INTO hr_overtime_records (employee_name, project, month, year, day, terlambat_menit, lembur_jam) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [emp.name, project, month, year, day, terlambat, lembur]
        );
        inserted++;
      }
    }
  }
  console.log(`HR Overtime: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HR INDIVIDUAL ISSUES (tambah dari 3)
// ─────────────────────────────────────────────────────────────────────────────
async function seedIndividualIssues() {
  await sql("DELETE FROM hr_individual_issues");
  const masalahList = [
    "Tidak hadir tanpa keterangan 3 hari berturut-turut",
    "Konflik dengan rekan kerja di lapangan",
    "Performa penjualan di bawah target 3 bulan berturut-turut",
    "Keterlambatan masuk kerja berulang (>5x dalam sebulan)",
    "Penggunaan material tidak sesuai SOP",
    "Laporan progres tidak diserahkan tepat waktu",
    "Keluhan customer terkait sikap tidak profesional",
    "Dugaan pelanggaran kode etik dengan vendor",
    "Absensi tanpa izin di hari Senin",
    "Tidak menghadiri rapat mandatory tanpa pemberitahuan",
  ];
  const solusiList = [
    "Pemanggilan dan peringatan lisan",
    "Surat Peringatan I (SP-1)",
    "Coaching dan pembinaan oleh Manajer",
    "Mediasi oleh HR dan Manajer terkait",
    "Training ulang prosedur SOP",
    "Mutasi penugasan ke proyek lain",
    "Evaluasi KPI dan rencana perbaikan",
    "Diskusi goal setting ulang bersama atasan",
  ];

  let inserted = 0;
  for (const proj of PROJECTS) {
    const issueCount = rand(4, 8);
    for (let i = 0; i < issueCount; i++) {
      const emp = pick(EMPLOYEES);
      const tanggal = dateStr(2026, rand(1, 6), rand(1, 28));
      const deadline = dateStr(2026, rand(3, 7), rand(1, 28));
      await sql(
        `INSERT INTO hr_individual_issues (project, tanggal, divisi, nama, masalah, solusi, deadline, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [proj.name, tanggal, emp.division, emp.name, pick(masalahList), pick(solusiList), deadline, pick(["Sedang ditindaklanjuti", "Selesai ditangani", "Dalam evaluasi", "Diproses HR"])]
      );
      inserted++;
    }
  }
  console.log(`HR Individual Issues: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HR COMPETENCY DEFINITIONS & SCORES
// ─────────────────────────────────────────────────────────────────────────────
async function seedCompetency() {
  await sql("DELETE FROM hr_competency_scores");
  await sql("DELETE FROM hr_competency_definitions");

  const definitions = [
    // Manajemen
    { position: "Direktur Utama",      division: "Manajemen",           competencyName: "Strategic Leadership",    description: "Kemampuan memimpin dan merumuskan strategi bisnis jangka panjang" },
    { position: "Direktur Teknik",     division: "Manajemen",           competencyName: "Technical Decision Making",description: "Kemampuan pengambilan keputusan teknis konstruksi yang tepat" },
    { position: "Direktur Keuangan",   division: "Manajemen",           competencyName: "Financial Acumen",         description: "Pemahaman mendalam tentang keuangan dan akuntansi properti" },
    // Sales
    { position: "Manajer Marketing",   division: "Sales & Marketing",   competencyName: "Marketing Strategy",       description: "Kemampuan merancang dan mengeksekusi strategi pemasaran" },
    { position: "Supervisor Sales",    division: "Sales & Marketing",   competencyName: "Team Coaching",            description: "Kemampuan membimbing dan meningkatkan performa tim sales" },
    { position: "Agen Properti Senior",division: "Sales & Marketing",   competencyName: "Client Negotiation",       description: "Negosiasi dan closing deal dengan calon pembeli" },
    { position: "Agen Properti",       division: "Sales & Marketing",   competencyName: "Product Knowledge",        description: "Pengetahuan mendalam tentang produk dan lokasi proyek" },
    { position: "Digital Marketing",   division: "Sales & Marketing",   competencyName: "Digital Campaign Management",description: "Pengelolaan kampanye digital: Meta Ads, Google, konten" },
    // Teknik
    { position: "Manajer Proyek",      division: "Teknik & Konstruksi", competencyName: "Project Management",       description: "Manajemen jadwal, biaya, dan kualitas konstruksi" },
    { position: "Site Engineer",       division: "Teknik & Konstruksi", competencyName: "Construction Supervision", description: "Pengawasan pelaksanaan konstruksi di lapangan" },
    { position: "Quality Control",     division: "Teknik & Konstruksi", competencyName: "QC & Inspection",         description: "Pemeriksaan kualitas bangunan sesuai standar" },
    { position: "Logistik Material",   division: "Teknik & Konstruksi", competencyName: "Material Management",     description: "Pengelolaan pengadaan dan stok material konstruksi" },
    // Keuangan
    { position: "Manajer Keuangan",    division: "Keuangan & Akuntansi",competencyName: "Financial Reporting",      description: "Penyusunan laporan keuangan dan analisis profitabilitas" },
    { position: "Staff Akuntansi Senior",division: "Keuangan & Akuntansi",competencyName: "Tax & Compliance",      description: "Kepatuhan pajak dan regulasi keuangan properti" },
    // Legal
    { position: "Kepala Legal",        division: "Legal & Perizinan",   competencyName: "Property Law",            description: "Hukum properti, perizinan, dan sengketa lahan" },
    // KPR
    { position: "Kepala Admin KPR",    division: "Administrasi KPR",    competencyName: "KPR Process Management",  description: "Manajemen proses pengajuan KPR dari awal hingga akad" },
    // HR
    { position: "Manajer HR",          division: "Human Resources",     competencyName: "Talent Development",      description: "Pengembangan kompetensi dan karir karyawan" },
  ];

  const defMap = {};
  for (const d of definitions) {
    const { rows } = await sql(
      `INSERT INTO hr_competency_definitions (position, division, competency_name, description) VALUES ($1,$2,$3,$4) RETURNING id`,
      [d.position, d.division, d.competencyName, d.description]
    );
    const key = `${d.position}__${d.division}`;
    defMap[key] = rows[0].id;
  }
  console.log(`HR Competency Definitions: ${definitions.length} records`);

  // Scores: setiap karyawan dinilai berdasarkan posisinya
  let scoreInserted = 0;
  for (const emp of EMPLOYEES) {
    const key = `${emp.position}__${emp.division}`;
    let defId = defMap[key];
    if (!defId) {
      // fallback: cari berdasarkan division
      const divKey = Object.keys(defMap).find(k => k.endsWith(`__${emp.division}`));
      defId = divKey ? defMap[divKey] : Object.values(defMap)[0];
    }
    // 2 penilaian: pertengahan dan akhir tahun
    for (const period of [{ year: 2025, date: "2025-06-30" }, { year: 2026, date: "2026-01-31" }]) {
      const score = rand(2, 4); // 1=tidak kompeten, 2=cukup, 3=kompeten, 4=sangat kompeten
      await sql(
        `INSERT INTO hr_competency_scores (employee_id, competency_definition_id, actual_score, assessment_date, assessor) VALUES ($1,$2,$3,$4,$5)`,
        [emp.id, defId, score, period.date, "Maryam Salim, SE"]
      );
      scoreInserted++;
    }
  }
  console.log(`HR Competency Scores: ${scoreInserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. HR TRAINING PROGRAMS & PARTICIPANTS
// ─────────────────────────────────────────────────────────────────────────────
async function seedTraining() {
  await sql("DELETE FROM hr_training_participants");
  await sql("DELETE FROM hr_training_programs");

  const programs = [
    { name: "Pelatihan Manajemen Proyek Properti",    type: "teknis",        organizer: "LPJK Sulsel",       date: "2025-08-15", status: "selesai",       targetDiv: "Teknik & Konstruksi", headcount: 5 },
    { name: "Workshop Digital Marketing Properti",    type: "fungsional",    organizer: "IDM Academy",       date: "2025-09-20", status: "selesai",       targetDiv: "Sales & Marketing",   headcount: 6 },
    { name: "Pelatihan KPR dan Proses Bank",          type: "fungsional",    organizer: "Bank BTN",          date: "2025-10-10", status: "selesai",       targetDiv: "Administrasi KPR",    headcount: 3 },
    { name: "Sertifikasi QC Bangunan",                type: "teknis",        organizer: "Pusdiklat PU",      date: "2025-11-05", status: "selesai",       targetDiv: "Teknik & Konstruksi", headcount: 3 },
    { name: "Training Leadership & People Management",type: "soft_skill",    organizer: "Prasetya Mulya",    date: "2026-01-20", status: "selesai",       targetDiv: "Manajemen",           headcount: 4 },
    { name: "Pelatihan Analisis Keuangan Properti",   type: "fungsional",    organizer: "ISPI",              date: "2026-02-25", status: "selesai",       targetDiv: "Keuangan & Akuntansi",headcount: 3 },
    { name: "Workshop Hukum Pertanahan & Perizinan",  type: "teknis",        organizer: "Kanwil BPN Sulsel", date: "2026-03-15", status: "selesai",       targetDiv: "Legal & Perizinan",   headcount: 2 },
    { name: "Training Teknik Negosiasi & Closing",    type: "soft_skill",    organizer: "SalesBrain ID",     date: "2026-04-12", status: "selesai",       targetDiv: "Sales & Marketing",   headcount: 6 },
    { name: "Sertifikasi K3 Konstruksi",              type: "teknis",        organizer: "Kemnaker RI",       date: "2026-06-20", status: "direncanakan",  targetDiv: "Teknik & Konstruksi", headcount: 5 },
    { name: "Training HR Generalist",                 type: "fungsional",    organizer: "PPM Manajemen",     date: "2026-07-10", status: "direncanakan",  targetDiv: "Human Resources",     headcount: 2 },
  ];

  let progInserted = 0;
  let partInserted = 0;

  for (const prog of programs) {
    const { rows } = await sql(
      `INSERT INTO hr_training_programs (name, type, training_date, organizer, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [prog.name, prog.type, prog.date, prog.organizer, prog.status]
    );
    const trainingId = rows[0].id;
    progInserted++;

    // Tambahkan peserta dari divisi target
    const divEmps = EMPLOYEES.filter(e => e.division === prog.targetDiv);
    const participants = divEmps.slice(0, Math.min(prog.headcount, divEmps.length));
    for (const emp of participants) {
      await sql(
        `INSERT INTO hr_training_participants (training_id, employee_id) VALUES ($1,$2)`,
        [trainingId, emp.id]
      );
      partInserted++;
    }
  }
  console.log(`HR Training Programs: ${progInserted}, Participants: ${partInserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. HR EXPANSION NEEDS
// ─────────────────────────────────────────────────────────────────────────────
async function seedExpansionNeeds() {
  await sql("DELETE FROM hr_expansion_needs");
  const needs = [
    { projectName: "Watampone City",    positionName: "Site Engineer",          headcount: 2, timeline: "2026-Q3", reason: "Pembukaan proyek baru Bone" },
    { projectName: "Watampone City",    positionName: "Agen Properti",          headcount: 5, timeline: "2026-Q3", reason: "Target penjualan 200 unit dalam 18 bulan" },
    { projectName: "Watampone City",    positionName: "Staff Admin KPR",        headcount: 2, timeline: "2026-Q3", reason: "Volume pengajuan KPR diperkirakan tinggi" },
    { projectName: "Ekspansi Bone",     positionName: "Manajer Proyek",         headcount: 1, timeline: "2026-Q4", reason: "Persiapan ekspansi ke Kabupaten Bone" },
    { projectName: "Ekspansi Bone",     positionName: "Site Engineer",          headcount: 2, timeline: "2026-Q4", reason: "Dua cluster akan dibangun paralel" },
    { projectName: "Ekspansi Bone",     positionName: "Quantity Surveyor",      headcount: 1, timeline: "2026-Q4", reason: "Pengendalian RAB dan estimasi biaya" },
    { projectName: "Ekspansi Jeneponto",positionName: "Agen Properti",          headcount: 3, timeline: "2027-Q1", reason: "Ekspansi pasar Jeneponto-Bantaeng" },
    { projectName: "Semua Proyek",      positionName: "Logistik Material",      headcount: 2, timeline: "2026-Q3", reason: "Peningkatan volume material 5 proyek aktif" },
    { projectName: "Semua Proyek",      positionName: "Staff HR & GA",          headcount: 1, timeline: "2026-Q3", reason: "Support kebutuhan SDM yang berkembang" },
    { projectName: "Semua Proyek",      positionName: "Staff Keuangan",         headcount: 1, timeline: "2026-Q3", reason: "Peningkatan volume transaksi keuangan" },
  ];

  for (const n of needs) {
    await sql(
      `INSERT INTO hr_expansion_needs (project_name, position_name, headcount) VALUES ($1,$2,$3)`,
      [n.projectName, n.positionName, n.headcount]
    );
  }
  console.log(`HR Expansion Needs: ${needs.length} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. PRODUKSI FASUM
// ─────────────────────────────────────────────────────────────────────────────
async function seedFasum() {
  await sql("DELETE FROM fasum_progress");
  const fasumTypes = ["Jalan", "Drainase", "Taman", "IPAL", "Masjid", "Gorong-gorong", "Gerbang & Pagar"];

  // Progress berbeda per proyek (yang sudah lama lebih maju)
  const projectProgress = {
    1: { min: 70, max: 100 }, // Gowa - paling maju
    2: { min: 60, max: 95  }, // Maros
    3: { min: 40, max: 80  }, // Takalar
    4: { min: 20, max: 60  }, // Pangkep
    5: { min: 5,  max: 30  }, // Watampone - baru mulai
  };

  let inserted = 0;
  for (const proj of PROJECTS) {
    const range = projectProgress[proj.id];
    for (const fasumType of fasumTypes) {
      const progress = rand(range.min, range.max);
      await sql(
        `INSERT INTO fasum_progress (project_id, stage_code, fasum_type, progress_percent, notes, updated_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [proj.id, "STAGE_A", fasumType, progress, `Progres ${fasumType} proyek ${proj.name}`, "Budi Santoso, ST"]
      );
      inserted++;
    }
  }
  console.log(`Fasum Progress: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. CUSTOMER COMPLAINTS
// ─────────────────────────────────────────────────────────────────────────────
async function seedComplaints() {
  await sql("DELETE FROM customer_complaints");

  const categories = ["Bangunan", "Dokumen KPR", "Fasilitas Umum", "Layanan", "Legal", "Biaya"];
  const complaintsByCategory = {
    "Bangunan": [
      "Atap rumah bocor saat hujan deras",
      "Cat dinding mengelupas setelah serah terima",
      "Pintu tidak bisa dikunci dengan benar",
      "Keramik lantai terdapat retak pada beberapa titik",
      "Stop kontak listrik tidak berfungsi di ruang tamu",
    ],
    "Dokumen KPR": [
      "Dokumen SHM belum diterima lebih dari 6 bulan setelah akad",
      "IMB belum diserahkan padahal sudah 3 bulan dari serah terima",
      "AJB tidak sesuai dengan luas yang tercantum di brosur",
      "Proses balik nama HGB memakan waktu sangat lama",
    ],
    "Fasilitas Umum": [
      "Jalan lingkungan masih belum diaspal",
      "Drainase tersumbat menyebabkan genangan saat hujan",
      "Taman bermain belum dilengkapi peralatan",
      "Masjid belum bisa digunakan karena pembangunan belum selesai",
    ],
    "Layanan": [
      "Tidak ada respon dari developer dalam 2 minggu",
      "Staff kurang ramah saat mengajukan komplain",
      "Permintaan perbaikan tidak ditindaklanjuti",
    ],
    "Legal": [
      "SHGB belum terbit padahal sudah 1 tahun setelah akad",
      "Perubahan luas pada IMB tanpa pemberitahuan",
    ],
    "Biaya": [
      "Tagihan biaya perawatan tidak sesuai kesepakatan",
      "Denda keterlambatan yang tidak wajar",
    ],
  };

  const severities = ["ringan", "ringan", "sedang", "sedang", "berat"];
  const pics = ["Budi Santoso, ST", "Nur Hidayah Ramli", "Andi Wijaya, SH", "Syahrul Ramadhan, ST"];

  let inserted = 0;
  for (const proj of PROJECTS) {
    const complaintCount = rand(12, 20);
    // Get customer IDs for this project
    const { rows: customers } = await sql("SELECT id FROM customers WHERE project_id = $1 LIMIT 50", [proj.id]);
    if (customers.length === 0) continue;

    for (let i = 0; i < complaintCount; i++) {
      const cat = pick(categories);
      const complaint = pick(complaintsByCategory[cat]);
      const severity = pick(severities);
      const status = pick(["belum", "proses", "proses", "selesai", "selesai"]);
      const createdDate = dateStr(2025, rand(10, 12), rand(1, 28));
      const deadline = dateStr(2026, rand(1, 4), rand(1, 28));
      const completed = status === "selesai" ? dateStr(2026, rand(1, 5), rand(1, 28)) : null;
      const customer = pick(customers);
      const unitBlock = `Blok ${pick(["A","B","C","D"])}/${rand(1,50)}`;

      await sql(
        `INSERT INTO customer_complaints (project_id, unit_block, customer_id, complaint, category, severity, pic, deadline, status, completed_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [proj.id, unitBlock, customer.id, complaint, cat, severity, pick(pics), deadline, status, completed, `Komplain diterima ${createdDate}`]
      );
      inserted++;
    }
  }
  console.log(`Customer Complaints: ${inserted} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. PLANNING LAND BANK & EXPANSION
// ─────────────────────────────────────────────────────────────────────────────
async function seedPlanningLandBankAndExpansion() {
  await sql("DELETE FROM planning_land_bank");
  await sql("DELETE FROM planning_expansion");

  const landBanks = [
    { projectId: 1, name: "Lahan Cadangan Gowa Cluster B", status: "land_bank", landArea: 4500, availableUnits: 32, acquisitionPrice: 2800000000, targetStartDate: "2026-08-01", notes: "Lahan siap bangun berbatasan dengan cluster A" },
    { projectId: 2, name: "Lahan Ekspansi Maros Utara", status: "in_progress", landArea: 6000, availableUnits: 45, acquisitionPrice: 3900000000, targetStartDate: "2026-10-15", notes: "Sedang dalam tahap penyelesaian legalitas sertifikat" },
    { projectId: 3, name: "Lahan Strategis Takalar Selatan", status: "land_bank", landArea: 7500, availableUnits: 55, acquisitionPrice: 4800000000, targetStartDate: "2027-03-01", notes: "Lahan datar, dekat dengan rencana jalan lingkar" },
    { projectId: 4, name: "Lahan Makassar Manggala Tahap 2", status: "on_hold", landArea: 3800, availableUnits: 28, acquisitionPrice: 5500000000, targetStartDate: "2027-06-01", notes: "Menunggu penyelesaian infrastruktur jalan utama" },
  ];

  for (const lb of landBanks) {
    await sql(
      `INSERT INTO planning_land_bank (project_id, name, status, land_area, available_units, acquisition_price, target_start_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [lb.projectId, lb.name, lb.status, lb.landArea, lb.availableUnits, lb.acquisitionPrice, lb.targetStartDate, lb.notes]
    );
  }

  const expansions = [
    { scenarioName: "Ekspansi Agresif Gowa-Maros", description: "Membuka 3 cluster baru secara paralel dengan pendanaan KPP penuh", estimatedRoi: 38.5, riskScore: 65, cashflowImpact: "Beban cashflow tinggi di 6 bulan pertama, namun recovery cepat setelah launching", sdmScore: 80, sopScore: 90, dashboardScore: 100 },
    { scenarioName: "Ekspansi Konservatif Makassar", description: "Fokus pada 1 cluster premium di Makassar dengan pendanaan mandiri bertahap", estimatedRoi: 24.2, riskScore: 25, cashflowImpact: "Sangat aman bagi cashflow perusahaan, risiko likuiditas minimal", sdmScore: 90, sopScore: 95, dashboardScore: 100 },
    { scenarioName: "Ekspansi Moderat Bosowasip", description: "Ekspansi ke wilayah Bone dan Wajo menggunakan kemitraan land-owner (bagi hasil)", estimatedRoi: 32.8, riskScore: 45, cashflowImpact: "Cashflow moderat, pembagian bagi hasil mengurangi profit margin namun mengamankan dana awal", sdmScore: 75, sopScore: 85, dashboardScore: 90 },
  ];

  for (const exp of expansions) {
    await sql(
      `INSERT INTO planning_expansion (scenario_name, description, estimated_roi, risk_score, cashflow_impact, sdm_score, sop_score, dashboard_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [exp.scenarioName, exp.description, exp.estimatedRoi, exp.riskScore, exp.cashflowImpact, exp.sdmScore, exp.sopScore, exp.dashboardScore]
    );
  }

  console.log(`Planning Land Bank: ${landBanks.length} records, Planning Expansion: ${expansions.length} records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Mulai seed missing modules...\n");
  try {
    await seedQcDefects();
    await seedReworks();
    await seedAttendance();
    await seedOvertime();
    await seedIndividualIssues();
    await seedCompetency();
    await seedTraining();
    await seedExpansionNeeds();
    await seedFasum();
    await seedComplaints();
    await seedPlanningLandBankAndExpansion();
    console.log("\nSemua seed selesai!");
  } catch (e) {
    console.error("Error:", e.message);
    throw e;
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
