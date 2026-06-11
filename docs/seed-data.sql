-- ============================================================
-- SATARA DASHBOARD - SEED DATA LENGKAP
-- 5 Proyek + Data Semua Menu & Sub-Menu
-- Jalankan: psql $DATABASE_URL -f seed-data.sql
-- ============================================================

-- Bersihkan data lama (urutan terbalik FK)
TRUNCATE TABLE
  payment_approvals, subkon_payments, subkon_contracts,
  prod_material_out, prod_material_in, prod_material_master,
  reworks, unit_qc, qc_defects, construction_tasks,
  fasum_progress, handovers,
  akad_records, ht_records, sp3k_records, ots_records, bank_submissions,
  customer_complaints, customer_status_history, customer_documents,
  monthly_targets,
  marketing_absorption, leads, campaigns, competitors,
  branding_kpi, branding_trust_score_records, branding_sentiment_records,
  branding_pr_activities, branding_project_scores, branding_content_roi,
  branding_content_performance, branding_content_status_history,
  branding_content_items, branding_social_media_kpi,
  branding_media_exposures, branding_founder_records, branding_corporate_records,
  legal_issue_history, legal_issues, legal_documents,
  permit_status_history, permit_documents,
  land_legal_checklist, land_stages, shm_split_records,
  planning_competitors, planning_market,
  planning_sdm, planning_product, planning_land,
  planning_feasibility, planning_cashflow, planning_milestones,
  finance_expansion_analyses, finance_alerts, finance_audit_findings,
  finance_receivable_records, finance_debt_records,
  finance_kpp_payments, finance_kpp_facilities,
  finance_rab_items, finance_cashflow_records, finance_uploads,
  hr_flight_risk_records, hr_succession_plans, hr_workload_records,
  hr_culture_records, hr_compensation_records,
  hr_training_participants, hr_training_programs,
  hr_competency_scores, hr_competency_definitions,
  hr_kpi_records, hr_kpi_definitions,
  hr_recruitment_candidates, hr_recruitment_needs,
  hr_individual_issues, hr_overtime_records, hr_attendance_records,
  hr_productivity_records, hr_career_paths, hr_expansion_needs,
  materials, units, customers,
  projects
CASCADE;

-- Reset sequences
SELECT setval('projects_id_seq', 1, false);
SELECT setval('units_id_seq', 1, false);
SELECT setval('customers_id_seq', 1, false);
SELECT setval('leads_id_seq', 1, false);
SELECT setval('materials_id_seq', 1, false);
SELECT setval('subkon_contracts_id_seq', 1, false);
SELECT setval('subkon_payments_id_seq', 1, false);
SELECT setval('hr_employees_id_seq', 1, false);


-- ==============================================================
-- 1. PROJECTS
-- ==============================================================
INSERT INTO projects (id, nama, lokasi, provinsi, kabupaten, kecamatan, desa, luas, total_unit, fase, status, target_start, target_end, lat, lng) VALUES
(1, 'Satara Residence Gowa',  'Jl. Poros Malino KM 12, Sungguminasa', 'Sulawesi Selatan', 'Gowa',     'Somba Opu',    'Sungguminasa',  8500,  60, 'KONSTRUKSI',  'active', '2023-01-15', '2025-06-30', -5.1970, 119.4571),
(2, 'Satara Hills Maros',     'Jl. Poros Makassar-Maros KM 25',       'Sulawesi Selatan', 'Maros',    'Mandai',       'Hasanuddin',    6200,  50, 'MARKETING',   'active', '2023-06-01', '2025-12-31', -4.9934, 119.5711),
(3, 'Satara Garden Takalar',  'Jl. Poros Takalar KM 30',               'Sulawesi Selatan', 'Takalar',  'Polombangkeng', 'Palleko',      10200, 80, 'KONSTRUKSI',  'active', '2022-09-01', '2024-12-31', -5.4303, 119.3973),
(4, 'Satara City Makassar',   'Jl. Antang Raya No. 55',                'Sulawesi Selatan', 'Makassar', 'Manggala',     'Antang',        4800,  40, 'LAND',        'active', '2024-03-01', '2026-09-30', -5.1477, 119.4530),
(5, 'Satara Park Bone',       'Jl. Trans Sulawesi KM 174',             'Sulawesi Selatan', 'Bone',     'Tanete Riattang', 'Macege',      7600,  70, 'SERAH_TERIMA','active', '2021-06-01', '2024-03-31', -4.5388, 120.3235);


-- ==============================================================
-- 2. UNITS (10 per proyek = 50 total)
-- ==============================================================
-- Proyek 1 - Satara Residence Gowa (unit 1-10)
INSERT INTO units (id, project_id, blok, nomor, tipe, harga, status, progress, ready_akad, stage_code, kavling_number, admin_status, ht_value, week_started, subkon_name) VALUES
(1,  1, 'A', '01', 'Tipe 36/72',  285000000, 'booked',    85, true,  'T1', 'A-01', 'akad',    285000000, 4,  'CV Bangun Jaya'),
(2,  1, 'A', '02', 'Tipe 36/72',  285000000, 'booked',    78, false, 'T1', 'A-02', 'berkas',  285000000, 4,  'CV Bangun Jaya'),
(3,  1, 'A', '03', 'Tipe 45/90',  345000000, 'sold',      100,true,  'T1', 'A-03', 'ht',      345000000, 3,  'CV Bangun Jaya'),
(4,  1, 'B', '01', 'Tipe 36/72',  285000000, 'available', 55, false, 'T2', 'B-01', 'stock',   NULL,      6,  'CV Mitra Konstruksi'),
(5,  1, 'B', '02', 'Tipe 45/90',  345000000, 'booked',    60, false, 'T2', 'B-02', 'sp3k',    NULL,      6,  'CV Mitra Konstruksi'),
(6,  1, 'B', '03', 'Tipe 36/72',  285000000, 'available', 40, false, 'T2', 'B-03', 'stock',   NULL,      7,  'CV Mitra Konstruksi'),
(7,  1, 'C', '01', 'Tipe 54/108', 420000000, 'sold',      100,true,  'T1', 'C-01', 'serah_terima', 420000000, 2, 'CV Bangun Jaya'),
(8,  1, 'C', '02', 'Tipe 54/108', 420000000, 'booked',    90, true,  'T1', 'C-02', 'akad',    420000000, 2,  'CV Bangun Jaya'),
(9,  1, 'C', '03', 'Tipe 36/72',  285000000, 'available', 30, false, 'T2', 'C-03', 'stock',   NULL,      8,  'CV Mitra Konstruksi'),
(10, 1, 'D', '01', 'Tipe 45/90',  345000000, 'available', 25, false, 'T2', 'D-01', 'stock',   NULL,      8,  'CV Mitra Konstruksi'),

-- Proyek 2 - Satara Hills Maros (unit 11-20)
(11, 2, 'A', '01', 'Tipe 36/72',  260000000, 'booked',    15, false, 'T1', 'A-01', 'berkas',  NULL,      10, 'CV Graha Utama'),
(12, 2, 'A', '02', 'Tipe 36/72',  260000000, 'booked',    10, false, 'T1', 'A-02', 'sp3k',    NULL,      10, 'CV Graha Utama'),
(13, 2, 'A', '03', 'Tipe 45/90',  320000000, 'available', 0,  false, 'T1', 'A-03', 'stock',   NULL,      NULL, NULL),
(14, 2, 'B', '01', 'Tipe 36/72',  260000000, 'booked',    5,  false, 'T1', 'B-01', 'ots',     NULL,      11, 'CV Graha Utama'),
(15, 2, 'B', '02', 'Tipe 45/90',  320000000, 'available', 0,  false, 'T1', 'B-02', 'stock',   NULL,      NULL, NULL),
(16, 2, 'B', '03', 'Tipe 36/72',  260000000, 'booked',    8,  false, 'T1', 'B-03', 'berkas',  NULL,      11, 'CV Graha Utama'),
(17, 2, 'C', '01', 'Tipe 54/108', 395000000, 'available', 0,  false, 'T1', 'C-01', 'stock',   NULL,      NULL, NULL),
(18, 2, 'C', '02', 'Tipe 36/72',  260000000, 'available', 0,  false, 'T1', 'C-02', 'stock',   NULL,      NULL, NULL),
(19, 2, 'C', '03', 'Tipe 45/90',  320000000, 'booked',    12, false, 'T1', 'C-03', 'bi_checking', NULL,  12, 'CV Graha Utama'),
(20, 2, 'D', '01', 'Tipe 36/72',  260000000, 'available', 0,  false, 'T1', 'D-01', 'stock',   NULL,      NULL, NULL),

-- Proyek 3 - Satara Garden Takalar (unit 21-30)
(21, 3, 'A', '01', 'Tipe 36/72',  270000000, 'sold',      100,true,  'T1', 'A-01', 'serah_terima', 270000000, 1, 'PT Bangun Prima'),
(22, 3, 'A', '02', 'Tipe 36/72',  270000000, 'sold',      100,true,  'T1', 'A-02', 'serah_terima', 270000000, 1, 'PT Bangun Prima'),
(23, 3, 'A', '03', 'Tipe 45/90',  335000000, 'booked',    95, true,  'T1', 'A-03', 'akad',    335000000, 2,  'PT Bangun Prima'),
(24, 3, 'B', '01', 'Tipe 36/72',  270000000, 'booked',    88, false, 'T1', 'B-01', 'berkas',  270000000, 2,  'PT Bangun Prima'),
(25, 3, 'B', '02', 'Tipe 45/90',  335000000, 'booked',    75, false, 'T2', 'B-02', 'sp3k',    NULL,      5,  'CV Karya Mandiri'),
(26, 3, 'B', '03', 'Tipe 36/72',  270000000, 'available', 60, false, 'T2', 'B-03', 'stock',   NULL,      5,  'CV Karya Mandiri'),
(27, 3, 'C', '01', 'Tipe 54/108', 410000000, 'booked',    70, false, 'T2', 'C-01', 'ots',     NULL,      5,  'CV Karya Mandiri'),
(28, 3, 'C', '02', 'Tipe 36/72',  270000000, 'available', 50, false, 'T2', 'C-02', 'stock',   NULL,      6,  'CV Karya Mandiri'),
(29, 3, 'D', '01', 'Tipe 45/90',  335000000, 'available', 35, false, 'T2', 'D-01', 'stock',   NULL,      7,  'CV Karya Mandiri'),
(30, 3, 'D', '02', 'Tipe 36/72',  270000000, 'available', 20, false, 'T2', 'D-02', 'stock',   NULL,      8,  'CV Karya Mandiri'),

-- Proyek 4 - Satara City Makassar (unit 31-40)
(31, 4, 'A', '01', 'Tipe 36/72',  310000000, 'available', 0,  false, 'T1', 'A-01', 'stock',   NULL,      NULL, NULL),
(32, 4, 'A', '02', 'Tipe 45/90',  380000000, 'available', 0,  false, 'T1', 'A-02', 'stock',   NULL,      NULL, NULL),
(33, 4, 'A', '03', 'Tipe 36/72',  310000000, 'available', 0,  false, 'T1', 'A-03', 'stock',   NULL,      NULL, NULL),
(34, 4, 'B', '01', 'Tipe 36/72',  310000000, 'available', 0,  false, 'T1', 'B-01', 'stock',   NULL,      NULL, NULL),
(35, 4, 'B', '02', 'Tipe 45/90',  380000000, 'available', 0,  false, 'T1', 'B-02', 'stock',   NULL,      NULL, NULL),
(36, 4, 'B', '03', 'Tipe 54/108', 460000000, 'available', 0,  false, 'T1', 'B-03', 'stock',   NULL,      NULL, NULL),
(37, 4, 'C', '01', 'Tipe 36/72',  310000000, 'available', 0,  false, 'T1', 'C-01', 'stock',   NULL,      NULL, NULL),
(38, 4, 'C', '02', 'Tipe 36/72',  310000000, 'available', 0,  false, 'T1', 'C-02', 'stock',   NULL,      NULL, NULL),
(39, 4, 'D', '01', 'Tipe 45/90',  380000000, 'available', 0,  false, 'T1', 'D-01', 'stock',   NULL,      NULL, NULL),
(40, 4, 'D', '02', 'Tipe 36/72',  310000000, 'available', 0,  false, 'T1', 'D-02', 'stock',   NULL,      NULL, NULL),

-- Proyek 5 - Satara Park Bone (unit 41-50)
(41, 5, 'A', '01', 'Tipe 36/72',  255000000, 'sold',      100, true,  'T1', 'A-01', 'serah_terima', 255000000, 1, 'CV Bone Konstruksi'),
(42, 5, 'A', '02', 'Tipe 36/72',  255000000, 'sold',      100, true,  'T1', 'A-02', 'serah_terima', 255000000, 1, 'CV Bone Konstruksi'),
(43, 5, 'A', '03', 'Tipe 45/90',  315000000, 'sold',      100, true,  'T1', 'A-03', 'serah_terima', 315000000, 1, 'CV Bone Konstruksi'),
(44, 5, 'B', '01', 'Tipe 36/72',  255000000, 'sold',      100, true,  'T1', 'B-01', 'serah_terima', 255000000, 2, 'CV Bone Konstruksi'),
(45, 5, 'B', '02', 'Tipe 36/72',  255000000, 'booked',    100, true,  'T1', 'B-02', 'akad',    255000000, 2,  'CV Bone Konstruksi'),
(46, 5, 'B', '03', 'Tipe 45/90',  315000000, 'booked',    100, true,  'T1', 'B-03', 'akad',    315000000, 2,  'CV Bone Konstruksi'),
(47, 5, 'C', '01', 'Tipe 54/108', 385000000, 'booked',    98,  true,  'T1', 'C-01', 'ht',      385000000, 3,  'CV Bone Konstruksi'),
(48, 5, 'C', '02', 'Tipe 36/72',  255000000, 'sold',      100, true,  'T1', 'C-02', 'serah_terima', 255000000, 3, 'CV Bone Konstruksi'),
(49, 5, 'D', '01', 'Tipe 45/90',  315000000, 'available', 85,  false, 'T2', 'D-01', 'stock',   NULL,      8,   'CV Karya Bone'),
(50, 5, 'D', '02', 'Tipe 36/72',  255000000, 'available', 70,  false, 'T2', 'D-02', 'stock',   NULL,      9,   'CV Karya Bone');


-- ==============================================================
-- 3. CUSTOMERS (6 per proyek = 30 total)
-- ==============================================================
INSERT INTO customers (id, project_id, unit_id, nama, nik, kontak, pekerjaan, bank, status_kpr, berkas_lengkap, catatan, stage_code, unit_block, referral_source, pic_admin, phone, dp_amount, loan_amount, ht_amount, unit_price, booking_date, akad_date, ht_date, pipeline_status, payment_type) VALUES
-- Proyek 1 Gowa
(1,  1, 1,  'Budi Hartono',       '7310011234560001', '08111234001', 'PNS',             'BTN',     'sp3k_disetujui', true,  'Siap akad bulan ini',    'T1', 'A-01', 'referral',  'Putri', '08111234001', 28500000,  256500000, 285000000, 285000000, '2024-01-10', '2024-03-05', NULL,         'AKAD',    'KPR'),
(2,  1, 2,  'Sari Dewi',          '7310011234560002', '08111234002', 'Swasta',           'BRI',     'diajukan',       false, 'Berkas masuk minggu ini','T1', 'A-02', 'sosmed',    'Putri', '08111234002', 28500000,  256500000, NULL,      285000000, '2024-01-20', NULL,         NULL,         'BERKAS',  'KPR'),
(3,  1, 7,  'Hendra Gunawan',     '7310011234560003', '08111234003', 'Wiraswasta',       'BNI',     'akad',           true,  'Sudah akad',             'T1', 'C-01', 'pameran',   'Putri', '08111234003', 42000000,  378000000, 420000000, 420000000, '2023-10-05', '2024-02-10', '2024-04-10', 'HT',      'KPR'),
(4,  1, 8,  'Aminah Putri',       '7310011234560004', '08111234004', 'TNI/Polri',        'BRI',     'diajukan',       true,  'Proses OTS bank',        'T1', 'C-02', 'referral',  'Putri', '08111234004', 42000000,  378000000, NULL,      420000000, '2024-02-01', NULL,         NULL,         'OTS',     'KPR'),
(5,  1, 5,  'Rudi Santoso',       '7310011234560005', '08111234005', 'Guru',             'BTN',     'bi_checking',    false, 'Menunggu hasil BI check','T2', 'B-02', 'agen',      'Mega',  '08111234005', 34500000,  310500000, NULL,      345000000, '2024-03-01', NULL,         NULL,         'BERKAS',  'KPR'),
(6,  1, 3,  'Indah Ramadhani',    '7310011234560006', '08111234006', 'Dokter',           'Mandiri', 'akad',           true,  'Sudah HT',               'T1', 'A-03', 'website',   'Putri', '08111234006', 34500000,  310500000, 345000000, 345000000, '2023-08-15', '2023-12-20', '2024-02-15', 'SELESAI', 'KPR'),

-- Proyek 2 Maros
(7,  2, 11, 'Fandi Ahmad',        '7308021234560001', '08122234001', 'PNS',             'BTN',     'diajukan',       false, 'Berkas masuk',           'T1', 'A-01', 'referral',  'Mega',  '08122234001', 26000000,  234000000, NULL,      260000000, '2024-02-10', NULL,         NULL,         'BERKAS',  'KPR'),
(8,  2, 12, 'Yuliana Sari',       '7308021234560002', '08122234002', 'Karyawan Swasta',  'BRI',     'bi_checking',    false, 'Proses BI check',        'T1', 'A-02', 'pameran',   'Mega',  '08122234002', 26000000,  234000000, NULL,      260000000, '2024-02-15', NULL,         NULL,         'BERKAS',  'KPR'),
(9,  2, 14, 'Muh. Yusuf',         '7308021234560003', '08122234003', 'Sopir',            'BTN',     'ots',            false, 'Menunggu OTS',           'T1', 'B-01', 'sosmed',    'Mega',  '08122234003', 26000000,  234000000, NULL,      260000000, '2024-03-01', NULL,         NULL,         'OTS',     'KPR'),
(10, 2, 16, 'Nuraeni Bakri',      '7308021234560004', '08122234004', 'Pedagang',         'BNI',     'bi_checking',    false, 'Menunggu BI check',      'T1', 'B-03', 'agen',      'Mega',  '08122234004', 26000000,  234000000, NULL,      260000000, '2024-03-05', NULL,         NULL,         'BERKAS',  'KPR'),
(11, 2, 19, 'Syahril Ramadan',    '7308021234560005', '08122234005', 'Petani',           'BTN',     'bi_checking',    false, 'Verifikasi berkas',      'T1', 'C-03', 'referral',  'Mega',  '08122234005', 32000000,  288000000, NULL,      320000000, '2024-03-10', NULL,         NULL,         'BERKAS',  'KPR'),
(12, 2, 11, 'Rina Haslinda',      '7308021234560006', '08122234006', 'Bidan',            'BRI',     'diajukan',       true,  'Sudah kirim ke bank',    'T1', 'A-01', 'website',   'Mega',  '08122234006', 26000000,  234000000, NULL,      260000000, '2024-03-12', NULL,         NULL,         'BERKAS',  'KPR'),

