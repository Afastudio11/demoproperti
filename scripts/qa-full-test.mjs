#!/usr/bin/env node

import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

const APP_BASE = trimSlash(process.env.APP_BASE ?? "http://localhost:5173");
const API_BASE = trimSlash(process.env.API_BASE ?? `${APP_BASE}/api`);
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_USERNAME = process.env.QA_ADMIN_USERNAME ?? "qa_admin";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD ?? "qa_admin_12345";
const QA_PREFIX = process.env.QA_PREFIX ?? "QA-SATARA";

const report = {
  generatedAt: new Date().toISOString(),
  config: {
    appBase: APP_BASE,
    apiBase: API_BASE,
    hasDatabaseUrl: Boolean(DATABASE_URL),
    adminUsername: ADMIN_USERNAME,
  },
  summary: { passed: 0, failed: 0, blocked: 0, warned: 0 },
  checks: [],
  seeded: {},
  credentials: {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    note: "Akun ini hanya dibuat jika DATABASE_URL valid dan DB bisa diakses.",
  },
};

const uiRoutes = [
  "/teamwork",
  "/executive",
  "/projects",
  "/projects/1",
  "/akuisisi",
  "/perencanaan",
  "/perencanaan/pasar",
  "/perencanaan/lahan",
  "/perencanaan/produk",
  "/perencanaan/feasibility",
  "/perencanaan/timeline",
  "/perencanaan/cashflow",
  "/perencanaan/sdm",
  "/perencanaan/landbank",
  "/perencanaan/kpp/1/simulasi",
  "/perencanaan/ekspansi/kesiapan",
  "/perencanaan/ekspansi/skenario",
  "/perencanaan/timeline/warning",
  "/legal",
  "/legal/permit",
  "/legal/lahan",
  "/legal/shm",
  "/legal/issue",
  "/legal/arsip",
  "/marketing",
  "/marketing/lead/new",
  "/marketing/lead/1/edit",
  "/marketing/lead/1",
  "/marketing/lead",
  "/marketing/branding",
  "/marketing/campaign",
  "/marketing/sales",
  "/marketing/absorption",
  "/marketing/stock",
  "/marketing/forecast",
  "/marketing/demand-score",
  "/marketing/kompetitor",
  "/marketing/health",
  "/administrasi",
  "/administrasi/customer/new",
  "/administrasi/customer/1/edit",
  "/administrasi/customer/1",
  "/administrasi/customer",
  "/administrasi/bank-submission",
  "/administrasi/ots",
  "/administrasi/sp3k",
  "/administrasi/akad",
  "/administrasi/ht",
  "/administrasi/bank-performance",
  "/administrasi/aging",
  "/administrasi/target",
  "/administrasi/komplain",
  "/administrasi/dokumen/1",
  "/administrasi/import",
  "/produksi",
  "/produksi/progress/proyek",
  "/produksi/progress/tahap",
  "/produksi/progress/unit",
  "/produksi/fasum",
  "/produksi/subkon/kontrak",
  "/produksi/subkon/termin",
  "/produksi/subkon/approval",
  "/produksi/subkon/performa",
  "/produksi/material/master",
  "/produksi/material/masuk",
  "/produksi/material/keluar",
  "/produksi/material/stok",
  "/produksi/material/konsumsi",
  "/produksi/material/variance",
  "/produksi/material/forecast",
  "/produksi/qc/checklist",
  "/produksi/qc/rework",
  "/produksi/qc/defect",
  "/produksi/ready-akad",
  "/produksi/analitik/velocity",
  "/produksi/analitik/baseline",
  "/produksi/analitik/cost-to-complete",
  "/produksi/analitik/cashflow-impact",
  "/produksi/analitik/produktivitas",
  "/produksi/analitik/eligibilitas",
  "/produksi/analitik/forecast",
  "/produksi/health",
  "/settings",
  "/slis",
  "/hr",
  "/hr/organisasi",
  "/hr/rekrutmen",
  "/hr/kpi/definisi",
  "/hr/kpi/input",
  "/hr/performance",
  "/hr/kompetensi",
  "/hr/training",
  "/hr/karir",
  "/hr/kompensasi",
  "/hr/produktivitas",
  "/hr/suksesi",
  "/hr/kultur",
  "/hr/workload",
  "/hr/ekspansi",
  "/hr/talent-map",
  "/hr/flight-risk",
  "/hr/hc-score",
  "/hr/absensi",
  "/hr/lembur",
  "/hr/masalah",
  "/branding",
  "/branding/korporat",
  "/branding/founder",
  "/branding/konten/kalender",
  "/branding/konten/produksi",
  "/branding/konten/new",
  "/branding/konten",
  "/branding/sosmed",
  "/branding/performa-konten",
  "/branding/proyek",
  "/branding/pr",
  "/branding/sentimen",
  "/branding/roi",
  "/branding/trust",
  "/branding/health",
  "/finance",
  "/finance/upload",
  "/finance/cashflow",
  "/finance/proyek",
  "/finance/kpp",
  "/finance/hutang",
  "/finance/piutang",
  "/finance/rab",
  "/finance/profitabilitas",
  "/finance/forecast",
  "/finance/accounting",
  "/finance/audit",
  "/finance/warning",
  "/finance/ekspansi",
];

