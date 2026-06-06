import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const htRecordsTable = pgTable("ht_records", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  bank: text("bank").notNull(),
  htDate: text("ht_date"),
  htAmount: numeric("ht_amount"),
  accountNumber: text("account_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HtRecord = typeof htRecordsTable.$inferSelect;
