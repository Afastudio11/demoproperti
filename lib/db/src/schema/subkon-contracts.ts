import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subkonContractsTable = pgTable("subkon_contracts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  stageCode: text("stage_code"),
  subkonId: integer("subkon_id"),
  subkonName: text("subkon_name").notNull(),
  unitCount: integer("unit_count").notNull(),
  valuePerUnit: real("value_per_unit").notNull(),
  contractValue: real("contract_value").notNull(),
  retentionPerUnit: real("retention_per_unit").notNull().default(500000),
  totalRetention: real("total_retention").notNull(),
  netPayableValue: real("net_payable_value").notNull(),
  maintenanceMonths: integer("maintenance_months").notNull().default(3),
  startDate: text("start_date"),
  targetEndDate: text("target_end_date"),
  actualCompletionDate: text("actual_completion_date"),
  retentionReleaseDate: text("retention_release_date"),
  retentionStatus: text("retention_status").notNull().default("ditahan"),
  status: text("status").notNull().default("aktif"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubkonContractSchema = createInsertSchema(subkonContractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubkonContract = z.infer<typeof insertSubkonContractSchema>;
export type SubkonContract = typeof subkonContractsTable.$inferSelect;
