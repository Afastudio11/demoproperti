import { pgTable, text, serial, timestamp, integer, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const landProspectsTable = pgTable("land_prospects", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  lokasi: text("lokasi").notNull(),
  luas: real("luas").notNull(),
  hargaM2: real("harga_m2").notNull(),
  status: text("status").notNull().default("prospek_baru"),
  roi: real("roi").notNull().default(0),
  margin: real("margin").notNull().default(0),
  aksesJalan: real("akses_jalan"),
  riskLevel: text("risk_level"),
  catatan: text("catatan"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  kabupaten: text("kabupaten"),
  polygonCoords: text("polygon_coords"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLandProspectSchema = createInsertSchema(landProspectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLandProspect = z.infer<typeof insertLandProspectSchema>;
export type LandProspect = typeof landProspectsTable.$inferSelect;
