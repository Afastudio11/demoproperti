import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function clearAll() {
  console.log("🧹 Membersihkan data lama...");
  const tables = [
    "hr_flight_risk_records","hr_succession_plans","hr_productivity_records",
    "hr_workload_records","hr_culture_records","hr_compensation_records",
    "hr_training_participants","hr_training_programs","hr_competency_scores",
    "hr_competency_definitions","hr_kpi_records","hr_kpi_definitions",
    "hr_recruitment_candidates","hr_recruitment_needs","hr_expansion_needs",
    "hr_career_paths","hr_employees",
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
    await run(`DELETE FROM ${t}`).catch(() => {});
    await run(`ALTER SEQUENCE IF EXISTS ${t}_id_seq RESTART WITH 1`).catch(() => {});
  }
}

async function seedProjects() {
  console.log("🏗️  Seed: Projects...");
  const projects = [
    { nama:"Griya Sejahtera Gowa", lokasi:"Jl. Poros Malino Km 15, Gowa", provinsi:"Sulawesi Selatan", kabupaten:"Gowa", kecamatan:"Somba Opu", desa:"Sungguminasa", luas:12500, total_unit:120, fase:"CONSTRUCTION", status:"active", target_start:"2024-01-01", target_end:"2026-06-30", lat:-5.2042, lng:119.4572 },
    { nama:"Permata Maros Residence", lokasi:"Jl. Poros Makassar-Maros Km 25, Maros", provinsi:"Sulawesi Selatan", kabupaten:"Maros", kecamatan:"Turikale", desa:"Pettuadae", luas:8200, total_unit:80, fase:"MARKETING", status:"active", target_start:"2024-06-01", target_end:"2026-12-31", lat:-5.0072, lng:119.5799 },
    { nama:"Bukit Indah Takalar", lokasi:"Jl. Poros Takalar Km 40, Takalar", provinsi:"Sulawesi Selatan", kabupaten:"Takalar", kecamatan:"Pattallassang", desa:"Takalar", luas:6000, total_unit:60, fase:"LAND", status:"active", target_start:"2025-01-01", target_end:"2027-06-30", lat:-5.4333, lng:119.3917 },
    { nama:"Mutiara Pangkep", lokasi:"Jl. Trans Sulawesi Km 60, Pangkep", provinsi:"Sulawesi Selatan", kabupaten:"Pangkajene dan Kepulauan", kecamatan:"Pangkajene", desa:"Tekolabbua", luas:9500, total_unit:100, fase:"LEGAL", status:"active", target_start:"2024-09-01", target_end:"2027-01-31", lat:-4.8264, lng:119.5311 },
    { nama:"Grand Watampone", lokasi:"Jl. Watampone By Pass Km 5, Bone", provinsi:"Sulawesi Selatan", kabupaten:"Bone", kecamatan:"Tanete Riattang", desa:"Watampone", luas:15000, total_unit:150, fase:"PLANNING", status:"active", target_start:"2025-03-01", target_end:"2028-03-31", lat:-4.5366, lng:120.3269 },
  ];
  const ids: number[] = [];
  for (const p of projects) {
    const r = await run(
      `INSERT INTO projects (nama,lokasi,provinsi,kabupaten,kecamatan,desa,luas,total_unit,fase,status,target_start,target_end,lat,lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [p.nama,p.lokasi,p.provinsi,p.kabupaten,p.kecamatan,p.desa,p.luas,p.total_unit,p.fase,p.status,p.target_start,p.target_end,p.lat,p.lng]
    );
    ids.push(r.rows[0].id);
  }
  return ids;
}

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
    await run(`INSERT INTO banks (name,code,is_active) VALUES ($1,$2,true)`, [b.name, b.code]);
  }
}

async function seedLandProspects(projectIds: number[]) {
  console.log("🌍 Seed: Land Prospects...");
  const prospects = [
    { projectId: projectIds[0], lokasi:"Lahan Eks Perkebunan, Gowa", luas:5000, hargaM2:850000, status:"survey", roi:22.5, margin:18.3, riskLevel:"medium", kabupaten:"Gowa", kecamatan:"Bontomarannu", lat:-5.2189, lng:119.5012 },
    { projectId: projectIds[1], lokasi:"Tanah Sawah Pinggir Jalan, Maros", luas:3200, hargaM2:650000, status:"negosiasi", roi:19.8, margin:15.6, riskLevel:"low", kabupaten:"Maros", kecamatan:"Maros Baru", lat:-5.0215, lng:119.6022 },
    { projectId: projectIds[2], lokasi:"Kavling Strategis Depan Pasar, Takalar", luas:2800, hargaM2:720000, status:"disetujui", roi:24.1, margin:20.7, riskLevel:"low", kabupaten:"Takalar", kecamatan:"Polombangkeng Utara", lat:-5.4201, lng:119.4088 },
    { projectId: null, lokasi:"Lahan Potensial Sidrap", luas:8000, hargaM2:420000, status:"prospek_baru", roi:28.3, margin:23.5, riskLevel:"high", kabupaten:"Sidenreng Rappang", kecamatan:"Maritenggae", lat:-3.9168, lng:119.8598 },
    { projectId: null, lokasi:"Tanah Kosong Jeneponto", luas:6500, hargaM2:380000, status:"prospek_baru", roi:25.6, margin:21.2, riskLevel:"medium", kabupaten:"Jeneponto", kecamatan:"Binamu", lat:-5.6782, lng:119.7428 },
    { projectId: projectIds[3], lokasi:"Lahan Dekat Jalan Nasional Pangkep", luas:4200, hargaM2:590000, status:"due_diligence", roi:21.4, margin:17.8, riskLevel:"medium", kabupaten:"Pangkajene dan Kepulauan", kecamatan:"Bungoro", lat:-4.8788, lng:119.5889 },
  ];
  for (const lp of prospects) {
    await run(
      `INSERT INTO land_prospects (project_id,lokasi,luas,harga_m2,status,roi,margin,risk_level,kabupaten,kecamatan,lat,lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [lp.projectId,lp.lokasi,lp.luas,lp.hargaM2,lp.status,lp.roi,lp.margin,lp.riskLevel,lp.kabupaten,lp.kecamatan,lp.lat,lp.lng]
    );
  }
}

async function seedLegalDocs(projectIds: number[]) {
  console.log("⚖️  Seed: Legal Docs...");
  const types = ["SHM","HGB","AJB","PPJB","IMB/PBG","KKPR","AMDAL","SLF","IPT","Sertifikat Induk"];
  const statuses = ["selesai","proses","pending","review"];
  const pics = ["Budi Santoso","Andi Wijaya","Siti Rahmah","Ahmad Fauzi"];
  for (const pid of projectIds) {
    for (let i = 0; i < 6; i++) {
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const t = types[i % types.length];
      const pic = pics[i % pics.length];
      await run(
        `INSERT INTO legal_documents (project_id,tipe_dokumen,status,pic,expiry) VALUES ($1,$2,$3,$4,$5)`,
        [pid, t, st, pic, `202${5+Math.floor(i/3)}-12-31`]
      );
    }
  }
}

async function seedPermitDocs(projectIds: number[]) {
  console.log("📋 Seed: Permit Documents...");
  const permits = [
    { group:"perizinan_dasar", name:"KKPR", institution:"ATR/BPN" },
    { group:"perizinan_dasar", name:"Izin Lokasi", institution:"Dinas Tata Ruang" },
    { group:"perizinan_bangunan", name:"PBG", institution:"Dinas PUPR" },
    { group:"perizinan_bangunan", name:"SLF", institution:"Dinas PUPR" },
    { group:"izin_teknis", name:"IMB Induk", institution:"DPMPTSP" },
    { group:"izin_teknis", name:"Amdal/UKL-UPL", institution:"DLHK" },
  ];
  const statuses = ["selesai","dalam_proses","belum_diajukan","tidak_diperlukan"];
  for (const pid of projectIds) {
    for (const p of permits) {
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      await run(
        `INSERT INTO permit_documents (project_id,permit_group,permit_name,institution,status,submission_date,target_date,pic) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pid, p.group, p.name, p.institution, st, "2024-03-01", "2024-06-30", "Andi Legal"]
      );
    }
  }
}

async function seedLandStages(projectIds: number[]) {
  console.log("🗺️  Seed: Land Stages...");
  const stages = [
    { code:"STAGE_A", identity:"Bidang A", area:3200, status:"proses_pembayaran" },
    { code:"STAGE_B", identity:"Bidang B", area:4100, status:"selesai" },
    { code:"STAGE_C", identity:"Bidang C", area:2900, status:"negosiasi" },
  ];
  for (const pid of projectIds.slice(0,3)) {
    for (const s of stages) {
      await run(
        `INSERT INTO land_stages (project_id,stage_code,stage_identity,land_area,stage_status) VALUES ($1,$2,$3,$4,$5)`,
        [pid, s.code, s.identity, s.area, s.status]
      );
    }
  }
}

async function seedUnits(projectIds: number[]) {
  console.log("🏠 Seed: Units...");
  const unitIds: { id: number; projectId: number }[] = [];
  const types = ["Tipe 36/72","Tipe 45/90","Tipe 54/108"];
  const prices = [185000000, 235000000, 290000000];
  const statuses = ["available","booked","sold","in_progress"];
  const adminStatuses = ["stock","booked","akad","ht","selesai"];

  for (let pi = 0; pi < 2; pi++) {
    const pid = projectIds[pi];
    const bloks = ["A","B","C","D"];
    let unitCount = 0;
    for (const blok of bloks) {
      for (let n = 1; n <= 8; n++) {
        unitCount++;
        const tIdx = (unitCount-1) % 3;
        const stIdx = Math.floor(Math.random() * statuses.length);
        const adminIdx = Math.floor(Math.random() * adminStatuses.length);
        const progress = Math.floor(Math.random() * 100);
        const r = await run(
          `INSERT INTO units (project_id,blok,nomor,tipe,harga,status,progress,admin_status,stage_code,ready_akad) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [pid, blok, String(n), types[tIdx], prices[tIdx], statuses[stIdx], progress, adminStatuses[adminIdx], "STAGE_A", progress>=90]
        );
        unitIds.push({ id: r.rows[0].id, projectId: pid });
      }
    }
  }
  return unitIds;
}

