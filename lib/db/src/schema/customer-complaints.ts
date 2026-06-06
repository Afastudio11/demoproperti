import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const customerComplaintsTable = pgTable("customer_complaints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  unitBlock: text("unit_block"),
  customerId: integer("customer_id"),
  complaint: text("complaint").notNull(),
  category: text("category"),
  severity: text("severity").notNull().default("ringan"),
  pic: text("pic"),
  deadline: text("deadline"),
  status: text("status").notNull().default("belum"),
  completedDate: text("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerComplaint = typeof customerComplaintsTable.$inferSelect;
