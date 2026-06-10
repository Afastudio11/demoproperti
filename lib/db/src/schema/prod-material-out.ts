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
  takenBy: text("taken_by"),
  subkonName: text("subkon_name"),
  dateOut: text("date_out").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProdMaterialOutSchema = createInsertSchema(prodMaterialOutTable).omit({ id: true, createdAt: true });
export type InsertProdMaterialOut = z.infer<typeof insertProdMaterialOutSchema>;
export type ProdMaterialOut = typeof prodMaterialOutTable.$inferSelect;