async function seedLeadsAndCustomers(projectIds: number[], unitIds: { id: number; projectId: number }[]) {
  console.log("👥 Seed: Leads & Customers...");
  const sources = ["instagram","facebook","referral","pameran","whatsapp","tiktok","brosur","walk_in"];
  const statusesLead = ["NEW_LEAD","CONTACTED","INTERESTED","SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP","BATAL"];
  const pekerjaan = ["PNS","TNI/POLRI","Karyawan Swasta","Wirausaha","Dokter","Guru","Petani"];
  const namaList = ["Andi Kurniawan","Budi Setiawan","Sari Dewi","Hasan Basri","Nur Hidayah","Rahmat Saleh","Fatima Zahra","Ibrahim Ali","Dewi Sartika","Muhammad Ridwan","Yusuf Prasetyo","Aminah Boru","Bahar Lahuddin","Zulkifli Rahman","Hasna Wati","Irfan Gunawan","Maryam Salim","Syahrul Ramadhan","Kartini Budi","Faisal Akbar"];

  const customerIds: number[] = [];
  for (let li = 0; li < 40; li++) {
    const pid = projectIds[li % 2];
    const nama = namaList[li % namaList.length];
    const src = sources[li % sources.length];
    const st = statusesLead[Math.floor(Math.random() * statusesLead.length)];
    await run(
      `INSERT INTO leads (project_id,nama,kontak,source,status,assigned_to,pekerjaan,budget,pic_sales,tanggal_booking) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [pid, nama, `08${String(li+10).padStart(9,'0')}`, src, st, "Tim Sales", pekerjaan[li%pekerjaan.length], "200-300jt", "Andi Sales", li<20?"2024-10-15":null]
    );
  }

  const kprStatuses = ["bi_checking","verifikasi_berkas","penilaian_agunan","ots","sp3k","akad","ht","cair","ditolak"];
  const banks = ["BTN Syariah","Bank BTN","Bank BRI","Bank BSI","Bank Mandiri"];
  for (let ci = 0; ci < 30; ci++) {
    const unit = unitIds[ci] || unitIds[0];
    const nama = namaList[ci % namaList.length];
    const kprSt = kprStatuses[ci % kprStatuses.length];
    const bank = banks[ci % banks.length];
    const r = await run(
      `INSERT INTO customers (project_id,unit_id,nama,nik,kontak,pekerjaan,bank,status_kpr,berkas_lengkap,catatan,referral_source,pic_admin,dp_amount,loan_amount,unit_price,pipeline_status,payment_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [unit.projectId, unit.id, nama, `73${String(ci+1).padStart(14,'0')}`, `08${String(ci+50).padStart(9,'0')}`, pekerjaan[ci%pekerjaan.length], bank, kprSt, ci%3!==0, "Data lengkap perlu validasi", sources[ci%sources.length], "Siti Admin", 37000000, 148000000, 185000000, ["MINAT","BOOKING","AKAD","SELESAI"][ci%4], "KPR"]
    );
    customerIds.push(r.rows[0].id);
  }
  return customerIds;
}

async function seedKprPipeline(customerIds: number[]) {
  console.log("🏦 Seed: KPR Pipeline (OTS, SP3K, Akad, HT, Bank Submissions)...");
  const banks = ["BTN Syariah","Bank BTN","Bank BRI","Bank BSI","Bank Mandiri"];
  const surveyors = ["Pak Rudi","Bu Sari","Pak Hendra","Bu Linda"];
  const notaries = ["Notaris Budi, SH","Notaris Andi, SH, MKn","Notaris Farida, SH"];

  for (let i = 0; i < Math.min(20, customerIds.length); i++) {
    const cid = customerIds[i];
    const bank = banks[i % banks.length];
    // Bank submission
    await run(`INSERT INTO bank_submissions (customer_id,bank,submitted_date,bank_officer,registration_number,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
      [cid, bank, "2024-10-01", "Pak Hendra Manajer", `REG-2024-${String(i+1).padStart(4,'0')}`, "Berkas sudah diverifikasi"]);

    if (i < 15) {
      // OTS
      await run(`INSERT INTO ots_records (customer_id,bank,scheduled_date,surveyor_name,actual_date,status,result) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [cid, bank, "2024-10-15", surveyors[i%surveyors.length], i<12?"2024-10-16":null, i<12?"completed":"scheduled", i<12?(i%5===0?"tidak_lolos":"lolos"):null]);
    }
    if (i < 12) {
      // SP3K
      await run(`INSERT INTO sp3k_records (customer_id,bank,sp3k_date,sp3k_number,approved_amount,plafon_amount,expiry_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, bank, "2024-11-01", `SP3K-${String(i+1).padStart(4,'0')}`, 148000000, 148000000, "2025-05-01", i%4===0?"revision":"approved"]);
    }
    if (i < 8) {
      // Akad - gunakan tahun ini agar "tahun ini" berfungsi
      const now = new Date();
      const akadMonth = String(now.getMonth()+1).padStart(2,'0');
      const akadYear = now.getFullYear();
      await run(`INSERT INTO akad_records (customer_id,bank,akad_date,akad_number,notary,akad_amount,estimated_ht_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, bank, `${akadYear}-${akadMonth}-10`, `AKAD-${akadYear}-${String(i+1).padStart(4,'0')}`, notaries[i%notaries.length], 148000000, `${akadYear}-${akadMonth}-25`, "selesai"]);
    }
    if (i < 5) {
      // HT - gunakan tanggal bulan ini agar agregasi "bulan ini" berfungsi
      const now = new Date();
      const htDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String((i+1)*4).padStart(2,'0')}`;
      await run(`INSERT INTO ht_records (customer_id,bank,ht_date,ht_amount,account_number,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
        [cid, bank, htDate, 148000000, `ACC-${String(i+1).padStart(6,'0')}`, "Proses HT berjalan lancar"]);
    }
  }
}

