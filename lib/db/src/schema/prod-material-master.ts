import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prodMaterialMasterTable = pgTable("prod_material_master", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  satuan: text("satuan").notNull(),
  standardPerUnit: real("standard_per_unit"),
  unitPrice: real("unit_price"),
  minimumStock: real("minimum_stock").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProdMaterialMasterSchema = createInsertSchema(prodMaterialMasterTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProdMaterialMaster = z.infer<typeof insertProdMaterialMasterSchema>;
export type ProdMaterialMaster = typeof prodMaterialMasterTable.$inferSelect;
