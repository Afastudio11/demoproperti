import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unitQcTable = pgTable("unit_qc", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  qcItem: text("qc_item").notNull(),
  isPass: boolean("is_pass").notNull().default(false),
  notes: text("notes"),
  inspectedBy: text("inspected_by"),
  inspectedAt: text("inspected_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUnitQcSchema = createInsertSchema(unitQcTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUnitQc = z.infer<typeof insertUnitQcSchema>;
export type UnitQc = typeof unitQcTable.$inferSelect;
