import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  customerId: integer("customer_id"),
  blok: text("blok").notNull(),
  nomor: text("nomor").notNull(),
  tipe: text("tipe").notNull(),
  harga: real("harga").notNull(),
  status: text("status").notNull().default("available"),
  progress: real("progress").notNull().default(0),
  readyAkad: boolean("ready_akad").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
