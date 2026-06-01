import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qcDefectsTable = pgTable("qc_defects", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  kategori: text("kategori").notNull(),
  deskripsi: text("deskripsi").notNull(),
  status: text("status").notNull().default("open"),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQcDefectSchema = createInsertSchema(qcDefectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQcDefect = z.infer<typeof insertQcDefectSchema>;
export type QcDefect = typeof qcDefectsTable.$inferSelect;