-- Proyek 3 Takalar
(13, 3, 21, 'Supardi Hasan',      '7304021234560001', '08133234001', 'PNS',             'BTN',     'akad',           true,  'Sudah serah terima',     'T1', 'A-01', 'referral',  'Siti',  '08133234001', 27000000,  243000000, 270000000, 270000000, '2022-10-01', '2023-04-10', '2023-06-15', 'SELESAI', 'KPR'),
(14, 3, 22, 'Hasna Wati',         '7304021234560002', '08133234002', 'Guru',             'BNI',     'akad',           true,  'Sudah serah terima',     'T1', 'A-02', 'pameran',   'Siti',  '08133234002', 27000000,  243000000, 270000000, 270000000, '2022-10-05', '2023-04-15', '2023-06-20', 'SELESAI', 'KPR'),
(15, 3, 23, 'Kamaluddin',         '7304021234560003', '08133234003', 'TNI/Polri',        'BRI',     'akad',           true,  'Proses HT',              'T1', 'A-03', 'sosmed',    'Siti',  '08133234003', 33500000,  301500000, NULL,      335000000, '2022-11-10', '2023-05-20', NULL,         'AKAD',    'KPR'),
(16, 3, 24, 'Sunarti Dg Ngalli',  '7304021234560004', '08133234004', 'Wiraswasta',       'BTN',     'sp3k_disetujui', true,  'Siap akad',              'T1', 'B-01', 'agen',      'Siti',  '08133234004', 27000000,  243000000, NULL,      270000000, '2023-02-01', NULL,         NULL,         'BERKAS',  'KPR'),
(17, 3, 25, 'Jumadin Lallo',      '7304021234560005', '08133234005', 'Petani',           'BNI',     'diajukan',       false, 'Berkas masuk',           'T2', 'B-02', 'referral',  'Siti',  '08133234005', 33500000,  301500000, NULL,      335000000, '2023-05-10', NULL,         NULL,         'BERKAS',  'KPR'),
(18, 3, 27, 'Rahayu Sinar',       '7304021234560006', '08133234006', 'Bidan',            'BTN',     'ots',            false, 'OTS dijadwalkan',        'T2', 'C-01', 'website',   'Siti',  '08133234006', 41000000,  369000000, NULL,      410000000, '2023-07-01', NULL,         NULL,         'OTS',     'KPR'),

-- Proyek 4 Makassar (masih fase LAND, customer booking awal)
(19, 4, 31, 'Zulkifli Dg Tiro',   '7371011234560001', '08144234001', 'Pengusaha',        'Mandiri', 'bi_checking',    false, 'Pre-booking',            'T1', 'A-01', 'pameran',   'Mega',  '08144234001', 31000000,  279000000, NULL,      310000000, '2024-05-01', NULL,         NULL,         'MINAT',   'KPR'),
(20, 4, 32, 'Marwah Binti Ahmad', '7371011234560002', '08144234002', 'Notaris',          'BCA',     'bi_checking',    false, 'Calon pembeli potensial','T1', 'A-02', 'referral',  'Mega',  '08144234002', 38000000,  342000000, NULL,      380000000, '2024-05-05', NULL,         NULL,         'MINAT',   'CASH_KERAS'),
(21, 4, 33, 'Burhanuddin Asis',   '7371011234560003', '08144234003', 'Dokter',           'BNI',     'bi_checking',    false, 'Inden awal',             'T1', 'A-03', 'sosmed',    'Mega',  '08144234003', 31000000,  279000000, NULL,      310000000, '2024-05-10', NULL,         NULL,         'MINAT',   'KPR'),
(22, 4, 34, 'Nurlaili Fitri',     '7371011234560004', '08144234004', 'PNS',              'BTN',     'bi_checking',    false, 'Minat beli',             'T1', 'B-01', 'website',   'Mega',  '08144234004', 31000000,  279000000, NULL,      310000000, '2024-05-12', NULL,         NULL,         'MINAT',   'KPR'),
(23, 4, 35, 'Hasnah Mappasatu',   '7371011234560005', '08144234005', 'Karyawan Swasta',  'BRI',     'bi_checking',    false, 'Prospek aktif',          'T1', 'B-02', 'agen',      'Mega',  '08144234005', 38000000,  342000000, NULL,      380000000, '2024-05-15', NULL,         NULL,         'MINAT',   'KPR'),
(24, 4, 36, 'Ruslan Dg Limpo',    '7371011234560006', '08144234006', 'Petani',           'BTN',     'bi_checking',    false, 'Pre-booking FLPP',       'T1', 'B-03', 'pameran',   'Mega',  '08144234006', 46000000,  414000000, NULL,      460000000, '2024-05-20', NULL,         NULL,         'MINAT',   'KPR'),

-- Proyek 5 Bone (sudah serah terima)
(25, 5, 41, 'La Ode Rahman',      '7415011234560001', '08155234001', 'PNS',             'BTN',     'akad',           true,  'Sudah serah terima',     'T1', 'A-01', 'referral',  'Rina',  '08155234001', 25500000,  229500000, 255000000, 255000000, '2021-07-01', '2022-01-15', '2022-03-10', 'SELESAI', 'KPR'),
(26, 5, 42, 'Sitti Rabiah',       '7415011234560002', '08155234002', 'Guru',             'BRI',     'akad',           true,  'Sudah serah terima',     'T1', 'A-02', 'sosmed',    'Rina',  '08155234002', 25500000,  229500000, 255000000, 255000000, '2021-07-05', '2022-01-20', '2022-03-15', 'SELESAI', 'KPR'),
(27, 5, 43, 'Baharuddin Petta',   '7415011234560003', '08155234003', 'Petani',           'BTN',     'akad',           true,  'Sudah serah terima',     'T1', 'A-03', 'pameran',   'Rina',  '08155234003', 31500000,  283500000, 315000000, 315000000, '2021-07-10', '2022-02-01', '2022-04-01', 'SELESAI', 'KPR'),
(28, 5, 44, 'Hasmah Binti Hasan', '7415011234560004', '08155234004', 'Pedagang',         'BNI',     'akad',           true,  'Sudah serah terima',     'T1', 'B-01', 'agen',      'Rina',  '08155234004', 25500000,  229500000, 255000000, 255000000, '2021-08-01', '2022-02-10', '2022-04-10', 'SELESAI', 'KPR'),
(29, 5, 45, 'Muh. Darwis Hasan',  '7415011234560005', '08155234005', 'Nelayan',          'BTN',     'akad',           true,  'Proses HT',              'T1', 'B-02', 'referral',  'Rina',  '08155234005', 25500000,  229500000, NULL,      255000000, '2021-08-05', '2022-02-15', NULL,         'AKAD',    'KPR'),
(30, 5, 47, 'Hadriani Dg Pati',   '7415011234560006', '08155234006', 'Bidan',            'Mandiri', 'akad',           true,  'Proses HT',              'T1', 'C-01', 'website',   'Rina',  '08155234006', 38500000,  346500000, NULL,      385000000, '2021-09-01', '2022-03-01', NULL,         'HT',      'KPR');


-- ==============================================================
-- 4. MONTHLY TARGETS
-- ==============================================================
INSERT INTO monthly_targets (project_id, year, month, target_akad, target_berkas) VALUES
(1, 2024, 1,  3, 5), (1, 2024, 2,  3, 5), (1, 2024, 3,  4, 6), (1, 2024, 4,  4, 6),
(1, 2024, 5,  4, 6), (1, 2024, 6,  4, 6), (1, 2024, 7,  5, 7), (1, 2024, 8,  5, 7),
(2, 2024, 3,  2, 4), (2, 2024, 4,  3, 5), (2, 2024, 5,  3, 5), (2, 2024, 6,  4, 6),
(3, 2023, 1,  3, 5), (3, 2023, 2,  3, 5), (3, 2023, 3,  4, 6), (3, 2023, 6,  4, 6),
(5, 2022, 1,  5, 7), (5, 2022, 2,  5, 7), (5, 2022, 3,  5, 7), (5, 2022, 4,  4, 6);


-- ==============================================================
-- 5. SUBKON CONTRACTS & PAYMENTS
-- ==============================================================
INSERT INTO subkon_contracts (id, project_id, stage_code, subkon_name, unit_count, value_per_unit, contract_value, retention_per_unit, total_retention, net_payable_value, maintenance_months, start_date, target_end_date, actual_completion_date, retention_release_date, retention_status, status) VALUES
(1,  1, 'T1', 'CV Bangun Jaya',       8,  18000000, 144000000, 500000, 4000000, 140000000, 3, '2023-03-01', '2023-12-31', '2023-12-15', '2024-03-15', 'dilepas',  'selesai'),
(2,  1, 'T2', 'CV Mitra Konstruksi',  5,  17500000, 87500000,  500000, 2500000, 85000000,  3, '2024-01-15', '2024-09-30', NULL,          NULL,          'ditahan',  'aktif'),
(3,  2, 'T1', 'CV Graha Utama',       6,  17000000, 102000000, 500000, 3000000, 99000000,  3, '2024-01-01', '2024-10-31', NULL,          NULL,          'ditahan',  'aktif'),
(4,  3, 'T1', 'PT Bangun Prima',      8,  18500000, 148000000, 500000, 4000000, 144000000, 3, '2022-10-01', '2023-07-31', '2023-07-20', '2023-10-20', 'dilepas',  'selesai'),
(5,  3, 'T2', 'CV Karya Mandiri',     5,  17000000, 85000000,  500000, 2500000, 82500000,  3, '2023-08-01', '2024-05-31', NULL,          NULL,          'ditahan',  'aktif'),
(6,  5, 'T1', 'CV Bone Konstruksi',   8,  16500000, 132000000, 500000, 4000000, 128000000, 6, '2021-07-01', '2022-06-30', '2022-06-25', '2022-12-25', 'dilepas',  'selesai'),
(7,  5, 'T2', 'CV Karya Bone',        2,  16000000, 32000000,  500000, 1000000, 31000000,  3, '2023-06-01', '2024-03-31', NULL,          NULL,          'ditahan',  'aktif');

INSERT INTO subkon_payments (contract_id, payment_type, termin_number, payment_date, period, progress_previous, progress_current, velocity, gross_eligible_amount, retention_deducted, net_payment, total_paid_before, status, notes) VALUES
(1, 'termin', 1, '2023-06-10', '2023-05', 0,    30, 30, 43200000,  1200000, 42000000, 0,         'dibayar',  'Termin 1 - 30%'),
(1, 'termin', 2, '2023-09-15', '2023-08', 30,   60, 30, 43200000,  1200000, 42000000, 42000000,  'dibayar',  'Termin 2 - 60%'),
(1, 'termin', 3, '2023-12-20', '2023-11', 60,   95, 35, 50400000,  1400000, 49000000, 84000000,  'dibayar',  'Termin 3 - 95%'),
(1, 'retensi',NULL,'2024-03-20','2024-03', 95,  100, 5,  7200000,   0,       4000000,  175000000, 'dibayar',  'Pelepasan retensi'),
(2, 'termin', 1, '2024-04-10', '2024-03', 0,    25, 25, 21875000,  625000,  21250000, 0,         'dibayar',  'Termin 1 - 25%'),
(2, 'termin', 2, NULL,          '2024-06', 25,   50, 25, 21875000,  625000,  21250000, 21250000,  'draft',    'Termin 2 menunggu approval'),
(3, 'termin', 1, '2024-04-25', '2024-03', 0,    20, 20, 20400000,  600000,  19800000, 0,         'dibayar',  'Termin 1 awal'),
(4, 'termin', 1, '2023-01-15', '2022-12', 0,    30, 30, 44400000,  1200000, 43200000, 0,         'dibayar',  'Termin 1'),
(4, 'termin', 2, '2023-04-20', '2023-03', 30,   65, 35, 51800000,  1400000, 50400000, 43200000,  'dibayar',  'Termin 2'),
(4, 'termin', 3, '2023-07-25', '2023-06', 65,   95, 30, 44400000,  1200000, 43200000, 93600000,  'dibayar',  'Termin 3'),
(4, 'retensi',NULL,'2023-10-25','2023-10', 95,  100, 5,  4000000,   0,       4000000,  136800000, 'dibayar',  'Retensi dilepas'),
(5, 'termin', 1, '2024-01-10', '2023-12', 0,    30, 30, 25500000,  750000,  24750000, 0,         'dibayar',  'Termin 1'),
(6, 'termin', 1, '2021-10-01', '2021-09', 0,    30, 30, 39600000,  1200000, 38400000, 0,         'dibayar',  'Termin 1'),
(6, 'termin', 2, '2022-01-15', '2021-12', 30,   65, 35, 46200000,  1400000, 44800000, 38400000,  'dibayar',  'Termin 2'),
(6, 'termin', 3, '2022-05-01', '2022-04', 65,  100, 35, 46200000,  1400000, 44800000, 83200000,  'dibayar',  'Final'),
(6, 'retensi',NULL,'2022-12-30','2022-12',100,  100, 0,  4000000,   0,       4000000,  128000000, 'dibayar',  'Retensi selesai');

INSERT INTO payment_approvals (payment_id, step, approved_by, approved_at, status, notes) VALUES
(6, 'site_manager',  'Reza Pratama', '2024-06-28 09:00:00+08', 'approved', 'Konfirmasi progress 50%'),
(6, 'finance',       NULL,           NULL,                      'pending',  'Menunggu verifikasi finance');


-- ==============================================================
-- 6. CONSTRUCTION TASKS
-- ==============================================================
INSERT INTO construction_tasks (unit_id, item, bobot, status, tanggal_mulai, tanggal_selesai, catatan, verified_by) VALUES
-- Unit 1 (progress 85%)
(1, 'Pondasi',       0.15, 'selesai',   '2024-01-20', '2024-02-05', NULL, 'Agus Pramono'),
(1, 'Sloof',         0.10, 'selesai',   '2024-02-06', '2024-02-15', NULL, 'Agus Pramono'),
(1, 'Dinding',       0.20, 'selesai',   '2024-02-16', '2024-03-20', NULL, 'Agus Pramono'),
(1, 'Plester',       0.10, 'selesai',   '2024-03-21', '2024-04-10', NULL, 'Agus Pramono'),
(1, 'Atap',          0.15, 'selesai',   '2024-03-10', '2024-04-05', NULL, 'Agus Pramono'),
(1, 'Kusen Pintu Jendela', 0.08, 'selesai', '2024-04-06', '2024-04-20', NULL, 'Agus Pramono'),
(1, 'Lantai Keramik',0.10, 'sedang',    '2024-04-21', NULL,         'Proses pemasangan', NULL),
(1, 'Sanitasi',      0.07, 'belum_mulai',NULL,         NULL,         NULL, NULL),
(1, 'Cat',           0.05, 'belum_mulai',NULL,         NULL,         NULL, NULL),

-- Unit 3 (100% sold)
(3, 'Pondasi',       0.15, 'selesai',   '2023-08-01', '2023-08-15', NULL, 'Agus Pramono'),
(3, 'Sloof',         0.10, 'selesai',   '2023-08-16', '2023-08-25', NULL, 'Agus Pramono'),
(3, 'Dinding',       0.20, 'selesai',   '2023-08-26', '2023-09-30', NULL, 'Agus Pramono'),
(3, 'Plester',       0.10, 'selesai',   '2023-10-01', '2023-10-15', NULL, 'Agus Pramono'),
(3, 'Atap',          0.15, 'selesai',   '2023-09-25', '2023-10-20', NULL, 'Agus Pramono'),
(3, 'Kusen Pintu Jendela', 0.08, 'selesai', '2023-10-21', '2023-11-01', NULL, 'Agus Pramono'),
(3, 'Lantai Keramik',0.10, 'selesai',   '2023-11-02', '2023-11-15', NULL, 'Agus Pramono'),
(3, 'Sanitasi',      0.07, 'selesai',   '2023-11-16', '2023-11-25', NULL, 'Agus Pramono'),
(3, 'Cat',           0.05, 'selesai',   '2023-11-26', '2023-12-05', NULL, 'Agus Pramono'),

-- Unit 21 (100% Takalar)
(21, 'Pondasi',       0.15, 'selesai',  '2022-10-05', '2022-10-20', NULL, 'Teguh Santoso'),
(21, 'Sloof',         0.10, 'selesai',  '2022-10-21', '2022-10-30', NULL, 'Teguh Santoso'),
(21, 'Dinding',       0.20, 'selesai',  '2022-11-01', '2022-12-10', NULL, 'Teguh Santoso'),
(21, 'Atap',          0.15, 'selesai',  '2022-11-25', '2022-12-20', NULL, 'Teguh Santoso'),
(21, 'Lantai Keramik',0.10, 'selesai',  '2022-12-21', '2023-01-10', NULL, 'Teguh Santoso'),
(21, 'Cat',           0.05, 'selesai',  '2023-01-11', '2023-01-25', NULL, 'Teguh Santoso'),

-- Unit 41 Bone (100%)
(41, 'Pondasi',       0.15, 'selesai',  '2021-07-10', '2021-07-25', NULL, 'Rizki Firmansyah'),
(41, 'Dinding',       0.20, 'selesai',  '2021-07-26', '2021-09-10', NULL, 'Rizki Firmansyah'),
(41, 'Atap',          0.15, 'selesai',  '2021-09-01', '2021-09-20', NULL, 'Rizki Firmansyah'),
(41, 'Lantai Keramik',0.10, 'selesai',  '2021-09-21', '2021-10-05', NULL, 'Rizki Firmansyah'),
(41, 'Cat',           0.05, 'selesai',  '2021-10-06', '2021-10-15', NULL, 'Rizki Firmansyah');


-- ==============================================================
-- 7. QC DEFECTS & REWORKS & UNIT QC
-- ==============================================================
INSERT INTO qc_defects (unit_id, kategori, deskripsi, status, verified_by) VALUES
(2,  'Dinding', 'Retak rambut sudut dinding kamar tidur',        'open',   NULL),
(2,  'Sanitasi','Pipa wastafel bocor di bawah sink',              'in_progress', 'Agus Pramono'),
(4,  'Atap',    'Genteng geser di bagian belakang',               'open',   NULL),
(5,  'Lantai',  'Keramik tidak rata, beda tinggi 3mm',            'open',   NULL),
(8,  'Dinding', 'Cat mengelupas area dekat jendela kamar mandi',  'closed', 'Agus Pramono'),
(23, 'Pondasi', 'Crack kecil di sloof belakang',                  'closed', 'Teguh Santoso'),
(25, 'Atap',    'Talang air tersumbat material sisa',              'open',   NULL),
(27, 'Sanitasi','Tekanan air kurang di lantai atas',              'in_progress', 'Agus Pramono'),
(45, 'Dinding', 'Retak di area sambungan kolom-balok',            'closed', 'Rizki Firmansyah'),
(47, 'Lantai',  'Keramik KM pecah saat pemasangan, diganti',      'closed', 'Rizki Firmansyah');

