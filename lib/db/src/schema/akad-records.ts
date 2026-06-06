import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const akadRecordsTable = pgTable("akad_records", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  bank: text("bank").notNull(),
  akadDate: text("akad_date"),
  akadNumber: text("akad_number"),
  notary: text("notary"),
  akadAmount: numeric("akad_amount"),
  estimatedHtDate: text("estimated_ht_date"),
  status: text("status").notNull().default("terjadwal"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AkadRecord = typeof akadRecordsTable.$inferSelect;