const apiGetChecks = [
  ["/healthz", "Health API publik"],
  ["/projects", "Daftar proyek"],
  ["/planning/land", "Planning lahan"],
  ["/land-prospects", "Prospek lahan"],
  ["/planning/market", "Market planning"],
  ["/planning/feasibility", "Feasibility planning"],
  ["/planning/landbank", "Landbank planning"],
  ["/produksi/subkon/master", "Master subkon dari kontrak"],
  ["/produksi/subkon/contracts", "Kontrak subkon"],
  ["/produksi/material/master", "Master material"],
  ["/produksi/material/in", "Material masuk"],
  ["/produksi/material/out", "Material keluar"],
  ["/produksi/material/stok", "Stok material terhitung"],
  ["/hr/employees", "Master karyawan"],
  ["/hr/attendance", "Absensi"],
  ["/hr/overtime", "Lembur"],
  ["/hr/culture", "Culture sync dari absensi"],
  ["/finance/cashflow", "Cashflow finance"],
  ["/dashboard/summary", "Dashboard executive summary"],
];

const seed = {
  projectName: `${QA_PREFIX} Analisis Lahan Gowa`,
  subkonName: `${QA_PREFIX} Subkon Bangun Rapi`,
  employeeName: `${QA_PREFIX} Admin Lapangan`,
  materialName: `${QA_PREFIX} Semen QA`,
};

main().catch(async (error) => {
  addCheck("runner.fatal", "fail", error.message, { stack: error.stack });
  await writeReports();
  process.exitCode = 1;
});

async function main() {
  await seedDatabase();
  await runApiChecks();
  await runUiRouteSmoke();
  await writeReports();
  const exitOnFailure = process.env.QA_EXIT_ON_FAILURE === "1";
  if (exitOnFailure && report.summary.failed > 0) process.exitCode = 1;
}

