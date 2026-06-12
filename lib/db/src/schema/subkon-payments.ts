import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subkonPaymentsTable = pgTable("subkon_payments", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull(),
  paymentTermId: integer("payment_term_id"),
  paymentType: text("payment_type").notNull().default("termin"),
  terminNumber: integer("termin_number"),
  paymentDate: text("payment_date"),
  period: text("period"),
  progressPrevious: real("progress_previous").notNull().default(0),
  progressCurrent: real("progress_current").notNull(),
  velocity: real("velocity"),
  grossEligibleAmount: real("gross_eligible_amount"),
  retentionDeducted: real("retention_deducted"),
  netPayment: real("net_payment"),
  totalPaidBefore: real("total_paid_before").notNull().default(0),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubkonPaymentSchema = createInsertSchema(subkonPaymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubkonPayment = z.infer<typeof insertSubkonPaymentSchema>;
export type SubkonPayment = typeof subkonPaymentsTable.$inferSelect;