INSERT INTO unit_qc (unit_id, qc_item, is_pass, notes, inspected_by, inspected_at) VALUES
(3,  'Pondasi & Sloof',        true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Dinding & Plesteran',    true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Atap & Talang',          true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Kusen & Pintu',          true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Lantai Keramik',         true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Sanitasi & Plumbing',    true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Elektrikal',             true,  NULL,                         'Agus Pramono', '2023-12-01'),
(3,  'Cat & Finishing',        true,  NULL,                         'Agus Pramono', '2023-12-01'),
(21, 'Pondasi & Sloof',        true,  NULL,                         'Teguh Santoso', '2023-02-10'),
(21, 'Dinding & Plesteran',    true,  NULL,                         'Teguh Santoso', '2023-02-10'),
(21, 'Atap & Talang',          true,  NULL,                         'Teguh Santoso', '2023-02-10'),
(21, 'Lantai Keramik',         true,  NULL,                         'Teguh Santoso', '2023-02-10'),
(21, 'Sanitasi & Plumbing',    true,  NULL,                         'Teguh Santoso', '2023-02-10'),
(21, 'Cat & Finishing',        true,  NULL,                         'Teguh Santoso', '2023-02-10'),
(41, 'Pondasi & Sloof',        true,  NULL,                         'Rizki Firmansyah', '2021-11-01'),
(41, 'Dinding & Plesteran',    true,  NULL,                         'Rizki Firmansyah', '2021-11-01'),
(41, 'Atap & Talang',          true,  NULL,                         'Rizki Firmansyah', '2021-11-01'),
(41, 'Lantai Keramik',         true,  NULL,                         'Rizki Firmansyah', '2021-11-01'),
(41, 'Cat & Finishing',        true,  NULL,                         'Rizki Firmansyah', '2021-11-01'),
(8,  'Pondasi & Sloof',        true,  NULL,                         'Agus Pramono', '2024-04-01'),
(8,  'Dinding & Plesteran',    false, 'Cat mengelupas sudah diperbaiki', 'Agus Pramono', '2024-04-01'),
(8,  'Atap & Talang',          true,  NULL,                         'Agus Pramono', '2024-04-01');

INSERT INTO reworks (unit_id, contract_id, subkon_name, pekerjaan_item, description, found_date, target_completion, actual_completion, status) VALUES
(2,  2, 'CV Mitra Konstruksi', 'Plesteran',    'Retak rambut di sudut dinding, perlu grouting', '2024-04-15', '2024-05-01', NULL,         'open'),
(4,  2, 'CV Mitra Konstruksi', 'Atap',         'Genteng geser, perlu dirapikan',                '2024-04-20', '2024-05-05', NULL,         'open'),
(8,  1, 'CV Bangun Jaya',      'Finishing Cat','Cat mengelupas, perlu dicat ulang',              '2024-03-10', '2024-03-20', '2024-03-18', 'closed'),
(23, 4, 'PT Bangun Prima',     'Sloof',        'Crack kecil disuntik epoxy',                    '2023-06-01', '2023-06-10', '2023-06-08', 'closed'),
(45, 6, 'CV Bone Konstruksi',  'Dinding',      'Retak sambungan kolom digrouting',              '2022-04-01', '2022-04-10', '2022-04-08', 'closed');


-- ==============================================================
-- 8. FASUM PROGRESS
-- ==============================================================
INSERT INTO fasum_progress (project_id, stage_code, fasum_type, progress_percent, notes, updated_by) VALUES
(1, 'T1', 'Jalan Utama',           100, 'Selesai diaspal',              'Reza Pratama'),
(1, 'T1', 'Drainase',              100, 'Selesai',                      'Reza Pratama'),
(1, 'T1', 'Taman Blok A',          80,  'Proses penanaman pohon',       'Reza Pratama'),
(1, 'T2', 'Jalan Dalam Cluster',   60,  'Proses pengerjaan',            'Dimas Ardianto'),
(1, 'T2', 'Drainase T2',           45,  'Proses galian',                'Dimas Ardianto'),
(2, 'T1', 'Jalan Masuk',           30,  'Proses pengerasan',            'Andi Wijaya'),
(2, 'T1', 'Drainase T1',           20,  'Proses galian parit',          'Andi Wijaya'),
(3, 'T1', 'Jalan Utama',           100, 'Selesai',                      'Teguh Santoso'),
(3, 'T1', 'Drainase',              100, 'Selesai',                      'Teguh Santoso'),
(3, 'T1', 'Gerbang Cluster',       100, 'Selesai',                      'Teguh Santoso'),
(3, 'T2', 'Jalan T2',              55,  'Proses pengaspalan',           'Teguh Santoso'),
(5, 'T1', 'Jalan Utama',           100, 'Selesai',                      'Rizki Firmansyah'),
(5, 'T1', 'Drainase',              100, 'Selesai',                      'Rizki Firmansyah'),
(5, 'T1', 'Taman',                 100, 'Selesai',                      'Rizki Firmansyah'),
(5, 'T1', 'Gerbang',               100, 'Selesai',                      'Rizki Firmansyah');


-- ==============================================================
-- 9. HANDOVERS & AKAD & HT & OTS & SP3K & BANK SUBMISSIONS
-- ==============================================================
INSERT INTO handovers (unit_id, customer_id, tanggal, skor_kepuasan, bast_generated, catatan) VALUES
(7,  3,  '2024-02-20', 4.5, true,  'Pembeli puas, minor issue atap sudah diperbaiki'),
(21, 13, '2023-06-20', 5.0, true,  'Serah terima berjalan lancar'),
(22, 14, '2023-06-25', 4.8, true,  'Puas dengan kualitas'),
(41, 25, '2022-03-15', 4.7, true,  'Tepat waktu'),
(42, 26, '2022-03-20', 4.5, true,  'Proses mudah'),
(43, 27, '2022-04-05', 4.9, true,  'Sangat puas'),
(44, 28, '2022-04-15', 4.6, true,  'Minor keramik sudah diganti');

INSERT INTO akad_records (customer_id, bank, akad_date, akad_number, notary, akad_amount, estimated_ht_date, status, notes) VALUES
(1,  'BTN',     '2024-03-05', 'BTN/AKD/2024/0301', 'Notaris H. Syamsuddin',   256500000, '2024-05-05', 'selesai',    'Akad berjalan lancar'),
(3,  'BNI',     '2024-02-10', 'BNI/AKD/2024/0215', 'Notaris Hj. Aminah',      378000000, '2024-04-10', 'selesai',    NULL),
(6,  'Mandiri', '2023-12-20', 'MDR/AKD/2023/1225', 'Notaris Drs. Mappasatu',  310500000, '2024-02-20', 'selesai',    NULL),
(13, 'BTN',     '2023-04-10', 'BTN/AKD/2023/0415', 'Notaris Hj. Aminah',      243000000, '2023-06-15', 'selesai',    NULL),
(14, 'BNI',     '2023-04-15', 'BNI/AKD/2023/0420', 'Notaris H. Syamsuddin',   243000000, '2023-06-20', 'selesai',    NULL),
(15, 'BRI',     '2023-05-20', 'BRI/AKD/2023/0525', 'Notaris Hj. Rasida',      301500000, NULL,          'terjadwal',  'Proses HT'),
(25, 'BTN',     '2022-01-15', 'BTN/AKD/2022/0120', 'Notaris H. Ambo Asse',    229500000, '2022-03-10', 'selesai',    NULL),
(26, 'BRI',     '2022-01-20', 'BRI/AKD/2022/0125', 'Notaris H. Ambo Asse',    229500000, '2022-03-15', 'selesai',    NULL),
(27, 'BTN',     '2022-02-01', 'BTN/AKD/2022/0205', 'Notaris H. Ambo Asse',    283500000, '2022-04-01', 'selesai',    NULL),
(28, 'BNI',     '2022-02-10', 'BNI/AKD/2022/0215', 'Notaris H. Ambo Asse',    229500000, '2022-04-10', 'selesai',    NULL),
(29, 'BTN',     '2022-02-15', 'BTN/AKD/2022/0220', 'Notaris H. Ambo Asse',    229500000, NULL,          'terjadwal',  'Menunggu balik nama'),
(30, 'Mandiri', '2022-03-01', 'MDR/AKD/2022/0305', 'Notaris H. Ambo Asse',    346500000, NULL,          'terjadwal',  'Proses HT');

INSERT INTO ht_records (customer_id, bank, ht_date, ht_amount, account_number, notes) VALUES
(3,  'BNI',     '2024-04-10', 378000000, '0103456789', NULL),
(6,  'Mandiri', '2024-02-15', 310500000, '1222345678', NULL),
(13, 'BTN',     '2023-06-15', 270000000, '0001234567', NULL),
(14, 'BNI',     '2023-06-20', 270000000, '0109876543', NULL),
(25, 'BTN',     '2022-03-10', 255000000, '0001111222', NULL),
(26, 'BRI',     '2022-03-15', 255000000, '1234567890', NULL),
(27, 'BTN',     '2022-04-01', 315000000, '0001333444', NULL),
(28, 'BNI',     '2022-04-10', 255000000, '0106543210', NULL),
(30, 'Mandiri', '2024-01-15', 385000000, '1299887766', 'Proses');

INSERT INTO ots_records (customer_id, bank, scheduled_date, surveyor_name, actual_date, status, result, notes) VALUES
(4,  'BRI',     '2024-03-10', 'Ahmad Faisal',     '2024-03-10', 'completed', 'lulus',  'Unit siap, nilai wajar'),
(9,  'BTN',     '2024-04-15', 'Sardi Kasim',      NULL,          'scheduled', NULL,     'Menunggu surveyor'),
(18, 'BTN',     '2024-05-20', 'Sardi Kasim',      NULL,          'scheduled', NULL,     NULL),
(27, 'BTN',     '2023-08-05', 'Sardi Kasim',      '2023-08-05', 'completed', 'lulus',  'OK, lanjut proses'),
(5,  'BTN',     '2024-04-01', 'Sardi Kasim',      '2024-04-01', 'completed', 'lulus',  NULL);

INSERT INTO sp3k_records (customer_id, bank, sp3k_date, sp3k_number, approved_amount, plafon_amount, expiry_date, status, revision_notes) VALUES
(1,  'BTN',     '2024-02-10', 'BTN/SP3K/2024/0210', 256500000, 256500000, '2024-04-10', 'disetujui', NULL),
(5,  'BTN',     '2024-04-20', 'BTN/SP3K/2024/0420', 310500000, 310500000, '2024-06-20', 'disetujui', NULL),
(16, 'BTN',     '2023-05-10', 'BTN/SP3K/2023/0510', 243000000, 243000000, '2023-07-10', 'disetujui', NULL),
(25, 'BTN',     '2021-12-01', 'BTN/SP3K/2021/1201', 229500000, 229500000, '2022-02-01', 'disetujui', NULL);

INSERT INTO bank_submissions (customer_id, bank, submitted_date, bank_officer, registration_number, notes) VALUES
(2,  'BRI',     '2024-03-01', 'Hj. Nurfitri Arman',  'BRI/2024/03/01/001', 'Berkas lengkap'),
(7,  'BTN',     '2024-03-01', 'Hj. Kartini Bakri',   'BTN/2024/03/01/002', NULL),
(8,  'BRI',     '2024-03-05', 'Hj. Nurfitri Arman',  'BRI/2024/03/05/001', NULL),
(10, 'BNI',     '2024-03-10', 'Bpk. Rijal Kadir',    'BNI/2024/03/10/001', 'BI check selesai'),
(17, 'BTN',     '2023-06-01', 'Hj. Kartini Bakri',   'BTN/2023/06/01/001', NULL);


-- ==============================================================
-- 10. CUSTOMER COMPLAINTS & CUSTOMER STATUS HISTORY
-- ==============================================================
INSERT INTO customer_complaints (project_id, unit_block, customer_id, complaint, category, severity, pic, deadline, status, completed_date, notes) VALUES
(1, 'A-02', 2,  'Atap bocor saat hujan deras',                    'Bangunan', 'sedang',  'Reza Pratama', '2024-05-10', 'proses',    NULL,       'Tim sedang survey lokasi'),
(3, 'C-01', 18, 'Pagar belum terpasang',                          'Fasum',    'ringan',  'Teguh Santoso','2024-05-30', 'belum',     NULL,       NULL),
(5, 'A-01', 25, 'Kunci rumah susah dibuka',                       'Finishing','ringan',  'Rizki Firmansyah','2022-04-01','selesai', '2022-03-28','Kunci diganti'),
(5, 'B-02', 29, 'Air tidak mengalir ke lantai 2',                 'Sanitasi', 'berat',   'Rizki Firmansyah','2022-04-10','selesai', '2022-04-05','Pompa air diperbaiki'),
(1, 'C-01', 6,  'Keramik teras retak',                            'Bangunan', 'ringan',  'Agus Pramono', '2024-01-15', 'selesai',  '2024-01-10','Keramik diganti');


-- ==============================================================
-- 11. MATERIALS (5 per proyek)
-- ==============================================================
INSERT INTO materials (id, project_id, item, stok, satuan, vendor, harga, minimum_stock) VALUES
(1,  1, 'Semen Portland',     150, 'sak',  'Toko Bahan Bangunan Jaya', 75000,  50),
(2,  1, 'Besi Beton 10mm',    80,  'btg',  'CV Besi Sulsel',           85000,  30),
(3,  1, 'Pasir Sungai',       200, 'm³',   'Tambang Maros',            180000, 80),
(4,  1, 'Keramik 40x40',      500, 'dos',  'Toko Keramik Maju',        85000,  150),
(5,  1, 'Cat Tembok 5kg',     120, 'klg',  'Toko Cat Sejahtera',       95000,  40),
(6,  2, 'Semen Portland',     90,  'sak',  'Toko Bahan Bangunan Jaya', 75000,  50),
(7,  2, 'Besi Beton 10mm',    50,  'btg',  'CV Besi Sulsel',           85000,  20),
(8,  2, 'Pasir Sungai',       100, 'm³',   'Tambang Maros',            180000, 50),
(9,  2, 'Batako',             2000,'bh',   'Pabrik Batako Maros',       3500,  500),
(10, 2, 'Genteng Beton',      800, 'bh',   'Genteng Cisangkan',         8500,  200),
(11, 3, 'Semen Portland',     200, 'sak',  'Toko Material Takalar',    75000,  80),
(12, 3, 'Besi Beton 10mm',    120, 'btg',  'CV Besi Sulsel',           85000,  40),
(13, 3, 'Pasir Sungai',       300, 'm³',   'Tambang Jeneponto',        170000, 100),
(14, 3, 'Keramik 40x40',      800, 'dos',  'Toko Keramik Maju',        85000,  200),
(15, 3, 'Cat Tembok 5kg',     200, 'klg',  'Toko Cat Sejahtera',       95000,  60),
(16, 4, 'Semen Portland',     30,  'sak',  'Toko Bahan Bangunan Jaya', 75000,  10),
(17, 4, 'Pasir Sungai',       50,  'm³',   'Tambang Maros',            180000, 20),
(18, 4, 'Batu Kali',          40,  'm³',   'Supplier Makassar',        250000, 15),
(19, 5, 'Semen Portland',     100, 'sak',  'Toko Material Bone',       77000,  40),
(20, 5, 'Besi Beton 10mm',    60,  'btg',  'CV Besi Bone',             87000,  20),
(21, 5, 'Pasir Sungai',       150, 'm³',   'Tambang Bone',             160000, 50),
(22, 5, 'Keramik 40x40',      200, 'dos',  'Toko Keramik Bone',        87000,  50),
(23, 5, 'Cat Tembok 5kg',     80,  'klg',  'Toko Cat Bone',            97000,  30);


-- ==============================================================
-- 12. PROD MATERIAL MASTER, IN & OUT
-- ==============================================================
INSERT INTO prod_material_master (id, name, category, satuan, standard_per_unit, unit_price, minimum_stock) VALUES
(1,  'Semen Portland',     'Bahan Pokok', 'sak',  8,    75000, 50),
(2,  'Besi Beton 10mm',    'Bahan Pokok', 'btg',  12,   85000, 30),
(3,  'Pasir Sungai',       'Bahan Pokok', 'm³',   2.5,  175000,50),
(4,  'Batu Bata/Batako',   'Bahan Pokok', 'bh',   500,  3200,  300),
(5,  'Keramik 40x40',      'Finishing',  'dos',  15,   85000, 50),
(6,  'Cat Tembok 5kg',     'Finishing',  'klg',  6,    95000, 20),
(7,  'Genteng Beton',      'Atap',       'bh',   150,  8500,  100),
(8,  'Pipa PVC 4in',       'Sanitasi',   'btg',  5,    65000, 20),
(9,  'Kabel NYM 2x2.5',    'Elektrikal', 'm',    50,   12000, 100),
(10, 'Kayu Bekisting',     'Bekisting',  'm²',   8,    85000, 20);

INSERT INTO prod_material_in (project_id, contract_id, stage_code, unit_id, material_id, quantity, supplier, subkon_name, document_number, notes, date_in) VALUES
(1, 1, 'T1', NULL, 1, 100, 'Toko Bahan Bangunan Jaya', 'CV Bangun Jaya',      'SJ/2024/01/001', NULL, '2024-01-15'),
(1, 1, 'T1', NULL, 2, 60,  'CV Besi Sulsel',           'CV Bangun Jaya',      'SJ/2024/01/002', NULL, '2024-01-16'),
(1, 1, 'T1', NULL, 3, 80,  'Tambang Maros',            'CV Bangun Jaya',      'SJ/2024/01/003', NULL, '2024-01-17'),
(1, 2, 'T2', NULL, 1, 80,  'Toko Bahan Bangunan Jaya', 'CV Mitra Konstruksi', 'SJ/2024/03/001', NULL, '2024-03-10'),
(1, 2, 'T2', NULL, 4, 200, 'Pabrik Batako Maros',      'CV Mitra Konstruksi', 'SJ/2024/03/002', NULL, '2024-03-11'),
(3, 4, 'T1', NULL, 1, 150, 'Toko Material Takalar',    'PT Bangun Prima',     'SJ/2022/11/001', NULL, '2022-11-01'),
(3, 4, 'T1', NULL, 2, 90,  'CV Besi Sulsel',           'PT Bangun Prima',     'SJ/2022/11/002', NULL, '2022-11-02'),
(5, 6, 'T1', NULL, 1, 120, 'Toko Material Bone',       'CV Bone Konstruksi',  'SJ/2021/08/001', NULL, '2021-08-01');

INSERT INTO prod_material_out (project_id, contract_id, stage_code, unit_id, material_id, quantity, taken_by, subkon_name, date_out, notes) VALUES
(1, 1, 'T1', 1, 1, 8,   'Mandor Sukri', 'CV Bangun Jaya',      '2024-01-20', 'Untuk unit A-01'),
(1, 1, 'T1', 3, 1, 8,   'Mandor Sukri', 'CV Bangun Jaya',      '2024-01-21', 'Untuk unit A-03'),
(1, 2, 'T2', 4, 1, 8,   'Mandor Arifin','CV Mitra Konstruksi', '2024-03-15', 'Untuk unit B-01'),
(3, 4, 'T1', 21, 1, 8,  'Mandor Hamid', 'PT Bangun Prima',     '2022-11-05', 'Untuk unit A-01 Takalar'),
(5, 6, 'T1', 41, 1, 8,  'Mandor Sappe', 'CV Bone Konstruksi',  '2021-08-05', 'Unit A-01 Bone');


