import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const customerDocumentsTable = pgTable("customer_documents", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  documentName: text("document_name").notNull(),
  category: text("category").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  status: text("status").notNull().default("belum_ada"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CustomerDocument = typeof customerDocumentsTable.$inferSelect;
