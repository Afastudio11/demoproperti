import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subkonMasterTable = pgTable("subkon_master", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  type: text("type").notNull().default("subkon"),
  picName: text("pic_name"),
  phone: text("phone"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  defaultValuePerUnit: integer("default_value_per_unit").notNull().default(0),
  defaultRetentionPerUnit: integer("default_retention_per_unit").notNull().default(500000),
  defaultMaintenanceMonths: integer("default_maintenance_months").notNull().default(3),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubkonMasterSchema = createInsertSchema(subkonMasterTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubkonMaster = z.infer<typeof insertSubkonMasterSchema>;
export type SubkonMaster = typeof subkonMasterTable.$inferSelect;