async function seedDatabase() {
  if (!DATABASE_URL) {
    addCheck("db.seed", "blocked", "DATABASE_URL belum diset, jadi akun admin QA dan fake database belum bisa dibuat.");
    return;
  }

  const pg = await loadOptionalPackage("pg");
  const bcrypt = await loadOptionalPackage("bcryptjs");
  if (!pg || !bcrypt) {
    addCheck("db.seed.dependencies", "blocked", "Package pg/bcryptjs tidak bisa di-resolve dari workspace ini.");
    return;
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query("select 1");
    addCheck("db.connection", "pass", "Database bisa diakses.");

    await ensureCompatColumns(pool);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await one(pool, `
      insert into app_users (username, name, password_hash, role, allowed_modules, is_active, updated_at)
      values ($1, $2, $3, 'super_admin', '[]'::jsonb, true, now())
      on conflict (username) do update
      set name = excluded.name,
          password_hash = excluded.password_hash,
          role = excluded.role,
          allowed_modules = excluded.allowed_modules,
          is_active = true,
          updated_at = now()
      returning id, username
    `, [ADMIN_USERNAME, "QA Super Admin", passwordHash]);
    report.seeded.admin = admin;
    addCheck("db.seed.admin", "pass", `Akun admin QA siap: ${ADMIN_USERNAME}.`);

    const project = await upsertProject(pool);
    const land = await insertOnce(pool, "planning_land", "project_id = $1", [project.id], `
      insert into planning_land (
        project_id, land_area, land_price_total, land_shape, contour, road_width,
        legal_status, notes, road_area, fasum_area, effective_area, max_units,
        land_price_per_unit
      ) values ($1, 24000, 7200000000, 'memanjang', 'landai', 6,
        'SHM sebagian, proses pecah bidang', $2, 3200, 3600, 17200, 96, 75000000)
      returning *
    `, [project.id, `${QA_PREFIX}: seed analisis lahan`]);

    const prospect = await insertOnce(pool, "land_prospects", "lokasi = $1", [seed.projectName], `
      insert into land_prospects (
        project_id, lokasi, luas, harga_m2, status, roi, margin, akses_jalan,
        risk_level, catatan, kelurahan, kecamatan, kabupaten, checklist_items,
        checklist_values, survey_data, ai_result, full_ai_result
      ) values (
        $1, $2, 24000, 300000, 'survey_lengkap', 24.5, 31.2, 6,
        'medium', $3, 'Paccinongang', 'Somba Opu', 'Gowa',
        '["legal","akses","kontur"]'::jsonb,
        '{"legal":"perlu verifikasi batas","akses":"jalan mobil","kontur":"landai"}'::jsonb,
        '{"source":"qa-full-test","traffic":"sedang","floodRisk":"rendah"}'::jsonb,
        '{"score":82,"recommendation":"lanjut feasibility"}'::jsonb,
        '{"sections":["legal","market","technical"],"decision":"conditional-go"}'::jsonb
      ) returning *
    `, [project.id, seed.projectName, `${QA_PREFIX}: prospek lahan fake untuk test integrasi`]);

    const market = await insertOnce(pool, "planning_market", "project_id = $1", [project.id], `
      insert into planning_market (
        project_id, kabupaten, kelurahan, kecamatan, population, backlog_housing,
        umk, avg_income, flpp_realization, flpp_eligible, purchase_power,
        active_developers, active_banks, target_price, road_access,
        sample_size, flpp_preference, demand_score, market_potential_score,
        market_recommendation
      ) values (
        $1, 'Gowa', 'Paccinongang', 'Somba Opu', 851000, 32000,
        3650000, 5200000, 2100, 68, 74, 14, 8, 185000000,
        6, 120, 72, 81, 84, 'Demand cukup kuat, lanjut dengan harga subsidi kompetitif'
      ) returning *
    `, [project.id]);

    const feasibility = await insertOnce(pool, "planning_feasibility", "project_id = $1", [project.id], `
      insert into planning_feasibility (
        project_id, land_cost, land_prep_cost, construction_cost_per_unit,
        fasum_road_cost, permit_cost, marketing_cost, overhead_cost,
        contingency_pct, selling_price_per_unit, total_units, booking_fee_per_unit,
        sales_per_month, kpr_pct, cash_hard_pct, cash_installment_pct,
        total_revenue, total_cost, gross_profit, margin, roi, irr, npv,
        payback_period, bep_units, peak_funding, risk_score, recommendation,
        is_approved, approved_at, catatan
      ) values (
        $1, 7200000000, 850000000, 105000000, 1400000000, 350000000,
        280000000, 520000000, 5, 185000000, 96, 2000000, 8,
        80, 10, 10, 17760000000, 14120000000, 3640000000,
        20.5, 25.8, 18.4, 1120000000, 14, 67, 4800000000,
        41, 'GO bersyarat: kunci legal boundary dan akses material', true,
        '2026-06-10', $2
      ) returning *
    `, [project.id, `${QA_PREFIX}: feasibility fake untuk regression test`]);

    const landbank = await insertOnce(pool, "planning_land_bank", "name = $1", [seed.projectName], `
      insert into planning_land_bank (
        project_id, name, status, land_area, available_units,
        acquisition_price, target_start_date, notes
      ) values ($1, $2, 'ready_to_develop', 24000, 96, 7200000000, '2026-08-01', $3)
      returning *
    `, [project.id, seed.projectName, `${QA_PREFIX}: masuk landbank dari analisis lahan`]);

    const material = await insertOnce(pool, "prod_material_master", "name = $1", [seed.materialName], `
      insert into prod_material_master (name, category, satuan, standard_per_unit, unit_price, minimum_stock)
      values ($1, 'B - Struktur', 'zak', 65, 73000, 30)
      returning *
    `, [seed.materialName]);

    const contract = await insertOnce(pool, "subkon_contracts", "project_id = $1 and subkon_name = $2 and stage_code = 'STR'", [project.id, seed.subkonName], `
      insert into subkon_contracts (
        project_id, stage_code, subkon_name, unit_count, value_per_unit, contract_value,
        retention_per_unit, total_retention, net_payable_value, maintenance_months,
        start_date, target_end_date, retention_status, status
      ) values ($1, 'STR', $2, 2, 18500000, 37000000, 500000, 1000000, 36000000, 3,
        '2026-06-10', '2026-07-25', 'ditahan', 'aktif')
      returning *
    `, [project.id, seed.subkonName]);

    const unit = await insertOnce(pool, "units", "project_id = $1 and blok = 'QA' and nomor = '01'", [project.id], `
      insert into units (
        project_id, contract_id, blok, nomor, tipe, harga, status, progress,
        ready_akad, stage_code, kavling_number, admin_status, subkon_name
      ) values ($1, $2, 'QA', '01', '36/72', 185000000, 'available', 45,
        false, 'STR', 'QA-01', 'stock', $3)
      returning *
    `, [project.id, contract.id, seed.subkonName]);

    await insertOnce(pool, "prod_material_in", "document_number = $1", [`${QA_PREFIX}-MIN-001`], `
      insert into prod_material_in (
        project_id, contract_id, stage_code, unit_id, material_id, quantity,
        supplier, subkon_name, document_number, notes, date_in
      ) values ($1, $2, 'STR', $3, $4, 120, 'Supplier QA', $5, $6, $7, '2026-06-10')
      returning *
    `, [project.id, contract.id, unit.id, material.id, seed.subkonName, `${QA_PREFIX}-MIN-001`, `${QA_PREFIX}: material masuk terhubung proyek/subkon/unit`]);

    await insertOnce(pool, "prod_material_out", "notes = $1", [`${QA_PREFIX}: material keluar untuk unit QA-01`], `
      insert into prod_material_out (
        project_id, contract_id, stage_code, unit_id, material_id, quantity,
        taken_by, subkon_name, date_out, notes
      ) values ($1, $2, 'STR', $3, $4, 35, $5, $6, '2026-06-10', $7)
      returning *
    `, [project.id, contract.id, unit.id, material.id, seed.employeeName, seed.subkonName, `${QA_PREFIX}: material keluar untuk unit QA-01`]);

    const employee = await insertOnce(pool, "hr_employees", "name = $1", [seed.employeeName], `
      insert into hr_employees (
        employee_code, name, division, position, employment_status,
        join_date, location, phone, email, notes
      ) values ('QA-EMP-001', $1, 'Produksi', 'Admin Lapangan', 'aktif',
        '2026-06-01', 'Gowa', '080000000001', 'qa-admin@example.test', $2)
      returning *
    `, [seed.employeeName, `${QA_PREFIX}: karyawan fake untuk absensi/lembur`]);

    await insertOnce(pool, "hr_attendance_records", "employee_id = $1 and project_id = $2 and month = 'JUNI' and year = 2026 and day = 10", [employee.id, project.id], `
      insert into hr_attendance_records (employee_id, employee_name, project_id, project, month, year, day, status)
      values ($1, $2, $3, $4, 'JUNI', 2026, 10, 'HADIR')
      returning *
    `, [employee.id, seed.employeeName, project.id, project.nama]);

    await insertOnce(pool, "hr_overtime_records", "employee_id = $1 and project_id = $2 and month = 'JUNI' and year = 2026 and day = 10", [employee.id, project.id], `
      insert into hr_overtime_records (
        employee_id, employee_name, project_id, project, month, year, day,
        terlambat_menit, lembur_jam
      ) values ($1, $2, $3, $4, 'JUNI', 2026, 10, 0, 2.5)
      returning *
    `, [employee.id, seed.employeeName, project.id, project.nama]);

    await upsertCultureFromSeed(pool, employee.id);

    report.seeded = {
      ...report.seeded,
      project,
      landId: land.id,
      prospectId: prospect.id,
      marketId: market.id,
      feasibilityId: feasibility.id,
      landbankId: landbank.id,
      materialId: material.id,
      contractId: contract.id,
      unitId: unit.id,
      employeeId: employee.id,
    };
    addCheck("db.seed.qaData", "pass", "Fake database QA untuk analisis lahan, material, subkon, unit, absensi, dan lembur sudah tersedia.");
  } catch (error) {
    addCheck("db.seed", "fail", `Seed DB gagal: ${error.message}`, { detail: error.stack });
  } finally {
    await pool.end().catch(() => {});
  }
}

