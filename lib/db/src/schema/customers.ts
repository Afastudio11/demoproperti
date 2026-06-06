import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  unitId: integer("unit_id"),
  nama: text("nama").notNull(),
  nik: text("nik").notNull().default(""),
  kontak: text("kontak").notNull().default(""),
  pekerjaan: text("pekerjaan"),
  bank: text("bank"),
  statusKpr: text("status_kpr").notNull().default("bi_checking"),
  berkasLengkap: boolean("berkas_lengkap").notNull().default(false),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  stageCode: text("stage_code"),
  unitBlock: text("unit_block"),
  referralSource: text("referral_source"),
  picAdmin: text("pic_admin"),
  phone: text("phone"),
  dpAmount: numeric("dp_amount"),
  loanAmount: numeric("loan_amount"),
  htAmount: numeric("ht_amount"),
  unitPrice: numeric("unit_price"),
  bookingDate: text("booking_date"),
  akadDate: text("akad_date"),
  htDate: text("ht_date"),
  pipelineStatus: text("pipeline_status").default("MINAT"),
  statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
  alternativeSolution: text("alternative_solution"),
  followUp: text("follow_up"),
  paymentType: text("payment_type").default("KPR"),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
