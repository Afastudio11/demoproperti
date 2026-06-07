import { pgTable, text, serial, timestamp, integer, date, real } from "drizzle-orm/pg-core";

export const landStagesTable = pgTable("land_stages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  stageCode: text("stage_code").notNull(), // T1, T2, T3, dst
  stageIdentity: text("stage_identity"), // Dg. Ari, H. Ani, Pak Anas
  landArea: real("land_area"), // luas dalam m²
  targetKavlings: integer("target_kavlings"),
  certificateNumber: text("certificate_number"),
  stageStatus: text("stage_status").notNull().default("belum_mulai"), // belum_mulai, negosiasi, ajb, balik_nama, pemecahan_shm, pisah_pbb, siap_bangun, selesai
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const landLegalChecklistTable = pgTable("land_legal_checklist", {
  id: serial("id").primaryKey(),
  landStageId: integer("land_stage_id").notNull(),
  itemName: text("item_name").notNull(), // Survey Legal, Cek SHM, Negosiasi, AJB, Balik Nama, Pemecahan SHM, Pisah PBB
  itemOrder: integer("item_order").notNull().default(0),
  status: text("status").notNull().default("belum"), // belum, proses, selesai
  submissionDate: date("submission_date"),
  targetDate: date("target_date"),
  actualDate: date("actual_date"),
  pic: text("pic"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type LandStage = typeof landStagesTable.$inferSelect;
export type LandLegalChecklist = typeof landLegalChecklistTable.$inferSelect;
