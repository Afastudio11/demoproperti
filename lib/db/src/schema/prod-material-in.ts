import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prodMaterialInTable = pgTable("prod_material_in", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  contractId: integer("contract_id"),
  stageCode: text("stage_code"),
  unitId: integer("unit_id"),
  materialId: integer("material_id").notNull(),
  quantity: real("quantity").notNull(),
  supplier: text("supplier"),
  subkonId: integer("subkon_id"),
  subkonName: text("subkon_name"),
  documentNumber: text("document_number"),
  notes: text("notes"),
  dateIn: text("date_in").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProdMaterialInSchema = createInsertSchema(prodMaterialInTable).omit({ id: true, createdAt: true });
export type InsertProdMaterialIn = z.infer<typeof insertProdMaterialInSchema>;
export type ProdMaterialIn = typeof prodMaterialInTable.$inferSelect;
