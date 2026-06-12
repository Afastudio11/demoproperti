import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subkonPaymentTermsTable = pgTable("subkon_payment_terms", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  terminNumber: integer("termin_number").notNull(),
  label: text("label").notNull(),
  plannedDate: text("planned_date"),
  paymentType: text("payment_type").notNull().default("termin"),
  grossAmount: real("gross_amount").notNull().default(0),
  retentionAmount: real("retention_amount").notNull().default(0),
  netAmount: real("net_amount").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubkonPaymentTermSchema = createInsertSchema(subkonPaymentTermsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubkonPaymentTerm = z.infer<typeof insertSubkonPaymentTermSchema>;
export type SubkonPaymentTerm = typeof subkonPaymentTermsTable.$inferSelect;
