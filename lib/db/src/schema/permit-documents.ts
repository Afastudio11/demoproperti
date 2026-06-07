import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";

export const permitDocumentsTable = pgTable("permit_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  permitGroup: text("permit_group").notNull(), // perizinan_dasar, perizinan_bangunan, izin_teknis
  permitName: text("permit_name").notNull(), // KKPR, PBG, SLF, dll
  institution: text("institution"),
  status: text("status").notNull().default("belum_diajukan"), // belum_diajukan, dalam_proses, selesai, tidak_diperlukan
  submissionDate: date("submission_date"),
  targetDate: date("target_date"),
  actualDate: date("actual_date"),
  documentNumber: text("document_number"),
  pic: text("pic"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const permitStatusHistoryTable = pgTable("permit_status_history", {
  id: serial("id").primaryKey(),
  permitId: integer("permit_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"),
  notes: text("notes"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PermitDocument = typeof permitDocumentsTable.$inferSelect;
export type PermitStatusHistory = typeof permitStatusHistoryTable.$inferSelect;
