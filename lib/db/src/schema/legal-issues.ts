import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";

export const legalIssuesTable = pgTable("legal_issues", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  title: text("title").notNull(),
  objectDescription: text("object_description"),
  category: text("category").notNull().default("lainnya"), // sengketa_batas, klaim_kepemilikan, masalah_shm, perizinan, lainnya
  riskLevel: text("risk_level").notNull().default("low"), // high, medium, low
  description: text("description"),
  status: text("status").notNull().default("aktif"), // aktif, mediasi, sidang, selesai, ditutup
  pic: text("pic"),
  startDate: date("start_date"),
  targetResolution: date("target_resolution"),
  completedDate: date("completed_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const legalIssueHistoryTable = pgTable("legal_issue_history", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"),
  notes: text("notes"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LegalIssue = typeof legalIssuesTable.$inferSelect;
export type LegalIssueHistory = typeof legalIssueHistoryTable.$inferSelect;
