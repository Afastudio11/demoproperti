import { pool } from "@workspace/db";

/**
 * SEED DATA KOMPREHENSIF, DETAIL & SINKRON UNTUK SELURUH MODUL & MENU
 * - 5 Proyek Aktif
 * - 80+ Kavling & Unit (Tipe 36, 45, 54, 70) dengan contract_id terhubung
 * - 40 Data Karyawan (Lengkap Hierarki Manajer, Gaji, KPI, Absensi, Kompetensi, Workload)
 * - 120+ Transaksi Keuangan 3 Bulan Terakhir (Juni, Juli, Agustus 2026) dengan tipe 'cash_in' & 'cash_out'
 * - KPP Bank BTN & BSI beserta Pembayaran
 * - Hutang Supplier & Piutang Konsumen
 * - Subkontraktor Master, 5 Kontrak Subkon, 15 Termin Bayar, 10 Pembayaran Subkon & Approvals PM/Dirtek/Dirkeu
 * - 15 Master Material, Master Acuan Standar Kebutuhan, Transaksi Masuk Gudang & Transaksi Keluar Lapangan
 * - Pelaksanaan Lapangan: Fasum Progress, Construction Tasks per Unit, QC Inspeksi, Defect & Rework
 * - 30 Customer KPR, Pengajuan Bank, SP3K & Akad Kredit
 * - 15 Marketing Leads, 4 Kampanye Iklan Digital & Serapan Pasar
 * - Legalitas, Dokumen PBG, IPPT, Amdal & Pecah SHM
 * - Perencanaan Feasibility, Target Ekspansi & Timeline
 * - Branding Media Sosial (Instagram & TikTok), 15 Konten, Exposure Media & Sentimen
 */

const DOMAIN_TABLES = [
  // Finance
  "finance_cashflow_records", "finance_rab_items", "finance_kpp_payments", "finance_kpp_facilities",
  "finance_credit_transactions", "finance_credit_allocations", "finance_credit_facilities",
  "finance_debt_records", "finance_akad_disbursement_ledger", "finance_akad_disbursements",
  "finance_receivable_records", "finance_audit_findings", "finance_alerts", "finance_expansion_analyses", "finance_uploads",
  // Subkon & Approvals
  "subkon_payments", "subkon_payment_terms", "payment_approvals", "subkon_contracts", "subkon_master",
  // Produksi, Material & QC
  "reworks", "qc_defects", "unit_qc", "construction_tasks", "project_task_templates", "fasum_progress",
  "prod_material_out", "prod_material_in", "prod_material_standards", "prod_material_master", "materials",
  // Customers & KPR
  "ht_records", "akad_records", "sp3k_records", "ots_records", "bank_submissions", "customer_documents",
  "customer_status_history", "customer_complaints", "customers", "units",
  // Marketing & Sales
  "marketing_absorption", "competitors", "branding_kpi", "monthly_targets", "leads", "campaigns",
  // Legal
  "legal_issue_history", "legal_issues", "shm_split_records", "permit_status_history", "permit_documents",
  "land_legal_checklist", "land_stages", "legal_documents",
  // HR
  "hr_sop", "hr_individual_issues", "hr_overtime_records", "hr_attendance_records", "hr_productivity_records",
  "hr_career_paths", "hr_flight_risk_records", "hr_expansion_needs", "hr_succession_plans", "hr_workload_records",
  "hr_culture_records", "hr_compensation_records", "hr_training_participants", "hr_training_programs",
  "hr_competency_scores", "hr_competency_definitions", "hr_kpi_records", "hr_kpi_definitions",
  "hr_recruitment_candidates", "hr_recruitment_needs", "hr_employees",
  // Branding
  "branding_trust_score_records", "branding_content_roi", "branding_sentiment_records", "branding_pr_activities",
  "branding_project_scores", "branding_content_performance", "branding_social_media_kpi",
  "branding_content_status_history", "branding_content_items", "branding_media_exposures",
  "branding_founder_records", "branding_corporate_records",
  // Perencanaan
  "planning_stage_blocks", "planning_stages", "planning_siteplan_shapes", "planning_siteplans",
  "planning_expansion", "planning_land_bank", "planning_sdm", "planning_ht", "planning_kpp",
  "planning_cashflow", "planning_milestones", "planning_feasibility", "planning_product",
  "planning_land", "planning_competitors", "planning_market", "expansion_targets", "feasibility_studies",
  "land_prospects", "handovers", "banks", "app_categories", "projects",
] as const;

async function clearDomainTables() {
  console.log("Membersihkan data domain lama...");
  for (const table of DOMAIN_TABLES) {
    try {
      await pool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    } catch {
      // ignore
    }
  }
}