-- ==============================================================
-- 13. LEADS (8 per proyek = 40 total)
-- ==============================================================
INSERT INTO leads (project_id, nama, kontak, source, status, assigned_to, campaign, follow_up_at, pekerjaan, alamat, tahap, pic_sales, budget, nama_kampanye, catatan_follow_up) VALUES
-- Proyek 1 - Gowa
(1, 'Ahmad Fauzi',        '08111001001', 'instagram',  'survey',       'Yuni Astuti',    NULL,           '2024-05-10', 'PNS',          'Gowa',    'survey_dijadwalkan', 'Yuni Astuti',   '200-300jt', 'Ramadan Sale 2024', 'Berminat tipe 36'),
(1, 'Rahma Yulianti',     '08111001002', 'facebook',   'minat',        'Bayu Setiawan',  'FB Gowa',      '2024-05-12', 'Swasta',       'Makassar','follow_up',          'Bayu Setiawan', '200-300jt', NULL,                'Tanya cicilan'),
(1, 'Syarif Hidayat',     '08111001003', 'referral',   'booking',      'Yuni Astuti',    NULL,           NULL,          'Polri',        'Gowa',    'booking',            'Yuni Astuti',   '300-400jt', NULL,                'Sudah bayar booking fee'),
(1, 'Hartati Karim',      '08111001004', 'pameran',    'minat',        'Bayu Setiawan',  'Pameran Maret','2024-05-15', 'Guru',         'Gowa',    'follow_up',          'Bayu Setiawan', '200-300jt', NULL,                'Tertarik tipe 45'),
(1, 'Dg. Sijaya',         '08111001005', 'wa_blast',   'tidak_jadi',   'Yuni Astuti',    NULL,           NULL,          'Petani',       'Gowa',    NULL,                 'Yuni Astuti',   NULL,        NULL,                'Budget tidak cukup'),
(1, 'Nur Afsah Bahri',    '08111001006', 'tiktok',     'lead_masuk',   'Bayu Setiawan',  NULL,           '2024-05-20', 'Bidan',        'Gowa',    'lead_masuk',         'Bayu Setiawan', '200-300jt', NULL,                NULL),
(1, 'Muh. Akmal Faisal',  '08111001007', 'website',    'survey',       'Yuni Astuti',    NULL,           '2024-05-18', 'Dosen',        'Makassar','survey_dijadwalkan', 'Yuni Astuti',   '300-400jt', NULL,                'Minta denah'),
(1, 'Sitti Marwah',       '08111001008', 'referral',   'berkas_masuk', 'Yuni Astuti',    NULL,           NULL,          'Bidan',        'Gowa',    'berkas_masuk',       'Yuni Astuti',   '200-300jt', NULL,                'Berkas masuk ke bank'),

-- Proyek 2 - Maros
(2, 'Rasyid Amin',        '08122001001', 'instagram',  'minat',        'Citra Dewi',     'IG Maros',     '2024-05-10', 'Petani',       'Maros',   'follow_up',          'Citra Dewi',    '200-300jt', NULL,                NULL),
(2, 'Nurhayati Mappau',   '08122001002', 'pameran',    'survey',       'Citra Dewi',     'Pameran Maret','2024-05-12', 'PNS',          'Maros',   'survey_dijadwalkan', 'Citra Dewi',    '200-300jt', NULL,                NULL),
(2, 'La Tunru',           '08122001003', 'referral',   'booking',      'Bayu Setiawan',  NULL,           NULL,          'Nelayan',      'Maros',   'booking',            'Bayu Setiawan', '200-300jt', NULL,                'Bayar booking 2jt'),
(2, 'Ratna Mustika',      '08122001004', 'facebook',   'lead_masuk',   'Citra Dewi',     'FB Maros',     '2024-05-20', 'Karyawan',     'Makassar','lead_masuk',         'Citra Dewi',    '200-300jt', NULL,                NULL),
(2, 'Dg. Sarro',          '08122001005', 'wa_blast',   'tidak_jadi',   'Bayu Setiawan',  NULL,           NULL,          'Sopir',        'Maros',   NULL,                 'Bayu Setiawan', NULL,        NULL,                'Pindah lokasi'),
(2, 'Hasanuddin Dg Nai',  '08122001006', 'instagram',  'minat',        'Citra Dewi',     'IG Maros',     '2024-05-22', 'Wiraswasta',   'Maros',   'follow_up',          'Citra Dewi',    '200-300jt', NULL,                'Tanya FLPP'),
(2, 'Jumiati Ramli',      '08122001007', 'tiktok',     'lead_masuk',   'Citra Dewi',     NULL,           '2024-05-25', 'Pedagang',     'Maros',   'lead_masuk',         'Citra Dewi',    NULL,        NULL,                NULL),
(2, 'Hamzah Dg Ratu',     '08122001008', 'website',    'minat',        'Bayu Setiawan',  NULL,           '2024-05-28', 'PNS',          'Pangkep', 'follow_up',          'Bayu Setiawan', '200-300jt', NULL,                NULL),

-- Proyek 3 - Takalar
(3, 'Sudirman Dg Palallo','08133001001', 'referral',   'berkas_masuk', 'Yuni Astuti',    NULL,           NULL,          'PNS',          'Takalar', 'berkas_masuk',       'Yuni Astuti',   '200-300jt', NULL,                'Berkas lengkap'),
(3, 'Salmah Binti Gani',  '08133001002', 'pameran',    'survey',       'Bayu Setiawan',  'Pameran April','2024-03-15', 'Guru',         'Takalar', 'survey_dijadwalkan', 'Bayu Setiawan', '200-300jt', NULL,                NULL),
(3, 'Kahar Muzakkar Jr',  '08133001003', 'instagram',  'minat',        'Citra Dewi',     'IG Takalar',   '2024-04-20', 'Wiraswasta',   'Takalar', 'follow_up',          'Citra Dewi',    '300-400jt', NULL,                'Tipe 54'),
(3, 'Rabiah Arsyad',      '08133001004', 'facebook',   'booking',      'Yuni Astuti',    NULL,           NULL,          'Dokter',       'Makassar','booking',            'Yuni Astuti',   '300-400jt', NULL,                NULL),
(3, 'Bahtiar Yusuf',      '08133001005', 'wa_blast',   'tidak_jadi',   'Bayu Setiawan',  NULL,           NULL,          'Sopir',        'Takalar', NULL,                 'Bayu Setiawan', NULL,        NULL,                'Tidak ada DP'),
(3, 'Hasna Dg Cenning',   '08133001006', 'tiktok',     'lead_masuk',   'Citra Dewi',     NULL,           '2024-05-01', 'Pedagang',     'Takalar', 'lead_masuk',         'Citra Dewi',    '200-300jt', NULL,                NULL),
(3, 'Muh. Arafah',        '08133001007', 'website',    'minat',        'Yuni Astuti',    NULL,           '2024-05-05', 'Mahasiswa',    'Makassar','follow_up',          'Yuni Astuti',   '200-300jt', NULL,                'Untuk orang tua'),
(3, 'Nirwana Junaedi',    '08133001008', 'referral',   'survey',       'Bayu Setiawan',  NULL,           '2024-05-08', 'Karyawan',     'Takalar', 'survey_dijadwalkan', 'Bayu Setiawan', '200-300jt', NULL,                NULL),

-- Proyek 4 - Makassar
(4, 'M. Arief Budiman',   '08144001001', 'instagram',  'minat',        'Citra Dewi',     'IG Makassar',  '2024-06-01', 'Pengusaha',    'Makassar','follow_up',          'Citra Dewi',    '300-400jt', NULL,                'Prospek kuat'),
(4, 'Sri Wahyuni',        '08144001002', 'website',    'lead_masuk',   'Yuni Astuti',    NULL,           '2024-06-05', 'PNS',          'Makassar','lead_masuk',         'Yuni Astuti',   '300-400jt', NULL,                NULL),
(4, 'Ridwan Hasyim',      '08144001003', 'pameran',    'minat',        'Bayu Setiawan',  'Pameran Mei',  '2024-06-10', 'Notaris',      'Makassar','follow_up',          'Bayu Setiawan', '400-500jt', NULL,                NULL),
(4, 'Sutriani Dg Kebo',   '08144001004', 'referral',   'booking',      'Citra Dewi',     NULL,           NULL,          'Dokter',       'Makassar','booking',            'Citra Dewi',    '300-400jt', NULL,                'Booking unit A-02'),
(4, 'Jamaluddin Umar',    '08144001005', 'facebook',   'tidak_jadi',   'Yuni Astuti',    NULL,           NULL,          'Petani',       'Gowa',    NULL,                 'Yuni Astuti',   NULL,        NULL,                'Terlalu jauh'),
(4, 'Haslinda Basri',     '08144001006', 'tiktok',     'lead_masuk',   'Citra Dewi',     NULL,           '2024-06-15', 'Bidan',        'Makassar','lead_masuk',         'Citra Dewi',    '300-400jt', NULL,                NULL),
(4, 'Ramlan Dg Naba',     '08144001007', 'wa_blast',   'minat',        'Bayu Setiawan',  NULL,           '2024-06-18', 'TNI/Polri',    'Makassar','follow_up',          'Bayu Setiawan', '300-400jt', NULL,                NULL),
(4, 'Andi Fatimah',       '08144001008', 'instagram',  'lead_masuk',   'Yuni Astuti',    'IG Makassar',  '2024-06-20', 'Karyawan',     'Makassar','lead_masuk',         'Yuni Astuti',   '300-400jt', NULL,                NULL),

-- Proyek 5 - Bone (sudah banyak sold, sedikit lead)
(5, 'Sudirman Lapata',    '08155001001', 'referral',   'tidak_jadi',   'Bayu Setiawan',  NULL,           NULL,          'Petani',       'Bone',    NULL,                 'Bayu Setiawan', NULL,        NULL,                'Unit habis'),
(5, 'Mardiana Kadir',     '08155001002', 'instagram',  'minat',        'Citra Dewi',     NULL,           '2024-06-01', 'Karyawan',     'Bone',    'follow_up',          'Citra Dewi',    '200-300jt', NULL,                'Tanya unit T2'),
(5, 'Dg. Naba Lolo',      '08155001003', 'wa_blast',   'minat',        'Yuni Astuti',    NULL,           '2024-06-05', 'Nelayan',      'Bone',    'follow_up',          'Yuni Astuti',   '200-300jt', NULL,                NULL),
(5, 'Nuraini Parenrengi', '08155001004', 'referral',   'booking',      'Citra Dewi',     NULL,           NULL,          'PNS',          'Bone',    'booking',            'Citra Dewi',    '200-300jt', NULL,                'Unit T2 D-01'),
(5, 'La Mappanyuki',      '08155001005', 'pameran',    'lead_masuk',   'Bayu Setiawan',  NULL,           '2024-06-10', 'Petani',       'Bone',    'lead_masuk',         'Bayu Setiawan', NULL,        NULL,                NULL),
(5, 'Syahril Ilyas',      '08155001006', 'tiktok',     'lead_masuk',   'Yuni Astuti',    NULL,           '2024-06-12', 'Guru',         'Bone',    'lead_masuk',         'Yuni Astuti',   '200-300jt', NULL,                NULL),
(5, 'Hadijah Saparuddin', '08155001007', 'facebook',   'tidak_jadi',   'Citra Dewi',     NULL,           NULL,          'IRT',          'Bone',    NULL,                 'Citra Dewi',    NULL,        NULL,                'Harga terlalu mahal'),
(5, 'Burhan Ambo Dalle',  '08155001008', 'website',    'minat',        'Bayu Setiawan',  NULL,           '2024-06-15', 'Wiraswasta',   'Bone',    'follow_up',          'Bayu Setiawan', '200-300jt', NULL,                'Tanya KPR');


-- ==============================================================
-- 14. MARKETING ABSORPTION
-- ==============================================================
INSERT INTO marketing_absorption (project_id, tahap, total_unit, unit_terjual, tanggal_launching, target_bulan) VALUES
(1, 'T1', 30, 22, '2023-01-15', 3),
(1, 'T2', 30, 8,  '2024-01-15', 4),
(2, 'T1', 50, 12, '2024-02-01', 5),
(3, 'T1', 40, 38, '2022-09-01', 5),
(3, 'T2', 40, 12, '2023-09-01', 4),
(4, 'T1', 40, 6,  '2024-04-01', 3),
(5, 'T1', 50, 48, '2021-06-01', 5),
(5, 'T2', 20, 4,  '2023-06-01', 3);


-- ==============================================================
-- 15. CAMPAIGNS
-- ==============================================================
INSERT INTO campaigns (project_id, nama, platform, tipe_konten, anggaran, spend, impresi, klik, leads_generated, tanggal_mulai, tanggal_selesai, status) VALUES
(1, 'Ramadan Sale Satara Gowa 2024', 'instagram', 'image',  15000000, 12500000, 85000,  2100, 45, '2024-03-01', '2024-04-30', 'selesai'),
(1, 'Open House Mei 2024',           'tiktok',    'video',  8000000,  7200000,  65000,  1800, 32, '2024-05-01', '2024-05-31', 'selesai'),
(2, 'Grand Launching Maros',         'instagram', 'image',  20000000, 18500000, 120000, 3500, 68, '2024-02-01', '2024-03-31', 'selesai'),
(2, 'FLPP Awareness Campaign',       'facebook',  'image',  10000000, 9200000,  75000,  2200, 38, '2024-04-01', '2024-05-31', 'aktif'),
(3, 'Peluncuran Satara Takalar',     'instagram', 'video',  18000000, 18000000, 110000, 3200, 72, '2022-09-01', '2022-10-31', 'selesai'),
(3, 'Anniversary Sale Takalar',      'tiktok',    'video',  12000000, 11500000, 95000,  2800, 55, '2023-09-01', '2023-10-31', 'selesai'),
(4, 'Pre-Launch Satara Makassar',    'instagram', 'image',  25000000, 22000000, 150000, 4500, 85, '2024-04-01', '2024-05-31', 'selesai'),
(4, 'Youtube Awareness Makassar',    'youtube',   'video',  15000000, 10000000, 200000, 5500, 60, '2024-05-01', NULL,          'aktif'),
(5, 'Launch Satara Bone',            'facebook',  'image',  12000000, 12000000, 80000,  2400, 55, '2021-06-01', '2021-07-31', 'selesai'),
(5, 'T2 Bone Campaign',              'instagram', 'image',  8000000,  6500000,  55000,  1600, 28, '2023-06-01', '2023-07-31', 'selesai');


-- ==============================================================
-- 16. COMPETITORS
-- ==============================================================
INSERT INTO competitors (project_id, nama_kompetitor, lokasi, jarak, tipe_unit, harga_min, harga_max, total_unit, unit_terjual, progress, kelebihan, kekurangan, tanggal_launching) VALUES
(1, 'Grand Gowa Residence', 'Poros Malino KM 10',   1.5, 'Tipe 36',    265000000, 320000000, 80,  55, 70, 'Dekat sekolah',         'Harga lebih tinggi',  '2022-10-01'),
(1, 'Gowa Indah Permai',    'Jl. Malino KM 8',      3.2, 'Tipe 36-54', 275000000, 450000000, 60,  30, 50, 'Akses tol dekat',       'Kualitas rata-rata',  '2023-03-01'),
(2, 'Maros Hills Residence','Jl. Poros Maros KM 22', 2.8, 'Tipe 36',   245000000, 300000000, 100, 45, 40, 'Lebih luas kavling',    'Lokasi agak terpencil','2023-06-01'),
(3, 'Takalar Green Garden', 'Jl. Takalar KM 28',    1.8, 'Tipe 36-45', 255000000, 335000000, 90,  70, 85, 'Dekat pasar',           'Infrastruktur kurang','2022-07-01'),
(4, 'Antang City View',     'Jl. Antang Raya No 40', 0.8, 'Tipe 45-54', 340000000, 480000000, 50,  20, 30, 'Brand terkenal',        'Harga premium',       '2023-10-01'),
(5, 'Bone Regency',         'Jl. Trans Sulawesi 170', 3.5, 'Tipe 36',  240000000, 295000000, 80,  60, 75, 'Harga lebih terjangkau','Kualitas biasa',       '2021-03-01');


-- ==============================================================
-- 17. BRANDING KPI
-- ==============================================================
INSERT INTO branding_kpi (bulan, platform, followers, reach, impresi, engagement, post_count, target_followers, target_reach, target_engagement, branding_score) VALUES
('2024-01', 'Instagram', 8500,  45000,  120000, 3200, 15, 10000, 50000, 3500, 82),
('2024-02', 'Instagram', 9200,  52000,  138000, 3800, 16, 10000, 55000, 4000, 85),
('2024-03', 'Instagram', 10500, 68000,  185000, 5200, 20, 11000, 65000, 5000, 89),
('2024-04', 'Instagram', 11800, 75000,  210000, 6100, 22, 12000, 70000, 5500, 91),
('2024-05', 'Instagram', 13200, 82000,  230000, 7200, 24, 13000, 80000, 6000, 93),
('2024-01', 'Facebook',  5200,  28000,  75000,  1800, 12, 6000,  30000, 2000, 78),
('2024-02', 'Facebook',  5600,  31000,  85000,  2100, 13, 6500,  35000, 2200, 80),
('2024-03', 'Facebook',  6100,  38000,  105000, 2800, 15, 7000,  40000, 2800, 83),
('2024-04', 'Facebook',  6800,  42000,  115000, 3200, 16, 7500,  45000, 3200, 85),
('2024-01', 'TikTok',    3200,  85000,  210000, 8500, 8,  4000,  90000, 9000, 75),
('2024-02', 'TikTok',    4100,  98000,  245000, 9800, 10, 5000, 100000,10000, 78),
('2024-03', 'TikTok',    5500, 125000,  320000,12500, 12, 6000, 120000,12000, 82),
('2024-04', 'TikTok',    7200, 155000,  390000,16000, 14, 7500, 150000,14000, 87);

-- Branding extended tables
INSERT INTO branding_corporate_records (brand_name, period_year, period_month, awareness_score, consistency_score, total_reach, notes) VALUES
('Satara Development', 2024, 1,  72, 85, 158000, 'Bulan yang baik untuk awareness'),
('Satara Development', 2024, 2,  75, 87, 183000, NULL),
('Satara Development', 2024, 3,  80, 88, 308000, 'Ramadan boost'),
('Satara Development', 2024, 4,  83, 90, 332000, NULL),
('Satara Development', 2024, 5,  86, 91, 367000, NULL);

INSERT INTO branding_founder_records (period_year, period_month, platform, reach, impression, engagement, new_followers, total_followers, content_count, leads_from_founder, bookings_from_founder) VALUES
(2024, 1, 'Instagram', 12000, 28000, 1500, 200, 3500, 8, 5, 1),
(2024, 2, 'Instagram', 15000, 35000, 1800, 250, 3750, 9, 7, 2),
(2024, 3, 'Instagram', 22000, 52000, 2800, 380, 4130, 12, 10, 3),
(2024, 4, 'Instagram', 25000, 60000, 3200, 420, 4550, 14, 12, 3),
(2024, 5, 'Instagram', 28000, 68000, 3800, 480, 5030, 15, 15, 4);

INSERT INTO branding_media_exposures (media_name, type, title, publish_date, url, estimated_reach, notes) VALUES
('Tribun Timur',   'koran_online', 'Satara Development Hadirkan Hunian Terjangkau di Sulsel',  '2024-03-15', 'https://tribuntimur.com/satara', 85000,  'Artikel fitur pameran'),
('iNewsTV Makassar','tv_lokal',    'Profil Developer Muda Satara Development',                   '2024-02-20', NULL,                             120000, 'Tayang jam prime time'),
('Fajar Online',   'koran_online', 'Rumah FLPP Maros Diminati Masyarakat',                      '2024-04-10', 'https://fajaronline.co.id/satara',65000,  NULL),
('Radio Idola FM', 'radio',        'Iklan Satara Residence Gowa',                               '2024-01-01', NULL,                              35000, 'Siaran 30 hari');

