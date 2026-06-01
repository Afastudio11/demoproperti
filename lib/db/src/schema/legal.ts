import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const legalDocumentsTable = pgTable("legal_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  tipeDokumen: text("tipe_dokumen").notNull(),
  status: text("status").notNull().default("pending"),
  pic: text("pic"),
  expiry: text("expiry"),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLegalDocumentSchema = createInsertSchema(legalDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;
export type LegalDocument = typeof legalDocumentsTable.$inferSelect;
