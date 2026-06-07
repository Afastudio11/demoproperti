import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  nama: text("nama").notNull(),
  platform: text("platform").notNull().default("instagram"),
  tipeKonten: text("tipe_konten"),
  anggaran: numeric("anggaran"),
  spend: numeric("spend"),
  impresi: integer("impresi"),
  klik: integer("klik"),
  leadsGenerated: integer("leads_generated"),
  tanggalMulai: text("tanggal_mulai"),
  tanggalSelesai: text("tanggal_selesai"),
  status: text("status").notNull().default("aktif"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
