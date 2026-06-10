/**
 * SEED KOMPREHENSIF - 5 Proyek @ 200 Unit
 * Mencakup: Land, Legal, Planning, Marketing, KPR, Construction, QC, Material,
 *           Subkon, Handover, HR, Finance
 */
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const r = async (sql, p = []) => {
  const c = await pool.connect();
  try { return await c.query(sql, p); } finally { c.release(); }
};

const rr = async (sql, p = []) => {
  try { return await r(sql, p); } catch (e) { return { rows: [] }; }
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const pct = (val, base) => +(val / base * 100).toFixed(2);
const fmt = (n) => n.toFixed(2);

const namaList = [
  "Andi Kurniawan","Budi Setiawan","Sari Dewi","Hasan Basri","Nur Hidayah",
  "Rahmat Saleh","Fatima Zahra","Ibrahim Ali","Dewi Sartika","Muhammad Ridwan",
  "Yusuf Prasetyo","Aminah Boru","Bahar Lahuddin","Zulkifli Rahman","Hasna Wati",
  "Irfan Gunawan","Maryam Salim","Syahrul Ramadhan","Kartini Budi","Faisal Akbar",
  "Rudi Hartono","Sri Mulyani","Agus Salim","Nurul Aisyah","Sulaiman Yahya",
  "Arifin Hakim","Rahmawati Nur","Taufik Hidayat","Marlina Dewi","Hamzah Patta",
  "Sahruni Ambo","Jusniati Lewa","Muh. Amin Syam","Halimah Tusa'diyah","Arifuddin Said",
  "Nurhayati Ramli","Burhanuddin Ahmad","Wahyuni Kadir","Rusli Mappasanda","Surianti Bakri",
  "Dg Ngemba","Dg Kanang","Dg Mangung","Dg Rewa","Dg Bella",
  "Kamaruddin Lopa","Syamsiah Djafar","Abd. Hamid Dg Muntu","Murniati Latif","Firdaus Tahir",
];
const pekerjaan = ["PNS","TNI/POLRI","Karyawan Swasta","Wirausaha","Dokter","Guru","Petani","Perawat","Polri","Dosen"];
const bankList = ["BTN Syariah","Bank BTN","Bank BRI","Bank BSI","Bank Mandiri","Bank BNI","Bank Sulselbar"];
const sources = ["instagram","facebook","referral","pameran","whatsapp","tiktok","brosur","walk_in","youtube","spanduk"];

// ─── CLEAR ALL ────────────────────────────────────────────────────────────────
async function clearAll() {
  console.log("🧹 Membersihkan data lama...");
  const tables = [
    "hr_flight_risk_records","hr_succession_plans","hr_productivity_records",
    "hr_workload_records","hr_culture_records","hr_compensation_records",
    "hr_training_participants","hr_training_programs","hr_competency_scores",
    "hr_competency_definitions","hr_kpi_records","hr_kpi_definitions",
    "hr_recruitment_candidates","hr_recruitment_needs","hr_expansion_needs",
    "hr_career_paths","hr_attendance_records","hr_overtime_records","hr_individual_issues",
    "hr_employees",
    "finance_alerts","finance_receivable_records","finance_debt_records",
    "finance_kpp_payments","finance_kpp_facilities","finance_rab_items",
    "finance_cashflow_records","finance_uploads","finance_expansion_analyses","finance_audit_findings",
    "handovers","unit_qc","reworks","construction_tasks",
    "prod_material_out","prod_material_in","prod_material_master",
    "subkon_payments","payment_approvals","subkon_contracts",
    "ht_records","akad_records","sp3k_records","ots_records",
    "bank_submissions","customer_documents","customer_status_history",
    "customer_complaints","customers",
    "leads","campaigns","branding_kpi","competitors","marketing_absorption",
    "monthly_targets","permit_documents","legal_issues","shm_splits",
    "land_stages","legal_documents","land_prospects",
    "planning_cashflow","planning_milestones","planning_sdm","planning_kpp",
    "planning_feasibility","planning_product","planning_land","planning_market",
    "planning_landbank","expansion_targets","feasibility_studies",
    "fasum_progress","units","banks","projects",
  ];
  for (const t of tables) {
    await rr(`DELETE FROM ${t}`);
    await rr(`ALTER SEQUENCE IF EXISTS ${t}_id_seq RESTART WITH 1`);
  }
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
async function seedProjects() {
  console.log("🏗️  Seed: Projects (5 proyek, 200 unit masing-masing)...");
  const projects = [
    {
      nama:"Griya Sejahtera Gowa", lokasi:"Jl. Poros Malino Km 15, Kel. Maccini Baji, Gowa",
      provinsi:"Sulawesi Selatan", kabupaten:"Gowa", kecamatan:"Somba Opu", desa:"Maccini Baji",
      luas:25000, total_unit:200, fase:"CONSTRUCTION", status:"active",
      target_start:"2023-07-01", target_end:"2026-06-30", lat:-5.2042, lng:119.4572,
    },
    {
      nama:"Permata Maros Residence", lokasi:"Jl. Poros Makassar-Maros Km 22, Maros",
      provinsi:"Sulawesi Selatan", kabupaten:"Maros", kecamatan:"Turikale", desa:"Pettuadae",
      luas:20000, total_unit:200, fase:"MARKETING", status:"active",
      target_start:"2024-01-01", target_end:"2026-12-31", lat:-5.0072, lng:119.5799,
    },
    {
      nama:"Bukit Indah Takalar", lokasi:"Jl. Poros Takalar Km 38, Kel. Takalar",
      provinsi:"Sulawesi Selatan", kabupaten:"Takalar", kecamatan:"Pattallassang", desa:"Takalar",
      luas:18000, total_unit:200, fase:"LAND", status:"active",
      target_start:"2025-06-01", target_end:"2028-06-30", lat:-5.4333, lng:119.3917,
    },
    {
      nama:"Mutiara Pangkep Residence", lokasi:"Jl. Trans Sulawesi Km 58, Pangkep",
      provinsi:"Sulawesi Selatan", kabupaten:"Pangkajene dan Kepulauan", kecamatan:"Pangkajene", desa:"Tekolabbua",
      luas:22000, total_unit:200, fase:"LEGAL", status:"active",
      target_start:"2025-01-01", target_end:"2027-12-31", lat:-4.8264, lng:119.5311,
    },
    {
      nama:"Grand Watampone", lokasi:"Jl. Watampone By Pass Km 4, Bone",
      provinsi:"Sulawesi Selatan", kabupaten:"Bone", kecamatan:"Tanete Riattang", desa:"Watampone",
      luas:28000, total_unit:200, fase:"PLANNING", status:"active",
      target_start:"2025-09-01", target_end:"2028-12-31", lat:-4.5366, lng:120.3269,
    },
  ];
  const ids = [];
  for (const p of projects) {
    const res = await r(
      `INSERT INTO projects (nama,lokasi,provinsi,kabupaten,kecamatan,desa,luas,total_unit,fase,status,target_start,target_end,lat,lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [p.nama,p.lokasi,p.provinsi,p.kabupaten,p.kecamatan,p.desa,p.luas,p.total_unit,p.fase,p.status,p.target_start,p.target_end,p.lat,p.lng]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

// ─── BANKS ───────────────────────────────────────────────────────────────────
async function seedBanks() {
  console.log("🏦 Seed: Banks...");
  const banks = [
    { name:"BTN Syariah", code:"BTN_SYARIAH" },
    { name:"Bank BTN", code:"BTN" },
    { name:"Bank BRI", code:"BRI" },
    { name:"Bank Mandiri", code:"MANDIRI" },
    { name:"Bank BNI", code:"BNI" },
    { name:"Bank BSI", code:"BSI" },
    { name:"Bank Sulselbar", code:"SULSELBAR" },
  ];
  for (const b of banks) {
    await rr(`INSERT INTO banks (name,code,is_active) VALUES ($1,$2,true)`, [b.name, b.code]);
  }
}

// ─── LAND PROSPECTS ──────────────────────────────────────────────────────────
async function seedLandProspects(pids) {
  console.log("🌍 Seed: Land Prospects...");
  const prospects = [
    // Gowa - Proyek 1 - sudah dibeli
    { pid:pids[0], lokasi:"Lahan Eks Perkebunan Blok Barat, Gowa", luas:12500, hm2:820000, status:"selesai", roi:22.5, margin:18.3, risk:"low", kab:"Gowa", kec:"Somba Opu", lat:-5.2042, lng:119.4572 },
    { pid:pids[0], lokasi:"Lahan Eks Sawah Blok Timur, Gowa", luas:12500, hm2:850000, status:"selesai", roi:21.8, margin:17.6, risk:"low", kab:"Gowa", kec:"Bontomarannu", lat:-5.2110, lng:119.4680 },
    // Maros - Proyek 2 - sudah dibeli
    { pid:pids[1], lokasi:"Tanah Sawah Pinggir Jalan Poros Maros", luas:10000, hm2:620000, status:"selesai", roi:19.8, margin:15.6, risk:"low", kab:"Maros", kec:"Turikale", lat:-5.0072, lng:119.5799 },
    { pid:pids[1], lokasi:"Kavling Belakang Pasar Maros", luas:10000, hm2:650000, status:"selesai", roi:20.1, margin:16.2, risk:"low", kab:"Maros", kec:"Maros Baru", lat:-5.0215, lng:119.6022 },
    // Takalar - Proyek 3 - sedang akuisisi (masalah)
    { pid:pids[2], lokasi:"Lahan Strategis Depan RSUD Takalar", luas:9000, hm2:710000, status:"negosiasi", roi:24.1, margin:20.7, risk:"medium", kab:"Takalar", kec:"Pattallassang", lat:-5.4201, lng:119.4088 },
    { pid:pids[2], lokasi:"Tanah Eks Tambak Takalar Utara", luas:9000, hm2:680000, status:"due_diligence", roi:21.3, margin:17.1, risk:"high", kab:"Takalar", kec:"Polombangkeng Utara", lat:-5.3998, lng:119.4200 },
    // Pangkep - Proyek 4 - sedang legal
    { pid:pids[3], lokasi:"Lahan Dekat Jalan Nasional Pangkep", luas:11000, hm2:560000, status:"disetujui", roi:21.4, margin:17.8, risk:"medium", kab:"Pangkajene dan Kepulauan", kec:"Bungoro", lat:-4.8788, lng:119.5889 },
    { pid:pids[3], lokasi:"Kavling Belakang Pasar Sentral Pangkep", luas:11000, hm2:590000, status:"disetujui", roi:20.8, margin:16.5, risk:"medium", kab:"Pangkajene dan Kepulauan", kec:"Pangkajene", lat:-4.8264, lng:119.5311 },
    // Watampone - Proyek 5 - baru prospek
    { pid:pids[4], lokasi:"Lahan Strategis Pinggir Jalan By Pass Bone", luas:14000, hm2:480000, status:"survey", roi:25.6, margin:21.2, risk:"medium", kab:"Bone", kec:"Tanete Riattang", lat:-4.5366, lng:120.3269 },
    { pid:pids[4], lokasi:"Lahan Eks Pertanian Bone Timur", luas:14000, hm2:460000, status:"prospek_baru", roi:27.1, margin:22.8, risk:"high", kab:"Bone", kec:"Tanete Riattang Timur", lat:-4.5500, lng:120.3500 },
    // Prospek tanpa project (pipeline)
    { pid:null, lokasi:"Lahan Potensial Sidrap Tengah", luas:8000, hm2:420000, status:"prospek_baru", roi:28.3, margin:23.5, risk:"high", kab:"Sidenreng Rappang", kec:"Maritenggae", lat:-3.9168, lng:119.8598 },
    { pid:null, lokasi:"Tanah Kosong Jeneponto Barat", luas:6500, hm2:380000, status:"prospek_baru", roi:25.6, margin:21.2, risk:"medium", kab:"Jeneponto", kec:"Binamu", lat:-5.6782, lng:119.7428 },
    { pid:null, lokasi:"Kavling Industri Pinggiran Makassar", luas:5000, hm2:950000, status:"survey", roi:18.4, margin:14.5, risk:"low", kab:"Gowa", kec:"Somba Opu", lat:-5.1800, lng:119.4200 },
  ];
  for (const lp of prospects) {
    await rr(
      `INSERT INTO land_prospects (project_id,lokasi,luas,harga_m2,status,roi,margin,risk_level,kabupaten,kecamatan,lat,lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [lp.pid,lp.lokasi,lp.luas,lp.hm2,lp.status,lp.roi,lp.margin,lp.risk,lp.kab,lp.kec,lp.lat,lp.lng]
    );
  }
}

// ─── LAND STAGES ─────────────────────────────────────────────────────────────
async function seedLandStages(pids) {
  console.log("🗺️  Seed: Land Stages...");
  const stagesByProject = [
    // Gowa (sudah selesai pembebasan)
    [
      { code:"STAGE_A", identity:"Bidang A - Blok Barat", area:6200, status:"selesai" },
      { code:"STAGE_B", identity:"Bidang B - Blok Tengah", area:8100, status:"selesai" },
      { code:"STAGE_C", identity:"Bidang C - Blok Timur", area:5700, status:"selesai" },
      { code:"STAGE_D", identity:"Bidang D - Fasum & Fasos", area:5000, status:"selesai" },
    ],
    // Maros (sedang proses)
    [
      { code:"STAGE_A", identity:"Bidang A - Utara", area:5000, status:"selesai" },
      { code:"STAGE_B", identity:"Bidang B - Selatan", area:8500, status:"proses_pembayaran" },
      { code:"STAGE_C", identity:"Bidang C - Fasum", area:3000, status:"proses_pembayaran" },
      { code:"STAGE_D", identity:"Bidang D - Sisa Lahan", area:3500, status:"negosiasi" },
    ],
    // Takalar (masih negosiasi - bermasalah)
    [
      { code:"STAGE_A", identity:"Bidang A - Utama", area:9000, status:"negosiasi" },
      { code:"STAGE_B", identity:"Bidang B - Tambahan", area:5500, status:"proses_pembayaran" },
      { code:"STAGE_C", identity:"Bidang C - Belum Setuju", area:3500, status:"negosiasi" },
    ],
    // Pangkep (selesai tapi lagi proses sertifikasi)
    [
      { code:"STAGE_A", identity:"Bidang A - Blok I", area:7500, status:"proses_pembayaran" },
      { code:"STAGE_B", identity:"Bidang B - Blok II", area:8000, status:"selesai" },
      { code:"STAGE_C", identity:"Bidang C - Fasum", area:4000, status:"negosiasi" },
      { code:"STAGE_D", identity:"Bidang D - Sisa", area:2500, status:"selesai" },
    ],
    // Watampone (baru survey)
    [
      { code:"STAGE_A", identity:"Bidang A - Barat", area:10000, status:"negosiasi" },
      { code:"STAGE_B", identity:"Bidang B - Timur", area:10000, status:"prospek" },
      { code:"STAGE_C", identity:"Bidang C - Fasum", area:8000, status:"prospek" },
    ],
  ];
  for (let pi = 0; pi < pids.length; pi++) {
    for (const s of stagesByProject[pi]) {
      await rr(
        `INSERT INTO land_stages (project_id,stage_code,stage_identity,land_area,stage_status)
         VALUES ($1,$2,$3,$4,$5)`,
        [pids[pi], s.code, s.identity, s.area, s.status]
      );
    }
  }
}

// ─── LEGAL DOCUMENTS ─────────────────────────────────────────────────────────
async function seedLegalDocs(pids) {
  console.log("⚖️  Seed: Legal Docs...");
  const docsByProject = [
    // Gowa - sudah hampir semua selesai
    [
      { tipe:"SHM Induk", status:"selesai", pic:"Andi Legal", exp:"2055-12-31" },
      { tipe:"HGB", status:"selesai", pic:"Andi Legal", exp:"2053-12-31" },
      { tipe:"AJB", status:"selesai", pic:"Notaris Budi SH", exp:"2055-12-31" },
      { tipe:"PPJB", status:"selesai", pic:"Notaris Budi SH", exp:"2025-12-31" },
      { tipe:"IMB/PBG", status:"selesai", pic:"Budi Teknik", exp:"2026-12-31" },
      { tipe:"KKPR", status:"selesai", pic:"Andi Legal", exp:"2028-12-31" },
      { tipe:"AMDAL/UKL-UPL", status:"selesai", pic:"Tim Lingkungan", exp:"2030-12-31" },
      { tipe:"SLF", status:"proses", pic:"Budi Teknik", exp:"2026-06-30" },
      { tipe:"Sertifikat Induk", status:"selesai", pic:"Andi Legal", exp:"2055-12-31" },
      { tipe:"IPT", status:"selesai", pic:"Andi Legal", exp:"2026-12-31" },
    ],
    // Maros - sebagian proses
    [
      { tipe:"SHM Induk", status:"selesai", pic:"Zulkifli Legal", exp:"2055-12-31" },
      { tipe:"HGB", status:"proses", pic:"Zulkifli Legal", exp:"2053-12-31" },
      { tipe:"AJB", status:"selesai", pic:"Notaris Andi SH", exp:"2055-12-31" },
      { tipe:"PPJB", status:"selesai", pic:"Notaris Andi SH", exp:"2025-12-31" },
      { tipe:"IMB/PBG", status:"proses", pic:"Tim Teknik", exp:"2026-06-30" },
      { tipe:"KKPR", status:"selesai", pic:"Zulkifli Legal", exp:"2028-12-31" },
      { tipe:"AMDAL/UKL-UPL", status:"proses", pic:"Tim Lingkungan", exp:"2030-12-31" },
      { tipe:"SLF", status:"pending", pic:"Tim Teknik", exp:"2026-12-31" },
      { tipe:"Sertifikat Induk", status:"proses", pic:"Zulkifli Legal", exp:"2055-12-31" },
      { tipe:"IPT", status:"selesai", pic:"Zulkifli Legal", exp:"2026-12-31" },
    ],
    // Takalar - banyak yang belum
    [
      { tipe:"SHM Induk", status:"proses", pic:"Tim Legal", exp:"2055-12-31" },
      { tipe:"HGB", status:"pending", pic:"Tim Legal", exp:"2053-12-31" },
      { tipe:"AJB", status:"proses", pic:"Notaris Farida SH", exp:"2055-12-31" },
      { tipe:"PPJB", status:"pending", pic:"Notaris Farida SH", exp:"2025-12-31" },
      { tipe:"IMB/PBG", status:"pending", pic:"Tim Teknik", exp:"2026-06-30" },
      { tipe:"KKPR", status:"review", pic:"Tim Legal", exp:"2028-12-31" },
      { tipe:"AMDAL/UKL-UPL", status:"pending", pic:"Tim Lingkungan", exp:"2030-12-31" },
      { tipe:"SLF", status:"pending", pic:"Tim Teknik", exp:"2026-12-31" },
      { tipe:"Sertifikat Induk", status:"pending", pic:"Tim Legal", exp:"2055-12-31" },
      { tipe:"IPT", status:"pending", pic:"Tim Legal", exp:"2026-12-31" },
    ],
    // Pangkep - proses legal (masalah utama)
    [
      { tipe:"SHM Induk", status:"selesai", pic:"Andi Legal", exp:"2055-12-31" },
      { tipe:"HGB", status:"proses", pic:"Andi Legal", exp:"2053-12-31" },
      { tipe:"AJB", status:"selesai", pic:"Notaris Budi SH", exp:"2055-12-31" },
      { tipe:"PPJB", status:"selesai", pic:"Notaris Budi SH", exp:"2025-12-31" },
      { tipe:"IMB/PBG", status:"review", pic:"Tim Teknik", exp:"2026-06-30" },
      { tipe:"KKPR", status:"proses", pic:"Andi Legal", exp:"2028-12-31" },
      { tipe:"AMDAL/UKL-UPL", status:"review", pic:"Tim Lingkungan", exp:"2030-12-31" },
      { tipe:"SLF", status:"pending", pic:"Tim Teknik", exp:"2026-12-31" },
      { tipe:"Sertifikat Induk", status:"proses", pic:"Andi Legal", exp:"2055-12-31" },
      { tipe:"IPT", status:"proses", pic:"Andi Legal", exp:"2026-12-31" },
    ],
    // Watampone - masih sangat awal
    [
      { tipe:"SHM Induk", status:"pending", pic:"Tim Legal", exp:"2055-12-31" },
      { tipe:"HGB", status:"pending", pic:"Tim Legal", exp:"2053-12-31" },
      { tipe:"AJB", status:"pending", pic:"Tim Legal", exp:"2055-12-31" },
      { tipe:"PPJB", status:"pending", pic:"Tim Legal", exp:"2025-12-31" },
      { tipe:"IMB/PBG", status:"pending", pic:"Tim Teknik", exp:"2026-06-30" },
      { tipe:"KKPR", status:"review", pic:"Tim Legal", exp:"2028-12-31" },
      { tipe:"AMDAL/UKL-UPL", status:"pending", pic:"Tim Lingkungan", exp:"2030-12-31" },
      { tipe:"SLF", status:"pending", pic:"Tim Teknik", exp:"2026-12-31" },
      { tipe:"Sertifikat Induk", status:"pending", pic:"Tim Legal", exp:"2055-12-31" },
      { tipe:"IPT", status:"pending", pic:"Tim Legal", exp:"2026-12-31" },
    ],
  ];
  for (let pi = 0; pi < pids.length; pi++) {
    for (const d of docsByProject[pi]) {
      await rr(
        `INSERT INTO legal_documents (project_id,tipe_dokumen,status,pic,expiry)
         VALUES ($1,$2,$3,$4,$5)`,
        [pids[pi], d.tipe, d.status, d.pic, d.exp]
      );
    }
  }

  // Legal Issues
  const issues = [
    { pid:pids[2], tipe:"Sengketa Kepemilikan", deskripsi:"Salah satu bidang tanah diklaim oleh ahli waris yang berbeda, perlu mediasi notaris", status:"dalam_proses", prioritas:"tinggi" },
    { pid:pids[3], tipe:"Perubahan Zonasi", deskripsi:"Zona peruntukan berubah dari pertanian ke perumahan, perlu revisi KKPR", status:"dalam_proses", prioritas:"tinggi" },
    { pid:pids[3], tipe:"Izin Lingkungan Terlambat", deskripsi:"AMDAL belum disetujui DLHK, target completion mundur 3 bulan", status:"dalam_proses", prioritas:"sedang" },
    { pid:pids[4], tipe:"Tumpang Tindih Batas Lahan", deskripsi:"Batas lahan dengan lahan tetangga tidak jelas, perlu pengukuran ulang BPN", status:"pending", prioritas:"tinggi" },
    { pid:pids[1], tipe:"Rekomendasi Bank Bermasalah", deskripsi:"Bank BTN mensyaratkan SLF sebelum KPP, proses SLF sedang pending", status:"dalam_proses", prioritas:"sedang" },
  ];
  for (const iss of issues) {
    await rr(
      `INSERT INTO legal_issues (project_id,tipe_masalah,deskripsi,status,prioritas)
       VALUES ($1,$2,$3,$4,$5)`,
      [iss.pid, iss.tipe, iss.deskripsi, iss.status, iss.prioritas]
    ).catch(() => {});
  }
}

// ─── PERMIT DOCUMENTS ─────────────────────────────────────────────────────────
async function seedPermitDocs(pids) {
  console.log("📋 Seed: Permit Documents...");
  const permits = [
    { group:"perizinan_dasar", name:"KKPR", institution:"ATR/BPN" },
    { group:"perizinan_dasar", name:"Izin Lokasi", institution:"Dinas Tata Ruang" },
    { group:"perizinan_bangunan", name:"PBG", institution:"Dinas PUPR" },
    { group:"perizinan_bangunan", name:"SLF", institution:"Dinas PUPR" },
    { group:"izin_teknis", name:"IMB Induk", institution:"DPMPTSP" },
    { group:"izin_teknis", name:"Amdal/UKL-UPL", institution:"DLHK" },
    { group:"izin_teknis", name:"Izin Gangguan (HO)", institution:"DPMPTSP" },
    { group:"perizinan_dasar", name:"Keterangan Rencana Kota", institution:"Dinas Tata Ruang" },
  ];
  const statusByProject = [
    // Gowa - hampir semua selesai
    ["selesai","selesai","selesai","dalam_proses","selesai","selesai","selesai","selesai"],
    // Maros - sebagian proses
    ["selesai","selesai","dalam_proses","belum_diajukan","dalam_proses","dalam_proses","selesai","selesai"],
    // Takalar - banyak belum (masalah)
    ["belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","dalam_proses"],
    // Pangkep - sedang proses
    ["dalam_proses","selesai","belum_diajukan","belum_diajukan","dalam_proses","dalam_proses","selesai","selesai"],
    // Watampone - belum mulai
    ["belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan","belum_diajukan"],
  ];
  const pics = ["Andi Legal","Zulkifli Legal","Tim Legal Perizinan","Budi Teknik","Tim DPMPTSP"];
  for (let pi = 0; pi < pids.length; pi++) {
    for (let i = 0; i < permits.length; i++) {
      const p = permits[i];
      const st = statusByProject[pi][i];
      await rr(
        `INSERT INTO permit_documents (project_id,permit_group,permit_name,institution,status,submission_date,target_date,pic)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pids[pi], p.group, p.name, p.institution, st,
          st !== "belum_diajukan" ? "2024-06-01" : null,
          "2025-03-30", pics[pi % pics.length]]
      );
    }
  }
}

// ─── UNITS (200 per proyek) ───────────────────────────────────────────────────
async function seedUnits(pids) {
  console.log("🏠 Seed: Units (200 per proyek = 1000 unit total)...");
  const bloks = ["A","B","C","D","E","F","G","H","I","J"];
  const tipeData = [
    { tipe:"Tipe 36/72", harga:185000000, nomorRange:[1,12], stage:"STAGE_A" },
    { tipe:"Tipe 45/90", harga:235000000, nomorRange:[13,17], stage:"STAGE_B" },
    { tipe:"Tipe 54/108", harga:290000000, nomorRange:[18,20], stage:"STAGE_C" },
  ];

  // Status distribution berdasarkan fase proyek
  const statusDist = [
    // Gowa CONSTRUCTION: banyak in_progress dan sold
    { dist:[["sold",0.35],["in_progress",0.30],["booked",0.15],["available",0.20]] },
    // Maros MARKETING: campuran booked & available
    { dist:[["sold",0.20],["booked",0.30],["in_progress",0.10],["available",0.40]] },
    // Takalar LAND: hampir semua available
    { dist:[["available",0.92],["booked",0.05],["in_progress",0.03],["sold",0.00]] },
    // Pangkep LEGAL: sebagian kecil pre-booking
    { dist:[["available",0.80],["booked",0.15],["in_progress",0.05],["sold",0.00]] },
    // Watampone PLANNING: semua available
    { dist:[["available",1.00]] },
  ];
  const adminStatusMap = {
    sold: ["ht","selesai"],
    in_progress: ["akad","ht"],
    booked: ["booked"],
    available: ["stock"],
  };

  const allUnitIds = [];
  for (let pi = 0; pi < pids.length; pi++) {
    const pid = pids[pi];
    const dist = statusDist[pi].dist;
    let unitIdx = 0;
    for (const blok of bloks) {
      for (let nomor = 1; nomor <= 20; nomor++) {
        unitIdx++;
        const td = nomor <= 12 ? tipeData[0] : nomor <= 17 ? tipeData[1] : tipeData[2];
        // Pick status by distribution
        const rv = Math.random();
        let cumul = 0, status = "available";
        for (const [st, prob] of dist) {
          cumul += prob;
          if (rv < cumul) { status = st; break; }
        }
        const adminStatus = pick(adminStatusMap[status]);
        const progress = status === "sold" ? rand(95, 100) :
                         status === "in_progress" ? rand(30, 94) :
                         status === "booked" ? rand(0, 30) : 0;
        const readyAkad = progress >= 90;
        const res = await r(
          `INSERT INTO units (project_id,blok,nomor,tipe,harga,status,progress,admin_status,stage_code,ready_akad)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [pid, blok, String(nomor), td.tipe, td.harga, status, progress, adminStatus, td.stage, readyAkad]
        );
        allUnitIds.push({ id: res.rows[0].id, projectId: pid, status, blok, nomor, tipe: td.tipe, harga: td.harga, progress });
      }
    }
  }
  return allUnitIds;
}

// ─── LEADS & CUSTOMERS ───────────────────────────────────────────────────────
async function seedLeadsAndCustomers(pids, unitIds) {
  console.log("👥 Seed: Leads & Customers...");
  const leadStatuses = ["NEW_LEAD","CONTACTED","INTERESTED","SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP","BATAL"];
  const picSales = ["Rahmat Sales","Dewi Properti","Irfan Agen","Kartini Sales","Faisal SPV","Andi Senior","Nurul Agen","Sulaiman SPV"];

  // Leads per proyek
  const leadsPerProject = [80, 70, 40, 50, 30]; // total 270 leads
  const leadIds = [];
  for (let pi = 0; pi < pids.length; pi++) {
    const count = leadsPerProject[pi];
    for (let li = 0; li < count; li++) {
      const nama = namaList[(pi * count + li) % namaList.length];
      const src = sources[(pi + li) % sources.length];
      const st = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];
      const budgets = ["150-200jt","200-250jt","250-300jt","300-350jt","Di atas 350jt"];
      await rr(
        `INSERT INTO leads (project_id,nama,kontak,source,status,assigned_to,pekerjaan,budget,pic_sales,tanggal_booking)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [pids[pi], nama, `08${String(pi*100+li+10).padStart(9,'0')}`,
          src, st, "Tim Sales", pick(pekerjaan), budgets[(pi+li)%budgets.length],
          pick(picSales), st==="BOOKING"||st==="BERKAS_LENGKAP" ? `2024-${String(rand(8,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}` : null]
      );
    }
  }

  // Customers - ambil unit yang sold/booked/in_progress
  const eligibleUnits = unitIds.filter(u => ["sold","booked","in_progress"].includes(u.status));
  const customerIds = [];
  const kprStatuses = ["bi_checking","verifikasi_berkas","penilaian_agunan","ots","sp3k","akad","ht","cair"];
  const pipelineStatuses = ["MINAT","BOOKING","AKAD","SELESAI"];
  const adminPics = ["Hasna Admin","Nur Admin","Siti Admin","Kartini KPR","Aminah Admin"];

  let custIdx = 0;
  for (const unit of eligibleUnits) {
    const nama = namaList[custIdx % namaList.length];
    const bank = bankList[custIdx % bankList.length];
    const kprSt = unit.status === "sold" ?
      (Math.random() > 0.3 ? "cair" : "ht") :
      unit.status === "in_progress" ?
      pick(["sp3k","akad","ht"]) :
      pick(["bi_checking","verifikasi_berkas","penilaian_agunan","ots"]);
    const pipeSt = unit.status === "sold" ? "SELESAI" :
                   unit.status === "in_progress" ? pick(["AKAD","SELESAI"]) :
                   pick(["BOOKING","AKAD"]);
    const dp = Math.round(unit.harga * 0.10);
    const loan = unit.harga - dp;
    const nik = `73${String(custIdx + 1).padStart(14,'0')}`;
    const res = await rr(
      `INSERT INTO customers (project_id,unit_id,nama,nik,kontak,pekerjaan,bank,status_kpr,berkas_lengkap,
       catatan,referral_source,pic_admin,dp_amount,loan_amount,unit_price,pipeline_status,payment_type,
       booking_date,akad_date,ht_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [unit.projectId, unit.id, nama, nik,
        `08${String(custIdx + 50).padStart(9,'0')}`,
        pick(pekerjaan), bank, kprSt,
        Math.random() > 0.25,
        "Data telah diverifikasi tim admin KPR",
        pick(sources), pick(adminPics),
        dp, loan, unit.harga, pipeSt, "KPR",
        `2024-${String(rand(7,11)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`,
        kprSt === "akad" || kprSt === "ht" || kprSt === "cair" ? `2024-${String(rand(9,12)).padStart(2,'0')}-10` : null,
        kprSt === "ht" || kprSt === "cair" ? `2024-${String(rand(10,12)).padStart(2,'0')}-25` : null]
    );
    if (res.rows[0]) {
      customerIds.push({ id: res.rows[0].id, unitId: unit.id, projectId: unit.projectId, kprSt, loan, bank });
    }
    custIdx++;
  }
  return customerIds;
}

// ─── KPR PIPELINE ─────────────────────────────────────────────────────────────
async function seedKprPipeline(customers) {
  console.log("🏦 Seed: KPR Pipeline...");
  const surveyors = ["Pak Rudi BPN","Bu Sari Appraisal","Pak Hendra Surveyor","Bu Linda Assessor","Pak Darmin Penilai"];
  const notaries = ["Notaris Budi Santoso, SH","Notaris Andi Wijaya, SH, MKn","Notaris Farida Hanum, SH","Notaris Ahmad Said, SH, MH"];
  const now = new Date();
  const curYear = now.getFullYear();

  let i = 0;
  for (const cust of customers) {
    const { id: cid, bank, kprSt, loan } = cust;
    // Bank submission - semua punya
    await rr(
      `INSERT INTO bank_submissions (customer_id,bank,submitted_date,bank_officer,registration_number,notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [cid, bank, `2024-${String(rand(8,11)).padStart(2,'0')}-01`,
        "Manajer KPR " + bank, `REG-${curYear}-${String(i+1).padStart(5,'0')}`,
        "Berkas sudah diverifikasi dan diterima bank"]
    );

    const advancedStatuses = ["ots","sp3k","akad","ht","cair"];
    if (advancedStatuses.includes(kprSt)) {
      // OTS
      await rr(
        `INSERT INTO ots_records (customer_id,bank,scheduled_date,surveyor_name,actual_date,status,result)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [cid, bank, `2024-${String(rand(8,10)).padStart(2,'0')}-15`,
          pick(surveyors), `2024-${String(rand(8,10)).padStart(2,'0')}-16`,
          "completed", Math.random() > 0.08 ? "lolos" : "tidak_lolos"]
      );
    }
    const sp3kStatuses = ["sp3k","akad","ht","cair"];
    if (sp3kStatuses.includes(kprSt)) {
      await rr(
        `INSERT INTO sp3k_records (customer_id,bank,sp3k_date,sp3k_number,approved_amount,plafon_amount,expiry_date,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, bank, `2024-${String(rand(9,11)).padStart(2,'0')}-01`,
          `SP3K-${curYear}-${String(i+1).padStart(5,'0')}`,
          loan, loan, `2025-${String(rand(3,9)).padStart(2,'0')}-30`,
          Math.random() > 0.05 ? "approved" : "revision"]
      );
    }
    const akadStatuses = ["akad","ht","cair"];
    if (akadStatuses.includes(kprSt)) {
      const akadM = String(rand(10,12)).padStart(2,'0');
      await rr(
        `INSERT INTO akad_records (customer_id,bank,akad_date,akad_number,notary,akad_amount,estimated_ht_date,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, bank, `${curYear}-${akadM}-10`,
          `AKAD-${curYear}-${String(i+1).padStart(5,'0')}`,
          pick(notaries), loan,
          `${curYear}-${akadM}-25`, "selesai"]
      );
    }
    if (kprSt === "ht" || kprSt === "cair") {
      const htM = String(rand(11,12)).padStart(2,'0');
      await rr(
        `INSERT INTO ht_records (customer_id,bank,ht_date,ht_amount,account_number,notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cid, bank, `${curYear}-${htM}-${String(rand(5,25)).padStart(2,'0')}`,
          loan, `ACC-${String(i+1).padStart(8,'0')}`,
          "Proses HT berjalan lancar, dokumen diterima BPN"]
      );
    }
    i++;
  }
}

// ─── CONSTRUCTION (Proyek 1 & 2) ─────────────────────────────────────────────
async function seedConstruction(unitIds) {
  console.log("🔨 Seed: Construction Tasks...");
  const items = [
    { item:"Galian Pondasi", bobot:4 },
    { item:"Pondasi Batu Kali", bobot:8 },
    { item:"Sloof Beton Bertulang", bobot:7 },
    { item:"Struktur Kolom & Balok", bobot:14 },
    { item:"Dinding Bata Merah", bobot:12 },
    { item:"Ring Balok", bobot:5 },
    { item:"Atap & Rangka Kuda-kuda", bobot:10 },
    { item:"Plesteran & Acian", bobot:8 },
    { item:"Instalasi Listrik PLN", bobot:6 },
    { item:"Instalasi Plumbing", bobot:6 },
    { item:"Keramik Lantai & Dinding", bobot:8 },
    { item:"Kusen, Pintu & Jendela", bobot:5 },
    { item:"Pengecatan Dalam & Luar", bobot:4 },
    { item:"Sanitasi & Kamar Mandi", bobot:3 },
  ];
  const statuses = ["selesai","dalam_progress","belum_mulai"];
  const supervisors = ["Budi Supervisor","Yusuf Site Eng","Syahrul QC","Pak Mandor Hasan","Bu Eni Teknik"];

  // Hanya untuk proyek Gowa (pi=0) dan Maros (pi=1)
  const constructionUnits = unitIds.filter(u =>
    (u.projectId === unitIds.filter(x=>x.projectId===unitIds[0].projectId)[0].projectId) ||
    (u.projectId === unitIds.filter(x=>x.status==="in_progress")[0]?.projectId)
  ).filter(u => u.status === "in_progress" || u.status === "sold").slice(0, 120);

  for (const unit of constructionUnits) {
    const progress = unit.progress / 100;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const threshold = i / items.length;
      let st;
      if (threshold < progress - 0.05) st = "selesai";
      else if (threshold < progress + 0.08) st = "dalam_progress";
      else st = "belum_mulai";
      const tglMulai = st !== "belum_mulai" ? `2024-${String(rand(3,8)).padStart(2,'0')}-01` : null;
      const tglSelesai = st === "selesai" ? `2024-${String(rand(9,12)).padStart(2,'0')}-15` : null;
      await rr(
        `INSERT INTO construction_tasks (unit_id,item,bobot,status,tanggal_mulai,tanggal_selesai,verified_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [unit.id, it.item, it.bobot, st, tglMulai, tglSelesai, st==="selesai"?pick(supervisors):null]
      );
    }
  }
}

// ─── QC ──────────────────────────────────────────────────────────────────────
async function seedQC(unitIds) {
  console.log("✅ Seed: Unit QC...");
  const qcItems = [
    "Kerapian Plesteran Dinding","Kelurusan & Ketegakan Dinding","Kerataan Lantai Keramik",
    "Kebocoran Atap & Talang Air","Instalasi Listrik Berfungsi Normal","Kran Air & Sanitasi Berfungsi",
    "Cat Dinding Merata Tanpa Belang","Kusen Pintu Tidak Bengkok","Jendela Tidak Bocor & Rapat",
    "Drainase Halaman Lancar","Talang Air Terpasang Benar","Pagar Kavling Sesuai Batas Lahan",
    "Teras & Carport Rata","Pondasi Tangga Kokoh",
  ];
  const inspectors = ["Tim QC Internal Budi","Syahrul QC Supervisor","Pak Yusuf Site Eng","Tim Inspeksi BTN","Tim QC Mandiri"];

  const soldUnits = unitIds.filter(u => u.status === "sold" || (u.status === "in_progress" && u.progress > 80)).slice(0, 80);
  for (const unit of soldUnits) {
    for (const qcItem of qcItems) {
      // Proyek 1 (Gowa) bagus, ada beberapa yang fail
      // Proyek 2 (Maros) lebih banyak fail
      const isGowa = unit.projectId === unitIds[0]?.projectId;
      const passRate = isGowa ? 0.92 : 0.82;
      const isPass = Math.random() < passRate;
      await rr(
        `INSERT INTO unit_qc (unit_id,qc_item,is_pass,notes,inspected_by,inspected_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [unit.id, qcItem, isPass,
          isPass ? null : "Perlu perbaikan sebelum serah terima - jadwalkan rework",
          pick(inspectors),
          `2024-${String(rand(10,12)).padStart(2,'0')}-${String(rand(5,28)).padStart(2,'0')}`]
      );
    }
  }
}

// ─── MATERIALS ───────────────────────────────────────────────────────────────
async function seedMaterials(pids) {
  console.log("🧱 Seed: Materials...");
  const materials = [
    { name:"Semen Portland Tipe I (50kg)", cat:"bahan_dasar", sat:"sak", spUnit:25, up:72000, minStock:200 },
    { name:"Bata Merah Lokal 5x11x23", cat:"bahan_dasar", sat:"buah", spUnit:5000, up:850, minStock:20000 },
    { name:"Pasir Beton Grade A", cat:"bahan_dasar", sat:"m3", spUnit:9, up:320000, minStock:80 },
    { name:"Batu Split 2/3 cm", cat:"bahan_dasar", sat:"m3", spUnit:5, up:370000, minStock:50 },
    { name:"Batu Kali Alam", cat:"bahan_dasar", sat:"m3", spUnit:4, up:250000, minStock:40 },
    { name:"Besi Beton D10-6m", cat:"besi", sat:"batang", spUnit:90, up:88000, minStock:300 },
    { name:"Besi Beton D13-6m", cat:"besi", sat:"batang", spUnit:45, up:135000, minStock:150 },
    { name:"Besi Hollow 4x4 cm", cat:"besi", sat:"batang", spUnit:20, up:85000, minStock:100 },
    { name:"Keramik Lantai 40x40 Motif", cat:"finishing", sat:"dus", spUnit:14, up:145000, minStock:100 },
    { name:"Keramik Dinding Kamar Mandi 25x40", cat:"finishing", sat:"dus", spUnit:8, up:120000, minStock:80 },
    { name:"Cat Tembok Dalam 25kg", cat:"finishing", sat:"ember", spUnit:4, up:280000, minStock:50 },
    { name:"Cat Tembok Luar 25kg", cat:"finishing", sat:"ember", spUnit:3, up:320000, minStock:40 },
    { name:"Pipa PVC 4 inch AW", cat:"plumbing", sat:"batang", spUnit:18, up:68000, minStock:80 },
    { name:"Pipa PVC 2 inch AW", cat:"plumbing", sat:"batang", spUnit:12, up:42000, minStock:60 },
    { name:"Kloset Duduk Standar", cat:"plumbing", sat:"unit", spUnit:2, up:850000, minStock:20 },
    { name:"Kabel NYM 2x2.5mm", cat:"elektrikal", sat:"meter", spUnit:130, up:9000, minStock:1000 },
    { name:"Kabel NYM 3x2.5mm", cat:"elektrikal", sat:"meter", spUnit:60, up:14000, minStock:500 },
    { name:"MCB 10A Schneider", cat:"elektrikal", sat:"pcs", spUnit:3, up:65000, minStock:50 },
    { name:"Atap Genteng Morando", cat:"atap", sat:"buah", spUnit:800, up:3200, minStock:5000 },
    { name:"Rangka Atap Baja Ringan", cat:"atap", sat:"m2", spUnit:52, up:125000, minStock:200 },
  ];

  const matIds = [];
  for (const m of materials) {
    const res = await r(
      `INSERT INTO prod_material_master (name,category,satuan,standard_per_unit,unit_price,minimum_stock)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [m.name, m.cat, m.sat, m.spUnit, m.up, m.minStock]
    );
    matIds.push({ id: res.rows[0].id, name: m.name, minStock: m.minStock, up: m.up });
  }

  // Material In & Out untuk Proyek 1 (Gowa) dan 2 (Maros)
  const suppliers = ["CV Maju Jaya Material","PT Semen Tonasa","UD Besi Beton Makmur","CV Finishing Sulsel","PT Keramika Indonesia","UD Plumbing Andalan"];
  for (let pi = 0; pi < 2; pi++) {
    const pid = pids[pi];
    for (let mi = 0; mi < matIds.length; mi++) {
      const mat = matIds[mi];
      // 4 kali masuk (tiap bulan)
      for (let d = 0; d < 4; d++) {
        const bulan = String(rand(7,11)).padStart(2,'0');
        const qty = rand(mat.minStock * 2, mat.minStock * 6);
        await rr(
          `INSERT INTO prod_material_in (project_id,material_id,quantity,supplier,document_number,date_in)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [pid, mat.id, qty, pick(suppliers),
            `DO-${2024}-${String(mi*4+d+1+pi*100).padStart(5,'0')}`,
            `2024-${bulan}-${String(rand(1,28)).padStart(2,'0')}`]
        );
      }
      // 3 kali keluar
      for (let d = 0; d < 3; d++) {
        const bulan = String(rand(8,12)).padStart(2,'0');
        await rr(
          `INSERT INTO prod_material_out (project_id,material_id,quantity,taken_by,date_out)
           VALUES ($1,$2,$3,$4,$5)`,
          [pid, mat.id, rand(50, mat.minStock * 3),
            pick(["Pak Mandor Hasan","Mandor Subkon","Site Engineer Yusuf","Pak Foreman"]),
            `2024-${bulan}-${String(rand(1,28)).padStart(2,'0')}`]
        ).catch(() => {});
      }
    }
  }

  // Beberapa material dengan stok kritis (untuk alert)
  for (let mi = 0; mi < 4; mi++) {
    await rr(
      `INSERT INTO prod_material_out (project_id,material_id,quantity,taken_by,date_out)
       VALUES ($1,$2,$3,$4,$5)`,
      [pids[0], matIds[mi].id, matIds[mi].minStock * 4, "Mandor Lapangan", "2026-06-01"]
    ).catch(() => {});
  }
}

// ─── SUBKON ──────────────────────────────────────────────────────────────────
async function seedSubkon(pids) {
  console.log("🔧 Seed: Subkon Contracts...");
  const subkonList = [
    { name:"CV Bangunan Jaya Sulsel", type:"struktur", vpUnit:[8500000,9000000,8000000] },
    { name:"CV Mitra Finishing Makassar", type:"finishing", vpUnit:[12000000,13000000,11500000] },
    { name:"UD Listrik Andalan Sulsel", type:"mekanikal_elektrikal", vpUnit:[4500000,5000000,4200000] },
    { name:"CV Plumbing Prima Sulsel", type:"plumbing", vpUnit:[3200000,3500000,3000000] },
    { name:"PT Landscape Hijau Indonesia", type:"landscape", vpUnit:[1800000,2000000,1600000] },
    { name:"CV Atap Kuda-Kuda Makassar", type:"atap", vpUnit:[5500000,6000000,5000000] },
  ];

  for (let pi = 0; pi < 2; pi++) {
    const pid = pids[pi];
    const unitCount = 200;
    for (let si = 0; si < subkonList.length; si++) {
      const s = subkonList[si];
      const valuePerUnit = s.vpUnit[pi] || s.vpUnit[0];
      const contractValue = unitCount * valuePerUnit;
      const retentionPerUnit = Math.round(valuePerUnit * 0.05);
      const totalRetention = unitCount * retentionPerUnit;
      const res = await rr(
        `INSERT INTO subkon_contracts (project_id,stage_code,subkon_name,unit_count,value_per_unit,contract_value,retention_per_unit,total_retention,net_payable_value,maintenance_months,start_date,target_end_date,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [pid, "STAGE_A", s.name, unitCount, valuePerUnit, contractValue, retentionPerUnit, totalRetention,
          contractValue - totalRetention, 3,
          pi === 0 ? "2023-10-01" : "2024-04-01",
          pi === 0 ? "2026-06-30" : "2026-12-31",
          si === 0 && pi === 0 ? "selesai" : "aktif"]
      );
      if (!res.rows[0]) continue;

      // Termin pembayaran
      const termins = [
        { no:1, from:0, to:30, pct:30 },
        { no:2, from:30, to:60, pct:30 },
        { no:3, from:60, to:100, pct:40 },
      ];
      let totalPaid = 0;
      for (const t of termins) {
        const gross = contractValue * t.pct / 100;
        const ret = gross * 0.05;
        const net = gross - ret;
        const isDone = t.to <= (pi === 0 ? 70 : 30);
        await rr(
          `INSERT INTO subkon_payments (contract_id,payment_type,termin_number,progress_previous,progress_current,gross_eligible_amount,retention_deducted,net_payment,total_paid_before,status,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [res.rows[0].id, "termin", t.no, t.from, t.to, gross, ret, net, totalPaid,
            isDone ? "approved" : t.no === 1 ? "pending" : "draft",
            `Termin ke-${t.no} progress ${t.from}%-${t.to}%`]
        ).catch(() => {});
        if (isDone) totalPaid += net;
      }
    }
  }
}

// ─── MARKETING ───────────────────────────────────────────────────────────────
async function seedMarketing(pids) {
  console.log("📣 Seed: Marketing...");
  const platformList = ["instagram","facebook","tiktok","youtube","google_ads","whatsapp_blast","koran_lokal","spanduk_billboard"];
  const campaignTemplates = [
    ["Grand Launching {nama}","Promo DP 0% {nama}","Festival Properti Sulsel","Open House Weekend","Referral Bonus 5jt","Campaign Digital Q{q}","Anniversary Sale {nama}","KPR Mudah {nama}"],
  ];

  for (let pi = 0; pi < pids.length; pi++) {
    const pid = pids[pi];
    const nama = ["Griya Sejahtera","Permata Maros","Bukit Indah","Mutiara Pangkep","Grand Watampone"][pi];
    const campCount = [8, 7, 4, 5, 3][pi];

    for (let i = 0; i < campCount; i++) {
      const platform = platformList[i % platformList.length];
      const budget = rand(3000000, 15000000);
      const spend = Math.round(budget * (0.6 + Math.random() * 0.45));
      const impresi = rand(15000, 80000);
      const klik = Math.round(impresi * (0.02 + Math.random() * 0.04));
      const leadsGen = Math.round(klik * (0.08 + Math.random() * 0.12));
      await rr(
        `INSERT INTO campaigns (project_id,nama,platform,tipe_konten,anggaran,spend,impresi,klik,leads_generated,tanggal_mulai,tanggal_selesai,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [pid, `${campaignTemplates[0][i % 8].replace('{nama}', nama).replace('{q}', Math.ceil((i+1)/2))}`,
          platform, ["post_video","post_image","story","reels","carousel"][i%5],
          budget, spend, impresi, klik, leadsGen,
          `2024-${String(rand(5,10)).padStart(2,'0')}-01`,
          i < campCount-2 ? `2024-${String(rand(10,12)).padStart(2,'0')}-30` : null,
          i < campCount-2 ? "selesai" : "aktif"]
      );
    }

    // Kompetitor
    const kompetitors = [
      { nama:"PT Ciputra Properti Sulsel", lok:"Gowa", jarak:3.5+pi*1.2, tipe:"Tipe 36/72", hMin:175000000, hMax:225000000, total:180, terjual:120 },
      { nama:"PT Sinar Mas Land Sulsel", lok:"Maros", jarak:8.0+pi*0.5, tipe:"Tipe 45/90", hMin:210000000, hMax:285000000, total:150, terjual:85 },
      { nama:"Developer Lokal Sulsel", lok:["Gowa","Maros","Takalar","Pangkep","Bone"][pi], jarak:2.1+pi*0.8, tipe:"Tipe 36", hMin:168000000, hMax:220000000, total:80, terjual:55 },
    ];
    for (const k of kompetitors) {
      await rr(
        `INSERT INTO competitors (project_id,nama_kompetitor,lokasi,jarak,tipe_unit,harga_min,harga_max,total_unit,unit_terjual,progress,kelebihan,kekurangan,tanggal_launching)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [pid, k.nama, k.lok, k.jarak, k.tipe, k.hMin, k.hMax, k.total, k.terjual,
          Math.round(k.terjual/k.total*100),
          "Brand kuat, lokasi strategis, sudah terbukti",
          "Harga lebih tinggi, fasilitas kurang, after-sales lambat",
          `202${3+pi}-0${rand(3,9)}-01`]
      );
    }

    // Absorption per tahap
    const tahaps = ["Tahap 1","Tahap 2","Tahap 3","Tahap 4"];
    const totalPerTahap = 50;
    for (let t = 0; t < tahaps.length; t++) {
      const terjual = pi === 0 ? rand(38,50) : pi === 1 ? rand(20,45) : pi === 2 ? rand(0,5) : rand(0,15);
      await rr(
        `INSERT INTO marketing_absorption (project_id,tahap,total_unit,unit_terjual)
         VALUES ($1,$2,$3,$4)`,
        [pid, tahaps[t], totalPerTahap, Math.min(terjual, totalPerTahap)]
      );
    }

    // Monthly targets - 12 bulan
    for (let m = 1; m <= 12; m++) {
      const targetAkad = [12, 10, 4, 6, 3][pi];
      const targetBerkas = [18, 15, 6, 9, 4][pi];
      await rr(
        `INSERT INTO monthly_targets (project_id,year,month,target_akad,target_berkas)
         VALUES ($1,$2,$3,$4,$5)`,
        [pid, 2025, m, targetAkad, targetBerkas]
      ).catch(() => {});
      await rr(
        `INSERT INTO monthly_targets (project_id,year,month,target_akad,target_berkas)
         VALUES ($1,$2,$3,$4,$5)`,
        [pid, 2026, m, Math.round(targetAkad * 1.1), Math.round(targetBerkas * 1.1)]
      ).catch(() => {});
    }

    // Branding KPI
    const bKpis = [
      { metric:"Followers Instagram", nilai:rand(5000, 25000), target:20000 },
      { metric:"Engagement Rate", nilai:+(rand(25,65)/10).toFixed(2), target:5.0 },
      { metric:"Website Traffic Bulanan", nilai:rand(800, 5000), target:3000 },
      { metric:"CPL (Cost Per Lead)", nilai:rand(80000, 250000), target:150000 },
      { metric:"Conversion Rate Lead ke Booking (%)", nilai:+(rand(6,18)/1).toFixed(1), target:12 },
    ];
    for (const bk of bKpis) {
      await rr(
        `INSERT INTO branding_kpi (project_id,metric,nilai,target,period)
         VALUES ($1,$2,$3,$4,$5)`,
        [pid, bk.metric, bk.nilai, bk.target, "2025-Q1"]
      ).catch(() => {});
    }
  }
}

// ─── PLANNING ────────────────────────────────────────────────────────────────
async function seedPlanning(pids) {
  console.log("📊 Seed: Planning (Feasibility, Cashflow, Market, Product, Milestones)...");
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth() + 1;

  const projectData = [
    // Gowa - ROI bagus, margin oke
    { hargaJual:185000000, hargaTanah:835000, totalUnit:200, luas:25000, kab:"Gowa", kontruksiPerUnit:72000000, irr:21.5 },
    // Maros - ROI sedang, margin oke
    { hargaJual:210000000, hargaTanah:635000, totalUnit:200, luas:20000, kab:"Maros", kontruksiPerUnit:75000000, irr:19.8 },
    // Takalar - ROI cukup tapi ada risiko akuisisi
    { hargaJual:195000000, hargaTanah:695000, totalUnit:200, luas:18000, kab:"Takalar", kontruksiPerUnit:73000000, irr:18.2 },
    // Pangkep - ROI sedang, tertekan karena delay legal
    { hargaJual:220000000, hargaTanah:575000, totalUnit:200, luas:22000, kab:"Pangkajene dan Kepulauan", kontruksiPerUnit:78000000, irr:17.6 },
    // Watampone - ROI paling tipis (masalah)
    { hargaJual:175000000, hargaTanah:470000, totalUnit:200, luas:28000, kab:"Bone", kontruksiPerUnit:70000000, irr:14.8 },
  ];

  for (let pi = 0; pi < pids.length; pi++) {
    const pid = pids[pi];
    const pd = projectData[pi];
    const totalRevenue = pd.hargaJual * pd.totalUnit;
    const biayaLahan = pd.hargaTanah * pd.luas;
    const biayaKonstruksi = pd.totalUnit * pd.kontruksiPerUnit;
    const biayaMarketing = totalRevenue * 0.025;
    const biayaOverhead = totalRevenue * 0.018;
    const totalCost = biayaLahan + biayaKonstruksi + biayaMarketing + biayaOverhead;
    const grossProfit = totalRevenue - totalCost;
    const margin = grossProfit / totalRevenue * 100;
    const roi = grossProfit / totalCost * 100;
    const npv = grossProfit * 0.72;

    // Planning Feasibility
    await rr(
      `INSERT INTO planning_feasibility (project_id,land_cost,construction_cost_per_unit,marketing_cost,overhead_cost,selling_price_per_unit,total_units,total_revenue,total_cost,gross_profit,margin,roi,irr,npv,payback_period,is_approved,recommendation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [pid, biayaLahan, pd.kontruksiPerUnit, biayaMarketing, biayaOverhead,
        pd.hargaJual, pd.totalUnit, totalRevenue, totalCost, grossProfit,
        margin.toFixed(2), roi.toFixed(2), pd.irr.toFixed(2), npv,
        Math.floor(22 + pi * 4),
        pi < 4 ? true : false,
        pi === 4 ?
          "Perlu kajian ulang - margin terlalu tipis (di bawah 15%), pertimbangkan revisi harga jual atau efisiensi biaya konstruksi" :
          pi === 3 ?
          "Layak dengan catatan - percepat penyelesaian legal agar tidak terjadi cost overrun akibat delay" :
          "Layak dikembangkan berdasarkan analisis pasar dan finansial yang komprehensif"]
    ).catch(e => console.warn("planning_feasibility:", e.message));

    // Feasibility Studies (tabel terpisah)
    await rr(
      `INSERT INTO feasibility_studies (project_id,hpp,roi,margin,cashflow,bep,rab,rab_variance,is_approved,catatan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [pid, pd.kontruksiPerUnit + (biayaLahan/pd.totalUnit), roi, margin,
        grossProfit * 0.8, Math.ceil(totalCost / pd.hargaJual),
        biayaKonstruksi, rand(-5, 8),
        pi < 4 ? true : false,
        pi === 4 ? "Feasibility marginal - perlu review ulang asumsi harga tanah dan target harga jual" :
          "Feasibility disetujui - lanjut ke tahap berikutnya"]
    ).catch(() => {});

    // Planning Product
    const tipes = [
      { tipe:"Tipe 36/72", lb:36, lk:72, harga:pd.hargaJual, unit:Math.floor(pd.totalUnit*0.60), seg:"PNS, TNI/POLRI, Karyawan Swasta Menengah" },
      { tipe:"Tipe 45/90", lb:45, lk:90, harga:Math.round(pd.hargaJual*1.27), unit:Math.floor(pd.totalUnit*0.25), seg:"Wirausaha, Dokter, Guru, Karyawan Senior" },
      { tipe:"Tipe 54/108", lb:54, lk:108, harga:Math.round(pd.hargaJual*1.57), unit:Math.floor(pd.totalUnit*0.15), seg:"Profesional, Pejabat, Pengusaha" },
    ];
    for (const tp of tipes) {
      await rr(
        `INSERT INTO planning_product (project_id,house_type,building_area,kavling_area,selling_price,unit_count,target_segment,competitor_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pid, tp.tipe, tp.lb, tp.lk, tp.harga, tp.unit, tp.seg, Math.round(tp.harga * 1.08)]
      ).catch(() => {});
    }

    // Planning Market
    const pop = rand(280000, 580000);
    await rr(
      `INSERT INTO planning_market (project_id,kabupaten,population,population_growth,kk_count,umk,avg_income,asn_count,private_employees,umkm_count,unemployment_rate,active_developers,active_banks,target_price,demand_score,market_potential_score,market_recommendation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [pid, pd.kab, pop, +(1.8 + Math.random()*1.5).toFixed(2),
        Math.floor(pop/4), 3200000 + rand(0,1200000),
        4500000 + rand(0,2500000),
        Math.floor(pop*0.045), Math.floor(pop*0.13), Math.floor(pop*0.09),
        +(3.5 + Math.random()*3.5).toFixed(1),
        rand(3,8), rand(4,7),
        pd.hargaJual,
        rand(65, 88), rand(62, 85),
        pi < 2 ? "Potensi pasar sangat tinggi, permintaan rumah komersial dan bersubsidi kuat" :
        pi === 4 ? "Potensi pasar sedang - daya beli masyarakat perlu diperkuat dengan skema KPR fleksibel" :
        "Potensi pasar baik, perlu penguatan brand awareness lokal"]
    ).catch(() => {});

    // Planning Cashflow - 36 bulan
    for (let m = 1; m <= 36; m++) {
      const d = new Date(baseYear, baseMonth - 1 + m - 1, 1);
      const monthLabel = d.toLocaleDateString("id-ID", { month: "long", year:"numeric" });
      const isEarly = m <= 3;
      const isMid = m > 3 && m <= 18;
      const constructionOut = isEarly ? 0 : isMid ? rand(500000000, 1200000000) : rand(200000000, 600000000);
      const htIn = m >= 6 ? rand(185000000, 980000000) : 0;
      const dpIn = m >= 2 && m <= 20 ? pd.hargaJual * rand(1,5) * 0.1 : 0;
      await rr(
        `INSERT INTO planning_cashflow (project_id,month_number,month_label,land_cost_out,construction_cost_out,marketing_cost_out,operational_cost_out,booking_fee_in,ht_kpr_in,conservative_units,moderate_units,aggressive_units)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [pid, m, monthLabel,
          m === 1 ? biayaLahan : 0,
          constructionOut, rand(30000000, 80000000), rand(50000000, 120000000),
          dpIn, htIn,
          rand(0,3), rand(1,5), rand(3,9)]
      );
    }

    // Milestones per proyek
    const milestonesByProject = [
      // Gowa - sebagian besar sudah selesai
      [
        { phase:"Persiapan", task:"Groundbreaking Ceremony", target:"2023-08-01", actual:"2023-08-05", status:"selesai", pct:100 },
        { phase:"Konstruksi", task:"Selesai Pondasi Blok A & B (40 unit)", target:"2024-01-01", actual:"2024-01-20", status:"selesai", pct:100 },
        { phase:"Marketing", task:"Grand Launching Proyek", target:"2024-02-01", actual:"2024-02-01", status:"selesai", pct:100 },
        { phase:"Konstruksi", task:"Selesai Struktur Blok C & D (40 unit)", target:"2024-06-01", actual:"2024-06-15", status:"selesai", pct:100 },
        { phase:"Konstruksi", task:"Selesai Finishing 50% Unit Tahap 1", target:"2025-03-01", actual:null, status:"berjalan", pct:68 },
        { phase:"Serah Terima", task:"Serah Terima Batch 1 (30 unit)", target:"2025-09-01", actual:null, status:"berjalan", pct:25 },
        { phase:"Konstruksi", task:"Selesai Seluruh 200 Unit", target:"2026-03-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Serah Terima", task:"Serah Terima Final", target:"2026-06-30", actual:null, status:"belum_mulai", pct:0 },
      ],
      // Maros - baru mulai
      [
        { phase:"Persiapan", task:"Pembebasan Lahan Selesai 100%", target:"2024-03-01", actual:"2024-03-20", status:"selesai", pct:100 },
        { phase:"Marketing", task:"Pre-launching & Booking Perdana", target:"2024-04-01", actual:"2024-04-10", status:"selesai", pct:100 },
        { phase:"Konstruksi", task:"Groundbreaking & Mulai Konstruksi Blok A", target:"2024-07-01", actual:"2024-07-15", status:"selesai", pct:100 },
        { phase:"Konstruksi", task:"Selesai Pondasi 60 Unit Tahap 1", target:"2025-01-01", actual:null, status:"berjalan", pct:40 },
        { phase:"Marketing", task:"Grand Launching Open House", target:"2025-03-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Konstruksi", task:"Selesai Finishing 50 Unit Pertama", target:"2025-10-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Serah Terima", task:"Serah Terima Pertama", target:"2026-01-01", actual:null, status:"belum_mulai", pct:0 },
      ],
      // Takalar - masih akuisisi
      [
        { phase:"Akuisisi", task:"Survei dan Penilaian Lahan", target:"2025-01-01", actual:"2025-01-10", status:"selesai", pct:100 },
        { phase:"Akuisisi", task:"Negosiasi dan Kesepakatan Harga", target:"2025-03-01", actual:null, status:"berjalan", pct:55 },
        { phase:"Akuisisi", task:"Pembayaran Lahan Selesai", target:"2025-07-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Legal", task:"Proses Sertifikasi & IMB", target:"2025-12-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Konstruksi", task:"Groundbreaking Ceremony", target:"2026-03-01", actual:null, status:"belum_mulai", pct:0 },
      ],
      // Pangkep - legal
      [
        { phase:"Akuisisi", task:"Pembebasan Lahan Selesai", target:"2024-12-01", actual:"2024-12-15", status:"selesai", pct:100 },
        { phase:"Legal", task:"Pengajuan KKPR", target:"2025-02-01", actual:"2025-02-10", status:"selesai", pct:100 },
        { phase:"Legal", task:"Pengurusan HGB & PBG", target:"2025-06-01", actual:null, status:"berjalan", pct:45 },
        { phase:"Legal", task:"Amdal Disetujui", target:"2025-08-01", actual:null, status:"berjalan", pct:30 },
        { phase:"Marketing", task:"Soft Launching Pre-Booking", target:"2025-10-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Konstruksi", task:"Groundbreaking Ceremony", target:"2026-01-01", actual:null, status:"belum_mulai", pct:0 },
      ],
      // Watampone - planning
      [
        { phase:"Perencanaan", task:"Studi Kelayakan Awal Selesai", target:"2025-06-01", actual:"2025-06-20", status:"selesai", pct:100 },
        { phase:"Perencanaan", task:"Survei Pasar & Kompetitor", target:"2025-08-01", actual:null, status:"berjalan", pct:60 },
        { phase:"Akuisisi", task:"Negosiasi Harga Lahan", target:"2025-10-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Legal", task:"Proses Perizinan Dasar", target:"2026-04-01", actual:null, status:"belum_mulai", pct:0 },
        { phase:"Konstruksi", task:"Groundbreaking", target:"2026-10-01", actual:null, status:"belum_mulai", pct:0 },
      ],
    ];
    for (const ms of milestonesByProject[pi]) {
      await rr(
        `INSERT INTO planning_milestones (project_id,phase,task_name,target_date,actual_date,status,progress_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [pid, ms.phase, ms.task, ms.target, ms.actual, ms.status, ms.pct]
      ).catch(() => {});
    }
  }
}

// ─── HANDOVERS ────────────────────────────────────────────────────────────────
async function seedHandovers(unitIds, customers) {
  console.log("🔑 Seed: Handovers...");
  // Handover untuk unit yang sudah sold dan customer sudah cair/ht
  const eligible = customers.filter(c => c.kprSt === "cair" || c.kprSt === "ht");
  for (let i = 0; i < Math.min(40, eligible.length); i++) {
    const c = eligible[i];
    const skor = +(rand(70, 100) / 10).toFixed(1);
    await rr(
      `INSERT INTO handovers (unit_id,customer_id,tanggal,skor_kepuasan,bast_generated,catatan)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [c.unitId, c.id,
        `2024-${String(rand(10,12)).padStart(2,'0')}-${String(rand(5,28)).padStart(2,'0')}`,
        skor, skor > 8.0,
        skor >= 9.0 ? "Customer sangat puas, proses serah terima berjalan lancar dan tepat waktu" :
        skor >= 8.0 ? "Customer puas, ada beberapa catatan minor yang sudah ditindaklanjuti" :
        skor >= 7.0 ? "Customer cukup puas, terdapat beberapa item yang perlu rework ringan" :
        "Customer kurang puas - ada keterlambatan dan beberapa defect perlu diperbaiki segera"]
    );
  }
}

// ─── HR ──────────────────────────────────────────────────────────────────────
async function seedHR() {
  console.log("👔 Seed: Human Resources (25 karyawan)...");
  const employees = [
    // Manajemen
    { name:"H. Mukhtar Salim, SE", div:"Manajemen", pos:"Direktur Utama", code:"DIR-001", mgr:null, sal:18000000, join:"2019-01-01", loc:"Makassar" },
    { name:"Ir. Ruslan Mappasanda", div:"Manajemen", pos:"Direktur Teknik", code:"DIR-002", mgr:0, sal:15000000, join:"2019-03-01", loc:"Makassar" },
    { name:"Dra. Andi Nurmiati", div:"Manajemen", pos:"Direktur Keuangan", code:"DIR-003", mgr:0, sal:15000000, join:"2019-03-01", loc:"Makassar" },
    // Sales & Marketing
    { name:"Ahmad Fauzi Kadir", div:"Sales & Marketing", pos:"Manajer Marketing", code:"MKT-001", mgr:0, sal:9500000, join:"2020-02-01", loc:"Makassar" },
    { name:"Rahmat Saleh Dg Ngemba", div:"Sales & Marketing", pos:"Supervisor Sales", code:"MKT-002", mgr:3, sal:7500000, join:"2020-08-01", loc:"Makassar" },
    { name:"Dewi Sartika Arifin", div:"Sales & Marketing", pos:"Agen Properti Senior", code:"MKT-003", mgr:4, sal:5500000, join:"2021-01-15", loc:"Gowa" },
    { name:"Irfan Gunawan", div:"Sales & Marketing", pos:"Agen Properti", code:"MKT-004", mgr:4, sal:5000000, join:"2021-06-01", loc:"Gowa" },
    { name:"Nurul Aisyah", div:"Sales & Marketing", pos:"Agen Properti", code:"MKT-005", mgr:4, sal:5000000, join:"2022-01-01", loc:"Maros" },
    { name:"Faisal Akbar", div:"Sales & Marketing", pos:"Agen Properti", code:"MKT-006", mgr:4, sal:5000000, join:"2022-07-01", loc:"Maros" },
    { name:"Sulaiman Yahya", div:"Sales & Marketing", pos:"Digital Marketing", code:"MKT-007", mgr:3, sal:6000000, join:"2021-09-01", loc:"Makassar" },
    // Keuangan
    { name:"Siti Rahmah, SE, Ak", div:"Keuangan & Akuntansi", pos:"Manajer Keuangan", code:"FIN-001", mgr:2, sal:10000000, join:"2019-06-01", loc:"Makassar" },
    { name:"Kartini Budi", div:"Keuangan & Akuntansi", pos:"Staff Akuntansi Senior", code:"FIN-002", mgr:10, sal:6500000, join:"2020-10-01", loc:"Makassar" },
    { name:"Murniati Latif", div:"Keuangan & Akuntansi", pos:"Staff Keuangan", code:"FIN-003", mgr:10, sal:5500000, join:"2022-04-01", loc:"Makassar" },
    // Legal
    { name:"Andi Wijaya, SH", div:"Legal & Perizinan", pos:"Kepala Legal", code:"LEG-001", mgr:0, sal:9000000, join:"2019-09-01", loc:"Makassar" },
    { name:"Zulkifli Rahman, SH", div:"Legal & Perizinan", pos:"Staff Legal Senior", code:"LEG-002", mgr:13, sal:6000000, join:"2021-03-01", loc:"Makassar" },
    // Teknik
    { name:"Budi Santoso, ST", div:"Teknik & Konstruksi", pos:"Manajer Proyek", code:"TKN-001", mgr:1, sal:10500000, join:"2019-07-01", loc:"Gowa" },
    { name:"Yusuf Prasetyo, ST", div:"Teknik & Konstruksi", pos:"Site Engineer Gowa", code:"TKN-002", mgr:15, sal:7000000, join:"2020-11-01", loc:"Gowa" },
    { name:"Syahrul Ramadhan, ST", div:"Teknik & Konstruksi", pos:"Quality Control", code:"TKN-003", mgr:15, sal:6500000, join:"2021-05-01", loc:"Gowa" },
    { name:"Hamzah Patta, ST", div:"Teknik & Konstruksi", pos:"Site Engineer Maros", code:"TKN-004", mgr:15, sal:6800000, join:"2022-01-01", loc:"Maros" },
    { name:"Burhanuddin Ahmad", div:"Teknik & Konstruksi", pos:"Logistik Material", code:"TKN-005", mgr:15, sal:5500000, join:"2022-08-01", loc:"Gowa" },
    // Admin KPR
    { name:"Nur Hidayah Ramli", div:"Administrasi KPR", pos:"Kepala Admin KPR", code:"ADM-001", mgr:0, sal:8500000, join:"2020-01-01", loc:"Makassar" },
    { name:"Hasna Wati", div:"Administrasi KPR", pos:"Staff Admin KPR Senior", code:"ADM-002", mgr:20, sal:5500000, join:"2021-02-01", loc:"Makassar" },
    { name:"Aminah Boru", div:"Administrasi KPR", pos:"Staff Admin KPR", code:"ADM-003", mgr:20, sal:5000000, join:"2022-09-01", loc:"Makassar" },
    // HR
    { name:"Maryam Salim, SE", div:"Human Resources", pos:"Manajer HR", code:"HR-001", mgr:0, sal:8000000, join:"2020-05-01", loc:"Makassar" },
    { name:"Sahruni Ambo", div:"Human Resources", pos:"Staff HR & GA", code:"HR-002", mgr:23, sal:5000000, join:"2022-11-01", loc:"Makassar" },
  ];

  const empIds = [];
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const mgrId = e.mgr === null ? null : e.mgr === 0 ? null : empIds[e.mgr] || null;
    const res = await r(
      `INSERT INTO hr_employees (employee_code,name,division,position,direct_manager_id,employment_status,join_date,location,email,phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [e.code, e.name, e.div, e.pos, mgrId, "aktif",
        e.join, e.loc,
        `${e.code.toLowerCase().replace(/-/g,'.')}@satara-development.id`,
        `08${String(rand(100000000,999999999))}`]
    );
    empIds.push(res.rows[0].id);
  }

  // KPI Definitions
  const kpiDefs = [
    { pos:"Agen Properti", div:"Sales & Marketing", name:"Jumlah Leads per Bulan", unit:"leads", target:30, weight:20 },
    { pos:"Agen Properti", div:"Sales & Marketing", name:"Jumlah Unit Terjual", unit:"unit", target:3, weight:40 },
    { pos:"Agen Properti", div:"Sales & Marketing", name:"Tingkat Konversi Lead ke Booking", unit:"%", target:12, weight:25 },
    { pos:"Agen Properti", div:"Sales & Marketing", name:"Kecepatan Follow-up Lead (jam)", unit:"jam", target:2, weight:15 },
    { pos:"Supervisor Sales", div:"Sales & Marketing", name:"Target Tim Booking Bulanan", unit:"unit", target:12, weight:40 },
    { pos:"Supervisor Sales", div:"Sales & Marketing", name:"CPL (Cost Per Lead)", unit:"IDR", target:120000, weight:30 },
    { pos:"Manajer Proyek", div:"Teknik & Konstruksi", name:"Progress Konstruksi Bulanan", unit:"%", target:8, weight:40 },
    { pos:"Manajer Proyek", div:"Teknik & Konstruksi", name:"QC Pass Rate", unit:"%", target:95, weight:30 },
    { pos:"Manajer Proyek", div:"Teknik & Konstruksi", name:"Budget Variance", unit:"%", target:5, weight:30 },
    { pos:"Kepala Admin KPR", div:"Administrasi KPR", name:"Akad per Bulan", unit:"akad", target:10, weight:35 },
    { pos:"Kepala Admin KPR", div:"Administrasi KPR", name:"Berkas Lengkap per Bulan", unit:"berkas", target:15, weight:30 },
    { pos:"Kepala Admin KPR", div:"Administrasi KPR", name:"Waktu Proses KPR (hari)", unit:"hari", target:45, weight:35 },
    { pos:"Manajer Keuangan", div:"Keuangan & Akuntansi", name:"Laporan Keuangan Tepat Waktu", unit:"%", target:100, weight:30 },
    { pos:"Manajer Keuangan", div:"Keuangan & Akuntansi", name:"Budget Realisasi vs RAB", unit:"%", target:95, weight:40 },
    { pos:"Kepala Legal", div:"Legal & Perizinan", name:"Dokumen Diselesaikan Tepat Waktu", unit:"%", target:90, weight:50 },
    { pos:"Manajer HR", div:"Human Resources", name:"Turnover Rate", unit:"%", target:5, weight:40 },
    { pos:"Manajer HR", div:"Human Resources", name:"Training Completion Rate", unit:"%", target:90, weight:30 },
  ];
  const kpiDefIds = [];
  for (const kd of kpiDefs) {
    const res = await r(
      `INSERT INTO hr_kpi_definitions (position,division,kpi_name,unit,monthly_target,weight,data_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [kd.pos, kd.div, kd.name, kd.unit, kd.target, kd.weight, "manual"]
    );
    kpiDefIds.push(res.rows[0].id);
  }

  // Months (12 bulan terakhir)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  // KPI Records
  const achByEmployee = [
    // Dir utama - tidak dinilai KPI standar
    null, null, null,
    // Manajer Marketing (MKT-001)
    { kpiIdxRange:[4,5], targets:[12,120000], actuals:[[10,12,11,13,12,11,9,12,14,11,12,13],[140000,130000,125000,118000,122000,135000,145000,128000,115000,120000,132000,125000]] },
    // SPV Sales
    { kpiIdxRange:[4,5], targets:[12,120000], actuals:[[9,11,10,12,11,10,8,11,13,10,11,12],[145000,138000,130000,122000,128000,142000,150000,135000,118000,125000,138000,130000]] },
    // Agen senior
    { kpiIdxRange:[0,3], targets:[30,3,12,2], actuals:[[28,32,25,35,30,28,22,33,38,30,31,34],[3,3,2,4,3,3,2,3,4,3,3,4],[10,11,8,13,11,10,7,12,13,11,11,13],[2,2,3,1,2,2,3,2,1,2,2,2]] },
    // Agen
    { kpiIdxRange:[0,3], targets:[30,3,12,2], actuals:[[22,25,20,28,24,21,18,26,30,23,25,27],[2,2,2,3,2,2,1,2,3,2,2,3],[8,9,7,10,8,8,6,9,11,8,9,10],[2,3,2,2,2,3,2,3,2,2,3,2]] },
    { kpiIdxRange:[0,3], targets:[30,3,12,2], actuals:[[20,23,18,26,22,19,16,24,28,21,23,25],[2,2,1,3,2,2,1,2,3,2,2,3],[7,8,6,9,7,7,5,8,10,7,8,9],[2,3,2,2,2,3,2,3,2,2,3,2]] },
    { kpiIdxRange:[0,3], targets:[30,3,12,2], actuals:[[18,20,16,22,19,17,14,21,25,18,20,22],[1,2,1,2,2,1,1,2,2,2,2,2],[6,7,5,8,6,6,4,7,9,6,7,8],[3,3,2,2,3,3,2,3,2,3,3,2]] },
    // Digital marketing
    null,
    // Manajer Keuangan
    { kpiIdxRange:[12,13], targets:[100,95], actuals:[[100,100,95,100,100,90,100,100,100,95,100,100],[96,94,92,97,95,93,96,95,98,94,96,97]] },
    // Staff keuangan
    null, null,
    // Kepala Legal
    { kpiIdxRange:[14,14], targets:[90], actuals:[[85,88,80,90,88,82,75,88,92,86,89,90]] },
    // Staff legal
    null,
    // Manajer Proyek
    { kpiIdxRange:[6,8], targets:[8,95,5], actuals:[[7,8,6,9,8,7,5,8,9,8,8,8],[92,93,88,95,93,90,85,93,96,92,94,95],[4,5,7,3,4,6,8,4,3,5,4,4]] },
    // Site eng, QC, site eng 2, logistik
    null, null, null, null,
    // Kepala admin KPR
    { kpiIdxRange:[9,11], targets:[10,15,45], actuals:[[8,10,7,12,10,9,6,11,13,10,11,12],[12,15,10,18,14,12,9,16,18,14,15,16],[48,44,52,40,42,46,55,42,38,44,42,40]] },
    // Staff admin KPR
    null, null,
    // Manajer HR
    { kpiIdxRange:[15,16], targets:[5,90], actuals:[[3,4,2,4,3,3,5,3,2,4,3,3],[88,92,85,94,90,88,82,92,95,90,92,93]] },
    // Staff HR
    null,
  ];

  for (let ei = 0; ei < empIds.length; ei++) {
    const eid = empIds[ei];
    const ach = achByEmployee[ei];
    if (!ach) {
      // Isi dengan random untuk yang tidak spesifik
      for (const { year, month } of months) {
        for (const kidx of [0, 1]) {
          if (kidx < kpiDefIds.length) {
            const tgt = rand(10, 50);
            const act = rand(Math.floor(tgt * 0.6), Math.floor(tgt * 1.3));
            await rr(
              `INSERT INTO hr_kpi_records (employee_id,kpi_definition_id,period_year,period_month,target,actual,achievement_pct)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [eid, kpiDefIds[kidx], year, month, tgt, act, pct(act, tgt)]
            );
          }
        }
      }
    } else {
      for (let mi = 0; mi < months.length; mi++) {
        const { year, month } = months[mi];
        const kpiRange = Array.isArray(ach.kpiIdxRange) ?
          Array.from({length: ach.kpiIdxRange[1]-ach.kpiIdxRange[0]+1}, (_,k) => k + ach.kpiIdxRange[0]) :
          [ach.kpiIdxRange];
        for (let k = 0; k < kpiRange.length; k++) {
          const kidxAbs = kpiRange[k];
          if (kidxAbs >= kpiDefIds.length) continue;
          const tgt = ach.targets[k] || rand(10,50);
          const act = ach.actuals[k]?.[mi] || rand(Math.floor(tgt*0.7), Math.floor(tgt*1.2));
          await rr(
            `INSERT INTO hr_kpi_records (employee_id,kpi_definition_id,period_year,period_month,target,actual,achievement_pct)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [eid, kpiDefIds[kidxAbs], year, month, tgt, act, pct(act, tgt)]
          );
        }
      }
    }
  }

  // Compensation Records (12 bulan)
  const salaries = employees.map(e => e.sal);
  for (let ei = 0; ei < empIds.length; ei++) {
    for (const { year, month } of months) {
      const base = salaries[ei] || 5000000;
      const allow = Math.round(base * 0.18);
      const bonus = Math.random() > 0.45 ? Math.round(base * 0.15) : 0;
      const insentif = Math.random() > 0.65 ? rand(500000, 2000000) : 0;
      const thr = month === 4 ? Math.round(base * 1.0) : 0;
      const deduction = Math.round(base * 0.02) + 50000;
      const total = base + allow + bonus + insentif + thr - deduction;
      await rr(
        `INSERT INTO hr_compensation_records (employee_id,period_year,period_month,base_salary,fixed_allowance,performance_bonus,incentive,thr,deduction,total_take_home,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [empIds[ei], year, month, base, allow, bonus, insentif, thr, deduction, total,
          thr > 0 ? "Termasuk THR bulan April" : null]
      );
    }
  }

  // Culture Records (kehadiran & disiplin)
  for (let ei = 0; ei < empIds.length; ei++) {
    for (const { year, month } of months) {
      const workDays = 22;
      const isProblematic = ei === 6 || ei === 22; // Beberapa karyawan bermasalah
      const daysPresent = isProblematic ? rand(16, 20) : rand(19, 22);
      const lateCount = isProblematic ? rand(3, 8) : rand(0, 2);
      const violations = isProblematic ? rand(0, 2) : 0;
      await rr(
        `INSERT INTO hr_culture_records (employee_id,period_year,period_month,days_present,working_days,late_count,discipline_violations,sop_compliance_score,task_completion_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [empIds[ei], year, month,
          daysPresent, workDays, lateCount, violations,
          isProblematic ? rand(60, 78) : rand(80, 98),
          isProblematic ? rand(65, 80) : rand(82, 98)]
      );
    }
  }

  // Workload Records
  const divisions = ["Sales & Marketing","Keuangan & Akuntansi","Legal & Perizinan","Teknik & Konstruksi","Administrasi KPR","Human Resources","Manajemen"];
  for (const div of divisions) {
    for (const { year, month } of months) {
      const isOverloaded = div === "Teknik & Konstruksi" || div === "Administrasi KPR";
      const load = isOverloaded ? rand(95, 125) : rand(65, 95);
      await rr(
        `INSERT INTO hr_workload_records (division,period_year,period_month,capacity,actual_load,load_description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [div, year, month, 100, load,
          load > 110 ? `OVERLOAD - ${div} butuh penambahan headcount segera` :
          load > 100 ? `Beban tinggi - ${div} bekerja lembur` :
          `Beban kerja normal - ${div}`]
      );
    }
  }

  // Recruitment Needs
  const rNeeds = [
    { pos:"Agen Properti Senior", div:"Sales & Marketing", needed:3, filled:1, status:"dibuka", jd:"Berpengalaman di sektor properti min 2 tahun, target-oriented, fasih komunikasi" },
    { pos:"Staff Akuntansi", div:"Keuangan & Akuntansi", needed:2, filled:0, status:"dibuka", jd:"D3/S1 Akuntansi, berpengalaman di laporan keuangan properti, familiar SAK ETAP" },
    { pos:"Site Engineer", div:"Teknik & Konstruksi", needed:3, filled:1, status:"proses", jd:"S1 Teknik Sipil, pengalaman di proyek perumahan min 3 tahun, bisa AutoCAD" },
    { pos:"Staff Legal Junior", div:"Legal & Perizinan", needed:1, filled:0, status:"ditangguhkan", jd:"S1 Hukum, memahami hukum pertanahan dan perizinan properti" },
    { pos:"Digital Marketing Specialist", div:"Sales & Marketing", needed:1, filled:0, status:"dibuka", jd:"S1 Marketing/Komunikasi, expertise Instagram/TikTok ads, Google Ads, min 1 tahun" },
    { pos:"Staff Admin KPR", div:"Administrasi KPR", needed:2, filled:1, status:"proses", jd:"D3/S1, berpengalaman proses KPR BTN/BRI/BSI, teliti dan komunikatif" },
  ];
  const needIds = [];
  for (const rn of rNeeds) {
    const res = await r(
      `INSERT INTO hr_recruitment_needs (position_name,division,headcount_needed,headcount_filled,target_hire_date,status,pic_recruiter,job_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [rn.pos, rn.div, rn.needed, rn.filled,
        "2025-07-01", rn.status, "Maryam Salim HR", rn.jd]
    );
    needIds.push(res.rows[0].id);
  }

  // Kandidat per lowongan
  const candidatePool = [
    "Bahar Lahuddin","Ibrahim Ali","Fatima Zahra","Hasan Basri","Nur Alam Dg Ngemba",
    "Rusdi Hardianto","Salmiah Kadir","Muh Arif Hidayat","Wahyuni Syam","Reza Firmansyah",
    "Dian Pertiwi","Ahmad Zulfikar","Sri Handayani","Ridwan Tahir","Nurlina Amir",
  ];
  const stages = ["screening_cv","interview_hr","interview_user","tes_teknis","offering","rejected","hired"];
  for (let ni = 0; ni < needIds.length; ni++) {
    const candCount = rand(3, 6);
    for (let c = 0; c < candCount; c++) {
      await rr(
        `INSERT INTO hr_recruitment_candidates (need_id,name,phone,source,stage,stage_date,recruiter_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [needIds[ni],
          candidatePool[(ni * 6 + c) % candidatePool.length],
          `08${String(ni*10+c+200).padStart(9,'0')}`,
          pick(["jobstreet","linkedin","referral","walk_in","indeed"]),
          stages[(ni + c) % (stages.length - 1)],
          `2025-0${rand(1,6)}-${String(rand(5,28)).padStart(2,'0')}`,
          c % 3 === 0 ? "Kandidat potensial, perlu interview lanjutan" :
          c % 3 === 1 ? "Pengalaman cukup baik, sesuai kualifikasi" :
          "Perlu dipertimbangkan, ada gap skill pada area tertentu"]
      );
    }
  }

  // Flight Risk
  const nowFR = new Date();
  for (let ei = 0; ei < empIds.length; ei++) {
    const isRisk = [6, 7, 16, 22].includes(ei);
    const riskScore = isRisk ? rand(55, 85) : rand(10, 45);
    await rr(
      `INSERT INTO hr_flight_risk_records (employee_id,period_year,period_quarter,months_without_promotion,salary_market_gap_pct,job_satisfaction_score,has_external_offer,flight_risk_score,risk_level,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [empIds[ei], nowFR.getFullYear(), Math.ceil((nowFR.getMonth()+1)/3),
        rand(6, 36), rand(-15, 25),
        +(rand(50,90)/10).toFixed(1),
        isRisk && Math.random() > 0.5 ? "ya" : "tidak",
        riskScore,
        riskScore > 70 ? "tinggi" : riskScore > 45 ? "sedang" : "rendah",
        isRisk ? "Perlu perhatian khusus - monitor dan lakukan retention program" :
          "Dalam kondisi engaged dan puas dengan pekerjaan"]
    );
  }

  // Succession Plans
  await rr(
    `INSERT INTO hr_succession_plans (critical_position,current_holder_id,backup1_id,backup1_readiness,backup2_id,backup2_readiness,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Direktur Utama", empIds[0], empIds[1], "siap_12_bulan", empIds[2], "perlu_2_tahun", "Perlu program akselerasi untuk kedua kandidat"]
  );
  await rr(
    `INSERT INTO hr_succession_plans (critical_position,current_holder_id,backup1_id,backup1_readiness,backup2_id,backup2_readiness,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Manajer Marketing", empIds[3], empIds[4], "siap_6_bulan", empIds[9], "perlu_18_bulan", "Rahmat sudah menunjukkan kapabilitas leadership yang baik"]
  );
  await rr(
    `INSERT INTO hr_succession_plans (critical_position,current_holder_id,backup1_id,backup1_readiness,backup2_id,backup2_readiness,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Manajer Proyek", empIds[15], empIds[16], "siap_12_bulan", empIds[17], "perlu_2_tahun", "Yusuf sedang dalam program mentoring intensif dari Pak Budi"]
  );
  await rr(
    `INSERT INTO hr_succession_plans (critical_position,current_holder_id,backup1_id,backup1_readiness,backup2_id,backup2_readiness,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Manajer Keuangan", empIds[10], empIds[11], "siap_12_bulan", null, null, "Perlu rekrut kandidat eksternal sebagai backup kedua"]
  );

  // Productivity Records
  for (const { year, month } of months) {
    const rev = rand(3500000000, 9500000000);
    await rr(
      `INSERT INTO hr_productivity_records (period_year,period_month,total_revenue,total_profit,total_units_sold)
       VALUES ($1,$2,$3,$4,$5)`,
      [year, month, rev, Math.round(rev * 0.17), rand(3, 15)]
    ).catch(() => {});
  }

  // Career Paths
  const careerPaths = [
    { div:"Sales & Marketing", level:1, pos:"Agen Properti Trainee", prev:null, minTenure:0, minKpi:0, minComp:60 },
    { div:"Sales & Marketing", level:2, pos:"Agen Properti", prev:"Agen Properti Trainee", minTenure:6, minKpi:75, minComp:70 },
    { div:"Sales & Marketing", level:3, pos:"Agen Properti Senior", prev:"Agen Properti", minTenure:18, minKpi:85, minComp:75 },
    { div:"Sales & Marketing", level:4, pos:"Supervisor Sales", prev:"Agen Properti Senior", minTenure:36, minKpi:90, minComp:80 },
    { div:"Sales & Marketing", level:5, pos:"Manajer Marketing", prev:"Supervisor Sales", minTenure:60, minKpi:90, minComp:85 },
    { div:"Teknik & Konstruksi", level:1, pos:"Site Engineer Junior", prev:null, minTenure:0, minKpi:0, minComp:65 },
    { div:"Teknik & Konstruksi", level:2, pos:"Site Engineer", prev:"Site Engineer Junior", minTenure:12, minKpi:80, minComp:72 },
    { div:"Teknik & Konstruksi", level:3, pos:"Senior Site Engineer", prev:"Site Engineer", minTenure:30, minKpi:88, minComp:78 },
    { div:"Teknik & Konstruksi", level:4, pos:"Manajer Proyek", prev:"Senior Site Engineer", minTenure:48, minKpi:90, minComp:85 },
    { div:"Keuangan & Akuntansi", level:1, pos:"Staff Keuangan", prev:null, minTenure:0, minKpi:0, minComp:65 },
    { div:"Keuangan & Akuntansi", level:2, pos:"Staff Akuntansi Senior", prev:"Staff Keuangan", minTenure:18, minKpi:82, minComp:75 },
    { div:"Keuangan & Akuntansi", level:3, pos:"Manajer Keuangan", prev:"Staff Akuntansi Senior", minTenure:48, minKpi:90, minComp:85 },
  ];
  for (const cp of careerPaths) {
    await rr(
      `INSERT INTO hr_career_paths (division,level,position_name,previous_position,min_tenure_months,min_kpi_achievement,min_competency_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [cp.div, cp.level, cp.pos, cp.prev, cp.minTenure, cp.minKpi, cp.minComp]
    );
  }

  // Individual Issues
  const issues = [
    { proj:"Griya Sejahtera Gowa", div:"Teknik & Konstruksi", nama:"Mandor Hasan", masalah:"Sering terlambat hadir di site, koordinasi subkon terganggu", sol:"Peringatan tertulis + coaching langsung oleh SPV", dead:"2025-07-15", ket:"Dalam proses" },
    { proj:"Permata Maros Residence", div:"Sales & Marketing", nama:"Irfan Gunawan", masalah:"Performa sales di bawah target 3 bulan berturut-turut, konversi rendah", sol:"Retraining teknik closing + pendampingan oleh Supervisor", dead:"2025-07-30", ket:"Dalam proses" },
    { proj:"Semua Proyek", div:"Administrasi KPR", nama:"Aminah Boru", masalah:"Kesalahan input data customer berulang, menyebabkan dokumen harus direvisi", sol:"Training ulang SOP admin KPR, checklist wajib sebelum submit", dead:"2025-07-20", ket:"Selesai" },
  ];
  for (const iss of issues) {
    await rr(
      `INSERT INTO hr_individual_issues (project,tanggal,divisi,nama,masalah,solusi,deadline,keterangan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [iss.proj, "2025-06-01", iss.div, iss.nama, iss.masalah, iss.sol, iss.dead, iss.ket]
    ).catch(() => {});
  }

  return empIds;
}

// ─── FINANCE ─────────────────────────────────────────────────────────────────
async function seedFinance(pids) {
  console.log("💰 Seed: Finance (Cashflow, RAB, KPP, Utang, Piutang, Alert)...");
  const now = new Date();
  const curYear = now.getFullYear();
  const projectNames = [
    "Griya Sejahtera Gowa","Permata Maros Residence",
    "Bukit Indah Takalar","Mutiara Pangkep Residence","Grand Watampone"
  ];

  // Finance Upload Records
  const uploadRes = await rr(
    `INSERT INTO finance_uploads (file_type,file_name,period_year,period_month,row_count,status,uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    ["cashflow","cashflow_komprehensif_2025.xlsx", curYear, now.getMonth()+1, 250, "berhasil", "admin"]
  );
  const uploadId = uploadRes.rows[0]?.id || 1;

  // Cashflow Records - transaksi nyata per proyek
  const categories = {
    pemasukan: ["Booking Fee","Uang Muka","KPR Cair","HT Terbit","Down Payment","Refund Cancelled"],
    pengeluaran: ["Biaya Lahan","Biaya Konstruksi","Biaya Marketing","Gaji Karyawan","Biaya Legal","Biaya Overhead","Material Bangunan","Upah Subkon","Operasional Proyek"],
  };

  for (let pi = 0; pi < pids.length; pi++) {
    const pname = projectNames[pi];
    // 24 transaksi pemasukan
    for (let m = 0; m < 12; m++) {
      const bulan = String(m + 1).padStart(2,'0');
      const tahun = curYear - (m > 5 ? 1 : 0);
      const bulanAdj = m > 5 ? String(m - 5).padStart(2,'0') : bulan;
      // Pemasukan KPR
      await rr(
        `INSERT INTO finance_cashflow_records (upload_id,transaction_date,type,category,project_name,amount,description,reference_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uploadId, `${tahun}-${bulanAdj}-15`, "pemasukan", "KPR Cair", pname,
          rand(200000000, 980000000),
          `KPR Cair ${m + 1} unit - bulan ${bulanAdj}/${tahun}`,
          `KPR-${tahun}-${bulanAdj}-${String(pi+1).padStart(2,'0')}`]
      );
      // Pengeluaran konstruksi
      if (pi < 2) {
        await rr(
          `INSERT INTO finance_cashflow_records (upload_id,transaction_date,type,category,project_name,amount,description,reference_number)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uploadId, `${tahun}-${bulanAdj}-05`, "pengeluaran", "Biaya Konstruksi", pname,
            rand(300000000, 1100000000),
            `Progress pembayaran konstruksi bulan ${bulanAdj}/${tahun}`,
            `KONST-${tahun}-${bulanAdj}-${String(pi+1).padStart(2,'0')}`]
        );
      }
    }
    // Biaya lahan (sekali)
    if (pi < 4) {
      await rr(
        `INSERT INTO finance_cashflow_records (upload_id,transaction_date,type,category,project_name,amount,description,reference_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uploadId, `${curYear - 1}-0${pi+1}-01`, "pengeluaran", "Biaya Lahan", pname,
          [20875000000, 12700000000, 12510000000, 12650000000, 13160000000][pi],
          `Pembayaran lahan ${pname}`,
          `LAHAN-${curYear-1}-${String(pi+1).padStart(2,'0')}`]
      );
    }
    // Gaji bulanan
    for (let m = 1; m <= 6; m++) {
      await rr(
        `INSERT INTO finance_cashflow_records (upload_id,transaction_date,type,category,project_name,amount,description,reference_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uploadId, `${curYear}-${String(m).padStart(2,'0')}-28`, "pengeluaran", "Gaji Karyawan", pname,
          rand(180000000, 280000000),
          `Penggajian karyawan bulan ${m}/${curYear}`,
          `GAJ-${curYear}-${String(m).padStart(2,'0')}`]
      );
    }
  }

  // RAB Items
  const rabItems = [
    { cat:"pekerjaan_tanah", items:[
      { name:"Pembersihan Lahan & Land Clearing", rab:850000000 },
      { name:"Pematangan & Cut & Fill", rab:1200000000 },
      { name:"Pembuatan Jalan Lingkungan (Paving Block)", rab:2800000000 },
      { name:"Saluran Drainase Primer", rab:1100000000 },
    ]},
    { cat:"pekerjaan_struktur", items:[
      { name:"Pondasi Batu Kali + Sloof", rab:4200000000 },
      { name:"Struktur Kolom, Balok, Plat", rab:6500000000 },
      { name:"Dinding Bata Merah + Plesteran", rab:3800000000 },
      { name:"Atap & Rangka Baja Ringan", rab:3200000000 },
    ]},
    { cat:"pekerjaan_finishing", items:[
      { name:"Keramik Lantai & Dinding Semua Ruangan", rab:2400000000 },
      { name:"Kusen Aluminium, Pintu & Jendela", rab:1900000000 },
      { name:"Pengecatan Dalam & Luar", rab:1100000000 },
    ]},
    { cat:"mekanikal_elektrikal", items:[
      { name:"Instalasi Listrik PLN + Panel", rab:1800000000 },
      { name:"Instalasi Air Bersih & Air Kotor", rab:1200000000 },
      { name:"Sanitasi Lengkap per Unit", rab:900000000 },
    ]},
    { cat:"fasum_fasos", items:[
      { name:"Taman & Landscape RTH", rab:650000000 },
      { name:"Pos Keamanan & Gerbang Utama", rab:280000000 },
      { name:"Masjid / Musholla", rab:420000000 },
      { name:"Playground & Area Olahraga", rab:380000000 },
    ]},
    { cat:"overhead_proyek", items:[
      { name:"Direksi Keet & Fasilitas Site", rab:180000000 },
      { name:"Keselamatan Kerja (APD, Rambu)", rab:120000000 },
      { name:"Dokumentasi & Laporan Proyek", rab:80000000 },
    ]},
  ];
  const realizePct = [0.85, 0.35, 0.05, 0.15, 0.00];
  for (let pi = 0; pi < pids.length; pi++) {
    for (const catGroup of rabItems) {
      for (const item of catGroup.items) {
        const rabAmt = item.rab;
        const realAmt = Math.round(rabAmt * realizePct[pi] * (0.9 + Math.random() * 0.2));
        await rr(
          `INSERT INTO finance_rab_items (upload_id,project_name,stage_code,item_name,item_category,rab_amount,realization_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [uploadId, projectNames[pi], "STAGE_A", item.name, catGroup.cat, rabAmt, realAmt]
        );
      }
    }
  }

  // KPP Facilities (Kredit Pemilikan Proyek)
  const kppFacilities = [
    { proj:"Griya Sejahtera Gowa", bank:"Bank BTN", plafon:15000000000, disburse:"2023-09-01", tenor:36, rate:8.5 },
    { proj:"Griya Sejahtera Gowa", bank:"Bank BRI", plafon:8000000000, disburse:"2024-01-01", tenor:24, rate:9.0 },
    { proj:"Permata Maros Residence", bank:"BTN Syariah", plafon:12000000000, disburse:"2024-04-01", tenor:30, rate:7.8 },
    { proj:"Mutiara Pangkep Residence", bank:"Bank BSI", plafon:9000000000, disburse:"2025-02-01", tenor:36, rate:8.2 },
  ];
  for (const kpp of kppFacilities) {
    const kppRes = await rr(
      `INSERT INTO finance_kpp_facilities (project_name,bank_name,plafon,first_disbursement_date,tenor_months,interest_rate)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [kpp.proj, kpp.bank, kpp.plafon, kpp.disburse, kpp.tenor, kpp.rate]
    );
    if (kppRes.rows[0]) {
      // Beberapa payment
      for (let pm = 1; pm <= 4; pm++) {
        const d = new Date(kpp.disburse);
        d.setMonth(d.getMonth() + pm * 2);
        await rr(
          `INSERT INTO finance_kpp_payments (kpp_id,payment_date,principal_paid,interest_paid,notes)
           VALUES ($1,$2,$3,$4,$5)`,
          [kppRes.rows[0].id,
            d.toISOString().split('T')[0],
            Math.round(kpp.plafon / kpp.tenor * 2),
            Math.round(kpp.plafon * (kpp.rate/100) / 6),
            `Pembayaran termin ke-${pm}`]
        );
      }
    }
  }

  // Debt Records (Hutang)
  const debts = [
    { proj:"Griya Sejahtera Gowa", cred:"Bank BTN", cat:"KPP", total:15000000000, paid:8500000000, info:"KPP Fase 1 - Cicilan bulanan lancar", stage:"STAGE_A", due:"2026-08-31", status:"outstanding" },
    { proj:"Griya Sejahtera Gowa", cred:"Bank BRI", cat:"KPP", total:8000000000, paid:3200000000, info:"KPP Fase 2", stage:"STAGE_B", due:"2026-01-01", status:"outstanding" },
    { proj:"Griya Sejahtera Gowa", cred:"CV Bangunan Jaya Sulsel", cat:"hutang_subkon", total:3400000000, paid:2040000000, info:"Sisa termin 2 & 3 subkon struktur", stage:"STAGE_A", due:"2026-03-31", status:"outstanding" },
    { proj:"Permata Maros Residence", cred:"BTN Syariah", cat:"KPP", total:12000000000, paid:2000000000, info:"KPP Proyek Maros - masih awal disbursement", stage:"STAGE_A", due:"2026-10-01", status:"outstanding" },
    { proj:"Permata Maros Residence", cred:"Pemilik Lahan Maros", cat:"hutang_lahan", total:1800000000, paid:900000000, info:"Sisa pembayaran lahan Blok C - target lunas Q3 2025", stage:"STAGE_C", due:"2025-09-30", status:"outstanding" },
    { proj:"Bukit Indah Takalar", cred:"Pemilik Lahan Takalar", cat:"hutang_lahan", total:3500000000, paid:0, info:"Lahan belum dibeli, masih negosiasi - berpotensi gagal", stage:"STAGE_A", due:"2025-12-31", status:"outstanding" },
    { proj:"Mutiara Pangkep Residence", cred:"Bank BSI", cat:"KPP", total:9000000000, paid:500000000, info:"KPP Pangkep baru cair sebagian - tergantung progress legal", stage:"STAGE_A", due:"2028-02-01", status:"outstanding" },
  ];
  for (const d of debts) {
    await rr(
      `INSERT INTO finance_debt_records (upload_id,project_name,stage_info,creditor_name,category,total_amount,paid_amount,remaining_amount,due_date,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [uploadId, d.proj, d.stage, d.cred, d.cat, d.total, d.paid,
        d.total - d.paid, d.due, d.status, d.info]
    );
  }

  // Receivable Records (Piutang)
  const receivables = [
    { debtor:"30 Customer KPR Griya Gowa (Outstanding HT)", cat:"piutang_kpr", total:4440000000, due:"2025-08-31", status:"current", notes:"Piutang HT 30 unit yang masih dalam proses pencairan" },
    { debtor:"15 Customer Booking Permata Maros", cat:"piutang_dp", total:750000000, due:"2025-07-31", status:"current", notes:"Uang muka yang sudah diterima, unit dalam proses konstruksi" },
    { debtor:"Pemerintah Kab Gowa - Insentif Developer", cat:"piutang_lainnya", total:500000000, due:"2025-06-30", status:"overdue", notes:"KRITIS: Sudah jatuh tempo 45 hari, perlu eskalasi ke DPKD Gowa" },
    { debtor:"8 Customer Cancelled (Refund Pending)", cat:"piutang_lainnya", total:320000000, due:"2025-05-31", status:"overdue", notes:"Pembatalan karena tidak lolos BI Checking, refund sedang diproses" },
    { debtor:"Subkon CV Mitra - Retensi Klaim", cat:"piutang_retensi", total:850000000, due:"2026-01-31", status:"current", notes:"Retensi masa pemeliharaan yang akan dikembalikan setelah 3 bulan" },
    { debtor:"5 Unit Mutiara Pangkep Pre-booking", cat:"piutang_dp", total:250000000, due:"2025-09-30", status:"current", notes:"Pre-booking sebelum legal selesai - perlu dipantau" },
  ];
  for (const rv of receivables) {
    await rr(
      `INSERT INTO finance_receivable_records (upload_id,debtor_name,category,total_amount,due_date,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uploadId, rv.debtor, rv.cat, rv.total, rv.due, rv.status, rv.notes]
    );
  }

  // Audit Findings
  const auditFindings = [
    { type:"penyimpangan_anggaran", desc:"Biaya material Proyek Gowa melebihi RAB 12% pada bulan April - terjadi lonjakan harga semen", status:"dalam_review", reviewedBy:"Siti Rahmah CFO", amount:145000000 },
    { type:"keterlambatan_pembayaran", desc:"Pembayaran subkon Maros Termin 2 terlambat 15 hari dari jadwal akibat cashflow terganggu", status:"selesai", reviewedBy:"Siti Rahmah CFO", amount:360000000 },
    { type:"selisih_kas", desc:"Selisih kas petty cash site Gowa sebesar Rp 3.2 juta - perlu klarifikasi dari Mandor", status:"baru", reviewedBy:null, amount:3200000 },
    { type:"piutang_macet", desc:"Insentif developer dari Pemkab Gowa sudah jatuh tempo 45 hari belum cair", status:"dalam_review", reviewedBy:"Siti Rahmah CFO", amount:500000000 },
    { type:"budget_overrun", desc:"Biaya overhead Proyek Pangkep 18% di atas anggaran akibat delay legal yang berkepanjangan", status:"baru", reviewedBy:null, amount:95000000 },
  ];
  for (const af of auditFindings) {
    await rr(
      `INSERT INTO finance_audit_findings (upload_id,finding_type,description,transaction_date,amount,status,reviewed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uploadId, af.type, af.desc, `${curYear}-04-30`, af.amount, af.status, af.reviewedBy]
    );
  }

  // Finance Alerts
  const alerts = [
    { type:"piutang_jatuh_tempo", level:"high", msg:"Piutang insentif Pemkab Gowa Rp 500 juta sudah jatuh tempo 45 hari - segera eskalasi", amount:500000000, module:"finance" },
    { type:"cashflow_defisit", level:"high", msg:"Proyeksi cashflow Proyek Takalar defisit Rp 3.5M jika negosiasi lahan gagal - siapkan skenario B", amount:3500000000, module:"finance" },
    { type:"budget_overrun", level:"medium", msg:"Biaya material Gowa melebihi RAB 12% pada Q1 2025 - review efisiensi penggunaan material", amount:145000000, module:"finance" },
    { type:"utang_jatuh_tempo", level:"medium", msg:"Sisa hutang lahan Maros Blok C Rp 900 juta jatuh tempo September 2025 - siapkan dana", amount:900000000, module:"finance" },
    { type:"margin_tipis", level:"medium", msg:"Margin proyek Grand Watampone di bawah 15% berdasarkan feasibility terkini - perlu review", amount:null, module:"finance" },
    { type:"kpp_performance", level:"low", msg:"Penyerapan KPP Proyek Pangkep baru 5.6% dari plafon - koordinasi dengan BSI untuk percepatan", amount:9000000000, module:"finance" },
  ];
  for (const al of alerts) {
    await rr(
      `INSERT INTO finance_alerts (alert_type,level,message,amount,related_module)
       VALUES ($1,$2,$3,$4,$5)`,
      [al.type, al.level, al.msg, al.amount, al.module]
    );
  }
}

// ─── ANALYSIS FINDINGS (Fasum Progress) ──────────────────────────────────────
async function seedFasumAndAnalysis(pids) {
  console.log("🏫 Seed: Fasum Progress & Analysis...");
  const fasumItems = [
    { nama:"Gerbang Utama & Pos Satpam", bobot:5, pct:100 },
    { nama:"Jalan Lingkungan Paving Block", bobot:15, pct:80 },
    { nama:"Saluran Drainase Primer", bobot:10, pct:75 },
    { nama:"Taman & Ruang Terbuka Hijau", bobot:8, pct:40 },
    { nama:"Masjid / Musholla", bobot:10, pct:60 },
    { nama:"Playground & Area Olahraga", bobot:5, pct:30 },
    { nama:"PDAM & Jaringan Air Bersih", bobot:12, pct:90 },
    { nama:"Jaringan Listrik PLN", bobot:12, pct:95 },
    { nama:"Tempat Pembuangan Sampah", bobot:3, pct:100 },
    { nama:"Papan Informasi & Signage", bobot:2, pct:100 },
    { nama:"CCTV & Sistem Keamanan", bobot:5, pct:50 },
    { nama:"Kolam Resapan / Bio Pori", bobot:5, pct:20 },
    { nama:"Street Lighting (Lampu Jalan)", bobot:8, pct:85 },
  ];
  // Hanya untuk Gowa yang sudah CONSTRUCTION
  for (const item of fasumItems) {
    await rr(
      `INSERT INTO fasum_progress (project_id,nama_fasum,bobot,progress_pct,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [pids[0], item.nama, item.bobot, item.pct,
        item.pct === 100 ? "selesai" : item.pct >= 80 ? "dalam_progress" : item.pct > 0 ? "dalam_progress" : "belum_mulai",
        item.pct < 50 ? "Progress tertinggal dari jadwal - perlu akselerasi" : null]
    ).catch(() => {});
  }
  // Maros partial
  const fasumMaros = fasumItems.slice(0, 5).map(f => ({ ...f, pct: Math.round(f.pct * 0.25) }));
  for (const item of fasumMaros) {
    await rr(
      `INSERT INTO fasum_progress (project_id,nama_fasum,bobot,progress_pct,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [pids[1], item.nama, item.bobot, item.pct,
        item.pct > 0 ? "dalam_progress" : "belum_mulai", null]
    ).catch(() => {});
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const now = new Date();

async function main() {
  console.log("🚀 SEED KOMPREHENSIF - 5 Proyek @ 200 Unit\n");
  console.log("═".repeat(60));
  try {
    await clearAll();
    const pids = await seedProjects();
    console.log(`   → Project IDs: [${pids.join(', ')}]`);

    await seedBanks();
    await seedLandProspects(pids);
    await seedLandStages(pids);
    await seedLegalDocs(pids);
    await seedPermitDocs(pids);

    const unitIds = await seedUnits(pids);
    console.log(`   → Total units seeded: ${unitIds.length}`);

    const customers = await seedLeadsAndCustomers(pids, unitIds);
    console.log(`   → Total customers seeded: ${customers.length}`);

    await seedKprPipeline(customers);
    await seedConstruction(unitIds);
    await seedQC(unitIds);
    await seedMaterials(pids);
    await seedSubkon(pids);
    await seedMarketing(pids);
    await seedPlanning(pids);
    await seedHandovers(unitIds, customers);
    await seedHR();
    await seedFinance(pids);
    await seedFasumAndAnalysis(pids);

    console.log("\n" + "═".repeat(60));
    console.log("✅ SEED SELESAI!\n");
    console.log("📊 RINGKASAN ANALISIS KONDISI PROYEK:");
    console.log("─".repeat(60));
    console.log("🟢 Griya Sejahtera Gowa      : BAIK - konstruksi 68%, penjualan kuat");
    console.log("🟡 Permata Maros Residence   : SEDANG - marketing ok tapi CPL tinggi");
    console.log("🔴 Bukit Indah Takalar       : BERMASALAH - negosiasi lahan terhambat");
    console.log("🟡 Mutiara Pangkep Residence : SEDANG - delay legal 3 bulan, risiko cost overrun");
    console.log("🔴 Grand Watampone           : PERLU PERHATIAN - margin <15%, feasibility marginal");
    console.log("─".repeat(60));
    console.log("⚠️  TEMUAN KRITIS:");
    console.log("   • Piutang insentif Pemkab Gowa Rp 500jt overdue 45 hari");
    console.log("   • Takalar: negosiasi lahan macet, risiko gagal sangat tinggi");
    console.log("   • QC rate Maros 82% (di bawah target 95%) - rework meningkat");
    console.log("   • 4 karyawan flight risk level TINGGI - perlu retention program");
    console.log("   • Teknik & KPR overload (>110%) - butuh penambahan headcount");
    console.log("═".repeat(60));
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