INSERT INTO branding_content_items (title, category, project_related, platforms, format, pic, production_deadline, scheduled_post_date, actual_post_date, production_status, caption, production_cost) VALUES
('Testimoni Pak Budi - Unit Gowa',   'Testimoni',    'Satara Residence Gowa',  'Instagram, TikTok', 'Video',  'Citra Dewi', '2024-04-25', '2024-05-01', '2024-05-01', 'terbit',  'Terima kasih Satara! Rumah impian terwujud', 500000),
('Proses Konstruksi Update Takalar', 'Progress',     'Satara Garden Takalar',  'Instagram, FB',     'Video',  'Citra Dewi', '2024-05-01', '2024-05-05', '2024-05-05', 'terbit',  'Update progress Takalar minggu ini!',       350000),
('Launching T1 Maros',               'Pemasaran',    'Satara Hills Maros',     'Semua Platform',    'Image',  'Citra Dewi', '2024-02-25', '2024-03-01', '2024-03-01', 'terbit',  'Grand Launching Satara Hills Maros!',       800000),
('KPR Proses Mudah - Edukasi',       'Edukasi',      NULL,                     'Instagram, TikTok', 'Infografis','Citra Dewi','2024-05-10','2024-05-15', NULL,          'produksi','Proses KPR cuma 5 langkah!',                250000),
('Open House Makassar Juni 2024',    'Event',        'Satara City Makassar',   'Semua Platform',    'Video',  'Citra Dewi', '2024-06-01', '2024-06-05', NULL,          'revisi',  'Yuk hadir di Open House Satara!',           600000);

INSERT INTO branding_social_media_kpi (period_year, period_month, platform, reach, impression, engagement, saves, shares, new_followers, total_followers, content_count) VALUES
(2024, 1, 'Instagram', 45000, 120000, 3200, 450, 280, 200, 8500, 15),
(2024, 2, 'Instagram', 52000, 138000, 3800, 520, 310, 320, 9200, 16),
(2024, 3, 'Instagram', 68000, 185000, 5200, 720, 480, 680, 10500,20),
(2024, 4, 'Instagram', 75000, 210000, 6100, 850, 560, 780, 11800,22),
(2024, 5, 'Instagram', 82000, 230000, 7200, 980, 640, 860, 13200,24),
(2024, 3, 'TikTok',   125000, 320000,12500,1200, 950, 1200, 5500, 12),
(2024, 4, 'TikTok',   155000, 390000,16000,1500,1200, 1500, 7200, 14);

INSERT INTO branding_project_scores (project_name, period_year, period_month, awareness_score, engagement_score, inquiry_score, sentiment_score, total_score, notes) VALUES
('Satara Residence Gowa',  2024, 4, 85, 88, 82, 90, 86.25, NULL),
('Satara Hills Maros',     2024, 4, 78, 82, 75, 85, 80.00, NULL),
('Satara Garden Takalar',  2024, 4, 82, 85, 80, 88, 83.75, NULL),
('Satara City Makassar',   2024, 4, 88, 90, 85, 92, 88.75, 'Pre-launch buzz tinggi'),
('Satara Park Bone',       2024, 4, 72, 75, 78, 85, 77.50, NULL);

INSERT INTO branding_pr_activities (title, type, party_name, activity_date, description, estimated_reach, cost, result, pr_score) VALUES
('MOU Bank BTN untuk FLPP',          'mou',           'Bank BTN',               '2024-02-15', 'Penandatanganan MOU program FLPP untuk 5 proyek', 50000, 5000000,  'MOU ditandatangani',   88),
('Sponsorship Festival Makassar',    'sponsorship',   'Pemkot Makassar',        '2024-03-10', 'Sponsor utama festival budaya kota',              80000, 8000000,  'Exposure luas',        82),
('Press Conference Satara Makassar', 'press_conference','Media Massa Sulsel',   '2024-04-25', 'Konferensi pers grand launch Satara City',        120000,3000000,  '12 media hadir',       90),
('CSR Bedah Rumah Gowa',             'csr',           'Pemerintah Kab Gowa',   '2024-01-20', 'Program bedah 5 rumah warga kurang mampu',        35000, 15000000, 'Liputan positif',      85);

INSERT INTO branding_sentiment_records (period_year, period_month, platform, total_analyzed, positive_count, neutral_count, negative_count, positive_themes, negative_themes) VALUES
(2024, 3, 'Instagram', 450, 380, 52, 18, 'Kualitas, lokasi, harga terjangkau', 'Proses lambat, dokumen'),
(2024, 4, 'Instagram', 520, 448, 58, 14, 'Desain bagus, pelayanan ramah',      'Cicilan, info kurang'),
(2024, 5, 'Instagram', 580, 512, 52, 16, 'Proses mudah, cepat',                'Parkir, jalan masuk'),
(2024, 3, 'TikTok',   680, 600, 60, 20, 'Viral, kualitas, harga',              'Pembayaran, lokasi'),
(2024, 4, 'TikTok',   820, 740, 62, 18, 'Terpercaya, responsif',               'Antre panjang');

INSERT INTO branding_trust_score_records (period_year, period_month, new_testimonials, avg_testimonial_score, progress_content_count, avg_response_time_minutes, positive_sentiment_pct, trust_score) VALUES
(2024, 1, 5,  4.3, 8,  45, 82, 78),
(2024, 2, 7,  4.5, 9,  38, 84, 82),
(2024, 3, 12, 4.6, 14, 32, 85, 86),
(2024, 4, 10, 4.7, 16, 28, 87, 88),
(2024, 5, 15, 4.8, 18, 25, 89, 91);


-- ==============================================================
-- 18. LEGAL - DOCUMENTS, ISSUES, PERMITS, LAND, SHM
-- ==============================================================
INSERT INTO legal_documents (project_id, tipe_dokumen, status, pic, expiry, catatan) VALUES
(1, 'Sertifikat Induk HGB',  'selesai', 'Fajar Nugroho', '2043-01-15', 'Berlaku 20 tahun'),
(1, 'KKPR',                  'selesai', 'Fajar Nugroho', '2026-01-15', 'KKPR dari ATRBPN'),
(1, 'AMDAL',                 'selesai', 'Wahyu Hidayat', NULL,          NULL),
(1, 'PBG',                   'selesai', 'Wahyu Hidayat', NULL,          'PBG cluster T1 selesai'),
(1, 'IMB T2',                'proses',  'Wahyu Hidayat', NULL,          'Pengajuan ke DPMPTSP'),
(2, 'Sertifikat Induk HGB',  'selesai', 'Fajar Nugroho', '2044-06-01', NULL),
(2, 'KKPR',                  'selesai', 'Fajar Nugroho', '2027-06-01', NULL),
(2, 'PBG',                   'proses',  'Wahyu Hidayat', NULL,          'Proses 2 bulan'),
(3, 'Sertifikat Induk HGB',  'selesai', 'Fajar Nugroho', '2042-09-01', NULL),
(3, 'KKPR',                  'selesai', 'Fajar Nugroho', '2025-09-01', NULL),
(3, 'PBG T1',                'selesai', 'Wahyu Hidayat', NULL,          NULL),
(3, 'PBG T2',                'proses',  'Wahyu Hidayat', NULL,          'Menunggu persetujuan'),
(4, 'Sertifikat Induk',      'proses',  'Fajar Nugroho', NULL,          'Proses balik nama'),
(4, 'KKPR',                  'proses',  'Wahyu Hidayat', NULL,          'Pengajuan bulan ini'),
(5, 'Sertifikat Induk HGB',  'selesai', 'Fajar Nugroho', '2041-06-01', NULL),
(5, 'KKPR',                  'selesai', 'Fajar Nugroho', '2024-06-01', 'Perlu perpanjangan'),
(5, 'PBG',                   'selesai', 'Wahyu Hidayat', NULL,          NULL);

INSERT INTO legal_issues (project_id, title, object_description, category, risk_level, description, status, pic, start_date, target_resolution, completed_date) VALUES
(1, 'Klaim batas lahan dari tetangga barat',   'Lahan T2 blok B barat', 'sengketa_batas',  'medium', 'Tetangga klaim 2m lahan blok B masuk lahannya. Sudah survey ulang.', 'mediasi',  'Fajar Nugroho', '2024-02-01', '2024-06-30', NULL),
(3, 'Masalah akses jalan ke T2',               'Jalan akses T2',        'perizinan',       'low',    'Izin akses jalan dari pemilik tanah sekitar belum final.',            'aktif',    'Wahyu Hidayat', '2023-10-15', '2024-04-30', NULL),
(4, 'Tumpang tindih batas dengan lahan BPN',   'Lahan T1 blok C',       'klaim_kepemilikan','high',  'Perlu klarifikasi dengan BPN Makassar terkait koordinat.',            'sidang',   'Fajar Nugroho', '2024-01-15', '2024-08-31', NULL),
(5, 'SHM unit B-03 belum tiba',                'SHM Unit B-03',         'masalah_shm',     'low',    'Proses pecah SHM unit B-03 terlambat 2 bulan dari jadwal.',           'selesai',  'Fajar Nugroho', '2023-01-10', '2023-03-31', '2023-03-25');

INSERT INTO permit_documents (project_id, permit_group, permit_name, institution, status, submission_date, target_date, actual_date, document_number, pic, notes) VALUES
(1, 'perizinan_dasar',    'KKPR',    'ATRBPN Gowa',       'selesai',           '2022-10-01', '2023-01-01', '2023-01-15', 'KKPR/7306/2023/001', 'Fajar Nugroho',  NULL),
(1, 'perizinan_dasar',    'AMDAL',   'DLH Gowa',          'selesai',           '2022-11-01', '2023-03-01', '2023-02-20', 'AMDAL/7306/2023/002','Wahyu Hidayat',  NULL),
(1, 'perizinan_bangunan', 'PBG T1',  'DPMPTSP Gowa',      'selesai',           '2023-01-20', '2023-04-20', '2023-04-10', 'PBG/7306/2023/015',  'Wahyu Hidayat',  'T1 30 unit'),
(1, 'perizinan_bangunan', 'PBG T2',  'DPMPTSP Gowa',      'dalam_proses',      '2024-02-01', '2024-06-01', NULL,          NULL,                  'Wahyu Hidayat',  NULL),
(1, 'izin_teknis',        'SLF T1',  'Dinas PU Gowa',     'selesai',           '2023-10-01', '2024-01-01', '2023-12-28', 'SLF/7306/2023/008',  'Wahyu Hidayat',  NULL),
(2, 'perizinan_dasar',    'KKPR',    'ATRBPN Maros',      'selesai',           '2023-04-01', '2023-07-01', '2023-07-10', 'KKPR/7308/2023/005', 'Fajar Nugroho',  NULL),
(2, 'perizinan_bangunan', 'PBG',     'DPMPTSP Maros',     'dalam_proses',      '2024-01-15', '2024-05-15', NULL,          NULL,                  'Wahyu Hidayat',  'Estimasi selesai Juni'),
(3, 'perizinan_dasar',    'KKPR',    'ATRBPN Takalar',    'selesai',           '2022-06-01', '2022-09-01', '2022-08-25', 'KKPR/7301/2022/003', 'Fajar Nugroho',  NULL),
(3, 'perizinan_bangunan', 'PBG T1',  'DPMPTSP Takalar',   'selesai',           '2022-09-01', '2022-12-01', '2022-11-28', 'PBG/7301/2022/020',  'Wahyu Hidayat',  NULL),
(3, 'perizinan_bangunan', 'PBG T2',  'DPMPTSP Takalar',   'dalam_proses',      '2023-10-01', '2024-03-01', NULL,          NULL,                  'Wahyu Hidayat',  NULL),
(4, 'perizinan_dasar',    'KKPR',    'ATRBPN Makassar',   'dalam_proses',      '2024-03-01', '2024-07-01', NULL,          NULL,                  'Fajar Nugroho',  NULL),
(5, 'perizinan_dasar',    'KKPR',    'ATRBPN Bone',       'selesai',           '2021-03-01', '2021-06-01', '2021-05-28', 'KKPR/7415/2021/002', 'Fajar Nugroho',  NULL),
(5, 'perizinan_bangunan', 'PBG',     'DPMPTSP Bone',      'selesai',           '2021-05-01', '2021-08-01', '2021-07-25', 'PBG/7415/2021/010',  'Wahyu Hidayat',  NULL),
(5, 'izin_teknis',        'SLF',     'Dinas PU Bone',     'selesai',           '2022-06-01', '2022-09-01', '2022-08-20', 'SLF/7415/2022/005',  'Wahyu Hidayat',  NULL);

INSERT INTO land_stages (id, project_id, stage_code, stage_identity, land_area, target_kavlings, certificate_number, stage_status, notes) VALUES
(1, 1, 'T1', 'H. Abdullah Dg. Tappa', 4500, 30, 'SHM No. 1234/Sungguminasa', 'selesai',         'Sudah balik nama atas nama perusahaan'),
(2, 1, 'T2', 'Dg. Maccaya',           4000, 30, 'SHM No. 1235/Sungguminasa', 'siap_bangun',     'Proses pemecahan SHM'),
(3, 2, 'T1', 'H. Kahar Dg. Tiro',     6200, 50, 'SHM No. 2100/Mandai',       'siap_bangun',     'Batas lahan sudah dipasang patok'),
(4, 3, 'T1', 'Hj. Rosmiati',          5500, 40, 'SHM No. 0987/Palleko',      'selesai',         'Selesai pecah SHM 40 kavling'),
(5, 3, 'T2', 'Dg. Ngajir',            4700, 40, 'SHM No. 0988/Palleko',      'pemecahan_shm',   'Proses pecah 40 kavling'),
(6, 4, 'T1', 'H. Burhanuddin Aris',   4800, 40, 'SHM No. 3456/Antang',       'balik_nama',      'Proses balik nama AJB sudah'),
(7, 5, 'T1', 'La Mappajanci',         5000, 50, 'SHM No. 5678/Macege',       'selesai',         'Selesai sempurna'),
(8, 5, 'T2', 'Andi Tenri',            2600, 20, 'SHM No. 5679/Macege',       'pemecahan_shm',   'Proses pecah SHM T2');

INSERT INTO land_legal_checklist (land_stage_id, item_name, item_order, status, submission_date, target_date, actual_date, pic) VALUES
(1,'Survey Legal',1,'selesai','2022-10-01','2022-10-15','2022-10-12','Fajar Nugroho'),
(1,'Cek SHM',2,'selesai','2022-10-12','2022-10-20','2022-10-18','Fajar Nugroho'),
(1,'Negosiasi',3,'selesai',NULL,NULL,'2022-10-25','Fajar Nugroho'),
(1,'AJB',4,'selesai','2022-11-01','2022-11-30','2022-11-28','Fajar Nugroho'),
(1,'Balik Nama',5,'selesai','2022-12-01','2023-02-28','2023-01-20','Fajar Nugroho'),
(1,'Pemecahan SHM',6,'selesai','2023-01-20','2023-04-30','2023-04-15','Fajar Nugroho'),
(2,'Survey Legal',1,'selesai','2023-06-01','2023-06-15','2023-06-10','Fajar Nugroho'),
(2,'Negosiasi',3,'selesai',NULL,NULL,'2023-08-01','Fajar Nugroho'),
(2,'AJB',4,'selesai','2023-08-15','2023-10-31','2023-10-25','Fajar Nugroho'),
(2,'Balik Nama',5,'selesai','2023-11-01','2024-01-31','2024-01-20','Fajar Nugroho'),
(2,'Pemecahan SHM',6,'proses','2024-01-20','2024-05-31',NULL,'Fajar Nugroho'),
(6,'Survey Legal',1,'selesai','2024-01-01','2024-01-15','2024-01-12','Fajar Nugroho'),
(6,'Negosiasi',3,'selesai',NULL,NULL,'2024-02-01','Fajar Nugroho'),
(6,'AJB',4,'selesai','2024-02-10','2024-03-31','2024-03-28','Fajar Nugroho'),
(6,'Balik Nama',5,'proses','2024-04-01','2024-06-30',NULL,'Fajar Nugroho');

INSERT INTO shm_split_records (project_id, land_stage_id, stage_code, target_split, realized_split, last_updated, pic, notes) VALUES
(1, 1, 'T1', 30, 30, '2023-04-15', 'Fajar Nugroho', 'Semua kavling sudah pecah SHM'),
(1, 2, 'T2', 30, 8,  '2024-03-01', 'Fajar Nugroho', 'Proses pecah bertahap'),
(3, 4, 'T1', 40, 40, '2023-01-15', 'Fajar Nugroho', 'Selesai semua'),
(3, 5, 'T2', 40, 12, '2024-02-01', 'Fajar Nugroho', 'Proses lanjutan'),
(5, 7, 'T1', 50, 50, '2022-05-01', 'Fajar Nugroho', 'Selesai'),
(5, 8, 'T2', 20, 4,  '2024-01-15', 'Fajar Nugroho', 'Baru mulai');


-- ==============================================================
-- 19. PLANNING - MILESTONES, CASHFLOW, FEASIBILITY, LAND, PRODUCT, SDM, MARKET
-- ==============================================================
INSERT INTO planning_milestones (project_id, phase, task_name, target_date, actual_date, status, progress_pct, units_done, notes) VALUES
(1, 'Pengadaan Lahan', 'Negosiasi Lahan T1',    '2022-11-01', '2022-10-25', 'selesai', 100, 0, NULL),
(1, 'Pengadaan Lahan', 'AJB & Balik Nama T1',   '2023-01-01', '2023-01-20', 'selesai', 100, 0, NULL),
(1, 'Perizinan',       'Pengurusan KKPR',        '2023-02-01', '2023-01-15', 'selesai', 100, 0, 'Lebih cepat'),
(1, 'Perizinan',       'Pengurusan PBG T1',      '2023-05-01', '2023-04-10', 'selesai', 100, 0, NULL),
(1, 'Konstruksi T1',   'Pondasi Unit T1',        '2023-09-01', '2023-08-25', 'selesai', 100, 30, NULL),
(1, 'Konstruksi T1',   'Struktur & Dinding T1',  '2023-12-01', '2023-11-30', 'selesai', 100, 30, NULL),
(1, 'Konstruksi T1',   'Finishing T1',           '2024-02-01', '2024-02-15', 'selesai', 100, 28, '2 unit minor rework'),
(1, 'Konstruksi T2',   'Pondasi T2',             '2024-04-01', NULL,          'sedang',  60,  20, 'On track'),
(1, 'Konstruksi T2',   'Struktur T2',            '2024-08-01', NULL,          'belum_mulai', 0, 0, NULL),
(1, 'Marketing',       'Launching T1',           '2023-01-15', '2023-01-15', 'selesai', 100, 0, 'Sukses, 50 hadir'),
(1, 'Marketing',       'Pencapaian 50% T1',      '2023-06-30', '2023-07-15', 'selesai', 100, 15, NULL),
(2, 'Pengadaan Lahan', 'Negosiasi Lahan',        '2023-05-01', '2023-07-20', 'selesai', 100, 0, 'Terlambat 2 bulan'),
(2, 'Perizinan',       'KKPR Maros',             '2023-08-01', '2023-07-10', 'selesai', 100, 0, NULL),
(2, 'Perizinan',       'PBG Maros',              '2024-05-01', NULL,          'sedang',  40, 0, 'Proses di DPMPTSP'),
(2, 'Marketing',       'Grand Launching',         '2024-03-01', '2024-03-01', 'selesai', 100, 0, 'Grand launching sukses'),
(2, 'Marketing',       'Target 20 unit Q2 2024', '2024-06-30', NULL,          'sedang',  60, 12, NULL),
(3, 'Konstruksi T1',   'Pondasi T1 Takalar',     '2022-11-01', '2022-10-28', 'selesai', 100, 40, NULL),
(3, 'Konstruksi T1',   'Finishing T1 Takalar',   '2023-05-01', '2023-04-20', 'selesai', 100, 40, NULL),
(3, 'Serah Terima',    'Serah Terima T1',         '2023-07-01', '2023-07-15', 'selesai', 100, 38, '38 dari 40 unit'),
(3, 'Konstruksi T2',   'Pondasi T2 Takalar',     '2023-10-01', '2023-09-25', 'selesai', 100, 40, NULL),
(4, 'Pengadaan Lahan', 'Negosiasi Lahan Makassar','2024-02-01','2024-01-28', 'selesai', 100, 0, NULL),
(4, 'Pengadaan Lahan', 'AJB Makassar',           '2024-04-01', '2024-03-28', 'selesai', 100, 0, NULL),
(4, 'Perizinan',       'Pengajuan KKPR Makassar', '2024-08-01', NULL,          'sedang',  30, 0, NULL),
(5, 'Konstruksi T1',   'Pondasi Bone',           '2021-09-01', '2021-08-28', 'selesai', 100, 50, NULL),
(5, 'Konstruksi T1',   'Finishing Bone T1',      '2022-01-01', '2021-12-28', 'selesai', 100, 50, NULL),
(5, 'Serah Terima',    'Serah Terima Bone T1',   '2022-04-01', '2022-04-10', 'selesai', 100, 48, NULL);

