import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prodMaterialStandardsTable = pgTable("prod_material_standards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  stageCode: text("stage_code"),
  subkonId: integer("subkon_id"),
  subkonName: text("subkon_name"),
  unitBatchLabel: text("unit_batch_label"),
  referenceUnitCount: real("reference_unit_count").notNull().default(1),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("aktif"),
  effectiveDate: text("effective_date"),
  category: text("category").notNull(),
  subMaterial: text("sub_material"),
  materialName: text("material_name").notNull(),
  satuan: text("satuan").notNull(),
  plannedQuantity: real("planned_quantity").notNull().default(0),
  usedQuantity: real("used_quantity").notNull().default(0),
  createdBy: text("created_by").default("supervisor"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProdMaterialStandardSchema = createInsertSchema(prodMaterialStandardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProdMaterialStandard = z.infer<typeof insertProdMaterialStandardSchema>;
export type ProdMaterialStandard = typeof prodMaterialStandardsTable.$inferSelect;
