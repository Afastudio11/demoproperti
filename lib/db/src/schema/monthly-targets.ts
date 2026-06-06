import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const monthlyTargetsTable = pgTable("monthly_targets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  targetAkad: integer("target_akad").notNull().default(0),
  targetBerkas: integer("target_berkas").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MonthlyTarget = typeof monthlyTargetsTable.$inferSelect;