INSERT INTO planning_cashflow (project_id, month_number, month_label, land_cost_out, construction_cost_out, marketing_cost_out, operational_cost_out, kpp_installment_out, booking_fee_in, ht_kpr_in, down_payment_in, kpp_disbursement_in, conservative_units, moderate_units, aggressive_units) VALUES
(1, 1,  'Jan 2023', 500000000, 0,          50000000,  20000000, 0,         5000000,   0,          0,          2000000000, 0, 2, 3),
(1, 2,  'Feb 2023', 0,         200000000,  30000000,  20000000, 15000000,  10000000,  0,          50000000,   0,          1, 2, 3),
(1, 3,  'Mar 2023', 0,         250000000,  80000000,  20000000, 15000000,  20000000,  100000000,  100000000,  0,          2, 3, 4),
(1, 4,  'Apr 2023', 0,         300000000,  40000000,  20000000, 15000000,  15000000,  150000000,  120000000,  0,          2, 3, 4),
(1, 5,  'Mei 2023', 0,         350000000,  40000000,  20000000, 15000000,  20000000,  200000000,  150000000,  0,          3, 4, 5),
(1, 6,  'Jun 2023', 0,         350000000,  40000000,  20000000, 15000000,  25000000,  250000000,  180000000,  0,          3, 4, 5),
(2, 1,  'Jan 2024', 600000000, 0,          100000000, 25000000, 0,         10000000,  0,          0,          2500000000, 0, 3, 4),
(2, 2,  'Feb 2024', 0,         150000000,  200000000, 25000000, 20000000,  30000000,  0,          80000000,   0,          2, 3, 5),
(2, 3,  'Mar 2024', 0,         200000000,  180000000, 25000000, 20000000,  50000000,  200000000,  150000000,  0,          3, 5, 7),
(5, 1,  'Jun 2021', 450000000, 0,          80000000,  15000000, 0,         5000000,   0,          0,          1800000000, 0, 3, 5),
(5, 2,  'Jul 2021', 0,         250000000,  50000000,  15000000, 15000000,  15000000,  0,          80000000,   0,          3, 5, 7),
(5, 3,  'Agu 2021', 0,         300000000,  30000000,  15000000, 15000000,  20000000,  150000000,  100000000,  0,          4, 6, 8);

INSERT INTO planning_feasibility (project_id, land_cost, land_prep_cost, construction_cost_per_unit, fasum_road_cost, permit_cost, marketing_cost, overhead_cost, contingency_pct, selling_price_per_unit, total_units, booking_fee_per_unit, sales_per_month, kpr_pct, cash_hard_pct, cash_installment_pct, discount_rate, total_revenue, total_cost, gross_profit, margin, roi, irr, npv, payback_period, bep_units, peak_funding, risk_score, recommendation, is_approved) VALUES
(1, 5000000000, 250000000, 150000000, 400000000, 200000000, 500000000, 300000000, 5, 305000000, 60, 5000000, 4, 70, 15, 15, 12, 18300000000, 11250000000, 7050000000, 38.5, 62.7, 18.5, 4500000000, 24, 37, 3500000000, 35, 'LAYAK - ROI menarik, lokasi strategis Gowa', true),
(2, 4500000000, 200000000, 145000000, 350000000, 180000000, 600000000, 280000000, 5, 280000000, 50, 5000000, 5, 75, 10, 15, 12, 14000000000, 9255000000,  4745000000, 33.9, 51.3, 16.2, 2800000000, 22, 33, 3000000000, 38, 'LAYAK - Potensi FLPP tinggi', true),
(3, 6000000000, 300000000, 155000000, 450000000, 220000000, 480000000, 320000000, 5, 295000000, 80, 5000000, 5, 65, 20, 15, 12, 23600000000, 14525000000, 9075000000, 38.4, 62.5, 19.0, 6200000000, 20, 49, 4200000000, 32, 'SANGAT LAYAK - Permintaan tinggi Takalar', true),
(4, 5500000000, 280000000, 160000000, 380000000, 250000000, 700000000, 350000000, 5, 345000000, 40, 5000000, 3, 60, 25, 15, 12, 13800000000, 10570000000, 3230000000, 23.4, 30.6, 13.5, 1500000000, 30, 31, 3800000000, 45, 'LAYAK - Margin lebih tipis, lokasi premium', true),
(5, 4000000000, 180000000, 140000000, 320000000, 160000000, 400000000, 250000000, 5, 265000000, 70, 5000000, 5, 75, 10, 15, 12, 18550000000, 9010000000,  9540000000, 51.4, 105.9,25.0, 8500000000, 16, 34, 2800000000, 25, 'SANGAT LAYAK - ROI tertinggi, Bone berkembang', true);

INSERT INTO planning_land (project_id, land_area, land_price_total, land_shape, contour, road_width, legal_status, notes, road_area, fasum_area, effective_area, max_units, land_price_per_unit) VALUES
(1, 8500, 5000000000, 'Persegi Panjang', 'Datar',        8,  'SHM',        'Lahan ideal, kontur datar',     1200, 800, 6500,  60,  83333333),
(2, 6200, 4500000000, 'Tidak Beraturan', 'Datar',        7,  'SHM',        'Akses dari jalan provinsi',     900,  600, 4700,  50,  90000000),
(3, 10200,6000000000, 'Persegi Panjang', 'Sedikit Miring',9, 'SHM',        'Lahan luas, potensi besar',     1500, 900, 7800,  80,  75000000),
(4, 4800, 5500000000, 'Persegi Panjang', 'Datar',        10, 'HGB',        'Lokasi perkotaan, strategis',   700,  500, 3600,  40, 137500000),
(5, 7600, 4000000000, 'Persegi Panjang', 'Datar',        8,  'SHM',        'Lahan produktif eks pertanian', 1100, 700, 5800,  70,  57142857);

INSERT INTO planning_product (project_id, house_type, building_area, kavling_area, selling_price, unit_count, target_segment, competitor_price) VALUES
(1, 'Tipe 36/72',  36, 72,  285000000, 35, 'MBR - ASN - Karyawan', 270000000),
(1, 'Tipe 45/90',  45, 90,  345000000, 18, 'Menengah Bawah',       330000000),
(1, 'Tipe 54/108', 54, 108, 420000000, 7,  'Menengah',             410000000),
(2, 'Tipe 36/72',  36, 72,  260000000, 38, 'MBR - FLPP',           248000000),
(2, 'Tipe 45/90',  45, 90,  320000000, 12, 'Menengah Bawah',       310000000),
(3, 'Tipe 36/72',  36, 72,  270000000, 48, 'MBR',                  255000000),
(3, 'Tipe 45/90',  45, 90,  335000000, 22, 'Menengah Bawah',       320000000),
(3, 'Tipe 54/108', 54, 108, 410000000, 10, 'Menengah',             395000000),
(4, 'Tipe 36/72',  36, 72,  310000000, 20, 'Menengah Bawah',       300000000),
(4, 'Tipe 45/90',  45, 90,  380000000, 14, 'Menengah',             365000000),
(4, 'Tipe 54/108', 54, 108, 460000000, 6,  'Menengah Atas',        445000000),
(5, 'Tipe 36/72',  36, 72,  255000000, 50, 'MBR - FLPP',           240000000),
(5, 'Tipe 45/90',  45, 90,  315000000, 15, 'Menengah Bawah',       300000000),
(5, 'Tipe 54/108', 54, 108, 385000000, 5,  'Menengah',             370000000);

INSERT INTO planning_sdm (project_id, site_managers, supervisors, workers, workers_per_unit, units_per_manager) VALUES
(1, 2, 4, 45, 3, 20),
(2, 1, 3, 30, 3, 20),
(3, 3, 5, 60, 3, 20),
(4, 1, 2, 15, 3, 20),
(5, 2, 3, 40, 3, 20);

INSERT INTO planning_market (project_id, kabupaten, kelurahan, kecamatan, population, population_growth, backlog_housing, marriage_rate, kk_count, kk_growth, density, umk, avg_income, asn_count, private_employees, umkm_count, unemployment_rate, flpp_realization, flpp_eligible, purchase_power, active_developers, active_banks, target_price, road_access, near_tol_plaza, near_school, near_market, sample_size, flpp_preference, cash_preference, demand_score, market_potential_score, market_recommendation) VALUES
(1, 'Gowa',    'Sungguminasa', 'Somba Opu', 350000, 2.8, 15000, 4200, 95000, 2.5, 4100, 3500000, 4200000, 8500,  45000, 12000, 4.2, 250, 68.5, 78.5, 8, 12, 285000000, 8.5, 4.2, 1.5, 2.0, 150, 72, 28, 82.5, 85.2, 'SANGAT BERPOTENSI - Permintaan tinggi, FLPP dominan'),
(2, 'Maros',   'Hasanuddin',  'Mandai',    180000, 3.2, 8000,  2800, 52000, 3.0, 2200, 3200000, 3800000, 5500,  28000, 8500,  3.8, 120, 72.0, 75.0, 5, 8,  260000000, 6.5, 8.5, 2.0, 3.5, 120, 75, 25, 79.8, 82.0, 'BERPOTENSI - Dekat bandara Hasanuddin'),
(3, 'Takalar', 'Palleko',     'Polombangkeng', 220000, 2.5, 10000, 3500, 68000, 2.2, 3200, 3100000, 3600000, 6200, 32000, 9500, 4.5, 180, 70.0, 72.5, 6, 9, 270000000, 7.0, 12.5, 2.5, 4.0, 130, 70, 30, 78.2, 80.5, 'BERPOTENSI - Kawasan industri berkembang'),
(4, 'Makassar','Antang',      'Manggala',  400000, 1.8, 20000, 5200, 120000,1.5, 8500, 4000000, 5000000, 15000, 80000, 25000, 3.5, 350, 62.0, 88.5, 15, 18, 345000000, 10.0, 5.0, 1.0, 1.5, 200, 62, 38, 88.5, 90.2, 'SANGAT BERPOTENSI - Kota besar, demand kuat'),
(5, 'Bone',    'Macege',      'Tanete Riattang', 120000, 2.1, 6000, 2200, 38000, 2.0, 1400, 2800000, 3200000, 4500, 18000, 6000, 5.2, 80, 75.0, 68.5, 3, 6, 255000000, 5.5, 25.5, 3.5, 6.5, 100, 78, 22, 72.5, 75.0, 'BERPOTENSI - Ibu kota Bone, pegawai negeri dominan');

INSERT INTO planning_competitors (market_id, name, price, product_type, units, absorption, distance) VALUES
(1, 'Grand Gowa Residence', 275000000, 'Tipe 36', 80, 3.5, 1.5),
(1, 'Gowa Indah Permai',    285000000, 'Tipe 36-45', 60, 2.8, 3.2),
(2, 'Maros Hills',          248000000, 'Tipe 36', 100, 4.0, 2.8),
(3, 'Takalar Green',        258000000, 'Tipe 36-45', 90, 4.5, 1.8),
(4, 'Antang City View',     335000000, 'Tipe 45-54', 50, 2.5, 0.8),
(5, 'Bone Regency',         242000000, 'Tipe 36', 80, 4.2, 3.5);


-- ==============================================================
-- 20. FINANCE DATA
-- ==============================================================
INSERT INTO finance_uploads (file_type, file_name, period_year, period_month, row_count, status, uploaded_by) VALUES
('cashflow',   'cashflow_jan_2024.xlsx', 2024, 1, 45, 'berhasil', 'admin'),
('cashflow',   'cashflow_feb_2024.xlsx', 2024, 2, 48, 'berhasil', 'admin'),
('cashflow',   'cashflow_mar_2024.xlsx', 2024, 3, 52, 'berhasil', 'admin'),
('cashflow',   'cashflow_apr_2024.xlsx', 2024, 4, 51, 'berhasil', 'admin'),
('rab',        'rab_2024_all.xlsx',      2024, 1, 120,'berhasil', 'admin'),
('hutang',     'hutang_apr_2024.xlsx',   2024, 4, 35, 'berhasil', 'admin'),
('piutang',    'piutang_apr_2024.xlsx',  2024, 4, 28, 'berhasil', 'admin');

INSERT INTO finance_cashflow_records (upload_id, transaction_date, type, category, project_name, amount, description, reference_number) VALUES
-- Januari 2024
(1, '2024-01-05',  'masuk',  'KPR/HT',       'Satara Park Bone',      255000000, 'HT Unit A-01 Bone',           'HT/2024/01/001'),
(1, '2024-01-08',  'masuk',  'KPR/HT',       'Satara Park Bone',      255000000, 'HT Unit A-02 Bone',           'HT/2024/01/002'),
(1, '2024-01-10',  'masuk',  'DP',           'Satara Residence Gowa', 28500000,  'DP Cust Sari Dewi',           'DP/2024/01/001'),
(1, '2024-01-15',  'keluar', 'Konstruksi',   'Satara Residence Gowa', 80000000,  'Termin 1 CV Bangun Jaya',     'PAY/2024/01/001'),
(1, '2024-01-20',  'keluar', 'Operasional',  'Satara Development',    25000000,  'Gaji & Operasional Januari',  'OPS/2024/01/001'),
(1, '2024-01-25',  'masuk',  'Booking Fee',  'Satara Hills Maros',    5000000,   'BF Unit A-01 Maros',          'BF/2024/01/001'),
-- Februari 2024
(2, '2024-02-01',  'masuk',  'KPR/HT',       'Satara Residence Gowa', 310500000, 'HT Unit A-03 Gowa - Indah',   'HT/2024/02/001'),
(2, '2024-02-05',  'masuk',  'DP',           'Satara Hills Maros',    26000000,  'DP Fandi Ahmad Maros',        'DP/2024/02/001'),
(2, '2024-02-10',  'keluar', 'Konstruksi',   'Satara Hills Maros',    120000000, 'Termin 1 CV Graha Utama',     'PAY/2024/02/001'),
(2, '2024-02-15',  'keluar', 'Marketing',    'Satara Hills Maros',    180000000, 'Grand Launching Maros',       'MKT/2024/02/001'),
(2, '2024-02-20',  'masuk',  'Booking Fee',  'Satara Hills Maros',    15000000,  'BF 3 unit Maros',             'BF/2024/02/001'),
(2, '2024-02-28',  'keluar', 'Operasional',  'Satara Development',    28000000,  'Gaji & Operasional Februari', 'OPS/2024/02/001'),
-- Maret 2024
(3, '2024-03-05',  'masuk',  'KPR/HT',       'Satara Residence Gowa', 378000000, 'HT Unit C-01 Gowa - Hendra',  'HT/2024/03/001'),
(3, '2024-03-10',  'masuk',  'DP',           'Satara Hills Maros',    78000000,  'DP 3 unit Maros',             'DP/2024/03/001'),
(3, '2024-03-15',  'keluar', 'Konstruksi',   'Satara Garden Takalar', 80000000,  'Progress T2 Takalar',         'PAY/2024/03/001'),
(3, '2024-03-20',  'keluar', 'Marketing',    'Satara Residence Gowa', 125000000, 'Ramadan Sale Campaign',       'MKT/2024/03/001'),
(3, '2024-03-28',  'keluar', 'Operasional',  'Satara Development',    30000000,  'Gaji & Operasional Maret',    'OPS/2024/03/001'),
-- April 2024
(4, '2024-04-05',  'masuk',  'KPR/HT',       'Satara Park Bone',      385000000, 'HT Unit C-01 Bone - Hadriani','HT/2024/04/001'),
(4, '2024-04-10',  'masuk',  'DP',           'Satara City Makassar',  62000000,  'DP 2 unit Makassar',          'DP/2024/04/001'),
(4, '2024-04-15',  'keluar', 'Konstruksi',   'Satara Residence Gowa', 90000000,  'Progress T2 Gowa',            'PAY/2024/04/001'),
(4, '2024-04-25',  'keluar', 'Marketing',    'Satara City Makassar',  220000000, 'Pre-Launch Campaign Makassar','MKT/2024/04/001'),
(4, '2024-04-30',  'keluar', 'Operasional',  'Satara Development',    32000000,  'Gaji & Operasional April',    'OPS/2024/04/001');

INSERT INTO finance_rab_items (upload_id, project_name, stage_code, item_name, item_category, rab_amount, realization_amount) VALUES
(5, 'Satara Residence Gowa',  'T1', 'Pekerjaan Pondasi',     'Struktur',   900000000,  900000000),
(5, 'Satara Residence Gowa',  'T1', 'Pekerjaan Dinding',     'Arsitektur', 600000000,  600000000),
(5, 'Satara Residence Gowa',  'T1', 'Pekerjaan Atap',        'Struktur',   450000000,  450000000),
(5, 'Satara Residence Gowa',  'T1', 'Pekerjaan Finishing',   'Arsitektur', 360000000,  350000000),
(5, 'Satara Residence Gowa',  'T1', 'Jalan & Drainase',      'Infrastruktur',400000000,400000000),
(5, 'Satara Residence Gowa',  'T2', 'Pekerjaan Pondasi',     'Struktur',   750000000,  310000000),
(5, 'Satara Residence Gowa',  'T2', 'Pekerjaan Dinding',     'Arsitektur', 500000000,  0),
(5, 'Satara Hills Maros',     'T1', 'Pekerjaan Pondasi',     'Struktur',   750000000,  150000000),
(5, 'Satara Hills Maros',     'T1', 'Jalan & Drainase',      'Infrastruktur',350000000,80000000),
(5, 'Satara Garden Takalar',  'T1', 'Pekerjaan Pondasi',     'Struktur',   1200000000, 1200000000),
(5, 'Satara Garden Takalar',  'T1', 'Pekerjaan Finishing',   'Arsitektur', 600000000,  590000000),
(5, 'Satara Garden Takalar',  'T2', 'Pekerjaan Pondasi',     'Struktur',   1100000000, 500000000),
(5, 'Satara Park Bone',       'T1', 'Semua Pekerjaan T1',    'Total',      7000000000, 7000000000),
(5, 'Satara City Makassar',   'T1', 'Pembersihan Lahan',     'Infrastruktur',200000000,200000000);

