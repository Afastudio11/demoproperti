-- 1. Insert Project (jika belum ada)
INSERT INTO projects (nama, lokasi, provinsi, kabupaten, kecamatan, desa, luas, total_unit, fase, status)
VALUES ('Proyek Perumahan Indah', 'Gowa', 'Sulawesi Selatan', 'Gowa', 'Somba Opu', 'Paccinongang', 10000, 50, 'KONSTRUKSI', 'active')
ON CONFLICT DO NOTHING;

-- Ambil project_id (baik baru maupun lama)
DO $$
DECLARE
    v_project_id integer;
    v_contract_id integer;
    v_payment_term_id integer;
    v_payment_id integer;
BEGIN
    SELECT id INTO v_project_id FROM projects WHERE nama = 'Proyek Perumahan Indah' LIMIT 1;
    
    -- 2. Insert Kontrak Subkon
    INSERT INTO subkon_contracts (
        project_id, stage_code, subkon_id, subkon_name, unit_count, value_per_unit, 
        contract_value, retention_per_unit, total_retention, net_payable_value, 
        maintenance_months, start_date, target_end_date, retention_status, status
    ) VALUES (
        v_project_id, 'STR', 1, 'PT Bangun Rekayasa Nusantara', 5, 12000000, 
        60000000, 6000000, 3000000, 57000000, 
        3, '2026-06-01', '2026-08-31', 'ditahan', 'aktif'
    ) RETURNING id INTO v_contract_id;

    -- 3. Insert Payment Term (Termin 1)
    INSERT INTO subkon_payment_terms (
        contract_id, termin_number, label, planned_date, payment_type, 
        gross_amount, retention_amount, net_amount, notes
    ) VALUES (
        v_contract_id, 1, 'Termin 1 (Progress 20%)', '2026-06-30', 'termin', 
        12000000, 600000, 11400000, 'Pembayaran termin 1 setelah progress struktur mencapai 20%'
    ) RETURNING id INTO v_payment_term_id;

    -- 4. Insert Pembayaran Subkon (Subkon Payment - Pending Approval)
    INSERT INTO subkon_payments (
        contract_id, payment_term_id, payment_type, termin_number, period, 
        progress_previous, progress_current, velocity, gross_eligible_amount, 
        retention_deducted, net_payment, total_paid_before, status, notes
    ) VALUES (
        v_contract_id, v_payment_term_id, 'termin', 1, '2026-06', 
        0.0, 20.0, 20.0, 12000000, 
        600000, 11400000, 0.0, 'pending_approval', 
        'Pengajuan pembayaran termin 1 PT Bangun Rekayasa Nusantara'
    ) RETURNING id INTO v_payment_id;

    -- 5. Insert Approval Record (Payment Approval - Pending)
    INSERT INTO payment_approvals (
        payment_id, step, approved_by, approved_at, status, notes
    ) VALUES (
        v_payment_id, 'finance', NULL, NULL, 'pending', 
        'Perlu approval finance untuk pembayaran termin 1'
    );

    RAISE NOTICE 'Berhasil menginput data contoh approval pembayaran subkon!';
END $$;
