import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const bankSubmissionsTable = pgTable("bank_submissions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  bank: text("bank").notNull(),
  submittedDate: text("submitted_date"),
  bankOfficer: text("bank_officer"),
  registrationNumber: text("registration_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BankSubmission = typeof bankSubmissionsTable.$inferSelect;
