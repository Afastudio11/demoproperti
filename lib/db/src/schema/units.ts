import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  contractId: integer("contract_id"),
  customerId: integer("customer_id"),
  blok: text("blok").notNull(),
  nomor: text("nomor").notNull(),
  tipe: text("tipe").notNull(),
  harga: real("harga").notNull(),
  status: text("status").notNull().default("available"),
  progress: real("progress").notNull().default(0),
  readyAkad: boolean("ready_akad").notNull().default(false),
  stageCode: text("stage_code"),
  kavlingNumber: text("kavling_number"),
  adminStatus: text("admin_status").notNull().default("stock"),
  htValue: real("ht_value"),
  weekStarted: integer("week_started"),
  subkonName: text("subkon_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
