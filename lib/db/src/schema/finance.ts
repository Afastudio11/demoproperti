import { pgTable, text, serial, timestamp, integer, numeric, date, boolean, jsonb } from "drizzle-orm/pg-core";

export const financeUploadsTable = pgTable("finance_uploads", {
  id: serial("id").primaryKey(),
  fileType: text("file_type").notNull(),
  fileName: text("file_name").notNull(),
  periodYear: integer("period_year"),
  periodMonth: integer("period_month"),
  rowCount: integer("row_count"),
  status: text("status").notNull().default("berhasil"),
  errorNotes: text("error_notes"),
  uploadedBy: text("uploaded_by").default("admin"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashflowRecordsTable = pgTable("finance_cashflow_records", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id"),
  transactionDate: date("transaction_date").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  projectName: text("project_name"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  description: text("description"),
  referenceNumber: text("reference_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rabItemsTable = pgTable("finance_rab_items", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id"),
  projectName: text("project_name").notNull(),
  stageCode: text("stage_code"),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category"),
  rabAmount: numeric("rab_amount", { precision: 18, scale: 2 }).notNull(),
  realizationAmount: numeric("realization_amount", { precision: 18, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kppFacilitiesTable = pgTable("finance_kpp_facilities", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  bankName: text("bank_name").notNull(),
  plafon: numeric("plafon", { precision: 18, scale: 2 }).notNull(),
  firstDisbursementDate: date("first_disbursement_date"),
  tenorMonths: integer("tenor_months"),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
  scheduleNotes: text("schedule_notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kppPaymentsTable = pgTable("finance_kpp_payments", {
  id: serial("id").primaryKey(),
  kppId: integer("kpp_id").notNull(),
  paymentDate: date("payment_date").notNull(),
  principalPaid: numeric("principal_paid", { precision: 18, scale: 2 }).notNull().default("0"),
  interestPaid: numeric("interest_paid", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const debtRecordsTable = pgTable("finance_debt_records", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id"),
  projectName: text("project_name"),
  stageInfo: text("stage_info"),
  creditorName: text("creditor_name").notNull(),
  category: text("category").notNull(),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 18, scale: 2 }).default("0"),
  remainingAmount: numeric("remaining_amount", { precision: 18, scale: 2 }).default("0"),
  landArea: numeric("land_area", { precision: 14, scale: 4 }),
  dueDate: date("due_date"),
  status: text("status").notNull().default("outstanding"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const receivableRecordsTable = pgTable("finance_receivable_records", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id"),
  debtorName: text("debtor_name").notNull(),
  category: text("category").notNull(),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
  dueDate: date("due_date"),
  status: text("status").notNull().default("current"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditFindingsTable = pgTable("finance_audit_findings", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id"),
  findingType: text("finding_type").notNull(),
  description: text("description").notNull(),
  transactionDate: date("transaction_date"),
  amount: numeric("amount", { precision: 18, scale: 2 }),
  status: text("status").notNull().default("baru"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financeAlertsTable = pgTable("finance_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }),
  relatedModule: text("related_module"),
  isRead: boolean("is_read").notNull().default(false),
  actionNotes: text("action_notes"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expansionAnalysesTable = pgTable("finance_expansion_analyses", {
  id: serial("id").primaryKey(),
  scenarioName: text("scenario_name").notNull(),
  scenarioType: text("scenario_type").notNull(),
  inputData: jsonb("input_data"),
  aiOutput: text("ai_output"),
  aiVerdict: text("ai_verdict"),
  createdBy: text("created_by").default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