INSERT INTO finance_kpp_facilities (project_name, bank_name, plafon, first_disbursement_date, tenor_months, interest_rate, schedule_notes, is_active) VALUES
('Satara Residence Gowa',  'Bank BTN',  5000000000, '2023-02-01', 24, 12.5, 'Cicilan Rp 248jt/bulan', true),
('Satara Hills Maros',     'Bank BRI',  4000000000, '2024-03-01', 24, 12.5, 'Cicilan Rp 198jt/bulan', true),
('Satara Garden Takalar',  'Bank BTN',  6000000000, '2022-10-01', 24, 12.0, 'Cicilan Rp 282jt/bulan', false),
('Satara City Makassar',   'Bank Mandiri',5000000000, NULL,        24, 13.0, 'Belum cair, menunggu perizinan', false),
('Satara Park Bone',       'Bank BNI',  4500000000, '2021-08-01', 24, 12.0, 'Cicilan Rp 211jt/bulan', false);

INSERT INTO finance_kpp_payments (kpp_id, payment_date, principal_paid, interest_paid, notes) VALUES
(1,'2023-03-01',150000000, 52083333, 'Bulan 1'),
(1,'2023-04-01',150000000, 50172917, 'Bulan 2'),
(1,'2023-05-01',150000000, 48243229, 'Bulan 3'),
(1,'2023-06-01',150000000, 46294274, 'Bulan 4'),
(1,'2023-07-01',150000000, 44326870, 'Bulan 5'),
(1,'2023-08-01',150000000, 42340834, 'Bulan 6'),
(2,'2024-04-01',125000000, 41666667, 'Bulan 1'),
(2,'2024-05-01',125000000, 40319010, 'Bulan 2'),
(5,'2021-09-01',140625000, 45000000, 'Bulan 1'),
(5,'2021-10-01',140625000, 43535156, 'Bulan 2'),
(5,'2021-11-01',140625000, 42055816, 'Bulan 3'),
(5,'2021-12-01',140625000, 42055816, 'Bulan 4');

INSERT INTO finance_debt_records (upload_id, project_name, stage_info, creditor_name, category, total_amount, paid_amount, remaining_amount, due_date, status, notes) VALUES
(6, 'Satara Residence Gowa',  'T1', 'Bank BTN',           'KPP',           5000000000, 4200000000, 800000000,  '2025-02-01', 'outstanding', 'Sisa 6 bulan'),
(6, 'Satara Hills Maros',     'T1', 'Bank BRI',           'KPP',           4000000000, 250000000,  3750000000, '2026-03-01', 'outstanding', 'Baru bulan 2'),
(6, 'Satara Residence Gowa',  'T2', 'CV Mitra Konstruksi','Hutang Subkon',  45000000,   21250000,   23750000,   '2024-09-01', 'outstanding', 'Menunggu termin 2'),
(6, 'Satara Hills Maros',     'T1', 'CV Graha Utama',     'Hutang Subkon',  51000000,   19800000,   31200000,   '2024-10-01', 'outstanding', NULL),
(6, 'Satara Development',     NULL, 'Supplier Semen Jaya','Hutang Supplier',85000000,   60000000,   25000000,   '2024-05-30', 'outstanding', 'Net 30 hari'),
(6, 'Satara City Makassar',   'T1', 'Notaris H. Mappasatu','Biaya Legal',   35000000,   20000000,   15000000,   '2024-07-01', 'outstanding', NULL);

INSERT INTO finance_receivable_records (upload_id, debtor_name, category, total_amount, due_date, status, notes) VALUES
(7, 'BTN - Realisasi Akad Budi Hartono', 'KPR/HT',  256500000, '2024-05-05', 'current', 'Estimasi cair Mei 2024'),
(7, 'BNI - Realisasi HT Hendra',         'KPR/HT',  378000000, '2024-06-10', 'current', 'Proses HT'),
(7, 'Customer DP - Aminah Putri',         'DP',       42000000,  NULL,          'current', 'DP sudah masuk'),
(7, 'BTN - SP3K Rudi Santoso',           'SP3K',     310500000, '2024-06-20', 'current', 'Menunggu akad'),
(7, 'BRI - Realisasi Akad Maros x3',     'KPR/HT',  780000000, '2024-07-01', 'current', 'Pipeline kuat'),
(7, 'Retensi CV Bangun Jaya',            'Retensi',   4000000,  '2024-03-15', 'overdue', 'Sudah jatuh tempo'),
(7, 'Retensi CV Bone Konstruksi T1',     'Retensi',   4000000,  '2022-12-25', 'settled', 'Sudah dibayar');

INSERT INTO finance_audit_findings (upload_id, finding_type, description, transaction_date, amount, status, reviewed_by, resolution_notes) VALUES
(5, 'Selisih RAB',        'RAB finishing T1 Gowa realisasi kurang Rp10jt dari anggaran',  '2024-02-15', 10000000,  'ditutup',  'Hendra Kusuma', 'Selisih wajar, dalam toleransi 3%'),
(6, 'Keterlambatan Bayar','Invoice subkon Maros terlambat 15 hari dari jatuh tempo',      '2024-03-10', 19800000,  'proses',   'Hendra Kusuma', 'Menunggu approval direktur'),
(6, 'Dokumen Tidak Lengkap','SPK subkon T2 belum ditandatangani lengkap',                 '2024-01-20', NULL,       'baru',     NULL,             NULL),
(7, 'Piutang Jatuh Tempo','Retensi CV Bangun Jaya sudah melewati tanggal pelepasan',      '2024-03-15', 4000000,   'proses',   'Hendra Kusuma', 'Koordinasi dengan subkon');

INSERT INTO finance_alerts (alert_type, level, message, amount, related_module, is_read, action_notes) VALUES
('kas_rendah',         'warning', 'Saldo kas mendekati batas minimum proyek Maros',          500000000, 'cashflow',   false, NULL),
('hutang_jatuh_tempo', 'danger',  'Retensi CV Bangun Jaya Rp4jt lewat jatuh tempo',          4000000,   'hutang',     false, NULL),
('target_sales',       'info',    'Pencapaian sales Maros baru 24% dari target Q2',           NULL,      'marketing',  true,  'Sudah dilaporkan ke direksi'),
('kpp_cicilan',        'warning', 'Cicilan KPP Maros jatuh tempo 3 hari lagi',               198000000, 'kpp',        false, NULL),
('rework_backlog',     'info',    '3 unit Gowa masih memiliki defect terbuka',                NULL,      'konstruksi', false, NULL),
('piutang_tinggi',     'warning', 'Total piutang KPR menunggu realisasi Rp1.7M',             1725000000,'piutang',    false, NULL);

INSERT INTO finance_expansion_analyses (scenario_name, scenario_type, input_data, ai_output, ai_verdict, created_by) VALUES
('Ekspansi Wajo - Analisis Awal', 'new_project', '{"kabupaten":"Wajo","lahan":5000,"harga":250000000,"unit":60}', 'Berdasarkan data pasar Wajo, permintaan perumahan FLPP cukup tinggi dengan backlog ~5000 unit. ROI estimasi 45-55% dalam 3 tahun. Risiko utama: infrastruktur jalan belum optimal.', 'LAYAK - Rekomendasikan survei lapangan lanjut', 'admin'),
('Skenario Ekspansi Pangkep',     'expansion',   '{"kabupaten":"Pangkep","lahan":4000,"harga":265000000,"unit":50}','Pangkep memiliki pertumbuhan penduduk 2.5%/tahun dengan ASN dominan. Permintaan perumahan subsidi kuat. Estimasi ROI 40-48%.', 'LAYAK BERSYARAT - Perlu verifikasi akses jalan', 'admin');


-- ==============================================================
-- 21. HR DATA
-- ==============================================================
INSERT INTO hr_employees (id, employee_code, name, division, position, direct_manager_id, employment_status, join_date, location, phone, email) VALUES
(1,  'EMP001', 'Budi Santoso',      'Manajemen',    'Direktur Operasional',    NULL, 'aktif', '2019-01-15', 'Makassar', '0811111001', 'budi.santoso@satara.id'),
(2,  'EMP002', 'Andi Wijaya',       'Manajemen',    'Manajer Proyek',           1,   'aktif', '2019-03-01', 'Makassar', '0811111002', 'andi.wijaya@satara.id'),
(3,  'EMP003', 'Reza Pratama',      'Produksi',     'Site Manager Gowa',        2,   'aktif', '2020-05-15', 'Gowa',     '0811111003', 'reza.pratama@satara.id'),
(4,  'EMP004', 'Dewi Lestari',      'Marketing',    'Marketing Manager',        1,   'aktif', '2019-06-01', 'Makassar', '0811111004', 'dewi.lestari@satara.id'),
(5,  'EMP005', 'Hendra Kusuma',     'Finance',      'Finance Manager',          1,   'aktif', '2019-08-15', 'Makassar', '0811111005', 'hendra.kusuma@satara.id'),
(6,  'EMP006', 'Siti Rahma',        'HR',           'HR Manager',               1,   'aktif', '2020-01-10', 'Makassar', '0811111006', 'siti.rahma@satara.id'),
(7,  'EMP007', 'Fajar Nugroho',     'Legal',        'Legal Manager',            1,   'aktif', '2020-03-15', 'Makassar', '0811111007', 'fajar.nugroho@satara.id'),
(8,  'EMP008', 'Putri Anggraini',   'Administrasi', 'Admin Senior',             6,   'aktif', '2021-01-15', 'Makassar', '0811111008', 'putri.anggraini@satara.id'),
(9,  'EMP009', 'Dimas Ardianto',    'Produksi',     'Site Manager Takalar',     2,   'aktif', '2021-02-01', 'Takalar',  '0811111009', 'dimas.ardianto@satara.id'),
(10, 'EMP010', 'Yuni Astuti',       'Marketing',    'Sales Executive',          4,   'aktif', '2021-05-15', 'Makassar', '0811111010', 'yuni.astuti@satara.id'),
(11, 'EMP011', 'Bayu Setiawan',     'Marketing',    'Sales Executive',          4,   'aktif', '2021-07-01', 'Makassar', '0811111011', 'bayu.setiawan@satara.id'),
(12, 'EMP012', 'Lilis Suryani',     'Finance',      'Finance Staff',            5,   'aktif', '2022-01-10', 'Makassar', '0811111012', 'lilis.suryani@satara.id'),
(13, 'EMP013', 'Agus Pramono',      'Produksi',     'QC Inspector',             3,   'aktif', '2022-03-01', 'Gowa',     '0811111013', 'agus.pramono@satara.id'),
(14, 'EMP014', 'Nita Rahayu',       'HR',           'HR Staff',                 6,   'aktif', '2022-05-15', 'Makassar', '0811111014', 'nita.rahayu@satara.id'),
(15, 'EMP015', 'Rizki Firmansyah',  'Produksi',     'Site Supervisor Bone',     9,   'aktif', '2021-06-01', 'Bone',     '0811111015', 'rizki.firmansyah@satara.id'),
(16, 'EMP016', 'Citra Dewi',        'Marketing',    'Marketing Digital Staff',  4,   'aktif', '2022-08-01', 'Makassar', '0811111016', 'citra.dewi@satara.id'),
(17, 'EMP017', 'Wahyu Hidayat',     'Legal',        'Legal Staff',              7,   'aktif', '2022-09-15', 'Makassar', '0811111017', 'wahyu.hidayat@satara.id'),
(18, 'EMP018', 'Eko Prasetyo',      'Produksi',     'Procurement Officer',      2,   'aktif', '2023-01-10', 'Makassar', '0811111018', 'eko.prasetyo@satara.id'),
(19, 'EMP019', 'Mega Sari',         'Administrasi', 'Admin Staff',              8,   'aktif', '2023-03-15', 'Makassar', '0811111019', 'mega.sari@satara.id'),
(20, 'EMP020', 'Teguh Santoso',     'Produksi',     'Site Supervisor Takalar',  9,   'aktif', '2021-09-01', 'Takalar',  '0811111020', 'teguh.santoso@satara.id');

INSERT INTO hr_recruitment_needs (position_name, division, location, headcount_needed, headcount_filled, target_hire_date, job_description, minimum_qualification, pic_recruiter, status) VALUES
('Site Manager Maros',    'Produksi',   'Maros',    1, 0, '2024-06-30', 'Mengelola konstruksi proyek Maros', 'S1 Sipil, min 5 thn',  'Siti Rahma', 'dibuka'),
('Sales Executive Bone',  'Marketing',  'Bone',     2, 1, '2024-07-31', 'Penjualan unit proyek Bone T2',     'D3/S1, min 2 thn',     'Nita Rahayu','dibuka'),
('Finance Analyst',       'Finance',    'Makassar', 1, 0, '2024-07-31', 'Analisa keuangan multi proyek',     'S1 Akuntansi, min 3 thn','Siti Rahma','dibuka'),
('Site Supervisor Makassar','Produksi', 'Makassar', 2, 0, '2024-08-31', 'Supervisor lapangan Makassar',      'D3 Sipil, min 3 thn',  'Siti Rahma', 'dibuka'),
('Legal Officer Junior',  'Legal',      'Makassar', 1, 1, '2024-05-31', 'Pengurusan perizinan',              'S1 Hukum',             'Siti Rahma', 'diisi');

INSERT INTO hr_recruitment_candidates (need_id, name, phone, source, stage, stage_date, recruiter_notes) VALUES
(1, 'Ahmad Ridwan',        '0812001001', 'LinkedIn',   'wawancara_2',    '2024-05-15', 'Kandidat kuat, pengalaman relevan'),
(1, 'Deni Kusuma',         '0812001002', 'Referral',   'screening_cv',   '2024-05-10', 'CV bagus, perlu dicek referensi'),
(2, 'Rina Puspita',        '0812001003', 'Jobstreet',  'offering',       '2024-05-20', 'Siap bergabung'),
(2, 'Hamdan Bakri',        '0812001004', 'Walk-in',    'psikotes',       '2024-05-12', 'Hasil psikotes bagus'),
(3, 'Muh. Farhan',         '0812001005', 'LinkedIn',   'wawancara_1',    '2024-05-18', 'Background keuangan proptek'),
(4, 'Syamsul Bahri',       '0812001006', 'Referral',   'screening_cv',   '2024-06-01', 'Masih proses review CV'),
(5, 'Nurfadilah Aziz',     '0812001007', 'Jobstreet',  'bergabung',      '2024-05-05', 'Sudah bergabung 5 Mei 2024');

INSERT INTO hr_kpi_definitions (id, position, division, kpi_name, description, unit, monthly_target, weight, data_source, source_module) VALUES
(1,  'Sales Executive',    'Marketing',   'Leads Masuk',          'Jumlah lead masuk per bulan',  'lead',    30,  20, 'otomatis',  'leads'),
(2,  'Sales Executive',    'Marketing',   'Konversi Booking',     'Booking / Lead x 100%',        '%',       15,  25, 'otomatis',  'leads'),
(3,  'Sales Executive',    'Marketing',   'Target Unit Terjual',  'Jumlah unit terjual per bulan','unit',    4,   30, 'otomatis',  'units'),
(4,  'Sales Executive',    'Marketing',   'Berkas Masuk ke Bank', 'Jumlah berkas dikirim bank',   'berkas',  5,   25, 'otomatis',  'customers'),
(5,  'Site Manager',       'Produksi',    'Progress Konstruksi',  'Progress % vs target per bulan','%',      5,   35, 'otomatis',  'units'),
(6,  'Site Manager',       'Produksi',    'Zero Defect Unit',     'Defect / unit selesai',        'defect',  0,   30, 'otomatis',  'qc_defects'),
(7,  'Site Manager',       'Produksi',    'Efisiensi Material',   'Varians penggunaan material',  '%',       5,   20, 'manual',    NULL),
(8,  'Site Manager',       'Produksi',    'On-Time Delivery',     'Unit selesai tepat waktu',     '%',       90,  15, 'manual',    NULL),
(9,  'Finance Manager',    'Finance',     'Akurasi Cashflow',     'Deviasi cashflow vs proyeksi', '%',       5,   40, 'manual',    NULL),
(10, 'Finance Manager',    'Finance',     'Collection Rate',      'Tagihan tertagih / total',     '%',       95,  35, 'manual',    NULL),
(11, 'HR Manager',         'HR',          'Filling Rate',         'Posisi terisi / dibuka',       '%',       80,  40, 'manual',    NULL),
(12, 'HR Manager',         'HR',          'Turnover Rate',        'Karyawan keluar / total',      '%',       5,   35, 'manual',    NULL),
(13, 'Marketing Manager',  'Marketing',   'Total Revenue Pipeline','Nilai pipeline active',       'Rp',      5000000000, 30, 'manual', NULL),
(14, 'Legal Manager',      'Legal',       'Penyelesaian Izin',    'Izin selesai per kuartal',     'izin',    3,   40, 'manual',    NULL),
(15, 'QC Inspector',       'Produksi',    'Defect Rate',          'Defect per 100 unit inspeksi', 'defect',  5,   50, 'otomatis',  'qc_defects');

INSERT INTO hr_kpi_records (employee_id, kpi_definition_id, period_year, period_month, target, actual, achievement_pct, notes) VALUES
-- Yuni Astuti (Sales Exec) - Jan-Apr 2024
(10, 1, 2024, 1, 30, 28, 93.3,  NULL), (10, 2, 2024, 1, 15, 12, 80.0,  NULL), (10, 3, 2024, 1, 4, 3, 75.0, NULL),
(10, 1, 2024, 2, 30, 32, 106.7, 'Lampaui target'), (10, 2, 2024, 2, 15, 16, 106.7, NULL), (10, 3, 2024, 2, 4, 4, 100.0, NULL),
(10, 1, 2024, 3, 30, 38, 126.7, 'Ramadan'), (10, 3, 2024, 3, 4, 5, 125.0, NULL),
(10, 1, 2024, 4, 30, 30, 100.0, NULL), (10, 3, 2024, 4, 4, 4, 100.0, NULL),
-- Bayu Setiawan (Sales Exec)
(11, 1, 2024, 1, 30, 22, 73.3, NULL), (11, 3, 2024, 1, 4, 2, 50.0, 'Perlu coaching'),
(11, 1, 2024, 2, 30, 25, 83.3, NULL), (11, 3, 2024, 2, 4, 3, 75.0, NULL),
(11, 1, 2024, 3, 30, 30, 100.0, NULL),(11, 3, 2024, 3, 4, 4, 100.0, NULL),
-- Reza Pratama (Site Manager)
(3,  5, 2024, 1, 5, 6, 120.0, 'Lebih cepat'), (3, 6, 2024, 1, 0, 2, 80.0, '2 defect ringan'),
(3,  5, 2024, 2, 5, 5, 100.0, NULL),          (3, 6, 2024, 2, 0, 1, 90.0, NULL),
(3,  5, 2024, 3, 5, 4, 80.0,  'Sedikit terlambat cuaca'), (3, 6, 2024, 3, 0, 0, 100.0, NULL),
-- Hendra Kusuma (Finance Manager)
(5,  9, 2024, 1, 5, 3.2, 136.0, 'Deviasi rendah'),
(5,  9, 2024, 2, 5, 4.8, 104.0, NULL),
(5,  10,2024, 1, 95, 92, 96.8,  NULL),
(5,  10,2024, 2, 95, 94, 98.9,  NULL);

