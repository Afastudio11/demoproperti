import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitorsTable = pgTable("competitors", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  namaKompetitor: text("nama_kompetitor").notNull(),
  lokasi: text("lokasi"),
  jarak: numeric("jarak"),
  tipeUnit: text("tipe_unit"),
  hargaMin: numeric("harga_min"),
  hargaMax: numeric("harga_max"),
  totalUnit: integer("total_unit"),
  unitTerjual: integer("unit_terjual"),
  progress: integer("progress"),
  kelebihan: text("kelebihan"),
  kekurangan: text("kekurangan"),
  tanggalLaunching: text("tanggal_launching"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompetitorSchema = createInsertSchema(competitorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitorsTable.$inferSelect;
