import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  nama: text("nama").notNull(),
  kontak: text("kontak").notNull(),
  source: text("source").notNull().default("lainnya"),
  status: text("status").notNull().default("lead_masuk"),
  assignedTo: text("assigned_to"),
  campaign: text("campaign"),
  followUpAt: text("follow_up_at"),
  alasanBatal: text("alasan_batal"),
  pekerjaan: text("pekerjaan"),
  alamat: text("alamat"),
  tahap: text("tahap"),
  picSales: text("pic_sales"),
  budget: text("budget"),
  namaKampanye: text("nama_kampanye"),
  tanggalSurveyDijadwalkan: text("tanggal_survey_dijadwalkan"),
  tanggalSurveyDilakukan: text("tanggal_survey_dilakukan"),
  tanggalBooking: text("tanggal_booking"),
  tanggalBerkasMasuk: text("tanggal_berkas_masuk"),
  catatanFollowUp: text("catatan_follow_up"),
  alasanBatalPending: text("alasan_batal_pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
