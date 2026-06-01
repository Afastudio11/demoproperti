import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const handoversTable = pgTable("handovers", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  customerId: integer("customer_id").notNull(),
  tanggal: text("tanggal").notNull(),
  skorKepuasan: real("skor_kepuasan"),
  bastGenerated: boolean("bast_generated").notNull().default(false),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHandoverSchema = createInsertSchema(handoversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHandover = z.infer<typeof insertHandoverSchema>;
export type Handover = typeof handoversTable.$inferSelect;