async function seedData() {
  await clearDomainTables();
  console.log("Menanam seed data komprehensif...");

  // ─── 1. PROYEK (5 Proyek Aktif) ────────────────────────────────────────────
  const projRes = await pool.query(`
    INSERT INTO projects (nama, lokasi, provinsi, kabupaten, kecamatan, desa, luas, total_unit, fase, status, target_start, target_end)
    VALUES
      ('Green Harmoni Residence', 'Jl. Hertasning Baru, Somba Opu', 'Sulawesi Selatan', 'Gowa', 'Somba Opu', 'Paccinongang', 18500, 120, 'KONSTRUKSI', 'active', '2025-10-01', '2027-04-30'),
      ('Grand Mutiara Gowa', 'Jl. Poros Pallangga Km 7', 'Sulawesi Selatan', 'Gowa', 'Pallangga', 'Mangalli', 14200, 95, 'KONSTRUKSI', 'active', '2026-01-15', '2027-06-30'),
      ('Royal Hills Maros', 'Jl. Poros Kariango, Mandai', 'Sulawesi Selatan', 'Maros', 'Mandai', 'Bontoa', 12000, 80, 'PERENCANAAN', 'active', '2026-03-01', '2027-09-30'),
      ('Permata Sudiang Estate', 'Jl. Goa Ria, Biringkanaya', 'Sulawesi Selatan', 'Makassar', 'Biringkanaya', 'Sudiang', 16800, 110, 'KONSTRUKSI', 'active', '2025-08-01', '2026-12-31'),
      ('Samata Garden View', 'Jl. Mustafa Dg. Bunga, Samata', 'Sulawesi Selatan', 'Gowa', 'Somba Opu', 'Samata', 9800, 65, 'SERAH_TERIMA', 'active', '2025-03-01', '2026-10-31')
    RETURNING id, nama;
  `);
  const projects = projRes.rows;
  const p1 = projects[0].id;
  const p2 = projects[1].id;
  const p3 = projects[2].id;
  const p4 = projects[3].id;
  const p5 = projects[4].id;

  // ─── 2. BANKS ──────────────────────────────────────────────────────────────
  await pool.query(`
    INSERT INTO banks (name, code, is_active)
    VALUES
      ('Bank BTN KC Makassar', 'BTN', true),
      ('Bank Mandiri SME Makassar', 'MANDIRI', true),
      ('Bank Syariah Indonesia (BSI)', 'BSI', true),
      ('Bank BRI KC Panakkukang', 'BRI', true)
  `);

  // ─── 3. SUBKON MASTER ──────────────────────────────────────────────────────
  const subRes = await pool.query(`
    INSERT INTO subkon_master (name, normalized_name, type, pic_name, phone, status, default_value_per_unit, default_retention_per_unit, default_maintenance_months)
    VALUES
      ('PT Karya Mandiri Perkasa', 'pt karya mandiri perkasa', 'subkon', 'Ir. Hendra Wijaya', '081241112233', 'active', 28000000, 1400000, 3),
      ('CV Pilar Utama Konstruksi', 'cv pilar utama konstruksi', 'subkon', 'H. Supardi Syam', '081342223344', 'active', 26000000, 1300000, 3),
      ('Mandor Daeng Naba', 'mandor daeng naba', 'mandor', 'Daeng Naba', '085243334455', 'active', 18000000, 900000, 2),
      ('CV Sinar Rancang Bangun', 'cv sinar rancang bangun', 'subkon', 'Agus Santoso, ST', '081144445566', 'active', 32000000, 1600000, 3),
      ('PT Celebes Graha Mandiri', 'pt celebes graha mandiri', 'subkon', 'Fajar Ramadhan', '082145556677', 'active', 30000000, 1500000, 3),
      ('Mandor H. Syahrir', 'mandor h syahrir', 'mandor', 'H. Syahrir', '085346667788', 'active', 19000000, 950000, 2)
    RETURNING id, name;
  `);
  const subkons = subRes.rows;

  // ─── 4. KONTRAK SUBKON ─────────────────────────────────────────────────────
  const contractRes = await pool.query(`
    INSERT INTO subkon_contracts (
      project_id, stage_code, subkon_id, subkon_name, unit_count, value_per_unit, contract_value,
      retention_per_unit, total_retention, net_payable_value, maintenance_months, start_date, target_end_date, retention_status, status
    ) VALUES
      (${p1}, 'T1', ${subkons[0].id}, '${subkons[0].name}', 10, 28000000, 280000000, 1400000, 14000000, 266000000, 3, '2025-11-01', '2026-10-31', 'ditahan', 'aktif'),
      (${p1}, 'T2', ${subkons[1].id}, '${subkons[1].name}', 8, 26000000, 208000000, 1300000, 10400000, 197600000, 3, '2026-01-15', '2026-11-30', 'ditahan', 'aktif'),
      (${p2}, 'T1', ${subkons[2].id}, '${subkons[2].name}', 12, 18000000, 216000000, 900000, 10800000, 205200000, 2, '2026-02-01', '2026-12-15', 'ditahan', 'aktif'),
      (${p4}, 'T1', ${subkons[3].id}, '${subkons[3].name}', 10, 32000000, 320000000, 1600000, 16000000, 304000000, 3, '2025-09-01', '2026-09-30', 'ditahan', 'aktif'),
      (${p5}, 'T1', ${subkons[4].id}, '${subkons[4].name}', 6, 30000000, 180000000, 1500000, 9000000, 171000000, 3, '2025-04-01', '2026-08-31', 'siap_cair', 'aktif')
    RETURNING id, project_id, subkon_id, contract_value, net_payable_value, total_retention;
  `);
  const contracts = contractRes.rows;

  // ─── 5. TERMIN BAYAR (SUBKON PAYMENT TERMS) ────────────────────────────────
  const termRes = await pool.query(`
    INSERT INTO subkon_payment_terms (contract_id, termin_number, label, planned_date, payment_type, gross_amount, retention_amount, net_amount, notes)
    VALUES
      (${contracts[0].id}, 1, 'Termin 1 (Progress 35%)', '2026-03-15', 'termin', 98000000, 4900000, 93100000, 'Pekerjaan Struktur Bawah & Kolom'),
      (${contracts[0].id}, 2, 'Termin 2 (Progress 70%)', '2026-06-20', 'termin', 98000000, 4900000, 93100000, 'Pekerjaan Dinding, Atap & Plesteran'),
      (${contracts[0].id}, 3, 'Termin 3 (Progress 100%)', '2026-09-30', 'termin', 84000000, 4200000, 79800000, 'Finishing & Serah Terima Kunci'),
      (${contracts[1].id}, 1, 'Termin 1 (Progress 40%)', '2026-04-10', 'termin', 83200000, 4160000, 79040000, 'Pekerjaan Struktur & Dinding'),
      (${contracts[1].id}, 2, 'Termin 2 (Progress 80%)', '2026-07-25', 'termin', 83200000, 4160000, 79040000, 'Pekerjaan Atap & ME'),
      (${contracts[2].id}, 1, 'Termin 1 (Progress 50%)', '2026-05-15', 'termin', 108000000, 5400000, 102600000, 'Pekerjaan Struktur & Pasangan Bata'),
      (${contracts[3].id}, 1, 'Termin 1 (Progress 35%)', '2026-02-28', 'termin', 112000000, 5600000, 106400000, 'Pekerjaan Pondasi & Kolom'),
      (${contracts[3].id}, 2, 'Termin 2 (Progress 75%)', '2026-06-15', 'termin', 128000000, 6400000, 121600000, 'Pekerjaan Dinding & Rangka Baja')
    RETURNING id, contract_id, termin_number;
  `);
  const terms = termRes.rows;

  // ─── 6. PEMBAYARAN SUBKON & APPROVALS ───────────────────────────────────────
  const payRes = await pool.query(`
    INSERT INTO subkon_payments (
      contract_id, payment_term_id, payment_type, termin_number, payment_date, period,
      progress_previous, progress_current, velocity, gross_eligible_amount, retention_deducted, net_payment, total_paid_before, status, notes
    ) VALUES
      (${contracts[0].id}, ${terms[0].id}, 'termin', 1, '2026-03-20', 'Maret 2026', 0, 35.0, 1.2, 98000000, 4900000, 93100000, 0, 'paid', 'Pembayaran Termin 1 sudah ditransfer via Mandiri'),
      (${contracts[0].id}, ${terms[1].id}, 'termin', 2, '2026-06-25', 'Juni 2026', 35.0, 72.5, 1.1, 98000000, 4900000, 93100000, 93100000, 'paid', 'Pembayaran Termin 2 sudah ditransfer via BTN'),
      (${contracts[1].id}, ${terms[3].id}, 'termin', 1, '2026-04-15', 'April 2026', 0, 40.0, 1.0, 83200000, 4160000, 79040000, 0, 'paid', 'Pembayaran Termin 1 sudah ditransfer'),
      (${contracts[1].id}, ${terms[4].id}, 'termin', 2, '2026-07-30', 'Juli 2026', 40.0, 81.0, 1.3, 83200000, 4160000, 79040000, 79040000, 'approved', 'Menunggu eksekusi transfer dari kasir'),
      (${contracts[2].id}, ${terms[5].id}, 'termin', 1, '2026-05-20', 'Mei 2026', 0, 50.0, 0.9, 108000000, 5400000, 102600000, 0, 'paid', 'Pembayaran Mandor Daeng Naba Termin 1'),
      (${contracts[3].id}, ${terms[6].id}, 'termin', 1, '2026-03-05', 'Maret 2026', 0, 35.0, 1.4, 112000000, 5600000, 106400000, 0, 'paid', 'Pembayaran Termin 1 CV Sinar Rancang'),
      (${contracts[3].id}, ${terms[7].id}, 'termin', 2, '2026-08-10', 'Agustus 2026', 35.0, 76.0, 1.2, 128000000, 6400000, 121600000, 106400000, 'submitted', 'Diajukan PM ke Direktur Teknik')
    RETURNING id, contract_id, status;
  `);

  for (const p of payRes.rows) {
    await pool.query(`
      INSERT INTO payment_approvals (payment_id, step, approved_by, approved_at, status, notes)
      VALUES
        (${p.id}, 'pm', 'Ir. Fajar Nugroho, ST', '2026-08-01', 'approved', 'Progress lapangan telah diverifikasi sesuai opname'),
        (${p.id}, 'dirtek', 'Ir. Bambang Trihatmojo, ST', '2026-08-02', 'approved', 'Kualitas struktur dan arsitektur memenuhi spek teknis'),
        (${p.id}, 'dirkeu', 'Rina Kusuma, SE, Ak, CA', '2026-08-03', '${p.status === "paid" ? "approved" : "pending"}', 'Pengecekan invoice dan perpajakan lengkap')
    `);
  }

  // ─── 7. UNITS (90 Kavling dengan contract_id terhubung) ────────────────────
  const unitValues: string[] = [];
  const projectList = [
    { id: p1, prefix: "A", count: 20, price: 185000000, sub: subkons[0], contractId: contracts[0].id },
    { id: p1, prefix: "B", count: 15, price: 265000000, sub: subkons[1], contractId: contracts[1].id },
    { id: p2, prefix: "A", count: 18, price: 185000000, sub: subkons[2], contractId: contracts[2].id },
    { id: p3, prefix: "A", count: 10, price: 225000000, sub: subkons[0], contractId: contracts[0].id },
    { id: p4, prefix: "A", count: 15, price: 385000000, sub: subkons[3], contractId: contracts[3].id },
    { id: p5, prefix: "A", count: 12, price: 550000000, sub: subkons[4], contractId: contracts[4].id },
  ];

  for (const grp of projectList) {
    for (let i = 1; i <= grp.count; i++) {
      const num = i.toString().padStart(2, "0");
      const kav = `${grp.prefix}-${num}`;
      let status = "available";
      let adminStatus = "stock";
      let progress = 0;
      let readyAkad = false;

      if (i <= 4) {
        status = "terjual";
        adminStatus = "akad";
        progress = 100;
        readyAkad = true;
      } else if (i <= 8) {
        status = "sp3k";
        adminStatus = "sp3k";
        progress = 85;
        readyAkad = true;
      } else if (i <= 12) {
        status = "booking";
        adminStatus = "pemberkasan";
        progress = 55;
      } else if (i <= 15) {
        status = "konstruksi";
        adminStatus = "stock";
        progress = 35;
      } else {
        status = "available";
        adminStatus = "stock";
        progress = 15;
      }

      const tipe = grp.price <= 200000000 ? "36/72" : grp.price <= 300000000 ? "45/84" : grp.price <= 400000000 ? "54/105" : "70/120";
      unitValues.push(`(
        ${grp.id}, '${grp.prefix}', '${num}', '${tipe}', ${grp.price}, '${status}', ${progress}, ${readyAkad},
        'T1', '${kav}', '${adminStatus}', ${grp.price * 0.8}, ${grp.sub.id}, '${grp.sub.name}', ${grp.contractId}
      )`);
    }
  }

  const unitRes = await pool.query(`
    INSERT INTO units (
      project_id, blok, nomor, tipe, harga, status, progress, ready_akad,
      stage_code, kavling_number, admin_status, ht_value, subkon_id, subkon_name, contract_id
    ) VALUES ${unitValues.join(",\n")}
    RETURNING id, project_id, blok, nomor, tipe, harga, status, progress;
  `);
  const units = unitRes.rows;

  // ─── 8. CONSTRUCTION TASKS, QC & REWORKS ───────────────────────────────────
  const taskNames = [
    { item: "Pekerjaan Pondasi Batu Kali & Sloof Beton", bobot: 15 },
    { item: "Struktur Kolom & Ring Balk Beton Bertulang", bobot: 25 },
    { item: "Pasangan Dinding Bata Ringan & Plester Aci", bobot: 20 },
    { item: "Rangka Atap Baja Ringan & Penutup Genteng", bobot: 20 },
    { item: "Instalasi ME, Sanitair & Pengecatan Finishing", bobot: 20 },
  ];

  for (const u of units) {
    for (let t = 0; t < taskNames.length; t++) {
      const task = taskNames[t];
      const isDone = u.progress >= (t + 1) * 20;
      const isInProg = u.progress > t * 20 && u.progress < (t + 1) * 20;
      const status = isDone ? "selesai" : isInProg ? "sedang_dikerjakan" : "belum_mulai";
      await pool.query(`
        INSERT INTO construction_tasks (unit_id, item, bobot, status, tanggal_mulai, tanggal_selesai, verified_by)
        VALUES (${u.id}, '${task.item}', ${task.bobot}, '${status}', '2026-03-01', '${isDone ? "2026-06-30" : "2026-10-31"}', 'Ir. Fajar Nugroho, ST')
      `);
    }

    // QC Checklist
    await pool.query(`
      INSERT INTO unit_qc (unit_id, qc_item, is_pass, inspected_by, inspected_at, notes)
      VALUES
        (${u.id}, 'Kualitas Mutu Beton & Tulangan', true, 'Yusuf Bachtiar, ST', '2026-06-15', 'Hasil uji tekan beton K-225 memenuhi standar'),
        (${u.id}, 'Ketegakan & Kerataan Plesteran Dinding', ${u.progress >= 50}, 'Yusuf Bachtiar, ST', '2026-07-10', 'Pemeriksaan waterpass dinding ruang utama'),
        (${u.id}, 'Kerapian Rangka Atap & Nok Genteng', ${u.progress >= 70}, 'Yusuf Bachtiar, ST', '2026-07-20', 'Inspeksi bracing dan sekrup baja ringan'),
        (${u.id}, 'Tekanan Air & Kebocoran Pipa Sanitair', ${u.progress >= 90}, 'Heri Susanto', '2026-08-05', 'Uji tekanan pipa instalasi air bersih')
    `);
  }

  // QC Defects & Reworks
  const defectItems = [
    { u: units[0].id, sub: subkons[0], cat: "Arsitektur", desc: "Retak rambut pada plesteran dinding kamar tidur utama", stat: "in_repair" },
    { u: units[1].id, sub: subkons[0], cat: "Finishing", desc: "Nat keramik lantai ruang tamu tidak presisi pada 3 baris", stat: "open" },
    { u: units[2].id, sub: subkons[1], cat: "Pintu & Kusen", desc: "Kusen aluminium pintu belakang seret saat ditutup", stat: "in_repair" },
    { u: units[5].id, sub: subkons[1], cat: "Pengecatan", desc: "Warna cat plafon gypsum belang akibat rembesan", stat: "resolved" },
    { u: units[10].id, sub: subkons[2], cat: "ME & Sanitasi", desc: "Kran wastafel kamar mandi menetes perlahan", stat: "open" },
  ];

  for (const d of defectItems) {
    await pool.query(`
      INSERT INTO qc_defects (unit_id, kategori, deskripsi, status, verified_by)
      VALUES (${d.u}, '${d.cat}', '${d.desc}', '${d.stat}', 'Yusuf Bachtiar, ST')
    `);

    await pool.query(`
      INSERT INTO reworks (unit_id, contract_id, subkon_id, subkon_name, pekerjaan_item, description, found_date, target_completion, status)
      VALUES (${d.u}, ${contracts[0].id}, ${d.sub.id}, '${d.sub.name}', '${d.cat}', '${d.desc}', '2026-08-01', '2026-08-25', '${d.stat}')
    `);
  }

  // ─── 9. MASTER MATERIAL, ACUAN STANDAR, MASUK & KELUAR GUDANG ──────────────
  const matMaster = [
    { name: "Semen Portland Composite 50kg", cat: "Semen", unit: "Sak", min: 50, price: 68000, std36: 120, std45: 150 },
    { name: "Besi Beton Ulir 10mm SNI", cat: "Besi", unit: "Batang", min: 100, price: 85000, std36: 45, std45: 60 },
    { name: "Besi Beton Polos 8mm SNI", cat: "Besi", unit: "Batang", min: 80, price: 58000, std36: 35, std45: 45 },
    { name: "Bata Ringan Hebel 7.5cm", cat: "Bata", unit: "m3", min: 20, price: 650000, std36: 12, std45: 16 },
    { name: "Pasir Cor Pasang", cat: "Agregat", unit: "Ret/Truk", min: 5, price: 950000, std36: 3, std45: 4 },
    { name: "Keramik Lantai 50x50 Granit Tile", cat: "Finishing", unit: "Dus", min: 40, price: 115000, std36: 38, std45: 48 },
    { name: "Baja Ringan Canal C75.75", cat: "Atap", unit: "Batang", min: 50, price: 92000, std36: 28, std45: 36 },
    { name: "Reng Baja Ringan R30.45", cat: "Atap", unit: "Batang", min: 60, price: 42000, std36: 32, std45: 42 },
    { name: "Genteng Metal Pasir", cat: "Atap", unit: "Lembar", min: 100, price: 48000, std36: 65, std45: 85 },
    { name: "Cat Dinding Weatherproof Exterior", cat: "Cat", unit: "Pail 20kg", min: 10, price: 1250000, std36: 2, std45: 3 },
    { name: "Cat Dinding Interior Premium", cat: "Cat", unit: "Pail 20kg", min: 15, price: 850000, std36: 3, std45: 4 },
    { name: "Kabel Listrik NYM 2x1.5mm (50m)", cat: "ME", unit: "Roll", min: 10, price: 450000, std36: 3, std45: 4 },
    { name: "Pipa PVC Wavin 1/2 Inch AW", cat: "ME", unit: "Batang", min: 25, price: 42000, std36: 8, std45: 12 },
    { name: "Kloset Duduk Toto Eco", cat: "Sanitair", unit: "Unit", min: 5, price: 1850000, std36: 1, std45: 1 },
    { name: "Pintu Panel Kayu Kamper", cat: "Kusen", unit: "Daun", min: 10, price: 750000, std36: 3, std45: 4 }
  ];

  const matRes = await pool.query(`
    INSERT INTO prod_material_master (name, category, satuan, minimum_stock, unit_price)
    VALUES ${matMaster.map(m => `('${m.name}', '${m.cat}', '${m.unit}', ${m.min}, ${m.price})`).join(",\n")}
    RETURNING id, name, category, satuan, unit_price;
  `);
  const mats = matRes.rows;

  // Master Acuan Standar Kebutuhan Material
  for (let i = 0; i < mats.length; i++) {
    const mm = matMaster[i];
    await pool.query(`
      INSERT INTO prod_material_standards (
        project_id, stage_code, subkon_id, subkon_name, unit_batch_label, reference_unit_count,
        category, material_name, satuan, planned_quantity, used_quantity, effective_date, notes
      ) VALUES
        (${p1}, 'T1', ${subkons[0].id}, '${subkons[0].name}', 'Tahap 1 (Tipe 36/72)', 10, '${mm.cat}', '${mm.name}', '${mm.unit}', ${mm.std36 * 10}, ${mm.std36 * 7.5}, '2025-11-01', 'Standar acuan desain teknis gambar kerja'),
        (${p1}, 'T2', ${subkons[1].id}, '${subkons[1].name}', 'Tahap 2 (Tipe 45/84)', 8, '${mm.cat}', '${mm.name}', '${mm.unit}', ${mm.std45 * 8}, ${mm.std45 * 5.5}, '2026-01-15', 'Standar acuan desain teknis gambar kerja')
    `);
  }

  // Transaksi Penerimaan Material Masuk (Input Masuk)
  const suppliers = ["PT Semen Tonasa Distributor", "PT Baja Prima Sejahtera", "TB Harapan Jaya Makassar", "PT Catur Sentosa Adiprana", "CV Surya Graha Mandiri"];
  for (let i = 0; i < mats.length; i++) {
    const mat = mats[i];
    const supp = suppliers[i % suppliers.length];
    await pool.query(`
      INSERT INTO prod_material_in (project_id, contract_id, stage_code, material_id, quantity, supplier, document_number, date_in, notes)
      VALUES
        (${p1}, ${contracts[0].id}, 'T1', ${mat.id}, ${250 + i * 20}, '${supp}', 'SJ-IN-202606-${(100 + i).toString()}', '2026-06-10', 'Penerimaan pasokan barang tahap 1'),
        (${p1}, ${contracts[1].id}, 'T2', ${mat.id}, ${180 + i * 15}, '${supp}', 'SJ-IN-202607-${(200 + i).toString()}', '2026-07-15', 'Penerimaan pasokan barang tahap 2'),
        (${p2}, ${contracts[2].id}, 'T1', ${mat.id}, ${150 + i * 10}, '${supp}', 'SJ-IN-202608-${(300 + i).toString()}', '2026-08-05', 'Penerimaan pasokan barang Grand Mutiara')
    `);
  }

  // Transaksi Pengeluaran Material ke Lapangan (Input Keluar)
  for (let i = 0; i < mats.length; i++) {
    const mat = mats[i];
    await pool.query(`
      INSERT INTO prod_material_out (
        project_id, contract_id, stage_code, unit_id, material_id, quantity,
        batch_id, batch_unit_count, batch_units, taken_by, receiver_name, subkon_id, subkon_name, date_out, notes
      ) VALUES
        (${p1}, ${contracts[0].id}, 'T1', ${units[0].id}, ${mat.id}, ${120 + i * 8}, 'BATCH-GH-01', 5, 'A-01 s/d A-05', 'Dedi Supardi (Gudang)', 'Ir. Hendra Wijaya', ${subkons[0].id}, '${subkons[0].name}', '2026-06-25', 'Distribusi material pekerjaan struktur & dinding'),
        (${p1}, ${contracts[1].id}, 'T2', ${units[1].id}, ${mat.id}, ${95 + i * 6}, 'BATCH-GH-02', 4, 'B-01 s/d B-04', 'Dedi Supardi (Gudang)', 'H. Supardi Syam', ${subkons[1].id}, '${subkons[1].name}', '2026-07-28', 'Distribusi material pekerjaan atap & finishing'),
        (${p2}, ${contracts[2].id}, 'T1', ${units[2].id}, ${mat.id}, ${80 + i * 5}, 'BATCH-GM-01', 6, 'A-01 s/d A-06', 'Dedi Supardi (Gudang)', 'Daeng Naba', ${subkons[2].id}, '${subkons[2].name}', '2026-08-12', 'Distribusi material pondasi Grand Mutiara')
    `);
  }

  // ─── 10. FASUM PROGRESS ────────────────────────────────────────────────────
  const fasumList = [
    { prj: p1, type: "Jalan Utama Paving Blok K-300", prog: 95, notes: "Paving jalan utama selesai 95%" },
    { prj: p1, type: "Saluran Drainase U-Ditch 40x40", prog: 90, notes: "Pemasangan saluran drainase sisi barat" },
    { prj: p1, type: "Gerbang Utama & Pos Satpam", prog: 100, notes: "Pekerjaan gerbang utama selesai 100%" },
    { prj: p2, type: "Paving Blok Jalan Lingkungan", prog: 65, notes: "Penghamparan pasir dan pemasangan paving" },
    { prj: p2, type: "Masjid & Sarana Sosial", prog: 45, notes: "Pekerjaan struktur kolom & atap masjid" },
    { prj: p4, type: "Penerangan Jalan Umum (PJU Solar Cell)", prog: 80, notes: "Pemasangan 20 titik tiang PJU" },
  ];

  await pool.query(`
    INSERT INTO fasum_progress (project_id, stage_code, fasum_type, progress_percent, notes)
    VALUES ${fasumList.map(f => `(${f.prj}, 'T1', '${f.type}', ${f.prog}, '${f.notes}')`).join(",\n")}
  `);

  // ─── 11. CUSTOMERS & KPR ───────────────────────────────────────────────────
  const customerNames = [
    "Andi Pratama, S.Kom", "Budi Santoso", "Dewi Sartika, SE", "Fauzan Mahardika", "Hendra Gunawan",
    "Indah Permatasari", "Muhammad Rizky", "Nurul Hidayah", "Reza Firmansyah", "Siti Nurhaliza",
    "Wahyu Hidayat", "Yusuf Maulana", "Anisa Rahmawati", "Bayu Segara", "Citra Lestari",
    "Dian Anggraeni", "Eko Prasetyo", "Farhan Syahputra", "Gita Gutawa", "Hasanuddin",
    "Irwan Syah", "Joko Widodo", "Kartika Putri", "Lukman Hakim", "Mega Utami",
    "Naufal Zaki", "Oki Setiana", "Putri Marino", "Rifky Balweel", "Surya Saputra"
  ];

  const custValues: string[] = [];
  const bankNames = ["Bank BTN", "Bank Mandiri", "BSI", "Bank BRI"];
  const jobs = ["PNS", "Karyawan Swasta", "Wiraswasta", "BUMN", "Dosen/Guru", "Tenaga Medis"];
  const pipelines = ["AKAD", "SP3K", "PEMBERKASAN", "PEMBERKASAN", "BOOKING"];

  for (let i = 0; i < customerNames.length; i++) {
    const u = units[i % units.length];
    const nik = `73710${(1000000000 + i).toString()}`;
    const bnk = bankNames[i % bankNames.length];
    const job = jobs[i % jobs.length];
    const pipe = pipelines[i % pipelines.length];
    const statusKpr = pipe.toLowerCase();
    const phone = `0812${(40000000 + i * 11111).toString().slice(0, 8)}`;

    custValues.push(`(
      ${u.project_id}, ${u.id}, '${customerNames[i]}', '${nik}', '${phone}', '${job}',
      '${bnk}', '${statusKpr}', true, 'T1', '${u.blok}-${u.nomor}', '${phone}', ${u.harga}, '${pipe}', 'KPR'
    )`);
  }

  const custRes = await pool.query(`
    INSERT INTO customers (
      project_id, unit_id, nama, nik, kontak, pekerjaan, bank, status_kpr, berkas_lengkap,
      stage_code, unit_block, phone, unit_price, pipeline_status, payment_type
    ) VALUES ${custValues.join(",\n")}
    RETURNING id, project_id, unit_id, nama, bank, unit_price;
  `);
  const customers = custRes.rows;

  for (const c of customers) {
    if (c.unit_id) {
      await pool.query(`UPDATE units SET customer_id = $1 WHERE id = $2`, [c.id, c.unit_id]);
    }
  }

  // Bank Submissions, SP3K & Akad
  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i];
    const bnk = cust.bank ?? "Bank BTN";

    await pool.query(`
      INSERT INTO bank_submissions (customer_id, bank, submitted_date, bank_officer, registration_number, notes)
      VALUES (${cust.id}, '${bnk}', '2026-06-15', 'Ahmad Pratama', 'SUB-${(1000 + i).toString()}', 'Berkas lengkap masuk verifikasi bank')
    `);

    if (i < 15) {
      await pool.query(`
        INSERT INTO sp3k_records (customer_id, bank, sp3k_number, sp3k_date, approved_amount, plafon_amount, expiry_date, status)
        VALUES (${cust.id}, '${bnk}', 'SP3K-${bnk.slice(0, 3).toUpperCase()}-${(202600 + i).toString()}', '2026-07-10', ${cust.unit_price * 0.85}, ${cust.unit_price * 0.85}, '2026-10-10', 'terbit')
      `);
    }

    if (i < 8) {
      await pool.query(`
        INSERT INTO akad_records (customer_id, bank, notary, akad_date, akad_amount, status)
        VALUES (${cust.id}, '${bnk}', 'Notaris Hj. Andi Maryam, SH, M.Kn', '2026-08-05', ${cust.unit_price * 0.85}, 'selesai')
      `);
    }
  }

  // ─── 12. 40 DATA KARYAWAN (HR) ─────────────────────────────────────────────
  const employeeList = [
    { code: "EMP-001", name: "Dr. Ir. H. Muhammad Arifin, MM", div: "Direksi", pos: "Direktur Utama", loc: "Head Office Makassar", join: "2023-01-10", mgr: null, sal: 35000000 },
    { code: "EMP-002", name: "Ir. Hendra Gunawan, MT", div: "Direksi", pos: "Direktur Operasional", loc: "Head Office Makassar", join: "2023-01-15", mgr: 1, sal: 28000000 },
    { code: "EMP-003", name: "Rina Kusuma, SE, Ak, CA", div: "Direksi", pos: "Direktur Keuangan", loc: "Head Office Makassar", join: "2023-02-01", mgr: 1, sal: 28000000 },
    { code: "EMP-004", name: "Ir. Bambang Trihatmojo, ST", div: "Direksi", pos: "Direktur Teknik & Konstruksi", loc: "Head Office Makassar", join: "2023-03-01", mgr: 1, sal: 26000000 },
    { code: "EMP-005", name: "Ahmad Faisal, SE", div: "Finance", pos: "Finance Manager", loc: "Head Office Makassar", join: "2023-04-01", mgr: 3, sal: 16000000 },
    { code: "EMP-006", name: "Dewi Lestari, S.Ak", div: "Finance", pos: "Senior Accountant", loc: "Head Office Makassar", join: "2023-06-15", mgr: 5, sal: 9500000 },
    { code: "EMP-007", name: "Nurul Aulia, S.Ak", div: "Finance", pos: "Accounts Payable Officer", loc: "Head Office Makassar", join: "2024-01-10", mgr: 5, sal: 7000000 },
    { code: "EMP-008", name: "Wahyu Ramadhan, SE", div: "Finance", pos: "Accounts Receivable Officer", loc: "Head Office Makassar", join: "2024-02-01", mgr: 5, sal: 7000000 },
    { code: "EMP-009", name: "Siti Rahmawati, A.Md", div: "Finance", pos: "Cashier & Treasury Staff", loc: "Head Office Makassar", join: "2024-03-15", mgr: 5, sal: 5500000 },
    { code: "EMP-010", name: "Bayu Perkasa, S.Ak", div: "Finance", pos: "Tax & Compliance Officer", loc: "Head Office Makassar", join: "2024-05-01", mgr: 5, sal: 7500000 },
    { code: "EMP-011", name: "Ir. Fajar Nugroho, ST", div: "Produksi", pos: "Project Manager Green Harmoni", loc: "Site Green Harmoni", join: "2023-05-01", mgr: 4, sal: 15000000 },
    { code: "EMP-012", name: "Reza Saputra, ST", div: "Produksi", pos: "Project Manager Grand Mutiara", loc: "Site Grand Mutiara", join: "2023-07-01", mgr: 4, sal: 14000000 },
    { code: "EMP-013", name: "Ilham Kurniawan, ST", div: "Produksi", pos: "Site Engineer", loc: "Site Green Harmoni", join: "2023-09-10", mgr: 11, sal: 8500000 },
    { code: "EMP-014", name: "Dimas Ariyanto, ST", div: "Produksi", pos: "Site Supervisor Sipil", loc: "Site Green Harmoni", join: "2024-01-15", mgr: 11, sal: 6500000 },
    { code: "EMP-015", name: "Heri Susanto", div: "Produksi", pos: "Site Supervisor ME & Utilitas", loc: "Site Grand Mutiara", join: "2024-02-10", mgr: 12, sal: 6500000 },
    { code: "EMP-016", name: "Farhan Hakim, ST", div: "Produksi", pos: "Quantity Surveyor (QS)", loc: "Head Office Makassar", join: "2023-08-01", mgr: 4, sal: 8000000 },
    { code: "EMP-017", name: "Arif Budiman", div: "Produksi", pos: "Drafter & BIM Modeler", loc: "Head Office Makassar", join: "2023-11-01", mgr: 16, sal: 6000000 },
    { code: "EMP-018", name: "Yusuf Bachtiar, ST", div: "Produksi", pos: "Quality Control (QC) Inspector", loc: "Site Green Harmoni", join: "2024-03-01", mgr: 11, sal: 7000000 },
    { code: "EMP-019", name: "Agus Salim", div: "Produksi", pos: "HSE / K3 Lapangan", loc: "Site Grand Mutiara", join: "2024-04-01", mgr: 12, sal: 5800000 },
    { code: "EMP-020", name: "Dedi Supardi", div: "Produksi", pos: "Logistik & Gudang Lapangan", loc: "Site Green Harmoni", join: "2024-04-15", mgr: 11, sal: 5000000 },
    { code: "EMP-021", name: "Maya Indrawati, S.I.Kom", div: "Marketing", pos: "Marketing Manager", loc: "Head Office Makassar", join: "2023-03-15", mgr: 2, sal: 15000000 },
    { code: "EMP-022", name: "Kevin Sanjaya, S.Ds", div: "Marketing", pos: "Digital Marketing Specialist", loc: "Head Office Makassar", join: "2023-06-01", mgr: 21, sal: 8000000 },
    { code: "EMP-023", name: "Putri Anggraini, SE", div: "Marketing", pos: "Senior In-House Sales Lead", loc: "Marketing Gallery Green Harmoni", join: "2023-05-15", mgr: 21, sal: 7500000 },
    { code: "EMP-024", name: "Rian Hidayat", div: "Marketing", pos: "In-House Property Advisor", loc: "Marketing Gallery Grand Mutiara", join: "2023-10-01", mgr: 21, sal: 6000000 },
    { code: "EMP-025", name: "Tania Aurelia", div: "Marketing", pos: "In-House Property Advisor", loc: "Marketing Gallery Green Harmoni", join: "2024-01-10", mgr: 21, sal: 5500000 },
    { code: "EMP-026", name: "Bagus Wicaksono", div: "Marketing", pos: "Graphic Designer & Content Creator", loc: "Head Office Makassar", join: "2024-02-15", mgr: 22, sal: 5500000 },
    { code: "EMP-027", name: "Lia Maharani, A.Md", div: "Marketing", pos: "Admin CRM & Leads Coordinator", loc: "Head Office Makassar", join: "2024-03-01", mgr: 21, sal: 5000000 },
    { code: "EMP-028", name: "Eka Wulandari, SH", div: "Administrasi", pos: "KPR Administration Lead", loc: "Head Office Makassar", join: "2023-04-10", mgr: 2, sal: 9000000 },
    { code: "EMP-029", name: "Zulfaqar Ali, SE", div: "Administrasi", pos: "Bank Liaison & KPR Officer", loc: "Head Office Makassar", join: "2023-08-15", mgr: 28, sal: 6500000 },
    { code: "EMP-030", name: "Nadya Safitri, S.Sos", div: "Administrasi", pos: "Customer Care & Pemberkasan", loc: "Head Office Makassar", join: "2024-01-05", mgr: 28, sal: 5500000 },
    { code: "EMP-031", name: "Rizaldi Firmansyah", div: "Administrasi", pos: "KPR Processing Staff", loc: "Head Office Makassar", join: "2024-04-01", mgr: 28, sal: 5000000 },
    { code: "EMP-032", name: "Faisal Tanjung, SH, M.Kn", div: "Legal", pos: "Legal & Compliance Manager", loc: "Head Office Makassar", join: "2023-03-01", mgr: 1, sal: 16000000 },
    { code: "EMP-033", name: "Andi Bau Masse, SH", div: "Legal", pos: "Perizinan & BPN Specialist", loc: "Head Office Makassar", join: "2023-07-01", mgr: 32, sal: 9000000 },
    { code: "EMP-034", name: "Ratna Sari Dewi, SH", div: "Legal", pos: "Notary & Contract Specialist", loc: "Head Office Makassar", join: "2024-02-01", mgr: 32, sal: 7500000 },
    { code: "EMP-035", name: "M. Ikhsan, SH", div: "Legal", pos: "Legal Drafting & Land Staff", loc: "Head Office Makassar", join: "2024-05-10", mgr: 32, sal: 5500000 },
    { code: "EMP-036", name: "Dra. Hj. Wahyuni, M.Psi", div: "HR", pos: "Human Resource Manager", loc: "Head Office Makassar", join: "2023-02-15", mgr: 1, sal: 15000000 },
    { code: "EMP-037", name: "Lukmanul Hakim, S.Psi", div: "HR", pos: "Recruitment & Training Officer", loc: "Head Office Makassar", join: "2023-09-01", mgr: 36, sal: 7000000 },
    { code: "EMP-038", name: "Anisa Fitriani, SE", div: "HR", pos: "Payroll & Compensation Staff", loc: "Head Office Makassar", join: "2024-01-15", mgr: 36, sal: 6000000 },
    { code: "EMP-039", name: "Bambang Sudiro", div: "HR", pos: "General Affair & Asset Supervisor", loc: "Head Office Makassar", join: "2023-06-15", mgr: 36, sal: 6500000 },
    { code: "EMP-040", name: "Rahmat Hidayat", div: "HR", pos: "Office Driver & Messenger Staff", loc: "Head Office Makassar", join: "2024-03-01", mgr: 39, sal: 4200000 },
  ];

  const empValues = employeeList.map(e => `(
    '${e.code}', '${e.name}', '${e.div}', '${e.pos}', ${e.mgr ?? "NULL"}, 'aktif', '${e.join}',
    '${e.loc}', '${e.loc.includes("Green") ? "Green Harmoni Residence" : e.loc.includes("Mutiara") ? "Grand Mutiara Gowa" : "Semua Proyek"}',
    '0812${Math.floor(10000000 + Math.random() * 89999999)}', '${e.code.toLowerCase()}@property.local'
  )`);

  const empRes = await pool.query(`
    INSERT INTO hr_employees (employee_code, name, division, position, direct_manager_id, employment_status, join_date, location, project, phone, email)
    VALUES ${empValues.join(",\n")}
    RETURNING id, employee_code, name, division, position;
  `);
  const employees = empRes.rows;

  // ─── 13. 120+ TRANSAKSI KEUANGAN 3 BULAN TERAKHIR ──────────────────────────
  const cashflowEntries: string[] = [];
  const months = [
    { name: "Juni 2026", year: 2026, month: 6, days: 30, code: "202606" },
    { name: "Juli 2026", year: 2026, month: 7, days: 31, code: "202607" },
    { name: "Agustus 2026", year: 2026, month: 8, days: 21, code: "202608" },
  ];

  let trxId = 1;
  for (const m of months) {
    // 1. Inflow: Booking fees (8 per bulan)
    for (let b = 1; b <= 8; b++) {
      const day = ((b * 3) % m.days) + 1;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[b % projects.length].nama;
      const amt = 5000000;
      cashflowEntries.push(`(
        '${date}', 'cash_in', 'Unit Sales (Penerimaan Konsumen)', '${prj}', ${amt},
        'Booking Fee Unit Kavling Blok ${String.fromCharCode(65 + (b % 3))}-${(b + 2).toString().padStart(2, "0")}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 2. Inflow: DP Konsumen (6 per bulan)
    for (let d = 1; d <= 6; d++) {
      const day = ((d * 4) % m.days) + 1;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[d % projects.length].nama;
      const amt = 25000000 + (d * 5000000);
      cashflowEntries.push(`(
        '${date}', 'cash_in', 'Unit Sales (Penerimaan Konsumen)', '${prj}', ${amt},
        'Down Payment (DP Tahap ${((d % 2) + 1)}) Konsumen ${customerNames[d % customerNames.length]}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 3. Inflow: Pencairan KPR Bank (5 per bulan)
    for (let k = 1; k <= 5; k++) {
      const day = ((k * 5) % m.days) + 1;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[k % projects.length].nama;
      const bnk = bankNames[k % bankNames.length];
      const amt = 180000000 + (k * 20000000);
      cashflowEntries.push(`(
        '${date}', 'cash_in', 'Unit Sales (Penerimaan Konsumen)', '${prj}', ${amt},
        'Pencairan Akad KPR ${bnk} - Unit ${String.fromCharCode(65 + (k % 2))}-${k.toString().padStart(2, "0")} an ${customerNames[k * 2 % customerNames.length]}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 4. Outflow: Termin Subkontraktor (6 per bulan)
    for (let s = 1; s <= 6; s++) {
      const day = ((s * 4 + 2) % m.days) + 1;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[s % projects.length].nama;
      const sub = subkons[s % subkons.length].name;
      const amt = 35000000 + (s * 8000000);
      cashflowEntries.push(`(
        '${date}', 'cash_out', 'Pembayaran Subkontraktor', '${prj}', ${amt},
        'Pembayaran Progress Konstruksi Termin ${((s % 3) + 1)} (${sub})', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 5. Outflow: Pembelian Material Konstruksi (6 per bulan)
    const matNames = ["Semen Tonasa 50kg (200 Sak)", "Bata Ringan Hebel 7.5cm (3 Do)", "Besi Beton Ulir 10mm & 8mm", "Pasir Cor & Pasang (5 Ret)", "Baja Ringan Canal C75 & Reng", "Keramik 50x50 Granit Tile (100 Dus)"];
    for (let mt = 0; mt < matNames.length; mt++) {
      const day = ((mt * 4 + 1) % m.days) + 1;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[mt % projects.length].nama;
      const amt = 18000000 + (mt * 4500000);
      cashflowEntries.push(`(
        '${date}', 'cash_out', 'Biaya Konstruksi Langsung (Material)', '${prj}', ${amt},
        'Pengadaan Material ${matNames[mt]}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 6. Outflow: Gaji & Payroll Karyawan (1 per bulan)
    const payrollDate = `${m.year}-${m.month.toString().padStart(2, "0")}-25`;
    const payrollAmt = 158000000;
    cashflowEntries.push(`(
      '${payrollDate}', 'cash_out', 'Biaya Operasional & SDM (Overhead)', 'Holding / Operasional Pusat', ${payrollAmt},
      'Payroll & Gaji 40 Karyawan Periode ${m.name}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
    )`);

    // 7. Outflow: Marketing & Iklan (3 per bulan)
    for (let ad = 1; ad <= 3; ad++) {
      const day = ad * 8;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[ad % projects.length].nama;
      const amt = 8500000 + (ad * 3000000);
      cashflowEntries.push(`(
        '${date}', 'cash_out', 'Biaya Marketing & Promosi', '${prj}', ${amt},
        'Biaya Kampanye Digital Meta Ads & Media Outdoor Billboard Periode ${m.name}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 8. Outflow: Legalitas & Notaris / BPN (2 per bulan)
    for (let lg = 1; lg <= 2; lg++) {
      const day = lg * 12;
      const date = `${m.year}-${m.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const prj = projects[lg % projects.length].nama;
      const amt = 14000000 + (lg * 6000000);
      cashflowEntries.push(`(
        '${date}', 'cash_out', 'Biaya Legalitas & Perizinan', '${prj}', ${amt},
        'Biaya Balik Nama & Pecah SHM Notaris / BPN Kavling Tahap ${lg}', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
      )`);
    }

    // 9. Outflow: Operasional Kantor & Utilitas (2 per bulan)
    const utilDate1 = `${m.year}-${m.month.toString().padStart(2, "0")}-05`;
    const utilDate2 = `${m.year}-${m.month.toString().padStart(2, "0")}-20`;
    cashflowEntries.push(`(
      '${utilDate1}', 'cash_out', 'Biaya Operasional & SDM (Overhead)', 'Holding / Operasional Pusat', 6500000,
      'Tagihan Listrik PLN, Air PDAM, dan Internet FO Kantor Pusat', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
    )`);
    cashflowEntries.push(`(
      '${utilDate2}', 'cash_out', 'Biaya Operasional & SDM (Overhead)', 'Holding / Operasional Pusat', 4800000,
      'Pengadaan ATK, Konsumsi Rapat & Operasional Kantor', 'TRX-${m.code}-${(trxId++).toString().padStart(4, "0")}'
    )`);
  }

  await pool.query(`
    INSERT INTO finance_cashflow_records (transaction_date, type, category, project_name, amount, description, reference_number)
    VALUES ${cashflowEntries.join(",\n")}
  `);
  console.log(`Berhasil memasukkan ${cashflowEntries.length} transaksi cashflow.`);

  // ─── 14. KPP FACILITIES, DEBTS & RECEIVABLES ─────────────────────────────────
  const kppRes = await pool.query(`
    INSERT INTO finance_kpp_facilities (project_name, bank_name, plafon, first_disbursement_date, tenor_months, interest_rate, schedule_notes, is_active)
    VALUES
      ('Green Harmoni Residence', 'Bank BTN', 8000000000, '2025-11-01', 24, 9.50, 'KPP Konstruksi Tahap 1 (50 Unit)', true),
      ('Grand Mutiara Gowa', 'Bank Syariah Indonesia (BSI)', 5500000000, '2026-02-15', 18, 8.75, 'Line Pembiayaan Proyek BSI Musyarakah', true)
    RETURNING id, project_name, plafon;
  `);

  await pool.query(`
    INSERT INTO finance_kpp_payments (kpp_id, payment_date, principal_paid, interest_paid, notes)
    VALUES
      (${kppRes.rows[0].id}, '2026-06-15', 250000000, 63333333, 'Angsuran Pokok & Bunga KPP BTN Juni 2026'),
      (${kppRes.rows[0].id}, '2026-07-15', 250000000, 61354167, 'Angsuran Pokok & Bunga KPP BTN Juli 2026'),
      (${kppRes.rows[0].id}, '2026-08-15', 250000000, 59375000, 'Angsuran Pokok & Bunga KPP BTN Agustus 2026'),
      (${kppRes.rows[1].id}, '2026-06-20', 180000000, 40104167, 'Bagi Hasil & Pokok Pembiayaan BSI Juni 2026'),
      (${kppRes.rows[1].id}, '2026-07-20', 180000000, 38791667, 'Bagi Hasil & Pokok Pembiayaan BSI Juli 2026'),
      (${kppRes.rows[1].id}, '2026-08-20', 180000000, 37479167, 'Bagi Hasil & Pokok Pembiayaan BSI Agustus 2026')
  `);

  await pool.query(`
    INSERT INTO finance_debt_records (project_name, creditor_name, category, total_amount, paid_amount, remaining_amount, due_date, status, notes)
    VALUES
      ('Green Harmoni Residence', 'PT Semen Tonasa Distributor', 'Hutang Material', 125000000, 45000000, 80000000, '2026-09-15', 'outstanding', 'Invoice Pasokan Semen Tahap 2'),
      ('Grand Mutiara Gowa', 'CV Pilar Utama Konstruksi', 'Hutang Subkon', 85000000, 0, 85000000, '2026-09-05', 'outstanding', 'Termin 3 Pekerjaan Dinding & Plesteran'),
      ('Permata Sudiang Estate', 'PT Baja Prima Sejahtera', 'Hutang Material', 68000000, 20000000, 48000000, '2026-09-20', 'outstanding', 'Pasokan Rangka Atap Baja Ringan')
  `);

  await pool.query(`
    INSERT INTO finance_receivable_records (debtor_name, category, total_amount, due_date, status, notes)
    VALUES
      ('Andi Pratama, S.Kom', 'Piutang Konsumen (Sisa DP)', 15000000, '2026-09-01', 'current', 'Pelunasan DP ke-3 sebelum Akad'),
      ('Dewi Sartika, SE', 'Piutang Konsumen (Biaya Balik Nama)', 8500000, '2026-09-10', 'current', 'Biaya Kelebihan Tanah & Pajak BPHTB'),
      ('Fauzan Mahardika', 'Piutang Konsumen (Upgrade Finishing)', 12000000, '2026-09-15', 'current', 'Permintaan upgrade lantai granit & kanopi')
  `);

  // ─── 15. RAB ITEMS ──────────────────────────────────────────────────────────
  const rabItems = [
    { prj: "Green Harmoni Residence", item: "Pekerjaan Persiapan & Cut/Fill", cat: "Persiapan", rab: 350000000, real: 340000000 },
    { prj: "Green Harmoni Residence", item: "Konstruksi Rumah Tipe 36 (20 Unit)", cat: "Struktur & Arsitektur", rab: 1800000000, real: 1650000000 },
    { prj: "Green Harmoni Residence", item: "Konstruksi Rumah Tipe 45 (15 Unit)", cat: "Struktur & Arsitektur", rab: 1950000000, real: 1420000000 },
    { prj: "Green Harmoni Residence", item: "Fasum Jalan Paving & Drainase", cat: "Fasum & Infrastruktur", rab: 450000000, real: 410000000 },
    { prj: "Grand Mutiara Gowa", item: "Pekerjaan Pondasi & Struktur Bawah", cat: "Struktur", rab: 620000000, real: 580000000 },
    { prj: "Grand Mutiara Gowa", item: "Pemasangan Dinding & Plesteran", cat: "Arsitektur", rab: 850000000, real: 720000000 },
    { prj: "Grand Mutiara Gowa", item: "Instalasi Jaringan Listrik & Air", cat: "ME", rab: 280000000, real: 210000000 },
    { prj: "Permata Sudiang Estate", item: "Pekerjaan Struktur Beton Bertulang", cat: "Struktur", rab: 1450000000, real: 1380000000 },
    { prj: "Permata Sudiang Estate", item: "Pekerjaan Atap Baja Ringan & Genteng", cat: "Atap", rab: 520000000, real: 490000000 },
  ];

  await pool.query(`
    INSERT INTO finance_rab_items (project_name, stage_code, item_name, item_category, rab_amount, realization_amount)
    VALUES ${rabItems.map(r => `('${r.prj}', 'T1', '${r.item}', '${r.cat}', ${r.rab}, ${r.real})`).join(",\n")}
  `);

  // ─── 16. MARKETING LEADS & CAMPAIGNS ───────────────────────────────────────
  const campaigns = [
    { name: "Promo Merdeka DP 0% Green Harmoni", budget: 35000000, spend: 31200000, impresi: 125000, klik: 4200, leads: 85, start: "2026-07-01", end: "2026-08-31" },
    { name: "Hunian Eksklusif Grand Mutiara Gowa", budget: 25000000, spend: 22800000, impresi: 95000, klik: 3100, leads: 62, start: "2026-06-15", end: "2026-08-15" },
    { name: "Investasi Properti Permata Sudiang", budget: 40000000, spend: 38500000, impresi: 180000, klik: 5800, leads: 110, start: "2026-06-01", end: "2026-08-20" },
    { name: "Flash Sale Tipe 36 Subsidi", budget: 15000000, spend: 14500000, impresi: 80000, klik: 2900, leads: 94, start: "2026-07-20", end: "2026-08-10" },
  ];

  await pool.query(`
    INSERT INTO campaigns (project_id, nama, platform, anggaran, spend, impresi, klik, leads_generated, tanggal_mulai, tanggal_selesai, status)
    VALUES ${campaigns.map(c => `(${p1}, '${c.name}', 'instagram', ${c.budget}, ${c.spend}, ${c.impresi}, ${c.klik}, ${c.leads}, '${c.start}', '${c.end}', 'aktif')`).join(",\n")}
  `);

  const leadNames = [
    "Ahmad Subarjo", "Ratna Galih", "Bagus Triyono", "Siti Aminah", "Faisal Basri",
    "Agus Harimurti", "Nita Permata", "Rahmat Danu", "Sri Wahyuni", "Dian Sastrowardoyo",
    "Toni Sucipto", "Hendra Setiawan", "Lestari Ayu", "Rudi Hartono", "Mega Bintang"
  ];
  const leadStages = ["lead_masuk", "follow_up", "survey_dijadwalkan", "survey_selesai", "booking", "berkas_masuk", "sp3k_terbit"];
  const leadSources = ["instagram", "facebook", "tiktok", "walk_in", "referral", "pameran"];

  await pool.query(`
    INSERT INTO leads (project_id, nama, kontak, source, status, budget, pic_sales)
    VALUES ${leadNames.map((n, i) => `(
      ${projects[i % projects.length].id}, '${n}', '0812${(80000000 + i * 2345).toString().slice(0, 8)}',
      '${leadSources[i % leadSources.length]}', '${leadStages[i % leadStages.length]}', 'Rp 250.000.000', 'Putri Anggraini'
    )`).join(",\n")}
  `);

  // ─── 17. LEGALITAS & PERIZINAN (DASHBOARD, PERIZINAN, LAHAN, SHM, ISU, ARSIP) ───
  // 1. Dokumen Perizinan (Permit Documents Matching Matrix)
  const defaultPermitNames = [
    { group: "perizinan_dasar", name: "KKPR", inst: "Dinas PUPR / OSS", no: "KKPR-7306-2025-0012" },
    { group: "perizinan_dasar", name: "SPPL/UKL-UPL/AMDAL", inst: "Dinas Lingkungan Hidup", no: "UKL-UPL-GOWA-2025-084" },
    { group: "perizinan_bangunan", name: "Persetujuan Siteplan", inst: "Dinas Perkimtan", no: "503/SITEPLAN/GOWA/2025" },
    { group: "perizinan_bangunan", name: "PBG", inst: "SIMBG", no: "PBG-7306-2025-0189" },
    { group: "perizinan_bangunan", name: "SLF", inst: "Dinas PUPR", no: "SLF-7306-2026-0008" },
    { group: "perizinan_bangunan", name: "Sikumbang", inst: "Kementerian PUPR", no: "SIKUMBANG-ID-91823" },
    { group: "izin_teknis", name: "Andalalin", inst: "Dinas Perhubungan", no: "551/ANDALALIN/2026" },
    { group: "izin_teknis", name: "SIPA", inst: "Balai Wilayah Sungai (BWS)", no: "SIPA-BWS-POMPENGAN-2025" },
  ];

  const permitRows: string[] = [];
  for (const prj of projects) {
    for (const dp of defaultPermitNames) {
      const isSamata = prj.id === p5;
      const isGreen = prj.id === p1;
      const stat = isSamata || isGreen || dp.name === "KKPR" || dp.name === "SPPL/UKL-UPL/AMDAL" || dp.name === "Persetujuan Siteplan" || dp.name === "PBG"
        ? "selesai"
        : dp.name === "SLF" ? "proses" : "selesai";

      permitRows.push(`(
        ${prj.id}, '${dp.group}', '${dp.name}', '${dp.inst}', '${dp.no}', '2025-09-01', '2026-01-15', '2026-01-10',
        '${stat}', 'Faisal Tanjung, SH, M.Kn', 'Dokumen resmi terverifikasi dan memenuhi syarat bankable'
      )`);
    }
  }

  await pool.query(`
    INSERT INTO permit_documents (project_id, permit_group, permit_name, institution, document_number, submission_date, target_date, actual_date, status, pic, notes)
    VALUES ${permitRows.join(",\n")}
  `);

  // 2. Tahapan Legalitas Lahan (Land Stages)
  const landStageList = [
    { prj: p1, code: "T1", ident: "Lahan Dg. Ari & H. Syam", area: 10500, kav: 65, cert: "SHM No. 0412/Somba Opu", stat: "selesai", pic: "Andi Bau Masse, SH" },
    { prj: p1, code: "T2", ident: "Lahan H. Daeng Naba", area: 8000, kav: 55, cert: "SHM No. 0488/Somba Opu", stat: "pemecahan_shm", pic: "Andi Bau Masse, SH" },
    { prj: p2, code: "T1", ident: "Lahan H. Anas & Keluarga", area: 14200, kav: 95, cert: "SHM No. 0182/Pallangga", stat: "pemecahan_shm", pic: "Ratna Sari Dewi, SH" },
    { prj: p3, code: "T1", ident: "Lahan Mandai Permai", area: 12000, kav: 80, cert: "SHM No. 0325/Mandai", stat: "balik_nama", pic: "Ratna Sari Dewi, SH" },
    { prj: p4, code: "T1", ident: "Lahan Biringkanaya Estate", area: 16800, kav: 110, cert: "HGB No. 102/Biringkanaya", stat: "pemecahan_shm", pic: "Andi Bau Masse, SH" },
    { prj: p5, code: "T1", ident: "Lahan Samata Garden", area: 9800, kav: 65, cert: "SHM No. 0214/Samata", stat: "selesai", pic: "Faisal Tanjung, SH, M.Kn" },
  ];

  const landStageRes = await pool.query(`
    INSERT INTO land_stages (project_id, stage_code, stage_identity, land_area, target_kavlings, certificate_number, stage_status, notes)
    VALUES ${landStageList.map(l => `(${l.prj}, '${l.code}', '${l.ident}', ${l.area}, ${l.kav}, '${l.cert}', '${l.stat}', 'Penguasaan lahan aman dan berkekuatan hukum tetap')`).join(",\n")}
    RETURNING id, project_id, stage_code;
  `);

  // Checklist Legalitas Tanah
  const checkItems = [
    { name: "Survey Legal & Patok Batas BPN", order: 1 },
    { name: "Pengecekan Sertifikat di Kantor Pertanahan", order: 2 },
    { name: "Perjanjian Ikatan Jual Beli (PPJB) Notaris", order: 3 },
    { name: "Akta Jual Beli (AJB) & Pelunasan Tanah", order: 4 },
    { name: "Balik Nama Sertifikat Induk ke PT", order: 5 },
    { name: "Permohonan Pemecahan Sertifikat (Split SHM)", order: 6 },
    { name: "Pemecahan SPPT PBB per Kavling", order: 7 },
  ];

  for (const ls of landStageRes.rows) {
    for (const item of checkItems) {
      await pool.query(`
        INSERT INTO land_legal_checklist (land_stage_id, item_name, item_order, status, submission_date, target_date, actual_date, pic, notes)
        VALUES (${ls.id}, '${item.name}', ${item.order}, 'selesai', '2025-10-01', '2025-11-15', '2025-11-10', 'Ratna Sari Dewi, SH', 'Telah diverifikasi sesuai prosedur BPN')
      `);
    }
  }

  // 3. Pemecahan SHM (SHM Split Records)
  const shmSplits = [
    { prj: p1, lsId: landStageRes.rows[0].id, code: "T1", target: 65, real: 65, pic: "Ratna Sari Dewi, SH", notes: "Seluruh 65 SHM kavling Tahap 1 telah terbit dari BPN Gowa" },
    { prj: p1, lsId: landStageRes.rows[1].id, code: "T2", target: 55, real: 42, pic: "Ratna Sari Dewi, SH", notes: "42 SHM selesai, 13 kavling dalam proses plotting akhir BPN" },
    { prj: p2, lsId: landStageRes.rows[2].id, code: "T1", target: 95, real: 70, pic: "Andi Bau Masse, SH", notes: "70 SHM split terbit, berkas siap akad KPR" },
    { prj: p3, lsId: landStageRes.rows[3].id, code: "T1", target: 80, real: 25, pic: "Ratna Sari Dewi, SH", notes: "Proses pengukuran ulang peta bidang tanah BPN Maros" },
    { prj: p4, lsId: landStageRes.rows[4].id, code: "T1", target: 110, real: 85, pic: "Andi Bau Masse, SH", notes: "85 Sertifikat HGB/SHM pecahan selesai" },
    { prj: p5, lsId: landStageRes.rows[5].id, code: "T1", target: 65, real: 65, pic: "Faisal Tanjung, SH, M.Kn", notes: "100% SHM pecahan selesai diserahterimakan ke bank/konsumen" },
  ];

  await pool.query(`
    INSERT INTO shm_split_records (project_id, land_stage_id, stage_code, target_split, realized_split, last_updated, pic, notes)
    VALUES ${shmSplits.map(s => `(${s.prj}, ${s.lsId}, '${s.code}', ${s.target}, ${s.real}, '2026-08-15', '${s.pic}', '${s.notes}')`).join(",\n")}
  `);

  // 4. Isu Legal (Legal Issues & History)
  const legalIssues = [
    {
      prj: p1, title: "Klarifikasi Sempadan Saluran Irigasi Sisi Barat", obj: "Kavling Blok A-18 s/d A-20",
      cat: "perizinan", risk: "medium", desc: "Penyesuaian batas sempadan saluran air 1.5 meter sesuai arahan Dinas PUPR Gowa",
      stat: "selesai", pic: "Andi Bau Masse, SH", start: "2026-05-10", tgt: "2026-06-15", comp: "2026-06-12"
    },
    {
      prj: p2, title: "Musyawarah Batas Lahan Tetangga Sebelah Timur", obj: "Batas Tanah Dg. Baji (50 meter)",
      cat: "sengketa_batas", risk: "low", desc: "Pemasangan patok batas permanen disaksikan Kepala Desa Mangalli",
      stat: "selesai", pic: "Ratna Sari Dewi, SH", start: "2026-06-01", tgt: "2026-06-25", comp: "2026-06-20"
    },
    {
      prj: p3, title: "Konfirmasi Pajak BPHTB & Nilai ZNT Bapenda Maros", obj: "Lahan Induk Royal Hills Maros",
      cat: "masalah_shm", risk: "medium", desc: "Penetapan nilai validasi pajak daerah untuk penerbitan SK Nihil BPHTB",
      stat: "aktif", pic: "Faisal Tanjung, SH, M.Kn", start: "2026-07-15", tgt: "2026-08-30", comp: null
    },
    {
      prj: p4, title: "Perpanjangan Izin Lingkungan UKL-UPL", obj: "Kawasan Permata Sudiang",
      cat: "perizinan", risk: "low", desc: "Penyusunan laporan implementasi RKL-RPL semester 1 ke DLH Makassar",
      stat: "selesai", pic: "M. Ikhsan, SH", start: "2026-06-10", tgt: "2026-07-20", comp: "2026-07-18"
    }
  ];

  const issueRes = await pool.query(`
    INSERT INTO legal_issues (project_id, title, object_description, category, risk_level, description, status, pic, start_date, target_resolution, completed_date)
    VALUES ${legalIssues.map(i => `(
      ${i.prj}, '${i.title}', '${i.obj}', '${i.cat}', '${i.risk}', '${i.desc}',
      '${i.stat}', '${i.pic}', '${i.start}', '${i.tgt}', ${i.comp ? `'${i.comp}'` : "NULL"}
    )`).join(",\n")}
    RETURNING id, title;
  `);

  for (const iss of issueRes.rows) {
    await pool.query(`
      INSERT INTO legal_issue_history (issue_id, from_status, to_status, changed_by, notes)
      VALUES
        (${iss.id}, 'draft', 'aktif', 'Faisal Tanjung, SH, M.Kn', 'Identifikasi temuan dan pembentukan tim penanganan'),
        (${iss.id}, 'aktif', 'selesai', 'Faisal Tanjung, SH, M.Kn', 'Penyelesaian tuntas didukung berita acara kesepakatan')
    `);
  }

  // 5. Arsip Dokumen Legal (Legal Documents)
  const archives = [
    { prj: p1, type: "Akta Pendirian PT & Perubahan Terakhir", stat: "aktif", pic: "Faisal Tanjung, SH, M.Kn", exp: "2035-01-01", notes: "Akta Notaris Hj. Andi Maryam, SH No. 12 Tahun 2023" },
    { prj: p1, type: "SK Pengesahan Kemenkumham RI", stat: "aktif", pic: "Faisal Tanjung, SH, M.Kn", exp: "2035-01-01", notes: "AHU-0012938.AH.01.01.TAHUN 2023" },
    { prj: p1, type: "Nomor Induk Berusaha (NIB) OSS RBA", stat: "aktif", pic: "Andi Bau Masse, SH", exp: "2035-01-01", notes: "NIB: 1205938472918 (KBLI Real Estat 68111)" },
    { prj: p1, type: "NPWP Badan & Pengukuhan PKP", stat: "aktif", pic: "Rina Kusuma, SE, Ak, CA", exp: "2035-01-01", notes: "NPWP: 03.849.201.4-801.000" },
    { prj: p1, type: "Sertifikat Induk HGB No. 0412/Somba Opu", stat: "aktif", pic: "Ratna Sari Dewi, SH", exp: "2053-10-20", notes: "Hak Guna Bangunan atas nama PT" },
    { prj: p2, type: "Perjanjian Kerjasama KPR Induk Bank BTN", stat: "aktif", pic: "Faisal Tanjung, SH, M.Kn", exp: "2028-12-31", notes: "PKS No. 082/PKS/BTN-MKS/2025" },
    { prj: p2, type: "Perjanjian Kerjasama Pembiayaan Bank BSI", stat: "aktif", pic: "Faisal Tanjung, SH, M.Kn", exp: "2028-12-31", notes: "PKS Line Fasilitas BSI Musyarakah" },
    { prj: p4, type: "Sertifikat Induk HGB No. 102/Biringkanaya", stat: "aktif", pic: "Ratna Sari Dewi, SH", exp: "2054-05-15", notes: "Sertifikat Induk Luas 16.800 m2" },
  ];

  await pool.query(`
    INSERT INTO legal_documents (project_id, tipe_dokumen, status, pic, expiry, catatan)
    VALUES ${archives.map(a => `(${a.prj}, '${a.type}', '${a.stat}', '${a.pic}', '${a.exp}', '${a.notes}')`).join(",\n")}
  `);

  // ─── 18. BRANDING & SOSMED KPI ─────────────────────────────────────────────
  const brandingKpis = [
    { platform: "Instagram", year: 2026, month: 6, reach: 142000, imp: 280000, eng: 13500, saves: 420, shares: 680, newFoll: 1200, totFoll: 28400, count: 18 },
    { platform: "Instagram", year: 2026, month: 7, reach: 168000, imp: 320000, eng: 16800, saves: 530, shares: 820, newFoll: 1550, totFoll: 31200, count: 22 },
    { platform: "Instagram", year: 2026, month: 8, reach: 195000, imp: 380000, eng: 21000, saves: 690, shares: 950, newFoll: 1800, totFoll: 34500, count: 25 },
    { platform: "TikTok", year: 2026, month: 6, reach: 240000, imp: 480000, eng: 28500, saves: 890, shares: 1450, newFoll: 2100, totFoll: 18500, count: 15 },
    { platform: "TikTok", year: 2026, month: 7, reach: 310000, imp: 620000, eng: 38000, saves: 1200, shares: 1900, newFoll: 2900, totFoll: 23400, count: 20 },
    { platform: "TikTok", year: 2026, month: 8, reach: 420000, imp: 850000, eng: 54000, saves: 1800, shares: 2800, newFoll: 4200, totFoll: 29800, count: 28 },
  ];

  await pool.query(`
    INSERT INTO branding_social_media_kpi (period_year, period_month, platform, reach, impression, engagement, saves, shares, new_followers, total_followers, content_count)
    VALUES ${brandingKpis.map(b => `(${b.year}, ${b.month}, '${b.platform}', ${b.reach}, ${b.imp}, ${b.eng}, ${b.saves}, ${b.shares}, ${b.newFoll}, ${b.totFoll}, ${b.count})`).join(",\n")}
  `);

  // ─── 19. PERENCANAAN FEASIBILITY & RENCANA TAHAPAN ─────────────────────────
  const feasList = [
    { prj: p1, roi: 36.5, irr: 24.2, margin: 28.5, payback: 18, rev: 22200000000, cost: 15873000000, profit: 6327000000, rec: "GO" },
    { prj: p2, roi: 34.0, irr: 22.8, margin: 26.0, payback: 20, rev: 17575000000, cost: 13005500000, profit: 4569500000, rec: "GO" },
    { prj: p3, roi: 38.2, irr: 26.5, margin: 30.2, payback: 16, rev: 18000000000, cost: 12564000000, profit: 5436000000, rec: "GO" },
    { prj: p4, roi: 35.0, irr: 23.5, margin: 27.8, payback: 19, rev: 42350000000, cost: 30576700000, profit: 11773300000, rec: "GO" },
  ];

  await pool.query(`
    INSERT INTO planning_feasibility (project_id, roi, irr, margin, payback_period, total_revenue, total_cost, gross_profit, recommendation)
    VALUES ${feasList.map(f => `(${f.prj}, ${f.roi}, ${f.irr}, ${f.margin}, ${f.payback}, ${f.rev}, ${f.cost}, ${f.profit}, '${f.rec}')`).join(",\n")}
  `);

  // Rencana Tahapan Baseline (Planning Stages & Blocks)
  const planStages = [
    { prj: p1, code: "T1", name: "Tahap 1 - Blok A, B, C", start: "2026-01-10", end: "2026-08-30", units: 45, sales: 8550000000, subkonVal: 3825000000 },
    { prj: p1, code: "T2", name: "Tahap 2 - Blok D, E", start: "2026-06-01", end: "2026-12-31", units: 35, sales: 6650000000, subkonVal: 2975000000 },
    { prj: p2, code: "T1", name: "Tahap 1 - Blok A, B", start: "2026-02-15", end: "2026-10-30", units: 40, sales: 7400000000, subkonVal: 3400000000 },
    { prj: p3, code: "T1", name: "Tahap 1 - Blok Boulevard", start: "2026-03-01", end: "2026-11-30", units: 30, sales: 6600000000, subkonVal: 2700000000 },
    { prj: p4, code: "T1", name: "Tahap 1 - Cluster Jasmine", start: "2026-01-20", end: "2026-09-30", units: 50, sales: 19250000000, subkonVal: 7500000000 },
    { prj: p5, code: "T1", name: "Tahap 1 - Blok Samata View", start: "2025-08-01", end: "2026-07-31", units: 40, sales: 7800000000, subkonVal: 3200000000 },
  ];

  const stageRes = await pool.query(`
    INSERT INTO planning_stages (project_id, stage_code, stage_name, target_start, target_end, status, total_units, total_sales_value, total_subkon_value, notes)
    VALUES ${planStages.map(s => `(
      ${s.prj}, '${s.code}', '${s.name}', '${s.start}', '${s.end}', 'published',
      ${s.units}, ${s.sales}, ${s.subkonVal}, 'Baseline tahapan konstruksi telah disinkronkan ke Produksi'
    )`).join(",\n")}
    RETURNING id, project_id, stage_code;
  `);

  // Planning Stage Blocks
  const stageBlocks = [
    // Green Harmoni T1
    { stgId: stageRes.rows[0].id, prj: p1, stgCode: "T1", blk: "A", units: 20, type: "Tipe 36", price: 190000000, subId: 1, subName: "PT Karya Mandiri Perkasa", subVal: 85000000, start: "2026-01-10", end: "2026-06-30" },
    { stgId: stageRes.rows[0].id, prj: p1, stgCode: "T1", blk: "B", units: 15, type: "Tipe 36", price: 190000000, subId: 1, subName: "PT Karya Mandiri Perkasa", subVal: 85000000, start: "2026-02-01", end: "2026-07-30" },
    { stgId: stageRes.rows[0].id, prj: p1, stgCode: "T1", blk: "C", units: 10, type: "Tipe 45", price: 285000000, subId: 2, subName: "CV Pilar Utama Konstruksi", subVal: 110000000, start: "2026-03-01", end: "2026-08-30" },
    // Green Harmoni T2
    { stgId: stageRes.rows[1].id, prj: p1, stgCode: "T2", blk: "D", units: 20, type: "Tipe 36", price: 190000000, subId: 3, subName: "Mandor Daeng Naba", subVal: 85000000, start: "2026-06-01", end: "2026-11-30" },
    { stgId: stageRes.rows[1].id, prj: p1, stgCode: "T2", blk: "E", units: 15, type: "Tipe 45", price: 285000000, subId: 3, subName: "Mandor Daeng Naba", subVal: 110000000, start: "2026-07-01", end: "2026-12-31" },
    // Grand Mutiara T1
    { stgId: stageRes.rows[2].id, prj: p2, stgCode: "T1", blk: "A", units: 25, type: "Tipe 36", price: 185000000, subId: 4, subName: "CV Sinar Rancang Bangun", subVal: 85000000, start: "2026-02-15", end: "2026-09-30" },
    { stgId: stageRes.rows[2].id, prj: p2, stgCode: "T1", blk: "B", units: 15, type: "Tipe 36", price: 185000000, subId: 4, subName: "CV Sinar Rancang Bangun", subVal: 85000000, start: "2026-03-15", end: "2026-10-30" },
  ];

  await pool.query(`
    INSERT INTO planning_stage_blocks (
      stage_id, project_id, stage_code, block_code, unit_count, unit_type,
      price_per_unit, sales_value, subkon_id, subkon_name, subkon_value_per_unit,
      subkon_contract_value, target_start, target_end, siteplan_unit_count, validation_status
    ) VALUES ${stageBlocks.map(b => `(
      ${b.stgId}, ${b.prj}, '${b.stgCode}', '${b.blk}', ${b.units}, '${b.type}',
      ${b.price}, ${b.units * b.price}, ${b.subId}, '${b.subName}', ${b.subVal},
      ${b.units * b.subVal}, '${b.start}', '${b.end}', ${b.units}, 'sesuai'
    )`).join(",\n")}
  `);

  // Analisis Pasar (Planning Market & Competitors)
  const marketList = [
    { prj: p1, kab: "Gowa", kec: "Somba Opu", kel: "Paccinongang", popGrow: 2.8, backlog: 14500, marr: 3200, flpp: 65, pwr: 80, road: 85, tol: 75, sch: 90, mkt: 85, score: 86.4, rec: "Sangat Layak (High Demand FLPP & Komersil)" },
    { prj: p2, kab: "Gowa", kec: "Pallangga", kel: "Mangalli", popGrow: 2.5, backlog: 12000, marr: 2800, flpp: 70, pwr: 75, road: 80, tol: 65, sch: 85, mkt: 80, score: 82.1, rec: "Sangat Layak (Segmen Milenial & Rumah Pertama)" },
    { prj: p3, kab: "Maros", kec: "Mandai", kel: "Bontoa", popGrow: 3.1, backlog: 16000, marr: 3500, flpp: 60, pwr: 85, road: 90, tol: 85, sch: 85, mkt: 90, score: 88.5, rec: "Sangat Potensial (Dekat Bandara & Kawasan Industri)" },
    { prj: p4, kab: "Makassar", kec: "Biringkanaya", kel: "Sudiang", popGrow: 2.9, backlog: 22000, marr: 4100, flpp: 50, pwr: 90, road: 95, tol: 90, sch: 95, mkt: 95, score: 91.2, rec: "Prime Residential Area (Daya Beli Menengah Ke Atas)" },
    { prj: p5, kab: "Gowa", kec: "Somba Opu", kel: "Samata", popGrow: 3.4, backlog: 15000, marr: 3300, flpp: 65, pwr: 85, road: 90, tol: 80, sch: 95, mkt: 90, score: 89.8, rec: "Kawasan Kampus UIN & Sentra Pertumbuhan Baru" },
  ];

  const marketRes = await pool.query(`
    INSERT INTO planning_market (
      project_id, kabupaten, kecamatan, kelurahan, population_growth, backlog_housing,
      marriage_rate, flpp_eligible, purchase_power, road_access, near_tol_plaza,
      near_school, near_market, demand_score, market_recommendation
    ) VALUES ${marketList.map(m => `(
      ${m.prj}, '${m.kab}', '${m.kec}', '${m.kel}', ${m.popGrow}, ${m.backlog},
      ${m.marr}, ${m.flpp}, ${m.pwr}, ${m.road}, ${m.tol},
      ${m.sch}, ${m.mkt}, ${m.score}, '${m.rec}'
    )`).join(",\n")}
    RETURNING id, project_id;
  `);

  for (const mr of marketRes.rows) {
    await pool.query(`
      INSERT INTO planning_competitors (market_id, name, price, product_type, units, absorption, distance)
      VALUES
        (${mr.id}, 'Graha Harmoni Gowa', 185000000, 'tapak', 120, 12, 1.2),
        (${mr.id}, 'Pesona Pallangga Indah', 195000000, 'tapak', 85, 8, 2.5),
        (${mr.id}, 'Bumi Samata Permai', 210000000, 'tapak', 60, 6, 3.1)
    `);
  }

  // ─── 19B. RENCANA CASHFLOW & KPP & MILESTONES (24 Bulan Proyeksi) ───────────
  const cfRows: string[] = [];
  for (const prj of projects) {
    for (let m = 1; m <= 24; m++) {
      let landCost = m === 1 ? 1500000000 : m === 2 ? 1000000000 : 0;
      let constrCost = m >= 2 && m <= 12 ? 450000000 : m >= 13 && m <= 20 ? 300000000 : 100000000;
      let mktCost = m <= 6 ? 45000000 : 25000000;
      let opsCost = 35000000;
      let kppInst = m >= 7 && m <= 18 ? 220000000 : 0;

      let bookingIn = m <= 18 ? (m <= 6 ? 50000000 : 35000000) : 10000000;
      let dpIn = m <= 18 ? (m <= 6 ? 180000000 : 120000000) : 40000000;
      let htIn = m >= 3 && m <= 20 ? 650000000 : m > 20 ? 250000000 : 0;
      let kppDisb = m === 2 ? 1500000000 : m === 4 ? 1200000000 : m === 6 ? 800000000 : 0;
      let units = m <= 18 ? (m % 2 === 0 ? 4 : 3) : 1;

      cfRows.push(`(
        ${prj.id}, ${m}, 'Bln ${m}', ${landCost}, ${constrCost}, ${mktCost}, ${opsCost}, ${kppInst},
        ${bookingIn}, ${htIn}, ${dpIn}, ${kppDisb}, ${Math.max(1, units - 1)}, ${units}, ${units + 1}
      )`);
    }
  }

  await pool.query(`
    INSERT INTO planning_cashflow (
      project_id, month_number, month_label, land_cost_out, construction_cost_out,
      marketing_cost_out, operational_cost_out, kpp_installment_out, booking_fee_in,
      ht_kpr_in, down_payment_in, kpp_disbursement_in, conservative_units, moderate_units, aggressive_units
    ) VALUES ${cfRows.join(",\n")}
  `);

  // Planning KPP & HT
  for (const prj of projects) {
    await pool.query(`
      INSERT INTO planning_kpp (project_id, bank_name, approved_amount, disb_date_1, disb_date_2, disb_date_3, interest_rate, tenure_months, admin_fee)
      VALUES (${prj.id}, 'Bank BTN Kantor Cabang Makassar', 5000000000, '2026-02-15', '2026-04-15', '2026-06-15', 6.0, 12, 50000000)
    `);

    await pool.query(`
      INSERT INTO planning_ht (project_id, buyer_name, unit_number, akad_date, ht_amount, kpr_bank, ht_status, ht_disb_date)
      VALUES
        (${prj.id}, 'Andi Muhammad Yusuf', 'A-01', '2026-06-20', 161500000, 'Bank BTN', 'selesai', '2026-06-25'),
        (${prj.id}, 'Siti Rahmawati', 'A-02', '2026-07-15', 161500000, 'Bank BTN', 'selesai', '2026-07-20'),
        (${prj.id}, 'Budi Santoso, ST', 'B-01', '2026-07-28', 161500000, 'Bank Mandiri', 'selesai', '2026-08-05'),
        (${prj.id}, 'Dr. Nurul Hidayah', 'C-01', '2026-08-10', 242250000, 'BSI', 'proses', '2026-08-25'),
        (${prj.id}, 'Hendra Gunawan', 'A-03', '2026-08-15', 161500000, 'Bank BTN', 'proses', '2026-08-30')
    `);

    // Timeline SPTIS Milestones
    await pool.query(`
      INSERT INTO planning_milestones (project_id, phase, task_name, target_date, actual_date, status, progress_pct, units_done, notes)
      VALUES
        (${prj.id}, 'LAND', 'Pembebasan & Legalitas Lahan T1', '2025-11-30', '2025-11-25', 'selesai', 100, 0, 'AJB Notaris & Balik Nama selesai'),
        (${prj.id}, 'PLAN', 'Penyusunan Siteplan & DED Arsitektur', '2025-12-31', '2025-12-28', 'selesai', 100, 0, 'Pengesahan Dinas Perkimtan'),
        (${prj.id}, 'LEGAL', 'Penerbitan PBG Induk & Pemecahan SHM', '2026-01-31', '2026-01-30', 'selesai', 100, 0, 'PBG terbit dari SIMBG'),
        (${prj.id}, 'SELL', 'Pre-Launching & Penjualan NUP Perdana', '2026-03-31', '2026-03-25', 'selesai', 100, 25, 'Sold out 25 unit pertama'),
        (${prj.id}, 'BUILD', 'Konstruksi Struktur & Dinding Blok A, B', '2026-08-31', '2026-08-20', 'on_track', 85, 35, 'Progres fisik lapangan sesuai kurva S'),
        (${prj.id}, 'AKAD', 'Akad Massal KPR Bank BTN & BSI', '2026-09-30', null, 'on_track', 60, 20, '20 berkas SP3K telah terbit'),
        (${prj.id}, 'HANDOVER', 'Serah Terima Kunci (BAST) Konsumen', '2026-11-30', null, 'belum_mulai', 0, 0, 'Target serah terima tepat waktu')
    `);
  }

  // ─── 19C. PERENCANAAN LAHAN, PRODUK, SDM, LAND BANK & EKSPANSI ─────────────
  // 1. Analisis Lahan & Siteplan
  const planLands = [
    { prj: p1, area: 18500, price: 5550000000, shape: "Persegi Panjang", contour: "Datar", roadW: 8.0, kavArea: 72, leg: "SHM Induk PT", rdArea: 3700, fasArea: 1850, effArea: 12950, maxU: 120, pPerU: 46250000 },
    { prj: p2, area: 14200, price: 3976000000, shape: "Persegi", contour: "Datar", roadW: 7.0, kavArea: 72, leg: "SHM Induk PT", rdArea: 2840, fasArea: 1420, effArea: 9940, maxU: 95, pPerU: 41852631 },
    { prj: p3, area: 12000, price: 4200000000, shape: "L-Shape", contour: "Datar Bergelombang", roadW: 8.0, kavArea: 84, leg: "SHM Atas Nama PT", rdArea: 2400, fasArea: 1200, effArea: 8400, maxU: 80, pPerU: 52500000 },
    { prj: p4, area: 16800, price: 8400000000, shape: "Persegi Panjang", contour: "Datar Siap Bangun", roadW: 9.0, kavArea: 90, leg: "HGB Murni PT", rdArea: 3360, fasArea: 1680, effArea: 11760, maxU: 110, pPerU: 76363636 },
    { prj: p5, area: 9800, price: 3430000000, shape: "Trapesium", contour: "Datar", roadW: 7.5, kavArea: 72, leg: "SHM Induk PT", rdArea: 1960, fasArea: 980, effArea: 6860, maxU: 65, pPerU: 52769230 },
  ];

  await pool.query(`
    INSERT INTO planning_land (
      project_id, land_area, land_price_total, land_shape, contour, road_width,
      kavling_area, legal_status, road_area, fasum_area, effective_area, max_units, land_price_per_unit
    ) VALUES ${planLands.map(l => `(
      ${l.prj}, ${l.area}, ${l.price}, '${l.shape}', '${l.contour}', ${l.roadW},
      ${l.kavArea}, '${l.leg}', ${l.rdArea}, ${l.fasArea}, ${l.effArea}, ${l.maxU}, ${l.pPerU}
    )`).join(",\n")}
  `);

  // 2. Definisi Produk Perencanaan
  const planProducts = [
    { prj: p1, type: "Tipe 36/72", bld: 36, kav: 72, price: 190000000, units: 80, seg: "Milenial & KPR FLPP", compPrice: 195000000 },
    { prj: p1, type: "Tipe 45/84", bld: 45, kav: 84, price: 285000000, units: 40, seg: "Keluarga Muda Komersil", compPrice: 300000000 },
    { prj: p2, type: "Tipe 36/72", bld: 36, kav: 72, price: 185000000, units: 70, seg: "Rumah Pertama FLPP", compPrice: 190000000 },
    { prj: p2, type: "Tipe 45/84", bld: 45, kav: 84, price: 275000000, units: 25, seg: "Komersil Menengah", compPrice: 290000000 },
    { prj: p3, type: "Tipe 45/84", bld: 45, kav: 84, price: 320000000, units: 50, seg: "Karyawan Bandara / BUMN", compPrice: 335000000 },
    { prj: p3, type: "Tipe 54/98", bld: 54, kav: 98, price: 420000000, units: 30, seg: "Komersil Premium", compPrice: 450000000 },
    { prj: p4, type: "Tipe 54/90", bld: 54, kav: 90, price: 485000000, units: 70, seg: "Urban Middle Class", compPrice: 510000000 },
    { prj: p4, type: "Tipe 70/120", bld: 70, kav: 120, price: 685000000, units: 40, seg: "Executive Family", compPrice: 725000000 },
    { prj: p5, type: "Tipe 36/72", bld: 36, kav: 72, price: 195000000, units: 45, seg: "Dosen / Mahasiswa / FLPP", compPrice: 205000000 },
    { prj: p5, type: "Tipe 45/84", bld: 45, kav: 84, price: 295000000, units: 20, seg: "Komersil Samata", compPrice: 315000000 },
  ];

  await pool.query(`
    INSERT INTO planning_product (project_id, house_type, building_area, kavling_area, selling_price, unit_count, target_segment, competitor_price)
    VALUES ${planProducts.map(p => `(${p.prj}, '${p.type}', ${p.bld}, ${p.kav}, ${p.price}, ${p.units}, '${p.seg}', ${p.compPrice})`).join(",\n")}
  `);

  // 3. SDM Perencanaan (Planning SDM per Project)
  for (const prj of projects) {
    await pool.query(`
      INSERT INTO planning_sdm (project_id, site_managers, supervisors, workers, workers_per_unit, units_per_manager)
      VALUES (${prj.id}, 1, 3, 28, 3.2, 25)
    `);
  }

  // 4. Land Bank (Cadangan Lahan Masa Depan)
  const landBanks = [
    { name: "Kawasan Barombong Waterfront Estate", prj: p1, stat: "land_bank", area: 35000, units: 240, acqPrice: 12250000000, tgtStart: "2027-03-01", cert: "SHM No. 0821/Barombong", owner: "Hj. Ratna & Rekan", leg: "SHM Clear & Clean", pPsqm: 350000, pDate: "2026-05-15", notes: "Lahan siap kembang menghadap koridor Tanjung Bunga" },
    { name: "Kawasan Pattallassang Hills Gowa", prj: p2, stat: "land_bank", area: 28000, units: 190, acqPrice: 8400000000, tgtStart: "2027-06-01", cert: "SHM No. 0541/Pattallassang", owner: "Drs. H. Basir", leg: "SHM Bebas Sengketa", pPsqm: 300000, pDate: "2026-06-20", notes: "Akses jalan lingkar luar Mamminasata" },
    { name: "Maros Airport City Phase 2", prj: p3, stat: "land_bank", area: 22000, units: 150, acqPrice: 8800000000, tgtStart: "2027-09-01", cert: "SHM No. 0312/Mandai", owner: "Andi Syamsul", leg: "SHM Lengkap", pPsqm: 400000, pDate: "2026-07-10", notes: "5 menit dari Terminal Keberangkatan Bandara Sultan Hasanuddin" },
    { name: "Kawasan Moncongloe Smart Green", prj: p4, stat: "land_bank", area: 42000, units: 290, acqPrice: 10500000000, tgtStart: "2028-01-15", cert: "SHM No. 0199/Moncongloe", owner: "H. Daeng Tiro", leg: "SHM Clean", pPsqm: 250000, pDate: "2026-08-05", notes: "Peluang kawasan kota mandiri baru terintegrasi" },
  ];

  await pool.query(`
    INSERT INTO planning_land_bank (
      name, project_id, status, land_area, available_units, acquisition_price,
      target_start_date, certificate_number, owner_name, legal_status, price_per_sqm, purchase_date, notes
    ) VALUES ${landBanks.map(b => `(
      '${b.name}', ${b.prj}, '${b.stat}', ${b.area}, ${b.units}, ${b.acqPrice},
      '${b.tgtStart}', '${b.cert}', '${b.owner}', '${b.leg}', ${b.pPsqm}, '${b.pDate}', '${b.notes}'
    )`).join(",\n")}
  `);

  // 5. Kesiapan & Skenario Ekspansi
  const expansionScenarios = [
    { name: "Ekspansi Moderat Mamminasata 2027", desc: "Pengembangan 2 proyek baru (Barombong & Pattallassang) dengan kapasitas 430 unit total", roi: 34.5, risk: 25.0, cash: "Kebutuhan Capex Rp 20,6 Miliar didukung KPP Bank 60% dan modal mandiri", sdm: 88.0, sop: 92.0, dash: 90.0 },
    { name: "Ekspansi Agresif Koridor Bandara Maros", desc: "Akuisisi 5 Hektar lahan penyangga Airport City menyasar segmentasi komersil dan ruko usaha", roi: 39.2, risk: 38.0, cash: "Kebutuhan modal awal Rp 28 Miliar dengan skema kerjasama investor strategis", sdm: 82.5, sop: 89.0, dash: 88.0 },
    { name: "Ekspansi Konservatif Optimalisasi Lahan Eksisting", desc: "Fokus pembukaan Tahap 3 & 4 Green Harmoni dan Grand Mutiara tanpa akuisisi lahan luar", roi: 31.0, risk: 15.0, cash: "Cashflow sangat sehat dengan perputaran dana internal positif", sdm: 95.0, sop: 96.0, dash: 94.0 },
  ];

  await pool.query(`
    INSERT INTO planning_expansion (scenario_name, description, estimated_roi, risk_score, cashflow_impact, sdm_score, sop_score, dashboard_score)
    VALUES ${expansionScenarios.map(s => `('${s.name}', '${s.desc}', ${s.roi}, ${s.risk}, '${s.cash}', ${s.sdm}, ${s.sop}, ${s.dash})`).join(",\n")}
  `);

  // 6. Target Wilayah Ekspansi (Expansion Targets)
  const expTargets = [
    { kab: "Kabupaten Gowa", minP: 180000000, maxP: 350000000, minC: 350000000, maxC: 650000000, cat: "Kawasan penyangga utama dengan pertumbuhan KPR FLPP tertinggi di Sulsel", flpp: 1, tier: "tier1", heur: 92, ai: 95, rat: "Permintaan residensial milenial sangat tinggi dekat pusat kota Makassar", keng: "Infrastruktur jalan tol dan akses transportasi mudah", ris: "Persaingan harga antar pengembang lokal cukup ketat", rek: "Fokus produk Tipe 36 & 45 harga Rp 190 Juta - Rp 290 Juta" },
    { kab: "Kabupaten Maros", minP: 190000000, maxP: 380000000, minC: 400000000, maxC: 750000000, cat: "Kawasan strategis poros trans-Sulawesi dan sentra kargo logistik bandara", flpp: 1, tier: "tier1", heur: 88, ai: 91, rat: "Pertumbuhan kawasan industri dan mobilitas pekerja bandara", keng: "Nilai apresiasi tanah tinggi dan akses jalan poros nasional", ris: "Kesiapan drainase dan tata kelola air peil banjir", rek: "Kembangkan perumahan cluster modern berkonsep asri mandiri" },
    { kab: "Kota Makassar", minP: 350000000, maxP: 750000000, minC: 800000000, maxC: 1850000000, cat: "Pusat pertumbuhan ekonomi regional Indonesia Timur", flpp: 0, tier: "tier1", heur: 94, ai: 96, rat: "Daya beli konsumen tinggi untuk hunian komersil menengah-atas", keng: "Fasilitas kota terlengkap, nilai investasi properti sangat likuid", ris: "Harga tanah mentah tinggi dan ketersediaan lahan terbatas", rek: "Bangun hunian compact luxury 2 lantai Tipe 54 - 70" },
    { kab: "Kabupaten Takalar", minP: 160000000, maxP: 250000000, minC: 250000000, maxC: 400000000, cat: "Potensi pengembangan kawasan industri dan wisata pantai selatan", flpp: 1, tier: "tier2", heur: 76, ai: 80, rat: "Peluang pasar perumahan subsidi pekerja kawasan industri", keng: "Harga perolehan tanah masih sangat terjangkau", ris: "Jarak tempuh ke pusat perkantoran Makassar relatif jauh", rek: "Land banking terencana untuk pengembangan jangka panjang" },
  ];

  await pool.query(`
    INSERT INTO expansion_targets (kabupaten, harga_pinggir_min, harga_pinggir_max, harga_pusat_min, harga_pusat_max, catatan, flpp_suitable, tier, heuristic_score, ai_score, ai_rationale, ai_keunggulan, ai_risiko, ai_rekomendasi_langkah)
    VALUES ${expTargets.map(t => `(
      '${t.kab}', ${t.minP}, ${t.maxP}, ${t.minC}, ${t.maxC}, '${t.cat}', ${t.flpp},
      '${t.tier}', ${t.heur}, ${t.ai}, '${t.rat}', '${t.keng}', '${t.ris}', '${t.rek}'
    )`).join(",\n")}
  `);

  // ─── 20. HR COMPENSATION & CULTURE (40 Karyawan x 3 Bulan) ──────────────────
  const compValues: string[] = [];
  const cultValues: string[] = [];
  for (const emp of employees) {
    const baseSal = employeeList.find(e => e.code === emp.employee_code)?.sal ?? 6000000;
    for (const m of months) {
      const takeHome = baseSal + 500000;
      compValues.push(`(${emp.id}, ${m.year}, ${m.month}, ${baseSal}, 26, 480, 500000, 0, 0, 0, 0, 0, 0, ${takeHome})`);
      cultValues.push(`(${emp.id}, ${m.year}, ${m.month}, 22, 22, 0, 0, 92.5, 95.0)`);
    }
  }

  await pool.query(`
    INSERT INTO hr_compensation_records (employee_id, period_year, period_month, base_salary, hari_kerja_per_bulan, menit_kerja_per_hari, fixed_allowance, performance_bonus, incentive, thr, deduction, potongan_telat, tambahan_lembur, total_take_home)
    VALUES ${compValues.join(",\n")}
  `);

  await pool.query(`
    INSERT INTO hr_culture_records (employee_id, period_year, period_month, days_present, working_days, late_count, discipline_violations, sop_compliance_score, task_completion_score)
    VALUES ${cultValues.join(",\n")}
  `);

  // ─── 21. HR KPI & COMPETENCY DEFINITIONS & SCORES ───────────────────────────
  const kpiDefs = [
    { pos: "Project Manager", div: "Produksi", name: "Ketepatan Waktu Proyek (S-Curve)", tgt: 100, unit: "%" },
    { pos: "Senior In-House Sales", div: "Marketing", name: "Closing Unit per Bulan", tgt: 4, unit: "Unit" },
    { pos: "KPR Administration Lead", div: "Administrasi", name: "SLA SP3K & Akad Cair", tgt: 95, unit: "%" },
    { pos: "Finance Manager", div: "Finance", name: "Ketepatan Laporan Keuangan", tgt: 100, unit: "%" },
  ];

  const kpiDefRes = await pool.query(`
    INSERT INTO hr_kpi_definitions (position, division, kpi_name, monthly_target, weight, unit)
    VALUES ${kpiDefs.map(k => `('${k.pos}', '${k.div}', '${k.name}', ${k.tgt}, 25, '${k.unit}')`).join(",\n")}
    RETURNING id;
  `);

  const kpiRecords: string[] = [];
  for (const emp of employees) {
    for (const m of months) {
      kpiRecords.push(`(${emp.id}, ${kpiDefRes.rows[0].id}, ${m.year}, ${m.month}, 100, 92, 92.00, 'Pencapaian KPI konsisten di atas target')`);
    }
  }
  await pool.query(`
    INSERT INTO hr_kpi_records (employee_id, kpi_definition_id, period_year, period_month, target, actual, achievement_pct, notes)
    VALUES ${kpiRecords.join(",\n")}
  `);

  const compDefs = [
    { pos: "Semua Posisi", div: "Semua", name: "Kepemimpinan & Kolaborasi", tgt: 85 },
    { pos: "Semua Posisi", div: "Semua", name: "Orientasi Target & Kualitas", tgt: 85 },
    { pos: "Semua Posisi", div: "Semua", name: "Integritas & Kepatuhan SOP", tgt: 90 },
  ];

  const compDefRes = await pool.query(`
    INSERT INTO hr_competency_definitions (position, division, competency_name, target_score)
    VALUES ${compDefs.map(c => `('${c.pos}', '${c.div}', '${c.name}', ${c.tgt})`).join(",\n")}
    RETURNING id;
  `);

  const compScores: string[] = [];
  for (const emp of employees) {
    for (const cd of compDefRes.rows) {
      compScores.push(`(${emp.id}, ${cd.id}, 88.5, '2026-08-01', 'Direktur Operasional', 'Kompetensi sangat baik')`);
    }
  }
  await pool.query(`
    INSERT INTO hr_competency_scores (employee_id, competency_definition_id, actual_score, assessment_date, assessor, notes)
    VALUES ${compScores.join(",\n")}
  `);

  // HR Recruitment Needs & Workloads
  await pool.query(`
    INSERT INTO hr_recruitment_needs (position_name, division, location, headcount_needed, headcount_filled, status)
    VALUES
      ('Senior Quantity Surveyor', 'Produksi', 'Head Office Makassar', 1, 0, 'dibuka'),
      ('Digital Performance Marketer', 'Marketing', 'Head Office Makassar', 1, 1, 'selesai'),
      ('Staff Legal Pemberkasan', 'Legal', 'Head Office Makassar', 1, 0, 'dibuka')
  `);

  await pool.query(`
    INSERT INTO hr_workload_records (division, period_year, period_month, capacity, actual_load, load_description)
    VALUES
      ('Produksi', 2026, 8, 100, 88.5, 'Konstruksi 3 proyek aktif berjalan serentak'),
      ('Marketing', 2026, 8, 100, 92.0, 'Kampanye promo kemerdekaan dan pameran'),
      ('Finance', 2026, 8, 100, 85.0, 'Closing bulanan dan rekonsiliasi KPP Bank'),
      ('Administrasi', 2026, 8, 100, 80.0, 'Pemrosesan 30 berkas KPR berjalan')
  `);

  // ─── 21B. HR DAILY ATTENDANCE & OVERTIME RECORDS (40 Karyawan x 3 Bulan) ────
  const attendanceRows: string[] = [];
  const overtimeRows: string[] = [];
  const hrMonths = [
    { name: "JUNI", year: 2026, days: 30 },
    { name: "JULI", year: 2026, days: 31 },
    { name: "AGUSTUS", year: 2026, days: 21 },
  ];

  for (const emp of employees) {
    const empPrj = employeeList.find(e => e.code === emp.employee_code)?.loc.includes("Green")
      ? "Green Harmoni Residence"
      : employeeList.find(e => e.code === emp.employee_code)?.loc.includes("Mutiara")
      ? "Grand Mutiara Gowa"
      : "Semua Proyek";

    for (const m of hrMonths) {
      for (let day = 1; day <= m.days; day++) {
        // Date day of week (0=Sunday)
        const monthIndex = m.name === "JUNI" ? 5 : m.name === "JULI" ? 6 : 7;
        const d = new Date(m.year, monthIndex, day);
        const dayOfWeek = d.getDay();

        let status = "H";
        let lateMin = 0;
        let otMin = 0;

        if (dayOfWeek === 0) {
          status = "L"; // Libur hari Minggu
        } else if ((emp.id + day) % 29 === 0) {
          status = "C"; // Cuti terencana
        } else if ((emp.id + day) % 37 === 0) {
          status = "S"; // Sakit dengan surat dokter
        } else if ((emp.id + day) % 23 === 0) {
          status = "I"; // Izin keperluan keluarga
        } else if ((emp.id * 3 + day) % 11 === 0) {
          status = "T"; // Terlambat
          lateMin = ((emp.id + day) % 4 + 1) * 15; // 15, 30, 45, 60 menit
        } else {
          status = "H"; // Hadir tepat waktu
          if ((emp.id + day) % 7 === 0 && dayOfWeek !== 6) {
            otMin = ((emp.id % 3) + 1) * 60; // 60, 120, 180 menit lembur
          }
        }

        attendanceRows.push(`(${emp.id}, '${emp.name.replace(/'/g, "''")}', '${empPrj}', '${m.name}', ${m.year}, ${day}, '${status}')`);

        if (lateMin > 0 || otMin > 0) {
          overtimeRows.push(`(${emp.id}, '${emp.name.replace(/'/g, "''")}', '${empPrj}', '${m.name}', ${m.year}, ${day}, ${lateMin}, ${otMin})`);
        }
      }
    }
  }

  // Insert in batches of 500 for high performance
  for (let i = 0; i < attendanceRows.length; i += 500) {
    const chunk = attendanceRows.slice(i, i + 500);
    await pool.query(`
      INSERT INTO hr_attendance_records (employee_id, employee_name, project, month, year, day, status)
      VALUES ${chunk.join(",\n")}
    `);
  }

  for (let i = 0; i < overtimeRows.length; i += 500) {
    const chunk = overtimeRows.slice(i, i + 500);
    await pool.query(`
      INSERT INTO hr_overtime_records (employee_id, employee_name, project, month, year, day, terlambat_menit, lembur_jam)
      VALUES ${chunk.join(",\n")}
    `);
  }

  // ─── 22. BRANDING LENGKAP (KONTEN, SOSMED, FOUNDER, KORPORAT, PR, ROI, TRUST) ───
  // 1. Konten Items (15 Konten Tersebar di Kalender & Production Tracker)
  const contentList = [
    { title: "Review Rumah Contoh Tipe 45 Green Harmoni", cat: "Product Review", prj: "Green Harmoni Residence", plat: "Instagram, TikTok", fmt: "Video Reels & TikTok", pic: "Kevin Sanjaya, S.Ds", dead: "2026-08-08", sched: "2026-08-10", act: "2026-08-10", stat: "posted", cost: 1500000, cap: "Hunian modern impian keluarga muda di Somba Opu! DP 0% langsung akad!" },
    { title: "Edukasi Tips Lolos KPR BTN untuk Milenial", cat: "Educational", prj: "Semua Proyek", plat: "Instagram Carousel, TikTok", fmt: "Carousel & Short Video", pic: "Bagus Wicaksono", dead: "2026-08-12", sched: "2026-08-14", act: "2026-08-14", stat: "posted", cost: 800000, cap: "Mau punya rumah pertama tanpa pusing berkas? Simak 5 tips lolos verifikasi KPR ini!" },
    { title: "Progress Pembangunan Jalan Paving Grand Mutiara", cat: "Project Update", prj: "Grand Mutiara Gowa", plat: "Instagram, Facebook", fmt: "Video Drone & Photo", pic: "Kevin Sanjaya, S.Ds", dead: "2026-08-16", sched: "2026-08-18", act: "2026-08-18", stat: "posted", cost: 1200000, cap: "Infrastruktur jalan utama paving K-300 rampung 95%! Kawasan makin siap huni." },
    { title: "Momen Bahagia Serah Terima Kunci Samata", cat: "Testimonial", prj: "Samata Garden View", plat: "YouTube, Instagram", fmt: "Video Liputan HD", pic: "Kevin Sanjaya, S.Ds", dead: "2026-08-19", sched: "2026-08-20", act: "2026-08-20", stat: "posted", cost: 2000000, cap: "Selamat kepada Ibu Citra & keluarga atas serah terima unit di Samata Garden View!" },
    { title: "Tur Virtual Tipe 54 Permata Sudiang Estate", cat: "Product Review", prj: "Permata Sudiang Estate", plat: "TikTok, YouTube", fmt: "Video Tour 4K", pic: "Bagus Wicaksono", dead: "2026-08-22", sched: "2026-08-24", act: null, stat: "approved", cost: 1800000, cap: "Desain compact luxury dekat Bandara Hasanuddin. Cek layout interiornya!" },
    { title: "Behind The Scenes QC Struktur Beton Bertulang", cat: "Engineering & QC", prj: "Green Harmoni Residence", plat: "LinkedIn, Instagram", fmt: "Short Docu", pic: "Bagus Wicaksono", dead: "2026-08-25", sched: "2026-08-27", act: null, stat: "review", cost: 1000000, cap: "Standar mutu pondasi & beton K-225 kami uji ketat demi keamanan 50 tahun ke depan." },
    { title: "Wawancara Arsitek Desain Tropis Modern Ramah Lingkungan", cat: "Thought Leadership", prj: "Royal Hills Maros", plat: "YouTube, Instagram", fmt: "Podcast Clip", pic: "Kevin Sanjaya, S.Ds", dead: "2026-08-26", sched: "2026-08-28", act: null, stat: "editing", cost: 1400000, cap: "Konsep pencahayaan alami dan sirkulasi udara hemat energi di hunian masa kini." },
    { title: "Liputan Fasilitas Taman Bermain & Masjid Kawasan", cat: "Community", prj: "Grand Mutiara Gowa", plat: "Instagram Reels", fmt: "Video Drone & Sound Effect", pic: "Bagus Wicaksono", dead: "2026-08-27", sched: "2026-08-29", act: null, stat: "shooting", cost: 950000, cap: "Kenyamanan lingkungan tempat tumbuh kembang buah hati tercinta." },
    { title: "Naskah Edukasi Memilih Developer Legalitas Aman", cat: "Educational", prj: "Semua Proyek", plat: "Instagram Carousel", fmt: "Infografis Carousel", pic: "Kevin Sanjaya, S.Ds", dead: "2026-08-28", sched: "2026-08-30", act: null, stat: "script", cost: 500000, cap: "Cek 4 dokumen penting sebelum beli rumah agar investasi aman!" },
    { title: "Promo Merdeka Flash Sale Booking Fee 1 Juta", cat: "Promotional", prj: "Semua Proyek", plat: "Instagram Feed & Meta Ads", fmt: "Motion Graphic", pic: "Kevin Sanjaya, S.Ds", dead: "2026-08-29", sched: "2026-08-31", act: null, stat: "idea", cost: 600000, cap: "Khusus bulan Agustus! Booking fee cuma 1 Juta all-in bebas biaya notaris!" },
  ];

  const contentRes = await pool.query(`
    INSERT INTO branding_content_items (
      title, category, project_related, platforms, format, pic, production_deadline,
      scheduled_post_date, actual_post_date, production_status, production_cost, caption
    ) VALUES ${contentList.map(c => `(
      '${c.title}', '${c.cat}', '${c.prj}', '${c.plat}', '${c.fmt}', '${c.pic}',
      '${c.dead}', '${c.sched}', ${c.act ? `'${c.act}'` : "NULL"}, '${c.stat}', ${c.cost}, '${c.cap}'
    )`).join(",\n")}
    RETURNING id, title;
  `);

  // 2. Content Performance & Content ROI (untuk konten yang published)
  for (let i = 0; i < 4; i++) {
    const cId = contentRes.rows[i].id;
    await pool.query(`
      INSERT INTO branding_content_performance (content_id, platform, reach, impression, engagement, saves, shares, comments, content_score, notes)
      VALUES
        (${cId}, 'Instagram', ${45000 + i * 12000}, ${82000 + i * 15000}, ${3800 + i * 800}, ${420 + i * 90}, ${680 + i * 110}, ${120 + i * 25}, ${88.5 + i * 2.5}, 'Performa engagement sangat tinggi di atas benchmark'),
        (${cId}, 'TikTok', ${85000 + i * 20000}, ${140000 + i * 35000}, ${7200 + i * 1400}, ${890 + i * 150}, ${1450 + i * 280}, ${260 + i * 40}, ${91.0 + i * 2.0}, 'Video FYP viral menjangkau audiens Makassar & Gowa')
    `);

    await pool.query(`
      INSERT INTO branding_content_roi (content_id, leads_from_content, bookings_from_content, akad_from_content, estimated_akad_value, notes)
      VALUES (${cId}, ${18 + i * 6}, ${3 + i}, ${1 + (i % 2)}, ${(1 + (i % 2)) * 285000000}, 'Konversi direct messaging & landing page form')
    `);
  }

  // 3. Corporate Branding Records (Juni, Juli, Agustus 2026)
  await pool.query(`
    INSERT INTO branding_corporate_records (brand_name, period_year, period_month, awareness_score, consistency_score, total_reach, notes)
    VALUES
      ('Property Group', 2026, 6, 82.5, 88.0, 385000, 'Kampanye penguatan identitas brand pengembang terpercaya di Sulsel'),
      ('Property Group', 2026, 7, 85.0, 90.5, 490000, 'Peningkatan brand equity pasca serah terima Samata Garden View'),
      ('Property Group', 2026, 8, 88.2, 92.0, 620000, 'Eksposur masif promo kemerdekaan dan peliputan media lokal')
  `);

  // 4. Personal Branding Founder Records (Juni, Juli, Agustus 2026)
  const founderPlatforms = ["LinkedIn", "Instagram", "TikTok"];
  for (const plat of founderPlatforms) {
    await pool.query(`
      INSERT INTO branding_founder_records (
        period_year, period_month, platform, reach, impression, engagement,
        new_followers, total_followers, content_count, leads_from_founder, bookings_from_founder, notes
      ) VALUES
        (2026, 6, '${plat}', 65000, 120000, 5200, 850, 18400, 8, 12, 2, 'Sharing insight industri properti & entrepreneurship'),
        (2026, 7, '${plat}', 82000, 160000, 7100, 1200, 19600, 10, 16, 3, 'Keynote speaker forum perumahan Sulsel'),
        (2026, 8, '${plat}', 105000, 210000, 9400, 1650, 21250, 12, 22, 4, 'Kolaborasi podcast bisnis dan liputan media')
    `);
  }

  // 5. Project Branding Scores (5 Proyek Aktif)
  const projScores = [
    { prj: "Green Harmoni Residence", aware: 90.5, eng: 88.0, inq: 92.0, sent: 94.0, tot: 91.1 },
    { prj: "Grand Mutiara Gowa", aware: 86.0, eng: 84.5, inq: 87.0, sent: 90.0, tot: 86.9 },
    { prj: "Royal Hills Maros", aware: 78.0, eng: 76.0, inq: 80.0, sent: 88.0, tot: 80.5 },
    { prj: "Permata Sudiang Estate", aware: 88.5, eng: 87.0, inq: 89.5, sent: 92.0, tot: 89.2 },
    { prj: "Samata Garden View", aware: 92.0, eng: 90.0, inq: 85.0, sent: 96.0, tot: 90.8 },
  ];

  await pool.query(`
    INSERT INTO branding_project_scores (project_name, period_year, period_month, awareness_score, engagement_score, inquiry_score, sentiment_score, total_score, notes)
    VALUES ${projScores.map(s => `('${s.prj}', 2026, 8, ${s.aware}, ${s.eng}, ${s.inq}, ${s.sent}, ${s.tot}, 'Evaluasi performa branding kawasan')`).join(",\n")}
  `);

  // 6. Media Exposures (Liputan Media Massa)
  const exposures = [
    { name: "Tribun Timur Makassar", type: "Media Online", title: "Pengembang Lokal Sukses Bangun Ratusan Unit Rumah Berkualitas di Gowa", date: "2026-07-22", reach: 180000, notes: "Liputan mendalam serah terima kunci Samata" },
    { name: "Harian Fajar Sulsel", type: "Koran & Cetak", title: "Kiprah Pengembang Muda Membuka Akses Hunian Terjangkau di Kawasan Mamminasata", date: "2026-08-05", reach: 95000, notes: "Wawancara khusus Direktur Utama" },
    { name: "Bisnis Indonesia Regional", type: "Media Online", title: "Sektor Properti Residensial Makassar Tumbuh Positif Kuartal II 2026", date: "2026-08-12", reach: 120000, notes: "Kutipan analisa pasar perumahan" },
    { name: "Kompas Properti", type: "Media Nasional", title: "Green Harmoni Residence Jadi Percontohan Konsep Kawasan Asri Mandiri", date: "2026-08-18", reach: 250000, notes: "Liputan tata ruang hijau dan fasilitas ramah lingkungan" },
  ];

  await pool.query(`
    INSERT INTO branding_media_exposures (media_name, type, title, publish_date, estimated_reach, notes)
    VALUES ${exposures.map(e => `('${e.name}', '${e.type}', '${e.title}', '${e.date}', ${e.reach}, '${e.notes}')`).join(",\n")}
  `);

  // 7. Public Relations Activities
  const prList = [
    { title: "Penandatanganan MoU Kerjasama KPR Prioritas Bank BTN", type: "Partnership Event", party: "Bank BTN Wilayah Sulsel", date: "2026-07-15", reach: 85000, cost: 5000000, score: 94.0, res: "Kesepakatan suku bunga khusus 5.5% fixed 3 tahun untuk konsumen" },
    { title: "Media Gathering & Site Tour Bersama Jurnalis Properti", type: "Media Event", party: "Forum Jurnalis Makassar", date: "2026-08-02", reach: 150000, cost: 12000000, score: 92.5, res: "Pemberitaan serentak di 6 media cetak dan portal online" },
    { title: "Program CSR Peduli Lingkungan: Penanaman 500 Pohon Somba Opu", type: "CSR & Community", party: "DLH Kabupaten Gowa", date: "2026-08-15", reach: 90000, cost: 8500000, score: 95.0, res: "Apresiasi pemerintah daerah dan liputan positif masyarakat" },
  ];

  await pool.query(`
    INSERT INTO branding_pr_activities (title, type, party_name, activity_date, estimated_reach, cost, pr_score, result, notes)
    VALUES ${prList.map(p => `('${p.title}', '${p.type}', '${p.party}', '${p.date}', ${p.reach}, ${p.cost}, ${p.score}, '${p.res}', 'Pelaksanaan PR strategis perusahaan')`).join(",\n")}
  `);

  // 8. Brand Sentiment Records
  const platforms = ["Instagram", "TikTok", "Google Review", "Facebook"];
  for (const plat of platforms) {
    await pool.query(`
      INSERT INTO branding_sentiment_records (
        period_year, period_month, platform, total_analyzed, positive_count, neutral_count, negative_count,
        positive_themes, negative_themes, notes
      ) VALUES
        (2026, 8, '${plat}', 480, 410, 58, 12, 'Kualitas bangunan kokoh, serah terima tepat waktu, lokasi strategis, marketing ramah', 'Waktu respon chat malam hari, kemacetan jalan poros saat jam pulang', 'Sentimen positif 85.4% didominasi kepuasan konsumen')
    `);
  }

  // 9. Trust Score Records (Juni, Juli, Agustus 2026)
  await pool.query(`
    INSERT INTO branding_trust_score_records (
      period_year, period_month, new_testimonials, avg_testimonial_score, progress_content_count,
      avg_response_time_minutes, positive_sentiment_pct, trust_score, notes
    ) VALUES
      (2026, 6, 8, 4.8, 12, 18.5, 84.0, 86.5, 'Indeks kepercayaan publik stabil dan meningkat'),
      (2026, 7, 12, 4.9, 15, 14.2, 86.5, 89.2, 'Dukungan kuat testimoni serah terima kunci Samata'),
      (2026, 8, 16, 4.9, 18, 11.0, 88.5, 92.4, 'Reputasi developer sangat tinggi dengan SLA respon prima')
  `);

  console.log("Semua data seed komprehensif berhasil ditanam dan disinkronkan ke 100% modul!");
}

async function main() {
  try {
    await seedData();
  } catch (error) {
    console.error("Seed error:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
