import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  unitId: integer("unit_id"),
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  kontak: text("kontak").notNull(),
  pekerjaan: text("pekerjaan"),
  bank: text("bank"),
  statusKpr: text("status_kpr").notNull().default("bi_checking"),
  berkasLengkap: boolean("berkas_lengkap").notNull().default(false),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
