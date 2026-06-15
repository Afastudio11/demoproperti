import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningStagesTable = pgTable("planning_stages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  stageCode: text("stage_code").notNull(),
  stageName: text("stage_name").notNull(),
  targetStart: text("target_start"),
  targetEnd: text("target_end"),
  status: text("status").notNull().default("draft"),
  totalUnits: integer("total_units").notNull().default(0),
  totalSalesValue: real("total_sales_value").notNull().default(0),
  totalSubkonValue: real("total_subkon_value").notNull().default(0),
  publishedAt: text("published_at"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planningStageBlocksTable = pgTable("planning_stage_blocks", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull(),
  projectId: integer("project_id").notNull(),
  stageCode: text("stage_code").notNull(),
  blockCode: text("block_code").notNull(),
  unitCount: integer("unit_count").notNull().default(0),
  unitType: text("unit_type").notNull().default("Tipe 36"),
  pricePerUnit: real("price_per_unit").notNull().default(0),
  salesValue: real("sales_value").notNull().default(0),
  subkonName: text("subkon_name"),
  subkonValuePerUnit: real("subkon_value_per_unit").notNull().default(0),
  subkonContractValue: real("subkon_contract_value").notNull().default(0),
  contractId: integer("contract_id"),
  targetStart: text("target_start"),
  targetEnd: text("target_end"),
  siteplanUnitCount: integer("siteplan_unit_count").notNull().default(0),
  validationStatus: text("validation_status").notNull().default("belum_digambar"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningStageSchema = createInsertSchema(planningStagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanningStageBlockSchema = createInsertSchema(planningStageBlocksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningStage = z.infer<typeof insertPlanningStageSchema>;
export type InsertPlanningStageBlock = z.infer<typeof insertPlanningStageBlockSchema>;
export type PlanningStage = typeof planningStagesTable.$inferSelect;
export type PlanningStageBlock = typeof planningStageBlocksTable.$inferSelect;