async function seedConstruction(unitIds: { id: number; projectId: number }[]) {
  console.log("🔨 Seed: Construction Tasks...");
  const items = [
    { item:"Galian Pondasi", bobot:5 },
    { item:"Pondasi Batu Kali", bobot:10 },
    { item:"Sloof Beton", bobot:8 },
    { item:"Struktur Kolom & Balok", bobot:15 },
    { item:"Dinding Bata Merah", bobot:12 },
    { item:"Atap & Rangka Kuda-kuda", bobot:10 },
    { item:"Plesteran & Acian", bobot:8 },
    { item:"Instalasi Listrik", bobot:7 },
    { item:"Instalasi Plumbing", bobot:7 },
    { item:"Keramik Lantai & Dinding", bobot:8 },
    { item:"Kusen, Pintu & Jendela", bobot:5 },
    { item:"Pengecatan", bobot:5 },
  ];
  const statuses = ["selesai","dalam_progress","belum_mulai"];

  for (const unit of unitIds.slice(0, 32)) {
    const progress = Math.random();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let st: string;
      const threshold = i / items.length;
      if (threshold < progress - 0.1) st = "selesai";
      else if (threshold < progress + 0.1) st = "dalam_progress";
      else st = "belum_mulai";
      await run(
        `INSERT INTO construction_tasks (unit_id,item,bobot,status,tanggal_mulai,tanggal_selesai,verified_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [unit.id, it.item, it.bobot, st, st!=="belum_mulai"?"2024-09-01":null, st==="selesai"?"2024-11-15":null, st==="selesai"?"Supervisor Budi":null]
      );
    }
  }
}

async function seedQC(unitIds: { id: number; projectId: number }[]) {
  console.log("✅ Seed: Unit QC...");
  const qcItems = [
    "Kerapian Plesteran","Kelurusan Dinding","Kerataan Lantai Keramik",
    "Kebocoran Atap","Instalasi Listrik Berfungsi","Kran Air & Sanitasi OK",
    "Cat Dinding Merata","Kusen Pintu Tidak Bengkok","Jendela Tidak Bocor",
    "Drainase Lancar","Talang Air Terpasang","Pagar Kavling Sesuai Batas",
  ];
  for (const unit of unitIds.slice(0, 16)) {
    for (const qcItem of qcItems) {
      const isPass = Math.random() > 0.15;
      await run(
        `INSERT INTO unit_qc (unit_id,qc_item,is_pass,notes,inspected_by,inspected_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [unit.id, qcItem, isPass, isPass?null:"Perlu perbaikan sebelum serah terima", "Tim QC Internal", "2024-11-20"]
      );
    }
  }
}

