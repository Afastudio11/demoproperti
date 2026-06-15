import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prodMaterialOutTable = pgTable("prod_material_out", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  contractId: integer("contract_id"),
  stageCode: text("stage_code"),
  unitId: integer("unit_id"),
  materialId: integer("material_id").notNull(),
  quantity: real("quantity").notNull(),
  batchId: text("batch_id"),
  batchUnitCount: real("batch_unit_count").default(1),
  batchUnits: text("batch_units"),
  takenBy: text("taken_by"),
  receiverName: text("receiver_name"),
  subkonId: integer("subkon_id"),
  subkonName: text("subkon_name"),
  sourceType: text("source_type").default("normal"),
  sourceId: integer("source_id"),
  proofUrl: text("proof_url"),
  approvalStatus: text("approval_status").notNull().default("posted"),
  dateOut: text("date_out").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProdMaterialOutSchema = createInsertSchema(prodMaterialOutTable).omit({ id: true, createdAt: true });
export type InsertProdMaterialOut = z.infer<typeof insertProdMaterialOutSchema>;
export type ProdMaterialOut = typeof prodMaterialOutTable.$inferSelect;
