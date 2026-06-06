import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const customerStatusHistoryTable = pgTable("customer_status_history", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
});

export type CustomerStatusHistory = typeof customerStatusHistoryTable.$inferSelect;
