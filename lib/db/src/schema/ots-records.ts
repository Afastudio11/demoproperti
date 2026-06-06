import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const otsRecordsTable = pgTable("ots_records", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  bank: text("bank").notNull(),
  scheduledDate: text("scheduled_date"),
  surveyorName: text("surveyor_name"),
  actualDate: text("actual_date"),
  status: text("status").notNull().default("scheduled"),
  result: text("result"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OtsRecord = typeof otsRecordsTable.$inferSelect;
