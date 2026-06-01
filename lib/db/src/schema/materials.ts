import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const materialsTable = pgTable("materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  item: text("item").notNull(),
  stok: real("stok").notNull().default(0),
  satuan: text("satuan").notNull(),
  vendor: text("vendor"),
  harga: real("harga"),
  minimumStock: real("minimum_stock").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materialsTable.$inferSelect;
