import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reworksTable = pgTable("reworks", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  contractId: integer("contract_id"),
  subkonName: text("subkon_name"),
  pekerjaanItem: text("pekerjaan_item"),
  description: text("description"),
  foundDate: text("found_date"),
  targetCompletion: text("target_completion"),
  actualCompletion: text("actual_completion"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReworkSchema = createInsertSchema(reworksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRework = z.infer<typeof insertReworkSchema>;
export type Rework = typeof reworksTable.$inferSelect;