INSERT INTO hr_competency_definitions (id, position, division, competency_name, description, target_score) VALUES
(1,  'Sales Executive',   'Marketing',  'Product Knowledge',       'Pengetahuan produk dan proyek', 85),
(2,  'Sales Executive',   'Marketing',  'Negosiasi',               'Kemampuan negosiasi dengan calon pembeli', 80),
(3,  'Sales Executive',   'Marketing',  'Customer Relationship',   'Membangun hubungan pelanggan', 85),
(4,  'Site Manager',      'Produksi',   'Manajemen Konstruksi',    'Kemampuan mengelola pekerjaan konstruksi', 85),
(5,  'Site Manager',      'Produksi',   'Quality Control',         'Kemampuan kontrol kualitas', 80),
(6,  'Site Manager',      'Produksi',   'Leadership',              'Kepemimpinan tim lapangan', 80),
(7,  'Finance Manager',   'Finance',    'Financial Analysis',      'Analisa laporan keuangan', 85),
(8,  'HR Manager',        'HR',         'Talent Acquisition',      'Rekrutmen dan seleksi', 80),
(9,  'Legal Manager',     'Legal',      'Hukum Properti',          'Pengetahuan hukum pertanahan', 85),
(10, 'All Positions',     'Semua',      'Komunikasi',              'Kemampuan komunikasi efektif', 80);

INSERT INTO hr_competency_scores (employee_id, competency_definition_id, actual_score, assessment_date, assessor, notes) VALUES
(10, 1, 88, '2024-01-15', 'Dewi Lestari',  NULL),
(10, 2, 82, '2024-01-15', 'Dewi Lestari',  NULL),
(10, 3, 85, '2024-01-15', 'Dewi Lestari',  NULL),
(11, 1, 80, '2024-01-15', 'Dewi Lestari',  NULL),
(11, 2, 75, '2024-01-15', 'Dewi Lestari',  'Perlu ditingkatkan'),
(11, 3, 82, '2024-01-15', 'Dewi Lestari',  NULL),
(3,  4, 90, '2024-01-20', 'Andi Wijaya',   NULL),
(3,  5, 88, '2024-01-20', 'Andi Wijaya',   NULL),
(3,  6, 85, '2024-01-20', 'Andi Wijaya',   NULL),
(5,  7, 92, '2024-01-25', 'Budi Santoso',  NULL),
(6,  8, 88, '2024-01-25', 'Budi Santoso',  NULL),
(7,  9, 90, '2024-01-25', 'Budi Santoso',  NULL),
(4,  10,88, '2024-01-15', 'Budi Santoso',  NULL),
(3,  10,85, '2024-01-20', 'Andi Wijaya',   NULL);

INSERT INTO hr_training_programs (id, name, type, competency_id, training_date, duration_hours, organizer, cost, status, evaluation_score, notes) VALUES
(1, 'Sales Training: Teknik Closing Property', 'hard_skill', 2, '2024-02-10', 8,  'SalesPro Indonesia',    5000000,  'selesai', 82, NULL),
(2, 'Workshop QC Konstruksi',                 'hard_skill', 5, '2024-02-17', 16, 'LPJKN',                 8000000,  'selesai', 88, NULL),
(3, 'Leadership & Manajemen Tim',             'soft_skill', 6, '2024-03-09', 8,  'ManagementPro',         6000000,  'selesai', 85, NULL),
(4, 'SOP & Compliance Properti',              'regulatory', NULL,'2024-03-23', 8, 'REI Sulsel',            3000000,  'selesai', 80, NULL),
(5, 'Perizinan KKPR dan PBG Terbaru',         'regulatory', 9, '2024-04-06', 8,  'ATRBPN Sulsel',         2000000,  'selesai', 87, NULL),
(6, 'Digital Marketing Properti',             'hard_skill', NULL,'2024-04-20', 8, 'DigitalPro ID',         5500000,  'selesai', 83, NULL),
(7, 'Manajemen Keuangan Proyek',              'hard_skill', 7, '2024-05-18', 16, 'Ikatan Akuntan Ind',    7500000,  'direncanakan',NULL,NULL),
(8, 'K3 Konstruksi',                          'regulatory', NULL,'2024-06-08', 16,'Dinas Tenaga Kerja',    2500000,  'direncanakan',NULL,NULL);

INSERT INTO hr_training_participants (training_id, employee_id) VALUES
(1, 10),(1, 11),(1, 16),
(2, 3),(2, 9),(2, 13),(2, 15),(2, 20),
(3, 2),(3, 3),(3, 4),(3, 5),(3, 6),(3, 7),
(4, 8),(4, 14),(4, 17),(4, 19),
(5, 7),(5, 17),
(6, 4),(6, 10),(6, 11),(6, 16);

INSERT INTO hr_compensation_records (employee_id, period_year, period_month, base_salary, fixed_allowance, performance_bonus, incentive, thr, deduction, total_take_home) VALUES
(1,  2024, 1, 15000000, 5000000, 5000000, 0, 0, 0, 25000000),
(1,  2024, 2, 15000000, 5000000, 5000000, 0, 0, 0, 25000000),
(1,  2024, 3, 15000000, 5000000, 7500000, 0, 15000000, 0, 42500000),
(2,  2024, 1, 12000000, 3500000, 3000000, 0, 0, 0, 18500000),
(3,  2024, 1, 8000000,  2500000, 2000000, 0, 0, 0, 12500000),
(4,  2024, 1, 10000000, 3000000, 3500000, 0, 0, 0, 16500000),
(5,  2024, 1, 10000000, 3000000, 3000000, 0, 0, 0, 16000000),
(6,  2024, 1, 8500000,  2500000, 2000000, 0, 0, 0, 13000000),
(10, 2024, 1, 5000000,  1500000, 0,        4500000, 0, 0, 11000000),
(10, 2024, 2, 5000000,  1500000, 0,        6000000, 0, 0, 12500000),
(10, 2024, 3, 5000000,  1500000, 0,        7500000, 0, 15000000, 29000000),
(11, 2024, 1, 5000000,  1500000, 0,        3000000, 0, 0, 9500000),
(11, 2024, 2, 5000000,  1500000, 0,        4500000, 0, 0, 11000000);

INSERT INTO hr_culture_records (employee_id, period_year, period_month, days_present, working_days, late_count, discipline_violations, sop_compliance_score, task_completion_score) VALUES
(1,  2024, 1, 22, 22, 0, 0, 98, 98),
(2,  2024, 1, 21, 22, 1, 0, 95, 96),
(3,  2024, 1, 22, 22, 0, 0, 92, 95),
(4,  2024, 1, 22, 22, 0, 0, 95, 97),
(5,  2024, 1, 21, 22, 0, 0, 98, 98),
(6,  2024, 1, 22, 22, 0, 0, 96, 95),
(10, 2024, 1, 20, 22, 2, 0, 88, 90),
(11, 2024, 1, 19, 22, 3, 1, 82, 85),
(13, 2024, 1, 22, 22, 0, 0, 94, 96),
(15, 2024, 1, 21, 22, 1, 0, 90, 92),
(1,  2024, 2, 21, 21, 0, 0, 98, 98),
(3,  2024, 2, 21, 21, 0, 0, 93, 96),
(10, 2024, 2, 20, 21, 1, 0, 90, 92),
(11, 2024, 2, 18, 21, 3, 0, 83, 86);

INSERT INTO hr_workload_records (division, period_year, period_month, capacity, actual_load, load_description) VALUES
('Produksi',     2024, 1, 100, 95,  '5 proyek aktif, 3 site manager'),
('Produksi',     2024, 2, 100, 98,  'Peak konstruksi T2 Gowa + Takalar'),
('Produksi',     2024, 3, 100, 110, 'Overload - butuh site manager Maros'),
('Marketing',    2024, 1, 100, 88,  '2 sales exec + 1 digital'),
('Marketing',    2024, 2, 100, 105, 'Grand Launch Maros'),
('Marketing',    2024, 3, 100, 115, 'Ramadan Campaign semua proyek'),
('Finance',      2024, 1, 100, 80,  'Normal'),
('Finance',      2024, 2, 100, 85,  'Rekonsiliasi proyek banyak'),
('HR',           2024, 1, 100, 75,  'Rekrutmen 5 posisi'),
('Legal',        2024, 1, 100, 90,  'Pengurusan izin 3 proyek'),
('Legal',        2024, 2, 100, 95,  'Masalah klaim lahan T2 Gowa'),
('Administrasi', 2024, 1, 100, 78,  'Normal');

INSERT INTO hr_succession_plans (critical_position, current_holder_id, backup1_id, backup1_readiness, backup2_id, backup2_readiness, notes) VALUES
('Direktur Operasional',    1, 2, 'siap_6_bulan',  4, 'siap_12_bulan', 'Andi dan Dewi adalah kandidat'),
('Manajer Proyek',          2, 3, 'siap_12_bulan', 9, 'siap_18_bulan', 'Butuh peningkatan kompetensi'),
('Finance Manager',         5, 12,'siap_18_bulan', NULL,NULL,           'Lilis butuh pengalaman lebih'),
('Marketing Manager',       4, 10,'siap_12_bulan', 11, 'siap_18_bulan','Yuni cukup siap'),
('HR Manager',              6, 14,'siap_18_bulan', NULL,NULL,           'Nita perlu development lebih');

INSERT INTO hr_expansion_needs (project_name, position_name, headcount, min_competency_score, min_kpi_achievement) VALUES
('Satara Hills Maros',    'Site Manager',       1, 80, 80),
('Satara City Makassar',  'Site Manager',       1, 80, 80),
('Satara City Makassar',  'Site Supervisor',    2, 75, 75),
('Satara Hills Maros',    'Sales Executive',    1, 75, 75),
('Semua Proyek',          'QC Inspector',       2, 80, 80);

INSERT INTO hr_flight_risk_records (employee_id, period_year, period_quarter, months_without_promotion, salary_market_gap_pct, job_satisfaction_score, has_external_offer, flight_risk_score, risk_level, notes) VALUES
(10, 2024, 1, 24, -5.0,  7.5, 'tidak',  35, 'rendah',  'Puas dengan insentif'),
(11, 2024, 1, 18, -8.0,  6.0, 'ya',     68, 'tinggi',  'Ada tawaran dari developer lain'),
(3,  2024, 1, 36, -10.0, 7.0, 'tidak',  45, 'sedang',  'Sudah lama tidak promosi'),
(15, 2024, 1, 30, -12.0, 6.5, 'tidak',  52, 'sedang',  'Lokasi jauh dari keluarga'),
(12, 2024, 1, 14, -3.0,  8.0, 'tidak',  25, 'rendah',  NULL),
(16, 2024, 1, 20, -6.0,  7.8, 'tidak',  30, 'rendah',  NULL),
(13, 2024, 1, 24, -8.0,  7.0, 'tidak',  40, 'sedang',  'Ingin rotasi ke kantor pusat');

INSERT INTO hr_career_paths (division, level, position_name, previous_position, min_tenure_months, min_kpi_achievement, min_competency_score) VALUES
('Marketing',  1, 'Sales Staff',          NULL,                 0,  0,  70),
('Marketing',  2, 'Sales Executive',      'Sales Staff',        12, 75, 75),
('Marketing',  3, 'Senior Sales',         'Sales Executive',    24, 80, 80),
('Marketing',  4, 'Team Leader Sales',    'Senior Sales',       36, 85, 82),
('Marketing',  5, 'Marketing Manager',    'Team Leader Sales',  48, 88, 85),
('Produksi',   1, 'Mandor',               NULL,                 0,  0,  70),
('Produksi',   2, 'Site Supervisor',      'Mandor',             24, 75, 75),
('Produksi',   3, 'Site Manager',         'Site Supervisor',    36, 80, 80),
('Produksi',   4, 'Project Manager',      'Site Manager',       48, 85, 85),
('Finance',    1, 'Finance Staff',        NULL,                 0,  0,  70),
('Finance',    2, 'Finance Analyst',      'Finance Staff',      18, 78, 78),
('Finance',    3, 'Finance Manager',      'Finance Analyst',    36, 85, 82),
('HR',         1, 'HR Staff',             NULL,                 0,  0,  70),
('HR',         2, 'HR Specialist',        'HR Staff',           18, 78, 78),
('HR',         3, 'HR Manager',           'HR Specialist',      36, 82, 80);

INSERT INTO hr_productivity_records (period_year, period_month, total_revenue, total_profit, total_units_sold, notes) VALUES
(2024, 1, 765000000,  298350000, 3, 'HT 2 unit Bone + 1 Gowa'),
(2024, 2, 1050000000, 430500000, 4, 'Booking fee + HT Gowa'),
(2024, 3, 1280000000, 524800000, 5, 'Ramadan boost Gowa Maros'),
(2024, 4, 840000000,  344400000, 3, 'HT Bone + pipeline'),
(2023, 10,680000000,  265200000, 3, NULL),
(2023, 11,920000000,  368000000, 4, NULL),
(2023, 12,1100000000, 462000000, 5, 'Akhir tahun strong');

INSERT INTO hr_attendance_records (employee_id, employee_name, project_id, project, month, year, day, status) VALUES
(3, 'Reza Pratama',    1, 'Satara Residence Gowa', 'Januari', 2024, 2,  'hadir'),
(3, 'Reza Pratama',    1, 'Satara Residence Gowa', 'Januari', 2024, 3,  'hadir'),
(3, 'Reza Pratama',    1, 'Satara Residence Gowa', 'Januari', 2024, 8,  'hadir'),
(3, 'Reza Pratama',    1, 'Satara Residence Gowa', 'Januari', 2024, 9,  'hadir'),
(3, 'Reza Pratama',    1, 'Satara Residence Gowa', 'Januari', 2024, 15, 'hadir'),
(3, 'Reza Pratama',    1, 'Satara Residence Gowa', 'Januari', 2024, 22, 'hadir'),
(15,'Rizki Firmansyah',5, 'Satara Park Bone',      'Januari', 2024, 2,  'hadir'),
(15,'Rizki Firmansyah',5, 'Satara Park Bone',      'Januari', 2024, 3,  'hadir'),
(15,'Rizki Firmansyah',5, 'Satara Park Bone',      'Januari', 2024, 5,  'izin'),
(15,'Rizki Firmansyah',5, 'Satara Park Bone',      'Januari', 2024, 8,  'hadir'),
(20,'Teguh Santoso',   3, 'Satara Garden Takalar', 'Januari', 2024, 2,  'hadir'),
(20,'Teguh Santoso',   3, 'Satara Garden Takalar', 'Januari', 2024, 3,  'hadir'),
(20,'Teguh Santoso',   3, 'Satara Garden Takalar', 'Januari', 2024, 15, 'terlambat'),
(13,'Agus Pramono',    1, 'Satara Residence Gowa', 'Januari', 2024, 2,  'hadir'),
(13,'Agus Pramono',    1, 'Satara Residence Gowa', 'Januari', 2024, 8,  'hadir'),
(13,'Agus Pramono',    1, 'Satara Residence Gowa', 'Februari',2024, 5,  'hadir'),
(13,'Agus Pramono',    1, 'Satara Residence Gowa', 'Februari',2024, 6,  'hadir');

INSERT INTO hr_overtime_records (employee_id, employee_name, project_id, project, month, year, day, terlambat_menit, lembur_jam) VALUES
(3,  'Reza Pratama',    1, 'Satara Residence Gowa', 'Februari', 2024, 10, 0,  3.0),
(3,  'Reza Pratama',    1, 'Satara Residence Gowa', 'Maret',    2024, 16, 0,  4.0),
(9,  'Dimas Ardianto',  3, 'Satara Garden Takalar', 'Januari',  2024, 13, 0,  2.5),
(9,  'Dimas Ardianto',  3, 'Satara Garden Takalar', 'Januari',  2024, 20, 0,  3.0),
(15, 'Rizki Firmansyah',5, 'Satara Park Bone',      'Januari',  2024, 5,  15, 0),
(20, 'Teguh Santoso',   3, 'Satara Garden Takalar', 'Januari',  2024, 15, 30, 0),
(13, 'Agus Pramono',    1, 'Satara Residence Gowa', 'Maret',    2024, 9,  0,  2.0),
(10, 'Yuni Astuti',     1, 'Satara Residence Gowa', 'Maret',    2024, 16, 0,  1.5),
(11, 'Bayu Setiawan',   2, 'Satara Hills Maros',    'Februari', 2024, 24, 0,  2.0);

INSERT INTO hr_individual_issues (project_id, project, tanggal, divisi, nama, masalah, solusi, deadline, keterangan) VALUES
(1, 'Satara Residence Gowa',  '2024-03-15', 'Produksi',  'Reza Pratama',    'Keterlambatan material T2 akibat vendor telat',   'Ganti vendor alternatif, stok minimal 2 minggu', '2024-04-01', 'Selesai'),
(2, 'Satara Hills Maros',     '2024-04-10', 'Marketing', 'Bayu Setiawan',   'Target berkas bulan April tidak tercapai',        'Coaching intensif, bantu proses dokumen',        '2024-05-15', 'Proses'),
(3, 'Satara Garden Takalar',  '2024-02-20', 'Produksi',  'Dimas Ardianto',  'Konflik dengan subkon terkait scope pekerjaan',   'Klarifikasi kontrak, mediasi bersama PM',        '2024-03-10', 'Selesai'),
(1, 'Satara Residence Gowa',  '2024-04-25', 'Produksi',  'Agus Pramono',    'Defect rate unit T1 melebihi batas 5%',           'Peningkatan checklist QC, training tim mandor',  '2024-05-15', 'Proses'),
(NULL, NULL,                  '2024-03-01', 'Marketing', 'Bayu Setiawan',   'Performance kurang, 2 bulan berturut-turut',      'PIP selama 3 bulan dengan target terukur',       '2024-06-01', 'Monitoring');


-- ==============================================================
-- Verifikasi data berhasil diinput
-- ==============================================================
SELECT 'Projects'    AS tabel, COUNT(*) AS total FROM projects
UNION ALL SELECT 'Units',        COUNT(*) FROM units
UNION ALL SELECT 'Customers',    COUNT(*) FROM customers
UNION ALL SELECT 'Leads',        COUNT(*) FROM leads
UNION ALL SELECT 'Employees',    COUNT(*) FROM hr_employees
UNION ALL SELECT 'Materials',    COUNT(*) FROM materials
UNION ALL SELECT 'Campaigns',    COUNT(*) FROM campaigns
UNION ALL SELECT 'Competitors',  COUNT(*) FROM competitors
UNION ALL SELECT 'Cashflow Rec', COUNT(*) FROM finance_cashflow_records
UNION ALL SELECT 'Milestones',   COUNT(*) FROM planning_milestones;
