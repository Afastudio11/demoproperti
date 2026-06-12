-- SATARA revision migration: finance, material, fasum, siteplan, audit.
-- Safe to rerun in PostgreSQL because every table/column uses IF NOT EXISTS.

ALTER TABLE fasum_progress ADD COLUMN IF NOT EXISTS subkon_name text;

ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS batch_unit_count real DEFAULT 1;
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS batch_units text;
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS batch_id text;
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS receiver_name text;
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'normal';
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS source_id integer;
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE prod_material_out ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'posted';
ALTER TABLE subkon_payments ADD COLUMN IF NOT EXISTS payment_term_id integer;

CREATE TABLE IF NOT EXISTS subkon_payment_terms (
  id serial PRIMARY KEY,
  contract_id integer NOT NULL,
  termin_number integer NOT NULL,
  label text NOT NULL,
  planned_date text,
  payment_type text NOT NULL DEFAULT 'termin',
  gross_amount real NOT NULL DEFAULT 0,
  retention_amount real NOT NULL DEFAULT 0,
  net_amount real NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prod_material_standards (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  stage_code text,
  subkon_name text,
  unit_batch_label text,
  reference_unit_count real NOT NULL DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'aktif',
  effective_date text,
  category text NOT NULL,
  sub_material text,
  material_name text NOT NULL,
  satuan text NOT NULL,
  planned_quantity real NOT NULL DEFAULT 0,
  used_quantity real NOT NULL DEFAULT 0,
  created_by text DEFAULT 'supervisor',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prod_material_standards ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE prod_material_standards ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aktif';
ALTER TABLE prod_material_standards ADD COLUMN IF NOT EXISTS effective_date text;
ALTER TABLE prod_material_standards ADD COLUMN IF NOT EXISTS created_by text DEFAULT 'supervisor';

CREATE TABLE IF NOT EXISTS planning_siteplans (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  land_prospect_id integer,
  title text NOT NULL DEFAULT 'Siteplan',
  image_data_url text,
  main_polygon jsonb,
  source text NOT NULL DEFAULT 'upload',
  is_locked integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planning_siteplans ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'upload';
ALTER TABLE planning_siteplans ADD COLUMN IF NOT EXISTS is_locked integer NOT NULL DEFAULT 0;
ALTER TABLE planning_siteplans ADD COLUMN IF NOT EXISTS image_transform jsonb;

CREATE TABLE IF NOT EXISTS planning_siteplan_shapes (
  id serial PRIMARY KEY,
  siteplan_id integer NOT NULL,
  project_id integer NOT NULL,
  shape_type text NOT NULL DEFAULT 'unit',
  label text NOT NULL,
  polygon jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  owner_name text,
  land_area real,
  price real,
  legal_status text,
  purchase_status text DEFAULT 'belum_dibeli',
  planned_units integer,
  unit_id integer,
  block_code text,
  unit_type text,
  subkon_name text,
  unit_status text DEFAULT 'belum_dibuka',
  progress real DEFAULT 0,
  customer_id integer,
  is_locked integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planning_siteplan_shapes ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE planning_siteplan_shapes ADD COLUMN IF NOT EXISTS is_locked integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS finance_akad_disbursements (
  id serial PRIMARY KEY,
  akad_id integer NOT NULL,
  customer_id integer NOT NULL,
  project_id integer,
  status_cair text NOT NULL DEFAULT 'belum_cair',
  tanggal_cair date,
  nominal_cair numeric(18,2) DEFAULT '0',
  bank_deduction numeric(18,2) DEFAULT '0',
  destination_account text,
  proof_url text,
  notes text,
  updated_by text DEFAULT 'finance',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_akad_disbursements ADD COLUMN IF NOT EXISTS bank_deduction numeric(18,2) DEFAULT '0';
ALTER TABLE finance_akad_disbursements ADD COLUMN IF NOT EXISTS destination_account text;
ALTER TABLE finance_akad_disbursements ADD COLUMN IF NOT EXISTS proof_url text;

CREATE TABLE IF NOT EXISTS finance_akad_disbursement_ledger (
  id serial PRIMARY KEY,
  akad_id integer NOT NULL,
  disbursement_id integer,
  customer_id integer NOT NULL,
  project_id integer,
  tanggal_cair date NOT NULL,
  nominal_cair numeric(18,2) NOT NULL DEFAULT '0',
  bank_deduction numeric(18,2) DEFAULT '0',
  destination_account text,
  proof_url text,
  notes text,
  created_by text DEFAULT 'finance',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_debt_records ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE finance_debt_records ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE finance_debt_records ADD COLUMN IF NOT EXISTS locked_by text;

CREATE TABLE IF NOT EXISTS app_audit_logs (
  id serial PRIMARY KEY,
  module text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  actor text DEFAULT 'system',
  before jsonb,
  after jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