async function runApiChecks() {
  const health = await apiRequest("GET", "/healthz");
  if (!health.ok) {
    addCheck("api.health", "blocked", `API belum siap di ${API_BASE}. Status: ${health.status ?? "network-error"}.`, health.detail);
    for (const [path, label] of apiGetChecks.slice(1)) {
      addCheck(`api.get.${path}`, "blocked", `${label} belum dites karena API health gagal.`);
    }
    return;
  }
  addCheck("api.health", "pass", "API health bisa diakses.");

  const login = await apiRequest("POST", "/auth/login", { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  let cookie = login.cookie;
  if (!login.ok) {
    addCheck("api.auth.login", "blocked", `Login admin QA gagal atau belum tersedia. Status: ${login.status}.`, login.detail);
  } else {
    addCheck("api.auth.login", "pass", "Login admin QA berhasil.");
  }

  for (const [path, label] of apiGetChecks.slice(1)) {
    const result = await apiRequest("GET", path, undefined, cookie);
    addCheck(`api.get.${path}`, result.ok ? "pass" : "fail", result.ok ? `${label} OK.` : `${label} gagal. Status ${result.status}.`, result.detail);
  }

  if (!cookie) return;
  await runDataFlowChecks(cookie);
}

async function runDataFlowChecks(cookie) {
  const checks = [
    {
      id: "flow.materialOut.destination",
      path: "/produksi/material/out",
      validate: (rows) => Array.isArray(rows) && rows.some(row =>
        row.notes?.includes(QA_PREFIX)
        && row.projectId
        && row.contractId
        && row.unitId
        && row.stageCode
        && row.subkonName
        && row.material
        && row.unit
        && row.contract
      ),
      pass: "Material keluar QA terdeteksi sampai tujuan proyek, kontrak, tahap, unit, subkon, dan master material.",
      fail: "Material keluar belum menunjukkan tujuan lengkap proyek/kontrak/tahap/unit/subkon.",
    },
    {
      id: "flow.materialStock.computed",
      path: "/produksi/material/stok",
      validate: (rows) => Array.isArray(rows) && rows.some(row =>
        row.name === seed.materialName
        && Number(row.totalMasuk) >= 120
        && Number(row.totalKeluar) >= 35
        && Number(row.stokAktual) >= 85
      ),
      pass: "Stok material QA dihitung dari material masuk minus material keluar.",
      fail: "Stok material QA belum sinkron dari transaksi masuk/keluar.",
    },
    {
      id: "flow.hrAttendance.employeeProject",
      path: `/hr/attendance?employeeName=${encodeURIComponent(seed.employeeName)}`,
      validate: (rows) => Array.isArray(rows) && rows.some(row => row.employeeId && row.projectId && row.project && row.status),
      pass: "Absensi QA terhubung ke master karyawan dan proyek.",
      fail: "Absensi QA belum membawa employeeId/projectId dengan jelas.",
    },
    {
      id: "flow.hrOvertime.employeeProject",
      path: `/hr/overtime?employeeName=${encodeURIComponent(seed.employeeName)}`,
      validate: (rows) => Array.isArray(rows) && rows.some(row => row.employeeId && row.projectId && Number(row.lemburJam) > 0),
      pass: "Lembur QA terhubung ke master karyawan dan proyek.",
      fail: "Lembur QA belum membawa employeeId/projectId/lemburJam dengan jelas.",
    },
    {
      id: "flow.landAnalysis.downstream",
      path: "/planning/landbank",
      validate: (rows) => Array.isArray(rows) && rows.some(row => row.name === seed.projectName && row.projectId),
      pass: "Analisis lahan QA mengalir ke landbank dengan projectId.",
      fail: "Data lahan QA belum terlihat sebagai landbank yang terkait proyek.",
    },
  ];

  for (const check of checks) {
    const result = await apiRequest("GET", check.path, undefined, cookie);
    if (!result.ok) {
      addCheck(check.id, "fail", `${check.fail} Endpoint gagal status ${result.status}.`, result.detail);
      continue;
    }
    const ok = check.validate(result.body);
    addCheck(check.id, ok ? "pass" : "fail", ok ? check.pass : check.fail, { sampleSize: Array.isArray(result.body) ? result.body.length : null });
  }
}

async function runUiRouteSmoke() {
  for (const route of uiRoutes) {
    const result = await fetchText(`${APP_BASE}${route}`);
    if (!result.ok) {
      addCheck(`ui.route.${route}`, "fail", `Route UI ${route} gagal di-load. Status ${result.status ?? "network-error"}.`, result.detail);
      continue;
    }
    const looksLikeSpa = result.text.includes("<!doctype html") || result.text.includes("<div id=\"root\"");
    const status = looksLikeSpa ? "pass" : "warn";
    addCheck(`ui.route.${route}`, status, looksLikeSpa ? `Route UI ${route} mengembalikan HTML SPA.` : `Route UI ${route} tidak terlihat seperti HTML SPA.`);
  }
}

async function ensureCompatColumns(pool) {
  const statements = [
    "alter table if exists hr_attendance_records add column if not exists employee_id integer",
    "alter table if exists hr_attendance_records add column if not exists project_id integer",
    "alter table if exists hr_overtime_records add column if not exists employee_id integer",
    "alter table if exists hr_overtime_records add column if not exists project_id integer",
    "alter table if exists hr_individual_issues add column if not exists project_id integer",
    "alter table if exists prod_material_in add column if not exists contract_id integer",
    "alter table if exists prod_material_in add column if not exists unit_id integer",
    "alter table if exists prod_material_in add column if not exists subkon_name text",
  ];
  for (const sql of statements) await pool.query(sql);
  addCheck("db.compatColumns", "pass", "Kolom kompatibilitas sinkronisasi HR/material dipastikan ada.");
}

async function upsertProject(pool) {
  const existing = await one(pool, "select * from projects where nama = $1 limit 1", [seed.projectName]);
  if (existing) return existing;
  return one(pool, `
    insert into projects (
      nama, lokasi, provinsi, kabupaten, kecamatan, desa, luas, total_unit,
      fase, status, target_start, target_end, lat, lng
    ) values (
      $1, 'Somba Opu, Gowa', 'Sulawesi Selatan', 'Gowa', 'Somba Opu',
      'Paccinongang', 24000, 96, 'FEASIBILITY', 'active',
      '2026-06-10', '2027-02-28', -5.189, 119.456
    ) returning *
  `, [seed.projectName]);
}

async function insertOnce(pool, table, whereSql, whereParams, insertSql, insertParams) {
  const existing = await one(pool, `select * from ${table} where ${whereSql} limit 1`, whereParams);
  if (existing) return existing;
  return one(pool, insertSql, insertParams);
}

async function upsertCultureFromSeed(pool, employeeId) {
  const existing = await one(pool, `
    select * from hr_culture_records
    where employee_id = $1 and period_year = 2026 and period_month = 6
    limit 1
  `, [employeeId]);
  if (existing) {
    await pool.query(`
      update hr_culture_records
      set days_present = 1, working_days = 1, late_count = 0, notes = $2
      where id = $1
    `, [existing.id, `${QA_PREFIX}: auto culture dari absensi QA`]);
    return existing;
  }
  return one(pool, `
    insert into hr_culture_records (
      employee_id, period_year, period_month, days_present, working_days,
      late_count, discipline_violations, sop_compliance_score, task_completion_score, notes
    ) values ($1, 2026, 6, 1, 1, 0, 0, 88, 91, $2)
    returning *
  `, [employeeId, `${QA_PREFIX}: auto culture dari absensi QA`]);
}

async function one(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] ?? null;
}

async function apiRequest(method, path, body, cookie) {
  try {
    const headers = {};
    if (body) headers["content-type"] = "application/json";
    if (cookie) headers.cookie = cookie;
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const text = await response.text();
    const parsed = parseJson(text);
    return {
      ok: response.ok,
      status: response.status,
      body: parsed ?? text,
      cookie: response.headers.get("set-cookie") ?? cookie,
      detail: response.ok ? undefined : { body: parsed ?? text.slice(0, 500) },
    };
  } catch (error) {
    return { ok: false, status: null, detail: { error: error.message } };
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text, detail: response.ok ? undefined : { body: text.slice(0, 500) } };
  } catch (error) {
    return { ok: false, status: null, text: "", detail: { error: error.message } };
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function loadOptionalPackage(name) {
  const candidates = [
    name,
    `../artifacts/api-server/node_modules/${name}`,
    ...findPnpmCandidates(name),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next pnpm/workspace location.
    }
  }
  return null;
}

function findPnpmCandidates(name) {
  const pnpmDir = new URL("../node_modules/.pnpm", import.meta.url);
  if (!existsSync(pnpmDir)) return [];
  return readdirSync(pnpmDir)
    .filter((entry) => entry === name || entry.startsWith(`${name}@`))
    .map((entry) => `../node_modules/.pnpm/${entry}/node_modules/${name}`);
}

function addCheck(id, status, message, detail) {
  report.checks.push({ id, status, message, detail });
  if (status === "pass") report.summary.passed += 1;
  else if (status === "fail") report.summary.failed += 1;
  else if (status === "blocked") report.summary.blocked += 1;
  else if (status === "warn") report.summary.warned += 1;
}

async function writeReports() {
  await mkdir("docs", { recursive: true });
  await writeFile("docs/qa-test-report.json", `${JSON.stringify(report, null, 2)}\n`);
  await writeFile("docs/qa-test-report.md", renderMarkdownReport(report));
  console.log(`QA report written: docs/qa-test-report.md`);
  console.log(`Summary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.blocked} blocked, ${report.summary.warned} warnings`);
}

function renderMarkdownReport(data) {
  const rows = data.checks.map((check) => `| ${escapeMd(check.status)} | ${escapeMd(check.id)} | ${escapeMd(check.message)} |`).join("\n");
  return `# QA Full Test Report

Generated: ${data.generatedAt}

## Summary

- Passed: ${data.summary.passed}
- Failed: ${data.summary.failed}
- Blocked: ${data.summary.blocked}
- Warnings: ${data.summary.warned}

## Environment

- APP_BASE: \`${data.config.appBase}\`
- API_BASE: \`${data.config.apiBase}\`
- DATABASE_URL: ${data.config.hasDatabaseUrl ? "set" : "missing"}
- QA admin username: \`${data.credentials.username}\`
- QA admin password: \`${data.credentials.password}\`

## Seeded Data

\`\`\`json
${JSON.stringify(data.seeded, null, 2)}
\`\`\`

## Checks

| Status | Check | Result |
| --- | --- | --- |
${rows}
`;
}

function escapeMd(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function trimSlash(value) {
  return value.replace(/\/+$/, "");
}
