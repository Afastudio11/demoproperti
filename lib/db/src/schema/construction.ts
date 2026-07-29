import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const constructionTasksTable = pgTable("construction_tasks", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  item: text("item").notNull(),
  bobot: real("bobot").notNull(),
  status: text("status").notNull().default("belum_mulai"),
  tanggalMulai: text("tanggal_mulai"),
  tanggalSelesai: text("tanggal_selesai"),
  catatan: text("catatan"),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionTaskSchema = createInsertSchema(constructionTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConstructionTask = z.infer<typeof insertConstructionTaskSchema>;
export type ConstructionTask = typeof constructionTasksTable.$inferSelect;

// Per-project customizable work item templates
export const projectTaskTemplatesTable = pgTable("project_task_templates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  item: text("item").notNull(),
  bobot: real("bobot").notNull(),
  urutan: integer("urutan").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectTaskTemplateSchema = createInsertSchema(projectTaskTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectTaskTemplate = z.infer<typeof insertProjectTaskTemplateSchema>;
export type ProjectTaskTemplate = typeof projectTaskTemplatesTable.$inferSelect;