async function seedMaterials(projectIds: number[]) {
  console.log("🧱 Seed: Materials...");
  const materials = [
    { name:"Semen Portland", category:"bahan_dasar", satuan:"sak", standardPerUnit:25, unitPrice:70000, minimumStock:100 },
    { name:"Bata Merah", category:"bahan_dasar", satuan:"buah", standardPerUnit:4500, unitPrice:800, minimumStock:10000 },
    { name:"Pasir Beton", category:"bahan_dasar", satuan:"m3", standardPerUnit:8, unitPrice:300000, minimumStock:50 },
    { name:"Batu Split 2/3", category:"bahan_dasar", satuan:"m3", standardPerUnit:5, unitPrice:350000, minimumStock:30 },
    { name:"Besi Beton D10", category:"besi", satuan:"batang", standardPerUnit:80, unitPrice:85000, minimumStock:200 },
    { name:"Besi Beton D13", category:"besi", satuan:"batang", standardPerUnit:40, unitPrice:130000, minimumStock:100 },
    { name:"Keramik Lantai 40x40", category:"finishing", satuan:"dus", standardPerUnit:12, unitPrice:135000, minimumStock:50 },
    { name:"Cat Tembok Dalam", category:"finishing", satuan:"kg", standardPerUnit:30, unitPrice:28000, minimumStock:100 },
    { name:"Pipa PVC 4 inch", category:"plumbing", satuan:"batang", standardPerUnit:15, unitPrice:65000, minimumStock:50 },
    { name:"Kabel NYM 2x2.5mm", category:"elektrikal", satuan:"meter", standardPerUnit:120, unitPrice:8500, minimumStock:500 },
  ];

  const materialIds: number[] = [];
  for (const m of materials) {
    const r = await run(
      `INSERT INTO prod_material_master (name,category,satuan,standard_per_unit,unit_price,minimum_stock) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [m.name, m.category, m.satuan, m.standardPerUnit, m.unitPrice, m.minimumStock]
    );
    materialIds.push(r.rows[0].id);
  }

  const pid = projectIds[0];
  for (let i = 0; i < materialIds.length; i++) {
    const mid = materialIds[i];
    // Stock masuk
    for (let d = 0; d < 3; d++) {
      await run(
        `INSERT INTO prod_material_in (project_id,material_id,quantity,supplier,document_number,date_in) VALUES ($1,$2,$3,$4,$5,$6)`,
        [pid, mid, Math.floor(Math.random()*200+100), "CV Maju Jaya", `DO-2024-${String(i*3+d+1).padStart(5,'0')}`, `2024-0${d+9}-15`]
      );
    }
    // Stock keluar
    for (let d = 0; d < 2; d++) {
      await run(
        `INSERT INTO prod_material_out (project_id,material_id,quantity,unit_id,taken_by,date_out) VALUES ($1,$2,$3,$4,$5,$6)`,
        [pid, mid, Math.floor(Math.random()*80+20), null, "Pak Mandor", `2024-1${d+1}-01`]
      ).catch(() => {});
    }
  }
}

async function seedSubkon(projectIds: number[]) {
  console.log("🔧 Seed: Subkon Contracts...");
  const subkons = [
    { name:"CV Bangunan Jaya", type:"struktur" },
    { name:"CV Mitra Kontruksi", type:"finishing" },
    { name:"UD Listrik Andalan", type:"mekanikal_elektrikal" },
    { name:"CV Plumbing Sulsel", type:"plumbing" },
    { name:"PT Landscape Hijau", type:"landscape" },
  ];

  const contractIds: number[] = [];
  for (let pi = 0; pi < 2; pi++) {
    const pid = projectIds[pi];
    for (let si = 0; si < subkons.length; si++) {
      const s = subkons[si];
      const unitCount = 32;
      const valuePerUnit = [8500000, 12000000, 4500000, 3200000, 1800000][si];
      const contractValue = unitCount * valuePerUnit;
      const retentionPerUnit = 500000;
      const totalRetention = unitCount * retentionPerUnit;
      const r = await run(
        `INSERT INTO subkon_contracts (project_id,stage_code,subkon_name,unit_count,value_per_unit,contract_value,retention_per_unit,total_retention,net_payable_value,maintenance_months,start_date,target_end_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [pid, "STAGE_A", s.name, unitCount, valuePerUnit, contractValue, retentionPerUnit, totalRetention, contractValue-totalRetention, 3, "2024-08-01", "2025-06-30", si===0?"selesai":"aktif"]
      );
      contractIds.push(r.rows[0].id);

      // Payment requests
      for (let p = 0; p < 3; p++) {
        const pct = [30,30,40][p];
        const amount = contractValue * pct / 100;
        await run(
          `INSERT INTO subkon_payments (contract_id,payment_type,termin_number,progress_previous,progress_current,gross_eligible_amount,retention_deducted,net_payment,total_paid_before,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [r.rows[0].id, "termin", p+1, p*30, (p+1)*30, amount, amount*0.05, amount*0.95, p===0?0:contractValue*p*0.3, p<2?"approved":"draft", `Pembayaran termin ke-${p+1}`]
        ).catch(() => {});
      }
    }
  }
}

async function seedMarketing(projectIds: number[]) {
  console.log("📣 Seed: Marketing (Campaigns, Competitors, Branding)...");
  const platforms = ["instagram","facebook","tiktok","youtube","google_ads","whatsapp_blast"];
  const campaignNames = ["Launch Griya Sejahtera","Promo Lebaran 2024","Festival Properti Sulsel","Open House Weekend","Referral Program","Digital Campaign Q4"];

  for (const pid of projectIds.slice(0,2)) {
    for (let i = 0; i < 6; i++) {
      const impresi = Math.floor(Math.random()*50000+10000);
      const klik = Math.floor(impresi * 0.03);
      const leads = Math.floor(klik * 0.15);
      await run(
        `INSERT INTO campaigns (project_id,nama,platform,tipe_konten,anggaran,spend,impresi,klik,leads_generated,tanggal_mulai,tanggal_selesai,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [pid, campaignNames[i], platforms[i%platforms.length], "post_video", 5000000, Math.floor(Math.random()*5000000+1000000), impresi, klik, leads, "2024-09-01", "2024-11-30", i<4?"selesai":"aktif"]
      );
    }

    // Competitors
    const kompetitors = [
      { nama:"PT Ciputra Sulsel", lokasi:"Gowa", jarak:3.5, tipe:"Tipe 36", hMin:175000000, hMax:220000000, total:200, terjual:145 },
      { nama:"PT Sinar Mas Properti", lokasi:"Maros", jarak:8.0, tipe:"Tipe 45", hMin:210000000, hMax:280000000, total:150, terjual:90 },
      { nama:"Developer Lokal Gowa", lokasi:"Gowa", jarak:2.1, tipe:"Tipe 36/45", hMin:165000000, hMax:250000000, total:80, terjual:62 },
    ];
    for (const k of kompetitors) {
      await run(
        `INSERT INTO competitors (project_id,nama_kompetitor,lokasi,jarak,tipe_unit,harga_min,harga_max,total_unit,unit_terjual,progress,kelebihan,kekurangan,tanggal_launching) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [pid, k.nama, k.lokasi, k.jarak, k.tipe, k.hMin, k.hMax, k.total, k.terjual, Math.floor(k.terjual/k.total*100), "Lokasi strategis, brand kuat", "Harga lebih mahal, kurang fasilitas", "2023-06-01"]
      );
    }

    // Absorption
    const tahaps = ["Tahap 1","Tahap 2","Tahap 3"];
    for (const tahap of tahaps) {
      const total = 40;
      const terjual = Math.floor(Math.random()*40);
      await run(
        `INSERT INTO marketing_absorption (project_id,tahap,total_unit,unit_terjual) VALUES ($1,$2,$3,$4)`,
        [pid, tahap, total, terjual]
      );
    }
  }
}

async function seedPlanning(projectIds: number[]) {
  console.log("📊 Seed: Planning (Cashflow, Market, Product, Feasibility, Milestones)...");
  const nowP = new Date();
  const baseYear = nowP.getFullYear();
  const baseMonth = nowP.getMonth() + 1;

  for (let pi = 0; pi < projectIds.length; pi++) {
    const pid = projectIds[pi];

    // Cashflow per bulan (24 bulan dari bulan ini)
    for (let m = 1; m <= 24; m++) {
      const d = new Date(baseYear, baseMonth - 1 + m - 1, 1);
      const monthLabel = d.toLocaleDateString("id-ID", { month: "long", year:"numeric" });
      const constructionOut = m >= 2 ? Math.floor(Math.random()*800000000+200000000) : 0;
      const htIn = m >= 4 ? Math.floor(Math.random()*500000000+100000000) : 0;
      await run(
        `INSERT INTO planning_cashflow (project_id,month_number,month_label,land_cost_out,construction_cost_out,marketing_cost_out,operational_cost_out,booking_fee_in,ht_kpr_in,conservative_units,moderate_units,aggressive_units) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [pid, m, monthLabel, m===1?2500000000:0, constructionOut, 50000000, 80000000, m>=2?185000000*Math.floor(Math.random()*3+1):0, htIn, Math.floor(Math.random()*2), Math.floor(Math.random()*3+1), Math.floor(Math.random()*5+2)]
      );
    }

    // Milestones
    const milestones = [
      { phase:"Persiapan", task:"Groundbreaking Ceremony", target:"2024-02-01", actual:"2024-02-05", status:"selesai", pct:100 },
      { phase:"Konstruksi", task:"Selesai Pondasi Unit Pertama", target:"2024-04-01", actual:"2024-04-10", status:"selesai", pct:100 },
      { phase:"Marketing", task:"Launching Marketing Phase 1", target:"2024-03-01", actual:"2024-03-01", status:"selesai", pct:100 },
      { phase:"Konstruksi", task:"Selesai 50% Unit Tahap 1", target:"2025-09-01", actual:null, status:"berjalan", pct:65 },
      { phase:"Serah Terima", task:"Serah Terima Pertama", target:"2026-01-01", actual:null, status:"belum_mulai", pct:0 },
      { phase:"Konstruksi", task:"Selesai Seluruh Unit Tahap 1", target:"2026-12-01", actual:null, status:"belum_mulai", pct:0 },
    ];
    for (const ms of milestones) {
      await run(
        `INSERT INTO planning_milestones (project_id,phase,task_name,target_date,actual_date,status,progress_pct) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [pid, ms.phase, ms.task, ms.target, ms.actual, ms.status, ms.pct]
      ).catch(() => {});
    }

    // Planning Feasibility - isi agar health score tidak "Data belum lengkap"
    const hargaJual = [185000000, 210000000, 195000000, 225000000, 175000000][pi] || 200000000;
    const hargaTanah = [850000, 650000, 720000, 590000, 480000][pi] || 700000;
    const totalUnit  = [120, 80, 60, 100, 150][pi] || 80;
    const luasLahan  = [12500, 8200, 6000, 9500, 15000][pi] || 8000;
    const kabupatens = ["Gowa","Maros","Takalar","Pangkajene dan Kepulauan","Bone"];
    const totalRevenue = hargaJual * totalUnit;
    const biayaLahan = hargaTanah * luasLahan;
    const biayaKonstruksi = totalUnit * 75000000;
    const biayaMarketing  = totalRevenue * 0.03;
    const biayaOverhead = totalRevenue * 0.02;
    const totalCost = biayaLahan + biayaKonstruksi + biayaMarketing + biayaOverhead;
    const grossProfit = totalRevenue - totalCost;
    const margin = (grossProfit / totalRevenue) * 100;
    const roi = (grossProfit / totalCost) * 100;
    const irr = 18 + Math.random() * 10;
    const npv = grossProfit * 0.75;
    await run(
      `INSERT INTO planning_feasibility (project_id,land_cost,construction_cost_per_unit,marketing_cost,overhead_cost,selling_price_per_unit,total_units,total_revenue,total_cost,gross_profit,margin,roi,irr,npv,payback_period,is_approved,recommendation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [pid, biayaLahan, 75000000, biayaMarketing, biayaOverhead, hargaJual, totalUnit, totalRevenue, totalCost, grossProfit, margin.toFixed(2), roi.toFixed(2), irr.toFixed(2), npv, Math.floor(18 + Math.random()*12), true, "Layak dikembangkan berdasarkan analisis pasar dan finansial"]
    ).catch(e => console.warn("planning_feasibility skip:", e.message));

    // Planning Product - pakai kolom yang benar sesuai schema
    await run(
      `INSERT INTO planning_product (project_id,house_type,building_area,kavling_area,selling_price,unit_count,target_segment,competitor_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [pid, "Tipe 36/72", 36, 72, hargaJual, Math.floor(totalUnit*0.6), "PNS, TNI/POLRI, Karyawan Swasta", Math.round(hargaJual*1.08)]
    ).catch(e => console.warn("planning_product skip:", e.message));
    await run(
      `INSERT INTO planning_product (project_id,house_type,building_area,kavling_area,selling_price,unit_count,target_segment,competitor_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [pid, "Tipe 45/90", 45, 90, Math.round(hargaJual*1.3), Math.floor(totalUnit*0.4), "Wirausaha, Dokter, Guru", Math.round(hargaJual*1.35)]
    ).catch(e => console.warn("planning_product skip:", e.message));

    // Planning Market - pakai kolom yang benar sesuai schema
    const pop = Math.floor(Math.random()*200000+300000);
    await run(
      `INSERT INTO planning_market (project_id,kabupaten,population,population_growth,kk_count,umk,avg_income,asn_count,private_employees,umkm_count,unemployment_rate,active_developers,active_banks,target_price,demand_score,market_potential_score,market_recommendation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [pid, kabupatens[pi] || "Gowa", pop, 1.8 + Math.random()*1.5, Math.floor(pop/4), 3200000 + Math.random()*1000000, 4500000 + Math.random()*2000000, Math.floor(pop*0.04), Math.floor(pop*0.12), Math.floor(pop*0.08), 3.5 + Math.random()*3, Math.floor(Math.random()*5+3), Math.floor(Math.random()*4+4), hargaJual, 72 + Math.floor(Math.random()*20), 68 + Math.floor(Math.random()*25), "Potensi pasar tinggi, permintaan rumah subsidi dan komersial kuat"]
    ).catch(e => console.warn("planning_market skip:", e.message));
  }
}

async function seedHandovers(unitIds: { id: number; projectId: number }[], customerIds: number[]) {
  console.log("🔑 Seed: Handovers...");
  for (let i = 0; i < Math.min(5, customerIds.length); i++) {
    const unit = unitIds[i];
    await run(
      `INSERT INTO handovers (unit_id,customer_id,tanggal,skor_kepuasan,bast_generated,catatan) VALUES ($1,$2,$3,$4,$5,$6)`,
      [unit.id, customerIds[i], "2024-12-01", Math.floor(Math.random()*20+80)/10, true, "Serah terima berjalan lancar, customer puas"]
    );
  }
}

async function seedHR() {
  console.log("👔 Seed: Human Resources...");
  const divisi = ["Sales & Marketing","Keuangan & Akuntansi","Legal & Perizinan","Teknik & Konstruksi","Administrasi KPR","Human Resources","Manajemen"];
  const employees = [
    { name:"Direktur Utama", div:"Manajemen", pos:"Direktur Utama", code:"DIR-001" },
    { name:"Ahmad Fauzi", div:"Sales & Marketing", pos:"Manajer Marketing", code:"MKT-001" },
    { name:"Siti Rahmah", div:"Keuangan & Akuntansi", pos:"Manajer Keuangan", code:"FIN-001" },
    { name:"Andi Wijaya", div:"Legal & Perizinan", pos:"Kepala Legal", code:"LEG-001" },
    { name:"Budi Santoso", div:"Teknik & Konstruksi", pos:"Manajer Proyek", code:"TKN-001" },
    { name:"Nur Hidayah", div:"Administrasi KPR", pos:"Kepala Admin KPR", code:"ADM-001" },
    { name:"Rahmat Saleh", div:"Sales & Marketing", pos:"Supervisor Sales", code:"MKT-002" },
    { name:"Dewi Sartika", div:"Sales & Marketing", pos:"Agen Properti", code:"MKT-003" },
    { name:"Irfan Gunawan", div:"Sales & Marketing", pos:"Agen Properti", code:"MKT-004" },
    { name:"Kartini Budi", div:"Keuangan & Akuntansi", pos:"Staff Akuntansi", code:"FIN-002" },
    { name:"Yusuf Prasetyo", div:"Teknik & Konstruksi", pos:"Site Engineer", code:"TKN-002" },
    { name:"Hasna Wati", div:"Administrasi KPR", pos:"Staff Admin KPR", code:"ADM-002" },
    { name:"Zulkifli Rahman", div:"Legal & Perizinan", pos:"Staff Legal", code:"LEG-002" },
    { name:"Maryam Salim", div:"Human Resources", pos:"Manajer HR", code:"HR-001" },
    { name:"Syahrul Ramadhan", div:"Teknik & Konstruksi", pos:"Quality Control", code:"TKN-003" },
  ];

  const empIds: number[] = [];
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const r = await run(
      `INSERT INTO hr_employees (employee_code,name,division,position,direct_manager_id,employment_status,join_date,location,email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [e.code, e.name, e.div, e.pos, i===0?null:1, "aktif", `202${Math.floor(i/5)+1}-0${(i%12)+1}-01`, "Makassar", `${e.code.toLowerCase()}@satara.id`]
    );
    empIds.push(r.rows[0].id);
  }

  // KPI Definitions
  const kpiDefs = [
    { position:"Agen Properti", division:"Sales & Marketing", kpiName:"Jumlah Leads per Bulan", unit:"leads", monthlyTarget:30, weight:25 },
    { position:"Agen Properti", division:"Sales & Marketing", kpiName:"Jumlah Unit Terjual", unit:"unit", monthlyTarget:3, weight:35 },
    { position:"Agen Properti", division:"Sales & Marketing", kpiName:"Tingkat Konversi Lead", unit:"%", monthlyTarget:10, weight:25 },
    { position:"Manajer Proyek", division:"Teknik & Konstruksi", kpiName:"Progress Konstruksi", unit:"%", monthlyTarget:8, weight:40 },
    { position:"Manajer Proyek", division:"Teknik & Konstruksi", kpiName:"Kualitas QC Pass", unit:"%", monthlyTarget:95, weight:30 },
    { position:"Kepala Admin KPR", division:"Administrasi KPR", kpiName:"Akad per Bulan", unit:"akad", monthlyTarget:10, weight:40 },
  ];
  const kpiDefIds: number[] = [];
  for (const kd of kpiDefs) {
    const r = await run(
      `INSERT INTO hr_kpi_definitions (position,division,kpi_name,unit,monthly_target,weight,data_source) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [kd.position, kd.division, kd.kpiName, kd.unit, kd.monthlyTarget, kd.weight, "manual"]
    );
    kpiDefIds.push(r.rows[0].id);
  }

  // KPI Records - 6 bulan terakhir termasuk bulan ini
  const nowKpi = new Date();
  const curYear = nowKpi.getFullYear();
  const curMonth = nowKpi.getMonth() + 1;
  const kpiMonths: Array<{ year: number; month: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(curYear, curMonth - 1 - i, 1);
    kpiMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  for (const empId of empIds) {
    for (const { year, month } of kpiMonths) {
      for (const kpiId of kpiDefIds) {
        const target = 30;
        const actual = Math.floor(target * (0.7 + Math.random()*0.6));
        await run(
          `INSERT INTO hr_kpi_records (employee_id,kpi_definition_id,period_year,period_month,target,actual,achievement_pct) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [empId, kpiId, year, month, target, actual, Math.round(actual/target*100)]
        );
      }
    }
  }

  // Compensation Records - 6 bulan terakhir termasuk bulan ini
  const nowComp = new Date();
  const compMonths: Array<{ year: number; month: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowComp.getFullYear(), nowComp.getMonth() - i, 1);
    compMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const salaries = [12000000, 8000000, 9000000, 8500000, 9500000, 8000000, 7000000, 5500000, 5500000, 6000000, 6500000, 5500000, 5500000, 8000000, 6000000];
  for (let i = 0; i < empIds.length; i++) {
    for (const { year, month } of compMonths) {
      const base = salaries[i] || 5000000;
      await run(
        `INSERT INTO hr_compensation_records (employee_id,period_year,period_month,base_salary,fixed_allowance,performance_bonus,incentive,total_take_home) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [empIds[i], year, month, base, base*0.2, Math.random()>0.5?base*0.15:0, Math.random()>0.7?1000000:0, base*1.2]
      );
    }
  }

  // Productivity Records - bulan ini
  const nowProd = new Date();
  await run(
    `INSERT INTO hr_productivity_records (period_year,period_month,total_revenue,revenue_target,employee_count,revenue_per_employee,project_completion_rate) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [nowProd.getFullYear(), nowProd.getMonth()+1, 7500000000, 10000000000, empIds.length, Math.round(7500000000/empIds.length), 72]
  ).catch(() => {});

  // Culture Records - 6 bulan terakhir termasuk bulan ini
  for (let i = 0; i < empIds.length; i++) {
    for (const { year, month } of compMonths) {
      await run(
        `INSERT INTO hr_culture_records (employee_id,period_year,period_month,days_present,working_days,late_count,discipline_violations,sop_compliance_score,task_completion_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [empIds[i], year, month, Math.floor(Math.random()*4+19), 22, Math.floor(Math.random()*3), 0, Math.floor(Math.random()*20+80), Math.floor(Math.random()*15+85)]
      );
    }
  }

  // Workload Records - 6 bulan terakhir termasuk bulan ini
  for (const div of divisi) {
    for (const { year, month } of compMonths) {
      await run(
        `INSERT INTO hr_workload_records (division,period_year,period_month,capacity,actual_load,load_description) VALUES ($1,$2,$3,$4,$5,$6)`,
        [div, year, month, 100, Math.floor(Math.random()*50+70), `Beban kerja ${div} bulan ke-${month}`]
      );
    }
  }

  // Recruitment Needs
  const rNeeds = [
    { pos:"Agen Properti Senior", div:"Sales & Marketing", needed:3, filled:1, status:"dibuka" },
    { pos:"Staff Akuntansi", div:"Keuangan & Akuntansi", needed:1, filled:0, status:"dibuka" },
    { pos:"Site Engineer", div:"Teknik & Konstruksi", needed:2, filled:1, status:"proses" },
    { pos:"Staff Legal Junior", div:"Legal & Perizinan", needed:1, filled:0, status:"ditangguhkan" },
  ];
  const needIds: number[] = [];
  for (const rn of rNeeds) {
    const r = await run(
      `INSERT INTO hr_recruitment_needs (position_name,division,headcount_needed,headcount_filled,target_hire_date,status,pic_recruiter) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [rn.pos, rn.div, rn.needed, rn.filled, "2025-02-01", rn.status, "Maryam HR"]
    );
    needIds.push(r.rows[0].id);
  }

  // Candidates
  const candidateNames = ["Bahar Lahuddin","Ibrahim Ali","Fatima Zahra","Hasan Basri","Nur Alam"];
  const stages = ["screening_cv","interview_hr","interview_user","offering","rejected"];
  for (let i = 0; i < needIds.length; i++) {
    for (let c = 0; c < 3; c++) {
      await run(
        `INSERT INTO hr_recruitment_candidates (need_id,name,phone,source,stage,stage_date) VALUES ($1,$2,$3,$4,$5,$6)`,
        [needIds[i], candidateNames[(i*3+c)%candidateNames.length], `08${String(i*3+c+100).padStart(9,'0')}`, "jobstreet", stages[(i+c)%stages.length], "2024-11-15"]
      );
    }
  }

  // Flight Risk - gunakan tahun sekarang agar dashboard bisa filter
  const nowFR = new Date();
  for (let i = 0; i < empIds.length; i++) {
    const riskScore = Math.floor(Math.random()*60+10);
    await run(
      `INSERT INTO hr_flight_risk_records (employee_id,period_year,period_quarter,months_without_promotion,salary_market_gap_pct,job_satisfaction_score,has_external_offer,flight_risk_score,risk_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [empIds[i], nowFR.getFullYear(), Math.ceil((nowFR.getMonth()+1)/3), Math.floor(Math.random()*24), Math.floor(Math.random()*30-10), Math.floor(Math.random()*40+60)/10, Math.random()>0.8?"ya":"tidak", riskScore, riskScore>70?"tinggi":riskScore>40?"sedang":"rendah"]
    );
  }

  // Succession Plans
  await run(
    `INSERT INTO hr_succession_plans (critical_position,current_holder_id,backup1_id,backup1_readiness,backup2_id,backup2_readiness,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Manajer Marketing", empIds[1], empIds[6], "siap_6_bulan", empIds[7], "perlu_2_tahun", "Perlu akselerasi pengembangan Rahmat"]
  );
  await run(
    `INSERT INTO hr_succession_plans (critical_position,current_holder_id,backup1_id,backup1_readiness,backup2_id,backup2_readiness,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Manajer Keuangan", empIds[2], empIds[9], "siap_12_bulan", null, null, "Perlu rekrut kandidat eksternal sebagai backup"]
  );

  return empIds;
}

async function seedSubkonMaterialOut(projectIds: number[]) {
  console.log("📦 Seed: Subkon Material Out (efisiensi realistis)...");

  // Ambil material master ID berdasarkan nama
  const matRows = await run(`SELECT id, name FROM prod_material_master`);
  const matByName: Record<string, number> = {};
  for (const r of matRows.rows) matByName[r.name] = r.id;

  // Deviasi per subkon (bervariasi, realistis):
  // [subkonName, materialName, deviasiPct]
  const assignments: [string, string, number][] = [
    // CV Bangunan Jaya — struktur, beberapa boros, ada yang hemat
    ["CV Bangunan Jaya", "Semen Portland", +18],
    ["CV Bangunan Jaya", "Bata Merah", +12],
    ["CV Bangunan Jaya", "Pasir Beton", +22],
    ["CV Bangunan Jaya", "Batu Split 2/3", -5],
    ["CV Bangunan Jaya", "Besi Beton D10", +8],
    ["CV Bangunan Jaya", "Besi Beton D13", -8],
    // CV Mitra Kontruksi — finishing, sangat efisien
    ["CV Mitra Kontruksi", "Keramik Lantai 40x40", -5],
    ["CV Mitra Kontruksi", "Cat Tembok Dalam", -12],
    // UD Listrik Andalan — efisien
    ["UD Listrik Andalan", "Kabel NYM 2x2.5mm", -3],
    // CV Plumbing Sulsel — sedikit boros
    ["CV Plumbing Sulsel", "Pipa PVC 4 inch", +5],
    // PT Landscape Hijau — sangat efisien
    ["PT Landscape Hijau", "Pasir Beton", -10],
  ];

  // Kontrak memiliki unitCount=32, progress termin approved=60%
  // unitsCompleted = round(0.60 * 32) = 19 — ini denominatornya di API
  const denom = 19;
  const today = new Date();

  for (let pi = 0; pi < 2; pi++) {
    const pid = projectIds[pi];
    for (const [subkonName, matName, deviasiPct] of assignments) {
      const matId = matByName[matName];
      if (!matId) continue;

      // Ambil standardPerUnit dari master
      const masterRes = await run(`SELECT standard_per_unit FROM prod_material_master WHERE id = $1`, [matId]);
      if (!masterRes.rows.length) continue;
      const standardPerUnit: number = masterRes.rows[0].standard_per_unit;

      // Quantity total = standardPerUnit * (1 + deviasi/100) * denom
      const actualPerUnit = standardPerUnit * (1 + deviasiPct / 100);
      const totalQty = Math.round(actualPerUnit * denom * 10) / 10;

      const dateOut = new Date(today);
      dateOut.setMonth(dateOut.getMonth() - (pi === 0 ? 2 : 1));
      const dateStr = dateOut.toISOString().split("T")[0];

      await run(
        `INSERT INTO prod_material_out (project_id, material_id, quantity, subkon_name, taken_by, date_out) VALUES ($1,$2,$3,$4,$5,$6)`,
        [pid, matId, totalQty, subkonName, "Mandor Lapangan", dateStr]
      ).catch(() => {});
    }
  }
}

async function seedMonthlyTargets(projectIds: number[]) {
  console.log("🎯 Seed: Monthly Targets...");
  for (const pid of projectIds.slice(0,2)) {
    for (let m = 1; m <= 12; m++) {
      await run(
        `INSERT INTO monthly_targets (project_id,year,month,target_akad,target_berkas) VALUES ($1,$2,$3,$4,$5)`,
        [pid, 2024, m, 5, 8]
      ).catch(() => {});
    }
  }
}

async function main() {
  console.log("🚀 Memulai seed data komprehensif Satara Dashboard...\n");
  try {
    await clearAll();
    const projectIds = await seedProjects();
    await seedBanks();
    await seedLandProspects(projectIds);
    await seedLegalDocs(projectIds);
    await seedPermitDocs(projectIds);
    await seedLandStages(projectIds);
    const unitIds = await seedUnits(projectIds);
    const customerIds = await seedLeadsAndCustomers(projectIds, unitIds);
    await seedKprPipeline(customerIds);
    await seedConstruction(unitIds);
    await seedQC(unitIds);
    await seedMaterials(projectIds);
    await seedSubkon(projectIds);
    await seedSubkonMaterialOut(projectIds);
    await seedMarketing(projectIds);
    await seedPlanning(projectIds);
    await seedHandovers(unitIds, customerIds);
    await seedHR();
    await seedMonthlyTargets(projectIds);
    console.log("\n✅ SEED SELESAI! Semua modul berhasil diisi data.");
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
