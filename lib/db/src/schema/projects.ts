import { pgTable, text, serial, timestamp, integer, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  lokasi: text("lokasi").notNull(),
  provinsi: text("provinsi"),
  kabupaten: text("kabupaten"),
  kecamatan: text("kecamatan"),
  desa: text("desa"),
  luas: real("luas"),
  totalUnit: integer("total_unit").notNull().default(0),
  fase: text("fase").notNull().default("LAND"),
  status: text("status").notNull().default("active"),
  targetStart: text("target_start"),
  targetEnd: text("target_end"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
