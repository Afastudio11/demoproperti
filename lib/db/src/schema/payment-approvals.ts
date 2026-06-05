import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentApprovalsTable = pgTable("payment_approvals", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  step: text("step").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentApprovalSchema = createInsertSchema(paymentApprovalsTable).omit({ id: true, createdAt: true });
export type InsertPaymentApproval = z.infer<typeof insertPaymentApprovalSchema>;
export type PaymentApproval = typeof paymentApprovalsTable.$inferSelect;
