import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketingAbsorptionTable = pgTable("marketing_absorption", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  tahap: text("tahap").notNull(),
  totalUnit: integer("total_unit").notNull().default(0),
  unitTerjual: integer("unit_terjual").notNull().default(0),
  tanggalLaunching: text("tanggal_launching"),
  targetBulan: integer("target_bulan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketingAbsorptionSchema = createInsertSchema(marketingAbsorptionTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketingAbsorption = z.infer<typeof insertMarketingAbsorptionSchema>;
export type MarketingAbsorption = typeof marketingAbsorptionTable.$inferSelect;
