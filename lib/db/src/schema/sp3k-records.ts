import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const sp3kRecordsTable = pgTable("sp3k_records", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  bank: text("bank").notNull(),
  sp3kDate: text("sp3k_date"),
  sp3kNumber: text("sp3k_number"),
  approvedAmount: numeric("approved_amount"),
  plafonAmount: numeric("plafon_amount"),
  expiryDate: text("expiry_date"),
  status: text("status").notNull().default("pending"),
  revisionNotes: text("revision_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Sp3kRecord = typeof sp3kRecordsTable.$inferSelect;
